import React, { useEffect, useState } from 'react';
import { Calendar, ArrowRight, Sparkles, Shirt, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { fetchUpcomingOutfits } from '../../calendar/api/calendarApi';
import { ScheduledOutfit } from '../../calendar/types';

interface UpcomingOutfitsProps {
  onOpenPlanner?: () => void;
}

function formatUpcomingDay(dateStr: string): { dayLabel: string; dateLabel: string } {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const target = new Date(year, month - 1, day);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    let dayLabel = target.toLocaleDateString('en-US', { weekday: 'short' });
    if (target.getTime() === today.getTime()) {
      dayLabel = 'Today';
    } else if (target.getTime() === tomorrow.getTime()) {
      dayLabel = 'Tomorrow';
    }

    const dateLabel = target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { dayLabel, dateLabel };
  } catch {
    return { dayLabel: 'Upcoming', dateLabel: dateStr };
  }
}

export const UpcomingOutfits: React.FC<UpcomingOutfitsProps> = ({ onOpenPlanner }) => {
  const [upcomingLooks, setUpcomingLooks] = useState<ScheduledOutfit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadUpcoming = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchUpcomingOutfits(7);
      setUpcomingLooks(res.upcomingOutfits || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load upcoming outfits.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUpcoming();
  }, []);

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E0D5] rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#F2ECE1]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#5B1924] text-[#FDFBF7]">
                <Calendar className="w-3 h-3 text-[#FDFBF7]" />
                <span>Outfit Planner</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#9A5360] bg-[#B76E79]/10 border border-[#B76E79]/20 px-2.5 py-0.5 rounded-full">
                Next 7 Days
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

        {/* Content States */}
        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-3 rounded-2xl bg-[#FCFAF7] border border-[#ECE5DA] flex items-center gap-3.5 animate-pulse"
              >
                <div className="w-16 h-20 rounded-xl bg-[#E8E0D5]/60 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#E8E0D5]/70 rounded w-1/3" />
                  <div className="h-4 bg-[#E8E0D5]/90 rounded w-3/4" />
                  <div className="h-3 bg-[#E8E0D5]/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-8 px-4 text-center rounded-2xl bg-[#FDFBF7] border border-[#ECE5DA]">
            <AlertCircle className="w-8 h-8 text-[#B76E79] mx-auto mb-2" />
            <p className="text-xs text-[#5E564E] mb-3">{error}</p>
            <button
              type="button"
              onClick={loadUpcoming}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#5B1924] bg-[#FAF6EE] border border-[#ECE5DA] hover:bg-[#5B1924] hover:text-[#FDFBF7] rounded-full transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : upcomingLooks.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-2xl bg-[#FCFAF7] border border-dashed border-[#ECE5DA] my-1">
            <div className="w-11 h-11 rounded-full bg-[#FAF6EE] border border-[#ECE5DA] flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-5 h-5 text-[#9A5360]" />
            </div>
            <h4 className="font-editorial text-sm font-semibold text-[#1C1817] mb-1">
              No looks scheduled this week
            </h4>
            <p className="text-xs text-[#8C8379] max-w-xs mx-auto mb-4 leading-relaxed">
              Plan your outfits ahead of time for work, events, or weekend outings.
            </p>
            <button
              type="button"
              onClick={onOpenPlanner}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#5B1924] hover:bg-[#43121A] text-[#FDFBF7] text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Plan an Outfit</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingLooks.map((look) => {
              const { dayLabel, dateLabel } = formatUpcomingDay(look.date);
              const outfit = look.outfit;
              const garments = outfit?.garments || [];
              const firstGarmentImage = garments.find((g) => g.signedUrl)?.signedUrl;
              const garmentsSummary = garments.map((g) => g.name).join(' • ') || 'Saved Outfit';

              return (
                <div
                  key={look._id}
                  onClick={onOpenPlanner}
                  className="p-3 rounded-2xl bg-[#FCFAF7] hover:bg-[#F8F4EC] border border-[#ECE5DA] flex items-center gap-3.5 transition-colors group cursor-pointer"
                >
                  {/* Thumbnail Image */}
                  <div className="w-16 h-20 rounded-xl overflow-hidden bg-[#F2ECE1] border border-[#E8E0D5] shrink-0 flex items-center justify-center relative">
                    {firstGarmentImage ? (
                      <img
                        src={firstGarmentImage}
                        alt={outfit?.name || 'Planned Outfit'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <Shirt className="w-6 h-6 text-[#8C8379]" />
                    )}
                    {garments.length > 1 && (
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1C1817]/70 text-[#FDFBF7] backdrop-blur-xs">
                        +{garments.length - 1}
                      </span>
                    )}
                  </div>

                  {/* Look Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B1924] bg-[#5B1924]/8 px-2 py-0.5 rounded-md">
                        {dayLabel} • {dateLabel}
                      </span>
                      <span className="text-[10px] font-semibold text-[#8C8379] bg-[#ECE5DA]/60 px-2 py-0.5 rounded-full">
                        {look.slot}
                      </span>
                    </div>

                    <h4 className="font-editorial text-xs sm:text-sm font-semibold text-[#1C1817] mt-1.5 truncate group-hover:text-[#5B1924] transition-colors">
                      {outfit?.name || 'Planned Look'}
                    </h4>

                    <p className="text-[11px] text-[#5E564E] truncate mt-0.5">
                      {garmentsSummary}
                    </p>

                    {look.notes ? (
                      <p className="text-[10px] text-[#8C8379] italic truncate mt-1">
                        "{look.notes}"
                      </p>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8C8379] mt-1">
                        <Sparkles className="w-3 h-3 text-[#9A5360]" />
                        <span>Ready to wear</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="pt-4 mt-4 border-t border-[#F2ECE1]">
        <button
          type="button"
          onClick={onOpenPlanner}
          className="w-full py-2.5 px-4 rounded-full bg-[#FAF6EE] hover:bg-[#5B1924] text-[#1C1817] hover:text-[#FDFBF7] text-xs font-semibold border border-[#ECE5DA] hover:border-[#5B1924] transition-all flex items-center justify-center gap-2 cursor-pointer group active:scale-[0.98]"
        >
          <span>Open Full Outfit Planner</span>
          <ArrowRight
            size={13}
            className="text-[#5B1924] group-hover:text-[#FDFBF7] group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </div>
  );
};
