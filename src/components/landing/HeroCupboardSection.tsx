import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface HeroCupboardSectionProps {
  onOpenApp: () => void;
}

export const HeroCupboardSection: React.FC<HeroCupboardSectionProps> = ({ onOpenApp }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate scroll progress through the hero section (0.0 to 1.0)
      // Starts at top of page (progress 0) and completes as hero scrolls up (progress 1)
      const totalDist = rect.height - windowHeight * 0.3;
      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalDist));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Door opening progress (starts opening after scroll reaches 0.2, fully open by 0.95)
  const doorProgress = Math.max(0, Math.min(1, (scrollProgress - 0.2) / 0.75));
  // Door angle in degrees (0 = closed, ~95 = fully open)
  const doorAngle = doorProgress * 98;

  // Horizontal position shift (from right column position to centered position)
  // At progress 0: positioned in right 1/4
  // At progress > 0.5: perfectly centered
  const centerShiftProgress = Math.min(1, scrollProgress * 2.0);

  // Cupboard width expansion (from 320px in hero column to full-width ~1050px)
  const cupboardWidth = 320 + scrollProgress * 730;

  return (
    <section ref={sectionRef} className="relative bg-[#FDFBF7] pt-8 pb-20 overflow-hidden">
      {/* Subtle Warm Background Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[#F2ECE1] blur-3xl -z-10" />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
        {/* Main Hero Layout Grid: Left ~3/4 Text & Right ~1/4 Cupboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[70vh]">
          {/* LEFT ~3/4 COLUMN: Stacked Typography, Eyebrow, Statement & CTAs */}
          <div
            className="lg:col-span-8 space-y-6 sm:space-y-7 z-10 transition-opacity duration-300"
            style={{ opacity: Math.max(0, 1 - scrollProgress * 1.5) }}
          >
            {/* 1. Small Eyebrow Text */}
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
            <p className="text-lg sm:text-xl text-[#5E564E] font-normal leading-relaxed tracking-tight max-w-xl pt-1">
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

          {/* RIGHT ~1/4 COLUMN: Antique Cupboard (Straight-on Front View) */}
          <div className="lg:col-span-4 flex justify-center lg:justify-end z-20">
            {/* Scroll-driven Cupboard Container */}
            <div
              className="relative transition-all duration-75 ease-out"
              style={{
                width: `${cupboardWidth}px`,
                maxWidth: '92vw',
                transform: `translateX(${-centerShiftProgress * 32}vw)`,
              }}
            >
              {/* Cupboard Frame (Aspect ratio ~ 1.5, matching 682x1024 reference) */}
              <div
                className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-[#1A0E08] border border-[#3D2316]"
                style={{ aspectRatio: '682 / 1024' }}
              >
                {/* COMPLETELY EMPTY INTERIOR: Dark rich antique wood backing */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#1C100A] via-[#24150D] to-[#180E08] flex flex-col justify-between p-6">
                  {/* Subtle empty interior shadow & depth lines */}
                  <div className="w-full h-full border border-[#331C11]/40 rounded-lg bg-[#20120B]/60 shadow-inner" />
                </div>

                {/* DOORS CONTAINER (3D Perspective for door hinge rotation only) */}
                <div
                  className="absolute inset-0 z-10 flex"
                  style={{ perspective: '1400px' }}
                >
                  {/* LEFT DOOR */}
                  <div
                    className="w-1/2 h-full relative"
                    style={{
                      transformOrigin: 'left center',
                      transform: `rotateY(${-doorAngle}deg)`,
                      transition: 'transform 0.05s linear',
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    <img
                      src="/assets/armoire_front.jpg"
                      alt="Antique Armoire Left Door"
                      className="w-[200%] h-full max-w-none object-cover object-left"
                    />
                    {/* Inner door shadow tint */}
                    <div
                      className="absolute inset-0 bg-black/20 pointer-events-none"
                      style={{ opacity: doorProgress }}
                    />
                  </div>

                  {/* RIGHT DOOR */}
                  <div
                    className="w-1/2 h-full relative"
                    style={{
                      transformOrigin: 'right center',
                      transform: `rotateY(${doorAngle}deg)`,
                      transition: 'transform 0.05s linear',
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    <img
                      src="/assets/armoire_front.jpg"
                      alt="Antique Armoire Right Door"
                      className="w-[200%] h-full max-w-none object-cover object-right ml-[-100%]"
                    />
                    {/* Inner door shadow tint */}
                    <div
                      className="absolute inset-0 bg-black/20 pointer-events-none"
                      style={{ opacity: doorProgress }}
                    />
                  </div>
                </div>

                {/* Soft Ground Contact Shadow */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-4/5 h-8 bg-black/40 blur-lg rounded-full pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
