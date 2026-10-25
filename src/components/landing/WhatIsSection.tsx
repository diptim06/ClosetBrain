import React from 'react';
import { HelpCircle, CheckCircle2, AlertCircle, Shirt, Sparkles, RefreshCw } from 'lucide-react';

export const WhatIsSection: React.FC = () => {
  return (
    <section
      id="what-is"
      className="relative z-10 pt-20 md:pt-24 pb-20 md:pb-28 bg-[#F2ECE1] border-y border-[#E6DFD3]"
    >
      <div className="max-w-7xl mx-auto px-8 sm:px-12 md:px-16 lg:px-24">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-[#E6DFD3]">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#5B1924] mb-2 block">
              01 — Overview
            </span>
            <h2 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-normal text-[#1C1817]">
              What is ClosetBrain?
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#5E564E] max-w-md mt-4 md:mt-0 leading-relaxed">
            ClosetBrain bridges your physical wardrobe with digital intelligence, solving the everyday dilemma of what to wear.
          </p>
        </div>

        {/* Problem vs Solution Editorial Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Card 1: The Problem */}
          <div className="bg-[#FDFBF7] p-8 sm:p-10 rounded-3xl border border-[#E6DFD3] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-red-50 text-red-800 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5" />
                The Problem
              </div>
              <h3 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1817]">
                Overflowing closets, zero inspiration.
              </h3>
              <p className="text-[#5E564E] leading-relaxed text-sm sm:text-base">
                Studies show the average person wears just <strong className="text-[#1C1817] font-semibold">20% of their wardrobe 80% of the time</strong>. Great garments get hidden, decision fatigue drains morning energy, and impulse purchases lead to unworn clothes.
              </p>
            </div>

            <ul className="space-y-3 pt-4 border-t border-[#E6DFD3]/60 text-sm text-[#5E564E]">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924] mt-2 shrink-0" />
                <span>Morning frustration trying to coordinate matching pieces under time pressure.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924] mt-2 shrink-0" />
                <span>Forgetting hidden gems and wearing the exact same 3 outfits each week.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924] mt-2 shrink-0" />
                <span>Buying duplicate clothes because you don't have visual visibility into what you own.</span>
              </li>
            </ul>
          </div>

          {/* Card 2: The Solution */}
          <div className="bg-[#FDFBF7] p-8 sm:p-10 rounded-3xl border border-[#E6DFD3] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#5B1924]/10 text-[#5B1924] border border-[#5B1924]/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                The ClosetBrain Solution
              </div>
              <h3 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1817]">
                Your personal digital style companion.
              </h3>
              <p className="text-[#5E564E] leading-relaxed text-sm sm:text-base">
                ClosetBrain turns your wardrobe into an organized digital catalog. It analyzes color harmony, occasion needs, and weather patterns to automatically generate elevated outfits tailored specifically to you.
              </p>
            </div>

            <ul className="space-y-3 pt-4 border-t border-[#E6DFD3]/60 text-sm text-[#5E564E]">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924] mt-2 shrink-0" />
                <span>Instant visual access to your entire closet from anywhere, anytime.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924] mt-2 shrink-0" />
                <span>Algorithmic outfit generation crafted around color rules and silhouettes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924] mt-2 shrink-0" />
                <span>Maximized wardrobe utility and smart insights into your true cost-per-wear.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 3 Core Value Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FDFBF7]/80 p-6 rounded-2xl border border-[#E6DFD3]">
            <div className="w-10 h-10 rounded-xl bg-[#5B1924] text-[#FDFBF7] flex items-center justify-center mb-4 font-semibold text-sm">
              01
            </div>
            <h4 className="font-editorial text-xl font-medium text-[#1C1817] mb-2">Digital Wardrobe</h4>
            <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
              Organize shirts, trousers, jackets, and accessories into structured categories with tags for color, season, and formality.
            </p>
          </div>

          <div className="bg-[#FDFBF7]/80 p-6 rounded-2xl border border-[#E6DFD3]">
            <div className="w-10 h-10 rounded-xl bg-[#5B1924] text-[#FDFBF7] flex items-center justify-center mb-4 font-semibold text-sm">
              02
            </div>
            <h4 className="font-editorial text-xl font-medium text-[#1C1817] mb-2">Intelligent Styling</h4>
            <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
              Curate outfits automatically based on occasion, weather, layer combinations, and aesthetic harmony.
            </p>
          </div>

          <div className="bg-[#FDFBF7]/80 p-6 rounded-2xl border border-[#E6DFD3]">
            <div className="w-10 h-10 rounded-xl bg-[#5B1924] text-[#FDFBF7] flex items-center justify-center mb-4 font-semibold text-sm">
              03
            </div>
            <h4 className="font-editorial text-xl font-medium text-[#1C1817] mb-2">Sustainable Curation</h4>
            <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
              Rediscover garments you forgot you owned, eliminate unworn clutter, and shop far more intentionally.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
