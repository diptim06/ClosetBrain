import express from 'express';
import requireAuth from '../middleware/auth.js';
import handleSingleImageUpload from '../middleware/upload.js';
import aiRateLimiter from '../middleware/aiRateLimiter.js';
import { createTemporaryUpload } from '../services/uploadService.js';
import { analyzeTemporaryUpload } from '../services/garmentAnalysisService.js';
import {
  createGarment,
  getGarments,
  getGarmentById,
  updateGarment,
  deleteGarment,
  getWardrobeSummary,
} from '../services/wardrobeService.js';

const router = express.Router();

// All wardrobe routes require an authenticated user session
router.use(requireAuth);

/**
 * POST /api/wardrobe/upload-image
 * Validates, normalizes, uploads image to private Cloudflare R2, and tracks under TemporaryUpload.
 */
router.post('/upload-image', handleSingleImageUpload('image'), async (req, res) => {
  try {
    const uploadResult = await createTemporaryUpload(req.userId, req.file.buffer);

    return res.status(201).json({
      success: true,
      uploadId: uploadResult.uploadId,
      signedUrl: uploadResult.signedUrl,
      width: uploadResult.width,
      height: uploadResult.height,
      sizeBytes: uploadResult.sizeBytes,
    });
  } catch (err) {
    return res.status(400).json({
      error: err.message || 'Image processing or storage upload failed.',
    });
  }
});

/**
 * POST /api/wardrobe/analyze
 * Analyzes an existing temporary upload using Gemini AI vision.
 * Strictly verifies user ownership and pending status.
 * NEVER creates or saves a garment in MongoDB.
 */
router.post('/analyze', aiRateLimiter, async (req, res) => {
  try {
    const { uploadId } = req.body;

    if (!uploadId) {
      return res.status(400).json({
        error: 'Missing required uploadId parameter.',
      });
    }

    const analysisResult = await analyzeTemporaryUpload({
      uploadId,
      userId: req.userId,
    });

    return res.status(200).json({
      success: true,
      uploadId: analysisResult.uploadId,
      signedUrl: analysisResult.signedUrl,
      attributes: analysisResult.attributes,
    });
  } catch (err) {
    const statusCode = err.status || (err.code === 'AI_TIMEOUT' ? 504 : 500);

    return res.status(statusCode).json({
      error: err.message || 'AI garment analysis failed. You may proceed with manual entry.',
      code: err.code || 'AI_ANALYSIS_FAILED',
    });
  }
});

// -------------------------------------------------------------
// GARMENT CRUD ENDPOINTS (Milestone 3A)
// -------------------------------------------------------------

/**
 * Handler for creating a garment from a claimed temporary upload.
 */
const handleCreateGarment = async (req, res) => {
  try {
    const uploadId = req.body.uploadId;
    // Support nested attributes object or flat body payload
    const attributes = req.body.attributes || { ...req.body };
    delete attributes.uploadId;
    delete attributes.userId;
    delete attributes.imageKey;
    delete attributes.imageUrl;

    const garment = await createGarment({
      userId: req.userId,
      uploadId,
      attributes,
    });

    return res.status(201).json({
      success: true,
      garment,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to create garment.',
      errors: err.errors || undefined,
    });
  }
};

/**
 * Handler for listing authenticated user's garments with filters and pagination.
 */
const handleGetGarments = async (req, res) => {
  try {
    const { category, season, formality, search, sort, page, limit } = req.query;

    const result = await getGarments({
      userId: req.userId,
      category,
      season,
      formality,
      search,
      sort,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      garments: result.garments,
      pagination: result.pagination,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to retrieve garments.',
    });
  }
};

/**
 * Handler for fetching a single garment by ID.
 */
const handleGetGarmentById = async (req, res) => {
  try {
    const garment = await getGarmentById({
      garmentId: req.params.id,
      userId: req.userId,
    });

    return res.status(200).json({
      success: true,
      garment,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Garment not found.',
    });
  }
};

/**
 * Handler for updating an existing garment's attributes.
 */
const handleUpdateGarment = async (req, res) => {
  try {
    const updates = { ...req.body };
    // Strictly prevent modifying immutable or ownership properties
    delete updates.userId;
    delete updates.imageKey;
    delete updates.imageUrl;
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    const garment = await updateGarment({
      garmentId: req.params.id,
      userId: req.userId,
      updates,
    });

    return res.status(200).json({
      success: true,
      garment,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to update garment.',
      errors: err.errors || undefined,
    });
  }
};

/**
 * Handler for safe deletion of a garment with transactional outbox queue.
 */
const handleDeleteGarment = async (req, res) => {
  try {
    const result = await deleteGarment({
      garmentId: req.params.id,
      userId: req.userId,
    });

    return res.status(200).json({
      success: true,
      message: 'Garment deleted successfully.',
      garmentId: result.garmentId,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to delete garment.',
    });
  }
};

/**
 * Handler for retrieving live wardrobe summary metrics.
 */
const handleGetSummary = async (req, res) => {
  try {
    const summary = await getWardrobeSummary({
      userId: req.userId,
    });

    return res.status(200).json({
      success: true,
      summary,
      ...summary,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to retrieve wardrobe summary.',
    });
  }
};

// Mount routes: support /garments and /items
router.post('/garments', handleCreateGarment);
router.post('/items', handleCreateGarment);

// Summary route MUST precede parameterized :id routes to prevent route collisions
router.get('/summary', handleGetSummary);

router.get('/garments', handleGetGarments);
router.get('/items', handleGetGarments);

router.get('/garments/:id', handleGetGarmentById);
router.get('/items/:id', handleGetGarmentById);

router.patch('/garments/:id', handleUpdateGarment);
router.patch('/items/:id', handleUpdateGarment);

router.delete('/garments/:id', handleDeleteGarment);
router.delete('/items/:id', handleDeleteGarment);

export default router;
