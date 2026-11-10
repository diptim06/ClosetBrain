import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import http from 'http';
import calendarRoutes from '../routes/calendar.js';
import User from '../models/User.js';
import Garment from '../models/Garment.js';
import Outfit from '../models/Outfit.js';
import ScheduledOutfit from '../models/ScheduledOutfit.js';
import OutfitWearLog from '../models/OutfitWearLog.js';

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
  const uri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(uri);
}

async function runCalendarRouteTests() {
  console.log('\n=== ClosetBrain Phase 2: Calendar REST API Route Verification ===\n');

  let server = null;
  let baseUrl = '';

  const timestamp = Date.now();
  let userA, userB;
  let cookieA = '';
  let cookieB = '';

  try {
    await connectDb();

    // Setup Test Express Server on an ephemeral port
    const app = express();
    app.use(express.json());

    // Configure test session middleware
    app.use(
      session({
        secret: 'test_session_secret_calendar',
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

    // Mount Calendar Routes at /api/calendar
    app.use('/api/calendar', calendarRoutes);

    // Start server
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Create test users
    userA = await User.create({
      name: `Route User A ${timestamp}`,
      email: `route_cal_a_${timestamp}@closetbrain.test`,
      passwordHash: 'hashed_password_123',
    });

    userB = await User.create({
      name: `Route User B ${timestamp}`,
      email: `route_cal_b_${timestamp}@closetbrain.test`,
      passwordHash: 'hashed_password_123',
    });

    // Create test garments for User A
    const garmentA = await Garment.create({
      userId: userA._id,
      name: 'Cashmere Knit',
      category: 'Tops',
      primaryColor: 'Beige',
      imageKey: `test/route_cal_knit_${timestamp}.jpg`,
    });

    const garmentA2 = await Garment.create({
      userId: userA._id,
      name: 'Tailored Chino',
      category: 'Bottoms',
      primaryColor: 'Navy',
      imageKey: `test/route_cal_chino_${timestamp}.jpg`,
    });

    // Create test outfit for User A
    const outfitA = await Outfit.create({
      userId: userA._id,
      name: 'Classic Neutral Look',
      garments: [garmentA._id, garmentA2._id],
    });

    // Authenticate User A and capture session cookie
    const loginResA = await fetch(`${baseUrl}/test/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userA._id.toString() }),
    });
    cookieA = loginResA.headers.get('set-cookie') || '';

    // Authenticate User B and capture session cookie
    const loginResB = await fetch(`${baseUrl}/test/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userB._id.toString() }),
    });
    cookieB = loginResB.headers.get('set-cookie') || '';

    // ------------------------------------------------------------------------
    // Suite 1: Authentication & Access Control
    // ------------------------------------------------------------------------
    console.log('Suite 1: Authentication & Access Control');

    // Unauthenticated GET /api/calendar
    const unauthGet = await fetch(`${baseUrl}/api/calendar?start=2026-11-01&end=2026-11-15`);
    assert(unauthGet.status === 401, 'Unauthenticated GET /api/calendar returns 401');

    // Unauthenticated POST /api/calendar
    const unauthPost = await fetch(`${baseUrl}/api/calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outfitId: outfitA._id, date: '2026-11-15' }),
    });
    assert(unauthPost.status === 401, 'Unauthenticated POST /api/calendar returns 401');

    // ------------------------------------------------------------------------
    // Suite 2: Calendar Scheduling API
    // ------------------------------------------------------------------------
    console.log('\nSuite 2: Calendar Scheduling API');

    // Missing start/end query params
    const badRange = await fetch(`${baseUrl}/api/calendar`, {
      headers: { Cookie: cookieA },
    });
    assert(badRange.status === 400, 'GET /api/calendar without start/end returns 400');

    // POST /api/calendar - Schedule an outfit
    const createRes = await fetch(`${baseUrl}/api/calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        outfitId: outfitA._id.toString(),
        date: '2026-11-15',
        slot: 'Work',
        notes: 'Team retrospective',
      }),
    });
    assert(createRes.status === 201, 'POST /api/calendar returns 201 Created');
    const createdData = await createRes.json();
    assert(createdData.success === true, 'Response contains success: true');
    assert(createdData.scheduledOutfit.slot === 'Work', 'Response has slot "Work"');
    assert(createdData.scheduledOutfit.outfit.name === outfitA.name, 'Response has populated outfit');
    assert(createdData.scheduledOutfit.outfit.garments[0].signedUrl !== undefined, 'Response garments have signed URLs');

    const scheduleId = createdData.scheduledOutfit._id;

    // POST /api/calendar - Duplicate slot rejection
    const dupRes = await fetch(`${baseUrl}/api/calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        outfitId: outfitA._id.toString(),
        date: '2026-11-15',
        slot: 'Work',
      }),
    });
    assert(dupRes.status === 409, 'POST /api/calendar rejects duplicate slot with 409 Conflict');

    // POST /api/calendar - All Day conflict rejection
    const allDayRes = await fetch(`${baseUrl}/api/calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        outfitId: outfitA._id.toString(),
        date: '2026-11-15',
        slot: 'All Day',
      }),
    });
    assert(allDayRes.status === 409, 'POST /api/calendar rejects All Day conflict with 409 Conflict');

    // GET /api/calendar - Range query
    const rangeRes = await fetch(`${baseUrl}/api/calendar?start=2026-11-01&end=2026-11-30`, {
      headers: { Cookie: cookieA },
    });
    assert(rangeRes.status === 200, 'GET /api/calendar returns 200 OK');
    const rangeData = await rangeRes.json();
    assert(rangeData.scheduledOutfits.length === 1, 'Range query returns scheduled outfit');

    // GET /api/calendar/upcoming
    const upcomingRes = await fetch(`${baseUrl}/api/calendar/upcoming?days=30`, {
      headers: { Cookie: cookieA },
    });
    assert(upcomingRes.status === 200, 'GET /api/calendar/upcoming returns 200 OK');
    const upcomingData = await upcomingRes.json();
    assert(Array.isArray(upcomingData.upcomingOutfits), 'Upcoming outfits returned as array');

    // GET /api/calendar/:id - Successful fetch
    const getSingleRes = await fetch(`${baseUrl}/api/calendar/${scheduleId}`, {
      headers: { Cookie: cookieA },
    });
    assert(getSingleRes.status === 200, 'GET /api/calendar/:id returns 200 OK');

    // GET /api/calendar/:id - Invalid ID (malformed)
    const getInvalidId = await fetch(`${baseUrl}/api/calendar/invalid-id-xyz`, {
      headers: { Cookie: cookieA },
    });
    assert(getInvalidId.status === 404, 'GET /api/calendar/:id with invalid ID returns 404');

    // GET /api/calendar/:id - Missing record (non-existent ObjectId)
    const missingId = new mongoose.Types.ObjectId().toString();
    const getMissingRes = await fetch(`${baseUrl}/api/calendar/${missingId}`, {
      headers: { Cookie: cookieA },
    });
    assert(getMissingRes.status === 404, 'GET /api/calendar/:id with non-existent ID returns 404');

    // GET /api/calendar/:id - Cross-user access
    const userBAccess = await fetch(`${baseUrl}/api/calendar/${scheduleId}`, {
      headers: { Cookie: cookieB },
    });
    assert(userBAccess.status === 404, 'User B cannot fetch User A schedule (404 Not Found)');

    // PATCH /api/calendar/:id - Invalid ID (malformed)
    const patchInvalidId = await fetch(`${baseUrl}/api/calendar/invalid-id-xyz`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ notes: 'Updated notes' }),
    });
    assert(patchInvalidId.status === 404, 'PATCH /api/calendar/:id with invalid ID returns 404');

    // PATCH /api/calendar/:id - Missing record (non-existent ObjectId)
    const patchMissingRes = await fetch(`${baseUrl}/api/calendar/${missingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ notes: 'Updated notes' }),
    });
    assert(patchMissingRes.status === 404, 'PATCH /api/calendar/:id with non-existent ID returns 404');

    // PATCH /api/calendar/:id - Cross-user access
    const patchUserB = await fetch(`${baseUrl}/api/calendar/${scheduleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({ notes: 'User B tampering' }),
    });
    assert(patchUserB.status === 404, 'User B cannot patch User A schedule (404 Not Found)');

    // PATCH /api/calendar/:id - Successful update notes
    const patchRes = await fetch(`${baseUrl}/api/calendar/${scheduleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ notes: 'Updated notes for presentation' }),
    });
    assert(patchRes.status === 200, 'PATCH /api/calendar/:id returns 200 OK');
    const patchData = await patchRes.json();
    assert(patchData.scheduledOutfit.notes === 'Updated notes for presentation', 'Notes updated successfully');

    // DELETE /api/calendar/:id - Invalid ID (malformed)
    const deleteInvalidId = await fetch(`${baseUrl}/api/calendar/invalid-id-xyz`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(deleteInvalidId.status === 404, 'DELETE /api/calendar/:id with invalid ID returns 404');

    // DELETE /api/calendar/:id - Missing record (non-existent ObjectId)
    const deleteMissingRes = await fetch(`${baseUrl}/api/calendar/${missingId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(deleteMissingRes.status === 404, 'DELETE /api/calendar/:id with non-existent ID returns 404');

    // DELETE /api/calendar/:id - Cross-user access
    const deleteUserB = await fetch(`${baseUrl}/api/calendar/${scheduleId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieB },
    });
    assert(deleteUserB.status === 404, 'User B cannot delete User A schedule (404 Not Found)');

    // ------------------------------------------------------------------------
    // Suite 3: Wear Logging & Fulfillment API
    // ------------------------------------------------------------------------
    console.log('\nSuite 3: Wear Logging & Fulfillment API');

    // POST /api/calendar/:id/wear - Mark scheduled outfit as worn
    const wearRes = await fetch(`${baseUrl}/api/calendar/${scheduleId}/wear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ actualDate: '2026-11-16', notes: 'Worn on Monday' }),
    });
    assert(wearRes.status === 200, 'POST /api/calendar/:id/wear returns 200 OK');
    const wearData = await wearRes.json();
    assert(wearData.scheduledOutfit.status === 'completed', 'Schedule marked as completed');
    assert(wearData.wearLog.wornDate === '2026-11-16', 'Wear log recorded actualDate');
    assert(wearData.wearLog.garments.length === 2, 'Wear log snapshots garments');

    const wearLogId = wearData.wearLog._id;

    // POST /api/calendar/:id/wear - Idempotent double submit
    const wearDoubleRes = await fetch(`${baseUrl}/api/calendar/${scheduleId}/wear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ actualDate: '2026-11-16' }),
    });
    assert(wearDoubleRes.status === 200, 'Double submit to mark-wear returns 200 OK idempotently');

    // POST /api/calendar/wear - Log spontaneous wear
    const spontRes = await fetch(`${baseUrl}/api/calendar/wear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        outfitId: outfitA._id.toString(),
        wornDate: '2026-11-10',
        notes: 'Spontaneous wear test',
      }),
    });
    assert(spontRes.status === 201, 'POST /api/calendar/wear returns 201 Created');

    // ------------------------------------------------------------------------
    // Suite 4: Wear History Lifecycle API
    // ------------------------------------------------------------------------
    console.log('\nSuite 4: Wear History Lifecycle API');

    // GET /api/calendar/wear-history
    const historyRes = await fetch(`${baseUrl}/api/calendar/wear-history`, {
      headers: { Cookie: cookieA },
    });
    assert(historyRes.status === 200, 'GET /api/calendar/wear-history returns 200 OK');
    const historyData = await historyRes.json();
    assert(historyData.wearHistory.length === 2, 'Returns both logged wear entries');
    assert(historyData.pagination.totalItems === 2, 'Pagination has totalItems 2');

    // GET /api/calendar/wear-history/:id
    const singleHistoryRes = await fetch(`${baseUrl}/api/calendar/wear-history/${wearLogId}`, {
      headers: { Cookie: cookieA },
    });
    assert(singleHistoryRes.status === 200, 'GET /api/calendar/wear-history/:id returns 200 OK');

    // PATCH /api/calendar/wear-history/:id - Edit date and notes
    const patchHistoryRes = await fetch(`${baseUrl}/api/calendar/wear-history/${wearLogId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ wornDate: '2026-11-17', notes: 'Corrected wear date' }),
    });
    assert(patchHistoryRes.status === 200, 'PATCH /api/calendar/wear-history/:id returns 200 OK');
    const patchHistoryData = await patchHistoryRes.json();
    assert(patchHistoryData.wearLog.wornDate === '2026-11-17', 'Wear date updated');

    // DELETE /api/calendar/wear-history/:id - Delete wear log & revert schedule
    const deleteHistoryRes = await fetch(`${baseUrl}/api/calendar/wear-history/${wearLogId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(deleteHistoryRes.status === 200, 'DELETE /api/calendar/wear-history/:id returns 200 OK');

    // Verify schedule was reverted to planned
    const revertedSched = await ScheduledOutfit.findById(scheduleId);
    assert(revertedSched.status === 'planned', 'Schedule reverted to planned after wear log deleted');
    assert(revertedSched.wearLogId === null, 'Schedule wearLogId cleared');

    // DELETE /api/calendar/:id - Remove scheduled outfit
    const deleteSchedRes = await fetch(`${baseUrl}/api/calendar/${scheduleId}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA },
    });
    assert(deleteSchedRes.status === 200, 'DELETE /api/calendar/:id returns 200 OK');
  } finally {
    // Cleanup
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (userA && userB) {
      await ScheduledOutfit.deleteMany({ userId: { $in: [userA._id, userB._id] } });
      await OutfitWearLog.deleteMany({ userId: { $in: [userA._id, userB._id] } });
      await Outfit.deleteMany({ userId: { $in: [userA._id, userB._id] } });
      await Garment.deleteMany({ userId: { $in: [userA._id, userB._id] } });
      await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    }
    await mongoose.disconnect();
  }

  console.log('\n=== CALENDAR ROUTE VERIFICATION SUMMARY ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

runCalendarRouteTests().catch(async (err) => {
  console.error('Fatal route test error:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
