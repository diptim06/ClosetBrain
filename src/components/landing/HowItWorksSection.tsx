import React from 'react';
import { Plus, Cpu, Sparkles, ArrowRight } from 'lucide-react';

interface HowItWorksSectionProps {
  onOpenApp: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onOpenApp }) => {
  const steps = [
    {
      num: '01',
      action: 'ADD',
      title: 'Digitally Capture',
      desc: 'Snap quick photos or upload images of your garments. Organize your shirts, trousers, outerwear, shoes, and accessories into a clean digital repository.',
      icon: Plus,
      badge: 'Step 1'
    },
    {
      num: '02',
      action: 'UNDERSTAND',
      title: 'Index & Analyze',
      desc: 'ClosetBrain automatically indexes each garment — cataloging color relationships, formality levels, seasonal appropriateness, and layering compatibility.',
      icon: Cpu,
      badge: 'Step 2'
    },
    {
      num: '03',
      action: 'STYLE',
      title: 'Receive & Wear',
      desc: 'Get curated outfit formulas crafted automatically for your day. Save favorites, plan your week, and step out feeling confident and refined.',
      icon: Sparkles,
      badge: 'Step 3'
    }
  ];

  return (
    <section id="how-it-works" className="py-14 sm:py-20 md:py-32 bg-[#FDFBF7]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-14 lg:px-24">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-16 pb-4 sm:pb-6 border-b border-[#E6DFD3]">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#5B1924] mb-2 block">
              04 — Workflow
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-[#1C1817]">
              How it <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">works</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#5E564E] max-w-md mt-3 md:mt-0 leading-relaxed">
            A seamless three-stage process designed to bring harmony and clarity to your wardrobe.
          </p>
        </div>

        {/* 3 Step Horizontal Sequence Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
          {steps.map((step, idx) => (
            <div
              key={step.action}
              className="bg-[#F2ECE1] p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-[#E6DFD3] hover:border-[#5B1924]/30 transition-all flex flex-col justify-between space-y-6 sm:space-y-8 relative group"
            >
              <div className="space-y-5 sm:space-y-6">
                {/* Number & Icon Header */}
                <div className="flex items-center justify-between">
                  <span className="inline-block px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider bg-[#FDFBF7] text-[#5B1924] border border-[#E6DFD3]">
                    {step.badge} — {step.action}
                  </span>
                  <span className="font-editorial text-3xl sm:text-4xl font-light text-[#5B1924]">
                    {step.num}
                  </span>
                </div>

                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#FDFBF7] border border-[#E6DFD3] flex items-center justify-center text-[#5B1924] group-hover:scale-105 transition-transform">
                  <step.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-editorial text-xl sm:text-2xl font-medium text-[#1C1817]">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>

              {/* Progress Connector indicator */}
              <div className="pt-4 border-t border-[#E6DFD3] flex items-center justify-between text-xs font-medium text-[#5B1924]">
                <span>Stage {step.num} of 03</span>
                {idx < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-[#5B1924] hidden md:block" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Callout */}
        <div className="mt-12 sm:mt-16 text-center">
          <button
            onClick={onOpenApp}
            className="inline-flex items-center justify-center gap-2.5 sm:gap-3 w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-full bg-[#5B1924] text-[#FDFBF7] text-sm sm:text-base font-medium hover:bg-[#48131C] active:scale-[0.98] transition-all shadow-md cursor-pointer group"
          >
            <span>Experience ClosetBrain Now</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};
