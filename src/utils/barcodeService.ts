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
 */
export function findPartByBarcodeOrSku(
  parts: SparePart[],
  scannedCode: string
): SparePart | undefined {
  if (!scannedCode || !scannedCode.trim()) return undefined;

  const raw = scannedCode.trim();
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
