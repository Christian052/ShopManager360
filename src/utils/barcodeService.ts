import { SparePart } from '../types';

/**
 * Web Audio API synthesizer for crisp POS retail barcode scanner beep
 * Produces the familiar supermarket / warehouse scanner "chirp" (1760 Hz, 75ms)
 */
export function playBarcodeBeep(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // 1760 Hz is A6 - standard high-pitch POS confirmation beep
    osc.frequency.setValueAtTime(1760, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);

    // Haptic vibration feedback on mobile devices if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(60);
    }
  } catch {
    // Blocked or unsupported audio context
  }
}

/**
 * Smart lookup function to locate a SparePart given scanned barcode or SKU text
 * Supports raw barcodes, SKUs, formatted QR codes (URLs, JSON, prefixes like SKU:xxx)
 */
export function findPartByBarcodeOrSku(
  parts: SparePart[],
  scannedCode: string
): SparePart | undefined {
  if (!scannedCode || !scannedCode.trim()) return undefined;

  let raw = scannedCode.trim();

  // Try extracting SKU from JSON if QR code contains structured data
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.sku) raw = String(parsed.sku).trim();
      else if (parsed.barcode) raw = String(parsed.barcode).trim();
      else if (parsed.id) raw = String(parsed.id).trim();
    } catch {}
  }

  // Try extracting SKU from URL query parameter (e.g., https://app.example.com/?sku=BP-TY-084)
  if (raw.includes('http://') || raw.includes('https://') || raw.includes('?')) {
    try {
      const url = new URL(raw.startsWith('http') ? raw : `https://dummy.org/${raw}`);
      const skuParam = url.searchParams.get('sku') || url.searchParams.get('SKU');
      const barcodeParam = url.searchParams.get('barcode') || url.searchParams.get('BARCODE');
      const idParam = url.searchParams.get('id') || url.searchParams.get('partId');
      if (skuParam) raw = skuParam.trim();
      else if (barcodeParam) raw = barcodeParam.trim();
      else if (idParam) raw = idParam.trim();
    } catch {}
  }

  // Remove common prefix labels like "SKU:", "BARCODE:", "ID:"
  if (/^(sku|barcode|ean|upc|part|id)\s*[:=\-]\s*/i.test(raw)) {
    raw = raw.replace(/^(sku|barcode|ean|upc|part|id)\s*[:=\-]\s*/i, '').trim();
  }

  const cleanCode = raw.toLowerCase();
  const digitsOnly = raw.replace(/\D/g, '');

  // 1. Direct barcode match
  let found = parts.find(
    (p) => p.barcode && p.barcode.trim().toLowerCase() === cleanCode
  );
  if (found) return found;

  // 2. Direct SKU match (case-insensitive)
  found = parts.find(
    (p) => p.sku && p.sku.trim().toLowerCase() === cleanCode
  );
  if (found) return found;

  // 3. Digits-only barcode match (for UPC-A vs EAN-13 padding)
  if (digitsOnly.length >= 6) {
    found = parts.find((p) => {
      if (!p.barcode) return false;
      const partDigits = p.barcode.replace(/\D/g, '');
      return (
        partDigits === digitsOnly ||
        partDigits.endsWith(digitsOnly) ||
        digitsOnly.endsWith(partDigits)
      );
    });
    if (found) return found;
  }

  // 4. Exact ID match
  found = parts.find((p) => p.id === raw);
  if (found) return found;

  // 5. SKU contains or partial match (if length >= 4)
  if (cleanCode.length >= 4) {
    found = parts.find(
      (p) =>
        p.sku.toLowerCase().includes(cleanCode) ||
        cleanCode.includes(p.sku.toLowerCase())
    );
    if (found) return found;
  }

  return undefined;
}
