import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
  ComposedChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  ArrowDownRight,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  Flame,
  Activity,
  Layers,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';
import { SparePart, StockTransaction, StockAlertNotification } from '../types';
import { formatRwf } from '../utils/i18n';

interface LowStockTrendsChartProps {
  parts: SparePart[];
  transactions: StockTransaction[];
  notifications?: StockAlertNotification[];
  onOpenStockIn: (partId: string) => void;
  onOpenAdjustment?: (partId: string) => void;
  onNavigateToInventory?: () => void;
}

type TimeRange = '30d' | '14d' | '7d';
type ChartMode = 'frequency' | 'timeline' | 'bufferGap';

interface PartLowStockStats {
  partId: string;
  name: string;
  shortName: string;
  sku: string;
  categoryName?: string;
  supplier: string;
  supplierPhone?: string;
  unit: string;
  currentQuantity: number;
  reorderLevel: number;
  costPrice: number;
  breachCount: number; // How many times it dipped to or below reorderLevel
  daysBelowThreshold: number; // Approximate days with low stock
  unitsConsumedInPeriod: number; // Units sold/deducted during the period
  currentDeficit: number; // Math.max(0, reorderLevel - currentQuantity)
  stockHealthStatus: 'out_of_stock' | 'critical' | 'frequent_breach' | 'stable';
  lastBreachDate?: string;
  recommendedReorderLevel: number;
}

interface DailyBreachData {
  dateKey: string;
  displayDate: string;
  breachIncidents: number;
  affectedPartsCount: number;
  partNames: string[];
}

export const LowStockTrendsChart: React.FC<LowStockTrendsChartProps> = ({
  parts,
  transactions,
  notifications = [],
  onOpenStockIn,
  onOpenAdjustment,
  onNavigateToInventory,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [chartMode, setChartMode] = useState<ChartMode>('frequency');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  // Compute anchor date (latest transaction or current system time)
  const anchorTime = useMemo(() => {
    let latest = new Date('2026-09-22T08:00:00Z').getTime();
    if (transactions.length > 0) {
      const txTimes = transactions.map((t) => new Date(t.createdAt).getTime());
      latest = Math.max(latest, ...txTimes);
    }
    return latest;
  }, [transactions]);

  const daysCount = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
  const periodStartTime = anchorTime - daysCount * 24 * 60 * 60 * 1000;

  // Filter transactions and notifications within selected period
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const time = new Date(t.createdAt).getTime();
      return time >= periodStartTime && time <= anchorTime;
    });
  }, [transactions, periodStartTime, anchorTime]);

  const periodNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const time = new Date(n.createdAt).getTime();
      return time >= periodStartTime && time <= anchorTime;
    });
  }, [notifications, periodStartTime, anchorTime]);

  // Aggregate stats per part
  const partStats = useMemo(() => {
    const statsMap = new Map<string, PartLowStockStats>();

    // Initialize map for all parts
    for (const part of parts) {
      const isOut = part.quantity === 0;
      const isCrit = part.quantity <= part.reorderLevel;

      statsMap.set(part.id, {
        partId: part.id,
        name: part.name,
        shortName: part.name.length > 20 ? part.name.slice(0, 19) + '…' : part.name,
        sku: part.sku,
        supplier: part.supplier || 'Unassigned',
        supplierPhone: part.supplierPhone,
        unit: part.unit,
        currentQuantity: part.quantity,
        reorderLevel: part.reorderLevel,
        costPrice: part.costPrice,
        breachCount: isCrit ? 1 : 0, // start with current breach if currently low
        daysBelowThreshold: isCrit ? 1 : 0,
        unitsConsumedInPeriod: 0,
        currentDeficit: Math.max(0, part.reorderLevel - part.quantity),
        stockHealthStatus: isOut ? 'out_of_stock' : isCrit ? 'critical' : 'stable',
        recommendedReorderLevel: part.reorderLevel,
      });
    }

    // Inspect historical transactions
    // Sort chronological ascending
    const sortedTx = [...periodTransactions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const tx of sortedTx) {
      const part = parts.find((p) => p.id === tx.partId);
      if (!part) continue;

      const stat = statsMap.get(part.id);
      if (!stat) continue;

      if (tx.type === 'out') {
        stat.unitsConsumedInPeriod += tx.quantity;
      }

      // Check if this transaction brought stock at or below reorder level
      const broughtBelow = tx.newQuantity <= part.reorderLevel;
      const wasAbove = tx.previousQuantity > part.reorderLevel;

      if (broughtBelow) {
        if (wasAbove) {
          // Explicit crossing event
          stat.breachCount += 1;
          stat.lastBreachDate = tx.createdAt;
        } else if (stat.breachCount === 0) {
          stat.breachCount = 1;
        }
      }
    }

    // Also account for notifications that fired in this period
    for (const notif of periodNotifications) {
      const stat = statsMap.get(notif.partId);
      if (stat) {
        stat.breachCount = Math.max(stat.breachCount, 1);
        stat.lastBreachDate = notif.createdAt;
      }
    }

    // Refine stats, status, and recommendations
    const results: PartLowStockStats[] = [];
    for (const stat of statsMap.values()) {
      // Determine health status
      if (stat.currentQuantity === 0) {
        stat.stockHealthStatus = 'out_of_stock';
      } else if (stat.breachCount >= 3) {
        stat.stockHealthStatus = 'frequent_breach';
      } else if (stat.currentQuantity <= stat.reorderLevel || stat.breachCount > 0) {
        stat.stockHealthStatus = 'critical';
      } else {
        stat.stockHealthStatus = 'stable';
      }

      // Recommended buffer adjustment: if breached frequently, recommend a 25-50% buffer increase
      if (stat.breachCount >= 2) {
        const bufferBonus = Math.max(2, Math.round(stat.reorderLevel * 0.4));
        stat.recommendedReorderLevel = stat.reorderLevel + bufferBonus;
      }

      // Include all parts that breached or are currently low, or top consumed
      if (stat.breachCount > 0 || stat.currentQuantity <= stat.reorderLevel) {
        results.push(stat);
      }
    }

    // Sort by: breachCount desc, then currentDeficit desc
    results.sort((a, b) => {
      if (b.breachCount !== a.breachCount) {
        return b.breachCount - a.breachCount;
      }
      return b.currentDeficit - a.currentDeficit;
    });

    return results;
  }, [parts, periodTransactions, periodNotifications]);

  // Aggregate daily timeline of threshold events over the time window
  const dailyTimelineData = useMemo(() => {
    const dailyMap = new Map<string, DailyBreachData>();

    // Pre-populate each day in time window
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(anchorTime - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().slice(0, 10);
      const displayDate = d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });

      dailyMap.set(dateKey, {
        dateKey,
        displayDate,
        breachIncidents: 0,
        affectedPartsCount: 0,
        partNames: [],
      });
    }

    // Match transactions that dipped below reorder level
    for (const tx of periodTransactions) {
      const part = parts.find((p) => p.id === tx.partId);
      if (!part) continue;

      const dateKey = tx.createdAt.slice(0, 10);
      const dayData = dailyMap.get(dateKey);
      if (dayData && tx.newQuantity <= part.reorderLevel) {
        dayData.breachIncidents += 1;
        if (!dayData.partNames.includes(part.name)) {
          dayData.partNames.push(part.name);
          dayData.affectedPartsCount += 1;
        }
      }
    }

    // Match notifications
    for (const notif of periodNotifications) {
      const dateKey = notif.createdAt.slice(0, 10);
      const dayData = dailyMap.get(dateKey);
      if (dayData) {
        dayData.breachIncidents = Math.max(dayData.breachIncidents, 1);
        if (!dayData.partNames.includes(notif.partName)) {
          dayData.partNames.push(notif.partName);
          dayData.affectedPartsCount += 1;
        }
      }
    }

    return Array.from(dailyMap.values());
  }, [anchorTime, daysCount, periodTransactions, periodNotifications, parts]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalBreaches = partStats.reduce((acc, p) => acc + p.breachCount, 0);
    const partsAtRiskCount = partStats.length;
    const outOfStockCount = partStats.filter((p) => p.currentQuantity === 0).length;
    const topVolatile = partStats[0] || null;
    const totalDeficitUnits = partStats.reduce((acc, p) => acc + p.currentDeficit, 0);

    return {
      totalBreaches,
      partsAtRiskCount,
      outOfStockCount,
      topVolatile,
      totalDeficitUnits,
    };
  }, [partStats]);

  // Prepare data for Recharts Bar Chart (Top 8 most volatile parts)
  const chartBarData = useMemo(() => {
    return partStats.slice(0, 8).map((p) => ({
      partId: p.partId,
      name: p.name,
      shortName: p.shortName,
      sku: p.sku,
      breaches: p.breachCount,
      currentStock: p.currentQuantity,
      reorderLevel: p.reorderLevel,
      deficit: p.currentDeficit,
      recommended: p.recommendedReorderLevel,
      status: p.stockHealthStatus,
      unit: p.unit,
    }));
  }, [partStats]);

  const selectedPartDetails = useMemo(() => {
    if (!selectedPartId) return partStats[0] || null;
    return partStats.find((p) => p.partId === selectedPartId) || partStats[0] || null;
  }, [selectedPartId, partStats]);

  return (
    <div
      id="section-low-stock-trends"
      className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
    >
      {/* Section Header */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Low Stock Trends & Reorder Frequency</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Past {daysCount} Days
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Visualize parts that frequently breach safety buffers and identify recurring inventory bottlenecks
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Time Window & View Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Chart View Modes */}
          <div className="inline-flex rounded-xl p-1 bg-slate-200/70 border border-slate-200 text-xs font-semibold">
            <button
              id="btn-trend-mode-frequency"
              onClick={() => setChartMode('frequency')}
              className={`px-3 py-1.5 rounded-lg transition ${
                chartMode === 'frequency'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Breach Frequency
            </button>
            <button
              id="btn-trend-mode-buffer"
              onClick={() => setChartMode('bufferGap')}
              className={`px-3 py-1.5 rounded-lg transition ${
                chartMode === 'bufferGap'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Buffer Gap
            </button>
            <button
              id="btn-trend-mode-timeline"
              onClick={() => setChartMode('timeline')}
              className={`px-3 py-1.5 rounded-lg transition ${
                chartMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30d Timeline
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
            {(['30d', '14d', '7d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1.5 rounded-lg transition ${
                  timeRange === range
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Overview Pills */}
      <div className="p-6 border-b border-slate-100 bg-white grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Threshold Breaches
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900">{summary.totalBreaches}</span>
            <span className="text-xs text-slate-500">incidents</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Dips below safety limit</p>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40">
          <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider mb-1">
            Out-of-Stock Zero Count
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-rose-700">{summary.outOfStockCount}</span>
            <span className="text-xs text-rose-600">parts at 0 stock</span>
          </div>
          <p className="text-[11px] text-rose-600/80 mt-0.5">Immediate delivery required</p>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40">
          <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider mb-1">
            Total Replenish Deficit
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-amber-700">{summary.totalDeficitUnits}</span>
            <span className="text-xs text-amber-600">units to threshold</span>
          </div>
          <p className="text-[11px] text-amber-600/80 mt-0.5">Shortfall across catalog</p>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Most Volatile Part
          </div>
          <div className="text-xs font-bold text-slate-900 truncate">
            {summary.topVolatile ? summary.topVolatile.name : 'None'}
          </div>
          <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
            {summary.topVolatile
              ? `${summary.topVolatile.breachCount} threshold breaches recorded`
              : 'Inventory healthy'}
          </p>
        </div>
      </div>

      {/* Main Chart + Deep Dive Container */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recharts Chart Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {chartMode === 'frequency' && 'Ranking by Frequency of Dipping to or Below Reorder Level'}
              {chartMode === 'bufferGap' && 'Current Stock vs Reorder Level (Deficit Gap Analysis)'}
              {chartMode === 'timeline' && `Daily Low-Stock Alert Events Across Past ${daysCount} Days`}
            </span>
            <span className="text-[11px] text-slate-400">Click any bar to inspect part</span>
          </div>

          {/* Recharts Canvas */}
          <div className="w-full h-80 bg-slate-50/60 rounded-2xl border border-slate-200/80 p-4">
            {chartBarData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">All Stock Well-Buffered</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  No parts have breached their minimum safety thresholds in the past {daysCount} days.
                </p>
              </div>
            ) : chartMode === 'frequency' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartBarData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      const payload = e.activePayload[0].payload;
                      setSelectedPartId(payload.partId);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    allowDecimals={false}
                    domain={[0, 'dataMax + 1']}
                    label={{
                      value: 'Number of Reorder Threshold Breaches',
                      position: 'insideBottom',
                      offset: -4,
                      fontSize: 10,
                      fill: '#94a3b8',
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    tick={{ fontSize: 11, fill: '#334155' }}
                    width={130}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-800 max-w-xs">
                          <div className="font-bold text-slate-100">{data.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">SKU: {data.sku}</div>
                          <div className="pt-1 border-t border-slate-800 space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Threshold Breaches:</span>
                              <span className="font-bold text-amber-400">{data.breaches} times</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Current Stock:</span>
                              <span
                                className={`font-bold ${
                                  data.currentStock === 0
                                    ? 'text-rose-400'
                                    : data.currentStock <= data.reorderLevel
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {data.currentStock} {data.unit}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Reorder Threshold:</span>
                              <span className="font-semibold text-slate-300">
                                {data.reorderLevel} {data.unit}
                              </span>
                            </div>
                            {data.recommended > data.reorderLevel && (
                              <div className="flex justify-between gap-4 text-emerald-400 pt-1 border-t border-slate-800">
                                <span>Suggested Buffer:</span>
                                <span>{data.recommended} {data.unit}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="breaches" name="Breach Incidents" radius={[0, 6, 6, 0]}>
                    {chartBarData.map((entry, index) => {
                      const isSelected = selectedPartId === entry.partId;
                      const fill =
                        entry.currentStock === 0
                          ? '#e11d48' // Rose-600
                          : entry.breaches >= 3
                          ? '#d97706' // Amber-600
                          : '#f59e0b'; // Amber-500
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={fill}
                          stroke={isSelected ? '#0f172a' : 'transparent'}
                          strokeWidth={isSelected ? 2 : 0}
                          className="cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : chartMode === 'bufferGap' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartBarData}
                  margin={{ top: 15, right: 20, left: 10, bottom: 25 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      setSelectedPartId(e.activePayload[0].payload.partId);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-800">
                          <div className="font-bold">{d.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">SKU: {d.sku}</div>
                          <div className="pt-1 border-t border-slate-800 space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Current Stock:</span>
                              <span className="font-bold text-amber-400">{d.currentStock} {d.unit}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Reorder Threshold:</span>
                              <span className="font-bold text-indigo-300">{d.reorderLevel} {d.unit}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">Replenish Deficit:</span>
                              <span className="font-bold text-rose-400">-{d.deficit} {d.unit}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                  />
                  <Bar
                    dataKey="currentStock"
                    name="Current Available Stock"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="reorderLevel"
                    name="Reorder Safety Level"
                    fill="#64748b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dailyTimelineData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorBreaches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={timeRange === '30d' ? 4 : 1}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload as DailyBreachData;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-800 max-w-xs">
                          <div className="font-bold text-slate-200">{d.displayDate}</div>
                          <div className="flex justify-between gap-3 text-amber-400 font-semibold">
                            <span>Threshold Incidents:</span>
                            <span>{d.breachIncidents}</span>
                          </div>
                          {d.partNames.length > 0 && (
                            <div className="pt-1 border-t border-slate-800">
                              <div className="text-[10px] text-slate-400 mb-1">Affected Parts:</div>
                              <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                                {d.partNames.slice(0, 3).map((name, i) => (
                                  <li key={i} className="truncate">{name}</li>
                                ))}
                                {d.partNames.length > 3 && (
                                  <li className="text-slate-500">+{d.partNames.length - 3} more</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="breachIncidents"
                    name="Threshold Breach Events"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorBreaches)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right 1 Col: Selected Part Details & AI Buffer Recommendations */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-col justify-between space-y-4">
          {selectedPartDetails ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Selected High-Risk Item
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {selectedPartDetails.name}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    SKU: {selectedPartDetails.sku}
                  </div>
                </div>

                <span
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                    selectedPartDetails.stockHealthStatus === 'out_of_stock'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : selectedPartDetails.stockHealthStatus === 'frequent_breach'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}
                >
                  {selectedPartDetails.stockHealthStatus === 'out_of_stock'
                    ? '0 IN STOCK'
                    : selectedPartDetails.stockHealthStatus === 'frequent_breach'
                    ? 'CHRONIC LOW STOCK'
                    : 'BELOW THRESHOLD'}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Current Stock</span>
                  <span
                    className={`font-black text-sm ${
                      selectedPartDetails.currentQuantity === 0
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {selectedPartDetails.currentQuantity} {selectedPartDetails.unit}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Reorder Threshold</span>
                  <span className="font-bold text-sm text-slate-800">
                    {selectedPartDetails.reorderLevel} {selectedPartDetails.unit}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">30d Breach Count</span>
                  <span className="font-black text-sm text-amber-700">
                    {selectedPartDetails.breachCount} times
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Units Consumed</span>
                  <span className="font-bold text-sm text-slate-800">
                    {selectedPartDetails.unitsConsumedInPeriod} {selectedPartDetails.unit}
                  </span>
                </div>
              </div>

              {/* Buffer Health Advisory */}
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-1 text-xs">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Threshold Buffer Advisory</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {selectedPartDetails.breachCount >= 2 ? (
                    <>
                      This part hit its reorder limit <strong>{selectedPartDetails.breachCount} times</strong> in {daysCount} days.
                      We advise increasing minimum safety stock to{' '}
                      <strong>{selectedPartDetails.recommendedReorderLevel} {selectedPartDetails.unit}</strong> to eliminate sudden stockouts.
                    </>
                  ) : (
                    <>
                      Replenish stock to stay safely above <strong>{selectedPartDetails.reorderLevel} {selectedPartDetails.unit}</strong>.
                      Supplier contact:{' '}
                      <strong className="text-slate-900">{selectedPartDetails.supplier}</strong>.
                    </>
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  id={`btn-trend-restock-${selectedPartDetails.partId}`}
                  onClick={() => onOpenStockIn(selectedPartDetails.partId)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Receive Stock Delivery Now</span>
                </button>

                {onOpenAdjustment && (
                  <button
                    onClick={() => onOpenAdjustment(selectedPartDetails.partId)}
                    className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 flex items-center justify-center gap-1.5 transition"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    <span>Physical Stock Count Audit</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Select a part on the chart to inspect its volatility profile.
            </div>
          )}

          {/* Footer link to full inventory catalog */}
          {onNavigateToInventory && (
            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={onNavigateToInventory}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-between w-full"
              >
                <span>View Full Catalog & Adjust Buffers</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
