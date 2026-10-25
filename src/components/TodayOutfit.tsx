import React, { lazy, Suspense, useState } from 'react';
import { ArrowRight, CloudSun, MapPin, Sparkles, CheckCircle2, X } from 'lucide-react';
import { TodayOutfitData } from '../data/mockData';

const OutfitMannequin = lazy(() => import('./OutfitMannequin').then(({ OutfitMannequin }) => ({ default: OutfitMannequin })));

interface TodayOutfitProps {
  data: TodayOutfitData;
}

export const TodayOutfit: React.FC<TodayOutfitProps> = ({ data }) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="cb-card p-5 flex flex-col justify-between h-full group">
        {/* Header Title & Subtitle */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-[#23201D] font-editorial tracking-tight">
              {data.title}
            </h2>
            <span className="text-[11px] font-bold text-[#A65D47] bg-[#A65D47]/10 px-2.5 py-1 rounded-full border border-[#A65D47]/20 flex items-center gap-1">
              <Sparkles size={11} /> {data.matchScore}% Match
            </span>
          </div>
          <p className="text-xs text-[#78716C] mb-4">
            {data.subtitle}
          </p>

          {/* Outfit Visual Frame */}
          <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden bg-[#F5EFE6] border border-[#ECE7DE] mb-4">
            <Suspense fallback={<img src={data.image} alt="Outfit preview" className="w-full h-full object-cover" />}>
              <OutfitMannequin />
            </Suspense>
            <div className="absolute inset-0 bg-gradient-to-t from-[#23201D]/45 via-transparent to-transparent pointer-events-none"></div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
              <span className="bg-[#23201D]/75 backdrop-blur-xs px-2.5 py-1 rounded-md pointer-events-none">
                Drag to rotate
              </span>
              <span className="bg-[#A65D47] text-white px-2.5 py-1 rounded-md font-semibold text-[11px] pointer-events-none">
                Recommended Today
              </span>
            </div>
          </div>

          {/* Contextual Detail Badges */}
          <div className="grid grid-cols-3 gap-2 text-xs mb-4">
            <div className="bg-[#FBF9F5] border border-[#ECE7DE] p-2 rounded-lg flex items-center gap-2 text-[#78716C]">
              <CloudSun size={15} className="text-[#A65D47] shrink-0" />
              <div>
                <span className="text-[10px] text-[#9E968E] block leading-none">WEATHER</span>
                <span className="font-semibold text-[#23201D]">{data.weather}</span>
              </div>
            </div>

            <div className="bg-[#FBF9F5] border border-[#ECE7DE] p-2 rounded-lg flex items-center gap-2 text-[#78716C]">
              <MapPin size={15} className="text-[#A65D47] shrink-0" />
              <div>
                <span className="text-[10px] text-[#9E968E] block leading-none">OCCASION</span>
                <span className="font-semibold text-[#23201D]">{data.occasion}</span>
              </div>
            </div>

            <div className="bg-[#FBF9F5] border border-[#ECE7DE] p-2 rounded-lg flex items-center gap-2 text-[#78716C]">
              <Sparkles size={15} className="text-[#A65D47] shrink-0" />
              <div>
                <span className="text-[10px] text-[#9E968E] block leading-none">STYLE</span>
                <span className="font-semibold text-[#23201D]">{data.style}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-2.5 px-4 bg-[#F5EFE6] hover:bg-[#A65D47] text-[#23201D] hover:text-white font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-2 border border-[#ECE7DE] hover:border-[#A65D47] cursor-pointer"
        >
          <span>View Outfit</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Outfit Modal Drawer */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#23201D]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#ECE7DE] rounded-xl max-w-lg w-full p-6 shadow-xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-[#78716C] hover:text-[#23201D] rounded-full hover:bg-[#F5EFE6]"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 text-xs text-[#A65D47] font-semibold uppercase tracking-wider mb-1">
              <Sparkles size={14} /> Daily AI Pick
            </div>
            <h3 className="text-xl font-bold font-editorial text-[#23201D] mb-4">
              Today's Recommended Look
            </h3>

            <div className="aspect-[16/9] rounded-lg overflow-hidden mb-4 border border-[#ECE7DE]">
              <img src={data.image} alt={data.title} className="w-full h-full object-cover" />
            </div>

            <div className="space-y-2 mb-6">
              <div className="text-xs font-semibold text-[#78716C] uppercase">Included Garments:</div>
              <ul className="space-y-1.5">
                {data.garments.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-[#23201D] bg-[#FBF9F5] p-2 rounded border border-[#ECE7DE]">
                    <CheckCircle2 size={14} className="text-[#A65D47]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setModalOpen(false)}
              className="w-full py-2.5 bg-[#A65D47] text-white font-medium text-xs rounded-lg hover:bg-[#964B36] transition-colors"
            >
              Wear This Outfit Today
            </button>
          </div>
        </div>
      )}
    </>
  );
};
