import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Garment from '../models/Garment.js';
import User from '../models/User.js';
import { getWardrobeSummary } from './wardrobeService.js';

dotenv.config();

async function runDashboardSummaryTests() {
  console.log('\n=== ClosetBrain Milestone 4B: Dashboard Summary Integration Verification ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const testTimestamp = Date.now();
    const userA = await User.create({
      name: `Summary Test User A ${testTimestamp}`,
      email: `summary_a_${testTimestamp}@closetbrain.test`,
      passwordHash: 'hashed_password_for_testing_123',
    });

    const userB = await User.create({
      name: `Summary Test User B ${testTimestamp}`,
      email: `summary_b_${testTimestamp}@closetbrain.test`,
      passwordHash: 'hashed_password_for_testing_123',
    });

    console.log('Suite 1: Empty Wardrobe Behavior');
    const emptySummary = await getWardrobeSummary({ userId: userA._id });

    assert(emptySummary.totalItems === 0, 'Total items is 0 for empty wardrobe');
    assert(emptySummary.totalGarments === 0, 'Total garments alias is 0');
    assert(emptySummary.recentlyAddedThisWeek === 0, 'Recently added this week is 0');
    assert(
      emptySummary.categoryCounts.Tops === 0 &&
      emptySummary.categoryCounts.Bottoms === 0 &&
      emptySummary.categoryCounts.Outerwear === 0 &&
      emptySummary.categoryCounts.Dresses === 0 &&
      emptySummary.categoryCounts.Shoes === 0 &&
      emptySummary.categoryCounts.Accessories === 0,
      'All predefined category counts initialized to 0'
    );
    assert(Array.isArray(emptySummary.colorDistribution) && emptySummary.colorDistribution.length === 0, 'Color distribution is empty array');
    assert(Array.isArray(emptySummary.topBrands) && emptySummary.topBrands.length === 0, 'Top brands is empty array');
    assert(emptySummary.topTone === 'None', 'Top tone is "None"');

    console.log('\nSuite 2: Garment Creation & Summary Updates');
    // Create 3 garments for User A:
    // 1. Tops, Neutrals, brand 'The Row', created now
    // 2. Bottoms, Earth Tones, brand 'Lemaire', created now
    // 3. Tops, Neutrals, brand '   ' (whitespace should be excluded), created 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    const g1 = await Garment.create({
      userId: userA._id,
      name: 'User A Silk Top',
      category: 'Tops',
      primaryColor: '#F4EFE6',
      colorFamily: 'Neutrals',
      brand: 'The Row',
      imageKey: 'test/summary/g1.webp',
    });

    const g2 = await Garment.create({
      userId: userA._id,
      name: 'User A Earth Trousers',
      category: 'Bottoms',
      primaryColor: '#8D5B4C',
      colorFamily: 'Earth Tones',
      brand: 'Lemaire',
      imageKey: 'test/summary/g2.webp',
    });

    const g3 = await Garment.create({
      userId: userA._id,
      name: 'User A Older Knit',
      category: 'Tops',
      primaryColor: '#D8C7B5',
      colorFamily: 'Neutrals',
      brand: '   ', // whitespace brand
      imageKey: 'test/summary/g3.webp',
      createdAt: tenDaysAgo,
    });

    // Create 1 garment for User B
    const gB = await Garment.create({
      userId: userB._id,
      name: 'User B Foreign Trench',
      category: 'Outerwear',
      primaryColor: '#4B4B52',
      colorFamily: 'Monochrome',
      brand: 'Prada',
      imageKey: 'test/summary/gb.webp',
    });

    const populatedSummaryA = await getWardrobeSummary({ userId: userA._id });

    console.log('\nSuite 3: Wardrobe Counts & Week Boundary Calculation');
    assert(populatedSummaryA.totalItems === 3, 'User A total items is exactly 3');
    assert(populatedSummaryA.recentlyAddedThisWeek === 2, 'Recently added this week is 2 (older item excluded)');
    assert(populatedSummaryA.categoryCounts.Tops === 2, 'Tops count is 2');
    assert(populatedSummaryA.categoryCounts.Bottoms === 1, 'Bottoms count is 1');
    assert(populatedSummaryA.categoryCounts.Outerwear === 0, 'Outerwear count is 0');

    console.log('\nSuite 4: Colour Family Distribution & Dynamic Percentages');
    // 2 Neutrals out of 3 = 67%, 1 Earth Tones out of 3 = 33%
    const neutralDist = populatedSummaryA.colorDistribution.find(c => c.label === 'Neutrals');
    const earthDist = populatedSummaryA.colorDistribution.find(c => c.label === 'Earth Tones');
    assert(neutralDist && neutralDist.count === 2, 'Neutrals count is 2');
    assert(neutralDist && neutralDist.percentage === 67, 'Neutrals percentage is 67%');
    assert(earthDist && earthDist.count === 1, 'Earth Tones count is 1');
    assert(earthDist && earthDist.percentage === 33, 'Earth Tones percentage is 33%');
    assert(populatedSummaryA.topTone === 'Neutrals', 'Top tone correctly identified as "Neutrals"');

    console.log('\nSuite 5: Top Brands Sanitization');
    assert(populatedSummaryA.topBrands.includes('The Row'), 'Top brands includes "The Row"');
    assert(populatedSummaryA.topBrands.includes('Lemaire'), 'Top brands includes "Lemaire"');
    assert(!populatedSummaryA.topBrands.includes(''), 'Empty/whitespace brand strictly excluded');
    assert(!populatedSummaryA.topBrands.includes('Prada'), 'User B brand strictly excluded');

    console.log('\nSuite 6: Multi-User Isolation');
    const summaryB = await getWardrobeSummary({ userId: userB._id });
    assert(summaryB.totalItems === 1, 'User B has exactly 1 garment');
    assert(summaryB.categoryCounts.Outerwear === 1, 'User B has 1 Outerwear');
    assert(summaryB.categoryCounts.Tops === 0, 'User B has 0 Tops');
    assert(summaryB.topBrands.length === 1 && summaryB.topBrands[0] === 'Prada', 'User B sees only "Prada"');

    // Clean up test records
    await Garment.deleteMany({ _id: { $in: [g1._id, g2._id, g3._id, gB._id] } });
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });

    console.log(`\n=== VERIFICATION SUMMARY ===`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite failed with unexpected error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runDashboardSummaryTests();
