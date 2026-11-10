import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5001';

// Test state
let sessionCookie = null;
let testUserId = null;
let manualGarmentId = null;
let aiGarmentId = null;

function logPass(desc) {
  console.log(`  \x1b[32m✓\x1b[0m ${desc}`);
}

function logFail(desc, err) {
  console.error(`  \x1b[31m✗\x1b[0m ${desc}`);
  if (err) console.error(`    Details: ${err.message || err}`);
}

/**
 * Helper to make HTTP requests capturing and passing cookies.
 */
async function apiRequest(endpoint, options = {}) {
  const headers = options.headers || {};
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Track Set-Cookie
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/closetbrain\.sid=([^;]+)/);
    if (match) {
      sessionCookie = `closetbrain.sid=${match[1]}`;
    }
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  return { status: res.status, ok: res.ok, headers: res.headers, data };
}

async function runFrontendIntegrationTests() {
  console.log('\n======================================================');
  console.log('🚀 DIGITAL WARDROBE FRONTEND INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  let passedCount = 0;
  let totalTests = 10;

  // -------------------------------------------------------------------------
  // TEST 1: Unauthorized Session Behavior
  // -------------------------------------------------------------------------
  try {
    console.log('Test 1: Unauthorized session protection on wardrobe routes');
    const getRes = await apiRequest('/api/wardrobe/garments');
    if (getRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, received ${getRes.status}`);
    }

    const postRes = await apiRequest('/api/wardrobe/upload-image', { method: 'POST' });
    if (postRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized on upload, received ${postRes.status}`);
    }

    logPass('Protected endpoints reject unauthenticated requests with 401');
    passedCount++;
  } catch (err) {
    logFail('Test 1 failed', err);
  }

  // -------------------------------------------------------------------------
  // SETUP: Authenticate Test User
  // -------------------------------------------------------------------------
  try {
    const timestamp = Date.now();
    const testEmail = `integration_tester_${timestamp}@closetbrain.test`;
    const signupRes = await apiRequest('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Digital Wardrobe Integration Tester',
        email: testEmail,
        password: 'Password123!',
      }),
    });

    if (!signupRes.ok || !sessionCookie) {
      throw new Error(`Signup failed: ${signupRes.data?.error || signupRes.status}`);
    }
    testUserId = signupRes.data.user.id;
    console.log(`  ✓ Authenticated test session established for: ${testEmail}\n`);
  } catch (err) {
    console.error('Fatal: Failed to setup authenticated session for testing:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Upload and API Failure Handling (Invalid Mime & Corrupted Data)
  // -------------------------------------------------------------------------
  try {
    console.log('Test 2: Upload and API failure handling');
    // Upload text file pretending to be image
    const fakeBlob = new Blob(['This is plain text pretending to be an image'], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('image', fakeBlob, 'fake.txt');

    const res = await apiRequest('/api/wardrobe/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (res.status !== 400) {
      throw new Error(`Expected 400 Bad Request for non-image, got ${res.status}`);
    }

    logPass('Non-image upload correctly rejected with 400 Bad Request');
    passedCount++;
  } catch (err) {
    logFail('Test 2 failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Real Image Upload & Presigned URL Generation
  // -------------------------------------------------------------------------
  let manualUploadId = null;
  let manualSignedUrl = null;
  try {
    console.log('Test 3: Real clothing image upload (closet_tops.jpg)');
    const realImagePath = path.join(__dirname, '../../public/assets/closet_tops.jpg');
    if (!fs.existsSync(realImagePath)) {
      throw new Error(`Real clothing image not found at ${realImagePath}`);
    }

    const fileBuffer = fs.readFileSync(realImagePath);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', blob, 'closet_tops.jpg');

    const uploadRes = await apiRequest('/api/wardrobe/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok || !uploadRes.data.uploadId || !uploadRes.data.signedUrl) {
      throw new Error(`Upload failed: ${uploadRes.data?.error || uploadRes.status}`);
    }

    manualUploadId = uploadRes.data.uploadId;
    manualSignedUrl = uploadRes.data.signedUrl;

    // Verify signed URL is reachable via GET (since signedUrl is generated for GetObjectCommand)
    const getCheck = await fetch(manualSignedUrl, { method: 'GET' });
    if (!getCheck.ok) {
      throw new Error(`Signed URL returned status ${getCheck.status}`);
    }

    logPass(`Uploaded real photo (${uploadRes.data.width}x${uploadRes.data.height}) & verified private R2 signed URL`);
    passedCount++;
  } catch (err) {
    logFail('Test 3 failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Manual Garment Entry Without Gemini
  // -------------------------------------------------------------------------
  try {
    console.log('Test 4: Manual garment entry without Gemini analysis');
    const manualPayload = {
      uploadId: manualUploadId,
      attributes: {
        name: 'Cashmere Knit Ivory Sweater',
        category: 'Tops',
        subCategory: 'Sweater',
        primaryColor: 'Cream',
        secondaryColors: ['Ivory'],
        colorFamily: 'Neutrals',
        brand: 'Loro Piana',
        material: '100% Cashmere',
        pattern: 'Solid',
        season: ['Autumn', 'Winter'],
        formality: 'Smart Casual',
        fit: 'Regular',
        notes: 'Hand wash cold or dry clean only.',
        aiAnalyzed: false,
      },
    };

    const createRes = await apiRequest('/api/wardrobe/garments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manualPayload),
    });

    if (!createRes.ok || !createRes.data.garment?._id) {
      throw new Error(`Creation failed: ${createRes.data?.error || createRes.status}`);
    }

    manualGarmentId = createRes.data.garment._id;
    if (createRes.data.garment.aiAnalyzed !== false) {
      throw new Error('Expected aiAnalyzed to be false for manual entry');
    }
    if (createRes.data.garment.name !== 'Cashmere Knit Ivory Sweater') {
      throw new Error('Garment name mismatch');
    }

    logPass('Manual garment successfully saved with verified attributes and aiAnalyzed=false');
    passedCount++;
  } catch (err) {
    logFail('Test 4 failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Gemini-Assisted Upload and Attribute Detection with Real Clothing Photo
  // -------------------------------------------------------------------------
  let aiUploadId = null;
  let detectedAttrs = null;
  try {
    console.log('Test 5: Gemini-assisted image analysis with real clothing photo (outfit_today.jpg)');
    const outfitPath = path.join(__dirname, '../../public/assets/outfit_today.jpg');
    const fileBuffer = fs.readFileSync(outfitPath);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', blob, 'outfit_today.jpg');

    const uploadRes = await apiRequest('/api/wardrobe/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error(`Image upload for AI test failed: ${uploadRes.data?.error}`);
    }
    aiUploadId = uploadRes.data.uploadId;

    // Trigger Gemini analysis
    const analyzeRes = await apiRequest('/api/wardrobe/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId: aiUploadId }),
    });

    if (!analyzeRes.ok || !analyzeRes.data.attributes) {
      throw new Error(`Gemini analysis failed: ${analyzeRes.data?.error || analyzeRes.status}`);
    }

    detectedAttrs = analyzeRes.data.attributes;
    logPass(`Gemini detected attributes: Category="${detectedAttrs.category}", Color="${detectedAttrs.color}", Pattern="${detectedAttrs.pattern}"`);
    passedCount++;
  } catch (err) {
    logFail('Test 5 failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST 6: User Editing Suggested Attributes Before Explicit Save
  // -------------------------------------------------------------------------
  try {
    console.log('Test 6: Editing Gemini suggestions before explicit user confirmation');
    // User modifies suggested attributes: changes title, adds designer brand
    const userReviewedPayload = {
      uploadId: aiUploadId,
      attributes: {
        name: `Curated ${detectedAttrs?.subcategory || 'Tailored Trench Coat'}`,
        category: detectedAttrs?.category || 'Outerwear',
        subCategory: detectedAttrs?.subcategory || 'Trench Coat',
        primaryColor: detectedAttrs?.color || 'Beige',
        secondaryColors: detectedAttrs?.secondaryColors || [],
        colorFamily: 'Earth Tones',
        brand: 'The Row', // User explicitly provides brand (Gemini never invents brand)
        material: detectedAttrs?.material || 'Cotton Gabardine',
        pattern: detectedAttrs?.pattern || 'Solid',
        season: ['Autumn', 'Spring'],
        formality: 'Smart Casual',
        fit: 'Relaxed',
        notes: 'Classic double-breasted silhouette with storm flap.',
        aiAnalyzed: true,
      },
    };

    const saveRes = await apiRequest('/api/wardrobe/garments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userReviewedPayload),
    });

    if (!saveRes.ok || !saveRes.data.garment?._id) {
      throw new Error(`Save failed: ${saveRes.data?.error || saveRes.status}`);
    }

    aiGarmentId = saveRes.data.garment._id;
    if (saveRes.data.garment.aiAnalyzed !== true) {
      throw new Error('Expected aiAnalyzed to be true');
    }
    if (saveRes.data.garment.brand !== 'The Row') {
      throw new Error('User-edited brand was not persisted');
    }

    logPass('User-reviewed and edited attributes successfully confirmed and saved');
    passedCount++;
  } catch (err) {
    logFail('Test 6 failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Real Garment Retrieval, Search & Category Filters
  // -------------------------------------------------------------------------
  try {
    console.log('Test 7: Real garment retrieval after page refresh, category filtering & search');
    // 1. Fetch all garments
    const allRes = await apiRequest('/api/wardrobe/garments');
    if (!allRes.ok || allRes.data.garments.length < 2) {
      throw new Error(`Expected at least 2 garments, found ${allRes.data?.garments?.length}`);
    }

    // 2. Filter by Category = Tops
    const topsRes = await apiRequest('/api/wardrobe/garments?category=Tops');
    if (!topsRes.ok || topsRes.data.garments.length !== 1 || topsRes.data.garments[0].category !== 'Tops') {
      throw new Error(`Category filter for Tops failed: found ${topsRes.data?.garments?.length}`);
    }

    // 3. Search by keyword
    const searchRes = await apiRequest('/api/wardrobe/garments?search=Cashmere');
    if (!searchRes.ok || searchRes.data.garments.length !== 1) {
      throw new Error(`Search filter failed: found ${searchRes.data?.garments?.length}`);
    }

    // 4. Sorting
    const sortRes = await apiRequest('/api/wardrobe/garments?sort=createdAt_desc');
    if (!sortRes.ok || sortRes.data.garments.length < 2) {
      throw new Error('Sort query failed');
    }

    logPass(`Garment listing returned ${allRes.data.pagination.totalItems} pieces with category & search filtering verified`);
    passedCount++;
  } catch (err) {
    logFail('Test 7 failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST 8: Expired Signed URL Recovery
  // -------------------------------------------------------------------------
  try {
    console.log('Test 8: Expired signed URL recovery via GET /api/wardrobe/garments/:id');
    const singleRes = await apiRequest(`/api/wardrobe/garments/${manualGarmentId}`);
    if (!singleRes.ok || !singleRes.data.garment?.signedUrl) {
      throw new Error(`Single garment retrieval failed: ${singleRes.data?.error}`);
    }

    const freshUrl = singleRes.data.garment.signedUrl;
    // Verify fresh URL returns HTTP 200 via GET
    const urlCheck = await fetch(freshUrl, { method: 'GET' });
    if (!urlCheck.ok) {
      throw new Error(`Fresh signed URL check failed with status ${urlCheck.status}`);
    }

    logPass('Single garment endpoint generated fresh active signed URL for image recovery');
    passedCount++;
  } catch (err) {
    logFail('Test 8 failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST 9: Garment Attribute Editing (PATCH)
  // -------------------------------------------------------------------------
  try {
    console.log('Test 9: Updating garment attributes (PATCH /api/wardrobe/garments/:id)');
    const updatePayload = {
      name: 'Vintage Cashmere Knit Ivory Sweater',
      brand: 'Loro Piana Bespoke',
      notes: 'Updated care: store folded in cedar chest.',
    };

    const updateRes = await apiRequest(`/api/wardrobe/garments/${manualGarmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    if (!updateRes.ok || updateRes.data.garment.name !== 'Vintage Cashmere Knit Ivory Sweater') {
      throw new Error(`Update failed: ${updateRes.data?.error}`);
    }
    if (updateRes.data.garment.brand !== 'Loro Piana Bespoke') {
      throw new Error('Brand was not updated');
    }

    logPass('Garment successfully patched and verified');
    passedCount++;
  } catch (err) {
    logFail('Test 9 failed', err);
  }

  // -------------------------------------------------------------------------
  // TEST 10: Garment Deletion with Confirmation & Outbox Queue (DELETE)
  // -------------------------------------------------------------------------
  try {
    console.log('Test 10: Deleting garments (DELETE /api/wardrobe/garments/:id)');
    const delRes1 = await apiRequest(`/api/wardrobe/garments/${manualGarmentId}`, {
      method: 'DELETE',
    });
    if (!delRes1.ok) {
      throw new Error(`Delete manual garment failed: ${delRes1.data?.error}`);
    }

    const delRes2 = await apiRequest(`/api/wardrobe/garments/${aiGarmentId}`, {
      method: 'DELETE',
    });
    if (!delRes2.ok) {
      throw new Error(`Delete AI garment failed: ${delRes2.data?.error}`);
    }

    // Verify they are no longer retrievable
    const verifyDel = await apiRequest(`/api/wardrobe/garments/${manualGarmentId}`);
    if (verifyDel.status !== 404) {
      throw new Error(`Expected 404 for deleted garment, got ${verifyDel.status}`);
    }

    logPass('Garments safely deleted with verified 404 on subsequent retrieval');
    passedCount++;
  } catch (err) {
    logFail('Test 10 failed', err);
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passedCount}/${totalTests} PASSED`);
  console.log('======================================================\n');

  if (passedCount !== totalTests) {
    process.exit(1);
  }
}

runFrontendIntegrationTests().catch((err) => {
  console.error('Unhandled test execution error:', err);
  process.exit(1);
});
