import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Flashlight,
  Upload,
  CheckCircle2,
  AlertCircle,
  QrCode,
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
  Sparkles,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
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
  const [hasTorchCapability, setHasTorchCapability] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [autoSelectOnScan, setAutoSelectOnScan] = useState<boolean>(true);
  const [autoSelectingStatus, setAutoSelectingStatus] = useState<string | null>(null);

  const [scannedResult, setScannedResult] = useState<{
    rawCode: string;
    part?: SparePart;
  } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'test'>('camera');
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const activeMediaStreamRef = useRef<MediaStream | null>(null);
  const activeVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const isSelectingInProgressRef = useRef<boolean>(false);
  const scannerContainerId = 'barcode-scanner-viewport-mount';

  // Modal titles based on mode
  const displayTitle = title || (
    mode === 'stockIn'
      ? 'Scan QR Code for Stock In Delivery'
      : mode === 'stockOut'
      ? 'Scan QR Code for Stock Out Sale'
      : mode === 'search'
      ? 'Scan QR Code to Find Part'
      : mode === 'adjustment'
      ? 'Scan QR Code for Physical Inventory Count'
      : 'QR Code Scanner'
  );

  const displaySubtitle = subtitle || (
    mode === 'stockIn'
      ? 'Point camera at item QR code to automatically select part and record incoming delivery'
      : mode === 'stockOut'
      ? 'Scan item QR code to instantly select part and verify current stock availability'
      : mode === 'search'
      ? 'Scan product or shelf QR code to instantly filter and locate part'
      : 'Align QR code inside the viewfinder box to identify part and populate forms'
  );


  /**
   * Enumerate camera video input devices using the navigator.mediaDevices API
   */
  const enumerateDevicesWithMediaDevices = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      setCameraError('navigator.mediaDevices API is not supported in this browser environment.');
      return;
    }

    try {
      // Step 1: Prompt initial camera permission if needed so labels are accessible
      let initialStream: MediaStream | null = null;
      try {
        initialStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      } catch (permErr: any) {
        console.warn('Initial navigator.mediaDevices.getUserMedia probe:', permErr);
      }

      // Step 2: Enumerate devices using navigator.mediaDevices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      if (videoDevices.length > 0) {
        const list = videoDevices.map((d, idx) => ({
          id: d.deviceId,
          label: d.label || `Camera ${idx + 1} (${d.deviceId.slice(0, 6)}...)`,
        }));
        setAvailableCameras(list);

        // Prefer environmental / back camera for scanning physical barcodes
        const backCam = list.find((c) =>
          /back|rear|environment|macro|wide/i.test(c.label)
        );
        setSelectedCameraId(backCam ? backCam.id : list[0].id);
      }

      // Clean up initial probe stream
      if (initialStream) {
        initialStream.getTracks().forEach((track) => track.stop());
      }
    } catch (err: any) {
      console.error('Failed to enumerate devices with navigator.mediaDevices', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      isSelectingInProgressRef.current = false;
      setAutoSelectingStatus(null);
      enumerateDevicesWithMediaDevices();
    } else {
      stopCamera();
    }
  }, [isOpen]);

  /**
   * Start camera and live barcode scanning
   */
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopCamera();
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      // Wait briefly for the DOM element to mount
      await new Promise((r) => setTimeout(r, 120));
      if (!isMounted) return;

      const element = document.getElementById(scannerContainerId);
      if (!element) return;

      try {
        await stopCamera();

        // 1. Acquire video stream with navigator.mediaDevices to inspect track capabilities
        if (navigator?.mediaDevices?.getUserMedia) {
          try {
            const constraints: MediaStreamConstraints = {
              video: selectedCameraId
                ? { deviceId: { exact: selectedCameraId } }
                : { facingMode: { ideal: 'environment' } },
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            activeMediaStreamRef.current = stream;
            const track = stream.getVideoTracks()[0];
            if (track) {
              activeVideoTrackRef.current = track;
              const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
              setHasTorchCapability(Boolean(capabilities?.torch));
              if (capabilities?.zoom) {
                setZoomRange({
                  min: capabilities.zoom.min || 1,
                  max: capabilities.zoom.max || 4,
                  step: capabilities.zoom.step || 0.1,
                });
                setZoomLevel(1);
              } else {
                setZoomRange(null);
              }
            }
          } catch (streamErr) {
            console.warn('Direct mediaDevices capability probe error:', streamErr);
          }
        }

        // 2. Initialize Html5Qrcode barcode decoder on the mount container
        const scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });

        html5QrCodeRef.current = scanner;

        const cameraConfig = selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: 'environment' };

        const scanConfig = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.333333,
        };

        await scanner.start(
          cameraConfig,
          scanConfig,
          (decodedText) => {
            handleCodeScanned(decodedText);
          },
          () => {
            // Ignored frame scan failures
          }
        );

        if (isMounted) {
          setCameraActive(true);
          setCameraError(null);

          // Hook into the active video element's media track from Html5Qrcode
          const videoElement = element.querySelector('video') as HTMLVideoElement | null;
          if (videoElement && videoElement.srcObject instanceof MediaStream) {
            const track = videoElement.srcObject.getVideoTracks()[0];
            if (track) {
              activeVideoTrackRef.current = track;
              const caps = (track.getCapabilities ? track.getCapabilities() : {}) as any;
              if (caps?.torch) setHasTorchCapability(true);
              if (caps?.zoom) {
                setZoomRange({
                  min: caps.zoom.min || 1,
                  max: caps.zoom.max || 4,
                  step: caps.zoom.step || 0.1,
                });
              }
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setCameraActive(false);
          let errorMsg = 'Unable to access camera via navigator.mediaDevices.';
          if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
            errorMsg = 'Camera permission was denied. Please allow camera access in your browser settings to scan barcodes.';
          } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
            errorMsg = 'No camera found on this device. You can test with sample barcodes or upload an image instead.';
          } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
            errorMsg = 'Camera is currently in use by another application. Please close other camera tabs and retry.';
          } else if (err?.message) {
            errorMsg = err.message;
          }
          setCameraError(errorMsg);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, selectedCameraId, activeTab]);

  /**
   * Stop camera tracks cleanly
   */
  const stopCamera = async () => {
    if (activeVideoTrackRef.current) {
      try {
        activeVideoTrackRef.current.stop();
      } catch {}
      activeVideoTrackRef.current = null;
    }

    if (activeMediaStreamRef.current) {
      try {
        activeMediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      activeMediaStreamRef.current = null;
    }

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

  /**
   * Toggle hardware torch using navigator.mediaDevices Track API
   */
  const handleToggleTorch = async () => {
    const track = activeVideoTrackRef.current;
    if (!track) return;

    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch constraint error via navigator.mediaDevices', err);
    }
  };

  /**
   * Apply optical / digital zoom via navigator.mediaDevices Track API
   */
  const handleZoomChange = async (newZoom: number) => {
    const track = activeVideoTrackRef.current;
    if (!track) return;

    try {
      await (track as any).applyConstraints({
        advanced: [{ zoom: newZoom }],
      });
      setZoomLevel(newZoom);
    } catch (err) {
      console.warn('Zoom constraint error', err);
    }
  };

  /**
   * Automatically fetch and select spare part when barcode is detected
   */
  const handleCodeScanned = (rawCode: string) => {
    if (!rawCode || !rawCode.trim()) return;
    if (isSelectingInProgressRef.current) return;

    // Audible confirmation beep
    playBarcodeBeep();

    const cleanCode = rawCode.trim();
    const matched = findPartByBarcodeOrSku(parts, cleanCode);

    setScannedResult({
      rawCode: cleanCode,
      part: matched,
    });

    // Auto-Select Workflow: If enabled and a matching part is found, automatically select and proceed
    if (autoSelectOnScan && matched) {
      isSelectingInProgressRef.current = true;
      setAutoSelectingStatus(`Matched: ${matched.name} (${matched.sku}) — Auto-Selecting...`);

      setTimeout(() => {
        stopCamera();
        onClose();

        // Automatically trigger mode-specific action
        if (mode === 'stockIn' && onOpenStockIn) {
          onOpenStockIn(matched.id);
        } else if (mode === 'stockOut' && onOpenStockOut) {
          onOpenStockOut(matched.id);
        } else if (mode === 'adjustment' && onOpenAdjustment) {
          onOpenAdjustment(matched.id);
        }

        // Notify parent callback
        onScanSuccess(cleanCode, matched);
        isSelectingInProgressRef.current = false;
      }, 450);
    } else {
      // Inspection mode or code not matched: keep scanner open and notify parent
      onScanSuccess(cleanCode, matched);
    }
  };

  /**
   * Image file upload scanning
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);

    try {
      const fileScanner = new Html5Qrcode('file-scanner-temp-box', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      const decodedText = await fileScanner.scanFile(file, false);
      handleCodeScanned(decodedText);
      fileScanner.clear();
    } catch (err: any) {
      setCameraError('No readable QR code detected in this photo. Please try another image.');
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
    setAutoSelectingStatus(null);
    isSelectingInProgressRef.current = false;
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-barcode-scanner"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{displayTitle}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950 uppercase">
                  MediaDevices Camera
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
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-Select Feature Toggle & Workflow Bar */}
        <div className="px-5 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="toggle-auto-select-scan"
              onClick={() => setAutoSelectOnScan(!autoSelectOnScan)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition text-[11px] border ${
                autoSelectOnScan
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title="Automatically select part and proceed immediately when QR code is detected"
            >
              <Zap className={`w-3.5 h-3.5 ${autoSelectOnScan ? 'text-amber-300' : 'text-slate-400'}`} />
              <span>Auto-Select on Scan: <strong>{autoSelectOnScan ? 'ON' : 'OFF'}</strong></span>
            </button>
            <span className="hidden sm:inline text-slate-500 text-[11px]">
              {autoSelectOnScan ? 'Fetches & selects part automatically' : 'Inspect specs before selection'}
            </span>
          </div>

          <span className="text-[11px] font-mono font-medium text-slate-500">
            Catalog: {parts.length} parts
          </span>
        </div>

        {/* Navigation Tabs (Device Camera / Instant QR Testing / Scan from Image) */}
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
            onClick={() => setActiveTab('test')}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'test'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Instant QR Testing</span>
            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
              {parts.length}
            </span>
          </button>

          <button
            id="tab-scanner-upload"
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload QR Image</span>
          </button>
        </div>

        {/* Main Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Automatic Selection Progress Flash */}
          {autoSelectingStatus && (
            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md flex items-center justify-between animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                <span>{autoSelectingStatus}</span>
              </div>
              <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded uppercase">
                Selecting...
              </span>
            </div>
          )}

          {/* Detected Item Card Banner if scanned */}
          {scannedResult && !autoSelectingStatus && (
            <div
              id="scanned-result-card"
              className={`p-4 rounded-xl border animate-in zoom-in-95 duration-150 ${
                scannedResult.part
                  ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-amber-50/90 border-amber-300'
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
                          Part Identified
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
                              <span className="flex items-center gap-0.5 text-slate-700 font-medium">
                                <MapPin className="w-3 h-3 text-rose-500" />
                                {scannedResult.part.shelfLocation}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <div className="text-xs font-semibold text-slate-900">
                          No matching inventory part found for QR code "{scannedResult.rawCode}"
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          You can register a new spare part under this QR code or try scanning again.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  id="btn-scan-again-reset"
                  onClick={handleResetScan}
                  className="text-xs text-slate-500 hover:text-slate-800 p-1 flex items-center gap-1"
                  title="Scan another QR code"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rescan</span>
                </button>
              </div>

              {/* Action Buttons for Scanned Part */}
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200/80">
                {scannedResult.part ? (
                  <>
                    {/* Primary Mode-Specific Actions */}
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
                        <span>Select for Stock In Delivery</span>
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
                        <span>Select for Stock Out Sale</span>
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
                        <span>Filter Catalog to this Part</span>
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
                        <span>Select for Count Reconciliation</span>
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
                      <span>Register as New Part</span>
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

                {/* Laser Overlay & Target Reticle for Square QR Code */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="relative w-56 sm:w-64 h-56 sm:h-64 border-2 border-amber-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.52)] flex items-center justify-center overflow-hidden">
                    {/* Scanning laser effect */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b] animate-pulse" />

                    {/* Corner Target Reticles for QR Code */}
                    <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-amber-400 rounded-tl-sm" />
                    <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-amber-400 rounded-tr-sm" />
                    <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-amber-400 rounded-bl-sm" />
                    <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-amber-400 rounded-br-sm" />
                  </div>

                  <span className="mt-3 text-[11px] font-semibold tracking-wide text-white bg-slate-900/90 px-3 py-1 rounded-full backdrop-blur-xs border border-white/10 shadow-xs flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-amber-400" />
                    <span>Align QR code in square frame</span>
                  </span>
                </div>

                {/* Camera Top Bar Controls (Torch, Zoom, Camera Switcher) */}
                <div className="absolute top-3 right-3 flex items-center space-x-1.5 z-10">
                  {availableCameras.length > 1 && (
                    <button
                      onClick={() => {
                        const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
                        const nextIndex = (currentIndex + 1) % availableCameras.length;
                        setSelectedCameraId(availableCameras[nextIndex].id);
                      }}
                      className="p-2 rounded-lg bg-slate-900/80 text-white hover:bg-slate-800 backdrop-blur-xs border border-white/10 transition"
                      title="Switch Camera Device via navigator.mediaDevices"
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
                    title={hasTorchCapability ? 'Toggle Torch Light' : 'Hardware Torch'}
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>
                </div>

                {/* Hardware Zoom Controls if supported */}
                {zoomRange && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/10 z-10 text-white text-xs">
                    <button
                      type="button"
                      onClick={() => handleZoomChange(Math.max(zoomRange.min, zoomLevel - zoomRange.step))}
                      disabled={zoomLevel <= zoomRange.min}
                      className="p-1 hover:bg-slate-800 rounded disabled:opacity-40"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-bold text-[11px] px-1">{zoomLevel.toFixed(1)}x</span>
                    <button
                      type="button"
                      onClick={() => handleZoomChange(Math.min(zoomRange.max, zoomLevel + zoomRange.step))}
                      disabled={zoomLevel >= zoomRange.max}
                      className="p-1 hover:bg-slate-800 rounded disabled:opacity-40"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Camera Error Message */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center z-20 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">Camera Access Error</h4>
                      <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => {
                          setCameraError(null);
                          enumerateDevicesWithMediaDevices();
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

              {/* Camera Switcher Dropdown */}
              {availableCameras.length > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                  <span>Selected Lens (navigator.mediaDevices):</span>
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

          {/* TAB 2: INSTANT QR CODE TESTING */}
          {activeTab === 'test' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Instant QR Testing:</strong> Click any of your inventory parts below to simulate an instantaneous camera QR read with confirmation chirp and automatic part selection.
                </span>
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
                          <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                            <QrCode className="w-3 h-3 text-amber-600" />
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
                <h4 className="text-xs font-bold text-slate-800">Upload QR Code Photo or Shelf Label</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                  Upload an image (PNG, JPG) of a product QR code, shelf tag, or packaging label
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
                    Scanning photo for QR code...
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
                <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-manual-barcode"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Or type/paste QR Code or SKU (e.g. BP-TY-084)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>
              <button
                id="btn-submit-manual-barcode"
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition whitespace-nowrap shadow-xs flex items-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Locate Part</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>navigator.mediaDevices Camera | 2D ISO QR Code Decoder</span>
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

export const QrCodeScannerModal = BarcodeScannerModal;

