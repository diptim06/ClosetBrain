import mongoose from 'mongoose';

const temporaryUploadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Temporary upload must be tied to a user session'],
      index: true,
    },
    imageKey: {
      type: String,
      required: [true, 'R2 imageKey is required'],
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'claimed', 'expired'],
      default: 'pending',
      index: true,
    },
    mimeType: {
      type: String,
      default: 'image/webp',
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    sizeBytes: {
      type: Number,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Claim upload atomically ensuring ownership and valid state (prevents race conditions & reuse)
temporaryUploadSchema.statics.claimUpload = async function (uploadId, userId) {
  return await this.findOneAndUpdate(
    {
      _id: uploadId,
      userId: userId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    },
    {
      $set: { status: 'claimed' },
    },
    {
      returnDocument: 'after',
    }
  );
};

export const TemporaryUpload = mongoose.model('TemporaryUpload', temporaryUploadSchema);
export default TemporaryUpload;
