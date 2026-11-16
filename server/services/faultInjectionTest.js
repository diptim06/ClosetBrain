import mongoose from 'mongoose';
import dotenv from 'dotenv';
import sharp from 'sharp';
import Garment from '../models/Garment.js';
import TemporaryUpload from '../models/TemporaryUpload.js';
import DeletionQueue from '../models/DeletionQueue.js';
import { createGarment, deleteGarment } from './wardrobeService.js';
import { createTemporaryUpload } from './uploadService.js';
import { deleteImageObject } from './r2.js';

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

async function runFaultInjectionVerification() {
  console.log('\n=== ClosetBrain Milestone 3A: Targeted Fault-Injection Audit ===\n');

  if (!process.env.MONGODB_URI) {
    console.error('Fatal: MONGODB_URI missing.');
    process.exit(1);
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  }

  const testUser = new mongoose.Types.ObjectId();

  const cleanupUploadIds = [];
  const cleanupGarmentIds = [];
  const cleanupR2Keys = [];

  try {
    const testBuffer = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 91, g: 25, b: 36 },
      },
    }).webp().toBuffer();

    // -------------------------------------------------------------------------
    // FAULT INJECTION 1: MongoDB unavailable during TemporaryUpload claiming
    // -------------------------------------------------------------------------
    console.log('Fault Injection 1: MongoDB failure during TemporaryUpload claim');

    const temp1 = await createTemporaryUpload(testUser, testBuffer);
    cleanupUploadIds.push(temp1.uploadId);
    const doc1 = await TemporaryUpload.findById(temp1.uploadId);
    if (doc1) cleanupR2Keys.push(doc1.imageKey);

    const garmentCountBefore1 = await Garment.countDocuments();

    // Inject fault: TemporaryUpload.findOneAndUpdate throws network timeout
    const originalFindOneAndUpdate = TemporaryUpload.findOneAndUpdate;
    TemporaryUpload.findOneAndUpdate = function () {
      const err = new Error('MongoNetworkTimeoutError: connection timed out to primary replica');
      err.name = 'MongoNetworkTimeoutError';
      return Promise.reject(err);
    };

    let creation1Failed = false;
    let creation1ErrorMessage = '';
    try {
      await createGarment({
        userId: testUser,
        uploadId: temp1.uploadId,
        attributes: {
          name: 'Fault Test Shirt 1',
          category: 'Tops',
          primaryColor: 'Burgundy',
        },
      });
    } catch (err) {
      creation1Failed = true;
      creation1ErrorMessage = err.message;
    } finally {
      // Restore original function
      TemporaryUpload.findOneAndUpdate = originalFindOneAndUpdate;
    }

    if (!creation1Failed) {
      throw new Error('Operation was falsely reported as successful despite DB failure!');
    }
    if (!creation1ErrorMessage.includes('MongoNetworkTimeoutError') && !creation1ErrorMessage.includes('Database error')) {
      throw new Error(`Unexpected error message: "${creation1ErrorMessage}"`);
    }

    // Verify no garment was created
    const garmentCountAfter1 = await Garment.countDocuments();
    if (garmentCountBefore1 !== garmentCountAfter1) {
      throw new Error('Garment document was created despite claim failure!');
    }

    // Verify upload state remains 'pending' and image is not untracked
    const checkUpload1 = await TemporaryUpload.findById(temp1.uploadId);
    if (!checkUpload1 || checkUpload1.status !== 'pending') {
      throw new Error(`Upload was corrupted! Expected status "pending", got "${checkUpload1?.status}"`);
    }

    pass('1.1 Claim failure handling', 'DB error caught, 0 garments created, upload preserved as "pending"');

    // -------------------------------------------------------------------------
    // FAULT INJECTION 2: MongoDB failure during Garment.create (mid-transaction)
    // -------------------------------------------------------------------------
    console.log('\nFault Injection 2: MongoDB failure during Garment save (mid-transaction)');

    const temp2 = await createTemporaryUpload(testUser, testBuffer);
    cleanupUploadIds.push(temp2.uploadId);
    const doc2 = await TemporaryUpload.findById(temp2.uploadId);
    if (doc2) cleanupR2Keys.push(doc2.imageKey);

    const garmentCountBefore2 = await Garment.countDocuments();

    // Inject fault: Garment.create throws write exception
    const originalGarmentCreate = Garment.create;
    Garment.create = function () {
      const err = new Error('MongoWriteException: lost connection to primary during insert');
      err.name = 'MongoWriteException';
      return Promise.reject(err);
    };

    let creation2Failed = false;
    try {
      await createGarment({
        userId: testUser,
        uploadId: temp2.uploadId,
        attributes: {
          name: 'Fault Test Shirt 2',
          category: 'Tops',
          primaryColor: 'Burgundy',
        },
      });
    } catch (err) {
      creation2Failed = true;
    } finally {
      // Restore original function
      Garment.create = originalGarmentCreate;
    }

    if (!creation2Failed) {
      throw new Error('Operation was falsely reported as successful despite Garment.create failure!');
    }

    // Verify transaction aborted and upload status is NOT stuck in 'claimed'
    const checkUpload2 = await TemporaryUpload.findById(temp2.uploadId);
    if (checkUpload2.status !== 'pending') {
      throw new Error(`Transaction abort failed! Upload status was left as "${checkUpload2.status}" instead of "pending"`);
    }

    const garmentCountAfter2 = await Garment.countDocuments();
    if (garmentCountBefore2 !== garmentCountAfter2) {
      throw new Error('Partial garment metadata was committed despite failure!');
    }
    pass('2.1 Mid-transaction save failure', 'Transaction aborted cleanly, 0 metadata lost, upload restored to "pending"');

    // Verify recovery: legitimate creation with temp2 now succeeds cleanly
    const recoveredGarment = await createGarment({
      userId: testUser,
      uploadId: temp2.uploadId,
      attributes: {
        name: 'Recovered Fault Test Shirt 2',
        category: 'Tops',
        primaryColor: 'Burgundy',
      },
    });
    cleanupGarmentIds.push(recoveredGarment._id);

    const checkUpload2AfterRecovery = await TemporaryUpload.findById(temp2.uploadId);
    if (checkUpload2AfterRecovery.status !== 'claimed') {
      throw new Error('Upload was not claimable after recovering from fault injection!');
    }
    pass('2.2 Recovery verification', 'Upload successfully claimed and garment saved upon DB recovery');

    // -------------------------------------------------------------------------
    // FAULT INJECTION 3: MongoDB failure during garment deletion query
    // -------------------------------------------------------------------------
    console.log('\nFault Injection 3: MongoDB failure during Garment deletion query');

    const temp3 = await createTemporaryUpload(testUser, testBuffer);
    cleanupUploadIds.push(temp3.uploadId);
    const doc3 = await TemporaryUpload.findById(temp3.uploadId);
    if (doc3) cleanupR2Keys.push(doc3.imageKey);

    const garment3 = await createGarment({
      userId: testUser,
      uploadId: temp3.uploadId,
      attributes: {
        name: 'Garment For Deletion Fault 3',
        category: 'Tops',
        primaryColor: 'Burgundy',
      },
    });
    cleanupGarmentIds.push(garment3._id);

    // Inject fault: Garment.findOneAndDelete throws network error
    const originalFindOneAndDelete = Garment.findOneAndDelete;
    Garment.findOneAndDelete = function () {
      const err = new Error('MongoNetworkError: connection closed by remote host');
      err.name = 'MongoNetworkError';
      return Promise.reject(err);
    };

    let deletion3Failed = false;
    try {
      await deleteGarment({
        garmentId: garment3._id.toString(),
        userId: testUser,
      });
    } catch (err) {
      deletion3Failed = true;
    } finally {
      // Restore original function
      Garment.findOneAndDelete = originalFindOneAndDelete;
    }

    if (!deletion3Failed) {
      throw new Error('Deletion reported success despite DB failure!');
    }

    // Verify Garment metadata is intact and NOT silently deleted
    const verifyGarment3 = await Garment.findById(garment3._id);
    if (!verifyGarment3) {
      throw new Error('Garment was deleted despite DB error!');
    }

    // Verify no orphaned queue entry was created
    const queueEntries3 = await DeletionQueue.find({ imageKey: garment3.imageKey });
    if (queueEntries3.length > 0) {
      throw new Error('DeletionQueue entry was prematurely created during failed query!');
    }
    pass('3.1 Deletion query failure safety', 'Garment metadata preserved, no outbox entry created, error returned');

    // -------------------------------------------------------------------------
    // FAULT INJECTION 4: MongoDB failure during DeletionQueue outbox write
    // -------------------------------------------------------------------------
    console.log('\nFault Injection 4: MongoDB failure during DeletionQueue outbox write (mid-transaction)');

    // Inject fault: DeletionQueue.create throws write exception
    const originalQueueCreate = DeletionQueue.create;
    DeletionQueue.create = function () {
      const err = new Error('MongoWriteConflictException: outbox queue write failed');
      err.name = 'MongoWriteConflictException';
      return Promise.reject(err);
    };

    let deletion4Failed = false;
    try {
      await deleteGarment({
        garmentId: garment3._id.toString(),
        userId: testUser,
      });
    } catch (err) {
      deletion4Failed = true;
    } finally {
      // Restore original function
      DeletionQueue.create = originalQueueCreate;
    }

    if (!deletion4Failed) {
      throw new Error('Deletion reported success despite outbox write failure!');
    }

    // Verify Garment was rolled back by transaction and still exists in DB
    const verifyGarment4 = await Garment.findById(garment3._id);
    if (!verifyGarment4) {
      throw new Error('Garment was deleted even though outbox queue write failed! Transaction failed to abort!');
    }
    pass('4.1 Outbox write failure atomicity', 'Transaction aborted, garment preserved in DB, zero orphaned state');

    // Verify recovery: Legitimate deletion succeeds once DB is healthy
    const successfulDeletion = await deleteGarment({
      garmentId: garment3._id.toString(),
      userId: testUser,
    });
    if (!successfulDeletion.success) {
      throw new Error('Legitimate deletion failed after recovery!');
    }

    const checkFinalGarment = await Garment.findById(garment3._id);
    if (checkFinalGarment) {
      throw new Error('Garment was not deleted after recovery!');
    }

    const finalQueue = await DeletionQueue.findOne({ imageKey: garment3.imageKey });
    if (!finalQueue || !['completed', 'retrying', 'pending'].includes(finalQueue.status)) {
      throw new Error('DeletionQueue was not properly populated upon recovery!');
    }
    pass('4.2 Deletion recovery execution', 'Garment safely deleted and outbox recorded once DB connection recovered');

    // Remove from cleanupGarmentIds since it was deleted
    const gIdx = cleanupGarmentIds.indexOf(garment3._id);
    if (gIdx !== -1) cleanupGarmentIds.splice(gIdx, 1);

  } catch (err) {
    fail('Fault Injection Test Suite', err);
  } finally {
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

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n=== FAULT INJECTION SUMMARY ===');
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runFaultInjectionVerification().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
