import React, { useState } from 'react';
import {
  Store,
  ChevronDown,
  UserCheck,
  Globe,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Shield,
  CreditCard,
  Building,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Language } from '../utils/i18n';
import { StockAlertNotification } from '../types';
import { NotificationCenterDropdown } from './NotificationCenterDropdown';

interface NavbarProps {
  onOpenStockIn: (partId?: string) => void;
  onOpenStockOut: () => void;
  onOpenRegisterShop: () => void;
  onNavigateTab: (tab: string) => void;
  notifications: StockAlertNotification[];
  onMarkNotificationAsRead: (id: string) => void;
  onMarkAllNotificationsAsRead: () => void;
  onClearNotifications: () => void;
  onViewRestockEmail: (notification: StockAlertNotification) => void;
  onTriggerTestAlert: () => void;
  onOpenScanner?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenStockIn,
  onOpenStockOut,
  onOpenRegisterShop,
  onNavigateTab,
  notifications,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onClearNotifications,
  onViewRestockEmail,
  onTriggerTestAlert,
  onOpenScanner,
}) => {
  const {
    currentTenant,
    currentUser,
    allTenants,
    language,
    setLanguage,
    t,
    switchUser,
    switchTenant,
    isSuperAdmin,
    canRecordStock,
  } = useAuth();

  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const demoUsers = [
    {
      id: 'user-jc-mugisha',
      name: 'Jean-Claude Mugisha',
      role: 'Owner',
      shop: 'Kigali Auto Spares',
      type: 'garage',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      id: 'user-aline-uwase',
      name: 'Aline Uwase',
      role: 'Manager',
      shop: 'Kigali Auto Spares',
      type: 'garage',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    {
      id: 'user-eric-nshimiye',
      name: 'Eric Nshimiyimana',
      role: 'Staff / Cashier',
      shop: 'Kigali Auto Spares',
      type: 'garage',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    {
      id: 'user-grace-umutoni',
      name: 'Grace Umutoni',
      role: 'Auditor',
      shop: 'Kigali Auto Spares',
      type: 'garage',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    },
    {
      id: 'user-pascal-habimana',
      name: 'Pascal Habimana',
      role: 'Owner',
      shop: 'Kigali Hardware Hub',
      type: 'hardware',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      id: 'user-chantal-mukamana',
      name: 'Dr. Chantal Mukamana',
      role: 'Owner (Trial Plan)',
      shop: 'PharmaVie Pharmacy',
      type: 'pharmacy',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    },
    {
      id: 'user-superadmin',
      name: 'Christisn (Platform Lead)',
      role: 'Super Admin',
      shop: 'ShopManager360 SaaS Console',
      type: 'platform',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand & Market Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                  ShopManager<span className="text-amber-600">360</span>
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wide">
                  Rwanda SME SaaS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Multi-Tenant Spare & Inventory Engine
              </p>
            </div>
          </div>

          {/* Center: Tenant Switcher Dropdown */}
          <div className="relative">
            {isSuperAdmin ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Super Admin Console • All Tenants Scoped</span>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowTenantDropdown(!showTenantDropdown);
                    setShowRoleDropdown(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-800"
                >
                  <Building className="w-3.5 h-3.5 text-amber-600" />
                  <span className="max-w-[160px] sm:max-w-[220px] truncate">
                    {currentTenant?.businessName}
                  </span>
                  <span className="capitalize text-[10px] px-1.5 py-0.2 bg-white rounded border border-slate-200 text-slate-500 hidden md:inline">
                    {currentTenant?.businessType}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {showTenantDropdown && (
                  <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Switch Business Tenant (Data Isolated)
                    </div>
                    {allTenants.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          switchTenant(t.id);
                          setShowTenantDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between transition-colors ${
                          currentTenant?.id === t.id ? 'bg-amber-50/70 font-semibold text-amber-900' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-800">{t.businessName}</div>
                          <div className="text-[11px] text-slate-500">{t.district} • {t.plan.toUpperCase()} Plan</div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                          t.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.subscriptionStatus}
                        </span>
                      </button>
                    ))}
                    <div className="pt-2 mt-2 border-t border-slate-100 px-3">
                      <button
                        onClick={() => {
                          setShowTenantDropdown(false);
                          onOpenRegisterShop();
                        }}
                        className="w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        + Register New Rwandan Shop
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Actions: Quick Stock In/Out + Demo Switcher + Language */}
          <div className="flex items-center gap-2">
            {canRecordStock && !isSuperAdmin && (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={() => onOpenStockIn()}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                  title="Record Supplier Delivery"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>{t.stockIn}</span>
                </button>
                <button
                  onClick={onOpenStockOut}
                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                  title="Record Customer Sale / Usage"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{t.stockOut}</span>
                </button>
                {onOpenScanner && (
                  <button
                    id="btn-navbar-scan-barcode"
                    onClick={onOpenScanner}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                    title="Scan Barcode via Camera"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden md:inline">Scan</span>
                  </button>
                )}
              </div>
            )}

            {/* Notification Center Dropdown (Low Stock & Desktop Alerts) */}
            {!isSuperAdmin && (
              <NotificationCenterDropdown
                notifications={notifications}
                onMarkAsRead={onMarkNotificationAsRead}
                onMarkAllAsRead={onMarkAllNotificationsAsRead}
                onClearAll={onClearNotifications}
                onStockIn={(partId) => onOpenStockIn(partId)}
                onViewEmail={onViewRestockEmail}
                onOpenSettings={() => onNavigateTab('settings')}
                onTriggerTestAlert={onTriggerTestAlert}
              />
            )}

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setLanguage('en')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  language === 'en' ? 'bg-white shadow-2xs text-slate-800' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('rw')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  language === 'rw' ? 'bg-white shadow-2xs text-slate-800' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Ikinyarwanda"
              >
                RW
              </button>
              <button
                onClick={() => setLanguage('fr')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  language === 'fr' ? 'bg-white shadow-2xs text-slate-800' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Français"
              >
                FR
              </button>
            </div>

            {/* Demo Persona / RBAC Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowRoleDropdown(!showRoleDropdown);
                  setShowTenantDropdown(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 transition-colors text-xs text-slate-800"
              >
                <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                  {currentUser.name.slice(0, 2)}
                </div>
                <div className="text-left hidden md:block">
                  <div className="font-semibold text-slate-800 leading-tight">
                    {currentUser.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-amber-700 font-bold uppercase leading-tight">
                    {currentUser.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Current User & RBAC Persona
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {currentUser.name} ({currentUser.email})
                    </span>
                  </div>

                  <div className="px-3 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                    1-Click Demo Personas (Test Roles & Isolation):
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {demoUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between transition-colors ${
                          currentUser.id === u.id ? 'bg-amber-50/60 font-semibold' : ''
                        }`}
                      >
                        <div>
                          <div className="font-medium text-slate-800">{u.name}</div>
                          <div className="text-[10px] text-slate-500">{u.shop}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${u.badgeColor}`}>
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100 px-3">
                    <button
                      onClick={() => {
                        setShowRoleDropdown(false);
                        onNavigateTab('securityTest');
                      }}
                      className="w-full py-1.5 px-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      Run Tenant Isolation Security Suite
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
