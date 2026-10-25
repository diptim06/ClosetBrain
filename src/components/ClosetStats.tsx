import React from 'react';
import { Shirt, Layers, Heart, TrendingUp } from 'lucide-react';
import { ClosetStatsData } from '../data/mockData';

interface ClosetStatsProps {
  stats: ClosetStatsData;
}

export const ClosetStats: React.FC<ClosetStatsProps> = ({ stats }) => {
  const statItems = [
    { label: 'Total Items', value: stats.totalItems, icon: Shirt, highlight: false },
    { label: 'Outfits', value: stats.totalOutfits, icon: Layers, highlight: false },
    { label: 'Favorites', value: stats.favoritesCount, icon: Heart, highlight: false },
    { label: 'Recently Added', value: `${stats.recentlyAddedThisWeek} this week`, icon: TrendingUp, highlight: true }
  ];

  return (
    <div className="cb-card p-5">
      <h2 className="text-sm font-bold text-[#23201D] uppercase tracking-wider text-[#9E968E] mb-3">
        Closet Statistics
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {statItems.map((st, idx) => {
          const IconComp = st.icon;
          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border flex flex-col justify-between ${st.highlight
                  ? 'bg-[#F3EDE2] border-[#A65D47]/30'
                  : 'bg-[#FBF9F5] border-[#ECE7DE]'
                }`}
            >
              <div className="flex items-center justify-between text-[#78716C] mb-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#78716C]">
                  {st.label}
                </span>
                <IconComp size={15} className={st.highlight ? 'text-[#A65D47]' : 'text-[#9E968E]'} />
              </div>

              <div
                className={`text-xl font-bold tracking-tight ${st.highlight ? 'text-[#A65D47]' : 'text-[#23201D]'
                  }`}
              >
                {st.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
