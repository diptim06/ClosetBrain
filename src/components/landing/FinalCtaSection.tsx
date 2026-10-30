import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface FinalCtaSectionProps {
  onOpenApp: () => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({ onOpenApp }) => {
  return (
    <section className="py-14 sm:py-20 md:py-32 bg-[#F2ECE1] border-t border-[#E6DFD3]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-14 lg:px-24">
        <div className="bg-[#5B1924] text-[#FDFBF7] rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] p-6 sm:p-10 md:p-16 lg:p-20 relative overflow-hidden shadow-xl">
          {/* Subtle Background Accent Pattern */}
          <div className="absolute top-0 right-0 translate-x-12 -translate-y-12 w-96 h-96 bg-[#FDFBF7]/5 rounded-full blur-2xl pointer-events-none" />

          <div className="max-w-3xl relative z-10 space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider bg-[#FDFBF7]/10 text-[#FDFBF7] border border-[#FDFBF7]/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ready for effortless style?</span>
            </div>

            <h2 className="font-editorial text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[0.98] sm:leading-[0.95] tracking-tight text-[#FDFBF7]">
              Elevate your wardrobe. <span className="font-cursive text-[1.18em] text-[#FAF6EE] font-normal leading-none inline-block px-1 align-baseline">Simplify</span> your mornings.
            </h2>

            <p className="text-sm sm:text-base md:text-xl text-[#FDFBF7]/80 leading-relaxed max-w-xl font-light">
              Experience the clarity of an organized digital wardrobe and intelligent outfit recommendations tailored to your life.
            </p>

            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 max-w-sm sm:max-w-none">
              <button
                onClick={onOpenApp}
                className="inline-flex items-center justify-center gap-2.5 sm:gap-3 px-6 py-3.5 sm:px-9 sm:py-4 rounded-full bg-[#FDFBF7] text-[#5B1924] text-sm sm:text-base font-semibold hover:bg-[#F2ECE1] active:scale-[0.98] transition-all shadow-md cursor-pointer group"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#what-is"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 sm:px-7 sm:py-4 rounded-full border border-[#FDFBF7]/30 text-[#FDFBF7] text-sm sm:text-base font-medium hover:bg-[#FDFBF7]/10 transition-all cursor-pointer text-center"
              >
                <span>Read Overview</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
