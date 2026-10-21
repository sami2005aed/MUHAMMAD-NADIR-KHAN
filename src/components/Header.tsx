import React from 'react';
import { User, CompanySettings, SystemNotification } from '../types.ts';
import { CompanyLogo } from './CompanyLogo.tsx';
import {
  Bell,
  ShieldCheck,
  UserCheck,
  LogOut,
  QrCode,
  Sparkles,
  Menu,
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  settings: CompanySettings;
  notifications: SystemNotification[];
  onOpenNotifications: () => void;
  onOpenVerify: () => void;
  onOpenAIAdvisor: () => void;
  onLogout: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  settings,
  notifications,
  onOpenNotifications,
  onOpenVerify,
  onOpenAIAdvisor,
  onLogout,
  onToggleSidebar,
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="no-print sticky top-0 z-30 bg-[#0A1A3C]/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Mobile menu toggle + Logo */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <CompanyLogo size="header" />
        </div>

        {/* Right Action Icons & User Info */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Public Verification Link / Button */}
          <button
            onClick={onOpenVerify}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-200 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition cursor-pointer"
            title="Public Document QR Verification System"
          >
            <QrCode className="w-4 h-4 text-[#C9A05C]" />
            <span className="hidden sm:inline">Verify Document</span>
          </button>

          {/* AI Legal & Clause Advisor */}
          <button
            onClick={onOpenAIAdvisor}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-200 bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/40 hover:border-blue-400 hover:brightness-110 transition shadow-xs cursor-pointer"
            title="AI Legal & Regulatory Clause Drafter (High Reasoning)"
          >
            <Sparkles className="w-4 h-4 text-blue-300 animate-pulse" />
            <span className="hidden sm:inline">AI Legal Reasoning</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
            title="System Alerts & Expiries"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-slate-700 hidden sm:block" />

          {/* User Profile Info */}
          {currentUser && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-100 leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-[#C9A05C] flex items-center justify-end gap-1">
                  {currentUser.role === 'master_admin' ? (
                    <>
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                      <span>Master Admin</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3 h-3 text-emerald-400" />
                      <span>{currentUser.companyName || 'Sub-Agent'}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="relative group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#C9A05C] to-amber-200 text-slate-950 font-bold flex items-center justify-center text-sm shadow-md border border-amber-300/40">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
