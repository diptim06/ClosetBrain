import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

/**
 * Retrieves R2 credentials supporting standard environment variable aliases.
 * Sensitive values are never logged or exposed.
 */
function getR2Credentials() {
  const accountId =
    process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    process.env.R2_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    '';

  const accessKeyId =
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    process.env.R2_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID ||
    '';

  const secretAccessKey =
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    '';

  const bucketName =
    process.env.CLOUDFLARE_R2_BUCKET_NAME ||
    process.env.R2_BUCKET_NAME ||
    process.env.R2_BUCKET ||
    '';

  const endpoint =
    process.env.CLOUDFLARE_R2_ENDPOINT ||
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

  return {
    accountId: accountId.trim(),
    accessKeyId: accessKeyId.trim(),
    secretAccessKey: secretAccessKey.trim(),
    bucketName: bucketName.trim(),
    endpoint: endpoint.trim(),
  };
}

let s3ClientInstance = null;

/**
 * Returns a cached S3Client configured for Cloudflare R2's S3-compatible API.
 */
function getClient() {
  if (s3ClientInstance) {
    return s3ClientInstance;
  }

  const { accessKeyId, secretAccessKey, endpoint } = getR2Credentials();

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error(
      'Cloudflare R2 is not fully configured. Please ensure R2 account ID, access key, secret key, and bucket name are set.'
    );
  }

  s3ClientInstance = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientInstance;
}

/**
 * Checks whether R2 environment variables are present without exposing secrets.
 */
export function isR2Configured() {
  const { accessKeyId, secretAccessKey, bucketName, endpoint } = getR2Credentials();
  return Boolean(accessKeyId && secretAccessKey && bucketName && endpoint);
}

/**
 * Returns a safe configuration status object omitting all secret keys.
 */
export function getSafeR2Status() {
  const { accountId, accessKeyId, secretAccessKey, bucketName, endpoint } = getR2Credentials();
  return {
    configured: isR2Configured(),
    hasAccountId: Boolean(accountId),
    hasAccessKey: Boolean(accessKeyId),
    hasSecretKey: Boolean(secretAccessKey),
    bucketName: bucketName || null,
    endpointConfigured: Boolean(endpoint),
  };
}

/**
 * Generates an isolated, collision-free storage key for a user's garment.
 */
export function generateGarmentKey(userId) {
  if (!userId) {
    throw new Error('User ID is required to generate a garment storage key.');
  }
  const uniqueId = `${Date.now()}-${crypto.randomUUID()}`;
  return `garments/${userId.toString()}/${uniqueId}.webp`;
}

/**
 * Uploads a WebP image buffer to the private R2 bucket.
 *
 * @param {Buffer} buffer - Normalized image buffer
 * @param {string} key - R2 destination key
 * @param {string} mimeType - Content-Type header (defaults to image/webp)
 */
export async function uploadImageObject(buffer, key, mimeType = 'image/webp') {
  const client = getClient();
  const { bucketName } = getR2Credentials();

  if (!bucketName) {
    throw new Error('R2 bucket name is not configured.');
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await client.send(command);
  return { key, bucket: bucketName };
}

/**
 * Generates a time-limited signed URL for private bucket viewing.
 *
 * @param {string} key - R2 storage key
 * @param {number} expiresInSeconds - Expiration time in seconds (default 3600 / 1 hour)
 * @returns {Promise<string>} Signed URL string
 */
export async function getSignedImageUrl(key, expiresInSeconds = 3600) {
  if (!key) {
    return null;
  }

  const client = getClient();
  const { bucketName } = getR2Credentials();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Retrieves an image object buffer directly from the private R2 bucket.
 * Used internally by backend services without exposing signed URLs or making external HTTP requests.
 *
 * @param {string} key - R2 storage key
 * @returns {Promise<Buffer>}
 */
export async function getImageBuffer(key) {
  if (!key) {
    throw new Error('Storage key is required to retrieve image buffer.');
  }

  const client = getClient();
  const { bucketName } = getR2Credentials();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await client.send(command);
  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}

/**
 * Deletes an image object from the private R2 bucket.
 *
 * @param {string} key - R2 storage key
 */
export async function deleteImageObject(key) {
  if (!key) {
    return;
  }

  const client = getClient();
  const { bucketName } = getR2Credentials();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await client.send(command);
}

/**
 * Tests connection to the private R2 bucket without printing credentials.
 */
export async function testR2Connection() {
  try {
    if (!isR2Configured()) {
      return {
        connected: false,
        error: 'R2 environment variables are missing or incomplete in .env.',
      };
    }

    const client = getClient();
    const { bucketName } = getR2Credentials();

    const command = new HeadBucketCommand({ Bucket: bucketName });
    await client.send(command);

    return { connected: true, bucket: bucketName };
  } catch (err) {
    return {
      connected: false,
      error: err.message || 'Unable to connect to Cloudflare R2 bucket.',
    };
  }
}
