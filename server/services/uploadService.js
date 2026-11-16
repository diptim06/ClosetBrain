import TemporaryUpload from '../models/TemporaryUpload.js';
import { processAndNormalizeImage } from './imageProcessor.js';
import { uploadImageObject, getSignedImageUrl, generateGarmentKey } from './r2.js';

// Temporary uploads expire after 2 hours if not claimed
const TEMP_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Validates, processes, uploads image to R2, and tracks it under TemporaryUpload.
 *
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
 * @param {Buffer} rawBuffer - Uploaded image buffer
 * @returns {Promise<{ uploadId: string, signedUrl: string, width: number, height: number, sizeBytes: number, normalizedBuffer: Buffer }>}
 */
export async function createTemporaryUpload(userId, rawBuffer) {
  if (!userId) {
    throw new Error('User authentication is required to initiate an upload.');
  }

  // 1. Process and normalize image through Sharp
  const { buffer, metadata } = await processAndNormalizeImage(rawBuffer);

  // 2. Generate isolated storage key
  const imageKey = generateGarmentKey(userId);

  // 3. Upload to private R2 bucket
  await uploadImageObject(buffer, imageKey, metadata.mimeType);

  // 4. Record temporary upload in MongoDB
  const expiresAt = new Date(Date.now() + TEMP_UPLOAD_TTL_MS);
  const tempRecord = await TemporaryUpload.create({
    userId,
    imageKey,
    status: 'pending',
    mimeType: metadata.mimeType,
    width: metadata.width,
    height: metadata.height,
    sizeBytes: metadata.sizeBytes,
    expiresAt,
  });

  // 5. Generate signed preview URL (1 hour validity)
  const signedUrl = await getSignedImageUrl(imageKey, 3600);

  return {
    uploadId: tempRecord._id.toString(),
    signedUrl,
    width: metadata.width,
    height: metadata.height,
    sizeBytes: metadata.sizeBytes,
    normalizedBuffer: buffer,
  };
}

/**
 * Claims a temporary upload for a garment, verifying session ownership and validity.
 *
 * @param {string} uploadId - ID of TemporaryUpload document
 * @param {string|mongoose.Types.ObjectId} userId - Authenticated user ID
 * @returns {Promise<{ imageKey: string, width: number, height: number }>}
 */
export async function claimTemporaryUpload(uploadId, userId) {
  if (!uploadId || !userId) {
    throw new Error('Missing uploadId or userId.');
  }

  const upload = await TemporaryUpload.claimUpload(uploadId, userId);
  if (!upload) {
    throw new Error(
      'Invalid, expired, or unauthorized upload. Please re-upload the garment photo.'
    );
  }

  return {
    imageKey: upload.imageKey,
    width: upload.width,
    height: upload.height,
  };
}

export default {
  createTemporaryUpload,
  claimTemporaryUpload,
};
