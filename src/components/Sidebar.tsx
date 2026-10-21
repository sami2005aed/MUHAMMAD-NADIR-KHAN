import React from 'react';
import { UserRole } from '../types.ts';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  WalletCards,
  Receipt,
  FileSignature,
  BarChart3,
  UserCog,
  History,
  Settings,
  HelpCircle,
  FileCheck,
  UserCheck,
} from 'lucide-react';

export type NavigationTab =
  | 'dashboard'
  | 'clients'
  | 'jobs'
  | 'documents'
  | 'finance'
  | 'invoices'
  | 'agreements'
  | 'manpower'
  | 'reports'
  | 'users'
  | 'audit'
  | 'settings';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
}

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  role: UserRole;
  pendingUsersCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  role,
  pendingUsersCount = 0,
  isOpen = false,
  onClose,
}) => {
  const masterNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard & Analytics', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients & CRM', icon: Users },
    { id: 'jobs', label: 'Jobs & Tasks', icon: Briefcase },
    { id: 'documents', label: 'Documents & Verification', icon: FileCheck },
    { id: 'finance', label: 'Finance & Ledger', icon: WalletCards },
    { id: 'invoices', label: 'Invoices (Bilingual)', icon: Receipt },
    { id: 'agreements', label: 'Agreements & Contracts', icon: FileSignature },
    { id: 'manpower', label: 'Manpower / Employees', icon: UserCheck },
    { id: 'reports', label: 'Reports & Exports', icon: BarChart3 },
    {
      id: 'users',
      label: 'Sub-Agent Management',
      icon: UserCog,
      badge: pendingUsersCount > 0 ? pendingUsersCount : undefined,
    },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'settings', label: 'Company Settings', icon: Settings },
  ];

  const subAgentNavItems: NavItem[] = [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'My Clients', icon: Users },
    { id: 'jobs', label: 'My Jobs & Tasks', icon: Briefcase },
    { id: 'documents', label: 'My Documents', icon: FileCheck },
    { id: 'finance', label: 'Commission Ledger', icon: WalletCards },
    { id: 'invoices', label: 'Client Invoices', icon: Receipt },
    { id: 'agreements', label: 'Client Agreements', icon: FileSignature },
  ];

  const items = role === 'master_admin' ? masterNavItems : subAgentNavItems;

  const content = (
    <div className="flex flex-col h-full bg-[#0A1A3C] text-slate-200 border-r border-slate-800 w-64 select-none">
      {/* Role Banner */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="text-xs uppercase tracking-wider text-[#C9A05C] font-bold">
          {role === 'master_admin' ? 'Master Admin Workspace' : 'Sub-Agent Portal'}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          {role === 'master_admin'
            ? 'Full Executive Control & Oversight'
            : 'Isolated Agent Job & Commission Center'}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id as NavigationTab);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#C9A05C] to-amber-600 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-[#C9A05C]'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Information Widget */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400">
        <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
          <HelpCircle className="w-3.5 h-3.5 text-[#C9A05C]" />
          <span>Support & Enquiries</span>
        </div>
        <div>Ajman Office: 068055093</div>
        <div className="text-[10px] text-slate-500 mt-1">License No. 140290 &bull; Sole Est.</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop permanent sidebar */}
      <aside className="hidden md:block shrink-0 h-[calc(100vh-4rem)] sticky top-16 no-print">
        {content}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
          />
          <div className="relative z-10 w-64 h-full shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
