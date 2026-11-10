import { Garment, PaginationInfo } from '../wardrobe/types';

export interface Outfit {
  _id: string;
  userId: string;
  name: string;
  notes?: string;
  garments: Garment[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOutfitPayload {
  name: string;
  garments: string[];
  notes?: string;
}

export interface UpdateOutfitPayload {
  name?: string;
  garments?: string[];
  notes?: string;
}

export interface OutfitListResponse {
  success: boolean;
  outfits: Outfit[];
  pagination: PaginationInfo;
}

export interface OutfitResponse {
  success: boolean;
  outfit: Outfit;
}

export interface DeleteOutfitResponse {
  success: boolean;
  message: string;
  outfitId: string;
}

export interface OutfitFilterState {
  page?: number;
  limit?: number;
  search?: string;
  sort?: 'createdAt_desc' | 'createdAt_asc' | 'name_asc' | 'name_desc' | string;
}

export interface StyleScoreComponent {
  score: number;
  maxScore: number;
  label: string;
}

export interface OutfitCompatibilityBreakdown {
  score: number;
  tier: 'Exceptional' | 'Strong' | 'Acceptable' | 'Incompatible' | string;
  breakdown: {
    colorHarmony: StyleScoreComponent;
    occasionSuitability: StyleScoreComponent;
    garmentCompatibility: StyleScoreComponent;
    seasonCohesion: StyleScoreComponent;
  };
  matchReasons: string[];
  warnings: string[];
  uncertainties: string[];
}

export interface OutfitRecommendation {
  id: string;
  name: string;
  occasion: string;
  stylingReasoning: string;
  compatibility?: OutfitCompatibilityBreakdown;
  garments: Garment[];
}

export interface RecommendationRequest {
  prompt?: string;
  occasion?: string;
  season?: string;
  count?: number;
}

export interface RecommendationResponse {
  success: boolean;
  recommendations: OutfitRecommendation[];
  prompt?: string;
  occasion?: string;
  season?: string;
  totalGarmentsEvaluated: number;
  notice?: string;
  error?: string;
  code?: string;
  retryAfterSeconds?: number;
}
