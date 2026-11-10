import {
  sendEmail,
  sendSignupVerificationEmail,
  sendPasswordResetEmail,
  isEmailConfigured,
  getSafeEmailStatus,
  maskEmail,
  EmailServiceError,
} from './emailService.js';

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

async function assertRejects(promise, expectedSubstring, message) {
  try {
    await promise;
    fail(message, new Error(`Expected promise to reject, but it resolved successfully.`));
  } catch (err) {
    if (expectedSubstring && !err.message.toLowerCase().includes(expectedSubstring.toLowerCase())) {
      fail(message, new Error(`Expected error containing "${expectedSubstring}", got "${err.message}"`));
    } else {
      pass(message, `Rejection caught: ${err.message}`);
    }
  }
}

async function runEmailServiceTests() {
  console.log('\n=== ClosetBrain Auth Phase 1: Resend Email Service Verification ===\n');

  // Save original globals and environment
  const originalFetch = globalThis.fetch;
  const originalEnvApiKey = process.env.RESEND_API_KEY;
  const originalEnvFrom = process.env.EMAIL_FROM;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    // -------------------------------------------------------------
    console.log('Suite 1: Configuration & Masking Utilities');
    // -------------------------------------------------------------
    {
      const masked1 = maskEmail('elena.vance@closetbrain.ai');
      assert(masked1 === 'el***@closetbrain.ai', 'Masks standard email correctly');

      const masked2 = maskEmail('a@test.com');
      assert(masked2 === 'a***@test.com', 'Masks single character local part correctly');

      const maskedInvalid = maskEmail('not-an-email');
      assert(maskedInvalid === '***', 'Handles invalid email safely without throwing');

      const status = getSafeEmailStatus();
      assert(typeof status.configured === 'boolean', 'Status reports configured boolean');
      assert(typeof status.from === 'string', 'Status reports from sender address');
      assert(status.apiKey === undefined, 'Status strictly omits API key secret');
    }

    // -------------------------------------------------------------
    console.log('\nSuite 2: Input Parameter Validation');
    // -------------------------------------------------------------
    {
      await assertRejects(
        sendEmail({ to: '', subject: 'Test', html: '<p>Hi</p>' }),
        'Invalid recipient email',
        'Rejects empty recipient address with 400'
      );

      await assertRejects(
        sendEmail({ to: 'not-an-email', subject: 'Test', html: '<p>Hi</p>' }),
        'Invalid recipient email',
        'Rejects malformed recipient address with 400'
      );

      await assertRejects(
        sendSignupVerificationEmail({ to: 'user@example.com', otp: '' }),
        'valid verification code is required',
        'Rejects signup email when OTP is missing'
      );

      await assertRejects(
        sendPasswordResetEmail({ to: 'user@example.com', otp: '' }),
        'valid password reset code is required',
        'Rejects password reset email when OTP is missing'
      );
    }

    // -------------------------------------------------------------
    console.log('\nSuite 3: Missing Configuration Handling (Dev vs Prod)');
    // -------------------------------------------------------------
    {
      // Temporarily remove API key
      delete process.env.RESEND_API_KEY;

      // In development: should fall back gracefully
      process.env.NODE_ENV = 'development';
      const devRes = await sendEmail({
        to: 'dev.user@example.com',
        subject: 'Dev Test',
        html: '<p>Dev</p>',
        otp: '123456',
        purpose: 'dev_test',
      });
      assert(devRes.success === true, 'Dev mode succeeds on missing key');
      assert(devRes.devFallback === true, 'Dev mode flags devFallback: true');
      assert(devRes.messageId === 'dev-fallback-missing-key', 'Dev mode returns mock fallback ID');

      // In production: MUST throw 500 and never fall back
      process.env.NODE_ENV = 'production';
      await assertRejects(
        sendEmail({
          to: 'prod.user@example.com',
          subject: 'Prod Test',
          html: '<p>Prod</p>',
          otp: '123456',
          purpose: 'prod_test',
        }),
        'service is not configured',
        'Production mode strictly throws 500 when API key is missing'
      );

      // Restore dummy key for subsequent mocked tests
      process.env.RESEND_API_KEY = 're_test_mock_secret_key_12345';
      process.env.EMAIL_FROM = 'ClosetBrain <test@resend.dev>';
      process.env.NODE_ENV = 'development';
    }

    // -------------------------------------------------------------
    console.log('\nSuite 4: Successful Delivery (Mocked Resend HTTP 200)');
    // -------------------------------------------------------------
    {
      let capturedRequest = null;

      globalThis.fetch = async (url, options) => {
        capturedRequest = {
          url: url.toString(),
          method: options.method,
          headers: options.headers,
          body: JSON.parse(options.body),
        };

        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'resend_msg_test_abc123' }),
        };
      };

      // Test Signup Verification
      const signupRes = await sendSignupVerificationEmail({
        to: 'elena@closetbrain.ai',
        name: 'Elena Vance',
        otp: '782341',
        expiresInMinutes: 10,
      });

      assert(signupRes.success === true, 'Signup verification email returns success');
      assert(signupRes.messageId === 'resend_msg_test_abc123', 'Returns Resend message ID');
      assert(signupRes.devFallback === false, 'devFallback is false on successful live call');
      assert(capturedRequest.url === 'https://api.resend.com/emails', 'Sends to Resend REST API URL');
      assert(capturedRequest.headers.Authorization.includes('Bearer re_test_mock_secret_key_12345'), 'Includes Bearer authorization header');
      assert(capturedRequest.body.to[0] === 'elena@closetbrain.ai', 'Recipient matches');
      assert(capturedRequest.body.subject.includes('782341'), 'Subject includes OTP');
      assert(capturedRequest.body.html.includes('Elena Vance'), 'HTML includes recipient name');
      assert(capturedRequest.body.html.includes('782341'), 'HTML includes 6-digit OTP code');
      assert(capturedRequest.body.html.includes('#5B1924'), 'HTML includes ClosetBrain burgundy brand color');
      assert(capturedRequest.body.text.includes('782341'), 'Text version includes OTP');

      // Test Password Reset
      const resetRes = await sendPasswordResetEmail({
        to: 'elena@closetbrain.ai',
        name: 'Elena Vance',
        otp: '918273',
      });

      assert(resetRes.success === true, 'Password reset email returns success');
      assert(capturedRequest.body.subject.includes('918273'), 'Password reset subject includes OTP');
      assert(capturedRequest.body.html.includes('Reset Your Password'), 'HTML reflects password reset template');
    }

    // -------------------------------------------------------------
    console.log('\nSuite 5: Resend Sandbox Restriction Handling (Dev vs Prod)');
    // -------------------------------------------------------------
    {
      const sandboxErrorMessage =
        'You can only send testing emails to your own email address (owner@closetbrain.ai). To send to other domains, verify your domain at resend.com/domains.';

      globalThis.fetch = async () => {
        return {
          ok: false,
          status: 403,
          json: async () => ({
            statusCode: 403,
            message: sandboxErrorMessage,
            name: 'validation_error',
          }),
        };
      };

      // In development: intercepts sandbox restriction and falls back to console gracefully
      process.env.NODE_ENV = 'development';
      const devSandboxRes = await sendSignupVerificationEmail({
        to: 'other.unregistered.user@external.com',
        otp: '654321',
      });

      assert(devSandboxRes.success === true, 'Dev mode intercepts sandbox 403 without failing');
      assert(devSandboxRes.devFallback === true, 'Flags devFallback: true on sandbox restriction');
      assert(devSandboxRes.messageId === 'dev-fallback-sandbox-restriction', 'Returns sandbox restriction messageId');

      // In production: MUST throw and must never fall back
      process.env.NODE_ENV = 'production';
      await assertRejects(
        sendSignupVerificationEmail({
          to: 'other.unregistered.user@external.com',
          otp: '654321',
        }),
        'Failed to deliver email',
        'Production mode strictly throws on Resend 403 rejection'
      );
    }

    // -------------------------------------------------------------
    console.log('\nSuite 6: Provider Server Errors (500, 429)');
    // -------------------------------------------------------------
    {
      globalThis.fetch = async () => {
        return {
          ok: false,
          status: 500,
          json: async () => ({
            statusCode: 500,
            message: 'Internal Resend infrastructure failure',
          }),
        };
      };

      process.env.NODE_ENV = 'production';
      await assertRejects(
        sendEmail({
          to: 'user@example.com',
          subject: 'Error test',
          html: '<p>test</p>',
        }),
        'Failed to deliver email',
        'Throws EmailServiceError on provider 500 error in production'
      );
    }

    console.log('\n=== EMAIL SERVICE VERIFICATION SUMMARY ===');
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}\n`);

    if (results.failed > 0) {
      process.exit(1);
    }
  } finally {
    // Restore original globals and environment
    globalThis.fetch = originalFetch;
    if (originalEnvApiKey) {
      process.env.RESEND_API_KEY = originalEnvApiKey;
    } else {
      delete process.env.RESEND_API_KEY;
    }
    if (originalEnvFrom) {
      process.env.EMAIL_FROM = originalEnvFrom;
    } else {
      delete process.env.EMAIL_FROM;
    }
    if (originalNodeEnv) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  }
}

runEmailServiceTests();