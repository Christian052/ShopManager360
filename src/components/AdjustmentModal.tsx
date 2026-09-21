import React, { useState } from 'react';
import { X, SlidersHorizontal, AlertCircle, Camera, CheckCircle2, Barcode } from 'lucide-react';
import { SparePart } from '../types';
import { useAuth } from '../context/AuthContext';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SparePart[];
  preSelectedPartId?: string;
  onConfirm: (data: {
    partId: string;
    actualPhysicalCount: number;
    reason: string;
    notes?: string;
  }) => void;
}

export const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  onClose,
  parts,
  preSelectedPartId,
  onConfirm,
}) => {
  const { currentUser, t } = useAuth();
  const [partId, setPartId] = useState(preSelectedPartId || parts[0]?.id || '');
  const [actualPhysicalCount, setActualPhysicalCount] = useState<number>(0);
  const [reason, setReason] = useState('Quarterly Physical Stock Take Discrepancy');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedFeedback, setScannedFeedback] = useState<{
    code: string;
    partName: string;
    sku: string;
  } | null>(null);

  const selectedPart = parts.find((p) => p.id === partId);

  React.useEffect(() => {
    if (preSelectedPartId) {
      setPartId(preSelectedPartId);
      const p = parts.find((item) => item.id === preSelectedPartId);
      if (p) setActualPhysicalCount(p.quantity);
    } else if (parts[0]) {
      setActualPhysicalCount(parts[0].quantity);
    }
  }, [preSelectedPartId, parts]);

  if (!isOpen) return null;

  const currentSystemQty = selectedPart ? selectedPart.quantity : 0;
  const difference = Number(actualPhysicalCount) - currentSystemQty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partId) {
      setError('Please select a spare part.');
      return;
    }
    if (actualPhysicalCount < 0) {
      setError('Actual count cannot be negative.');
      return;
    }
    if (difference === 0) {
      setError('Actual count is identical to system count. No adjustment needed.');
      return;
    }
    if (!notes.trim()) {
      setError('Please provide audit notes explaining this discrepancy.');
      return;
    }

    onConfirm({
      partId,
      actualPhysicalCount: Number(actualPhysicalCount),
      reason,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-sky-50/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{t.recordAdjustment}</h2>
              <p className="text-xs text-slate-500">Reconcile physical shelf count with system records</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Spare Part / Item <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                id="btn-scan-barcode-adjust"
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-lg text-xs font-bold transition shadow-2xs"
                title="Scan barcode using device camera"
              >
                <Camera className="w-3.5 h-3.5 text-sky-700" />
                <span>Scan Barcode</span>
              </button>
            </div>

            {scannedFeedback && (
              <div className="mb-2 p-2.5 bg-sky-50 border border-sky-300 rounded-lg text-xs text-sky-950 flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    Auto-selected: <strong className="font-mono">{scannedFeedback.code}</strong> ({scannedFeedback.partName})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setScannedFeedback(null)}
                  className="text-sky-700 hover:text-sky-950 text-[11px] font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}

            <select
              value={partId}
              onChange={(e) => {
                setPartId(e.target.value);
                const p = parts.find((item) => item.id === e.target.value);
                if (p) setActualPhysicalCount(p.quantity);
                setScannedFeedback(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
              required
            >
              <option value="">-- Choose item to reconcile or scan barcode --</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) {p.barcode ? `[Barcode: ${p.barcode}]` : ''} — System: {p.quantity} {p.unit}
                </option>
              ))}
            </select>
          </div>

          {selectedPart && (
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <div>
                <span className="text-[11px] text-slate-500 block uppercase">System Recorded</span>
                <span className="text-sm font-bold text-slate-700">
                  {currentSystemQty} {selectedPart.unit}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block uppercase">Actual Counted</span>
                <span className="text-sm font-bold text-sky-700">
                  {actualPhysicalCount} {selectedPart.unit}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block uppercase">Adjustment Diff</span>
                <span className={`text-sm font-bold ${
                  difference > 0 ? 'text-emerald-600' : difference < 0 ? 'text-rose-600' : 'text-slate-600'
                }`}>
                  {difference > 0 ? `+${difference}` : difference} {selectedPart.unit}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Actual Physical Count on Shelf <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={actualPhysicalCount}
              onChange={(e) => setActualPhysicalCount(Math.max(0, Number(e.target.value)))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800 font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Audit Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
            >
              <option value="Quarterly Physical Stock Take Discrepancy">Quarterly Physical Stock Take Discrepancy</option>
              <option value="Damaged Stock Written Off">Damaged Stock Written Off</option>
              <option value="Found Unrecorded Extra Units">Found Unrecorded Extra Units</option>
              <option value="Theft or Loss Detected">Theft or Loss Detected</option>
              <option value="Entry Correction from Prior Stock In Error">Entry Correction from Prior Stock In Error</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Discrepancy Notes & Audit Explanation <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 2 units found misfiled behind shelf B-02 during end of month inventory audit."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-800"
              required
            />
          </div>

          <div className="pt-2 text-xs text-slate-500">
            Authorized by: <strong className="text-slate-700">{currentUser.name} ({currentUser.role})</strong>
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
              className="px-5 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Apply Count Reconciliation
            </button>
          </div>
        </form>
      </div>

      {/* Barcode Scanner Modal for Adjustment */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        parts={parts}
        mode="adjustment"
        onScanSuccess={(code, matched) => {
          if (matched) {
            setPartId(matched.id);
            setActualPhysicalCount(matched.quantity);
            setScannedFeedback({
              code,
              partName: matched.name,
              sku: matched.sku,
            });
            setError(null);
            setIsScannerOpen(false);
          } else {
            setError(`Scanned code "${code}" was not found in catalog.`);
            setIsScannerOpen(false);
          }
        }}
      />
    </div>
  );
};
