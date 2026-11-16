import mongoose from 'mongoose';
import Garment from '../models/Garment.js';
import TemporaryUpload from '../models/TemporaryUpload.js';
import { claimTemporaryUpload } from './uploadService.js';
import { getSignedImageUrl } from './r2.js';
import { executeCrashSafeGarmentDeletion } from './reconciliationService.js';
import {
  validateGarmentCreatePayload,
  validateGarmentUpdatePayload,
} from '../utils/garmentValidator.js';

/**
 * Escapes regex special characters for safe search queries.
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a new garment from an authenticated user's temporary upload and reviewed attributes.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.userId - Authenticated user ID
 * @param {string} params.uploadId - TemporaryUpload ID
 * @param {object} params.attributes - Garment metadata
 * @returns {Promise<object>} Created garment with signed image preview URL
 */
export async function createGarment({ userId, uploadId, attributes }) {
  if (!userId) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  if (!uploadId || !mongoose.Types.ObjectId.isValid(uploadId)) {
    const error = new Error('A valid temporary uploadId is required to create a garment.');
    error.status = 400;
    throw error;
  }

  // 1. Validate garment attributes server-side
  const { valid, errors, data: validatedAttributes } = validateGarmentCreatePayload(attributes);
  if (!valid) {
    const error = new Error(`Validation failed: ${errors.join(' ')}`);
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  // 2. Transactional claiming & creation ensuring atomicity and non-silent data loss
  let session = null;
  let garment = null;
  let claimedUpload = null;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    claimedUpload = await TemporaryUpload.findOneAndUpdate(
      {
        _id: uploadId,
        userId: userId,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { status: 'claimed' },
      },
      {
        session,
        returnDocument: 'after',
      }
    );

    if (!claimedUpload) {
      await session.abortTransaction();
      const error = new Error('Invalid, expired, or unauthorized upload session. Please re-upload the garment photo.');
      error.status = 400;
      throw error;
    }

    const createdDocs = await Garment.create(
      [
        {
          ...validatedAttributes,
          userId,
          imageKey: claimedUpload.imageKey,
        },
      ],
      { session }
    );
    garment = createdDocs[0];

    await session.commitTransaction();
  } catch (txErr) {
    if (session) {
      await session.abortTransaction().catch(() => {});
    }

    // Rethrow client 400 errors directly
    if (txErr.status === 400) {
      throw txErr;
    }

    const isTxUnsupported =
      txErr.message?.includes('replica set') ||
      txErr.message?.includes('Transaction numbers are only allowed') ||
      txErr.message?.includes('Transactions are not supported') ||
      txErr.code === 20;

    if (!isTxUnsupported) {
      const error = new Error(`Database error during garment creation: ${txErr.message}`);
      error.status = 500;
      throw error;
    }

    // Fallback for standalone MongoDB environments without replica set transactions
    try {
      claimedUpload = await claimTemporaryUpload(uploadId, userId);
    } catch (claimErr) {
      const error = new Error(claimErr.message || 'Invalid, expired, or unauthorized upload session.');
      error.status = 400;
      throw error;
    }

    try {
      garment = await Garment.create({
        ...validatedAttributes,
        userId,
        imageKey: claimedUpload.imageKey,
      });
    } catch (dbErr) {
      // Revert temporary upload so image is not orphaned or lost
      await TemporaryUpload.updateOne(
        { _id: uploadId, userId },
        { $set: { status: 'pending' } }
      ).catch(() => {});
      const error = new Error(`Failed to save garment: ${dbErr.message}`);
      error.status = 500;
      throw error;
    }
  } finally {
    if (session) {
      session.endSession();
    }
  }

  // 3. Generate signed image URL for the response
  const signedUrl = await getSignedImageUrl(garment.imageKey, 3600);

  return {
    ...garment.toObject(),
    signedUrl,
  };
}

/**
 * Retrieves garments belonging exclusively to the authenticated user with filtering, search, sorting and pagination.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} [params.category]
 * @param {string} [params.season]
 * @param {string} [params.formality]
 * @param {string} [params.search]
 * @param {string} [params.sort='createdAt_desc']
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<{ garments: object[], pagination: object }>}
 */
export async function getGarments({
  userId,
  category,
  season,
  formality,
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

  // Strictly user-scoped query
  const query = { userId };

  // Category filter
  if (category && typeof category === 'string' && category.trim().toLowerCase() !== 'all') {
    query.category = new RegExp(`^${escapeRegex(category.trim())}$`, 'i');
  }

  // Season filter
  if (season && typeof season === 'string' && season.trim().toLowerCase() !== 'all') {
    query.season = new RegExp(`^${escapeRegex(season.trim())}$`, 'i');
  }

  // Formality filter
  if (formality && typeof formality === 'string' && formality.trim().toLowerCase() !== 'all') {
    query.formality = new RegExp(`^${escapeRegex(formality.trim())}$`, 'i');
  }

  // Search filter across name, brand, subCategory, primaryColor, tags, notes
  if (search && typeof search === 'string' && search.trim().length > 0) {
    const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [
      { name: searchRegex },
      { brand: searchRegex },
      { subCategory: searchRegex },
      { primaryColor: searchRegex },
      { tags: searchRegex },
      { notes: searchRegex },
    ];
  }

  // Sorting
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

  // Pagination parameters
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [garments, totalItems] = await Promise.all([
    Garment.find(query).sort(sortCriteria).skip(skip).limit(limitNum).lean(),
    Garment.countDocuments(query),
  ]);

  // Sign URLs in parallel for all returned garments
  const garmentsWithUrls = await Promise.all(
    garments.map(async (g) => {
      const signedUrl = await getSignedImageUrl(g.imageKey, 3600);
      return {
        ...g,
        signedUrl,
      };
    })
  );

  return {
    garments: garmentsWithUrls,
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
 * Retrieves a single garment by ID belonging exclusively to the authenticated user.
 *
 * @param {object} params
 * @param {string} params.garmentId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @returns {Promise<object>}
 */
export async function getGarmentById({ garmentId, userId }) {
  if (!userId) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  if (!garmentId || !mongoose.Types.ObjectId.isValid(garmentId)) {
    const error = new Error('Garment not found or access denied.');
    error.status = 404;
    throw error;
  }

  const garment = await Garment.findOne({ _id: garmentId, userId }).lean();
  if (!garment) {
    const error = new Error('Garment not found or access denied.');
    error.status = 404;
    throw error;
  }

  const signedUrl = await getSignedImageUrl(garment.imageKey, 3600);

  return {
    ...garment,
    signedUrl,
  };
}

/**
 * Updates an existing garment belonging exclusively to the authenticated user.
 * Strictly prevents modifications to userId, imageKey, or system identifiers.
 *
 * @param {object} params
 * @param {string} params.garmentId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {object} params.updates
 * @returns {Promise<object>}
 */
export async function updateGarment({ garmentId, userId, updates }) {
  if (!userId) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  if (!garmentId || !mongoose.Types.ObjectId.isValid(garmentId)) {
    const error = new Error('Garment not found or access denied.');
    error.status = 404;
    throw error;
  }

  const garment = await Garment.findOne({ _id: garmentId, userId });
  if (!garment) {
    const error = new Error('Garment not found or access denied.');
    error.status = 404;
    throw error;
  }

  // Validate update payload
  const { valid, errors, data: validatedUpdates } = validateGarmentUpdatePayload(updates);
  if (!valid) {
    const error = new Error(`Update validation failed: ${errors.join(' ')}`);
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  // Apply validated updates (userId, imageKey, _id are never modified)
  Object.assign(garment, validatedUpdates);
  await garment.save();

  const signedUrl = await getSignedImageUrl(garment.imageKey, 3600);

  return {
    ...garment.toObject(),
    signedUrl,
  };
}

/**
 * Color family palette swatches for ClosetBrain luxury aesthetic.
 */
export const COLOR_FAMILY_SWATCHES = {
  Neutrals: '#D8C7B5',
  'Earth Tones': '#B76E79',
  Monochrome: '#4B4B52',
  Pastels: '#C2B6CF',
  Vibrant: '#A65D47',
  Metallics: '#C8A97E',
  Unknown: '#8C8379',
};

/**
 * Aggregates live wardrobe metrics for the authenticated user only.
 * Returns total count, weekly additions (rolling 7 days), category breakdown,
 * color family distribution with computed percentages, and top non-empty brands.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @returns {Promise<object>}
 */
export async function getWardrobeSummary({ userId }) {
  if (!userId) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  // Rolling 7-day window for consistent weekly additions
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [aggregateResult] = await Garment.aggregate([
    { $match: { userId: userObjectId } },
    {
      $facet: {
        total: [{ $count: 'count' }],
        thisWeek: [
          { $match: { createdAt: { $gte: sevenDaysAgo } } },
          { $count: 'count' },
        ],
        byCategory: [
          { $group: { _id: '$category', count: { $sum: 1 } } },
        ],
        byColorFamily: [
          {
            $group: {
              _id: { $ifNull: ['$colorFamily', 'Unknown'] },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ],
        topBrands: [
          {
            $match: {
              brand: { $exists: true, $ne: null, $type: 'string' },
            },
          },
          {
            $project: {
              trimmedBrand: { $trim: { input: '$brand' } },
            },
          },
          {
            $match: {
              trimmedBrand: { $ne: '' },
            },
          },
          {
            $group: {
              _id: '$trimmedBrand',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 6 },
        ],
      },
    },
  ]);

  const totalItems = aggregateResult?.total?.[0]?.count || 0;
  const recentlyAddedThisWeek = aggregateResult?.thisWeek?.[0]?.count || 0;

  // Build standard category counts initialized to zero
  const categoryCounts = {
    Tops: 0,
    Bottoms: 0,
    Outerwear: 0,
    Dresses: 0,
    Shoes: 0,
    Accessories: 0,
    'Ethnic Wear': 0,
  };

  if (Array.isArray(aggregateResult?.byCategory)) {
    for (const item of aggregateResult.byCategory) {
      if (item._id && typeof item.count === 'number') {
        categoryCounts[item._id] = item.count;
      }
    }
  }

  // Calculate dynamic color family breakdown with percentages
  const colorDistribution = [];
  if (totalItems > 0 && Array.isArray(aggregateResult?.byColorFamily)) {
    for (const item of aggregateResult.byColorFamily) {
      const label = item._id || 'Unknown';
      const count = item.count || 0;
      const percentage = Math.round((count / totalItems) * 100);
      colorDistribution.push({
        label,
        count,
        percentage,
        color: COLOR_FAMILY_SWATCHES[label] || '#8C8379',
      });
    }
  }

  const topTone = colorDistribution.length > 0 ? colorDistribution[0].label : 'None';

  // Extract top brand strings
  const topBrands = [];
  if (Array.isArray(aggregateResult?.topBrands)) {
    for (const item of aggregateResult.topBrands) {
      if (item._id) {
        topBrands.push(item._id);
      }
    }
  }

  return {
    totalItems,
    totalGarments: totalItems,
    recentlyAddedThisWeek,
    categoryCounts,
    colorDistribution,
    topTone,
    topBrands,
  };
}

/**
 * Deletes a garment safely using transactional outbox pattern via DeletionQueue.
 *
 * @param {object} params
 * @param {string} params.garmentId
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @returns {Promise<{ success: boolean, garmentId: string }>}
 */
export async function deleteGarment({ garmentId, userId }) {
  if (!userId) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  if (!garmentId || !mongoose.Types.ObjectId.isValid(garmentId)) {
    const error = new Error('Garment not found or access denied.');
    error.status = 404;
    throw error;
  }

  try {
    return await executeCrashSafeGarmentDeletion(garmentId, userId);
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('unauthorized')) {
      const error = new Error('Garment not found or access denied.');
      error.status = 404;
      throw error;
    }
    throw err;
  }
}

export default {
  createGarment,
  getGarments,
  getGarmentById,
  updateGarment,
  deleteGarment,
  getWardrobeSummary,
};
