import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Garment,
  GarmentFilterState,
  PaginationInfo,
} from '../types';
import {
  fetchGarments,
  fetchGarmentById,
  deleteGarment as apiDeleteGarment,
  WardrobeApiError,
} from '../api/wardrobeApi';

const DEFAULT_PAGINATION: PaginationInfo = {
  page: 1,
  limit: 24,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

export function useWardrobe(initialFilters: GarmentFilterState = {}) {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<GarmentFilterState>({
    category: 'All',
    search: '',
    sort: 'createdAt_desc',
    page: 1,
    limit: 24,
    ...initialFilters,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debounced search tracking
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || '');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setFilters((prev) => ({ ...prev, page: 1 }));
    }, 350);
  }, []);

  const loadGarments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeFilters: GarmentFilterState = {
        ...filters,
        search: debouncedSearch,
      };
      const response = await fetchGarments(activeFilters);
      setGarments(response.garments || []);
      setPagination(response.pagination || DEFAULT_PAGINATION);
    } catch (err: any) {
      const msg = err instanceof WardrobeApiError ? err.message : 'Unable to load wardrobe garments.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [filters.category, filters.season, filters.formality, filters.sort, filters.page, filters.limit, debouncedSearch]);

  useEffect(() => {
    loadGarments();
  }, [loadGarments]);

  // Set category filter and reset to page 1
  const setCategory = useCallback((category: string) => {
    setFilters((prev) => ({ ...prev, category, page: 1 }));
  }, []);

  // Set formality filter and reset to page 1
  const setFormality = useCallback((formality: string) => {
    setFilters((prev) => ({ ...prev, formality, page: 1 }));
  }, []);

  // Set season filter and reset to page 1
  const setSeason = useCallback((season: string) => {
    setFilters((prev) => ({ ...prev, season, page: 1 }));
  }, []);

  // Set sort order
  const setSort = useCallback((sort: GarmentFilterState['sort']) => {
    setFilters((prev) => ({ ...prev, sort, page: 1 }));
  }, []);

  // Set page
  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  /**
   * Refreshes an expired signed image URL for a specific garment without reloading the whole page.
   * Calls GET /api/wardrobe/garments/:id which generates a fresh signed URL.
   */
  const refreshGarmentUrl = useCallback(async (garmentId: string): Promise<string | null> => {
    try {
      const { garment } = await fetchGarmentById(garmentId);
      if (garment && garment.signedUrl) {
        setGarments((prev) =>
          prev.map((g) => (g._id === garmentId ? { ...g, signedUrl: garment.signedUrl } : g))
        );
        return garment.signedUrl;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Handle local state addition after garment creation
  const handleGarmentCreated = useCallback((newGarment: Garment) => {
    setGarments((prev) => [newGarment, ...prev]);
    setPagination((prev) => ({ ...prev, totalItems: prev.totalItems + 1 }));
  }, []);

  // Handle local state update after garment edit
  const handleGarmentUpdated = useCallback((updatedGarment: Garment) => {
    setGarments((prev) => prev.map((g) => (g._id === updatedGarment._id ? updatedGarment : g)));
  }, []);

  // Handle local state deletion after garment deletion
  const handleGarmentDeleted = useCallback((deletedId: string) => {
    setGarments((prev) => prev.filter((g) => g._id !== deletedId));
    setPagination((prev) => ({ ...prev, totalItems: Math.max(0, prev.totalItems - 1) }));
  }, []);

  return {
    garments,
    pagination,
    filters,
    isLoading,
    error,
    setCategory,
    setFormality,
    setSeason,
    setSort,
    setPage,
    setSearch: handleSearchChange,
    refresh: loadGarments,
    refreshGarmentUrl,
    handleGarmentCreated,
    handleGarmentUpdated,
    handleGarmentDeleted,
  };
}
