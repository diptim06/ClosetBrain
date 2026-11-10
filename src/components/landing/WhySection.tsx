import React from 'react';

export const WhySection: React.FC = () => {
  return (
    <section id="why-use" className="scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-24 md:py-32 bg-[#FDFBF7] border-y border-[#EAE4D9]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-14 lg:px-24">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 sm:mb-20 pb-5 border-b border-[#EAE4D9]">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#5B1924] mb-2 block font-sans">
              03 — Perspective
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-[#1C1817]">
              Why <span className="font-cursive text-[1.22em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">ClosetBrain</span>?
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#5E564E] max-w-md mt-3 md:mt-0 leading-relaxed font-sans">
            Elevate your daily routine, unlock hidden closet value, and eliminate morning fatigue forever.
          </p>
        </div>

        {/* Emotionally Persuasive Open Editorial Composition */}
        <div className="space-y-10 sm:space-y-12">

          {/* Prominent Editorial Manifesto Statement: Benefit 01 (Reduce Decision Fatigue) */}
          <div className="bg-white p-8 sm:p-12 md:p-16 rounded-3xl border border-[#EAE4D9] shadow-[0_12px_40px_rgba(28,24,23,0.03)]">
            <div className="max-w-4xl">
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5B1924] font-semibold block mb-4">
                The Philosophy // Mental Clarity
              </span>

              <h3 className="font-editorial text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium text-[#1C1817] tracking-tight leading-[1.1] mb-2">
                Clutter is costly.
              </h3>
              <p className="font-cursive text-3xl sm:text-5xl md:text-6xl text-[#5B1924] mb-6 font-normal">
                Confidence is effortless.
              </p>

              <p className="text-base sm:text-lg text-[#5E564E] leading-relaxed max-w-2xl font-normal font-sans">
                Never waste precious morning energy standing indecisively in front of a cluttered closet. Wake up to curated recommendations ready for your day — tailored to your schedule, the weather, and personal style rules.
              </p>
            </div>
          </div>

          {/* Asymmetric Supporting Benefits Composition (Open Layout + Contained Surface) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-stretch">

            {/* 02 — Discover New Combinations (Open Typographic Narrative on Ivory) */}
            <div className="lg:col-span-7 flex flex-col justify-center py-4 sm:py-6 pr-0 lg:pr-8">
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5B1924] font-semibold block mb-3">
                02 // Perspective
              </span>
              <h4 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-medium text-[#1C1817] mb-4 leading-tight">
                Unexpected pairings <br className="hidden sm:inline" />hiding in plain sight.
              </h4>
              <p className="text-sm sm:text-base text-[#5E564E] leading-relaxed max-w-xl font-sans">
                Uncover fresh, stylish combinations from garments you already own. By cross-referencing tones, silhouettes, and textures, ClosetBrain finds formulas you'd never think to pull together — breathing new life into every hanger without spending more.
              </p>
            </div>

            {/* 03 — Make Better Use of Existing Clothes (Tactile Warm Latte Supporting Surface) */}
            <div className="lg:col-span-5 bg-[#FAF7F2] p-8 sm:p-10 rounded-2xl border border-[#EAE4D9] flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5B1924] font-semibold block mb-3">
                  03 // Conscious Wardrobe
                </span>
                <h4 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1817] mb-3 leading-snug">
                  Maximize what you own.
                </h4>
                <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed font-sans">
                  Maximize the utility of garments you already own, lower your cost-per-wear, and embrace a conscious, sustainable approach to everyday fashion.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-[#EAE4D9] text-xs font-sans text-[#8C8379] tracking-wider uppercase">
                Higher utility · Lower cost-per-wear
              </div>
            </div>

          </div>

          {/* 04 — Save Time (Horizontal Hairline Editorial Strip) */}
          <div className="border-t border-b border-[#EAE4D9] py-8 sm:py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-baseline gap-5">
              <span className="text-3xl sm:text-4xl font-editorial font-light text-[#5B1924]">
                04
              </span>
              <div>
                <h4 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1817]">
                  Zero trial-and-error mornings.
                </h4>
                <p className="text-xs sm:text-sm text-[#5E564E] mt-1 max-w-lg font-sans">
                  Get dressed in seconds with zero outfit uncertainty. Select your look, step out with confidence, and reclaim your mornings.
                </p>
              </div>
            </div>
            <div className="text-left md:text-right shrink-0">
              <span className="text-xs font-mono uppercase tracking-widest text-[#5B1924] font-semibold block">
                Immediate Payoff
              </span>
              <span className="text-xs text-[#8C8379] font-sans mt-0.5 block">
                Daily peace of mind
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
