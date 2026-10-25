import React, { useState, useEffect } from 'react';
import { LandingNavbar } from './LandingNavbar';
import { HeroSection } from './HeroSection';
import { Cupboard3D } from './Cupboard3D';
import { WhatIsSection } from './WhatIsSection';
import { CapabilitiesSection } from './CapabilitiesSection';
import { WhySection } from './WhySection';
import { HowItWorksSection } from './HowItWorksSection';
import { FinalCtaSection } from './FinalCtaSection';
import { LandingFooter } from './LandingFooter';

interface LandingPageProps {
  onOpenApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenApp }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [frameExitOpacity, setFrameExitOpacity] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      // 1.2 * innerHeight matches the HeroSection scroll runway
      const runway = window.innerHeight * 1.2;
      if (runway > 0) {
        const progress = Math.max(0, Math.min(1, window.scrollY / runway));
        setScrollProgress(progress);
      }

      // Exit transition: fade out frame as user approaches the independent footer
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const distanceToBottom = scrollHeight - (window.scrollY + clientHeight);
      // Smoothly fade out over the last 300px before bottom
      const exitProgress = Math.max(0, Math.min(1, (300 - distanceToBottom) / 240));
      setFrameExitOpacity(1 - exitProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Webpage entry zoom transition into the closet frame (progress 0.28 to 1.0)
  const entryProgress = Math.max(0, Math.min(1, (scrollProgress - 0.28) / 0.72));
  const easedEntry = entryProgress * entryProgress * (3 - 2 * entryProgress);
  const contentScale = 0.92 + 0.08 * easedEntry;
  const contentTranslateY = (1 - easedEntry) * 16;
  const contentOpacity = scrollProgress < 0.20 ? 0 : Math.min(1, entryProgress * 2.2);

  // Smoothly blend background into WhatIsSection's Mocha Cream as portal doors open
  const bgT = Math.max(0, Math.min(1, (scrollProgress - 0.35) / 0.45));
  const pageBg = bgT > 0
    ? `rgb(${Math.round(253 - 11 * bgT)}, ${Math.round(251 - 15 * bgT)}, ${Math.round(247 - 22 * bgT)})`
    : '#FDFBF7';

  return (
    <div
      className="min-h-screen text-[#1C1817] font-sans antialiased selection:bg-[#5B1924] selection:text-[#FDFBF7] relative overflow-x-hidden transition-colors duration-150"
      style={{ backgroundColor: pageBg }}
    >
      {/* 1. Header / Navbar */}
      <LandingNavbar onOpenApp={onOpenApp} />

      {/* Persistent 3D Wardrobe Frame Layer: fixed to viewport, framing in-closet sections */}
      <div
        className="fixed inset-0 pointer-events-none z-30 overflow-hidden transition-opacity duration-150"
        style={{ opacity: frameExitOpacity }}
      >
        <Cupboard3D scrollProgress={scrollProgress} className="w-full h-full" />

        {/* Subtle architectural frame depth: restrained bevel highlight and soft ambient shadow along inner border */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            opacity: Math.max(0, Math.min(1, (scrollProgress - 0.35) / 0.45)),
            boxShadow: 'inset 24px 0 28px -14px rgba(28, 24, 23, 0.22), inset -24px 0 28px -14px rgba(28, 24, 23, 0.22)',
            borderLeft: '1px solid rgba(216, 185, 150, 0.14)',
            borderRight: '1px solid rgba(216, 185, 150, 0.14)'
          }}
        />
      </div>

      {/* Main Sections */}
      <main>
        {/* 2. Hero Section with synchronized typography and runway */}
        <HeroSection onOpenApp={onOpenApp} scrollProgress={scrollProgress} />

        {/* 3. In-Closet Content World: full-width backgrounds to eliminate white strip, zooming into doorway during entry */}
        <div
          id="in-closet-world"
          className="relative z-10 w-full overflow-hidden"
          style={{
            transform: scrollProgress < 1.0
              ? `scale(${contentScale}) translateY(${contentTranslateY}px)`
              : undefined,
            transformOrigin: 'top center',
            opacity: scrollProgress < 1.0 ? contentOpacity : 1.0,
            transition: 'transform 0.05s ease-out, opacity 0.05s ease-out'
          }}
        >
          {/* What is ClosetBrain? */}
          <WhatIsSection />

          {/* What it can do */}
          <CapabilitiesSection />

          {/* Why use it? */}
          <WhySection />

          {/* How it works */}
          <HowItWorksSection onOpenApp={onOpenApp} />

          {/* Final CTA */}
          <FinalCtaSection onOpenApp={onOpenApp} />
        </div>
      </main>

      {/* 4. Independent Footer: outside the wardrobe frame */}
      <LandingFooter onOpenApp={onOpenApp} />
    </div>
  );
};
