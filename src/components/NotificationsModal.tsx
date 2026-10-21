import React from 'react';
import { SystemNotification, UserRole } from '../types.ts';
import {
  Bell,
  X,
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
} from 'lucide-react';

interface NotificationsModalProps {
  notifications: SystemNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notif: SystemNotification) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkAllAsRead,
  onNotificationClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-right-4">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#C9A05C]" />
            <h3 className="font-bold text-sm text-white">System Reminders &amp; Alerts</h3>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">
              {notifications.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllAsRead}
              className="text-xs text-[#C9A05C] hover:underline cursor-pointer"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-3 overflow-y-auto divide-y divide-slate-800/80 flex-1">
          {notifications.map(n => {
            const getIcon = () => {
              switch (n.type) {
                case 'danger':
                  return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
                case 'warning':
                  return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
                case 'success':
                  return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
                default:
                  return <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />;
              }
            };

            return (
              <div
                key={n.id}
                onClick={() => onNotificationClick(n)}
                className={`p-3 rounded-xl transition cursor-pointer flex items-start gap-3 ${
                  n.read
                    ? 'opacity-65 hover:opacity-100 hover:bg-slate-800/40'
                    : 'bg-slate-800/60 hover:bg-slate-800'
                }`}
              >
                {getIcon()}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{n.title}</span>
                    <span className="text-[10px] text-slate-500">{n.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">{n.message}</p>
                  {n.link && (
                    <div className="text-[10px] text-[#C9A05C] font-semibold flex items-center gap-1 pt-1">
                      <span>View details</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {notifications.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">
              No active alerts or upcoming expiries.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
