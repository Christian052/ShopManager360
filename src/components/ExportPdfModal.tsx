import React, { useState } from 'react';
import {
  X,
  FileDown,
  FileText,
  CheckCircle2,
  Filter,
  SlidersHorizontal,
  Building2,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Info,
  Check,
} from 'lucide-react';
import { SparePart, StockTransaction, Category, Tenant, User } from '../types';
import { formatRwf } from '../utils/i18n';
import { exportInventoryAndTransactionsPdf, PdfExportOptions } from '../utils/pdfExport';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SparePart[];
  transactions: StockTransaction[];
  categories: Category[];
  tenant: Tenant | null;
  currentUser: User | null;
  onExportSuccess?: (filename: string) => void;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  parts,
  transactions,
  categories,
  tenant,
  currentUser,
  onExportSuccess,
}) => {
  // Config state
  const [includeInventory, setIncludeInventory] = useState(true);
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [includeSummaryKpis, setIncludeSummaryKpis] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'in' | 'out' | 'adjustment'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '7days' | '30days' | 'thisMonth'>('all');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [reportTitle, setReportTitle] = useState('Inventory Valuation & Stock Movement Audit');
  const [notes, setNotes] = useState('Official store inventory reconciliation & stock movement audit report');
  const [isExporting, setIsExporting] = useState(false);
  const [successFilename, setSuccessFilename] = useState<string | null>(null);

  if (!isOpen) return null;

  // Preset handlers
  const applyPreset = (preset: 'full' | 'inventory' | 'movements' | 'reorder') => {
    if (preset === 'full') {
      setIncludeInventory(true);
      setIncludeTransactions(true);
      setIncludeSummaryKpis(true);
      setCategoryFilter('all');
      setStockStatusFilter('all');
      setTransactionTypeFilter('all');
      setDateRangeFilter('all');
      setReportTitle('Inventory Valuation & Stock Movement Audit');
      setNotes('Official store inventory reconciliation & stock movement audit report');
    } else if (preset === 'inventory') {
      setIncludeInventory(true);
      setIncludeTransactions(false);
      setIncludeSummaryKpis(true);
      setCategoryFilter('all');
      setStockStatusFilter('all');
      setReportTitle('Current Inventory Catalog & Valuation Sheet');
      setNotes('Complete list of physical stock and shelf valuation');
    } else if (preset === 'movements') {
      setIncludeInventory(false);
      setIncludeTransactions(true);
      setIncludeSummaryKpis(true);
      setTransactionTypeFilter('all');
      setDateRangeFilter('all');
      setReportTitle('Stock Movement & Transaction Audit Trail');
      setNotes('Complete inbound restock and outbound dispatch transaction history');
    } else if (preset === 'reorder') {
      setIncludeInventory(true);
      setIncludeTransactions(false);
      setIncludeSummaryKpis(true);
      setCategoryFilter('all');
      setStockStatusFilter('low');
      setReportTitle('Supplier Replenishment & Reorder Order Sheet');
      setNotes('Urgent reorder items currently below minimum stock threshold');
    }
  };

  // Preview counts based on current filters
  let filteredParts = parts;
  if (categoryFilter !== 'all') {
    filteredParts = filteredParts.filter((p) => p.categoryId === categoryFilter);
  }
  if (stockStatusFilter === 'low') {
    filteredParts = filteredParts.filter((p) => p.quantity > 0 && p.quantity <= p.reorderLevel);
  } else if (stockStatusFilter === 'out') {
    filteredParts = filteredParts.filter((p) => p.quantity <= 0);
  }

  let filteredTransactions = transactions;
  if (transactionTypeFilter !== 'all') {
    filteredTransactions = filteredTransactions.filter((t) => t.type === transactionTypeFilter);
  }
  if (dateRangeFilter !== 'all') {
    const now = new Date();
    filteredTransactions = filteredTransactions.filter((t) => {
      const txDate = new Date(t.createdAt);
      if (dateRangeFilter === '7days') {
        return txDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      if (dateRangeFilter === '30days') {
        return txDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      if (dateRangeFilter === 'thisMonth') {
        return (
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }

  const estInventoryValue = filteredParts.reduce((acc, p) => acc + p.costPrice * p.quantity, 0);

  const handleGeneratePdf = () => {
    setIsExporting(true);
    setSuccessFilename(null);

    try {
      const options: PdfExportOptions = {
        includeInventory,
        includeTransactions,
        includeSummaryKpis,
        inventoryCategoryFilter: categoryFilter,
        inventoryStatusFilter: stockStatusFilter,
        transactionTypeFilter,
        dateRangeFilter,
        reportTitle: reportTitle.trim() || 'Inventory & Transaction Audit',
        notes: notes.trim(),
        orientation,
      };

      const filename = exportInventoryAndTransactionsPdf(
        parts,
        transactions,
        categories,
        tenant,
        currentUser,
        options
      );

      setSuccessFilename(filename);
      if (onExportSuccess) {
        onExportSuccess(filename);
      }
      setTimeout(() => {
        setIsExporting(false);
      }, 500);
    } catch (err: any) {
      console.error('PDF Generation failed:', err);
      setIsExporting(false);
    }
  };

  return (
    <div
      id="export-pdf-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="export-pdf-modal"
        className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Export Formatted PDF Audit Document</h2>
              <p className="text-xs text-slate-500">
                Official Rwanda SME printable document for inventory valuation & transactions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Presets */}
          <div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Quick Report Presets
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('full')}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                  includeInventory && includeTransactions && stockStatusFilter === 'all'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-amber-700">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="font-bold">Full Audit</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Catalog + All Transaction Logs</p>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('inventory')}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                  includeInventory && !includeTransactions && stockStatusFilter === 'all'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-slate-800">
                  <Layers className="w-3.5 h-3.5" />
                  <span className="font-bold">Inventory Only</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Valuation & Shelf Quantities</p>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('movements')}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                  !includeInventory && includeTransactions
                    ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-emerald-700">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span className="font-bold">Movements</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Stock In, Out & Adjustments</p>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('reorder')}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                  includeInventory && stockStatusFilter === 'low'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-900 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-rose-700">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="font-bold">Reorder Sheet</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Low Stock Parts for Suppliers</p>
              </button>
            </div>
          </div>

          {/* Report Sections to Include */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Sections to Include in Document
            </span>

            <div className="space-y-2.5">
              <label className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeInventory}
                  onChange={(e) => setIncludeInventory(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Current Inventory Catalog Table</span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {filteredParts.length} parts ({estInventoryValue > 0 ? formatRwf(estInventoryValue) : '0 RWF'})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Itemizes SKU, part name, shelf location, stock on hand, unit cost, retail price, and stock status.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeTransactions}
                  onChange={(e) => setIncludeTransactions(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Stock Movement & Transaction Logs Table</span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {filteredTransactions.length} transaction entries
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Chronological audit trail of deliveries (Stock In), sales (Stock Out), physical count adjustments, and author staff member.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeSummaryKpis}
                  onChange={(e) => setIncludeSummaryKpis(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Executive Summary & Financial KPI Cards</span>
                    <span className="text-[11px] font-semibold text-emerald-600">Recommended</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Visual metric cards highlighting Total Valuation, Expected Retail Gross Margin, Low Stock alerts, and Inbound spend.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Filtering & Layout Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Inventory Category Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filter Inventory by Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                disabled={!includeInventory}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="all">All Categories ({parts.length} parts)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({parts.filter((p) => p.categoryId === c.id).length} parts)
                  </option>
                ))}
              </select>
            </div>

            {/* Inventory Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filter Inventory Stock Status
              </label>
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                disabled={!includeInventory}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="all">All Stock Statuses</option>
                <option value="low">Low Stock Only (At or below reorder level)</option>
                <option value="out">Out of Stock Only (0 units)</option>
              </select>
            </div>

            {/* Transaction Type Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filter Transaction Type
              </label>
              <select
                value={transactionTypeFilter}
                onChange={(e) => setTransactionTypeFilter(e.target.value as any)}
                disabled={!includeTransactions}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="all">All Movement Types (In, Out, Adjustments)</option>
                <option value="in">Deliveries / Stock In Only</option>
                <option value="out">Sales / Stock Out Only</option>
                <option value="adjustment">Physical Count Adjustments Only</option>
              </select>
            </div>

            {/* Transaction Date Range Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Date Period
              </label>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value as any)}
                disabled={!includeTransactions}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="all">All Time Records ({transactions.length})</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="thisMonth">Current Month</option>
              </select>
            </div>
          </div>

          {/* Orientation & Document Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Page Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`py-2 px-2 text-center rounded-xl text-xs font-bold border transition-colors ${
                    orientation === 'portrait'
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`py-2 px-2 text-center rounded-xl text-xs font-bold border transition-colors ${
                    orientation === 'landscape'
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Landscape
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Header Title
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                placeholder="e.g. Month-End Stock Audit"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Auditor Remarks / Notes (Printed in PDF header box)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              placeholder="e.g. Verified by Store Manager for Rwanda Revenue Authority compliance"
            />
          </div>

          {/* Document Summary Info Banner */}
          <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-xl text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-400">{tenant?.businessName}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  ({orientation.toUpperCase()} A4)
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Ready to export:{' '}
                <span className="font-semibold text-white">
                  {includeInventory ? `${filteredParts.length} inventory parts` : 'No parts'}
                </span>{' '}
                and{' '}
                <span className="font-semibold text-white">
                  {includeTransactions ? `${filteredTransactions.length} movement logs` : 'No logs'}
                </span>
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Total Est. Stock Cost</span>
              <span className="font-bold text-sm text-emerald-400">
                {formatRwf(estInventoryValue)}
              </span>
            </div>
          </div>

          {/* Success Feedback */}
          {successFilename && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Document successfully generated and downloaded as{' '}
                <span className="font-bold font-mono text-[11px]">{successFilename}</span>
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={(!includeInventory && !includeTransactions) || isExporting}
              onClick={handleGeneratePdf}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <FileDown className="w-4 h-4" />
              {isExporting ? 'Generating PDF...' : 'Download Formatted PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
