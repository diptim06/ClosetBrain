import React from 'react';
import { Calendar, ArrowRight, Sparkles } from 'lucide-react';

interface PlannedLook {
  id: string;
  dayLabel: string;
  dateStr: string;
  occasion: string;
  weather: string;
  itemsSummary: string;
  matchScore: number;
  image: string;
}

interface UpcomingOutfitsProps {
  onOpenPlanner?: () => void;
}

export const UpcomingOutfits: React.FC<UpcomingOutfitsProps> = ({ onOpenPlanner }) => {
  const upcomingLooks: PlannedLook[] = [
    {
      id: 'look-1',
      dayLabel: 'Tomorrow',
      dateStr: 'Thu, 29 Oct',
      occasion: 'Design Critique & Review',
      weather: '22°C Clear',
      itemsSummary: 'Wool Blazer • Silk Blouse • Straight Trousers',
      matchScore: 96,
      image:
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400',
    },
    {
      id: 'look-2',
      dayLabel: 'Friday',
      dateStr: 'Fri, 30 Oct',
      occasion: 'Exhibition & Gallery Opening',
      weather: '19°C Evening',
      itemsSummary: 'Structured Black Maxi • Cashmere Wrap',
      matchScore: 92,
      image:
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=400',
    },
    {
      id: 'look-3',
      dayLabel: 'Saturday',
      dateStr: 'Sat, 31 Oct',
      occasion: 'Weekend Brunch & Le Marais Walk',
      weather: '21°C Sun',
      itemsSummary: 'Cream Knit • Denim • Chelsea Boots',
      matchScore: 90,
      image:
        'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&q=80&w=400',
    },
  ];

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E0D5] rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#F2ECE1]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#5B1924] text-[#FDFBF7]">
                <Calendar className="w-3 h-3 text-[#FDFBF7]" />
                <span>Planner Schedule</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#9A5360] bg-[#B76E79]/10 border border-[#B76E79]/20 px-2.5 py-0.5 rounded-full">
                3 Outfits Set
              </span>
            </div>

            <h3 className="font-editorial text-2xl text-[#1C1817] font-semibold">
              Upcoming Planned{' '}
              <span className="font-cursive text-2xl sm:text-3xl text-[#5B1924] font-normal inline-block">
                Looks
              </span>
            </h3>
          </div>

          <button
            type="button"
            onClick={onOpenPlanner}
            className="text-xs font-semibold text-[#5B1924] hover:underline cursor-pointer hidden sm:inline"
          >
            Open Calendar
          </button>
        </div>

        {/* List of Planned Looks with Crisp Clean Surfaces */}
        <div className="space-y-3">
          {upcomingLooks.map((look) => (
            <div
              key={look.id}
              onClick={onOpenPlanner}
              className="p-3 rounded-2xl bg-[#FCFAF7] hover:bg-[#F8F4EC] border border-[#ECE5DA] flex items-center gap-3.5 transition-colors group cursor-pointer"
            >
              {/* Thumbnail Image */}
              <div className="w-16 h-20 rounded-xl overflow-hidden bg-[#F2ECE1] border border-[#E8E0D5] shrink-0">
                <img
                  src={look.image}
                  alt={look.occasion}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>

              {/* Look Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B1924] bg-[#5B1924]/8 px-2 py-0.5 rounded-md">
                    {look.dayLabel} • {look.dateStr}
                  </span>
                  <span className="text-[11px] font-semibold text-[#9A5360]">
                    {look.matchScore}% Match
                  </span>
                </div>

                <h4 className="font-editorial text-xs sm:text-sm font-semibold text-[#1C1817] mt-1.5 truncate group-hover:text-[#5B1924] transition-colors">
                  {look.occasion}
                </h4>

                <p className="text-[11px] text-[#5E564E] truncate mt-0.5">
                  {look.itemsSummary}
                </p>

                <div className="flex items-center gap-3 text-[10px] text-[#8C8379] mt-1">
                  <span>{look.weather}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Link */}
      <div className="pt-4 mt-4 border-t border-[#F2ECE1]">
        <button
          type="button"
          onClick={onOpenPlanner}
          className="w-full py-2.5 px-4 rounded-full bg-[#FAF6EE] hover:bg-[#5B1924] text-[#1C1817] hover:text-[#FDFBF7] text-xs font-semibold border border-[#ECE5DA] hover:border-[#5B1924] transition-all flex items-center justify-center gap-2 cursor-pointer group active:scale-[0.98]"
        >
          <span>Open Full Outfit Planner</span>
          <ArrowRight size={13} className="text-[#5B1924] group-hover:text-[#FDFBF7] group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
