import React, { useState } from 'react';
import { AppSidebar, DashboardNavTab } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { AuthUser } from '../landing/AuthPanel';

interface AppLayoutProps {
  user: AuthUser;
  onLogout: () => void;
  activeTab?: DashboardNavTab;
  onSelectTab?: (tab: DashboardNavTab) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  user,
  onLogout,
  activeTab = 'dashboard',
  onSelectTab = () => {},
  searchQuery = '',
  onSearchChange,
  children,
}) => {
  // Read collapsed state from localStorage if available
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('closetbrain_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('closetbrain_sidebar_collapsed', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1C1817] flex font-sans antialiased selection:bg-[#5B1924] selection:text-[#FDFBF7]">
      {/* Persistent Sidebar */}
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        user={user}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onLogout={onLogout}
      />

      {/* Main Content Viewport */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
          collapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Top Header */}
        <AppHeader
          user={user}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onLogout={onLogout}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />

        {/* Page Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
};
