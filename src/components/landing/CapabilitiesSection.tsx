import React from 'react';

export const CapabilitiesSection: React.FC = () => {
  return (
    <section id="capabilities" className="scroll-mt-20 sm:scroll-mt-24 py-16 sm:py-24 md:py-32 bg-white border-b border-[#EAE4D9]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-14 lg:px-24">
        {/* Section Title Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-20 pb-5 border-b border-[#EAE4D9]">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#5B1924] mb-2 block">
              02 — Capabilities
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-[#1C1817]">
              What it can <span className="font-cursive text-[1.22em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">do</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#5E564E] max-w-md mt-3 md:mt-0 leading-relaxed">
            From smart cataloging to automated daily styling, ClosetBrain transforms how you curate and wear clothing.
          </p>
        </div>

        {/* Asymmetric Editorial Capabilities Composition */}
        <div className="space-y-8 sm:space-y-10">

          {/* Row 1: The Deep Burgundy Visual Anchor (7 cols) + Digital Wardrobe Archive (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">

            {/* 02 — OUTFIT GENERATION: Deep Burgundy Visual Anchor Surrounded by White Space */}
            <div className="lg:col-span-7 bg-[#5B1924] text-[#FDFBF7] p-8 sm:p-12 md:p-14 rounded-3xl relative overflow-hidden flex flex-col justify-between shadow-[0_20px_50px_-15px_rgba(91,25,36,0.3)]">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#FDFBF7]/20 mb-8">
                  <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#E8D7BE]">
                    Capability 02 // Core Generator
                  </span>
                  <span className="text-2xl font-editorial font-light text-[#E8D7BE]/90">
                    02
                  </span>
                </div>

                <h3 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#FDFBF7] mb-3 leading-tight">
                  Unexpected combinations.
                </h3>
                <p className="font-cursive text-2xl sm:text-3xl text-[#E8D7BE] mb-6 font-normal">
                  Discover more with what you own.
                </p>

                <p className="text-sm sm:text-base text-[#FDFBF7]/90 leading-relaxed max-w-xl font-normal">
                  Generate complete, stylish outfits tailored to daily weather conditions, dress codes, and your personal style rules in one click.
                </p>
              </div>

              <div className="pt-8 mt-8 border-t border-[#FDFBF7]/15 flex items-center justify-between text-xs text-[#E8D7BE]/80 tracking-wide font-sans">
                <span>Weather-Adaptive · Occasion Codes · Custom Rules</span>
              </div>
            </div>

            {/* 01 — DIGITAL WARDROBE: Subtle Warm Latte Supporting Panel */}
            <div className="lg:col-span-5 bg-[#FAF7F2] p-8 sm:p-10 md:p-12 rounded-3xl border border-[#EAE4D9] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#EAE4D9] mb-8">
                  <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5B1924] font-semibold">
                    Capability 01 // Archive
                  </span>
                  <span className="text-2xl font-editorial font-light text-[#5B1924]">
                    01
                  </span>
                </div>

                <h3 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1817] mb-2 leading-tight">
                  Everything you own. <br />One place.
                </h3>
                <p className="font-cursive text-2xl text-[#5B1924] mb-5 font-normal">
                  A digital home for your collection.
                </p>

                <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
                  Digitize your entire clothing collection. Tag items by color, season, formality, brand, and material for instant visual search and filtering.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#EAE4D9] text-xs text-[#8C8379] tracking-wide font-sans">
                Instant cataloging and visual archive
              </div>
            </div>

          </div>

          {/* Row 2: Smart Styling (Open Typographic Block) + Outfit Planning (Crisp Pure White Panel) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">

            {/* 03 — SMART STYLING: Open Typographic Composition directly on White */}
            <div className="lg:col-span-5 p-8 sm:p-10 border-l-2 border-[#5B1924] bg-transparent flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#EAE4D9] mb-6">
                  <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5B1924] font-semibold">
                    Capability 03 // Silhouette
                  </span>
                  <span className="text-2xl font-editorial font-light text-[#5B1924]">
                    03
                  </span>
                </div>

                <h3 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1817] mb-2 leading-tight">
                  Harmony & Proportion.
                </h3>
                <p className="font-cursive text-2xl text-[#5B1924] mb-4 font-normal">
                  Balance color palettes and silhouettes.
                </p>

                <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
                  Intelligent style recommendations that balance color palettes, silhouette proportions, and layering for a refined aesthetic.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#EAE4D9] text-xs text-[#8C8379] tracking-wide font-sans">
                Color harmony & sartorial balance
              </div>
            </div>

            {/* 04 — OUTFIT PLANNING: Crisp Pure White Panel */}
            <div className="lg:col-span-7 bg-white p-8 sm:p-10 md:p-12 rounded-3xl border border-[#EAE4D9] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE1] mb-8">
                  <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5B1924] font-semibold">
                    Capability 04 // Schedule
                  </span>
                  <span className="text-2xl font-editorial font-light text-[#5B1924]">
                    04
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-baseline">
                  <div>
                    <h3 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1817] mb-2 leading-tight">
                      Scheduled with foresight.
                    </h3>
                    <p className="font-cursive text-2xl text-[#5B1924] mb-4 font-normal">
                      Meetings, weekends, and trips.
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
                    Schedule outfits ahead of time for important meetings, weekend getaways, or entire work weeks with intuitive calendar management.
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-[#F0EBE1] text-xs text-[#8C8379] tracking-wide font-sans">
                Weekly calendar integration & travel packing lists
              </div>
            </div>

          </div>

          {/* Row 3: 05 — WARDROBE INSIGHTS: Editorial Horizontal Spread */}
          <div className="bg-[#FAF7F2] p-8 sm:p-10 md:p-12 rounded-3xl border border-[#EAE4D9] flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5B1924] font-semibold">
                  Capability 05 // Analytics
                </span>
                <span className="w-8 h-[1px] bg-[#EAE4D9]" />
                <span className="text-xs font-sans uppercase tracking-widest text-[#8C8379]">
                  Wardrobe Insights
                </span>
              </div>
              <h3 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-medium text-[#1C1817] tracking-tight mb-2">
                Wear what matters.
              </h3>
              <p className="font-cursive text-2xl sm:text-3xl text-[#5B1924] mb-3">
                Make every piece count.
              </p>
              <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
                Understand your wearing habits with wear-frequency statistics, cost-per-wear breakdown, and targeted advice on missing closet essentials.
              </p>
            </div>

            <div className="shrink-0 flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 md:border-l border-[#EAE4D9] pt-4 md:pt-0 md:pl-10">
              <div className="text-left md:text-right">
                <span className="text-4xl sm:text-5xl font-editorial font-light text-[#5B1924] block leading-none">
                  05
                </span>
                <span className="text-xs font-sans tracking-wider uppercase text-[#8C8379] block mt-1">
                  Wear Frequency & Cost-Per-Wear
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
