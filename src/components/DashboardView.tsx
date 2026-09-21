import React from 'react';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DashboardMetrics, SparePart, StockTransaction } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatRwf } from '../utils/i18n';
import { MonthlyStockMovementChart } from './MonthlyStockMovementChart';

interface DashboardViewProps {
  metrics: DashboardMetrics;
  lowStockParts: SparePart[];
  transactions?: StockTransaction[];
  onOpenStockIn: (partId?: string) => void;
  onOpenStockOut: (partId?: string) => void;
  onOpenAdjustment: (partId?: string) => void;
  onOpenAddPart: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  lowStockParts,
  transactions,
  onOpenStockIn,
  onOpenStockOut,
  onOpenAdjustment,
  onOpenAddPart,
  onNavigateTab,
}) => {
  const { currentTenant, currentUser, canManageCatalog, canRecordStock, canViewFinancials, t } = useAuth();

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900">
              {currentTenant?.businessName}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              {currentTenant?.district || 'Kigali, Rwanda'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.role.toUpperCase()}) • Live stock overview & audited movements
          </p>
        </div>

        {canRecordStock && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenStockIn()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <ArrowDownRight className="w-4 h-4" />
              {t.stockIn}
            </button>
            <button
              onClick={() => onOpenStockOut()}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
              {t.stockOut}
            </button>
            {canManageCatalog && (
              <button
                onClick={onOpenAddPart}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t.addPart}
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost Stock Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.totalStockValue}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">
            {canViewFinancials ? formatRwf(metrics.totalCostValue) : '•••••••• RWF'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {canViewFinancials
              ? `Expected Retail: ${formatRwf(metrics.totalRetailValue)}`
              : 'Financial view restricted for Staff'}
          </p>
        </div>

        {/* Total Catalog Items */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.totalItems}
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">
            {metrics.totalItems} Items
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Total count: {metrics.totalQuantity} total units on shelves
          </p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.lowStockAlerts}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-extrabold text-rose-600">
            {metrics.lowStockCount + metrics.outOfStockCount} Items
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics.outOfStockCount} out of stock, {metrics.lowStockCount} below reorder level
          </p>
        </div>

        {/* Today's Stock Movements */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t.todayMovements}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-slate-900">
              +{metrics.todayInCount} / -{metrics.todayOutCount}
            </span>
            <span className="text-xs text-slate-500">units</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Today's Outflow: {canViewFinancials ? formatRwf(metrics.todaySalesVolumeRwf) : 'Restricted'}
          </p>
        </div>
      </div>

      {/* Critical Reorder Alerts Section */}
      {lowStockParts.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 bg-rose-50/70 border-b border-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <div>
                <h2 className="text-sm font-bold text-rose-900">
                  Critical Stock Reorder Notice ({lowStockParts.length} parts need replenishment)
                </h2>
                <p className="text-xs text-rose-700">
                  Parts that have reached or fallen below your threshold limit
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1"
            >
              View All In Catalog <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {lowStockParts.slice(0, 4).map((p) => (
              <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{p.name}</span>
                    <span className="font-mono text-xs text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
                      {p.sku}
                    </span>
                    {p.quantity === 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        OUT OF STOCK
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        LOW ({p.quantity} {p.unit} remaining)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-4">
                    <span>Reorder Level: <strong>{p.reorderLevel} {p.unit}</strong></span>
                    <span>Supplier: <strong>{p.supplier}</strong></span>
                    <span>Location: <strong>{p.shelfLocation || 'Main Bay'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {canRecordStock && (
                    <button
                      onClick={() => onOpenStockIn(p.id)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      Restock Delivery
                    </button>
                  )}
                  {canManageCatalog && (
                    <button
                      onClick={() => onOpenAdjustment(p.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Count
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Stock Movement Trend (Recharts Line Chart) */}
      <MonthlyStockMovementChart
        transactions={transactions || metrics.recentTransactions || []}
        canViewFinancials={canViewFinancials}
        onOpenStockIn={canRecordStock ? () => onOpenStockIn() : undefined}
        onOpenStockOut={canRecordStock ? () => onOpenStockOut() : undefined}
      />

      {/* 2-Column: Recent Transactions & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Audited Movements */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Recent Audited Stock Movements</h2>
              <p className="text-xs text-slate-500">Every transaction is timestamped and tied to staff ID</p>
            </div>
            <button
              onClick={() => onNavigateTab('stock')}
              className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1"
            >
              Full Ledger <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {metrics.recentTransactions.slice(0, 6).map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                      tx.type === 'in'
                        ? 'bg-emerald-100 text-emerald-700'
                        : tx.type === 'out'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {tx.type === 'in' ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : tx.type === 'out' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <SlidersHorizontal className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{tx.partName}</div>
                    <div className="text-[11px] text-slate-500">
                      {tx.reason} • Ref: {tx.referenceNo || 'None'}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`font-bold ${
                    tx.type === 'in'
                      ? 'text-emerald-600'
                      : tx.type === 'out'
                      ? 'text-amber-700'
                      : 'text-sky-700'
                  }`}>
                    {tx.type === 'in' ? `+${tx.quantity}` : tx.type === 'out' ? `-${tx.quantity}` : `Adj to ${tx.newQuantity}`} units
                  </div>
                  <div className="text-[10px] text-slate-400">
                    By {tx.userName} ({tx.userRole})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Category Inventory Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-1">Category Distribution</h2>
            <p className="text-xs text-slate-500 mb-4">Stock value breakdown per department</p>

            <div className="space-y-4">
              {metrics.categoryBreakdown.map((cat, idx) => {
                const totalVal = metrics.totalCostValue || 1;
                const pct = Math.round((cat.totalValueRwf / totalVal) * 100);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{cat.categoryName}</span>
                      <span className="text-slate-500">
                        {canViewFinancials ? formatRwf(cat.totalValueRwf) : `${cat.itemCount} items`} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 bg-amber-50/60 p-4 rounded-xl border border-amber-100">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              SaaS Multi-Tenancy Architecture
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Every query executes with <code>WHERE tenant_id = '{currentTenant?.id}'</code>. Switch demo shops at top to experience instant data isolation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
