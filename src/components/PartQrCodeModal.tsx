import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Printer,
  Download,
  X,
  CheckCircle2,
  Copy,
  Tag,
  MapPin,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import QRCode from 'qrcode';
import { SparePart, Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatRwf } from '../utils/i18n';

interface PartQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: SparePart | null;
  categoryName?: string;
  allParts?: SparePart[];
}

export const PartQrCodeModal: React.FC<PartQrCodeModalProps> = ({
  isOpen,
  onClose,
  part,
  categoryName,
  allParts = [],
}) => {
  const { currentTenant } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvgString, setQrSvgString] = useState<string>('');
  const [dataMode, setDataMode] = useState<'sku' | 'json' | 'url'>('sku');
  const [labelSize, setLabelSize] = useState<'standard' | 'compact' | 'large'>('standard');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  // Determine what text to encode into the QR Code
  const getEncodedText = (): string => {
    if (!part) return '';
    if (dataMode === 'sku') {
      return part.sku.trim();
    }
    if (dataMode === 'json') {
      return JSON.stringify({
        sku: part.sku,
        name: part.name,
        shelf: part.shelfLocation || 'N/A',
        shop: currentTenant?.businessName || 'ShopManager360',
      });
    }
    // URL format linking directly to web app with sku query param
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/?sku=${encodeURIComponent(part.sku)}`;
  };

  const encodedText = getEncodedText();

  useEffect(() => {
    if (!isOpen || !part || !encodedText) return;

    let isMounted = true;
    setIsGenerating(true);

    // Generate high resolution PNG data URL
    QRCode.toDataURL(encodedText, {
      width: 400,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR code PNG', err);
        if (isMounted) setIsGenerating(false);
      });

    // Generate SVG string for vector exports
    QRCode.toString(encodedText, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((svg) => {
        if (isMounted) setQrSvgString(svg);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isOpen, encodedText, part]);

  if (!isOpen || !part) return null;

  const handleCopySku = () => {
    navigator.clipboard.writeText(part.sku);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QR-${part.sku}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleDownloadSvg = () => {
    if (!qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `QR-${part.sku}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=500');
    if (!printWindow) {
      alert('Please allow popups to print shelf labels.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shelf Label - ${part.sku}</title>
          <style>
            @page {
              size: auto;
              margin: 4mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 10px;
              color: #0f172a;
              background: #ffffff;
            }
            .shelf-label-card {
              width: ${labelSize === 'compact' ? '48mm' : labelSize === 'large' ? '75mm' : '60mm'};
              border: 1.5px solid #0f172a;
              border-radius: 6px;
              padding: 8px 10px;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .shop-header {
              font-size: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 700;
              color: #475569;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 3px;
              margin-bottom: 5px;
              display: flex;
              justify-content: space-between;
            }
            .part-title {
              font-size: ${labelSize === 'compact' ? '10px' : '12px'};
              font-weight: 800;
              line-height: 1.2;
              color: #0f172a;
              margin-bottom: 4px;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }
            .content-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              margin-top: 4px;
            }
            .left-info {
              flex: 1;
              min-width: 0;
            }
            .sku-badge {
              font-family: monospace;
              font-size: ${labelSize === 'compact' ? '12px' : '15px'};
              font-weight: 900;
              color: #0f172a;
              letter-spacing: 0.5px;
            }
            .location-tag {
              font-size: 9px;
              font-weight: 700;
              color: #1e293b;
              margin-top: 2px;
            }
            .price-tag {
              font-size: 11px;
              font-weight: 800;
              color: #047857;
              margin-top: 2px;
            }
            .qr-wrapper {
              width: ${labelSize === 'compact' ? '46px' : labelSize === 'large' ? '64px' : '54px'};
              height: ${labelSize === 'compact' ? '46px' : labelSize === 'large' ? '64px' : '54px'};
              flex-shrink: 0;
            }
            .qr-wrapper img {
              width: 100%;
              height: 100%;
              display: block;
            }
            .footer-meta {
              font-size: 7px;
              font-family: monospace;
              color: #64748b;
              margin-top: 4px;
              border-top: 0.5px dashed #cbd5e1;
              padding-top: 2px;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <div class="shelf-label-card">
            <div class="shop-header">
              <span>${currentTenant?.businessName || 'ShopManager360'}</span>
              <span>SHELF LABEL</span>
            </div>
            <div class="part-title">${part.name}</div>
            <div class="content-row">
              <div class="left-info">
                <div class="sku-badge">${part.sku}</div>
                ${part.shelfLocation ? `<div class="location-tag">📍 Shelf: ${part.shelfLocation}</div>` : ''}
                <div class="price-tag">${formatRwf(part.sellPrice)}</div>
              </div>
              <div class="qr-wrapper">
                <img src="${qrDataUrl}" alt="QR" />
              </div>
            </div>
            <div class="footer-meta">
              <span>Scan with phone/terminal</span>
              <span>${categoryName || 'General'}</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div
      id="modal-part-qrcode-label"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Printable Shelf QR Label</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950">
                  Ready to Print
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Direct SKU QR code for manual shelf labeling & scanning
              </p>
            </div>
          </div>
          <button
            id="btn-close-qrcode-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Label Configuration Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Data Encoded in QR
              </label>
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                <button
                  type="button"
                  onClick={() => setDataMode('sku')}
                  className={`flex-1 py-1 px-2 rounded-md font-medium transition ${
                    dataMode === 'sku'
                      ? 'bg-white shadow-2xs text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Direct SKU
                </button>
                <button
                  type="button"
                  onClick={() => setDataMode('url')}
                  className={`flex-1 py-1 px-2 rounded-md font-medium transition ${
                    dataMode === 'url'
                      ? 'bg-white shadow-2xs text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  App Web Link
                </button>
                <button
                  type="button"
                  onClick={() => setDataMode('json')}
                  className={`flex-1 py-1 px-2 rounded-md font-medium transition ${
                    dataMode === 'json'
                      ? 'bg-white shadow-2xs text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Full JSON
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Sticker Label Size
              </label>
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                <button
                  type="button"
                  onClick={() => setLabelSize('compact')}
                  className={`flex-1 py-1 px-2 rounded-md font-medium transition ${
                    labelSize === 'compact'
                      ? 'bg-white shadow-2xs text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Compact
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize('standard')}
                  className={`flex-1 py-1 px-2 rounded-md font-medium transition ${
                    labelSize === 'standard'
                      ? 'bg-white shadow-2xs text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize('large')}
                  className={`flex-1 py-1 px-2 rounded-md font-medium transition ${
                    labelSize === 'large'
                      ? 'bg-white shadow-2xs text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Large Box
                </button>
              </div>
            </div>
          </div>

          {/* Real Physical Label Live Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                Physical Shelf Label Preview
              </span>
              <span className="text-[11px] font-mono text-slate-600">
                {labelSize === 'compact' ? '48 x 28 mm' : labelSize === 'large' ? '75 x 45 mm' : '60 x 35 mm'}
              </span>
            </div>

            <div
              ref={printAreaRef}
              className="bg-white border-2 border-slate-900 rounded-xl p-4 shadow-sm relative overflow-hidden transition-all duration-200 max-w-sm mx-auto"
            >
              {/* Shop Banner */}
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 pb-1.5 mb-2">
                <span className="truncate max-w-[170px] text-slate-700">
                  {currentTenant?.businessName || 'Kigali Auto Spares'}
                </span>
                <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold tracking-wider">
                  SHELF TAG
                </span>
              </div>

              {/* Part Name */}
              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight mb-2 line-clamp-2">
                {part.name}
              </h4>

              {/* Middle Row: Left Specs + Right QR */}
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">SKU:</span>
                    <span className="font-mono font-black text-sm text-slate-900 tracking-wide bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {part.sku}
                    </span>
                  </div>

                  {part.shelfLocation && (
                    <div className="flex items-center gap-1 text-xs text-slate-700 font-semibold">
                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                      <span>Shelf: <strong>{part.shelfLocation}</strong></span>
                    </div>
                  )}

                  <div className="text-xs font-bold text-emerald-700 pt-0.5">
                    Retail: {formatRwf(part.sellPrice)}
                  </div>
                </div>

                {/* QR Code Graphic */}
                <div className="w-20 h-20 bg-white border border-slate-200 rounded-lg p-1 shrink-0 flex items-center justify-center shadow-2xs">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code for SKU ${part.sku}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
                  )}
                </div>
              </div>

              {/* Bottom Details */}
              <div className="mt-2.5 pt-1.5 border-t border-dashed border-slate-200 flex items-center justify-between text-[10px] text-slate-600 font-mono">
                <span className="truncate">Category: {categoryName || 'General Stock'}</span>
                <span>Stock: {part.quantity} {part.unit}</span>
              </div>
            </div>
          </div>

          {/* Encoded Text Preview & Copy */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] uppercase font-bold text-slate-600 block">
                Encoded Value
              </span>
              <span className="font-mono font-semibold text-slate-800 text-[11px] truncate block">
                {encodedText}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopySku}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition"
              title="Copy encoded value"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy SKU</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-download-qr-png"
              onClick={handleDownloadPng}
              disabled={!qrDataUrl}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50"
              title="Download QR code as PNG image"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Save PNG</span>
            </button>
            <button
              type="button"
              id="btn-download-qr-svg"
              onClick={handleDownloadSvg}
              disabled={!qrSvgString}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50"
              title="Download vector SVG for label thermal printers"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Save SVG</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-print-shelf-label"
              onClick={handlePrint}
              disabled={!qrDataUrl}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              title="Send shelf sticker label to printer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Shelf Label</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
