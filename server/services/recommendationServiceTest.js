import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import http from 'http';
import outfitRoutes from '../routes/outfits.js';
import User from '../models/User.js';
import Garment from '../models/Garment.js';
import Outfit from '../models/Outfit.js';
import {
  validateOutfitCombination,
  hasMinimumWardrobeFeasibility,
  prepareCandidateCatalog,
  formatHydratedGarment,
  getOutfitRecommendations,
  RecommendationServiceError,
} from './recommendationService.js';
import {
  recommendationRateLimiter,
  resetRecommendationRateLimits,
} from '../middleware/aiRateLimiter.js';

dotenv.config();

const results = {
  passed: 0,
  failed: 0,
};

function pass(name, detail = '') {
  results.passed++;
  console.log(`  ✓ ${name} ${detail ? '(' + detail + ')' : ''}`);
}

function fail(name, error) {
  results.failed++;
  console.error(`  ✗ ${name}:`, error?.message || error);
}

function assert(condition, message) {
  if (condition) {
    pass(message);
  } else {
    fail(message, new Error('Assertion failed'));
  }
}

async function connectDb() {
  const primaryUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
  const fallbackUri = 'mongodb://localhost:27017/closetbrain_test';

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (primaryUri) {
    try {
      await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 2000 });
      console.log(`Connected to database via configured URI.`);
      return;
    } catch (err) {
      console.warn(`Primary DB connection failed (${err.message}). Trying fallback local URI...`);
    }
  }

  await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 3000 });
  console.log(`Connected to fallback local database: ${fallbackUri}`);
}

async function runRecommendationTests() {
  console.log('\n=== ClosetBrain Phase 4: AI Outfit Recommendations & Zero-Trust Validation Tests ===\n');

  let server = null;
  let baseUrl = '';

  try {
    await connectDb();

    // -------------------------------------------------------------
    // SECTION 1: UNIT TESTS - WARDROBE FEASIBILITY & COMBINATION RULES
    // -------------------------------------------------------------
    console.log('--- Section 1: Wardrobe Feasibility & Outfit Combination Validation ---');

    // Feasibility
    assert(hasMinimumWardrobeFeasibility([]) === false, 'Empty wardrobe is not feasible');
    assert(hasMinimumWardrobeFeasibility([{ category: 'Tops' }]) === false, 'Single Top is not feasible');
    assert(hasMinimumWardrobeFeasibility([{ category: 'Bottoms' }]) === false, 'Single Bottom is not feasible');
    assert(
      hasMinimumWardrobeFeasibility([{ category: 'Tops' }, { category: 'Bottoms' }]) === true,
      'Top + Bottom wardrobe is feasible'
    );
    assert(hasMinimumWardrobeFeasibility([{ category: 'Dresses' }]) === true, 'Dress wardrobe is feasible');
    assert(
      hasMinimumWardrobeFeasibility([{ category: 'Ethnic Wear', isCompleteSet: true }]) === true,
      'Single Complete Ethnic Set wardrobe is feasible'
    );
    assert(
      hasMinimumWardrobeFeasibility([
        { category: 'Ethnic Wear', subCategory: 'Kurta', isCompleteSet: false },
      ]) === false,
      'Standalone Kurta without bottoms is not feasible'
    );
    assert(
      hasMinimumWardrobeFeasibility([
        { category: 'Ethnic Wear', subCategory: 'Kurta', isCompleteSet: false },
        { category: 'Ethnic Wear', subCategory: 'Salwar', isCompleteSet: false },
      ]) === true,
      'Ethnic Kurta + Salwar wardrobe is feasible'
    );
    assert(
      hasMinimumWardrobeFeasibility([
        { category: 'Ethnic Wear', subCategory: 'Kurta', isCompleteSet: false },
        { category: 'Bottoms', name: 'Jeans' },
      ]) === true,
      'Kurta + Western Bottoms wardrobe is feasible'
    );

    // Combination validation: Top + Bottom
    const topGarment = { _id: 'g_top_1', category: 'Tops', name: 'White Oxford Shirt' };
    const bottomGarment = { _id: 'g_bot_1', category: 'Bottoms', name: 'Navy Trousers' };
    const shoesGarment = { _id: 'g_sho_1', category: 'Shoes', name: 'Derby Shoes' };
    const outerGarment1 = { _id: 'g_out_1', category: 'Outerwear', name: 'Wool Coat' };
    const outerGarment2 = { _id: 'g_out_2', category: 'Outerwear', name: 'Cardigan' };
    const outerGarment3 = { _id: 'g_out_3', category: 'Outerwear', name: 'Leather Jacket' };
    const dressGarment = { _id: 'g_dre_1', category: 'Dresses', name: 'Silk Slip Dress' };
    const accessoryGarment = { _id: 'g_acc_1', category: 'Accessories', name: 'Silk Scarf' };

    const validCoreCombo = validateOutfitCombination([topGarment, bottomGarment]);
    assert(validCoreCombo.valid === true, 'Top + Bottom combination is valid');

    const validFullCombo = validateOutfitCombination([
      topGarment,
      bottomGarment,
      shoesGarment,
      outerGarment1,
      outerGarment2,
      accessoryGarment,
    ]);
    assert(validFullCombo.valid === true, 'Top + Bottom + 2 Outerwear + Shoes + Accessory is valid');

    const validDressCombo = validateOutfitCombination([dressGarment, shoesGarment, outerGarment1]);
    assert(validDressCombo.valid === true, 'Dress + Shoes + Outerwear is valid');

    // Invalid combos
    const topOnly = validateOutfitCombination([topGarment, outerGarment1]);
    assert(topOnly.valid === false && topOnly.reason.includes('Missing bottom'), 'Top without Bottom is rejected');

    const bottomOnly = validateOutfitCombination([bottomGarment]);
    assert(bottomOnly.valid === false && bottomOnly.reason.includes('Missing top'), 'Bottom without Top is rejected');

    const dressAndBottom = validateOutfitCombination([dressGarment, bottomGarment]);
    assert(
      dressAndBottom.valid === false && dressAndBottom.reason.includes('combine a dress with bottoms'),
      'Dress + Bottom clash is rejected'
    );

    const dressAndTop = validateOutfitCombination([dressGarment, topGarment]);
    assert(
      dressAndTop.valid === false && dressAndTop.reason.includes('combine a dress with separate tops'),
      'Dress + Top clash is rejected'
    );

    const duplicateGarments = validateOutfitCombination([topGarment, topGarment, bottomGarment]);
    assert(
      duplicateGarments.valid === false && duplicateGarments.reason.includes('Duplicate garment ID'),
      'Duplicate garment IDs within outfit are rejected'
    );

    const twoBottoms = validateOutfitCombination([
      topGarment,
      bottomGarment,
      { _id: 'g_bot_2', category: 'Bottoms', name: 'Jeans' },
    ]);
    assert(
      twoBottoms.valid === false && twoBottoms.reason.includes('multiple bottoms'),
      'Multiple bottoms in one outfit are rejected'
    );

    const twoShoes = validateOutfitCombination([
      topGarment,
      bottomGarment,
      shoesGarment,
      { _id: 'g_sho_2', category: 'Shoes', name: 'Sneakers' },
    ]);
    assert(
      twoShoes.valid === false && twoShoes.reason.includes('multiple pairs of shoes'),
      'Multiple pairs of shoes in one outfit are rejected'
    );

    const threeOuterwear = validateOutfitCombination([
      topGarment,
      bottomGarment,
      outerGarment1,
      outerGarment2,
      outerGarment3,
    ]);
    assert(
      threeOuterwear.valid === false && threeOuterwear.reason.includes('Cannot exceed 2 outerwear'),
      'More than 2 outerwear garments rejected'
    );

    // --- Ethnic Wear Combinations & Rules ---
    const anarkali = {
      _id: 'g_eth_anarkali',
      category: 'Ethnic Wear',
      subCategory: 'Anarkali Suit',
      isCompleteSet: true,
      name: 'Embroidered Anarkali Suit',
    };
    const saree = {
      _id: 'g_eth_saree',
      category: 'Ethnic Wear',
      subCategory: 'Saree',
      isCompleteSet: true,
      name: 'Kanjeevaram Silk Saree',
    };
    const kurta = {
      _id: 'g_eth_kurta',
      category: 'Ethnic Wear',
      subCategory: 'Kurta',
      isCompleteSet: false,
      name: 'Chikankari Kurta',
    };
    const salwar = {
      _id: 'g_eth_salwar',
      category: 'Ethnic Wear',
      subCategory: 'Salwar',
      isCompleteSet: false,
      name: 'Cotton Salwar',
    };
    const lehengaSkirt = {
      _id: 'g_eth_lehenga',
      category: 'Ethnic Wear',
      subCategory: 'Lehenga',
      isCompleteSet: false,
      name: 'Brocade Lehenga Skirt',
    };
    const dupatta = {
      _id: 'g_eth_dupatta',
      category: 'Ethnic Wear',
      subCategory: 'Dupatta',
      isCompleteSet: false,
      name: 'Zari Border Dupatta',
    };

    // Complete set valid combinations
    const validAnarkaliCombo = validateOutfitCombination([anarkali]);
    assert(validAnarkaliCombo.valid === true, 'Complete Anarkali Suit alone is a valid complete outfit');

    const validAnarkaliFull = validateOutfitCombination([anarkali, shoesGarment, accessoryGarment]);
    assert(
      validAnarkaliFull.valid === true,
      'Complete Anarkali Suit + Shoes + Accessory is valid'
    );

    // Complete set clashes with western pieces
    const anarkaliWithJeans = validateOutfitCombination([anarkali, bottomGarment]);
    assert(
      anarkaliWithJeans.valid === false &&
        anarkaliWithJeans.reason.includes('cannot be combined with separate tops, bottoms'),
      'Complete Anarkali + Western Bottoms clash is rejected'
    );

    const anarkaliWithTop = validateOutfitCombination([anarkali, topGarment]);
    assert(
      anarkaliWithTop.valid === false &&
        anarkaliWithTop.reason.includes('cannot be combined with separate tops, bottoms'),
      'Complete Anarkali + Western Top clash is rejected'
    );

    const anarkaliWithBlazer = validateOutfitCombination([anarkali, outerGarment1]);
    assert(
      anarkaliWithBlazer.valid === false &&
        anarkaliWithBlazer.reason.includes('cannot be combined with separate tops, bottoms'),
      'Complete Anarkali + Western Outerwear clash is rejected'
    );

    const twoCompleteSets = validateOutfitCombination([anarkali, saree]);
    assert(
      twoCompleteSets.valid === false &&
        twoCompleteSets.reason.includes('multiple complete ethnic sets'),
      'Multiple complete ethnic sets in one outfit are rejected'
    );

    // Ethnic Separates combinations
    const standaloneKurta = validateOutfitCombination([kurta]);
    assert(
      standaloneKurta.valid === false && standaloneKurta.reason.includes('Missing bottom'),
      'Standalone Kurta without bottom is rejected'
    );

    const standaloneLehenga = validateOutfitCombination([lehengaSkirt]);
    assert(
      standaloneLehenga.valid === false && standaloneLehenga.reason.includes('Missing top'),
      'Standalone Lehenga skirt without top is rejected'
    );

    const validKurtaSalwar = validateOutfitCombination([kurta, salwar]);
    assert(validKurtaSalwar.valid === true, 'Kurta + Salwar combination is valid');

    const validKurtaJeans = validateOutfitCombination([kurta, bottomGarment]);
    assert(validKurtaJeans.valid === true, 'Kurta + Western Trousers fusion combination is valid');

    const validKurtaLehengaDupatta = validateOutfitCombination([kurta, lehengaSkirt, dupatta]);
    assert(
      validKurtaLehengaDupatta.valid === true,
      'Kurta + Lehenga Skirt + Dupatta combination is valid'
    );

    const multipleEthnicBottoms = validateOutfitCombination([kurta, salwar, lehengaSkirt]);
    assert(
      multipleEthnicBottoms.valid === false &&
        multipleEthnicBottoms.reason.includes('multiple bottoms'),
      'Multiple ethnic bottoms in one outfit are rejected'
    );

    // Candidate catalog stripping of internal DB keys and secrets
    const sampleGarmentDoc = {
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      userId: 'user_internal_id',
      imageKey: 'users/123/garments/secret.webp',
      r2Credentials: 'secret',
      name: 'Cashmere Sweater',
      category: 'Tops',
      subCategory: 'Knitwear',
      primaryColor: 'Charcoal',
      secondaryColors: ['Grey'],
      colorFamily: 'Monochrome',
      pattern: 'Solid',
      material: 'Cashmere',
      formality: 'Smart Casual',
      season: ['Fall', 'Winter'],
      fit: 'Relaxed',
      tags: ['warm', 'luxury'],
      notes: 'Hand wash only',
    };
    const catalog = prepareCandidateCatalog([sampleGarmentDoc]);
    assert(catalog.length === 1, 'Candidate catalog formatted 1 garment');
    assert(catalog[0].id === '507f1f77bcf86cd799439011', 'Garment id preserved');
    assert(catalog[0].isCompleteSet === false, 'isCompleteSet defaulted to false');
    assert(catalog[0].imageKey === undefined, 'imageKey stripped from candidate catalog');
    assert(catalog[0].userId === undefined, 'userId stripped from candidate catalog');
    assert(catalog[0].r2Credentials === undefined, 'secrets stripped from candidate catalog');

    // -------------------------------------------------------------
    // SECTION 2: SERVICE LAYER ZERO-TRUST VALIDATION & OWNER ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- Section 2: Zero-Trust Recommendation Service & Isolation ---');

    const timestamp = Date.now();

    // Create Test User A and User B
    const userA = await User.create({
      name: `Rec User A ${timestamp}`,
      email: `rec_user_a_${timestamp}@closetbrain.test`,
      passwordHash: 'hashed_password_123',
    });

    const userB = await User.create({
      name: `Rec User B ${timestamp}`,
      email: `rec_user_b_${timestamp}@closetbrain.test`,
      passwordHash: 'hashed_password_123',
    });

    const userEmpty = await User.create({
      name: `Rec User Empty ${timestamp}`,
      email: `rec_user_empty_${timestamp}@closetbrain.test`,
      passwordHash: 'hashed_password_123',
    });

    // Test Empty Wardrobe throws EMPTY_WARDROBE
    try {
      await getOutfitRecommendations({ userId: userEmpty._id });
      fail('Empty wardrobe check', new Error('Should have thrown EMPTY_WARDROBE'));
    } catch (err) {
      assert(
        err instanceof RecommendationServiceError && err.code === 'EMPTY_WARDROBE',
        'User with 0 garments throws EMPTY_WARDROBE error'
      );
    }

    // Create 1 Top for userA (insufficient wardrobe)
    const userAGarmentTop = await Garment.create({
      userId: userA._id,
      name: 'Merino Wool Turtleneck',
      category: 'Tops',
      primaryColor: 'Cream',
      pattern: 'Solid',
      imageKey: `users/${userA._id}/garments/turtleneck_${timestamp}.webp`,
    });

    try {
      await getOutfitRecommendations({ userId: userA._id });
      fail('Insufficient wardrobe check', new Error('Should have thrown INSUFFICIENT_GARMENTS'));
    } catch (err) {
      assert(
        err instanceof RecommendationServiceError && err.code === 'INSUFFICIENT_GARMENTS',
        'User with only 1 Top throws INSUFFICIENT_GARMENTS error'
      );
    }

    // Add Bottom and Shoes for User A
    const userAGarmentBottom = await Garment.create({
      userId: userA._id,
      name: 'Pleated Wool Trousers',
      category: 'Bottoms',
      primaryColor: 'Charcoal',
      pattern: 'Solid',
      imageKey: `users/${userA._id}/garments/trousers_${timestamp}.webp`,
    });

    const userAGarmentShoes = await Garment.create({
      userId: userA._id,
      name: 'Leather Loafers',
      category: 'Shoes',
      primaryColor: 'Black',
      pattern: 'Solid',
      imageKey: `users/${userA._id}/garments/loafers_${timestamp}.webp`,
    });

    const userAGarmentEthnic = await Garment.create({
      userId: userA._id,
      name: 'Royal Silk Anarkali Suit',
      category: 'Ethnic Wear',
      subCategory: 'Anarkali Suit',
      isCompleteSet: true,
      primaryColor: 'Maroon',
      pattern: 'Solid',
      imageKey: `users/${userA._id}/garments/anarkali_${timestamp}.webp`,
    });

    // Add a Lounge Bottom and Formal Outerwear for User A to test deterministic rejection
    const userAGarmentLounge = await Garment.create({
      userId: userA._id,
      name: 'Fluffy Fleece Sweatpants',
      category: 'Bottoms',
      primaryColor: 'Bright Yellow',
      pattern: 'Plaid',
      formality: 'Lounge',
      season: ['Summer'],
      imageKey: `users/${userA._id}/garments/sweatpants_${timestamp}.webp`,
    });

    const userAGarmentFormalCoat = await Garment.create({
      userId: userA._id,
      name: 'Black Velvet Tuxedo Coat',
      category: 'Outerwear',
      primaryColor: 'Crimson',
      pattern: 'Floral',
      formality: 'Formal',
      season: ['Winter'],
      material: 'Wool',
      imageKey: `users/${userA._id}/garments/tux_${timestamp}.webp`,
    });

    // Create a garment for User B (foreign garment)
    const userBGarmentBottom = await Garment.create({
      userId: userB._id,
      name: 'User B Velvet Skirt',
      category: 'Bottoms',
      primaryColor: 'Burgundy',
      pattern: 'Solid',
      imageKey: `users/${userB._id}/garments/skirt_${timestamp}.webp`,
    });

    // Mock Gemini Client: Injects a foreign ID and hallucinated ID
    const mockGeminiClientWithHallucination = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            outfits: [
              // Valid outfit
              {
                name: 'Classic Monochrome',
                occasion: 'Smart Casual',
                stylingReasoning: 'Balanced textures with clean tonal flow.',
                garmentIds: [userAGarmentTop._id.toString(), userAGarmentBottom._id.toString()],
              },
              // Valid Complete Ethnic Set outfit
              {
                name: 'Festive Anarkali Ensemble',
                occasion: 'Formal',
                stylingReasoning: 'Regal maroon silk anarkali styled with sleek black loafers.',
                garmentIds: [userAGarmentEthnic._id.toString(), userAGarmentShoes._id.toString()],
              },
              // Invalid ethnic clash: complete Anarkali + western trousers
              {
                name: 'Clashing Ethnic Suit with Trousers',
                occasion: 'Formal',
                stylingReasoning: 'Attempting to put trousers under a complete 3-piece anarkali suit.',
                garmentIds: [userAGarmentEthnic._id.toString(), userAGarmentBottom._id.toString()],
              },
              // Malicious outfit trying to reference User B's garment
              {
                name: 'Cross-User Attack Look',
                occasion: 'Casual',
                stylingReasoning: 'Attempting to leak User B garment.',
                garmentIds: [userAGarmentTop._id.toString(), userBGarmentBottom._id.toString()],
              },
              // Hallucinated ID outfit
              {
                name: 'Hallucinated Look',
                occasion: 'Casual',
                stylingReasoning: 'Attempting to use nonexistent ID.',
                garmentIds: [userAGarmentTop._id.toString(), '507f1f77bcf86cd799439999'],
              },
              // Incomplete outfit (Top only, no bottom)
              {
                name: 'Incomplete Look',
                occasion: 'Casual',
                stylingReasoning: 'Missing bottoms entirely.',
                garmentIds: [userAGarmentTop._id.toString()],
              },
              // Incompatible look with score < 50 and severe formality clash (Formal coat + Lounge sweatpants)
              {
                name: 'Severe Clash & Low Score Look',
                occasion: 'Formal',
                stylingReasoning: 'Structurally valid top+bottom+coat but severe clash and score < 50.',
                garmentIds: [
                  userAGarmentTop._id.toString(),
                  userAGarmentLounge._id.toString(),
                  userAGarmentFormalCoat._id.toString(),
                ],
              },
            ],
          }),
        }),
      },
    };

    const serviceResult = await getOutfitRecommendations({
      userId: userA._id,
      occasion: 'Smart Casual',
      geminiClient: mockGeminiClientWithHallucination,
    });

    assert(serviceResult.success === true, 'Recommendation service succeeded');
    assert(
      serviceResult.recommendations.length === 2,
      'Exactly 2 valid recommendations retained (invalid/hallucinated/foreign/clashing ethnic discarded)'
    );
    assert(
      serviceResult.recommendations.some((r) => r.name === 'Classic Monochrome'),
      'Valid outfit "Classic Monochrome" retained'
    );
    assert(
      serviceResult.recommendations.some((r) => r.name === 'Festive Anarkali Ensemble'),
      'Valid outfit "Festive Anarkali Ensemble" retained'
    );
    const ethnicRec = serviceResult.recommendations.find((r) => r.name === 'Festive Anarkali Ensemble');
    assert(
      ethnicRec.garments.length === 2,
      'Ethnic outfit has exactly 2 validated garments (Anarkali + Shoes)'
    );
    assert(
      ethnicRec.garments.some((g) => g.category === 'Ethnic Wear' && g.isCompleteSet === true),
      'Ethnic outfit contains garment with category "Ethnic Wear" and isCompleteSet true'
    );
    assert(
      serviceResult.totalGarmentsEvaluated === 6,
      'Evaluated count reflects User A 6 garments only'
    );
    assert(
      !serviceResult.recommendations.some((r) => r.name === 'Severe Clash & Low Score Look'),
      'Incompatible outfit (< 50 and severe clash) is rejected by Style Intelligence 2.0'
    );

    // Style Intelligence 2.0: Compatibility assertions
    const classicRec = serviceResult.recommendations.find((r) => r.name === 'Classic Monochrome');
    assert(Boolean(classicRec?.compatibility), 'Recommendation contains compatibility object');
    assert(typeof classicRec?.compatibility?.score === 'number', 'Compatibility score is a number');
    assert(
      classicRec?.compatibility?.score >= 0 && classicRec?.compatibility?.score <= 100,
      'Compatibility score is within [0, 100]'
    );
    assert(
      ['Exceptional', 'Strong', 'Acceptable'].includes(classicRec?.compatibility?.tier),
      'Compatibility tier is valid'
    );
    assert(
      classicRec?.compatibility?.breakdown?.colorHarmony?.maxScore === 30,
      'Color harmony max score is 30'
    );
    assert(
      classicRec?.compatibility?.breakdown?.occasionSuitability?.maxScore === 25,
      'Occasion suitability max score is 25'
    );
    assert(
      classicRec?.compatibility?.breakdown?.garmentCompatibility?.maxScore === 25,
      'Garment compatibility max score is 25'
    );
    assert(
      classicRec?.compatibility?.breakdown?.seasonCohesion?.maxScore === 20,
      'Seasonal cohesion max score is 20'
    );
    assert(
      Array.isArray(classicRec?.compatibility?.matchReasons) && classicRec?.compatibility?.matchReasons.length > 0,
      'Compatibility match reasons populated'
    );
    // Deterministic ranking assertion: recommendations are sorted descending by score
    if (serviceResult.recommendations.length >= 2) {
      assert(
        serviceResult.recommendations[0].compatibility.score >=
          serviceResult.recommendations[1].compatibility.score,
        'Recommendations are deterministically sorted descending by Style Compatibility Score'
      );
    }

    // -------------------------------------------------------------
    // SECTION 3: RATE LIMITER MIDDLEWARE TESTS
    // -------------------------------------------------------------
    console.log('\n--- Section 3: AI Rate Limiter Enforcement ---');

    resetRecommendationRateLimits();

    let rateLimitBlocked = false;
    let retryAfterHeader = null;

    // Simulate 7 requests from the same user ID
    for (let i = 1; i <= 7; i++) {
      let nextCalled = false;
      const mockReq = {
        userId: userA._id.toString(),
        session: { userId: userA._id.toString() },
        ip: '127.0.0.1',
      };
      const mockRes = {
        statusCode: 200,
        headers: {},
        set(k, v) {
          this.headers[k] = v;
        },
        setHeader(k, v) {
          this.headers[k] = v;
        },
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.data = data;
          return this;
        },
      };

      recommendationRateLimiter(mockReq, mockRes, () => {
        nextCalled = true;
      });

      if (i <= 6) {
        assert(nextCalled === true, `Rate limit request #${i} permitted within window`);
      } else {
        rateLimitBlocked = mockRes.statusCode === 429;
        retryAfterHeader = mockRes.headers['Retry-After'];
        assert(mockRes.statusCode === 429, 'Rate limit request #7 rejected with HTTP 429');
        assert(
          mockRes.data?.code === 'RATE_LIMIT_EXCEEDED',
          'Rate limit response code is RATE_LIMIT_EXCEEDED'
        );
        assert(retryAfterHeader !== undefined, 'Retry-After header present on 429 response');
      }
    }

    // Reset rate limits for remaining tests
    resetRecommendationRateLimits();

    // -------------------------------------------------------------
    // SECTION 4: END-TO-END HTTP ROUTE & LOOKBOOK INTEGRATION TESTS
    // -------------------------------------------------------------
    console.log('\n--- Section 4: End-to-End Route & Lookbook Integration ---');

    // Create ephemeral express server
    const app = express();
    app.use(express.json());
    app.use(
      session({
        secret: 'test_session_secret_closetbrain_rec',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
      })
    );

    app.post('/test/auth/login', (req, res) => {
      req.session.userId = req.body.userId;
      res.json({ success: true, userId: req.body.userId });
    });

    app.use('/api/outfits', outfitRoutes);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Helper fetch with cookies
    let cookieJar = '';
    async function apiFetch(path, options = {}) {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      if (cookieJar) {
        headers['Cookie'] = cookieJar;
      }
      const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
      });
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        cookieJar = setCookie.split(';')[0];
      }
      const data = await res.json().catch(() => null);
      return { status: res.status, headers: res.headers, data };
    }

    // Test 4.1: Unauthenticated request to /api/outfits/recommendations -> 401
    const unauthRes = await apiFetch('/api/outfits/recommendations', {
      method: 'POST',
      body: JSON.stringify({ occasion: 'Casual' }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated recommendations request returns 401');

    // Test 4.2: Login as empty-wardrobe user -> 400 EMPTY_WARDROBE
    await apiFetch('/test/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId: userEmpty._id.toString() }),
    });

    const emptyRecRes = await apiFetch('/api/outfits/recommendations', {
      method: 'POST',
      body: JSON.stringify({ occasion: 'Casual' }),
    });
    assert(
      emptyRecRes.status === 400 && emptyRecRes.data?.code === 'EMPTY_WARDROBE',
      'Empty wardrobe user returns 400 EMPTY_WARDROBE via API route'
    );

    // Test 4.3: Login as User A and request recommendations
    await apiFetch('/test/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId: userA._id.toString() }),
    });

    // We test with Gemini or mock fallback
    const userARecRes = await apiFetch('/api/outfits/recommendations', {
      method: 'POST',
      body: JSON.stringify({ occasion: 'Casual', prompt: 'Comfortable day look' }),
    });

    // If Gemini API key is configured and live, this returns 200 with recommendations
    // If not configured, it returns 503 GEMINI_CONFIG_ERROR gracefully without crashing
    if (userARecRes.status === 200) {
      assert(userARecRes.data?.success === true, 'Recommendation API returned success 200');
      assert(
        Array.isArray(userARecRes.data?.recommendations),
        'Recommendations array returned in response'
      );
    } else {
      assert(
        userARecRes.status === 503 || userARecRes.status === 502,
        `External Gemini provider error handled gracefully: ${userARecRes.data?.code}`
      );
    }

    // Test 4.4: Save to Lookbook contract integration
    // When the user clicks "Save to Lookbook", the frontend calls POST /api/outfits
    const saveLookbookRes = await apiFetch('/api/outfits', {
      method: 'POST',
      body: JSON.stringify({
        name: 'AI Curated Autumn Look',
        garments: [userAGarmentTop._id.toString(), userAGarmentBottom._id.toString()],
        notes: 'AI Stylist Note: Clean balanced silhouette with seasonal warmth.',
      }),
    });

    assert(saveLookbookRes.status === 201, 'Saving recommended outfit to Lookbook returns 201 Created');
    assert(saveLookbookRes.data?.outfit?._id !== undefined, 'Lookbook outfit created with MongoDB _id');
    assert(
      saveLookbookRes.data?.outfit?.garments?.length === 2,
      'Lookbook outfit contains both recommended garments'
    );

    // Verify in database
    const savedInDb = await Outfit.findById(saveLookbookRes.data?.outfit?._id);
    assert(savedInDb !== null, 'Outfit persisted in MongoDB Outfit collection');
    assert(
      savedInDb.userId.toString() === userA._id.toString(),
      'Saved outfit correctly scoped to authenticated user in DB'
    );

    // Clean up test documents
    await Garment.deleteMany({ userId: { $in: [userA._id, userB._id, userEmpty._id] } });
    await Outfit.deleteMany({ userId: { $in: [userA._id, userB._id, userEmpty._id] } });
    await User.deleteMany({ _id: { $in: [userA._id, userB._id, userEmpty._id] } });

    console.log(`\nAll Recommendation service tests completed.`);
  } catch (error) {
    fail('Global recommendation test runner', error);
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }

  console.log('\n=============================================');
  console.log(`Recommendation Tests: ${results.passed} passed, ${results.failed} failed.`);
  console.log('=============================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runRecommendationTests();
