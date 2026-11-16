import mongoose from 'mongoose';
import TemporaryUpload from '../models/TemporaryUpload.js';
import { getImageBuffer, getSignedImageUrl } from './r2.js';
import { analyzeGarmentImage } from './gemini.js';

/**
 * Analyzes a temporary upload's image using Gemini AI vision.
 *
 * Enforces strict security & business logic:
 * - Session ownership: Only the user who uploaded the image can analyze it.
 * - Upload state: Only 'pending', non-expired uploads can be analyzed.
 * - Private storage: Retrieves the image directly from private R2 storage.
 * - Non-persistence: Never creates or saves a Garment to MongoDB.
 * - Safe claiming: Leaves TemporaryUpload status as 'pending' for user confirmation.
 *
 * @param {object} params
 * @param {string} params.uploadId - TemporaryUpload document ID
 * @param {string|mongoose.Types.ObjectId} params.userId - Authenticated user ID
 * @returns {Promise<{ uploadId: string, imageKey: string, signedUrl: string, attributes: object }>}
 */
export async function analyzeTemporaryUpload({ uploadId, userId }) {
  if (!uploadId) {
    const error = new Error('uploadId is required.');
    error.status = 400;
    throw error;
  }

  if (!userId) {
    const error = new Error('Authentication is required to analyze an upload.');
    error.status = 401;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(uploadId)) {
    const error = new Error('Invalid upload ID format.');
    error.status = 400;
    throw error;
  }

  // 1. Verify ownership and existence in TemporaryUpload
  const upload = await TemporaryUpload.findOne({
    _id: uploadId,
    userId: userId,
  });

  if (!upload) {
    const error = new Error('Temporary upload not found or access denied.');
    error.status = 404;
    throw error;
  }

  // 2. Verify state is pending (prevent analyzing claimed or expired uploads)
  if (upload.status !== 'pending') {
    const error = new Error(
      `Upload cannot be analyzed because its status is "${upload.status}". Only pending uploads can be analyzed.`
    );
    error.status = 400;
    throw error;
  }

  // 3. Verify upload has not expired
  if (upload.expiresAt && new Date(upload.expiresAt) <= new Date()) {
    const error = new Error('Temporary upload session has expired. Please re-upload the photo.');
    error.status = 410;
    throw error;
  }

  // 4. Retrieve processed image buffer directly from private R2
  let imageBuffer;
  try {
    imageBuffer = await getImageBuffer(upload.imageKey);
  } catch (err) {
    const error = new Error('Unable to retrieve image from storage.');
    error.status = 502;
    error.originalMessage = err.message;
    throw error;
  }

  // 5. Run Gemini AI vision analysis
  const attributes = await analyzeGarmentImage(imageBuffer, {
    mimeType: upload.mimeType || 'image/webp',
  });

  // 6. Generate signed preview URL (1 hour) for the frontend review step
  const signedUrl = await getSignedImageUrl(upload.imageKey, 3600);

  // Return draft attributes WITHOUT creating any Garment in MongoDB
  return {
    uploadId: upload._id.toString(),
    imageKey: upload.imageKey,
    signedUrl,
    attributes,
  };
}

export default {
  analyzeTemporaryUpload,
};
