import {
  UploadImageResponse,
  AnalyzeImageResponse,
  CreateGarmentPayload,
  UpdateGarmentPayload,
  GarmentListResponse,
  GarmentFilterState,
  Garment,
  WardrobeSummaryResponse,
} from '../types';

export class WardrobeApiError extends Error {
  status?: number;
  code?: string;
  errors?: string[];

  constructor(message: string, status?: number, code?: string, errors?: string[]) {
    super(message);
    this.name = 'WardrobeApiError';
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
    throw new WardrobeApiError(message, res.status, data?.code, data?.errors);
  }

  return data as T;
}

/**
 * Uploads a garment image to backend private Cloudflare R2 storage.
 * Creates an authenticated TemporaryUpload record.
 */
export async function uploadGarmentImage(file: File): Promise<UploadImageResponse> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch('/api/wardrobe/upload-image', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  return handleResponse<UploadImageResponse>(res);
}

/**
 * Requests Gemini AI vision analysis of an existing temporary upload.
 * Returns suggested garment attributes. Never creates a garment in DB.
 */
export async function analyzeGarmentImage(uploadId: string): Promise<AnalyzeImageResponse> {
  const res = await fetch('/api/wardrobe/analyze', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uploadId }),
  });

  return handleResponse<AnalyzeImageResponse>(res);
}

/**
 * Explicitly claims temporary upload and persists garment metadata in MongoDB.
 */
export async function createGarment(payload: CreateGarmentPayload): Promise<{ success: boolean; garment: Garment }> {
  const res = await fetch('/api/wardrobe/garments', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<{ success: boolean; garment: Garment }>(res);
}

/**
 * Lists user's garments with search, category filtering, sorting, and pagination.
 */
export async function fetchGarments(filters: GarmentFilterState = {}): Promise<GarmentListResponse> {
  const queryParams = new URLSearchParams();

  if (filters.category && filters.category !== 'All') {
    queryParams.append('category', filters.category);
  }
  if (filters.season && filters.season !== 'All') {
    queryParams.append('season', filters.season);
  }
  if (filters.formality && filters.formality !== 'All') {
    queryParams.append('formality', filters.formality);
  }
  if (filters.search && filters.search.trim()) {
    queryParams.append('search', filters.search.trim());
  }
  if (filters.sort) {
    queryParams.append('sort', filters.sort);
  }
  if (filters.page) {
    queryParams.append('page', String(filters.page));
  }
  if (filters.limit) {
    queryParams.append('limit', String(filters.limit));
  }

  const queryString = queryParams.toString();
  const url = queryString ? `/api/wardrobe/garments?${queryString}` : '/api/wardrobe/garments';

  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  return handleResponse<GarmentListResponse>(res);
}

/**
 * Fetches a single garment by ID (belonging strictly to authenticated user).
 * Provides a fresh signed URL if previous one expired.
 */
export async function fetchGarmentById(id: string): Promise<{ success: boolean; garment: Garment }> {
  const res = await fetch(`/api/wardrobe/garments/${id}`, {
    method: 'GET',
    credentials: 'include',
  });

  return handleResponse<{ success: boolean; garment: Garment }>(res);
}

/**
 * Updates an existing garment's attributes.
 */
export async function updateGarment(
  id: string,
  updates: UpdateGarmentPayload
): Promise<{ success: boolean; garment: Garment }> {
  const res = await fetch(`/api/wardrobe/garments/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  return handleResponse<{ success: boolean; garment: Garment }>(res);
}

/**
 * Safely deletes a garment from MongoDB and queues private R2 image deletion.
 */
export async function deleteGarment(id: string): Promise<{ success: boolean; message: string; garmentId: string }> {
  const res = await fetch(`/api/wardrobe/garments/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  return handleResponse<{ success: boolean; message: string; garmentId: string }>(res);
}

/**
 * Fetches aggregated summary metrics for the authenticated user's wardrobe.
 */
export async function fetchWardrobeSummary(): Promise<WardrobeSummaryResponse> {
  const res = await fetch('/api/wardrobe/summary', {
    method: 'GET',
    credentials: 'include',
  });

  return handleResponse<WardrobeSummaryResponse>(res);
}
