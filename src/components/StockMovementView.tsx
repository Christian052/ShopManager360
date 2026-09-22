import React, { useState } from 'react';
import {
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  SlidersHorizontal,
  Search,
  Filter,
  Download,
  Calendar,
  User as UserIcon,
  Tag,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { StockTransaction, SparePart } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatRwf } from '../utils/i18n';
import { StockMovementPdfModal, MovementViewRange } from './StockMovementPdfModal';
import { exportStockMovementReportPdf } from '../utils/pdfExport';

interface StockMovementViewProps {
  transactions: StockTransaction[];
  parts: SparePart[];
  onOpenStockIn: () => void;
  onOpenStockOut: () => void;
  onOpenAdjustment: () => void;
}

export const StockMovementView: React.FC<StockMovementViewProps> = ({
  transactions,
  parts,
  onOpenStockIn,
  onOpenStockOut,
  onOpenAdjustment,
}) => {
  const { currentTenant, currentUser, canRecordStock, canManageCatalog, canViewFinancials, t } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out' | 'adjustment'>('all');
  const [selectedPartId, setSelectedPartId] = useState('all');
  const [viewRange, setViewRange] = useState<MovementViewRange>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const getAnchorNow = () => {
    const now = new Date();
    if (transactions.length > 0) {
      const latestTxTime = Math.max(...transactions.map((t) => new Date(t.createdAt).getTime()));
      if (latestTxTime > now.getTime()) {
        return new Date(latestTxTime);
      }
    }
    return now;
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (selectedPartId !== 'all' && tx.partId !== selectedPartId) return false;

    // View Range / Date filtering
    if (viewRange !== 'all') {
      const anchor = getAnchorNow();
      const txDate = new Date(tx.createdAt);

      if (viewRange === 'today') {
        const anchorStr = anchor.toISOString().slice(0, 10);
        const txStr = txDate.toISOString().slice(0, 10);
        if (anchorStr !== txStr) return false;
      } else if (viewRange === '7days') {
        const threshold = new Date(anchor.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (txDate < threshold) return false;
      } else if (viewRange === '30days') {
        const threshold = new Date(anchor.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (txDate < threshold) return false;
      } else if (viewRange === 'thisMonth') {
        if (
          txDate.getMonth() !== anchor.getMonth() ||
          txDate.getFullYear() !== anchor.getFullYear()
        ) {
          return false;
        }
      } else if (viewRange === 'custom') {
        if (customStartDate) {
          const start = new Date(`${customStartDate}T00:00:00`);
          if (txDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(`${customEndDate}T23:59:59`);
          if (txDate > end) return false;
        }
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        tx.partName.toLowerCase().includes(q) ||
        tx.partSku.toLowerCase().includes(q) ||
        tx.userName.toLowerCase().includes(q) ||
        tx.reason.toLowerCase().includes(q) ||
        (tx.referenceNo && tx.referenceNo.toLowerCase().includes(q)) ||
        (tx.notes && tx.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getViewRangeLabel = (): string => {
    const anchor = getAnchorNow();
    switch (viewRange) {
      case 'all':
        return 'All Recorded Time';
      case 'today':
        return `Today (${anchor.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})`;
      case '7days':
        return `Past 7 Days (up to ${anchor.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})`;
      case '30days':
        return `Past 30 Days (up to ${anchor.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})`;
      case 'thisMonth':
        return `${anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${customStartDate} to ${customEndDate}`;
        } else if (customStartDate) {
          return `From ${customStartDate}`;
        } else if (customEndDate) {
          return `Up to ${customEndDate}`;
        }
        return 'Custom Date Range';
      default:
        return 'Current View Range';
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Date', 'Type', 'Part Name', 'SKU', 'Quantity', 'Previous Qty', 'New Qty', 'Reason', 'Ref No', 'Staff Member', 'Role'];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      new Date(tx.createdAt).toLocaleString(),
      tx.type.toUpperCase(),
      `"${tx.partName.replace(/"/g, '""')}"`,
      tx.partSku,
      tx.quantity,
      tx.previousQuantity,
      tx.newQuantity,
      `"${(tx.reason || '').replace(/"/g, '""')}"`,
      tx.referenceNo || '',
      tx.userName,
      tx.userRole,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const cleanRange = viewRange.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `${currentTenant?.businessName.replace(/\s+/g, '_')}_Stock_Movements_${cleanRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick 1-click PDF download
  const handleQuickPdfDownload = () => {
    try {
      const selectedPart = parts.find((p) => p.id === selectedPartId);
      const filename = exportStockMovementReportPdf({
        transactions: filteredTransactions,
        tenant: currentTenant,
        currentUser,
        viewRangeLabel: getViewRangeLabel(),
        appliedFilters: {
          typeLabel: typeFilter === 'all' ? 'All Movement Types' : typeFilter.toUpperCase(),
          partName: selectedPart ? `${selectedPart.name} (${selectedPart.sku})` : undefined,
          searchQuery: search.trim() || undefined,
        },
        canViewFinancials,
        orientation: 'landscape',
        reportTitle: 'Stock Movement & Transaction Audit Report',
        includeKpis: true,
        includeSignatures: true,
        action: 'download',
      });
      setToastMessage(`Generated PDF: ${filename} (${filteredTransactions.length} records)`);
      setTimeout(() => setToastMessage(null), 4500);
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
    }
  };

  // Aggregated units for active view
  const inUnits = filteredTransactions.filter((t) => t.type === 'in').reduce((acc, t) => acc + t.quantity, 0);
  const outUnits = filteredTransactions.filter((t) => t.type === 'out').reduce((acc, t) => acc + t.quantity, 0);
  const netUnits = inUnits - outUnits;

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{t.navStockMovements}</h1>
          <p className="text-xs text-slate-500">
            Immutable audit trail of all inventory inward deliveries, sales, usage, and shelf adjustments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canRecordStock && (
            <>
              <button
                onClick={onOpenStockIn}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <ArrowDownRight className="w-4 h-4" />
                {t.stockIn}
              </button>
              <button
                onClick={onOpenStockOut}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <ArrowUpRight className="w-4 h-4" />
                {t.stockOut}
              </button>
            </>
          )}

          {canManageCatalog && (
            <button
              onClick={onOpenAdjustment}
              className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Reconcile
            </button>
          )}

          {/* Generate PDF Button */}
          <button
            id="btn-generate-pdf"
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            title="Create formatted printable report of transaction history filtered by current view range"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>Generate PDF</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Download CSV Ledger"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Filter & View Range Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
        {/* Row 1: Search, Part Selector, Movement Type Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference #, reason, staff name, part..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Part Filter */}
          <div>
            <select
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Parts ({parts.length})</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Movement Type Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTypeFilter('all')}
              className={`flex-1 py-1 text-center rounded-lg text-xs font-semibold transition-colors ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setTypeFilter('in')}
              className={`flex-1 py-1 text-center rounded-lg text-xs font-semibold transition-colors ${
                typeFilter === 'in' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In
            </button>
            <button
              onClick={() => setTypeFilter('out')}
              className={`flex-1 py-1 text-center rounded-lg text-xs font-semibold transition-colors ${
                typeFilter === 'out' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Out
            </button>
            <button
              onClick={() => setTypeFilter('adjustment')}
              className={`flex-1 py-1 text-center rounded-lg text-xs font-semibold transition-colors ${
                typeFilter === 'adjustment' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Adjust
            </button>
          </div>
        </div>

        {/* Row 2: View Range Filter Selector & Current Scope Summary */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>View Range:</span>
            </div>

            <button
              onClick={() => setViewRange('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewRange === 'all'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setViewRange('today')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewRange === 'today'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewRange('7days')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewRange === '7days'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Past 7 Days
            </button>
            <button
              onClick={() => setViewRange('30days')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewRange === '30days'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Past 30 Days
            </button>
            <button
              onClick={() => setViewRange('thisMonth')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewRange === 'thisMonth'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setViewRange('custom')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewRange === 'custom'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Custom Range
            </button>

            {/* Custom Range Inputs */}
            {viewRange === 'custom' && (
              <div className="flex items-center gap-1.5 ml-1 bg-amber-50/70 p-1 rounded-lg border border-amber-200">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-0.5 text-[11px] border border-slate-300 rounded bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[11px] text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-0.5 text-[11px] border border-slate-300 rounded bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}
          </div>

          {/* Quick Metrics & Filtered Status */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">
              Showing <strong className="text-slate-800">{filteredTransactions.length}</strong> movements
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-bold text-emerald-600">+{inUnits} in</span>
            <span className="font-bold text-amber-700">-{outUnits} out</span>
            <span className="text-slate-300">•</span>
            <span className={`font-bold ${netUnits >= 0 ? 'text-sky-600' : 'text-rose-600'}`}>
              Net {netUnits >= 0 ? `+${netUnits}` : netUnits}
            </span>

            <button
              onClick={handleQuickPdfDownload}
              className="ml-2 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
              title="Direct 1-click PDF download of current view"
            >
              <FileText className="w-3 h-3 text-rose-500" />
              Quick PDF
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Type & Date</th>
                <th className="py-3 px-3">Spare Part</th>
                <th className="py-3 px-3 text-center">Movement Qty</th>
                <th className="py-3 px-3 text-center">Shelf Impact</th>
                {canViewFinancials && (
                  <th className="py-3 px-3 text-right">Value (RWF)</th>
                )}
                <th className="py-3 px-3">Context & Reference</th>
                <th className="py-3 px-4">Staff Member</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={canViewFinancials ? 7 : 6} className="py-12 text-center text-slate-400">
                    No stock movements found matching the active view range ({getViewRangeLabel()}) and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isIn = tx.type === 'in';
                  const isOut = tx.type === 'out';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Type & Date */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                              isIn
                                ? 'bg-emerald-100 text-emerald-700'
                                : isOut
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-sky-100 text-sky-700'
                            }`}
                          >
                            {isIn ? (
                              <ArrowDownRight className="w-4 h-4" />
                            ) : isOut ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <SlidersHorizontal className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                isIn
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isOut
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {tx.type}
                            </span>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                              {new Date(tx.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Spare Part */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{tx.partName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{tx.partSku}</div>
                      </td>

                      {/* Movement Qty */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-extrabold text-sm ${
                            isIn ? 'text-emerald-600' : isOut ? 'text-amber-700' : 'text-sky-700'
                          }`}
                        >
                          {isIn ? `+${tx.quantity}` : isOut ? `-${tx.quantity}` : `Δ ${tx.quantity}`}
                        </span>
                      </td>

                      {/* Shelf Impact */}
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-600">
                        {tx.previousQuantity} → <strong className="text-slate-900">{tx.newQuantity}</strong>
                      </td>

                      {/* Financial Value (if permitted) */}
                      {canViewFinancials && (
                        <td className="py-3 px-3 text-right font-medium text-slate-700">
                          {formatRwf(tx.totalValue)}
                        </td>
                      )}

                      {/* Reason & Reference */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{tx.reason}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          {tx.referenceNo && (
                            <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                              {tx.referenceNo}
                            </span>
                          )}
                          {tx.notes && <span className="truncate max-w-[180px]">{tx.notes}</span>}
                        </div>
                      </td>

                      {/* Staff Member */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{tx.userName}</div>
                        <div className="text-[10px] uppercase font-bold text-amber-700">
                          {tx.userRole}
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

      {/* Printable PDF Modal */}
      <StockMovementPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        filteredTransactions={filteredTransactions}
        allTransactionsCount={transactions.length}
        parts={parts}
        selectedPartId={selectedPartId}
        typeFilter={typeFilter}
        searchQuery={search}
        viewRange={viewRange}
        viewRangeLabel={getViewRangeLabel()}
        onExportSuccess={(filename) => {
          setToastMessage(`Generated printable PDF: ${filename}`);
          setTimeout(() => setToastMessage(null), 4500);
        }}
      />
    </div>
  );
};

