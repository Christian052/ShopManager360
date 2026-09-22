import React, { useState } from 'react';
import { X, ArrowDownRight, AlertCircle, Camera, CheckCircle2, QrCode } from 'lucide-react';
import { SparePart } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatRwf } from '../utils/i18n';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { findPartByBarcodeOrSku } from '../utils/barcodeService';

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SparePart[];
  preSelectedPartId?: string;
  onConfirm: (data: {
    partId: string;
    quantity: number;
    unitCostPrice?: number;
    reason: string;
    referenceNo?: string;
    notes?: string;
  }) => void;
}

export const StockInModal: React.FC<StockInModalProps> = ({
  isOpen,
  onClose,
  parts,
  preSelectedPartId,
  onConfirm,
}) => {
  const { currentUser, t } = useAuth();
  const [partId, setPartId] = useState(preSelectedPartId || parts[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(5);
  const [unitCostPrice, setUnitCostPrice] = useState<number | undefined>(undefined);
  const [reason, setReason] = useState('Supplier Restock Delivery');
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

  // Sync unitCostPrice when part changes
  React.useEffect(() => {
    if (preSelectedPartId) setPartId(preSelectedPartId);
  }, [preSelectedPartId]);

  React.useEffect(() => {
    if (selectedPart && unitCostPrice === undefined) {
      setUnitCostPrice(selectedPart.costPrice);
    }
  }, [selectedPart]);

  if (!isOpen) return null;

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

    onConfirm({
      partId,
      quantity: Number(quantity),
      unitCostPrice: unitCostPrice !== undefined ? Number(unitCostPrice) : selectedPart?.costPrice,
      reason,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const totalValue = (unitCostPrice ?? selectedPart?.costPrice ?? 0) * (Number(quantity) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{t.recordStockIn}</h2>
              <p className="text-xs text-slate-500">Record incoming shipment or supplier restock</p>
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
                id="btn-scan-qr-stockin"
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition shadow-2xs"
                title="Scan QR code using device camera"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                <span>Scan QR Code</span>
              </button>
            </div>

            {scannedFeedback && (
              <div className="mb-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Auto-populated from QR code: <strong className="font-mono">{scannedFeedback.code}</strong> ({scannedFeedback.partName})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setScannedFeedback(null)}
                  className="text-emerald-700 hover:text-emerald-950 text-[11px] font-semibold"
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
                if (p) setUnitCostPrice(p.costPrice);
                setScannedFeedback(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800 bg-white"
              required
            >
              <option value="">-- Choose item from catalog or scan barcode --</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) {p.barcode ? `[Barcode: ${p.barcode}]` : ''} — Current: {p.quantity} {p.unit}
                </option>
              ))}
            </select>
          </div>

          {selectedPart && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center text-slate-600">
              <div>
                <span className="font-semibold text-slate-700">Current Stock:</span> {selectedPart.quantity} {selectedPart.unit}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Shelf:</span> {selectedPart.shelfLocation || 'Unassigned'}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Supplier:</span> {selectedPart.supplier}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Incoming Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800 font-semibold"
                required
              />
              {selectedPart && (
                <span className="text-[11px] text-emerald-600 mt-1 block">
                  New stock will be: {selectedPart.quantity + (Number(quantity) || 0)} {selectedPart.unit}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Unit Purchase Cost (RWF)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={unitCostPrice ?? selectedPart?.costPrice ?? 0}
                onChange={(e) => setUnitCostPrice(Math.max(0, Number(e.target.value)))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Total Value: {formatRwf(totalValue)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Source / Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800 bg-white"
            >
              <option value="Supplier Restock Delivery">Supplier Restock Delivery</option>
              <option value="Emergency Local Purchase">Emergency Local Purchase</option>
              <option value="Customer Return / Refund">Customer Return / Refund</option>
              <option value="Transfer from Other Branch">Transfer from Other Branch</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Supplier Invoice / Delivery Note # (Optional)
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. INV-AKAGERA-2026-99"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Verification Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Inspected packages, seals intact, batch #412"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          <div className="pt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Attributed to: <strong className="text-slate-700">{currentUser.name} ({currentUser.role})</strong></span>
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
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ArrowDownRight className="w-4 h-4" />
              Confirm Stock In
            </button>
          </div>
        </form>
      </div>

      {/* Barcode Scanner Modal for Stock In */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        parts={parts}
        mode="stockIn"
        onScanSuccess={(code, matched) => {
          if (matched) {
            setPartId(matched.id);
            setUnitCostPrice(matched.costPrice);
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
