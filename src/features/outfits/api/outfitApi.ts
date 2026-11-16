import {
  OutfitListResponse,
  OutfitResponse,
  DeleteOutfitResponse,
  CreateOutfitPayload,
  UpdateOutfitPayload,
  OutfitFilterState,
  RecommendationRequest,
  RecommendationResponse,
} from '../types';

export class OutfitApiError extends Error {
  status?: number;
  code?: string;
  errors?: string[];

  constructor(message: string, status?: number, code?: string, errors?: string[]) {
    super(message);
    this.name = 'OutfitApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error || data?.message || `Request failed with status ${res.status}`;
    throw new OutfitApiError(message, res.status, data?.code, data?.errors);
  }

  return data as T;
}

/**
 * Lists outfits for the authenticated user with optional pagination, sorting, and search.
 */
export async function fetchOutfits(filters: OutfitFilterState = {}): Promise<OutfitListResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.search) params.append('search', filters.search);
  if (filters.sort) params.append('sort', filters.sort);

  const url = `/api/outfits${params.toString() ? `?${params.toString()}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  return handleResponse<OutfitListResponse>(res);
}

/**
 * Fetches a single outfit by ID with populated garments and signed image URLs.
 */
export async function fetchOutfitById(outfitId: string): Promise<OutfitResponse> {
  const res = await fetch(`/api/outfits/${encodeURIComponent(outfitId)}`, {
    method: 'GET',
    credentials: 'include',
  });

  return handleResponse<OutfitResponse>(res);
}

/**
 * Creates a new outfit with 1–10 referenced garments.
 */
export async function createOutfit(payload: CreateOutfitPayload): Promise<OutfitResponse> {
  const res = await fetch('/api/outfits', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<OutfitResponse>(res);
}

/**
 * Updates an outfit's name, notes, or referenced garments.
 */
export async function updateOutfit(
  outfitId: string,
  payload: UpdateOutfitPayload
): Promise<OutfitResponse> {
  const res = await fetch(`/api/outfits/${encodeURIComponent(outfitId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<OutfitResponse>(res);
}

/**
 * Deletes an outfit scoped to the authenticated user.
 */
export async function deleteOutfit(outfitId: string): Promise<DeleteOutfitResponse> {
  const res = await fetch(`/api/outfits/${encodeURIComponent(outfitId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  return handleResponse<DeleteOutfitResponse>(res);
}

/**
 * Generates AI outfit recommendations using garments owned by the authenticated user.
 */
export async function fetchOutfitRecommendations(
  params: RecommendationRequest = {}
): Promise<RecommendationResponse> {
  const res = await fetch('/api/outfits/recommendations', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  return handleResponse<RecommendationResponse>(res);
}
