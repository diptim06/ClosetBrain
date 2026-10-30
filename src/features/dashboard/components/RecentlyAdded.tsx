import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';

interface GarmentItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  dateAdded: string;
  image: string;
  color: string;
}

interface RecentlyAddedProps {
  onViewCloset?: () => void;
  onAddItem?: () => void;
}

export const RecentlyAdded: React.FC<RecentlyAddedProps> = ({
  onViewCloset,
  onAddItem,
}) => {
  const recentItems: GarmentItem[] = [
    {
      id: 'garment-1',
      name: 'Structured Wool Coat',
      category: 'Outerwear',
      brand: 'The Row',
      dateAdded: '2 days ago',
      image:
        'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&q=80&w=400',
      color: '#4B4B52',
    },
    {
      id: 'garment-2',
      name: 'Silk Georgette Blouse',
      category: 'Tops',
      brand: 'Lemaire',
      dateAdded: '4 days ago',
      image:
        'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&q=80&w=400',
      color: '#F4EFE6',
    },
    {
      id: 'garment-3',
      name: 'Pleated Straight Trousers',
      category: 'Bottoms',
      brand: 'Acne Studios',
      dateAdded: '5 days ago',
      image:
        'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&q=80&w=400',
      color: '#343231',
    },
    {
      id: 'garment-4',
      name: 'Brushed Cashmere Scarf',
      category: 'Accessories',
      brand: 'Toteme',
      dateAdded: '6 days ago',
      image:
        'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&q=80&w=400',
      color: '#C8A97E',
    },
  ];

  return (
    <section aria-labelledby="recently-added-heading" className="space-y-3.5">
      {/* Section Header with Refined Editorial Contrast */}
      <div className="flex items-center justify-between pb-1 border-b border-[#F2ECE1]">
        <div className="flex items-center gap-2">
          <h2
            id="recently-added-heading"
            className="text-xs font-semibold tracking-wider uppercase text-[#8C8379]"
          >
            Recently Added to Capsule
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-[#5B1924]" />
        </div>

        <button
          type="button"
          onClick={onViewCloset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B1924] hover:text-[#48131C] transition-colors cursor-pointer group"
        >
          <span>View Complete Closet (100 pieces)</span>
          <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Horizontal Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {recentItems.map((item) => (
          <div
            key={item.id}
            onClick={onViewCloset}
            className="bg-[#FFFFFF] border border-[#ECE5DA] hover:border-[#5B1924]/35 rounded-2xl overflow-hidden p-3 shadow-xs hover:shadow-md transition-all duration-300 group cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Photo Thumbnail */}
              <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-[#F2ECE1] mb-3">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  loading="lazy"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#FFFFFF]/90 backdrop-blur-xs text-[10px] font-semibold text-[#5B1924] border border-[#ECE5DA] shadow-xs">
                  {item.category}
                </span>
              </div>

              {/* Garment Title & Designer */}
              <h3 className="text-xs font-bold text-[#1C1817] truncate leading-tight group-hover:text-[#5B1924] transition-colors">
                {item.name}
              </h3>
              <p className="text-[11px] text-[#5E564E] font-editorial italic mt-0.5">
                {item.brand}
              </p>
            </div>

            {/* Bottom Meta */}
            <div className="pt-2 mt-2.5 border-t border-[#F2ECE1] flex items-center justify-between text-[10px] text-[#8C8379]">
              <span>Added {item.dateAdded}</span>
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                style={{ backgroundColor: item.color }}
                title="Color tone"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
