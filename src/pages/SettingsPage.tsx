import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Settings,
  User as UserIcon,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  KeyRound,
  Database,
  Cloud,
  LogOut,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { AuthUser } from '../components/landing/AuthPanel';
import { AuthenticatedLayoutContext } from '../components/layout/AuthenticatedLayout';

interface SettingsPageProps {
  user?: AuthUser;
  onLogout?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = (props) => {
  const navigate = useNavigate();
  const outletCtx = useOutletContext<AuthenticatedLayoutContext | undefined>();

  const user = props.user || outletCtx?.user;
  const onLogout = props.onLogout || outletCtx?.onLogout;

  if (!user) {
    return null;
  }

  const isVerified = user.isEmailVerified !== false;

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-200 max-w-4xl">
      {/* Page Header */}
      <div className="pb-2 border-b border-[#ECE5DA]">
        <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1C1817]">
          Account{' '}
          <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">
            Settings
          </span>
        </h1>
        <p className="text-xs sm:text-sm text-[#5E564E] mt-1 leading-relaxed">
          Manage your personal profile, credentials, and infrastructure privacy.
        </p>
      </div>

      {/* Profile Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#ECE5DA]">
          <div className="flex items-center gap-2">
            <UserIcon size={18} className="text-[#5B1924]" />
            <h3 className="font-editorial text-lg font-bold text-[#1C1817]">User Profile</h3>
          </div>
          <span className="text-[11px] text-[#8C8379] font-medium">
            Provider: {user.authProvider === 'google' ? 'Google Identity' : 'Email & Password'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8379]">
              Full Name
            </label>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] text-xs font-semibold text-[#1C1817]">
              {user.name}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8C8379]">
                Email Address
              </label>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 size={11} /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Pending Verification
                </span>
              )}
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] text-xs font-semibold text-[#1C1817]">
              {user.email}
            </div>
          </div>
        </div>

        {user.createdAt && (
          <div className="flex items-center gap-2 text-xs text-[#8C8379] pt-1">
            <Clock size={13} />
            <span>
              Member since{' '}
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>

      {/* Security & Architecture Overview */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-4 border-b border-[#ECE5DA]">
          <ShieldCheck size={18} className="text-[#5B1924]" />
          <h3 className="font-editorial text-lg font-bold text-[#1C1817]">
            Security & Data Protection
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1817]">
              <KeyRound size={15} className="text-[#5B1924]" />
              <span>Password Hashing</span>
            </div>
            <p className="text-[11px] text-[#5E564E] leading-relaxed">
              Salted bcrypt with 12 computational rounds. Plaintext passwords never hit the database.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1817]">
              <Database size={15} className="text-[#5B1924]" />
              <span>Session Management</span>
            </div>
            <p className="text-[11px] text-[#5E564E] leading-relaxed">
              Server-side encrypted cookie sessions stored with 14-day rolling expiration.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1817]">
              <Cloud size={15} className="text-[#5B1924]" />
              <span>Private R2 Storage</span>
            </div>
            <p className="text-[11px] text-[#5E564E] leading-relaxed">
              Wardrobe images remain private with time-limited HMAC-signed URLs generated on demand.
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone / Logout */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-editorial text-base font-bold text-[#1C1817]">End Session</h4>
          <p className="text-xs text-[#5E564E] mt-0.5">
            Safely invalidate your current server session and log out of ClosetBrain.
          </p>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#FDF2F2] border border-[#F2C9CE] text-xs font-semibold text-[#882434] hover:bg-[#FCE8E8] transition-colors cursor-pointer shrink-0"
          >
            <LogOut size={14} />
            <span>Log Out of ClosetBrain</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
