/**
 * Sliding window IP rate limiter for authentication endpoints (/login and /signup).
 * Protects against brute-force credential stuffing and CPU exhaustion from bcrypt hashing.
 *
 * ARCHITECTURAL NOTES & DEPLOYMENT ASSUMPTIONS:
 * 1. Single-Instance Protection:
 *    This in-memory rate limiter protects a single Node.js process. In distributed
 *    or horizontally-scaled production deployments (e.g. multiple Kubernetes pods or
 *    autoscaling instances), rate limiting must be backed by a shared distributed datastore
 *    (e.g., Redis) or enforced upstream at the API gateway / cloud reverse proxy layer.
 * 2. Trust Proxy Assumption:
 *    Relies on Express's proxy-derived `req.ip`. ClosetBrain configures `app.set('trust proxy', 1)`,
 *    assuming exactly one upstream reverse proxy (Cloudflare, AWS ALB, Render, Railway, Nginx).
 *    Never reads raw client-supplied `X-Forwarded-For` headers directly to prevent IP spoofing.
 * 3. Shared-IP Users:
 *    The default ceiling is 30 attempts per 15-minute rolling window per IP (configurable
 *    via `AUTH_RATE_LIMIT_MAX`). This provides ample headroom for multiple legitimate users
 *    behind corporate NATs, universities, or mobile CGNAT gateways while effectively throttling
 *    high-velocity brute-force automation.
 */

const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15-minute rolling window
const DEFAULT_MAX_ATTEMPTS = 30; // 30 attempts per IP per window
const MAX_TRACKED_IPS = 10000; // Bounded storage cap to prevent memory bloat

// Map of IP -> array of request timestamps (epoch ms)
// Using JavaScript Map which preserves insertion order for LRU eviction
const authBuckets = new Map();

const STRICT_INTEGER_REGEX = /^[1-9]\d*$/;

/**
 * Validates and retrieves the configured rate limit ceiling.
 * Fails fast with a Configuration Error if an invalid, non-integer, negative,
 * zero, decimal, or out-of-range value is explicitly configured.
 *
 * @param {string|undefined} [envVal=process.env.AUTH_RATE_LIMIT_MAX]
 * @returns {number} Validated maximum allowed attempts per window
 */
export function validateAuthRateLimitMax(envVal = process.env.AUTH_RATE_LIMIT_MAX) {
  if (envVal === undefined || envVal === null || envVal === '') {
    return DEFAULT_MAX_ATTEMPTS;
  }

  const trimmed = String(envVal).trim();
  if (!STRICT_INTEGER_REGEX.test(trimmed)) {
    throw new Error(
      `Configuration Error: AUTH_RATE_LIMIT_MAX must be a strictly formatted positive integer (1-10000), got "${envVal}".`
    );
  }

  const parsed = parseInt(trimmed, 10);
  if (parsed < 1 || parsed > 10000) {
    throw new Error(
      `Configuration Error: AUTH_RATE_LIMIT_MAX must be between 1 and 10000, got ${parsed}.`
    );
  }

  return parsed;
}

export const getAuthRateLimitMax = validateAuthRateLimitMax;

/**
 * Periodic cleanup interval (runs every 5 minutes) to prune expired timestamps
 * and remove dormant IPs from the Map.
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of authBuckets.entries()) {
    const valid = timestamps.filter((t) => now - t < AUTH_WINDOW_MS);
    if (valid.length === 0) {
      authBuckets.delete(ip);
    } else {
      authBuckets.set(ip, valid);
    }
  }
}, 5 * 60 * 1000);

if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * Express middleware for authentication route rate limiting.
 */
export function authRateLimiter(req, res, next) {
  // Derive IP strictly through Express's trusted proxy evaluation
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const maxAttempts = getAuthRateLimitMax();

  // Retrieve existing timestamps and prune those outside the rolling window
  const existing = authBuckets.get(ip) || [];
  const activeTimestamps = existing.filter((t) => now - t < AUTH_WINDOW_MS);

  if (activeTimestamps.length >= maxAttempts) {
    const oldestTimestamp = activeTimestamps[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((AUTH_WINDOW_MS - (now - oldestTimestamp)) / 1000)
    );

    if (typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', String(retryAfterSeconds));
    } else if (typeof res.set === 'function') {
      res.set('Retry-After', String(retryAfterSeconds));
    }

    return res.status(429).json({
      error: 'Too many authentication attempts from this IP address. Please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfterSeconds,
    });
  }

  // Bounded storage enforcement via LRU eviction:
  // If the Map reaches MAX_TRACKED_IPS, evict the least-recently-used IP (the first key)
  if (!authBuckets.has(ip) && authBuckets.size >= MAX_TRACKED_IPS) {
    const oldestKey = authBuckets.keys().next().value;
    if (oldestKey !== undefined) {
      authBuckets.delete(oldestKey);
    }
  }

  activeTimestamps.push(now);

  // Refresh insertion order (LRU)
  authBuckets.delete(ip);
  authBuckets.set(ip, activeTimestamps);

  next();
}

/**
 * Resets all active rate limit buckets.
 * Exported for test isolation across integration and route test suites.
 */
export function resetAuthRateLimits() {
  authBuckets.clear();
}

/**
 * Returns current bucket size (for unit/integration testing of bounded storage).
 */
export function getAuthRateLimitBucketCount() {
  return authBuckets.size;
}

export default authRateLimiter;
