import React from 'react';
import { Brain, Sparkles, RefreshCw, Clock } from 'lucide-react';

export const WhySection: React.FC = () => {
  const reasons = [
    {
      icon: Brain,
      title: 'Reduce Decision Fatigue',
      desc: 'Never waste precious morning energy standing indecisively in front of a cluttered closet. Wake up to curated recommendations ready for your day.'
    },
    {
      icon: Sparkles,
      title: 'Discover New Combinations',
      desc: 'Uncover unexpected, stylish outfit pairings hiding in plain sight within your existing clothes. Experience a fresh wardrobe without spending more.'
    },
    {
      icon: RefreshCw,
      title: 'Make Better Use of Existing Clothes',
      desc: 'Maximize the utility of garments you already own, lower your cost-per-wear, and embrace a far more conscious, sustainable approach to fashion.'
    },
    {
      icon: Clock,
      title: 'Save Time',
      desc: 'Get dressed in seconds with zero trial-and-error mirror changes. Select your look, step out with confidence, and reclaim your mornings.'
    }
  ];

  return (
    <section id="why-use" className="py-24 md:py-32 bg-[#F2ECE1] border-y border-[#E6DFD3]">
      <div className="max-w-7xl mx-auto px-8 sm:px-12 md:px-16 lg:px-24">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 pb-6 border-b border-[#E6DFD3]">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#5B1924] mb-2 block">
              03 — Benefits
            </span>
            <h2 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-normal text-[#1C1817]">
              Why use ClosetBrain?
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#5E564E] max-w-md mt-4 md:mt-0 leading-relaxed">
            Elevate your daily routine, unlock hidden closet value, and eliminate morning stress forever.
          </p>
        </div>

        {/* 4 Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {reasons.map((reason, index) => (
            <div
              key={reason.title}
              className="bg-[#FDFBF7] p-8 sm:p-10 rounded-3xl border border-[#E6DFD3] hover:border-[#5B1924]/30 hover:shadow-sm transition-all flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#F2ECE1] text-[#5B1924] flex items-center justify-center border border-[#E6DFD3]">
                    <reason.icon className="w-6 h-6" />
                  </div>
                  <span className="font-editorial text-3xl font-light text-[#5B1924]">
                    0{index + 1}
                  </span>
                </div>

                <h3 className="font-editorial text-2xl sm:text-3xl font-medium text-[#1C1817]">
                  {reason.title}
                </h3>

                <p className="text-[#5E564E] leading-relaxed text-sm sm:text-base">
                  {reason.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E6DFD3] flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5B1924]">
                <span className="w-2 h-2 rounded-full bg-[#5B1924]" />
                <span>Proven Benefit</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
