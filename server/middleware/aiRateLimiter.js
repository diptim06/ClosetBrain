/**
 * Sliding window rate limiter for Gemini AI analysis requests.
 * Prevents API quota exhaustion and abuse while maintaining fast in-memory execution.
 */

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // 10 analyses per minute per user/IP

// Map of key -> array of timestamps
const requestBuckets = new Map();
const recommendationBuckets = new Map();

// Periodic cleanup of expired rate-limit buckets every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requestBuckets.entries()) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      requestBuckets.delete(key);
    } else {
      requestBuckets.set(key, valid);
    }
  }
  for (const [key, timestamps] of recommendationBuckets.entries()) {
    const valid = timestamps.filter((t) => now - t < RECOMMENDATION_WINDOW_MS);
    if (valid.length === 0) {
      recommendationBuckets.delete(key);
    } else {
      recommendationBuckets.set(key, valid);
    }
  }
}, 5 * 60 * 1000);

// Prevent cleanup interval from blocking process shutdown
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * Express middleware for AI rate limiting.
 */
export function aiRateLimiter(req, res, next) {
  const identifier = req.userId ? `user_${req.userId}` : `ip_${req.ip || 'unknown'}`;
  const now = Date.now();

  const userTimestamps = requestBuckets.get(identifier) || [];
  // Filter out timestamps outside the active window
  const activeTimestamps = userTimestamps.filter((t) => now - t < WINDOW_MS);

  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestTimestamp = activeTimestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (now - oldestTimestamp)) / 1000));

    if (typeof res.set === 'function') {
      res.set('Retry-After', String(retryAfterSeconds));
    } else if (typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', String(retryAfterSeconds));
    }
    return res.status(429).json({
      error: 'AI analysis rate limit reached. Please wait before analyzing another garment.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterSeconds,
    });
  }

  activeTimestamps.push(now);
  requestBuckets.set(identifier, activeTimestamps);

  next();
}

/**
 * Resets rate limit buckets (useful for testing).
 */
export function resetRateLimits() {
  requestBuckets.clear();
  recommendationBuckets.clear();
}

const RECOMMENDATION_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_RECOMMENDATIONS_PER_WINDOW = 6; // 6 recommendation calls per minute per user

/**
 * Express middleware for AI outfit recommendation rate limiting.
 */
export function recommendationRateLimiter(req, res, next) {
  const identifier = req.userId ? `user_${req.userId}` : `ip_${req.ip || 'unknown'}`;
  const now = Date.now();

  const userTimestamps = recommendationBuckets.get(identifier) || [];
  const activeTimestamps = userTimestamps.filter((t) => now - t < RECOMMENDATION_WINDOW_MS);

  if (activeTimestamps.length >= MAX_RECOMMENDATIONS_PER_WINDOW) {
    const oldestTimestamp = activeTimestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((RECOMMENDATION_WINDOW_MS - (now - oldestTimestamp)) / 1000));

    if (typeof res.set === 'function') {
      res.set('Retry-After', String(retryAfterSeconds));
    } else if (typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', String(retryAfterSeconds));
    }
    return res.status(429).json({
      error: 'AI outfit recommendation rate limit reached. Please wait a moment before requesting more recommendations.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfterSeconds,
    });
  }

  activeTimestamps.push(now);
  recommendationBuckets.set(identifier, activeTimestamps);

  next();
}

export function resetRecommendationRateLimits() {
  recommendationBuckets.clear();
}

export default aiRateLimiter;
