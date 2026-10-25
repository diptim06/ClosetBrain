import React, { useState } from 'react';
import { Search, Bell, Menu, Sparkles, Check } from 'lucide-react';
import { UserProfile } from '../data/mockData';

interface HeaderProps {
  user: UserProfile;
  onOpenMobileMenu: () => void;
  onSearchChange?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onOpenMobileMenu, onSearchChange }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifications = [
    { id: '1', title: 'New outfit match available', time: '10m ago', unread: true },
    { id: '2', title: '24°C today — Lightweight layers recommended', time: '1h ago', unread: true },
    { id: '3', title: 'Tops collection updated (48 items)', time: 'Yesterday', unread: false }
  ];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  return (
    <header className="h-16 border-b border-[#ECE7DE] bg-[#FFFFFF]/80 backdrop-blur-md sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between gap-4">
      {/* Left Greeting & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-[#78716C] hover:bg-[#F5EFE6] rounded-md border-0 bg-transparent cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#23201D] leading-tight">
            Good morning, {user.name}
          </h1>
          <p className="text-xs text-[#78716C] hidden sm:block">
            Here's what's happening with your closet today.
          </p>
        </div>
      </div>

      {/* Right Search, Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative w-40 sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E968E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search closet..."
            className="w-full bg-[#FBF9F5] border border-[#ECE7DE] focus:border-[#A65D47] rounded-full pl-9 pr-4 py-1.5 text-xs text-[#23201D] outline-none transition-colors"
          />
        </div>

        {/* Notifications Icon Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full hover:bg-[#F5EFE6] text-[#78716C] hover:text-[#23201D] transition-colors relative cursor-pointer border-0 bg-transparent"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#A65D47]"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] border border-[#ECE7DE] rounded-xl shadow-lg p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#ECE7DE] font-semibold text-[#23201D]">
                <span>Notifications</span>
                <span className="text-[10px] text-[#A65D47] bg-[#A65D47]/10 px-2 py-0.5 rounded-full font-bold">
                  2 NEW
                </span>
              </div>
              <ul className="divide-y divide-[#ECE7DE] my-1">
                {notifications.map((n) => (
                  <li key={n.id} className="py-2.5 px-1 flex items-start justify-between gap-2 hover:bg-[#FBF9F5] rounded">
                    <div>
                      <div className={`text-xs ${n.unread ? 'font-semibold text-[#23201D]' : 'text-[#78716C]'}`}>
                        {n.title}
                      </div>
                      <div className="text-[10px] text-[#9E968E]">{n.time}</div>
                    </div>
                    {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#A65D47] mt-1 shrink-0"></span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#ECE7DE]">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover border border-[#D8D1C5]"
          />
        </div>
      </div>
    </header>
  );
};
