import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  onOpenApp: () => void;
  scrollProgress?: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenApp, scrollProgress: externalProgress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalProgress, setInternalProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check user preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleMotionChange);
    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, []);

  // Track normal page scroll if external progress is not provided
  useEffect(() => {
    if (externalProgress !== undefined) return;
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalScrollableDistance = rect.height - window.innerHeight;

      if (totalScrollableDistance <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollableDistance));
      setInternalProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [externalProgress]);

  const activeProgress = externalProgress !== undefined ? externalProgress : internalProgress;
  const effectiveProgress = prefersReducedMotion ? 0.8 : activeProgress;

  // Typography opacity fades smoothly as wardrobe glides to center and doors open
  const textOpacity = Math.max(0, Math.min(1, 1 - effectiveProgress * 2.2));

  return (
    <section
      ref={containerRef}
      className="relative overflow-visible"
      style={{ minHeight: '220vh', marginBottom: '-100vh' }}
    >
      {/* Sticky Fullscreen Frame for seamless scroll runway into WhatIsSection */}
      <div
        className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-center"
        style={{
          opacity: textOpacity > 0.01 ? 1 : 0,
          pointerEvents: textOpacity < 0.1 ? 'none' : 'auto',
          zIndex: 20
        }}
      >
        {/* Initial Hero Background: fades as user scrolls and portal transition engages */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 -z-10"
          style={{
            backgroundColor: '#FDFBF7',
            opacity: Math.max(0, 1 - effectiveProgress * 2.2)
          }}
        />

        {/* Hero Content Grid Layer */}
        <div className="max-w-7xl mx-auto px-8 sm:px-12 md:px-16 lg:px-24 w-full relative z-20 pointer-events-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Stacked Typography, Positioning Statement & CTAs */}
            <div
              className="lg:col-span-7 space-y-6 sm:space-y-7 pointer-events-auto transition-opacity duration-200"
              style={{
                opacity: textOpacity,
                transform: `translateY(${-effectiveProgress * 40}px)`,
                pointerEvents: textOpacity < 0.1 ? 'none' : 'auto'
              }}
            >
              {/* 1. Small Eyebrow / Category Text */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-[#F2ECE1] text-[#5B1924] border border-[#E6DFD3]">
                  <Sparkles className="w-3.5 h-3.5 text-[#5B1924]" />
                  Smart Digital Wardrobe
                </span>
                <span className="text-xs font-medium tracking-widest uppercase text-[#8C8379]">
                  • Personal Styling Platform
                </span>
              </div>

              {/* 2. Large Stacked Wordmark: Closet / Brain */}
              <div className="select-none tracking-tight leading-none space-y-0">
                <h1 className="font-editorial text-7xl sm:text-9xl md:text-[9.5rem] lg:text-[11rem] font-normal leading-[0.82] text-[#1C1817] block">
                  Closet
                </h1>
                <h1 className="font-editorial italic text-7xl sm:text-9xl md:text-[9.5rem] lg:text-[11rem] font-normal leading-[0.82] text-[#5B1924] block">
                  Brain
                </h1>
              </div>

              {/* 3. Short Positioning Statement */}
              <p className="text-lg sm:text-xl md:text-2xl text-[#5E564E] font-normal leading-relaxed tracking-tight max-w-2xl pt-2">
                The intelligent digital wardrobe and personal styling platform. Streamline your collection, eliminate morning decision fatigue, and curate effortless outfits from clothes you already own.
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

            {/* Right Column: Space reserved on desktop so layout matches visually */}
            <div className="lg:col-span-5 hidden lg:block pointer-events-none" />
          </div>
        </div>

        {/* Scroll Cue Indicator at bottom of viewport */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 transition-opacity duration-300 pointer-events-none"
          style={{ opacity: effectiveProgress < 0.12 ? 1 : 0 }}
        >
          <span className="text-[10px] uppercase tracking-widest text-[#8C8379] font-medium">
            Scroll to open
          </span>
          <div className="w-5 h-8 rounded-full border border-[#D8CEBD] flex justify-center p-1 bg-[#FDFBF7]/60 backdrop-blur-xs">
            <div className="w-1 h-2 rounded-full bg-[#5B1924] animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  );
};
