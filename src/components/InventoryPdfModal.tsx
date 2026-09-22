import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  Layers,
  FileCheck2,
  Building2,
  FileDown,
  AlertTriangle,
  QrCode,
} from 'lucide-react';
import { SparePart, Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatRwf } from '../utils/i18n';
import { exportInventoryCatalogReportPdf } from '../utils/pdfExport';

interface InventoryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredParts: SparePart[];
  allPartsCount: number;
  categories: Category[];
  selectedCategory: string;
  statusFilter: 'all' | 'instock' | 'low' | 'out';
  searchQuery: string;
  onExportSuccess?: (filename: string) => void;
}

export const InventoryPdfModal: React.FC<InventoryPdfModalProps> = ({
  isOpen,
  onClose,
  filteredParts,
  allPartsCount,
  categories,
  selectedCategory,
  statusFilter,
  searchQuery,
  onExportSuccess,
}) => {
  const { currentTenant, currentUser, canViewFinancials } = useAuth();

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [reportTitle, setReportTitle] = useState('Inventory Catalog & Stock Valuation Audit');
  const [notes, setNotes] = useState('');
  const [includeKpis, setIncludeKpis] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [successFilename, setSuccessFilename] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalUnits = filteredParts.reduce((acc, p) => acc + p.quantity, 0);
  const totalCostVal = filteredParts.reduce((acc, p) => acc + p.costPrice * p.quantity, 0);
  const totalRetailVal = filteredParts.reduce((acc, p) => acc + p.sellPrice * p.quantity, 0);
  const lowStockCount = filteredParts.filter((p) => p.quantity > 0 && p.quantity <= p.reorderLevel).length;
  const outOfStockCount = filteredParts.filter((p) => p.quantity === 0).length;

  const catObj = categories.find((c) => c.id === selectedCategory);
  const categoryLabel = selectedCategory === 'all' ? 'All Categories' : catObj?.name || selectedCategory;

  const statusLabels: Record<string, string> = {
    all: 'All Stock Levels',
    instock: 'Adequate Stock Only',
    low: 'Low Stock Alerts Only',
    out: 'Out of Stock Only',
  };

  const handleExecuteExport = (action: 'download' | 'print' = 'download') => {
    setIsExporting(true);
    setSuccessFilename(null);

    try {
      const filename = exportInventoryCatalogReportPdf({
        parts: filteredParts,
        categories,
        tenant: currentTenant,
        currentUser,
        appliedFilters: {
          categoryLabel,
          statusLabel: statusLabels[statusFilter],
          searchQuery: searchQuery.trim() || undefined,
        },
        canViewFinancials,
        orientation,
        reportTitle: reportTitle.trim() || 'Inventory Catalog & Stock Valuation Audit',
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
      }, 400);
    } catch (err: any) {
      console.error('Failed to export inventory PDF report:', err);
      setIsExporting(false);
      alert('Could not generate PDF report. Please try again.');
    }
  };

  return (
    <div
      id="modal-generate-inventory-pdf"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Generate Inventory PDF Report</h3>
              <p className="text-xs text-slate-300">
                Official printable catalog ledger with QR Code SKU tracking & valuation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Active Filter Scope Summary Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>{currentTenant?.businessName} • Inventory Audit Scope</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                {filteredParts.length} of {allPartsCount} items
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/70 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Category</span>
                <strong className="text-slate-800 truncate block">{categoryLabel}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Stock Status</span>
                <strong className="text-slate-800 truncate block">{statusLabels[statusFilter]}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Units</span>
                <strong className="text-slate-800 block">{totalUnits.toLocaleString()} pcs</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Alerts</span>
                <strong className={lowStockCount + outOfStockCount > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                  {lowStockCount} Low / {outOfStockCount} Out
                </strong>
              </div>
            </div>

            {searchQuery.trim() && (
              <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                <span>Filter keyword: &ldquo;<strong>{searchQuery}</strong>&rdquo;</span>
                <span className="text-slate-400 text-[10px]">Active search filter</span>
              </div>
            )}
          </div>

          {/* KPI Metrics Preview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-slate-500">Catalog Parts</div>
              <div className="text-base font-black text-slate-900 mt-0.5">{filteredParts.length}</div>
              <div className="text-[10px] text-slate-400">QR-code tracked items</div>
            </div>

            {canViewFinancials && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-amber-800">Cost Valuation</div>
                <div className="text-base font-black text-amber-900 mt-0.5">{formatRwf(totalCostVal)}</div>
                <div className="text-[10px] text-amber-700">Total acquisition cost</div>
              </div>
            )}

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-emerald-800">Expected Retail</div>
              <div className="text-base font-black text-emerald-900 mt-0.5">{formatRwf(totalRetailVal)}</div>
              <div className="text-[10px] text-emerald-700">Shelf selling value</div>
            </div>
          </div>

          {/* Form Options */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Report Title
              </label>
              <input
                id="input-inventory-report-title"
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                placeholder="e.g. Monthly Physical Inventory Audit & Valuation Ledger"
              />
            </div>

            {/* Orientation Options */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Page Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                    orientation === 'portrait'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="w-5 h-7 border border-current rounded-xs flex items-center justify-center text-[8px] font-mono shrink-0">
                    A4
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Portrait (Vertical)</div>
                    <div className="text-[10px] opacity-75">Standard catalog layout</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                    orientation === 'landscape'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="w-7 h-5 border border-current rounded-xs flex items-center justify-center text-[8px] font-mono shrink-0">
                    A4
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Landscape (Wide)</div>
                    <div className="text-[10px] opacity-75">Spacious columns for audit tables</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Auditor Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Auditor & Management Notes (Optional)
              </label>
              <textarea
                id="input-inventory-report-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. End of month physical inventory reconciliation verified against physical shelf tags..."
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>

            {/* Checkbox inclusions */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeKpis}
                  onChange={(e) => setIncludeKpis(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Include Executive KPI Cards (Units & Valuations)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Include Storekeeper & Manager Sign-off Blocks
                </span>
              </label>
            </div>
          </div>

          {/* Success Filename Toast */}
          {successFilename && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Generated: <strong className="font-mono">{successFilename}</strong>
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold">Ready</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              id="btn-print-preview-inventory-pdf"
              type="button"
              disabled={isExporting || filteredParts.length === 0}
              onClick={() => handleExecuteExport('print')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Open Printable PDF preview in new tab"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Preview</span>
            </button>

            <button
              id="btn-download-inventory-pdf"
              type="button"
              disabled={isExporting || filteredParts.length === 0}
              onClick={() => handleExecuteExport('download')}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
