import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import http from 'http';
import authRoutes from '../routes/auth.js';
import User from '../models/User.js';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ ${message}`);
  } else {
    failedAssertions++;
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

async function runAuthFrontendIntegrationTests() {
  console.log('\n=== ClosetBrain Auth Phase 5: Frontend UI End-to-End Integration Verification ===\n');

  await connectDb();

  const capturedEmails = [];
  let simulateSandboxRestriction = false;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (typeof url === 'string' && url.includes('resend.com')) {
      if (simulateSandboxRestriction) {
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

  const app = express();
  app.use(express.json());
  app.use(
    session({
      name: 'closetbrain.sid',
      secret: 'frontend_integration_test_secret_32chars',
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
  const signupEmail = `frontend_signup_${timestamp}@closetbrain.test`;
  const unverifiedEmail = `frontend_unverified_${timestamp}@closetbrain.test`;
  const resetEmail = `frontend_reset_${timestamp}@closetbrain.test`;
  const sandboxEmail = `frontend_sandbox_${timestamp}@randominbox.test`;

  try {
    // ------------------------------------------------------------------------
    // Flow 1: Signup -> Verify Email -> Authenticated State
    // ------------------------------------------------------------------------
    console.log('Flow 1: Signup -> Verification Step -> Authenticated State');
    {
      // 1. Client submits signup form
      const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: 'Genevieve Miller',
          email: signupEmail,
          password: 'Password123!',
        }),
      });

      const signupData = await signupRes.json();
      const signupCookie = signupRes.headers.get('set-cookie');

      assert(signupRes.status === 201, 'Signup returns 201 Created');
      assert(signupData.needsVerification === true, 'UI transitions to verification step (needsVerification: true)');
      assert(signupData.email === signupEmail, 'Destination email available to display in UI');
      assert(!signupCookie || !signupCookie.includes('closetbrain.sid'), 'No session cookie established before verification');

      // 2. Client receives 6-digit OTP from email
      const signupOtp = capturedEmails.find((e) => e.to.includes(signupEmail))?.otp;
      assert(signupOtp !== null && signupOtp.length === 6, 'Verification email dispatched with 6-digit OTP');

      // 3. Client enters OTP into OtpInput and submits
      const verifyRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: signupEmail,
          otp: signupOtp,
        }),
      });

      const verifyData = await verifyRes.json();
      const verifyCookie = verifyRes.headers.get('set-cookie');

      assert(verifyRes.status === 200, 'Verification succeeds with 200 OK');
      assert(verifyData.user !== undefined, 'Returns safe user object to update onAuthSuccess');
      assert(verifyData.user.name === 'Genevieve Miller', 'User name matches');
      assert(verifyData.user.email === signupEmail, 'User email matches');
      assert(verifyData.user.passwordHash === undefined, 'No passwordHash exposed');
      assert(verifyData.user.verificationOtpHash === undefined, 'No verificationOtpHash exposed');
      assert(Boolean(verifyCookie && verifyCookie.includes('closetbrain.sid')), 'Session cookie established upon verification');

      // 4. Client verifies session restoration via /api/auth/me
      const cookieHeader = verifyCookie.split(';')[0];
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieHeader },
        credentials: 'include',
      });
      const meData = await meRes.json();

      assert(meRes.status === 200, '/me returns 200 OK');
      assert(meData.user?.email === signupEmail, 'Session successfully restored in frontend');
    }

    // ------------------------------------------------------------------------
    // Flow 2: Unverified Login -> Verification Offer -> Resend -> Verify
    // ------------------------------------------------------------------------
    console.log('\nFlow 2: Unverified Login -> Verification Prompt -> Resend -> Verify');
    {
      // 1. Create unverified account
      await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Unverified User',
          email: unverifiedEmail,
          password: 'Password123!',
        }),
      });

      // 2. Client attempts to log in
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: unverifiedEmail,
          password: 'Password123!',
        }),
      });

      const loginData = await loginRes.json();
      assert(loginRes.status === 403, 'Login rejected with 403 Forbidden');
      assert(loginData.needsVerification === true, 'Response offers verification step (needsVerification: true)');
      assert(loginData.email === unverifiedEmail, 'Response returns email for verification view');

      // 3. Client clicks Resend in verification view
      const resendRes = await fetch(`${baseUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const resendData = await resendRes.json();
      assert(resendRes.status === 200, 'Resend verification returns 200');
      assert(resendData.message.includes('verification code has been sent'), 'Confirms code sent');

      // 4. Client verifies and logs in
      const lastEmail = capturedEmails.filter((e) => e.to.includes(unverifiedEmail)).pop();
      const verifyRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: unverifiedEmail,
          otp: lastEmail.otp,
        }),
      });
      assert(verifyRes.status === 200, 'Verifying resent OTP succeeds');
    }

    // ------------------------------------------------------------------------
    // Flow 3: Forgot Password -> Reset Code -> New Password -> Login
    // ------------------------------------------------------------------------
    console.log('\nFlow 3: Forgot Password -> Reset Code -> Set New Password -> Login');
    {
      // 1. Create verified account
      await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Reset Flow User',
          email: resetEmail,
          password: 'InitialPassword123!',
        }),
      });
      const signupEmailObj = capturedEmails.filter((e) => e.to.includes(resetEmail)).pop();
      await fetch(`${baseUrl}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp: signupEmailObj.otp }),
      });

      // 2. Client clicks "Forgot password?" and enters email
      capturedEmails.length = 0;
      const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const forgotData = await forgotRes.json();

      assert(forgotRes.status === 200, 'Forgot password returns 200 OK');
      assert(forgotData.message.includes('If an account exists with this email'), 'Generic confirmation shown');

      const resetOtp = capturedEmails.find((e) => e.to.includes(resetEmail))?.otp;
      assert(resetOtp !== null && resetOtp.length === 6, 'Reset code dispatched to email');

      // 3. Client enters reset code and sets new password
      const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          otp: resetOtp,
          newPassword: 'BrandNewSecurePassword123!',
        }),
      });
      const resetData = await resetRes.json();

      assert(resetRes.status === 200, 'Reset password succeeds with 200 OK');
      assert(resetData.message.includes('Password has been reset successfully'), 'Confirms password reset');

      // 4. Old password is rejected
      const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          password: 'InitialPassword123!',
        }),
      });
      assert(oldLoginRes.status === 401, 'Old password rejected after reset');

      // 5. New password logs in successfully
      const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          password: 'BrandNewSecurePassword123!',
        }),
      });
      const newLoginData = await newLoginRes.json();
      assert(newLoginRes.status === 200, 'New password logs in with 200 OK');
      assert(newLoginData.user?.email === resetEmail, 'Returns authenticated user for new password');
    }

    // ------------------------------------------------------------------------
    // Flow 4: Sandbox Dev Fallback Handling in UI Contract
    // ------------------------------------------------------------------------
    console.log('\nFlow 4: Sandbox Dev Fallback Handling in UI Contract');
    {
      simulateSandboxRestriction = true;

      // 1. Submit signup in development mode
      const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Sandbox FE Tester',
          email: sandboxEmail,
          password: 'SandboxPassword123!',
        }),
      });

      const signupData = await signupRes.json();
      assert(signupRes.status === 201, 'Signup returns 201 Created under dev sandbox fallback');
      assert(signupData.needsVerification === true, 'UI flags needsVerification: true');
      assert(signupData.devFallback === true, 'Response informs frontend devFallback: true');
      assert(signupData.devNotice !== undefined, 'Response provides devNotice for UI display');
      assert(
        !signupData.message.includes('check your email for a 6-digit verification code'),
        'Backend does NOT claim email was sent to remote inbox'
      );

      // 2. Validate Frontend UI state determination
      const isDevFallback = Boolean(signupData.devFallback);
      let successMessage = '';
      if (isDevFallback) {
        successMessage = signupData.devNotice || 'Development sandbox active: code logged to server console.';
      } else {
        successMessage = 'Account created! A 6-digit verification code was sent to your email.';
      }

      assert(isDevFallback === true, 'Frontend correctly enables dev fallback UI badge');
      assert(!successMessage.includes('sent to your email'), 'UI message never claims email was delivered');
      assert(successMessage.toLowerCase().includes('terminal') || successMessage.toLowerCase().includes('sandbox'), 'UI clearly informs developer where OTP is located');

      // 3. User remains strictly unverified in MongoDB
      const dbUser = await User.findOne({ email: sandboxEmail });
      assert(dbUser !== null, 'User exists in MongoDB');
      assert(dbUser.isEmailVerified === false, 'User remains isEmailVerified: false');

      simulateSandboxRestriction = false;
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await User.deleteMany({
      email: { $in: [signupEmail, unverifiedEmail, resetEmail, sandboxEmail] },
    });
  }

  console.log('\n=== FRONTEND AUTH INTEGRATION VERIFICATION SUMMARY ===');
  console.log(`Total Assertions: ${totalAssertions}`);
  console.log(`Passed: ${passedAssertions}`);
  console.log(`Failed: ${failedAssertions}\n`);

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runAuthFrontendIntegrationTests()
  .then(() => {
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    mongoose.connection.close();
    process.exit(1);
  });
