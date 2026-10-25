import React from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

interface LandingNavbarProps {
  onOpenApp: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onOpenApp }) => {
  return (
    <header className="sticky top-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#E6DFD3] transition-all">
      <div className="max-w-7xl mx-auto px-8 sm:px-12 md:px-16 lg:px-24 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-[#5B1924] flex items-center justify-center text-[#FDFBF7] shadow-sm group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-editorial text-2xl font-semibold tracking-tight text-[#1C1817]">
            ClosetBrain
          </span>
        </a>

        {/* Minimal Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-[#5E564E]">
          <a
            href="#what-is"
            className="hover:text-[#5B1924] transition-colors"
          >
            What is ClosetBrain
          </a>
          <a
            href="#capabilities"
            className="hover:text-[#5B1924] transition-colors"
          >
            Capabilities
          </a>
          <a
            href="#why-use"
            className="hover:text-[#5B1924] transition-colors"
          >
            Why ClosetBrain
          </a>
          <a
            href="#how-it-works"
            className="hover:text-[#5B1924] transition-colors"
          >
            How it Works
          </a>
        </nav>

        {/* Action Button (Deep Burgundy CTA) */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenApp}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#5B1924] text-[#FDFBF7] text-sm font-medium hover:bg-[#48131C] active:scale-[0.98] transition-all shadow-sm cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
