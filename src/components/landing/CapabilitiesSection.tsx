import React from 'react';
import { Shirt, Sparkles, SlidersHorizontal, Calendar, PieChart } from 'lucide-react';

export const CapabilitiesSection: React.FC = () => {
  const capabilities = [
    {
      icon: Shirt,
      num: '01',
      title: 'Digital Wardrobe',
      subtitle: 'Catalog & Organize',
      desc: 'Digitize your entire clothing collection. Tag items by color, season, formality, brand, and material for instant visual search and filtering.'
    },
    {
      icon: Sparkles,
      num: '02',
      title: 'Outfit Generation',
      subtitle: 'Instant Combinations',
      desc: 'Generate complete, stylish outfits tailored to daily weather conditions, dress codes, and your personal style rules in one click.'
    },
    {
      icon: SlidersHorizontal,
      num: '03',
      title: 'Smart Styling',
      subtitle: 'Harmony & Proportion',
      desc: 'Intelligent style recommendations that balance color palettes, silhouette proportions, and layering for a refined aesthetic.'
    },
    {
      icon: Calendar,
      num: '04',
      title: 'Outfit Planning',
      subtitle: 'Calendar & Travel',
      desc: 'Schedule outfits ahead of time for important meetings, weekend getaways, or entire work weeks with intuitive calendar management.'
    },
    {
      icon: PieChart,
      num: '05',
      title: 'Wardrobe Insights',
      subtitle: 'Analytics & Value',
      desc: 'Understand your wearing habits with wear-frequency statistics, cost-per-wear breakdown, and targeted advice on missing closet essentials.'
    }
  ];

  return (
    <section id="capabilities" className="py-14 sm:py-20 md:py-32 bg-[#FDFBF7]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-14 lg:px-24">
        {/* Section Title Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-16 pb-4 sm:pb-6 border-b border-[#E6DFD3]">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#5B1924] mb-2 block">
              02 — Capabilities
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-[#1C1817]">
              What it can <span className="font-cursive text-[1.22em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">do</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#5E564E] max-w-md mt-3 md:mt-0 leading-relaxed">
            From smart cataloging to automated daily styling, ClosetBrain transforms how you curate and wear clothing.
          </p>
        </div>

        {/* Capabilities Grid (Top 3, Bottom 2 centered/full): 2-columns on tablet, 3-columns on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mb-5 sm:mb-6">
          {capabilities.slice(0, 3).map((item) => (
            <div
              key={item.num}
              className="bg-[#F2ECE1] p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#E6DFD3] hover:border-[#5B1924]/30 hover:shadow-md transition-all flex flex-col justify-between space-y-6 group"
            >
              <div>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#FDFBF7] border border-[#E6DFD3] flex items-center justify-center text-[#5B1924] group-hover:scale-105 transition-transform">
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="font-editorial text-xl sm:text-2xl font-light text-[#5B1924]">
                    {item.num}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#5B1924] block mb-1">
                  {item.subtitle}
                </span>
                <h3 className="font-editorial text-xl sm:text-2xl font-medium text-[#1C1817] mb-2 sm:mb-3">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E6DFD3] flex items-center justify-between text-xs text-[#5B1924] font-medium">
                <span>Core Feature</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924]" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom 2 capabilities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          {capabilities.slice(3, 5).map((item) => (
            <div
              key={item.num}
              className="bg-[#F2ECE1] p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#E6DFD3] hover:border-[#5B1924]/30 hover:shadow-md transition-all flex flex-col justify-between space-y-6 group"
            >
              <div>
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#FDFBF7] border border-[#E6DFD3] flex items-center justify-center text-[#5B1924] group-hover:scale-105 transition-transform">
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="font-editorial text-xl sm:text-2xl font-light text-[#5B1924]">
                    {item.num}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#5B1924] block mb-1">
                  {item.subtitle}
                </span>
                <h3 className="font-editorial text-xl sm:text-2xl font-medium text-[#1C1817] mb-2 sm:mb-3">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#5E564E] leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E6DFD3] flex items-center justify-between text-xs text-[#5B1924] font-medium">
                <span>Core Feature</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
