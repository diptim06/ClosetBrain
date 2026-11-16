import React from 'react';
import { ArrowRight, Plus, RefreshCw, AlertCircle, Shirt } from 'lucide-react';
import { Garment } from '../../wardrobe/types';

interface RecentlyAddedProps {
  garments?: Garment[];
  isLoading?: boolean;
  error?: string | null;
  totalGarments?: number;
  onViewCloset?: () => void;
  onSelectGarment?: (garment: Garment) => void;
  onAddItem?: () => void;
  onRetry?: () => void;
}

function formatRelativeDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export const RecentlyAdded: React.FC<RecentlyAddedProps> = ({
  garments = [],
  isLoading = false,
  error = null,
  totalGarments = 0,
  onViewCloset,
  onSelectGarment,
  onAddItem,
  onRetry,
}) => {
  const handleItemClick = (garment: Garment) => {
    if (onSelectGarment) {
      onSelectGarment(garment);
    } else if (onViewCloset) {
      onViewCloset();
    }
  };

  return (
    <section aria-labelledby="recently-added-heading" className="space-y-3.5">
      {/* Section Header with Refined Editorial Contrast */}
      <div className="flex items-center justify-between pb-1 border-b border-[#F2ECE1]">
        <div className="flex items-center gap-2">
          <h2
            id="recently-added-heading"
            className="text-xs font-semibold tracking-wider uppercase text-[#8C8379]"
          >
            Recently Added to Capsule
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924]" />
        </div>

        <button
          type="button"
          onClick={onViewCloset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B1924] hover:text-[#48131C] transition-colors cursor-pointer group"
        >
          <span>
            View Complete Closet ({totalGarments} {totalGarments === 1 ? 'piece' : 'pieces'})
          </span>
          <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#FFFFFF] border border-[#ECE5DA] rounded-2xl p-3 animate-pulse space-y-3"
            >
              <div className="aspect-[3/4] w-full rounded-xl bg-[#FAF6EE]" />
              <div className="h-3 w-3/4 bg-[#FAF6EE] rounded" />
              <div className="h-2.5 w-1/2 bg-[#FAF6EE] rounded" />
              <div className="pt-2 border-t border-[#F2ECE1] flex justify-between">
                <div className="h-2 w-16 bg-[#FAF6EE] rounded" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FAF6EE]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="bg-[#FFFFFF] border border-red-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1C1817]">Unable to load recent garments</h3>
            <p className="text-[11px] text-[#5E564E] mt-0.5">{error}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF6EE] hover:bg-[#F2ECE1] text-xs font-medium text-[#1C1817] border border-[#ECE5DA] transition-colors cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && garments.length === 0 && (
        <div className="bg-[#FFFFFF] border border-dashed border-[#D8CEBD] rounded-3xl p-8 sm:p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] text-[#5B1924] flex items-center justify-center mx-auto shadow-2xs">
            <Shirt size={22} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-editorial text-lg sm:text-xl font-semibold text-[#1C1817]">
              Your wardrobe capsule is empty
            </h3>
            <p className="text-xs text-[#5E564E] leading-relaxed">
              Add your first garment with AI photo analysis to unlock automatic categorization,
              color harmonies, and daily outfit recommendations.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddItem || onViewCloset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5B1924] hover:bg-[#48131C] text-[#FDFBF7] text-xs font-semibold tracking-wide transition-all shadow-md shadow-[#5B1924]/15 active:scale-[0.98] cursor-pointer"
          >
            <Plus size={14} />
            <span>Add First Garment</span>
          </button>
        </div>
      )}

      {/* Populated Horizontal Cards Grid */}
      {!isLoading && !error && garments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {garments.map((item) => (
            <div
              key={item._id}
              onClick={() => handleItemClick(item)}
              className="bg-[#FFFFFF] border border-[#ECE5DA] hover:border-[#5B1924]/35 rounded-2xl overflow-hidden p-3 shadow-xs hover:shadow-md transition-all duration-300 group cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Photo Thumbnail */}
                <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-[#F2ECE1] mb-3">
                  <img
                    src={item.signedUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    loading="lazy"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#FFFFFF]/90 backdrop-blur-xs text-[10px] font-semibold text-[#5B1924] border border-[#ECE5DA] shadow-xs">
                    {item.category}
                  </span>
                </div>

                {/* Garment Title & Designer */}
                <h3 className="text-xs font-bold text-[#1C1817] truncate leading-tight group-hover:text-[#5B1924] transition-colors">
                  {item.name}
                </h3>
                <p className="text-[11px] text-[#5E564E] font-editorial italic mt-0.5 truncate">
                  {item.brand && item.brand.trim() ? item.brand : 'Unbranded'}
                </p>
              </div>

              {/* Bottom Meta */}
              <div className="pt-2 mt-2.5 border-t border-[#F2ECE1] flex items-center justify-between text-[10px] text-[#8C8379]">
                <span>Added {formatRelativeDate(item.createdAt)}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                  style={{ backgroundColor: item.primaryColor || '#D8C7B5' }}
                  title={`Color: ${item.primaryColor}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default RecentlyAdded;
