import React from 'react';

export const WhatIsSection: React.FC = () => {
  return (
    <section
      id="what-is"
      className="scroll-mt-20 sm:scroll-mt-24 relative z-10 pt-16 sm:pt-20 md:pt-28 pb-16 sm:pb-20 md:pb-28 bg-[#FDFBF7] border-y border-[#EAE4D9]"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-14 lg:px-24">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 sm:mb-20 pb-5 border-b border-[#EAE4D9]">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#5B1924] mb-2 block">
              01 — Overview
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-[#1C1817]">
              What is{' '}
              <span className="font-cursive text-[1.22em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">
                ClosetBrain
              </span>
              ?
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#5E564E] max-w-md mt-3 md:mt-0 leading-relaxed font-sans">
            ClosetBrain bridges your physical wardrobe with digital intelligence, solving the everyday dilemma of what to wear.
          </p>
        </div>

        {/* Large Unified Editorial Composition with Diagonal Stagger */}
        <div className="relative space-y-16 sm:space-y-20 lg:space-y-28 mb-20 sm:mb-28">

          {/* UPPER ROW — THE PROBLEM: Content on LEFT (Pure White Surface), Heading on RIGHT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
            {/* Problem Content Container: Left on desktop, 2nd on mobile */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="bg-white p-8 sm:p-10 md:p-12 rounded-2xl border border-[#EAE4D9] shadow-[0_12px_36px_rgba(28,24,23,0.04)] relative">
                {/* Minimalist Archival Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE1]">
                  <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[#7D7368]">
                    Archival Dilemma
                  </span>
                  <span className="text-[11px] font-mono tracking-widest text-[#A3998D] uppercase">
                    Exhibit I
                  </span>
                </div>

                <h3 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1817] mt-6 mb-4 tracking-tight leading-snug">
                  Overflowing closets, zero inspiration.
                </h3>

                {/* Direct Typographic Stat Display */}
                <div className="my-6 py-4 border-y border-[#F0EBE1]">
                  <div className="flex flex-wrap items-baseline gap-2.5 mb-2">
                    <span className="font-editorial text-4xl sm:text-5xl font-light text-[#5B1924] tracking-tight">
                      20%
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#7D7368]">
                      worn
                    </span>
                    <span className="text-[#D6CEBF] font-light text-lg">/</span>
                    <span className="font-editorial text-4xl sm:text-5xl font-light text-[#1C1817] tracking-tight">
                      80%
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#7D7368]">
                      of the time
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed mt-2">
                    Studies show the average person wears just <strong className="text-[#1C1817] font-semibold">20% of their wardrobe 80% of the time</strong>. Great garments get hidden, decision fatigue drains morning energy, and impulse purchases lead to unworn clothes.
                  </p>
                </div>

                {/* Editorial Friction List */}
                <ul className="space-y-3 text-xs sm:text-sm text-[#5E564E] pt-2">
                  <li className="flex items-start gap-3">
                    <span className="text-[#5B1924] font-medium leading-none select-none text-base mt-0.5">—</span>
                    <span className="leading-relaxed">Morning frustration trying to coordinate matching pieces under time pressure.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#5B1924] font-medium leading-none select-none text-base mt-0.5">—</span>
                    <span className="leading-relaxed">Forgetting hidden gems and wearing the exact same 3 outfits each week.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#5B1924] font-medium leading-none select-none text-base mt-0.5">—</span>
                    <span className="leading-relaxed">Buying duplicate clothes because you don't have visual visibility into what you own.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* The Problem Oversized Cursive Heading: Right on desktop, 1st on mobile */}
            <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col justify-center items-start lg:items-end text-left lg:text-right pl-0 lg:pl-6 xl:pl-10">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <span className="w-12 h-[1px] bg-[#3D261C]/35 hidden lg:block" />
                <span className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-[#8C8379]">
                  01 // The Friction
                </span>
              </div>
              <h3 className="font-cursive text-7xl sm:text-8xl md:text-9xl lg:text-[8.5rem] xl:text-[10.5rem] 2xl:text-[12rem] text-[#5B1924] leading-[0.78] tracking-tight select-none -rotate-1 lg:-rotate-2 transition-transform duration-300 py-3 inline-block drop-shadow-[0_2px_12px_rgba(91,25,36,0.06)]">
                The Problem
              </h3>
            </div>
          </div>

          {/* LOWER ROW — THE SOLUTION: Heading on LEFT, Confident Pure White Content on RIGHT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
            {/* The Solution Oversized Cursive Heading: Left on desktop, 1st on mobile */}
            <div className="lg:col-span-6 order-1 lg:order-1 flex flex-col justify-center items-start text-left pr-0 lg:pr-6 xl:pr-10">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <span className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-[#8C8379]">
                  02 // The Resolution
                </span>
                <span className="w-12 h-[1px] bg-[#3D261C]/35 hidden lg:block" />
              </div>
              <h3 className="font-cursive text-7xl sm:text-8xl md:text-9xl lg:text-[8.5rem] xl:text-[10.5rem] 2xl:text-[12rem] text-[#5B1924] leading-[0.78] tracking-tight select-none -rotate-1 lg:-rotate-2 transition-transform duration-300 py-3 inline-block drop-shadow-[0_2px_12px_rgba(91,25,36,0.06)]">
                The Solution
              </h3>
            </div>

            {/* Solution Content Container: Crisp Pure White Surface with Burgundy Accent */}
            <div className="lg:col-span-6 order-2 lg:order-2">
              <div className="bg-white p-8 sm:p-10 md:p-12 rounded-2xl border border-[#EAE4D9] shadow-[0_16px_40px_rgba(28,24,23,0.05)] relative overflow-hidden">
                {/* Burgundy top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#5B1924]" />

                {/* Confident Editorial Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE1]">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-semibold tracking-[0.2em] uppercase bg-[#5B1924] text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    Atelier Intelligence
                  </span>
                  <span className="text-[11px] font-mono tracking-widest text-[#7D7368] uppercase font-semibold">
                    Exhibit II
                  </span>
                </div>

                <h3 className="font-editorial text-2xl sm:text-3xl md:text-[2rem] font-semibold text-[#1C1817] mt-6 mb-4 tracking-tight leading-snug">
                  Your personal digital style companion.
                </h3>

                <p className="text-xs sm:text-sm md:text-base text-[#5E564E] leading-relaxed mb-6 font-normal">
                  ClosetBrain turns your wardrobe into an organized digital catalog. It analyzes color harmony, occasion needs, and weather patterns to automatically generate elevated outfits tailored specifically to you.
                </p>

                {/* Direct High-Contrast Capability Highlights */}
                <div className="pt-5 border-t border-[#F0EBE1]">
                  <ul className="space-y-3.5 text-xs sm:text-sm text-[#4E463E]">
                    <li className="flex items-start gap-3.5">
                      <span className="font-mono text-[10px] font-bold text-white bg-[#5B1924] w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                        ✓
                      </span>
                      <span className="leading-relaxed pt-0.5 font-medium text-[#1C1817]">
                        Instant visual access to your entire closet from anywhere, anytime.
                      </span>
                    </li>
                    <li className="flex items-start gap-3.5">
                      <span className="font-mono text-[10px] font-bold text-white bg-[#5B1924] w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                        ✓
                      </span>
                      <span className="leading-relaxed pt-0.5 font-medium text-[#1C1817]">
                        Algorithmic outfit generation crafted around color rules and silhouettes.
                      </span>
                    </li>
                    <li className="flex items-start gap-3.5">
                      <span className="font-mono text-[10px] font-bold text-white bg-[#5B1924] w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                        ✓
                      </span>
                      <span className="leading-relaxed pt-0.5 font-medium text-[#1C1817]">
                        Maximized wardrobe utility and smart insights into your true cost-per-wear.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 3 Core Value Pillars as Crisp Pure White Editorial Blocks */}
        <div className="pt-10 border-t border-[#EAE4D9]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white p-7 sm:p-8 rounded-2xl border border-[#EAE4D9] shadow-sm hover:border-[#5B1924]/30 transition-all">
              <span className="font-mono text-xs font-bold tracking-widest text-[#5B1924] mb-2 block">
                01 // INDEX
              </span>
              <h4 className="font-editorial text-xl font-semibold text-[#1C1817] mb-2.5">
                Digital Wardrobe
              </h4>
              <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
                Organize shirts, trousers, jackets, and accessories into structured categories with tags for color, season, and formality.
              </p>
            </div>

            <div className="bg-white p-7 sm:p-8 rounded-2xl border border-[#EAE4D9] shadow-sm hover:border-[#5B1924]/30 transition-all">
              <span className="font-mono text-xs font-bold tracking-widest text-[#5B1924] mb-2 block">
                02 // CURATION
              </span>
              <h4 className="font-editorial text-xl font-semibold text-[#1C1817] mb-2.5">
                Intelligent Styling
              </h4>
              <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
                Curate outfits automatically based on occasion, weather, layer combinations, and aesthetic harmony.
              </p>
            </div>

            <div className="bg-white p-7 sm:p-8 rounded-2xl border border-[#EAE4D9] shadow-sm hover:border-[#5B1924]/30 transition-all">
              <span className="font-mono text-xs font-bold tracking-widest text-[#5B1924] mb-2 block">
                03 // LONGEVITY
              </span>
              <h4 className="font-editorial text-xl font-semibold text-[#1C1817] mb-2.5">
                Sustainable Curation
              </h4>
              <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
                Rediscover garments you forgot you owned, eliminate unworn clutter, and shop far more intentionally.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
