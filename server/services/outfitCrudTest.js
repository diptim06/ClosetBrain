import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Outfit from '../models/Outfit.js';
import Garment from '../models/Garment.js';
import User from '../models/User.js';
import {
  createOutfit,
  getOutfits,
  getOutfitById,
  updateOutfit,
  deleteOutfit,
  validateOutfitName,
  validateOutfitNotes,
  validateOutfitGarments,
} from './outfitService.js';

dotenv.config();

const results = {
  passed: 0,
  failed: 0,
};

function pass(name, detail = '') {
  results.passed++;
  console.log(`  ✓ ${name} ${detail ? '(' + detail + ')' : ''}`);
}

function fail(name, error) {
  results.failed++;
  console.error(`  ✗ ${name}:`, error?.message || error);
}

function assert(condition, message) {
  if (condition) {
    pass(message);
  } else {
    fail(message, new Error('Assertion failed'));
  }
}

async function assertRejects(promise, expectedSubstring, message) {
  try {
    await promise;
    fail(message, new Error(`Expected promise to reject, but it resolved successfully.`));
  } catch (err) {
    if (expectedSubstring && !err.message.toLowerCase().includes(expectedSubstring.toLowerCase())) {
      fail(message, new Error(`Expected error containing "${expectedSubstring}", got "${err.message}"`));
    } else {
      pass(message, `Rejection caught: ${err.message}`);
    }
  }
}

async function connectDb() {
  const primaryUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
  const fallbackUri = 'mongodb://localhost:27017/closetbrain_test';

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (primaryUri) {
    try {
      await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 2000 });
      console.log(`Connected to database via configured URI.`);
      return;
    } catch (err) {
      console.warn(`Primary DB connection failed (${err.message}). Trying fallback local URI...`);
    }
  }

  await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 3000 });
  console.log(`Connected to fallback local database: ${fallbackUri}`);
}

async function runOutfitCrudTests() {
  console.log('\n=== ClosetBrain Phase 1: Outfit Model & CRUD Service Verification ===\n');

  try {
    await connectDb();

    const timestamp = Date.now();

    // Setup Test Users
    const userA = await User.create({
      name: `Outfit Tester A ${timestamp}`,
      email: `outfit_tester_a_${timestamp}@closetbrain.test`,
      passwordHash: 'hash_secret_123',
    });

    const userB = await User.create({
      name: `Outfit Tester B ${timestamp}`,
      email: `outfit_tester_b_${timestamp}@closetbrain.test`,
      passwordHash: 'hash_secret_123',
    });

    // Setup Test Garments for User A
    const gA1 = await Garment.create({
      userId: userA._id,
      name: 'Structured Trench Coat',
      category: 'Outerwear',
      primaryColor: '#D8C7B5',
      brand: 'The Row',
      pattern: 'Solid',
      imageKey: `users/${userA._id}/garments/trench_${timestamp}.webp`,
    });

    const gA2 = await Garment.create({
      userId: userA._id,
      name: 'Cashmere Ribbed Knit',
      category: 'Tops',
      primaryColor: '#F4EFE6',
      brand: 'Lemaire',
      pattern: 'Textured',
      imageKey: `users/${userA._id}/garments/knit_${timestamp}.webp`,
    });

    const gA3 = await Garment.create({
      userId: userA._id,
      name: 'Pleated Straight Trousers',
      category: 'Bottoms',
      primaryColor: '#4B4B52',
      brand: 'Acne Studios',
      pattern: 'Solid',
      imageKey: `users/${userA._id}/garments/trousers_${timestamp}.webp`,
    });

    // Setup Test Garment for User B (foreign)
    const gB1 = await Garment.create({
      userId: userB._id,
      name: 'Foreign Silk Slip Dress',
      category: 'Dresses',
      primaryColor: '#1A1A1A',
      brand: 'Saint Laurent',
      pattern: 'Solid',
      imageKey: `users/${userB._id}/garments/dress_${timestamp}.webp`,
    });

    // -----------------------------------------------------------------
    console.log('Suite 1: Input Validation & Bounds Enforcement');
    // -----------------------------------------------------------------

    // Empty garments array
    await assertRejects(
      createOutfit({
        userId: userA._id,
        name: 'Empty Outfit',
        garments: [],
      }),
      'at least one garment',
      'Rejects creation with empty garments array'
    );

    // Non-array garments parameter
    await assertRejects(
      createOutfit({
        userId: userA._id,
        name: 'Invalid Garments Type',
        garments: 'not-an-array',
      }),
      'provided as an array',
      'Rejects non-array garments parameter'
    );

    // Invalid ObjectId format
    await assertRejects(
      createOutfit({
        userId: userA._id,
        name: 'Bad ID Outfit',
        garments: ['invalid-object-id-123'],
      }),
      'Invalid garment ID',
      'Rejects malformed garment ObjectId'
    );

    // Duplicate garment IDs in selection
    await assertRejects(
      createOutfit({
        userId: userA._id,
        name: 'Duplicate Pieces',
        garments: [gA1._id.toString(), gA1._id.toString()],
      }),
      'Duplicate garments',
      'Rejects duplicate garment IDs in the same outfit'
    );

    // Excessive garment count (> 10 garments)
    const elevenGarmentIds = Array(11).fill(gA1._id.toString());
    await assertRejects(
      validateOutfitGarments(elevenGarmentIds, userA._id),
      'cannot contain more than 10 garments',
      'Rejects garment lists exceeding maximum limit of 10'
    );

    // Missing or blank name
    await assertRejects(
      createOutfit({
        userId: userA._id,
        name: '   ',
        garments: [gA1._id],
      }),
      'required and cannot be empty',
      'Rejects blank or whitespace-only outfit name'
    );

    // Name exceeding 100 characters
    const longName = 'A'.repeat(101);
    await assertRejects(
      createOutfit({
        userId: userA._id,
        name: longName,
        garments: [gA1._id],
      }),
      'cannot exceed 100 characters',
      'Rejects outfit name longer than 100 characters'
    );

    // Notes exceeding 500 characters
    const longNotes = 'N'.repeat(501);
    await assertRejects(
      createOutfit({
        userId: userA._id,
        name: 'Valid Name',
        notes: longNotes,
        garments: [gA1._id],
      }),
      'cannot exceed 500 characters',
      'Rejects notes longer than 500 characters'
    );

    // -----------------------------------------------------------------
    console.log('\nSuite 2: Cross-User Ownership Isolation & IDOR Defense');
    // -----------------------------------------------------------------

    // User A attempts to include User B's garment during creation
    await assertRejects(
      createOutfit({
        userId: userA._id,
        name: 'Unauthorized Mixed Outfit',
        garments: [gA1._id.toString(), gB1._id.toString()],
      }),
      'do not belong to you',
      'Rejects creating an outfit containing another user\'s garment'
    );

    // Unauthenticated request without userId
    await assertRejects(
      createOutfit({
        userId: null,
        name: 'No User Outfit',
        garments: [gA1._id.toString()],
      }),
      'Authentication required',
      'Enforces authentication requirement on outfit creation'
    );

    // -----------------------------------------------------------------
    console.log('\nSuite 3: Happy Path Outfit CRUD Operations');
    // -----------------------------------------------------------------

    // Create valid outfit
    const created = await createOutfit({
      userId: userA._id,
      name: 'Autumn Studio Minimalist',
      notes: 'Structured trench layered over neutral cashmere knit.',
      garments: [gA1._id.toString(), gA2._id.toString(), gA3._id.toString()],
    });

    assert(created !== null, 'Outfit created successfully');
    assert(created.name === 'Autumn Studio Minimalist', 'Outfit name persisted correctly');
    assert(created.notes === 'Structured trench layered over neutral cashmere knit.', 'Notes persisted correctly');
    assert(created.garments.length === 3, 'Outfit contains exactly 3 populated garments');
    assert(created.garments[0]._id.toString() === gA1._id.toString(), 'Maintains input garment order (Outerwear first)');
    assert(created.garments[1]._id.toString() === gA2._id.toString(), 'Maintains input garment order (Top second)');
    assert(created.garments[2]._id.toString() === gA3._id.toString(), 'Maintains input garment order (Bottom third)');

    // Verify private imageKey redaction and signedUrl generation
    assert(created.garments[0].imageKey === undefined, 'Private R2 imageKey is strictly redacted');
    assert(typeof created.garments[0].signedUrl === 'string' || created.garments[0].signedUrl === null, 'garment has signedUrl property');

    // -----------------------------------------------------------------
    console.log('\nSuite 4: Retrieval & Pagination (User Scoped)');
    // -----------------------------------------------------------------

    // Get outfit by ID as owner
    const fetchedById = await getOutfitById({
      outfitId: created._id.toString(),
      userId: userA._id,
    });
    assert(fetchedById._id.toString() === created._id.toString(), 'Fetched outfit by ID matches created ID');
    assert(fetchedById.garments.length === 3, 'Fetched outfit has 3 populated garments');

    // User B attempts to fetch User A's outfit by ID
    await assertRejects(
      getOutfitById({
        outfitId: created._id.toString(),
        userId: userB._id,
      }),
      'Outfit not found or access denied',
      'User B cannot access User A outfit by ID (404)'
    );

    // Create a second outfit for User A
    const created2 = await createOutfit({
      userId: userA._id,
      name: 'Relaxed Weekend Knit & Trousers',
      notes: 'No trench coat, just knit and trousers.',
      garments: [gA2._id.toString(), gA3._id.toString()],
    });

    // List outfits for User A
    const listA = await getOutfits({ userId: userA._id });
    assert(listA.pagination.totalItems === 2, 'User A has totalItems of 2');
    assert(listA.outfits.length === 2, 'User A receives 2 outfits');
    assert(listA.outfits[0]._id.toString() === created2._id.toString(), 'Default sort is newest first (createdAt_desc)');

    // Search outfits by text
    const searchResult = await getOutfits({ userId: userA._id, search: 'Minimalist' });
    assert(searchResult.outfits.length === 1, 'Search query filters correctly');
    assert(searchResult.outfits[0].name === 'Autumn Studio Minimalist', 'Search returned matching name');

    // List outfits for User B
    const listB = await getOutfits({ userId: userB._id });
    assert(listB.pagination.totalItems === 0, 'User B sees 0 outfits (strict user scoping)');

    // -----------------------------------------------------------------
    console.log('\nSuite 5: Updating Outfits');
    // -----------------------------------------------------------------

    // Partial update: rename only
    const updatedName = await updateOutfit({
      outfitId: created._id.toString(),
      userId: userA._id,
      name: 'Autumn Studio Minimalist (Updated)',
    });
    assert(updatedName.name === 'Autumn Studio Minimalist (Updated)', 'Outfit name updated successfully');
    assert(updatedName.garments.length === 3, 'Garments unchanged on partial update');

    // Update garments list
    const updatedGarments = await updateOutfit({
      outfitId: created._id.toString(),
      userId: userA._id,
      garments: [gA1._id.toString(), gA2._id.toString()],
    });
    assert(updatedGarments.garments.length === 2, 'Garments reduced from 3 to 2');

    // User A attempts to update with User B's garment
    await assertRejects(
      updateOutfit({
        outfitId: created._id.toString(),
        userId: userA._id,
        garments: [gA1._id.toString(), gB1._id.toString()],
      }),
      'do not belong to you',
      'Rejects updating outfit to include another user\'s garment'
    );

    // User B attempts to update User A's outfit
    await assertRejects(
      updateOutfit({
        outfitId: created._id.toString(),
        userId: userB._id,
        name: 'Hacked Outfit Name',
      }),
      'Outfit not found or access denied',
      'User B cannot update User A outfit (404)'
    );

    // -----------------------------------------------------------------
    console.log('\nSuite 6: Deleting Outfits & Missing Outfit Handling');
    // -----------------------------------------------------------------

    // User B attempts to delete User A's outfit
    await assertRejects(
      deleteOutfit({
        outfitId: created._id.toString(),
        userId: userB._id,
      }),
      'Outfit not found or access denied',
      'User B cannot delete User A outfit (404)'
    );

    // User A deletes their outfit
    const deleteRes = await deleteOutfit({
      outfitId: created._id.toString(),
      userId: userA._id,
    });
    assert(deleteRes.success === true, 'Outfit deleted successfully');
    assert(deleteRes.outfitId === created._id.toString(), 'Delete response confirms outfitId');

    // Confirm outfit no longer exists
    await assertRejects(
      getOutfitById({
        outfitId: created._id.toString(),
        userId: userA._id,
      }),
      'Outfit not found or access denied',
      'Deleted outfit cannot be retrieved (404)'
    );

    // Delete non-existent ID
    await assertRejects(
      deleteOutfit({
        outfitId: new mongoose.Types.ObjectId().toString(),
        userId: userA._id,
      }),
      'Outfit not found or access denied',
      'Deleting non-existent outfit returns 404'
    );

    // Cleanup all test records
    await Outfit.deleteMany({ _id: { $in: [created._id, created2._id] } });
    await Garment.deleteMany({ _id: { $in: [gA1._id, gA2._id, gA3._id, gB1._id] } });
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });

    console.log('\n=== VERIFICATION SUMMARY ===');
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}\n`);

    if (results.failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal unexpected error during test run:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runOutfitCrudTests();
