import React, { useState } from 'react';
import {
  ShieldAlert,
  Building,
  Users,
  Package,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  ExternalLink,
  DollarSign,
  Key,
  ShieldCheck,
} from 'lucide-react';
import { Tenant, Subscription, PlanType } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatRwf } from '../utils/i18n';

interface SuperAdminViewProps {
  tenants: Tenant[];
  subscriptions: Subscription[];
  onApproveSubscription: (subscriptionId: string) => void;
  onUpdateTenantStatus: (tenantId: string, status: 'active' | 'suspended' | 'trial') => void;
  onExtendTrial: (subscriptionId: string, days: number) => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  tenants,
  subscriptions,
  onApproveSubscription,
  onUpdateTenantStatus,
  onExtendTrial,
}) => {
  const { switchTenant } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'pending' | 'suspended'>('all');

  // Compute platform metrics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.subscriptionStatus === 'active').length;
  const trialTenants = tenants.filter((t) => t.subscriptionStatus === 'trial').length;
  const suspendedTenants = tenants.filter((t) => t.subscriptionStatus === 'suspended').length;

  // Monthly Recurring Revenue calculation
  const mrrRwf = tenants.reduce((acc, t) => {
    if (t.subscriptionStatus !== 'active') return acc;
    if (t.plan === 'pro') return acc + 30000;
    if (t.plan === 'basic') return acc + 15000;
    return acc;
  }, 0);

  const pendingSubscriptions = subscriptions.filter(
    (s) => s.status === 'pending_verification' || s.status === 'pending'
  );

  const filteredTenants = tenants.filter((t) => {
    if (statusFilter === 'active' && t.subscriptionStatus !== 'active') return false;
    if (statusFilter === 'trial' && t.subscriptionStatus !== 'trial') return false;
    if (statusFilter === 'suspended' && t.subscriptionStatus !== 'suspended') return false;
    if (statusFilter === 'pending') {
      const hasPending = subscriptions.some(
        (s) => s.tenantId === t.id && (s.status === 'pending_verification' || s.status === 'pending')
      );
      if (!hasPending) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.businessName.toLowerCase().includes(q) ||
        (t.ownerName && t.ownerName.toLowerCase().includes(q)) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.phone && t.phone.toLowerCase().includes(q)) ||
        t.district.toLowerCase().includes(q) ||
        t.businessType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Super Admin Top Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              SaaS Provider Platform Operations
            </span>
          </div>
          <h1 className="text-xl font-black mt-1">ShopManager360 Rwanda Master Console</h1>
          <p className="text-xs text-slate-400">
            Global monitoring of all tenant workspaces, subscription renewals, and mobile money collections
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-xs font-bold text-amber-300">
            System Health: 100% Operational
          </span>
        </div>
      </div>

      {/* High-Level SaaS Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Monthly Recurring Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{formatRwf(mrrRwf)}</div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            Active paid subscriptions (Rwanda Market)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total SME Tenants</span>
            <Building className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalTenants} Shops</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {activeTenants} Active • {trialTenants} Trial • {suspendedTenants} Suspended
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Pending MoMo Approvals</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {pendingSubscriptions.length} Receipts
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Requires transaction verification</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Isolation Security</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-2">Enforced</div>
          <p className="text-[11px] text-slate-500 mt-1">Shared DB, Shared Schema with <code>tenant_id</code></p>
        </div>
      </div>

      {/* Pending MoMo Payment Verifications Section */}
      {pendingSubscriptions.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border-2 border-amber-300 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
            <h2 className="text-base font-extrabold text-amber-900">
              Action Required: Pending MTN MoMo / Airtel Money Receipts ({pendingSubscriptions.length})
            </h2>
          </div>
          <p className="text-xs text-amber-800">
            Verify the bank or telco SMS reference against your merchant settlement statement, then click Approve to activate the tenant subscription.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingSubscriptions.map((sub) => {
              const tenant = tenants.find((t) => t.id === sub.tenantId);
              return (
                <div key={sub.id} className="p-4 bg-white rounded-xl border border-amber-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{tenant?.businessName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 uppercase">
                      {sub.plan} Plan
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 font-mono">
                    <div>Provider: <strong className="text-slate-800 font-sans">{sub.paymentProvider || 'MTN MoMo'}</strong></div>
                    <div>Phone: <strong className="text-slate-800">{sub.momoPhone || tenant?.phone}</strong></div>
                    <div>Amount: <strong className="text-emerald-700 font-sans">{formatRwf(sub.amountRwf)}</strong></div>
                    <div>Tx Ref: <strong className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{sub.transactionRef || sub.transactionReference || 'N/A'}</strong></div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      onClick={() => onApproveSubscription(sub.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve & Activate Subscription
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tenant Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Tenant Workspaces Directory</h2>
            <p className="text-xs text-slate-500">Live inventory tenants operating on ShopManager360</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tenant, owner, district..."
                className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            >
              <option value="all">All Statuses ({tenants.length})</option>
              <option value="active">Active Only</option>
              <option value="trial">Trial Only</option>
              <option value="pending">Pending MoMo</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 text-[11px] uppercase">
                <th className="py-3 px-3">Shop / Business</th>
                <th className="py-3 px-3">Industry</th>
                <th className="py-3 px-3">Owner Contact</th>
                <th className="py-3 px-3">District</th>
                <th className="py-3 px-3">Plan & Status</th>
                <th className="py-3 px-4 text-center">Super Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.map((t) => {
                const sub = subscriptions.find((s) => s.tenantId === t.id);

                return (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{t.businessName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{t.id}</div>
                    </td>
                    <td className="py-3 px-3 capitalize text-slate-600">{t.businessType}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{t.ownerName || t.businessName}</div>
                      <div className="text-[11px] text-slate-500">{t.email} • {t.phone}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{t.district}</td>
                    <td className="py-3 px-3">
                      <span className="capitalize font-semibold text-slate-800 block">{t.plan} Plan</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 ${
                          t.subscriptionStatus === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.subscriptionStatus === 'trial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.subscriptionStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => switchTenant(t.id)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Switch into tenant workspace with isolated scope"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </button>

                        {t.subscriptionStatus === 'suspended' ? (
                          <button
                            onClick={() => onUpdateTenantStatus(t.id, 'active')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => onUpdateTenantStatus(t.id, 'suspended')}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold"
                            title="Suspend tenant for non-payment"
                          >
                            Suspend
                          </button>
                        )}

                        {t.subscriptionStatus === 'trial' && sub && (
                          <button
                            onClick={() => onExtendTrial(sub.id, 14)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold"
                            title="Extend trial by 14 days"
                          >
                            +14d Trial
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
