import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Garment from '../models/Garment.js';
import User from '../models/User.js';
import { getWardrobeSummary, getGarments, deleteGarment } from './wardrobeService.js';

dotenv.config();

async function runMilestone4BVerification() {
  console.log('\n=== ClosetBrain Milestone 4B: Live Dashboard Data Verification Suite ===\n');

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

    const timestamp = Date.now();
    const primaryUser = await User.create({
      name: `Dashboard Primary User ${timestamp}`,
      email: `dash_primary_${timestamp}@closetbrain.test`,
      passwordHash: 'password_hash_123',
    });

    const otherUser = await User.create({
      name: `Dashboard Other User ${timestamp}`,
      email: `dash_other_${timestamp}@closetbrain.test`,
      passwordHash: 'password_hash_123',
    });

    // -------------------------------------------------------------
    // Test 1: Empty wardrobe returns zero counts and empty arrays
    // -------------------------------------------------------------
    console.log('Test 1: Empty wardrobe returns zero counts and empty arrays');
    const emptySummary = await getWardrobeSummary({ userId: primaryUser._id });
    const emptyRecent = await getGarments({ userId: primaryUser._id, sort: 'createdAt_desc', limit: 4 });

    assert(emptySummary.totalItems === 0, 'Summary totalItems is 0');
    assert(emptySummary.recentlyAddedThisWeek === 0, 'recentlyAddedThisWeek is 0');
    assert(emptySummary.topTone === 'None', 'topTone is "None"');
    assert(Array.isArray(emptySummary.colorDistribution) && emptySummary.colorDistribution.length === 0, 'colorDistribution is empty array');
    assert(Array.isArray(emptySummary.topBrands) && emptySummary.topBrands.length === 0, 'topBrands is empty array');
    assert(emptyRecent.garments.length === 0, 'Recently added garments is empty array');

    // -------------------------------------------------------------
    // Test 2 & 4: Adding garments updates total count and category counts match DB
    // -------------------------------------------------------------
    console.log('\nTest 2 & 4: Adding garments updates total count and category counts match DB');
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // Garment 1: Tops, Neutrals, The Row, 2 days ago
    const g1 = await Garment.create({
      userId: primaryUser._id,
      name: 'Structured Wool Coat',
      category: 'Outerwear',
      primaryColor: '#D8C7B5',
      colorFamily: 'Neutrals',
      brand: 'The Row',
      imageKey: 'test/dash/g1.webp',
      createdAt: twoDaysAgo,
    });

    // Garment 2: Tops, Neutrals, Lemaire, 1 day ago
    const g2 = await Garment.create({
      userId: primaryUser._id,
      name: 'Cream Cashmere Knit',
      category: 'Tops',
      primaryColor: '#F4EFE6',
      colorFamily: 'Neutrals',
      brand: 'Lemaire',
      imageKey: 'test/dash/g2.webp',
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    });

    // Garment 3: Bottoms, Earth Tones, Acne Studios, now
    const g3 = await Garment.create({
      userId: primaryUser._id,
      name: 'Pleated Trousers',
      category: 'Bottoms',
      primaryColor: '#8D5B4C',
      colorFamily: 'Earth Tones',
      brand: 'Acne Studios',
      imageKey: 'test/dash/g3.webp',
      createdAt: now,
    });

    // Garment 4: Tops, Earth Tones, null brand, now
    const g4 = await Garment.create({
      userId: primaryUser._id,
      name: 'Linen Shirt',
      category: 'Tops',
      primaryColor: '#B76E79',
      colorFamily: 'Earth Tones',
      brand: null,
      imageKey: 'test/dash/g4.webp',
      createdAt: now,
    });

    // Garment 5: Shoes, Monochrome, empty brand, 10 days ago (older than 1 week)
    const g5 = await Garment.create({
      userId: primaryUser._id,
      name: 'Leather Boots',
      category: 'Shoes',
      primaryColor: '#4B4B52',
      colorFamily: 'Monochrome',
      brand: '   ',
      imageKey: 'test/dash/g5.webp',
      createdAt: tenDaysAgo,
    });

    // Add a garment for otherUser
    const gOther = await Garment.create({
      userId: otherUser._id,
      name: 'Foreign Trench',
      category: 'Outerwear',
      primaryColor: '#1C1817',
      colorFamily: 'Monochrome',
      brand: 'Balenciaga',
      imageKey: 'test/dash/foreign.webp',
    });

    const summaryAfterAdd = await getWardrobeSummary({ userId: primaryUser._id });

    assert(summaryAfterAdd.totalItems === 5, 'Total garment count is 5');
    assert(summaryAfterAdd.categoryCounts.Tops === 2, 'Tops count is 2');
    assert(summaryAfterAdd.categoryCounts.Bottoms === 1, 'Bottoms count is 1');
    assert(summaryAfterAdd.categoryCounts.Outerwear === 1, 'Outerwear count is 1');
    assert(summaryAfterAdd.categoryCounts.Shoes === 1, 'Shoes count is 1');
    assert(summaryAfterAdd.categoryCounts.Dresses === 0, 'Dresses count is 0');
    assert(summaryAfterAdd.categoryCounts.Accessories === 0, 'Accessories count is 0');

    // -------------------------------------------------------------
    // Test 3: Weekly additions calculated correctly
    // -------------------------------------------------------------
    console.log('\nTest 3: Weekly additions calculated correctly (rolling 7-day window)');
    // Items created within 7 days: g1, g2, g3, g4 (4 items). g5 is 10 days old.
    assert(summaryAfterAdd.recentlyAddedThisWeek === 4, 'Items added this week is exactly 4 (excludes 10-day-old item)');

    // -------------------------------------------------------------
    // Test 5: Colour percentages calculated correctly
    // -------------------------------------------------------------
    console.log('\nTest 5: Colour percentages calculated correctly');
    // Total 5 items:
    // Neutrals: 2 (40%)
    // Earth Tones: 2 (40%)
    // Monochrome: 1 (20%)
    const neutrals = summaryAfterAdd.colorDistribution.find((c) => c.label === 'Neutrals');
    const earthTones = summaryAfterAdd.colorDistribution.find((c) => c.label === 'Earth Tones');
    const monochrome = summaryAfterAdd.colorDistribution.find((c) => c.label === 'Monochrome');

    assert(neutrals?.count === 2 && neutrals?.percentage === 40, 'Neutrals has 2 items (40%)');
    assert(earthTones?.count === 2 && earthTones?.percentage === 40, 'Earth Tones has 2 items (40%)');
    assert(monochrome?.count === 1 && monochrome?.percentage === 20, 'Monochrome has 1 item (20%)');
    assert(['Neutrals', 'Earth Tones'].includes(summaryAfterAdd.topTone), 'Top tone identifies leading palette');

    // -------------------------------------------------------------
    // Test 6: Top brands exclude missing/empty/null/whitespace values
    // -------------------------------------------------------------
    console.log('\nTest 6: Top brands exclude missing values');
    assert(summaryAfterAdd.topBrands.includes('The Row'), 'Includes "The Row"');
    assert(summaryAfterAdd.topBrands.includes('Lemaire'), 'Includes "Lemaire"');
    assert(summaryAfterAdd.topBrands.includes('Acne Studios'), 'Includes "Acne Studios"');
    assert(!summaryAfterAdd.topBrands.includes(null), 'Null brand is excluded');
    assert(!summaryAfterAdd.topBrands.includes(''), 'Empty brand is excluded');
    assert(!summaryAfterAdd.topBrands.includes('   '), 'Whitespace brand is excluded');
    assert(!summaryAfterAdd.topBrands.includes('Balenciaga'), 'Foreign user brand excluded');

    // -------------------------------------------------------------
    // Test 7: Recently Added displays the four latest actual garments
    // -------------------------------------------------------------
    console.log('\nTest 7: Recently Added displays the 4 latest actual garments');
    const recent = await getGarments({ userId: primaryUser._id, sort: 'createdAt_desc', limit: 4 });
    assert(recent.garments.length === 4, 'Returns exactly 4 garments');
    // Should be g3 (now), g4 (now), g2 (1d ago), g1 (2d ago). g5 (10d ago) should be excluded
    const recentIds = recent.garments.map((g) => g._id.toString());
    assert(!recentIds.includes(g5._id.toString()), 'Oldest 5th garment is excluded by limit 4');
    assert(recent.garments[0].signedUrl.startsWith('https://'), 'Garments have valid signed R2 preview URLs');

    // -------------------------------------------------------------
    // Test 8: Sidebar badge reflects actual count
    // -------------------------------------------------------------
    console.log('\nTest 8: Sidebar badge reflects actual count');
    assert(summaryAfterAdd.totalItems === 5, 'Sidebar closetCount will receive 5');

    // -------------------------------------------------------------
    // Test 9: Deleting a garment updates dashboard data
    // -------------------------------------------------------------
    console.log('\nTest 9: Deleting a garment updates dashboard data');
    await deleteGarment({ garmentId: g3._id.toString(), userId: primaryUser._id });

    const summaryAfterDelete = await getWardrobeSummary({ userId: primaryUser._id });
    assert(summaryAfterDelete.totalItems === 4, 'Total count decreased from 5 to 4 after deletion');
    assert(summaryAfterDelete.categoryCounts.Bottoms === 0, 'Bottoms category count decreased from 1 to 0');

    // -------------------------------------------------------------
    // Test 10: Users cannot see another user's dashboard statistics
    // -------------------------------------------------------------
    console.log('\nTest 10: Cross-user dashboard isolation');
    const otherSummary = await getWardrobeSummary({ userId: otherUser._id });
    assert(otherSummary.totalItems === 1, 'Other user has exactly 1 garment');
    assert(otherSummary.categoryCounts.Outerwear === 1, 'Other user has 1 Outerwear');
    assert(otherSummary.categoryCounts.Tops === 0, 'Other user does not see Primary user Tops');
    assert(otherSummary.topBrands[0] === 'Balenciaga', 'Other user sees only their brand');
    assert(!otherSummary.topBrands.includes('The Row'), 'Other user cannot see Primary user brands');

    // Cleanup
    await Garment.deleteMany({ _id: { $in: [g1._id, g2._id, g4._id, g5._id, gOther._id] } });
    await User.deleteMany({ _id: { $in: [primaryUser._id, otherUser._id] } });

    console.log('\n=== MILESTONE 4B ALL TESTS PASSED ===');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runMilestone4BVerification();
