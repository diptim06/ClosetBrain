import React from 'react';
import { Shirt, Layers, Calendar, TrendingUp, ArrowUpRight } from 'lucide-react';
import { ClosetStatsData } from '../../../data/mockData';

interface WardrobeOverviewProps {
  stats?: ClosetStatsData;
  onViewCloset?: () => void;
  onViewOutfits?: () => void;
  onViewPlanner?: () => void;
}

export const WardrobeOverview: React.FC<WardrobeOverviewProps> = ({
  stats = {
    totalItems: 100,
    totalOutfits: 34,
    favoritesCount: 12,
    recentlyAddedThisWeek: 5,
  },
  onViewCloset,
  onViewOutfits,
  onViewPlanner,
}) => {
  const metrics = [
    {
      id: 'items',
      label: 'Wardrobe Items',
      value: stats.totalItems,
      sublabel: `+${stats.recentlyAddedThisWeek} this week`,
      icon: Shirt,
      action: onViewCloset,
    },
    {
      id: 'outfits',
      label: 'Curated Outfits',
      value: stats.totalOutfits,
      sublabel: `${stats.favoritesCount} favorited`,
      icon: Layers,
      action: onViewOutfits,
    },
    {
      id: 'planned',
      label: 'Scheduled Looks',
      value: 4,
      sublabel: 'Active calendar',
      icon: Calendar,
      action: onViewPlanner,
    },
    {
      id: 'utilization',
      label: 'Staple Rotation',
      value: '92%',
      sublabel: 'Neutral efficiency',
      icon: TrendingUp,
      action: onViewCloset,
    },
  ];

  return (
    <div className="bg-[#FFFFFF] border border-[#ECE5DA] rounded-2xl p-3 sm:p-4 shadow-xs">
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#F2ECE1]">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <button
              key={metric.id}
              type="button"
              onClick={metric.action}
              className={`p-2.5 sm:px-4 text-left transition-colors hover:bg-[#FAF6EE]/70 group cursor-pointer rounded-xl flex items-center justify-between ${
                idx % 2 === 1 ? 'pl-4 sm:pl-4' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold tracking-wider text-[#8C8379]">
                  <Icon size={12} className="text-[#5B1924] shrink-0" />
                  <span className="truncate">{metric.label}</span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-editorial text-xl sm:text-2xl font-bold text-[#1C1817]">
                    {metric.value}
                  </span>
                  <span className="text-[10px] text-[#5E564E] truncate hidden sm:inline">
                    {metric.sublabel}
                  </span>
                </div>
              </div>

              <ArrowUpRight
                size={13}
                className="text-[#8C8379] group-hover:text-[#5B1924] transition-colors shrink-0 opacity-0 group-hover:opacity-100 ml-1"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
