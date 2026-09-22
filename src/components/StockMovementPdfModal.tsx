import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  SlidersHorizontal,
  FileCheck2,
  Building2,
  FileDown,
} from 'lucide-react';
import { StockTransaction, SparePart } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatRwf } from '../utils/i18n';
import { exportStockMovementReportPdf } from '../utils/pdfExport';

export type MovementViewRange = 'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'custom';

interface StockMovementPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredTransactions: StockTransaction[];
  allTransactionsCount: number;
  parts: SparePart[];
  selectedPartId: string;
  typeFilter: 'all' | 'in' | 'out' | 'adjustment';
  searchQuery: string;
  viewRange: MovementViewRange;
  viewRangeLabel: string;
  onExportSuccess?: (filename: string) => void;
}

export const StockMovementPdfModal: React.FC<StockMovementPdfModalProps> = ({
  isOpen,
  onClose,
  filteredTransactions,
  allTransactionsCount,
  parts,
  selectedPartId,
  typeFilter,
  searchQuery,
  viewRange,
  viewRangeLabel,
  onExportSuccess,
}) => {
  const { currentTenant, currentUser, canViewFinancials } = useAuth();

  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [reportTitle, setReportTitle] = useState('Stock Movement & Transaction Audit Report');
  const [notes, setNotes] = useState('');
  const [includeKpis, setIncludeKpis] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [successFilename, setSuccessFilename] = useState<string | null>(null);

  if (!isOpen) return null;

  const inTx = filteredTransactions.filter((t) => t.type === 'in');
  const outTx = filteredTransactions.filter((t) => t.type === 'out');
  const adjTx = filteredTransactions.filter((t) => t.type === 'adjustment');

  const totalInUnits = inTx.reduce((acc, t) => acc + t.quantity, 0);
  const totalOutUnits = outTx.reduce((acc, t) => acc + t.quantity, 0);
  const netUnits = totalInUnits - totalOutUnits;

  const totalInVal = inTx.reduce((acc, t) => acc + (t.totalValue || 0), 0);
  const totalOutVal = outTx.reduce((acc, t) => acc + (t.totalValue || 0), 0);

  const selectedPart = parts.find((p) => p.id === selectedPartId);

  const typeLabels = {
    all: 'All Movement Types',
    in: 'Stock In (Deliveries & Restock)',
    out: 'Stock Out (Sales & Dispatches)',
    adjustment: 'Shelf Adjustments & Reconciliations',
  };

  const handleExecuteExport = (action: 'download' | 'print' = 'download') => {
    setIsExporting(true);
    setSuccessFilename(null);

    try {
      const filename = exportStockMovementReportPdf({
        transactions: filteredTransactions,
        tenant: currentTenant,
        currentUser,
        viewRangeLabel,
        appliedFilters: {
          typeLabel: typeLabels[typeFilter],
          partName: selectedPart ? `${selectedPart.name} (${selectedPart.sku})` : undefined,
          searchQuery: searchQuery.trim() || undefined,
        },
        canViewFinancials,
        orientation,
        reportTitle: reportTitle.trim() || 'Stock Movement & Transaction Audit Report',
        notes: notes.trim(),
        includeKpis,
        includeSignatures,
        action,
      });

      setSuccessFilename(filename);
      if (onExportSuccess) {
        onExportSuccess(filename);
      }
      setTimeout(() => {
        setIsExporting(false);
      }, 500);
    } catch (err: any) {
      console.error('Failed to generate Stock Movement PDF:', err);
      setIsExporting(false);
    }
  };

  return (
    <div
      id="stock-movement-pdf-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="stock-movement-pdf-modal"
        className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Generate Stock Movement PDF Report</h2>
              <p className="text-xs text-slate-500">
                Formatted printable ledger filtered by the current view range & audit criteria
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

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Active View Range & Filter Scope Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Active View Range Filter
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                {viewRangeLabel}
              </span>
            </div>

            {/* Scope details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Movement Type</div>
                <div className="font-semibold text-slate-800 capitalize mt-0.5">
                  {typeFilter === 'all' ? 'All Types' : typeFilter}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Target Part</div>
                <div className="font-semibold text-slate-800 truncate mt-0.5" title={selectedPart?.name || 'All Catalog'}>
                  {selectedPart ? selectedPart.name : 'All Catalog Items'}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Filtered Records</div>
                <div className="font-semibold text-slate-800 mt-0.5">
                  <span className="text-amber-700 font-bold">{filteredTransactions.length}</span> of {allTransactionsCount} txs
                </div>
              </div>
            </div>

            {/* Metrics Snapshot */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200">
              <div className="py-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Inward</div>
                <div className="text-xs font-extrabold text-emerald-600">+{totalInUnits} units</div>
                {canViewFinancials && <div className="text-[10px] text-slate-500">{formatRwf(totalInVal)}</div>}
              </div>
              <div className="py-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Outward</div>
                <div className="text-xs font-extrabold text-amber-700">-{totalOutUnits} units</div>
                {canViewFinancials && <div className="text-[10px] text-slate-500">{formatRwf(totalOutVal)}</div>}
              </div>
              <div className="py-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Net Delta</div>
                <div className={`text-xs font-extrabold ${netUnits >= 0 ? 'text-sky-600' : 'text-rose-600'}`}>
                  {netUnits >= 0 ? `+${netUnits}` : netUnits} units
                </div>
                <div className="text-[10px] text-slate-500">{adjTx.length} adjustments</div>
              </div>
            </div>
          </div>

          {/* Form Options */}
          <div className="space-y-4">
            {/* Report Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Report Title
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Stock Movement & Transaction Audit Report"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Layout Orientation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Print / Paper Orientation
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
                    orientation === 'landscape'
                      ? 'border-amber-500 bg-amber-50/50 text-amber-900 ring-1 ring-amber-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-6 h-4 border-2 border-current rounded-xs mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Landscape (Recommended)</div>
                    <div className="text-[11px] text-slate-500">Wide ledger view for full audit columns without truncation</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
                    orientation === 'portrait'
                      ? 'border-amber-500 bg-amber-50/50 text-amber-900 ring-1 ring-amber-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-4 h-6 border-2 border-current rounded-xs mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Portrait</div>
                    <div className="text-[11px] text-slate-500">Vertical standard page orientation</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeKpis}
                  onChange={(e) => setIncludeKpis(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Include KPI Summary Cards</div>
                  <div className="text-[10px] text-slate-500">Inward/outward volume & net shelf metrics</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Include Signature Blocks</div>
                  <div className="text-[10px] text-slate-500">Operator & Manager audit verification lines</div>
                </div>
              </label>
            </div>

            {/* Auditor Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Auditor Note / Reconciliation Reference (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. End-of-month stock movement audit reconciled against physical inventory..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Success message */}
          {successFilename && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
              <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="truncate">
                Report generated successfully: <strong>{successFilename}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExecuteExport('print')}
              disabled={isExporting}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Open print preview in browser"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print Preview
            </button>

            <button
              id="confirm-generate-pdf-btn"
              onClick={() => handleExecuteExport('download')}
              disabled={isExporting}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <span>Generating PDF...</span>
              ) : (
                <>
                  <FileDown className="w-4 h-4 text-rose-400" />
                  <span>Download PDF Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
