import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { AuthPanel, AuthUser } from './AuthPanel';

interface HeroSectionProps {
  onOpenApp: () => void;
  onGetStarted?: () => void;
  scrollProgress?: number;
  authProgress?: number;
  onCloseAuth?: () => void;
  onAuthSuccess?: (user: AuthUser) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenApp,
  onGetStarted,
  scrollProgress: externalProgress,
  authProgress = 0,
  onCloseAuth,
  onAuthSuccess,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalProgress, setInternalProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check mobile device size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Typography stays clear and readable initially, then smoothly fades out as wardrobe takes center
  const textOpacity = prefersReducedMotion
    ? Math.max(0, Math.min(1, (0.85 - activeProgress) / 0.50))
    : Math.max(0, Math.min(1, (0.80 - activeProgress) / 0.55));

  // Visual wipe synchronized with horizontal wardrobe movement (right to left)
  const isAuthActive = authProgress > 0;
  const wipeT = Math.min(1, Math.max(0, (authProgress - 0.06) / 0.78));
  const clipRightPercent = wipeT * 100;

  const handleCtaClick = () => {
    if (onGetStarted) {
      onGetStarted();
    } else {
      onOpenApp();
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative overflow-visible"
      style={{ minHeight: isMobile ? '175vh' : '200vh', marginBottom: '-100vh' }}
    >
      {/* Sticky Fullscreen Frame: Offset below fixed navbar so content is never obscured */}
      <div
        className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between pt-20 pb-6 sm:pt-24 sm:pb-8 lg:justify-center lg:py-0"
        style={{
          opacity: (isAuthActive || textOpacity > 0.01) ? 1 : 0,
          pointerEvents: isAuthActive ? 'auto' : (textOpacity < 0.05 ? 'none' : 'auto'),
          zIndex: 30
        }}
      >
        {/* Hero Content Grid Layer */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-14 lg:px-24 w-full relative z-20 pointer-events-none flex flex-col justify-between flex-1 lg:flex-initial">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-center">
            {/* Left Column: Stacked Typography, Positioning Statement & CTAs */}
            <div
              className="lg:col-span-7 space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-7 pointer-events-auto transition-opacity duration-200"
              style={{
                opacity: authProgress >= 0.88 ? 0 : textOpacity,
                transform: prefersReducedMotion ? 'none' : `translateY(${-activeProgress * 30}px)`,
                clipPath: isAuthActive ? `inset(0 ${clipRightPercent}% 0 0)` : undefined,
                WebkitClipPath: isAuthActive ? `inset(0 ${clipRightPercent}% 0 0)` : undefined,
                pointerEvents: (authProgress > 0.08 || textOpacity < 0.05) ? 'none' : 'auto',
                willChange: isAuthActive ? 'clip-path' : 'auto'
              }}
            >
              {/* 1. Category Eyebrow: Elegantly split across lines on mobile */}
              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-1.5 xs:gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-[#F2ECE1] text-[#5B1924] border border-[#E6DFD3]">
                  <Sparkles className="w-3.5 h-3.5 text-[#5B1924]" />
                  Smart Digital Wardrobe
                </span>
                <span className="text-xs font-medium tracking-widest uppercase text-[#8C8379] pl-0.5 xs:pl-0">
                  <span className="hidden xs:inline">• </span>Personal Styling Platform
                </span>
              </div>

              {/* 2. Large Bold Wordmark: Closet / Brain - Confident editorial sizing */}
              <div className="select-none tracking-tight leading-none space-y-0 pt-0.5 sm:pt-0">
                <h1 className="font-editorial text-5xl xs:text-6xl sm:text-7xl md:text-8xl lg:text-[11rem] font-normal leading-[0.84] sm:leading-[0.82] text-[#1C1817] block">
                  Closet
                </h1>
                <h1 className="font-editorial italic text-5xl xs:text-6xl sm:text-7xl md:text-8xl lg:text-[11rem] font-normal leading-[0.84] sm:leading-[0.82] text-[#5B1924] block">
                  Brain
                </h1>
              </div>

              {/* 3. Positioning Statement: Multi-line natural flow without line-clamp or shrinking */}
              <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-2xl text-[#5E564E] font-normal leading-relaxed tracking-tight max-w-xl lg:max-w-2xl pt-0.5">
                The intelligent digital wardrobe and personal styling platform. Streamline your collection, eliminate morning decision fatigue, and curate effortless outfits from clothes you already own.
              </p>

              {/* 4. Primary & Secondary CTAs: Balanced side-by-side touch targets */}
              <div className="pt-1 sm:pt-1 space-y-2.5 sm:space-y-3">
                <div className="flex flex-row items-center gap-2.5 sm:gap-4 max-w-md">
                  <button
                    onClick={handleCtaClick}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-2.5 sm:px-8 sm:py-3.5 rounded-full bg-[#5B1924] text-[#FDFBF7] text-xs sm:text-base font-medium hover:bg-[#48131C] active:scale-[0.98] transition-all shadow-md cursor-pointer group whitespace-nowrap"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <a
                    href="#how-it-works"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-2.5 sm:px-7 sm:py-3.5 rounded-full bg-[#F2ECE1] text-[#1C1817] text-xs sm:text-base font-medium border border-[#E6DFD3] hover:border-[#5B1924]/30 hover:bg-[#E8E0CE] transition-all cursor-pointer text-center whitespace-nowrap"
                  >
                    <span>How It Works</span>
                  </a>
                </div>

                {/* 5. Supporting Information: Clean multi-line bullet points */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-[#7A7167] pt-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924]/60 shrink-0" />
                    No extra hardware
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924]/60 shrink-0" />
                    Smart collection indexing
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924]/60 shrink-0" />
                    Effortless daily curation
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Space reserved on desktop so layout matches visually; contains AuthPanel during auth mode */}
            <div className="lg:col-span-5 hidden lg:block pointer-events-auto relative z-40">
              {authProgress > 0 && onCloseAuth && (
                <AuthPanel
                  authProgress={authProgress}
                  onClose={onCloseAuth}
                  onOpenApp={onOpenApp}
                  onAuthSuccess={onAuthSuccess}
                  prefersReducedMotion={prefersReducedMotion}
                />
              )}
            </div>
          </div>

          {/* Reserved vertical space for the 3D wardrobe on mobile & tablet when in landing mode */}
          {authProgress === 0 && (
            <div className="w-full flex-1 min-h-[160px] xs:min-h-[200px] sm:min-h-[240px] pointer-events-none lg:hidden" aria-hidden="true" />
          )}

          {/* Mobile & Tablet Auth Panel */}
          {authProgress > 0 && onCloseAuth && (
            <div className="w-full mt-3 sm:mt-6 pointer-events-auto lg:hidden relative z-40 flex-1 flex items-center justify-center">
              <AuthPanel
                authProgress={authProgress}
                onClose={onCloseAuth}
                onOpenApp={onOpenApp}
                onAuthSuccess={onAuthSuccess}
                prefersReducedMotion={prefersReducedMotion}
                isMobile
              />
            </div>
          )}
        </div>

        {/* Scroll Cue Indicator at bottom of viewport */}
        <div
          className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 transition-opacity duration-300 pointer-events-none"
          style={{ opacity: (activeProgress < 0.12 && authProgress === 0) ? 1 : 0 }}
        >
          <span className="text-[10px] uppercase tracking-widest text-[#8C8379] font-medium">
            Scroll to open
          </span>
          <div className="w-5 h-7 sm:h-8 rounded-full border border-[#D8CEBD] flex justify-center p-1 bg-[#FDFBF7]/60 backdrop-blur-xs">
            <div className={`w-1 h-2 rounded-full bg-[#5B1924] ${prefersReducedMotion ? '' : 'animate-bounce'}`} />
          </div>
        </div>
      </div>
    </section>
  );
};
