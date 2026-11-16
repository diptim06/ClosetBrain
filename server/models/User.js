import mongoose from 'mongoose';

const SHA256_HEX_REGEX = /^[a-fA-F0-9]{64}$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please enter a valid email address',
      ],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },

    // ------------------------------------------------------------------------
    // Email Verification State & OTP Fields
    // ------------------------------------------------------------------------
    // Note on isEmailVerified:
    // We intentionally omit `default: false` here. In Mongoose, an unconditional
    // schema default of false causes all legacy users in MongoDB (who lack this field)
    // to be hydrated in-memory with `isEmailVerified: false`, which would lock them out
    // of login. New registrations in Phase 4 explicitly set `isEmailVerified: false`.
    // Use user.isVerified() or check `user.isEmailVerified !== false` for backward compatibility.
    isEmailVerified: {
      type: Boolean,
      index: true,
      sparse: true,
    },
    verificationOtpHash: {
      type: String,
      default: null,
      trim: true,
      alias: 'signupOtpHash',
      validate: {
        validator: function (v) {
          if (v === null || v === undefined) return true;
          return typeof v === 'string' && SHA256_HEX_REGEX.test(v);
        },
        message: 'Signup verification OTP hash must be a valid 64-character SHA-256 hex string.',
      },
    },
    verificationOtpExpiresAt: {
      type: Date,
      default: null,
      alias: 'signupOtpExpiresAt',
    },
    verificationOtpAttempts: {
      type: Number,
      default: 0,
      min: [0, 'Verification attempts counter cannot be negative.'],
      alias: 'signupOtpAttempts',
    },
    verificationOtpLastSentAt: {
      type: Date,
      default: null,
      alias: 'signupOtpLastSentAt',
    },

    // ------------------------------------------------------------------------
    // Password Reset State & OTP Fields
    // ------------------------------------------------------------------------
    resetPasswordOtpHash: {
      type: String,
      default: null,
      trim: true,
      alias: 'resetOtpHash',
      validate: {
        validator: function (v) {
          if (v === null || v === undefined) return true;
          return typeof v === 'string' && SHA256_HEX_REGEX.test(v);
        },
        message: 'Password reset OTP hash must be a valid 64-character SHA-256 hex string.',
      },
    },
    resetPasswordOtpExpiresAt: {
      type: Date,
      default: null,
      alias: 'resetOtpExpiresAt',
    },
    resetPasswordOtpAttempts: {
      type: Number,
      default: 0,
      min: [0, 'Password reset attempts counter cannot be negative.'],
      alias: 'resetOtpAttempts',
    },
    resetPasswordOtpLastSentAt: {
      type: Date,
      default: null,
      alias: 'resetOtpLastSentAt',
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.verificationOtpHash;
        delete ret.verificationOtpExpiresAt;
        delete ret.verificationOtpAttempts;
        delete ret.verificationOtpLastSentAt;
        delete ret.resetPasswordOtpHash;
        delete ret.resetPasswordOtpExpiresAt;
        delete ret.resetPasswordOtpAttempts;
        delete ret.resetPasswordOtpLastSentAt;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.verificationOtpHash;
        delete ret.verificationOtpExpiresAt;
        delete ret.verificationOtpAttempts;
        delete ret.verificationOtpLastSentAt;
        delete ret.resetPasswordOtpHash;
        delete ret.resetPasswordOtpExpiresAt;
        delete ret.resetPasswordOtpAttempts;
        delete ret.resetPasswordOtpLastSentAt;
        return ret;
      },
    },
  }
);

// Virtual aliases for alternative naming consistency
userSchema.virtual('verificationOtpSentAt')
  .get(function () { return this.verificationOtpLastSentAt; })
  .set(function (v) { this.verificationOtpLastSentAt = v; });

userSchema.virtual('resetPasswordOtpSentAt')
  .get(function () { return this.resetPasswordOtpLastSentAt; })
  .set(function (v) { this.resetPasswordOtpLastSentAt = v; });

// Security guardrail: Reject any attempt to assign raw plaintext OTPs to the user model
userSchema.pre('validate', function () {
  const forbiddenKeys = ['otp', 'rawOtp', 'plaintextOtp', 'verificationOtp', 'resetOtp'];
  for (const key of forbiddenKeys) {
    if (this[key] !== undefined || (this._doc && this._doc[key] !== undefined)) {
      throw new Error(`Security violation: raw OTP field '${key}' must never be stored on User document.`);
    }
  }
});

// Helper method to determine if a user account is verified.
// Legacy accounts without `isEmailVerified` (undefined) are treated as verified
// to ensure zero lockouts for existing users.
userSchema.methods.isVerified = function () {
  return this.isEmailVerified !== false;
};

// Helper method to safely return public user data without password hash or OTP secrets
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
export default User;
