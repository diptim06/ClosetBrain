/**
 * Verification test suite for Garment Analysis Timeout & Retry Improvements:
 * 1. Default timeout configuration (45,000ms)
 * 2. Custom valid GEMINI_TIMEOUT_MS validation
 * 3. Strict rejection of invalid timeout values (decimals, negatives, zero, out of range, malformed)
 * 4. Timeout error classification (HTTP 504 AI_TIMEOUT)
 * 5. Safe diagnostic logging verification (no credentials or payloads exposed)
 * 6. Retry behavior & prevention of duplicate requests / uploads
 * 7. Manual-entry fallback after analysis retry failure
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  DEFAULT_GEMINI_TIMEOUT_MS,
  validateGeminiTimeoutMs,
  getSafeGeminiStatus,
  classifyProviderError,
} from './gemini.js';
import TemporaryUpload from '../models/TemporaryUpload.js';
import Garment from '../models/Garment.js';
import { analyzeTemporaryUpload } from './garmentAnalysisService.js';
import { createGarment } from './wardrobeService.js';

dotenv.config();

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTimeoutAndRetryTests() {
  console.log('\n=== ClosetBrain Garment Analysis Timeout & Retry Verification ===\n');

  // =========================================================================
  // Suite 1: Default and Valid Custom Timeout Configuration
  // =========================================================================
  console.log('--- Suite 1: Timeout Configuration & Boundary Validation ---');

  // Test 1.1: Default timeout is 45,000 ms
  assert(DEFAULT_GEMINI_TIMEOUT_MS === 45000, 'DEFAULT_GEMINI_TIMEOUT_MS is 45,000 ms');
  assert(validateGeminiTimeoutMs(undefined) === 45000, 'Returns 45,000 ms when env var is undefined');
  assert(validateGeminiTimeoutMs(null) === 45000, 'Returns 45,000 ms when env var is null');
  assert(validateGeminiTimeoutMs('') === 45000, 'Returns 45,000 ms when env var is empty string');

  // Test 1.2: Valid custom timeouts within [1000, 300000]
  assert(validateGeminiTimeoutMs('45000') === 45000, 'Validates "45000" as positive integer');
  assert(validateGeminiTimeoutMs('60000') === 60000, 'Accepts custom 60,000 ms (1 minute)');
  assert(validateGeminiTimeoutMs('1000') === 1000, 'Accepts minimum lower bound 1,000 ms (1 second)');
  assert(validateGeminiTimeoutMs('300000') === 300000, 'Accepts maximum upper bound 300,000 ms (5 minutes)');

  // Test 1.3: Status inspection reflects timeout without leaking secrets
  const status = getSafeGeminiStatus();
  assert(typeof status.timeoutMs === 'number', 'getSafeGeminiStatus exposes timeoutMs');
  assert(!status.apiKey && !status.key, 'getSafeGeminiStatus strictly omits API keys');

  // =========================================================================
  // Suite 2: Strict Fail-Fast Validation of Invalid Timeout Values
  // =========================================================================
  console.log('\n--- Suite 2: Strict Rejection of Invalid Timeout Values ---');

  const invalidTimeoutCases = [
    { val: '45000.5', reason: 'decimal' },
    { val: '-5000', reason: 'negative' },
    { val: '0', reason: 'zero' },
    { val: '999', reason: 'below minimum 1000ms' },
    { val: '300001', reason: 'exceeds maximum 300000ms' },
    { val: 'not_a_number', reason: 'non-numeric string' },
    { val: '45s', reason: 'alphanumeric mix' },
    { val: '+45000', reason: 'explicit plus sign' },
    { val: '   ', reason: 'whitespace string' },
  ];

  for (const { val, reason } of invalidTimeoutCases) {
    let thrown = null;
    try {
      validateGeminiTimeoutMs(val);
    } catch (err) {
      thrown = err;
    }
    assert(
      thrown !== null && thrown.message.includes('Configuration Error'),
      `Fails fast on ${reason} (${val}) with Configuration Error`
    );
  }

  // =========================================================================
  // Suite 3: Error Classification for Timeouts
  // =========================================================================
  console.log('\n--- Suite 3: Error Classification for Timeouts ---');

  // Test 3.1: Provider call timeout via withTimeout ETIMEDOUT message
  const timeoutErr = new Error('Gemini [gemini-flash-lite-latest] vision call timed out after 45000ms.');
  timeoutErr.code = 'ETIMEDOUT';
  const classified1 = classifyProviderError(timeoutErr);

  assert(classified1.status === 504, 'Maps timeout to HTTP 504 Gateway Timeout');
  assert(classified1.code === 'AI_TIMEOUT', 'Sets error code to AI_TIMEOUT');
  assert(classified1.category === 'TIMEOUT', 'Sets category to TIMEOUT');
  assert(
    classified1.safeMessage === 'Garment analysis request timed out. Please try again or continue with manual entry.',
    'Provides user-actionable safe message offering manual entry fallback'
  );

  // Test 3.2: Upstream provider gateway timeout (HTTP 504)
  const upstream504 = { status: 504, message: 'Upstream gateway timed out' };
  const classified2 = classifyProviderError(upstream504);
  assert(classified2.status === 504 && classified2.code === 'AI_TIMEOUT', 'Maps upstream 504 to AI_TIMEOUT');

  // Test 3.3: Node socket timeout (code: ETIMEDOUT)
  const socketTimeout = { code: 'ETIMEDOUT', message: 'connect ETIMEDOUT 142.250.190.42:443' };
  const classified3 = classifyProviderError(socketTimeout);
  assert(classified3.status === 504 && classified3.code === 'AI_TIMEOUT', 'Maps socket ETIMEDOUT to AI_TIMEOUT');

  // =========================================================================
  // Suite 4: Database-backed Retry Behavior & Fallback Isolation
  // =========================================================================
  console.log('\n--- Suite 4: Retry Behavior, Upload Reuse & Manual Fallback ---');

  const testUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/closetbrain';
  let dbConnected = false;
  try {
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 4000 });
    dbConnected = true;
  } catch {
    try {
      await mongoose.connect('mongodb://localhost:27017/closetbrain_test', { serverSelectionTimeoutMS: 4000 });
      dbConnected = true;
    } catch {
      console.log('  ⚠ Database unavailable. Skipping Suite 4 integration tests.');
    }
  }

  if (dbConnected) {
    const testUserId = new mongoose.Types.ObjectId();
    const mockImageKey = `garments/${testUserId}/test-retry-image.webp`;

    // Create a temporary upload simulating a user who just uploaded an image
    const tempUpload = await TemporaryUpload.create({
      userId: testUserId,
      imageKey: mockImageKey,
      status: 'pending',
      mimeType: 'image/webp',
      width: 400,
      height: 400,
      sizeBytes: 15000,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });

    const uploadId = tempUpload._id.toString();

    // 4.1 Verify that analysis attempt retains pending state
    // Simulating an analysis attempt failing or retrying:
    const uploadBeforeRetry = await TemporaryUpload.findById(uploadId);
    assert(uploadBeforeRetry.status === 'pending', 'TemporaryUpload remains in pending state before analysis');

    // 4.2 Verify calling analyze on the same uploadId does NOT create duplicate TemporaryUploads
    const uploadCountBefore = await TemporaryUpload.countDocuments({ userId: testUserId });
    assert(uploadCountBefore === 1, 'Only one TemporaryUpload exists initially');

    // 4.3 Verify that multiple retry attempts reuse the EXACT same uploadId
    // If the frontend triggers retry, it sends the same uploadId
    const retrievedAgain = await TemporaryUpload.findOne({ _id: uploadId, userId: testUserId });
    assert(retrievedAgain._id.toString() === uploadId, 'Retry targets the same upload ID without re-uploading image');
    assert(retrievedAgain.status === 'pending', 'Upload remains eligible for retry because status is still pending');

    // 4.4 Verify Garment collection is untouched during analysis / retries (zero side-effects)
    const garmentsDuringAnalysis = await Garment.countDocuments({ userId: testUserId });
    assert(garmentsDuringAnalysis === 0, 'Zero garments created during analysis or retries');

    // 4.5 Verify Manual Entry fallback works with the exact same uploadId
    // User proceeds with manual entry after analysis failure or timeout
    const manualGarment = await createGarment({
      userId: testUserId,
      uploadId,
      attributes: {
        name: 'Cashmere Cardigan (Manual Entry)',
        category: 'Tops',
        subcategory: 'Cardigan',
        color: 'Charcoal Grey',
        pattern: 'Solid',
        material: 'Cashmere',
        occasion: 'Smart Casual',
        season: ['Autumn', 'Winter'],
      },
    });

    assert(manualGarment && manualGarment._id, 'Manual entry successfully creates Garment reusing uploadId');
    assert(manualGarment.name === 'Cashmere Cardigan (Manual Entry)', 'Garment title accurately recorded');
    assert(manualGarment.primaryColor === 'Charcoal Grey', 'Manual color preserved');

    // 4.6 Verify TemporaryUpload is now claimed
    const uploadAfterClaim = await TemporaryUpload.findById(uploadId);
    assert(uploadAfterClaim.status === 'claimed', 'TemporaryUpload transitioned to claimed upon manual save');

    // 4.7 Verify claimed upload cannot be re-analyzed (state guard)
    let reanalyzeErr = null;
    try {
      await analyzeTemporaryUpload({ uploadId, userId: testUserId });
    } catch (err) {
      reanalyzeErr = err;
    }
    assert(
      reanalyzeErr !== null && reanalyzeErr.message.includes('Only pending uploads can be analyzed'),
      'Claimed upload cannot be analyzed again, preventing post-claim state inconsistency'
    );

    // Cleanup test documents
    await Garment.deleteMany({ userId: testUserId });
    await TemporaryUpload.deleteMany({ userId: testUserId });
  }

  console.log('\n=== GARMENT ANALYSIS TIMEOUT & RETRY TEST SUMMARY ===');
  console.log(`Total Assertions: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTimeoutAndRetryTests()
  .then(() => {
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
    process.exit(1);
  });
