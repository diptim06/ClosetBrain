import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

interface LandingNavbarProps {
  onOpenApp: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onOpenApp }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [isCtaHovered, setIsCtaHovered] = useState(false);

  // Check user preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Calculate actual document scroll progress (0.0 to 1.0)
  useEffect(() => {
    let ticking = false;

    const calculateScrollProgress = () => {
      const docElement = document.documentElement;
      const body = document.body;
      const scrollTop = window.scrollY || docElement.scrollTop || body.scrollTop || 0;
      const scrollHeight = (docElement.scrollHeight || body.scrollHeight) - window.innerHeight;

      if (scrollHeight <= 0) {
        setScrollProgress(0);
      } else {
        const p = Math.max(0, Math.min(1, scrollTop / scrollHeight));
        setScrollProgress(p);
      }
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(calculateScrollProgress);
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    calculateScrollProgress();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // Percentage from 0 to 100
  const progressPercent = scrollProgress * 100;
  const clipInsetRight = Math.max(0, Math.min(100, 100 - progressPercent));

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 w-full select-none">
      {/* 1. Base Unfilled Layer: warm ivory background with original dark/burgundy styling */}
      <div className="relative w-full bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#E6DFD3]">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-8 lg:px-24 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-2 group">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#5B1924] flex items-center justify-center text-[#FDFBF7] shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="font-editorial text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight text-[#1C1817]">
              ClosetBrain
            </span>
          </a>

          {/* Minimal Navigation Links */}
          <nav className="hidden md:flex items-center space-x-3 md:space-x-4 lg:space-x-8 text-xs lg:text-sm font-medium">
            <a
              href="#what-is"
              onMouseEnter={() => setHoveredNav('what-is')}
              onMouseLeave={() => setHoveredNav(null)}
              className={`transition-colors whitespace-nowrap ${
                hoveredNav === 'what-is' ? 'text-[#5B1924]' : 'text-[#5E564E]'
              }`}
            >
              <span className="lg:hidden">Overview</span>
              <span className="hidden lg:inline">What is ClosetBrain</span>
            </a>
            <a
              href="#capabilities"
              onMouseEnter={() => setHoveredNav('capabilities')}
              onMouseLeave={() => setHoveredNav(null)}
              className={`transition-colors whitespace-nowrap ${
                hoveredNav === 'capabilities' ? 'text-[#5B1924]' : 'text-[#5E564E]'
              }`}
            >
              Capabilities
            </a>
            <a
              href="#why-use"
              onMouseEnter={() => setHoveredNav('why-use')}
              onMouseLeave={() => setHoveredNav(null)}
              className={`transition-colors whitespace-nowrap ${
                hoveredNav === 'why-use' ? 'text-[#5B1924]' : 'text-[#5E564E]'
              }`}
            >
              <span className="lg:hidden">Why Us</span>
              <span className="hidden lg:inline">Why ClosetBrain</span>
            </a>
            <a
              href="#how-it-works"
              onMouseEnter={() => setHoveredNav('how-it-works')}
              onMouseLeave={() => setHoveredNav(null)}
              className={`transition-colors whitespace-nowrap ${
                hoveredNav === 'how-it-works' ? 'text-[#5B1924]' : 'text-[#5E564E]'
              }`}
            >
              How it Works
            </a>
          </nav>

          {/* Action Button (Deep Burgundy CTA) */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenApp}
              onMouseEnter={() => setIsCtaHovered(true)}
              onMouseLeave={() => setIsCtaHovered(false)}
              className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 rounded-full text-xs lg:text-sm font-medium transition-all shadow-sm cursor-pointer whitespace-nowrap ${
                isCtaHovered
                  ? 'bg-[#48131C] text-[#FDFBF7] scale-[1.02]'
                  : 'bg-[#5B1924] text-[#FDFBF7]'
              }`}
            >
              <span>Get Started</span>
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Overlay Filled Layer: deep burgundy background with pure white typography, clipped to scroll progress */}
      <div
        className="absolute inset-0 pointer-events-none w-full bg-[#5B1924] border-b border-[#4A141D]"
        style={{
          clipPath: `inset(0 ${clipInsetRight}% 0 0)`,
          WebkitClipPath: `inset(0 ${clipInsetRight}% 0 0)`,
          willChange: prefersReducedMotion ? 'auto' : 'clip-path'
        }}
        aria-hidden="true"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-8 lg:px-24 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo in Inverted Palette */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FDFBF7] flex items-center justify-center text-[#5B1924] shadow-sm">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="font-editorial text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight text-[#FFFFFF]">
              ClosetBrain
            </span>
          </div>

          {/* Minimal Navigation Links in Pure White */}
          <div className="hidden md:flex items-center space-x-3 md:space-x-4 lg:space-x-8 text-xs lg:text-sm font-medium">
            <span
              className={`whitespace-nowrap transition-colors ${
                hoveredNav === 'what-is' ? 'text-white underline underline-offset-4' : 'text-white'
              }`}
            >
              <span className="lg:hidden">Overview</span>
              <span className="hidden lg:inline">What is ClosetBrain</span>
            </span>
            <span
              className={`whitespace-nowrap transition-colors ${
                hoveredNav === 'capabilities' ? 'text-white underline underline-offset-4' : 'text-white'
              }`}
            >
              Capabilities
            </span>
            <span
              className={`whitespace-nowrap transition-colors ${
                hoveredNav === 'why-use' ? 'text-white underline underline-offset-4' : 'text-white'
              }`}
            >
              <span className="lg:hidden">Why Us</span>
              <span className="hidden lg:inline">Why ClosetBrain</span>
            </span>
            <span
              className={`whitespace-nowrap transition-colors ${
                hoveredNav === 'how-it-works' ? 'text-white underline underline-offset-4' : 'text-white'
              }`}
            >
              How it Works
            </span>
          </div>

          {/* Action Button (Inverted White Pill on Burgundy) */}
          <div className="flex items-center gap-3">
            <div
              className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 rounded-full text-xs lg:text-sm font-medium transition-all shadow-sm whitespace-nowrap ${
                isCtaHovered
                  ? 'bg-[#FDFBF7] text-[#5B1924] shadow-md scale-[1.02]'
                  : 'bg-[#FFFFFF] text-[#5B1924]'
              }`}
            >
              <span>Get Started</span>
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
    {/* Structural layout spacer preserving exact document flow */}
    <div className="h-16 sm:h-20 w-full pointer-events-none" aria-hidden="true" />
  </>
);
};
