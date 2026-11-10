import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Loader2, AlertCircle, CheckCircle2, KeyRound, Mail, RefreshCw, Terminal } from 'lucide-react';
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
  isEmailVerified?: boolean;
}

interface AuthPanelProps {
  authProgress: number;
  onClose: () => void;
  onAuthSuccess?: (user: AuthUser) => void;
  prefersReducedMotion?: boolean;
  isMobile?: boolean;
}

type AuthMode = 'login' | 'signup' | 'verify_email' | 'forgot_password' | 'reset_password';

/**
 * Accessible 6-digit OTP Input component with auto-focus, paste, and backspace navigation.
 */
interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  disabled = false,
  autoFocus = true,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.slice(-1);
    if (char && !/^\d$/.test(char)) return;

    const newDigits = [...digits];
    newDigits[index] = char;
    const combined = newDigits.join('').slice(0, 6);
    onChange(combined);

    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    const cleanDigits = pasted.replace(/\D/g, '').slice(0, 6);
    if (!cleanDigits) return;

    onChange(cleanDigits);
    const nextIndex = Math.min(cleanDigits.length, 5);
    inputsRef.current[nextIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2 my-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={digits[i]}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1} of verification code`}
          className="w-11 sm:w-12 h-13 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold rounded-xl sm:rounded-2xl bg-[#FFFFFF] border border-[#E6DFD3] text-[#5B1924] placeholder-transparent focus:outline-none focus:border-[#5B1924] focus:ring-2 focus:ring-[#5B1924]/15 transition-all disabled:opacity-50 shadow-xs"
        />
      ))}
    </div>
  );
};

export const AuthPanel: React.FC<AuthPanelProps> = ({
  authProgress,
  onClose,
  onAuthSuccess,
  prefersReducedMotion = false,
  isMobile = false,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Form inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Target email for verification and password reset flows
  const [activeEmail, setActiveEmail] = useState('');

  // Cooldown countdown timer in seconds
  const [cooldown, setCooldown] = useState(0);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDevFallback, setIsDevFallback] = useState(false);
  const [devNotice, setDevNotice] = useState<string | null>(null);

  // Offer direct verification link on 403 unverified login
  const [unverifiedOffer, setUnverifiedOffer] = useState(false);

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

  // Cooldown timer interval
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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
        headers: { 'Content-Type': 'application/json' },
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

  // Initialize official Google Identity Services button if configured and in login/signup mode
  useEffect(() => {
    if (!isGoogleConfigured || typeof window === 'undefined') return;
    if (mode !== 'login' && mode !== 'signup') return;

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
  }, [isGoogleConfigured, rawGoogleClientId, mode]);

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

  // --------------------------------------------------------------------------
  // Action Handlers
  // --------------------------------------------------------------------------

  // 1. Submit Login or Signup
  const handlePrimaryAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setUnverifiedOffer(false);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setErrorMessage(data.error || 'Failed to create account. Please check your inputs.');
          return;
        }

        if (data.needsVerification) {
          setActiveEmail(email.trim());
          setOtp('');
          setCooldown(60);
          setPassword('');
          setMode('verify_email');
          const isDev = Boolean(data.devFallback);
          setIsDevFallback(isDev);
          setDevNotice(data.devNotice || null);
          if (isDev) {
            setSuccessMessage(
              data.devNotice ||
                'Development sandbox active: email delivery was restricted to the verified domain owner. Your 6-digit code has been logged to the server terminal.'
            );
          } else {
            setSuccessMessage('Account created! A 6-digit verification code was sent to your email.');
          }
        }
      } else {
        // Login flow
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 403 && data.needsVerification) {
            setActiveEmail(email.trim());
            setUnverifiedOffer(true);
            setErrorMessage(data.error || 'Please verify your email address before logging in.');
            return;
          }

          setErrorMessage(data.error || 'Invalid email or password.');
          return;
        }

        if (data.user && onAuthSuccess) {
          onAuthSuccess(data.user);
        }
      }
    } catch (err) {
      console.error('Auth request error:', err);
      setErrorMessage(
        'Unable to connect to the authentication server. Please check your network and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit Email Verification OTP
  const handleVerifyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (otp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: activeEmail,
          otp,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(data.error || 'Verification failed. Please check your code and try again.');
        return;
      }

      if (data.user && onAuthSuccess) {
        onAuthSuccess(data.user);
      }
    } catch (err) {
      console.error('Email verification error:', err);
      setErrorMessage('Network error during verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Resend Signup Verification Code
  const handleResendSignupCode = async () => {
    if (cooldown > 0 || isLoading) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: activeEmail }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok && response.status !== 200) {
        setErrorMessage(data.error || 'Failed to resend code. Please wait a moment.');
        return;
      }

      setCooldown(60);
      const isDev = Boolean(data.devFallback);
      setIsDevFallback(isDev);
      setDevNotice(data.devNotice || null);
      if (isDev) {
        setSuccessMessage(
          data.devNotice ||
            'Development sandbox active: fresh 6-digit verification code logged to server terminal.'
        );
      } else {
        setSuccessMessage('A fresh verification code has been dispatched to your email.');
      }
    } catch (err) {
      console.error('Resend verification error:', err);
      setErrorMessage('Failed to connect to the server. Please check your network.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Submit Forgot Password Request (Step 1)
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const targetEmail = activeEmail || email;
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: targetEmail.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      // Always advance to reset code step uniformly
      setActiveEmail(targetEmail.trim());
      setOtp('');
      setCooldown(60);
      setMode('reset_password');
      const isDev = Boolean(data.devFallback);
      setIsDevFallback(isDev);
      setDevNotice(data.devNotice || null);
      if (isDev) {
        setSuccessMessage(
          data.devNotice ||
            'Development sandbox active: password reset code has been logged to the server terminal.'
        );
      } else {
        setSuccessMessage(
          data.message || 'If an account exists with this email address, a password reset code has been sent.'
        );
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setErrorMessage('Failed to send reset code. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Submit Password Reset (Step 2)
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (otp.length !== 6) {
      setErrorMessage('Please enter the 6-digit code sent to your email.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: activeEmail,
          otp,
          newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(data.error || 'Password reset failed. Please check your code and try again.');
        return;
      }

      // Success: return to login with clear prompt to sign in
      setMode('login');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setSuccessMessage('Password reset successfully! Please sign in with your new password.');
    } catch (err) {
      console.error('Reset password error:', err);
      setErrorMessage('Failed to reset password. Please check your network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Panel Layout & Animation
  // --------------------------------------------------------------------------
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
      aria-label="ClosetBrain Authentication"
      className="w-full max-w-md mx-auto transition-all"
      style={{
        opacity: panelT,
        transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
        pointerEvents: panelT > 0.7 ? 'auto' : 'none',
        zIndex: 45,
      }}
    >
      <div className="bg-[#FDFBF7]/95 backdrop-blur-md border border-[#E6DFD3] rounded-3xl p-5 sm:p-7 md:p-8 shadow-2xl shadow-[#5B1924]/10 relative overflow-hidden">
        {/* Decorative Top Brand Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5B1924]/20 via-[#5B1924] to-[#5B1924]/20" />

        {/* Top Header Row: Close Button */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          {mode !== 'login' && mode !== 'signup' ? (
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setSuccessMessage(null);
                setIsDevFallback(false);
                setDevNotice(null);
                setMode('login');
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[#5E564E] hover:text-[#5B1924] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#5E564E] hover:text-[#1C1817] hover:bg-[#F2ECE1] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Segmented Control (Only on Login / Sign Up) */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="p-1 bg-[#F2ECE1] rounded-full mb-4 sm:mb-5 border border-[#E6DFD3]/80">
            <AnimatedBackground
              defaultValue="Login"
              value={mode === 'login' ? 'Login' : 'Sign Up'}
              onValueChange={(id) => {
                setErrorMessage(null);
                setSuccessMessage(null);
                setUnverifiedOffer(false);
                setIsDevFallback(false);
                setDevNotice(null);
                setMode(id === 'Sign Up' ? 'signup' : 'login');
              }}
              className="rounded-full bg-[#5B1924] shadow-sm"
              transition={{ ease: 'easeInOut', duration: 0.2 }}
            >
              <button
                data-id="Login"
                type="button"
                className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-full text-center transition-colors cursor-pointer active:scale-[0.98] relative z-10 ${
                  mode === 'login'
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
                  mode === 'signup'
                    ? 'text-[#FDFBF7]'
                    : 'text-[#5E564E] hover:text-[#1C1817]'
                }`}
              >
                Sign Up
              </button>
            </AnimatedBackground>
          </div>
        )}

        {/* Title & Subtitle */}
        <div className="mb-4">
          <h2 className="font-editorial text-xl sm:text-2xl md:text-3xl text-[#1C1817] font-semibold tracking-tight leading-tight">
            {mode === 'login' && (
              <>
                Welcome <span className="font-cursive text-[1.28em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">back</span>
              </>
            )}
            {mode === 'signup' && (
              <>
                Create your <span className="font-cursive text-[1.22em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">wardrobe</span>
              </>
            )}
            {mode === 'verify_email' && (
              <>
                Verify your <span className="font-cursive text-[1.22em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">email</span>
              </>
            )}
            {mode === 'forgot_password' && (
              <>
                Reset your <span className="font-cursive text-[1.22em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">password</span>
              </>
            )}
            {mode === 'reset_password' && (
              <>
                Set new <span className="font-cursive text-[1.22em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">password</span>
              </>
            )}
          </h2>

          <p className="text-xs sm:text-sm text-[#5E564E] mt-0.5 sm:mt-1 leading-relaxed">
            {mode === 'login' && 'Enter your credentials to access your smart collection.'}
            {mode === 'signup' && 'Sign up to begin curating and organizing your collection.'}
            {mode === 'verify_email' && (
              isDevFallback ? (
                <>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider mr-1.5 align-middle">
                    Dev Sandbox
                  </span>
                  Check your server terminal console for the 6-digit code for{' '}
                  <span className="font-semibold text-[#1C1817]">{activeEmail || email}</span>.
                </>
              ) : (
                <>
                  Enter the 6-digit code sent to{' '}
                  <span className="font-semibold text-[#1C1817]">{activeEmail || email}</span>.
                </>
              )
            )}
            {mode === 'forgot_password' &&
              'Enter your registered email address to receive a verification code.'}
            {mode === 'reset_password' && (
              isDevFallback ? (
                <>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider mr-1.5 align-middle">
                    Dev Sandbox
                  </span>
                  Check your server terminal console for the 6-digit code for{' '}
                  <span className="font-semibold text-[#1C1817]">{activeEmail}</span> along with your new password.
                </>
              ) : (
                <>
                  Enter the 6-digit code sent to{' '}
                  <span className="font-semibold text-[#1C1817]">{activeEmail}</span> along with your new password.
                </>
              )
            )}
          </p>
        </div>

        {/* Inline Success Banner */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs flex items-start gap-2.5 text-[#166534] animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#166534]" />
            <p className="font-medium leading-relaxed">{successMessage}</p>
          </div>
        )}

        {/* Inline Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#FDF2F2] border border-[#F2C9CE] text-xs flex items-start gap-2.5 text-[#882434] animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#882434]" />
            <div className="flex-1">
              <p className="font-medium leading-relaxed">{errorMessage}</p>
              {unverifiedOffer && (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setUnverifiedOffer(false);
                    setOtp('');
                    setMode('verify_email');
                  }}
                  className="mt-2 inline-flex items-center gap-1 font-semibold text-[#5B1924] underline underline-offset-2 hover:text-[#48131C] cursor-pointer"
                >
                  <span>Verify your code now</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 1: Login or Signup Form                                      */}
        {/* ================================================================= */}
        {(mode === 'login' || mode === 'signup') && (
          <>
            <form onSubmit={handlePrimaryAuthSubmit} className="space-y-3 sm:space-y-3.5">
              {mode === 'signup' && (
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
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="auth-password"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E564E]"
                  >
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEmail(email.trim());
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setMode('forgot_password');
                      }}
                      className="text-[11px] text-[#5B1924] hover:underline font-medium cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={8}
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

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full mt-1.5 inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-full bg-[#5B1924] text-[#FDFBF7] text-sm font-medium hover:bg-[#48131C] active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Login' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Google Authentication Divider */}
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
          </>
        )}

        {/* ================================================================= */}
        {/* VIEW 2: Verify Email OTP                                          */}
        {/* ================================================================= */}
        {mode === 'verify_email' && (
          <form onSubmit={handleVerifyEmailSubmit} className="space-y-4">
            {isDevFallback && (
              <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-start gap-2.5 animate-in fade-in duration-200">
                <Terminal className="w-4 h-4 shrink-0 mt-0.5 text-[#B45309]" />
                <div className="leading-relaxed">
                  <p className="font-semibold text-[#78350F]">Development Console Fallback Active</p>
                  <p className="text-[11px] text-[#92400E] mt-0.5">
                    Resend free sandbox domain restricted external delivery. Look for <span className="font-mono font-semibold bg-[#FEF3C7] px-1 py-0.5 rounded text-[#78350F]">[DEV EMAIL OTP]</span> in your backend terminal console.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] flex items-center justify-center text-[#5B1924] mb-3 shadow-xs">
                <Mail className="w-6 h-6" />
              </div>
              <p className="text-xs text-[#8C8379] uppercase tracking-wider font-semibold mb-2">
                6-Digit Verification Code
              </p>
              <OtpInput
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-full bg-[#5B1924] text-[#FDFBF7] text-sm font-medium hover:bg-[#48131C] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify Email & Access Wardrobe</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Resend Action with Cooldown Timer */}
            <div className="pt-2 text-center text-xs text-[#5E564E]">
              {cooldown > 0 ? (
                <p className="text-[#8C8379]">
                  Didn&apos;t receive code? Resend available in{' '}
                  <span className="font-semibold text-[#5B1924]">{cooldown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendSignupCode}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#5B1924] hover:text-[#48131C] underline underline-offset-2 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend verification code</span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* ================================================================= */}
        {/* VIEW 3: Forgot Password (Request Code)                            */}
        {/* ================================================================= */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E564E] mb-1"
              >
                Registered Email
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                disabled={isLoading}
                value={activeEmail || email}
                onChange={(e) => {
                  setActiveEmail(e.target.value);
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl bg-[#FDFBF7] border border-[#E6DFD3] text-sm text-[#1C1817] placeholder-[#8C8379] focus:outline-none focus:border-[#5B1924] focus:ring-1 focus:ring-[#5B1924] transition-all disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !(activeEmail || email)}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-full bg-[#5B1924] text-[#FDFBF7] text-sm font-medium hover:bg-[#48131C] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <span>Send Password Reset Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ================================================================= */}
        {/* VIEW 4: Reset Password (Enter Code & New Password)                 */}
        {/* ================================================================= */}
        {mode === 'reset_password' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
            {isDevFallback && (
              <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-start gap-2.5 animate-in fade-in duration-200">
                <Terminal className="w-4 h-4 shrink-0 mt-0.5 text-[#B45309]" />
                <div className="leading-relaxed">
                  <p className="font-semibold text-[#78350F]">Development Console Fallback Active</p>
                  <p className="text-[11px] text-[#92400E] mt-0.5">
                    Resend free sandbox domain restricted external delivery. Look for <span className="font-mono font-semibold bg-[#FEF3C7] px-1 py-0.5 rounded text-[#78350F]">[DEV EMAIL OTP]</span> in your backend terminal console.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] flex items-center justify-center text-[#5B1924] mb-2 shadow-xs">
                <KeyRound className="w-5 h-5" />
              </div>
              <p className="text-[11px] text-[#8C8379] uppercase tracking-wider font-semibold mb-1">
                Enter 6-Digit Reset Code
              </p>
              <OtpInput
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E564E] mb-1"
              >
                New Password (min 8 characters)
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                disabled={isLoading}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-xl bg-[#FDFBF7] border border-[#E6DFD3] text-sm text-[#1C1817] placeholder-[#8C8379] focus:outline-none focus:border-[#5B1924] focus:ring-1 focus:ring-[#5B1924] transition-all disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-[11px] font-semibold uppercase tracking-wider text-[#5E564E] mb-1"
              >
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                disabled={isLoading}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-xl bg-[#FDFBF7] border border-[#E6DFD3] text-sm text-[#1C1817] placeholder-[#8C8379] focus:outline-none focus:border-[#5B1924] focus:ring-1 focus:ring-[#5B1924] transition-all disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6 || !newPassword || !confirmPassword}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-full bg-[#5B1924] text-[#FDFBF7] text-sm font-medium hover:bg-[#48131C] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Resend Reset Code Link */}
            <div className="pt-1 text-center text-xs text-[#5E564E]">
              {cooldown > 0 ? (
                <p className="text-[#8C8379]">
                  Resend code available in{' '}
                  <span className="font-semibold text-[#5B1924]">{cooldown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleForgotPasswordSubmit}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#5B1924] hover:text-[#48131C] underline underline-offset-2 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend reset code</span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* Bottom Switch Link & Return Link */}
        <div className="mt-4 pt-3 border-t border-[#E6DFD3]/70 flex flex-col items-center gap-2 text-xs">
          {(mode === 'login' || mode === 'signup') && (
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setErrorMessage(null);
                setSuccessMessage(null);
                setUnverifiedOffer(false);
              }}
              className="text-[#5E564E] hover:text-[#5B1924] transition-colors cursor-pointer"
            >
              {mode === 'login' ? (
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
          )}

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
