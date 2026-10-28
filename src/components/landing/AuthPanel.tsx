import React, { useState, useEffect } from 'react';
import { Sparkles, X, ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { AnimatedBackground } from '@/components/core/animated-background';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

interface AuthPanelProps {
  authProgress: number;
  onClose: () => void;
  onOpenApp?: () => void;
  onAuthSuccess?: (user: AuthUser) => void;
  prefersReducedMotion?: boolean;
  isMobile?: boolean;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  authProgress,
  onClose,
  onOpenApp,
  onAuthSuccess,
  prefersReducedMotion = false,
  isMobile = false,
}) => {
  const [tab, setTab] = useState<'Login' | 'Sign Up'>('Login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle form submission to real backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const endpoint = tab === 'Login' ? '/api/auth/login' : '/api/auth/signup';
      const payload =
        tab === 'Login'
          ? { email: email.trim(), password }
          : { name: name.trim(), email: email.trim(), password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(
          data.error || 'Authentication failed. Please verify your credentials and try again.'
        );
        return;
      }

      // Success
      if (data.user && onAuthSuccess) {
        onAuthSuccess(data.user);
      } else if (onOpenApp) {
        onOpenApp();
      }
    } catch (err) {
      console.error('Authentication request error:', err);
      setErrorMessage(
        'Unable to connect to the authentication server. Please check your network and ensure the backend server is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Smooth entrance interpolation
  const panelT = prefersReducedMotion
    ? authProgress > 0.5 ? 1 : 0
    : Math.min(1, Math.max(0, (authProgress - 0.35) / 0.65));

  const translateX = prefersReducedMotion
    ? 0
    : isMobile
      ? 0
      : (1 - panelT) * 44;

  const translateY = prefersReducedMotion
    ? 0
    : isMobile
      ? (1 - panelT) * 28
      : 0;

  if (authProgress < 0.25) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tab === 'Login' ? 'Log in to ClosetBrain' : 'Sign up for ClosetBrain'}
      className="w-full max-w-md mx-auto transition-all"
      style={{
        opacity: panelT,
        transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
        pointerEvents: panelT > 0.7 ? 'auto' : 'none',
        zIndex: 45,
      }}
    >
      <div className="bg-[#FDFBF7]/95 backdrop-blur-md border border-[#E6DFD3] rounded-3xl p-5 sm:p-7 md:p-8 shadow-2xl shadow-[#5B1924]/10 relative overflow-hidden">
        {/* Subtle decorative top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5B1924]/20 via-[#5B1924] to-[#5B1924]/20" />

        {/* Top Header Row: Category Badge & Return Button */}
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-[#F2ECE1] text-[#5B1924] border border-[#E6DFD3]">
            <Sparkles className="w-3.5 h-3.5 text-[#5B1924]" />
            <span>ClosetBrain Access</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Return to landing page"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5E564E] hover:text-[#1C1817] hover:bg-[#F2ECE1] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Segmented Control with AnimatedBackground */}
        <div className="p-1 bg-[#F2ECE1] rounded-full mb-4 sm:mb-5 border border-[#E6DFD3]/80">
          <AnimatedBackground
            defaultValue="Login"
            value={tab}
            onValueChange={(id) => {
              if (id === 'Login' || id === 'Sign Up') {
                setTab(id);
                setErrorMessage(null);
              }
            }}
            className="rounded-full bg-[#5B1924] shadow-sm"
            transition={{ ease: 'easeInOut', duration: 0.2 }}
          >
            <button
              data-id="Login"
              type="button"
              className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-full text-center transition-colors cursor-pointer active:scale-[0.98] relative z-10 ${
                tab === 'Login'
                  ? 'text-[#FDFBF7]'
                  : 'text-[#5E564E] hover:text-[#1C1817]'
              }`}
            >
              Login
            </button>
            <button
              data-id="Sign Up"
              type="button"
              className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-full text-center transition-colors cursor-pointer active:scale-[0.98] relative z-10 ${
                tab === 'Sign Up'
                  ? 'text-[#FDFBF7]'
                  : 'text-[#5E564E] hover:text-[#1C1817]'
              }`}
            >
              Sign Up
            </button>
          </AnimatedBackground>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-4">
          <h2 className="font-editorial text-xl sm:text-2xl md:text-3xl text-[#1C1817] font-normal leading-tight">
            {tab === 'Login' ? 'Welcome back' : 'Create your wardrobe'}
          </h2>
          <p className="text-xs sm:text-sm text-[#5E564E] mt-0.5 sm:mt-1 leading-relaxed">
            {tab === 'Login'
              ? 'Enter your credentials to access your smart collection.'
              : 'Sign up to begin curating and organizing your collection.'}
          </p>
        </div>

        {/* Inline Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#FDF2F2] border border-[#F2C9CE] text-xs flex items-start gap-2.5 text-[#882434] animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#882434]" />
            <p className="font-medium leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
          {tab === 'Sign Up' && (
            <div>
              <label
                htmlFor="auth-name"
                className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E564E] mb-1"
              >
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                required
                disabled={isLoading}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Eleanor Vance"
                className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl bg-[#FDFBF7] border border-[#E6DFD3] text-sm text-[#1C1817] placeholder-[#8C8379] focus:outline-none focus:border-[#5B1924] focus:ring-1 focus:ring-[#5B1924] transition-all disabled:opacity-60"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E564E] mb-1"
            >
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              disabled={isLoading}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl bg-[#FDFBF7] border border-[#E6DFD3] text-sm text-[#1C1817] placeholder-[#8C8379] focus:outline-none focus:border-[#5B1924] focus:ring-1 focus:ring-[#5B1924] transition-all disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E564E] mb-1"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              disabled={isLoading}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl bg-[#FDFBF7] border border-[#E6DFD3] text-sm text-[#1C1817] placeholder-[#8C8379] focus:outline-none focus:border-[#5B1924] focus:ring-1 focus:ring-[#5B1924] transition-all disabled:opacity-60"
            />
          </div>

          {/* Primary Submit CTA */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-1.5 inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-full bg-[#5B1924] text-[#FDFBF7] text-sm font-medium hover:bg-[#48131C] active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer group"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{tab === 'Login' ? 'Signing in...' : 'Creating account...'}</span>
              </>
            ) : (
              <>
                <span>{tab === 'Login' ? 'Login' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Session Security Indicator & Demo Shortcut */}
        <div className="mt-3.5 pt-2.5 border-t border-[#E6DFD3] flex flex-col items-center gap-1.5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8C8379]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600/70" />
            <span>Secure session via HTTP-only cookie</span>
          </div>
          {onOpenApp && (
            <button
              type="button"
              onClick={onOpenApp}
              className="text-[11px] text-[#8C8379] hover:text-[#5B1924] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Or preview dashboard as guest
            </button>
          )}
        </div>

        {/* Bottom Switch Link & Return Link */}
        <div className="mt-3 pt-2.5 border-t border-[#E6DFD3]/70 flex flex-col items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setTab(tab === 'Login' ? 'Sign Up' : 'Login');
              setErrorMessage(null);
            }}
            className="text-[#5E564E] hover:text-[#5B1924] transition-colors cursor-pointer"
          >
            {tab === 'Login' ? (
              <>
                Don&apos;t have an account?{' '}
                <span className="font-semibold text-[#5B1924] underline underline-offset-2">
                  Sign up
                </span>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <span className="font-semibold text-[#5B1924] underline underline-offset-2">
                  Login
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 text-[11px] text-[#8C8379] hover:text-[#1C1817] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Return to landing page</span>
          </button>
        </div>
      </div>
    </div>
  );
};
