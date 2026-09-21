import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  MapPin,
  Phone,
  Mail,
  Save,
  RotateCcw,
  Download,
  CheckCircle,
  Bell,
  Monitor,
  Volume2,
  Send,
  AlertTriangle,
  Flame,
  Check,
  PackagePlus,
  ExternalLink,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { store } from '../data/store';
import { StockAlertNotification, NotificationSettings } from '../types';
import {
  playAlertChime,
  getDesktopNotificationStatus,
  requestDesktopNotificationPermission,
  fireDesktopNotification,
} from '../utils/notificationService';
import { RestockEmailModal } from './RestockEmailModal';
import { formatRwf } from '../utils/i18n';

interface SettingsViewProps {
  onOpenStockIn?: (partId: string) => void;
  initialTab?: 'general' | 'notifications';
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenStockIn,
  initialTab = 'general',
}) => {
  const { currentTenant, isOwner, t } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'notifications'>(initialTab);

  // Business profile form
  const [businessName, setBusinessName] = useState(currentTenant?.businessName || '');
  const [businessType, setBusinessType] = useState(currentTenant?.businessType || 'garage');
  const [district, setDistrict] = useState(currentTenant?.district || 'Nyarugenge');
  const [address, setAddress] = useState(currentTenant?.address || '');
  const [ownerPhone, setOwnerPhone] = useState(currentTenant?.phone || '');
  const [ownerEmail, setOwnerEmail] = useState(currentTenant?.email || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Notification settings state
  const tenantId = currentTenant?.id || '';
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    store.getNotificationSettings(tenantId)
  );
  const [notifications, setNotifications] = useState<StockAlertNotification[]>(
    store.getNotifications(tenantId)
  );
  const [desktopPermission, setDesktopPermission] = useState(getDesktopNotificationStatus());
  const [notifSavedToast, setNotifSavedToast] = useState<string | null>(null);

  // Email modal preview
  const [selectedNotifForEmail, setSelectedNotifForEmail] = useState<StockAlertNotification | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      setBusinessName(currentTenant.businessName);
      setBusinessType(currentTenant.businessType);
      setDistrict(currentTenant.district);
      setAddress(currentTenant.address);
      setOwnerPhone(currentTenant.phone);
      setOwnerEmail(currentTenant.email);
      setNotifSettings(store.getNotificationSettings(currentTenant.id));
      setNotifications(store.getNotifications(currentTenant.id));
    }
  }, [currentTenant]);

  const showNotifToast = (msg: string) => {
    setNotifSavedToast(msg);
    setTimeout(() => setNotifSavedToast(null), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    store.updateTenant(currentTenant.id, {
      businessName,
      businessType: businessType as any,
      district,
      address,
      phone: ownerPhone,
      email: ownerEmail,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleUpdateNotifSetting = (key: keyof NotificationSettings, value: any) => {
    if (!currentTenant) return;
    const updated = store.updateNotificationSettings(currentTenant.id, {
      [key]: value,
    });
    setNotifSettings(updated);
    showNotifToast('Notification preferences updated.');
  };

  const handleRequestDesktopPermission = async () => {
    const status = await requestDesktopNotificationPermission();
    setDesktopPermission(status);
    if (status === 'granted') {
      showNotifToast('Desktop notification permission granted!');
      fireDesktopNotification('ShopManager360 Alerts Enabled', 'You will receive instant popups when stock falls below reorder levels.');
    } else {
      showNotifToast('Desktop permission: ' + status);
    }
  };

  const handleTestDesktopNotification = () => {
    const status = fireDesktopNotification(
      '⚠️ [Test Alert] Low Stock: Toyota Oil Filter',
      'Stock dropped to 3 pcs (Threshold: 8 pcs). Wholesale Supplier: Toyota Rwanda Spares Agency.'
    );
    if (status === 'sent') {
      showNotifToast('Desktop notification popup fired!');
    } else if (status === 'blocked') {
      showNotifToast('Browser blocked popups. Click "Request Permission" first.');
    } else {
      showNotifToast('Desktop notifications are disabled or unsupported.');
    }
  };

  const handleTestAudioChime = () => {
    playAlertChime();
    showNotifToast('Played synthesized alert chime.');
  };

  const handleTriggerTestAlert = () => {
    if (!currentTenant) return;
    try {
      const alert = store.sendTestAlert(currentTenant.id);
      setNotifications(store.getNotifications(currentTenant.id));
      setSelectedNotifForEmail(alert);
      setIsEmailModalOpen(true);
      showNotifToast('Simulated low-stock alert triggered and email draft prepared!');
    } catch (err: any) {
      showNotifToast(err.message);
    }
  };

  const handleExportBackup = () => {
    if (!currentTenant) return;
    const parts = store.getParts(currentTenant.id);
    const transactions = store.getTransactions(currentTenant.id);
    const notifs = store.getNotifications(currentTenant.id);
    const backup = {
      tenant: currentTenant,
      parts,
      transactions,
      notifications: notifs,
      exportedAt: new Date().toISOString(),
      platform: 'ShopManager360 Rwanda',
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${currentTenant.businessName.replace(/\s+/g, '_')}_Backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Settings & Automated Alert Engine</h1>
          <p className="text-xs text-slate-500">
            Configure business identity, automated desktop popups, restock emails, and notification channels
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-json-backup"
            onClick={handleExportBackup}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON Backup
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-1">
        <button
          id="tab-settings-general"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center space-x-2 transition ${
            activeTab === 'general'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Shop Profile & Business</span>
        </button>

        <button
          id="tab-settings-notifications"
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center space-x-2 transition ${
            activeTab === 'notifications'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Automated Stock Alerts & Notifications</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {notifications.length}
          </span>
        </button>
      </div>

      {/* Toasts */}
      {notifSavedToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notifSavedToast}</span>
        </div>
      )}

      {/* TAB 1: SHOP PROFILE */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {savedSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Shop settings updated successfully!</span>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Business / Shop Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    disabled={!isOwner}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Industry / Business Type
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as any)}
                    disabled={!isOwner}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white"
                  >
                    <option value="garage">Auto Garage & Spare Parts</option>
                    <option value="hardware">Hardware & Construction Supplies</option>
                    <option value="pharmacy">Pharmacy & Medical Dispensary</option>
                    <option value="general">General Retail & Electronics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    District (Rwanda)
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    disabled={!isOwner}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white"
                  >
                    <option value="Nyarugenge">Nyarugenge</option>
                    <option value="Gasabo">Gasabo</option>
                    <option value="Kicukiro">Kicukiro</option>
                    <option value="Musanze">Musanze</option>
                    <option value="Rubavu">Rubavu</option>
                    <option value="Huye">Huye</option>
                    <option value="Rwamagana">Rwamagana</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Street / Neighborhood Location
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={!isOwner}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Primary Phone Number (MoMo)
                  </label>
                  <input
                    type="text"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    disabled={!isOwner}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Owner Email
                  </label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    disabled={!isOwner}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600">
                <div className="font-semibold text-slate-800">Workspace Metadata</div>
                <div>
                  Tenant ID: <code className="text-amber-700 font-mono font-bold">{currentTenant?.id}</code>
                </div>
                <div>
                  Currency: <strong>Rwandan Franc (RWF)</strong>
                </div>
                <div>
                  Database Schema: <strong>Multi-Tenant Shared Schema with Tenant Scoping</strong>
                </div>
              </div>

              {isOwner && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    Save Business Profile
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATED STOCK ALERTS & NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-700 leading-relaxed">
              <div className="font-bold text-slate-900 text-sm mb-0.5">
                Automated Reorder Level Alert Engine
              </div>
              ShopManager360 continuously monitors your stock inventory during stock out dispatches, customer sales, and count reconciliations. Whenever any spare part's physical balance drops to or below its configured <strong>Reorder Level</strong>, alerts are immediately broadcast across desktop notifications, sound alerts, and automated purchase order emails.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel 1: Desktop Notifications */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Desktop Push Notifications</h3>
                    <p className="text-[11px] text-slate-500">Native browser popups on low stock drops</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      desktopPermission === 'granted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : desktopPermission === 'denied'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Permission: {desktopPermission}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="font-semibold text-xs text-slate-800">Enable Desktop Popups</div>
                  <div className="text-[11px] text-slate-500">
                    Displays on screen even when you are working on other browser tabs
                  </div>
                </div>
                <input
                  id="toggle-desktop-alerts"
                  type="checkbox"
                  checked={notifSettings.desktopAlertsEnabled}
                  onChange={(e) =>
                    handleUpdateNotifSetting('desktopAlertsEnabled', e.target.checked)
                  }
                  className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                {desktopPermission !== 'granted' && (
                  <button
                    id="btn-request-desktop-permission-settings"
                    onClick={handleRequestDesktopPermission}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                  >
                    Request Desktop Permission
                  </button>
                )}
                <button
                  id="btn-test-desktop-alert-settings"
                  onClick={handleTestDesktopNotification}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Test Desktop Popup
                </button>
              </div>
            </div>

            {/* Channel 2: Audio Chime Alert */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Audible Stock Breach Chime</h3>
                    <p className="text-[11px] text-slate-500">Gentle synthesized audio alert on threshold drop</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="font-semibold text-xs text-slate-800">Play Alert Chime</div>
                  <div className="text-[11px] text-slate-500">
                    Self-contained Web Audio melody that plays when safety buffer is breached
                  </div>
                </div>
                <input
                  id="toggle-audio-chime"
                  type="checkbox"
                  checked={notifSettings.audioChimeEnabled}
                  onChange={(e) =>
                    handleUpdateNotifSetting('audioChimeEnabled', e.target.checked)
                  }
                  className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  id="btn-test-audio-chime"
                  onClick={handleTestAudioChime}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Play Test Chime</span>
                </button>
              </div>
            </div>

            {/* Channel 3: Automated Restock Email Notifications */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Automated Restock Email Dispatch</h3>
                    <p className="text-[11px] text-slate-500">
                      Dispatches formatted replenishment purchase orders to your purchasing manager
                    </p>
                  </div>
                </div>

                <button
                  id="btn-trigger-test-alert-full"
                  onClick={handleTriggerTestAlert}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Simulate Restock Email Dispatch</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Alert Recipient Email Address
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="input-settings-email-recipient"
                      type="email"
                      value={notifSettings.emailRecipient}
                      onChange={(e) =>
                        handleUpdateNotifSetting('emailRecipient', e.target.value)
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. doctorshavu@gmail.com"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Defaults to user's configured email (<code className="text-blue-700">doctorshavu@gmail.com</code>).
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">
                      Enable Automated Email Dispatch
                    </span>
                    <input
                      id="toggle-email-alerts"
                      type="checkbox"
                      checked={notifSettings.emailAlertsEnabled}
                      onChange={(e) =>
                        handleUpdateNotifSetting('emailAlertsEnabled', e.target.checked)
                      }
                      className="w-4 h-4 text-emerald-600 rounded-md"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">
                      Alert when stock reaches configured Reorder Level
                    </span>
                    <input
                      id="toggle-reorder-level-alerts"
                      type="checkbox"
                      checked={notifSettings.notifyOnReorderLevel}
                      onChange={(e) =>
                        handleUpdateNotifSetting('notifyOnReorderLevel', e.target.checked)
                      }
                      className="w-4 h-4 text-emerald-600 rounded-md"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">
                      Alert when stock reaches Zero (Out of Stock Emergency)
                    </span>
                    <input
                      id="toggle-zero-stock-alerts"
                      type="checkbox"
                      checked={notifSettings.notifyOnZeroStock}
                      onChange={(e) =>
                        handleUpdateNotifSetting('notifyOnZeroStock', e.target.checked)
                      }
                      className="w-4 h-4 text-rose-600 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Automated Alert Dispatch History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Alert Dispatch & Notification Audit Log</h3>
                <p className="text-xs text-slate-500">
                  Real-time history of all stock breach notifications across Desktop, Email, and In-App channels
                </p>
              </div>

              {notifications.length > 0 && (
                <button
                  id="btn-clear-audit-logs"
                  onClick={() => {
                    if (currentTenant) {
                      store.clearNotifications(currentTenant.id);
                      setNotifications([]);
                      showNotifToast('Alert history cleared.');
                    }
                  }}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                >
                  Clear History
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Dispatched Time</th>
                    <th className="p-3">Item & SKU</th>
                    <th className="p-3">Severity & Stock Remaining</th>
                    <th className="p-3">Channels Dispatched</th>
                    <th className="p-3">Wholesale Supplier</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {notifications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No low stock alerts dispatched yet. All parts are stocked above safety levels.
                      </td>
                    </tr>
                  ) : (
                    notifications.map((n) => {
                      const isOutOfStock = n.currentQuantity === 0;
                      return (
                        <tr key={n.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleString('en-RW', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{n.partName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">SKU: {n.partSku}</div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isOutOfStock
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isOutOfStock ? (
                                <>
                                  <Flame className="w-3 h-3" />
                                  <span>0 {n.unit} Left</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>
                                    {n.currentQuantity} / {n.reorderLevel} {n.unit}
                                  </span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium flex items-center space-x-1"
                                title="Desktop Notification"
                              >
                                <Monitor className="w-2.5 h-2.5" />
                                <span>Desktop</span>
                              </span>
                              <span
                                className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium flex items-center space-x-1"
                                title={`Dispatched to ${n.emailRecipient}`}
                              >
                                <Mail className="w-2.5 h-2.5" />
                                <span>Email</span>
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-slate-800">{n.supplier}</div>
                            <div className="text-[11px] text-blue-600 font-mono">
                              {n.supplierPhone || '+250 Wholesale'}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                id={`btn-view-email-audit-${n.id}`}
                                onClick={() => {
                                  setSelectedNotifForEmail(n);
                                  setIsEmailModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
                              >
                                <Mail className="w-3 h-3" />
                                <span>View Email</span>
                              </button>

                              {onOpenStockIn && (
                                <button
                                  id={`btn-stockin-audit-${n.id}`}
                                  onClick={() => onOpenStockIn(n.partId)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-2xs"
                                >
                                  <PackagePlus className="w-3 h-3" />
                                  <span>Restock</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Restock Email Preview Modal */}
      <RestockEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        notification={selectedNotifForEmail}
        tenant={currentTenant}
        onSendEmail={(rec) => {
          showNotifToast(`Restock email successfully sent to ${rec}!`);
        }}
      />
    </div>
  );
};
