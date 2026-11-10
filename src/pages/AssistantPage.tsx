import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShoppingBag,
  Shirt,
  Layers,
  ArrowRight,
  Bookmark,
  Check,
  AlertCircle,
  Clock,
  RefreshCw,
  FolderOpen,
  SlidersHorizontal,
  Quote,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  fetchOutfitRecommendations,
  createOutfit,
  OutfitApiError,
} from '../features/outfits/api/outfitApi';
import { OutfitRecommendation } from '../features/outfits/types';

const OCCASIONS = [
  'All',
  'Casual',
  'Smart Casual',
  'Business Casual',
  'Formal',
  'Lounge',
] as const;

const SEASONS = ['All', 'Spring', 'Summer', 'Fall', 'Winter'] as const;

const QUICK_PROMPTS = [
  'Coffee date & casual afternoon stroll',
  'Important client meeting, sharp and understated',
  'Dinner at a cozy bistro with friends',
  'Warm layered look for a breezy autumn day',
  'Relaxed weekend lounging with elevated comfort',
];

export const AssistantPage: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [selectedOccasion, setSelectedOccasion] = useState<string>('All');
  const [selectedSeason, setSelectedSeason] = useState<string>('All');
  const [promptText, setPromptText] = useState<string>('');

  // Request State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [evaluatedCount, setEvaluatedCount] = useState<number>(0);

  // Error States
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // Save to Lookbook State per Recommendation
  // Keyed by recommendation id or index
  const [saveStatus, setSaveStatus] = useState<
    Record<string, { isSaving: boolean; isSaved: boolean; outfitId?: string; error?: string }>
  >({});

  // Expandable Style Analysis Details per Recommendation
  const [expandedRecs, setExpandedRecs] = useState<Record<string, boolean>>({});

  const toggleExpanded = (recKey: string) => {
    setExpandedRecs((prev) => ({
      ...prev,
      [recKey]: !prev[recKey],
    }));
  };

  // Countdown timer for 429 rate limit
  useEffect(() => {
    if (!retryAfter || retryAfter <= 0) return;
    const interval = setInterval(() => {
      setRetryAfter((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setErrorCode(null);
    setRetryAfter(null);

    try {
      const res = await fetchOutfitRecommendations({
        prompt: promptText.trim() || undefined,
        occasion: selectedOccasion !== 'All' ? selectedOccasion : undefined,
        season: selectedSeason !== 'All' ? selectedSeason : undefined,
        count: 3,
      });

      if (res.success) {
        setRecommendations(res.recommendations || []);
        setEvaluatedCount(res.totalGarmentsEvaluated || 0);
        setHasSearched(true);
        // Reset saved states for new recommendations
        setSaveStatus({});
      } else {
        setErrorMessage(res.error || 'Failed to curate outfit recommendations.');
        setErrorCode(res.code || 'UNKNOWN_ERROR');
        if (res.retryAfterSeconds) {
          setRetryAfter(res.retryAfterSeconds);
        }
      }
    } catch (err: any) {
      if (err instanceof OutfitApiError) {
        setErrorMessage(err.message);
        setErrorCode(err.code || 'API_ERROR');
        if (err.status === 429) {
          // Default to 60s cooldown if header wasn't parsed
          setRetryAfter(60);
        }
      } else {
        setErrorMessage(err?.message || 'A network error occurred. Please try again.');
        setErrorCode('NETWORK_ERROR');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToLookbook = async (rec: OutfitRecommendation, recKey: string) => {
    setSaveStatus((prev) => ({
      ...prev,
      [recKey]: { isSaving: true, isSaved: false },
    }));

    try {
      const garmentIds = rec.garments.map((g) => g._id);
      const res = await createOutfit({
        name: rec.name,
        garments: garmentIds,
        notes: `AI Recommendation (${rec.occasion}): ${rec.stylingReasoning}`,
      });

      if (res.success && res.outfit) {
        setSaveStatus((prev) => ({
          ...prev,
          [recKey]: {
            isSaving: false,
            isSaved: true,
            outfitId: res.outfit._id,
          },
        }));
      } else {
        throw new Error('Outfit creation was not successful.');
      }
    } catch (err: any) {
      setSaveStatus((prev) => ({
        ...prev,
        [recKey]: {
          isSaving: false,
          isSaved: false,
          error: err?.message || 'Could not save to Lookbook.',
        },
      }));
    }
  };

  const handleOpenInStudio = (rec: OutfitRecommendation) => {
    navigate('/outfits/create', {
      state: {
        prefillGarments: rec.garments,
        prefillName: rec.name,
        prefillNotes: `AI Recommendation (${rec.occasion}): ${rec.stylingReasoning}`,
      },
    });
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="pb-2 border-b border-[#ECE5DA]">
        <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1C1817]">
          What Should I{' '}
          <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">
            Wear?
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-[#5E564E] mt-1 leading-relaxed">
          Intelligent outfit curations powered by Gemini, styled strictly from garments in your wardrobe.
        </p>
      </div>

      {/* Control Card: Occasions, Season, & Prompt */}
      <div className="p-5 sm:p-7 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs space-y-6">
        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Occasion Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#1C1817] mb-2.5">
              Occasion
            </label>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((occasion) => {
                const isSelected = selectedOccasion === occasion;
                return (
                  <button
                    key={occasion}
                    type="button"
                    onClick={() => setSelectedOccasion(occasion)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#5B1924] text-[#FDFBF7] shadow-xs'
                        : 'bg-[#FAF6EE] text-[#5E564E] hover:bg-[#F2ECE1] border border-[#ECE5DA]'
                    }`}
                  >
                    {occasion}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Season Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#1C1817] mb-2.5">
              Season Vibe
            </label>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map((season) => {
                const isSelected = selectedSeason === season;
                return (
                  <button
                    key={season}
                    type="button"
                    onClick={() => setSelectedSeason(season)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1C1817] text-[#FDFBF7] shadow-xs'
                        : 'bg-[#FAF6EE] text-[#5E564E] hover:bg-[#F2ECE1] border border-[#ECE5DA]'
                    }`}
                  >
                    {season}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Natural Language Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="styling-prompt" className="text-xs font-semibold uppercase tracking-wider text-[#1C1817]">
                Styling Guidance (Optional)
              </label>
              <span className={`text-[11px] ${promptText.length > 280 ? 'text-[#882434] font-semibold' : 'text-[#8C8379]'}`}>
                {promptText.length}/300
              </span>
            </div>
            <textarea
              id="styling-prompt"
              rows={2}
              maxLength={300}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. Crisp autumn evening dinner, want to look elevated yet effortless with dark neutral tones..."
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] text-[#1C1817] placeholder-[#8C8379] focus:outline-hidden focus:ring-2 focus:ring-[#5B1924]/20 focus:border-[#5B1924] transition-all resize-none"
            />
          </div>

          {/* Quick Inspiration Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-[#8C8379]">Quick Ideas:</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((quickPrompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPromptText(quickPrompt)}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF6EE] hover:bg-[#F2ECE1] border border-[#ECE5DA] text-[11px] text-[#5E564E] transition-colors cursor-pointer text-left"
                >
                  &ldquo;{quickPrompt}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#ECE5DA]">
            <div className="text-[11px] text-[#8C8379] flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#5B1924]" />
              <span>Recommendations strictly draw from garments in your wardrobe catalog.</span>
            </div>

            <button
              type="submit"
              disabled={isLoading || (retryAfter !== null && retryAfter > 0)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#5B1924] text-[#FDFBF7] text-xs sm:text-sm font-semibold hover:bg-[#48131C] active:scale-[0.98] transition-all shadow-md shadow-[#5B1924]/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Curating Looks...</span>
                </>
              ) : retryAfter && retryAfter > 0 ? (
                <>
                  <Clock size={14} />
                  <span>Cooldown ({retryAfter}s)</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Curate Outfits</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Rate Limit Alert */}
      {errorCode === 'RATE_LIMIT_EXCEEDED' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF6F6] border border-[#F5DADA] text-[#882434] space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm">
            <Clock size={16} />
            <span>AI Rate Limit Reached</span>
          </div>
          <p className="text-xs leading-relaxed text-[#7C2432]">
            To protect service performance, AI outfit curation allows up to 6 requests per minute.
            {retryAfter && retryAfter > 0
              ? ` Please wait ${retryAfter} seconds before trying again.`
              : ' Please wait a moment before trying again.'}
          </p>
          <div className="pt-1">
            <button
              type="button"
              disabled={retryAfter !== null && retryAfter > 0}
              onClick={() => handleGenerate()}
              className="px-4 py-1.5 rounded-lg bg-[#882434] text-[#FFFFFF] text-xs font-semibold hover:bg-[#721C2A] transition-colors cursor-pointer disabled:opacity-50"
            >
              {retryAfter && retryAfter > 0 ? `Wait ${retryAfter}s` : 'Try Again'}
            </button>
          </div>
        </div>
      )}

      {/* Empty Wardrobe State */}
      {errorCode === 'EMPTY_WARDROBE' && (
        <div className="p-8 sm:p-12 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] text-center space-y-4 shadow-xs animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] flex items-center justify-center text-[#5B1924] mx-auto shadow-xs">
            <Shirt size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="font-editorial text-xl font-bold text-[#1C1817]">Your Wardrobe is Empty</h3>
            <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
              We cannot curate outfits until you add clothes to your wardrobe. Upload photos of your tops, bottoms, and shoes to start generating looks!
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/wardrobe')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5B1924] text-[#FDFBF7] text-xs font-semibold hover:bg-[#48131C] transition-all shadow-md shadow-[#5B1924]/15 cursor-pointer"
            >
              <Shirt size={14} />
              <span>Go to My Wardrobe</span>
            </button>
          </div>
        </div>
      )}

      {/* Insufficient Garments State */}
      {errorCode === 'INSUFFICIENT_GARMENTS' && (
        <div className="p-8 sm:p-12 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] text-center space-y-4 shadow-xs animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] flex items-center justify-center text-[#5B1924] mx-auto shadow-xs">
            <Layers size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="font-editorial text-xl font-bold text-[#1C1817]">Need More Garments</h3>
            <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
              To compose a complete outfit, ClosetBrain requires at least one Top and one Bottom (or at least one Dress) in your wardrobe catalog.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/wardrobe')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5B1924] text-[#FDFBF7] text-xs font-semibold hover:bg-[#48131C] transition-all shadow-md shadow-[#5B1924]/15 cursor-pointer"
            >
              <Shirt size={14} />
              <span>Add Garments to Closet</span>
            </button>
          </div>
        </div>
      )}

      {/* Generic Error Banner */}
      {errorMessage &&
        errorCode !== 'RATE_LIMIT_EXCEEDED' &&
        errorCode !== 'EMPTY_WARDROBE' &&
        errorCode !== 'INSUFFICIENT_GARMENTS' && (
          <div className="p-4 rounded-2xl bg-[#FFF6F6] border border-[#F5DADA] text-[#882434] flex items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => handleGenerate()}
              className="px-3 py-1 rounded-lg bg-[#882434] text-[#FFFFFF] font-semibold hover:bg-[#721C2A] transition-colors cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-medium text-[#5E564E]">
            <Sparkles size={14} className="text-[#5B1924] animate-spin" />
            <span>Evaluating your closet inventory and curating balanced outfits...</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs space-y-4 animate-pulse"
              >
                <div className="h-4 bg-[#FAF6EE] rounded-md w-2/3" />
                <div className="aspect-[4/3] bg-[#FAF6EE] rounded-2xl" />
                <div className="space-y-2">
                  <div className="h-3 bg-[#FAF6EE] rounded-md w-full" />
                  <div className="h-3 bg-[#FAF6EE] rounded-md w-4/5" />
                </div>
                <div className="h-9 bg-[#FAF6EE] rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty Results (Searched but 0 recommendations returned) */}
      {!isLoading && hasSearched && recommendations.length === 0 && !errorCode && (
        <div className="p-8 sm:p-10 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] flex items-center justify-center text-[#8C8379] mx-auto">
            <Shirt size={22} />
          </div>
          <h3 className="font-editorial text-lg font-bold text-[#1C1817]">No Matching Outfits Found</h3>
          <p className="text-xs sm:text-sm text-[#5E564E] max-w-md mx-auto leading-relaxed">
            We evaluated {evaluatedCount} items in your closet, but could not compose complete outfits matching the selected criteria. Try changing the occasion to &ldquo;All&rdquo; or broadening your prompt guidance.
          </p>
        </div>
      )}

      {/* Recommendations Grid */}
      {!isLoading && recommendations.length > 0 && (
        <div className="space-y-5 animate-in fade-in">
          {/* Results Summary Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="font-editorial text-lg sm:text-xl font-bold text-[#1C1817]">
                Curated Looks
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#5B1924]/10 text-[#5B1924] text-[11px] font-bold">
                {recommendations.length} {recommendations.length === 1 ? 'Look' : 'Looks'}
              </span>
            </div>
            <span className="text-[11px] text-[#8C8379]">
              From {evaluatedCount} closet garments
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec, idx) => {
              const recKey = rec.id || `rec-${idx}`;
              const state = saveStatus[recKey] || { isSaving: false, isSaved: false };
              const garments = rec.garments || [];

              return (
                <div
                  key={recKey}
                  className="p-5 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs hover:shadow-md hover:border-[#D8CEBD] transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header: Name & Occasion Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h3 className="font-editorial text-lg font-bold text-[#1C1817] leading-snug">
                          {rec.name}
                        </h3>
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#FAF6EE] border border-[#ECE5DA] text-[10px] font-semibold text-[#5B1924] uppercase tracking-wider">
                          {rec.occasion}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-[#8C8379] shrink-0">
                        {garments.length} {garments.length === 1 ? 'piece' : 'pieces'}
                      </span>
                    </div>

                    {/* Garments Visual Montage */}
                    <div className="aspect-[4/3] rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] p-2 overflow-hidden">
                      <div
                        className={`w-full h-full grid gap-1.5 ${
                          garments.length === 1
                            ? 'grid-cols-1'
                            : garments.length === 2
                            ? 'grid-cols-2'
                            : 'grid-cols-2 grid-rows-2'
                        }`}
                      >
                        {garments.slice(0, 4).map((g, gIdx) => (
                          <div
                            key={g._id || gIdx}
                            className="relative rounded-xl overflow-hidden bg-[#FFFFFF] border border-[#ECE5DA] group/item"
                            title={`${g.name} (${g.category})`}
                          >
                            {g.signedUrl ? (
                              <img
                                src={g.signedUrl}
                                alt={g.name}
                                className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF6EE] text-[#8C8379] p-1 text-center">
                                <Shirt size={14} className="opacity-50 mb-0.5" />
                                <span className="text-[9px] font-medium line-clamp-1">{g.category}</span>
                              </div>
                            )}

                            {/* Category Pill on Image */}
                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-[#1C1817]/75 backdrop-blur-xs text-[8px] font-medium text-[#FDFBF7] truncate max-w-[90%]">
                              {g.category}
                            </div>

                            {/* Overflow Badge if > 4 items */}
                            {gIdx === 3 && garments.length > 4 && (
                              <div className="absolute inset-0 bg-[#1C1817]/70 flex items-center justify-center text-[#FDFBF7] font-semibold text-xs">
                                +{garments.length - 3}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Garment Details List */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C8379]">
                        Ensemble Pieces
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {garments.map((g) => (
                          <span
                            key={g._id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF6EE] border border-[#ECE5DA] text-[11px] text-[#1C1817]"
                          >
                            <span className="font-medium">{g.name}</span>
                            {g.primaryColor && <span className="text-[#8C8379]">· {g.primaryColor}</span>}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Deterministic Style Compatibility Score */}
                    {rec.compatibility && (
                      <div className="p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                rec.compatibility.score >= 85
                                  ? 'bg-[#2E6B47]'
                                  : rec.compatibility.score >= 70
                                  ? 'bg-[#3B82F6]'
                                  : 'bg-[#D97706]'
                              }`}
                            />
                            <span className="text-[10px] font-bold tracking-wider text-[#1C1817] uppercase">
                              Style Compatibility Score
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-[#1C1817]">
                              {rec.compatibility.score}
                            </span>
                            <span className="text-[10px] text-[#8C8379]">/ 100</span>
                            <span
                              className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                rec.compatibility.score >= 85
                                  ? 'bg-[#2E6B47]/10 text-[#2E6B47]'
                                  : rec.compatibility.score >= 70
                                  ? 'bg-[#3B82F6]/10 text-[#2563EB]'
                                  : 'bg-[#D97706]/10 text-[#D97706]'
                              }`}
                            >
                              {rec.compatibility.tier}
                            </span>
                          </div>
                        </div>

                        {/* Compact 4-Component Score Breakdown */}
                        <div className="grid grid-cols-4 gap-1 text-center pt-1 border-t border-[#ECE5DA]/70">
                          <div className="p-1 rounded-lg bg-white/80">
                            <div className="text-[9px] text-[#8C8379]">Color</div>
                            <div className="text-[11px] font-bold text-[#1C1817]">
                              {rec.compatibility.breakdown?.colorHarmony?.score ?? 0}
                              <span className="text-[9px] font-normal text-[#8C8379]">/30</span>
                            </div>
                          </div>
                          <div className="p-1 rounded-lg bg-white/80">
                            <div className="text-[9px] text-[#8C8379]">Occasion</div>
                            <div className="text-[11px] font-bold text-[#1C1817]">
                              {rec.compatibility.breakdown?.occasionSuitability?.score ?? 0}
                              <span className="text-[9px] font-normal text-[#8C8379]">/25</span>
                            </div>
                          </div>
                          <div className="p-1 rounded-lg bg-white/80">
                            <div className="text-[9px] text-[#8C8379]">Garment</div>
                            <div className="text-[11px] font-bold text-[#1C1817]">
                              {rec.compatibility.breakdown?.garmentCompatibility?.score ?? 0}
                              <span className="text-[9px] font-normal text-[#8C8379]">/25</span>
                            </div>
                          </div>
                          <div className="p-1 rounded-lg bg-white/80">
                            <div className="text-[9px] text-[#8C8379]">Season</div>
                            <div className="text-[11px] font-bold text-[#1C1817]">
                              {rec.compatibility.breakdown?.seasonCohesion?.score ?? 0}
                              <span className="text-[9px] font-normal text-[#8C8379]">/20</span>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Analysis Accordion */}
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(recKey)}
                            className="w-full flex items-center justify-between text-[11px] font-medium text-[#5B1924] hover:text-[#48131C] py-0.5 cursor-pointer transition-colors"
                          >
                            <span>
                              {expandedRecs[recKey]
                                ? 'Hide Style Intelligence Details'
                                : 'View Style Analysis & Reasons'}
                            </span>
                            {expandedRecs[recKey] ? (
                              <ChevronUp size={13} />
                            ) : (
                              <ChevronDown size={13} />
                            )}
                          </button>

                          {expandedRecs[recKey] && (
                            <div className="space-y-2 pt-2 border-t border-[#ECE5DA]/70 animate-in fade-in duration-150">
                              {/* Positive Match Reasons */}
                              {rec.compatibility.matchReasons?.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-[#2E6B47] uppercase tracking-wider block">
                                    Match Highlights
                                  </span>
                                  <ul className="space-y-1">
                                    {rec.compatibility.matchReasons.map((reason, rIdx) => (
                                      <li
                                        key={rIdx}
                                        className="text-[11px] text-[#2C2724] flex items-start gap-1.5 leading-tight"
                                      >
                                        <Check size={11} className="text-[#2E6B47] mt-0.5 shrink-0" />
                                        <span>{reason}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Warnings */}
                              {rec.compatibility.warnings?.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider block">
                                    Styling Considerations
                                  </span>
                                  <ul className="space-y-1">
                                    {rec.compatibility.warnings.map((warning, wIdx) => (
                                      <li
                                        key={wIdx}
                                        className="text-[11px] text-[#92400E] flex items-start gap-1.5 leading-tight"
                                      >
                                        <AlertTriangle size={11} className="text-[#D97706] mt-0.5 shrink-0" />
                                        <span>{warning}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Uncertainties */}
                              {rec.compatibility.uncertainties?.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  <span className="text-[10px] font-bold text-[#8C8379] uppercase tracking-wider block">
                                    Catalog Notes
                                  </span>
                                  <ul className="space-y-1">
                                    {rec.compatibility.uncertainties.map((unc, uIdx) => (
                                      <li
                                        key={uIdx}
                                        className="text-[10px] text-[#8C8379] flex items-start gap-1.5 leading-tight italic"
                                      >
                                        <Info size={11} className="text-[#8C8379] mt-0.5 shrink-0" />
                                        <span>{unc}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stylist Reasoning Block (No fake match percentage!) */}
                    <div className="p-3 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[#5B1924] text-[10px] font-bold uppercase tracking-wider">
                        <Quote size={11} />
                        <span>Stylist Notes</span>
                      </div>
                      <p className="font-editorial text-xs sm:text-[13px] text-[#1C1817] leading-relaxed italic">
                        &ldquo;{rec.stylingReasoning}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-4 border-t border-[#ECE5DA] space-y-2">
                    {state.error && (
                      <p className="text-[11px] text-[#882434] leading-tight mb-1">{state.error}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {/* Save to Outfits */}
                      {state.isSaved ? (
                        <button
                          type="button"
                          onClick={() => navigate('/outfits')}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#2E6B47] text-[#FFFFFF] text-xs font-semibold hover:bg-[#255739] transition-all cursor-pointer shadow-xs"
                        >
                          <Check size={13} />
                          <span>View in Outfits</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={state.isSaving}
                          onClick={() => handleSaveToLookbook(rec, recKey)}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAF6EE] hover:bg-[#F2ECE1] border border-[#ECE5DA] text-xs font-semibold text-[#1C1817] transition-all cursor-pointer disabled:opacity-50"
                        >
                          {state.isSaving ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Bookmark size={12} className="text-[#5B1924]" />
                              <span>Save to Outfits</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Open in Outfit Builder */}
                      <button
                        type="button"
                        onClick={() => handleOpenInStudio(rec)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#5B1924] hover:bg-[#48131C] text-[#FDFBF7] text-xs font-semibold transition-all cursor-pointer shadow-xs"
                      >
                        <Sparkles size={12} />
                        <span>Open in Builder</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistantPage;
