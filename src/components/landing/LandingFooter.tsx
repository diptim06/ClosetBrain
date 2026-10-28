import React from 'react';
import { Sparkles } from 'lucide-react';

interface LandingFooterProps {
  onOpenApp: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onOpenApp }) => {
  return (
    <footer className="relative z-20 w-full bg-[#FDFBF7] border-t border-[#E6DFD3] py-12 sm:py-16 text-[#5E564E]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-14 lg:px-24">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 sm:pb-12 border-b border-[#E6DFD3]">
          {/* Logo & Tagline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#5B1924] flex items-center justify-center text-[#FDFBF7]">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-editorial text-xl sm:text-2xl font-semibold text-[#1C1817]">
                ClosetBrain
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#8C8379] max-w-sm">
              Smart digital wardrobe and personal styling platform. Unlock effortless style every day.
            </p>
          </div>

          {/* Minimal Links */}
          <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-8 text-xs sm:text-sm font-medium text-[#5E564E]">
            <a href="#what-is" className="hover:text-[#5B1924] transition-colors">
              What is ClosetBrain
            </a>
            <a href="#capabilities" className="hover:text-[#5B1924] transition-colors">
              Capabilities
            </a>
            <a href="#why-use" className="hover:text-[#5B1924] transition-colors">
              Why ClosetBrain
            </a>
            <a href="#how-it-works" className="hover:text-[#5B1924] transition-colors">
              How It Works
            </a>
            <button
              onClick={onOpenApp}
              className="text-[#5B1924] font-semibold hover:underline cursor-pointer"
            >
              Launch App
            </button>
          </div>
        </div>

        {/* Minimal Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8C8379]">
          <p>© {new Date().getFullYear()} ClosetBrain. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Edition 01</span>
            <span className="w-1 h-1 rounded-full bg-[#5B1924]" />
            <span>Digital Wardrobe Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
