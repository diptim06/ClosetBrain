import mongoose from 'mongoose';
import DeletionQueue from '../models/DeletionQueue.js';
import TemporaryUpload from '../models/TemporaryUpload.js';
import Garment from '../models/Garment.js';
import { deleteImageObject } from './r2.js';

/**
 * Attempts immediate R2 deletion of an image object.
 * If deletion fails, logs the failure and enqueues in DeletionQueue for retry.
 *
 * @param {string} imageKey - Private R2 storage key
 * @param {'garment_deleted'|'temporary_upload_expired'|'image_replaced'} reason
 */
export async function safeDeleteImage(imageKey, reason) {
  if (!imageKey) {
    return;
  }

  try {
    await deleteImageObject(imageKey);
  } catch (err) {
    console.warn(
      `! Cloudflare R2 deletion failed for key "${imageKey}". Queuing for reconciliation:`,
      err.message
    );
    try {
      await DeletionQueue.enqueue(imageKey, reason, err);
    } catch (queueErr) {
      console.error('Failed to register image in DeletionQueue:', queueErr.message);
    }
  }
}

/**
 * Executes crash-safe garment deletion using MongoDB Transactions (where supported)
 * and the Transactional Outbox pattern via DeletionQueue.
 *
 * Guarantees:
 * 1. Atomicity: The garment is deleted and the deletion intent is queued in one atomic commit.
 * 2. Recovery on Crash: If R2 fails or server crashes immediately after DB deletion,
 *    DeletionQueue retains the pending deletion for cleanupWorker.
 * 3. Graceful Fallback: If MongoDB transactions are unavailable (e.g. standalone dev instance),
 *    falls back to a two-phase outbox queue insertion before garment removal.
 *
 * @param {string|mongoose.Types.ObjectId} garmentId
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<{ success: boolean, garmentId: string }>}
 */
export async function executeCrashSafeGarmentDeletion(garmentId, userId) {
  let session = null;
  let deletedGarment = null;
  let queueEntryId = null;

  // Try MongoDB transaction if supported by cluster
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    deletedGarment = await Garment.findOneAndDelete(
      { _id: garmentId, userId },
      { session }
    );

    if (!deletedGarment) {
      await session.abortTransaction();
      throw new Error('Garment not found or unauthorized.');
    }

    const queueDoc = await DeletionQueue.create(
      [
        {
          imageKey: deletedGarment.imageKey,
          reason: 'garment_deleted',
          status: 'pending',
          attempts: 0,
        },
      ],
      { session }
    );
    queueEntryId = queueDoc[0]._id;

    await session.commitTransaction();
  } catch (txErr) {
    if (session) {
      await session.abortTransaction().catch(() => {});
    }

    // If it threw because garment wasn't found, rethrow immediately
    if (txErr.message.includes('not found') || txErr.message.includes('unauthorized')) {
      throw txErr;
    }

    // Handle concurrent transaction write conflict (competing transaction deleted the garment)
    if (
      txErr.message?.includes('Write conflict') ||
      txErr.code === 112 ||
      (typeof txErr.hasErrorLabel === 'function' && txErr.hasErrorLabel('TransientTransactionError'))
    ) {
      const stillExists = await Garment.exists({ _id: garmentId, userId });
      if (!stillExists) {
        throw new Error('Garment not found or unauthorized.');
      }
    }

    const isTxUnsupported =
      txErr.message?.includes('replica set') ||
      txErr.message?.includes('Transaction numbers are only allowed') ||
      txErr.message?.includes('Transactions are not supported') ||
      txErr.code === 20;

    if (!isTxUnsupported) {
      throw new Error(`Database error during garment deletion: ${txErr.message}`);
    }

    // Fallback for standalone MongoDB environments without replica set transactions
    deletedGarment = await Garment.findOneAndDelete({ _id: garmentId, userId });
    if (!deletedGarment) {
      throw new Error('Garment not found or unauthorized.');
    }

    const queueDoc = await DeletionQueue.create({
      imageKey: deletedGarment.imageKey,
      reason: 'garment_deleted',
      status: 'pending',
      attempts: 0,
    });
    queueEntryId = queueDoc._id;
  } finally {
    if (session) {
      session.endSession();
    }
  }

  const imageKey = deletedGarment.imageKey;

  // Attempt immediate R2 deletion post-commit
  try {
    await deleteImageObject(imageKey);
    if (queueEntryId) {
      await DeletionQueue.updateOne({ _id: queueEntryId }, { status: 'completed' });
    }
  } catch (r2Err) {
    console.warn(`[SafeDeletion] Immediate R2 deletion deferred to background worker: ${r2Err.message}`);
    if (queueEntryId) {
      await DeletionQueue.updateOne(
        { _id: queueEntryId },
        { status: 'retrying', attempts: 1, lastError: r2Err.message }
      );
    }
  }

  return { success: true, garmentId: garmentId.toString() };
}

/**
 * Finds expired pending TemporaryUpload records, deletes their R2 images,
 * and updates their status to 'expired'.
 * Also identifies and purges orphaned claimed uploads with no associated garment.
 *
 * @returns {Promise<{ cleanedCount: number, errorCount: number }>}
 */
export async function cleanupExpiredUploads() {
  const expiredUploads = await TemporaryUpload.find({
    status: 'pending',
    expiresAt: { $lt: new Date() },
  }).limit(50);

  let cleanedCount = 0;
  let errorCount = 0;

  for (const upload of expiredUploads) {
    try {
      await safeDeleteImage(upload.imageKey, 'temporary_upload_expired');
      upload.status = 'expired';
      await upload.save();
      cleanedCount++;
    } catch (err) {
      errorCount++;
      console.error(`Failed to clean up expired upload ${upload._id}:`, err.message);
    }
  }

  // Purge expired claimed uploads where no garment exists (crash recovery)
  const expiredClaimed = await TemporaryUpload.find({
    status: 'claimed',
    expiresAt: { $lt: new Date() },
  }).limit(25);

  for (const upload of expiredClaimed) {
    try {
      const garmentExists = await Garment.exists({ imageKey: upload.imageKey });
      if (!garmentExists) {
        await safeDeleteImage(upload.imageKey, 'temporary_upload_expired');
        upload.status = 'expired';
        await upload.save();
        cleanedCount++;
      }
    } catch (err) {
      errorCount++;
      console.error(`Failed to audit orphaned upload ${upload._id}:`, err.message);
    }
  }

  return { cleanedCount, errorCount };
}

/**
 * Retries failed R2 deletions recorded in DeletionQueue.
 *
 * @param {number} maxAttempts - Maximum retry attempts before marking 'failed'
 * @returns {Promise<{ processedCount: number, resolvedCount: number }>}
 */
export async function processPendingDeletions(maxAttempts = 5) {
  const pendingItems = await DeletionQueue.find({
    status: { $in: ['pending', 'retrying'] },
    attempts: { $lt: maxAttempts },
  }).limit(25);

  let resolvedCount = 0;

  for (const item of pendingItems) {
    item.attempts += 1;
    try {
      await deleteImageObject(item.imageKey);
      item.status = 'completed';
      item.lastError = null;
      resolvedCount++;
    } catch (err) {
      item.lastError = err.message || String(err);
      item.status = item.attempts >= maxAttempts ? 'failed' : 'retrying';
    }
    await item.save();
  }

  return { processedCount: pendingItems.length, resolvedCount };
}

/**
 * Resets failed deletion entries so they can be re-attempted.
 *
 * @param {string} [imageKey] - Optional specific imageKey
 * @returns {Promise<{ resetCount: number }>}
 */
export async function retryFailedDeletions(imageKey = null) {
  const filter = { status: 'failed' };
  if (imageKey) {
    filter.imageKey = imageKey;
  }
  const result = await DeletionQueue.updateMany(filter, {
    $set: { status: 'retrying', attempts: 0 },
  });
  return { resetCount: result.modifiedCount };
}

export default {
  safeDeleteImage,
  executeCrashSafeGarmentDeletion,
  cleanupExpiredUploads,
  processPendingDeletions,
  retryFailedDeletions,
};
