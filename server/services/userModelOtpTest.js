import crypto from 'crypto';
import mongoose from 'mongoose';
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

async function assertRejects(fn, expectedSubstr, message) {
  totalAssertions++;
  try {
    await fn();
    failedAssertions++;
    console.error(`  ✗ FAIL: Expected error containing "${expectedSubstr}", but no error was thrown: ${message}`);
  } catch (err) {
    if (!expectedSubstr || (err.message && err.message.includes(expectedSubstr))) {
      passedAssertions++;
      console.log(`  ✓ ${message} (Caught: ${err.message})`);
    } else {
      failedAssertions++;
      console.error(`  ✗ FAIL: Error did not match expected "${expectedSubstr}". Caught: ${err.message}`);
    }
  }
}

async function runTests() {
  console.log('\n=== ClosetBrain Auth Phase 2: User Model & OTP Schema Verification ===\n');

  const sha256A = crypto.createHash('sha256').update('123456').digest('hex');
  const sha256B = crypto.createHash('sha256').update('654321').digest('hex');

  // --------------------------------------------------------------------------
  // Suite 1: Schema Defaults & Field Types
  // --------------------------------------------------------------------------
  console.log('Suite 1: Schema Defaults & Initial State');
  {
    const user = new User({
      name: 'Test Defaults User',
      email: 'defaults@example.com',
      passwordHash: 'dummy_bcrypt_hash_placeholder',
    });

    assert(user.verificationOtpHash === null, 'verificationOtpHash defaults to null');
    assert(user.verificationOtpExpiresAt === null, 'verificationOtpExpiresAt defaults to null');
    assert(user.verificationOtpAttempts === 0, 'verificationOtpAttempts defaults to 0');
    assert(user.verificationOtpLastSentAt === null, 'verificationOtpLastSentAt defaults to null');

    assert(user.resetPasswordOtpHash === null, 'resetPasswordOtpHash defaults to null');
    assert(user.resetPasswordOtpExpiresAt === null, 'resetPasswordOtpExpiresAt defaults to null');
    assert(user.resetPasswordOtpAttempts === 0, 'resetPasswordOtpAttempts defaults to 0');
    assert(user.resetPasswordOtpLastSentAt === null, 'resetPasswordOtpLastSentAt defaults to null');
    assert(user.passwordChangedAt === null, 'passwordChangedAt defaults to null');

    // Crucial: isEmailVerified must NOT default to false, as that would alter legacy users
    assert(user.isEmailVerified === undefined, 'isEmailVerified defaults to undefined (prevents legacy user lockout)');
  }

  // --------------------------------------------------------------------------
  // Suite 2: Existing-User Compatibility (Zero Lockout Guarantee)
  // --------------------------------------------------------------------------
  console.log('\nSuite 2: Existing-User Compatibility (Zero Lockout)');
  {
    // Simulate raw legacy document retrieved from MongoDB before this schema existed
    const legacyRawDoc = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Legacy Registered User',
      email: 'legacy@closetbrain.com',
      passwordHash: 'legacy_bcrypt_hash',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    };

    const hydratedLegacyUser = User.hydrate(legacyRawDoc);

    assert(hydratedLegacyUser.isEmailVerified === undefined, 'Legacy user hydrated from DB has isEmailVerified: undefined');
    assert(hydratedLegacyUser.isVerified() === true, 'Legacy user isVerified() evaluates to true (not locked out)');
    assert(hydratedLegacyUser.isEmailVerified !== false, 'Legacy user satisfies `user.isEmailVerified !== false` condition');
    assert(hydratedLegacyUser.verificationOtpHash === null, 'Legacy user has null verificationOtpHash');
    assert(hydratedLegacyUser.resetPasswordOtpHash === null, 'Legacy user has null resetPasswordOtpHash');
  }

  // --------------------------------------------------------------------------
  // Suite 3: New User vs Unverified State
  // --------------------------------------------------------------------------
  console.log('\nSuite 3: New User Explicit Unverified State');
  {
    const newUser = new User({
      name: 'New Registered User',
      email: 'newuser@closetbrain.com',
      passwordHash: 'new_bcrypt_hash',
      isEmailVerified: false,
    });

    assert(newUser.isEmailVerified === false, 'New user explicitly holds isEmailVerified: false');
    assert(newUser.isVerified() === false, 'New unverified user isVerified() returns false');

    newUser.isEmailVerified = true;
    assert(newUser.isVerified() === true, 'User transition to isEmailVerified: true evaluates to verified');
  }

  // --------------------------------------------------------------------------
  // Suite 4: OTP Field Separation (Signup vs Password Reset)
  // --------------------------------------------------------------------------
  console.log('\nSuite 4: OTP Field Separation & Independent State');
  {
    const user = new User({
      name: 'Separation Test User',
      email: 'sep@closetbrain.com',
      passwordHash: 'dummy_hash',
    });

    const signupExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const signupSent = new Date();

    user.verificationOtpHash = sha256A;
    user.verificationOtpExpiresAt = signupExpiry;
    user.verificationOtpAttempts = 2;
    user.verificationOtpLastSentAt = signupSent;

    assert(user.verificationOtpHash === sha256A, 'Signup OTP hash set correctly');
    assert(user.verificationOtpAttempts === 2, 'Signup OTP attempts set to 2');
    assert(user.resetPasswordOtpHash === null, 'Password reset OTP hash remains null');
    assert(user.resetPasswordOtpAttempts === 0, 'Password reset attempts remain 0');
    assert(user.resetPasswordOtpExpiresAt === null, 'Password reset expiry remains null');
    assert(user.resetPasswordOtpLastSentAt === null, 'Password reset lastSentAt remains null');

    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const resetSent = new Date();
    user.resetPasswordOtpHash = sha256B;
    user.resetPasswordOtpExpiresAt = resetExpiry;
    user.resetPasswordOtpAttempts = 4;
    user.resetPasswordOtpLastSentAt = resetSent;

    assert(user.verificationOtpHash === sha256A, 'Signup OTP hash unchanged after reset OTP set');
    assert(user.verificationOtpAttempts === 2, 'Signup attempts unchanged after reset OTP set');
    assert(user.resetPasswordOtpHash === sha256B, 'Password reset hash matches independent value');
    assert(user.resetPasswordOtpAttempts === 4, 'Password reset attempts match independent value');
  }

  // --------------------------------------------------------------------------
  // Suite 5: Aliases and Alternative Naming
  // --------------------------------------------------------------------------
  console.log('\nSuite 5: Schema Aliases & Virtual Compatibility');
  {
    const user = new User({
      name: 'Alias Test User',
      email: 'alias@closetbrain.com',
      passwordHash: 'dummy_hash',
    });

    user.signupOtpHash = sha256A;
    assert(user.verificationOtpHash === sha256A, 'signupOtpHash alias populates verificationOtpHash');
    assert(user.signupOtpHash === sha256A, 'signupOtpHash getter reads verificationOtpHash');

    user.resetOtpHash = sha256B;
    assert(user.resetPasswordOtpHash === sha256B, 'resetOtpHash alias populates resetPasswordOtpHash');
    assert(user.resetOtpHash === sha256B, 'resetOtpHash getter reads resetPasswordOtpHash');

    const now = new Date();
    user.verificationOtpSentAt = now;
    assert(user.verificationOtpLastSentAt === now, 'verificationOtpSentAt virtual sets verificationOtpLastSentAt');
    assert(user.verificationOtpSentAt === now, 'verificationOtpSentAt virtual gets verificationOtpLastSentAt');

    user.resetPasswordOtpSentAt = now;
    assert(user.resetPasswordOtpLastSentAt === now, 'resetPasswordOtpSentAt virtual sets resetPasswordOtpLastSentAt');
    assert(user.resetPasswordOtpSentAt === now, 'resetPasswordOtpSentAt virtual gets resetPasswordOtpLastSentAt');
  }

  // --------------------------------------------------------------------------
  // Suite 6: Hash Validation (SHA-256 Format Rejection)
  // --------------------------------------------------------------------------
  console.log('\nSuite 6: Hash Validation & Plaintext OTP Rejection');
  {
    // Valid 64-char hex
    const validUser = new User({
      name: 'Valid Hash User',
      email: 'validhash@closetbrain.com',
      passwordHash: 'dummy_hash',
      verificationOtpHash: sha256A,
      resetPasswordOtpHash: sha256B,
    });
    let validPass = true;
    try {
      await validUser.validate();
    } catch {
      validPass = false;
    }
    assert(validPass, 'Valid 64-character SHA-256 hex passes validation');

    // Invalid plaintext 6-digit OTP assigned to hash field
    const invalidPlaintextUser = new User({
      name: 'Plaintext OTP User',
      email: 'plain@closetbrain.com',
      passwordHash: 'dummy_hash',
      verificationOtpHash: '123456', // Plaintext 6-digit code
    });
    await assertRejects(
      () => invalidPlaintextUser.validate(),
      'Signup verification OTP hash must be a valid 64-character SHA-256 hex string',
      'Plaintext 6-digit code is rejected by hash validator'
    );

    // Invalid non-hex characters
    const invalidCharsUser = new User({
      name: 'Invalid Chars User',
      email: 'chars@closetbrain.com',
      passwordHash: 'dummy_hash',
      resetPasswordOtpHash: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
    });
    await assertRejects(
      () => invalidCharsUser.validate(),
      'Password reset OTP hash must be a valid 64-character SHA-256 hex string',
      'Non-hex string is rejected by hash validator'
    );

    // Negative attempts counter
    const negUser = new User({
      name: 'Neg Counter User',
      email: 'neg@closetbrain.com',
      passwordHash: 'dummy_hash',
      verificationOtpAttempts: -1,
    });
    await assertRejects(
      () => negUser.validate(),
      'Verification attempts counter cannot be negative',
      'Negative verification attempts counter is rejected'
    );
  }

  // --------------------------------------------------------------------------
  // Suite 7: Security Guardrail Against Raw OTP Fields
  // --------------------------------------------------------------------------
  console.log('\nSuite 7: Security Guardrails (Raw OTP Property Protection)');
  {
    const user = new User({
      name: 'Security Guard User',
      email: 'guard@closetbrain.com',
      passwordHash: 'dummy_hash',
    });

    user.rawOtp = '999999';
    await assertRejects(
      () => user.validate(),
      'Security violation: raw OTP field',
      'Assigning rawOtp property is rejected by pre-validate security guardrail'
    );

    const user2 = new User({
      name: 'Security Guard User 2',
      email: 'guard2@closetbrain.com',
      passwordHash: 'dummy_hash',
    });
    user2.otp = '888888';
    await assertRejects(
      () => user2.validate(),
      'Security violation: raw OTP field',
      'Assigning otp property is rejected by pre-validate security guardrail'
    );
  }

  // --------------------------------------------------------------------------
  // Suite 8: Serialization & Sensitive Credential Redaction
  // --------------------------------------------------------------------------
  console.log('\nSuite 8: Serialization & Credential Redaction');
  {
    const user = new User({
      name: 'Safe Serialization User',
      email: 'safe@closetbrain.com',
      passwordHash: 'secret_bcrypt_hash',
      verificationOtpHash: sha256A,
      verificationOtpExpiresAt: new Date(),
      verificationOtpAttempts: 3,
      verificationOtpLastSentAt: new Date(),
      resetPasswordOtpHash: sha256B,
      resetPasswordOtpExpiresAt: new Date(),
      resetPasswordOtpAttempts: 1,
      resetPasswordOtpLastSentAt: new Date(),
    });

    const safeObj = user.toSafeObject();
    assert(safeObj.id === user._id.toString(), 'toSafeObject includes id');
    assert(safeObj.name === 'Safe Serialization User', 'toSafeObject includes name');
    assert(safeObj.email === 'safe@closetbrain.com', 'toSafeObject includes email');
    assert(safeObj.passwordHash === undefined, 'toSafeObject strictly omits passwordHash');
    assert(safeObj.verificationOtpHash === undefined, 'toSafeObject strictly omits verificationOtpHash');
    assert(safeObj.resetPasswordOtpHash === undefined, 'toSafeObject strictly omits resetPasswordOtpHash');
    assert(safeObj.verificationOtpAttempts === undefined, 'toSafeObject strictly omits verificationOtpAttempts');
    assert(safeObj.resetPasswordOtpAttempts === undefined, 'toSafeObject strictly omits resetPasswordOtpAttempts');

    // toJSON transform check
    const jsonObj = user.toJSON();
    assert(jsonObj.passwordHash === undefined, 'toJSON transform strips passwordHash');
    assert(jsonObj.verificationOtpHash === undefined, 'toJSON transform strips verificationOtpHash');
    assert(jsonObj.resetPasswordOtpHash === undefined, 'toJSON transform strips resetPasswordOtpHash');
    assert(jsonObj.verificationOtpAttempts === undefined, 'toJSON transform strips verificationOtpAttempts');
    assert(jsonObj.resetPasswordOtpAttempts === undefined, 'toJSON transform strips resetPasswordOtpAttempts');
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n=== USER MODEL & OTP SCHEMA VERIFICATION SUMMARY ===');
  console.log(`Total Assertions: ${totalAssertions}`);
  console.log(`Passed: ${passedAssertions}`);
  console.log(`Failed: ${failedAssertions}\n`);

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
