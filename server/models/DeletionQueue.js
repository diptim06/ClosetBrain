import mongoose from 'mongoose';

const deletionQueueSchema = new mongoose.Schema(
  {
    imageKey: {
      type: String,
      required: [true, 'imageKey is required for deletion tracking'],
      index: true,
    },
    reason: {
      type: String,
      enum: ['garment_deleted', 'temporary_upload_expired', 'image_replaced'],
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'retrying', 'failed', 'completed'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enqueue a failed deletion for background reconciliation
deletionQueueSchema.statics.enqueue = async function (imageKey, reason, error) {
  return await this.create({
    imageKey,
    reason,
    attempts: 1,
    lastError: error ? (error.message || String(error)) : null,
    status: 'pending',
  });
};

export const DeletionQueue = mongoose.model('DeletionQueue', deletionQueueSchema);
export default DeletionQueue;
