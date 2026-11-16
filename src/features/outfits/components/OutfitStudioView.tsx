import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  Check,
  X,
  Trash2,
  Edit3,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  Shirt,
  Layers,
  ImageOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Garment, GarmentCategory } from '../../wardrobe/types';
import { useWardrobe } from '../../wardrobe/hooks/useWardrobe';
import { Outfit } from '../types';
import {
  fetchOutfits,
  fetchOutfitById,
  createOutfit,
  updateOutfit,
  deleteOutfit,
  OutfitApiError,
} from '../api/outfitApi';

interface OutfitStudioViewProps {
  initialOutfitId?: string | null;
  initialGarments?: Garment[];
  initialOutfitName?: string;
  initialOutfitNotes?: string;
  onNavigateToCloset?: () => void;
  onNavigateToLookbook?: () => void;
  onNavigateToCreate?: () => void;
}

const CATEGORIES: (GarmentCategory | 'All')[] = [
  'All',
  'Tops',
  'Bottoms',
  'Outerwear',
  'Dresses',
  'Ethnic Wear',
  'Shoes',
  'Accessories',
];

const MAX_GARMENTS_LIMIT = 10;

export const OutfitStudioView: React.FC<OutfitStudioViewProps> = ({
  initialOutfitId,
  initialGarments,
  initialOutfitName,
  initialOutfitNotes,
  onNavigateToCloset,
  onNavigateToLookbook,
  onNavigateToCreate,
}) => {
  // Wardrobe hook for the garment library
  const {
    garments,
    pagination,
    filters,
    isLoading: isLoadingWardrobe,
    error: wardrobeError,
    setCategory,
    setSearch,
    setPage,
    refresh: refreshWardrobe,
  } = useWardrobe({ limit: 12 });

  // Outfit editing / state
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(initialOutfitId || null);
  const [outfitName, setOutfitName] = useState('');
  const [outfitNotes, setOutfitNotes] = useState('');
  const [selectedGarments, setSelectedGarments] = useState<Garment[]>([]);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingOutfit, setIsLoadingOutfit] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Saved outfits quick selector
  const [isSavedLooksDrawerOpen, setIsSavedLooksDrawerOpen] = useState(false);
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const [isLoadingSavedOutfits, setIsLoadingSavedOutfits] = useState(false);

  // Load existing outfit if initialOutfitId is provided
  const loadOutfitForEditing = useCallback(async (outfitId: string) => {
    setIsLoadingOutfit(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetchOutfitById(outfitId);
      if (res.outfit) {
        setEditingOutfitId(res.outfit._id);
        setOutfitName(res.outfit.name);
        setOutfitNotes(res.outfit.notes || '');
        setSelectedGarments(res.outfit.garments || []);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load outfit for editing.');
    } finally {
      setIsLoadingOutfit(false);
    }
  }, []);

  const initializedPrefillRef = React.useRef(false);

  useEffect(() => {
    if (initialOutfitId) {
      loadOutfitForEditing(initialOutfitId);
    } else if (!initializedPrefillRef.current && initialGarments && initialGarments.length > 0) {
      initializedPrefillRef.current = true;
      setSelectedGarments(initialGarments);
      if (initialOutfitName) setOutfitName(initialOutfitName);
      if (initialOutfitNotes) setOutfitNotes(initialOutfitNotes);
    }
  }, [
    initialOutfitId,
    initialGarments,
    initialOutfitName,
    initialOutfitNotes,
    loadOutfitForEditing,
  ]);

  // Load user's saved outfits for the switcher drawer
  const loadSavedOutfitsList = useCallback(async () => {
    setIsLoadingSavedOutfits(true);
    try {
      const res = await fetchOutfits({ limit: 50, sort: 'createdAt_desc' });
      setSavedOutfits(res.outfits || []);
    } catch {
      // Non-blocking background loader
    } finally {
      setIsLoadingSavedOutfits(false);
    }
  }, []);

  // Quick lookup map for selected garments
  const selectedGarmentIds = useMemo(() => {
    return new Set(selectedGarments.map((g) => g._id));
  }, [selectedGarments]);

  // Toggle selection of a garment
  const handleToggleGarment = (garment: Garment) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (selectedGarmentIds.has(garment._id)) {
      // Remove garment
      setSelectedGarments((prev) => prev.filter((g) => g._id !== garment._id));
    } else {
      // Enforce 10 garment limit
      if (selectedGarments.length >= MAX_GARMENTS_LIMIT) {
        setErrorMessage(
          `Outfit composition limit reached. Maximum ${MAX_GARMENTS_LIMIT} garments allowed per look.`
        );
        return;
      }
      setSelectedGarments((prev) => [...prev, garment]);
    }
  };

  // Remove garment from composition canvas
  const handleRemoveGarment = (garmentId: string) => {
    setErrorMessage(null);
    setSelectedGarments((prev) => prev.filter((g) => g._id !== garmentId));
  };

  // Reset composition to a clean slate
  const handleResetComposition = () => {
    setEditingOutfitId(null);
    setOutfitName('');
    setOutfitNotes('');
    setSelectedGarments([]);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (onNavigateToCreate) {
      onNavigateToCreate();
    }
  };

  // Save or Update Outfit
  const handleSaveOutfit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = outfitName.trim();
    if (!trimmedName) {
      setErrorMessage('Please give your outfit a title before saving.');
      return;
    }

    if (selectedGarments.length === 0) {
      setErrorMessage('An outfit must contain at least one garment from your closet.');
      return;
    }

    if (selectedGarments.length > MAX_GARMENTS_LIMIT) {
      setErrorMessage(`Outfits cannot contain more than ${MAX_GARMENTS_LIMIT} garments.`);
      return;
    }

    const garmentIds = selectedGarments.map((g) => g._id);

    setIsSaving(true);
    try {
      if (editingOutfitId) {
        // PATCH existing outfit
        const res = await updateOutfit(editingOutfitId, {
          name: trimmedName,
          notes: outfitNotes.trim(),
          garments: garmentIds,
        });
        setSuccessMessage(`Look "${res.outfit.name}" updated successfully.`);
      } else {
        // POST new outfit
        const res = await createOutfit({
          name: trimmedName,
          notes: outfitNotes.trim(),
          garments: garmentIds,
        });
        setEditingOutfitId(res.outfit._id);
        setSuccessMessage(`Look "${res.outfit.name}" created and saved to your wardrobe.`);
      }
      loadSavedOutfitsList();
    } catch (err: any) {
      const msg = err instanceof OutfitApiError ? err.message : 'Failed to save outfit. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Outfit
  const handleDeleteOutfit = async () => {
    if (!editingOutfitId) return;

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteOutfit(editingOutfitId);
      setIsDeleteModalOpen(false);
      handleResetComposition();
      setSuccessMessage('Outfit deleted from your collection.');
      loadSavedOutfitsList();
    } catch (err: any) {
      const msg = err instanceof OutfitApiError ? err.message : 'Failed to delete outfit.';
      setErrorMessage(msg);
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-editorial text-[#1C1817]">
            Outfit{' '}
            <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">
              Studio
            </span>
          </h2>
          <p className="text-xs text-[#78716C]">
            Select and combine pieces from your closet into cohesive, personal styling formulas
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onNavigateToLookbook && (
            <button
              type="button"
              onClick={onNavigateToLookbook}
              className="py-2 px-3.5 bg-white border border-[#ECE5DA] hover:border-[#5B1924]/40 text-[#5E564E] hover:text-[#1C1817] text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} /> Outfits
            </button>
          )}

          {editingOutfitId && (
            <button
              type="button"
              onClick={handleResetComposition}
              className="py-2 px-3.5 bg-white border border-[#ECE5DA] hover:border-[#5B1924]/40 text-[#23201D] text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> New Outfit
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsSavedLooksDrawerOpen(true);
              loadSavedOutfitsList();
            }}
            className="py-2 px-3.5 bg-white border border-[#ECE5DA] hover:border-[#5B1924]/40 text-[#5B1924] text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FolderOpen size={14} /> Load Saved Look
          </button>
        </div>
      </div>

      {/* 2. Global Feedback Banners */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl text-rose-800 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 cursor-pointer p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-emerald-800 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToLookbook && (
              <button
                type="button"
                onClick={onNavigateToLookbook}
                className="text-emerald-700 hover:text-emerald-900 font-semibold underline underline-offset-2 cursor-pointer flex items-center gap-1"
              >
                <span>View in Outfits</span>
                <ArrowRight size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 cursor-pointer p-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Workspace: Composition Area (Left) & Library (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================ */}
        {/* LEFT COLUMN: Composition Canvas (5 cols) */}
        {/* ============================================================ */}
        <section
          aria-label="Outfit Composition Canvas"
          className="lg:col-span-5 bg-white border border-[#ECE5DA] rounded-3xl p-5 sm:p-6 shadow-xs space-y-5"
        >
          {/* Canvas Mode Indicator & Count */}
          <div className="flex items-center justify-between pb-3 border-b border-[#F2ECE1]">
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                  editingOutfitId ? 'bg-amber-100 text-amber-800' : 'bg-[#5B1924]/10 text-[#5B1924]'
                }`}
              >
                {editingOutfitId ? <Edit3 size={14} /> : <Sparkles size={14} />}
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#23201D]">
                  {editingOutfitId ? 'Editing Saved Look' : 'New Composition'}
                </h3>
                <span className="text-[10px] text-[#8C8379]">
                  {selectedGarments.length === 0
                    ? 'No garments selected'
                    : `${selectedGarments.length} of ${MAX_GARMENTS_LIMIT} pieces selected`}
                </span>
              </div>
            </div>

            {selectedGarments.length > 0 && (
              <button
                type="button"
                onClick={handleResetComposition}
                className="text-[11px] font-medium text-[#8C8379] hover:text-[#5B1924] transition-colors cursor-pointer"
              >
                Clear Canvas
              </button>
            )}
          </div>

          {/* Form: Name & Notes */}
          <form onSubmit={handleSaveOutfit} className="space-y-4">
            <div>
              <label
                htmlFor="outfit-name"
                className="block text-xs font-semibold text-[#23201D] mb-1.5"
              >
                Outfit Title <span className="text-[#5B1924]">*</span>
              </label>
              <input
                id="outfit-name"
                type="text"
                required
                maxLength={100}
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                placeholder="e.g., Casual Monochrome Weekend, Parisian Autumn Layer..."
                className="w-full bg-[#FAF6EE] border border-[#ECE5DA] focus:border-[#5B1924] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-[#23201D] placeholder:text-[#9E968E] outline-none transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="outfit-notes"
                className="block text-xs font-semibold text-[#23201D] mb-1.5 flex items-center justify-between"
              >
                <span>Styling Notes</span>
                <span className="text-[10px] font-normal text-[#8C8379]">
                  {outfitNotes.length}/500
                </span>
              </label>
              <textarea
                id="outfit-notes"
                rows={2}
                maxLength={500}
                value={outfitNotes}
                onChange={(e) => setOutfitNotes(e.target.value)}
                placeholder="Layering tips, suitable weather, matching accessories..."
                className="w-full bg-[#FAF6EE] border border-[#ECE5DA] focus:border-[#5B1924] focus:bg-white rounded-xl px-3.5 py-2 text-xs text-[#23201D] placeholder:text-[#9E968E] outline-none transition-all resize-none"
              />
            </div>

            {/* Selected Pieces List */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#23201D]">
                <span>Selected Pieces ({selectedGarments.length})</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedGarments.length === MAX_GARMENTS_LIMIT
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-[#F2ECE1] text-[#78716C]'
                  }`}
                >
                  {selectedGarments.length}/{MAX_GARMENTS_LIMIT} Max
                </span>
              </div>

              {isLoadingOutfit ? (
                <div className="p-8 text-center bg-[#FAF6EE] rounded-2xl border border-[#ECE5DA] animate-pulse">
                  <RefreshCw size={20} className="animate-spin mx-auto text-[#5B1924] mb-2" />
                  <p className="text-xs text-[#8C8379]">Loading outfit composition...</p>
                </div>
              ) : selectedGarments.length === 0 ? (
                /* Empty Canvas State */
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-[#E0D7C9] bg-[#FAF6EE]/50 flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-[#ECE5DA] flex items-center justify-center text-[#8C8379] shadow-xs">
                    <Layers size={20} />
                  </div>
                  <h4 className="text-xs font-bold text-[#23201D]">Composition Canvas Empty</h4>
                  <p className="text-[11px] text-[#78716C] max-w-xs leading-relaxed">
                    Select pieces from your wardrobe library on the right. Combine up to{' '}
                    {MAX_GARMENTS_LIMIT} garments to complete this look.
                  </p>
                </div>
              ) : (
                /* Staged Garment List */
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {selectedGarments.map((garment, idx) => (
                    <div
                      key={garment._id}
                      className="group bg-[#FAF6EE] hover:bg-[#F5EFE4] border border-[#ECE5DA] rounded-xl p-2.5 flex items-center gap-3 transition-colors"
                    >
                      {/* Order indicator */}
                      <span className="w-5 text-center text-[10px] font-bold text-[#8C8379]">
                        #{idx + 1}
                      </span>

                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-white border border-[#ECE5DA] overflow-hidden shrink-0 flex items-center justify-center">
                        {garment.signedUrl ? (
                          <img
                            src={garment.signedUrl}
                            alt={garment.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Shirt size={16} className="text-[#8C8379]" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#5B1924] bg-white px-1.5 py-0.5 rounded border border-[#ECE5DA]">
                            {garment.category}
                          </span>
                          <span
                            className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: garment.primaryColor || '#8C8379' }}
                            title={garment.primaryColor}
                          />
                        </div>
                        <h5 className="text-xs font-bold text-[#23201D] truncate mt-0.5">
                          {garment.name}
                        </h5>
                        <p className="text-[10px] text-[#78716C] truncate">
                          {garment.brand || 'Unbranded'}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveGarment(garment._id)}
                        className="text-[#8C8379] hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Remove piece from look"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-[#F2ECE1] flex flex-col sm:flex-row items-center gap-2">
              <button
                type="submit"
                disabled={isSaving || selectedGarments.length === 0 || !outfitName.trim()}
                className="w-full py-2.5 px-4 bg-[#5B1924] hover:bg-[#48131C] disabled:bg-[#8C8379]/40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer border-0"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving Look...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>{editingOutfitId ? 'Update Saved Look' : 'Save Look to Closet'}</span>
                  </>
                )}
              </button>

              {editingOutfitId && (
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-full sm:w-auto py-2.5 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold rounded-xl transition-all border border-rose-200 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  title="Delete this outfit"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Garment Library (7 cols) */}
        {/* ============================================================ */}
        <section
          aria-label="Closet Garment Library"
          className="lg:col-span-7 bg-white border border-[#ECE5DA] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4"
        >
          {/* Library Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#23201D] flex items-center gap-2">
                <span>Select From Your Closet</span>
                <span className="text-[10px] font-medium text-[#78716C] bg-[#FAF6EE] px-2 py-0.5 rounded-full border border-[#ECE5DA]">
                  {pagination.totalItems} available
                </span>
              </h3>
              <p className="text-[11px] text-[#78716C]">
                Click garments to toggle them in your composition
              </p>
            </div>

            {/* Debounced Search Box */}
            <div className="relative w-full sm:w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E968E]" />
              <input
                type="text"
                placeholder="Search pieces..."
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#FAF6EE] border border-[#ECE5DA] focus:border-[#5B1924] focus:bg-white rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#23201D] placeholder:text-[#9E968E] outline-none transition-all"
              />
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isActive = (filters.category || 'All') === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1 rounded-xl transition-all cursor-pointer whitespace-nowrap text-xs border-0 ${
                    isActive
                      ? 'bg-[#5B1924] text-white font-bold shadow-xs'
                      : 'bg-[#FAF6EE] text-[#78716C] hover:text-[#1C1817] hover:bg-[#F2ECE1]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Garment Grid */}
          {isLoadingWardrobe ? (
            /* Skeleton Loading Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[#FAF6EE] border border-[#ECE5DA] rounded-2xl p-2.5 space-y-2 animate-pulse"
                >
                  <div className="aspect-[3/4] w-full rounded-xl bg-[#EFE9DF]" />
                  <div className="h-3 w-3/4 bg-[#EFE9DF] rounded" />
                  <div className="h-2.5 w-1/2 bg-[#EFE9DF] rounded" />
                </div>
              ))}
            </div>
          ) : wardrobeError ? (
            /* Wardrobe Error State */
            <div className="p-8 text-center rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3">
              <AlertCircle size={24} className="mx-auto text-rose-600" />
              <p className="text-xs text-rose-800">{wardrobeError}</p>
              <button
                type="button"
                onClick={refreshWardrobe}
                className="py-1.5 px-3 bg-white text-rose-800 border border-rose-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Retry Loading
              </button>
            </div>
          ) : garments.length === 0 ? (
            /* Empty Library State */
            <div className="p-10 text-center rounded-2xl border-2 border-dashed border-[#ECE5DA] bg-[#FAF6EE]/50 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#ECE5DA] flex items-center justify-center text-[#8C8379] shadow-xs">
                <Shirt size={24} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#23201D]">No Garments Available</h4>
                <p className="text-[11px] text-[#78716C] max-w-xs mt-1">
                  {filters.category !== 'All' || filters.search
                    ? 'No garments match your current filters. Try selecting "All" or clearing your search.'
                    : 'You haven’t added any garments to your closet yet.'}
                </p>
              </div>

              {onNavigateToCloset && filters.category === 'All' && !filters.search && (
                <button
                  type="button"
                  onClick={onNavigateToCloset}
                  className="py-2 px-4 bg-[#5B1924] text-white text-xs font-semibold rounded-xl hover:bg-[#48131C] transition-colors flex items-center gap-1.5 cursor-pointer border-0 shadow-xs"
                >
                  <Plus size={14} /> Add Pieces in My Closet
                </button>
              )}
            </div>
          ) : (
            /* Selectable Garment Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-1">
              {garments.map((garment) => {
                const isSelected = selectedGarmentIds.has(garment._id);
                const selectionIndex = selectedGarments.findIndex((g) => g._id === garment._id);
                const isAtLimit = selectedGarments.length >= MAX_GARMENTS_LIMIT && !isSelected;

                return (
                  <div
                    key={garment._id}
                    onClick={() => handleToggleGarment(garment)}
                    className={`relative rounded-2xl p-2.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-[#5B1924]/5 border-2 border-[#5B1924] shadow-sm'
                        : isAtLimit
                        ? 'bg-[#FAF6EE] border border-[#ECE5DA] opacity-60 cursor-not-allowed'
                        : 'bg-white hover:bg-[#FAF6EE] border border-[#ECE5DA] hover:border-[#5B1924]/40 shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Image Thumbnail */}
                      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-[#F2ECE1] mb-2 border border-[#ECE5DA]/60 flex items-center justify-center">
                        {garment.signedUrl ? (
                          <img
                            src={garment.signedUrl}
                            alt={garment.name}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-center text-[#8C8379]">
                            <ImageOff size={16} />
                            <span className="text-[9px] mt-1">No Image</span>
                          </div>
                        )}

                        {/* Category Chip */}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-[9px] font-bold text-[#5B1924] border border-[#ECE5DA] shadow-xs">
                          {garment.category}
                        </span>

                        {/* Selection Checkmark / Plus Badge */}
                        <div
                          className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                            isSelected
                              ? 'bg-[#5B1924] text-white scale-100'
                              : 'bg-white/90 text-[#8C8379] group-hover:text-[#5B1924] group-hover:scale-110'
                          }`}
                        >
                          {isSelected ? (
                            <span className="text-[10px]">#{selectionIndex + 1}</span>
                          ) : (
                            <Plus size={13} />
                          )}
                        </div>
                      </div>

                      {/* Name & Brand */}
                      <h5 className="text-xs font-bold text-[#23201D] truncate group-hover:text-[#5B1924] transition-colors">
                        {garment.name}
                      </h5>
                      <p className="text-[10px] text-[#78716C] truncate">
                        {garment.brand || 'Unbranded'}
                      </p>
                    </div>

                    {/* Bottom Indicator */}
                    <div className="mt-2 pt-1.5 border-t border-[#F2ECE1] flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1 text-[#8C8379]">
                        <span
                          className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: garment.primaryColor || '#8C8379' }}
                        />
                        <span className="truncate max-w-[65px]">{garment.colorFamily || 'Neutral'}</span>
                      </span>

                      <span
                        className={`font-semibold ${
                          isSelected ? 'text-[#5B1924]' : 'text-[#8C8379]'
                        }`}
                      >
                        {isSelected ? 'Selected' : '+ Add'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Library Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-[#F2ECE1] text-xs text-[#78716C]">
              <button
                type="button"
                disabled={!pagination.hasPrevPage}
                onClick={() => setPage(pagination.page - 1)}
                className="py-1.5 px-3 bg-[#FAF6EE] hover:bg-[#F2ECE1] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-[#ECE5DA]"
              >
                <ChevronLeft size={13} /> Previous
              </button>

              <span className="font-medium text-[11px]">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage(pagination.page + 1)}
                className="py-1.5 px-3 bg-[#FAF6EE] hover:bg-[#F2ECE1] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-[#ECE5DA]"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ============================================================ */}
      {/* 4. Saved Looks Quick-Select Modal / Drawer */}
      {/* ============================================================ */}
      {isSavedLooksDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1817]/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#ECE5DA] shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2ECE1]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#5B1924]/10 text-[#5B1924] flex items-center justify-center">
                  <FolderOpen size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#23201D]">Your Saved Looks</h3>
                  <p className="text-[10px] text-[#78716C]">
                    Select any outfit to load and modify in Outfit Studio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSavedLooksDrawerOpen(false)}
                className="text-[#8C8379] hover:text-[#23201D] p-1.5 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Outfits List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isLoadingSavedOutfits ? (
                <div className="p-8 text-center text-xs text-[#8C8379] animate-pulse">
                  <RefreshCw size={20} className="animate-spin mx-auto text-[#5B1924] mb-2" />
                  Loading your saved outfits...
                </div>
              ) : savedOutfits.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#78716C] bg-[#FAF6EE] rounded-2xl border border-[#ECE5DA] space-y-1">
                  <p className="font-bold text-[#23201D]">No saved outfits yet</p>
                  <p className="text-[11px]">
                    Create your first look on the canvas and save it to see it listed here.
                  </p>
                </div>
              ) : (
                savedOutfits.map((outfit) => (
                  <div
                    key={outfit._id}
                    onClick={() => {
                      loadOutfitForEditing(outfit._id);
                      setIsSavedLooksDrawerOpen(false);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      editingOutfitId === outfit._id
                        ? 'bg-[#5B1924]/5 border-[#5B1924]'
                        : 'bg-[#FAF6EE] hover:bg-[#F5EFE4] border-[#ECE5DA]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#23201D]">{outfit.name}</h4>
                        {editingOutfitId === outfit._id && (
                          <span className="text-[9px] font-bold text-[#5B1924] bg-white px-1.5 py-0.5 rounded border border-[#5B1924]/20">
                            Loaded
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#78716C]">
                        {outfit.garments?.length || 0} pieces
                        {outfit.notes ? ` • ${outfit.notes.slice(0, 45)}...` : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="py-1.5 px-3 bg-white border border-[#ECE5DA] text-[11px] font-semibold text-[#5B1924] rounded-lg shadow-xs hover:border-[#5B1924] transition-colors"
                    >
                      Load
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. Delete Confirmation Modal */}
      {/* ============================================================ */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1817]/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-[#ECE5DA] shadow-xl space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center">
              <Trash2 size={20} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#23201D]">Delete Saved Outfit?</h3>
              <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-[#23201D]">"{outfitName}"</span>? The individual garments in your closet will not be deleted.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 bg-[#FAF6EE] hover:bg-[#F2ECE1] text-[#23201D] text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-[#ECE5DA]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteOutfit}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer border-0 shadow-xs flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Look</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
