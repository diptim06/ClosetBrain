import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit3,
  Check,
  ArrowRight,
  Tag,
  DollarSign,
  Calendar,
  User,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Garment,
  GarmentCategory,
  GarmentPattern,
  GarmentSeason,
  GarmentFormality,
  GarmentColorFamily,
  GarmentFit,
  GeminiAttributes,
  CreateGarmentPayload,
} from '../types';
import {
  uploadGarmentImage,
  analyzeGarmentImage,
  createGarment,
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

interface AddGarmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGarmentCreated: (garment: Garment) => void;
}

type ModalFlowStep = 'upload' | 'preview_choice' | 'ai_review' | 'edit_form' | 'success';

export const AddGarmentModal: React.FC<AddGarmentModalProps> = ({
  isOpen,
  onClose,
  onGarmentCreated,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal Flow Step
  const [step, setStep] = useState<ModalFlowStep>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Server Identifiers
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Raw Gemini response
  const [geminiResult, setGeminiResult] = useState<GeminiAttributes | null>(null);
  const [naturalExplanation, setNaturalExplanation] = useState<string>('');

  // UI state
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedGarment, setSavedGarment] = useState<Garment | null>(null);

  // Editable Garment Attributes
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GarmentCategory>('Tops');
  const [subCategory, setSubCategory] = useState('');
  const [isCompleteSet, setIsCompleteSet] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColorsInput, setSecondaryColorsInput] = useState('');
  const [colorFamily, setColorFamily] = useState<GarmentColorFamily>('Neutrals');
  const [brand, setBrand] = useState('');
  const [material, setMaterial] = useState('');
  const [pattern, setPattern] = useState<GarmentPattern>('Solid');
  const [seasons, setSeasons] = useState<GarmentSeason[]>(['All-Season']);
  const [formality, setFormality] = useState<GarmentFormality>('Casual');
  const [fit, setFit] = useState<GarmentFit>('Regular');
  const [notes, setNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [aiAnalyzed, setAiAnalyzed] = useState(false);

  // Helper to formulate friendly natural language speech
  const buildNaturalLanguageExplanation = (attrs: GeminiAttributes): string => {
    if (attrs.description && attrs.description.trim()) {
      const trimmed = attrs.description.trim();
      const lower = trimmed.toLowerCase();
      if (lower.startsWith("i've identified this as") || lower.startsWith('i identified this as')) {
        return trimmed;
      }
      if (lower.startsWith('a ') || lower.startsWith('an ')) {
        return `I've identified this as ${lower.charAt(0)}${trimmed.slice(1)}`;
      }
      return `I've identified this as ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
    }
    const colorStr = attrs.color ? `${attrs.color} ` : '';
    const itemStr = attrs.subcategory || attrs.category || 'wardrobe piece';
    const styleStr = attrs.style ? ` with a ${attrs.style.toLowerCase()} aesthetic` : '';
    return `I've identified this as a ${colorStr}${itemStr}${styleStr}.`;
  };

  // Reset all modal state
  const resetForm = () => {
    setStep('upload');
    setIsUploading(false);
    setIsAnalyzing(false);
    setIsSubmitting(false);
    setUploadId(null);
    setPreviewUrl(null);
    setGeminiResult(null);
    setNaturalExplanation('');
    setShowExtraDetails(false);
    setErrorMessage(null);
    setSavedGarment(null);

    setName('');
    setCategory('Tops');
    setSubCategory('');
    setPrimaryColor('');
    setSecondaryColorsInput('');
    setColorFamily('Neutrals');
    setBrand('');
    setMaterial('');
    setPattern('Solid');
    setSeasons(['All-Season']);
    setFormality('Casual');
    setFit('Regular');
    setNotes('');
    setPurchaseDate('');
    setPurchasePrice('');
    setAiAnalyzed(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (isUploading || isAnalyzing || isSubmitting) return;
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  // 1. File Upload Processing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAndUploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processAndUploadFile(file);
  };

  const processAndUploadFile = async (file: File) => {
    setErrorMessage(null);

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WebP, or HEIC).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image size exceeds the 10 MB limit.');
      return;
    }

    try {
      setIsUploading(true);
      const res = await uploadGarmentImage(file);
      setUploadId(res.uploadId);
      setPreviewUrl(res.signedUrl);
      setStep('preview_choice');
    } catch (err: any) {
      const msg = err instanceof WardrobeApiError ? err.message : 'Image upload failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Trigger Gemini AI Assistant
  const handleRunAiAnalysis = async () => {
    if (!uploadId || isAnalyzing) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const res = await analyzeGarmentImage(uploadId);
      const attrs = res.attributes;
      setGeminiResult(attrs);

      // Natural language explanation
      const explanation = buildNaturalLanguageExplanation(attrs);
      setNaturalExplanation(explanation);

      // Pre-populate state for editable profile
      const matchedCat = CATEGORIES.find(
        (c) => c.toLowerCase() === (attrs.category || '').toLowerCase()
      );
      if (matchedCat) {
        setCategory(matchedCat);
        if (matchedCat === 'Ethnic Wear') {
          const subLower = (attrs.subcategory || '').toLowerCase();
          if (
            subLower.includes('anarkali') ||
            subLower.includes('salwar') ||
            subLower.includes('set') ||
            subLower.includes('saree')
          ) {
            setIsCompleteSet(true);
          }
        }
      }

      const generatedName = attrs.subcategory
        ? `${attrs.color ? attrs.color + ' ' : ''}${attrs.subcategory}`
        : attrs.description?.slice(0, 50) || 'Wardrobe Piece';
      setName(generatedName);

      if (attrs.subcategory && attrs.subcategory.toLowerCase() !== 'unknown') {
        setSubCategory(attrs.subcategory);
      }
      if (attrs.color) setPrimaryColor(attrs.color);
      if (Array.isArray(attrs.secondaryColors) && attrs.secondaryColors.length > 0) {
        setSecondaryColorsInput(attrs.secondaryColors.join(', '));
      }
      if (attrs.material && attrs.material.toLowerCase() !== 'unknown') {
        setMaterial(attrs.material);
      }

      const matchedPattern = PATTERNS.find(
        (p) => p.toLowerCase() === (attrs.pattern || '').toLowerCase()
      );
      if (matchedPattern) setPattern(matchedPattern);

      const matchedFormality = FORMALITIES.find(
        (f) => f.toLowerCase() === (attrs.occasion || '').toLowerCase()
      );
      if (matchedFormality) setFormality(matchedFormality);

      if (Array.isArray(attrs.season) && attrs.season.length > 0) {
        const validated = attrs.season
          .map((s) => SEASONS.find((vs) => vs.toLowerCase() === s.toLowerCase()))
          .filter(Boolean) as GarmentSeason[];
        if (validated.length > 0) {
          setSeasons(Array.from(new Set(validated)));
        }
      }

      setAiAnalyzed(true);
      setStep('ai_review');
    } catch (err: any) {
      setErrorMessage(
        err.message || 'AI analysis could not complete. You may proceed with manual entry.'
      );
      // Fallback to manual entry while preserving the uploaded image
      setStep('edit_form');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 3. User chooses manual entry without Gemini
  const handleChooseManualEntry = () => {
    setAiAnalyzed(false);
    setGeminiResult(null);
    setNaturalExplanation('');
    setStep('edit_form');
  };

  // Toggle seasons in edit form
  const toggleSeason = (s: GarmentSeason) => {
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

  // Construct final notes with any user-provided purchase details
  const buildCombinedNotes = (): string => {
    const parts: string[] = [];
    if (purchaseDate.trim() || purchasePrice.trim()) {
      const meta: string[] = [];
      if (purchaseDate.trim()) meta.push(`Acquired: ${purchaseDate.trim()}`);
      if (purchasePrice.trim()) meta.push(`Value: ${purchasePrice.trim()}`);
      parts.push(`[${meta.join(' • ')}]`);
    }
    if (notes.trim()) {
      parts.push(notes.trim());
    }
    return parts.join(' ').slice(0, 500);
  };

  // 4. Primary Action: "Looks good, add to my closet"
  const handleLooksGoodSave = async () => {
    if (!uploadId || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const finalName = name.trim() || (geminiResult?.subcategory ? `${geminiResult.color} ${geminiResult.subcategory}` : 'Wardrobe Garment');
    const finalPrimaryColor = primaryColor.trim() || geminiResult?.color || 'Neutral';

    const secondaryColors = secondaryColorsInput
      ? secondaryColorsInput.split(',').map((c) => c.trim()).filter(Boolean)
      : geminiResult?.secondaryColors || [];

    const finalNotes = buildCombinedNotes();

    const payload: CreateGarmentPayload = {
      uploadId,
      attributes: {
        name: finalName,
        category,
        subCategory: subCategory.trim() || (geminiResult?.subcategory !== 'unknown' ? geminiResult?.subcategory : null),
        isCompleteSet: category === 'Ethnic Wear' ? isCompleteSet : false,
        primaryColor: finalPrimaryColor,
        secondaryColors,
        colorFamily,
        brand: brand.trim() || null,
        material: material.trim() || (geminiResult?.material !== 'unknown' ? geminiResult?.material : null),
        pattern,
        season: seasons,
        formality,
        fit,
        notes: finalNotes || undefined,
        aiAnalyzed: true,
      },
    };

    try {
      const res = await createGarment(payload);
      if (res.success && res.garment) {
        setSavedGarment(res.garment);
        onGarmentCreated(res.garment);
        setStep('success');
      }
    } catch (err: any) {
      const msg = err instanceof WardrobeApiError ? err.message : 'Failed to save garment to wardrobe.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Submit from Editable Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadId || isSubmitting) return;

    if (!name.trim()) {
      setErrorMessage('Please provide a garment name.');
      return;
    }
    if (!primaryColor.trim()) {
      setErrorMessage('Please specify the primary color.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const secondaryColors = secondaryColorsInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const finalNotes = buildCombinedNotes();

    const payload: CreateGarmentPayload = {
      uploadId,
      attributes: {
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
        notes: finalNotes || undefined,
        aiAnalyzed,
      },
    };

    try {
      const res = await createGarment(payload);
      if (res.success && res.garment) {
        setSavedGarment(res.garment);
        onGarmentCreated(res.garment);
        setStep('success');
      }
    } catch (err: any) {
      const msg = err instanceof WardrobeApiError ? err.message : 'Failed to save garment to wardrobe.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-[#FDFBF7] border border-[#ECE5DA] rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#ECE5DA] bg-[#FAF6EE]/90 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5B1924]/10 text-[#5B1924] flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C8379] block">
                Personal AI Wardrobe Assistant
              </span>
              <h2 id="modal-headline" className="text-xl font-bold font-editorial text-[#1C1817]">
                {step === 'upload' && <>Add New <span className="font-cursive text-[1.3em] text-[#5B1924] font-normal inline-block px-0.5 align-baseline">Garment</span></>}
                {step === 'preview_choice' && <>Review <span className="font-cursive text-[1.3em] text-[#5B1924] font-normal inline-block px-0.5 align-baseline">Photograph</span></>}
                {step === 'ai_review' && <>AI Garment <span className="font-cursive text-[1.3em] text-[#5B1924] font-normal inline-block px-0.5 align-baseline">Identification</span></>}
                {step === 'edit_form' && <>Refine Garment <span className="font-cursive text-[1.3em] text-[#5B1924] font-normal inline-block px-0.5 align-baseline">Profile</span></>}
                {step === 'success' && <>Garment <span className="font-cursive text-[1.3em] text-[#5B1924] font-normal inline-block px-0.5 align-baseline">Cataloged</span></>}
              </h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isUploading || isAnalyzing || isSubmitting}
            className="w-8 h-8 rounded-full border border-[#ECE5DA] hover:bg-[#F2ECE1] text-[#5E564E] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-800 animate-in fade-in">
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

        <div className="p-6">
          {/* STEP 1: UPLOAD DROPZONE */}
          {step === 'upload' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#D8CEBD] hover:border-[#5B1924] rounded-3xl p-10 flex flex-col items-center justify-center text-center bg-[#FAF6EE] transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-white border border-[#ECE5DA] shadow-xs flex items-center justify-center text-[#5B1924] mb-4 group-hover:scale-105 transition-transform">
                {isUploading ? (
                  <Loader2 size={24} className="animate-spin text-[#5B1924]" />
                ) : (
                  <UploadCloud size={24} />
                )}
              </div>

              <h3 className="text-base font-bold text-[#1C1817] mb-1">
                {isUploading ? 'Validating & Uploading Image...' : 'Drop clothing photograph here, or browse'}
              </h3>
              <p className="text-xs text-[#8C8379] max-w-sm mb-4">
                Supports JPEG, PNG, WebP, or HEIC up to 10 MB. Normalized and stored in private R2 vault.
              </p>

              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  disabled={isUploading}
                  className="py-2.5 px-6 bg-[#5B1924] hover:bg-[#48131C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Uploading to Vault...
                    </>
                  ) : (
                    'Select Image File'
                  )}
                </button>

                <div className="pt-3 border-t border-[#D8CEBD]/60 w-full max-w-sm flex flex-col items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8C8379]">
                    Or quick-test with clothing photo:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <button
                      type="button"
                      id="btn-sample-trench"
                      disabled={isUploading}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          setIsUploading(true);
                          setErrorMessage(null);
                          const res = await fetch('/assets/outfit_today.jpg');
                          const blob = await res.blob();
                          const file = new File([blob], 'outfit_today.jpg', { type: 'image/jpeg' });
                          await processAndUploadFile(file);
                        } catch (err: any) {
                          setErrorMessage(err.message || 'Failed to load sample image.');
                          setIsUploading(false);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#ECE5DA] hover:border-[#5B1924] hover:bg-[#FAF6EE] text-[11px] font-semibold text-[#1C1817] shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>🧥 Double-Breasted Trench</span>
                    </button>
                    <button
                      type="button"
                      id="btn-sample-cashmere"
                      disabled={isUploading}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          setIsUploading(true);
                          setErrorMessage(null);
                          const res = await fetch('/assets/closet_tops.jpg');
                          const blob = await res.blob();
                          const file = new File([blob], 'closet_tops.jpg', { type: 'image/jpeg' });
                          await processAndUploadFile(file);
                        } catch (err: any) {
                          setErrorMessage(err.message || 'Failed to load sample image.');
                          setIsUploading(false);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#ECE5DA] hover:border-[#5B1924] hover:bg-[#FAF6EE] text-[11px] font-semibold text-[#1C1817] shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>👚 Cashmere Knit Top</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & CHOICE (AI vs MANUAL) */}
          {step === 'preview_choice' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5">
                <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#F2ECE1] border border-[#ECE5DA] shadow-sm">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Uploaded Preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-[#FFFFFF]/90 backdrop-blur-md text-[10px] font-semibold text-[#1C1817] border border-[#ECE5DA]">
                    Uploaded to Private Vault
                  </span>
                </div>
              </div>

              <div className="md:col-span-7 space-y-4">
                <div>
                  <h3 className="text-lg font-bold font-editorial text-[#1C1817]">
                    Photograph Ready for Curation
                  </h3>
                  <p className="text-xs text-[#5E564E] mt-1 leading-relaxed">
                    Choose how you would like to catalog this piece into your digital capsule. Let our AI wardrobe assistant auto-detect the silhouette, palette, and fabric, or fill in the details manually.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Primary Path: Gemini AI Assistant */}
                  <button
                    type="button"
                    onClick={handleRunAiAnalysis}
                    disabled={isAnalyzing}
                    className="w-full p-4 rounded-2xl bg-gradient-to-br from-[#FAF6EE] to-[#F2ECE1] border border-[#D8CEBD] hover:border-[#5B1924] transition-all text-left group shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[#5B1924] text-amber-200 flex items-center justify-center">
                          {isAnalyzing ? <Loader2 size={14} className="animate-spin text-white" /> : <Sparkles size={14} />}
                        </span>
                        <span className="text-xs font-bold text-[#1C1817]">
                          {isAnalyzing ? 'Consulting AI Stylist...' : 'Analyze with AI Wardrobe Assistant'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[#5B1924] uppercase tracking-wider bg-[#5B1924]/10 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5E564E] pl-9">
                      Auto-identifies silhouette, fabric weave, color palette, pattern, and occasion.
                    </p>
                  </button>

                  {/* Secondary Path: Manual Entry */}
                  <button
                    type="button"
                    onClick={handleChooseManualEntry}
                    disabled={isAnalyzing}
                    className="w-full p-4 rounded-2xl bg-white border border-[#ECE5DA] hover:border-[#5B1924]/40 hover:bg-[#FAF6EE] transition-all text-left shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-7 h-7 rounded-lg bg-[#FAF6EE] text-[#5E564E] flex items-center justify-center border border-[#ECE5DA]">
                        <Edit3 size={14} />
                      </span>
                      <span className="text-xs font-bold text-[#1C1817]">
                        Enter Details Manually
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5E564E] pl-9">
                      Fill in garment title, category, and styling attributes by hand without AI.
                    </p>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('upload');
                      setPreviewUrl(null);
                      setUploadId(null);
                    }}
                    className="text-xs text-[#8C8379] hover:text-[#1C1817] font-medium transition-colors cursor-pointer"
                  >
                    ← Upload a different photo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: AI REVIEW (Assistant Speech + Organized Attributes + 3 Clear Actions) */}
          {step === 'ai_review' && geminiResult && (
            <div className="space-y-6">
              {/* Top Banner: Stylist Speech Bubble */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FAF6EE] via-[#FDFBF7] to-[#FAF6EE] border border-[#ECE5DA] shadow-xs flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#5B1924] text-amber-200 flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles size={18} />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B1924]">
                      AI Wardrobe Stylist Observation
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924]/40" />
                    <span className="text-[10px] text-[#8C8379]">Confidence Verified</span>
                  </div>
                  <p className="text-sm font-editorial italic text-[#1C1817] leading-relaxed">
                    "{naturalExplanation}"
                  </p>
                </div>
              </div>

              {/* Main Display: Photo + Organized Attributes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Left: Thumbnail & Status */}
                <div className="md:col-span-4 space-y-3">
                  <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#F2ECE1] border border-[#ECE5DA] shadow-xs">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Garment Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <span className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#5B1924]/90 backdrop-blur-md text-[10px] font-semibold text-white flex items-center gap-1 shadow-xs">
                      <Sparkles size={10} className="text-amber-300" /> AI Analyzed
                    </span>
                  </div>

                  <div className="p-3 bg-[#FAF6EE] rounded-xl border border-[#ECE5DA] text-[11px] text-[#5E564E] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#8C8379]">Detected Name:</span>
                      <strong className="text-[#1C1817]">{name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8C8379]">Status:</span>
                      <span className="text-amber-700 font-semibold">Requires Your Confirmation</span>
                    </div>
                  </div>
                </div>

                {/* Right: Detected Attributes in Organized Format */}
                <div className="md:col-span-8 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C8379] mb-2.5">
                      Organized Attribute Breakdown
                    </h4>

                    <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-[#ECE5DA] shadow-xs">
                      {/* Category & Subcategory */}
                      <div>
                        <span className="text-[10px] font-bold text-[#8C8379] uppercase block">
                          Category & Silhouette
                        </span>
                        <span className="text-xs font-bold text-[#1C1817] block mt-0.5">
                          {geminiResult.category}
                        </span>
                        <span className="text-[11px] text-[#5E564E] block">
                          {geminiResult.subcategory && geminiResult.subcategory.toLowerCase() !== 'unknown'
                            ? geminiResult.subcategory
                            : 'Unknown Silhouette'}
                        </span>
                      </div>

                      {/* Primary & Secondary Colors */}
                      <div>
                        <span className="text-[10px] font-bold text-[#8C8379] uppercase block">
                          Palette & Colors
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-bold text-[#1C1817]">
                            {geminiResult.color || 'Neutral'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#5E564E] block">
                          {geminiResult.secondaryColors && geminiResult.secondaryColors.length > 0
                            ? `Accents: ${geminiResult.secondaryColors.join(', ')}`
                            : 'Monochromatic'}
                        </span>
                      </div>

                      {/* Material & Pattern */}
                      <div>
                        <span className="text-[10px] font-bold text-[#8C8379] uppercase block">
                          Material & Texture
                        </span>
                        <span className="text-xs font-bold text-[#1C1817] block mt-0.5">
                          {geminiResult.material && geminiResult.material.toLowerCase() !== 'unknown'
                            ? geminiResult.material
                            : 'Unknown Textile'}
                        </span>
                        <span className="text-[11px] text-[#5E564E] block">
                          Pattern: {geminiResult.pattern || 'Solid'}
                        </span>
                      </div>

                      {/* Fit & Occasion */}
                      <div>
                        <span className="text-[10px] font-bold text-[#8C8379] uppercase block">
                          Fit & Formality
                        </span>
                        <span className="text-xs font-bold text-[#1C1817] block mt-0.5">
                          {geminiResult.occasion || 'Casual'}
                        </span>
                        <span className="text-[11px] text-[#5E564E] block">
                          Fit: {fit}
                        </span>
                      </div>

                      {/* Season & Aesthetic Style */}
                      <div className="col-span-2 pt-2 border-t border-[#ECE5DA] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-[#8C8379] uppercase block mb-1">
                            Seasonal Suitability
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {(geminiResult.season || ['All-Season']).map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded bg-[#FAF6EE] text-[#5B1924] text-[10px] font-semibold border border-[#ECE5DA]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        {geminiResult.style && (
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] font-bold text-[#8C8379] uppercase block">
                              Style Aesthetic
                            </span>
                            <span className="text-xs font-semibold text-[#1C1817]">
                              {geminiResult.style}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Additional Details (Brand, Purchase Date, Price, Notes) */}
                  <div className="border border-[#ECE5DA] rounded-2xl bg-[#FAF6EE]/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowExtraDetails(!showExtraDetails)}
                      className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-[#1C1817] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-[#5B1924]" />
                        <span>Add personal details (Brand, Purchase info, Care notes)</span>
                      </div>
                      {showExtraDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showExtraDetails && (
                      <div className="p-4 pt-1 border-t border-[#ECE5DA] space-y-3 bg-white">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#5E564E] mb-1">
                              Brand / Designer
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. The Row, Lemaire, Acne Studios"
                              value={brand}
                              onChange={(e) => setBrand(e.target.value)}
                              className="w-full bg-[#FAF6EE] border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-1.5 text-xs text-[#1C1817] outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#5E564E] mb-1">
                              Purchase Year / Date
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Autumn 2024"
                              value={purchaseDate}
                              onChange={(e) => setPurchaseDate(e.target.value)}
                              className="w-full bg-[#FAF6EE] border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-1.5 text-xs text-[#1C1817] outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#5E564E] mb-1">
                              Purchase Price / Estimated Value
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. $450"
                              value={purchasePrice}
                              onChange={(e) => setPurchasePrice(e.target.value)}
                              className="w-full bg-[#FAF6EE] border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-1.5 text-xs text-[#1C1817] outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#5E564E] mb-1">
                              Personal Styling & Care Notes
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Dry clean only; purchased in Paris"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              className="w-full bg-[#FAF6EE] border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-1.5 text-xs text-[#1C1817] outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* THREE CLEAR CHOICES */}
                  <div className="pt-2 border-t border-[#ECE5DA] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Secondary Action: Edit details first */}
                    <button
                      type="button"
                      onClick={() => setStep('edit_form')}
                      disabled={isSubmitting}
                      className="py-2.5 px-4 rounded-xl border border-[#ECE5DA] hover:border-[#5B1924]/40 hover:bg-[#FAF6EE] text-xs font-semibold text-[#1C1817] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 size={14} className="text-[#5B1924]" />
                      <span>Edit details first</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="py-2 px-3 text-xs font-semibold text-[#8C8379] hover:text-[#1C1817]"
                      >
                        Cancel
                      </button>

                      {/* Primary Action: Looks good, add to my closet */}
                      <button
                        type="button"
                        onClick={handleLooksGoodSave}
                        disabled={isSubmitting}
                        className="py-2.5 px-6 bg-[#5B1924] hover:bg-[#48131C] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Adding to Closet...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            <span>Looks good, add to my closet</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: EDITABLE GARMENT PROFILE (Form mode) */}
          {step === 'edit_form' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Image Preview */}
              <div className="md:col-span-5 space-y-3">
                <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#F2ECE1] border border-[#ECE5DA] shadow-xs">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Garment Preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {aiAnalyzed ? (
                    <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#5B1924]/90 backdrop-blur-md text-[10px] font-semibold text-white flex items-center gap-1 shadow-xs">
                      <Sparkles size={11} className="text-amber-300" /> AI Suggested
                    </span>
                  ) : (
                    <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-semibold text-[#5E564E] shadow-xs border border-[#ECE5DA]">
                      Manual Entry
                    </span>
                  )}
                </div>

                {aiAnalyzed && naturalExplanation && (
                  <div className="p-3 bg-[#FAF6EE] rounded-xl border border-[#ECE5DA] text-[11px] text-[#5E564E]">
                    <span className="text-[10px] font-bold text-[#5B1924] uppercase block mb-0.5">
                      Stylist Note:
                    </span>
                    <p className="italic font-editorial text-[#1C1817]">
                      "{naturalExplanation}"
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Editable Attributes Form */}
              <form onSubmit={handleFormSubmit} className="md:col-span-7 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                    Garment Name / Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    placeholder="e.g. Mulberry Silk Ivory Blouse"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none transition-colors"
                  />
                </div>

                {/* Category & Subcategory */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                      Category <span className="text-red-500">*</span>
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
                      className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none cursor-pointer"
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
                          ? 'e.g. Anarkali Suit, Saree, Kurta'
                          : 'e.g. Trench Coat, Knit, Blazer'
                      }
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none"
                    />
                  </div>
                </div>

                {/* Dynamic Subcategory Chips */}
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
                        Check if this item is a complete ensemble (e.g. 3-piece Anarkali, Salwar Suit, full set) that should not be paired with western tops or bottoms.
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

                {/* Primary & Secondary Color */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                      Primary Color <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={50}
                      placeholder="e.g. Camel, Charcoal, Ivory"
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
                      className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none cursor-pointer"
                    >
                      {COLOR_FAMILIES.map((fam) => (
                        <option key={fam} value={fam}>
                          {fam}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Secondary Colors */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                    Secondary Colors (Optional comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gold, Cream"
                    value={secondaryColorsInput}
                    onChange={(e) => setSecondaryColorsInput(e.target.value)}
                    className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none"
                  />
                </div>

                {/* Brand & Material */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                      Brand / Designer
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="e.g. The Row, Lemaire, Toteme"
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
                      placeholder="e.g. 100% Cashmere, Wool, Cotton"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none"
                    />
                  </div>
                </div>

                {/* Pattern & Fit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                      Pattern
                    </label>
                    <select
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value as GarmentPattern)}
                      className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none cursor-pointer"
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
                      Fit / Silhouette
                    </label>
                    <select
                      value={fit}
                      onChange={(e) => setFit(e.target.value as GarmentFit)}
                      className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none cursor-pointer"
                    >
                      {FITS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Formality / Occasion */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1817] mb-1">
                    Occasion / Formality
                  </label>
                  <select
                    value={formality}
                    onChange={(e) => setFormality(e.target.value as GarmentFormality)}
                    className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-2 text-xs text-[#1C1817] outline-none cursor-pointer"
                  >
                    {FORMALITIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seasonal Suitability */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1817] mb-1.5">
                    Seasonal Suitability
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SEASONS.map((s) => {
                      const isSelected = seasons.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSeason(s)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#5B1924] text-white border-[#5B1924]'
                              : 'bg-white text-[#5E564E] border-[#ECE5DA] hover:border-[#8C8379]'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Personal Details (Date, Price, Notes) */}
                <div className="pt-2 border-t border-[#ECE5DA] space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8379] block">
                    Personal Wardrobe Information (Optional)
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5E564E] mb-1">
                        Purchase Date / Season
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2024 or Paris Trip"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-1.5 text-xs text-[#1C1817] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5E564E] mb-1">
                        Purchase Price / Value
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. $450"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl px-3 py-1.5 text-xs text-[#1C1817] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#5E564E] mb-1">
                      Care & Styling Notes
                    </label>
                    <textarea
                      rows={2}
                      maxLength={500}
                      placeholder="Care instructions, tailoring notes, or capsule formulas..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-white border border-[#ECE5DA] focus:border-[#5B1924] rounded-xl p-2.5 text-xs text-[#1C1817] outline-none"
                    />
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="pt-3 border-t border-[#ECE5DA] flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (geminiResult) {
                        setStep('ai_review');
                      } else {
                        setStep('preview_choice');
                      }
                    }}
                    disabled={isSubmitting}
                    className="py-2 px-3 text-xs font-semibold text-[#5E564E] hover:text-[#1C1817]"
                  >
                    ← Back
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="py-2.5 px-4 text-xs font-semibold text-[#5E564E] hover:text-[#1C1817]"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="py-2.5 px-6 bg-[#5B1924] hover:bg-[#48131C] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Saving to Wardrobe...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          <span>Confirm & Save Garment</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* STEP 5: SUCCESS STATE */}
          {step === 'success' && savedGarment && (
            <div className="py-8 px-4 text-center space-y-4 max-w-md mx-auto animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-[#5B1924]/10 text-[#5B1924] flex items-center justify-center mx-auto shadow-xs border border-[#5B1924]/20">
                <CheckCircle size={32} />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#5B1924] block">
                  Successfully Cataloged
                </span>
                <h3 className="text-xl font-bold font-editorial text-[#1C1817] mt-1">
                  {savedGarment.name}
                </h3>
                <p className="text-xs text-[#5E564E] mt-1">
                  Added to your digital wardrobe under <strong>{savedGarment.category}</strong>.
                </p>
              </div>

              {savedGarment.signedUrl && (
                <div className="w-28 h-36 mx-auto rounded-xl overflow-hidden border border-[#ECE5DA] shadow-xs my-2 bg-[#F2ECE1]">
                  <img
                    src={savedGarment.signedUrl}
                    alt={savedGarment.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="py-2.5 px-6 bg-[#5B1924] hover:bg-[#48131C] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  View in My Closet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
