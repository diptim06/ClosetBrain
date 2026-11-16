import React from 'react';
import { ArrowRight } from 'lucide-react';

interface HowItWorksSectionProps {
  onOpenApp: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onOpenApp }) => {
  return (
    <section id="how-it-works" className="scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-24 md:py-32 bg-white border-b border-[#EAE4D9]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-14 lg:px-24">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 sm:mb-20 pb-5 border-b border-[#EAE4D9]">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#5B1924] mb-2 block">
              04 — Workflow
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-[#1C1817]">
              How it <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">works</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#5E564E] max-w-md mt-3 md:mt-0 leading-relaxed font-sans">
            A seamless three-stage process designed to bring harmony and clarity to your wardrobe.
          </p>
        </div>

        {/* Connected Visual Process Axis (Desktop Timeline) */}
        <div className="hidden lg:grid grid-cols-12 gap-8 items-center mb-12 relative">
          <div className="col-span-12 relative flex items-center justify-between">
            <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[1px] bg-[#EAE4D9] z-0" />

            <div className="relative z-10 bg-white pr-4 flex items-center gap-2.5 text-xs font-mono uppercase tracking-widest text-[#5B1924] font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5B1924]" />
              Phase 01 // Digitize
            </div>

            <div className="relative z-10 bg-white px-4 flex items-center gap-2.5 text-xs font-mono uppercase tracking-widest text-[#5B1924] font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5B1924] ring-4 ring-[#FAF7F2]" />
              Phase 02 // Synthesis
            </div>

            <div className="relative z-10 bg-white pl-4 flex items-center gap-2.5 text-xs font-mono uppercase tracking-widest text-[#5B1924] font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5B1924]" />
              Phase 03 // Curate
            </div>
          </div>
        </div>

        {/* 3 Connected Stages: Open Editorial Process Diagram */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch mb-16 sm:mb-20">

          {/* Stage 01: Open Editorial Column (Desktop hairline right border) */}
          <div className="lg:col-span-4 flex flex-col justify-between lg:pr-8 lg:border-r border-[#EAE4D9]/80 relative pl-6 lg:pl-0 border-l lg:border-l-0 border-[#EAE4D9]">
            {/* Mobile dot indicator */}
            <div className="lg:hidden absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#5B1924]" />

            <div>
              <span className="text-4xl sm:text-5xl font-editorial font-light text-[#5B1924] block leading-none mb-3">
                01
              </span>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#8C8379] font-semibold block mb-2">
                Step One // Archive
              </span>
              <h3 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1817] mb-1.5 leading-tight">
                Digitally Capture
              </h3>
              <p className="font-cursive text-2xl text-[#5B1924] mb-4 font-normal">
                The Foundation
              </p>

              <p className="text-sm text-[#5E564E] leading-relaxed font-sans">
                Snap quick photos or upload images of your garments. Organize shirts, trousers, outerwear, shoes, and accessories into a clean, searchable digital repository.
              </p>
            </div>
          </div>

          {/* Stage 02: Restrained Visual Accent (Warm Latte Wash Surface) */}
          <div className="lg:col-span-4 bg-[#FAF7F2] p-8 sm:p-10 rounded-2xl flex flex-col justify-between relative pl-6 lg:pl-10 border-l lg:border-l-0 border-[#5B1924]">
            {/* Mobile dot indicator */}
            <div className="lg:hidden absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#5B1924]" />

            <div>
              <span className="text-4xl sm:text-5xl font-editorial font-medium text-[#5B1924] block leading-none mb-3">
                02
              </span>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5B1924] font-semibold block mb-2">
                Step Two // Engine
              </span>
              <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1817] mb-1.5 leading-tight">
                Index & Analyze
              </h3>
              <p className="font-cursive text-2xl text-[#5B1924] mb-4 font-normal">
                The Intelligence Core
              </p>

              <p className="text-sm text-[#5E564E] leading-relaxed font-sans">
                ClosetBrain automatically indexes each garment — cataloging color relationships, formality levels, seasonal appropriateness, and layering compatibility.
              </p>
            </div>
          </div>

          {/* Stage 03: Open Editorial Column */}
          <div className="lg:col-span-4 flex flex-col justify-between lg:pl-8 relative pl-6 lg:pl-8 border-l lg:border-l-0 border-[#EAE4D9]">
            {/* Mobile dot indicator */}
            <div className="lg:hidden absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#5B1924]" />

            <div>
              <span className="text-4xl sm:text-5xl font-editorial font-light text-[#5B1924] block leading-none mb-3">
                03
              </span>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#8C8379] font-semibold block mb-2">
                Step Three // Outcome
              </span>
              <h3 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1817] mb-1.5 leading-tight">
                Receive & Wear
              </h3>
              <p className="font-cursive text-2xl text-[#5B1924] mb-4 font-normal">
                Everyday Elegance
              </p>

              <p className="text-sm text-[#5E564E] leading-relaxed font-sans">
                Get curated outfit formulas crafted automatically for your day. Save favorites, plan your week, and step out feeling confident and refined.
              </p>
            </div>
          </div>

        </div>

        {/* Action Callout with High-Impact Editorial CTA */}
        <div className="text-center pt-2">
          <button
            onClick={onOpenApp}
            className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 sm:px-10 sm:py-4 rounded-full bg-[#5B1924] text-[#FDFBF7] text-sm sm:text-base font-medium hover:bg-[#48131C] active:scale-[0.98] transition-all shadow-[0_12px_30px_-10px_rgba(91,25,36,0.5)] cursor-pointer group"
          >
            <span>Experience ClosetBrain Now</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};
