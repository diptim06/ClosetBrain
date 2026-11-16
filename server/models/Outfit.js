import mongoose from 'mongoose';

const outfitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Outfit must belong to an authenticated user'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Outfit name is required'],
      trim: true,
      minlength: [1, 'Outfit name cannot be empty'],
      maxlength: [100, 'Outfit name cannot exceed 100 characters'],
    },
    garments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Garment',
        required: true,
      },
    ],
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user-scoped queries ordered chronologically
outfitSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Outfit', outfitSchema);
