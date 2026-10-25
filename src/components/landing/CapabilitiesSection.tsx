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
    <section id="capabilities" className="py-24 md:py-32 bg-[#FDFBF7]">
      <div className="max-w-7xl mx-auto px-8 sm:px-12 md:px-16 lg:px-24">
        {/* Section Title Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 pb-6 border-b border-[#E6DFD3]">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-[#5B1924] mb-2 block">
              02 — Capabilities
            </span>
            <h2 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-normal text-[#1C1817]">
              What it can do
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#5E564E] max-w-md mt-4 md:mt-0 leading-relaxed">
            From smart cataloging to automated daily styling, ClosetBrain transforms how you curate and wear clothing.
          </p>
        </div>

        {/* Capabilities Grid (Top 3, Bottom 2 centered/full) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {capabilities.slice(0, 3).map((item) => (
            <div
              key={item.num}
              className="bg-[#F2ECE1] p-8 rounded-3xl border border-[#E6DFD3] hover:border-[#5B1924]/30 hover:shadow-md transition-all flex flex-col justify-between space-y-6 group"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#FDFBF7] border border-[#E6DFD3] flex items-center justify-center text-[#5B1924] group-hover:scale-105 transition-transform">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="font-editorial text-2xl font-light text-[#5B1924]">
                    {item.num}
                  </span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5B1924] block mb-1">
                  {item.subtitle}
                </span>
                <h3 className="font-editorial text-2xl font-medium text-[#1C1817] mb-3">
                  {item.title}
                </h3>
                <p className="text-sm text-[#5E564E] leading-relaxed">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {capabilities.slice(3, 5).map((item) => (
            <div
              key={item.num}
              className="bg-[#F2ECE1] p-8 rounded-3xl border border-[#E6DFD3] hover:border-[#5B1924]/30 hover:shadow-md transition-all flex flex-col justify-between space-y-6 group"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#FDFBF7] border border-[#E6DFD3] flex items-center justify-center text-[#5B1924] group-hover:scale-105 transition-transform">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="font-editorial text-2xl font-light text-[#5B1924]">
                    {item.num}
                  </span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5B1924] block mb-1">
                  {item.subtitle}
                </span>
                <h3 className="font-editorial text-2xl font-medium text-[#1C1817] mb-3">
                  {item.title}
                </h3>
                <p className="text-sm text-[#5E564E] leading-relaxed">
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
