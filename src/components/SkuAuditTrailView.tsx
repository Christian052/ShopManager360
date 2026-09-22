import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  SlidersHorizontal,
  Tag,
  Calendar,
  User as UserIcon,
  Download,
  Printer,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Plus,
  Edit2,
  QrCode,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  List,
  Columns,
  Sparkles,
  Package,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { SparePart, Category, StockTransaction, ActivityLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatRwf } from '../utils/i18n';

export interface SkuAuditTrailViewProps {
  parts: SparePart[];
  categories: Category[];
  transactions: StockTransaction[];
  activityLogs: ActivityLog[];
  selectedPartId: string | null;
  onSelectPartId: (id: string) => void;
  onOpenStockIn: (partId: string) => void;
  onOpenStockOut: (partId: string) => void;
  onOpenAdjustment: (partId: string) => void;
  onOpenEditPart: (part: SparePart) => void;
  onOpenQrModal?: (part: SparePart) => void;
  onBackToCatalog: () => void;
}

export type SkuEventType = 'all' | 'in' | 'out' | 'adjustment' | 'price' | 'master';

export interface UnifiedSkuAuditEvent {
  id: string;
  source: 'transaction' | 'activity_log';
  timestamp: string;
  type: 'in' | 'out' | 'adjustment' | 'price_change' | 'master_update';
  title: string;
  categoryLabel: string;
  quantityChange?: number;
  previousQuantity?: number;
  newQuantity?: number;
  unitCostPrice?: number;
  unitSellPrice?: number;
  totalValue?: number;
  reason: string;
  referenceNo?: string;
  notes?: string;
  userName: string;
  userRole?: string;
  details?: string;
}

export const SkuAuditTrailView: React.FC<SkuAuditTrailViewProps> = ({
  parts,
  categories,
  transactions,
  activityLogs,
  selectedPartId,
  onSelectPartId,
  onOpenStockIn,
  onOpenStockOut,
  onOpenAdjustment,
  onOpenEditPart,
  onOpenQrModal,
  onBackToCatalog,
}) => {
  const { currentTenant, canManageCatalog, canRecordStock, canViewFinancials } = useAuth();

  // Selected part fallback
  const currentPart = useMemo(() => {
    if (selectedPartId) {
      const found = parts.find((p) => p.id === selectedPartId);
      if (found) return found;
    }
    return parts[0] || null;
  }, [parts, selectedPartId]);

  // View & Filter States
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [eventTypeFilter, setEventTypeFilter] = useState<SkuEventType>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Part selector search
  const [partSearch, setPartSearch] = useState<string>('');

  const filteredPartOptions = useMemo(() => {
    if (!partSearch.trim()) return parts;
    const q = partSearch.toLowerCase();
    return parts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.shelfLocation && p.shelfLocation.toLowerCase().includes(q))
    );
  }, [parts, partSearch]);

  // Current part category
  const partCategory = useMemo(() => {
    if (!currentPart) return null;
    return categories.find((c) => c.id === currentPart.categoryId);
  }, [currentPart, categories]);

  // Build unified audit events for current part
  const allEventsForPart = useMemo(() => {
    if (!currentPart) return [];

    const events: UnifiedSkuAuditEvent[] = [];

    // 1. Transactions for this part
    const partTxs = transactions.filter((t) => t.partId === currentPart.id);
    for (const tx of partTxs) {
      let title = '';
      let catLabel = '';
      let qChange = tx.quantity;

      if (tx.type === 'in') {
        title = 'Stock Inward (Supplier Delivery)';
        catLabel = 'Stock In';
      } else if (tx.type === 'out') {
        title = 'Stock Outward (Customer Sale / Dispatch)';
        catLabel = 'Stock Out';
        qChange = -Math.abs(tx.quantity);
      } else {
        title = 'Shelf Count Reconciliation';
        catLabel = 'Adjustment';
        qChange = tx.newQuantity - tx.previousQuantity;
      }

      events.push({
        id: tx.id,
        source: 'transaction',
        timestamp: tx.createdAt,
        type: tx.type === 'in' ? 'in' : tx.type === 'out' ? 'out' : 'adjustment',
        title,
        categoryLabel: catLabel,
        quantityChange: qChange,
        previousQuantity: tx.previousQuantity,
        newQuantity: tx.newQuantity,
        unitCostPrice: tx.unitCostPrice,
        unitSellPrice: tx.unitSellPrice,
        totalValue: tx.totalValue,
        reason: tx.reason,
        referenceNo: tx.referenceNo,
        notes: tx.notes,
        userName: tx.userName,
        userRole: tx.userRole,
      });
    }

    // 2. Activity logs for this part (Price changes & master updates)
    const partLogs = activityLogs.filter((l) => {
      if (l.entityId === currentPart.id) return true;
      if (l.details && (l.details.includes(currentPart.sku) || l.details.includes(currentPart.name))) return true;
      return false;
    });

    for (const log of partLogs) {
      if (log.action === 'PRICE_CHANGE') {
        events.push({
          id: log.id,
          source: 'activity_log',
          timestamp: log.createdAt,
          type: 'price_change',
          title: 'Unit Price Revision',
          categoryLabel: 'Price Change',
          reason: 'Catalog Master Price Adjustment',
          details: log.details,
          userName: log.userName,
        });
      } else if (log.action === 'UPDATE_PART') {
        events.push({
          id: log.id,
          source: 'activity_log',
          timestamp: log.createdAt,
          type: 'master_update',
          title: 'Catalog Master Record Updated',
          categoryLabel: 'Master Update',
          reason: 'Shelf Location / Reorder Threshold / Specs Modification',
          details: log.details,
          userName: log.userName,
        });
      } else if (log.action === 'CREATE_PART') {
        events.push({
          id: log.id,
          source: 'activity_log',
          timestamp: log.createdAt,
          type: 'master_update',
          title: 'Initial SKU Registration',
          categoryLabel: 'Catalog Registration',
          reason: 'Initial Product Master Creation',
          details: log.details,
          userName: log.userName,
        });
      }
    }

    // Sort descending by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events;
  }, [currentPart, transactions, activityLogs]);

  // Unique users who touched this part
  const uniqueUsers = useMemo(() => {
    const usersSet = new Set<string>();
    allEventsForPart.forEach((e) => {
      if (e.userName) usersSet.add(e.userName);
    });
    return Array.from(usersSet);
  }, [allEventsForPart]);

  // Filter events by type, date, search, user
  const filteredEvents = useMemo(() => {
    return allEventsForPart.filter((event) => {
      // Event Type Filter
      if (eventTypeFilter === 'in' && event.type !== 'in') return false;
      if (eventTypeFilter === 'out' && event.type !== 'out') return false;
      if (eventTypeFilter === 'adjustment' && event.type !== 'adjustment') return false;
      if (eventTypeFilter === 'price' && event.type !== 'price_change') return false;
      if (eventTypeFilter === 'master' && event.type !== 'master_update') return false;

      // User Filter
      if (userFilter !== 'all' && event.userName !== userFilter) return false;

      // Date Range Filter
      const eventDate = new Date(event.timestamp);
      const now = new Date();

      if (dateRange === 'today') {
        const todayStr = now.toISOString().slice(0, 10);
        const evStr = eventDate.toISOString().slice(0, 10);
        if (todayStr !== evStr) return false;
      } else if (dateRange === '7days') {
        const threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (eventDate < threshold) return false;
      } else if (dateRange === '30days') {
        const threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (eventDate < threshold) return false;
      } else if (dateRange === 'thisMonth') {
        if (
          eventDate.getFullYear() !== now.getFullYear() ||
          eventDate.getMonth() !== now.getMonth()
        ) {
          return false;
        }
      } else if (dateRange === 'custom') {
        if (customStart) {
          const start = new Date(customStart + 'T00:00:00');
          if (eventDate < start) return false;
        }
        if (customEnd) {
          const end = new Date(customEnd + 'T23:59:59');
          if (eventDate > end) return false;
        }
      }

      // Search Term Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchRef = event.referenceNo?.toLowerCase().includes(q);
        const matchReason = event.reason.toLowerCase().includes(q);
        const matchNotes = event.notes?.toLowerCase().includes(q);
        const matchUser = event.userName.toLowerCase().includes(q);
        const matchDetails = event.details?.toLowerCase().includes(q);
        return matchRef || matchReason || matchNotes || matchUser || matchDetails;
      }

      return true;
    });
  }, [allEventsForPart, eventTypeFilter, dateRange, customStart, customEnd, searchTerm, userFilter]);

  // Aggregate Stats for selected part
  const stats = useMemo(() => {
    let totalInUnits = 0;
    let totalOutUnits = 0;
    let netAdjustUnits = 0;
    let totalOutRevenue = 0;

    for (const e of allEventsForPart) {
      if (e.type === 'in' && e.quantityChange) {
        totalInUnits += Math.abs(e.quantityChange);
      } else if (e.type === 'out' && e.quantityChange) {
        totalOutUnits += Math.abs(e.quantityChange);
        if (e.totalValue) totalOutRevenue += e.totalValue;
      } else if (e.type === 'adjustment' && e.quantityChange !== undefined) {
        netAdjustUnits += e.quantityChange;
      }
    }

    return {
      totalInUnits,
      totalOutUnits,
      netAdjustUnits,
      totalOutRevenue,
      eventCount: allEventsForPart.length,
    };
  }, [allEventsForPart]);

  // Next / Previous Part Navigation
  const handleNextPart = () => {
    if (!currentPart) return;
    const currentIndex = parts.findIndex((p) => p.id === currentPart.id);
    if (currentIndex < parts.length - 1) {
      onSelectPartId(parts[currentIndex + 1].id);
    } else {
      onSelectPartId(parts[0].id);
    }
  };

  const handlePrevPart = () => {
    if (!currentPart) return;
    const currentIndex = parts.findIndex((p) => p.id === currentPart.id);
    if (currentIndex > 0) {
      onSelectPartId(parts[currentIndex - 1].id);
    } else {
      onSelectPartId(parts[parts.length - 1].id);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export CSV of this part's audit trail
  const handleExportCsv = () => {
    if (!currentPart) return;

    const headers = [
      'Timestamp',
      'Event Type',
      'Reference No',
      'Operator',
      'Role',
      'Quantity Change',
      'Previous Qty',
      'New Qty',
      'Unit Cost (RWF)',
      'Unit Sell (RWF)',
      'Total Value (RWF)',
      'Reason',
      'Notes / Details',
    ];

    const rows = filteredEvents.map((e) => [
      `"${new Date(e.timestamp).toISOString()}"`,
      `"${e.categoryLabel}"`,
      `"${e.referenceNo || 'N/A'}"`,
      `"${e.userName}"`,
      `"${e.userRole || 'staff'}"`,
      e.quantityChange !== undefined ? e.quantityChange : '',
      e.previousQuantity !== undefined ? e.previousQuantity : '',
      e.newQuantity !== undefined ? e.newQuantity : '',
      e.unitCostPrice || '',
      e.unitSellPrice || '',
      e.totalValue || '',
      `"${(e.reason || '').replace(/"/g, '""')}"`,
      `"${(e.details || e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SKU_Audit_${currentPart.sku}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Audit Sheet
  const handlePrintAudit = () => {
    window.print();
  };

  if (!currentPart) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
        <Package className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">No Spare Parts Available</h3>
        <p className="text-xs text-slate-500">Add parts to your catalog first to view SKU audit trails.</p>
        <button
          onClick={onBackToCatalog}
          className="px-4 py-2 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 transition"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const marginPct =
    currentPart.sellPrice > 0
      ? Math.round(((currentPart.sellPrice - currentPart.costPrice) / currentPart.sellPrice) * 100)
      : 0;

  const isLowStock = currentPart.quantity > 0 && currentPart.quantity <= currentPart.reorderLevel;
  const isOutOfStock = currentPart.quantity === 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToCatalog}
            id="btn-back-to-catalog"
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 text-xs font-semibold"
            title="Return to Parts Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Catalog</span>
          </button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">SKU Audit Trail & Traceability</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Granular Ledger
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Audit-proof log of inventory movements, price revisions, and count reconciliations for {currentTenant?.businessName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleExportCsv}
            id="btn-export-sku-audit-csv"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            title="Export filtered audit trail to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintAudit}
            id="btn-print-sku-audit"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            title="Print printable audit sheet"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Part Switcher & Active SKU Profile Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Quick Part Selection Bar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-amber-600" />
              <span>Active SKU:</span>
            </span>
            <div className="relative flex-1">
              <select
                id="select-sku-audit-part"
                value={currentPart.id}
                onChange={(e) => onSelectPartId(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                {filteredPartOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name} ({p.quantity} {p.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevPart}
                title="Previous Part"
                className="p-1.5 bg-white hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-600 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNextPart}
                title="Next Part"
                className="p-1.5 bg-white hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-600 transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick SKU Action Shortcuts */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {canRecordStock && (
              <>
                <button
                  id="btn-audit-quick-stockin"
                  onClick={() => onOpenStockIn(currentPart.id)}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>+ Inward</span>
                </button>
                <button
                  id="btn-audit-quick-stockout"
                  onClick={() => onOpenStockOut(currentPart.id)}
                  disabled={currentPart.quantity === 0}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>- Outward</span>
                </button>
                <button
                  id="btn-audit-quick-reconcile"
                  onClick={() => onOpenAdjustment(currentPart.id)}
                  className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Reconcile</span>
                </button>
              </>
            )}
            {canManageCatalog && (
              <>
                <button
                  id="btn-audit-quick-edit"
                  onClick={() => onOpenEditPart(currentPart)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  title="Edit Master & Prices"
                >
                  <Edit2 className="w-3 h-3 text-slate-500" />
                  <span>Edit Master</span>
                </button>
                {onOpenQrModal && (
                  <button
                    id="btn-audit-quick-qr"
                    onClick={() => onOpenQrModal(currentPart)}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    title="View Shelf QR Code Label"
                  >
                    <QrCode className="w-3 h-3 text-amber-700" />
                    <span>QR Label</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Selected Part Details & Live KPI Metrics Grid */}
        <div className="p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-900 text-amber-400">
                  {currentPart.sku}
                </span>
                {currentPart.barcode && (
                  <span className="font-mono text-[11px] text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                    BAR: {currentPart.barcode}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                  {partCategory?.name || currentPart.categoryName || 'General'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  Bay: {currentPart.shelfLocation || 'Unassigned'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1.5">{currentPart.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vendor: <span className="font-medium text-slate-700">{currentPart.supplier}</span>
                {currentPart.supplierPhone && (
                  <span className="ml-2 font-mono text-[11px] text-slate-400">({currentPart.supplierPhone})</span>
                )}
                {currentPart.description && <span className="ml-2 text-slate-400">• {currentPart.description}</span>}
              </p>
            </div>

            {/* Traceability Seal Badge */}
            <div className="flex items-center gap-2.5 px-3 py-2 bg-emerald-50/80 border border-emerald-200 rounded-xl shrink-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                  <span>Verified Traceability Active</span>
                </div>
                <div className="text-[10px] font-mono text-emerald-700">
                  Audit Ref: #AUD-{currentPart.sku} • {stats.eventCount} logged records
                </div>
              </div>
            </div>
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block font-medium">Current Stock</span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {currentPart.quantity} <span className="text-xs font-normal text-slate-500">{currentPart.unit}</span>
              </div>
              <div className="mt-1">
                {isOutOfStock ? (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                    Zero Stock
                  </span>
                ) : isLowStock ? (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                    Reorder Alert (≤ {currentPart.reorderLevel})
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                    Optimal Level
                  </span>
                )}
              </div>
            </div>

            {canViewFinancials && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Unit Cost</span>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {formatRwf(currentPart.costPrice)}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Purchase rate</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block font-medium">Unit Selling Price</span>
              <div className="text-base font-bold text-amber-700 mt-0.5">
                {formatRwf(currentPart.sellPrice)}
              </div>
              {canViewFinancials ? (
                <span className="text-[10px] font-semibold text-emerald-600 mt-1 block">
                  {marginPct}% Gross Margin
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 mt-1 block">Catalog retail price</span>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block font-medium">Total Inward Qty</span>
              <div className="text-base font-bold text-emerald-700 mt-0.5">
                +{stats.totalInUnits} <span className="text-xs font-normal text-slate-500">{currentPart.unit}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Supplier deliveries</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block font-medium">Total Outward Qty</span>
              <div className="text-base font-bold text-amber-700 mt-0.5">
                -{stats.totalOutUnits} <span className="text-xs font-normal text-slate-500">{currentPart.unit}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Sales & job dispatches</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block font-medium">Net Count Adjustments</span>
              <div
                className={`text-base font-bold mt-0.5 ${
                  stats.netAdjustUnits > 0
                    ? 'text-emerald-700'
                    : stats.netAdjustUnits < 0
                    ? 'text-rose-700'
                    : 'text-slate-700'
                }`}
              >
                {stats.netAdjustUnits > 0 ? `+${stats.netAdjustUnits}` : stats.netAdjustUnits}{' '}
                <span className="text-xs font-normal text-slate-500">{currentPart.unit}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Audit reconciliations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & View Mode Toggle */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Top Row: Event Type Tabs & View Switcher */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Event Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setEventTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                eventTypeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Events ({allEventsForPart.length})
            </button>
            <button
              onClick={() => setEventTypeFilter('in')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                eventTypeFilter === 'in'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Stock In ({allEventsForPart.filter((e) => e.type === 'in').length})</span>
            </button>
            <button
              onClick={() => setEventTypeFilter('out')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                eventTypeFilter === 'out'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Stock Out ({allEventsForPart.filter((e) => e.type === 'out').length})</span>
            </button>
            <button
              onClick={() => setEventTypeFilter('adjustment')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                eventTypeFilter === 'adjustment'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Adjustments ({allEventsForPart.filter((e) => e.type === 'adjustment').length})</span>
            </button>
            <button
              onClick={() => setEventTypeFilter('price')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                eventTypeFilter === 'price'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Price Revisions ({allEventsForPart.filter((e) => e.type === 'price_change').length})</span>
            </button>
            <button
              onClick={() => setEventTypeFilter('master')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                eventTypeFilter === 'master'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Master Updates ({allEventsForPart.filter((e) => e.type === 'master_update').length})</span>
            </button>
          </div>

          {/* View Mode Switcher: Timeline vs Table */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end md:self-auto shrink-0">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                viewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Visual Chronological Timeline"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Dense Accounting Ledger Table"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ledger Table</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Search, Date Range, User Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search within references, reasons, notes */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference #, notes, reason..."
              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Date Range Selector */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
            >
              <option value="all">All Dates Range</option>
              <option value="today">Today</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {/* User / Operator Filter */}
          <div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
            >
              <option value="all">All Operators / Authors</option>
              {uniqueUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filter Summary Count & Reset */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-2 py-1">
            <span>
              Showing <strong className="text-slate-900">{filteredEvents.length}</strong> of{' '}
              {allEventsForPart.length} events
            </span>
            {(eventTypeFilter !== 'all' || dateRange !== 'all' || searchTerm || userFilter !== 'all') && (
              <button
                onClick={() => {
                  setEventTypeFilter('all');
                  setDateRange('all');
                  setSearchTerm('');
                  setUserFilter('all');
                  setCustomStart('');
                  setCustomEnd('');
                }}
                className="text-amber-700 font-semibold hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Pickers (if selected) */}
        {dateRange === 'custom' && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-wrap items-center gap-3 text-xs text-slate-700 animate-in fade-in duration-150">
            <span className="font-semibold text-amber-900">Custom Range:</span>
            <div className="flex items-center gap-2">
              <label className="text-slate-600">Start:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-600">End:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Audit Trail Feed: Timeline View vs Table View */}
      {viewMode === 'timeline' ? (
        /* ================= TIMELINE VIEW ================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Chronological Event Timeline</h3>
            </div>
            <span className="text-xs text-slate-400">
              Sorted newest to oldest • Instant stock balance reconciliation
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                No audit events match the selected filters for this SKU.
              </p>
              <p className="text-[11px] text-slate-400">Try changing the event type or date range filters above.</p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {filteredEvents.map((event) => {
                const isStockIn = event.type === 'in';
                const isStockOut = event.type === 'out';
                const isAdjustment = event.type === 'adjustment';
                const isPriceChange = event.type === 'price_change';
                const isMasterUpdate = event.type === 'master_update';

                const dateObj = new Date(event.timestamp);
                const formattedDate = dateObj.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                const formattedTime = dateObj.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={event.id} className="relative group">
                    {/* Node Dot / Icon on timeline line */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white ring-4 ring-white shadow-xs ${
                        isStockIn
                          ? 'bg-emerald-600'
                          : isStockOut
                          ? 'bg-amber-600'
                          : isAdjustment
                          ? 'bg-sky-600'
                          : isPriceChange
                          ? 'bg-purple-600'
                          : 'bg-indigo-600'
                      }`}
                    >
                      {isStockIn && <ArrowDownRight className="w-3.5 h-3.5" />}
                      {isStockOut && <ArrowUpRight className="w-3.5 h-3.5" />}
                      {isAdjustment && <SlidersHorizontal className="w-3.5 h-3.5" />}
                      {isPriceChange && <Tag className="w-3.5 h-3.5" />}
                      {isMasterUpdate && <Layers className="w-3.5 h-3.5" />}
                    </div>

                    {/* Event Card */}
                    <div
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isStockIn
                          ? 'bg-emerald-50/30 border-emerald-100 hover:border-emerald-300'
                          : isStockOut
                          ? 'bg-amber-50/20 border-amber-100 hover:border-amber-300'
                          : isAdjustment
                          ? 'bg-sky-50/20 border-sky-100 hover:border-sky-300'
                          : isPriceChange
                          ? 'bg-purple-50/30 border-purple-100 hover:border-purple-300'
                          : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Top Header of Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isStockIn
                                ? 'bg-emerald-100 text-emerald-800'
                                : isStockOut
                                ? 'bg-amber-100 text-amber-800'
                                : isAdjustment
                                ? 'bg-sky-100 text-sky-800'
                                : isPriceChange
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {event.categoryLabel}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">{event.title}</h4>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {formattedDate} at {formattedTime}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-[10px] text-slate-400">ID: {event.id}</span>
                        </div>
                      </div>

                      {/* Main Card Content */}
                      <div className="py-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Quantity & Balance Impact (For stock movements / adjustments) */}
                        {event.quantityChange !== undefined ? (
                          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                              Quantity Change & Balance
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-base font-extrabold ${
                                  event.quantityChange > 0
                                    ? 'text-emerald-600'
                                    : event.quantityChange < 0
                                    ? 'text-amber-600'
                                    : 'text-slate-700'
                                }`}
                              >
                                {event.quantityChange > 0
                                  ? `+${event.quantityChange}`
                                  : event.quantityChange}{' '}
                                {currentPart.unit}
                              </span>
                              {event.previousQuantity !== undefined && event.newQuantity !== undefined && (
                                <span className="text-[11px] font-mono text-slate-500">
                                  ({event.previousQuantity} → {event.newQuantity} {currentPart.unit})
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* For Price Change / Master Update */
                          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                              Catalog Change Type
                            </span>
                            <div className="text-xs font-bold text-purple-900 mt-1 flex items-center gap-1.5">
                              {isPriceChange ? <Tag className="w-3.5 h-3.5 text-purple-600" /> : <Layers className="w-3.5 h-3.5 text-indigo-600" />}
                              <span>{isPriceChange ? 'Price & Margin Revision' : 'Master Specification Update'}</span>
                            </div>
                          </div>
                        )}

                        {/* Financial Valuation (if permitted) */}
                        {canViewFinancials && event.totalValue !== undefined && (
                          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                              Financial Value
                            </span>
                            <div className="text-xs font-bold text-slate-900 mt-1">
                              {formatRwf(event.totalValue)}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Rate: {formatRwf(event.unitSellPrice || event.unitCostPrice || 0)} / {currentPart.unit}
                            </span>
                          </div>
                        )}

                        {/* Documentation / Reference Number */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 md:col-span-1">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                            Audit Document Ref
                          </span>
                          <div className="flex items-center justify-between gap-1 mt-1">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {event.referenceNo || 'N/A (Counter Entry)'}
                            </span>
                            {event.referenceNo && (
                              <button
                                onClick={() => handleCopy(event.referenceNo!, event.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                                title="Copy reference"
                              >
                                {copiedId === event.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Signed by {event.userName} {event.userRole && `(${event.userRole})`}
                          </span>
                        </div>
                      </div>

                      {/* Reason & Audit Notes */}
                      <div className="bg-white/90 p-3 rounded-xl border border-slate-200/70 text-xs text-slate-700 space-y-1">
                        <div>
                          <span className="font-semibold text-slate-900">Reason / Description: </span>
                          <span>{event.reason}</span>
                        </div>
                        {event.details && (
                          <div className="text-[11px] text-purple-800 font-medium">
                            <span className="font-semibold">Details: </span>
                            {event.details}
                          </div>
                        )}
                        {event.notes && (
                          <div className="text-[11px] text-slate-500 italic">
                            <span className="font-semibold not-italic">Operator Note: </span>
                            "{event.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================= DENSE LEDGER TABLE VIEW ================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Tabular Traceability Ledger</h3>
            </div>
            <span className="text-xs text-slate-500">
              Auditable inventory accounting register for SKU <strong className="text-slate-800">{currentPart.sku}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Event Type</th>
                  <th className="py-3 px-3">Reference No</th>
                  <th className="py-3 px-3">Operator</th>
                  <th className="py-3 px-3 text-right">Quantity Δ</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                  {canViewFinancials && (
                    <>
                      <th className="py-3 px-3 text-right">Unit Rate</th>
                      <th className="py-3 px-3 text-right">Total (RWF)</th>
                    </>
                  )}
                  <th className="py-3 px-4">Reason & Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={canViewFinancials ? 9 : 7} className="py-12 text-center text-slate-400">
                      No audit events found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event) => {
                    const isStockIn = event.type === 'in';
                    const isStockOut = event.type === 'out';
                    const isAdjustment = event.type === 'adjustment';
                    const isPriceChange = event.type === 'price_change';

                    return (
                      <tr key={event.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Timestamp */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {new Date(event.timestamp).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(event.timestamp).toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Event Type Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isStockIn
                                ? 'bg-emerald-100 text-emerald-800'
                                : isStockOut
                                ? 'bg-amber-100 text-amber-800'
                                : isAdjustment
                                ? 'bg-sky-100 text-sky-800'
                                : isPriceChange
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {event.categoryLabel}
                          </span>
                        </td>

                        {/* Reference No */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-700">
                          {event.referenceNo || '—'}
                        </td>

                        {/* Operator */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-medium text-slate-900">{event.userName}</div>
                          {event.userRole && (
                            <div className="text-[10px] text-slate-400 uppercase">{event.userRole}</div>
                          )}
                        </td>

                        {/* Quantity Change */}
                        <td className="py-3 px-3 text-right whitespace-nowrap font-bold">
                          {event.quantityChange !== undefined ? (
                            <span
                              className={
                                event.quantityChange > 0
                                  ? 'text-emerald-700'
                                  : event.quantityChange < 0
                                  ? 'text-amber-700'
                                  : 'text-slate-700'
                              }
                            >
                              {event.quantityChange > 0 ? `+${event.quantityChange}` : event.quantityChange}{' '}
                              <span className="font-normal text-[10px] text-slate-500">{currentPart.unit}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Balance Trajectory */}
                        <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-[11px] text-slate-600">
                          {event.previousQuantity !== undefined && event.newQuantity !== undefined ? (
                            <span>
                              {event.previousQuantity} → <strong className="text-slate-900">{event.newQuantity}</strong>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Financials (if permitted) */}
                        {canViewFinancials && (
                          <>
                            <td className="py-3 px-3 text-right whitespace-nowrap text-slate-600">
                              {event.unitSellPrice
                                ? formatRwf(event.unitSellPrice)
                                : event.unitCostPrice
                                ? formatRwf(event.unitCostPrice)
                                : '—'}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-slate-900">
                              {event.totalValue !== undefined ? formatRwf(event.totalValue) : '—'}
                            </td>
                          </>
                        )}

                        {/* Reason / Notes / Details */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{event.reason}</div>
                          {event.details && (
                            <div className="text-[11px] text-purple-700 font-medium">{event.details}</div>
                          )}
                          {event.notes && (
                            <div className="text-[10px] text-slate-400 italic">"{event.notes}"</div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Price Revision & Catalog History Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">Price Structure & Catalog Governance</h3>
          </div>
          <span className="text-xs text-slate-400">
            Rwanda Revenue Authority (RRA) audit compliant price record
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
            <span className="text-purple-700 font-bold block mb-1">Pricing Integrity Policy</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Every unit price modification requires Owner or Manager privileges. All price increases or discounts are logged permanently with user credentials and timestamp.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-800 font-bold block mb-1">Current Margins</span>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Unit Cost:</span>
                <strong className="text-slate-800">{canViewFinancials ? formatRwf(currentPart.costPrice) : 'Confidential'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Selling Price:</span>
                <strong className="text-amber-800">{formatRwf(currentPart.sellPrice)}</strong>
              </div>
              {canViewFinancials && (
                <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-emerald-700">
                  <span>Gross Margin:</span>
                  <span>{marginPct}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-800 font-bold block mb-1">Traceability Certification</span>
            <div className="space-y-1 text-[11px] text-slate-600">
              <div>• Registered SKU: <strong className="font-mono text-slate-800">{currentPart.sku}</strong></div>
              <div>• Shop: <span className="font-medium text-slate-800">{currentTenant?.businessName}</span></div>
              <div>• Total Traceable Events: <strong className="text-slate-800">{allEventsForPart.length}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
