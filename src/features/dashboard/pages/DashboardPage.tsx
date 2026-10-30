import React, { useState } from 'react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { DashboardNavTab } from '../../../components/layout/AppSidebar';
import { WelcomeHero } from '../components/WelcomeHero';
import { WardrobeOverview } from '../components/WardrobeOverview';
import { TodayOutfit } from '../components/TodayOutfit';
import { MannequinPreview } from '../components/MannequinPreview';
import { RecentlyAdded } from '../components/RecentlyAdded';
import { UpcomingOutfits } from '../components/UpcomingOutfits';
import { StyleInsights } from '../components/StyleInsights';
import {
  ClosetView,
  OutfitsView,
  CalendarView,
  FavoritesView,
  StylistView,
  SettingsView,
} from '../../../components/SecondaryViews';
import {
  MOCK_CATEGORIES,
  MOCK_RECENT_OUTFITS,
  MOCK_TODAY_OUTFIT,
  MOCK_STATS,
  MOCK_STYLE_INSIGHTS,
} from '../../../data/mockData';
import { AuthUser } from '../../../components/landing/AuthPanel';

interface DashboardPageProps {
  user: AuthUser;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<DashboardNavTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle section transitions
  const handleOpenStudio = () => setActiveTab('studio');
  const handleOpenPlanner = () => setActiveTab('planner');
  const handleViewCloset = () => setActiveTab('closet');
  const handleViewOutfits = () => setActiveTab('lookbook');

  return (
    <AppLayout
      user={user}
      onLogout={onLogout}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      {/* 1. Main Dashboard View */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
          {/* Welcome Hero */}
          <WelcomeHero
            user={user}
            onGenerateOutfit={handleOpenStudio}
            onOpenPlanner={handleOpenPlanner}
          />

          {/* Wardrobe Overview Compact Metrics */}
          <WardrobeOverview
            stats={MOCK_STATS}
            onViewCloset={handleViewCloset}
            onViewOutfits={handleViewOutfits}
            onViewPlanner={handleOpenPlanner}
          />

          {/* Primary Focal Section: Today's Outfit + 3D Mannequin Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-8">
              <TodayOutfit
                data={MOCK_TODAY_OUTFIT}
                onOpenStudio={handleOpenStudio}
              />
            </div>
            <div className="lg:col-span-4">
              <MannequinPreview onOpenStudio={handleOpenStudio} />
            </div>
          </div>

          {/* Recently Added Wardrobe Gallery */}
          <RecentlyAdded
            onViewCloset={handleViewCloset}
            onAddItem={handleViewCloset}
          />

          {/* Secondary Grid: Upcoming Outfits & Style Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-6">
              <UpcomingOutfits onOpenPlanner={handleOpenPlanner} />
            </div>
            <div className="lg:col-span-6">
              <StyleInsights
                data={MOCK_STYLE_INSIGHTS}
                onViewAllInsights={() => setActiveTab('insights')}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. My Closet View */}
      {activeTab === 'closet' && (
        <div className="animate-in fade-in duration-200">
          <ClosetView
            categories={MOCK_CATEGORIES}
            recentOutfits={MOCK_RECENT_OUTFITS}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        </div>
      )}

      {/* 3. Lookbook View */}
      {activeTab === 'lookbook' && (
        <div className="animate-in fade-in duration-200">
          <OutfitsView
            categories={MOCK_CATEGORIES}
            recentOutfits={MOCK_RECENT_OUTFITS}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        </div>
      )}

      {/* 4. Outfit Studio View */}
      {activeTab === 'studio' && (
        <div className="animate-in fade-in duration-200">
          <StylistView />
        </div>
      )}

      {/* 5. Planner View */}
      {activeTab === 'planner' && (
        <div className="animate-in fade-in duration-200">
          <CalendarView />
        </div>
      )}

      {/* 6. Style Insights View */}
      {activeTab === 'insights' && (
        <div className="animate-in fade-in duration-200">
          <FavoritesView />
        </div>
      )}

      {/* 7. Settings & Shopping Assistant */}
      {(activeTab === 'settings' || activeTab === 'shopping') && (
        <div className="animate-in fade-in duration-200">
          <SettingsView />
        </div>
      )}
    </AppLayout>
  );
};

export default DashboardPage;
