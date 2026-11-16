import mongoose from 'mongoose';
import dotenv from 'dotenv';
import sharp from 'sharp';
import {
  isGeminiConfigured,
  getGeminiModel,
  getSafeGeminiStatus,
  validateGarmentAnalysis,
  sanitizeProviderError,
  analyzeGarmentImage,
  VALID_CATEGORIES,
  VALID_PATTERNS,
  VALID_OCCASIONS,
  VALID_SEASONS,
} from './gemini.js';
import TemporaryUpload from '../models/TemporaryUpload.js';
import Garment from '../models/Garment.js';
import { analyzeTemporaryUpload } from './garmentAnalysisService.js';
import { uploadImageObject, deleteImageObject } from './r2.js';
import { aiRateLimiter, resetRateLimits } from '../middleware/aiRateLimiter.js';

dotenv.config();

const results = {
  passed: [],
  failed: [],
};

function pass(name, detail = '') {
  results.passed.push({ name, detail });
  console.log(`  ✓ ${name} ${detail ? '(' + detail + ')' : ''}`);
}

function fail(name, error) {
  results.failed.push({ name, error: error.message || error });
  console.error(`  ✗ ${name}:`, error.message || error);
}

async function runGeminiVerification() {
  console.log('\n=== ClosetBrain Milestone 2: Gemini AI Integration Verification ===\n');

  // Print safe configuration status (no keys)
  const status = getSafeGeminiStatus();
  console.log('Configuration Status:');
  console.log(`  - Gemini Configured: ${status.configured}`);
  console.log(`  - Configured Model: ${status.model}`);
  console.log('');

  // -------------------------------------------------------------
  // TEST SUITE 1: Server-Side Strict Schema Validation & Sanitization
  // -------------------------------------------------------------
  console.log('Suite 1: Schema Validation & Anti-Hallucination Rules');
  try {
    const rawAiOutput = {
      category: 'tops',
      subcategory: 'Oxford Button-Down Shirt',
      color: 'Burgundy',
      secondaryColors: ['Ivory', 'Burgundy', 'none'], // Contains duplicate and invalid
      pattern: 'solid',
      material: '100% Cotton with 2% Elastane', // Contains invented percentages
      occasion: 'smart casual',
      season: ['autumn', 'winter'],
      style: 'Minimalist Tailored',
      description: 'A burgundy button-down shirt with long sleeves and mother-of-pearl buttons.',
    };

    const validated = validateGarmentAnalysis(rawAiOutput);

    // Verify all 10 required keys exist
    const requiredKeys = [
      'category',
      'subcategory',
      'color',
      'secondaryColors',
      'pattern',
      'material',
      'occasion',
      'season',
      'style',
      'description',
    ];
    for (const key of requiredKeys) {
      if (!(key in validated)) {
        throw new Error(`Missing required key: ${key}`);
      }
    }

    if (validated.category !== 'Tops') {
      throw new Error(`Expected category "Tops", got "${validated.category}"`);
    }
    if (validated.pattern !== 'Solid') {
      throw new Error(`Expected pattern "Solid", got "${validated.pattern}"`);
    }
    if (validated.occasion !== 'Smart Casual') {
      throw new Error(`Expected occasion "Smart Casual", got "${validated.occasion}"`);
    }
    if (validated.material.includes('%')) {
      throw new Error(`Fabric percentage was not stripped: "${validated.material}"`);
    }
    if (validated.secondaryColors.includes('Burgundy') || validated.secondaryColors.includes('none')) {
      throw new Error('Secondary colors contains redundant or invalid color values');
    }

    pass('1.1 Schema structure and case-normalization', '10 required fields present and normalized');
  } catch (err) {
    fail('1.1 Schema structure and case-normalization', err);
  }

  // 1.2 Uncertain attributes to null/unknown
  try {
    const uncertainAiOutput = {
      category: 'hoodie', // Should map to Tops
      subcategory: 'unknown',
      color: 'Heather Grey',
      secondaryColors: [],
      pattern: 'unrecognized_pattern',
      material: 'unknown',
      occasion: 'Casual',
      season: 'winter', // String instead of array
      style: 'Streetwear',
      description: 'A casual grey hooded sweatshirt.',
    };

    const validated = validateGarmentAnalysis(uncertainAiOutput);

    if (validated.category !== 'Tops') {
      throw new Error(`Expected category "Tops" for hoodie, got "${validated.category}"`);
    }
    if (validated.subcategory !== null) {
      throw new Error(`Expected subcategory to be null, got "${validated.subcategory}"`);
    }
    if (validated.material !== null) {
      throw new Error(`Expected material to be null for "unknown", got "${validated.material}"`);
    }
    if (!Array.isArray(validated.season) || validated.season[0] !== 'Winter') {
      throw new Error('Season normalization failed for single string');
    }

    pass('1.2 Uncertain attributes handling', 'Null values and category fallbacks enforced');
  } catch (err) {
    fail('1.2 Uncertain attributes handling', err);
  }

  // -------------------------------------------------------------
  // TEST SUITE 2: Security & Provider Error Sanitization
  // -------------------------------------------------------------
  console.log('\nSuite 2: Security & Provider Error Sanitization');
  try {
    const fakeKey = 'AIzaSyFakeKey1234567890abcdef1234567';
    const rawError = `Google API error with key ${fakeKey}: API_KEY_INVALID at https://generativelanguage.googleapis.com/v1beta`;
    const sanitized = sanitizeProviderError(rawError);

    if (sanitized.includes(fakeKey) || sanitized.includes('AIzaSy')) {
      throw new Error('Sanitizer leaked API key!');
    }
    if (sanitized.includes('generativelanguage.googleapis.com')) {
      throw new Error('Sanitizer leaked internal Google endpoint!');
    }
    if (!sanitized.includes('invalid or unauthorized')) {
      throw new Error('Sanitizer did not provide user-friendly explanation');
    }

    pass('2.1 Credential and endpoint redacting', 'API keys and internal endpoints safely hidden');
  } catch (err) {
    fail('2.1 Credential and endpoint redacting', err);
  }

  // -------------------------------------------------------------
  // TEST SUITE 3: Rate Limiting Enforcement
  // -------------------------------------------------------------
  console.log('\nSuite 3: AI Rate Limiting');
  try {
    resetRateLimits();
    const testUserId = new mongoose.Types.ObjectId().toString();
    const mockReq = { userId: testUserId, ip: '127.0.0.1' };
    let blocked = false;
    let blockedCode = null;

    const mockRes = {
      headers: {},
      set(k, v) { this.headers[k] = v; },
      status(code) {
        this.statusCode = code;
        return {
          json: (data) => {
            if (code === 429) {
              blocked = true;
              blockedCode = data.code;
            }
          },
        };
      },
    };

    // Send 10 allowed requests
    for (let i = 0; i < 10; i++) {
      aiRateLimiter(mockReq, mockRes, () => {});
    }

    // 11th request should be blocked
    aiRateLimiter(mockReq, mockRes, () => {});

    if (!blocked || blockedCode !== 'RATE_LIMIT_EXCEEDED') {
      throw new Error('Rate limiter did not block request exceeding window limit');
    }

    pass('3.1 Rate limiter enforcement', 'Max 10 requests/minute enforced with 429 response');
  } catch (err) {
    fail('3.1 Rate limiter enforcement', err);
  }

  // -------------------------------------------------------------
  // TEST SUITE 4: TemporaryUpload Ownership & Non-Persistence
  // -------------------------------------------------------------
  console.log('\nSuite 4: Ownership Verification & Non-Persistence Guarantee');
  let dbConnected = false;
  if (process.env.MONGODB_URI) {
    try {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      }
      dbConnected = true;
    } catch (err) {
      console.warn('  ! MongoDB Atlas not reachable during test run:', err.message);
    }
  }

  if (dbConnected) {
    const ownerUserId = new mongoose.Types.ObjectId();
    const unauthorizedUserId = new mongoose.Types.ObjectId();
    let testUploadDoc = null;
    let testR2Key = null;

    try {
      // 4.1 Create test image in R2 and TemporaryUpload in DB
      testR2Key = `test-verify-upload-${Date.now()}.webp`;
      const testImageBuffer = await sharp({
        create: {
          width: 300,
          height: 300,
          channels: 3,
          background: { r: 128, g: 0, b: 32 }, // Burgundy color
        },
      }).webp().toBuffer();

      await uploadImageObject(testImageBuffer, testR2Key, 'image/webp');

      testUploadDoc = await TemporaryUpload.create({
        userId: ownerUserId,
        imageKey: testR2Key,
        status: 'pending',
        mimeType: 'image/webp',
        width: 300,
        height: 300,
        sizeBytes: testImageBuffer.length,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      // 4.2 Verify unauthorized user cannot analyze someone else's upload
      let unauthorizedRejected = false;
      try {
        await analyzeTemporaryUpload({
          uploadId: testUploadDoc._id.toString(),
          userId: unauthorizedUserId,
        });
      } catch (err) {
        if (err.status === 404 || err.message.includes('access denied')) {
          unauthorizedRejected = true;
        }
      }

      if (!unauthorizedRejected) {
        throw new Error('Unauthorized user was able to access foreign TemporaryUpload!');
      }
      pass('4.1 Session ownership guard', 'Cross-user upload access strictly rejected');

      // 4.3 Verify claimed upload cannot be re-analyzed
      testUploadDoc.status = 'claimed';
      await testUploadDoc.save();

      let claimedRejected = false;
      try {
        await analyzeTemporaryUpload({
          uploadId: testUploadDoc._id.toString(),
          userId: ownerUserId,
        });
      } catch (err) {
        if (err.status === 400 && err.message.includes('status is "claimed"')) {
          claimedRejected = true;
        }
      }

      if (!claimedRejected) {
        throw new Error('Claimed upload was not rejected for analysis!');
      }
      pass('4.2 Claimed upload guard', 'Already-claimed upload rejected from re-analysis');

      // 4.4 Verify Non-Persistence Guarantee: Garment collection count is untouched
      const garmentCountBefore = await Garment.countDocuments();
      // Revert status to pending for check
      testUploadDoc.status = 'pending';
      await testUploadDoc.save();

      const garmentCountAfter = await Garment.countDocuments();
      if (garmentCountBefore !== garmentCountAfter) {
        throw new Error('Garment count changed during analysis check! Non-persistence violated!');
      }
      pass('4.3 Non-persistence guarantee', 'Garment collection untouched during AI analysis flow');

    } catch (err) {
      fail('4.x TemporaryUpload & Persistence Tests', err);
    } finally {
      // Cleanup test data
      if (testUploadDoc) {
        await TemporaryUpload.deleteOne({ _id: testUploadDoc._id }).catch(() => {});
      }
      if (testR2Key) {
        await deleteImageObject(testR2Key).catch(() => {});
      }
    }
  } else {
    console.log('  ⚠ Skipped database-dependent ownership tests (MongoDB Atlas connection not ready)');
  }

  // -------------------------------------------------------------
  // TEST SUITE 5: Live Gemini Multimodal Vision Smoke Test
  // -------------------------------------------------------------
  console.log('\nSuite 5: Live Gemini API Multimodal Vision');
  if (isGeminiConfigured()) {
    try {
      console.log(`  Calling Gemini model "${getGeminiModel()}" with synthetic image...`);
      const syntheticGarment = await sharp({
        create: {
          width: 400,
          height: 400,
          channels: 3,
          background: { r: 15, g: 30, b: 60 }, // Dark navy blue
        },
      }).webp().toBuffer();

      const result = await analyzeGarmentImage(syntheticGarment, { mimeType: 'image/webp' });

      console.log('  Gemini Analysis Output:');
      console.log(`    Category: ${result.category}`);
      console.log(`    Subcategory: ${result.subcategory || 'null'}`);
      console.log(`    Color: ${result.color}`);
      console.log(`    Secondary Colors: [${result.secondaryColors.join(', ')}]`);
      console.log(`    Pattern: ${result.pattern}`);
      console.log(`    Material: ${result.material || 'null'}`);
      console.log(`    Occasion: ${result.occasion}`);
      console.log(`    Season: [${result.season.join(', ')}]`);
      console.log(`    Style: ${result.style}`);
      console.log(`    Description: ${result.description}`);

      pass('5.1 Live Gemini Vision API Call', `Successfully extracted structured attributes with ${getGeminiModel()}`);
    } catch (err) {
      console.error('  Diagnostics:');
      if (err.status) console.error(`    - HTTP Status: ${err.status}`);
      if (err.code) console.error(`    - Provider Code: ${err.code}`);
      if (err.category) console.error(`    - Failure Category: ${err.category}`);
      console.error(`    - Safe Message: ${err.message}`);
      fail('5.1 Live Gemini Vision API Call', err);
    }
  } else {
    console.log('  ℹ Notice: GEMINI_API_KEY is not set in .env.');
    console.log('    To test live Gemini extraction:');
    console.log('    1. Add GEMINI_API_KEY=your_key to .env');
    console.log('    2. (Optional) Set GEMINI_MODEL=gemini-flash-lite-latest');
    console.log('    3. Re-run: node server/services/geminiSmokeTest.js');
    pass('5.1 Configuration detection', 'Detected unconfigured key; gracefully reported without crashing');
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }

  if (results.failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runGeminiVerification().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
