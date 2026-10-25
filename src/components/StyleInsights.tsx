import React from 'react';
import { Sparkles, PieChart, ArrowUpRight } from 'lucide-react';
import { StyleInsightsData } from '../data/mockData';

interface StyleInsightsProps {
  data: StyleInsightsData;
}

export const StyleInsights: React.FC<StyleInsightsProps> = ({ data }) => {
  return (
    <div className="cb-card p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A65D47] uppercase tracking-wider">
            <Sparkles size={14} /> AI Preview
          </div>
          <span className="text-[10px] bg-[#F5EFE6] text-[#78716C] px-2 py-0.5 rounded font-medium">
            V1 Teaser
          </span>
        </div>

        <h2 className="text-lg font-bold text-[#23201D] font-editorial tracking-tight mb-2">
          Style Insights
        </h2>

        {/* AI Insight Quote Callout */}
        <div className="bg-[#FBF9F5] border-l-3 border-[#A65D47] p-3 rounded-r-lg mb-4 text-xs italic text-[#78716C] font-editorial">
          “{data.summary}”
        </div>

        {/* Color Palette Distribution Bar */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-[11px] text-[#78716C] font-medium">
            <span>Palette Preference:</span>
            <span className="text-[#23201D] font-bold">{data.topTone}</span>
          </div>

          <div className="h-2 w-full bg-[#ECE7DE] rounded-full overflow-hidden flex">
            {data.colorBreakdown.map((item, idx) => (
              <div
                key={idx}
                style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                className="h-full"
                title={`${item.label}: ${item.percentage}%`}
              ></div>
            ))}
          </div>

          <div className="flex justify-between text-[10px] text-[#78716C] pt-1">
            {data.colorBreakdown.map((item, idx) => (
              <span key={idx} className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></span>
                {item.label} ({item.percentage}%)
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-[#ECE7DE] flex items-center justify-between text-[11px] text-[#78716C]">
        <span>Top Brands: {data.favoriteBrands.join(', ')}</span>
        <span className="text-[#A65D47] font-semibold flex items-center gap-0.5">
          Full Report <ArrowUpRight size={12} />
        </span>
      </div>
    </div>
  );
};
