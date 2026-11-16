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
  updateGarment,
  deleteGarment,
} from './wardrobeService.js';
import { createTemporaryUpload } from './uploadService.js';
import { deleteImageObject, uploadImageObject } from './r2.js';
import {
  validateGarmentCreatePayload,
  validateGarmentUpdatePayload,
} from '../utils/garmentValidator.js';

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

async function runWardrobeCrudVerification() {
  console.log('\n=== ClosetBrain Milestone 3A: Wardrobe CRUD Verification ===\n');

  // Connect to MongoDB
  if (!process.env.MONGODB_URI) {
    console.error('Fatal: MONGODB_URI missing in environment.');
    process.exit(1);
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  }

  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();

  const createdR2Keys = [];
  const createdUploadIds = [];
  const createdGarmentIds = [];

  try {
    // -------------------------------------------------------------
    // SUITE 1: Validation & Client-Supplied Input Sanitization
    // -------------------------------------------------------------
    console.log('Suite 1: Validation & Client-Supplied Input Sanitization');

    // 1.1 Reject missing required fields (name, category, primaryColor)
    const invalidPayload1 = { brand: 'Acme', notes: 'Incomplete' };
    const check1 = validateGarmentCreatePayload(invalidPayload1);
    if (check1.valid) {
      throw new Error('Validator accepted payload missing name, category, and primaryColor!');
    }
    pass('1.1 Missing required fields rejection', `Caught ${check1.errors.length} expected errors`);

    // 1.2 Reject invalid enums
    const invalidPayload2 = {
      name: 'Test Shirt',
      category: 'Spaceships', // Invalid category
      primaryColor: 'Blue',
      pattern: 'ZigZagStripes', // Invalid pattern
      formality: 'RaveParty', // Invalid formality
    };
    const check2 = validateGarmentCreatePayload(invalidPayload2);
    if (check2.valid) {
      throw new Error('Validator accepted invalid category and pattern enums!');
    }
    pass('1.2 Invalid category/pattern enum rejection', `Caught ${check2.errors.length} enum errors`);

    // 1.3 Client-supplied userId or imageKey must never be trusted
    const maliciousPayload = {
      name: 'Hacked Shirt',
      category: 'Tops',
      primaryColor: 'White',
      userId: new mongoose.Types.ObjectId().toString(),
      imageKey: 'system/critical/root.webp',
      imageUrl: 'https://evil.com/fake.png',
    };
    const check3 = validateGarmentCreatePayload(maliciousPayload);
    if (!check3.valid || check3.data.userId || check3.data.imageKey || check3.data.imageUrl) {
      throw new Error('Validator failed to strip malicious client-supplied storage identifiers!');
    }
    pass('1.3 Injection prevention', 'Client-supplied userId, imageKey, and imageUrl strictly stripped');

    // -------------------------------------------------------------
    // SUITE 2: Temporary Upload Claiming & Atomicity
    // -------------------------------------------------------------
    console.log('\nSuite 2: Temporary Upload Claiming & Atomicity');

    // Create test image buffer via Sharp
    const testBuffer = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 91, g: 25, b: 36 }, // Burgundy
      },
    }).webp().toBuffer();

    // Create a real temporary upload for User A
    const tempUpload = await createTemporaryUpload(userA, testBuffer);
    createdUploadIds.push(tempUpload.uploadId);
    // Find imageKey to ensure cleanup
    const tempDoc = await TemporaryUpload.findById(tempUpload.uploadId);
    if (tempDoc) createdR2Keys.push(tempDoc.imageKey);

    // 2.1 Cross-user upload theft rejection: User B tries to claim User A's uploadId
    let theftRejected = false;
    try {
      await createGarment({
        userId: userB,
        uploadId: tempUpload.uploadId,
        attributes: {
          name: 'Stolen Garment',
          category: 'Tops',
          primaryColor: 'Burgundy',
        },
      });
    } catch (err) {
      if (err.status === 400 && (err.message.includes('unauthorized') || err.message.includes('Invalid, expired'))) {
        theftRejected = true;
      }
    }
    if (!theftRejected) {
      throw new Error('Cross-user temporary upload claiming was NOT rejected!');
    }
    pass('2.1 Cross-user upload protection', 'User B cannot claim User A uploadId');

    // 2.2 Legitimate garment creation by User A
    const garmentA1 = await createGarment({
      userId: userA,
      uploadId: tempUpload.uploadId,
      attributes: {
        name: 'Signature Burgundy Silk Blouse',
        category: 'Tops',
        subCategory: 'Silk Blouse',
        primaryColor: 'Burgundy',
        secondaryColors: ['Ivory'],
        colorFamily: 'Vibrant',
        brand: 'ClosetBrain Studio',
        material: 'Silk',
        pattern: 'Solid',
        season: ['Autumn', 'Winter'],
        formality: 'Smart Casual',
        fit: 'Regular',
        tags: ['statement', 'silk'],
        notes: 'Dry clean only',
      },
    });
    createdGarmentIds.push(garmentA1._id);

    if (!garmentA1._id || !garmentA1.signedUrl || !garmentA1.imageKey) {
      throw new Error('Garment creation response missing required fields or signedUrl');
    }
    if (garmentA1.userId.toString() !== userA.toString()) {
      throw new Error('Garment userId does not match authenticated user session!');
    }
    pass('2.2 Atomic garment creation', 'Garment saved with signed preview URL and preserved R2 key');

    // 2.3 Verify temporary upload status is now claimed
    const reloadedTemp = await TemporaryUpload.findById(tempUpload.uploadId);
    if (reloadedTemp.status !== 'claimed') {
      throw new Error(`Expected upload status "claimed", found "${reloadedTemp.status}"`);
    }
    pass('2.3 Upload status state machine', 'TemporaryUpload successfully marked as "claimed"');

    // 2.4 Verify token reuse is prevented (double claim attempt)
    let reuseRejected = false;
    try {
      await createGarment({
        userId: userA,
        uploadId: tempUpload.uploadId,
        attributes: {
          name: 'Duplicate Blouse',
          category: 'Tops',
          primaryColor: 'Burgundy',
        },
      });
    } catch (err) {
      if (err.status === 400) {
        reuseRejected = true;
      }
    }
    if (!reuseRejected) {
      throw new Error('Claimed temporary upload was reused to create a second garment!');
    }
    pass('2.4 Token reuse rejection', 'Claimed upload cannot be reused for second creation');

    // -------------------------------------------------------------
    // SUITE 3: Ownership Isolation & Data Access Security
    // -------------------------------------------------------------
    console.log('\nSuite 3: Ownership Isolation & Access Security');

    // 3.1 User B tries to fetch User A's garment by ID
    let fetchRejected = false;
    try {
      await getGarmentById({
        garmentId: garmentA1._id.toString(),
        userId: userB,
      });
    } catch (err) {
      if (err.status === 404) {
        fetchRejected = true;
      }
    }
    if (!fetchRejected) {
      throw new Error('User B was able to fetch User A garment by ID!');
    }
    pass('3.1 Read isolation by ID', 'Cross-user single garment fetch returned 404');

    // 3.2 User B tries to PATCH User A's garment
    let patchRejected = false;
    try {
      await updateGarment({
        garmentId: garmentA1._id.toString(),
        userId: userB,
        updates: { name: 'Vandalized Title' },
      });
    } catch (err) {
      if (err.status === 404) {
        patchRejected = true;
      }
    }
    if (!patchRejected) {
      throw new Error('User B was able to modify User A garment!');
    }
    pass('3.2 Write isolation on update', 'Cross-user PATCH returned 404');

    // 3.3 User B tries to DELETE User A's garment
    let deleteRejected = false;
    try {
      await deleteGarment({
        garmentId: garmentA1._id.toString(),
        userId: userB,
      });
    } catch (err) {
      if (err.status === 404) {
        deleteRejected = true;
      }
    }
    if (!deleteRejected) {
      throw new Error('User B was able to delete User A garment!');
    }
    pass('3.3 Deletion isolation', 'Cross-user DELETE returned 404');

    // 3.4 User B list view must NOT contain User A's garments
    const userBList = await getGarments({ userId: userB });
    const containsForeignGarment = userBList.garments.some(
      (g) => g._id.toString() === garmentA1._id.toString()
    );
    if (containsForeignGarment) {
      throw new Error('User B list view exposed User A garment!');
    }
    pass('3.4 List isolation', 'User B list query strictly excludes foreign garments');

    // -------------------------------------------------------------
    // SUITE 4: Updates & Immutability Enforcement
    // -------------------------------------------------------------
    console.log('\nSuite 4: Updates & Immutability Enforcement');

    const updatedGarment = await updateGarment({
      garmentId: garmentA1._id.toString(),
      userId: userA,
      updates: {
        name: 'Signature Burgundy Silk Blouse (Tailored Edition)',
        notes: 'Hand wash in cold water or dry clean',
        userId: userB.toString(), // Malicious attempt to change ownership
        imageKey: 'hijacked/image.webp', // Malicious attempt to swap imageKey
      },
    });

    if (updatedGarment.name !== 'Signature Burgundy Silk Blouse (Tailored Edition)') {
      throw new Error('Garment name was not updated correctly');
    }
    if (updatedGarment.userId.toString() !== userA.toString()) {
      throw new Error('CRITICAL: Garment ownership was modified via update!');
    }
    if (updatedGarment.imageKey !== garmentA1.imageKey) {
      throw new Error('CRITICAL: Garment imageKey was overwritten via update!');
    }
    pass('4.1 Update attribute modification', 'Allowed fields updated cleanly');
    pass('4.2 Ownership & storage immutability', 'userId and imageKey strictly protected from edits');

    // -------------------------------------------------------------
    // SUITE 5: Filtering, Search, Sorting & Pagination
    // -------------------------------------------------------------
    console.log('\nSuite 5: Filtering, Search, Sorting & Pagination');

    // Create 2 additional garments for User A to test pagination & filtering
    const temp2 = await createTemporaryUpload(userA, testBuffer);
    createdUploadIds.push(temp2.uploadId);
    const doc2 = await TemporaryUpload.findById(temp2.uploadId);
    if (doc2) createdR2Keys.push(doc2.imageKey);

    const garmentA2 = await createGarment({
      userId: userA,
      uploadId: temp2.uploadId,
      attributes: {
        name: 'Pleated Charcoal Wool Trousers',
        category: 'Bottoms',
        subCategory: 'Trousers',
        primaryColor: 'Charcoal Grey',
        brand: 'Milan Tailors',
        material: 'Wool',
        season: ['Autumn', 'Winter'],
        formality: 'Formal',
      },
    });
    createdGarmentIds.push(garmentA2._id);

    const temp3 = await createTemporaryUpload(userA, testBuffer);
    createdUploadIds.push(temp3.uploadId);
    const doc3 = await TemporaryUpload.findById(temp3.uploadId);
    if (doc3) createdR2Keys.push(doc3.imageKey);

    const garmentA3 = await createGarment({
      userId: userA,
      uploadId: temp3.uploadId,
      attributes: {
        name: 'Classic White Linen Shirt',
        category: 'Tops',
        subCategory: 'Button-Down Shirt',
        primaryColor: 'White',
        brand: 'Breeze Cotton',
        material: 'Linen',
        season: ['Spring', 'Summer'],
        formality: 'Casual',
      },
    });
    createdGarmentIds.push(garmentA3._id);

    // 5.1 Category filter
    const topsOnly = await getGarments({ userId: userA, category: 'Tops' });
    const allAreTops = topsOnly.garments.every((g) => g.category === 'Tops');
    if (!allAreTops || topsOnly.garments.length < 2) {
      throw new Error(`Category filter failed: expected at least 2 Tops, got ${topsOnly.garments.length}`);
    }
    pass('5.1 Category filtering', `Filtered Tops count: ${topsOnly.garments.length}`);

    // 5.2 Search filter
    const searchResult = await getGarments({ userId: userA, search: 'Charcoal' });
    if (searchResult.garments.length !== 1 || searchResult.garments[0].name !== 'Pleated Charcoal Wool Trousers') {
      throw new Error('Search filter failed to find charcoal trousers');
    }
    pass('5.2 Free-text search', 'Successfully matched query in name and color');

    // 5.3 Pagination
    const page1 = await getGarments({ userId: userA, page: 1, limit: 2 });
    if (page1.garments.length !== 2 || page1.pagination.totalItems !== 3 || !page1.pagination.hasNextPage) {
      throw new Error('Pagination metadata incorrect on page 1');
    }
    const page2 = await getGarments({ userId: userA, page: 2, limit: 2 });
    if (page2.garments.length !== 1 || page2.pagination.hasNextPage) {
      throw new Error('Pagination metadata incorrect on page 2');
    }
    pass('5.3 Server-side pagination', `Page 1: ${page1.garments.length} items, Page 2: ${page2.garments.length} items`);

    // -------------------------------------------------------------
    // SUITE 6: Crash-Safe Deletion & Outbox Mechanism
    // -------------------------------------------------------------
    console.log('\nSuite 6: Crash-Safe Deletion & Outbox Mechanism');

    const keyToDelete = garmentA3.imageKey;
    const deleteResult = await deleteGarment({
      garmentId: garmentA3._id.toString(),
      userId: userA,
    });

    if (!deleteResult.success) {
      throw new Error('deleteGarment returned unsuccessful result');
    }

    // Verify garment is gone from MongoDB
    const checkDeleted = await Garment.findById(garmentA3._id);
    if (checkDeleted) {
      throw new Error('Garment document still exists in MongoDB after deletion!');
    }

    // Verify DeletionQueue was recorded for outbox reliability
    const queueRecord = await DeletionQueue.findOne({ imageKey: keyToDelete });
    if (!queueRecord) {
      throw new Error('DeletionQueue outbox record was NOT created!');
    }
    if (!['completed', 'retrying', 'pending'].includes(queueRecord.status)) {
      throw new Error(`Unexpected queue status: ${queueRecord.status}`);
    }
    pass('6.1 Crash-safe deletion execution', `Garment removed and DeletionQueue recorded (status: ${queueRecord.status})`);

    // Remove from createdGarmentIds since it was successfully deleted
    const gIndex = createdGarmentIds.indexOf(garmentA3._id);
    if (gIndex !== -1) createdGarmentIds.splice(gIndex, 1);

  } catch (err) {
    fail('Global Wardrobe Test Suite', err);
  } finally {
    // Cleanup remaining test garments and images
    for (const gId of createdGarmentIds) {
      await Garment.deleteOne({ _id: gId }).catch(() => {});
    }
    for (const uId of createdUploadIds) {
      await TemporaryUpload.deleteOne({ _id: uId }).catch(() => {});
    }
    for (const r2Key of createdR2Keys) {
      await deleteImageObject(r2Key).catch(() => {});
    }
    await mongoose.connection.close();
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runWardrobeCrudVerification().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
