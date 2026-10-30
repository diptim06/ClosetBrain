import React from 'react';
import { Sparkles, ArrowRight, Calendar, CloudSun, MapPin, Layers } from 'lucide-react';
import { AuthUser } from '../../../components/landing/AuthPanel';

interface WelcomeHeroProps {
  user: AuthUser;
  onGenerateOutfit?: () => void;
  onOpenPlanner?: () => void;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({
  user,
  onGenerateOutfit,
  onOpenPlanner,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user.name ? user.name.split(' ')[0] : 'Eleanor';

  return (
    <section
      aria-label="Daily Style Capsule"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFFFFF] via-[#FCFAF7] to-[#F6EFE6] border border-[#E8E0D5] p-6 sm:p-8 lg:p-9 shadow-sm"
    >
      {/* Subtle Ambient Light Gradients */}
      <div
        className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#B76E79]/8 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-0 right-1/3 w-64 h-64 rounded-full bg-[#5B1924]/5 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Asymmetric Editorial Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left Column: Editorial Typography & Intentional Actions */}
        <div className="lg:col-span-7 space-y-4">
          {/* Eyebrow with Deep Burgundy and Dusty-Rose accent */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase bg-[#5B1924] text-[#FDFBF7] shadow-xs">
              <Sparkles className="w-3 h-3 text-[#FDFBF7]" />
              <span>Daily Editorial Capsule</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium tracking-wide uppercase bg-[#B76E79]/10 text-[#9A5360] border border-[#B76E79]/20">
              Autumn 2026 • Issue 04
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="font-editorial text-3xl sm:text-4xl lg:text-[44px] text-[#1C1817] font-normal tracking-tight leading-[1.12]">
              {getGreeting()},{' '}
              <span className="font-cursive text-4xl sm:text-5xl lg:text-[54px] text-[#5B1924] font-normal ml-1 inline-block -rotate-1">
                {firstName}
              </span>
              .
            </h1>
            <p className="font-editorial text-lg sm:text-xl text-[#5B1924] italic font-normal">
              A balanced autumn edit for{' '}
              <span className="font-cursive text-2xl sm:text-3xl text-[#5B1924] font-normal not-italic inline-block">
                effortless
              </span>{' '}
              neutral layering.
            </p>
          </div>

          {/* Narrative description */}
          <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed max-w-xl font-normal">
            Paris is 24°C, mild and clear. Today&apos;s wardrobe intelligence highlights a fluid
            cotton gabardine trench paired with breathable Mongolian cashmere—crafted for comfortable
            day-to-evening versatility.
          </p>

          {/* Context chips */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-[#5E564E]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF6EE] border border-[#ECE5DA]">
              <CloudSun size={13} className="text-[#5B1924]" />
              <span className="font-medium text-[#1C1817]">24°C Paris</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF6EE] border border-[#ECE5DA]">
              <MapPin size={13} className="text-[#5B1924]" />
              <span>Campus & Studio</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF6EE] border border-[#ECE5DA]">
              <Layers size={13} className="text-[#5B1924]" />
              <span>4 Curated Variations</span>
            </span>
          </div>

          {/* Primary & Secondary Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onGenerateOutfit}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#5B1924] hover:bg-[#48131C] text-[#FDFBF7] text-xs sm:text-sm font-semibold tracking-wide active:scale-[0.98] transition-all shadow-md shadow-[#5B1924]/15 cursor-pointer group"
            >
              <span>Explore Today&apos;s Look</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onOpenPlanner}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#FFFFFF] hover:bg-[#FAF6EE] text-[#1C1817] text-xs sm:text-sm font-medium border border-[#ECE5DA] hover:border-[#D8CEBD] active:scale-[0.98] transition-all shadow-xs cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#8C8379]" />
              <span>Plan Week Ahead</span>
            </button>
          </div>
        </div>

        {/* Right Column: Editorial Visual Showcase Vignette (eliminates empty space) */}
        <div className="lg:col-span-5">
          <div className="relative rounded-2xl overflow-hidden bg-[#FFFFFF] border border-[#E8E0D5] shadow-lg shadow-black/5 group">
            {/* Fashion Imagery */}
            <div className="relative aspect-[4/3] sm:aspect-[16/11] w-full overflow-hidden bg-[#F2ECE1]">
              <img
                src="/assets/outfit_today.jpg"
                alt="Today's featured autumn outfit composition"
                className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1817]/75 via-[#1C1817]/10 to-transparent pointer-events-none" />

              {/* Top Editorial Floating Badge */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-[#1C1817]/80 backdrop-blur-md text-[10px] uppercase font-bold tracking-wider text-[#FDFBF7] border border-white/10">
                  Capsule 04
                </span>
                <span className="px-2.5 py-1 rounded-md bg-[#5B1924] text-[10px] font-bold text-[#FDFBF7] shadow-sm">
                  94% Style Match
                </span>
              </div>

              {/* Bottom Caption Overlay */}
              <div className="absolute bottom-3 left-3 right-3 text-[#FDFBF7] space-y-1">
                <div className="text-xs uppercase tracking-widest text-[#B76E79] font-semibold">
                  Featured Recommendation
                </div>
                <div className="font-editorial text-lg font-medium leading-snug">
                  The Structured Trench & Cashmere
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#FAF6EE]/80 pt-0.5">
                  <span>Cotton Gabardine</span>
                  <span>•</span>
                  <span>Mongolian Cashmere</span>
                  <span>•</span>
                  <span>Virgin Wool</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
