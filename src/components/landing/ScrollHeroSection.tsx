import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Armoire3DScene } from './Armoire3DScene';

interface ScrollHeroSectionProps {
  onOpenApp: () => void;
}

export const ScrollHeroSection: React.FC<ScrollHeroSectionProps> = ({ onOpenApp }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleMotionChange);

    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalScrollableHeight = rect.height - window.innerHeight;

      if (totalScrollableHeight <= 0) return;

      // Calculate progress from 0.0 to 1.0 through the sticky container
      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollableHeight));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effective progress (static open state if reduced motion)
  const effectiveProgress = prefersReducedMotion ? 0.75 : scrollProgress;

  // Typography opacity fades out as armoire takes center stage (progress 0.35 -> 0.75)
  const textOpacity = Math.max(0, Math.min(1, 1 - (effectiveProgress - 0.25) * 2.5));

  return (
    <div ref={containerRef} className="relative h-[240vh] bg-[#FDFBF7]">
      {/* Sticky Viewport Frame (Occupies ~75vh, centered) */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-center">
        {/* Subtle Background Glow */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[#F2ECE1] blur-3xl -z-10" />
        </div>

        {/* 3D Canvas Background/Overlay Layer */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <Armoire3DScene scrollProgress={effectiveProgress} />
        </div>

        {/* Hero Content Grid Layer */}
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full relative z-20 pointer-events-none">
          <div
            className="max-w-2xl space-y-6 sm:space-y-7 transition-opacity duration-300 pointer-events-auto"
            style={{ opacity: textOpacity }}
          >
            {/* 1. Eyebrow Tag */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-[#F2ECE1] text-[#5B1924] border border-[#E6DFD3]">
                <Sparkles className="w-3.5 h-3.5 text-[#5B1924]" />
                Smart Digital Wardrobe
              </span>
              <span className="text-xs font-medium tracking-widest uppercase text-[#8C8379]">
                • Personal Styling Platform
              </span>
            </div>

            {/* 2. Large Stacked Wordmark: Closet (DM Sans) / Brain (Italianno Cursive) */}
            <div className="select-none tracking-tight leading-none space-y-0">
              <h1 className="font-editorial text-7xl sm:text-9xl md:text-[9.5rem] lg:text-[11rem] font-bold tracking-tight leading-[0.88] text-[#1C1817] block">
                Closet
              </h1>
              <h1 className="font-cursive text-8xl sm:text-[10.5rem] md:text-[11rem] lg:text-[12.5rem] font-normal tracking-normal leading-[0.82] text-[#5B1924] block -mt-2 lg:-mt-4 pl-1">
                Brain
              </h1>
            </div>

            {/* 3. Short Positioning Statement */}
            <p className="text-lg sm:text-xl text-[#5E564E] font-normal leading-relaxed tracking-tight max-w-xl pt-1">
              The intelligent digital wardrobe and personal styling platform. Streamline your collection, eliminate morning decision fatigue, and curate <span className="font-cursive text-[1.35em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">effortless</span> outfits from clothes you already own.
            </p>

            {/* 4. Primary & Secondary CTAs */}
            <div className="pt-2 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={onOpenApp}
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#5B1924] text-[#FDFBF7] text-base font-medium hover:bg-[#48131C] active:scale-[0.98] transition-all shadow-md cursor-pointer group"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-[#F2ECE1] text-[#1C1817] text-base font-medium border border-[#E6DFD3] hover:border-[#5B1924]/30 hover:bg-[#E8E0CE] transition-all cursor-pointer"
                >
                  <span>How It Works</span>
                </a>
              </div>

              {/* 5. Supporting Information */}
              <p className="text-xs text-[#8C8379] tracking-wide pt-1">
                No extra hardware • Smart wardrobe indexing • Effortless daily looks
              </p>
            </div>
          </div>
        </div>

        {/* Scroll Cue Indicator at bottom of initial hero view */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 transition-opacity duration-300 pointer-events-none"
          style={{ opacity: scrollProgress < 0.15 ? 1 : 0 }}
        >
          <span className="text-[10px] uppercase tracking-widest text-[#8C8379]">Scroll to Open</span>
          <div className="w-5 h-8 rounded-full border border-[#D8CEBD] flex justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-[#5B1924] animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
};
