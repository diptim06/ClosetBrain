import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/landing/LandingPage';
import { AuthUser } from './components/landing/AuthPanel';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { TodayOutfit } from './components/TodayOutfit';
import { ClosetOverview } from './components/ClosetOverview';
import { QuickActions } from './components/QuickActions';
import { RecentOutfits } from './components/RecentOutfits';
import { ClosetStats } from './components/ClosetStats';
import { StyleInsights } from './components/StyleInsights';
import {
  ClosetView,
  OutfitsView,
  CalendarView,
  FavoritesView,
  StylistView,
  SettingsView
} from './components/SecondaryViews';
import {
  MOCK_USER,
  UserProfile,
  MOCK_TODAY_OUTFIT,
  MOCK_CATEGORIES,
  MOCK_QUICK_ACTIONS,
  MOCK_RECENT_OUTFITS,
  MOCK_STATS,
  MOCK_STYLE_INSIGHTS
} from './data/mockData';
import { ArrowLeft } from 'lucide-react';

export const App: React.FC = () => {
  // Mode state: 'landing' by default for the first landing page version of ClosetBrain
  const [mode, setMode] = useState<'landing' | 'app'>('landing');
  const [user, setUser] = useState<AuthUser | null>(null);

  // Restore authenticated session from MongoDB Atlas cookie on startup
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.user) {
            setUser(data.user);
            setMode('app');
          }
        }
      } catch (err) {
        // Silent catch for initial unauthenticated/offline state
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle successful login or signup from AuthPanel
  const handleAuthSuccess = (authenticatedUser: AuthUser) => {
    setUser(authenticatedUser);
    setMode('app');
  };

  // Handle real server logout and cookie destruction
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout request error:', err);
    } finally {
      setUser(null);
      setMode('landing');
    }
  };

  // Read collapsed state from localStorage if available
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('closetbrain_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => !prev);
  };

  // Format active profile for UI components (using real authenticated profile or preview fallback)
  const displayUserProfile: UserProfile = user
    ? {
        name: user.name,
        email: user.email,
        avatar: MOCK_USER.avatar,
        location: MOCK_USER.location,
      }
    : MOCK_USER;

  if (mode === 'landing') {
    return (
      <LandingPage
        onOpenApp={() => setMode('app')}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1817] flex font-sans">
      {/* Collapsible Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        user={displayUserProfile}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area - Resizes dynamically with sidebar on desktop */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
          collapsed ? 'md:ml-16' : 'md:ml-60'
        }`}
      >
        {/* Navigation Banner back to Landing Page */}
        <div className="bg-[#F2ECE1] border-b border-[#E6DFD3] px-6 py-2.5 flex items-center justify-between text-xs text-[#5E564E]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#5B1924]">
              {user ? `Logged in as ${user.name}` : 'ClosetBrain Live App Preview'}
            </span>
            {user && (
              <span className="text-[#8C8379] hidden sm:inline">({user.email})</span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6DFD3] text-[#1C1817] hover:bg-[#DCD4C6] transition-all cursor-pointer font-medium"
              >
                <span>Log Out</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode('landing')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5B1924] text-[#FDFBF7] text-xs font-medium hover:bg-[#48131C] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Landing Page</span>
            </button>
          </div>
        </div>

        {/* Top Header */}
        <Header
          user={displayUserProfile}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Main Dashboard Canvas Body */}
        <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* TAB 1: MAIN DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              {/* Row 1: Today's Outfit + Your Closet */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-7">
                  <TodayOutfit data={MOCK_TODAY_OUTFIT} />
                </div>
                <div className="lg:col-span-5">
                  <ClosetOverview
                    categories={MOCK_CATEGORIES}
                    onViewAll={() => setActiveTab('closet')}
                    onSelectCategory={() => setActiveTab('closet')}
                  />
                </div>
              </div>

              {/* Row 2: Quick Actions */}
              <div>
                <QuickActions
                  actions={MOCK_QUICK_ACTIONS}
                  onTriggerAction={(id) => {
                    if (id === 'act-gen') setActiveTab('stylist');
                    if (id === 'act-plan') setActiveTab('calendar');
                    if (id === 'act-fav') setActiveTab('favorites');
                  }}
                />
              </div>

              {/* Row 3: Recent Outfits + Closet Stats & Style Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7">
                  <RecentOutfits
                    outfits={MOCK_RECENT_OUTFITS}
                    onViewAll={() => setActiveTab('outfits')}
                  />
                </div>

                <div className="lg:col-span-5 space-y-6">
                  <ClosetStats stats={MOCK_STATS} />
                  <StyleInsights data={MOCK_STYLE_INSIGHTS} />
                </div>
              </div>
            </>
          )}

          {/* TAB 2: MY CLOSET */}
          {activeTab === 'closet' && (
            <ClosetView
              categories={MOCK_CATEGORIES}
              recentOutfits={MOCK_RECENT_OUTFITS}
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {/* TAB 3: OUTFITS */}
          {activeTab === 'outfits' && (
            <OutfitsView
              categories={MOCK_CATEGORIES}
              recentOutfits={MOCK_RECENT_OUTFITS}
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}

          {/* TAB 4: CALENDAR */}
          {activeTab === 'calendar' && <CalendarView />}

          {/* TAB 5: FAVORITES */}
          {activeTab === 'favorites' && <FavoritesView />}

          {/* TAB 6: AI STYLIST */}
          {activeTab === 'stylist' && <StylistView />}

          {/* TAB 7: SETTINGS */}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export default App;

