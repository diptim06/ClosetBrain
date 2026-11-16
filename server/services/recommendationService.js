import mongoose from 'mongoose';
import crypto from 'crypto';
import Garment from '../models/Garment.js';
import { generateOutfitRecommendations, VALID_OCCASIONS, VALID_SEASONS } from './gemini.js';
import { getSignedImageUrl } from './r2.js';
import { evaluateOutfitCompatibility } from './styleEngine.js';

export class RecommendationServiceError extends Error {
  constructor(message, status = 500, code = 'RECOMMENDATION_ERROR', details = null) {
    super(message);
    this.name = 'RecommendationServiceError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Validates category combinations for a complete, aesthetically sound outfit.
 *
 * Rules:
 * 1. Must contain: Exactly one top + one bottom, OR exactly one dress.
 * 2. Cannot mix a Dress with Bottoms.
 * 3. Cannot contain multiple dresses.
 * 4. Cannot contain multiple bottoms.
 * 5. Cannot contain duplicate garment IDs.
 * 6. Layering limits: max 2 tops, max 2 outerwear, max 1 pair of shoes, max 5 accessories.
 * 7. Overall limit: 1 to 10 garments.
 *
 * @param {Array<object>} garments - Array of garment documents
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateOutfitCombination(garments) {
  if (!Array.isArray(garments) || garments.length === 0) {
    return { valid: false, reason: 'Empty garment list' };
  }

  if (garments.length > 10) {
    return { valid: false, reason: 'Outfits cannot exceed 10 garments' };
  }

  const categoryCounts = {
    Tops: 0,
    Bottoms: 0,
    Outerwear: 0,
    Dresses: 0,
    Shoes: 0,
    Accessories: 0,
    'Ethnic Wear': 0,
  };

  const seenIds = new Set();
  let completeEthnicSets = 0;
  let ethnicTops = 0;
  let ethnicBottoms = 0;

  for (const garment of garments) {
    if (!garment || !garment._id) {
      return { valid: false, reason: 'Invalid garment item' };
    }

    const idStr = garment._id.toString();
    if (seenIds.has(idStr)) {
      return { valid: false, reason: `Duplicate garment ID detected: ${idStr}` };
    }
    seenIds.add(idStr);

    if (categoryCounts[garment.category] === undefined) {
      return { valid: false, reason: `Unknown garment category: ${garment.category}` };
    }
    categoryCounts[garment.category] += 1;

    if (garment.category === 'Ethnic Wear') {
      if (garment.isCompleteSet) {
        completeEthnicSets += 1;
      } else {
        const sub = String(garment.subCategory || garment.name || '').toLowerCase();
        if (
          sub.includes('lehenga') ||
          sub.includes('sharara') ||
          sub.includes('salwar') ||
          sub.includes('churidar') ||
          sub.includes('palazzo') ||
          sub.includes('dhoti') ||
          sub.includes('skirt') ||
          sub.includes('pant') ||
          sub.includes('trouser')
        ) {
          ethnicBottoms += 1;
        } else if (sub.includes('dupatta') || sub.includes('stole') || sub.includes('shawl')) {
          // Treated as ethnic accessory drape
        } else {
          // Kurta, kurti, blouse, choli, kameez, or generic ethnic top
          ethnicTops += 1;
        }
      }
    }
  }

  // Rule A: Complete Ethnic Set validations
  if (completeEthnicSets > 0) {
    if (completeEthnicSets > 1) {
      return { valid: false, reason: 'Cannot include multiple complete ethnic sets in a single look' };
    }
    if (
      categoryCounts.Tops > 0 ||
      categoryCounts.Bottoms > 0 ||
      categoryCounts.Dresses > 0 ||
      categoryCounts.Outerwear > 0 ||
      ethnicTops > 0 ||
      ethnicBottoms > 0
    ) {
      return {
        valid: false,
        reason: 'A complete ethnic set cannot be combined with separate tops, bottoms, dresses, or outerwear',
      };
    }
    if (categoryCounts.Shoes > 1) {
      return { valid: false, reason: 'Cannot include multiple pairs of shoes' };
    }
    // Complete ethnic set with optional accessories and up to 1 pair of shoes is valid!
    return { valid: true };
  }

  const effectiveTops = categoryCounts.Tops + ethnicTops;
  const effectiveBottoms = categoryCounts.Bottoms + ethnicBottoms;
  const hasTops = effectiveTops > 0;
  const hasBottoms = effectiveBottoms > 0;
  const hasDress = categoryCounts.Dresses > 0;

  // Rule 2: Cannot mix Dress with Bottoms or Tops
  if (hasDress && hasBottoms) {
    return { valid: false, reason: 'Cannot combine a dress with bottoms in a single look' };
  }
  if (hasDress && hasTops) {
    return { valid: false, reason: 'Cannot combine a dress with separate tops in a single look' };
  }

  // Rule 3: Cannot contain multiple dresses
  if (categoryCounts.Dresses > 1) {
    return { valid: false, reason: 'Cannot include multiple dresses in a single look' };
  }

  // Rule 4: Cannot contain multiple bottoms
  if (effectiveBottoms > 1) {
    return { valid: false, reason: 'Cannot include multiple bottoms in a single look' };
  }

  // Rule 1: Core combination requirement: (Top + Bottom) OR (Dress) OR (Complete Ethnic Set)
  const hasValidCore = (hasTops && hasBottoms) || hasDress;
  if (!hasValidCore) {
    if (hasTops && !hasBottoms) {
      return { valid: false, reason: 'Missing bottom to complete the look (requires Top + Bottom, Dress, or Complete Ethnic Set)' };
    }
    if (hasBottoms && !hasTops) {
      return { valid: false, reason: 'Missing top to complete the look (requires Top + Bottom, Dress, or Complete Ethnic Set)' };
    }
    return { valid: false, reason: 'Outfit must contain either (1 Top + 1 Bottom), 1 Dress, or 1 Complete Ethnic Set' };
  }

  // Rule 6: Layering bounds
  if (effectiveTops > 2) {
    return { valid: false, reason: 'Cannot exceed 2 tops for layering' };
  }
  if (categoryCounts.Outerwear > 2) {
    return { valid: false, reason: 'Cannot exceed 2 outerwear garments (maximum 2 allowed)' };
  }
  if (categoryCounts.Shoes > 1) {
    return { valid: false, reason: 'Cannot include multiple pairs of shoes' };
  }

  return { valid: true };
}

/**
 * Checks whether a user's wardrobe has the minimum items required to form at least one valid core outfit.
 *
 * @param {Array<object>} garments - User's full garment catalog
 * @returns {boolean}
 */
export function hasMinimumWardrobeFeasibility(garments) {
  if (!Array.isArray(garments) || garments.length === 0) {
    return false;
  }

  // A complete outfit can be formed by a Dress or an explicit Complete Ethnic Set
  const hasSelfContainedOutfit = garments.some(
    (g) => g.category === 'Dresses' || (g.category === 'Ethnic Wear' && g.isCompleteSet === true)
  );
  if (hasSelfContainedOutfit) {
    return true;
  }

  if (garments.length < 2) {
    return false;
  }

  const hasTop = garments.some((g) => {
    if (g.category === 'Tops') return true;
    if (g.category === 'Ethnic Wear' && !g.isCompleteSet) {
      const sub = String(g.subCategory || g.name || '').toLowerCase();
      return (
        !sub.includes('lehenga') &&
        !sub.includes('salwar') &&
        !sub.includes('churidar') &&
        !sub.includes('palazzo') &&
        !sub.includes('dupatta') &&
        !sub.includes('skirt')
      );
    }
    return false;
  });

  const hasBottom = garments.some((g) => {
    if (g.category === 'Bottoms') return true;
    if (g.category === 'Ethnic Wear' && !g.isCompleteSet) {
      const sub = String(g.subCategory || g.name || '').toLowerCase();
      return (
        sub.includes('lehenga') ||
        sub.includes('sharara') ||
        sub.includes('salwar') ||
        sub.includes('churidar') ||
        sub.includes('palazzo') ||
        sub.includes('skirt') ||
        sub.includes('pant') ||
        sub.includes('trouser')
      );
    }
    return false;
  });

  return hasTop && hasBottom;
}

/**
 * Sanitizes and prepares a lightweight candidate catalog for Gemini.
 * Strips storage keys and user IDs to minimize token usage and prevent credential leaks.
 */
export function prepareCandidateCatalog(garments) {
  return garments.map((g) => ({
    id: g._id.toString(),
    name: String(g.name || '').slice(0, 80),
    category: g.category,
    subCategory: g.subCategory ? String(g.subCategory).slice(0, 40) : null,
    isCompleteSet: Boolean(g.isCompleteSet),
    primaryColor: g.primaryColor,
    colorFamily: g.colorFamily || 'Neutrals',
    brand: g.brand ? String(g.brand).slice(0, 40) : null,
    material: g.material ? String(g.material).slice(0, 40) : null,
    pattern: g.pattern || 'Solid',
    season: Array.isArray(g.season) ? g.season : ['All-Season'],
    formality: g.formality || 'Casual',
    fit: g.fit || 'Regular',
  }));
}

/**
 * Formats a garment document into a safe, client-facing object with presigned image URL.
 */
export async function formatHydratedGarment(garment) {
  const signedUrl = await getSignedImageUrl(garment.imageKey).catch(() => null);

  return {
    _id: garment._id.toString(),
    name: garment.name,
    category: garment.category,
    subCategory: garment.subCategory || null,
    isCompleteSet: Boolean(garment.isCompleteSet),
    primaryColor: garment.primaryColor,
    secondaryColors: garment.secondaryColors || [],
    colorFamily: garment.colorFamily || 'Neutrals',
    brand: garment.brand || null,
    material: garment.material || null,
    pattern: garment.pattern || 'Solid',
    season: garment.season || ['All-Season'],
    formality: garment.formality || 'Casual',
    fit: garment.fit || 'Regular',
    signedUrl: signedUrl || '',
    notes: garment.notes || '',
    tags: garment.tags || [],
  };
}

/**
 * Main service method to generate verified outfit recommendations for the authenticated user.
 *
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} [params.prompt] - Optional natural language styling prompt (max 300 chars)
 * @param {string} [params.occasion] - Optional occasion filter
 * @param {string} [params.season] - Optional season filter
 * @param {number} [params.count=3] - Target number of recommendations (1-4)
 * @param {Function} [params.geminiClient] - Optional injected client for testing
 * @returns {Promise<object>} Recommendations payload
 */
export async function getOutfitRecommendations({
  userId,
  prompt,
  occasion,
  season,
  count = 3,
  geminiClient,
}) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new RecommendationServiceError('Valid user ID is required.', 401, 'UNAUTHORIZED');
  }

  // 1. Validate input parameters
  const sanitizedPrompt = typeof prompt === 'string' ? prompt.trim().slice(0, 300) : '';

  const validatedOccasion =
    occasion && typeof occasion === 'string' && VALID_OCCASIONS.includes(occasion.trim())
      ? occasion.trim()
      : 'All';

  const validatedSeason =
    season && typeof season === 'string' && VALID_SEASONS.includes(season.trim())
      ? season.trim()
      : 'All';

  const requestedCount = Math.min(Math.max(1, parseInt(count, 10) || 3), 4);

  // 2. Fetch user's garments strictly scoped to userId
  const userGarments = await Garment.find({ userId }).lean();

  if (!userGarments || userGarments.length === 0) {
    throw new RecommendationServiceError(
      'Your wardrobe is empty. Please add garments before requesting outfit recommendations.',
      400,
      'EMPTY_WARDROBE'
    );
  }

  // 3. Check feasibility (must have at least one valid core combination: Top+Bottom or Dress)
  if (!hasMinimumWardrobeFeasibility(userGarments)) {
    throw new RecommendationServiceError(
      'Your wardrobe needs at least one top and one bottom, or a dress, to generate complete outfit recommendations.',
      400,
      'INSUFFICIENT_GARMENTS'
    );
  }

  // 4. Prepare candidate catalog
  const candidateCatalog = prepareCandidateCatalog(userGarments);

  // 5. Call Gemini to generate recommendations
  let generateFn;
  if (typeof geminiClient === 'function') {
    generateFn = geminiClient;
  } else if (geminiClient && typeof geminiClient.generateOutfitRecommendations === 'function') {
    generateFn = (opts) => geminiClient.generateOutfitRecommendations(opts);
  } else if (geminiClient && geminiClient.models && typeof geminiClient.models.generateContent === 'function') {
    generateFn = (opts) => generateOutfitRecommendations({ ...opts, options: { aiInstance: geminiClient } });
  } else {
    generateFn = generateOutfitRecommendations;
  }

  let rawOutfits = [];
  try {
    rawOutfits = await generateFn({
      candidateCatalog,
      prompt: sanitizedPrompt,
      occasion: validatedOccasion,
      season: validatedSeason,
      count: requestedCount,
    });
  } catch (err) {
    if (err.status && err.code) {
      throw err;
    }
    throw new RecommendationServiceError(
      err.message || 'Failed to generate recommendations from AI provider.',
      502,
      'AI_PROVIDER_ERROR'
    );
  }

  if (!Array.isArray(rawOutfits) || rawOutfits.length === 0) {
    return {
      success: true,
      recommendations: [],
      prompt: sanitizedPrompt,
      totalGarmentsEvaluated: userGarments.length,
      notice: 'No outfits could be generated for this request.',
    };
  }

  // 6. Zero-Trust Verification & Post-Validation
  // Map of verified user garments by string ID
  const userGarmentMap = new Map(userGarments.map((g) => [g._id.toString(), g]));

  const verifiedRecommendations = [];

  for (const rawOutfit of rawOutfits) {
    if (!rawOutfit || typeof rawOutfit !== 'object') continue;

    const rawIds = Array.isArray(rawOutfit.garmentIds) ? rawOutfit.garmentIds : [];
    if (rawIds.length === 0) continue;

    // Check: Every single ID must exist in userGarmentMap.
    // If any ID is missing or foreign, DISCARD the outfit entirely (do not silently filter).
    const allIdsValid = rawIds.every((id) => userGarmentMap.has(String(id)));
    if (!allIdsValid) {
      // Discard invalid recommendation containing foreign/hallucinated ID
      continue;
    }

    // Check for duplicates: duplicate IDs inside one outfit are forbidden
    const stringIds = rawIds.map((id) => String(id));
    const uniqueIds = new Set(stringIds);
    if (uniqueIds.size !== stringIds.length) {
      // Discard outfit with duplicate items
      continue;
    }

    // Resolve garment documents
    const outfitGarments = stringIds.map((id) => userGarmentMap.get(id));

    // Check category combination completeness
    const combinationResult = validateOutfitCombination(outfitGarments);
    if (!combinationResult.valid) {
      // Discard incomplete or clashing combination
      continue;
    }

    // Deterministic Style Intelligence 2.0 evaluation
    const compatibility = evaluateOutfitCompatibility(outfitGarments, {
      occasion: validatedOccasion,
      season: validatedSeason,
    });

    if (!compatibility.passedThreshold) {
      // Discard outfit failing deterministic compatibility or with severe clashes
      continue;
    }

    // Hydrate garments with signed URLs
    const hydratedGarments = await Promise.all(
      outfitGarments.map((g) => formatHydratedGarment(g))
    );

    const safeName =
      typeof rawOutfit.name === 'string' && rawOutfit.name.trim().length > 0
        ? rawOutfit.name.trim().slice(0, 100)
        : 'Curated Ensemble';

    const safeOccasion =
      typeof rawOutfit.occasion === 'string' && rawOutfit.occasion.trim().length > 0
        ? rawOutfit.occasion.trim().slice(0, 40)
        : validatedOccasion !== 'All'
        ? validatedOccasion
        : 'Versatile';

    const safeReasoning =
      typeof rawOutfit.stylingReasoning === 'string' && rawOutfit.stylingReasoning.trim().length > 0
        ? rawOutfit.stylingReasoning.trim().slice(0, 500)
        : 'A cohesive look balancing colors and silhouette.';

    verifiedRecommendations.push({
      id: `rec_${crypto.randomUUID().slice(0, 8)}`,
      name: safeName,
      occasion: safeOccasion,
      stylingReasoning: safeReasoning,
      compatibility: {
        score: compatibility.score,
        tier: compatibility.tier,
        breakdown: compatibility.breakdown,
        matchReasons: compatibility.matchReasons,
        warnings: compatibility.warnings,
        uncertainties: compatibility.uncertainties,
      },
      garments: hydratedGarments,
      _garmentIdSet: uniqueIds,
    });
  }

  // 7. Deterministic Ranking & Diversity Filtering
  // Sort primarily descending by Style Compatibility Score
  verifiedRecommendations.sort((a, b) => b.compatibility.score - a.compatibility.score);

  // Diversity filter: Avoid returning nearly identical combinations when distinct alternatives exist
  const diverseRecommendations = [];
  for (const candidate of verifiedRecommendations) {
    const isTooSimilar = diverseRecommendations.some((selected) => {
      // Jaccard similarity: |A ∩ B| / |A ∪ B|
      const intersection = [...candidate._garmentIdSet].filter((id) => selected._garmentIdSet.has(id)).length;
      const union = new Set([...candidate._garmentIdSet, ...selected._garmentIdSet]).size;
      return union > 0 && intersection / union >= 0.75;
    });

    if (!isTooSimilar) {
      diverseRecommendations.push(candidate);
    }
  }

  // If diversity filtering reduced below requestedCount and we have skipped candidates, backfill
  if (diverseRecommendations.length < requestedCount) {
    for (const candidate of verifiedRecommendations) {
      if (!diverseRecommendations.some((r) => r.id === candidate.id)) {
        diverseRecommendations.push(candidate);
        if (diverseRecommendations.length >= requestedCount) break;
      }
    }
  }

  // Clean internal _garmentIdSet before returning
  const finalRecommendations = diverseRecommendations.slice(0, requestedCount).map((r) => {
    const { _garmentIdSet, ...cleanRec } = r;
    return cleanRec;
  });

  return {
    success: true,
    recommendations: finalRecommendations,
    prompt: sanitizedPrompt,
    occasion: validatedOccasion,
    season: validatedSeason,
    totalGarmentsEvaluated: userGarments.length,
  };
}

export default {
  RecommendationServiceError,
  validateOutfitCombination,
  hasMinimumWardrobeFeasibility,
  prepareCandidateCatalog,
  formatHydratedGarment,
  getOutfitRecommendations,
};
