import React from 'react';
import {
  LayoutDashboard,
  Shirt,
  Sparkles,
  BookOpen,
  Calendar,
  Compass,
  ShoppingBag,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { AuthUser } from '../landing/AuthPanel';

export type DashboardNavTab =
  | 'dashboard'
  | 'closet'
  | 'studio'
  | 'lookbook'
  | 'planner'
  | 'insights'
  | 'shopping'
  | 'settings';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: DashboardNavTab;
  onSelectTab: (tab: DashboardNavTab) => void;
  user: AuthUser;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

interface NavItem {
  id: DashboardNavTab;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string;
  section: 'main' | 'curation' | 'account';
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  activeTab,
  onSelectTab,
  user,
  mobileOpen,
  onCloseMobile,
  onLogout,
}) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
    { id: 'closet', label: 'My Closet', icon: Shirt, badge: '100', section: 'main' },
    { id: 'studio', label: 'Outfit Studio', icon: Sparkles, badge: 'AI', section: 'curation' },
    { id: 'lookbook', label: 'Lookbook', icon: BookOpen, section: 'curation' },
    { id: 'planner', label: 'Planner', icon: Calendar, section: 'curation' },
    { id: 'insights', label: 'Style Insights', icon: Compass, section: 'curation' },
    { id: 'shopping', label: 'Shopping Assistant', icon: ShoppingBag, section: 'account' },
    { id: 'settings', label: 'Settings', icon: Settings, section: 'account' },
  ];

  const renderNavSection = (sectionKey: 'main' | 'curation' | 'account', sectionTitle?: string) => {
    const items = navItems.filter((item) => item.section === sectionKey);
    return (
      <div className="space-y-1">
        {sectionTitle && !collapsed && (
          <div className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase text-[#8C8379]">
            {sectionTitle}
          </div>
        )}
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all relative group cursor-pointer ${
                isActive
                  ? 'bg-[#5B1924] text-[#FFFFFF] font-semibold shadow-sm shadow-[#5B1924]/15'
                  : 'text-[#5E564E] hover:text-[#1C1817] hover:bg-[#FAF6EE]'
              } ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon
                size={17}
                className={`shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-[#FFFFFF]' : 'text-[#8C8379] group-hover:text-[#1C1817]'
                }`}
              />

              {!collapsed && (
                <div className="flex-1 flex items-center justify-between text-left min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-[#FFFFFF]/20 text-[#FFFFFF]'
                          : item.badge === 'AI'
                          ? 'bg-[#5B1924] text-[#FDFBF7]'
                          : 'bg-[#ECE5DA] text-[#5E564E]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-3.5 sm:p-4 select-none">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-[#ECE5DA]">
          <a
            href="/"
            className={`flex items-center gap-2.5 group cursor-pointer ${
              collapsed ? 'justify-center w-full' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[#5B1924] flex items-center justify-center text-[#FDFBF7] shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-[#FDFBF7]" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-editorial text-lg font-bold tracking-tight text-[#1C1817] leading-none">
                  ClosetBrain
                </span>
                <span className="text-[10px] tracking-widest uppercase text-[#8C8379] mt-0.5">
                  Smart Wardrobe
                </span>
              </div>
            )}
          </a>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex p-1.5 rounded-lg text-[#8C8379] hover:text-[#1C1817] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="md:hidden p-1.5 rounded-lg text-[#8C8379] hover:text-[#1C1817] hover:bg-[#FAF6EE] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="mt-4 space-y-4">
          {renderNavSection('main')}
          <div className="pt-2 border-t border-[#ECE5DA]/80">
            {renderNavSection('curation', 'Wardrobe Curation')}
          </div>
          <div className="pt-2 border-t border-[#ECE5DA]/80">
            {renderNavSection('account', 'Preferences')}
          </div>
        </div>
      </div>

      {/* Footer Profile & Logout Card */}
      <div className="pt-3 border-t border-[#ECE5DA] space-y-2">
        <a
          href="/"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] text-[#8C8379] hover:text-[#5B1924] hover:bg-[#FAF6EE] transition-colors ${
            collapsed ? 'justify-center px-1' : ''
          }`}
          title="Visit landing page"
        >
          <ArrowUpRight size={13} className="shrink-0" />
          {!collapsed && <span>View Editorial Landing</span>}
        </a>

        <div
          className={`p-2 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] flex items-center gap-2.5 transition-all ${
            collapsed ? 'justify-center p-1.5' : ''
          }`}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border border-[#ECE5DA] shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#5B1924] text-[#FDFBF7] font-semibold text-xs flex items-center justify-center shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#1C1817] truncate leading-tight">
                {user.name}
              </div>
              <div className="text-[10px] text-[#8C8379] truncate">{user.email}</div>
            </div>
          )}

          {!collapsed && (
            <button
              type="button"
              onClick={onLogout}
              aria-label="Log out"
              title="Log out of ClosetBrain"
              className="p-1.5 text-[#8C8379] hover:text-[#5B1924] hover:bg-[#F2ECE1] rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:block fixed top-0 bottom-0 left-0 bg-[#FFFFFF] border-r border-[#ECE5DA] transition-all duration-300 z-30 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#1C1817]/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] bg-[#FFFFFF] h-full shadow-2xl z-10 border-r border-[#ECE5DA]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
