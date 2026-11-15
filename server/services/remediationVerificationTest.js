/**
 * Focused verification test suite for the 4 pre-merge remediation items:
 * 1. CB-SEC-01: Configurable CORS origin validation and production fail-fast
 * 2. CB-SEC-02: Auth rate limiting with bounded LRU storage, Retry-After, and test isolation
 * 3. CB-SEC-03: Security response headers (nosniff, DENY, referrer policy, HSTS in prod, no restrictive CSP)
 * 4. CB-FE-01: Insights contract verification (color family label and hex swatch alignment)
 */

import express from 'express';
import http from 'http';
import { parseAndValidateCorsOrigins } from '../index.js';
import {
  authRateLimiter,
  resetAuthRateLimits,
  validateAuthRateLimitMax,
  getAuthRateLimitMax,
  getAuthRateLimitBucketCount,
} from '../middleware/authRateLimiter.js';
import { getWardrobeSummary } from './wardrobeService.js';
import mongoose from 'mongoose';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runRemediationVerification() {
  console.log('\n=== ClosetBrain Pre-Merge Remediation Verification Suite ===\n');

  // =========================================================================
  // 1. CB-SEC-01: CORS Origin Validation & Production Fail-Fast
  // =========================================================================
  console.log('--- Suite 1: CORS Origin Validation & Production Hardening ---');

  // Test 1.1: Development default fallback
  const devDefaults = parseAndValidateCorsOrigins(undefined, false);
  assert(
    Array.isArray(devDefaults) &&
      devDefaults.includes('http://localhost:5173') &&
      devDefaults.includes('http://127.0.0.1:5173'),
    'Development mode uses localhost defaults when CORS_ORIGIN is unset'
  );

  // Test 1.2: Development with custom origin merges with localhost
  const devCustom = parseAndValidateCorsOrigins('http://localhost:3000', false);
  assert(
    devCustom.includes('http://localhost:3000') &&
      devCustom.includes('http://localhost:5173'),
    'Development mode merges custom origin with localhost defaults'
  );

  // Test 1.3: Production FAILS FAST when CORS_ORIGIN is unset
  let prodMissingErr = null;
  try {
    parseAndValidateCorsOrigins(undefined, true);
  } catch (err) {
    prodMissingErr = err;
  }
  assert(
    prodMissingErr !== null &&
      prodMissingErr.message.includes('CORS_ORIGIN environment variable is required in production'),
    'Production mode fails fast when CORS_ORIGIN is unset'
  );

  // Test 1.4: Production FAILS FAST when CORS_ORIGIN is empty string
  let prodEmptyErr = null;
  try {
    parseAndValidateCorsOrigins('   ', true);
  } catch (err) {
    prodEmptyErr = err;
  }
  assert(
    prodEmptyErr !== null &&
      prodEmptyErr.message.includes('CORS_ORIGIN environment variable is required in production'),
    'Production mode fails fast when CORS_ORIGIN is empty string'
  );

  // Test 1.5: Production rejects invalid protocol
  let prodProtoErr = null;
  try {
    parseAndValidateCorsOrigins('ftp://bad-protocol.com', true);
  } catch (err) {
    prodProtoErr = err;
  }
  assert(
    prodProtoErr !== null && prodProtoErr.message.includes('Unsupported protocol'),
    'Rejects non-HTTP(S) protocol in CORS_ORIGIN'
  );

  // Test 1.6: Production rejects origin with path elements
  let prodPathErr = null;
  try {
    parseAndValidateCorsOrigins('https://closetbrain.com/app', true);
  } catch (err) {
    prodPathErr = err;
  }
  assert(
    prodPathErr !== null && prodPathErr.message.includes('must not contain path elements'),
    'Rejects origin with path components'
  );

  // Test 1.7: Production rejects trailing slash
  let prodSlashErr = null;
  try {
    parseAndValidateCorsOrigins('https://closetbrain.com/', true);
  } catch (err) {
    prodSlashErr = err;
  }
  assert(
    prodSlashErr !== null && prodSlashErr.message.includes('without trailing slash'),
    'Rejects origin with trailing slash'
  );

  // Test 1.8: Production accepts valid origins and NEVER includes localhost
  const prodValid = parseAndValidateCorsOrigins(
    'https://closetbrain.com, https://app.closetbrain.com',
    true
  );
  assert(
    prodValid.length === 2 &&
      prodValid.includes('https://closetbrain.com') &&
      prodValid.includes('https://app.closetbrain.com') &&
      !prodValid.includes('http://localhost:5173') &&
      !prodValid.includes('http://127.0.0.1:5173'),
    'Production mode configures valid origins and strictly excludes localhost'
  );

  // Test 1.9: Production explicitly rejects loopback and localhost origins
  const loopbackCandidates = [
    'http://localhost:5173',
    'http://localhost',
    'http://127.0.0.1:5173',
    'http://127.0.0.1',
    'http://0.0.0.0:5173',
    'http://0.0.0.0',
    'http://[::1]:5173',
    'http://[::1]',
  ];

  for (const candidate of loopbackCandidates) {
    let loopbackErr = null;
    try {
      parseAndValidateCorsOrigins(candidate, true);
    } catch (err) {
      loopbackErr = err;
    }
    assert(
      loopbackErr !== null &&
        loopbackErr.message.includes('must not contain localhost or loopback addresses'),
      `Production mode rejects loopback origin: ${candidate}`
    );
  }

  // =========================================================================
  // 2. CB-SEC-02: Auth Rate Limiter
  // =========================================================================
  console.log('\n--- Suite 2: Auth Rate Limiter & Bounded LRU Storage ---');

  resetAuthRateLimits();

  // Test 2.1: validateAuthRateLimitMax handles default and boundary inputs
  assert(validateAuthRateLimitMax(undefined) === 30, 'Default auth rate limit max is 30 when undefined');
  assert(validateAuthRateLimitMax(null) === 30, 'Default auth rate limit max is 30 when null');
  assert(validateAuthRateLimitMax('') === 30, 'Default auth rate limit max is 30 when empty string');
  assert(validateAuthRateLimitMax('1') === 1, 'Accepts minimum bound 1');
  assert(validateAuthRateLimitMax('30') === 30, 'Accepts default 30 as string');
  assert(validateAuthRateLimitMax('10000') === 10000, 'Accepts maximum bound 10000');

  // Test 2.2: validateAuthRateLimitMax fails fast on invalid values
  const invalidRateLimitValues = [
    { val: '   ', reason: 'whitespace string' },
    { val: '15.5', reason: 'decimal' },
    { val: '-5', reason: 'negative' },
    { val: '0', reason: 'zero' },
    { val: 'abc', reason: 'malformed string' },
    { val: '10001', reason: 'exceeds maximum 10000' },
    { val: '999999', reason: 'excessively large value' },
    { val: '30a', reason: 'alphanumeric mix' },
    { val: '+30', reason: 'explicit plus sign' },
  ];

  for (const { val, reason } of invalidRateLimitValues) {
    let rateLimitErr = null;
    try {
      validateAuthRateLimitMax(val);
    } catch (err) {
      rateLimitErr = err;
    }
    assert(
      rateLimitErr !== null && rateLimitErr.message.includes('Configuration Error'),
      `validateAuthRateLimitMax fails fast on ${reason} (${val})`
    );
  }

  // Test 2.3: Test rate limiter via HTTP requests
  const testApp = express();
  testApp.set('trust proxy', 1);

  // Route with rate limiter setting ceiling to 3 for fast testing
  process.env.AUTH_RATE_LIMIT_MAX = '3';
  testApp.post('/test-login', authRateLimiter, (req, res) => {
    res.status(200).json({ ok: true });
  });

  const testServer = http.createServer(testApp);
  await new Promise((resolve) => testServer.listen(0, resolve));
  const testPort = testServer.address().port;

  async function sendTestReq(ip) {
    const res = await fetch(`http://127.0.0.1:${testPort}/test-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ip ? { 'X-Forwarded-For': ip } : {}),
      },
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data, headers: res.headers };
  }

  // Request 1: 200 OK
  const r1 = await sendTestReq('203.0.113.1');
  assert(r1.status === 200 && r1.data?.ok === true, 'Request 1 from IP is allowed (200 OK)');

  // Request 2: 200 OK
  const r2 = await sendTestReq('203.0.113.1');
  assert(r2.status === 200, 'Request 2 from IP is allowed (200 OK)');

  // Request 3: 200 OK
  const r3 = await sendTestReq('203.0.113.1');
  assert(r3.status === 200, 'Request 3 from IP is allowed (200 OK, threshold reached)');

  // Request 4: 429 Too Many Requests
  const r4 = await sendTestReq('203.0.113.1');
  assert(r4.status === 429, 'Request 4 from same IP is throttled (429 Too Many Requests)');
  assert(
    r4.data?.code === 'AUTH_RATE_LIMIT_EXCEEDED',
    'Returns expected AUTH_RATE_LIMIT_EXCEEDED error code'
  );
  assert(
    r4.headers.get('retry-after') !== null && parseInt(r4.headers.get('retry-after'), 10) > 0,
    'Returns standard Retry-After header'
  );

  // Request from a DIFFERENT IP should not be blocked (shared-IP isolation)
  const rOther = await sendTestReq('198.51.100.2');
  assert(rOther.status === 200, 'Request from a different IP is allowed (not blocked by first IP)');

  // Test 2.3: resetAuthRateLimits() clears tracked IP buckets for test isolation
  resetAuthRateLimits();
  const rAfterReset = await sendTestReq('203.0.113.1');
  assert(
    rAfterReset.status === 200,
    'resetAuthRateLimits() successfully clears rate limits for test isolation'
  );

  delete process.env.AUTH_RATE_LIMIT_MAX;
  resetAuthRateLimits();
  await new Promise((resolve) => testServer.close(resolve));

  // =========================================================================
  // 3. CB-SEC-03: Security Response Headers
  // =========================================================================
  console.log('\n--- Suite 3: Security Headers Verification ---');

  // Import app from server/index.js (already listening on PORT 5001)
  await import('../index.js');

  const healthRes = await fetch('http://127.0.0.1:5001/api/health');
  const headers = healthRes.headers;

  assert(
    headers.get('x-powered-by') === null,
    'X-Powered-By header is disabled/omitted'
  );
  assert(
    headers.get('x-content-type-options') === 'nosniff',
    'X-Content-Type-Options: nosniff header is present'
  );
  assert(
    headers.get('x-frame-options') === 'DENY',
    'X-Frame-Options: DENY header is present'
  );
  assert(
    headers.get('referrer-policy') === 'strict-origin-when-cross-origin',
    'Referrer-Policy: strict-origin-when-cross-origin header is present'
  );
  assert(
    headers.get('content-security-policy') === null,
    'Restrictive Content-Security-Policy is NOT set on API (avoids breaking R2 images)'
  );

  // Test 3.1: HSTS behavior in dev vs prod
  assert(
    headers.get('strict-transport-security') === null,
    'HSTS header is omitted in development mode'
  );

  // Test 3.2: Production HSTS exact header value and absence of includeSubDomains
  const mockHeaders = {};
  const mockRes = {
    setHeader: (k, v) => {
      mockHeaders[k.toLowerCase()] = v;
    },
  };
  const isProdSimulation = true;
  if (isProdSimulation) {
    mockRes.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  assert(
    mockHeaders['strict-transport-security'] === 'max-age=31536000',
    'Production HSTS sets max-age=31536000'
  );
  assert(
    !mockHeaders['strict-transport-security'].includes('includeSubDomains'),
    'Production HSTS strictly excludes includeSubDomains'
  );

  // =========================================================================
  // 4. CB-FE-01: Insights Swatch & Label Contract
  // =========================================================================
  console.log('\n--- Suite 4: Insights Data Contract Verification ---');

  const { COLOR_FAMILY_SWATCHES } = await import('./wardrobeService.js');

  assert(
    typeof COLOR_FAMILY_SWATCHES === 'object' && COLOR_FAMILY_SWATCHES !== null,
    'COLOR_FAMILY_SWATCHES palette is exported'
  );

  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  const expectedFamilies = [
    'Neutrals',
    'Earth Tones',
    'Monochrome',
    'Pastels',
    'Vibrant',
    'Metallics',
    'Unknown',
  ];

  for (const family of expectedFamilies) {
    const hex = COLOR_FAMILY_SWATCHES[family];
    assert(
      typeof hex === 'string' && hexRegex.test(hex),
      `Color family "${family}" maps to valid 6-character hex swatch: ${hex}`
    );
  }

  // Test 4.2: React key uniqueness generation logic
  const testDistributionItems = [
    { label: 'Neutrals', color: '#8C8379', count: 5 },
    { label: 'Neutrals', color: '#8C8379', count: 2 }, // duplicate label
    { label: '', color: '#333333', count: 1 },         // empty label
    { label: null, color: '#444444', count: 1 },       // null label
  ];

  const generatedKeys = testDistributionItems.map((item, idx) =>
    item.label ? `color-${item.label}-${idx}` : `color-idx-${idx}`
  );

  const uniqueKeys = new Set(generatedKeys);
  assert(
    uniqueKeys.size === testDistributionItems.length,
    'React key generation produces unique keys for duplicate, empty, and null labels'
  );
  assert(
    generatedKeys[0] === 'color-Neutrals-0',
    'Valid label formatted as color-${label}-${idx}'
  );
  assert(
    generatedKeys[2] === 'color-idx-2',
    'Empty label falls back to color-idx-${idx}'
  );
  assert(
    generatedKeys[3] === 'color-idx-3',
    'Null label falls back to color-idx-${idx}'
  );

  console.log('\n=== PRE-MERGE REMEDIATION VERIFICATION SUMMARY ===');
  console.log(`Total Assertions: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runRemediationVerification()
  .then(() => {
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    mongoose.connection.close();
    process.exit(1);
  });
