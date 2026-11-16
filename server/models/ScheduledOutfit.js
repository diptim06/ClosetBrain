import mongoose from 'mongoose';

export const VALID_SLOTS = [
  'All Day',
  'Morning',
  'Work',
  'Daytime',
  'Evening',
  'Night',
  'Workout',
  'Event',
];

const scheduledOutfitSchema = new mongoose.Schema(
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
      required: [true, 'Outfit reference is required'],
      index: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Date must be formatted as YYYY-MM-DD'],
      index: true,
    },
    slot: {
      type: String,
      enum: {
        values: VALID_SLOTS,
        message: 'Invalid time slot specified: {VALUE}',
      },
      default: 'All Day',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [300, 'Notes cannot exceed 300 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['planned', 'completed', 'cancelled'],
        message: 'Invalid schedule status: {VALUE}',
      },
      default: 'planned',
      index: true,
    },
    wearLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OutfitWearLog',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// 1. Range & Status Query Index per User
scheduledOutfitSchema.index({ userId: 1, date: 1, status: 1 });

// 2. Partial Unique Index: ONLY active 'planned' records are restricted.
// Completed or cancelled entries can be rescheduled without E11000 conflicts.
scheduledOutfitSchema.index(
  { userId: 1, outfitId: 1, date: 1, slot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'planned' },
  }
);

export const ScheduledOutfit = mongoose.model('ScheduledOutfit', scheduledOutfitSchema);
export default ScheduledOutfit;
