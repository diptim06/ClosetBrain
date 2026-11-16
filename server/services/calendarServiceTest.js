import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Garment from '../models/Garment.js';
import Outfit from '../models/Outfit.js';
import ScheduledOutfit from '../models/ScheduledOutfit.js';
import OutfitWearLog from '../models/OutfitWearLog.js';
import {
  validateCalendarDate,
  validateSlot,
  validateNotes,
  validateDateRange,
  scheduleOutfit,
  getSchedulesByRange,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  markScheduledOutfitAsWorn,
  logSpontaneousWear,
  getWearHistory,
  getWearLogById,
  updateWearLog,
  deleteWearLog,
  getUpcomingOutfits,
} from './calendarService.js';
import { deleteOutfit } from './outfitService.js';

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
  const uri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(uri);
  console.log('Connected to database via configured URI.');
}

async function runTests() {
  console.log('\n=== ClosetBrain Phase 1: Outfit Planner & Wear History Backend Verification ===\n');
  await connectDb();

  // Test setup: create test users, garments, and outfits
  const testRunId = Date.now();
  const userA = await User.create({
    name: 'Calendar Tester A',
    email: `cal_user_a_${testRunId}@closetbrain.test`,
    passwordHash: 'hash_secret_123',
    isEmailVerified: true,
  });

  const userB = await User.create({
    name: 'Calendar Tester B',
    email: `cal_user_b_${testRunId}@closetbrain.test`,
    passwordHash: 'hash_secret_123',
    isEmailVerified: true,
  });

  const garmentA1 = await Garment.create({
    userId: userA._id,
    name: 'Wool Overcoat',
    category: 'Outerwear',
    primaryColor: 'Charcoal',
    imageKey: `test/cal_overcoat_${testRunId}.jpg`,
  });

  const garmentA2 = await Garment.create({
    userId: userA._id,
    name: 'Silk Shirt',
    category: 'Tops',
    primaryColor: 'White',
    imageKey: `test/cal_shirt_${testRunId}.jpg`,
  });

  // Garment with incomplete/missing metadata
  const garmentA3Sparse = await Garment.create({
    userId: userA._id,
    name: 'Vintage Trousers',
    category: 'Bottoms',
    primaryColor: 'Grey',
    imageKey: `test/cal_trousers_${testRunId}.jpg`,
    subCategory: null,
    colorFamily: null,
    pattern: null,
    season: [],
  });

  const garmentB = await Garment.create({
    userId: userB._id,
    name: 'User B Jacket',
    category: 'Outerwear',
    primaryColor: 'Blue',
    imageKey: `test/cal_b_jacket_${testRunId}.jpg`,
  });

  const outfitA1 = await Outfit.create({
    userId: userA._id,
    name: 'Charcoal & White Minimalist',
    garments: [garmentA1._id, garmentA2._id],
    notes: 'Clean office look',
  });

  const outfitA2 = await Outfit.create({
    userId: userA._id,
    name: 'Casual Monochrome Ensemble',
    garments: [garmentA1._id, garmentA3Sparse._id],
    notes: 'Relaxed weekend outfit',
  });

  const outfitB = await Outfit.create({
    userId: userB._id,
    name: 'User B Solo Outfit',
    garments: [garmentB._id],
  });

  try {
    // ------------------------------------------------------------------------
    // Suite 1: Date, Slot & Notes Validation
    // ------------------------------------------------------------------------
    console.log('Suite 1: Date, Slot & Notes Validation');

    // 1.1 Leap Year Acceptance & Non-Leap Year Rejection
    assert(validateCalendarDate('2024-02-29') === '2024-02-29', 'Accepts valid leap year date (2024-02-29)');
    try {
      validateCalendarDate('2025-02-29');
      fail('Rejects non-leap year Feb 29 (2025-02-29)', new Error('Did not throw'));
    } catch (err) {
      pass('Rejects non-leap year Feb 29 (2025-02-29)', err.message);
    }

    // 1.2 Impossible Calendar Dates
    try {
      validateCalendarDate('2026-02-31');
      fail('Rejects Feb 31 (2026-02-31)', new Error('Did not throw'));
    } catch (err) {
      pass('Rejects Feb 31 (2026-02-31)', err.message);
    }

    try {
      validateCalendarDate('2026-04-31');
      fail('Rejects April 31 (2026-04-31)', new Error('Did not throw'));
    } catch (err) {
      pass('Rejects April 31 (2026-04-31)', err.message);
    }

    // 1.3 Format & Type Enforcements
    try {
      validateCalendarDate('2026/11/10');
      fail('Rejects slash-separated date', new Error('Did not throw'));
    } catch (err) {
      pass('Rejects slash-separated date', err.message);
    }

    try {
      validateCalendarDate('10-11-2026');
      fail('Rejects non-ISO date format', new Error('Did not throw'));
    } catch (err) {
      pass('Rejects non-ISO date format', err.message);
    }

    assert(validateCalendarDate('2026-11-10') === '2026-11-10', 'Accepts standard valid date');

    // 1.4 Date Range Bounds
    assert(validateDateRange('2026-11-01', '2026-11-15').start === '2026-11-01', 'Accepts valid range');
    try {
      validateDateRange('2026-11-20', '2026-11-10');
      fail('Rejects inverted start/end dates', new Error('Did not throw'));
    } catch (err) {
      pass('Rejects inverted start/end dates', err.message);
    }

    try {
      validateDateRange('2026-01-01', '2026-06-01');
      fail('Rejects date range exceeding 90 days', new Error('Did not throw'));
    } catch (err) {
      pass('Rejects date range exceeding 90 days', err.message);
    }

    // 1.5 Slot & Notes Validation
    assert(validateSlot('All Day') === 'All Day', 'Validates All Day slot');
    assert(validateSlot('Evening') === 'Evening', 'Validates Evening slot');
    assert(validateSlot(undefined) === 'All Day', 'Defaults missing slot to All Day');
    try {
      validateSlot('MidnightSnack');
      fail('Rejects invalid slot string', new Error('Did not throw'));
    } catch (err) {
      pass('Rejects invalid slot string', err.message);
    }

    assert(validateNotes('Meeting with client') === 'Meeting with client', 'Validates notes');
    assert(validateNotes(undefined) === '', 'Defaults empty notes');
    try {
      validateNotes('x'.repeat(301));
      fail('Rejects notes exceeding 300 characters', new Error('Did not throw'));
    } catch (err) {
      pass('Rejects notes exceeding 300 characters', err.message);
    }

    // ------------------------------------------------------------------------
    // Suite 2: User Isolation & Cross-Tenant Access Defense
    // ------------------------------------------------------------------------
    console.log('\nSuite 2: User Isolation & Cross-Tenant Access Defense');

    await assertRejects(
      scheduleOutfit({
        userId: userB._id,
        outfitId: outfitA1._id, // User B trying to schedule User A's outfit
        date: '2026-11-12',
      }),
      'not found or access denied',
      'User B cannot schedule User A outfit (IDOR defense)'
    );

    // ------------------------------------------------------------------------
    // Suite 3: Scheduling, Conflict Handling & Partial Unique Indexes
    // ------------------------------------------------------------------------
    console.log('\nSuite 3: Scheduling, Conflict Handling & Partial Unique Indexes');

    // 3.1 Happy Path Schedule Creation
    const sched1 = await scheduleOutfit({
      userId: userA._id,
      outfitId: outfitA1._id,
      date: '2026-11-12',
      slot: 'Work',
      notes: 'Morning presentation',
    });

    assert(sched1._id !== undefined, 'Scheduled outfit document created');
    assert(sched1.slot === 'Work', 'Persisted slot correctly');
    assert(sched1.outfit?.name === outfitA1.name, 'Populated outfit embedded in response');
    assert(sched1.outfit?.garments?.length === 2, 'Populated garments embedded in response');
    assert(sched1.outfit?.garments[0].imageKey === undefined, 'Private R2 key is redacted');

    // 3.2 Duplicate Schedule (Same outfit, date, slot)
    await assertRejects(
      scheduleOutfit({
        userId: userA._id,
        outfitId: outfitA1._id,
        date: '2026-11-12',
        slot: 'Work',
      }),
      'already scheduled',
      'Rejects identical slot duplicate schedule with 409 Conflict'
    );

    // 3.3 All Day vs Specific Slot Conflict
    await assertRejects(
      scheduleOutfit({
        userId: userA._id,
        outfitId: outfitA1._id,
        date: '2026-11-12',
        slot: 'All Day',
      }),
      'already has a specific slot',
      'Rejects All Day when specific slot is already scheduled for that outfit'
    );

    // 3.4 Multi-Outfit on Same Date (Different outfit or different slot)
    // Same outfit on different slot (e.g. Evening)
    const schedEvening = await scheduleOutfit({
      userId: userA._id,
      outfitId: outfitA1._id,
      date: '2026-11-12',
      slot: 'Evening',
      notes: 'Dinner transition',
    });
    assert(schedEvening._id !== undefined, 'Allows same outfit in a distinct slot on the same date');

    // Different outfit on same date
    const schedDifferent = await scheduleOutfit({
      userId: userA._id,
      outfitId: outfitA2._id,
      date: '2026-11-12',
      slot: 'Morning',
      notes: 'Gym / commute',
    });
    assert(schedDifferent._id !== undefined, 'Allows different outfit on the same date');

    // 3.5 Range Query Retrieval
    const rangeRes = await getSchedulesByRange({
      userId: userA._id,
      start: '2026-11-01',
      end: '2026-11-30',
    });
    assert(rangeRes.scheduledOutfits.length === 3, 'Range query returns all 3 user A schedules');

    // User B query receives 0 items
    const rangeResB = await getSchedulesByRange({
      userId: userB._id,
      start: '2026-11-01',
      end: '2026-11-30',
    });
    assert(rangeResB.scheduledOutfits.length === 0, 'User B sees 0 schedules (isolated range query)');

    // 3.6 Rescheduling after Cancellation (Partial Unique Index verification)
    const schedToCancel = await scheduleOutfit({
      userId: userA._id,
      outfitId: outfitA1._id,
      date: '2026-11-18',
      slot: 'Work',
    });

    // Update status to 'cancelled'
    await ScheduledOutfit.updateOne({ _id: schedToCancel._id }, { $set: { status: 'cancelled' } });

    // Now re-scheduling the identical outfit for the identical date & slot must SUCCEED
    const schedReadded = await scheduleOutfit({
      userId: userA._id,
      outfitId: outfitA1._id,
      date: '2026-11-18',
      slot: 'Work',
      notes: 'Rescheduled after cancellation',
    });
    assert(schedReadded._id !== undefined, 'Partial unique index allows rescheduling after cancellation');

    // ------------------------------------------------------------------------
    // Suite 4: Concurrent Scheduling Against Replica Set Database
    // ------------------------------------------------------------------------
    console.log('\nSuite 4: Concurrent Scheduling Against Replica Set Database');

    // Launch simultaneous requests for conflicting slots (All Day vs Evening) on a fresh date
    const concurrentDate = '2026-11-25';
    let concurrentSuccess = 0;
    let concurrentConflict = 0;

    const [resA, resB] = await Promise.allSettled([
      scheduleOutfit({
        userId: userA._id,
        outfitId: outfitA1._id,
        date: concurrentDate,
        slot: 'All Day',
      }),
      scheduleOutfit({
        userId: userA._id,
        outfitId: outfitA1._id,
        date: concurrentDate,
        slot: 'Evening',
      }),
    ]);

    if (resA.status === 'fulfilled') concurrentSuccess++;
    else if (resA.reason.message.toLowerCase().includes('already')) concurrentConflict++;

    if (resB.status === 'fulfilled') concurrentSuccess++;
    else if (resB.reason.message.toLowerCase().includes('already')) concurrentConflict++;

    assert(
      concurrentSuccess === 1 && concurrentConflict === 1,
      `Concurrent conflict handled safely: exactly 1 succeeded, 1 rejected (${concurrentSuccess} ok, ${concurrentConflict} conflict)`
    );

    // ------------------------------------------------------------------------
    // Suite 5: Wear Logging, Snapshots & Idempotency
    // ------------------------------------------------------------------------
    console.log('\nSuite 5: Wear Logging, Snapshots & Idempotency');

    // 5.1 Mark Scheduled Outfit as Worn
    const wearResult = await markScheduledOutfitAsWorn({
      scheduleId: sched1._id,
      userId: userA._id,
      actualDate: '2026-11-13', // Worn day after planned
      notes: 'Worn to keynote speech',
    });

    assert(wearResult.scheduledOutfit.status === 'completed', 'Schedule status transitioned to completed');
    assert(wearResult.scheduledOutfit.wearLogId !== null, 'Schedule linked to wearLogId');
    assert(wearResult.wearLog.wornDate === '2026-11-13', 'Wear log preserved actual wornDate');
    assert(wearResult.wearLog.outfitName === outfitA1.name, 'Wear log captured outfitNameSnapshot');
    assert(wearResult.wearLog.garments.length === 2, 'Wear log captured garmentsSnapshot');
    assert(wearResult.wearLog.garments[0].primaryColor === 'Charcoal', 'Captured garment color in snapshot');
    assert(wearResult.wearLog.garments[0].signedUrl !== undefined, 'Signed URL hydrated on snapshot garment');

    // 5.2 Idempotency: Double Submit Protection
    const wearResult2 = await markScheduledOutfitAsWorn({
      scheduleId: sched1._id,
      userId: userA._id,
      actualDate: '2026-11-13',
    });

    assert(
      wearResult2.wearLog._id === wearResult.wearLog._id,
      'Double submit returns existing wear log idempotently'
    );
    const wearCount = await OutfitWearLog.countDocuments({ scheduledOutfitId: sched1._id });
    assert(wearCount === 1, 'Only exactly 1 OutfitWearLog document created for scheduled outfit');

    // 5.3 Spontaneous Wear Logging (No prior schedule)
    const spontaneousLog = await logSpontaneousWear({
      userId: userA._id,
      outfitId: outfitA2._id,
      wornDate: '2026-11-09',
      notes: 'Quick coffee stroll',
    });

    assert(spontaneousLog._id !== undefined, 'Spontaneous wear log created');
    assert(spontaneousLog.scheduledOutfitId === null, 'Spontaneous wear log has null scheduledOutfitId');

    // 5.4 Snapshot Resilience: Sparse Garment Attributes
    // Outfit A2 includes garmentA3Sparse (missing subCategory, colorFamily, pattern, season)
    const sparseGarmentSnapshot = spontaneousLog.garments.find(
      (g) => g.garmentId === garmentA3Sparse._id.toString()
    );
    assert(sparseGarmentSnapshot !== undefined, 'Sparse garment included in snapshot');
    assert(sparseGarmentSnapshot.subCategory === null, 'Handled null subCategory safely');
    assert(Array.isArray(sparseGarmentSnapshot.season), 'Handled empty season safely with default array');

    // 5.5 Snapshot Resilience: Garment Deleted Prior to Wear
    // Create an outfit with a garment that gets deleted before wear logging
    const temporaryGarment = await Garment.create({
      userId: userA._id,
      name: 'Temporary Camisole',
      category: 'Tops',
      primaryColor: 'Beige',
      imageKey: 'test/temp_cami.jpg',
    });

    const outfitWithDeletedGarment = await Outfit.create({
      userId: userA._id,
      name: 'Outfit With Expired Piece',
      garments: [garmentA1._id, temporaryGarment._id],
    });

    // Delete the garment from wardrobe
    await Garment.deleteOne({ _id: temporaryGarment._id });

    // Log spontaneous wear - must NOT crash or fail
    const resilientLog = await logSpontaneousWear({
      userId: userA._id,
      outfitId: outfitWithDeletedGarment._id,
      wornDate: '2026-11-10',
    });

    assert(resilientLog.garments.length === 2, 'Captured both surviving and archived garment references');
    const fallbackPiece = resilientLog.garments.find(
      (g) => g.garmentId === temporaryGarment._id.toString()
    );
    assert(fallbackPiece.name === 'Archived Wardrobe Piece', 'Applied fallback name to deleted garment');
    assert(fallbackPiece.category === 'Accessories', 'Applied valid enum fallback category to deleted garment');

    // ------------------------------------------------------------------------
    // Suite 6: Wear History Lifecycle (Retrieval, Editing & Deletion)
    // ------------------------------------------------------------------------
    console.log('\nSuite 6: Wear History Lifecycle (Retrieval, Editing & Deletion)');

    // 6.1 Wear History Pagination & User Scoping
    const historyA = await getWearHistory({
      userId: userA._id,
      page: 1,
      limit: 10,
    });
    assert(historyA.wearHistory.length >= 3, 'User A retrieves all logged wear history items');
    assert(historyA.pagination.totalItems >= 3, 'Pagination totalItems accurate');

    const historyB = await getWearHistory({
      userId: userB._id,
      page: 1,
      limit: 10,
    });
    assert(historyB.wearHistory.length === 0, 'User B sees 0 wear history items (user isolated)');

    // 6.2 Update Wear Log & Synchronize Linked Schedule
    const updatedLog = await updateWearLog({
      wearLogId: wearResult.wearLog._id,
      userId: userA._id,
      wornDate: '2026-11-14',
      notes: 'Rescheduled to Saturday conference',
    });
    assert(updatedLog.wornDate === '2026-11-14', 'Wear log wornDate updated');

    const syncedSchedule = await ScheduledOutfit.findById(sched1._id);
    assert(syncedSchedule.date === '2026-11-14', 'Linked ScheduledOutfit.date synchronized with wear log');

    // 6.3 Rejection of Inconsistent/Stale Schedule Relationship
    // Corrupt relationship: set scheduledOutfitId to an ID that doesn't exist
    const corruptLog = await OutfitWearLog.create({
      userId: userA._id,
      outfitId: outfitA1._id,
      scheduledOutfitId: new mongoose.Types.ObjectId(),
      wornDate: '2026-11-10',
      outfitNameSnapshot: 'Corrupted Link Test',
      garmentsSnapshot: [
        {
          garmentId: garmentA1._id,
          name: 'Wool Overcoat',
          category: 'Outerwear',
          primaryColor: 'Charcoal',
          imageKey: 'test/key.jpg',
        },
      ],
    });

    await assertRejects(
      updateWearLog({
        wearLogId: corruptLog._id,
        userId: userA._id,
        wornDate: '2026-11-11',
      }),
      'inconsistent',
      'Rejects wear log update with 409 Conflict if linked schedule relationship is inconsistent'
    );

    // 6.4 Delete Wear Log Reverts Linked Schedule to 'planned'
    const deleteLogRes = await deleteWearLog({
      wearLogId: wearResult.wearLog._id,
      userId: userA._id,
    });
    assert(deleteLogRes.success === true, 'Wear log deleted successfully');

    const revertedSchedule = await ScheduledOutfit.findById(sched1._id);
    assert(revertedSchedule.status === 'planned', 'Deleting wear log reverted ScheduledOutfit status to planned');
    assert(revertedSchedule.wearLogId === null, 'Deleting wear log cleared ScheduledOutfit.wearLogId');

    // ------------------------------------------------------------------------
    // Suite 7: Outfit Deletion Referential Integrity
    // ------------------------------------------------------------------------
    console.log('\nSuite 7: Outfit Deletion Referential Integrity');

    // Create an outfit with a planned schedule and a logged wear event
    const outfitToDelete = await Outfit.create({
      userId: userA._id,
      name: 'Outfit Slated For Deletion',
      garments: [garmentA1._id],
    });

    const plannedSched = await scheduleOutfit({
      userId: userA._id,
      outfitId: outfitToDelete._id,
      date: '2026-11-29',
      slot: 'Daytime',
    });

    const wearToDelete = await logSpontaneousWear({
      userId: userA._id,
      outfitId: outfitToDelete._id,
      wornDate: '2026-11-01',
      notes: 'Historic wear before outfit was retired',
    });

    // Execute transactional outfit deletion
    const deleteOutfitRes = await deleteOutfit({
      outfitId: outfitToDelete._id.toString(),
      userId: userA._id,
    });
    assert(deleteOutfitRes.success === true, 'Outfit deleted successfully');

    // Verify all associated ScheduledOutfit documents were cascade-deleted
    const survivingSchedules = await ScheduledOutfit.find({ outfitId: outfitToDelete._id });
    assert(survivingSchedules.length === 0, 'Cascade deleted all ScheduledOutfit documents for deleted outfit');

    // Verify OutfitWearLog was PRESERVED with outfitId set to null
    const preservedWearLog = await OutfitWearLog.findById(wearToDelete._id);
    assert(preservedWearLog !== null, 'Historical wear log preserved after outfit deletion');
    assert(preservedWearLog.outfitId === null, 'Preserved wear log outfitId disassociated to null');
    assert(
      preservedWearLog.outfitNameSnapshot === 'Outfit Slated For Deletion',
      'Preserved wear log outfitNameSnapshot intact'
    );
    assert(preservedWearLog.garmentsSnapshot.length === 1, 'Preserved wear log garmentsSnapshot intact');

    // ------------------------------------------------------------------------
    // Suite 8: Dashboard Upcoming Looks Query
    // ------------------------------------------------------------------------
    console.log('\nSuite 8: Dashboard Upcoming Looks Query');

    const upcoming = await getUpcomingOutfits({
      userId: userA._id,
      days: 30,
    });
    assert(Array.isArray(upcoming), 'Returns array of upcoming outfits');
    assert(upcoming.every((u) => u.status === 'planned'), 'All upcoming looks have status planned');
  } finally {
    // Cleanup test data
    console.log('\nCleaning up test artifacts...');
    await ScheduledOutfit.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await OutfitWearLog.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await Outfit.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await Garment.deleteMany({ userId: { $in: [userA._id, userB._id] } });
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    console.log('Cleanup complete.');
  }

  console.log('\n=== CALENDAR SERVICE VERIFICATION SUMMARY ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  await mongoose.disconnect();

  if (results.failed > 0) {
    process.exit(1);
  }
}

runTests().catch(async (err) => {
  console.error('Fatal test error:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
