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
      console.log(`Connected to database via primary URI.`);
      return;
    } catch (err) {
      console.warn(`Primary DB connection failed (${err.message}). Trying fallback local URI...`);
    }
  }

  await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 3000 });
  console.log(`Connected to fallback local database: ${fallbackUri}`);
}

async function runOutfitStudioFrontendVerification() {
  console.log('\n=== ClosetBrain Phase 3: Outfit Studio Frontend & Contract Verification ===\n');

  let server = null;
  let baseUrl = '';

  try {
    await connectDb();

    // Setup Test Express Server on an ephemeral port
    const app = express();
    app.use(express.json());

    app.use(
      session({
        secret: 'studio_test_secret_key',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
      })
    );

    app.post('/test/auth/login', (req, res) => {
      const { userId } = req.body;
      req.session.userId = userId;
      return res.status(200).json({ success: true, userId });
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

    const timestamp = Date.now();

    // Setup User and Wardrobe pieces
    const user = await User.create({
      name: `Studio Tester ${timestamp}`,
      email: `studio_tester_${timestamp}@closetbrain.test`,
      passwordHash: 'hashed_pw_test',
    });

    // Login
    const loginRes = await fetch(`${baseUrl}/test/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user._id.toString() }),
    });
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0];

    // Seed 4 Garments representing a complete outfit formula
    const gTrench = await Garment.create({
      userId: user._id,
      name: 'Oversized Gabardine Trench',
      category: 'Outerwear',
      primaryColor: '#D8C7B5',
      brand: 'The Row',
      pattern: 'Solid',
      imageKey: `users/${user._id}/garments/trench_${timestamp}.webp`,
    });

    const gKnit = await Garment.create({
      userId: user._id,
      name: 'Cashmere Fisherman Knit',
      category: 'Tops',
      primaryColor: '#F4EFE6',
      brand: 'Lemaire',
      pattern: 'Textured',
      imageKey: `users/${user._id}/garments/knit_${timestamp}.webp`,
    });

    const gTrousers = await Garment.create({
      userId: user._id,
      name: 'Pleated Straight Slacks',
      category: 'Bottoms',
      primaryColor: '#4B4B52',
      brand: 'Acne Studios',
      pattern: 'Solid',
      imageKey: `users/${user._id}/garments/slacks_${timestamp}.webp`,
    });

    const gBoots = await Garment.create({
      userId: user._id,
      name: 'Calfskin Chelsea Boots',
      category: 'Shoes',
      primaryColor: '#2B2B2B',
      brand: 'Toteme',
      pattern: 'Solid',
      imageKey: `users/${user._id}/garments/boots_${timestamp}.webp`,
    });

    // -------------------------------------------------------------
    console.log('Suite 1: Composition Bounds & Empty Selection Validation');
    // -------------------------------------------------------------
    {
      // 0 garments selected
      const emptyRes = await fetch(`${baseUrl}/api/outfits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ name: 'Empty Canvas Look', garments: [] }),
      });
      assert(emptyRes.status === 400, 'Saving with 0 garments returns 400');
      const emptyBody = await emptyRes.json();
      assert(emptyBody.error.includes('at least one garment'), 'Error message instructs user to add at least 1 garment');

      // Blank title
      const blankTitleRes = await fetch(`${baseUrl}/api/outfits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ name: '   ', garments: [gTrench._id.toString()] }),
      });
      assert(blankTitleRes.status === 400, 'Saving with blank title returns 400');

      // More than 10 garments (exceeding maximum limit)
      const elevenIds = [
        gTrench._id.toString(),
        gKnit._id.toString(),
        gTrousers._id.toString(),
        gBoots._id.toString(),
      ];
      // Create additional dummy garment IDs
      for (let i = 0; i < 7; i++) {
        const extraG = await Garment.create({
          userId: user._id,
          name: `Extra Piece #${i}`,
          category: 'Accessories',
          primaryColor: '#111111',
          imageKey: `users/${user._id}/garments/extra_${i}_${timestamp}.webp`,
        });
        elevenIds.push(extraG._id.toString());
      }

      const overLimitRes = await fetch(`${baseUrl}/api/outfits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ name: 'Excessive Pieces Look', garments: elevenIds }),
      });
      assert(overLimitRes.status === 400, 'Saving >10 garments rejected with 400');
      const overLimitBody = await overLimitRes.json();
      assert(overLimitBody.error.includes('more than 10 garments'), 'Error message states 10 garment limit');
    }

    // -------------------------------------------------------------
    console.log('\nSuite 2: Studio Creation Flow (POST /api/outfits)');
    // -------------------------------------------------------------
    let savedOutfitId = null;
    {
      const createRes = await fetch(`${baseUrl}/api/outfits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          name: 'Autumn Trench & Cashmere Formulation',
          notes: 'Balanced thermal layers with dark accessories for campus & studio.',
          garments: [
            gTrench._id.toString(),
            gKnit._id.toString(),
            gTrousers._id.toString(),
            gBoots._id.toString(),
          ],
        }),
      });

      assert(createRes.status === 201, 'Studio creation returns 201 Created');
      const createData = await createRes.json();
      assert(createData.success === true, 'Success flag is true');
      assert(createData.outfit?.name === 'Autumn Trench & Cashmere Formulation', 'Name matches created look');
      assert(createData.outfit?.garments.length === 4, 'All 4 pieces populated');
      assert(createData.outfit?.garments[0]._id === gTrench._id.toString(), 'Maintains piece order: Outerwear first');
      assert(createData.outfit?.garments[1]._id === gKnit._id.toString(), 'Maintains piece order: Tops second');
      assert(createData.outfit?.garments[2]._id === gTrousers._id.toString(), 'Maintains piece order: Bottoms third');
      assert(createData.outfit?.garments[3]._id === gBoots._id.toString(), 'Maintains piece order: Shoes fourth');

      savedOutfitId = createData.outfit._id;
    }

    // -------------------------------------------------------------
    console.log('\nSuite 3: Studio Load & Edit Flow (GET & PATCH /api/outfits/:id)');
    // -------------------------------------------------------------
    {
      // Load outfit into Studio
      const loadRes = await fetch(`${baseUrl}/api/outfits/${savedOutfitId}`, {
        headers: { Cookie: cookie },
      });
      assert(loadRes.status === 200, 'Studio preloading outfit returns 200 OK');
      const loadData = await loadRes.json();
      assert(loadData.outfit._id === savedOutfitId, 'Loaded outfit ID matches');
      assert(loadData.outfit.garments.length === 4, 'Loaded outfit has all 4 pieces ready for canvas');

      // Edit outfit: modify name, notes, and remove shoes piece (reducing from 4 to 3)
      const editRes = await fetch(`${baseUrl}/api/outfits/${savedOutfitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          name: 'Autumn Trench & Cashmere Formulation (Refined)',
          notes: 'Removed heavy boots in favor of lighter footwear.',
          garments: [
            gTrench._id.toString(),
            gKnit._id.toString(),
            gTrousers._id.toString(),
          ],
        }),
      });

      assert(editRes.status === 200, 'Updating outfit returns 200 OK');
      const editData = await editRes.json();
      assert(editData.outfit.name === 'Autumn Trench & Cashmere Formulation (Refined)', 'Updated name saved');
      assert(editData.outfit.garments.length === 3, 'Piece count updated to 3');
      assert(editData.outfit.notes.includes('lighter footwear'), 'Updated notes saved');
    }

    // -------------------------------------------------------------
    console.log('\nSuite 4: Studio Delete Flow with Confirmation (DELETE /api/outfits/:id)');
    // -------------------------------------------------------------
    {
      const deleteRes = await fetch(`${baseUrl}/api/outfits/${savedOutfitId}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      });
      assert(deleteRes.status === 200, 'Delete outfit returns 200 OK');
      const deleteData = await deleteRes.json();
      assert(deleteData.success === true && deleteData.outfitId === savedOutfitId, 'Delete confirmed');

      // Subsequent fetch returns 404
      const verifyRes = await fetch(`${baseUrl}/api/outfits/${savedOutfitId}`, {
        headers: { Cookie: cookie },
      });
      assert(verifyRes.status === 404, 'Deleted outfit returns 404');
    }

    // -------------------------------------------------------------
    console.log('\nSuite 5: Saved Outfits Switcher List (GET /api/outfits)');
    // -------------------------------------------------------------
    {
      // Create 2 test outfits
      const o1 = await (
        await fetch(`${baseUrl}/api/outfits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify({ name: 'Look 1', garments: [gTrench._id] }),
        })
      ).json();

      const o2 = await (
        await fetch(`${baseUrl}/api/outfits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify({ name: 'Look 2', garments: [gKnit._id] }),
        })
      ).json();

      const listRes = await fetch(`${baseUrl}/api/outfits?limit=50&sort=createdAt_desc`, {
        headers: { Cookie: cookie },
      });
      assert(listRes.status === 200, 'GET /api/outfits for switcher returns 200');
      const listData = await listRes.json();
      assert(listData.outfits.length === 2, 'Switcher receives 2 outfits');
      assert(listData.outfits[0].name === 'Look 2', 'Default sort newest first');

      // Cleanup
      await Outfit.deleteMany({ _id: { $in: [o1.outfit._id, o2.outfit._id] } });
    }

    // Clean up
    await Garment.deleteMany({ userId: user._id });
    await User.deleteMany({ _id: user._id });

    console.log('\n=== OUTFIT STUDIO VERIFICATION SUMMARY ===');
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

runOutfitStudioFrontendVerification();
