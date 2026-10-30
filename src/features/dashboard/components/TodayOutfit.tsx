import React, { useState } from 'react';
import {
  Sparkles,
  CloudSun,
  MapPin,
  Heart,
  RefreshCw,
  SlidersHorizontal,
  Check,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { TodayOutfitData } from '../../../data/mockData';

interface TodayOutfitProps {
  data?: TodayOutfitData;
  onOpenStudio?: () => void;
  onSaveOutfit?: () => void;
}

export const TodayOutfit: React.FC<TodayOutfitProps> = ({
  data = {
    id: 'today-01',
    title: "Today's Recommended Outfit",
    subtitle: 'Curated for 24°C mild autumn weather in Paris with effortless neutral balance',
    image: '/assets/outfit_today.jpg',
    weather: '24°C',
    occasion: 'Campus & Creative Studio',
    style: 'Neutral Layered',
    matchScore: 94,
    garments: [
      'Beige Oversized Trench Coat',
      'Cream Cashmere Knit Sweater',
      'Charcoal Tailored Trousers',
      'Tan Leather Chelsea Boots',
    ],
  },
  onOpenStudio,
  onSaveOutfit,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isWornToday, setIsWornToday] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Individual visible garments with photography, luxury fabric details, and swatches
  const garmentPieces = [
    {
      id: 'g-1',
      name: 'Beige Oversized Trench Coat',
      category: 'Outerwear',
      fabric: 'Water-resistant Cotton Gabardine',
      color: '#D8C7B5',
      image:
        'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=300',
    },
    {
      id: 'g-2',
      name: 'Cream Cashmere Knit Sweater',
      category: 'Tops',
      fabric: '100% Mongolian Cashmere',
      color: '#F4EFE6',
      image:
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=300',
    },
    {
      id: 'g-3',
      name: 'Charcoal Tailored Trousers',
      category: 'Bottoms',
      fabric: 'Virgin Wool Gabardine',
      color: '#4B4B52',
      image:
        'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=300',
    },
    {
      id: 'g-4',
      name: 'Tan Leather Chelsea Boots',
      category: 'Footwear',
      fabric: 'Calfskin Leather',
      color: '#8D5B4C',
      image:
        'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&q=80&w=300',
    },
  ];

  const handleRegenerate = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      setIsRegenerating(false);
    }, 600);
  };

  const handleToggleSave = () => {
    setIsSaved(!isSaved);
    if (onSaveOutfit) onSaveOutfit();
  };

  return (
    <article
      aria-label="Today's Primary Outfit Recommendation"
      className="bg-[#FFFFFF] border border-[#E8E0D5] rounded-3xl p-6 sm:p-7 lg:p-8 shadow-sm space-y-6"
    >
      {/* Header: Title, Editorial Category, and Match Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F2ECE1]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase bg-[#5B1924] text-[#FDFBF7]">
              <Sparkles className="w-3 h-3 text-[#FDFBF7]" />
              <span>Primary Daily Focal Look</span>
            </span>
            <span className="text-[11px] font-medium text-[#9A5360] bg-[#B76E79]/10 border border-[#B76E79]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              Neutral Capsule
            </span>
          </div>

          <h2 className="font-editorial text-2xl sm:text-3xl lg:text-4xl text-[#1C1817] font-semibold leading-tight">
            The Structured Trench{' '}
            <span className="font-cursive text-3xl sm:text-4xl lg:text-[42px] text-[#5B1924] font-normal inline-block">
              Ensemble
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#5E564E] font-normal leading-relaxed">
            {data.subtitle}
          </p>
        </div>

        {/* Match Score Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-1.5 rounded-full bg-[#5B1924]/8 border border-[#5B1924]/20 text-xs font-bold text-[#5B1924] flex items-center gap-1.5 shadow-2xs">
            <Sparkles size={13} className="text-[#5B1924]" />
            <span>{data.matchScore}% Style Match</span>
          </div>
        </div>
      </div>

      {/* Main Showcase: Big Editorial Photo + Stylist Narrative */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Large Outfit Visual Preview */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="relative aspect-[4/3] sm:aspect-[16/11] w-full rounded-2xl overflow-hidden bg-[#F2ECE1] border border-[#E8E0D5] group shadow-inner">
            <img
              src={data.image}
              alt="Full outfit presentation with beige trench and cashmere knit"
              className="w-full h-full object-cover object-top group-hover:scale-[1.015] transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1C1817]/65 via-[#1C1817]/10 to-transparent pointer-events-none" />

            {/* Weather & Occasion Pills */}
            <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF]/90 backdrop-blur-md text-[11px] font-semibold text-[#1C1817] border border-[#ECE5DA] shadow-xs">
                <CloudSun size={13} className="text-[#5B1924]" />
                <span>{data.weather} Paris</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF]/90 backdrop-blur-md text-[11px] font-semibold text-[#1C1817] border border-[#ECE5DA] shadow-xs">
                <MapPin size={13} className="text-[#5B1924]" />
                <span>{data.occasion}</span>
              </span>
            </div>

            {/* Bottom Card Overlay Actions */}
            <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between text-xs text-[#FDFBF7]">
              <span className="bg-[#1C1817]/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-medium border border-white/10">
                Layered Fluidity • 4 Items
              </span>

              <button
                type="button"
                onClick={handleToggleSave}
                aria-label={isSaved ? 'Favorited' : 'Save outfit'}
                className={`p-2.5 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-[#5B1924] text-[#FDFBF7] border-[#5B1924]'
                    : 'bg-[#FFFFFF]/85 text-[#1C1817] border-[#ECE5DA] hover:bg-[#FFFFFF]'
                }`}
              >
                <Heart size={15} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {/* Stylist Commentary Box with Dusty-Rose border accent */}
          <div className="mt-3.5 p-3.5 rounded-2xl bg-[#FAF6EE] border-l-3 border-l-[#B76E79] border-y border-r border-[#ECE5DA] text-xs text-[#5E564E] leading-relaxed">
            <span className="font-semibold text-[#1C1817] uppercase tracking-wider text-[10px] block mb-1">
              Stylist Narrative:
            </span>
            A tailored equilibrium of warm sand and charcoal tones. The lightweight trench shields against
            gusts while the cashmere layer regulates body temperature indoors. Pair with delicate silver
            or warm horn jewelry.
          </div>
        </div>

        {/* Right Column: Visible Individual Garments Grid + Primary Actions */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8C8379]">
                Individual Garments (4 Pieces)
              </span>
              <button
                type="button"
                onClick={onOpenStudio}
                className="text-[11px] font-semibold text-[#5B1924] hover:underline cursor-pointer"
              >
                Swap Items
              </button>
            </div>

            {/* Garment Photography Thumbnail Cards */}
            <div className="space-y-2.5">
              {garmentPieces.map((garment) => (
                <div
                  key={garment.id}
                  className="p-2.5 rounded-2xl bg-[#FCFAF7] hover:bg-[#F8F4EC] border border-[#ECE5DA] flex items-center gap-3 transition-colors group cursor-pointer"
                >
                  {/* Photo Thumbnail */}
                  <div className="w-13 h-14 rounded-xl overflow-hidden bg-[#F2ECE1] border border-[#E8E0D5] shrink-0">
                    <img
                      src={garment.image}
                      alt={garment.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>

                  {/* Garment Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: garment.color }}
                      />
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C8379]">
                        {garment.category}
                      </span>
                    </div>

                    <h4 className="font-editorial text-xs sm:text-sm font-semibold text-[#1C1817] truncate leading-tight mt-0.5 group-hover:text-[#5B1924] transition-colors">
                      {garment.name}
                    </h4>

                    <p className="text-[11px] text-[#5E564E] truncate mt-0.5">
                      {garment.fabric}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-3 border-t border-[#F2ECE1] space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-full bg-[#FFFFFF] border border-[#ECE5DA] hover:border-[#D8CEBD] text-[#1C1817] text-xs font-medium hover:bg-[#FAF6EE] transition-all cursor-pointer active:scale-[0.98]"
              >
                <RefreshCw
                  size={13}
                  className={`text-[#5E564E] ${isRegenerating ? 'animate-spin text-[#5B1924]' : ''}`}
                />
                <span>{isRegenerating ? 'Curating...' : 'Regenerate'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenStudio}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-full bg-[#FFFFFF] border border-[#ECE5DA] hover:border-[#D8CEBD] text-[#1C1817] text-xs font-medium hover:bg-[#FAF6EE] transition-all cursor-pointer active:scale-[0.98]"
              >
                <SlidersHorizontal size={13} className="text-[#5E564E]" />
                <span>Customize</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsWornToday(!isWornToday)}
              className={`w-full py-3.5 px-5 rounded-full text-xs sm:text-sm font-semibold tracking-wide flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.98] ${
                isWornToday
                  ? 'bg-emerald-800 text-[#FDFBF7] shadow-emerald-900/15'
                  : 'bg-[#5B1924] hover:bg-[#48131C] text-[#FDFBF7] shadow-[#5B1924]/20'
              }`}
            >
              {isWornToday ? (
                <>
                  <Check size={16} />
                  <span>Logged as Worn Today</span>
                </>
              ) : (
                <>
                  <span>Wear This Outfit Today</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
