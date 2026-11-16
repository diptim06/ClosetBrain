import mongoose from 'mongoose';

const VALID_CATEGORIES = [
  'Tops',
  'Bottoms',
  'Outerwear',
  'Dresses',
  'Shoes',
  'Accessories',
  'Ethnic Wear',
];

const garmentSnapshotSchema = new mongoose.Schema(
  {
    garmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Garment',
      required: [true, 'garmentId is required for wear history analytics'],
      index: true,
    },
    name: {
      type: String,
      default: 'Unnamed Piece',
      trim: true,
    },
    category: {
      type: String,
      enum: {
        values: VALID_CATEGORIES,
        message: 'Invalid garment snapshot category: {VALUE}',
      },
      default: 'Accessories',
    },
    subCategory: {
      type: String,
      default: null,
      trim: true,
    },
    primaryColor: {
      type: String,
      default: null,
      trim: true,
    },
    colorFamily: {
      type: String,
      default: null,
    },
    pattern: {
      type: String,
      default: null,
    },
    season: {
      type: [String],
      default: ['All-Season'],
    },
    imageKey: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const outfitWearLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    outfitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outfit',
      default: null,
      index: true,
    },
    scheduledOutfitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduledOutfit',
      default: null,
    },
    wornDate: {
      type: String,
      required: [true, 'Worn date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Date must be formatted as YYYY-MM-DD'],
      index: true,
    },
    outfitNameSnapshot: {
      type: String,
      required: [true, 'outfitNameSnapshot is required for historical wear preservation'],
      trim: true,
    },
    garmentsSnapshot: {
      type: [garmentSnapshotSchema],
      validate: [
        (val) => Array.isArray(val) && val.length > 0,
        'Wear log must snapshot at least one garment',
      ],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [300, 'Notes cannot exceed 300 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// 1. Wear history chronological query index per User
outfitWearLogSchema.index({ userId: 1, wornDate: -1, createdAt: -1 });

// 2. Partial unique index enforcing 1-to-1 fulfillment for scheduled outfits:
// Prevents duplicate wear logs if a user submits the action twice.
outfitWearLogSchema.index(
  { scheduledOutfitId: 1 },
  {
    unique: true,
    partialFilterExpression: { scheduledOutfitId: { $type: 'objectId' } },
  }
);

// 3. Analytics index for individual garment wear derivations
outfitWearLogSchema.index({ userId: 1, 'garmentsSnapshot.garmentId': 1 });

export const OutfitWearLog = mongoose.model('OutfitWearLog', outfitWearLogSchema);
export default OutfitWearLog;
