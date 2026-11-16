import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Search,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
  Shirt,
  Calendar,
} from 'lucide-react';
import { Outfit } from '../types';
import { fetchOutfits, deleteOutfit } from '../api/outfitApi';

export const LookbookPage: React.FC = () => {
  const navigate = useNavigate();

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'createdAt_desc' | 'createdAt_asc' | 'name_asc'>('createdAt_desc');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadOutfits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchOutfits({
        sort: sortOption,
        search: searchQuery.trim() || undefined,
        limit: 50,
      });
      setOutfits(data.outfits || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load outfits from lookbook.');
    } finally {
      setIsLoading(false);
    }
  }, [sortOption, searchQuery]);

  useEffect(() => {
    loadOutfits();
  }, [loadOutfits]);

  const handleDeleteOutfit = async (e: React.MouseEvent, outfitId: string, outfitName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${outfitName}"?`)) {
      return;
    }

    setDeletingId(outfitId);
    try {
      await deleteOutfit(outfitId);
      setOutfits((prev) => prev.filter((o) => o._id !== outfitId));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete outfit. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#ECE5DA]">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1C1817]">
            My{' '}
            <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">
              Outfits
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5E564E] mt-1 leading-relaxed">
            Your saved ensembles, capsule formulas, and curated styling looks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/outfits/create')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#5B1924] text-[#FDFBF7] text-xs sm:text-sm font-semibold hover:bg-[#48131C] active:scale-[0.98] transition-all shadow-md shadow-[#5B1924]/15 cursor-pointer shrink-0"
        >
          <Sparkles size={15} />
          <span>+ Create New Outfit</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8379] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved outfits by name or notes..."
            className="w-full pl-9 pr-4 py-2 bg-[#FAF6EE] border border-[#ECE5DA] rounded-xl text-xs text-[#1C1817] placeholder-[#8C8379] outline-none focus:border-[#5B1924] transition-all"
          />
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] text-xs text-[#5E564E]">
            <ArrowUpDown size={13} className="text-[#8C8379]" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="bg-transparent border-none text-xs font-medium text-[#1C1817] outline-none cursor-pointer"
            >
              <option value="createdAt_desc">Newest First</option>
              <option value="createdAt_asc">Oldest First</option>
              <option value="name_asc">Name (A–Z)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={loadOutfits}
            disabled={isLoading}
            title="Refresh lookbook"
            className="p-2 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] text-[#5E564E] hover:text-[#1C1817] hover:bg-[#F2ECE1] transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-[#5B1924]' : ''} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#FDF2F2] border border-[#F2C9CE] text-xs text-[#882434] flex items-start gap-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#882434]" />
          <div className="flex-1">
            <p className="font-semibold">Unable to load outfits</p>
            <p className="mt-0.5">{error}</p>
            <button
              type="button"
              onClick={loadOutfits}
              className="mt-2 inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-[#5B1924] cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-4 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs space-y-3 animate-pulse"
            >
              <div className="aspect-[4/3] rounded-2xl bg-[#FAF6EE]" />
              <div className="h-4 bg-[#FAF6EE] rounded w-2/3" />
              <div className="h-3 bg-[#FAF6EE] rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && outfits.length === 0 && (
        <div className="p-8 sm:p-12 text-center rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] text-[#5B1924] flex items-center justify-center mx-auto shadow-xs">
            <BookOpen size={26} />
          </div>

          <div>
            <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#1C1817]">
              {searchQuery ? 'No matching outfits found' : 'Your Lookbook is Empty'}
            </h3>
            <p className="text-xs sm:text-sm text-[#5E564E] mt-1.5 max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? `No outfits matched "${searchQuery}". Try a different keyword or reset your search.`
                : 'You have not saved any outfits yet. Head over to the Outfit Studio to mix, match, and curate your first look.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-5 py-2.5 rounded-full bg-[#FAF6EE] border border-[#ECE5DA] text-xs font-semibold text-[#1C1817] hover:bg-[#F2ECE1] transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/outfits/create')}
                className="px-6 py-2.5 rounded-full bg-[#5B1924] text-[#FDFBF7] text-xs sm:text-sm font-semibold hover:bg-[#48131C] active:scale-[0.98] transition-all shadow-md shadow-[#5B1924]/15 cursor-pointer flex items-center gap-2"
              >
                <Sparkles size={14} />
                <span>+ Create New Outfit</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Outfits Grid */}
      {!isLoading && !error && outfits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {outfits.map((outfit) => {
            const garments = outfit.garments || [];
            return (
              <div
                key={outfit._id}
                onClick={() => navigate(`/outfits/${outfit._id}`)}
                className="group p-4 sm:p-5 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs hover:shadow-lg hover:shadow-[#5B1924]/5 hover:border-[#D8CEBD] transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Garment Image Montage Grid */}
                  <div className="aspect-[4/3] rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] p-2 mb-4 overflow-hidden relative">
                    {garments.length === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#8C8379] gap-1.5">
                        <Shirt size={24} className="opacity-40" />
                        <span className="text-[11px]">No garments attached</span>
                      </div>
                    ) : (
                      <div
                        className={`w-full h-full grid gap-1.5 ${
                          garments.length === 1
                            ? 'grid-cols-1'
                            : garments.length === 2
                            ? 'grid-cols-2'
                            : 'grid-cols-2 grid-rows-2'
                        }`}
                      >
                        {garments.slice(0, 4).map((g, idx) => (
                          <div
                            key={g._id || idx}
                            className="relative rounded-xl overflow-hidden bg-[#FFFFFF] border border-[#ECE5DA]"
                          >
                            {g.signedUrl ? (
                              <img
                                src={g.signedUrl}
                                alt={g.name || 'Garment'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#FAF6EE] text-[#8C8379] text-[10px]">
                                {g.category || 'Item'}
                              </div>
                            )}
                            {idx === 3 && garments.length > 4 && (
                              <div className="absolute inset-0 bg-[#1C1817]/60 flex items-center justify-center text-[#FDFBF7] font-semibold text-xs">
                                +{garments.length - 3}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="absolute top-3.5 right-3.5 px-2 py-0.5 rounded-full bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#ECE5DA] text-[10px] font-semibold text-[#5B1924]">
                      {garments.length} {garments.length === 1 ? 'item' : 'items'}
                    </div>
                  </div>

                  {/* Outfit Info */}
                  <div className="space-y-1">
                    <h3 className="font-editorial text-lg font-bold text-[#1C1817] group-hover:text-[#5B1924] transition-colors truncate">
                      {outfit.name}
                    </h3>
                    {outfit.notes ? (
                      <p className="text-xs text-[#5E564E] line-clamp-2 leading-relaxed">
                        {outfit.notes}
                      </p>
                    ) : (
                      <p className="text-xs text-[#8C8379] italic">No styling notes recorded.</p>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 mt-3 border-t border-[#ECE5DA] flex items-center justify-between text-xs text-[#8C8379]">
                  <span className="text-[11px]">
                    {new Date(outfit.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/outfits/${outfit._id}`);
                      }}
                      title="Edit in Studio"
                      className="p-1.5 text-[#5E564E] hover:text-[#5B1924] hover:bg-[#FAF6EE] rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === outfit._id}
                      onClick={(e) => handleDeleteOutfit(e, outfit._id, outfit.name)}
                      title="Delete outfit"
                      className="p-1.5 text-[#8C8379] hover:text-[#882434] hover:bg-[#FDF2F2] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const OutfitsPage = LookbookPage;
export default LookbookPage;
