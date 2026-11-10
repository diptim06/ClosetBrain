import React from 'react';
import { Compass, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { ColorDistributionItem } from '../../wardrobe/types';

interface StyleInsightsProps {
  colorBreakdown?: ColorDistributionItem[];
  topTone?: string;
  favoriteBrands?: string[];
  totalItems?: number;
  isLoading?: boolean;
  onViewAllInsights?: () => void;
}

export const StyleInsights: React.FC<StyleInsightsProps> = ({
  colorBreakdown = [],
  topTone = 'None',
  favoriteBrands = [],
  totalItems = 0,
  isLoading = false,
  onViewAllInsights,
}) => {
  const hasItems = totalItems > 0 && colorBreakdown.length > 0;

  const narrativeSummary = hasItems
    ? `Your capsule leans toward ${topTone.toLowerCase()} tones with ${colorBreakdown.length} distinct colour ${
        colorBreakdown.length === 1 ? 'family' : 'families'
      } cataloged across your wardrobe.`
    : 'Your palette and brand analytics will generate dynamically here as you catalog garments into your digital wardrobe.';

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E0D5] rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#F2ECE1]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#5B1924] text-[#FDFBF7]">
                <Compass className="w-3 h-3 text-[#FDFBF7]" />
                <span>Wardrobe Intelligence</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#9A5360] bg-[#B76E79]/10 border border-[#B76E79]/20 px-2.5 py-0.5 rounded-full">
                Palette Analysis
              </span>
            </div>

            <h3 className="font-editorial text-2xl text-[#1C1817] font-semibold">
              Style Insights & Color{' '}
              <span className="font-cursive text-2xl sm:text-3xl text-[#5B1924] font-normal inline-block">
                Harmony
              </span>
            </h3>
          </div>
        </div>

        {/* Narrative Summary */}
        <p className="text-xs text-[#5E564E] leading-relaxed mb-4">
          {narrativeSummary}
        </p>

        {/* Color Palette Distribution Bar */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#1C1817]">Palette Allocation</span>
            <span className="text-[11px] text-[#5B1924] font-medium">
              Dominant: {hasItems ? topTone : 'Awaiting data'}
            </span>
          </div>

          {hasItems ? (
            <>
              <div className="h-2 w-full rounded-full overflow-hidden flex bg-[#ECE5DA]">
                {colorBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                    title={`${item.label}: ${item.percentage}% (${item.count} items)`}
                    className="h-full transition-all"
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5E564E] pt-1">
                {colorBreakdown.map((item, idx) => (
                  <span key={idx} className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>
                      {item.label} ({item.percentage}%)
                    </span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] text-center">
              <span className="text-xs text-[#8C8379]">
                No colour palette data recorded yet. Add garments to generate palette distribution.
              </span>
            </div>
          )}
        </div>

        {/* Wardrobe Foundation & Wear Tracking Intelligence */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Foundation Metrics */}
          <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border-l-2 border-l-[#5B1924] border-y border-r border-[#ECE5DA]">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[#5B1924] tracking-wider mb-1">
              <Sparkles size={12} />
              <span>Capsule Foundation</span>
            </div>
            <div className="text-xs font-bold text-[#1C1817] leading-tight">
              {totalItems} Cataloged {totalItems === 1 ? 'Piece' : 'Pieces'}
            </div>
            <p className="text-[11px] text-[#5E564E] mt-1 leading-snug">
              {hasItems
                ? `Structured across ${colorBreakdown.length} palette families for versatile layering.`
                : 'Catalog your foundational pieces to unlock automatic style pairing.'}
            </p>
          </div>

          {/* Honest Upcoming Feature State */}
          <div className="p-3.5 rounded-2xl bg-[#FCFAF7] border-l-2 border-l-[#B76E79] border-y border-r border-[#ECE5DA]">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[#9A5360] tracking-wider mb-1">
              <TrendingUp size={12} />
              <span>Wear Intelligence</span>
            </div>
            <div className="text-xs font-bold text-[#1C1817] leading-tight">
              Rotation Tracking
            </div>
            <p className="text-[11px] text-[#5E564E] mt-1 leading-snug">
              Wear frequency and staple utilization will activate as looks are styled in Outfit Studio.
            </p>
          </div>
        </div>

        {/* Brand Representation Pills */}
        <div className="pt-3 border-t border-[#F2ECE1]">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#8C8379] mb-2">
            Key Capsule Designers
          </div>
          {favoriteBrands.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {favoriteBrands.map((brand, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-[#FAF6EE] border border-[#ECE5DA] text-[11px] font-editorial text-[#1C1817]"
                >
                  {brand}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8C8379] italic">
              No designer brands cataloged yet.
            </p>
          )}
        </div>
      </div>

      {/* Footer Link */}
      <div className="pt-4 mt-4 border-t border-[#F2ECE1]">
        <button
          type="button"
          onClick={onViewAllInsights}
          className="w-full py-2.5 px-4 rounded-full bg-[#FAF6EE] hover:bg-[#5B1924] text-[#1C1817] hover:text-[#FDFBF7] text-xs font-semibold border border-[#ECE5DA] hover:border-[#5B1924] transition-all flex items-center justify-center gap-2 cursor-pointer group active:scale-[0.98]"
        >
          <span>Explore Style Analytics</span>
          <ArrowRight
            size={13}
            className="text-[#5B1924] group-hover:text-[#FDFBF7] group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </div>
  );
};

export default StyleInsights;
