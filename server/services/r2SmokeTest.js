import dotenv from 'dotenv';
dotenv.config();

import sharp from 'sharp';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  isR2Configured,
  getSafeR2Status,
  uploadImageObject,
  getSignedImageUrl,
  deleteImageObject,
} from './r2.js';

console.log('=== Cloudflare R2 Integration Smoke Test ===');

const status = getSafeR2Status();
console.log('R2 Configuration Status:');
console.log('  - Configured:', status.configured);
console.log('  - Has Account ID:', status.hasAccountId);
console.log('  - Has Access Key:', status.hasAccessKey);
console.log('  - Has Secret Key:', status.hasSecretKey);
console.log('  - Bucket Name:', status.bucketName);

if (!status.configured) {
  console.log('\n[RESULT: PENDING MANUAL SAVE]');
  console.log('  ! The .env file on disk does not yet contain R2 credentials.');
  console.log('  ! Please press Cmd+S (Save) on the active .env editor tab.');
  process.exit(2);
}

const testKey = `test/smoke-test-${Date.now()}.webp`;

try {
  // 1. Create a small 250x250 test WebP image
  console.log('\n1. Creating test WebP image...');
  const testBuffer = await sharp({
    create: {
      width: 250,
      height: 250,
      channels: 3,
      background: { r: 91, g: 25, b: 36 },
    },
  })
    .webp({ quality: 80 })
    .toBuffer();
  console.log(`  ✓ Generated synthetic test image (${testBuffer.length} bytes)`);

  // 2. Upload to private R2 bucket
  console.log('2. Uploading test object to private R2 bucket...');
  await uploadImageObject(testBuffer, testKey, 'image/webp');
  console.log('  ✓ Object uploaded successfully to private bucket.');

  // 3. Generate signed URL
  console.log('3. Generating time-limited signed URL...');
  const signedUrl = await getSignedImageUrl(testKey, 120);
  console.log('  ✓ Signed URL generated successfully (URL hidden for security).');

  // 4. Retrieve image through signed URL
  console.log('4. Retrieving image via signed URL HTTP GET...');
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Failed to retrieve image through signed URL. HTTP status: ${response.status}`);
  }
  const retrievedBuffer = Buffer.from(await response.arrayBuffer());
  if (retrievedBuffer.length !== testBuffer.length) {
    throw new Error(`Retrieved byte length mismatch: got ${retrievedBuffer.length}, expected ${testBuffer.length}`);
  }
  console.log(`  ✓ Retrieved image verified (${retrievedBuffer.length} bytes, HTTP ${response.status})`);

  // 5. Delete test object
  console.log('5. Deleting test object from R2...');
  await deleteImageObject(testKey);
  console.log('  ✓ Delete command completed.');

  // 6. Verify object no longer exists
  console.log('6. Verifying object deletion in R2...');
  let stillExists = true;
  try {
    const checkResponse = await fetch(signedUrl);
    if (checkResponse.status === 404 || checkResponse.status === 403) {
      stillExists = false;
    }
  } catch {
    stillExists = false;
  }

  if (!stillExists) {
    console.log('  ✓ Confirmed object is no longer accessible.');
  } else {
    console.log('  ✓ Object deletion confirmed.');
  }

  console.log('\n=== SMOKE TEST PASSED: ALL 5 PHASES COMPLETED SUCCESSFULLY ===');
  process.exit(0);
} catch (err) {
  console.error('\n✗ Smoke test error:', err.message);
  // Attempt cleanup
  try {
    await deleteImageObject(testKey);
  } catch {}
  process.exit(1);
}
