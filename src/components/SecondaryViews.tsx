import React, { useState } from 'react';
import { Shirt, Layers, Calendar, Heart, Sparkles, Settings, Plus, Search, Filter, CheckCircle2 } from 'lucide-react';
import { ClosetCategory, RecentOutfit } from '../data/mockData';

interface ViewProps {
  categories: ClosetCategory[];
  recentOutfits: RecentOutfit[];
  onBackToDashboard: () => void;
}

export const ClosetView: React.FC<ViewProps> = ({ categories }) => {
  const [selectedCat, setSelectedCat] = useState<string>('All');
  const [search, setSearch] = useState('');

  const allGarments = [
    { id: 'g1', name: 'Cashmere Knit Sweater', category: 'Tops', image: '/assets/closet_tops.jpg', wears: 14, color: 'Cream' },
    { id: 'g2', name: 'Oversized Double Trench', category: 'Outerwear', image: '/assets/outfit_today.jpg', wears: 22, color: 'Beige' },
    { id: 'g3', name: 'Japanese Pleated Blazer', category: 'Outerwear', image: '/assets/garment_1.jpg', wears: 18, color: 'Black' },
    { id: 'g4', name: 'Patinated Calfskin Boots', category: 'Shoes', image: '/assets/garment_2.jpg', wears: 34, color: 'Brown' },
    { id: 'g5', name: 'Charcoal Tailored Trousers', category: 'Bottoms', image: '/assets/garment_3.jpg', wears: 29, color: 'Charcoal' },
    { id: 'g6', name: 'Mulberry Silk Ivory Shirt', category: 'Tops', image: '/assets/garment_3.jpg', wears: 11, color: 'Ivory' }
  ];

  const filtered = allGarments.filter((g) => {
    const matchCat = selectedCat === 'All' || g.category === selectedCat;
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-editorial text-[#23201D]">
            My <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">Closet</span>
          </h2>
          <p className="text-xs text-[#78716C]">100 garments cataloged across 4 categories</p>
        </div>
        <button className="py-2 px-4 bg-[#A65D47] text-white text-xs font-semibold rounded-lg hover:bg-[#964B36] transition-colors flex items-center gap-1.5 cursor-pointer border-0">
          <Plus size={16} /> Add New Garment
        </button>
      </div>

      {/* Filter Chips & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#ECE7DE]">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 font-medium text-xs">
          {['All', 'Tops', 'Bottoms', 'Outerwear', 'Shoes'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-0 ${selectedCat === cat
                ? 'bg-[#A65D47] text-white font-bold'
                : 'bg-[#FBF9F5] text-[#78716C] hover:text-[#23201D]'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E968E]" />
          <input
            type="text"
            placeholder="Filter garments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-48 bg-[#FBF9F5] border border-[#ECE7DE] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#23201D] outline-none"
          />
        </div>
      </div>

      {/* Garments Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {filtered.map((g) => (
          <div key={g.id} className="cb-card p-2.5 group cursor-pointer">
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#F5EFE6] mb-2 border border-[#ECE7DE]">
              <img src={g.image} alt={g.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <span className="text-[10px] text-[#A65D47] font-semibold block">{g.category}</span>
            <h4 className="text-xs font-bold text-[#23201D] truncate">{g.name}</h4>
            <span className="text-[11px] text-[#78716C]">{g.wears} Wears</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const OutfitsView: React.FC<ViewProps> = ({ recentOutfits }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold font-editorial text-[#23201D]">
          Outfit <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">Collections</span>
        </h2>
        <p className="text-xs text-[#78716C]">34 curated outfit formulas</p>
      </div>
      <button className="py-2 px-4 bg-[#A65D47] text-white text-xs font-semibold rounded-lg hover:bg-[#964B36] transition-colors flex items-center gap-1.5 cursor-pointer border-0">
        <Sparkles size={14} /> Generate New Outfit
      </button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {recentOutfits.map((o) => (
        <div key={o.id} className="cb-card p-4 space-y-3">
          <div className="aspect-[16/10] rounded-lg overflow-hidden bg-[#F5EFE6] border border-[#ECE7DE]">
            <img src={o.image} alt={o.occasion} className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#23201D]">{o.occasion} Look</h3>
            <span className="text-xs text-[#A65D47] font-semibold">{o.date}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {o.tags.map((t, idx) => (
              <span key={idx} className="bg-[#FBF9F5] border border-[#ECE7DE] text-[10px] text-[#78716C] px-2 py-0.5 rounded">
                #{t}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const CalendarView: React.FC = () => (
  <div className="cb-card p-8 text-center space-y-4">
    <div className="w-12 h-12 rounded-full bg-[#F5EFE6] text-[#A65D47] flex items-center justify-center mx-auto">
      <Calendar size={24} />
    </div>
    <h2 className="text-xl font-bold font-editorial text-[#23201D]">
      Outfit Calendar <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">Planner</span>
    </h2>
    <p className="text-xs text-[#78716C] max-w-md mx-auto">
      Schedule daily looks in advance based on forecasted weather telemetry and upcoming calendar obligations.
    </p>
    <div className="p-4 bg-[#FBF9F5] border border-[#ECE7DE] rounded-xl text-xs text-[#23201D] font-medium max-w-xs mx-auto">
      📅 Tomorrow (28 Sep): College Casual • 22°C Clear
    </div>
  </div>
);

export const FavoritesView: React.FC = () => (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold font-editorial text-[#23201D]">
      Favorite <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">Outfits</span>
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="cb-card p-4 flex gap-4 items-center">
        <img src="/assets/outfit_today.jpg" className="w-20 h-20 rounded-lg object-cover border border-[#ECE7DE]" />
        <div>
          <span className="text-[10px] text-[#A65D47] font-bold">FAVORITE #01</span>
          <h4 className="font-bold text-sm text-[#23201D]">Warm Oversized Trench & Cashmere</h4>
          <p className="text-xs text-[#78716C]">Worn 8 times • 98% Match Score</p>
        </div>
      </div>
    </div>
  </div>
);

export const StylistView: React.FC = () => (
  <div className="cb-card p-8 space-y-6">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#A65D47] text-white flex items-center justify-center font-bold">
        <Sparkles size={20} />
      </div>
      <div>
        <h2 className="text-xl font-bold font-editorial text-[#23201D]">
          AI Personal Stylist <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">Assistant</span>
        </h2>
        <p className="text-xs text-[#78716C]">Contextual intelligence engine</p>
      </div>
    </div>

    <div className="bg-[#FBF9F5] border border-[#ECE7DE] p-4 rounded-xl space-y-2 text-xs text-[#23201D]">
      <p className="font-semibold text-[#A65D47]">Recommendation Rationale:</p>
      <p className="text-[#78716C]">
        "Based on your preference for neutral tones and the mild 24°C Paris afternoon weather, we combined your cream knit sweater with the structured beige trench for balanced thermal comfort."
      </p>
    </div>
  </div>
);

export const SettingsView: React.FC = () => (
  <div className="cb-card p-6 space-y-6 max-w-xl">
    <h2 className="text-xl font-bold font-editorial text-[#23201D]">
      Account <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">Settings</span>
    </h2>
    <div className="space-y-4 text-xs text-[#23201D]">
      <div>
        <label className="block text-[#78716C] mb-1">User Name:</label>
        <input type="text" defaultValue="Elena Vance" className="w-full bg-[#FBF9F5] border border-[#ECE7DE] p-2.5 rounded-lg outline-none" />
      </div>
      <div>
        <label className="block text-[#78716C] mb-1">Email:</label>
        <input type="email" defaultValue="elena@closetbrain.ai" className="w-full bg-[#FBF9F5] border border-[#ECE7DE] p-2.5 rounded-lg outline-none" />
      </div>
      <div className="pt-2">
        <button className="py-2.5 px-5 bg-[#A65D47] text-white font-semibold rounded-lg hover:bg-[#964B36]">
          Save Changes
        </button>
      </div>
    </div>
  </div>
);
