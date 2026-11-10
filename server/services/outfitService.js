import mongoose from 'mongoose';
import Outfit from '../models/Outfit.js';
import Garment from '../models/Garment.js';
import ScheduledOutfit from '../models/ScheduledOutfit.js';
import OutfitWearLog from '../models/OutfitWearLog.js';
import { getSignedImageUrl } from './r2.js';

/**
 * Escapes special regex characters in search queries.
 */
function escapeRegex(string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Validates the outfit name.
 *
 * @param {string} name
 * @returns {string} Sanitized trimmed name
 */
export function validateOutfitName(name) {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    const error = new Error('Outfit name is required and cannot be empty.');
    error.status = 400;
    throw error;
  }
  const trimmed = name.trim();
  if (trimmed.length > 100) {
    const error = new Error('Outfit name cannot exceed 100 characters.');
    error.status = 400;
    throw error;
  }
  return trimmed;
}

/**
 * Validates the outfit notes.
 *
 * @param {string} [notes]
 * @returns {string} Sanitized trimmed notes
 */
export function validateOutfitNotes(notes) {
  if (notes === undefined || notes === null) {
    return '';
  }
  if (typeof notes !== 'string') {
    const error = new Error('Notes must be a string.');
    error.status = 400;
    throw error;
  }
  const trimmed = notes.trim();
  if (trimmed.length > 500) {
    const error = new Error('Notes cannot exceed 500 characters.');
    error.status = 400;
    throw error;
  }
  return trimmed;
}

/**
 * Validates the outfit garment references.
 * Ensures:
 * 1. An array is provided with 1 to 10 garment IDs.
 * 2. All IDs are valid MongoDB ObjectIds.
 * 3. No duplicate garment IDs exist within the array.
 * 4. All referenced garments strictly belong to the authenticated user.
 *
 * @param {any[]} garments - Array of garment IDs
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<mongoose.Types.ObjectId[]>} Array of validated garment ObjectIds in input order
 */
export async function validateOutfitGarments(garments, userId) {
  if (!Array.isArray(garments)) {
    const error = new Error('Garments must be provided as an array.');
    error.status = 400;
    throw error;
  }

  if (garments.length === 0) {
    const error = new Error('An outfit must contain at least one garment.');
    error.status = 400;
    throw error;
  }

  if (garments.length > 10) {
    const error = new Error('An outfit cannot contain more than 10 garments.');
    error.status = 400;
    throw error;
  }

  const stringIds = [];
  for (const id of garments) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error(`Invalid garment ID provided: ${id}`);
      error.status = 400;
      throw error;
    }
    stringIds.push(id.toString());
  }

  const uniqueIds = new Set(stringIds);
  if (uniqueIds.size !== stringIds.length) {
    const error = new Error('Duplicate garments are not allowed in an outfit.');
    error.status = 400;
    throw error;
  }

  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const objectIds = stringIds.map((id) => new mongoose.Types.ObjectId(id));
  const ownedGarments = await Garment.find({
    _id: { $in: objectIds },
    userId: userObjectId,
  }).lean();

  if (ownedGarments.length !== objectIds.length) {
    const error = new Error('One or more garments were not found or do not belong to you.');
    error.status = 400;
    throw error;
  }

  return objectIds;
}

/**
 * Formats a garment object with a fresh signed R2 image URL and safely strips internal storage keys.
 *
 * @param {object} garment
 * @returns {Promise<object|null>}
 */
async function formatGarment(garment) {
  if (!garment) return null;
  const raw = typeof garment.toObject === 'function' ? garment.toObject() : garment;
  const { imageKey, ...safeGarment } = raw;
  let signedUrl = null;
  if (imageKey) {
    try {
      signedUrl = await getSignedImageUrl(imageKey, 3600);
    } catch (err) {
      console.warn(`[OutfitService] Could not generate signed image URL for key "${imageKey}":`, err.message);
    }
  }
  return {
    ...safeGarment,
    signedUrl,
  };
}

/**
 * Populates an outfit with its referenced garments and generates fresh signed URLs.
 * Maintains user-specified garment ordering and gracefully skips any missing or deleted pieces.
 *
 * @param {object} outfitDoc
 * @returns {Promise<object>}
 */
async function populateAndFormatOutfit(outfitDoc) {
  if (!outfitDoc) return null;
  const outfit = typeof outfitDoc.toObject === 'function' ? outfitDoc.toObject() : outfitDoc;

  const garmentIds = outfit.garments || [];
  if (garmentIds.length === 0) {
    return {
      ...outfit,
      garments: [],
    };
  }

  const garments = await Garment.find({
    _id: { $in: garmentIds },
    userId: outfit.userId,
  }).lean();

  const formattedGarments = await Promise.all(garments.map((g) => formatGarment(g)));
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
 * Creates a new outfit for the authenticated user.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} params.name
 * @param {string[]} params.garments - Array of 1 to 10 garment IDs
 * @param {string} [params.notes]
 * @returns {Promise<object>}
 */
export async function createOutfit({ userId, name, garments, notes }) {
  if (!userId) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  const validatedName = validateOutfitName(name);
  const validatedNotes = validateOutfitNotes(notes);
  const validatedGarments = await validateOutfitGarments(garments, userId);

  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const outfit = await Outfit.create({
    userId: userObjectId,
    name: validatedName,
    garments: validatedGarments,
    notes: validatedNotes,
  });

  return await populateAndFormatOutfit(outfit);
}

/**
 * Retrieves a single outfit by ID scoped strictly to the authenticated user.
 *
 * @param {object} params
 * @param {string} params.outfitId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @returns {Promise<object>}
 */
export async function getOutfitById({ outfitId, userId }) {
  if (!userId) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  if (!outfitId || !mongoose.Types.ObjectId.isValid(outfitId)) {
    const error = new Error('Outfit not found or access denied.');
    error.status = 404;
    throw error;
  }

  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const outfit = await Outfit.findOne({
    _id: outfitId,
    userId: userObjectId,
  }).lean();

  if (!outfit) {
    const error = new Error('Outfit not found or access denied.');
    error.status = 404;
    throw error;
  }

  return await populateAndFormatOutfit(outfit);
}

/**
 * Retrieves outfits belonging exclusively to the authenticated user with search, sorting, and pagination.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} [params.search]
 * @param {string} [params.sort='createdAt_desc']
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<{ outfits: object[], pagination: object }>}
 */
export async function getOutfits({
  userId,
  search,
  sort = 'createdAt_desc',
  page = 1,
  limit = 20,
}) {
  if (!userId) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const query = { userId: userObjectId };

  if (search && typeof search === 'string' && search.trim().length > 0) {
    const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [{ name: searchRegex }, { notes: searchRegex }];
  }

  let sortCriteria = { createdAt: -1 };
  switch (sort) {
    case 'createdAt_asc':
    case 'oldest':
      sortCriteria = { createdAt: 1 };
      break;
    case 'name_asc':
      sortCriteria = { name: 1 };
      break;
    case 'name_desc':
      sortCriteria = { name: -1 };
      break;
    case 'createdAt_desc':
    case 'newest':
    default:
      sortCriteria = { createdAt: -1 };
      break;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [outfits, totalItems] = await Promise.all([
    Outfit.find(query).sort(sortCriteria).skip(skip).limit(limitNum).lean(),
    Outfit.countDocuments(query),
  ]);

  // Bulk populate garments across all outfits to avoid N+1 queries
  const allGarmentIds = [
    ...new Set(outfits.flatMap((o) => (o.garments || []).map((id) => id.toString()))),
  ];

  let garmentMap = new Map();
  if (allGarmentIds.length > 0) {
    const garments = await Garment.find({
      _id: { $in: allGarmentIds },
      userId: userObjectId,
    }).lean();

    const formattedGarments = await Promise.all(garments.map((g) => formatGarment(g)));
    garmentMap = new Map(formattedGarments.map((g) => [g._id.toString(), g]));
  }

  const populatedOutfits = outfits.map((outfit) => {
    const orderedGarments = (outfit.garments || [])
      .map((id) => garmentMap.get(id.toString()))
      .filter(Boolean);
    return {
      ...outfit,
      garments: orderedGarments,
    };
  });

  return {
    outfits: populatedOutfits,
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
 * Updates an outfit's name, notes, and/or garment references.
 *
 * @param {object} params
 * @param {string} params.outfitId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} [params.name]
 * @param {string[]} [params.garments]
 * @param {string} [params.notes]
 * @returns {Promise<object>}
 */
export async function updateOutfit({ outfitId, userId, name, garments, notes }) {
  if (!userId) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  if (!outfitId || !mongoose.Types.ObjectId.isValid(outfitId)) {
    const error = new Error('Outfit not found or access denied.');
    error.status = 404;
    throw error;
  }

  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const outfit = await Outfit.findOne({
    _id: outfitId,
    userId: userObjectId,
  });

  if (!outfit) {
    const error = new Error('Outfit not found or access denied.');
    error.status = 404;
    throw error;
  }

  if (name !== undefined) {
    outfit.name = validateOutfitName(name);
  }

  if (notes !== undefined) {
    outfit.notes = validateOutfitNotes(notes);
  }

  if (garments !== undefined) {
    outfit.garments = await validateOutfitGarments(garments, userId);
  }

  await outfit.save();

  return await populateAndFormatOutfit(outfit);
}

/**
 * Deletes an outfit scoped strictly to the authenticated user.
 * Cascade-deletes all associated ScheduledOutfit entries (planned, completed, cancelled)
 * and disassociates linked OutfitWearLog entries (setting outfitId and scheduledOutfitId to null)
 * within an atomic database transaction, preserving historical wear snapshots without dangling references.
 *
 * @param {object} params
 * @param {string} params.outfitId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @returns {Promise<{ success: boolean, outfitId: string }>}
 */
export async function deleteOutfit({ outfitId, userId }) {
  if (!userId) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  if (!outfitId || !mongoose.Types.ObjectId.isValid(outfitId)) {
    const error = new Error('Outfit not found or access denied.');
    error.status = 404;
    throw error;
  }

  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      // 1. Delete outfit scoped strictly to user
      const deleted = await Outfit.findOneAndDelete(
        {
          _id: outfitId,
          userId: userObjectId,
        },
        { session }
      );

      if (!deleted) {
        const error = new Error('Outfit not found or access denied.');
        error.status = 404;
        throw error;
      }

      // 2. Collect associated schedule IDs before deletion
      const associatedSchedules = await ScheduledOutfit.find(
        { outfitId, userId: userObjectId },
        { _id: 1 },
        { session }
      ).lean();
      const scheduleIds = associatedSchedules.map((s) => s._id);

      // 3. Cascade delete ALL associated ScheduledOutfit documents
      await ScheduledOutfit.deleteMany(
        { outfitId, userId: userObjectId },
        { session }
      );

      // 4. Disassociate wear logs using BOTH outfit and schedule references
      // Preserves outfitNameSnapshot, garmentsSnapshot, wornDate, and notes
      await OutfitWearLog.updateMany(
        {
          userId: userObjectId,
          $or: [
            { outfitId },
            ...(scheduleIds.length > 0 ? [{ scheduledOutfitId: { $in: scheduleIds } }] : []),
          ],
        },
        {
          $set: {
            outfitId: null,
            scheduledOutfitId: null,
          },
        },
        { session }
      );

      result = { success: true, outfitId: outfitId.toString() };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export default {
  createOutfit,
  getOutfits,
  getOutfitById,
  updateOutfit,
  deleteOutfit,
  validateOutfitName,
  validateOutfitNotes,
  validateOutfitGarments,
};
