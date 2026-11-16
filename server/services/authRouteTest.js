import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import http from 'http';
import bcrypt from 'bcryptjs';
import authRoutes from '../routes/auth.js';
import User from '../models/User.js';

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

async function connectDb() {
  const primaryUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
  const fallbackUri = 'mongodb://localhost:27017/closetbrain_test';

  if (mongoose.connection.readyState === 1) return;

  if (primaryUri) {
    try {
      await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 2000 });
      console.log('Connected to primary database.');
      return;
    } catch (err) {
      console.warn(`Primary DB failed (${err.message}). Trying fallback local URI...`);
    }
  }

  await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 3000 });
  console.log(`Connected to fallback local database: ${fallbackUri}`);
}

async function runAuthRouteTests() {
  console.log('\n=== ClosetBrain Auth Phase 4: Backend Route Integration Verification ===\n');

  await connectDb();

  // Mock outgoing Resend emails
  const capturedEmails = [];
  let emailBehavior = 'success'; // 'success' | 'server_error' | 'sandbox_restriction'

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (typeof url === 'string' && url.includes('resend.com')) {
      if (emailBehavior === 'server_error') {
        return {
          ok: false,
          status: 500,
          json: async () => ({ statusCode: 500, message: 'Internal Resend infrastructure failure' }),
        };
      }
      if (emailBehavior === 'sandbox_restriction') {
        return {
          ok: false,
          status: 403,
          json: async () => ({
            statusCode: 403,
            message: 'You can only send testing emails to your own email address. To send to other addresses, add and verify a domain at resend.com/domains',
            name: 'validation_error',
          }),
        };
      }
      const body = JSON.parse(options.body);
      const otpMatch = body.subject?.match(/^(\d{6})/);
      const otp = otpMatch ? otpMatch[1] : null;
      capturedEmails.push({ ...body, otp });
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'mock-msg-' + Date.now() }),
      };
    }
    return originalFetch(url, options);
  };

  process.env.RESEND_API_KEY = 're_mock_test_key_1234567890';

  // Setup test Express app with real session middleware
  const app = express();
  app.use(express.json());
  app.use(
    session({
      name: 'closetbrain.sid',
      secret: 'auth_route_test_session_secret_123456',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );
  app.use('/api/auth', authRoutes);

  let server;
  let baseUrl;

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  const timestamp = Date.now();
  const testEmail = `route_test_${timestamp}@closetbrain.test`;
  const legacyEmail = `legacy_${timestamp}@closetbrain.test`;
  const resetEmail = `reset_user_${timestamp}@closetbrain.test`;
  const failSignupEmail = `fail_signup_${timestamp}@closetbrain.test`;
  const sandboxEmail = `sandbox_${timestamp}@randominbox.test`;
  const prodRejectEmail = `prod_reject_${timestamp}@randominbox.test`;

  try {
    // ------------------------------------------------------------------------
    // Suite 1: Signup Flow & No Session
    // ------------------------------------------------------------------------
    console.log('Suite 1: Signup Flow & No Session on Signup');
    {
      const res = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Route Tester',
          email: testEmail,
          password: 'Password123!',
        }),
      });

      const data = await res.json();
      const cookie = res.headers.get('set-cookie');

      assert(res.status === 201, 'Signup returns 201 Created');
      assert(data.needsVerification === true, 'Response flags needsVerification: true');
      assert(data.email === testEmail, 'Response returns user email');
      assert(!data.user, 'Response does NOT return full user object');
      assert(!cookie || !cookie.includes('closetbrain.sid'), 'No authenticated session cookie established on signup');

      // Check DB state
      const dbUser = await User.findOne({ email: testEmail });
      assert(dbUser !== null, 'User created in MongoDB');
      assert(dbUser.isEmailVerified === false, 'User isEmailVerified initialized to false');
      assert(dbUser.verificationOtpHash !== null, 'verificationOtpHash populated in DB');
      assert(capturedEmails.length === 1, 'Verification email dispatched via email service');
      assert(capturedEmails[0].to[0] === testEmail, 'Email dispatched to correct recipient');
      assert(capturedEmails[0].otp !== null && capturedEmails[0].otp.length === 6, 'Email contained 6-digit OTP');

      // Validation rejections
      const badPassRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Short', email: 'short@test.com', password: '123' }),
      });
      assert(badPassRes.status === 400, 'Signup rejects short password with 400');

      const dupRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Dup', email: testEmail, password: 'Password123!' }),
      });
      assert(dupRes.status === 200 || dupRes.status === 409 || dupRes.status === 429, 'Duplicate signup safely handled');
    }

    // ------------------------------------------------------------------------
    // Suite 2: Unverified Login Rejection
    // ------------------------------------------------------------------------
    console.log('\nSuite 2: Unverified Login Rejection');
    {
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'Password123!' }),
      });

      const data = await loginRes.json();
      const cookie = loginRes.headers.get('set-cookie');

      assert(loginRes.status === 403, 'Unverified login returns 403 Forbidden');
      assert(data.needsVerification === true, 'Login response flags needsVerification: true');
      assert(data.email === testEmail, 'Login response provides email for verification');
      assert(!cookie || !cookie.includes('closetbrain.sid'), 'No session established for unverified user');
    }

    // ------------------------------------------------------------------------
    // Suite 3: Resend Verification Anti-Enumeration & Cooldown Hardening
    // ------------------------------------------------------------------------
    console.log('\nSuite 3: Resend Verification Anti-Enumeration & Cooldown Hardening');
    {
      // 1. Resend for non-existent email
      const fakeRes = await fetch(`${baseUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody_123456789@closetbrain.test' }),
      });
      const fakeData = await fakeRes.json();
      assert(fakeRes.status === 200, 'Non-existent email resend returns 200 generic success');

      // 2. Resend for existing unverified account in cooldown (first signup OTP was sent < 60s ago)
      const earlyRes = await fetch(`${baseUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });
      const earlyData = await earlyRes.json();
      assert(earlyRes.status === 200, 'Existing unverified email in cooldown returns 200 (does not leak 429)');
      assert(earlyData.message === fakeData.message, 'Message is identical for unverified and non-existent accounts');

      // Verify no extra email was dispatched during cooldown
      assert(capturedEmails.length === 1, 'Atomic cooldown prevented duplicate email dispatch');

      // 3. Resend for existing verified account (created for test)
      const verifiedUser = await User.create({
        name: 'Already Verified',
        email: `verified_${timestamp}@closetbrain.test`,
        passwordHash: 'dummy_hash',
        isEmailVerified: true,
      });

      const verifiedRes = await fetch(`${baseUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifiedUser.email }),
      });
      const verifiedData = await verifiedRes.json();
      assert(verifiedRes.status === 200, 'Verified email resend returns 200 (does not leak verified status)');
      assert(verifiedData.message === fakeData.message, 'Message is identical across all account states');
    }

    // ------------------------------------------------------------------------
    // Suite 4: Email Verification & Session Establishment
    // ------------------------------------------------------------------------
    console.log('\nSuite 4: Email Verification & Session Establishment');
    let sessionCookie = '';
    {
      const currentOtp = capturedEmails[0].otp;

      // Submit wrong OTP
      const wrongRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, otp: '000000' }),
      });
      const wrongData = await wrongRes.json();
      assert(wrongRes.status === 400, 'Wrong OTP rejected with 400');
      assert(wrongData.attemptsRemaining === 4, 'Reports 4 attempts remaining');

      // Submit malformed OTP
      const malformedRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, otp: 'abc' }),
      });
      assert(malformedRes.status === 400, 'Malformed OTP rejected with 400');

      // Submit correct OTP
      const correctRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, otp: currentOtp }),
      });
      const correctData = await correctRes.json();
      const rawCookie = correctRes.headers.get('set-cookie');

      assert(correctRes.status === 200, 'Correct OTP verified with 200 OK');
      assert(correctData.user && correctData.user.email === testEmail, 'Returns safe user object');
      assert(correctData.user.passwordHash === undefined, 'passwordHash strictly omitted');
      assert(correctData.user.verificationOtpHash === undefined, 'verificationOtpHash strictly omitted');
      assert(Boolean(rawCookie && rawCookie.includes('closetbrain.sid')), 'Session cookie established on verify');

      sessionCookie = rawCookie.split(';')[0];

      // Replay attack: re-submitting the same code must fail
      const replayRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, otp: currentOtp }),
      });
      assert(replayRes.status === 400, 'Re-submitting consumed code rejected with 400');
    }

    // ------------------------------------------------------------------------
    // Suite 5: Authenticated /me and Logout
    // ------------------------------------------------------------------------
    console.log('\nSuite 5: Authenticated /me and Logout');
    {
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: sessionCookie },
      });
      const meData = await meRes.json();
      assert(meRes.status === 200, '/me returns 200 OK');
      assert(meData.user?.email === testEmail, '/me returns authenticated user');
      assert(meData.user.passwordHash === undefined, '/me strictly redacts passwordHash');
      assert(meData.user.verificationOtpHash === undefined, '/me strictly redacts verificationOtpHash');

      // Logout
      const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Cookie: sessionCookie },
      });
      assert(logoutRes.status === 200, 'Logout returns 200 OK');

      // Verify session terminated
      const afterLogoutRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: sessionCookie },
      });
      const afterLogoutData = await afterLogoutRes.json();
      assert(afterLogoutData.user === null, 'After logout, /me returns user: null');
    }

    // ------------------------------------------------------------------------
    // Suite 6: Verified Login & Legacy User Compatibility
    // ------------------------------------------------------------------------
    console.log('\nSuite 6: Verified Login & Legacy User Compatibility');
    {
      // 1. Verified user logs in successfully
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'Password123!' }),
      });
      assert(loginRes.status === 200, 'Verified user login succeeds with 200 OK');

      // 2. Legacy user with isEmailVerified: undefined
      const legacyUser = new User({
        name: 'Legacy User',
        email: legacyEmail,
        passwordHash: await bcrypt.hash('LegacyPass123!', 12),
      });
      // Ensure isEmailVerified is undefined
      legacyUser.isEmailVerified = undefined;
      await legacyUser.save();

      const legacyLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: legacyEmail, password: 'LegacyPass123!' }),
      });
      const legacyData = await legacyLoginRes.json();
      assert(legacyLoginRes.status === 200, 'Legacy user (isEmailVerified: undefined) logs in without lockout');
      assert(legacyData.user?.email === legacyEmail, 'Legacy login returns safe user object');
    }

    // ------------------------------------------------------------------------
    // Suite 7: Forgot Password & Anti-Enumeration
    // ------------------------------------------------------------------------
    console.log('\nSuite 7: Forgot Password & Anti-Enumeration');
    let resetCode = null;
    {
      // Create user for reset test
      const rUser = await User.create({
        name: 'Reset User',
        email: resetEmail,
        passwordHash: await bcrypt.hash('OldPassword123!', 12),
        isEmailVerified: true,
      });

      // Request password reset for existing user
      capturedEmails.length = 0; // Clear email buffer
      const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const forgotData = await forgotRes.json();

      assert(forgotRes.status === 200, 'Forgot password returns 200 OK');
      assert(
        forgotData.message.includes('If an account exists with this email'),
        'Returns generic anti-enumeration message'
      );
      assert(capturedEmails.length === 1, 'Password reset email dispatched');
      resetCode = capturedEmails[0].otp;
      assert(resetCode !== null && resetCode.length === 6, 'Reset email contains 6-digit OTP');

      // Request password reset for non-existent user
      const nonExistentRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'doesnotexist_987654@closetbrain.test' }),
      });
      const nonExistentData = await nonExistentRes.json();

      assert(nonExistentRes.status === 200, 'Non-existent email returns 200 OK');
      assert(
        nonExistentData.message === forgotData.message,
        'Exact same response message returned for existent and non-existent accounts'
      );

      // Request password reset for existing user while in active cooldown (<60s)
      const earlyForgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const earlyForgotData = await earlyForgotRes.json();

      assert(earlyForgotRes.status === 200, 'Existing email in cooldown returns 200 OK (does not leak 429)');
      assert(
        earlyForgotData.message === forgotData.message,
        'Exact same response message returned during cooldown'
      );
      assert(capturedEmails.length === 1, 'No duplicate reset email dispatched during cooldown');
    }

    // ------------------------------------------------------------------------
    // Suite 8: Pre-validation & Flow Cross-Contamination
    // ------------------------------------------------------------------------
    console.log('\nSuite 8: Pre-validation & Cross-Flow Defense');
    {
      // Reset OTP cannot verify signup
      const crossRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp: resetCode }),
      });
      assert(crossRes.status === 400, 'Reset OTP cannot be used to verify email (cross-flow defense)');

      // Pre-validation endpoint check
      const preValRes = await fetch(`${baseUrl}/api/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp: resetCode }),
      });
      assert(preValRes.status === 200, 'Pre-validation of reset code returns 200 OK');
    }

    // ------------------------------------------------------------------------
    // Suite 9: Reset Password & Session Invalidation
    // ------------------------------------------------------------------------
    console.log('\nSuite 9: Reset Password & Session Invalidation');
    {
      // Log in as reset user first to establish an active session
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, password: 'OldPassword123!' }),
      });
      const resetUserCookie = loginRes.headers.get('set-cookie').split(';')[0];

      // Submit password reset
      const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          otp: resetCode,
          newPassword: 'BrandNewPassword123!',
        }),
      });
      const resetData = await resetRes.json();

      assert(resetRes.status === 200, 'Password reset returns 200 OK');
      assert(resetData.message.includes('Password has been reset successfully'), 'Confirms password reset');

      // Verify old session was invalidated
      const meCheck = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: resetUserCookie },
      });
      const meCheckData = await meCheck.json();
      assert(meCheckData.user === null, 'Previous session was invalidated upon password reset');

      // Verify old password no longer works
      const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, password: 'OldPassword123!' }),
      });
      assert(oldLoginRes.status === 401, 'Old password rejected after reset');

      // Verify new password works
      const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, password: 'BrandNewPassword123!' }),
      });
      assert(newLoginRes.status === 200, 'New password logs in successfully');
    }

    // ------------------------------------------------------------------------
    // Suite 10: Email Delivery Failure Rollback on Signup
    // ------------------------------------------------------------------------
    console.log('\nSuite 10: Email Delivery Failure Rollback on Signup');
    {
      emailBehavior = 'server_error';

      const failRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Fail User',
          email: failSignupEmail,
          password: 'Password123!',
        }),
      });

      assert(failRes.status === 502, 'Signup returns 502 on email delivery failure');

      // Check DB: account was deleted so user is not stuck with unusable account
      const orphanCheck = await User.findOne({ email: failSignupEmail });
      assert(orphanCheck === null, 'Unusable unverified account deleted on email delivery failure');

      emailBehavior = 'success';
    }

    // ------------------------------------------------------------------------
    // Suite 11: Resend Provider Behavior & Sandbox Dev Fallback
    // ------------------------------------------------------------------------
    console.log('\nSuite 11: Resend Provider Behavior & Sandbox Dev Fallback');
    {
      // 1. Provider Success
      emailBehavior = 'success';
      const successRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Success User',
          email: `success_${timestamp}@closetbrain.test`,
          password: 'Password123!',
        }),
      });
      const successData = await successRes.json();
      assert(successRes.status === 201, 'Provider success returns 201 Created');
      assert(successData.devFallback === false, 'Provider success flags devFallback: false');
      assert(successData.message.includes('check your email'), 'Provider success message confirms email dispatched');

      // 2. Development Sandbox Restriction (403 from Resend in development)
      emailBehavior = 'sandbox_restriction';
      process.env.NODE_ENV = 'development';

      const sandboxRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Sandbox User',
          email: sandboxEmail,
          password: 'Password123!',
        }),
      });
      const sandboxData = await sandboxRes.json();
      assert(sandboxRes.status === 201, 'Sandbox restriction in dev returns 201 Created');
      assert(sandboxData.needsVerification === true, 'Sandbox user requires verification');
      assert(sandboxData.devFallback === true, 'Sandbox restriction flags devFallback: true');
      assert(sandboxData.devNotice !== undefined, 'Sandbox response includes devNotice');
      assert(
        !sandboxData.message.includes('Please check your email for a 6-digit verification code'),
        'Sandbox response does NOT falsely claim email was delivered'
      );
      assert(
        sandboxData.message.toLowerCase().includes('terminal') || sandboxData.message.toLowerCase().includes('sandbox'),
        'Sandbox message explains terminal/sandbox fallback'
      );

      // Verify unverified DB state
      const sandboxUser = await User.findOne({ email: sandboxEmail });
      assert(sandboxUser !== null, 'Sandbox user created in DB');
      assert(sandboxUser.isEmailVerified === false, 'Sandbox user remains unverified until OTP check');

      // 3. Sandbox Restriction in Production (Must strictly reject without dev fallback or leaks)
      process.env.NODE_ENV = 'production';
      const prodRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Prod Reject User',
          email: prodRejectEmail,
          password: 'Password123!',
        }),
      });
      const prodData = await prodRes.json();
      assert(prodRes.status === 502, 'Sandbox restriction in production returns 502 Bad Gateway');
      assert(prodData.devFallback === undefined || prodData.devFallback === false, 'Production never returns devFallback: true');
      assert(prodData.devNotice === undefined, 'Production never returns devNotice');

      const prodOrphanCheck = await User.findOne({ email: prodRejectEmail });
      assert(prodOrphanCheck === null, 'Failed production signup rolls back and deletes unverified user');

      // Reset environment
      process.env.NODE_ENV = 'test';
      emailBehavior = 'success';
    }
  } finally {
    // Teardown
    globalThis.fetch = originalFetch;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await User.deleteMany({
      email: {
        $in: [
          testEmail,
          legacyEmail,
          resetEmail,
          failSignupEmail,
          sandboxEmail,
          prodRejectEmail,
          `success_${timestamp}@closetbrain.test`,
          `verified_${timestamp}@closetbrain.test`,
        ],
      },
    });
  }

  console.log('\n=== AUTH ROUTE VERIFICATION SUMMARY ===');
  console.log(`Total Assertions: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAuthRouteTests()
  .then(() => {
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error('Fatal route test error:', err);
    mongoose.connection.close();
    process.exit(1);
  });
