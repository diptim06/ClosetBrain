import React, { lazy, Suspense, useState } from 'react';
import { Sparkles, Maximize2, RotateCw, ArrowRight, Layers, ShieldCheck } from 'lucide-react';

const OutfitMannequin = lazy(() =>
  import('../../../components/OutfitMannequin').then(({ OutfitMannequin }) => ({
    default: OutfitMannequin,
  }))
);

interface MannequinPreviewProps {
  onOpenStudio?: () => void;
}

export const MannequinPreview: React.FC<MannequinPreviewProps> = ({ onOpenStudio }) => {
  const [isInteracting, setIsInteracting] = useState(false);

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E0D5] rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
      {/* Subtle Dusty-Rose ambient glow */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#B76E79]/8 blur-2xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Atelier Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#5B1924] text-[#FDFBF7]">
              <Sparkles className="w-3 h-3 text-[#FDFBF7]" />
              <span>3D Atelier Stage</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#9A5360] bg-[#B76E79]/10 border border-[#B76E79]/20 px-2.5 py-0.5 rounded-full">
              Volumetric Fit
            </span>
          </div>

          <span className="text-[10px] text-[#8C8379] tracking-wider uppercase font-medium">
            WebGL 360°
          </span>
        </div>

        <h3 className="font-editorial text-2xl text-[#1C1817] font-semibold">
          Silhouette & Proportion{' '}
          <span className="font-cursive text-2xl sm:text-3xl text-[#5B1924] font-normal inline-block">
            Analysis
          </span>
        </h3>
        <p className="text-xs text-[#5E564E] mt-1 leading-relaxed">
          Inspect volume, fabric drape, and hemline proportions on the 3D avatar before dressing.
        </p>
      </div>

      {/* Architectural Studio Stage Container */}
      <div
        className="relative my-4 aspect-[4/3] sm:aspect-[1/1] w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#FAF6EE] via-[#F5ECE1] to-[#EAE0D3] border border-[#ECE5DA] shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={() => setIsInteracting(true)}
        onMouseUp={() => setIsInteracting(false)}
        onTouchStart={() => setIsInteracting(true)}
        onTouchEnd={() => setIsInteracting(false)}
      >
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="w-9 h-9 rounded-full border-2 border-[#5B1924] border-t-transparent animate-spin mb-3" />
              <span className="text-xs text-[#5E564E] font-medium">
                Loading 3D Mannequin Stage...
              </span>
            </div>
          }
        >
          <OutfitMannequin />
        </Suspense>

        {/* Floating Rotation Prompt */}
        <div
          className={`absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between text-[11px] pointer-events-none transition-opacity duration-300 ${
            isInteracting ? 'opacity-25' : 'opacity-100'
          }`}
        >
          <span className="px-3 py-1 rounded-full bg-[#1C1817]/85 backdrop-blur-md text-[#FDFBF7] font-medium inline-flex items-center gap-1.5 border border-white/10 shadow-xs">
            <RotateCw size={11} className="animate-spin text-[#FDFBF7]" />
            <span>Drag to rotate 360°</span>
          </span>

          <span className="px-2.5 py-1 rounded-full bg-[#FFFFFF]/90 backdrop-blur-md text-[#5B1924] font-semibold border border-[#ECE5DA] shadow-xs">
            Studio V2.4
          </span>
        </div>
      </div>

      {/* Proportions Breakdown Specs */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-[#5E564E] pb-2">
        <div className="p-2 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA]">
          <span className="block text-[#8C8379] uppercase font-bold text-[9px]">Trench Drop</span>
          <span className="font-semibold text-[#1C1817] text-[11px]">Mid-Calf</span>
        </div>
        <div className="p-2 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA]">
          <span className="block text-[#8C8379] uppercase font-bold text-[9px]">Knit Fit</span>
          <span className="font-semibold text-[#1C1817] text-[11px]">Relaxed</span>
        </div>
        <div className="p-2 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA]">
          <span className="block text-[#8C8379] uppercase font-bold text-[9px]">Trouser Break</span>
          <span className="font-semibold text-[#1C1817] text-[11px]">Full Length</span>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="pt-2 border-t border-[#F2ECE1]">
        <button
          type="button"
          onClick={onOpenStudio}
          className="w-full py-3 px-4 rounded-full bg-[#FAF6EE] hover:bg-[#5B1924] text-[#1C1817] hover:text-[#FDFBF7] text-xs font-semibold border border-[#ECE5DA] hover:border-[#5B1924] transition-all flex items-center justify-center gap-2 cursor-pointer group active:scale-[0.98] shadow-xs"
        >
          <Maximize2 size={13} className="text-[#5B1924] group-hover:text-[#FDFBF7]" />
          <span>Launch Full 3D Fit Studio</span>
          <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
