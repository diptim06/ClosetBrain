import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ClosetCategory } from '../data/mockData';

interface ClosetOverviewProps {
  categories: ClosetCategory[];
  onViewAll?: () => void;
  onSelectCategory?: (category: string) => void;
}

export const ClosetOverview: React.FC<ClosetOverviewProps> = ({ categories, onViewAll, onSelectCategory }) => {
  return (
    <div className="cb-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#23201D] font-editorial tracking-tight">
            Your Closet
          </h2>
          <p className="text-xs text-[#78716C]">
            Organized by garment categories
          </p>
        </div>

        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-[#A65D47] hover:text-[#964B36] flex items-center gap-1 cursor-pointer border-0 bg-transparent"
        >
          <span>View all</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* 2x2 Grid of Categories */}
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => onSelectCategory && onSelectCategory(cat.name)}
            className="group bg-[#FBF9F5] border border-[#ECE7DE] hover:border-[#D8D1C5] p-2.5 rounded-lg flex items-center gap-3 transition-all cursor-pointer"
          >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-md overflow-hidden bg-[#F5EFE6] shrink-0 border border-[#ECE7DE]">
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Title & Count */}
            <div>
              <h4 className="text-xs font-bold text-[#23201D] group-hover:text-[#A65D47] transition-colors">
                {cat.name}
              </h4>
              <p className="text-[11px] text-[#78716C]">
                {cat.itemCount} items
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
