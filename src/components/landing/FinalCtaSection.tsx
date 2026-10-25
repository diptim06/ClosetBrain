import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface FinalCtaSectionProps {
  onOpenApp: () => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({ onOpenApp }) => {
  return (
    <section className="py-24 md:py-32 bg-[#F2ECE1] border-t border-[#E6DFD3]">
      <div className="max-w-7xl mx-auto px-8 sm:px-12 md:px-16 lg:px-24">
        <div className="bg-[#5B1924] text-[#FDFBF7] rounded-[2.5rem] p-10 sm:p-16 md:p-20 relative overflow-hidden shadow-xl">
          {/* Subtle Background Accent Pattern */}
          <div className="absolute top-0 right-0 translate-x-12 -translate-y-12 w-96 h-96 bg-[#FDFBF7]/5 rounded-full blur-2xl pointer-events-none" />

          <div className="max-w-3xl relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#FDFBF7]/10 text-[#FDFBF7] border border-[#FDFBF7]/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ready for effortless style?</span>
            </div>

            <h2 className="font-editorial text-4xl sm:text-6xl md:text-7xl font-normal leading-[0.95] tracking-tight text-[#FDFBF7]">
              Elevate your wardrobe. Simplify your mornings.
            </h2>

            <p className="text-base sm:text-xl text-[#FDFBF7]/80 leading-relaxed max-w-xl font-light">
              Experience the clarity of an organized digital wardrobe and intelligent outfit recommendations tailored to your life.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                onClick={onOpenApp}
                className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-[#FDFBF7] text-[#5B1924] text-base font-semibold hover:bg-[#F2ECE1] active:scale-[0.98] transition-all shadow-md cursor-pointer group"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#what-is"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border border-[#FDFBF7]/30 text-[#FDFBF7] text-base font-medium hover:bg-[#FDFBF7]/10 transition-all cursor-pointer"
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
