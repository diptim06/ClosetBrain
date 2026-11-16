import crypto from 'crypto';
import User from '../models/User.js';
import {
  sendSignupVerificationEmail,
  sendPasswordResetEmail,
} from './emailService.js';

// Configuration constants
export const OTP_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown between resends
export const OTP_MAX_ATTEMPTS = 5; // Maximum failed verification attempts before invalidation

export const FLOW_SIGNUP = 'signup';
export const FLOW_PASSWORD_RESET = 'password_reset';

const SHA256_HEX_REGEX = /^[a-fA-F0-9]{64}$/;
const OTP_REGEX = /^\d{6}$/;

/**
 * Custom error class for OTP lifecycle operations.
 */
export class OtpServiceError extends Error {
  constructor(message, status = 400, code = 'OTP_ERROR', details = null) {
    super(message);
    this.name = 'OtpServiceError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Returns the corresponding User model schema field names for each flow.
 *
 * @param {string} flow - 'signup' | 'password_reset'
 * @returns {object} Schema field mappings
 */
export function getFlowFields(flow) {
  if (flow === FLOW_SIGNUP) {
    return {
      hash: 'verificationOtpHash',
      expiresAt: 'verificationOtpExpiresAt',
      attempts: 'verificationOtpAttempts',
      lastSentAt: 'verificationOtpLastSentAt',
      isSignup: true,
    };
  }
  if (flow === FLOW_PASSWORD_RESET) {
    return {
      hash: 'resetPasswordOtpHash',
      expiresAt: 'resetPasswordOtpExpiresAt',
      attempts: 'resetPasswordOtpAttempts',
      lastSentAt: 'resetPasswordOtpLastSentAt',
      isSignup: false,
    };
  }
  throw new OtpServiceError(`Unsupported OTP flow: ${flow}`, 400, 'INVALID_FLOW');
}

/**
 * Validates whether an OTP is a strict 6-digit numeric string.
 * Rejects objects, arrays, numbers, and strings with non-digit characters.
 *
 * @param {any} otp
 * @returns {boolean}
 */
export function isValidOtpFormat(otp) {
  if (typeof otp !== 'string') return false;
  return OTP_REGEX.test(otp);
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP with leading-zero preservation.
 *
 * @returns {string} 6-digit string (e.g. "042918")
 */
export function generateOtp() {
  const num = crypto.randomInt(0, 1000000);
  return String(num).padStart(6, '0');
}

/**
 * Computes the SHA-256 hex digest of a valid 6-digit OTP.
 *
 * @param {string} otp
 * @returns {string} 64-character hex digest
 */
export function hashOtp(otp) {
  if (!isValidOtpFormat(otp)) {
    throw new OtpServiceError(
      'Invalid verification code format. Must be a 6-digit numeric string.',
      400,
      'INVALID_FORMAT'
    );
  }
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Performs a constant-time comparison between candidate and stored SHA-256 digests.
 * Validates that both inputs are 64-character hexadecimal strings before comparison.
 *
 * @param {string} candidateHash
 * @param {string} storedHash
 * @returns {boolean}
 */
export function timingSafeEqualHex(candidateHash, storedHash) {
  if (
    typeof candidateHash !== 'string' ||
    typeof storedHash !== 'string' ||
    !SHA256_HEX_REGEX.test(candidateHash) ||
    !SHA256_HEX_REGEX.test(storedHash)
  ) {
    return false;
  }

  const bufA = Buffer.from(candidateHash, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');

  if (bufA.length !== 32 || bufB.length !== 32) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Helper to find a user by ID or normalized email.
 */
async function resolveUser({ userId, email }) {
  if (userId) {
    return await User.findById(userId);
  }
  if (email && typeof email === 'string') {
    return await User.findOne({ email: email.toLowerCase().trim() });
  }
  return null;
}

/**
 * Initiates or resends an OTP for a specified flow (signup or password reset).
 * Enforces a 60-second cooldown atomically to prevent concurrent resend race conditions.
 * Cleans up OTP state if email delivery fails.
 *
 * @param {object} params
 * @param {string} params.flow - 'signup' | 'password_reset'
 * @param {string} [params.userId] - User ID
 * @param {string} [params.email] - User email
 * @param {Date} [params.now=new Date()] - Injected clock for testing
 * @param {Function} [params.emailSender] - Injected email dispatcher
 * @returns {Promise<{ success: boolean, message: string, devFallback?: boolean }>}
 */
export async function issueOtp({
  flow,
  userId,
  email,
  now = new Date(),
  emailSender = null,
}) {
  const fields = getFlowFields(flow);
  const user = await resolveUser({ userId, email });

  // For password reset, if user does not exist, return generic success to prevent email enumeration
  if (!user) {
    if (flow === FLOW_PASSWORD_RESET) {
      return {
        success: true,
        message: 'If an account exists with this email, a verification code has been sent.',
      };
    }
    throw new OtpServiceError('User account not found.', 404, 'USER_NOT_FOUND');
  }

  // Preserve previous state in case rollback is needed on email failure
  const previousState = {
    hash: user[fields.hash],
    expiresAt: user[fields.expiresAt],
    attempts: user[fields.attempts],
    lastSentAt: user[fields.lastSentAt],
  };

  // Cooldown check
  const lastSent = user[fields.lastSentAt];
  if (lastSent) {
    const elapsed = now.getTime() - new Date(lastSent).getTime();
    if (elapsed < OTP_COOLDOWN_MS) {
      const remainingSeconds = Math.max(1, Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000));
      throw new OtpServiceError(
        `Please wait ${remainingSeconds} seconds before requesting a new code.`,
        429,
        'COOLDOWN_ACTIVE',
        { retryAfter: remainingSeconds }
      );
    }
  }

  // Generate fresh OTP and SHA-256 hash
  const rawOtp = generateOtp();
  const newHash = hashOtp(rawOtp);
  const newExpiresAt = new Date(now.getTime() + OTP_LIFETIME_MS);
  const cooldownThreshold = new Date(now.getTime() - OTP_COOLDOWN_MS);

  // Atomically update user document ensuring no concurrent request bypassed cooldown
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      $or: [
        { [fields.lastSentAt]: null },
        { [fields.lastSentAt]: { $lte: cooldownThreshold } },
      ],
    },
    {
      $set: {
        [fields.hash]: newHash,
        [fields.expiresAt]: newExpiresAt,
        [fields.attempts]: 0,
        [fields.lastSentAt]: now,
      },
    },
    { returnDocument: 'after' }
  );

  if (!updatedUser) {
    // If atomic update failed, re-fetch to distinguish between concurrent cooldown and missing user
    const freshUser = await User.findById(user._id);
    if (!freshUser) {
      throw new OtpServiceError('User account not found.', 404, 'USER_NOT_FOUND');
    }
    const freshLastSent = freshUser[fields.lastSentAt];
    if (freshLastSent) {
      const elapsed = now.getTime() - new Date(freshLastSent).getTime();
      if (elapsed < OTP_COOLDOWN_MS) {
        const remainingSeconds = Math.max(1, Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000));
        throw new OtpServiceError(
          `Please wait ${remainingSeconds} seconds before requesting a new code.`,
          429,
          'COOLDOWN_ACTIVE',
          { retryAfter: remainingSeconds }
        );
      }
    }
    throw new OtpServiceError(
      'Unable to process request due to a concurrent update. Please retry.',
      409,
      'CONCURRENCY_CONFLICT'
    );
  }

  // Dispatch email with raw OTP
  const sender =
    emailSender ||
    (flow === FLOW_SIGNUP ? sendSignupVerificationEmail : sendPasswordResetEmail);

  try {
    const emailResult = await sender({
      to: updatedUser.email,
      name: updatedUser.name,
      otp: rawOtp,
      expiresInMinutes: Math.round(OTP_LIFETIME_MS / 60000),
    });

    return {
      success: true,
      message:
        flow === FLOW_SIGNUP
          ? 'Verification code sent successfully.'
          : 'If an account exists with this email, a verification code has been sent.',
      devFallback: Boolean(emailResult?.devFallback),
    };
  } catch (deliveryError) {
    // Rollback atomic update so an unreceived OTP is never active.
    // Must be strictly conditional on both hash AND lastSentAt to prevent overwriting
    // a newer OTP state or resurrecting an older, already-consumed/expired OTP.
    await User.updateOne(
      {
        _id: user._id,
        [fields.hash]: newHash,
        [fields.lastSentAt]: now,
      },
      {
        $set: {
          [fields.hash]: null,
          [fields.expiresAt]: null,
          [fields.attempts]: 0,
          [fields.lastSentAt]: previousState.lastSentAt || null,
        },
      }
    );

    throw new OtpServiceError(
      'Failed to deliver verification email. Please try again later.',
      502,
      'EMAIL_FAILED',
      deliveryError
    );
  }
}

/**
 * Verifies an OTP for a given flow.
 * - Rejects malformed OTP inputs with 400 before checking DB.
 * - Increments attempt counter only for valid 6-digit codes submitted against an active OTP.
 * - Invalids OTP upon 5 failed attempts.
 * - Atomically clears OTP state and verifies user on success.
 *
 * @param {object} params
 * @param {string} params.flow - 'signup' | 'password_reset'
 * @param {string} [params.userId] - User ID
 * @param {string} [params.email] - User email
 * @param {string} params.otp - Submitted 6-digit candidate code
 * @param {boolean} [params.consume=true] - Whether to clear the OTP on success
 * @param {Date} [params.now=new Date()] - Injected clock for testing
 * @returns {Promise<{ success: boolean, userId: string, message: string }>}
 */
export async function verifyOtp({
  flow,
  userId,
  email,
  otp,
  consume = true,
  now = new Date(),
}) {
  // Strict format validation before any database access or counter increment
  if (!isValidOtpFormat(otp)) {
    throw new OtpServiceError(
      'Invalid verification code. Code must be exactly 6 digits.',
      400,
      'INVALID_FORMAT'
    );
  }

  const fields = getFlowFields(flow);
  const user = await resolveUser({ userId, email });

  if (!user) {
    throw new OtpServiceError('User account not found.', 404, 'USER_NOT_FOUND');
  }

  const storedHash = user[fields.hash];
  const expiresAt = user[fields.expiresAt];
  const currentAttempts = user[fields.attempts] || 0;

  // Check if an OTP is currently active
  if (!storedHash || !expiresAt) {
    throw new OtpServiceError(
      'No active verification code found. Please request a new code.',
      400,
      'NO_ACTIVE_OTP'
    );
  }

  // Check if maximum attempts have already been exhausted
  if (currentAttempts >= OTP_MAX_ATTEMPTS) {
    // Ensure hash is cleaned up
    await User.updateOne(
      { _id: user._id, [fields.hash]: storedHash },
      { $set: { [fields.hash]: null, [fields.expiresAt]: null } }
    );
    throw new OtpServiceError(
      'Too many failed attempts. This code has been deactivated. Please request a new code.',
      429,
      'EXHAUSTED'
    );
  }

  // Check expiry
  if (now.getTime() > new Date(expiresAt).getTime()) {
    // Invalidate expired OTP
    await User.updateOne(
      { _id: user._id, [fields.hash]: storedHash },
      { $set: { [fields.hash]: null, [fields.expiresAt]: null } }
    );
    throw new OtpServiceError(
      'Verification code has expired. Please request a new code.',
      400,
      'EXPIRED'
    );
  }

  // Candidate hash and timing-safe comparison
  const candidateHash = hashOtp(otp);
  const isMatch = timingSafeEqualHex(candidateHash, storedHash);

  if (!isMatch) {
    // Atomically increment failed attempts
    const updated = await User.findOneAndUpdate(
      {
        _id: user._id,
        [fields.hash]: storedHash,
        [fields.attempts]: { $lt: OTP_MAX_ATTEMPTS },
      },
      {
        $inc: { [fields.attempts]: 1 },
      },
      { returnDocument: 'after' }
    );

    if (!updated) {
      // If the atomic increment failed because attempts already reached or exceeded the limit,
      // ensure the hash is cleaned up if it matches storedHash
      await User.updateOne(
        { _id: user._id, [fields.hash]: storedHash },
        { $set: { [fields.hash]: null, [fields.expiresAt]: null } }
      );
      throw new OtpServiceError(
        'Too many failed attempts. This code has been deactivated. Please request a new code.',
        429,
        'EXHAUSTED'
      );
    }

    const updatedAttempts = updated[fields.attempts];

    if (updatedAttempts >= OTP_MAX_ATTEMPTS) {
      // Invalidate code upon hitting the limit
      await User.updateOne(
        { _id: user._id, [fields.hash]: storedHash },
        { $set: { [fields.hash]: null, [fields.expiresAt]: null } }
      );
      throw new OtpServiceError(
        'Too many failed attempts. This code has been deactivated. Please request a new code.',
        429,
        'EXHAUSTED'
      );
    }

    const remaining = OTP_MAX_ATTEMPTS - updatedAttempts;
    throw new OtpServiceError(
      `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      400,
      'MISMATCH',
      { attemptsRemaining: remaining }
    );
  }

  // Verification succeeded: conditionally consume OTP and mark verified
  if (consume) {
    const verifiedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        [fields.hash]: storedHash,
        [fields.expiresAt]: { $gt: now },
        [fields.attempts]: { $lt: OTP_MAX_ATTEMPTS },
      },
      {
        $set: {
          [fields.hash]: null,
          [fields.expiresAt]: null,
          [fields.attempts]: 0,
          [fields.lastSentAt]: null,
          ...(fields.isSignup ? { isEmailVerified: true } : {}),
        },
      },
      { returnDocument: 'after' }
    );

    if (!verifiedUser) {
      throw new OtpServiceError(
        'Verification code is invalid, expired, or has already been used.',
        400,
        'VERIFY_FAILED'
      );
    }
  } else {
    // When consume is false, still confirm atomically that the OTP has not expired or been locked out
    const stillValidUser = await User.findOne({
      _id: user._id,
      [fields.hash]: storedHash,
      [fields.expiresAt]: { $gt: now },
      [fields.attempts]: { $lt: OTP_MAX_ATTEMPTS },
    });

    if (!stillValidUser) {
      throw new OtpServiceError(
        'Verification code is invalid, expired, or has already been used.',
        400,
        'VERIFY_FAILED'
      );
    }
  }

  return {
    success: true,
    userId: user._id.toString(),
    message:
      flow === FLOW_SIGNUP
        ? 'Email verified successfully.'
        : 'Password reset code verified successfully.',
  };
}

/**
 * Invalidate/clear active OTP for a given flow.
 * Accepts optional expectedHash to ensure it only clears the intended OTP instance
 * and cannot accidentally clear a newly issued replacement OTP.
 */
export async function clearOtpState({ userId, email, flow, expectedHash = null }) {
  const fields = getFlowFields(flow);
  const user = await resolveUser({ userId, email });
  if (!user) return false;

  const query = { _id: user._id };
  if (expectedHash) {
    query[fields.hash] = expectedHash;
  }

  const result = await User.updateOne(
    query,
    {
      $set: {
        [fields.hash]: null,
        [fields.expiresAt]: null,
        [fields.attempts]: 0,
      },
    }
  );
  return result.modifiedCount > 0;
}

// ----------------------------------------------------------------------------
// Flow-Specific Exported Convenience Methods
// ----------------------------------------------------------------------------

export async function sendSignupVerificationOtp({ userId, email, now, emailSender }) {
  return await issueOtp({ flow: FLOW_SIGNUP, userId, email, now, emailSender });
}

export async function resendSignupVerificationOtp({ userId, email, now, emailSender }) {
  return await issueOtp({ flow: FLOW_SIGNUP, userId, email, now, emailSender });
}

export async function verifySignupOtp({ userId, email, otp, now }) {
  return await verifyOtp({ flow: FLOW_SIGNUP, userId, email, otp, consume: true, now });
}

export async function requestPasswordResetOtp({ email, now, emailSender }) {
  return await issueOtp({ flow: FLOW_PASSWORD_RESET, email, now, emailSender });
}

export async function resendPasswordResetOtp({ email, now, emailSender }) {
  return await issueOtp({ flow: FLOW_PASSWORD_RESET, email, now, emailSender });
}

export async function verifyPasswordResetOtp({ email, otp, consume = true, now }) {
  return await verifyOtp({ flow: FLOW_PASSWORD_RESET, email, otp, consume, now });
}

export default {
  OTP_LIFETIME_MS,
  OTP_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  FLOW_SIGNUP,
  FLOW_PASSWORD_RESET,
  OtpServiceError,
  generateOtp,
  hashOtp,
  isValidOtpFormat,
  timingSafeEqualHex,
  getFlowFields,
  issueOtp,
  verifyOtp,
  clearOtpState,
  sendSignupVerificationOtp,
  resendSignupVerificationOtp,
  verifySignupOtp,
  requestPasswordResetOtp,
  resendPasswordResetOtp,
  verifyPasswordResetOtp,
};
