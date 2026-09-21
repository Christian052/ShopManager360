import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { StockTransaction } from '../types';
import { formatRwf } from '../utils/i18n';

interface MonthlyStockMovementChartProps {
  transactions: StockTransaction[];
  canViewFinancials?: boolean;
  onOpenStockIn?: () => void;
  onOpenStockOut?: () => void;
}

type ViewFilter = 'all' | 'incoming' | 'outgoing' | 'net';
type TimeRange = '30d' | '14d' | '7d';

interface DailyMovement {
  dateKey: string;
  displayDate: string;
  fullDate: string;
  incoming: number;
  outgoing: number;
  net: number;
  incomingValueRwf: number;
  outgoingValueRwf: number;
  txCount: number;
}

export const MonthlyStockMovementChart: React.FC<MonthlyStockMovementChartProps> = ({
  transactions,
  canViewFinancials = true,
  onOpenStockIn,
  onOpenStockOut,
}) => {
  const [activeFilter, setActiveFilter] = useState<ViewFilter>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Compute 30-day daily aggregated timeline
  const { chartData, metricsSummary } = useMemo(() => {
    // Determine the reference anchor date (latest transaction date or current system date)
    let anchorTime = new Date('2026-09-21T18:00:00Z').getTime();
    if (transactions.length > 0) {
      const latestTxTime = Math.max(
        ...transactions.map((t) => new Date(t.createdAt).getTime())
      );
      if (latestTxTime > anchorTime) {
        anchorTime = latestTxTime;
      }
    }

    const daysCount = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
    const dailyMap = new Map<string, DailyMovement>();

    // Generate consecutive days backwards from anchor
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(anchorTime - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().slice(0, 10);
      const displayDate = d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
      const fullDate = d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      dailyMap.set(dateKey, {
        dateKey,
        displayDate,
        fullDate,
        incoming: 0,
        outgoing: 0,
        net: 0,
        incomingValueRwf: 0,
        outgoingValueRwf: 0,
        txCount: 0,
      });
    }

    // Populate actual transaction volumes
    for (const tx of transactions) {
      const txDateKey = tx.createdAt.slice(0, 10);
      if (dailyMap.has(txDateKey)) {
        const item = dailyMap.get(txDateKey)!;
        item.txCount += 1;
        if (tx.type === 'in') {
          item.incoming += tx.quantity;
          item.incomingValueRwf += tx.totalValue;
        } else if (tx.type === 'out') {
          item.outgoing += tx.quantity;
          item.outgoingValueRwf += tx.totalValue;
        }
        item.net = item.incoming - item.outgoing;
      }
    }

    const dataList = Array.from(dailyMap.values());

    // Aggregate summary statistics
    let totalIn = 0;
    let totalOut = 0;
    let totalInValue = 0;
    let totalOutValue = 0;
    let peakInDay: { date: string; qty: number } = { date: '', qty: 0 };
    let peakOutDay: { date: string; qty: number } = { date: '', qty: 0 };

    for (const d of dataList) {
      totalIn += d.incoming;
      totalOut += d.outgoing;
      totalInValue += d.incomingValueRwf;
      totalOutValue += d.outgoingValueRwf;

      if (d.incoming > peakInDay.qty) {
        peakInDay = { date: d.displayDate, qty: d.incoming };
      }
      if (d.outgoing > peakOutDay.qty) {
        peakOutDay = { date: d.displayDate, qty: d.outgoing };
      }
    }

    const netChange = totalIn - totalOut;
    const dailyAvgOut = (totalOut / daysCount).toFixed(1);

    return {
      chartData: dataList,
      metricsSummary: {
        totalIn,
        totalOut,
        netChange,
        totalInValue,
        totalOutValue,
        dailyAvgOut,
        peakInDay,
        peakOutDay,
        daysCount,
      },
    };
  }, [transactions, timeRange]);

  // Custom tooltips with styled pills and legible numbers
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DailyMovement = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[210px] space-y-2">
          <div className="border-b border-slate-700/80 pb-1.5 flex items-center justify-between">
            <span className="font-semibold text-slate-200">{data.fullDate}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {data.txCount} {data.txCount === 1 ? 'event' : 'events'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Incoming (Restock):
              </span>
              <strong className="text-white font-mono">+{data.incoming} units</strong>
            </div>
            {canViewFinancials && data.incomingValueRwf > 0 && (
              <div className="text-[10px] text-emerald-300 text-right font-mono">
                {formatRwf(data.incomingValueRwf)} cost
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Outgoing (Dispatches):
              </span>
              <strong className="text-white font-mono">-{data.outgoing} units</strong>
            </div>
            {canViewFinancials && data.outgoingValueRwf > 0 && (
              <div className="text-[10px] text-amber-300 text-right font-mono">
                {formatRwf(data.outgoingValueRwf)} sales
              </div>
            )}

            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between font-semibold">
              <span className="text-slate-400">Net Daily Delta:</span>
              <span
                className={`font-mono ${
                  data.net > 0
                    ? 'text-emerald-400'
                    : data.net < 0
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {data.net > 0 ? `+${data.net}` : data.net} units
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="monthly-stock-movement-card"
      className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-5"
    >
      {/* Header and Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Monthly Stock Movement Trend
              </h2>
              <p className="text-xs text-slate-500">
                Visualizing incoming volume (restocks) vs. outgoing volume (dispatches) over the last {metricsSummary.daysCount} days
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Range Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Days Range Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                timeRange === '7d'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('14d')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                timeRange === '14d'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              14 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                timeRange === '30d'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Filter lines */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                activeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              Both
            </button>
            <button
              onClick={() => setActiveFilter('incoming')}
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                activeFilter === 'incoming'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'hover:text-emerald-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              Incoming
            </button>
            <button
              onClick={() => setActiveFilter('outgoing')}
              className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                activeFilter === 'outgoing'
                  ? 'bg-amber-600 text-white shadow-2xs font-bold'
                  : 'hover:text-amber-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
              Outgoing
            </button>
            <button
              onClick={() => setActiveFilter('net')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                activeFilter === 'net'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'hover:text-indigo-800'
              }`}
            >
              Net Delta
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip for Selected Window */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {metricsSummary.daysCount}d Inflow
            </span>
            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 text-lg font-black text-emerald-900">
            +{metricsSummary.totalIn}{' '}
            <span className="text-xs font-medium text-emerald-700">units</span>
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">
            {canViewFinancials
              ? `${formatRwf(metricsSummary.totalInValue)} restock value`
              : 'Supplier restocks'}
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {metricsSummary.daysCount}d Outflow
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-1 text-lg font-black text-amber-900">
            -{metricsSummary.totalOut}{' '}
            <span className="text-xs font-medium text-amber-700">units</span>
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">
            {canViewFinancials
              ? `${formatRwf(metricsSummary.totalOutValue)} sales volume`
              : 'Dispatched to clients'}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Net Volume Delta
            </span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div
            className={`mt-1 text-lg font-black ${
              metricsSummary.netChange >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {metricsSummary.netChange >= 0 ? `+${metricsSummary.netChange}` : metricsSummary.netChange}{' '}
            <span className="text-xs font-medium text-slate-500">units</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {metricsSummary.netChange >= 0
              ? 'Buffer stock accumulated'
              : 'High demand stock drawdown'}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Daily Outflow Pace
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="mt-1 text-lg font-black text-slate-900">
            {metricsSummary.dailyAvgOut}{' '}
            <span className="text-xs font-medium text-slate-500">units / day</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            {metricsSummary.peakOutDay.qty > 0
              ? `Peak out: ${metricsSummary.peakOutDay.qty} on ${metricsSummary.peakOutDay.date}`
              : 'Steady movements'}
          </div>
        </div>
      </div>

      {/* Main Recharts Line Chart */}
      <div className="w-full h-[290px] pt-2">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              vertical={false}
            />
            <XAxis
              dataKey="displayDate"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
            />
            <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="2 2" />

            {(activeFilter === 'all' || activeFilter === 'incoming') && (
              <Line
                type="monotone"
                dataKey="incoming"
                name="Incoming Stock (Restocks / Deliveries)"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                animationDuration={800}
              />
            )}

            {(activeFilter === 'all' || activeFilter === 'outgoing') && (
              <Line
                type="monotone"
                dataKey="outgoing"
                name="Outgoing Stock (Dispatches / Sales)"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
                animationDuration={800}
              />
            )}

            {activeFilter === 'net' && (
              <Line
                type="monotone"
                dataKey="net"
                name="Net Inventory Delta (Inflow minus Outflow)"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                animationDuration={800}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Operational Insight Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 bg-slate-50/60 -mx-5 -mb-5 p-4 rounded-b-2xl">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            {metricsSummary.totalIn > metricsSummary.totalOut ? (
              <>
                <strong className="text-slate-800">Buffer Building Phase:</strong> Inflow exceeded sales by {metricsSummary.netChange} units, ensuring healthy inventory across high-demand SKUs.
              </>
            ) : metricsSummary.totalOut > metricsSummary.totalIn ? (
              <>
                <strong className="text-slate-800">High Velocity Outflow:</strong> Sales exceeded restocks by {Math.abs(metricsSummary.netChange)} units. Check critical reorder limits to prevent stockouts.
              </>
            ) : (
              <>
                <strong className="text-slate-800">Balanced Inventory Flow:</strong> Inflow and outflow volumes matched closely across this period.
              </>
            )}
          </span>
        </div>

        {(onOpenStockIn || onOpenStockOut) && (
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {onOpenStockIn && (
              <button
                onClick={onOpenStockIn}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/80 rounded-lg transition-colors flex items-center gap-1"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                Record Stock In
              </button>
            )}
            {onOpenStockOut && (
              <button
                onClick={onOpenStockOut}
                className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100/70 hover:bg-amber-200/80 rounded-lg transition-colors flex items-center gap-1"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Record Stock Out
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
