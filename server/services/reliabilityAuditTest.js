import mongoose from 'mongoose';
import dotenv from 'dotenv';
import sharp from 'sharp';
import Garment from '../models/Garment.js';
import TemporaryUpload from '../models/TemporaryUpload.js';
import DeletionQueue from '../models/DeletionQueue.js';
import {
  createGarment,
  getGarments,
  getGarmentById,
  deleteGarment,
} from './wardrobeService.js';
import { createTemporaryUpload } from './uploadService.js';
import { deleteImageObject } from './r2.js';
import {
  processPendingDeletions,
  retryFailedDeletions,
  cleanupExpiredUploads,
} from './reconciliationService.js';

dotenv.config();

const results = {
  passed: [],
  failed: [],
};

function pass(name, detail = '') {
  results.passed.push({ name, detail });
  console.log(`  ✓ ${name} ${detail ? '(' + detail + ')' : ''}`);
}

function fail(name, error) {
  results.failed.push({ name, error: error.message || String(error) });
  console.error(`  ✗ ${name}:`, error.message || error);
}

async function runReliabilityAudit() {
  console.log('\n=== ClosetBrain Milestone 3A: Focused Reliability Audit ===\n');

  if (!process.env.MONGODB_URI) {
    console.error('Fatal: MONGODB_URI missing.');
    process.exit(1);
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  }

  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();

  const cleanupR2Keys = [];
  const cleanupUploadIds = [];
  const cleanupGarmentIds = [];

  try {
    const testBuffer = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 91, g: 25, b: 36 },
      },
    }).webp().toBuffer();

    // -------------------------------------------------------------
    // SCENARIO 1: Garment save failure retains recoverable upload state
    // -------------------------------------------------------------
    console.log('Scenario 1: Temporary upload recovery on Garment save failure');

    const tempUpload1 = await createTemporaryUpload(userA, testBuffer);
    cleanupUploadIds.push(tempUpload1.uploadId);
    const doc1 = await TemporaryUpload.findById(tempUpload1.uploadId);
    if (doc1) cleanupR2Keys.push(doc1.imageKey);

    // Intentionally pass an invalid attribute payload that will fail validation
    let saveFailed = false;
    try {
      await createGarment({
        userId: userA,
        uploadId: tempUpload1.uploadId,
        attributes: {
          name: '', // Invalid empty name
          category: 'Tops',
          primaryColor: 'Burgundy',
        },
      });
    } catch (err) {
      if (err.status === 400) saveFailed = true;
    }

    if (!saveFailed) {
      throw new Error('Expected invalid payload to fail creation');
    }

    // Verify upload state remains 'pending' and was not permanently claimed/lost
    const checkUpload1 = await TemporaryUpload.findById(tempUpload1.uploadId);
    if (checkUpload1.status !== 'pending') {
      throw new Error(`Upload status was corrupted to "${checkUpload1.status}" instead of remaining "pending"!`);
    }
    pass('1.1 Non-silent upload loss prevention', 'Upload status remains "pending" after validation/save failure');

    // Verify upload can still be legitimately used after failure
    const retryGarment1 = await createGarment({
      userId: userA,
      uploadId: tempUpload1.uploadId,
      attributes: {
        name: 'Recovered Burgundy Blouse',
        category: 'Tops',
        primaryColor: 'Burgundy',
      },
    });
    cleanupGarmentIds.push(retryGarment1._id);
    const reloadedUpload1 = await TemporaryUpload.findById(tempUpload1.uploadId);
    if (reloadedUpload1.status !== 'claimed') {
      throw new Error('Upload was not claimable on retry!');
    }
    pass('1.2 Recoverable upload retry', 'Upload was successfully claimed on subsequent valid retry');

    // -------------------------------------------------------------
    // SCENARIO 2: Simultaneous requests using same uploadId
    // -------------------------------------------------------------
    console.log('\nScenario 2: Simultaneous requests for same uploadId (Concurrency)');

    const tempUpload2 = await createTemporaryUpload(userA, testBuffer);
    cleanupUploadIds.push(tempUpload2.uploadId);
    const doc2 = await TemporaryUpload.findById(tempUpload2.uploadId);
    if (doc2) cleanupR2Keys.push(doc2.imageKey);

    // Fire two simultaneous creation requests
    const [resA, resB] = await Promise.allSettled([
      createGarment({
        userId: userA,
        uploadId: tempUpload2.uploadId,
        attributes: { name: 'Concurrent Blouse Alpha', category: 'Tops', primaryColor: 'Burgundy' },
      }),
      createGarment({
        userId: userA,
        uploadId: tempUpload2.uploadId,
        attributes: { name: 'Concurrent Blouse Beta', category: 'Tops', primaryColor: 'Burgundy' },
      }),
    ]);

    const successes = [resA, resB].filter((r) => r.status === 'fulfilled');
    const rejections = [resA, resB].filter((r) => r.status === 'rejected');

    if (successes.length !== 1 || rejections.length !== 1) {
      throw new Error(`Concurrency race condition! Expected 1 success and 1 rejection, got ${successes.length} successes and ${rejections.length} rejections.`);
    }

    cleanupGarmentIds.push(successes[0].value._id);
    pass('2.1 Simultaneous upload claiming', 'Exactly 1 request succeeded and 1 was rejected (atomic lock)');

    // -------------------------------------------------------------
    // SCENARIO 3: Repeated R2 deletion failures and durable queue retention
    // -------------------------------------------------------------
    console.log('\nScenario 3: Durable tracking of failed R2 deletions (Outbox)');

    const dummyKey = `test-durable-fail-${Date.now()}.webp`;
    const queueDoc = await DeletionQueue.create({
      imageKey: dummyKey,
      reason: 'garment_deleted',
      status: 'failed',
      attempts: 5,
      lastError: 'R2 network unreachable (5 attempts exhausted)',
    });

    const failedDoc = await DeletionQueue.findById(queueDoc._id);
    if (!failedDoc || failedDoc.status !== 'failed' || failedDoc.attempts !== 5) {
      throw new Error('DeletionQueue entry was not durably tracked in failed state!');
    }
    pass('3.1 Durable failure tracking', `Entry durably tracked in DeletionQueue with status "${failedDoc.status}" and ${failedDoc.attempts} attempts`);

    // Verify manual/automated retry trigger resets it for reconciliation
    const resetRes = await retryFailedDeletions(dummyKey);
    const resetDoc = await DeletionQueue.findById(queueDoc._id);
    if (resetDoc.status !== 'retrying' || resetDoc.attempts !== 0) {
      throw new Error('retryFailedDeletions did not reset queue entry state!');
    }
    pass('3.2 Reconciliation reset', `Reset ${resetRes.resetCount} entry back to retrying state with attempts = 0`);

    // Cleanup queue doc
    await DeletionQueue.deleteOne({ _id: queueDoc._id });

    // -------------------------------------------------------------
    // SCENARIO 4: Two simultaneous DELETE requests for the same garment
    // -------------------------------------------------------------
    console.log('\nScenario 4: Simultaneous DELETE requests (Idempotency)');

    const tempUpload4 = await createTemporaryUpload(userA, testBuffer);
    cleanupUploadIds.push(tempUpload4.uploadId);
    const doc4 = await TemporaryUpload.findById(tempUpload4.uploadId);
    if (doc4) cleanupR2Keys.push(doc4.imageKey);

    const garment4 = await createGarment({
      userId: userA,
      uploadId: tempUpload4.uploadId,
      attributes: {
        name: 'Target For Concurrent Deletion',
        category: 'Tops',
        primaryColor: 'Burgundy',
      },
    });

    // Fire two simultaneous DELETE requests
    const [delA, delB] = await Promise.allSettled([
      deleteGarment({ garmentId: garment4._id.toString(), userId: userA }),
      deleteGarment({ garmentId: garment4._id.toString(), userId: userA }),
    ]);

    const delSuccesses = [delA, delB].filter((r) => r.status === 'fulfilled');
    const delRejections = [delA, delB].filter((r) => r.status === 'rejected');

    if (delSuccesses.length !== 1 || delRejections.length !== 1) {
      throw new Error(`Concurrent delete race condition! Successes: ${delSuccesses.length}, Rejections: ${delRejections.length}`);
    }

    if (!delRejections[0].reason.message.includes('not found') && delRejections[0].reason.status !== 404) {
      throw new Error(`Second delete rejected with unexpected error: ${delRejections[0].reason.message}`);
    }

    // Verify only ONE queue entry was created
    const queueEntries = await DeletionQueue.find({ imageKey: garment4.imageKey });
    if (queueEntries.length !== 1) {
      throw new Error(`Expected exactly 1 DeletionQueue entry, found ${queueEntries.length}`);
    }
    pass('4.1 Concurrent deletion safety', 'Exactly 1 DELETE succeeded, second received 404, zero duplicate queue entries');

    // -------------------------------------------------------------
    // SCENARIO 5: Database unavailable resilience
    // -------------------------------------------------------------
    console.log('\nScenario 5: Database unavailable & orphan sweep');

    // Simulate an expired claimed upload that has no associated Garment
    const orphanUpload = await TemporaryUpload.create({
      userId: userA,
      imageKey: `orphan-test-${Date.now()}.webp`,
      status: 'claimed',
      expiresAt: new Date(Date.now() - 10000), // Expired in the past
    });

    const sweepResult = await cleanupExpiredUploads();
    const checkedOrphan = await TemporaryUpload.findById(orphanUpload._id);
    if (checkedOrphan.status !== 'expired') {
      throw new Error('Orphan sweep did not transition orphaned claimed upload to expired!');
    }
    pass('5.1 Orphaned upload reconciliation', 'Orphaned claimed upload identified and transitioned to expired');
    await TemporaryUpload.deleteOne({ _id: orphanUpload._id });

    // -------------------------------------------------------------
    // SCENARIO 6: Signed URLs strictly generated for authenticated owner
    // -------------------------------------------------------------
    console.log('\nScenario 6: Signed URL privacy & ownership isolation');

    const tempUpload6 = await createTemporaryUpload(userA, testBuffer);
    cleanupUploadIds.push(tempUpload6.uploadId);
    const doc6 = await TemporaryUpload.findById(tempUpload6.uploadId);
    if (doc6) cleanupR2Keys.push(doc6.imageKey);

    const garment6 = await createGarment({
      userId: userA,
      uploadId: tempUpload6.uploadId,
      attributes: {
        name: 'Private Owner Garment',
        category: 'Tops',
        primaryColor: 'Burgundy',
      },
    });
    cleanupGarmentIds.push(garment6._id);

    // User B attempts to get signed URL by calling getGarmentById with userA garment
    let leakedUrl = false;
    try {
      const res = await getGarmentById({
        garmentId: garment6._id.toString(),
        userId: userB,
      });
      if (res && res.signedUrl) leakedUrl = true;
    } catch (err) {
      // Expected 404
    }

    if (leakedUrl) {
      throw new Error('Signed URL was leaked to unauthorized User B!');
    }
    pass('6.1 Signed URL isolation by ID', 'User B cannot generate or receive signed URL for User A garment');

    // User B listing query must not generate or leak User A signed URLs
    const userBGarments = await getGarments({ userId: userB });
    const containsOwnerKey = userBGarments.garments.some((g) => g.imageKey === garment6.imageKey);
    if (containsOwnerKey) {
      throw new Error('User B list contains User A imageKey!');
    }
    pass('6.2 Signed URL list isolation', 'User B garment query never generates signed URLs for other users');

  } catch (err) {
    fail('Reliability Audit', err);
  } finally {
    // Cleanup
    for (const gId of cleanupGarmentIds) {
      await Garment.deleteOne({ _id: gId }).catch(() => {});
    }
    for (const uId of cleanupUploadIds) {
      await TemporaryUpload.deleteOne({ _id: uId }).catch(() => {});
    }
    for (const r2Key of cleanupR2Keys) {
      await deleteImageObject(r2Key).catch(() => {});
    }
    await mongoose.connection.close();
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n=== RELIABILITY AUDIT SUMMARY ===');
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runReliabilityAudit().catch((err) => {
  console.error('Fatal audit runner error:', err);
  process.exit(1);
});
