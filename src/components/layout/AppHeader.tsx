import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Menu,
  CloudSun,
  Sparkles,
  Check,
  LogOut,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { AuthUser } from '../landing/AuthPanel';

interface AppHeaderProps {
  user: AuthUser;
  onOpenMobileMenu: () => void;
  onLogout: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  onOpenMobileMenu,
  onLogout,
  searchQuery = '',
  onSearchChange,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const notifications = [
    {
      id: '1',
      title: 'New Autumn Look Curated',
      subtitle: 'Layered cashmere & tailored wool coat',
      time: '12m ago',
      unread: true,
    },
    {
      id: '2',
      title: 'Weather Update for Today',
      subtitle: '24°C in Paris — Lightweight layers recommended',
      time: '1h ago',
      unread: true,
    },
    {
      id: '3',
      title: 'Closet Utilization Report',
      subtitle: '92% of your neutral staples have been styled this month',
      time: 'Yesterday',
      unread: false,
    },
  ];

  return (
    <header className="h-16 md:h-18 sticky top-0 z-20 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#ECE5DA] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile hamburger & Context Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-[#5E564E] hover:text-[#1C1817] hover:bg-[#FAF6EE] rounded-xl border border-[#ECE5DA] transition-colors cursor-pointer"
          aria-label="Open navigation sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF6EE] border border-[#ECE5DA] text-xs text-[#5E564E]">
          <CloudSun size={14} className="text-[#5B1924]" />
          <span className="font-semibold text-[#1C1817]">24°C Paris</span>
          <span className="text-[#8C8379]">• Mild Autumn Day</span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-md mx-2">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8379] pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search wardrobe, garments, occasions..."
            className="w-full bg-[#FFFFFF] border border-[#ECE5DA] focus:border-[#5B1924] rounded-full pl-9 pr-10 py-1.5 sm:py-2 text-xs text-[#1C1817] placeholder-[#8C8379] outline-none transition-all shadow-xs"
          />
          <kbd className="hidden lg:inline-flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8C8379] bg-[#FAF6EE] px-1.5 py-0.5 rounded border border-[#ECE5DA]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Notifications & User Avatar Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Open notifications"
            className="relative p-2 rounded-full text-[#5E564E] hover:text-[#1C1817] hover:bg-[#FAF6EE] border border-[#ECE5DA] transition-colors cursor-pointer"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#5B1924] ring-2 ring-[#FFFFFF]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] border border-[#ECE5DA] rounded-2xl shadow-xl shadow-[#5B1924]/10 p-3 z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#ECE5DA]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1C1817]">
                  <Sparkles size={13} className="text-[#5B1924]" />
                  <span>Wardrobe Notifications</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-[#5B1924] bg-[#5B1924]/10 px-2 py-0.5 rounded-full">
                  2 New
                </span>
              </div>

              <div className="space-y-1.5">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl transition-colors cursor-pointer text-xs ${
                      item.unread ? 'bg-[#FAF6EE] border border-[#ECE5DA]' : 'hover:bg-[#FAF6EE]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1C1817]">
                      <span>{item.title}</span>
                      <span className="text-[10px] text-[#8C8379] font-normal">{item.time}</span>
                    </div>
                    <div className="text-[11px] text-[#5E564E] mt-0.5 leading-snug">
                      {item.subtitle}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 mt-2 border-t border-[#ECE5DA] text-center">
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-semibold text-[#5B1924] hover:underline cursor-pointer"
                >
                  Mark all as read
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar Menu */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-[#ECE5DA] bg-[#FFFFFF] hover:bg-[#FAF6EE] transition-colors cursor-pointer shadow-2xs"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover border border-[#ECE5DA]"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#5B1924] text-[#FDFBF7] font-semibold text-xs flex items-center justify-center">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <span className="hidden sm:inline text-xs font-semibold text-[#1C1817] max-w-[100px] truncate">
              {user.name}
            </span>
            <ChevronDown size={13} className="text-[#8C8379]" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#FFFFFF] border border-[#ECE5DA] rounded-2xl shadow-xl shadow-[#5B1924]/10 p-2 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-2 border-b border-[#ECE5DA] mb-1">
                <p className="text-xs font-bold text-[#1C1817] truncate">{user.name}</p>
                <p className="text-[10px] text-[#8C8379] truncate">{user.email}</p>
              </div>

              <div className="space-y-0.5 text-xs text-[#5E564E]">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#FAF6EE] hover:text-[#1C1817] transition-colors text-left cursor-pointer"
                >
                  <Settings size={14} className="text-[#8C8379]" />
                  <span>Wardrobe Preferences</span>
                </button>
              </div>

              <div className="pt-1 mt-1 border-t border-[#ECE5DA]">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-[#882434] hover:bg-[#FDF2F2] transition-colors font-medium cursor-pointer"
                >
                  <LogOut size={14} className="text-[#882434]" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
