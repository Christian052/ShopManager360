import React, { useState } from 'react';
import { X, ArrowUpRight, AlertCircle, Camera, CheckCircle2, QrCode } from 'lucide-react';
import { SparePart } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatRwf } from '../utils/i18n';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface StockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SparePart[];
  preSelectedPartId?: string;
  onConfirm: (data: {
    partId: string;
    quantity: number;
    unitSellPrice?: number;
    reason: string;
    referenceNo?: string;
    notes?: string;
  }) => void;
}

export const StockOutModal: React.FC<StockOutModalProps> = ({
  isOpen,
  onClose,
  parts,
  preSelectedPartId,
  onConfirm,
}) => {
  const { currentUser, t } = useAuth();
  const [partId, setPartId] = useState(preSelectedPartId || parts[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitSellPrice, setUnitSellPrice] = useState<number | undefined>(undefined);
  const [reason, setReason] = useState('Customer Counter Sale');
  const [referenceNo, setReferenceNo] = useState('');
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
    if (preSelectedPartId) setPartId(preSelectedPartId);
  }, [preSelectedPartId]);

  React.useEffect(() => {
    if (selectedPart && unitSellPrice === undefined) {
      setUnitSellPrice(selectedPart.sellPrice);
    }
  }, [selectedPart]);

  if (!isOpen) return null;

  const maxAvailable = selectedPart ? selectedPart.quantity : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partId) {
      setError('Please select a spare part.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (quantity > maxAvailable) {
      setError(`Cannot issue ${quantity}. Only ${maxAvailable} available in stock.`);
      return;
    }

    onConfirm({
      partId,
      quantity: Number(quantity),
      unitSellPrice: unitSellPrice !== undefined ? Number(unitSellPrice) : selectedPart?.sellPrice,
      reason,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const totalRevenue = (unitSellPrice ?? selectedPart?.sellPrice ?? 0) * (Number(quantity) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{t.recordStockOut}</h2>
              <p className="text-xs text-slate-500">Record customer sale, garage installation, or usage</p>
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
                id="btn-scan-qr-stockout"
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition shadow-2xs"
                title="Scan QR code using device camera"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-700" />
                <span>Scan QR Code</span>
              </button>
            </div>

            {scannedFeedback && (
              <div className="mb-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Auto-populated from QR code: <strong className="font-mono">{scannedFeedback.code}</strong> ({scannedFeedback.partName})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setScannedFeedback(null)}
                  className="text-amber-700 hover:text-amber-950 text-[11px] font-semibold"
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
                if (p) setUnitSellPrice(p.sellPrice);
                setScannedFeedback(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800 bg-white"
              required
            >
              <option value="">-- Choose item from catalog or scan barcode --</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                  {p.name} ({p.sku}) {p.barcode ? `[Barcode: ${p.barcode}]` : ''} — {p.quantity === 0 ? 'OUT OF STOCK' : `Avail: ${p.quantity} ${p.unit}`}
                </option>
              ))}
            </select>
          </div>

          {selectedPart && (
            <div className={`p-3 rounded-lg border text-xs flex justify-between items-center ${
              selectedPart.quantity === 0 
                ? 'bg-rose-50 border-rose-200 text-rose-700' 
                : selectedPart.quantity <= selectedPart.reorderLevel 
                ? 'bg-amber-50 border-amber-200 text-amber-800' 
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div>
                <span className="font-semibold">Current Stock:</span> {selectedPart.quantity} {selectedPart.unit}
              </div>
              <div>
                <span className="font-semibold">Location:</span> {selectedPart.shelfLocation || 'Shelf A'}
              </div>
              <div>
                <span className="font-semibold">Retail Price:</span> {formatRwf(selectedPart.sellPrice)}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Dispatch Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={maxAvailable > 0 ? maxAvailable : 1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800 font-semibold"
                disabled={maxAvailable === 0}
                required
              />
              {selectedPart && (
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Remaining will be: {Math.max(0, selectedPart.quantity - (Number(quantity) || 0))} {selectedPart.unit}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Unit Sale Price (RWF)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={unitSellPrice ?? selectedPart?.sellPrice ?? 0}
                onChange={(e) => setUnitSellPrice(Math.max(0, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800"
              />
              <span className="text-[11px] text-amber-700 font-medium mt-1 block">
                Total: {formatRwf(totalRevenue)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {t.reason}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800 bg-white"
            >
              <option value="Customer Counter Sale">Customer Counter Sale</option>
              <option value="Garage Workshop Installation (Job Card)">Garage Workshop Installation (Job Card)</option>
              <option value="Internal Shop Maintenance / Testing">Internal Shop Maintenance / Testing</option>
              <option value="Damaged / Broken in Warehouse">Damaged / Broken in Warehouse</option>
              <option value="Expired / Defective Batch Return">Expired / Defective Batch Return</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Receipt / Job Card # / Customer Reference
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. REC-0921-12 or JOB-RAV4-98"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Customer or Staff Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via MTN MoMo 0788..., vehicle plate RAE 204 B"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800"
            />
          </div>

          <div className="pt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Cashier / Staff: <strong className="text-slate-700">{currentUser.name}</strong></span>
            <span>Role: <strong className="uppercase text-amber-700">{currentUser.role}</strong></span>
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
              disabled={maxAvailable === 0}
              className="px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" />
              Confirm Stock Out
            </button>
          </div>
        </form>
      </div>

      {/* Barcode Scanner Modal for Stock Out */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        parts={parts}
        mode="stockOut"
        onScanSuccess={(code, matched) => {
          if (matched) {
            setPartId(matched.id);
            setUnitSellPrice(matched.sellPrice);
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
