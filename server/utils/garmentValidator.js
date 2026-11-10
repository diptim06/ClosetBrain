export const VALID_CATEGORIES = [
  'Tops',
  'Bottoms',
  'Outerwear',
  'Dresses',
  'Shoes',
  'Accessories',
  'Ethnic Wear',
];

export const VALID_PATTERNS = [
  'Solid',
  'Striped',
  'Plaid',
  'Check',
  'Floral',
  'Textured',
  'Graphic',
  'Other',
];

export const VALID_SEASONS = [
  'Spring',
  'Summer',
  'Autumn',
  'Winter',
  'All-Season',
];

export const VALID_FORMALITIES = [
  'Casual',
  'Smart Casual',
  'Business Casual',
  'Formal',
  'Lounge',
];

export const VALID_COLOR_FAMILIES = [
  'Neutrals',
  'Earth Tones',
  'Monochrome',
  'Pastels',
  'Vibrant',
  'Metallics',
];

export const VALID_FITS = [
  'Fitted',
  'Slim',
  'Regular',
  'Relaxed',
  'Oversized',
];

/**
 * Validates and normalizes garment creation input.
 * Strips disallowed fields (userId, imageKey, imageUrl, etc.).
 *
 * @param {object} payload
 * @returns {{ valid: boolean, errors: string[], data: object }}
 */
export function validateGarmentCreatePayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: ['Request body must be a JSON object.'], data: null };
  }

  // 1. Name / Title (required)
  const rawName = payload.name || payload.title;
  let name = typeof rawName === 'string' ? rawName.trim() : '';
  if (!name) {
    errors.push('Garment name is required.');
  } else if (name.length > 120) {
    errors.push('Garment name cannot exceed 120 characters.');
  }

  // 2. Category (required)
  let category = typeof payload.category === 'string' ? payload.category.trim() : '';
  const matchedCategory = VALID_CATEGORIES.find((c) => c.toLowerCase() === category.toLowerCase());
  if (!matchedCategory) {
    errors.push(`Invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(', ')}.`);
  } else {
    category = matchedCategory;
  }

  // 3. Primary Color (required)
  const rawColor = payload.primaryColor || payload.color;
  let primaryColor = typeof rawColor === 'string' ? rawColor.trim() : '';
  if (!primaryColor) {
    errors.push('Primary color is required.');
  } else if (primaryColor.length > 50) {
    errors.push('Primary color cannot exceed 50 characters.');
  }

  // 4. Secondary Colors (optional array)
  let secondaryColors = [];
  if (Array.isArray(payload.secondaryColors)) {
    secondaryColors = payload.secondaryColors
      .map((c) => (typeof c === 'string' ? c.trim() : ''))
      .filter((c) => c.length > 0 && c.toLowerCase() !== primaryColor.toLowerCase());
  }

  // 5. Color Family (optional enum)
  let colorFamily = 'Neutrals';
  if (payload.colorFamily) {
    const matchedFamily = VALID_COLOR_FAMILIES.find(
      (f) => f.toLowerCase() === String(payload.colorFamily).trim().toLowerCase()
    );
    if (matchedFamily) {
      colorFamily = matchedFamily;
    } else {
      errors.push(`Invalid color family. Allowed: ${VALID_COLOR_FAMILIES.join(', ')}.`);
    }
  }

  // 6. SubCategory (optional string or null)
  const rawSub = payload.subCategory || payload.subcategory;
  let subCategory = null;
  if (rawSub && typeof rawSub === 'string') {
    const trimmed = rawSub.trim();
    if (trimmed && !['unknown', 'null', 'undefined', 'n/a', 'none'].includes(trimmed.toLowerCase())) {
      subCategory = trimmed.slice(0, 80);
    }
  }

  // 7. Brand (optional string or null)
  let brand = null;
  if (payload.brand && typeof payload.brand === 'string') {
    const trimmed = payload.brand.trim();
    if (trimmed && !['unknown', 'null', 'none'].includes(trimmed.toLowerCase())) {
      brand = trimmed.slice(0, 100);
    }
  }

  // 8. Material (optional string or null)
  let material = null;
  if (payload.material && typeof payload.material === 'string') {
    const trimmed = payload.material.trim();
    if (trimmed && !['unknown', 'null', 'none'].includes(trimmed.toLowerCase())) {
      material = trimmed.slice(0, 100);
    }
  }

  // 9. Pattern (optional enum)
  let pattern = 'Solid';
  if (payload.pattern) {
    const matchedPattern = VALID_PATTERNS.find(
      (p) => p.toLowerCase() === String(payload.pattern).trim().toLowerCase()
    );
    if (matchedPattern) {
      pattern = matchedPattern;
    } else {
      errors.push(`Invalid pattern. Allowed: ${VALID_PATTERNS.join(', ')}.`);
    }
  }

  // 10. Season (optional array)
  let season = ['All-Season'];
  if (payload.season) {
    const rawSeasons = Array.isArray(payload.season) ? payload.season : [payload.season];
    const validatedSeasons = rawSeasons
      .map((s) => VALID_SEASONS.find((vs) => vs.toLowerCase() === String(s).trim().toLowerCase()))
      .filter(Boolean);

    if (validatedSeasons.length > 0) {
      season = Array.from(new Set(validatedSeasons));
    }
  }

  // 11. Formality / Occasion (optional enum)
  let formality = 'Casual';
  const rawFormality = payload.formality || payload.occasion;
  if (rawFormality) {
    const matchedFormality = VALID_FORMALITIES.find(
      (f) => f.toLowerCase() === String(rawFormality).trim().toLowerCase()
    );
    if (matchedFormality) {
      formality = matchedFormality;
    } else {
      errors.push(`Invalid formality/occasion. Allowed: ${VALID_FORMALITIES.join(', ')}.`);
    }
  }

  // 12. Fit (optional enum)
  let fit = 'Regular';
  if (payload.fit) {
    const matchedFit = VALID_FITS.find((f) => f.toLowerCase() === String(payload.fit).trim().toLowerCase());
    if (matchedFit) {
      fit = matchedFit;
    } else {
      errors.push(`Invalid fit. Allowed: ${VALID_FITS.join(', ')}.`);
    }
  }

  // 13. Tags (optional array)
  let tags = [];
  if (Array.isArray(payload.tags)) {
    tags = payload.tags
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => t.length > 0)
      .slice(0, 20);
  }

  // 14. Notes (optional string)
  let notes = '';
  if (payload.notes && typeof payload.notes === 'string') {
    notes = payload.notes.trim().slice(0, 500);
  }

  // 15. aiAnalyzed flag
  const aiAnalyzed = Boolean(payload.aiAnalyzed);

  // 16. isCompleteSet flag (for Ethnic Wear ensembles, e.g. Anarkali, Salwar Suit, Saree set)
  const isCompleteSet = Boolean(payload.isCompleteSet);

  if (errors.length > 0) {
    return { valid: false, errors, data: null };
  }

  return {
    valid: true,
    errors: [],
    data: {
      name,
      category,
      subCategory,
      isCompleteSet,
      primaryColor,
      secondaryColors,
      colorFamily,
      brand,
      material,
      pattern,
      season,
      formality,
      fit,
      tags,
      notes,
      aiAnalyzed,
    },
  };
}

/**
 * Validates and normalizes garment update payload.
 * Strictly ignores immutable fields: userId, imageKey, _id, createdAt, updatedAt.
 *
 * @param {object} payload
 * @returns {{ valid: boolean, errors: string[], data: object }}
 */
export function validateGarmentUpdatePayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, errors: ['Update payload must be a JSON object.'], data: null };
  }

  const data = {};

  // Name
  if (payload.name !== undefined || payload.title !== undefined) {
    const rawName = payload.name !== undefined ? payload.name : payload.title;
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name) {
      errors.push('Garment name cannot be empty.');
    } else if (name.length > 120) {
      errors.push('Garment name cannot exceed 120 characters.');
    } else {
      data.name = name;
    }
  }

  // Category
  if (payload.category !== undefined) {
    const category = typeof payload.category === 'string' ? payload.category.trim() : '';
    const matchedCategory = VALID_CATEGORIES.find((c) => c.toLowerCase() === category.toLowerCase());
    if (!matchedCategory) {
      errors.push(`Invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(', ')}.`);
    } else {
      data.category = matchedCategory;
    }
  }

  // Primary color
  if (payload.primaryColor !== undefined || payload.color !== undefined) {
    const rawColor = payload.primaryColor !== undefined ? payload.primaryColor : payload.color;
    const primaryColor = typeof rawColor === 'string' ? rawColor.trim() : '';
    if (!primaryColor) {
      errors.push('Primary color cannot be empty.');
    } else if (primaryColor.length > 50) {
      errors.push('Primary color cannot exceed 50 characters.');
    } else {
      data.primaryColor = primaryColor;
    }
  }

  // Secondary colors
  if (payload.secondaryColors !== undefined) {
    if (Array.isArray(payload.secondaryColors)) {
      data.secondaryColors = payload.secondaryColors
        .map((c) => (typeof c === 'string' ? c.trim() : ''))
        .filter((c) => c.length > 0);
    } else {
      errors.push('secondaryColors must be an array of strings.');
    }
  }

  // Color Family
  if (payload.colorFamily !== undefined) {
    const matchedFamily = VALID_COLOR_FAMILIES.find(
      (f) => f.toLowerCase() === String(payload.colorFamily).trim().toLowerCase()
    );
    if (matchedFamily) {
      data.colorFamily = matchedFamily;
    } else {
      errors.push(`Invalid color family. Allowed: ${VALID_COLOR_FAMILIES.join(', ')}.`);
    }
  }

  // SubCategory
  if (payload.subCategory !== undefined || payload.subcategory !== undefined) {
    const rawSub = payload.subCategory !== undefined ? payload.subCategory : payload.subcategory;
    if (rawSub === null || rawSub === '') {
      data.subCategory = null;
    } else if (typeof rawSub === 'string') {
      data.subCategory = rawSub.trim().slice(0, 80);
    }
  }

  // Brand
  if (payload.brand !== undefined) {
    if (payload.brand === null || payload.brand === '') {
      data.brand = null;
    } else if (typeof payload.brand === 'string') {
      data.brand = payload.brand.trim().slice(0, 100);
    }
  }

  // Material
  if (payload.material !== undefined) {
    if (payload.material === null || payload.material === '') {
      data.material = null;
    } else if (typeof payload.material === 'string') {
      data.material = payload.material.trim().slice(0, 100);
    }
  }

  // Pattern
  if (payload.pattern !== undefined) {
    const matchedPattern = VALID_PATTERNS.find(
      (p) => p.toLowerCase() === String(payload.pattern).trim().toLowerCase()
    );
    if (matchedPattern) {
      data.pattern = matchedPattern;
    } else {
      errors.push(`Invalid pattern. Allowed: ${VALID_PATTERNS.join(', ')}.`);
    }
  }

  // Season
  if (payload.season !== undefined) {
    const rawSeasons = Array.isArray(payload.season) ? payload.season : [payload.season];
    const validatedSeasons = rawSeasons
      .map((s) => VALID_SEASONS.find((vs) => vs.toLowerCase() === String(s).trim().toLowerCase()))
      .filter(Boolean);

    if (validatedSeasons.length > 0) {
      data.season = Array.from(new Set(validatedSeasons));
    } else {
      errors.push(`Season must contain valid values from: ${VALID_SEASONS.join(', ')}.`);
    }
  }

  // Formality
  if (payload.formality !== undefined || payload.occasion !== undefined) {
    const rawFormality = payload.formality !== undefined ? payload.formality : payload.occasion;
    const matchedFormality = VALID_FORMALITIES.find(
      (f) => f.toLowerCase() === String(rawFormality).trim().toLowerCase()
    );
    if (matchedFormality) {
      data.formality = matchedFormality;
    } else {
      errors.push(`Invalid formality. Allowed: ${VALID_FORMALITIES.join(', ')}.`);
    }
  }

  // Fit
  if (payload.fit !== undefined) {
    const matchedFit = VALID_FITS.find((f) => f.toLowerCase() === String(payload.fit).trim().toLowerCase());
    if (matchedFit) {
      data.fit = matchedFit;
    } else {
      errors.push(`Invalid fit. Allowed: ${VALID_FITS.join(', ')}.`);
    }
  }

  // Tags
  if (payload.tags !== undefined) {
    if (Array.isArray(payload.tags)) {
      data.tags = payload.tags
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter((t) => t.length > 0)
        .slice(0, 20);
    } else {
      errors.push('tags must be an array of strings.');
    }
  }

  // Notes
  if (payload.notes !== undefined) {
    data.notes = typeof payload.notes === 'string' ? payload.notes.trim().slice(0, 500) : '';
  }

  // aiAnalyzed
  if (payload.aiAnalyzed !== undefined) {
    data.aiAnalyzed = Boolean(payload.aiAnalyzed);
  }

  // isCompleteSet
  if (payload.isCompleteSet !== undefined) {
    data.isCompleteSet = Boolean(payload.isCompleteSet);
  }

  if (errors.length > 0) {
    return { valid: false, errors, data: null };
  }

  return { valid: true, errors: [], data };
}

export default {
  validateGarmentCreatePayload,
  validateGarmentUpdatePayload,
  VALID_CATEGORIES,
  VALID_PATTERNS,
  VALID_SEASONS,
  VALID_FORMALITIES,
  VALID_COLOR_FAMILIES,
  VALID_FITS,
};
