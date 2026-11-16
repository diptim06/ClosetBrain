import mongoose from 'mongoose';
import { cleanupExpiredUploads, processPendingDeletions } from './reconciliationService.js';

let isWorkerInitialized = false;
let isCycleExecuting = false;
let intervalTimer = null;

// Default execution interval: once every hour
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Runs a single reconciliation cycle safely.
 */
export async function runCleanupCycle() {
  if (isCycleExecuting) {
    return;
  }

  // Only run if database is connected
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  isCycleExecuting = true;
  try {
    const uploadResult = await cleanupExpiredUploads();
    if (uploadResult.cleanedCount > 0) {
      console.log(`[CleanupWorker] Purged ${uploadResult.cleanedCount} expired temporary uploads.`);
    }

    const deletionResult = await processPendingDeletions();
    if (deletionResult.resolvedCount > 0) {
      console.log(`[CleanupWorker] Reconciled ${deletionResult.resolvedCount} pending R2 deletions.`);
    }
  } catch (err) {
    console.error('[CleanupWorker] Reconciliation cycle error:', err.message);
  } finally {
    isCycleExecuting = false;
  }
}

/**
 * Initializes the background reconciliation worker.
 * Idempotent: guarantees no duplicate workers or intervals are created.
 *
 * @param {number} intervalMs - Execution period in milliseconds
 */
export function startCleanupWorker(intervalMs = DEFAULT_INTERVAL_MS) {
  if (isWorkerInitialized) {
    return;
  }

  isWorkerInitialized = true;

  // Run initial pass after 10 seconds to allow Atlas connection to settle
  const initialDelayTimer = setTimeout(() => {
    runCleanupCycle().catch(() => {});
  }, 10000);

  if (initialDelayTimer.unref) {
    initialDelayTimer.unref();
  }

  // Schedule recurring interval
  intervalTimer = setInterval(runCleanupCycle, intervalMs);
  if (intervalTimer.unref) {
    intervalTimer.unref();
  }

  console.log('✓ Background upload cleanup & R2 deletion worker initialized.');
}

/**
 * Gracefully shuts down the background worker.
 */
export function stopCleanupWorker() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
  isWorkerInitialized = false;
  isCycleExecuting = false;
}

export default {
  startCleanupWorker,
  stopCleanupWorker,
  runCleanupCycle,
};
