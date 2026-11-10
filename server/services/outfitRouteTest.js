import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import http from 'http';
import outfitRoutes from '../routes/outfits.js';
import User from '../models/User.js';
import Garment from '../models/Garment.js';
import Outfit from '../models/Outfit.js';

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

async function runOutfitRouteTests() {
  console.log('\n=== ClosetBrain Phase 2: Outfit REST API Route Verification ===\n');

  let server = null;
  let baseUrl = '';

  try {
    await connectDb();

    // Setup Test Express Server on an ephemeral port
    const app = express();
    app.use(express.json());

    // Configure test session middleware
    app.use(
      session({
        secret: 'test_session_secret_closetbrain',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
      })
    );

    // Mock login endpoint for testing cookies and authenticated sessions
    app.post('/test/auth/login', (req, res) => {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId required' });
      }
      req.session.userId = userId;
      return res.status(200).json({ success: true, userId });
    });

    // Mock logout endpoint
    app.post('/test/auth/logout', (req, res) => {
      req.session.destroy();
      return res.status(200).json({ success: true });
    });

    // Mount Outfit Routes at standard endpoint
    app.use('/api/outfits', outfitRoutes);

    // Start server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    const timestamp = Date.now();

    // Create test users
    const userA = await User.create({
      name: `Route User A ${timestamp}`,
      email: `route_user_a_${timestamp}@closetbrain.test`,
      passwordHash: 'hashed_password_123',
    });

    const userB = await User.create({
      name: `Route User B ${timestamp}`,
      email: `route_user_b_${timestamp}@closetbrain.test`,
      passwordHash: 'hashed_password_123',
    });

    // Create test garments for User A
    const gA1 = await Garment.create({
      userId: userA._id,
      name: 'Structured Blazer',
      category: 'Outerwear',
      primaryColor: '#2B2B2B',
      brand: 'Jil Sander',
      pattern: 'Solid',
      imageKey: `users/${userA._id}/garments/blazer_${timestamp}.webp`,
    });

    const gA2 = await Garment.create({
      userId: userA._id,
      name: 'Silk Crepe Shirt',
      category: 'Tops',
      primaryColor: '#FDFBF7',
      brand: 'Lemaire',
      pattern: 'Solid',
      imageKey: `users/${userA._id}/garments/shirt_${timestamp}.webp`,
    });

    const gA3 = await Garment.create({
      userId: userA._id,
      name: 'Tailored Wool Slacks',
      category: 'Bottoms',
      primaryColor: '#3D3D3D',
      brand: 'The Row',
      pattern: 'Solid',
      imageKey: `users/${userA._id}/garments/slacks_${timestamp}.webp`,
    });

    // Create test garment for User B
    const gB1 = await Garment.create({
      userId: userB._id,
      name: 'Foreign Silk Trench',
      category: 'Outerwear',
      primaryColor: '#8C8379',
      brand: 'Khaite',
      pattern: 'Solid',
      imageKey: `users/${userB._id}/garments/foreign_${timestamp}.webp`,
    });

    // Helper to log in and get a session cookie
    async function loginAs(userId) {
      const res = await fetch(`${baseUrl}/test/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const cookieHeader = res.headers.get('set-cookie');
      return cookieHeader ? cookieHeader.split(';')[0] : '';
    }

    const cookieA = await loginAs(userA._id.toString());
    const cookieB = await loginAs(userB._id.toString());

    // -------------------------------------------------------------
    console.log('Suite 1: Unauthenticated Requests (401 Enforcement)');
    // -------------------------------------------------------------
    {
      const resGetList = await fetch(`${baseUrl}/api/outfits`);
      assert(resGetList.status === 401, 'GET /api/outfits returns 401 without session');

      const resPost = await fetch(`${baseUrl}/api/outfits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Outfit', garments: [gA1._id] }),
      });
      assert(resPost.status === 401, 'POST /api/outfits returns 401 without session');

      const resGetOne = await fetch(`${baseUrl}/api/outfits/${new mongoose.Types.ObjectId()}`);
      assert(resGetOne.status === 401, 'GET /api/outfits/:id returns 401 without session');

      const resPatch = await fetch(`${baseUrl}/api/outfits/${new mongoose.Types.ObjectId()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });
      assert(resPatch.status === 401, 'PATCH /api/outfits/:id returns 401 without session');

      const resDelete = await fetch(`${baseUrl}/api/outfits/${new mongoose.Types.ObjectId()}`, {
        method: 'DELETE',
      });
      assert(resDelete.status === 401, 'DELETE /api/outfits/:id returns 401 without session');
    }

    // -------------------------------------------------------------
    console.log('\nSuite 2: Successful CRUD HTTP Flows');
    // -------------------------------------------------------------
    let createdOutfitId = null;
    {
      // 1. Create Outfit
      const createRes = await fetch(`${baseUrl}/api/outfits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieA,
        },
        body: JSON.stringify({
          name: 'Gallery Minimalist Look',
          notes: 'Subtle textures for evening gallery opening',
          garments: [gA1._id.toString(), gA2._id.toString(), gA3._id.toString()],
        }),
      });

      assert(createRes.status === 201, 'POST /api/outfits returns 201 Created');
      const createBody = await createRes.json();
      assert(createBody.success === true, 'Response contains success: true');
      assert(createBody.outfit?.name === 'Gallery Minimalist Look', 'Created outfit name matches input');
      assert(createBody.outfit?.garments?.length === 3, 'Created outfit has 3 garments');
      assert(createBody.outfit?.garments[0].imageKey === undefined, 'imageKey is omitted from garment response');
      assert(typeof createBody.outfit?.garments[0].signedUrl === 'string' || createBody.outfit?.garments[0].signedUrl === null, 'garments include signedUrl property');

      createdOutfitId = createBody.outfit._id;

      // 2. Fetch Single Outfit by ID
      const getOneRes = await fetch(`${baseUrl}/api/outfits/${createdOutfitId}`, {
        headers: { Cookie: cookieA },
      });
      assert(getOneRes.status === 200, 'GET /api/outfits/:id returns 200 OK');
      const getOneBody = await getOneRes.json();
      assert(getOneBody.success === true && getOneBody.outfit._id === createdOutfitId, 'GET /:id returns correct outfit');
      assert(getOneBody.outfit.garments.length === 3, 'GET /:id populates all 3 garments in order');

      // 3. List Outfits
      const getListRes = await fetch(`${baseUrl}/api/outfits`, {
        headers: { Cookie: cookieA },
      });
      assert(getListRes.status === 200, 'GET /api/outfits returns 200 OK');
      const listBody = await getListRes.json();
      assert(listBody.success === true, 'List response contains success: true');
      assert(Array.isArray(listBody.outfits), 'outfits is an array');
      assert(listBody.pagination?.totalItems === 1, 'pagination.totalItems is 1');
      assert(listBody.outfits[0]._id === createdOutfitId, 'List contains the created outfit');

      // 4. Update Outfit (PATCH)
      const patchRes = await fetch(`${baseUrl}/api/outfits/${createdOutfitId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieA,
        },
        body: JSON.stringify({
          name: 'Gallery Minimalist Look (Updated)',
          notes: 'Refined notes',
          garments: [gA1._id.toString(), gA2._id.toString()],
        }),
      });
      assert(patchRes.status === 200, 'PATCH /api/outfits/:id returns 200 OK');
      const patchBody = await patchRes.json();
      assert(patchBody.outfit?.name === 'Gallery Minimalist Look (Updated)', 'Updated name persisted');
      assert(patchBody.outfit?.garments?.length === 2, 'Garment count updated to 2');

      // 5. Delete Outfit
      const deleteRes = await fetch(`${baseUrl}/api/outfits/${createdOutfitId}`, {
        method: 'DELETE',
        headers: { Cookie: cookieA },
      });
      assert(deleteRes.status === 200, 'DELETE /api/outfits/:id returns 200 OK');
      const deleteBody = await deleteRes.json();
      assert(deleteBody.success === true && deleteBody.outfitId === createdOutfitId, 'Delete response confirms outfitId');

      // 6. Verify subsequent GET returns 404
      const verifyDeletedRes = await fetch(`${baseUrl}/api/outfits/${createdOutfitId}`, {
        headers: { Cookie: cookieA },
      });
      assert(verifyDeletedRes.status === 404, 'GET deleted outfit returns 404');
    }

    // -------------------------------------------------------------
    console.log('\nSuite 3: Invalid IDs and Payloads');
    // -------------------------------------------------------------
    {
      // Malformed ID formats (should return safe 404)
      const resBadGet = await fetch(`${baseUrl}/api/outfits/invalid-id-xyz`, {
        headers: { Cookie: cookieA },
      });
      assert(resBadGet.status === 404, 'GET with malformed ID returns 404');

      const resBadPatch = await fetch(`${baseUrl}/api/outfits/invalid-id-xyz`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({ name: 'New' }),
      });
      assert(resBadPatch.status === 404, 'PATCH with malformed ID returns 404');

      const resBadDelete = await fetch(`${baseUrl}/api/outfits/invalid-id-xyz`, {
        method: 'DELETE',
        headers: { Cookie: cookieA },
      });
      assert(resBadDelete.status === 404, 'DELETE with malformed ID returns 404');

      // Valid ObjectId format but non-existent document
      const randomValidId = new mongoose.Types.ObjectId().toString();
      const resNonExistent = await fetch(`${baseUrl}/api/outfits/${randomValidId}`, {
        headers: { Cookie: cookieA },
      });
      assert(resNonExistent.status === 404, 'GET with non-existent ObjectId returns 404');

      // Empty garments array
      const resEmptyGarments = await fetch(`${baseUrl}/api/outfits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({ name: 'Empty Garments', garments: [] }),
      });
      assert(resEmptyGarments.status === 400, 'POST with empty garments returns 400');

      // Missing / blank name
      const resBlankName = await fetch(`${baseUrl}/api/outfits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({ name: '   ', garments: [gA1._id] }),
      });
      assert(resBlankName.status === 400, 'POST with whitespace-only name returns 400');

      // Malformed garment ID in array
      const resBadGarmentId = await fetch(`${baseUrl}/api/outfits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({ name: 'Bad Garment ID', garments: ['not-an-id'] }),
      });
      assert(resBadGarmentId.status === 400, 'POST with malformed garment ID in array returns 400');

      // Duplicate garments in selection
      const resDuplicateGarments = await fetch(`${baseUrl}/api/outfits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({
          name: 'Duplicates',
          garments: [gA1._id.toString(), gA1._id.toString()],
        }),
      });
      assert(resDuplicateGarments.status === 400, 'POST with duplicate garment IDs returns 400');

      // Over 10 garments
      const elevenIds = Array(11).fill(gA1._id.toString());
      const resOverLimit = await fetch(`${baseUrl}/api/outfits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({ name: 'Over Limit', garments: elevenIds }),
      });
      assert(resOverLimit.status === 400, 'POST with > 10 garments returns 400');
    }

    // -------------------------------------------------------------
    console.log('\nSuite 4: Cross-User Ownership Isolation & IDOR Defense');
    // -------------------------------------------------------------
    {
      // Create a valid outfit for User A
      const createResA = await fetch(`${baseUrl}/api/outfits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({
          name: "User A's Exclusive Outfit",
          garments: [gA1._id.toString()],
        }),
      });
      const outfitA = (await createResA.json()).outfit;

      // User A attempts to include User B's garment (cross-user insertion)
      const resCrossCreate = await fetch(`${baseUrl}/api/outfits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({
          name: 'Illegal Cross Outfit',
          garments: [gA1._id.toString(), gB1._id.toString()],
        }),
      });
      assert(resCrossCreate.status === 400, 'Cross-user garment insertion rejected with 400');

      // User B attempts to fetch User A's outfit by ID
      const resCrossGet = await fetch(`${baseUrl}/api/outfits/${outfitA._id}`, {
        headers: { Cookie: cookieB },
      });
      assert(resCrossGet.status === 404, 'User B fetching User A outfit returns safe 404');

      // User B attempts to PATCH User A's outfit
      const resCrossPatch = await fetch(`${baseUrl}/api/outfits/${outfitA._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookieB },
        body: JSON.stringify({ name: 'Hacked Name' }),
      });
      assert(resCrossPatch.status === 404, 'User B updating User A outfit returns safe 404');

      // User B attempts to DELETE User A's outfit
      const resCrossDelete = await fetch(`${baseUrl}/api/outfits/${outfitA._id}`, {
        method: 'DELETE',
        headers: { Cookie: cookieB },
      });
      assert(resCrossDelete.status === 404, 'User B deleting User A outfit returns safe 404');

      // User B lists outfits -> strictly 0 returned
      const resListB = await fetch(`${baseUrl}/api/outfits`, {
        headers: { Cookie: cookieB },
      });
      const listB = await resListB.json();
      assert(listB.pagination.totalItems === 0, 'User B lists outfits and sees 0 of User A outfits');

      // Clean up outfit A
      await fetch(`${baseUrl}/api/outfits/${outfitA._id}`, {
        method: 'DELETE',
        headers: { Cookie: cookieA },
      });
    }

    // -------------------------------------------------------------
    console.log('\nSuite 5: Pagination, Search, and Sort Behavior');
    // -------------------------------------------------------------
    {
      // Create 3 outfits with distinct names for User A
      const outfitAlpha = await (
        await fetch(`${baseUrl}/api/outfits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieA },
          body: JSON.stringify({ name: 'Alpha Blazer Set', garments: [gA1._id] }),
        })
      ).json();

      const outfitBeta = await (
        await fetch(`${baseUrl}/api/outfits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieA },
          body: JSON.stringify({ name: 'Beta Knit Combo', garments: [gA2._id] }),
        })
      ).json();

      const outfitGamma = await (
        await fetch(`${baseUrl}/api/outfits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieA },
          body: JSON.stringify({ name: 'Gamma Slacks Look', garments: [gA3._id] }),
        })
      ).json();

      // Pagination test: limit 2, page 1
      const resPage1 = await fetch(`${baseUrl}/api/outfits?limit=2&page=1`, {
        headers: { Cookie: cookieA },
      });
      const page1Data = await resPage1.json();
      assert(page1Data.outfits.length === 2, 'Page 1 limit 2 returns 2 items');
      assert(page1Data.pagination.totalPages === 2, 'Total pages is 2');
      assert(page1Data.pagination.hasNextPage === true, 'hasNextPage is true');
      assert(page1Data.pagination.hasPrevPage === false, 'hasPrevPage is false');

      // Pagination test: page 2
      const resPage2 = await fetch(`${baseUrl}/api/outfits?limit=2&page=2`, {
        headers: { Cookie: cookieA },
      });
      const page2Data = await resPage2.json();
      assert(page2Data.outfits.length === 1, 'Page 2 returns remaining 1 item');
      assert(page2Data.pagination.hasNextPage === false, 'Page 2 hasNextPage is false');
      assert(page2Data.pagination.hasPrevPage === true, 'Page 2 hasPrevPage is true');

      // Search query test
      const resSearch = await fetch(`${baseUrl}/api/outfits?search=Beta`, {
        headers: { Cookie: cookieA },
      });
      const searchData = await resSearch.json();
      assert(searchData.outfits.length === 1, 'Search for "Beta" returns exactly 1 match');
      assert(searchData.outfits[0].name === 'Beta Knit Combo', 'Search returned expected outfit');

      // Sorting test: name_asc
      const resSort = await fetch(`${baseUrl}/api/outfits?sort=name_asc`, {
        headers: { Cookie: cookieA },
      });
      const sortData = await resSort.json();
      assert(sortData.outfits[0].name === 'Alpha Blazer Set', 'name_asc puts Alpha first');
      assert(sortData.outfits[2].name === 'Gamma Slacks Look', 'name_asc puts Gamma third');

      // Clean up the 3 test outfits
      await Outfit.deleteMany({
        _id: {
          $in: [
            outfitAlpha.outfit._id,
            outfitBeta.outfit._id,
            outfitGamma.outfit._id,
          ],
        },
      });
    }

    // Final clean up test records
    await Garment.deleteMany({ _id: { $in: [gA1._id, gA2._id, gA3._id, gB1._id] } });
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });

    console.log('\n=== ROUTE VERIFICATION SUMMARY ===');
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}\n`);

    if (results.failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal unexpected error during test run:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
}

runOutfitRouteTests();
