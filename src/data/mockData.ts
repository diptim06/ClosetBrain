export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  location: string;
}

export interface TodayOutfitData {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  weather: string;
  occasion: string;
  style: string;
  matchScore: number;
  garments: string[];
}

export interface ClosetCategory {
  id: string;
  name: string;
  itemCount: number;
  image: string;
}

export interface QuickActionItem {
  id: string;
  label: string;
  iconName: 'Plus' | 'Sparkles' | 'Calendar' | 'Heart';
  description: string;
}

export interface RecentOutfit {
  id: string;
  date: string;
  occasion: string;
  image: string;
  itemCount: number;
  tags: string[];
}

export interface ClosetStatsData {
  totalItems: number;
  totalOutfits: number;
  favoritesCount: number;
  recentlyAddedThisWeek: number;
}

export interface StyleInsightsData {
  summary: string;
  topTone: string;
  colorBreakdown: { label: string; percentage: number; color: string }[];
  favoriteBrands: string[];
}

export const MOCK_USER: UserProfile = {
  name: 'Elena',
  email: 'elena@closetbrain.ai',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  location: 'Paris, France'
};

export const MOCK_TODAY_OUTFIT: TodayOutfitData = {
  id: 'today-01',
  title: "Today's Outfit",
  subtitle: 'Based on your style, weather & recent picks',
  image: '/assets/outfit_today.jpg',
  weather: '24°C',
  occasion: 'College',
  style: 'Casual',
  matchScore: 92,
  garments: [
    'Beige Oversized Trench Coat',
    'Cream Cashmere Knit Sweater',
    'Charcoal Tailored Trousers',
    'Tan Leather Chelsea Boots'
  ]
};

export const MOCK_CATEGORIES: ClosetCategory[] = [
  { id: 'cat-tops', name: 'Tops', itemCount: 48, image: '/assets/closet_tops.jpg' },
  { id: 'cat-bottoms', name: 'Bottoms', itemCount: 28, image: '/assets/garment_3.jpg' },
  { id: 'cat-outerwear', name: 'Outerwear', itemCount: 14, image: '/assets/garment_1.jpg' },
  { id: 'cat-shoes', name: 'Shoes', itemCount: 10, image: '/assets/garment_2.jpg' }
];

export const MOCK_QUICK_ACTIONS: QuickActionItem[] = [
  { id: 'act-add', label: 'Add Item', iconName: 'Plus', description: 'Scan or upload new garment' },
  { id: 'act-gen', label: 'Generate Outfit', iconName: 'Sparkles', description: 'AI recommendation engine' },
  { id: 'act-plan', label: 'Plan Look', iconName: 'Calendar', description: 'Schedule upcoming outfits' },
  { id: 'act-fav', label: 'View Favorites', iconName: 'Heart', description: 'Saved go-to combinations' }
];

export const MOCK_RECENT_OUTFITS: RecentOutfit[] = [
  { id: 'outfit-25', date: '25 Sep', occasion: 'College', image: '/assets/outfit_today.jpg', itemCount: 4, tags: ['Neutral', 'Layered'] },
  { id: 'outfit-22', date: '22 Sep', occasion: 'Casual', image: '/assets/garment_3.jpg', itemCount: 3, tags: ['Silk', 'Tailored'] },
  { id: 'outfit-20', date: '20 Sep', occasion: 'Casual', image: '/assets/garment_1.jpg', itemCount: 4, tags: ['Avant-Garde', 'Black'] },
  { id: 'outfit-17', date: '17 Sep', occasion: 'College', image: '/assets/garment_2.jpg', itemCount: 3, tags: ['Footwear Focus'] }
];

export const MOCK_STATS: ClosetStatsData = {
  totalItems: 100,
  totalOutfits: 34,
  favoritesCount: 12,
  recentlyAddedThisWeek: 5
};

export const MOCK_STYLE_INSIGHTS: StyleInsightsData = {
  summary: "You've been leaning toward neutral tones lately.",
  topTone: 'Earth & Warm Ivory',
  colorBreakdown: [
    { label: 'Neutrals', percentage: 60, color: '#A65D47' },
    { label: 'Earth Tones', percentage: 25, color: '#C8A97E' },
    { label: 'Monochrome', percentage: 15, color: '#4B4B52' }
  ],
  favoriteBrands: ['Acne Studios', 'The Row', 'Lemaire']
};
