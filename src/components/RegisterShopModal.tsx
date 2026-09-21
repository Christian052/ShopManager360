import React, { useState } from 'react';
import { X, Store, Check, ShieldCheck } from 'lucide-react';
import { PlanType } from '../types';
import { useAuth } from '../context/AuthContext';
import { PRICING_PLANS } from '../data/initialData';
import { formatRwf } from '../utils/i18n';

interface RegisterShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegisterShopModal: React.FC<RegisterShopModalProps> = ({ isOpen, onClose }) => {
  const { registerNewTenant } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<'hardware' | 'garage' | 'pharmacy' | 'general'>('garage');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('trial');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('+250 78');
  const [district, setDistrict] = useState('Nyarugenge');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError('Business name is required.');
      return;
    }
    if (!ownerName.trim()) {
      setError('Owner name is required.');
      return;
    }
    if (!ownerEmail.trim()) {
      setError('Email address is required.');
      return;
    }

    registerNewTenant({
      businessName: businessName.trim(),
      businessType,
      plan: selectedPlan,
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim(),
      ownerPhone: ownerPhone.trim(),
      district,
      address: address.trim() || `${district}, Kigali, Rwanda`,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-500 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Register New Shop / SME Tenant</h2>
              <p className="text-xs text-amber-100">Set up an isolated multi-tenant workspace in under 60 seconds</p>
            </div>
          </div>
          <button onClick={onClose} className="text-amber-100 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Shop / Business Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Musanze Auto Garage & Spares"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Business Type / Industry
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 text-slate-800 bg-white"
              >
                <option value="garage">Auto Garage & Spare Parts</option>
                <option value="hardware">Hardware & Construction Supplies</option>
                <option value="pharmacy">Pharmacy & Medical Dispensary</option>
                <option value="general">General Retail & Electronics</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Owner Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Alexis Habiyambere"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Owner Phone (MTN MoMo / Airtel) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="+250 788 123 456"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 text-slate-800 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Owner Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@mybusiness.rw"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                District / Location (Rwanda)
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 text-slate-800 bg-white"
              >
                <option value="Nyarugenge">Nyarugenge (Nyabugogo / City Center)</option>
                <option value="Gasabo">Gasabo (Kimironko / Kacyiru / Remera)</option>
                <option value="Kicukiro">Kicukiro (Gikondo / Sonatubes / Kanombe)</option>
                <option value="Musanze">Musanze (Northern Province)</option>
                <option value="Rubavu">Rubavu (Gisenyi)</option>
                <option value="Huye">Huye (Southern Province)</option>
                <option value="Rwamagana">Rwamagana (Eastern Province)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Street / Neighborhood Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. KN 7 Rd, Near Nyabugogo Taxi Park"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select Initial Subscription Plan
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PRICING_PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id as PlanType)}
                    className={`cursor-pointer rounded-xl p-3.5 border-2 transition-all relative ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    <h3 className="font-bold text-sm text-slate-800">{plan.name}</h3>
                    <p className="text-xs text-amber-700 font-semibold mt-0.5">
                      {plan.priceRwf === 0 ? 'Free (14 Days)' : `${formatRwf(plan.priceRwf)} / mo`}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {plan.maxUsers > 10 ? 'Unlimited staff' : `Up to ${plan.maxUsers} staff`} •{' '}
                      {(plan.maxItems ?? 999999) > 1000 ? 'Unlimited items' : `${plan.maxItems} items`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">Multi-Tenant Data Isolation Guarantee:</strong> Upon registration, an isolated workspace with unique <code>tenant_id</code> is provisioned with zero risk of cross-tenant data leakage.
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors"
            >
              Launch My Shop Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
