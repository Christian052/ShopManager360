import React, { useState, useRef, useEffect } from 'react';
import { StockAlertNotification } from '../types';
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  Flame,
  Mail,
  Monitor,
  Volume2,
  PackagePlus,
  Settings,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  getDesktopNotificationStatus,
  requestDesktopNotificationPermission,
} from '../utils/notificationService';

interface NotificationCenterDropdownProps {
  notifications: StockAlertNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onStockIn: (partId: string) => void;
  onViewEmail: (notification: StockAlertNotification) => void;
  onOpenSettings: () => void;
  onTriggerTestAlert: () => void;
}

export const NotificationCenterDropdown: React.FC<NotificationCenterDropdownProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onStockIn,
  onViewEmail,
  onOpenSettings,
  onTriggerTestAlert,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [desktopStatus, setDesktopStatus] = useState(getDesktopNotificationStatus());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const criticalCount = notifications.filter((n) => n.severity === 'critical').length;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRequestPermission = async () => {
    const status = await requestDesktopNotificationPermission();
    setDesktopStatus(status);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        id="btn-notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        title="Stock Alerts & Desktop Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            id="badge-unread-notifications-count"
            className={`absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 text-[11px] font-extrabold text-white flex items-center justify-center rounded-full shadow-sm ${
              criticalCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Panel */}
      {isOpen && (
        <div
          id="popover-notification-center"
          className="absolute right-0 mt-2 w-96 sm:w-[440px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Stock Restock Alerts</h4>
                <p className="text-[11px] text-slate-400">
                  {unreadCount} unread • {criticalCount} out of stock
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button
                  id="btn-mark-all-read"
                  onClick={onMarkAllAsRead}
                  className="px-2 py-1 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition flex items-center space-x-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                id="btn-close-notif-dropdown"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Desktop Permission Quick-Action Bar if needed */}
          {desktopStatus !== 'granted' && (
            <div className="bg-blue-50 border-b border-blue-100 p-3 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-blue-900 font-medium">
                <Monitor className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Enable desktop popups for instant alerts</span>
              </div>
              <button
                id="btn-grant-desktop-permission-quick"
                onClick={handleRequestPermission}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-[11px] transition whitespace-nowrap shadow-xs"
              >
                Allow Popups
              </button>
            </div>
          )}

          {/* Notification Items List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-800">All Stock Levels Optimal!</div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  No parts have fallen below configured reorder thresholds. The system monitors transactions automatically.
                </p>
                <button
                  id="btn-simulate-test-alert"
                  onClick={onTriggerTestAlert}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                >
                  Send a simulated test alert
                </button>
              </div>
            ) : (
              notifications.map((n) => {
                const isOutOfStock = n.currentQuantity === 0;
                return (
                  <div
                    key={n.id}
                    id={`notification-item-${n.id}`}
                    className={`p-3.5 transition hover:bg-slate-50 relative ${
                      !n.isRead ? 'bg-amber-50/40' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-600'
                              : 'bg-amber-100 text-amber-600'
                          }`}
                        >
                          {isOutOfStock ? (
                            <Flame className="w-4 h-4" />
                          ) : (
                            <AlertTriangle className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-slate-900">{n.partName}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                isOutOfStock
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {isOutOfStock ? '0 Left' : `${n.currentQuantity} Left`}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            SKU: {n.partSku} • Min Level: {n.reorderLevel} {n.unit}
                          </div>

                          <div className="text-xs text-slate-600 mt-1 leading-snug">
                            {n.message}
                          </div>

                          {/* Channels Dispatched */}
                          <div className="flex items-center space-x-3 text-[10px] text-slate-500 mt-2">
                            <span className="flex items-center space-x-1 text-blue-600 font-medium">
                              <Mail className="w-3 h-3" />
                              <span>Emailed to {n.emailRecipient?.split('@')[0]}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-slate-500">
                              <Monitor className="w-3 h-3" />
                              <span>Desktop Alert</span>
                            </span>
                            <span className="text-slate-400">
                              {new Date(n.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right controls */}
                      <div className="flex flex-col items-end space-y-1.5 flex-shrink-0">
                        {!n.isRead && (
                          <button
                            id={`btn-mark-read-${n.id}`}
                            onClick={() => onMarkAsRead(n.id)}
                            className="text-slate-400 hover:text-emerald-600 p-1"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center space-x-2 mt-2.5 pt-2 border-t border-slate-100">
                      <button
                        id={`btn-quick-stockin-${n.partId}`}
                        onClick={() => {
                          setIsOpen(false);
                          onStockIn(n.partId);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 shadow-xs transition"
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                        <span>Restock Now</span>
                      </button>

                      <button
                        id={`btn-view-email-${n.id}`}
                        onClick={() => {
                          setIsOpen(false);
                          onViewEmail(n);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium flex items-center space-x-1 transition"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>View Email / PO</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <button
              id="btn-open-alert-settings-from-notif"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="text-slate-600 hover:text-blue-600 font-medium flex items-center space-x-1 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configure Notification Channels</span>
            </button>

            {notifications.length > 0 && (
              <button
                id="btn-clear-all-notifs"
                onClick={onClearAll}
                className="text-slate-400 hover:text-rose-600 text-[11px] transition"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
