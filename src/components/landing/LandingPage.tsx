import React, { useState, useEffect, useRef, useCallback } from 'react';
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

type TransitionState =
  | 'idle'
  | 'scrolling_to_hero'
  | 'transitioning_to_auth'
  | 'auth'
  | 'transitioning_to_landing';

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenApp }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // In-page Login/Signup transition state
  const [authProgress, setAuthProgress] = useState(0);
  const [transitionState, setTransitionState] = useState<TransitionState>('idle');

  // Ref tracking to avoid stale closures in event listeners and animation loops
  const transitionStateRef = useRef<TransitionState>('idle');
  transitionStateRef.current = transitionState;

  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Track window scroll progress for hero runway & wardrobe opening
  useEffect(() => {
    const handleScroll = () => {
      // Responsive runway: 0.75 * innerHeight on mobile for easy single-swipe feel; 1.0 on desktop
      const runway = (window.innerWidth < 1024 ? 0.75 : 1.0) * window.innerHeight;
      if (runway > 0) {
        const progress = Math.max(0, Math.min(1, window.scrollY / runway));
        setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // EaseInOut cubic function
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // Step 2 & 3: Run wardrobe leftward animation & synchronized content wipe
  const startAuthTransition = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setTransitionState('transitioning_to_auth');
    document.body.style.overflow = 'hidden';

    // Push history entry so browser back button gracefully returns to landing page
    if (!window.history.state?.closetBrainAuth) {
      window.history.pushState({ closetBrainAuth: true }, '', window.location.href);
    }

    if (prefersReducedMotion) {
      setAuthProgress(1);
      setTransitionState('auth');
      return;
    }

    const duration = 850; // ms
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeInOutCubic(t);

      setAuthProgress(eased);

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        setAuthProgress(1);
        setTransitionState('auth');
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }, [prefersReducedMotion]);

  // Reverse transition back to landing page
  const runReverseTransition = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setTransitionState('transitioning_to_landing');

    if (prefersReducedMotion) {
      setAuthProgress(0);
      setTransitionState('idle');
      document.body.style.overflow = '';
      return;
    }

    const duration = 750; // ms
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - easeInOutCubic(t);

      setAuthProgress(eased);

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        setAuthProgress(0);
        setTransitionState('idle');
        document.body.style.overflow = '';
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }, [prefersReducedMotion]);

  // Handle Close / Return from Auth Panel
  const handleCloseAuth = useCallback(() => {
    if (transitionStateRef.current !== 'auth') return;

    if (window.history.state?.closetBrainAuth) {
      window.history.back();
      // popstate listener handles the actual reverse transition
    } else {
      runReverseTransition();
    }
  }, [runReverseTransition]);

  // Browser Back/Forward navigation integration
  useEffect(() => {
    const handlePopState = () => {
      if (
        transitionStateRef.current === 'auth' ||
        transitionStateRef.current === 'transitioning_to_auth'
      ) {
        runReverseTransition();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [runReverseTransition]);

  // Clean up animation frames and body overflow on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      document.body.style.overflow = '';
    };
  }, []);

  // Step 1: Smoothly return to hero if scrolled down, then begin transition
  const handleGetStarted = useCallback(() => {
    // Prevent repeated CTA clicks from starting overlapping scrolls or animations
    if (transitionStateRef.current !== 'idle') return;

    const currentScrollY = window.scrollY || document.documentElement.scrollTop;

    if (currentScrollY <= 8) {
      // Already at hero position, begin immediately
      startAuthTransition();
    } else {
      // Scrolled below hero: smoothly scroll to top first
      setTransitionState('scrolling_to_hero');

      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });

      if (prefersReducedMotion) {
        startAuthTransition();
        return;
      }

      // Check arrival at hero section before starting wardrobe animation
      let checkInterval: ReturnType<typeof setInterval>;
      let safetyTimeout: ReturnType<typeof setTimeout>;

      const checkIfArrived = () => {
        const y = window.scrollY || document.documentElement.scrollTop;
        if (y <= 3) {
          clearInterval(checkInterval);
          clearTimeout(safetyTimeout);
          window.removeEventListener('scroll', checkIfArrived);

          // Small delay ensuring smooth scroll momentum has settled
          setTimeout(() => {
            startAuthTransition();
          }, 80);
        }
      };

      window.addEventListener('scroll', checkIfArrived, { passive: true });
      checkInterval = setInterval(checkIfArrived, 40);

      // Safety fallback timeout
      safetyTimeout = setTimeout(() => {
        clearInterval(checkInterval);
        window.removeEventListener('scroll', checkIfArrived);
        window.scrollTo(0, 0);
        startAuthTransition();
      }, 1400);
    }
  }, [prefersReducedMotion, startAuthTransition]);

  // In-closet content smoothly fades in as doorway opens, without jarring scale jumps or white gaps
  const contentOpacity = prefersReducedMotion
    ? 1.0
    : scrollProgress < 0.20
      ? 0
      : Math.min(1, (scrollProgress - 0.20) / 0.55);

  // Smoothly blend background into WhatIsSection's Mocha Cream as portal doors open
  const bgT = Math.max(0, Math.min(1, (scrollProgress - 0.25) / 0.50));
  const pageBg = bgT > 0
    ? `rgb(${Math.round(253 - 11 * bgT)}, ${Math.round(251 - 15 * bgT)}, ${Math.round(247 - 22 * bgT)})`
    : '#FDFBF7';

  return (
    <div
      className="min-h-screen text-[#1C1817] font-sans antialiased selection:bg-[#5B1924] selection:text-[#FDFBF7] relative overflow-x-hidden transition-colors duration-150"
      style={{ backgroundColor: pageBg }}
    >
      {/* 1. Header / Navbar */}
      <LandingNavbar onOpenApp={handleGetStarted} />

      {/* 3D Inside-the-Wardrobe Canvas Layer: persistent vertical walnut side stiles at left/right edges, top/bottom open */}
      <div className="fixed inset-0 pointer-events-none z-35 overflow-hidden select-none">
        <Cupboard3D
          scrollProgress={scrollProgress}
          authProgress={authProgress}
          prefersReducedMotion={prefersReducedMotion}
          className="w-full h-full"
        />
      </div>

      {/* Main Sections */}
      <main>
        {/* 2. Hero Section with synchronized typography, runway, wipe effect and auth panel */}
        <HeroSection
          onOpenApp={onOpenApp}
          onGetStarted={handleGetStarted}
          scrollProgress={scrollProgress}
          authProgress={authProgress}
          onCloseAuth={handleCloseAuth}
        />

        {/* 3. In-Closet Content World: full-width backgrounds, cleanly contained inside frame */}
        <div
          id="in-closet-world"
          className="relative z-20 w-full overflow-hidden"
          style={{
            opacity: scrollProgress < 1.0 ? contentOpacity : 1.0,
            transition: prefersReducedMotion ? 'none' : 'opacity 0.15s ease-out',
            display: authProgress > 0.05 ? 'none' : undefined
          }}
        >
          {/* What is ClosetBrain? */}
          <WhatIsSection />

          {/* What it can do */}
          <CapabilitiesSection />

          {/* Why use it? */}
          <WhySection />

          {/* How it works */}
          <HowItWorksSection onOpenApp={handleGetStarted} />

          {/* Final CTA */}
          <FinalCtaSection onOpenApp={handleGetStarted} />
        </div>
      </main>

      {/* 4. Independent Footer: outside the wardrobe frame */}
      <div style={{ display: authProgress > 0.05 ? 'none' : undefined }}>
        <LandingFooter onOpenApp={handleGetStarted} />
      </div>
    </div>
  );
};
