import { Tenant, SparePart, StockAlertNotification, NotificationSettings } from '../types';
import { formatRwf } from './i18n';

/**
 * Web Audio API gentle two-tone alert chime for inventory breaches
 * Synthesized locally so no external audio files or network requests are needed
 */
export function playAlertChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(0.15, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);
  } catch {
    // AudioContext blocked or restricted in headless/sandbox environment
  }
}

/**
 * Check if the browser supports desktop notifications and get permission status
 */
export function getDesktopNotificationStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request desktop notification permission from user
 */
export async function requestDesktopNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    // Some iframe configurations throw a security error when requesting permissions
    return 'denied';
  }
}

/**
 * Fire an automated browser desktop notification
 */
export function fireDesktopNotification(title: string, body: string, icon?: string): 'sent' | 'blocked' | 'disabled' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'disabled';
  }

  if (Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        tag: `stock-alert-${Date.now()}`,
      });

      // Auto close notification after 8 seconds
      setTimeout(() => {
        try {
          n.close();
        } catch {}
      }, 8000);

      return 'sent';
    } catch {
      return 'blocked';
    }
  }

  return 'blocked';
}

/**
 * Generates email content for an automated restock order notification
 */
export function generateRestockEmailDetails(
  tenant: Tenant,
  part: SparePart,
  suggestedQty: number
): { subject: string; bodyText: string; bodyHtml: string } {
  const isOutOfStock = part.quantity === 0;
  const estimatedTotalCost = suggestedQty * part.costPrice;
  const dateStr = new Date().toLocaleString('en-RW', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const urgencyTag = isOutOfStock ? 'CRITICAL: OUT OF STOCK' : 'WARNING: LOW STOCK ALERT';
  const subject = `[ShopManager360 Alert] ${urgencyTag} - ${part.name} (${part.sku})`;

  const bodyText = `
AUTOMATED INVENTORY RESTOCK NOTIFICATION
=========================================
Shop: ${tenant.businessName} (${tenant.district}, Rwanda)
Date/Time: ${dateStr}
TIN: ${tenant.tinNumber || 'N/A'}
Contact Phone: ${tenant.phone}

STATUS: ${isOutOfStock ? 'OUT OF STOCK (0 UNITS REMAINING)' : `BELOW REORDER LEVEL (${part.quantity} / ${part.reorderLevel} ${part.unit})`}

ITEM DETAILS:
-------------
- Part Name: ${part.name}
- SKU / Code: ${part.sku}
- Shelf Location: ${part.shelfLocation || 'Unassigned'}
- Current Stock: ${part.quantity} ${part.unit}
- Reorder Threshold: ${part.reorderLevel} ${part.unit}
- Unit Cost: ${formatRwf(part.costPrice)}
- Unit Selling Price: ${formatRwf(part.sellPrice)}

RECOMMENDED REPLENISHMENT ORDER:
--------------------------------
- Recommended Order Qty: ${suggestedQty} ${part.unit}
- Estimated Replenishment Cost: ${formatRwf(estimatedTotalCost)}

SUPPLIER CONTACT:
-----------------
- Supplier Name: ${part.supplier}
- Supplier Phone: ${part.supplierPhone || 'See purchasing directory'}

Please review this restock order in ShopManager360 and issue a purchase order to prevent business interruption.
`.trim();

  const bodyHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
  <div style="background: ${isOutOfStock ? '#e11d48' : '#d97706'}; color: #ffffff; padding: 20px; text-align: center;">
    <h2 style="margin: 0 0 6px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px;">${urgencyTag}</h2>
    <p style="margin: 0; font-size: 13px; opacity: 0.9;">Automated notification from ShopManager360 ERP</p>
  </div>

  <div style="padding: 24px;">
    <p style="margin-top: 0; font-size: 14px; color: #334155;">
      Hello <strong>${tenant.businessName}</strong> inventory team,
    </p>
    <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
      A stock deduction has dropped inventory for <strong>${part.name}</strong> to or below its minimum safety threshold. Immediate replenishment is recommended.
    </p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Item / Part Name:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${part.name}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">SKU / Code:</td>
          <td style="padding: 6px 0; font-family: monospace; font-weight: bold; color: #475569;">${part.sku}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Current Stock Remaining:</td>
          <td style="padding: 6px 0; font-weight: bold; color: ${isOutOfStock ? '#e11d48' : '#d97706'};">
            ${part.quantity} ${part.unit} (Threshold: ${part.reorderLevel} ${part.unit})
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Shelf / Rack Location:</td>
          <td style="padding: 6px 0; color: #334155;">${part.shelfLocation || 'Main Warehouse'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Suggested Order Qty:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${suggestedQty} ${part.unit}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Estimated Cost Basis:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${formatRwf(estimatedTotalCost)}</td>
        </tr>
      </table>
    </div>

    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin: 16px 0; border-radius: 4px;">
      <div style="font-size: 11px; font-weight: bold; color: #1e40af; text-transform: uppercase;">Designated Supplier:</div>
      <div style="font-size: 14px; font-weight: bold; color: #1e3a8a; margin-top: 2px;">${part.supplier}</div>
      <div style="font-size: 12px; color: #3b82f6; margin-top: 2px;">
        Tel: <a href="tel:${part.supplierPhone || ''}" style="color: #2563eb; font-weight: bold; text-decoration: none;">${part.supplierPhone || '+250 (Wholesale Partner)'}</a>
      </div>
    </div>
  </div>

  <div style="background: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
    ShopManager360 Rwanda • Multi-Tenant SME Inventory System • Nyarugenge, Kigali
  </div>
</div>
`.trim();

  return { subject, bodyText, bodyHtml };
}
