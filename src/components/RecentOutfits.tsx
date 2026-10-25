import React from 'react';
import { ArrowRight, Calendar, Tag } from 'lucide-react';
import { RecentOutfit } from '../data/mockData';

interface RecentOutfitsProps {
  outfits: RecentOutfit[];
  onViewAll?: () => void;
}

export const RecentOutfits: React.FC<RecentOutfitsProps> = ({ outfits, onViewAll }) => {
  return (
    <div className="cb-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#23201D] font-editorial tracking-tight">
            Recent Outfits
          </h2>
          <p className="text-xs text-[#78716C]">
            Your worn looks & recent combinations
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

      {/* Grid of Outfit Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {outfits.map((outfit) => (
          <div
            key={outfit.id}
            className="group bg-[#FBF9F5] border border-[#ECE7DE] hover:border-[#D8D1C5] rounded-lg overflow-hidden transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-[#F5EFE6] relative">
              <img
                src={outfit.image}
                alt={outfit.occasion}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute top-2 left-2 bg-[#23201D]/75 text-white text-[10px] font-medium px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                <Calendar size={10} /> {outfit.date}
              </span>
            </div>

            <div className="p-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#23201D]">
                <span>{outfit.occasion}</span>
                <span className="text-[10px] text-[#A65D47] bg-[#A65D47]/10 px-1.5 py-0.5 rounded font-medium">
                  {outfit.itemCount} items
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
