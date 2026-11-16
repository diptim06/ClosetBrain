import mongoose from 'mongoose';
import ScheduledOutfit, { VALID_SLOTS } from '../models/ScheduledOutfit.js';
import OutfitWearLog from '../models/OutfitWearLog.js';
import Outfit from '../models/Outfit.js';
import Garment from '../models/Garment.js';
import { getSignedImageUrl } from './r2.js';

export const VALID_CATEGORIES = [
  'Tops',
  'Bottoms',
  'Outerwear',
  'Dresses',
  'Shoes',
  'Accessories',
  'Ethnic Wear',
];

// ============================================================================
// 1. VALIDATION HELPERS
// ============================================================================

/**
 * Validates that a string is a strictly real Gregorian calendar date in YYYY-MM-DD format.
 * Validates actual calendar existence including leap years (e.g. Feb 29 2024 vs 2025)
 * and rejects impossible dates (e.g. Feb 31, April 31).
 *
 * @param {string} dateString
 * @param {string} [fieldName='Date']
 * @returns {string} Sanitized date string
 */
export function validateCalendarDate(dateString, fieldName = 'Date') {
  if (!dateString || typeof dateString !== 'string') {
    const error = new Error(`${fieldName} is required and must be a string.`);
    error.status = 400;
    throw error;
  }

  const trimmed = dateString.trim();
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(trimmed);
  if (!match) {
    const error = new Error(`${fieldName} must be formatted as YYYY-MM-DD.`);
    error.status = 400;
    throw error;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 2000 || year > 2100) {
    const error = new Error(`${fieldName} year must be between 2000 and 2100.`);
    error.status = 400;
    throw error;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() + 1 !== month ||
    utcDate.getUTCDate() !== day
  ) {
    const error = new Error(`${fieldName} "${trimmed}" is not a valid calendar date.`);
    error.status = 400;
    throw error;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Validates schedule slot.
 *
 * @param {string} [slot='All Day']
 * @returns {string} Validated slot
 */
export function validateSlot(slot) {
  if (slot === undefined || slot === null || slot === '') {
    return 'All Day';
  }
  if (typeof slot !== 'string' || !VALID_SLOTS.includes(slot.trim())) {
    const error = new Error(
      `Invalid time slot specified: ${slot}. Allowed values: ${VALID_SLOTS.join(', ')}`
    );
    error.status = 400;
    throw error;
  }
  return slot.trim();
}

/**
 * Validates notes string.
 *
 * @param {string} [notes]
 * @returns {string} Trimmed notes or empty string
 */
export function validateNotes(notes) {
  if (notes === undefined || notes === null) {
    return '';
  }
  if (typeof notes !== 'string') {
    const error = new Error('Notes must be a string.');
    error.status = 400;
    throw error;
  }
  const trimmed = notes.trim();
  if (trimmed.length > 300) {
    const error = new Error('Notes cannot exceed 300 characters.');
    error.status = 400;
    throw error;
  }
  return trimmed;
}

/**
 * Validates a start and end calendar date range (max 90 days span).
 *
 * @param {string} start
 * @param {string} end
 * @returns {{ start: string, end: string }}
 */
export function validateDateRange(start, end) {
  const validStart = validateCalendarDate(start, 'start');
  const validEnd = validateCalendarDate(end, 'end');

  if (validStart > validEnd) {
    const error = new Error('Start date must be less than or equal to end date.');
    error.status = 400;
    throw error;
  }

  const startDate = new Date(validStart);
  const endDate = new Date(validEnd);
  const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 90) {
    const error = new Error('Date range cannot exceed 90 days.');
    error.status = 400;
    throw error;
  }

  return { start: validStart, end: validEnd };
}

/**
 * Converts a string or ObjectId safely.
 */
function toObjectId(id, fieldName = 'ID') {
  if (!id) {
    const error = new Error(`${fieldName} is required.`);
    error.status = 400;
    throw error;
  }
  if (id instanceof mongoose.Types.ObjectId) {
    return id;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`Invalid ${fieldName} format: ${id}`);
    error.status = 400;
    throw error;
  }
  return new mongoose.Types.ObjectId(id);
}

// ============================================================================
// 2. FORMATTING & SIGNED URL HYDRATION (ZERO LEAKAGE OF PRIVATE R2 KEYS)
// ============================================================================

/**
 * Populates and formats garments within an outfit, attaching ephemeral signed URLs.
 */
async function populateOutfitGarments(outfitDoc, userId) {
  if (!outfitDoc) return null;
  const outfit = typeof outfitDoc.toObject === 'function' ? outfitDoc.toObject() : { ...outfitDoc };

  const garmentIds = outfit.garments || [];
  if (garmentIds.length === 0) {
    return { ...outfit, garments: [] };
  }

  const garments = await Garment.find({
    _id: { $in: garmentIds },
    userId,
  }).lean();

  const formattedGarments = await Promise.all(
    garments.map(async (g) => {
      let signedUrl = null;
      if (g.imageKey) {
        try {
          signedUrl = await getSignedImageUrl(g.imageKey, 3600);
        } catch (err) {
          console.warn(`[CalendarService] Could not sign image for garment "${g._id}":`, err.message);
        }
      }
      const { imageKey, ...safeGarment } = g;
      return { ...safeGarment, signedUrl };
    })
  );

  const garmentMap = new Map(formattedGarments.map((g) => [g._id.toString(), g]));
  const orderedGarments = garmentIds
    .map((id) => garmentMap.get(id.toString()))
    .filter(Boolean);

  return {
    ...outfit,
    garments: orderedGarments,
  };
}

/**
 * Formats a scheduled outfit with populated outfit and signed image URLs.
 */
export async function formatScheduledOutfitWithSignedUrls(scheduledDoc) {
  if (!scheduledDoc) return null;
  const schedule =
    typeof scheduledDoc.toObject === 'function' ? scheduledDoc.toObject() : { ...scheduledDoc };

  let populatedOutfit = null;
  if (schedule.outfitId) {
    const rawOutfit = await Outfit.findOne({
      _id: schedule.outfitId,
      userId: schedule.userId,
    }).lean();

    if (rawOutfit) {
      populatedOutfit = await populateOutfitGarments(rawOutfit, schedule.userId);
    }
  }

  return {
    _id: schedule._id.toString(),
    userId: schedule.userId.toString(),
    outfitId: schedule.outfitId ? schedule.outfitId.toString() : null,
    date: schedule.date,
    slot: schedule.slot,
    notes: schedule.notes || '',
    status: schedule.status,
    wearLogId: schedule.wearLogId ? schedule.wearLogId.toString() : null,
    outfit: populatedOutfit,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  };
}

/**
 * Formats a wear log document, attaching fresh signed URLs for each snapshotted garment.
 * Redacts private R2 imageKey strings.
 */
export async function formatWearLogWithSignedUrls(wearLogDoc) {
  if (!wearLogDoc) return null;
  const log =
    typeof wearLogDoc.toObject === 'function' ? wearLogDoc.toObject() : { ...wearLogDoc };

  const hydratedGarments = await Promise.all(
    (log.garmentsSnapshot || []).map(async (g) => {
      let signedUrl = null;
      if (g.imageKey) {
        try {
          signedUrl = await getSignedImageUrl(g.imageKey, 3600);
        } catch {
          // Graceful fallback: signedUrl remains null when image key is purged from R2
          signedUrl = null;
        }
      }
      return {
        garmentId: g.garmentId ? g.garmentId.toString() : null,
        name: g.name || 'Unnamed Piece',
        category: g.category || 'Accessories',
        subCategory: g.subCategory || null,
        primaryColor: g.primaryColor || null,
        colorFamily: g.colorFamily || null,
        pattern: g.pattern || null,
        season: g.season || ['All-Season'],
        signedUrl,
      };
    })
  );

  return {
    _id: log._id.toString(),
    userId: log.userId.toString(),
    outfitId: log.outfitId ? log.outfitId.toString() : null,
    scheduledOutfitId: log.scheduledOutfitId ? log.scheduledOutfitId.toString() : null,
    wornDate: log.wornDate,
    outfitName: log.outfitNameSnapshot,
    notes: log.notes || '',
    garments: hydratedGarments,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  };
}

/**
 * Safely constructs garmentsSnapshot from outfit references.
 * Resilient against missing or partially-deleted garments.
 */
async function buildGarmentsSnapshot(garmentIds, userObjectId, session) {
  const validIds = (garmentIds || []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) {
    throw new Error('Cannot record wear: Outfit must reference at least one garment.');
  }

  const garments = await Garment.find(
    { _id: { $in: validIds }, userId: userObjectId },
    null,
    { session }
  ).lean();

  const garmentMap = new Map(garments.map((g) => [g._id.toString(), g]));

  const snapshot = validIds.map((id) => {
    const g = garmentMap.get(id.toString());
    if (g) {
      return {
        garmentId: g._id,
        name: typeof g.name === 'string' && g.name.trim() ? g.name.trim() : 'Unnamed Piece',
        category: VALID_CATEGORIES.includes(g.category) ? g.category : 'Accessories',
        subCategory: g.subCategory || null,
        primaryColor: g.primaryColor || null,
        colorFamily: g.colorFamily || null,
        pattern: g.pattern || null,
        season: Array.isArray(g.season) && g.season.length > 0 ? g.season : ['All-Season'],
        imageKey: g.imageKey || null,
      };
    }
    // Resilient fallback for referenced garments deleted prior to wear logging
    return {
      garmentId: id,
      name: 'Archived Wardrobe Piece',
      category: 'Accessories',
      subCategory: null,
      primaryColor: null,
      colorFamily: null,
      pattern: null,
      season: ['All-Season'],
      imageKey: null,
    };
  });

  return snapshot;
}

// ============================================================================
// 3. SCHEDULE MANAGEMENT (MUTABLE CALENDAR PLANS)
// ============================================================================

/**
 * Schedules an outfit for a date with concurrency-safe All Day / specific-slot mutual exclusion.
 * Uses an exclusive parent Outfit document write lock in a MongoDB transaction with automatic retry.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string|mongoose.Types.ObjectId} params.outfitId
 * @param {string} params.date - YYYY-MM-DD
 * @param {string} [params.slot='All Day']
 * @param {string} [params.notes]
 * @returns {Promise<object>} Formatted scheduled outfit
 */
export async function scheduleOutfit({ userId, outfitId, date, slot = 'All Day', notes }) {
  const userObjectId = toObjectId(userId, 'userId');
  const outfitObjectId = toObjectId(outfitId, 'outfitId');
  const validatedDate = validateCalendarDate(date, 'date');
  const validatedSlot = validateSlot(slot);
  const validatedNotes = validateNotes(notes);

  const session = await mongoose.startSession();
  try {
    let createdSchedule;
    await session.withTransaction(async () => {
      // Step 1: Acquire exclusive document write lock on the parent Outfit
      const lockedOutfit = await Outfit.findOneAndUpdate(
        { _id: outfitObjectId, userId: userObjectId },
        { $inc: { __v: 1 } },
        { session, returnDocument: 'after' }
      );

      if (!lockedOutfit) {
        const err = new Error('Outfit not found or access denied.');
        err.status = 404;
        throw err;
      }

      // Step 2: Query for conflicting active 'planned' schedules under the lock
      const conflictingQuery = {
        userId: userObjectId,
        outfitId: outfitObjectId,
        date: validatedDate,
        status: 'planned',
        ...(validatedSlot === 'All Day' ? {} : { slot: { $in: [validatedSlot, 'All Day'] } }),
      };

      const conflict = await ScheduledOutfit.findOne(conflictingQuery).session(session);
      if (conflict) {
        const message =
          conflict.slot === 'All Day'
            ? `Outfit is already scheduled as "All Day" for ${validatedDate}.`
            : validatedSlot === 'All Day'
            ? `Outfit already has a specific slot ("${conflict.slot}") on ${validatedDate}.`
            : `Outfit is already scheduled for the "${validatedSlot}" slot on ${validatedDate}.`;
        const err = new Error(message);
        err.status = 409;
        throw err;
      }

      // Step 3: Insert ScheduledOutfit inside the transaction
      const [doc] = await ScheduledOutfit.create(
        [
          {
            userId: userObjectId,
            outfitId: outfitObjectId,
            date: validatedDate,
            slot: validatedSlot,
            notes: validatedNotes,
            status: 'planned',
          },
        ],
        { session }
      );
      createdSchedule = doc;
    });

    return await formatScheduledOutfitWithSignedUrls(createdSchedule);
  } catch (err) {
    if (err.code === 11000) {
      const conflictErr = new Error(`Outfit is already scheduled for this slot on ${validatedDate}.`);
      conflictErr.status = 409;
      throw conflictErr;
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

/**
 * Retrieves scheduled outfits within a date range for the authenticated user.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} params.start - YYYY-MM-DD
 * @param {string} params.end - YYYY-MM-DD
 * @returns {Promise<{ scheduledOutfits: object[], range: object }>}
 */
export async function getSchedulesByRange({ userId, start, end }) {
  const userObjectId = toObjectId(userId, 'userId');
  const { start: validStart, end: validEnd } = validateDateRange(start, end);

  const schedules = await ScheduledOutfit.find({
    userId: userObjectId,
    date: { $gte: validStart, $lte: validEnd },
  })
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const formatted = await Promise.all(
    schedules.map((s) => formatScheduledOutfitWithSignedUrls(s))
  );

  return {
    scheduledOutfits: formatted,
    range: { start: validStart, end: validEnd },
  };
}

/**
 * Retrieves a single scheduled outfit by ID for the authenticated user.
 *
 * @param {object} params
 * @param {string} params.scheduleId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @returns {Promise<object>}
 */
export async function getScheduleById({ scheduleId, userId }) {
  const userObjectId = toObjectId(userId, 'userId');
  const schedObjectId = toObjectId(scheduleId, 'scheduleId');

  const schedule = await ScheduledOutfit.findOne({
    _id: schedObjectId,
    userId: userObjectId,
  }).lean();

  if (!schedule) {
    const error = new Error('Scheduled outfit not found or access denied.');
    error.status = 404;
    throw error;
  }

  return await formatScheduledOutfitWithSignedUrls(schedule);
}

/**
 * Updates a scheduled outfit (rescheduling, editing slot, editing notes).
 *
 * @param {object} params
 * @param {string} params.scheduleId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} [params.date]
 * @param {string} [params.slot]
 * @param {string} [params.notes]
 * @returns {Promise<object>}
 */
export async function updateSchedule({ scheduleId, userId, date, slot, notes }) {
  const userObjectId = toObjectId(userId, 'userId');
  const schedObjectId = toObjectId(scheduleId, 'scheduleId');

  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      const schedule = await ScheduledOutfit.findOne({
        _id: schedObjectId,
        userId: userObjectId,
      }).session(session);

      if (!schedule) {
        const err = new Error('Scheduled outfit not found or access denied.');
        err.status = 404;
        throw err;
      }

      if (schedule.status !== 'planned') {
        const err = new Error(`Cannot edit a scheduled outfit with status "${schedule.status}".`);
        err.status = 400;
        throw err;
      }

      const targetDate = date !== undefined ? validateCalendarDate(date, 'date') : schedule.date;
      const targetSlot = slot !== undefined ? validateSlot(slot) : schedule.slot;
      const targetNotes = notes !== undefined ? validateNotes(notes) : schedule.notes;

      // If date or slot is changing, acquire lock on outfit and verify mutual exclusion
      if (targetDate !== schedule.date || targetSlot !== schedule.slot) {
        await Outfit.findOneAndUpdate(
          { _id: schedule.outfitId, userId: userObjectId },
          { $inc: { __v: 1 } },
          { session, returnDocument: 'after' }
        );

        const conflictingQuery = {
          _id: { $ne: schedule._id },
          userId: userObjectId,
          outfitId: schedule.outfitId,
          date: targetDate,
          status: 'planned',
          ...(targetSlot === 'All Day' ? {} : { slot: { $in: [targetSlot, 'All Day'] } }),
        };

        const conflict = await ScheduledOutfit.findOne(conflictingQuery).session(session);
        if (conflict) {
          const message =
            conflict.slot === 'All Day'
              ? `Outfit is already scheduled as "All Day" for ${targetDate}.`
              : targetSlot === 'All Day'
              ? `Outfit already has a specific slot ("${conflict.slot}") on ${targetDate}.`
              : `Outfit is already scheduled for the "${targetSlot}" slot on ${targetDate}.`;
          const err = new Error(message);
          err.status = 409;
          throw err;
        }
      }

      schedule.date = targetDate;
      schedule.slot = targetSlot;
      schedule.notes = targetNotes;
      await schedule.save({ session });
      updated = schedule;
    });

    return await formatScheduledOutfitWithSignedUrls(updated);
  } catch (err) {
    if (err.code === 11000) {
      const conflictErr = new Error('Outfit is already scheduled for that date and time slot.');
      conflictErr.status = 409;
      throw conflictErr;
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

/**
 * Removes a scheduled outfit for the authenticated user.
 *
 * @param {object} params
 * @param {string} params.scheduleId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @returns {Promise<{ success: boolean, scheduledOutfitId: string }>}
 */
export async function deleteSchedule({ scheduleId, userId }) {
  const userObjectId = toObjectId(userId, 'userId');
  const schedObjectId = toObjectId(scheduleId, 'scheduleId');

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const schedule = await ScheduledOutfit.findOneAndDelete(
        {
          _id: schedObjectId,
          userId: userObjectId,
        },
        { session }
      );

      if (!schedule) {
        const err = new Error('Scheduled outfit not found or access denied.');
        err.status = 404;
        throw err;
      }

      // If a wear log was linked, disassociate its scheduledOutfitId reference
      if (schedule.wearLogId) {
        await OutfitWearLog.updateOne(
          { _id: schedule.wearLogId, userId: userObjectId },
          { $set: { scheduledOutfitId: null } },
          { session }
        );
      }

      result = { success: true, scheduledOutfitId: schedule._id.toString() };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

// ============================================================================
// 4. WEAR LOGGING & FULFILLMENT (IMMUTABLE SARTORIAL TELEMETRY)
// ============================================================================

/**
 * Marks a scheduled outfit as worn with transactional, idempotent wear logging.
 *
 * @param {object} params
 * @param {string} params.scheduleId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} [params.actualDate]
 * @param {string} [params.notes]
 * @returns {Promise<{ scheduledOutfit: object, wearLog: object }>}
 */
export async function markScheduledOutfitAsWorn({ scheduleId, userId, actualDate, notes }) {
  const userObjectId = toObjectId(userId, 'userId');
  const schedObjectId = toObjectId(scheduleId, 'scheduleId');
  const validatedWornDate = actualDate ? validateCalendarDate(actualDate, 'actualDate') : null;
  const validatedNotes = notes !== undefined ? validateNotes(notes) : null;

  const session = await mongoose.startSession();
  try {
    let resultSchedule;
    let resultWearLog;

    await session.withTransaction(async () => {
      const schedule = await ScheduledOutfit.findOne({
        _id: schedObjectId,
        userId: userObjectId,
      }).session(session);

      if (!schedule) {
        const err = new Error('Scheduled outfit not found or access denied.');
        err.status = 404;
        throw err;
      }

      // Idempotency: If already completed, load and return existing wear log
      if (schedule.status === 'completed' && schedule.wearLogId) {
        const existingLog = await OutfitWearLog.findOne({
          _id: schedule.wearLogId,
          userId: userObjectId,
        }).session(session);

        if (existingLog) {
          resultSchedule = schedule;
          resultWearLog = existingLog;
          return;
        }
      }

      if (schedule.status !== 'planned') {
        const err = new Error(`Cannot mark outfit as worn; schedule status is "${schedule.status}".`);
        err.status = 400;
        throw err;
      }

      // Fetch parent Outfit
      const outfit = await Outfit.findOne({
        _id: schedule.outfitId,
        userId: userObjectId,
      }).session(session);

      if (!outfit) {
        const err = new Error('Underlying outfit no longer exists in wardrobe.');
        err.status = 404;
        throw err;
      }

      // Build resilient garment snapshot
      const garmentsSnapshot = await buildGarmentsSnapshot(outfit.garments, userObjectId, session);

      // Create OutfitWearLog
      const [wearLog] = await OutfitWearLog.create(
        [
          {
            userId: userObjectId,
            outfitId: outfit._id,
            scheduledOutfitId: schedule._id,
            wornDate: validatedWornDate || schedule.date,
            outfitNameSnapshot: outfit.name,
            garmentsSnapshot,
            notes: validatedNotes !== null ? validatedNotes : schedule.notes,
          },
        ],
        { session }
      );

      // Transition ScheduledOutfit status to 'completed' and attach wearLogId
      schedule.status = 'completed';
      schedule.wearLogId = wearLog._id;
      await schedule.save({ session });

      resultSchedule = schedule;
      resultWearLog = wearLog;
    });

    return {
      scheduledOutfit: await formatScheduledOutfitWithSignedUrls(resultSchedule),
      wearLog: await formatWearLogWithSignedUrls(resultWearLog),
    };
  } finally {
    await session.endSession();
  }
}

/**
 * Logs a spontaneous outfit wear event without a prior scheduled entry.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string|mongoose.Types.ObjectId} params.outfitId
 * @param {string} params.wornDate
 * @param {string} [params.notes]
 * @returns {Promise<object>} Formatted wear log
 */
export async function logSpontaneousWear({ userId, outfitId, wornDate, notes }) {
  const userObjectId = toObjectId(userId, 'userId');
  const outfitObjectId = toObjectId(outfitId, 'outfitId');
  const validatedWornDate = validateCalendarDate(wornDate, 'wornDate');
  const validatedNotes = validateNotes(notes);

  const session = await mongoose.startSession();
  try {
    let createdLog;
    await session.withTransaction(async () => {
      const outfit = await Outfit.findOne({
        _id: outfitObjectId,
        userId: userObjectId,
      }).session(session);

      if (!outfit) {
        const err = new Error('Outfit not found or access denied.');
        err.status = 404;
        throw err;
      }

      const garmentsSnapshot = await buildGarmentsSnapshot(outfit.garments, userObjectId, session);

      const [doc] = await OutfitWearLog.create(
        [
          {
            userId: userObjectId,
            outfitId: outfit._id,
            scheduledOutfitId: null,
            wornDate: validatedWornDate,
            outfitNameSnapshot: outfit.name,
            garmentsSnapshot,
            notes: validatedNotes,
          },
        ],
        { session }
      );
      createdLog = doc;
    });

    return await formatWearLogWithSignedUrls(createdLog);
  } finally {
    await session.endSession();
  }
}

// ============================================================================
// 5. WEAR HISTORY RETRIEVAL & LIFECYCLE (EDIT & DELETE)
// ============================================================================

/**
 * Retrieves paginated historical wear records for the authenticated user.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} [params.start]
 * @param {string} [params.end]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.outfitId]
 * @param {string} [params.garmentId]
 * @returns {Promise<{ wearHistory: object[], pagination: object }>}
 */
export async function getWearHistory({
  userId,
  start,
  end,
  page = 1,
  limit = 20,
  outfitId,
  garmentId,
}) {
  const userObjectId = toObjectId(userId, 'userId');

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const query = { userId: userObjectId };

  if (start && end) {
    const { start: validStart, end: validEnd } = validateDateRange(start, end);
    query.wornDate = { $gte: validStart, $lte: validEnd };
  } else if (start) {
    query.wornDate = { $gte: validateCalendarDate(start, 'start') };
  } else if (end) {
    query.wornDate = { $lte: validateCalendarDate(end, 'end') };
  }

  if (outfitId) {
    query.outfitId = toObjectId(outfitId, 'outfitId');
  }

  if (garmentId) {
    query['garmentsSnapshot.garmentId'] = toObjectId(garmentId, 'garmentId');
  }

  const [totalItems, logs] = await Promise.all([
    OutfitWearLog.countDocuments(query),
    OutfitWearLog.find(query)
      .sort({ wornDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  const formatted = await Promise.all(logs.map((l) => formatWearLogWithSignedUrls(l)));

  return {
    wearHistory: formatted,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages: Math.ceil(totalItems / limitNum) || 1,
      hasNextPage: pageNum * limitNum < totalItems,
      hasPrevPage: pageNum > 1,
    },
  };
}

/**
 * Retrieves a single wear log by ID.
 *
 * @param {object} params
 * @param {string} params.wearLogId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @returns {Promise<object>}
 */
export async function getWearLogById({ wearLogId, userId }) {
  const userObjectId = toObjectId(userId, 'userId');
  const logObjectId = toObjectId(wearLogId, 'wearLogId');

  const log = await OutfitWearLog.findOne({
    _id: logObjectId,
    userId: userObjectId,
  }).lean();

  if (!log) {
    const error = new Error('Wear log not found or access denied.');
    error.status = 404;
    throw error;
  }

  return await formatWearLogWithSignedUrls(log);
}

/**
 * Updates a wear log's date and notes.
 * If linked to a scheduled outfit, verifies relationship consistency and updates schedule date.
 * Rejects stale or inconsistent relationships with 409 Conflict.
 *
 * @param {object} params
 * @param {string} params.wearLogId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} [params.wornDate]
 * @param {string} [params.notes]
 * @returns {Promise<object>}
 */
export async function updateWearLog({ wearLogId, userId, wornDate, notes }) {
  const userObjectId = toObjectId(userId, 'userId');
  const logObjectId = toObjectId(wearLogId, 'wearLogId');

  const session = await mongoose.startSession();
  try {
    let updatedLog;
    await session.withTransaction(async () => {
      const wearLog = await OutfitWearLog.findOne({
        _id: logObjectId,
        userId: userObjectId,
      }).session(session);

      if (!wearLog) {
        const err = new Error('Wear log not found or access denied.');
        err.status = 404;
        throw err;
      }

      const targetDate =
        wornDate !== undefined ? validateCalendarDate(wornDate, 'wornDate') : wearLog.wornDate;
      const targetNotes = notes !== undefined ? validateNotes(notes) : wearLog.notes;

      // Handle linked ScheduledOutfit relationship verification
      if (wearLog.scheduledOutfitId) {
        const linkedSchedule = await ScheduledOutfit.findOne({
          _id: wearLog.scheduledOutfitId,
          userId: userObjectId,
        }).session(session);

        if (!linkedSchedule) {
          const err = new Error('Linked scheduled outfit no longer exists; relationship is inconsistent.');
          err.status = 409;
          throw err;
        }

        // Must be completed and point to this exact wear log
        if (
          linkedSchedule.status !== 'completed' ||
          !linkedSchedule.wearLogId ||
          linkedSchedule.wearLogId.toString() !== wearLog._id.toString()
        ) {
          const err = new Error('Linked scheduled outfit relationship is inconsistent or stale.');
          err.status = 409;
          throw err;
        }

        // Synchronize date to scheduled outfit
        if (targetDate !== wearLog.wornDate) {
          linkedSchedule.date = targetDate;
          await linkedSchedule.save({ session });
        }
      }

      wearLog.wornDate = targetDate;
      wearLog.notes = targetNotes;
      await wearLog.save({ session });
      updatedLog = wearLog;
    });

    return await formatWearLogWithSignedUrls(updatedLog);
  } finally {
    await session.endSession();
  }
}

/**
 * Deletes a wear log. If linked to a valid ScheduledOutfit, reverts its status to 'planned'.
 *
 * @param {object} params
 * @param {string} params.wearLogId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @returns {Promise<{ success: boolean, wearLogId: string }>}
 */
export async function deleteWearLog({ wearLogId, userId }) {
  const userObjectId = toObjectId(userId, 'userId');
  const logObjectId = toObjectId(wearLogId, 'wearLogId');

  const session = await mongoose.startSession();
  try {
    let deletedId;
    await session.withTransaction(async () => {
      const wearLog = await OutfitWearLog.findOneAndDelete(
        {
          _id: logObjectId,
          userId: userObjectId,
        },
        { session }
      );

      if (!wearLog) {
        const err = new Error('Wear log not found or access denied.');
        err.status = 404;
        throw err;
      }

      // Revert scheduled outfit status if linked and verified
      if (wearLog.scheduledOutfitId) {
        const linkedSchedule = await ScheduledOutfit.findOne({
          _id: wearLog.scheduledOutfitId,
          userId: userObjectId,
          status: 'completed',
          wearLogId: wearLog._id,
        }).session(session);

        if (linkedSchedule) {
          linkedSchedule.status = 'planned';
          linkedSchedule.wearLogId = null;
          await linkedSchedule.save({ session });
        }
      }

      deletedId = wearLog._id.toString();
    });

    return { success: true, wearLogId: deletedId };
  } finally {
    await session.endSession();
  }
}

// ============================================================================
// 6. DASHBOARD UPCOMING LOOKS
// ============================================================================

/**
 * Retrieves upcoming planned looks for the Dashboard widget.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {number} [params.days=7]
 * @returns {Promise<object[]>} Array of formatted upcoming planned looks
 */
export async function getUpcomingOutfits({ userId, days = 7 }) {
  const userObjectId = toObjectId(userId, 'userId');
  const maxDays = Math.min(30, Math.max(1, parseInt(days, 10) || 7));

  // Compute today's date YYYY-MM-DD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const future = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
  const futureYear = future.getFullYear();
  const futureMonth = String(future.getMonth() + 1).padStart(2, '0');
  const futureDay = String(future.getDate()).padStart(2, '0');
  const futureStr = `${futureYear}-${futureMonth}-${futureDay}`;

  const schedules = await ScheduledOutfit.find({
    userId: userObjectId,
    date: { $gte: todayStr, $lte: futureStr },
    status: 'planned',
  })
    .sort({ date: 1, slot: 1 })
    .limit(10)
    .lean();

  return await Promise.all(schedules.map((s) => formatScheduledOutfitWithSignedUrls(s)));
}

export default {
  VALID_SLOTS,
  VALID_CATEGORIES,
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
  formatScheduledOutfitWithSignedUrls,
  formatWearLogWithSignedUrls,
};
