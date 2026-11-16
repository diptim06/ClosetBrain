import express from 'express';
import mongoose from 'mongoose';
import requireAuth from '../middleware/auth.js';
import { recommendationRateLimiter } from '../middleware/aiRateLimiter.js';
import {
  createOutfit,
  getOutfits,
  getOutfitById,
  updateOutfit,
  deleteOutfit,
} from '../services/outfitService.js';
import { getOutfitRecommendations } from '../services/recommendationService.js';

const router = express.Router();

// All outfit routes strictly require an authenticated user session
router.use(requireAuth);

/**
 * POST /api/outfits
 * Creates a new outfit for the authenticated user.
 * userId is derived strictly from session (req.userId).
 */
const handleCreateOutfit = async (req, res) => {
  try {
    const { name, garments, notes } = req.body || {};

    const outfit = await createOutfit({
      userId: req.userId,
      name,
      garments,
      notes,
    });

    return res.status(201).json({
      success: true,
      outfit,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to create outfit.',
    });
  }
};

/**
 * GET /api/outfits
 * Lists outfits belonging to the authenticated user with pagination, sorting, and search.
 */
const handleGetOutfits = async (req, res) => {
  try {
    const { search, sort, page, limit } = req.query || {};

    const result = await getOutfits({
      userId: req.userId,
      search,
      sort,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      outfits: result.outfits,
      pagination: result.pagination,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to retrieve outfits.',
    });
  }
};

/**
 * GET /api/outfits/:id
 * Fetches a single outfit by ID with populated garments and signed image URLs.
 */
const handleGetOutfitById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: 'Outfit not found or access denied.',
      });
    }

    const outfit = await getOutfitById({
      outfitId: id,
      userId: req.userId,
    });

    return res.status(200).json({
      success: true,
      outfit,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Outfit not found or access denied.',
    });
  }
};

/**
 * PATCH /api/outfits/:id
 * Updates an outfit's name, garments, and/or notes.
 */
const handleUpdateOutfit = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: 'Outfit not found or access denied.',
      });
    }

    const { name, garments, notes } = req.body || {};

    const outfit = await updateOutfit({
      outfitId: id,
      userId: req.userId,
      name,
      garments,
      notes,
    });

    return res.status(200).json({
      success: true,
      outfit,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to update outfit.',
    });
  }
};

/**
 * DELETE /api/outfits/:id
 * Deletes an outfit scoped strictly to the authenticated user.
 */
const handleDeleteOutfit = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: 'Outfit not found or access denied.',
      });
    }

    const result = await deleteOutfit({
      outfitId: id,
      userId: req.userId,
    });

    return res.status(200).json({
      success: true,
      message: 'Outfit deleted successfully.',
      outfitId: result.outfitId,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to delete outfit.',
    });
  }
};

/**
 * POST /api/outfits/recommendations
 * Generates verified AI outfit recommendations composed strictly from user's owned garments.
 */
const handleGetRecommendations = async (req, res) => {
  try {
    const { prompt, occasion, season, count } = req.body || {};

    const result = await getOutfitRecommendations({
      userId: req.userId,
      prompt,
      occasion,
      season,
      count,
    });

    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to generate recommendations.',
      code: err.code || 'RECOMMENDATION_ERROR',
      details: err.details || null,
    });
  }
};

// Mount route handlers
router.post('/recommendations', recommendationRateLimiter, handleGetRecommendations);
router.post('/', handleCreateOutfit);
router.get('/', handleGetOutfits);
router.get('/:id', handleGetOutfitById);
router.patch('/:id', handleUpdateOutfit);
router.delete('/:id', handleDeleteOutfit);

export default router;
