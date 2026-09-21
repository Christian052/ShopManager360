import React from 'react';
import { StockAlertNotification } from '../types';
import { AlertTriangle, Flame, PackagePlus, Mail, X } from 'lucide-react';

interface LowStockBannerToastProps {
  alert: StockAlertNotification | null;
  onClose: () => void;
  onStockIn: (partId: string) => void;
  onViewEmail: (alert: StockAlertNotification) => void;
}

export const LowStockBannerToast: React.FC<LowStockBannerToastProps> = ({
  alert,
  onClose,
  onStockIn,
  onViewEmail,
}) => {
  if (!alert) return null;

  const isOutOfStock = alert.currentQuantity === 0;

  return (
    <div
      id="low-stock-live-toast-banner"
      className="fixed bottom-5 right-5 z-50 max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 ring-4 ring-slate-900/5"
    >
      <div
        className={`p-1 ${
          isOutOfStock ? 'bg-rose-500' : 'bg-amber-500'
        }`}
      />
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                isOutOfStock ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
              }`}
            >
              {isOutOfStock ? (
                <Flame className="w-5 h-5 animate-pulse" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-slate-900">{alert.partName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    isOutOfStock
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {isOutOfStock ? '0 Left (Out of Stock)' : `${alert.currentQuantity} Left`}
                </span>
              </div>

              <p className="text-xs text-slate-600 mt-1">
                Quantity dropped to or below configured reorder level of{' '}
                <strong className="text-slate-800 font-semibold">{alert.reorderLevel} {alert.unit}</strong>.
                Replenishment PO generated for supplier <strong className="text-slate-800">{alert.supplier}</strong>.
              </p>

              <div className="flex items-center space-x-2 mt-3">
                <button
                  id="btn-toast-quick-stockin"
                  onClick={() => {
                    onStockIn(alert.partId);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>Restock Now</span>
                </button>

                <button
                  id="btn-toast-view-email"
                  onClick={() => {
                    onViewEmail(alert);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Restock PO Email</span>
                </button>
              </div>
            </div>
          </div>

          <button
            id="btn-toast-close"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
