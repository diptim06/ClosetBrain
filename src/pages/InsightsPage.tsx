import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Shirt,
  Palette,
  Tag,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { WardrobeSummary, fetchWardrobeSummary } from '../features/wardrobe';

export const InsightsPage: React.FC = () => {
  const navigate = useNavigate();

  const [summary, setSummary] = useState<WardrobeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchWardrobeSummary();
      if (res?.summary) {
        setSummary(res.summary);
      } else if (res && typeof (res as any).totalItems === 'number') {
        setSummary(res as unknown as WardrobeSummary);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load style insights.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const totalItems = summary?.totalItems ?? 0;
  const colorDistribution = summary?.colorDistribution ?? [];
  const topTone = summary?.topTone || 'None';
  const topBrands = summary?.topBrands ?? [];

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#ECE5DA]">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1C1817]">
            Style{' '}
            <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">
              Insights
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5E564E] mt-1 leading-relaxed">
            Data-driven intelligence on your color palette, brand loyalty, and wardrobe utilization.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSummary}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FAF6EE] border border-[#ECE5DA] text-xs font-semibold text-[#5E564E] hover:text-[#1C1817] hover:bg-[#F2ECE1] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#5B1924]' : ''} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#FDF2F2] border border-[#F2C9CE] text-xs text-[#882434] flex items-start gap-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#882434]" />
          <div>
            <p className="font-semibold">Unable to load style insights</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Key Metric Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#8C8379] text-xs">
            <span>Total Cataloged</span>
            <Shirt size={15} />
          </div>
          <div className="font-editorial text-2xl sm:text-3xl font-bold text-[#1C1817]">
            {isLoading ? '...' : totalItems}
          </div>
          <p className="text-[11px] text-[#5E564E]">Garments in MongoDB</p>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#8C8379] text-xs">
            <span>Recent Additions</span>
            <TrendingUp size={15} />
          </div>
          <div className="font-editorial text-2xl sm:text-3xl font-bold text-[#5B1924]">
            {isLoading ? '...' : summary?.recentlyAddedThisWeek ?? 0}
          </div>
          <p className="text-[11px] text-[#5E564E]">Added past 7 days</p>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#8C8379] text-xs">
            <span>Primary Tone</span>
            <Palette size={15} />
          </div>
          <div className="font-editorial text-xl sm:text-2xl font-bold text-[#1C1817] truncate">
            {isLoading ? '...' : topTone}
          </div>
          <p className="text-[11px] text-[#5E564E]">Dominant color family</p>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#8C8379] text-xs">
            <span>Cataloged Brands</span>
            <Tag size={15} />
          </div>
          <div className="font-editorial text-2xl sm:text-3xl font-bold text-[#1C1817]">
            {isLoading ? '...' : topBrands.length}
          </div>
          <p className="text-[11px] text-[#5E564E]">Distinct designer labels</p>
        </div>
      </div>

      {/* Main Grid: Palette Analytics & Brands */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Color Palette Distribution */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-editorial text-lg font-bold text-[#1C1817]">
                Color Palette Distribution
              </h3>
              <p className="text-xs text-[#5E564E]">Breakdown of cataloged wardrobe tones</p>
            </div>
            <Palette size={18} className="text-[#5B1924]" />
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-[#8C8379] animate-pulse">
              Calculating color spectrum...
            </div>
          ) : colorDistribution.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8C8379]">
              No color data available yet. Add items in My Wardrobe to visualize your palette.
            </div>
          ) : (
            <div className="space-y-3">
              {colorDistribution.map((item) => {
                const percentage = totalItems > 0 ? Math.round((item.count / totalItems) * 100) : 0;
                return (
                  <div key={item.color} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#1C1817]">{item.color}</span>
                      <span className="text-[#8C8379]">
                        {item.count} items ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#FAF6EE] rounded-full overflow-hidden border border-[#ECE5DA]">
                      <div
                        className="h-full bg-[#5B1924] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Brands / Labels */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-editorial text-lg font-bold text-[#1C1817]">
                  Favorite Brands & Labels
                </h3>
                <p className="text-xs text-[#5E564E]">Most styled fashion houses in your collection</p>
              </div>
              <Tag size={18} className="text-[#5B1924]" />
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-[#8C8379] animate-pulse">
                Analyzing brand metadata...
              </div>
            ) : topBrands.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8C8379]">
                No brand information cataloged yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-2">
                {topBrands.map((brand, idx) => (
                  <span
                    key={brand}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF6EE] border border-[#ECE5DA] text-xs font-semibold text-[#1C1817]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924]" />
                    <span>{brand}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#ECE5DA]">
            <button
              type="button"
              onClick={() => navigate('/wardrobe')}
              className="w-full py-2.5 rounded-full bg-[#FAF6EE] hover:bg-[#F2ECE1] border border-[#ECE5DA] text-xs font-semibold text-[#1C1817] transition-colors cursor-pointer"
            >
              Browse Complete Wardrobe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsPage;
