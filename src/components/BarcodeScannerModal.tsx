import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Flashlight,
  Upload,
  CheckCircle2,
  AlertCircle,
  Barcode,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  SlidersHorizontal,
  Package,
  Layers,
  MapPin,
  Tag,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { SparePart } from '../types';
import { playBarcodeBeep, findPartByBarcodeOrSku } from '../utils/barcodeService';
import { formatRwf } from '../utils/i18n';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SparePart[];
  title?: string;
  subtitle?: string;
  mode?: 'general' | 'search' | 'stockIn' | 'stockOut' | 'adjustment' | 'addPart';
  onScanSuccess: (barcode: string, matchedPart?: SparePart) => void;
  onOpenStockIn?: (partId: string) => void;
  onOpenStockOut?: (partId: string) => void;
  onOpenAdjustment?: (partId: string) => void;
  onOpenAddPartWithBarcode?: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  parts,
  title,
  subtitle,
  mode = 'general',
  onScanSuccess,
  onOpenStockIn,
  onOpenStockOut,
  onOpenAdjustment,
  onOpenAddPartWithBarcode,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [scannedResult, setScannedResult] = useState<{
    rawCode: string;
    part?: SparePart;
  } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'test'>('camera');
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-scanner-viewport-mount';

  // Modal titles based on mode
  const displayTitle = title || (
    mode === 'stockIn'
      ? 'Scan Barcode for Stock In Delivery'
      : mode === 'stockOut'
      ? 'Scan Barcode for Stock Out Sale'
      : mode === 'search'
      ? 'Scan Barcode to Find Part'
      : mode === 'adjustment'
      ? 'Scan Barcode for Physical Inventory Count'
      : 'Camera Barcode Scanner'
  );

  const displaySubtitle = subtitle || (
    mode === 'stockIn'
      ? 'Point camera at item barcode to automatically select part and record incoming delivery'
      : mode === 'stockOut'
      ? 'Scan item barcode to instantly select part and verify current stock availability'
      : mode === 'search'
      ? 'Scan any 1D or 2D barcode to instantly filter and populate part search'
      : 'Align barcode inside the viewfinder box to identify part and populate forms'
  );

  // Initialize camera list
  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const list = devices.map((d) => ({
            id: d.id,
            label: d.label || `Camera ${d.id.slice(0, 5)}`,
          }));
          setAvailableCameras(list);
          // Prefer back camera if available
          const backCam = list.find((c) =>
            c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : list[0].id);
        }
      })
      .catch(() => {
        // Camera enumeration might fail if permissions not yet asked
      });
  }, [isOpen]);

  // Start scanner when camera is active and modal is open
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopCamera();
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      // Small timeout to allow DOM element to render
      await new Promise((r) => setTimeout(r, 100));
      if (!isMounted) return;

      const element = document.getElementById(scannerContainerId);
      if (!element) return;

      try {
        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop();
            }
            html5QrCodeRef.current.clear();
          } catch {}
        }

        const scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
        });

        html5QrCodeRef.current = scanner;

        const cameraConfig = selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: 'environment' };

        const scanConfig = {
          fps: 12,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.333333,
        };

        await scanner.start(
          cameraConfig,
          scanConfig,
          (decodedText) => {
            handleCodeScanned(decodedText);
          },
          () => {
            // Ignored frame failures
          }
        );

        if (isMounted) {
          setCameraActive(true);
          setCameraError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setCameraActive(false);
          setCameraError(
            err?.message ||
              'Unable to access camera. Please ensure camera permissions are granted in your browser.'
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, selectedCameraId, activeTab]);

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !cameraActive) return;
    try {
      // Html5Qrcode torch toggle via applyVideoConstraints
      const newTorch = !torchOn;
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: newTorch }],
      });
      setTorchOn(newTorch);
    } catch {
      // Torch not supported on device
    }
  };

  const handleCodeScanned = (rawCode: string) => {
    if (!rawCode || !rawCode.trim()) return;

    // Play feedback beep sound
    playBarcodeBeep();

    const matched = findPartByBarcodeOrSku(parts, rawCode);

    setScannedResult({
      rawCode: rawCode.trim(),
      part: matched,
    });

    // If modal is in single-target mode (like stockIn or stockOut or search), we can trigger callback
    onScanSuccess(rawCode.trim(), matched);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);

    try {
      // Create temporary scanner instance for file scanning
      const fileScanner = new Html5Qrcode('file-scanner-temp-box', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      const decodedText = await fileScanner.scanFile(file, false);
      handleCodeScanned(decodedText);
      fileScanner.clear();
    } catch (err: any) {
      setCameraError('No readable barcode or QR code was detected in this photo. Please try another image.');
    } finally {
      setIsProcessingFile(false);
      e.target.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleCodeScanned(manualCode.trim());
      setManualCode('');
    }
  };

  const handleResetScan = () => {
    setScannedResult(null);
    setCameraError(null);
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-barcode-scanner"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{displayTitle}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950 uppercase">
                  Live Camera
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">{displaySubtitle}</p>
            </div>
          </div>
          <button
            id="btn-close-barcode-scanner"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Live Camera / Upload Photo / Quick Test Barcodes) */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-5 pt-2 gap-2 text-xs">
          <button
            id="tab-scanner-camera"
            onClick={() => {
              handleResetScan();
              setActiveTab('camera');
            }}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'camera'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Device Camera</span>
          </button>

          <button
            id="tab-scanner-test-barcodes"
            onClick={() => {
              setActiveTab('test');
            }}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'test'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick Test Barcodes</span>
            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {parts.length}
            </span>
          </button>

          <button
            id="tab-scanner-upload"
            onClick={() => {
              setActiveTab('upload');
            }}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Scan from Image</span>
          </button>
        </div>

        {/* Main Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Detected Item Card Banner if scanned */}
          {scannedResult && (
            <div
              id="scanned-result-card"
              className={`p-4 rounded-xl border animate-in zoom-in-95 duration-150 ${
                scannedResult.part
                  ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-amber-50/80 border-amber-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      scannedResult.part
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {scannedResult.part ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <AlertCircle className="w-6 h-6" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 font-mono">
                        {scannedResult.rawCode}
                      </span>
                      {scannedResult.part && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Match Found
                        </span>
                      )}
                    </div>

                    {scannedResult.part ? (
                      <div className="mt-1.5 space-y-1">
                        <h4 className="font-bold text-sm text-slate-950">
                          {scannedResult.part.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                          <span>
                            SKU: <strong className="font-mono text-slate-900">{scannedResult.part.sku}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Current Stock:{' '}
                            <strong
                              className={
                                scannedResult.part.quantity === 0
                                  ? 'text-rose-600'
                                  : scannedResult.part.quantity <= scannedResult.part.reorderLevel
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }
                            >
                              {scannedResult.part.quantity} {scannedResult.part.unit}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Retail: <strong className="text-slate-900">{formatRwf(scannedResult.part.sellPrice)}</strong>
                          </span>
                          {scannedResult.part.shelfLocation && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-slate-500">
                                <MapPin className="w-3 h-3" />
                                {scannedResult.part.shelfLocation}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <div className="text-xs font-semibold text-slate-900">
                          No matching inventory part found for code "{scannedResult.rawCode}"
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          You can register a new spare part under this barcode or try scanning again.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  id="btn-scan-again-reset"
                  onClick={handleResetScan}
                  className="text-xs text-slate-500 hover:text-slate-800 p-1 flex items-center gap-1"
                  title="Scan another barcode"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rescan</span>
                </button>
              </div>

              {/* Action Buttons for Scanned Part */}
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200/80">
                {scannedResult.part ? (
                  <>
                    {/* Mode-specific primary button or general multi-action */}
                    {mode === 'stockIn' && onOpenStockIn && (
                      <button
                        id="btn-action-populate-stockin"
                        onClick={() => {
                          onClose();
                          onOpenStockIn(scannedResult.part!.id);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>Confirm & Populate Stock In</span>
                      </button>
                    )}

                    {mode === 'stockOut' && onOpenStockOut && (
                      <button
                        id="btn-action-populate-stockout"
                        onClick={() => {
                          onClose();
                          onOpenStockOut(scannedResult.part!.id);
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Confirm & Populate Stock Out</span>
                      </button>
                    )}

                    {mode === 'search' && (
                      <button
                        id="btn-action-populate-search"
                        onClick={() => {
                          onScanSuccess(scannedResult.rawCode, scannedResult.part);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Populate Part Search</span>
                      </button>
                    )}

                    {mode === 'adjustment' && onOpenAdjustment && (
                      <button
                        id="btn-action-populate-adjustment"
                        onClick={() => {
                          onClose();
                          onOpenAdjustment(scannedResult.part!.id);
                        }}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Populate Physical Count</span>
                      </button>
                    )}

                    {mode === 'general' && (
                      <>
                        {onOpenStockIn && (
                          <button
                            id="btn-quick-stockin-from-scan"
                            onClick={() => {
                              onClose();
                              onOpenStockIn(scannedResult.part!.id);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            <span>Stock In (+)</span>
                          </button>
                        )}
                        {onOpenStockOut && (
                          <button
                            id="btn-quick-stockout-from-scan"
                            onClick={() => {
                              onClose();
                              onOpenStockOut(scannedResult.part!.id);
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Stock Out (-)</span>
                          </button>
                        )}
                        <button
                          id="btn-quick-search-from-scan"
                          onClick={() => {
                            onScanSuccess(scannedResult.rawCode, scannedResult.part);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>View in Catalog</span>
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  onOpenAddPartWithBarcode && (
                    <button
                      id="btn-register-scanned-code"
                      onClick={() => {
                        onClose();
                        onOpenAddPartWithBarcode(scannedResult.rawCode);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Register as New Catalog Part</span>
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* TAB 1: LIVE CAMERA VIEW */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              {/* Camera Container with Viewfinder Frame */}
              <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-4/3 flex items-center justify-center border border-slate-800 shadow-inner">
                {/* HTML5 QR Code Mount Element */}
                <div
                  id={scannerContainerId}
                  className="w-full h-full object-cover flex items-center justify-center [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
                />

                {/* Laser Overlay & Target Reticle */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  {/* Outer dim background */}
                  <div className="relative w-64 sm:w-72 h-40 border-2 border-amber-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] flex items-center justify-center overflow-hidden">
                    {/* Animated scanning laser line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-pulse" />

                    {/* Corner Target Indicators */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400" />
                  </div>

                  <span className="mt-3 text-[11px] font-semibold tracking-wide text-white bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-xs border border-white/10 shadow-xs">
                    Align barcode inside target box
                  </span>
                </div>

                {/* Camera Top Bar Controls */}
                <div className="absolute top-3 right-3 flex items-center space-x-1.5 z-10">
                  {availableCameras.length > 1 && (
                    <button
                      onClick={() => {
                        const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
                        const nextIndex = (currentIndex + 1) % availableCameras.length;
                        setSelectedCameraId(availableCameras[nextIndex].id);
                      }}
                      className="p-2 rounded-lg bg-slate-900/80 text-white hover:bg-slate-800 backdrop-blur-xs border border-white/10 transition"
                      title="Switch Camera (Front / Back)"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={handleToggleTorch}
                    className={`p-2 rounded-lg backdrop-blur-xs border transition ${
                      torchOn
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                        : 'bg-slate-900/80 text-white hover:bg-slate-800 border-white/10'
                    }`}
                    title="Toggle Flashlight / Torch"
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>
                </div>

                {/* Error Banner inside camera */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center z-20 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">Camera Access Blocked or Unavailable</h4>
                      <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => {
                          setCameraError(null);
                          setSelectedCameraId((prev) => (prev ? prev : 'default'));
                        }}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                      >
                        Retry Camera
                      </button>
                      <button
                        onClick={() => setActiveTab('test')}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"
                      >
                        Use 1-Click Test Barcodes
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Switcher Dropdown if multiple */}
              {availableCameras.length > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                  <span>Selected Lens:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium"
                  >
                    {availableCameras.map((cam) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QUICK 1-CLICK TEST BARCODES */}
          {activeTab === 'test' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <strong>Instant 1-Click Scanner Testing:</strong> Click any of your inventory parts below to simulate an instantaneous camera barcode read with retail confirmation beep sound and automatic form population.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {parts.map((p) => {
                  const code = p.barcode || p.sku;
                  return (
                    <button
                      key={p.id}
                      id={`btn-test-scan-part-${p.id}`}
                      onClick={() => handleCodeScanned(code)}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-amber-400 rounded-xl text-left transition group shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {code}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            {p.sku}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-slate-900 mt-1.5 group-hover:text-amber-700 transition line-clamp-1">
                          {p.name}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                        <span>Stock: {p.quantity} {p.unit}</span>
                        <span className="font-semibold text-slate-700">{formatRwf(p.sellPrice)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: FILE UPLOAD SCAN */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-amber-500 transition bg-slate-50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-800">Upload Barcode Photo or Label</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                  Upload an image (PNG, JPG) of a product barcode, packaging label, or receipt
                </p>

                <label
                  id="btn-browse-barcode-image"
                  className="inline-flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  <span>Choose Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessingFile}
                  />
                </label>

                {isProcessingFile && (
                  <p className="text-xs text-amber-700 font-semibold mt-2 animate-pulse">
                    Scanning photo for barcodes...
                  </p>
                )}
              </div>

              <div id="file-scanner-temp-box" className="hidden" />
            </div>
          )}

          {/* Manual Input Fallback */}
          <div className="pt-2 border-t border-slate-200">
            <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-manual-barcode"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Or type/paste Barcode or SKU (e.g. 07894561001 or BP-TY-084)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>
              <button
                id="btn-submit-manual-barcode"
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition whitespace-nowrap shadow-xs"
              >
                Scan Code
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <Barcode className="w-4 h-4 text-slate-400" />
            <span>Supported: EAN-13, UPC-A, Code-128, Code-39, QR Code</span>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
