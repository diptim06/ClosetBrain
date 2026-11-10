import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import {
  generateOtp,
  hashOtp,
  isValidOtpFormat,
  timingSafeEqualHex,
  issueOtp,
  verifyOtp,
  clearOtpState,
  sendSignupVerificationOtp,
  resendSignupVerificationOtp,
  verifySignupOtp,
  requestPasswordResetOtp,
  resendPasswordResetOtp,
  verifyPasswordResetOtp,
  OTP_LIFETIME_MS,
  OTP_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  FLOW_SIGNUP,
  FLOW_PASSWORD_RESET,
} from './otpService.js';

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

async function assertRejects(action, expectedSubstring, message) {
  totalAssertions++;
  try {
    const result = typeof action === 'function' ? action() : action;
    await result;
    failedAssertions++;
    console.error(`  ✗ FAIL: Expected error containing "${expectedSubstring}", but resolved: ${message}`);
  } catch (err) {
    if (!expectedSubstring || err.message.toLowerCase().includes(expectedSubstring.toLowerCase())) {
      passedAssertions++;
      console.log(`  ✓ ${message} (Caught: ${err.message})`);
    } else {
      failedAssertions++;
      console.error(`  ✗ FAIL: Error did not contain "${expectedSubstring}". Caught: ${err.message}`);
    }
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

async function runOtpServiceTests() {
  console.log('\n=== ClosetBrain Auth Phase 3: OTP Lifecycle Service Verification ===\n');

  // --------------------------------------------------------------------------
  // Suite 1: Secure OTP Generation & Format Validation
  // --------------------------------------------------------------------------
  console.log('Suite 1: Secure OTP Generation & Format Validation');
  {
    const otps = Array.from({ length: 50 }, () => generateOtp());
    assert(otps.length === 50, 'Generated 50 random OTP codes');
    assert(otps.every((code) => typeof code === 'string' && code.length === 6 && /^\d{6}$/.test(code)), 'All generated OTPs are strictly 6-digit numeric strings');

    // Test leading zero generation with deterministic padStart logic
    const padded = String(42).padStart(6, '0');
    assert(padded === '000042' && padded.length === 6, 'Leading zeros are strictly preserved by padStart(6, "0")');

    // isValidOtpFormat validation checks
    assert(isValidOtpFormat('123456') === true, 'isValidOtpFormat accepts valid 6-digit string');
    assert(isValidOtpFormat('000123') === true, 'isValidOtpFormat accepts valid string with leading zeros');
    assert(isValidOtpFormat('12345') === false, 'isValidOtpFormat rejects 5 digits');
    assert(isValidOtpFormat('1234567') === false, 'isValidOtpFormat rejects 7 digits');
    assert(isValidOtpFormat('12a456') === false, 'isValidOtpFormat rejects alphabetic characters');
    assert(isValidOtpFormat(123456) === false, 'isValidOtpFormat rejects numbers');
    assert(isValidOtpFormat(null) === false, 'isValidOtpFormat rejects null');
    assert(isValidOtpFormat({}) === false, 'isValidOtpFormat rejects objects');
  }

  // --------------------------------------------------------------------------
  // Suite 2: SHA-256 Hashing & Constant-Time Comparison
  // --------------------------------------------------------------------------
  console.log('\nSuite 2: SHA-256 Hashing & Timing-Safe Comparison');
  {
    const code = '123456';
    const hash = hashOtp(code);
    assert(typeof hash === 'string' && hash.length === 64, 'hashOtp returns 64-character hexadecimal digest');
    assert(/^[a-f0-9]{64}$/.test(hash), 'Hash is valid lowercase SHA-256 hex');

    await assertRejects(
      async () => hashOtp('not-an-otp'),
      'Invalid verification code format',
      'hashOtp throws on malformed input'
    );

    const hashMatch = timingSafeEqualHex(hash, hashOtp('123456'));
    assert(hashMatch === true, 'timingSafeEqualHex returns true for matching hashes');

    const hashMismatch = timingSafeEqualHex(hash, hashOtp('654321'));
    assert(hashMismatch === false, 'timingSafeEqualHex returns false for mismatching hashes');

    assert(timingSafeEqualHex('malformed', hash) === false, 'timingSafeEqualHex safely returns false for malformed input');
    assert(timingSafeEqualHex(hash, null) === false, 'timingSafeEqualHex safely returns false for null');
  }

  // Connect to DB for stateful tests
  await connectDb();

  const testEmail = `otp_test_${Date.now()}@closetbrain.test`;
  const resetEmail = `reset_test_${Date.now()}@closetbrain.test`;

  const testUser = await User.create({
    name: 'OTP Test User',
    email: testEmail,
    passwordHash: 'dummy_hash',
    isEmailVerified: false,
  });

  const resetUser = await User.create({
    name: 'Reset Test User',
    email: resetEmail,
    passwordHash: 'dummy_hash',
    isEmailVerified: true,
  });

  try {
    // --------------------------------------------------------------------------
    // Suite 3: Signup Flow Happy Path & Email Dispatch
    // --------------------------------------------------------------------------
    console.log('\nSuite 3: Signup Flow Happy Path & Invalidation');
    let capturedOtp = null;
    const fakeSignupSender = async ({ to, name, otp, expiresInMinutes }) => {
      capturedOtp = otp;
      return { success: true, messageId: 'fake-msg-id', devFallback: false };
    };

    const startTime = new Date();
    const sendRes = await sendSignupVerificationOtp({
      userId: testUser._id.toString(),
      now: startTime,
      emailSender: fakeSignupSender,
    });

    assert(sendRes.success === true, 'sendSignupVerificationOtp returns success');
    assert(capturedOtp !== null && capturedOtp.length === 6, 'Fake email sender received 6-digit OTP');

    // Inspect user document in database
    const userInDb = await User.findById(testUser._id);
    assert(userInDb.verificationOtpHash !== null, 'verificationOtpHash persisted in MongoDB');
    assert(userInDb.verificationOtpHash === hashOtp(capturedOtp), 'Stored hash matches SHA-256 of dispatched OTP');
    assert(userInDb.verificationOtpAttempts === 0, 'Attempts counter initialized to 0');
    assert(userInDb.verificationOtpLastSentAt !== null, 'verificationOtpLastSentAt recorded');

    // Verify correct OTP
    const verifyRes = await verifySignupOtp({
      userId: testUser._id.toString(),
      otp: capturedOtp,
      now: new Date(startTime.getTime() + 1000),
    });

    assert(verifyRes.success === true, 'verifySignupOtp returns success');

    // Inspect user document after successful verification
    const verifiedUserInDb = await User.findById(testUser._id);
    assert(verifiedUserInDb.isEmailVerified === true, 'isEmailVerified updated to true');
    assert(verifiedUserInDb.verificationOtpHash === null, 'verificationOtpHash invalidated (set to null)');
    assert(verifiedUserInDb.verificationOtpExpiresAt === null, 'verificationOtpExpiresAt invalidated');
    assert(verifiedUserInDb.verificationOtpAttempts === 0, 'verificationOtpAttempts reset to 0');

    // Attempting to re-verify the consumed code must fail
    await assertRejects(
      verifySignupOtp({
        userId: testUser._id.toString(),
        otp: capturedOtp,
        now: new Date(startTime.getTime() + 2000),
      }),
      'No active verification code found',
      'Re-verifying consumed OTP is rejected (replay attack defense)'
    );

    // --------------------------------------------------------------------------
    // Suite 4: Malformed Input Rejection (Pre-DB check)
    // --------------------------------------------------------------------------
    console.log('\nSuite 4: Malformed Input Rejection & Counter Protection');
    // Issue a fresh OTP
    let freshOtp = null;
    const cooldownPassTime = new Date(startTime.getTime() + 70000); // Past 60s cooldown
    await sendSignupVerificationOtp({
      userId: testUser._id.toString(),
      now: cooldownPassTime,
      emailSender: async ({ otp }) => {
        freshOtp = otp;
      },
    });

    // Submit malformed inputs
    await assertRejects(
      verifySignupOtp({ userId: testUser._id.toString(), otp: '123' }),
      'Invalid verification code. Code must be exactly 6 digits.',
      'Rejects 3-digit code'
    );
    await assertRejects(
      verifySignupOtp({ userId: testUser._id.toString(), otp: 'abcdef' }),
      'Invalid verification code. Code must be exactly 6 digits.',
      'Rejects non-numeric string'
    );

    // Verify attempts counter was NOT incremented by malformed inputs
    const unincrementedUser = await User.findById(testUser._id);
    assert(unincrementedUser.verificationOtpAttempts === 0, 'Attempts counter untouched after malformed inputs');

    // --------------------------------------------------------------------------
    // Suite 5: Flow Separation (Signup vs Password Reset)
    // --------------------------------------------------------------------------
    console.log('\nSuite 5: Flow Separation (Signup vs Password Reset)');
    // Try to verify the signup code via the password reset flow
    await assertRejects(
      verifyPasswordResetOtp({
        email: testEmail,
        otp: freshOtp,
        now: cooldownPassTime,
      }),
      'No active verification code found',
      'Signup OTP cannot be verified through password reset flow'
    );

    // Issue a password reset OTP for resetUser
    let resetOtpCode = null;
    await requestPasswordResetOtp({
      email: resetEmail,
      now: cooldownPassTime,
      emailSender: async ({ otp }) => {
        resetOtpCode = otp;
      },
    });

    // Try to verify the reset code via the signup flow
    await assertRejects(
      verifySignupOtp({
        userId: resetUser._id.toString(),
        otp: resetOtpCode,
        now: cooldownPassTime,
      }),
      'No active verification code found',
      'Password reset OTP cannot be verified through signup flow'
    );

    // --------------------------------------------------------------------------
    // Suite 6: Expiration Enforcement
    // --------------------------------------------------------------------------
    console.log('\nSuite 6: Expiration Enforcement (10-Minute Lifetime)');
    const expiredClock = new Date(cooldownPassTime.getTime() + 11 * 60 * 1000); // 11 mins later

    await assertRejects(
      verifySignupOtp({
        userId: testUser._id.toString(),
        otp: freshOtp,
        now: expiredClock,
      }),
      'Verification code has expired',
      'Expired code rejected after 10-minute lifetime'
    );

    const expiredDbUser = await User.findById(testUser._id);
    assert(expiredDbUser.verificationOtpHash === null, 'Expired OTP hash invalidated in database');

    // --------------------------------------------------------------------------
    // Suite 7: 5-Attempt Limit & Deactivation
    // --------------------------------------------------------------------------
    console.log('\nSuite 7: 5-Attempt Limit & Exhaustion Deactivation');
    let attemptTestOtp = null;
    const attemptStartTime = new Date(expiredClock.getTime() + 70000);

    await sendSignupVerificationOtp({
      userId: testUser._id.toString(),
      now: attemptStartTime,
      emailSender: async ({ otp }) => {
        attemptTestOtp = otp;
      },
    });

    // Submit wrong 6-digit codes 4 times
    for (let attempt = 1; attempt <= 4; attempt++) {
      const remaining = 5 - attempt;
      await assertRejects(
        verifySignupOtp({
          userId: testUser._id.toString(),
          otp: '000000',
          now: attemptStartTime,
        }),
        `Invalid verification code. ${remaining} attempt`,
        `Wrong attempt ${attempt} records failed attempt and returns ${remaining} remaining`
      );

      const doc = await User.findById(testUser._id);
      assert(doc.verificationOtpAttempts === attempt, `DB attempts counter matches ${attempt}`);
    }

    // 5th failed attempt: code deactivated
    await assertRejects(
      verifySignupOtp({
        userId: testUser._id.toString(),
        otp: '000000',
        now: attemptStartTime,
      }),
      'Too many failed attempts. This code has been deactivated.',
      '5th failed attempt locks out code'
    );

    const exhaustedDbUser = await User.findById(testUser._id);
    assert(exhaustedDbUser.verificationOtpHash === null, 'Exhausted OTP hash cleared from database');

    // Submitting the originally correct code now fails because OTP was deactivated
    await assertRejects(
      verifySignupOtp({
        userId: testUser._id.toString(),
        otp: attemptTestOtp,
        now: attemptStartTime,
      }),
      'No active verification code found',
      'Originally valid OTP fails because code was deactivated upon exhaustion'
    );

    // --------------------------------------------------------------------------
    // Suite 8: Resend Cooldown (60 Seconds) & Code Replacement
    // --------------------------------------------------------------------------
    console.log('\nSuite 8: Resend Cooldown & Replacement Invalidation');
    const resendStartTime = new Date(attemptStartTime.getTime() + 70000);
    let oldCode = null;
    await sendSignupVerificationOtp({
      userId: testUser._id.toString(),
      now: resendStartTime,
      emailSender: async ({ otp }) => {
        oldCode = otp;
      },
    });

    // Immediate resend within 60s
    const earlyTime = new Date(resendStartTime.getTime() + 20000); // 20s later
    await assertRejects(
      resendSignupVerificationOtp({
        userId: testUser._id.toString(),
        now: earlyTime,
      }),
      'Please wait 40 seconds before requesting a new code',
      'Resend rejected during active 60s cooldown'
    );

    // Resend after cooldown expires (65s later)
    let newCode = null;
    const validResendTime = new Date(resendStartTime.getTime() + 65000);
    const resendResult = await resendSignupVerificationOtp({
      userId: testUser._id.toString(),
      now: validResendTime,
      emailSender: async ({ otp }) => {
        newCode = otp;
      },
    });

    assert(resendResult.success === true, 'Resend succeeded after cooldown elapsed');
    assert(newCode !== null, 'New replacement OTP generated');

    // Verify the old code was invalidated and no longer works
    await assertRejects(
      verifySignupOtp({
        userId: testUser._id.toString(),
        otp: oldCode,
        now: new Date(validResendTime.getTime() + 1000),
      }),
      'Invalid verification code',
      'Old code invalidated upon resend replacement'
    );

    // Verify new code works
    const newVerifyRes = await verifySignupOtp({
      userId: testUser._id.toString(),
      otp: newCode,
      now: new Date(validResendTime.getTime() + 2000),
    });
    assert(newVerifyRes.success === true, 'New replacement code verified successfully');

    // --------------------------------------------------------------------------
    // Suite 9: Email Delivery Failure Rollback
    // --------------------------------------------------------------------------
    console.log('\nSuite 9: Email Delivery Failure Rollback');
    const deliveryFailTime = new Date(validResendTime.getTime() + 70000);

    const failingSender = async () => {
      throw new Error('Resend provider 500 error');
    };

    await assertRejects(
      sendSignupVerificationOtp({
        userId: testUser._id.toString(),
        now: deliveryFailTime,
        emailSender: failingSender,
      }),
      'Failed to deliver verification email',
      'Throws 502 error on email delivery failure'
    );

    // Verify the user document OTP state was rolled back
    const rolledBackUser = await User.findById(testUser._id);
    assert(rolledBackUser.verificationOtpHash === null, 'OTP hash rolled back to null on email failure');
    assert(rolledBackUser.verificationOtpExpiresAt === null, 'Expiry rolled back to null');

    // --------------------------------------------------------------------------
    // Suite 10: Anti-Enumeration for Password Reset
    // --------------------------------------------------------------------------
    console.log('\nSuite 10: Anti-Enumeration for Password Reset');
    const fakeEmail = 'nonexistent_user_999@closetbrain.test';
    const nonExistentRes = await requestPasswordResetOtp({
      email: fakeEmail,
    });

    assert(nonExistentRes.success === true, 'Returns generic success for non-existent email');
    assert(
      nonExistentRes.message.includes('If an account exists with this email'),
      'Message does not reveal whether the email exists'
    );

    // --------------------------------------------------------------------------
    // Suite 11: Concurrency Safety
    // --------------------------------------------------------------------------
    console.log('\nSuite 11: Concurrency Safety (Race Condition Defense)');
    const concTime = new Date(deliveryFailTime.getTime() + 70000);

    // Simulate two concurrent resend requests at the exact same millisecond
    const resendPromises = [
      resendSignupVerificationOtp({
        userId: testUser._id.toString(),
        now: concTime,
        emailSender: async () => ({ success: true }),
      }),
      resendSignupVerificationOtp({
        userId: testUser._id.toString(),
        now: concTime,
        emailSender: async () => ({ success: true }),
      }),
    ];

    const results = await Promise.allSettled(resendPromises);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert(fulfilled.length === 1, 'Exactly one concurrent resend succeeded');
    assert(rejected.length === 1, 'Second concurrent resend was rejected due to atomic cooldown lock');
    assert(
      rejected[0].reason.message.includes('Please wait') || rejected[0].reason.message.includes('concurrent'),
      'Rejected reason contains cooldown or concurrency explanation'
    );
    // --------------------------------------------------------------------------
    // Suite 12: Email Failure Rollback Hardening (No Zombie OTP Resurrected)
    // --------------------------------------------------------------------------
    console.log('\nSuite 12: Email Failure Rollback Hardening (No Zombie OTP Resurrected)');
    const rollbackBaseTime = new Date(concTime.getTime() + 70000);

    // 1. User has an initial active OTP A
    let otpA = null;
    await sendSignupVerificationOtp({
      userId: testUser._id.toString(),
      now: rollbackBaseTime,
      emailSender: async ({ otp }) => {
        otpA = otp;
      },
    });

    const userWithA = await User.findById(testUser._id);
    const hashA = userWithA.verificationOtpHash;
    assert(hashA !== null, 'Initial OTP A active');

    // 2. 65s later, user requests replacement OTP B, but email delivery throws
    const timeB = new Date(rollbackBaseTime.getTime() + 65000);
    let otpB = null;
    await assertRejects(
      sendSignupVerificationOtp({
        userId: testUser._id.toString(),
        now: timeB,
        emailSender: async ({ otp }) => {
          otpB = otp;
          throw new Error('Resend provider connection timeout');
        },
      }),
      'Failed to deliver verification email',
      'Replacement OTP dispatch fails due to provider error'
    );

    // 3. Inspect database: Undelivered OTP B is NOT active, AND old OTP A is NOT resurrected
    const userAfterFailedB = await User.findById(testUser._id);
    assert(userAfterFailedB.verificationOtpHash === null, 'Hash is null: undelivered OTP B cleared, and OTP A is not resurrected');
    assert(userAfterFailedB.verificationOtpExpiresAt === null, 'Expiry is null');
    assert(userAfterFailedB.verificationOtpAttempts === 0, 'Attempts reset to 0');
    assert(
      userAfterFailedB.verificationOtpLastSentAt?.getTime() === rollbackBaseTime.getTime(),
      'lastSentAt restored to previous timestamp so user cooldown is not penalized'
    );

    // --------------------------------------------------------------------------
    // Suite 13: Verify vs. Attempt-Limit Race Testing
    // --------------------------------------------------------------------------
    console.log('\nSuite 13: Verify vs. Attempt-Limit Race Testing');
    const raceBaseTime = new Date(timeB.getTime() + 70000);

    // 13.1: Two simultaneous correct submissions (Double-Spend / Replay Defense)
    let raceOtp = null;
    await sendSignupVerificationOtp({
      userId: testUser._id.toString(),
      now: raceBaseTime,
      emailSender: async ({ otp }) => {
        raceOtp = otp;
      },
    });

    const verifyPromises = [
      verifySignupOtp({
        userId: testUser._id.toString(),
        otp: raceOtp,
        now: new Date(raceBaseTime.getTime() + 1000),
      }),
      verifySignupOtp({
        userId: testUser._id.toString(),
        otp: raceOtp,
        now: new Date(raceBaseTime.getTime() + 1000),
      }),
    ];

    const verifyResults = await Promise.allSettled(verifyPromises);
    const verifyFulfilled = verifyResults.filter((r) => r.status === 'fulfilled');
    const verifyRejected = verifyResults.filter((r) => r.status === 'rejected');

    assert(verifyFulfilled.length === 1, 'Exactly one concurrent correct submission succeeded');
    assert(verifyRejected.length === 1, 'Second concurrent correct submission rejected (replay defense)');
    assert(
      verifyRejected[0].reason.message.includes('Verification code is invalid') ||
        verifyRejected[0].reason.message.includes('already been used') ||
        verifyRejected[0].reason.message.includes('No active verification code'),
      'Rejected reason indicates code already consumed'
    );

    // 13.2: Correct submission racing with the 5th (final) failed attempt
    const race5BaseTime = new Date(raceBaseTime.getTime() + 70000);
    let race5Otp = null;
    await sendSignupVerificationOtp({
      userId: testUser._id.toString(),
      now: race5BaseTime,
      emailSender: async ({ otp }) => {
        race5Otp = otp;
      },
    });

    // Set attempts to 4 directly in DB to simulate 4 prior failures
    await User.updateOne(
      { _id: testUser._id },
      { $set: { verificationOtpAttempts: 4 } }
    );

    // Race: 1 wrong attempt ("000000") vs 1 correct attempt (race5Otp)
    const raceFinalPromises = [
      verifySignupOtp({
        userId: testUser._id.toString(),
        otp: '000000', // 5th wrong attempt
        now: new Date(race5BaseTime.getTime() + 1000),
      }),
      verifySignupOtp({
        userId: testUser._id.toString(),
        otp: race5Otp, // Correct attempt
        now: new Date(race5BaseTime.getTime() + 1000),
      }),
    ];

    const raceFinalResults = await Promise.allSettled(raceFinalPromises);
    const raceFinalFulfilled = raceFinalResults.filter((r) => r.status === 'fulfilled');
    const raceFinalRejected = raceFinalResults.filter((r) => r.status === 'rejected');

    // Either correct one succeeded (1 fulfilled, 1 rejected) OR failed one locked it out (0 fulfilled, 2 rejected)
    assert(
      raceFinalFulfilled.length <= 1,
      'At most one submission succeeded in the final attempt race'
    );
    assert(
      raceFinalRejected.length >= 1,
      'At least one submission rejected in the final attempt race'
    );

    // If correct succeeded, document is verified. If failed arrived first, document hash is cleared and attempts == 5
    const docAfterRace5 = await User.findById(testUser._id);
    assert(
      docAfterRace5.verificationOtpHash === null,
      'Hash is null regardless of race outcome (either consumed or deactivated upon 5th failure)'
    );

    // 13.3: Multiple concurrent failed attempts cannot exceed attempt limit
    const floodBaseTime = new Date(race5BaseTime.getTime() + 70000);
    await sendSignupVerificationOtp({
      userId: testUser._id.toString(),
      now: floodBaseTime,
      emailSender: async () => ({ success: true }),
    });

    // Launch 6 concurrent wrong submissions
    const floodPromises = Array.from({ length: 6 }, () =>
      verifySignupOtp({
        userId: testUser._id.toString(),
        otp: '000000',
        now: new Date(floodBaseTime.getTime() + 1000),
      })
    );

    const floodResults = await Promise.allSettled(floodPromises);
    const floodRejected = floodResults.filter((r) => r.status === 'rejected');
    assert(floodRejected.length === 6, 'All 6 wrong flood submissions rejected');

    const docAfterFlood = await User.findById(testUser._id);
    assert(
      docAfterFlood.verificationOtpAttempts <= OTP_MAX_ATTEMPTS,
      `Attempts counter capped at <= 5 (actual: ${docAfterFlood.verificationOtpAttempts})`
    );
    assert(docAfterFlood.verificationOtpHash === null, 'Hash deactivated after attempt exhaustion');

    // --------------------------------------------------------------------------
    // Suite 14: Cleanup Operations Cannot Clear Newly Issued OTP
    // --------------------------------------------------------------------------
    console.log('\nSuite 14: Cleanup Race Protection (Cannot Clear Newly Issued OTP)');
    const cleanupBaseTime = new Date(floodBaseTime.getTime() + 70000);

    // 1. Issue OTP 1
    let otp1 = null;
    await sendSignupVerificationOtp({
      userId: testUser._id.toString(),
      now: cleanupBaseTime,
      emailSender: async ({ otp }) => {
        otp1 = otp;
      },
    });
    const hash1 = hashOtp(otp1);

    // 2. Issue replacement OTP 2 (65s later)
    const cleanupTime2 = new Date(cleanupBaseTime.getTime() + 65000);
    let otp2 = null;
    await sendSignupVerificationOtp({
      userId: testUser._id.toString(),
      now: cleanupTime2,
      emailSender: async ({ otp }) => {
        otp2 = otp;
      },
    });
    const hash2 = hashOtp(otp2);

    // 3. A delayed cleanup job for OTP 1 runs with expectedHash: hash1
    const cleanedOld = await clearOtpState({
      userId: testUser._id.toString(),
      flow: FLOW_SIGNUP,
      expectedHash: hash1, // target old hash
    });

    assert(cleanedOld === false, 'clearOtpState returned false (did not match replaced hash)');

    const userAfterDelayedCleanup = await User.findById(testUser._id);
    assert(
      userAfterDelayedCleanup.verificationOtpHash === hash2,
      'Newly issued OTP 2 hash remains completely intact despite stale cleanup execution'
    );
  } finally {
    // Cleanup test users
    await User.deleteMany({ _id: { $in: [testUser._id, resetUser._id] } });
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n=== OTP LIFECYCLE SERVICE VERIFICATION SUMMARY ===');
  console.log(`Total Assertions: ${totalAssertions}`);
  console.log(`Passed: ${passedAssertions}`);
  console.log(`Failed: ${failedAssertions}\n`);

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runOtpServiceTests()
  .then(() => {
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    mongoose.connection.close();
    process.exit(1);
  });
