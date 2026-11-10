import express from 'express';
import mongoose from 'mongoose';
import requireAuth from '../middleware/auth.js';
import {
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
} from '../services/calendarService.js';

const router = express.Router();

// All calendar endpoints strictly require an authenticated user session
router.use(requireAuth);

/**
 * GET /api/calendar
 * Returns scheduled outfits within a date range (start, end).
 */
router.get('/', async (req, res) => {
  try {
    const { start, end } = req.query || {};
    if (!start || !end) {
      return res.status(400).json({
        error: 'Both start and end query parameters (YYYY-MM-DD) are required.',
      });
    }

    const result = await getSchedulesByRange({
      userId: req.userId,
      start,
      end,
    });

    return res.status(200).json({
      success: true,
      scheduledOutfits: result.scheduledOutfits,
      range: result.range,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to retrieve calendar schedules.',
    });
  }
});

/**
 * POST /api/calendar
 * Schedules an outfit for a specific date and time slot.
 */
router.post('/', async (req, res) => {
  try {
    const { outfitId, date, slot, notes } = req.body || {};
    if (!outfitId) {
      return res.status(400).json({
        error: 'outfitId is required to schedule an outfit.',
      });
    }

    const scheduledOutfit = await scheduleOutfit({
      userId: req.userId,
      outfitId,
      date,
      slot,
      notes,
    });

    return res.status(201).json({
      success: true,
      scheduledOutfit,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to schedule outfit.',
    });
  }
});

/**
 * GET /api/calendar/upcoming
 * Returns upcoming planned looks for the Dashboard widget.
 */
router.get('/upcoming', async (req, res) => {
  try {
    const { days } = req.query || {};
    const upcomingOutfits = await getUpcomingOutfits({
      userId: req.userId,
      days: days ? parseInt(days, 10) : 7,
    });

    return res.status(200).json({
      success: true,
      upcomingOutfits,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to retrieve upcoming planned outfits.',
    });
  }
});

/**
 * GET /api/calendar/wear-history
 * Paginated historical wear records sorted by wornDate descending.
 */
router.get('/wear-history', async (req, res) => {
  try {
    const { start, end, page, limit, outfitId, garmentId } = req.query || {};
    const result = await getWearHistory({
      userId: req.userId,
      start,
      end,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      outfitId,
      garmentId,
    });

    return res.status(200).json({
      success: true,
      wearHistory: result.wearHistory,
      pagination: result.pagination,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to retrieve wear history.',
    });
  }
});

/**
 * GET /api/calendar/wear-history/:id
 * Retrieves a single wear log by ID.
 */
router.get('/wear-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: 'Wear log not found or access denied.',
      });
    }

    const wearLog = await getWearLogById({
      wearLogId: id,
      userId: req.userId,
    });

    return res.status(200).json({
      success: true,
      wearLog,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Wear log not found or access denied.',
    });
  }
});

/**
 * PATCH /api/calendar/wear-history/:id
 * Updates a wear log's date and notes. Synchronizes linked ScheduledOutfit date.
 */
router.patch('/wear-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: 'Wear log not found or access denied.',
      });
    }

    const { wornDate, notes } = req.body || {};
    const wearLog = await updateWearLog({
      wearLogId: id,
      userId: req.userId,
      wornDate,
      notes,
    });

    return res.status(200).json({
      success: true,
      wearLog,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to update wear log.',
    });
  }
});

/**
 * DELETE /api/calendar/wear-history/:id
 * Deletes a wear log. If linked to a scheduled outfit, reverts its status to 'planned'.
 */
router.delete('/wear-history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: 'Wear log not found or access denied.',
      });
    }

    const result = await deleteWearLog({
      wearLogId: id,
      userId: req.userId,
    });

    return res.status(200).json({
      success: true,
      message: 'Wear log removed successfully.',
      wearLogId: result.wearLogId,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to delete wear log.',
    });
  }
});

/**
 * POST /api/calendar/wear
 * Logs spontaneous wear without a prior schedule.
 */
router.post('/wear', async (req, res) => {
  try {
    const { outfitId, wornDate, notes } = req.body || {};
    if (!outfitId) {
      return res.status(400).json({
        error: 'outfitId is required to log wear.',
      });
    }

    const wearLog = await logSpontaneousWear({
      userId: req.userId,
      outfitId,
      wornDate,
      notes,
    });

    return res.status(201).json({
      success: true,
      wearLog,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to log spontaneous wear.',
    });
  }
});

/**
 * POST /api/calendar/:id/wear
 * Marks a scheduled outfit as worn (idempotent, transactional).
 */
router.post('/:id/wear', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: 'Scheduled outfit not found or access denied.',
      });
    }

    const { actualDate, notes } = req.body || {};
    const result = await markScheduledOutfitAsWorn({
      scheduleId: id,
      userId: req.userId,
      actualDate,
      notes,
    });

    return res.status(200).json({
      success: true,
      scheduledOutfit: result.scheduledOutfit,
      wearLog: result.wearLog,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to mark scheduled outfit as worn.',
    });
  }
});

/**
 * GET /api/calendar/:id
 * Retrieves a single scheduled outfit by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: 'Scheduled outfit not found or access denied.',
      });
    }

    const scheduledOutfit = await getScheduleById({
      scheduleId: id,
      userId: req.userId,
    });

    return res.status(200).json({
      success: true,
      scheduledOutfit,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Scheduled outfit not found or access denied.',
    });
  }
});

/**
 * PATCH /api/calendar/:id
 * Updates an active planned schedule.
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: 'Scheduled outfit not found or access denied.',
      });
    }

    const { date, slot, notes } = req.body || {};
    const scheduledOutfit = await updateSchedule({
      scheduleId: id,
      userId: req.userId,
      date,
      slot,
      notes,
    });

    return res.status(200).json({
      success: true,
      scheduledOutfit,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to update scheduled outfit.',
    });
  }
});

/**
 * DELETE /api/calendar/:id
 * Removes a scheduled outfit.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: 'Scheduled outfit not found or access denied.',
      });
    }

    const result = await deleteSchedule({
      scheduleId: id,
      userId: req.userId,
    });

    return res.status(200).json({
      success: true,
      message: 'Scheduled outfit removed successfully.',
      scheduledOutfitId: result.scheduledOutfitId,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to delete scheduled outfit.',
    });
  }
});

export default router;
