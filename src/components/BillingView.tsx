import React, { useState } from 'react';
import {
  CreditCard,
  Phone,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { PlanType, Subscription } from '../types';
import { useAuth } from '../context/AuthContext';
import { PRICING_PLANS } from '../data/initialData';
import { formatRwf } from '../utils/i18n';

interface BillingViewProps {
  subscription: Subscription | null;
  onSubmitMomoPayment: (paymentDetails: {
    plan: PlanType;
    provider: 'MTN MoMo' | 'Airtel Money';
    momoPhone: string;
    transactionReference: string;
    amountRwf: number;
  }) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  subscription,
  onSubmitMomoPayment,
}) => {
  const { currentTenant, isSuperAdmin } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState<PlanType>(
    (currentTenant?.plan as PlanType) || 'basic'
  );
  const [paymentProvider, setPaymentProvider] = useState<'MTN MoMo' | 'Airtel Money'>('MTN MoMo');
  const [momoPhone, setMomoPhone] = useState('+250 78');
  const [txRef, setTxRef] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const selectedPlan = PRICING_PLANS.find((p) => p.id === selectedPlanId) || PRICING_PLANS[1];

  const handleCopyUSSD = () => {
    const code = `*182*8*1*360360*${selectedPlan.priceRwf}#`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txRef.trim()) return;

    onSubmitMomoPayment({
      plan: selectedPlanId,
      provider: paymentProvider,
      momoPhone: momoPhone.trim(),
      transactionReference: txRef.trim(),
      amountRwf: selectedPlan.priceRwf,
    });

    setSubmittedSuccess(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">SaaS Subscription & Rwandan Mobile Money Billing</h1>
          <p className="text-xs text-slate-500">
            Localized monthly subscription engine supporting MTN Mobile Money and Airtel Money for {currentTenant?.businessName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 capitalize flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            Current Tier: {currentTenant?.plan.toUpperCase()} ({currentTenant?.subscriptionStatus})
          </span>
        </div>
      </div>

      {/* Subscription Active Status Banner */}
      <div className="p-6 bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl text-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
              Subscription Status
            </span>
            <h2 className="text-xl font-extrabold capitalize">
              {currentTenant?.businessName} — {currentTenant?.plan} Plan
            </h2>
            <p className="text-xs text-amber-100">
              {currentTenant?.subscriptionStatus === 'trial' ? (
                <>14-day Free Trial active. Ends on <strong>{currentTenant?.trialEndsAt?.slice(0, 10) || '28 Sep 2026'}</strong>.</>
              ) : subscription?.status === 'pending_verification' || subscription?.status === 'pending' ? (
                <>Payment receipt submitted via MoMo. Waiting for platform verification.</>
              ) : (
                <>Next monthly renewal billing due on <strong>{subscription?.endDate?.slice(0, 10) || '21 Oct 2026'}</strong>.</>
              )}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs px-4 py-3 rounded-xl border border-white/20 text-right">
            <div className="text-[11px] text-amber-200 uppercase font-bold">Monthly Fee</div>
            <div className="text-2xl font-black">
              {selectedPlan.priceRwf === 0 ? 'FREE' : formatRwf(selectedPlan.priceRwf)}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Tier Selection */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-800">Select Subscription Tier</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICING_PLANS.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isCurrent = currentTenant?.plan === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id as PlanType)}
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
                  isSelected
                    ? 'border-amber-600 bg-amber-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 right-4 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-900 text-white uppercase">
                    Your Active Plan
                  </span>
                )}
                <h3 className="font-extrabold text-base text-slate-900">{plan.name}</h3>
                <div className="text-xl font-black text-amber-700 mt-2">
                  {plan.priceRwf === 0 ? '0 RWF' : `${formatRwf(plan.priceRwf)}`}
                  <span className="text-xs font-normal text-slate-500"> / month</span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 text-xs space-y-2 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Staff Accounts:</span>
                    <strong className="text-slate-800">
                      {plan.maxUsers > 10 ? 'Unlimited' : `Up to ${plan.maxUsers}`}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Catalog Items:</span>
                    <strong className="text-slate-800">
                      {(plan.maxItems ?? 999999) > 1000 ? 'Unlimited' : `Up to ${plan.maxItems}`}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Financial Reports:</span>
                    <strong className="text-slate-800">
                      {plan.id === 'trial' ? 'Basic' : 'Full Valuation'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Audit Trail Log:</span>
                    <strong className="text-slate-800">
                      {plan.id === 'pro' ? 'Detailed RBAC' : plan.id === 'basic' ? 'Standard' : 'None'}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                    isSelected
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isSelected ? 'Selected' : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rwandan MoMo / Airtel Payment Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Pay via Mobile Money (MTN MoMo or Airtel Money Rwanda)
          </h2>
          <p className="text-xs text-slate-500">
            SaaS v1 uses merchant code verification. Dial the USSD code on your phone, then enter your transaction reference below.
          </p>
        </div>

        {submittedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-sm">Payment reference submitted successfully!</strong>
              <p className="mt-0.5">
                Reference <strong>{txRef}</strong> is queued for verification. The Super Admin team activates renewals within 15 minutes.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* USSD Dial Guide */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Step 1: Dial Merchant USSD</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPaymentProvider('MTN MoMo')}
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    paymentProvider === 'MTN MoMo' ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  MTN MoMo
                </button>
                <button
                  onClick={() => setPaymentProvider('Airtel Money')}
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    paymentProvider === 'Airtel Money' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  Airtel Money
                </button>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-xs space-y-1">
              <div className="text-slate-500">ShopManager360 Merchant Code:</div>
              <div className="text-base font-bold text-slate-900 flex items-center justify-between">
                <span>*182*8*1*360360*{selectedPlan.priceRwf}#</span>
                <button
                  onClick={handleCopyUSSD}
                  className="text-xs font-sans text-amber-700 hover:text-amber-800 flex items-center gap-1 font-semibold"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4">
              <li>Dial the merchant USSD code on your Rwandan phone.</li>
              <li>Confirm payee name: <strong>ShopManager360 Ltd (Kigali)</strong>.</li>
              <li>Enter your MoMo PIN and confirm payment of <strong>{formatRwf(selectedPlan.priceRwf)}</strong>.</li>
              <li>Wait for the confirmation SMS with transaction ID (e.g. <code>TXN-984210</code>).</li>
            </ol>
          </div>

          {/* Verification Form */}
          <form onSubmit={handlePaymentSubmit} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase block">
              Step 2: Enter Transaction SMS Receipt
            </span>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Mobile Money Phone Number
              </label>
              <input
                type="text"
                value={momoPhone}
                onChange={(e) => setMomoPhone(e.target.value)}
                placeholder="+250 788 123 456"
                className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MTN / Airtel Transaction ID or SMS Reference
              </label>
              <input
                type="text"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                placeholder="e.g. MOMO-RW-841920 or MP260921.1402"
                className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-mono"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                Submit Verification for {selectedPlan.name} ({formatRwf(selectedPlan.priceRwf)})
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Super Admin console verifies payment against the telco settlement API and activates account instantly.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
