import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  Shirt,
  Layers,
  Calendar,
  Heart,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  X
} from 'lucide-react';
import { UserProfile } from '../data/mockData';

export type NavTab = 'dashboard' | 'closet' | 'outfits' | 'calendar' | 'favorites' | 'stylist' | 'settings';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user: UserProfile;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  activeTab,
  onSelectTab,
  user,
  mobileOpen,
  onCloseMobile
}) => {
  // Sync state with localStorage
  useEffect(() => {
    localStorage.setItem('closetbrain_sidebar_collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'closet' as NavTab, label: 'My Closet', icon: Shirt },
    { id: 'outfits' as NavTab, label: 'Outfits', icon: Layers },
    { id: 'calendar' as NavTab, label: 'Calendar', icon: Calendar },
    { id: 'favorites' as NavTab, label: 'Favorites', icon: Heart }
  ];

  const aiItems = [
    { id: 'stylist' as NavTab, label: 'AI Stylist', icon: Sparkles, badge: 'V2.4' }
  ];

  const bottomItems = [
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings }
  ];

  const renderNavList = (items: typeof navItems) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const IconComponent = item.icon;
        const isActive = activeTab === item.id;
        return (
          <li key={item.id}>
            <button
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer border-0 ${isActive
                  ? 'bg-[#F3EDE2] text-[#A65D47] font-semibold'
                  : 'text-[#78716C] hover:bg-[#F7F4EE] hover:text-[#23201D]'
                }`}
            >
              <IconComponent size={19} className={isActive ? 'text-[#A65D47]' : 'text-[#78716C]'} />

              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}

              {!collapsed && 'badge' in item && (
                <span className="text-[10px] font-bold bg-[#A65D47]/10 text-[#A65D47] px-1.5 py-0.5 rounded">
                  {(item as { badge?: string }).badge}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between bg-[#FFFFFF] border-r border-[#ECE7DE] transition-all duration-300 z-30 fixed top-0 bottom-0 left-0 ${collapsed ? 'w-16' : 'w-60'
          }`}
      >
        {/* Top Header & Logo */}
        <div>
          <div className="h-16 flex items-center justify-between px-4 border-b border-[#ECE7DE]">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onSelectTab('dashboard'); }}
              className="flex items-center gap-3 overflow-hidden text-decoration-none"
            >
              <div className="w-9 h-9 rounded-lg bg-[#A65D47] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                CB
              </div>

              {!collapsed && (
                <span className="font-editorial text-xl font-bold tracking-tight text-[#23201D]">
                  ClosetBrain
                </span>
              )}
            </a>

            {/* Collapse Toggle Button */}
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-md text-[#78716C] hover:bg-[#F5EFE6] hover:text-[#23201D] transition-colors cursor-pointer border-0"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-3 space-y-6">
            <div>
              {!collapsed && (
                <div className="text-[11px] font-semibold text-[#9E968E] uppercase tracking-wider px-3.5 mb-2">
                  Wardrobe
                </div>
              )}
              {renderNavList(navItems)}
            </div>

            <div className="pt-2 border-t border-[#ECE7DE]">
              {!collapsed && (
                <div className="text-[11px] font-semibold text-[#9E968E] uppercase tracking-wider px-3.5 mb-2">
                  Intelligence
                </div>
              )}
              {renderNavList(aiItems)}
            </div>
          </div>
        </div>

        {/* Bottom Section: Settings & User Profile */}
        <div className="p-3 border-t border-[#ECE7DE] space-y-3">
          {renderNavList(bottomItems)}

          <div
            className={`flex items-center gap-3 p-2 rounded-lg bg-[#FBF9F5] border border-[#ECE7DE] ${collapsed ? 'justify-center' : ''
              }`}
          >
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border border-[#D8D1C5] shrink-0"
            />
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-[#23201D] truncate">{user.name}</div>
                <div className="text-[11px] text-[#78716C] truncate">{user.email}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#23201D]/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          ></div>

          <div className="relative w-64 bg-[#FFFFFF] h-full flex flex-col justify-between p-4 z-10 border-r border-[#ECE7DE]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#ECE7DE]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#A65D47] text-white flex items-center justify-center font-bold text-sm">
                    CB
                  </div>
                  <span className="font-editorial text-lg font-bold text-[#23201D]">
                    ClosetBrain
                  </span>
                </div>
                <button onClick={onCloseMobile} className="p-1 text-[#78716C]">
                  <X size={20} />
                </button>
              </div>

              <div className="mt-4 space-y-6">
                <div>
                  <div className="text-[11px] font-semibold text-[#9E968E] uppercase tracking-wider px-3 mb-2">
                    Wardrobe
                  </div>
                  {renderNavList(navItems)}
                </div>

                <div className="pt-2 border-t border-[#ECE7DE]">
                  <div className="text-[11px] font-semibold text-[#9E968E] uppercase tracking-wider px-3 mb-2">
                    Intelligence
                  </div>
                  {renderNavList(aiItems)}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#ECE7DE] space-y-3">
              {renderNavList(bottomItems)}
              <div className="flex items-center gap-3 p-2 rounded-lg bg-[#FBF9F5] border border-[#ECE7DE]">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border border-[#D8D1C5]"
                />
                <div>
                  <div className="text-xs font-bold text-[#23201D]">{user.name}</div>
                  <div className="text-[11px] text-[#78716C]">{user.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
