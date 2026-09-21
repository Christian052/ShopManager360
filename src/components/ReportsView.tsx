import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  DollarSign,
  AlertTriangle,
  Package,
  Layers,
  Phone,
  Mail,
  ShieldAlert,
  FileDown,
  FileText,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { SparePart, StockTransaction, Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatRwf } from '../utils/i18n';
import { ExportPdfModal } from './ExportPdfModal';
import { exportInventoryAndTransactionsPdf } from '../utils/pdfExport';

interface ReportsViewProps {
  parts: SparePart[];
  transactions: StockTransaction[];
  categories: Category[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ parts, transactions, categories }) => {
  const { currentTenant, currentUser, canViewFinancials } = useAuth();
  const [activeReportTab, setActiveReportTab] = useState<'valuation' | 'reorder' | 'movements' | 'categories'>('valuation');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Quick 1-click export of full audit (both inventory & transactions)
  const handleQuickFullPdfExport = () => {
    try {
      const filename = exportInventoryAndTransactionsPdf(
        parts,
        transactions,
        categories,
        currentTenant,
        currentUser,
        {
          includeInventory: true,
          includeTransactions: true,
          includeSummaryKpis: true,
          reportTitle: 'Inventory Valuation & Stock Movement Audit',
          notes: 'Full store inventory valuation and transaction movement audit document',
        }
      );
      showToast(`Exported complete audit report: ${filename}`);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Quick export of current inventory only
  const handleExportInventoryOnlyPdf = () => {
    try {
      const filename = exportInventoryAndTransactionsPdf(
        parts,
        transactions,
        categories,
        currentTenant,
        currentUser,
        {
          includeInventory: true,
          includeTransactions: false,
          includeSummaryKpis: true,
          reportTitle: 'Current Inventory Catalog & Valuation Sheet',
          notes: 'Physical shelf inventory count and valuation breakdown',
        }
      );
      showToast(`Exported inventory valuation: ${filename}`);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Quick export of transactions only
  const handleExportTransactionsOnlyPdf = () => {
    try {
      const filename = exportInventoryAndTransactionsPdf(
        parts,
        transactions,
        categories,
        currentTenant,
        currentUser,
        {
          includeInventory: false,
          includeTransactions: true,
          includeSummaryKpis: true,
          reportTitle: 'Stock Movement & Transaction Logs Audit Trail',
          notes: 'Complete log of deliveries, sales dispatches, and adjustments',
        }
      );
      showToast(`Exported transaction logs: ${filename}`);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Quick export of reorder sheet
  const handleExportReorderPdf = () => {
    try {
      const filename = exportInventoryAndTransactionsPdf(
        parts,
        transactions,
        categories,
        currentTenant,
        currentUser,
        {
          includeInventory: true,
          includeTransactions: false,
          includeSummaryKpis: true,
          inventoryStatusFilter: 'low',
          reportTitle: 'Supplier Replenishment Purchase Order Sheet',
          notes: 'Catalog items currently below minimum stock threshold',
        }
      );
      showToast(`Exported supplier reorder sheet: ${filename}`);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Valuation computations
  const totalCostValue = parts.reduce((acc, p) => acc + p.costPrice * p.quantity, 0);
  const totalRetailValue = parts.reduce((acc, p) => acc + p.sellPrice * p.quantity, 0);
  const expectedGrossProfit = totalRetailValue - totalCostValue;
  const overallMarginPct = totalRetailValue > 0 ? Math.round((expectedGrossProfit / totalRetailValue) * 100) : 0;

  // Reorder list
  const reorderList = parts.filter((p) => p.quantity <= p.reorderLevel);

  // Movements summary
  const inTransactions = transactions.filter((t) => t.type === 'in');
  const outTransactions = transactions.filter((t) => t.type === 'out');
  const totalInQty = inTransactions.reduce((acc, t) => acc + t.quantity, 0);
  const totalOutQty = outTransactions.reduce((acc, t) => acc + t.quantity, 0);
  const totalInValue = inTransactions.reduce((acc, t) => acc + t.totalValue, 0);
  const totalOutValue = outTransactions.reduce((acc, t) => acc + t.totalValue, 0);

  // Category breakdown
  const categoryStats = categories.map((cat) => {
    const catParts = parts.filter((p) => p.categoryId === cat.id);
    const catCost = catParts.reduce((acc, p) => acc + p.costPrice * p.quantity, 0);
    const catRetail = catParts.reduce((acc, p) => acc + p.sellPrice * p.quantity, 0);
    const catQty = catParts.reduce((acc, p) => acc + p.quantity, 0);
    return {
      name: cat.name,
      itemCount: catParts.length,
      totalUnits: catQty,
      costValue: catCost,
      retailValue: catRetail,
      profit: catRetail - catCost,
      margin: catRetail > 0 ? Math.round(((catRetail - catCost) / catRetail) * 100) : 0,
    };
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-[11px] font-bold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Inventory Valuation & Business Reports</h1>
          <p className="text-xs text-slate-500">
            Financial analytics, supplier reorder sheets, and movement velocity for {currentTenant?.businessName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick 1-click Export Full Audit */}
          <button
            onClick={handleQuickFullPdfExport}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Immediately export formatted PDF with inventory and transaction logs"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            Quick Audit PDF
          </button>

          {/* Export to PDF (customizable options dialog) */}
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Customize report scope, filters, orientation, and notes"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export to PDF
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveReportTab('valuation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeReportTab === 'valuation'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          1. Valuation & Margins
        </button>
        <button
          onClick={() => setActiveReportTab('reorder')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeReportTab === 'reorder'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          2. Supplier Reorder Sheet
          {reorderList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
              {reorderList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveReportTab('movements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeReportTab === 'movements'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          3. Movement Velocity
        </button>
        <button
          onClick={() => setActiveReportTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeReportTab === 'categories'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          4. Category Performance
        </button>
      </div>

      {/* Tab 1: Valuation & Margins */}
      {activeReportTab === 'valuation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Inventory Cost Basis
              </span>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {canViewFinancials ? formatRwf(totalCostValue) : '•••••••• RWF'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Capital currently tied up on shelves</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Expected Retail Revenue
              </span>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {canViewFinancials ? formatRwf(totalRetailValue) : '•••••••• RWF'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">If all current shelf items are sold at list price</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Expected Gross Profit
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-2">
                {canViewFinancials ? formatRwf(expectedGrossProfit) : '•••••••• RWF'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Gross markup profit before operating costs</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Average Catalog Margin
              </span>
              <div className="text-2xl font-black text-amber-600 mt-2">
                {canViewFinancials ? `${overallMarginPct}%` : '••••'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Healthy SME target: 25% - 40%</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Item-by-Item Valuation Breakdown</h3>
                <p className="text-xs text-slate-500">Capital tied up per spare part and expected gross markup returns</p>
              </div>
              <button
                onClick={handleExportInventoryOnlyPdf}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-600" />
                Export Valuation (PDF)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                    <th className="py-2.5">Spare Part</th>
                    <th className="py-2.5 text-center">Shelf Stock</th>
                    <th className="py-2.5 text-right">Unit Cost</th>
                    <th className="py-2.5 text-right">Total Cost Value</th>
                    <th className="py-2.5 text-right">Unit Selling</th>
                    <th className="py-2.5 text-right">Total Selling Value</th>
                    <th className="py-2.5 text-right">Expected Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parts.map((p) => {
                    const itemCostVal = p.costPrice * p.quantity;
                    const itemRetailVal = p.sellPrice * p.quantity;
                    const itemProfit = itemRetailVal - itemCostVal;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="py-2 font-medium text-slate-800">
                          {p.name} <span className="font-mono text-[10px] text-slate-400">({p.sku})</span>
                        </td>
                        <td className="py-2 text-center">
                          {p.quantity} {p.unit}
                        </td>
                        <td className="py-2 text-right">{formatRwf(p.costPrice)}</td>
                        <td className="py-2 text-right font-medium">{formatRwf(itemCostVal)}</td>
                        <td className="py-2 text-right">{formatRwf(p.sellPrice)}</td>
                        <td className="py-2 text-right font-medium">{formatRwf(itemRetailVal)}</td>
                        <td className="py-2 text-right font-bold text-emerald-600">
                          {formatRwf(itemProfit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Reorder Sheet */}
      {activeReportTab === 'reorder' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Supplier Replenishment Purchase Order Sheet</h2>
              <p className="text-xs text-slate-500">
                Generated automatically from parts that are below reorder minimums
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                {reorderList.length} items require ordering
              </span>
              <button
                onClick={handleExportReorderPdf}
                disabled={reorderList.length === 0}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Export low-stock parts directly to a formatted PDF order sheet"
              >
                <FileDown className="w-3.5 h-3.5" />
                Export Reorder Sheet (PDF)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 text-[11px] uppercase">
                  <th className="py-3 px-3">Item / SKU</th>
                  <th className="py-3 px-3 text-center">Current Qty</th>
                  <th className="py-3 px-3 text-center">Threshold</th>
                  <th className="py-3 px-3 text-center">Suggested Order</th>
                  <th className="py-3 px-3 text-right">Est. Cost (RWF)</th>
                  <th className="py-3 px-3">Supplier Name & Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reorderList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      All catalog items are currently above their reorder thresholds!
                    </td>
                  </tr>
                ) : (
                  reorderList.map((p) => {
                    const suggestedQty = Math.max(p.reorderLevel * 2 - p.quantity, 5);
                    const estCost = suggestedQty * p.costPrice;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{p.name}</div>
                          <div className="font-mono text-[11px] text-slate-500">{p.sku}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-rose-600">
                          {p.quantity} {p.unit}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500">
                          {p.reorderLevel} {p.unit}
                        </td>
                        <td className="py-3 px-3 text-center font-extrabold text-amber-700">
                          {suggestedQty} {p.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-medium">
                          {formatRwf(estCost)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{p.supplier}</div>
                          <div className="text-[11px] text-slate-500">
                            {p.supplierPhone ? `Tel: ${p.supplierPhone}` : 'Kigali Local Wholesale'}
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
      )}

      {/* Tab 3: Movement Velocity */}
      {activeReportTab === 'movements' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Inbound Delivery Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <div>
                  <span className="text-xs text-slate-500 block">Total Units Received</span>
                  <span className="text-xl font-black text-emerald-800">+{totalInQty} units</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Total Inbound Spend</span>
                  <span className="text-xl font-black text-emerald-800">{formatRwf(totalInValue)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Based on {inTransactions.length} recorded supplier restock events.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                Outbound Sales & Usage Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                <div>
                  <span className="text-xs text-slate-500 block">Total Units Dispatched</span>
                  <span className="text-xl font-black text-amber-800">-{totalOutQty} units</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Total Outbound Volume</span>
                  <span className="text-xl font-black text-amber-800">{formatRwf(totalOutValue)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Based on {outTransactions.length} customer sales and garage installations.
              </p>
            </div>
          </div>

          {/* Chronological Transaction Movement Audit Trail */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Stock Movement & Transaction Logs</h3>
                <p className="text-xs text-slate-500">
                  Chronological audit trail of all restocks, customer dispatches, and physical inventory reconciliations
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportTransactionsOnlyPdf}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Export transaction movement logs to formatted PDF"
                >
                  <FileDown className="w-3.5 h-3.5 text-amber-400" />
                  Export Transaction Logs (PDF)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 text-[11px] uppercase">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3">Part Name & SKU</th>
                    <th className="py-2.5 px-3 text-right">Qty Changed</th>
                    <th className="py-2.5 px-3 text-center">Balance</th>
                    <th className="py-2.5 px-3 text-right">Total Value</th>
                    <th className="py-2.5 px-3">Performed By</th>
                    <th className="py-2.5 px-3">Reason / Ref #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.slice(0, 50).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {new Date(t.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        <span className="text-slate-400">
                          {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            t.type === 'in'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.type === 'out'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {t.type === 'in' ? 'Stock In' : t.type === 'out' ? 'Stock Out' : 'Adjustment'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{t.partName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{t.partSku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <span
                          className={
                            t.type === 'in'
                              ? 'text-emerald-600'
                              : t.type === 'out'
                              ? 'text-rose-600'
                              : 'text-blue-600'
                          }
                        >
                          {t.type === 'in' ? `+${t.quantity}` : t.type === 'out' ? `-${t.quantity}` : `=${t.quantity}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500">
                        {t.previousQuantity} → {t.newQuantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                        {formatRwf(t.totalValue)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        <span className="font-medium">{t.userName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate">
                        <div>{t.reason}</div>
                        {t.referenceNo && (
                          <div className="font-mono text-[10px] text-slate-400">Ref: {t.referenceNo}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Category Performance */}
      {activeReportTab === 'categories' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <h2 className="text-base font-bold text-slate-800 mb-4">Category Valuation & Margin Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 text-[11px] uppercase">
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">Items Registered</th>
                  <th className="py-3 px-3 text-center">Shelf Units</th>
                  <th className="py-3 px-3 text-right">Cost Value</th>
                  <th className="py-3 px-3 text-right">Retail Potential</th>
                  <th className="py-3 px-3 text-right">Gross Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoryStats.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-semibold text-slate-800">{c.name}</td>
                    <td className="py-3 px-3 text-center">{c.itemCount}</td>
                    <td className="py-3 px-3 text-center">{c.totalUnits}</td>
                    <td className="py-3 px-3 text-right font-medium">{formatRwf(c.costValue)}</td>
                    <td className="py-3 px-3 text-right font-medium">{formatRwf(c.retailValue)}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600">{c.margin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export PDF Modal */}
      <ExportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        parts={parts}
        transactions={transactions}
        categories={categories}
        tenant={currentTenant}
        currentUser={currentUser}
        onExportSuccess={(filename) => {
          showToast(`Exported formatted PDF document: ${filename}`);
        }}
      />
    </div>
  );
};
