import mongoose from 'mongoose';

const garmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Garment must belong to an authenticated user'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Garment title is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Tops', 'Bottoms', 'Outerwear', 'Dresses', 'Shoes', 'Accessories', 'Ethnic Wear'],
      index: true,
    },
    subCategory: {
      type: String,
      trim: true,
      default: null,
    },
    isCompleteSet: {
      type: Boolean,
      default: false,
      index: true,
    },
    primaryColor: {
      type: String,
      required: [true, 'Primary color is required'],
      trim: true,
    },
    secondaryColors: {
      type: [String],
      default: [],
    },
    colorFamily: {
      type: String,
      enum: ['Neutrals', 'Earth Tones', 'Monochrome', 'Pastels', 'Vibrant', 'Metallics'],
      default: 'Neutrals',
    },
    brand: {
      type: String,
      trim: true,
      default: null,
    },
    material: {
      type: String,
      trim: true,
      default: null,
    },
    pattern: {
      type: String,
      enum: ['Solid', 'Striped', 'Plaid', 'Check', 'Floral', 'Textured', 'Graphic', 'Other'],
      default: 'Solid',
    },
    season: {
      type: [String],
      enum: ['Spring', 'Summer', 'Autumn', 'Winter', 'All-Season'],
      default: ['All-Season'],
      index: true,
    },
    formality: {
      type: String,
      enum: ['Casual', 'Smart Casual', 'Business Casual', 'Formal', 'Lounge'],
      default: 'Casual',
      index: true,
    },
    fit: {
      type: String,
      enum: ['Fitted', 'Slim', 'Regular', 'Relaxed', 'Oversized'],
      default: 'Regular',
    },
    imageKey: {
      type: String,
      required: [true, 'R2 private storage key is required'],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    aiAnalyzed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user-scoped queries and performance
garmentSchema.index({ userId: 1, category: 1 });
garmentSchema.index({ userId: 1, createdAt: -1 });

export const Garment = mongoose.model('Garment', garmentSchema);
export default Garment;
