import React, { useState } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Calendar,
  Tag,
  Layers,
} from 'lucide-react';
import {
  Garment,
  GarmentCategory,
  GarmentPattern,
  GarmentSeason,
  GarmentFormality,
  GarmentColorFamily,
  GarmentFit,
  UpdateGarmentPayload,
} from '../types';
import {
  updateGarment,
  deleteGarment,
  WardrobeApiError,
} from '../api/wardrobeApi';

const CATEGORIES: GarmentCategory[] = [
  'Tops',
  'Bottoms',
  'Outerwear',
  'Dresses',
  'Ethnic Wear',
  'Shoes',
  'Accessories',
];

const CATEGORY_SUBCATEGORIES: Record<GarmentCategory, string[]> = {
  Tops: ['T-Shirt', 'Shirt', 'Blouse', 'Knitwear', 'Crop Top', 'Tank Top', 'Hoodie', 'Sweatshirt'],
  Bottoms: ['Jeans', 'Trousers', 'Skirt', 'Shorts', 'Leggings', 'Sweatpants', 'Cargo Pants'],
  Outerwear: ['Blazer', 'Trench Coat', 'Jacket', 'Overcoat', 'Cardigan', 'Vest'],
  Dresses: ['Midi Dress', 'Maxi Dress', 'Mini Dress', 'Slip Dress', 'Wrap Dress', 'Gown'],
  'Ethnic Wear': ['Saree', 'Anarkali Suit', 'Salwar Suit', 'Kurta', 'Lehenga', 'Sharara', 'Ethnic Set'],
  Shoes: ['Loafers', 'Sneakers', 'Boots', 'Heels', 'Flats', 'Sandals', 'Juttis'],
  Accessories: ['Belt', 'Handbag', 'Scarf', 'Dupatta', 'Hat', 'Jewelry', 'Sunglasses'],
};

const PATTERNS: GarmentPattern[] = [
  'Solid',
  'Striped',
  'Plaid',
  'Check',
  'Floral',
  'Textured',
  'Graphic',
  'Other',
];

const SEASONS: GarmentSeason[] = [
  'Spring',
  'Summer',
  'Autumn',
  'Winter',
  'All-Season',
];

const FORMALITIES: GarmentFormality[] = [
  'Casual',
  'Smart Casual',
  'Business Casual',
  'Formal',
  'Lounge',
];

const COLOR_FAMILIES: GarmentColorFamily[] = [
  'Neutrals',
  'Earth Tones',
  'Monochrome',
  'Pastels',
  'Vibrant',
  'Metallics',
];

const FITS: GarmentFit[] = [
  'Fitted',
  'Slim',
  'Regular',
  'Relaxed',
  'Oversized',
];

interface GarmentDetailModalProps {
  garment: Garment | null;
  isOpen: boolean;
  onClose: () => void;
  onGarmentUpdated: (garment: Garment) => void;
  onGarmentDeleted: (garmentId: string) => void;
  onRefreshUrl?: (garmentId: string) => Promise<string | null>;
}

export const GarmentDetailModal: React.FC<GarmentDetailModalProps> = ({
  garment,
  isOpen,
  onClose,
  onGarmentUpdated,
  onGarmentDeleted,
  onRefreshUrl,
}) => {
  if (!isOpen || !garment) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Expired URL recovery
  const [imageSrc, setImageSrc] = useState(garment.signedUrl);
  const [hasRefreshedUrl, setHasRefreshedUrl] = useState(false);

  // Editable fields
  const [name, setName] = useState(garment.name);
  const [category, setCategory] = useState<GarmentCategory>(garment.category);
  const [subCategory, setSubCategory] = useState(garment.subCategory || '');
  const [isCompleteSet, setIsCompleteSet] = useState(Boolean(garment.isCompleteSet));
  const [primaryColor, setPrimaryColor] = useState(garment.primaryColor);
  const [secondaryColorsInput, setSecondaryColorsInput] = useState(
    (garment.secondaryColors || []).join(', ')
  );
  const [colorFamily, setColorFamily] = useState<GarmentColorFamily>(
    garment.colorFamily || 'Neutrals'
  );
  const [brand, setBrand] = useState(garment.brand || '');
  const [material, setMaterial] = useState(garment.material || '');
  const [pattern, setPattern] = useState<GarmentPattern>(garment.pattern || 'Solid');
  const [seasons, setSeasons] = useState<GarmentSeason[]>(
    garment.season && garment.season.length > 0 ? garment.season : ['All-Season']
  );
  const [formality, setFormality] = useState<GarmentFormality>(
    garment.formality || 'Casual'
  );
  const [fit, setFit] = useState<GarmentFit>(garment.fit || 'Regular');
  const [notes, setNotes] = useState(garment.notes || '');

  const handleImageError = async () => {
    if (!hasRefreshedUrl && onRefreshUrl) {
      setHasRefreshedUrl(true);
      const freshUrl = await onRefreshUrl(garment._id);
      if (freshUrl) {
        setImageSrc(freshUrl);
      }
    }
  };

  const handleToggleSeason = (s: GarmentSeason) => {
    setSeasons((prev) => {
      if (s === 'All-Season') return ['All-Season'];
      const filtered = prev.filter((item) => item !== 'All-Season');
      if (filtered.includes(s)) {
        const next = filtered.filter((item) => item !== s);
        return next.length === 0 ? ['All-Season'] : next;
      } else {
        return [...filtered, s];
      }
    });
  };

  const handleSaveEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      setErrorMessage('Garment name cannot be empty.');
      return;
    }
    if (!primaryColor.trim()) {
      setErrorMessage('Primary color cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const secondaryColors = secondaryColorsInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const payload: UpdateGarmentPayload = {
      name: name.trim(),
      category,
      subCategory: subCategory.trim() || null,
      isCompleteSet: category === 'Ethnic Wear' ? isCompleteSet : false,
      primaryColor: primaryColor.trim(),
      secondaryColors,
      colorFamily,
      brand: brand.trim() || null,
      material: material.trim() || null,
      pattern,
      season: seasons,
      formality,
      fit,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await updateGarment(garment._id, payload);
      if (res.success && res.garment) {
        onGarmentUpdated(res.garment);
        setIsEditing(false);
      }
    } catch (err: any) {
      const msg = err instanceof WardrobeApiError ? err.message : 'Failed to update garment.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await deleteGarment(garment._id);
      if (res.success) {
        onGarmentDeleted(garment._id);
        onClose();
      }
    } catch (err: any) {
      const msg = err instanceof WardrobeApiError ? err.message : 'Failed to delete garment.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-[#FDFBF7] border border-[#ECE5DA] rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-headline"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#ECE5DA] bg-[#FAF6EE]/80 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-white border border-[#ECE5DA] text-[10px] font-semibold text-[#5B1924]">
              {garment.category}
            </span>
            {garment.category === 'Ethnic Wear' && (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                garment.isCompleteSet
                  ? 'bg-[#5B1924] text-[#FDFBF7] border-[#5B1924]'
                  : 'bg-[#FAF6EE] text-[#5E564E] border-[#ECE5DA]'
              }`}>
                {garment.isCompleteSet ? 'Complete Set' : 'Separate'}
              </span>
            )}
            {garment.aiAnalyzed && (
              <span className="px-2.5 py-1 rounded-full bg-[#5B1924]/10 text-[#5B1924] text-[10px] font-semibold flex items-center gap-1">
                <Sparkles size={11} /> AI Analyzed
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && !isConfirmingDelete && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 rounded-lg border border-[#ECE5DA] hover:bg-[#F2ECE1] text-[#1C1817] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[#ECE5DA] hover:bg-[#F2ECE1] text-[#5E564E] flex items-center justify-center transition-colors cursor-pointer ml-1"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-800">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Delete Confirmation View */}
        {isConfirmingDelete && (
          <div className="m-6 p-6 bg-red-50/70 border border-red-200 rounded-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-900">
                  Delete "{garment.name}"?
                </h3>
                <p className="text-xs text-red-700 mt-1">
                  This will permanently delete the garment and schedule its image for private removal. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2 text-xs font-semibold text-[#5E564E] hover:text-[#1C1817] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  'Yes, Delete Garment'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left: High-Res Image Display */}
            <div className="md:col-span-5">
              <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#F2ECE1] border border-[#ECE5DA] shadow-xs">
                <img
                  src={imageSrc}
                  alt={garment.name}
                  onError={handleImageError}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="mt-3 text-center">
                <span className="text-[10px] text-[#8C8379]">
                  Added {new Date(garment.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Right: Details or Edit Mode */}
            <div className="md:col-span-7">
              {isEditing ? (
                /* EDIT FORM */
                <form onSubmit={handleSaveEdits} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                      Garment Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => {
                          const newCat = e.target.value as GarmentCategory;
                          setCategory(newCat);
                          if (newCat !== 'Ethnic Wear') {
                            setIsCompleteSet(false);
                          }
                        }}
                        className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                        Subcategory
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        placeholder={
                          category === 'Ethnic Wear'
                            ? 'e.g. Saree, Anarkali Suit, Kurta'
                            : 'e.g. Blazer, Knit, Trench Coat'
                        }
                        value={subCategory}
                        onChange={(e) => setSubCategory(e.target.value)}
                        className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none"
                      />
                    </div>
                  </div>

                  {/* Suggested Subcategory Chips */}
                  {CATEGORY_SUBCATEGORIES[category] && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-medium text-[#8C8379]">Suggested subcategories:</span>
                      <div className="flex flex-wrap gap-1">
                        {CATEGORY_SUBCATEGORIES[category].map((sub) => {
                          const isSelected = subCategory.toLowerCase() === sub.toLowerCase();
                          return (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => {
                                setSubCategory(sub);
                                if (category === 'Ethnic Wear') {
                                  if (['Anarkali Suit', 'Salwar Suit', 'Ethnic Set'].includes(sub)) {
                                    setIsCompleteSet(true);
                                  }
                                }
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#5B1924] text-[#FDFBF7] border-[#5B1924]'
                                  : 'bg-[#FAF6EE] text-[#5E564E] border-[#ECE5DA] hover:bg-[#F2ECE1]'
                              }`}
                            >
                              {sub}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ethnic Wear Complete Set Toggle */}
                  {category === 'Ethnic Wear' && (
                    <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] flex items-center justify-between gap-3 animate-in fade-in">
                      <div>
                        <div className="text-xs font-semibold text-[#1C1817]">Complete Outfit Set</div>
                        <div className="text-[10px] text-[#5E564E] leading-relaxed">
                          Check if this item is a complete ensemble (e.g. 3-piece Anarkali, Salwar Suit, full set) that forms a complete look on its own.
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={isCompleteSet}
                          onChange={(e) => setIsCompleteSet(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[#ECE5DA] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#ECE5DA] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5B1924]" />
                      </label>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                        Primary Color <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={50}
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                        Color Family
                      </label>
                      <select
                        value={colorFamily}
                        onChange={(e) => setColorFamily(e.target.value as GarmentColorFamily)}
                        className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none"
                      >
                        {COLOR_FAMILIES.map((fam) => (
                          <option key={fam} value={fam}>
                            {fam}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                      Secondary Colors
                    </label>
                    <input
                      type="text"
                      value={secondaryColorsInput}
                      onChange={(e) => setSecondaryColorsInput(e.target.value)}
                      className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                        Brand
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                        Material
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        value={material}
                        onChange={(e) => setMaterial(e.target.value)}
                        className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                        Pattern
                      </label>
                      <select
                        value={pattern}
                        onChange={(e) => setPattern(e.target.value as GarmentPattern)}
                        className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none"
                      >
                        {PATTERNS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                        Occasion
                      </label>
                      <select
                        value={formality}
                        onChange={(e) => setFormality(e.target.value as GarmentFormality)}
                        className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none"
                      >
                        {FORMALITIES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Seasons */}
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                      Seasons
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {SEASONS.map((s) => {
                        const isSelected = seasons.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleToggleSeason(s)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#5B1924] text-white border-[#5B1924]'
                                : 'bg-white text-[#5E564E] border-[#ECE5DA]'
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                      Notes
                    </label>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl p-2.5 text-xs text-[#1C1817] outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ECE5DA]">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setIsEditing(false)}
                      className="py-2 px-4 text-xs font-semibold text-[#5E564E] hover:text-[#1C1817]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="py-2 px-5 bg-[#5B1924] hover:bg-[#48131C] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Check size={13} /> Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* READ-ONLY DETAIL VIEW */
                <div className="space-y-6">
                  <div>
                    <h2 id="detail-headline" className="text-2xl font-bold font-editorial text-[#1C1817]">
                      {garment.name}
                    </h2>
                    {garment.brand && (
                      <p className="text-xs text-[#5B1924] font-semibold tracking-wider uppercase mt-1">
                        {garment.brand}
                      </p>
                    )}
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 gap-4 bg-[#FAF6EE] p-4 rounded-2xl border border-[#ECE5DA]">
                    <div>
                      <span className="text-[10px] font-bold text-[#8C8379] uppercase block mb-0.5">
                        Color & Palette
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                          style={{
                            backgroundColor: garment.primaryColor.toLowerCase().includes('#')
                              ? garment.primaryColor
                              : undefined,
                          }}
                        />
                        <span className="text-xs font-bold text-[#1C1817]">
                          {garment.primaryColor}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#5E564E] block mt-0.5">
                        {garment.colorFamily}
                        {garment.secondaryColors && garment.secondaryColors.length > 0 && (
                          <> • Accent: {garment.secondaryColors.join(', ')}</>
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#8C8379] uppercase block mb-0.5">
                        Material & Pattern
                      </span>
                      <span className="text-xs font-bold text-[#1C1817] block">
                        {garment.material || 'Standard Fabric'}
                      </span>
                      <span className="text-[11px] text-[#5E564E] block mt-0.5">
                        {garment.pattern} Pattern
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#8C8379] uppercase block mb-0.5">
                        Formality & Fit
                      </span>
                      <span className="text-xs font-bold text-[#1C1817] block">
                        {garment.formality}
                      </span>
                      <span className="text-[11px] text-[#5E564E] block mt-0.5">
                        {garment.fit} Fit
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#8C8379] uppercase block mb-0.5">
                        Seasons
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(garment.season || ['All-Season']).map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded bg-white text-[10px] font-semibold text-[#5B1924] border border-[#ECE5DA]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {garment.notes && (
                    <div className="p-3.5 bg-white border border-[#ECE5DA] rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8379]">
                        Styling & Care Notes
                      </span>
                      <p className="text-xs text-[#5E564E] leading-relaxed">
                        {garment.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
