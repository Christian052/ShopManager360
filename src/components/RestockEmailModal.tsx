import React, { useState } from 'react';
import { StockAlertNotification, Tenant } from '../types';
import { X, Mail, Send, Copy, Check, ExternalLink, Printer, Building2, Phone, AlertTriangle } from 'lucide-react';
import { formatRwf } from '../utils/i18n';

interface RestockEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: StockAlertNotification | null;
  tenant: Tenant | null;
  onSendEmail?: (recipient: string) => void;
}

export const RestockEmailModal: React.FC<RestockEmailModalProps> = ({
  isOpen,
  onClose,
  notification,
  tenant,
  onSendEmail,
}) => {
  const [recipient, setRecipient] = useState(notification?.emailRecipient || 'doctorshavu@gmail.com');
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Sync recipient when notification changes
  React.useEffect(() => {
    if (notification?.emailRecipient) {
      setRecipient(notification.emailRecipient);
    }
  }, [notification]);

  if (!isOpen || !notification || !tenant) return null;

  const isOutOfStock = notification.currentQuantity === 0;

  const handleCopy = () => {
    if (notification.emailBody) {
      navigator.clipboard.writeText(notification.emailBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSend = () => {
    if (onSendEmail) {
      onSendEmail(recipient);
    }
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1800);
  };

  const mailtoLink = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
    notification.emailSubject || `Restock Alert: ${notification.partName}`
  )}&body=${encodeURIComponent(notification.emailBody || '')}`;

  return (
    <div
      id="restock-email-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="restock-email-modal-content"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center space-x-2">
                <span>Automated Restock Email Dispatch</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isOutOfStock
                      ? 'bg-rose-500/30 text-rose-300 border border-rose-400/40'
                      : 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                  }`}
                >
                  {isOutOfStock ? 'CRITICAL OUT OF STOCK' : 'LOW STOCK ALERT'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Purchase order alert dispatched for {tenant.businessName}
              </p>
            </div>
          </div>
          <button
            id="btn-close-email-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {sentSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-sm">
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>Automated restock alert successfully queued and dispatched to {recipient}!</span>
            </div>
          )}

          {/* Recipient & Subject Header Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Recipient Address:</label>
                <div className="flex items-center space-x-2">
                  <input
                    id="input-email-recipient"
                    type="email"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. doctorshavu@gmail.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Dispatch Status:</label>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Automated System Notification (Active)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1">Email Subject:</label>
              <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 select-all">
                {notification.emailSubject || `[ShopManager360 Alert] Restock: ${notification.partName}`}
              </div>
            </div>
          </div>

          {/* Item & Reorder Details Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-xs text-slate-500">Current Stock</div>
              <div
                className={`text-lg font-bold ${
                  isOutOfStock ? 'text-rose-600' : 'text-amber-600'
                }`}
              >
                {notification.currentQuantity} {notification.unit}
              </div>
              <div className="text-[11px] text-slate-400">Threshold: {notification.reorderLevel}</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-xs text-slate-500">Suggested Order</div>
              <div className="text-lg font-bold text-blue-600">
                {notification.suggestedReorderQty} {notification.unit}
              </div>
              <div className="text-[11px] text-slate-400">Replenish to 2x safety</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-xs text-slate-500">Est. Restock Cost</div>
              <div className="text-lg font-bold text-slate-800">
                {formatRwf(notification.estimatedCostRwf)}
              </div>
              <div className="text-[11px] text-slate-400">At wholesale unit cost</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-xs text-slate-500">Supplier</div>
              <div className="text-sm font-semibold text-slate-800 truncate" title={notification.supplier}>
                {notification.supplier}
              </div>
              <div className="text-[11px] text-blue-600 truncate">
                {notification.supplierPhone || '+250 Wholesale'}
              </div>
            </div>
          </div>

          {/* Email Body Preview Container */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Formatted Email Message Content
              </label>
              <button
                id="btn-copy-email-body"
                onClick={handleCopy}
                className="text-xs flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 font-medium px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Message</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-56 overflow-y-auto border border-slate-800">
              {notification.emailBody}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            id="link-open-email-client"
            href={mailtoLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs flex items-center space-x-1.5 text-slate-600 hover:text-blue-600 font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in External Email Client (Outlook / Mail)</span>
          </a>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              id="btn-dismiss-email-modal"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition"
            >
              Close
            </button>
            <button
              id="btn-trigger-email-send"
              onClick={handleSend}
              className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm flex items-center space-x-2 transition"
            >
              <Send className="w-4 h-4" />
              <span>Resend Alert to {recipient}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
