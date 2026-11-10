import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import {
  sendSignupVerificationOtp,
  resendSignupVerificationOtp,
  verifySignupOtp,
  requestPasswordResetOtp,
  resendPasswordResetOtp,
  verifyPasswordResetOtp,
  isValidOtpFormat,
  OtpServiceError,
} from '../services/otpService.js';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Middleware to verify database connectivity before database operations
 */
const requireDb = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error:
        'MongoDB database is currently unreachable. Please check your database connection.',
    });
  }
  next();
};

/**
 * Helper to safely invalidate all persisted sessions for a user in MongoDB
 * and in the active sessionStore (including test MemoryStore).
 */
async function invalidateUserSessions(req, userId) {
  const uid = userId.toString();

  // 1. Invalidate sessions in MongoDB session collection
  try {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.collection('sessions').deleteMany({
        $or: [
          { session: { $regex: `"userId":"${uid}"` } },
          { 'session.userId': uid },
        ],
      });
    }
  } catch (err) {
    console.warn('MongoDB session invalidation warning:', err.message);
  }

  // 2. Invalidate in active session store if accessible (handles MemoryStore in dev/tests)
  if (req?.sessionStore && typeof req.sessionStore.all === 'function') {
    req.sessionStore.all((err, sessions) => {
      if (!err && sessions) {
        for (const [sid, sess] of Object.entries(sessions)) {
          if (sess?.userId === uid || sess?.userId?.toString() === uid) {
            req.sessionStore.destroy(sid, () => {});
          }
        }
      }
    });
  }
}

// ----------------------------------------------------------------------------
// 1. POST /api/auth/signup
// ----------------------------------------------------------------------------
router.post('/signup', requireDb, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate fields presence and format
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Please provide a valid full name.' });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters in length.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing account
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      // If user is already verified (or legacy), prompt login
      if (existingUser.isEmailVerified !== false) {
        return res.status(409).json({
          error: 'An account with this email address already exists. Please log in instead.',
        });
      }

      // If user exists but is unverified, re-issue OTP
      try {
        const otpResult = await resendSignupVerificationOtp({ userId: existingUser._id.toString() });
        const isDevFallback = Boolean(otpResult?.devFallback);
        return res.status(200).json({
          message: isDevFallback
            ? 'An unverified account with this email exists. In development sandbox mode, external email delivery is restricted; your 6-digit verification code has been logged to the server terminal.'
            : 'An unverified account with this email exists. A verification code has been sent.',
          email: existingUser.email,
          needsVerification: true,
          devFallback: isDevFallback,
          ...(isDevFallback
            ? {
                devNotice:
                  'Development sandbox active: email delivery was restricted to the verified Resend domain owner. Your 6-digit verification code has been logged to the backend terminal.',
              }
            : {}),
        });
      } catch (otpErr) {
        if (otpErr instanceof OtpServiceError && otpErr.code === 'COOLDOWN_ACTIVE') {
          return res.status(429).json({
            error: otpErr.message,
            retryAfterSeconds: otpErr.details?.retryAfter,
            needsVerification: true,
            email: existingUser.email,
          });
        }
        return res.status(409).json({
          error: 'An unverified account with this email already exists. Please verify your code or try again later.',
          needsVerification: true,
          email: existingUser.email,
        });
      }
    }

    // Hash password with bcrypt
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user record in unverified state
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      isEmailVerified: false,
    });

    // Issue and dispatch verification OTP via email
    let otpResult;
    try {
      otpResult = await sendSignupVerificationOtp({
        userId: user._id.toString(),
      });
    } catch (emailErr) {
      // If email delivery fails, remove the newly created unverified account
      // so the user is not locked out with an unusable account
      await User.deleteOne({ _id: user._id });
      console.error('Signup verification email delivery error:', emailErr?.message || emailErr);
      return res.status(502).json({
        error: 'Failed to deliver verification email. Please try signing up again.',
      });
    }

    const isDevFallback = Boolean(otpResult?.devFallback);

    // Note: No session is created until verification succeeds
    return res.status(201).json({
      message: isDevFallback
        ? 'Account created. In development sandbox mode, external email delivery is restricted; your 6-digit verification code has been logged to the server terminal.'
        : 'Account created. Please check your email for a 6-digit verification code.',
      email: user.email,
      needsVerification: true,
      devFallback: isDevFallback,
      ...(isDevFallback
        ? {
            devNotice:
              'Development sandbox active: email delivery was restricted to the verified Resend domain owner. Your 6-digit verification code has been printed to the backend terminal.',
          }
        : {}),
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ----------------------------------------------------------------------------
// 2. POST /api/auth/verify-email (alias: /verify-signup-otp)
// ----------------------------------------------------------------------------
const verifyEmailHandler = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!otp || typeof otp !== 'string' || !isValidOtpFormat(otp)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit verification code.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
      const result = await verifySignupOtp({
        email: normalizedEmail,
        otp,
      });

      // Load verified user record
      const user = await User.findById(result.userId);
      if (!user) {
        return res.status(404).json({ error: 'User account not found.' });
      }

      // Establish authenticated session upon successful verification
      req.session.userId = user._id.toString();
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session persistence error on verify-email:', saveErr);
          return res.status(500).json({ error: 'Failed to initialize user session.' });
        }

        return res.status(200).json({
          message: 'Email verified successfully.',
          user: user.toSafeObject(),
        });
      });
    } catch (otpErr) {
      if (otpErr instanceof OtpServiceError) {
        return res.status(otpErr.status).json({
          error: otpErr.message,
          code: otpErr.code,
          attemptsRemaining: otpErr.details?.attemptsRemaining,
        });
      }
      throw otpErr;
    }
  } catch (err) {
    console.error('Verify email error:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

router.post('/verify-email', requireDb, verifyEmailHandler);
router.post('/verify-signup-otp', requireDb, verifyEmailHandler);

// ----------------------------------------------------------------------------
// 3. POST /api/auth/resend-verification (alias: /resend-signup-otp)
// ----------------------------------------------------------------------------
const resendVerificationHandler = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    let otpResult = null;
    // Strict Anti-Enumeration:
    // If user exists and is unverified, attempt atomic resend.
    // If user does not exist, is already verified, or is currently in 60s cooldown,
    // we never leak account status through different status codes or messages.
    if (user && user.isEmailVerified === false) {
      try {
        otpResult = await resendSignupVerificationOtp({ userId: user._id.toString() });
      } catch (otpErr) {
        // If in cooldown, swallow error silently to prevent account enumeration.
        // The atomic cooldown in MongoDB ensures no duplicate email is dispatched.
        if (!(otpErr instanceof OtpServiceError && otpErr.code === 'COOLDOWN_ACTIVE')) {
          throw otpErr;
        }
      }
    }

    const isDev = process.env.NODE_ENV !== 'production';
    const isDevFallback = Boolean(isDev && otpResult?.devFallback);

    // Uniform response across all cases to prevent account enumeration:
    // - Unknown email
    // - Already verified account
    // - Unverified account with fresh OTP dispatched
    // - Unverified account in 60s cooldown
    return res.status(200).json({
      message: isDevFallback
        ? 'In development sandbox mode, external email delivery is restricted; your verification code has been logged to the server terminal.'
        : 'If an unverified account exists with this email address, a verification code has been sent.',
      devFallback: isDevFallback,
      ...(isDevFallback
        ? {
            devNotice:
              'Development sandbox active: email delivery was restricted to the verified domain owner. Your 6-digit verification code has been logged to the server terminal.',
          }
        : {}),
    });
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
};

router.post('/resend-verification', requireDb, resendVerificationHandler);
router.post('/resend-signup-otp', requireDb, resendVerificationHandler);

// ----------------------------------------------------------------------------
// 4. POST /api/auth/login
// ----------------------------------------------------------------------------
router.post('/login', requireDb, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Look up user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Generic message to avoid email enumeration
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify password against hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Explicitly reject accounts where isEmailVerified === false
    // Legacy users where isEmailVerified is undefined are permitted (isVerified !== false)
    if (user.isEmailVerified === false) {
      return res.status(403).json({
        error: 'Please verify your email address before logging in.',
        needsVerification: true,
        email: user.email,
      });
    }

    // Establish server-managed session
    req.session.userId = user._id.toString();
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Session persistence error on login:', saveErr);
        return res.status(500).json({ error: 'Failed to initialize user session.' });
      }

      return res.status(200).json({
        message: 'Logged in successfully.',
        user: user.toSafeObject(),
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ----------------------------------------------------------------------------
// 5. POST /api/auth/forgot-password
// ----------------------------------------------------------------------------
router.post('/forgot-password', requireDb, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let otpResult = null;

    try {
      otpResult = await requestPasswordResetOtp({ email: normalizedEmail });
    } catch (otpErr) {
      // Strict Anti-Enumeration:
      // If the account is currently in cooldown, swallow error silently to prevent
      // account existence enumeration through 429 vs 200 status codes.
      // Cooldown is still enforced atomically in MongoDB; no duplicate email is dispatched.
      if (!(otpErr instanceof OtpServiceError && otpErr.code === 'COOLDOWN_ACTIVE')) {
        throw otpErr;
      }
    }

    const isDev = process.env.NODE_ENV !== 'production';
    const isDevFallback = Boolean(isDev && otpResult?.devFallback);

    // Always return the exact same generic 200 response to prevent account enumeration
    return res.status(200).json({
      message: isDevFallback
        ? 'In development sandbox mode, external email delivery is restricted; your password reset code has been logged to the server terminal.'
        : 'If an account exists with this email address, a password reset code has been sent.',
      devFallback: isDevFallback,
      ...(isDevFallback
        ? {
            devNotice:
              'Development sandbox active: email delivery was restricted to the verified domain owner. Your password reset code has been logged to the server terminal.',
          }
        : {}),
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ----------------------------------------------------------------------------
// 6. POST /api/auth/verify-reset-code (pre-validation step for forgot password UI)
// ----------------------------------------------------------------------------
router.post('/verify-reset-code', requireDb, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!otp || typeof otp !== 'string' || !isValidOtpFormat(otp)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit verification code.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
      await verifyPasswordResetOtp({
        email: normalizedEmail,
        otp,
        consume: false, // Pre-validate without consuming
      });

      return res.status(200).json({
        valid: true,
        message: 'Verification code is valid.',
      });
    } catch (otpErr) {
      if (otpErr instanceof OtpServiceError) {
        return res.status(otpErr.status).json({
          error: otpErr.message,
          code: otpErr.code,
          attemptsRemaining: otpErr.details?.attemptsRemaining,
        });
      }
      throw otpErr;
    }
  } catch (err) {
    console.error('Verify reset code error:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ----------------------------------------------------------------------------
// 7. POST /api/auth/reset-password
// ----------------------------------------------------------------------------
router.post('/reset-password', requireDb, async (req, res) => {
  try {
    const { email, otp, newPassword, password } = req.body;
    const candidatePassword = newPassword || password;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!otp || typeof otp !== 'string' || !isValidOtpFormat(otp)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit verification code.' });
    }

    if (!candidatePassword || typeof candidatePassword !== 'string' || candidatePassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters in length.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired password reset request. Please request a new code.',
      });
    }

    // 1. Hash candidate password first before consuming the OTP.
    // If bcrypt hashing encounters any error, the OTP is preserved and not wasted.
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(candidatePassword, saltRounds);

    // 2. Verify and consume OTP atomically
    try {
      await verifyPasswordResetOtp({
        email: normalizedEmail,
        otp,
        consume: true,
      });
    } catch (otpErr) {
      if (otpErr instanceof OtpServiceError) {
        return res.status(otpErr.status).json({
          error: otpErr.message,
          code: otpErr.code,
          attemptsRemaining: otpErr.details?.attemptsRemaining,
        });
      }
      throw otpErr;
    }

    // 3. Persist new password and update passwordChangedAt
    user.passwordHash = newPasswordHash;
    user.passwordChangedAt = new Date();
    if (user.isEmailVerified === false) {
      user.isEmailVerified = true;
    }
    await user.save();

    // 4. Invalidate all active sessions for this user across MongoDB and sessionStore
    await invalidateUserSessions(req, user._id);

    // 5. Invalidate current session if active and clear session cookie
    if (req.session) {
      req.session.destroy(() => { });
    }
    res.clearCookie('closetbrain.sid', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return res.status(200).json({
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ----------------------------------------------------------------------------
// 8. POST /api/auth/logout
// ----------------------------------------------------------------------------
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout session destruction error:', err);
      return res.status(500).json({ error: 'Logout failed.' });
    }

    res.clearCookie('closetbrain.sid', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return res.status(200).json({ message: 'Logged out successfully.' });
  });
});

// ----------------------------------------------------------------------------
// 9. GET /api/auth/me
// ----------------------------------------------------------------------------
router.get('/me', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(200).json({ user: null });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'MongoDB is currently unreachable.',
        user: null,
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => { });
      return res.status(200).json({ user: null });
    }

    return res.status(200).json({ user: user.toSafeObject() });
  } catch (err) {
    console.error('Session check error:', err);
    return res.status(500).json({ error: 'Failed to verify session.' });
  }
});

export default router;
