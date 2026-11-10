export type GarmentCategory =
  | 'Tops'
  | 'Bottoms'
  | 'Outerwear'
  | 'Dresses'
  | 'Shoes'
  | 'Accessories'
  | 'Ethnic Wear';

export const ETHNIC_SUBCATEGORIES = [
  'Saree',
  'Anarkali Suit',
  'Salwar Suit',
  'Kurta',
  'Lehenga',
  'Sharara',
  'Ethnic Set',
] as const;

export type EthnicSubcategory = (typeof ETHNIC_SUBCATEGORIES)[number];

export type GarmentPattern =
  | 'Solid'
  | 'Striped'
  | 'Plaid'
  | 'Check'
  | 'Floral'
  | 'Textured'
  | 'Graphic'
  | 'Other';

export type GarmentSeason =
  | 'Spring'
  | 'Summer'
  | 'Autumn'
  | 'Winter'
  | 'All-Season';

export type GarmentFormality =
  | 'Casual'
  | 'Smart Casual'
  | 'Business Casual'
  | 'Formal'
  | 'Lounge';

export type GarmentColorFamily =
  | 'Neutrals'
  | 'Earth Tones'
  | 'Monochrome'
  | 'Pastels'
  | 'Vibrant'
  | 'Metallics';

export type GarmentFit =
  | 'Fitted'
  | 'Slim'
  | 'Regular'
  | 'Relaxed'
  | 'Oversized';

export interface Garment {
  _id: string;
  name: string;
  category: GarmentCategory;
  subCategory?: string | null;
  isCompleteSet?: boolean;
  primaryColor: string;
  secondaryColors?: string[];
  colorFamily?: GarmentColorFamily;
  brand?: string | null;
  material?: string | null;
  pattern: GarmentPattern;
  season: GarmentSeason[];
  formality: GarmentFormality;
  fit: GarmentFit;
  signedUrl: string;
  tags?: string[];
  notes?: string;
  aiAnalyzed?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UploadImageResponse {
  success: boolean;
  uploadId: string;
  signedUrl: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

export interface GeminiAttributes {
  category: string;
  subcategory: string | null;
  color: string;
  secondaryColors: string[];
  pattern: string;
  material: string | null;
  occasion: string;
  season: string[];
  style: string;
  description: string;
}

export interface AnalyzeImageResponse {
  success: boolean;
  uploadId: string;
  signedUrl: string;
  attributes: GeminiAttributes;
}

export interface CreateGarmentPayload {
  uploadId: string;
  attributes: {
    name: string;
    category: GarmentCategory;
    subCategory?: string | null;
    isCompleteSet?: boolean;
    primaryColor: string;
    secondaryColors?: string[];
    colorFamily?: GarmentColorFamily;
    brand?: string | null;
    material?: string | null;
    pattern?: GarmentPattern;
    season?: GarmentSeason[];
    formality?: GarmentFormality;
    fit?: GarmentFit;
    tags?: string[];
    notes?: string;
    aiAnalyzed?: boolean;
  };
}

export interface UpdateGarmentPayload {
  name?: string;
  category?: GarmentCategory;
  subCategory?: string | null;
  isCompleteSet?: boolean;
  primaryColor?: string;
  secondaryColors?: string[];
  colorFamily?: GarmentColorFamily;
  brand?: string | null;
  material?: string | null;
  pattern?: GarmentPattern;
  season?: GarmentSeason[];
  formality?: GarmentFormality;
  fit?: GarmentFit;
  tags?: string[];
  notes?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface GarmentListResponse {
  success: boolean;
  garments: Garment[];
  pagination: PaginationInfo;
}

export interface GarmentFilterState {
  category?: string;
  season?: string;
  formality?: string;
  search?: string;
  sort?: 'createdAt_desc' | 'createdAt_asc' | 'name_asc' | 'name_desc';
  page?: number;
  limit?: number;
}

export interface ColorDistributionItem {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface WardrobeCategoryCounts {
  Tops: number;
  Bottoms: number;
  Outerwear: number;
  Dresses: number;
  'Ethnic Wear': number;
  Shoes: number;
  Accessories: number;
  [category: string]: number;
}

export interface WardrobeSummary {
  totalItems: number;
  totalGarments: number;
  recentlyAddedThisWeek: number;
  categoryCounts: WardrobeCategoryCounts;
  colorDistribution: ColorDistributionItem[];
  topTone: string;
  topBrands: string[];
}

export interface WardrobeSummaryResponse {
  success: boolean;
  summary: WardrobeSummary;
  totalItems: number;
  totalGarments: number;
  recentlyAddedThisWeek: number;
  categoryCounts: WardrobeCategoryCounts;
  colorDistribution: ColorDistributionItem[];
  topTone: string;
  topBrands: string[];
}
