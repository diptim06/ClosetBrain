import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { AnimatedBackground } from '@/components/core/animated-background';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (notification?: any) => void;
        };
      };
    };
  }
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  authProvider?: string;
  createdAt?: string;
}

interface AuthPanelProps {
  authProgress: number;
  onClose: () => void;
  onAuthSuccess?: (user: AuthUser) => void;
  prefersReducedMotion?: boolean;
  isMobile?: boolean;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  authProgress,
  onClose,
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const googleButtonContainerRef = useRef<HTMLDivElement>(null);

  const rawGoogleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isGoogleConfigured = Boolean(
    rawGoogleClientId &&
      !rawGoogleClientId.includes('your_google_oauth_client_id') &&
      !rawGoogleClientId.includes('<') &&
      rawGoogleClientId.trim() !== ''
  );

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

  // Handle Google Credential Response from official Google Identity Services
  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      setErrorMessage('Google authentication did not return a valid credential. Please try again.');
      return;
    }

    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(
          data.error || 'Google authentication failed. Please verify your account and try again.'
        );
        return;
      }

      if (data.user && onAuthSuccess) {
        onAuthSuccess(data.user);
      }
    } catch (err) {
      console.error('Google auth network error:', err);
      setErrorMessage(
        'Unable to communicate with the authentication server. Please check your network and server status.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Initialize official Google Identity Services button if configured
  useEffect(() => {
    if (!isGoogleConfigured || typeof window === 'undefined') return;

    let isMounted = true;

    const renderGoogleButton = () => {
      if (!isMounted || !window.google?.accounts?.id || !googleButtonContainerRef.current) return;

      try {
        window.google.accounts.id.initialize({
          client_id: rawGoogleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        googleButtonContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonContainerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 360,
        });
      } catch (err) {
        console.error('Error rendering Google Identity Services button:', err);
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          renderGoogleButton();
        }
      }, 250);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [isGoogleConfigured, rawGoogleClientId]);

  // Handle click on custom/fallback Google button when client ID is not configured
  const handleFallbackGoogleClick = () => {
    if (!isGoogleConfigured) {
      setErrorMessage(
        'Google Sign-In is not configured yet. Please configure VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID in your .env file.'
      );
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

  // Handle email/password form submission
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

      if (data.user && onAuthSuccess) {
        onAuthSuccess(data.user);
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

        {/* Top Header Row: Close Button */}
        <div className="flex items-center justify-end mb-2 sm:mb-3">
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
          <h2 className="font-editorial text-xl sm:text-2xl md:text-3xl text-[#1C1817] font-semibold tracking-tight leading-tight">
            {tab === 'Login' ? (
              <>
                Welcome <span className="font-cursive text-[1.28em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">back</span>
              </>
            ) : (
              <>
                Create your <span className="font-cursive text-[1.22em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">wardrobe</span>
              </>
            )}
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

        {/* Email & Password Form */}
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
                disabled={isLoading || isGoogleLoading}
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
              disabled={isLoading || isGoogleLoading}
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
              disabled={isLoading || isGoogleLoading}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl bg-[#FDFBF7] border border-[#E6DFD3] text-sm text-[#1C1817] placeholder-[#8C8379] focus:outline-none focus:border-[#5B1924] focus:ring-1 focus:ring-[#5B1924] transition-all disabled:opacity-60"
            />
          </div>

          {/* Primary Submit CTA (Email/Password) */}
          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
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

        {/* Subtle Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E6DFD3]" />
          </div>
          <span className="relative bg-[#FDFBF7] px-3 text-[11px] uppercase tracking-wider text-[#8C8379] font-medium">
            or continue with
          </span>
        </div>

        {/* Google Authentication Section */}
        <div className="relative flex justify-center w-full">
          {/* Official Google Identity Services container */}
          {isGoogleConfigured ? (
            <div className="w-full flex justify-center relative">
              <div
                ref={googleButtonContainerRef}
                className={`w-full flex justify-center transition-opacity ${
                  isGoogleLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'
                }`}
              />
              {isGoogleLoading && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-[#FDFBF7]/90 text-xs text-[#5B1924] font-medium border border-[#E6DFD3]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#5B1924]" />
                  <span>Signing in with Google...</span>
                </div>
              )}
            </div>
          ) : (
            /* Custom compliant Google button with official Google logo and compliant styling */
            <button
              type="button"
              disabled={isLoading || isGoogleLoading}
              onClick={handleFallbackGoogleClick}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 sm:py-3 rounded-full bg-[#FFFFFF] border border-[#E6DFD3] text-[#1C1817] text-sm font-medium shadow-xs hover:bg-[#F9F7F2] hover:border-[#D8CEBD] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer group"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#5B1924]" />
                  <span>Connecting with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Bottom Switch Link & Return Link */}
        <div className="mt-4 pt-3 border-t border-[#E6DFD3]/70 flex flex-col items-center gap-2 text-xs">
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
