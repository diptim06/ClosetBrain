import sharp from 'sharp';

const SUPPORTED_FORMATS = new Set(['jpeg', 'jpg', 'png', 'webp', 'avif', 'heif', 'heic', 'tiff']);

const MIN_DIMENSION_PX = 200;
const MAX_DIMENSION_PX = 8000;
const MAX_TARGET_DIMENSION_PX = 2048;

/**
 * Validates actual image buffer content using Sharp,
 * normalizes orientation, enforces dimension limits,
 * and converts to optimized WebP.
 *
 * @param {Buffer} inputBuffer - Raw file buffer from upload
 * @returns {Promise<{ buffer: Buffer, metadata: { width: number, height: number, sizeBytes: number, mimeType: string, format: string } }>}
 */
export async function processAndNormalizeImage(inputBuffer) {
  if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
    throw new Error('Invalid or empty image buffer.');
  }

  let metadata;
  try {
    metadata = await sharp(inputBuffer).metadata();
  } catch (err) {
    throw new Error('Image decoding failed. The uploaded file is corrupt or not a valid image.');
  }

  if (!metadata || !metadata.format) {
    throw new Error('Unable to determine image format.');
  }

  const normalizedFormat = metadata.format.toLowerCase();
  if (!SUPPORTED_FORMATS.has(normalizedFormat)) {
    throw new Error(
      `Unsupported image format: "${metadata.format}". Supported formats are JPEG, PNG, WebP, AVIF, and HEIC.`
    );
  }

  const width = metadata.width || 0;
  const height = metadata.height || 0;

  if (width < MIN_DIMENSION_PX || height < MIN_DIMENSION_PX) {
    throw new Error(
      `Image resolution (${width}×${height}) is too low. Minimum resolution is ${MIN_DIMENSION_PX}×${MIN_DIMENSION_PX} pixels.`
    );
  }

  if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
    throw new Error(
      `Image resolution (${width}×${height}) exceeds maximum limit of ${MAX_DIMENSION_PX}×${MAX_DIMENSION_PX} pixels.`
    );
  }

  // Normalize orientation via EXIF, resize down to 2048×2048 if larger, and convert to WebP
  const result = await sharp(inputBuffer)
    .rotate() // Automatically corrects mobile camera orientation using EXIF
    .resize({
      width: MAX_TARGET_DIMENSION_PX,
      height: MAX_TARGET_DIMENSION_PX,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 85,
      effort: 4,
    })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    metadata: {
      width: result.info.width,
      height: result.info.height,
      sizeBytes: result.info.size,
      mimeType: 'image/webp',
      format: 'webp',
    },
  };
}

export default processAndNormalizeImage;
