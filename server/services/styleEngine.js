/**
 * ClosetBrain Style Intelligence 2.0 - Deterministic Outfit Compatibility Engine
 *
 * Evaluates outfit combinations using deterministic sartorial rules:
 * 1. Color Harmony (30 pts) - 12-sector circular hue wheel, neutral anchors, tonal/complementary/analogous detection
 * 2. Occasion & Formality (25 pts) - Core vs accessory layers, footwear/outerwear suitability, target occasion alignment
 * 3. Garment & Material Compatibility (25 pts) - Pattern density, textile synergy, ethnic wear invariants
 * 4. Seasonal Cohesion (20 pts) - Wildcard All-Season logic, temperature conflict detection, target season fit
 *
 * Total Score: 0 to 100 (Style Compatibility Score).
 * Bounded, explainable, zero-hallucination.
 */

// ============================================================================
// 1. COLOR NORMALIZATION & 12-SECTOR CIRCULAR HUE WHEEL
// ============================================================================

/**
 * 12-sector color wheel mapping (degrees 0 to 330 in 30-degree increments).
 * Key: Lowercase color keyword / synonym.
 * Value: Wheel angle in degrees.
 */
export const HUE_WHEEL_MAP = {
  // 0° - Red
  red: 0,
  crimson: 0,
  ruby: 0,
  burgundy: 0,
  wine: 0,
  maroon: 0,
  scarlet: 0,
  cherry: 0,
  oxblood: 0,

  // 30° - Red-Orange
  'red-orange': 30,
  rust: 30,
  terracotta: 30,
  coral: 30,
  copper: 30,
  cinnamon: 30,
  brick: 30,

  // 60° - Orange
  orange: 60,
  peach: 60,
  apricot: 60,
  tangerine: 60,

  // 90° - Yellow-Orange
  'yellow-orange': 90,
  mustard: 90,
  ochre: 90,
  amber: 90,
  gold: 90,
  honey: 90,
  marigold: 90,

  // 120° - Yellow
  yellow: 120,
  lemon: 120,
  canary: 120,
  butter: 120,

  // 150° - Yellow-Green
  'yellow-green': 150,
  olive: 150,
  chartreuse: 150,
  moss: 150,
  lime: 150,
  'army green': 150,

  // 180° - Green
  green: 180,
  emerald: 180,
  'forest green': 180,
  sage: 180,
  mint: 180,
  pine: 180,
  jade: 180,
  hunter: 180,

  // 210° - Blue-Green
  'blue-green': 210,
  teal: 210,
  cyan: 210,
  turquoise: 210,
  aqua: 210,
  seafoam: 210,

  // 240° - Blue
  blue: 240,
  'sky blue': 240,
  'powder blue': 240,
  cobalt: 240,
  'royal blue': 240,
  cerulean: 240,
  periwinkle: 240,

  // 270° - Blue-Violet
  'blue-violet': 270,
  indigo: 270,
  'slate blue': 270,

  // 300° - Violet / Purple
  violet: 300,
  purple: 300,
  plum: 300,
  lavender: 300,
  lilac: 300,
  mauve: 300,
  eggplant: 300,
  amethyst: 300,

  // 330° - Red-Violet
  'red-violet': 330,
  magenta: 330,
  fuchsia: 330,
  berry: 330,
  raspberry: 330,
  pink: 330,
  rose: 330,
  blush: 330,
};

/**
 * Recognized fashion neutrals & achromatics.
 * Note: Navy functions both as a classic menswear/womenswear neutral and as a 240° blue hue.
 */
export const NEUTRAL_KEYWORDS = new Set([
  'white',
  'off-white',
  'cream',
  'ivory',
  'black',
  'charcoal',
  'grey',
  'gray',
  'slate',
  'silver',
  'beige',
  'tan',
  'taupe',
  'khaki',
  'camel',
  'sand',
  'nude',
  'brown',
  'espresso',
  'chocolate',
  'navy',
  'navy blue',
  'dark navy',
]);

/**
 * Calculates the shortest circular distance between two hue wheel angles (0-360°).
 * Minimum distance is 0°, maximum distance is 180° (exact complement).
 *
 * @param {number} h1
 * @param {number} h2
 * @returns {number} Distance in degrees [0, 180]
 */
export function getCircularHueDistance(h1, h2) {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Normalizes a garment's color input into a structured color classification.
 * Does NOT guess unknown colors as neutral.
 *
 * @param {string} rawColor
 * @param {string} [colorFamily]
 * @returns {{ type: 'neutral' | 'chromatic' | 'unknown', hue?: number, label: string, isNavy?: boolean }}
 */
export function normalizeColor(rawColor, colorFamily) {
  if (!rawColor || typeof rawColor !== 'string' || rawColor.trim().length === 0) {
    return { type: 'unknown', label: 'Unspecified' };
  }

  const clean = rawColor.trim().toLowerCase();

  // 1. Direct neutral check
  if (NEUTRAL_KEYWORDS.has(clean)) {
    const isNavy = clean.includes('navy');
    return {
      type: 'neutral',
      label: rawColor.trim(),
      isNavy,
      hue: isNavy ? 240 : undefined,
    };
  }

  // 2. Exact match in hue wheel
  if (HUE_WHEEL_MAP[clean] !== undefined) {
    return {
      type: 'chromatic',
      hue: HUE_WHEEL_MAP[clean],
      label: rawColor.trim(),
    };
  }

  // 3. Substring / compound keyword matching (e.g. "dark emerald green", "light beige")
  for (const neutral of NEUTRAL_KEYWORDS) {
    if (clean.includes(neutral)) {
      const isNavy = clean.includes('navy');
      return {
        type: 'neutral',
        label: rawColor.trim(),
        isNavy,
        hue: isNavy ? 240 : undefined,
      };
    }
  }

  for (const [kw, hue] of Object.entries(HUE_WHEEL_MAP)) {
    // Check word boundaries
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(clean)) {
      return {
        type: 'chromatic',
        hue,
        label: rawColor.trim(),
      };
    }
  }

  // 4. Color family fallback as a supporting signal (not primary truth)
  if (colorFamily === 'Neutrals' || colorFamily === 'Monochrome') {
    return {
      type: 'neutral',
      label: rawColor.trim(),
      inferredFromFamily: true,
    };
  }

  // 5. Truly unknown color - do not classify as neutral!
  return {
    type: 'unknown',
    label: rawColor.trim(),
  };
}

/**
 * Evaluates the color harmony of an ensemble.
 * Returns score out of 30, reasons, warnings, and uncertainties.
 *
 * @param {Array<object>} garments
 * @returns {{ score: number, maxScore: 30, matchReasons: string[], warnings: string[], uncertainties: string[] }}
 */
export function evaluateColorHarmony(garments) {
  const matchReasons = [];
  const warnings = [];
  const uncertainties = [];

  const analyzedColors = garments.map((g) => ({
    garmentId: g._id?.toString?.() || '',
    name: g.name,
    category: g.category,
    color: normalizeColor(g.primaryColor, g.colorFamily),
  }));

  const neutrals = analyzedColors.filter((c) => c.color.type === 'neutral');
  const chromatics = analyzedColors.filter((c) => c.color.type === 'chromatic');
  const unknowns = analyzedColors.filter((c) => c.color.type === 'unknown');

  // Handle missing/unknown color uncertainty
  if (unknowns.length > 0) {
    uncertainties.push(
      `${unknowns.length} garment(s) have unverified color data (${unknowns.map((u) => u.name).join(', ')}); color harmony score reflects baseline assumptions.`
    );
  }

  // Case 1: Majority unknown colors
  if (unknowns.length > garments.length / 2) {
    return {
      score: 18,
      maxScore: 30,
      matchReasons: ['Neutral baseline awarded for unspecified color palette.'],
      warnings,
      uncertainties,
    };
  }

  // Case 2: All-Neutral or Monochromatic Neutral Ensemble (e.g. Black + White + Charcoal, Cream + Camel)
  if (chromatics.length === 0 && neutrals.length > 0) {
    const hasNavy = neutrals.some((n) => n.color.isNavy);
    const reason = hasNavy
      ? 'Sophisticated neutral palette anchored with deep navy.'
      : 'Clean, timeless neutral palette creating an effortless, refined silhouette.';
    matchReasons.push(reason);

    // If unknowns exist, cap at 26 rather than perfect 30
    const finalScore = unknowns.length > 0 ? 26 : 30;
    return {
      score: finalScore,
      maxScore: 30,
      matchReasons,
      warnings,
      uncertainties,
    };
  }

  // Case 3: Neutral Foundation + Single Accent Color (Classic 60-30-10 rule)
  // e.g. Navy trousers + White shirt + Burgundy jacket/shoes
  const uniqueChromaticHues = Array.from(new Set(chromatics.map((c) => c.color.hue)));

  if (neutrals.length >= 1 && uniqueChromaticHues.length === 1) {
    const accentItem = chromatics[0];
    matchReasons.push(
      `Classic neutral foundation elevated with a tasteful ${accentItem.color.label} focal point.`
    );
    const score = unknowns.length > 0 ? 25 : 28;
    return {
      score,
      maxScore: 30,
      matchReasons,
      warnings,
      uncertainties,
    };
  }

  // Case 4: Monochromatic / Tonal Chromatics (All chromatic items share close hue <= 30°)
  // e.g. Sky Blue top + Royal Blue skirt + White sneakers
  if (uniqueChromaticHues.length >= 2) {
    let maxDistance = 0;
    for (let i = 0; i < uniqueChromaticHues.length; i++) {
      for (let j = i + 1; j < uniqueChromaticHues.length; j++) {
        const d = getCircularHueDistance(uniqueChromaticHues[i], uniqueChromaticHues[j]);
        if (d > maxDistance) maxDistance = d;
      }
    }

    if (maxDistance <= 30) {
      matchReasons.push('Harmonious tonal styling with monochromatic depth in the same color family.');
      const score = unknowns.length > 0 ? 25 : 28;
      return {
        score,
        maxScore: 30,
        matchReasons,
        warnings,
        uncertainties,
      };
    }

    // Case 5: Analogous Color Harmony (Neighboring hues: 31° to 60° distance)
    // e.g. Olive Green (150°) + Mustard (90°) or Forest Green (180°) + Teal (210°)
    if (maxDistance <= 60) {
      matchReasons.push('Naturally cohesive analogous color pairing with smooth hue transitions.');
      const score = unknowns.length > 0 ? 24 : 27;
      return {
        score,
        maxScore: 30,
        matchReasons,
        warnings,
        uncertainties,
      };
    }

    // Case 6: Complementary Color Harmony (Opposite on the wheel: 150° to 180° distance)
    // e.g. Navy/Cobalt (240°) and Rust/Camel (30°-60°); Olive (150°) and Burgundy (0°-330°)
    let hasComplement = false;
    let complementPair = [];
    for (let i = 0; i < uniqueChromaticHues.length; i++) {
      for (let j = i + 1; j < uniqueChromaticHues.length; j++) {
        const d = getCircularHueDistance(uniqueChromaticHues[i], uniqueChromaticHues[j]);
        if (d >= 150 && d <= 180) {
          hasComplement = true;
          complementPair = [chromatics[i].color.label, chromatics[j].color.label];
          break;
        }
      }
      if (hasComplement) break;
    }

    if (hasComplement && uniqueChromaticHues.length === 2) {
      matchReasons.push(
        `Dynamic complementary color contrast pairing ${complementPair[0]} with ${complementPair[1]}.`
      );
      const score = unknowns.length > 0 ? 25 : 28;
      return {
        score,
        maxScore: 30,
        matchReasons,
        warnings,
        uncertainties,
      };
    }

    // Case 7: Triadic or Discordant High Tension (3+ distinct chromatic hues with no harmony link)
    if (uniqueChromaticHues.length >= 3 && neutrals.length === 0) {
      warnings.push('High visual tension: 3 or more competing vibrant hues without a neutral base.');
      return {
        score: 12,
        maxScore: 30,
        matchReasons: ['Eclectic multi-chromatic palette.'],
        warnings,
        uncertainties,
      };
    }
  }

  // Default balanced chromatic mix with neutrals
  if (neutrals.length > 0) {
    matchReasons.push('Balanced color contrast grounded by neutral elements.');
    return {
      score: 22,
      maxScore: 30,
      matchReasons,
      warnings,
      uncertainties,
    };
  }

  return {
    score: 19,
    maxScore: 30,
    matchReasons: ['Contemporary contrast palette.'],
    warnings,
    uncertainties,
  };
}

// ============================================================================
// 2. FORMALITY & OCCASION SUITABILITY
// ============================================================================

export const FORMALITY_LEVELS = {
  Lounge: 1,
  Casual: 2,
  'Smart Casual': 3,
  'Business Casual': 4,
  Formal: 5,
};

/**
 * Evaluates core garment formality separately from footwear, outerwear, and accessories.
 * Avoids penalizing intentional 1-level high-low styling.
 * Flags severe incompatibilities (delta >= 3) with explicit warnings.
 *
 * @param {Array<object>} garments
 * @param {string} [targetOccasion='All']
 * @returns {{ score: number, maxScore: 25, matchReasons: string[], warnings: string[], severeClash: boolean }}
 */
export function evaluateOccasionSuitability(garments, targetOccasion = 'All') {
  const matchReasons = [];
  const warnings = [];
  let severeClash = false;

  // Segregate garments by functional role
  const coreGarments = garments.filter((g) =>
    ['Tops', 'Bottoms', 'Dresses', 'Ethnic Wear'].includes(g.category)
  );
  const footwear = garments.filter((g) => g.category === 'Shoes');
  const outerwear = garments.filter((g) => g.category === 'Outerwear');

  // Helper to extract numeric formality
  const getNumFormality = (g) => FORMALITY_LEVELS[g.formality] || 2; // Default casual if missing

  // 1. Core Garments Formality Spread (Max 12 pts)
  let coreScore = 12;
  if (coreGarments.length > 1) {
    const coreLevels = coreGarments.map(getNumFormality);
    const minCore = Math.min(...coreLevels);
    const maxCore = Math.max(...coreLevels);
    const coreDelta = maxCore - minCore;

    if (coreDelta === 0) {
      coreScore = 12;
      const label = coreGarments[0].formality || 'Balanced';
      matchReasons.push(`Consistent ${label} formality across all core pieces.`);
    } else if (coreDelta === 1) {
      // Intentional high-low styling is celebrated, NOT penalized!
      coreScore = 11;
      matchReasons.push('Controlled high-low styling balancing casual comfort with smart tailoring.');
    } else if (coreDelta === 2) {
      coreScore = 6;
      warnings.push('Moderate formality spread between core top and bottom pieces.');
    } else {
      // coreDelta >= 3 (e.g. Formal tuxedo top with Lounge sweatpants)
      coreScore = 0;
      severeClash = true;
      warnings.push('Severe formality mismatch: Formal and Lounge core garments should not be combined.');
    }
  }

  // 2. Footwear Suitability (Max 7 pts)
  let shoeScore = 7;
  if (footwear.length > 0 && coreGarments.length > 0) {
    const shoeLevel = getNumFormality(footwear[0]);
    const avgCoreLevel =
      coreGarments.reduce((acc, g) => acc + getNumFormality(g), 0) / coreGarments.length;
    const shoeDelta = Math.abs(shoeLevel - avgCoreLevel);

    if (shoeDelta <= 1) {
      shoeScore = 7;
      matchReasons.push('Footwear perfectly anchors the silhouette formality.');
    } else if (shoeDelta <= 2) {
      shoeScore = 4;
    } else {
      shoeScore = 0;
      severeClash = true;
      warnings.push('Footwear formality severely conflicts with the core ensemble.');
    }
  }

  // 3. Outerwear Compatibility (Max 6 pts)
  let outerScore = 6;
  if (outerwear.length > 0 && coreGarments.length > 0) {
    const outerLevel = getNumFormality(outerwear[0]);
    const avgCoreLevel =
      coreGarments.reduce((acc, g) => acc + getNumFormality(g), 0) / coreGarments.length;
    const outerDelta = Math.abs(outerLevel - avgCoreLevel);

    if (outerDelta <= 1) {
      outerScore = 6;
      matchReasons.push('Outerwear layer integrates seamlessly with core formality.');
    } else if (outerDelta <= 2) {
      outerScore = 3;
    } else {
      outerScore = 0;
      severeClash = true;
      warnings.push('Severe formality mismatch: Outerwear significantly conflicts with under-layers.');
    }
  }

  // Also check cross-ensemble max vs min formality (e.g. Formal outerwear + Lounge bottoms)
  const allGarmentLevels = garments.map(getNumFormality);
  if (allGarmentLevels.length > 1) {
    const minEnsemble = Math.min(...allGarmentLevels);
    const maxEnsemble = Math.max(...allGarmentLevels);
    if (maxEnsemble - minEnsemble >= 3) {
      severeClash = true;
      if (!warnings.some((w) => w.toLowerCase().includes('severe formality mismatch'))) {
        warnings.push('Severe formality mismatch: Formal and Lounge items should not be combined.');
      }
    }
  }

  let totalOccasionScore = coreScore + shoeScore + outerScore;
  if (severeClash) {
    totalOccasionScore = Math.min(totalOccasionScore, 6);
  }

  // 4. Target Occasion Alignment Penalty
  if (targetOccasion && targetOccasion !== 'All') {
    const targetLevel = FORMALITY_LEVELS[targetOccasion];
    if (targetLevel) {
      const allLevels = garments.map(getNumFormality);
      const outfitAvg = allLevels.reduce((a, b) => a + b, 0) / allLevels.length;
      const targetDelta = Math.abs(outfitAvg - targetLevel);

      if (targetDelta < 0.75) {
        matchReasons.push(`Impeccably tailored for ${targetOccasion} settings.`);
      } else if (targetDelta <= 1.5) {
        totalOccasionScore = Math.max(0, totalOccasionScore - 3);
        matchReasons.push(`Versatile ensemble adaptable to ${targetOccasion} contexts.`);
      } else {
        totalOccasionScore = Math.max(0, totalOccasionScore - 8);
        const direction = outfitAvg < targetLevel ? 'under-dressed' : 'over-dressed';
        warnings.push(`Outfit may be slightly ${direction} for a ${targetOccasion} occasion.`);
      }
    }
  }

  return {
    score: Math.min(25, Math.max(0, totalOccasionScore)),
    maxScore: 25,
    matchReasons,
    warnings,
    severeClash,
  };
}

// ============================================================================
// 3. GARMENT & MATERIAL COMPATIBILITY
// ============================================================================

export const LOUD_PATTERNS = new Set(['Striped', 'Plaid', 'Check', 'Floral', 'Graphic', 'Other']);

/**
 * Evaluates pattern harmony, material synergies, and ethnic silhouette invariants.
 *
 * @param {Array<object>} garments
 * @returns {{ score: number, maxScore: 25, matchReasons: string[], warnings: string[], uncertainties: string[] }}
 */
export function evaluateGarmentCompatibility(garments) {
  const matchReasons = [];
  const warnings = [];
  const uncertainties = [];

  // A. Pattern Density (Max 8 pts)
  let patternScore = 8;
  const loudGarments = garments.filter((g) => LOUD_PATTERNS.has(g.pattern));

  if (loudGarments.length === 0) {
    patternScore = 8;
    matchReasons.push('Clean solid surfaces create an understated, timeless aesthetic.');
  } else if (loudGarments.length === 1) {
    patternScore = 8;
    matchReasons.push(`Balanced styling with a single ${loudGarments[0].pattern.toLowerCase()} statement focal point.`);
  } else {
    // 2 or more loud prints
    patternScore = 2;
    warnings.push('Multiple competing patterns detected; pairing multiple prints risks visual dissonance.');
  }

  // B. Material Synergy & Weight (Max 9 pts)
  let materialScore = 6; // Neutral uncertainty default
  const knownMaterials = garments
    .map((g) => (typeof g.material === 'string' ? g.material.trim().toLowerCase() : null))
    .filter(Boolean);

  if (knownMaterials.length < 2) {
    uncertainties.push('Fabric materials not fully documented on all items; textile synergy estimated from silhouette.');
    materialScore = 6;
  } else {
    const hasWool = knownMaterials.some((m) => m.includes('wool') || m.includes('cashmere') || m.includes('tweed'));
    const hasLinen = knownMaterials.some((m) => m.includes('linen'));
    const hasSilk = knownMaterials.some((m) => m.includes('silk') || m.includes('satin'));
    const hasDenim = knownMaterials.some((m) => m.includes('denim'));
    const hasCotton = knownMaterials.some((m) => m.includes('cotton'));

    // Severe weight clash: Heavy wool knit with lightweight summer linen
    if (hasWool && hasLinen) {
      materialScore = 2;
      warnings.push('Conflicting fabric weights: Heavy wool and breezy linen have divergent seasonal textures.');
    } else if (hasWool && hasSilk) {
      materialScore = 9;
      matchReasons.push('Luxurious textural contrast between tailored wool and smooth silk.');
    } else if (hasDenim && hasCotton) {
      materialScore = 9;
      matchReasons.push('Reliable, authentic fabric pairing of durable denim and breathable cotton.');
    } else {
      materialScore = 7;
    }
  }

  // C. Ethnic Wear & Silhouette Integrity (Max 8 pts)
  let silhouetteScore = 8;
  const ethnicPieces = garments.filter((g) => g.category === 'Ethnic Wear');

  if (ethnicPieces.length > 0) {
    const completeSet = ethnicPieces.find((g) => g.isCompleteSet);
    if (completeSet) {
      matchReasons.push(`Authentic ${completeSet.subCategory || 'Ethnic Set'} complete ethnic ensemble preserves traditional craftsmanship.`);
      silhouetteScore = 8;
    } else {
      // Standalone separates
      const topSeparates = ethnicPieces.filter((g) => {
        const sub = String(g.subCategory || g.name || '').toLowerCase();
        return (
          !sub.includes('lehenga') &&
          !sub.includes('salwar') &&
          !sub.includes('churidar') &&
          !sub.includes('palazzo') &&
          !sub.includes('skirt') &&
          !sub.includes('pant')
        );
      });
      const bottomPieces = garments.filter((g) => {
        if (g.category === 'Bottoms') return true;
        if (g.category === 'Ethnic Wear') {
          const sub = String(g.subCategory || g.name || '').toLowerCase();
          return (
            sub.includes('lehenga') ||
            sub.includes('salwar') ||
            sub.includes('churidar') ||
            sub.includes('palazzo') ||
            sub.includes('skirt') ||
            sub.includes('pant')
          );
        }
        return false;
      });

      if (topSeparates.length > 0 && bottomPieces.length > 0) {
        const isFusion = bottomPieces.some((b) => b.category === 'Bottoms');
        if (isFusion) {
          matchReasons.push('Contemporary Indo-Western fusion silhouette pairing ethnic tunic with modern tailored bottoms.');
        } else {
          matchReasons.push('Classic ethnic separates pairing honoring traditional proportions.');
        }
        silhouetteScore = 8;
      }
    }
  }

  const totalScore = patternScore + materialScore + silhouetteScore;

  return {
    score: Math.min(25, Math.max(0, totalScore)),
    maxScore: 25,
    matchReasons,
    warnings,
    uncertainties,
  };
}

// ============================================================================
// 4. SEASONAL COHESION & WILDCARD LOGIC
// ============================================================================

export const SPECIFIC_SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

/**
 * Evaluates seasonal alignment treating 'All-Season' strictly as a WILDCARD, not a literal season.
 *
 * Rules:
 * - Winter + All-Season = Winter.
 * - Summer + All-Season = Summer.
 * - Winter + Summer = Direct Conflict.
 * - Missing season = treated as unknown, not auto-incompatible.
 *
 * @param {Array<object>} garments
 * @param {string} [targetSeason='All']
 * @returns {{ score: number, maxScore: 20, matchReasons: string[], warnings: string[], uncertainties: string[] }}
 */
export function evaluateSeasonalCohesion(garments, targetSeason = 'All') {
  const matchReasons = [];
  const warnings = [];
  const uncertainties = [];

  // Helper to get normalized season list
  const getSeasons = (g) => {
    if (!Array.isArray(g.season) || g.season.length === 0) return ['All-Season'];
    return g.season;
  };

  // 1. Intra-Outfit Seasonal Intersection (Max 10 pts)
  let intraScore = 10;
  const specificSeasonGarments = garments
    .map((g) => ({
      name: g.name,
      seasons: getSeasons(g),
      specific: getSeasons(g).filter((s) => SPECIFIC_SEASONS.includes(s)),
    }))
    .filter((item) => item.specific.length > 0);

  if (specificSeasonGarments.length === 0) {
    // All garments are All-Season wildcards
    intraScore = 10;
    matchReasons.push('Year-round versatile ensemble composed of all-season essentials.');
  } else {
    // Find intersection across all garments that specify real seasons
    let currentIntersection = new Set(specificSeasonGarments[0].specific);
    for (let i = 1; i < specificSeasonGarments.length; i++) {
      const nextSet = new Set(specificSeasonGarments[i].specific);
      const intersection = new Set([...currentIntersection].filter((x) => nextSet.has(x)));
      currentIntersection = intersection;
    }

    if (currentIntersection.size > 0) {
      intraScore = 10;
      const common = Array.from(currentIntersection).join(' / ');
      matchReasons.push(`Harmonious seasonal cohesion aligned for ${common} weather.`);
    } else {
      // Empty intersection between specific seasons -> Direct conflict!
      intraScore = 2;
      warnings.push('Seasonal conflict: Pairing distinct single-season garments (e.g. Summer and Winter pieces).');
    }
  }

  // 2. Target Season Fit (Max 10 pts)
  let targetScore = 10;
  if (targetSeason && targetSeason !== 'All' && SPECIFIC_SEASONS.includes(targetSeason)) {
    const incompatible = garments.filter((g) => {
      const seasons = getSeasons(g);
      // Compatible if contains targetSeason OR 'All-Season' wildcard
      return !seasons.includes(targetSeason) && !seasons.includes('All-Season');
    });

    if (incompatible.length === 0) {
      targetScore = 10;
      matchReasons.push(`Every piece is curated to thrive in ${targetSeason} climate.`);
    } else if (incompatible.length === 1) {
      targetScore = 6;
      warnings.push(`${incompatible[0].name} may require layering adjustments for ${targetSeason}.`);
    } else {
      targetScore = 2;
      warnings.push(`Multiple garments are not optimized for ${targetSeason} wear.`);
    }
  }

  const totalScore = intraScore + targetScore;

  return {
    score: Math.min(20, Math.max(0, totalScore)),
    maxScore: 20,
    matchReasons,
    warnings,
    uncertainties,
  };
}

// ============================================================================
// 5. MASTER OUTFIT COMPATIBILITY EVALUATOR
// ============================================================================

/**
 * Returns the qualitative Style Compatibility Score tier.
 * Boundary definitions:
 * - Exceptional: 85–100
 * - Strong: 70–84
 * - Acceptable: 50–69
 * - Incompatible: 0–49
 *
 * @param {number} score
 * @returns {'Exceptional' | 'Strong' | 'Acceptable' | 'Incompatible'}
 */
export function getScoreTier(score) {
  const bounded = Math.min(100, Math.max(0, Math.round(score)));
  if (bounded >= 85) return 'Exceptional';
  if (bounded >= 70) return 'Strong';
  if (bounded >= 50) return 'Acceptable';
  return 'Incompatible';
}

/**
 * Master evaluation function calculating the deterministic Style Compatibility Score (0 - 100).
 *
 * @param {Array<object>} garments - Validated garment documents for an outfit
 * @param {object} [context={}]
 * @param {string} [context.occasion='All']
 * @param {string} [context.season='All']
 * @returns {object} Full explainable breakdown
 */
export function evaluateOutfitCompatibility(garments, context = {}) {
  if (!Array.isArray(garments) || garments.length === 0) {
    return {
      score: 0,
      tier: 'Incompatible',
      passedThreshold: false,
      breakdown: {
        colorHarmony: { score: 0, maxScore: 30, label: 'Color Harmony' },
        occasionSuitability: { score: 0, maxScore: 25, label: 'Occasion Suitability' },
        garmentCompatibility: { score: 0, maxScore: 25, label: 'Garment Compatibility' },
        seasonCohesion: { score: 0, maxScore: 20, label: 'Seasonal Cohesion' },
      },
      matchReasons: [],
      warnings: ['No garments provided for evaluation.'],
      uncertainties: [],
    };
  }

  const targetOccasion = context.occasion || 'All';
  const targetSeason = context.season || 'All';

  // Run deterministic sub-engines
  const colorRes = evaluateColorHarmony(garments);
  const occasionRes = evaluateOccasionSuitability(garments, targetOccasion);
  const garmentRes = evaluateGarmentCompatibility(garments);
  const seasonRes = evaluateSeasonalCohesion(garments, targetSeason);

  // Exact arithmetic sum bounded strictly between 0 and 100
  const rawSum = colorRes.score + occasionRes.score + garmentRes.score + seasonRes.score;
  const totalScore = Math.min(100, Math.max(0, rawSum));

  // Deduplicate and aggregate reasons, warnings, and uncertainties
  const matchReasons = Array.from(
    new Set([...colorRes.matchReasons, ...occasionRes.matchReasons, ...garmentRes.matchReasons, ...seasonRes.matchReasons])
  );
  const warnings = Array.from(
    new Set([...colorRes.warnings, ...occasionRes.warnings, ...garmentRes.warnings, ...seasonRes.warnings])
  );
  const uncertainties = Array.from(
    new Set([...colorRes.uncertainties, ...garmentRes.uncertainties, ...seasonRes.uncertainties])
  );

  // Determine qualitative tier consistent with boundary definitions:
  // - Exceptional: 85–100
  // - Strong: 70–84
  // - Acceptable: 50–69
  // - Incompatible: 0–49
  const tier = getScoreTier(totalScore);

  // Rejection threshold consistent with tiers:
  // Reject recommendations scoring below 50 (< Acceptable),
  // while preserving the severe formality clash rejection regardless of score.
  const passedThreshold = totalScore >= 50 && !occasionRes.severeClash;

  return {
    score: totalScore,
    tier,
    passedThreshold,
    breakdown: {
      colorHarmony: { score: colorRes.score, maxScore: colorRes.maxScore, label: 'Color Harmony' },
      occasionSuitability: { score: occasionRes.score, maxScore: occasionRes.maxScore, label: 'Occasion Suitability' },
      garmentCompatibility: { score: garmentRes.score, maxScore: garmentRes.maxScore, label: 'Garment Compatibility' },
      seasonCohesion: { score: seasonRes.score, maxScore: seasonRes.maxScore, label: 'Seasonal Cohesion' },
    },
    matchReasons,
    warnings,
    uncertainties,
  };
}

export default {
  HUE_WHEEL_MAP,
  NEUTRAL_KEYWORDS,
  getCircularHueDistance,
  normalizeColor,
  evaluateColorHarmony,
  evaluateOccasionSuitability,
  evaluateGarmentCompatibility,
  evaluateSeasonalCohesion,
  getScoreTier,
  evaluateOutfitCompatibility,
};
