import React from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  BarChart3,
  Users,
  CreditCard,
  ShieldCheck,
  Settings,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  lowStockCount: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  roles: string[];
  badge?: number | string;
  badgeColor?: string;
  highlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, lowStockCount }) => {
  const { currentTenant, currentUser, isSuperAdmin, t } = useAuth();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: t.navDashboard,
      icon: LayoutDashboard,
      roles: ['owner', 'manager', 'staff', 'auditor', 'superadmin'],
    },
    {
      id: 'inventory',
      label: t.navInventory,
      icon: Package,
      roles: ['owner', 'manager', 'staff', 'auditor', 'superadmin'],
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'stock',
      label: t.navStockMovements,
      icon: ArrowLeftRight,
      roles: ['owner', 'manager', 'staff', 'auditor', 'superadmin'],
    },
    {
      id: 'reports',
      label: t.navReports,
      icon: BarChart3,
      roles: ['owner', 'manager', 'auditor', 'superadmin'],
    },
    {
      id: 'team',
      label: t.navTeam,
      icon: Users,
      roles: ['owner', 'superadmin'],
    },
    {
      id: 'billing',
      label: t.navBilling,
      icon: CreditCard,
      roles: ['owner', 'superadmin'],
    },
    {
      id: 'securityTest',
      label: t.navSecurityTest,
      icon: ShieldCheck,
      roles: ['owner', 'manager', 'staff', 'auditor', 'superadmin'],
    },
    {
      id: 'settings',
      label: t.navSettings,
      icon: Settings,
      roles: ['owner', 'superadmin'],
    },
  ];

  // If superadmin, add the dedicated platform console at the top
  const visibleNav = isSuperAdmin
    ? [
        {
          id: 'superAdmin',
          label: 'Platform Console',
          icon: ShieldAlert,
          roles: ['superadmin'],
          highlight: true,
        },
        ...navItems,
      ]
    : navItems.filter((item) => item.roles.includes(currentUser.role));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 shrink-0 min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4">
      <div className="space-y-1">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isHighlight = item.highlight;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? isHighlight
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-amber-500 text-white shadow-xs'
                  : isHighlight
                  ? 'text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isHighlight ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || 'bg-slate-200 text-slate-700'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tenant Status Footer Card */}
      {currentTenant && (
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
              <span className="capitalize">{currentTenant.plan} Plan</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                currentTenant.subscriptionStatus === 'active'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {currentTenant.subscriptionStatus}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {currentTenant.subscriptionStatus === 'trial' ? (
                <span className="flex items-center gap-1 text-amber-700 font-medium">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  Trial active (ends 28 Sep)
                </span>
              ) : (
                'Billed via MTN MoMo / Airtel'
              )}
            </p>
            <button
              onClick={() => onSelectTab('billing')}
              className="mt-2 w-full py-1 text-center text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
            >
              Manage Subscription →
            </button>
          </div>
          <div className="text-[10px] text-slate-400 text-center">
            ShopManager360 v1.0 • Rwanda
          </div>
        </div>
      )}
    </aside>
  );
};
