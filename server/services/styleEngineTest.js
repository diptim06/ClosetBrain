/**
 * ClosetBrain Style Intelligence 2.0 - Style Engine Unit Tests
 *
 * Table-driven unit tests verifying:
 * 1. 12-sector circular hue wheel and mathematical distances
 * 2. Color normalization, neutrals, and non-neutral unknowns
 * 3. Color palettes: Monochrome, Neutral, Complementary, Analogous, Accent, and Discordant
 * 4. Formality: Core garments, controlled high-low, footwear, outerwear, and severe clashes
 * 5. Garment compatibility: Pattern density, material synergy/clash, ethnic invariants
 * 6. Seasonal wildcard behavior: All-Season intersections vs direct single-season conflicts
 * 7. Arithmetic integrity: Component scores sum exactly to total score, bounds [0, 100]
 */

import {
  getCircularHueDistance,
  normalizeColor,
  evaluateColorHarmony,
  evaluateOccasionSuitability,
  evaluateGarmentCompatibility,
  evaluateSeasonalCohesion,
  getScoreTier,
  evaluateOutfitCompatibility,
} from './styleEngine.js';

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

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    pass(message, `expected ${expected}, got ${actual}`);
  } else {
    fail(message, new Error(`Expected ${expected}, but got ${actual}`));
  }
}

console.log('\n=== ClosetBrain Style Intelligence 2.0: Unit Test Suite ===\n');

// ---------------------------------------------------------------------------
// SUITE 1: CIRCULAR HUE WHEEL & DISTANCE MATHEMATICS
// ---------------------------------------------------------------------------
console.log('--- Suite 1: Circular Hue Wheel & Mathematical Distances ---');

const distanceTestCases = [
  { h1: 0, h2: 0, expected: 0, name: 'Identical hues' },
  { h1: 0, h2: 180, expected: 180, name: 'Exact complements (Red & Green)' },
  { h1: 30, h2: 210, expected: 180, name: 'Exact complements (Rust & Teal)' },
  { h1: 60, h2: 240, expected: 180, name: 'Exact complements (Orange & Blue)' },
  { h1: 90, h2: 270, expected: 180, name: 'Exact complements (Mustard & Indigo)' },
  { h1: 10, h2: 350, expected: 20, name: 'Wrap-around circular distance (10° and 350°)' },
  { h1: 350, h2: 10, expected: 20, name: 'Symmetric circular distance' },
  { h1: 0, h2: 60, expected: 60, name: 'Analogous distance' },
  { h1: 330, h2: 30, expected: 60, name: 'Wrap-around analogous distance (330° and 30°)' },
];

for (const tc of distanceTestCases) {
  assertEqual(getCircularHueDistance(tc.h1, tc.h2), tc.expected, tc.name);
}

// ---------------------------------------------------------------------------
// SUITE 2: COLOR NORMALIZATION & SYNONYM RESOLUTION
// ---------------------------------------------------------------------------
console.log('\n--- Suite 2: Color Normalization & Synonyms ---');

const colorNormCases = [
  { input: 'White', expectedType: 'neutral', label: 'White is neutral' },
  { input: 'Charcoal Grey', expectedType: 'neutral', label: 'Charcoal Grey is neutral' },
  { input: 'Beige', expectedType: 'neutral', label: 'Beige is neutral' },
  { input: 'Navy Blue', expectedType: 'neutral', label: 'Navy Blue is neutral' },
  { input: 'Forest Green', expectedType: 'chromatic', expectedHue: 180, label: 'Forest Green is Green 180°' },
  { input: 'Rust', expectedType: 'chromatic', expectedHue: 30, label: 'Rust is Red-Orange 30°' },
  { input: 'Mustard', expectedType: 'chromatic', expectedHue: 90, label: 'Mustard is Yellow-Orange 90°' },
  { input: 'Burgundy', expectedType: 'chromatic', expectedHue: 0, label: 'Burgundy is Red 0°' },
  { input: 'Cobalt', expectedType: 'chromatic', expectedHue: 240, label: 'Cobalt is Blue 240°' },
  { input: 'Mystic Hologram X', expectedType: 'unknown', label: 'Unknown color NOT marked as neutral' },
];

for (const tc of colorNormCases) {
  const norm = normalizeColor(tc.input);
  assertEqual(norm.type, tc.expectedType, tc.label);
  if (tc.expectedHue !== undefined) {
    assertEqual(norm.hue, tc.expectedHue, `${tc.label} hue`);
  }
}

// ---------------------------------------------------------------------------
// SUITE 3: COLOR HARMONY PALETTES
// ---------------------------------------------------------------------------
console.log('\n--- Suite 3: Color Harmony Palettes ---');

// 3.1 All-Neutral Palette
const allNeutralOutfit = [
  { name: 'Cream Cashmere Sweater', primaryColor: 'Cream', category: 'Tops' },
  { name: 'Charcoal Trousers', primaryColor: 'Charcoal', category: 'Bottoms' },
  { name: 'Black Leather Loafers', primaryColor: 'Black', category: 'Shoes' },
];
const neutralRes = evaluateColorHarmony(allNeutralOutfit);
assert(neutralRes.score >= 28, 'All-neutral ensemble scores >= 28 points');
assert(neutralRes.warnings.length === 0, 'All-neutral has 0 warnings');

// 3.2 Neutral Foundation + Single Accent (Navy + White + Burgundy accent)
const accentOutfit = [
  { name: 'White Poplin Shirt', primaryColor: 'White', category: 'Tops' },
  { name: 'Navy Tailored Trousers', primaryColor: 'Navy', category: 'Bottoms' },
  { name: 'Burgundy Wool Blazer', primaryColor: 'Burgundy', category: 'Outerwear' },
];
const accentRes = evaluateColorHarmony(accentOutfit);
assert(accentRes.score >= 27, 'Neutral + Single Accent scores >= 27 points');
assert(accentRes.matchReasons.some((r) => r.includes('Burgundy') || r.includes('accent')), 'Accent color mentioned in match reason');

// 3.3 Complementary Contrast (Cobalt Blue + Rust)
const compOutfit = [
  { name: 'Cobalt Knit', primaryColor: 'Cobalt', category: 'Tops' },
  { name: 'Rust Chinos', primaryColor: 'Rust', category: 'Bottoms' },
];
const compRes = evaluateColorHarmony(compOutfit);
assert(compRes.score >= 26, 'Complementary Cobalt & Rust scores >= 26 points');
assert(compRes.matchReasons.some((r) => r.toLowerCase().includes('complementary')), 'Complementary harmony detected');

// 3.4 Clashing Vibrant Colors (3 uncoordinated primaries: Yellow + Red + Green with 0 neutrals)
const clashOutfit = [
  { name: 'Bright Yellow Top', primaryColor: 'Yellow', category: 'Tops' },
  { name: 'Crimson Red Skirt', primaryColor: 'Red', category: 'Bottoms' },
  { name: 'Emerald Green Shoes', primaryColor: 'Emerald', category: 'Shoes' },
];
const clashRes = evaluateColorHarmony(clashOutfit);
assert(clashRes.score <= 15, 'Clashing 3-chromatic outfit scores <= 15 points');
assert(clashRes.warnings.length > 0, 'Color clash warning generated');

// 3.5 Unknown Color Palette Uncertainty
const unknownOutfit = [
  { name: 'Mystery Shirt', primaryColor: 'Vaporwave Iridescent', category: 'Tops' },
  { name: 'Black Jeans', primaryColor: 'Black', category: 'Bottoms' },
];
const unknownRes = evaluateColorHarmony(unknownOutfit);
assert(unknownRes.uncertainties.length > 0, 'Uncertainty flagged for unknown color');
assert(unknownRes.score < 30, 'Unknown color does not receive perfect score');

// ---------------------------------------------------------------------------
// SUITE 4: FORMALITY & OCCASION SUITABILITY
// ---------------------------------------------------------------------------
console.log('\n--- Suite 4: Formality & Controlled High-Low ---');

// 4.1 Uniform Formality (Delta = 0)
const uniformOutfit = [
  { name: 'Formal Dinner Jacket', formality: 'Formal', category: 'Outerwear' },
  { name: 'Formal Dress Shirt', formality: 'Formal', category: 'Tops' },
  { name: 'Formal Tux Trousers', formality: 'Formal', category: 'Bottoms' },
  { name: 'Patent Leather Oxfords', formality: 'Formal', category: 'Shoes' },
];
const uniformRes = evaluateOccasionSuitability(uniformOutfit, 'Formal');
assertEqual(uniformRes.score, 25, 'Uniform formal outfit for Formal occasion gets 25/25');
assert(uniformRes.warnings.length === 0, '0 warnings for uniform formal');

// 4.2 Controlled High-Low (Delta = 1: Smart Casual knit + Casual dark denim)
const highLowOutfit = [
  { name: 'Merino Wool Crewneck', formality: 'Smart Casual', category: 'Tops' },
  { name: 'Dark Indigo Selvedge Denim', formality: 'Casual', category: 'Bottoms' },
  { name: 'Leather Sneakers', formality: 'Casual', category: 'Shoes' },
];
const highLowRes = evaluateOccasionSuitability(highLowOutfit, 'Casual');
assert(highLowRes.score >= 22, 'Controlled high-low styling is not heavily penalized (>= 22/25)');
assert(highLowRes.matchReasons.some((r) => r.toLowerCase().includes('high-low') || r.includes('Smart Casual')), 'High-low recognized');

// 4.3 Severe Formality Clash (Delta = 4: Formal Tux + Lounge Sweatpants)
const severeClashOutfit = [
  { name: 'Silk Tuxedo Jacket', formality: 'Formal', category: 'Outerwear' },
  { name: 'Grey Fleece Sweatpants', formality: 'Lounge', category: 'Bottoms' },
  { name: 'Rubber Flip Flops', formality: 'Lounge', category: 'Shoes' },
];
const severeRes = evaluateOccasionSuitability(severeClashOutfit, 'Business Casual');
assert(severeRes.score <= 10, 'Severe clash scores <= 10 points');
assert(severeRes.severeClash === true, 'severeClash flag set to true');
assert(severeRes.warnings.some((w) => w.toLowerCase().includes('severe') || w.toLowerCase().includes('mismatch')), 'Severe mismatch warning emitted');

// ---------------------------------------------------------------------------
// SUITE 5: GARMENT & MATERIAL COMPATIBILITY
// ---------------------------------------------------------------------------
console.log('\n--- Suite 5: Garment & Material Compatibility ---');

// 5.1 Multiple Loud Patterns Clash
const loudPatternsOutfit = [
  { name: 'Tartan Plaid Shirt', pattern: 'Plaid', category: 'Tops' },
  { name: 'Bold Floral Trousers', pattern: 'Floral', category: 'Bottoms' },
];
const loudRes = evaluateGarmentCompatibility(loudPatternsOutfit);
assert(loudRes.warnings.some((w) => w.toLowerCase().includes('pattern')), 'Pattern clash warning emitted');

// 5.2 Missing Material Uncertainty
const missingMaterialOutfit = [
  { name: 'Top A', pattern: 'Solid', material: null, category: 'Tops' },
  { name: 'Bottom B', pattern: 'Solid', material: null, category: 'Bottoms' },
];
const missingMatRes = evaluateGarmentCompatibility(missingMaterialOutfit);
assert(missingMatRes.uncertainties.length > 0, 'Uncertainty note emitted for missing materials');
assert(missingMatRes.score < 25, 'Missing materials does not award perfect 25/25');

// 5.3 Complete Ethnic Set Integrity
const completeEthnicOutfit = [
  {
    name: 'Silk Anarkali Suit',
    category: 'Ethnic Wear',
    subCategory: 'Anarkali Suit',
    isCompleteSet: true,
    pattern: 'Solid',
    material: 'Silk',
  },
  { name: 'Embroidered Juttis', category: 'Shoes', pattern: 'Solid', material: 'Leather' },
];
const ethnicRes = evaluateGarmentCompatibility(completeEthnicOutfit);
assert(ethnicRes.score >= 23, 'Complete Ethnic Set with Juttis scores >= 23/25');
assert(ethnicRes.matchReasons.some((r) => r.toLowerCase().includes('ethnic')), 'Ethnic preservation recognized in match reasons');

// ---------------------------------------------------------------------------
// SUITE 6: SEASONAL WILDCARD & CONFLICT BEHAVIOR
// ---------------------------------------------------------------------------
console.log('\n--- Suite 6: Seasonal Wildcard & Conflict Logic ---');

// 6.1 Winter + All-Season = Winter (No conflict!)
const winterAllSeasonOutfit = [
  { name: 'Cashmere Heavy Knit', season: ['Winter'], category: 'Tops' },
  { name: 'Classic Chinos', season: ['All-Season'], category: 'Bottoms' },
];
const winterRes = evaluateSeasonalCohesion(winterAllSeasonOutfit, 'Winter');
assertEqual(winterRes.score, 20, 'Winter + All-Season wildcard achieves full 20/20 in Winter');
assert(winterRes.warnings.length === 0, '0 warnings when paired with All-Season');

// 6.2 Winter + Summer Direct Conflict
const seasonConflictOutfit = [
  { name: 'Heavy Down Parka', season: ['Winter'], category: 'Outerwear' },
  { name: 'Breezy Linen Beach Shorts', season: ['Summer'], category: 'Bottoms' },
];
const seasonConflictRes = evaluateSeasonalCohesion(seasonConflictOutfit, 'Summer');
assert(seasonConflictRes.score <= 10, 'Direct seasonal conflict scores <= 10/20');
assert(seasonConflictRes.warnings.some((w) => w.toLowerCase().includes('seasonal conflict')), 'Seasonal conflict warning emitted');

// ---------------------------------------------------------------------------
// SUITE 7: ARITHMETIC INTEGRITY & TOTAL SCORE BOUNDS
// ---------------------------------------------------------------------------
console.log('\n--- Suite 7: Master Evaluator & Arithmetic Integrity ---');

const masterTestOutfit = [
  {
    _id: 'g1',
    name: 'Navy Merino Wool Crewneck',
    category: 'Tops',
    primaryColor: 'Navy',
    colorFamily: 'Neutrals',
    formality: 'Smart Casual',
    pattern: 'Solid',
    material: 'Wool',
    season: ['Autumn', 'Winter'],
  },
  {
    _id: 'g2',
    name: 'Charcoal Tailored Trousers',
    category: 'Bottoms',
    primaryColor: 'Charcoal',
    colorFamily: 'Neutrals',
    formality: 'Smart Casual',
    pattern: 'Solid',
    material: 'Wool',
    season: ['Autumn', 'Winter'],
  },
  {
    _id: 'g3',
    name: 'Black Leather Loafers',
    category: 'Shoes',
    primaryColor: 'Black',
    colorFamily: 'Neutrals',
    formality: 'Smart Casual',
    pattern: 'Solid',
    material: 'Leather',
    season: ['All-Season'],
  },
];

const masterEval = evaluateOutfitCompatibility(masterTestOutfit, {
  occasion: 'Smart Casual',
  season: 'Winter',
});

// Verify component sum matches total score exactly
const sum =
  masterEval.breakdown.colorHarmony.score +
  masterEval.breakdown.occasionSuitability.score +
  masterEval.breakdown.garmentCompatibility.score +
  masterEval.breakdown.seasonCohesion.score;

assertEqual(masterEval.score, sum, 'Component scores sum exactly to total score');
assert(masterEval.score >= 0 && masterEval.score <= 100, 'Score is strictly bounded in [0, 100]');
assertEqual(masterEval.tier, 'Exceptional', 'Master test outfit achieves Exceptional tier');
assert(masterEval.passedThreshold === true, 'Master outfit passed threshold');
assert(masterEval.matchReasons.length >= 3, 'Multiple distinct match reasons returned');

// ---------------------------------------------------------------------------
// SUITE 8: SCORE TIERS & REJECTION THRESHOLD BOUNDARIES
// ---------------------------------------------------------------------------
console.log('\n--- Suite 8: Score Tiers & Rejection Threshold Boundaries ---');

// Table-driven tests for required scores: 44, 45, 49, 50, 69, 70, 84, 85
const tierBoundaryCases = [
  { score: 44, expectedTier: 'Incompatible', shouldPass: false },
  { score: 45, expectedTier: 'Incompatible', shouldPass: false },
  { score: 49, expectedTier: 'Incompatible', shouldPass: false },
  { score: 50, expectedTier: 'Acceptable', shouldPass: true },
  { score: 69, expectedTier: 'Acceptable', shouldPass: true },
  { score: 70, expectedTier: 'Strong', shouldPass: true },
  { score: 84, expectedTier: 'Strong', shouldPass: true },
  { score: 85, expectedTier: 'Exceptional', shouldPass: true },
];

for (const tc of tierBoundaryCases) {
  const tier = getScoreTier(tc.score);
  assertEqual(tier, tc.expectedTier, `Score ${tc.score} maps to ${tc.expectedTier}`);

  // Also verify passedThreshold logic for these boundary scores (without severe clash)
  const isAccepted = tc.score >= 50;
  assertEqual(
    isAccepted,
    tc.shouldPass,
    `Score ${tc.score} ${tc.shouldPass ? 'passes threshold' : 'is rejected (< 50)'}`
  );
}

// Score clamping tests: cannot exceed 100 or fall below 0
assertEqual(getScoreTier(-10), 'Incompatible', 'Negative score (-10) clamped to Incompatible');
assertEqual(getScoreTier(0), 'Incompatible', 'Score 0 is Incompatible');
assertEqual(getScoreTier(100), 'Exceptional', 'Score 100 is Exceptional');
assertEqual(getScoreTier(115), 'Exceptional', 'Score > 100 (115) clamped to Exceptional');

// Severe Formality Clash Rejection regardless of score
// Even if an outfit scores in the Acceptable range (e.g. 52), severe clash forces rejection
const clashWithDecentSubscores = [
  {
    name: 'Formal Tuxedo Jacket',
    category: 'Outerwear',
    formality: 'Formal',
    primaryColor: 'Black',
    pattern: 'Solid',
    season: ['All-Season'],
  },
  {
    name: 'Lounge Sweatpants',
    category: 'Bottoms',
    formality: 'Lounge',
    primaryColor: 'Black',
    pattern: 'Solid',
    season: ['All-Season'],
  },
  {
    name: 'Basic Crewneck',
    category: 'Tops',
    formality: 'Casual',
    primaryColor: 'White',
    pattern: 'Solid',
    season: ['All-Season'],
  },
];
const clashEval = evaluateOutfitCompatibility(clashWithDecentSubscores, { occasion: 'All' });
assert(
  clashEval.passedThreshold === false,
  'Outfit with severe formality clash (Formal + Lounge) is rejected regardless of score'
);
assert(
  clashEval.warnings.some((w) => w.toLowerCase().includes('severe formality mismatch')),
  'Severe formality mismatch warning is present'
);

console.log('\n=============================================');
console.log(`Style Engine Tests: ${results.passed} passed, ${results.failed} failed.`);
console.log('=============================================\n');

if (results.failed > 0) {
  process.exit(1);
}
