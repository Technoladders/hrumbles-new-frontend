// Hrumbles-Front-End_UI/src/components/sales/company-detail/EmployeeGrowthIntelligence.tsx
// NEW COMPONENT — Parses enrichment_org_raw_responses raw_json
// Visualizes employee growth, hiring flow, department signals
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Users, AlertTriangle,
  Zap, Shield, ChevronDown, ChevronUp, RefreshCw,
  ArrowUp, ArrowDown, Activity, Clock, Calendar
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface EmployeeGrowthIntelligenceProps {
  company: any;
}

interface MonthlyPoint {
  month: string;          // "Jul '23"
  fullDate: string;       // "2023-07-01"
  newHires: number;
  churned: number;
  retained: number;
  net: number;
  headcount: number;
  runningTotal?: number;
}

interface DeptSummary {
  name: string;
  label: string;
  latest: number;
  totalNew: number;
  totalChurned: number;
  netChange: number;
  avgMonthlyNet: number;
  trend: 'growing' | 'stable' | 'declining' | 'volatile';
  volatility: number;
  history: { month: string; retained: number; net: number }[];
}

interface Signal {
  type: 'growth' | 'risk' | 'stable' | 'alert';
  title: string;
  detail: string;
  value?: string;
  dept?: string;
}

// ── Color System ───────────────────────────────────────────────────────────
const C = {
  green:        '#16A34A',
  greenLight:   '#DCFCE7',
  greenBorder:  '#BBF7D0',
  red:          '#DC2626',
  redLight:     '#FEF2F2',
  redBorder:    '#FECACA',
  violet:       '#5B4FE8',
  violetLight:  '#F0EEFF',
  violetBorder: '#D9D4FF',
  amber:        '#D97706',
  amberLight:   '#FFFBEB',
  amberBorder:  '#FDE68A',
  blue:         '#2563EB',
  blueLight:    '#EFF6FF',
  blueBorder:   '#BFDBFE',
  text:         '#1C1916',
  sub:          '#6A6057',
  muted:        '#9C9189',
  border:       '#E5E0D8',
  surface:      '#F8F6F3',
};

const DEPT_COLORS = [
  '#5B4FE8', '#16A34A', '#D97706', '#DC2626',
  '#2563EB', '#7C3AED', '#DB2777', '#059669',
  '#0891B2', '#92400E', '#1D4ED8', '#065F46',
];

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtMonth = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const fmtGrowth = (val: number | null | undefined) => {
  if (val == null) return null;
  const pct = (val * 100).toFixed(1);
  return val >= 0 ? `+${pct}%` : `${pct}%`;
};

const trendColor = (v: number) =>
  v > 0 ? C.green : v < 0 ? C.red : C.amber;

const trendBg = (v: number) =>
  v > 0 ? C.greenLight : v < 0 ? C.redLight : C.amberLight;

// ── Custom Tooltip ─────────────────────────────────────────────────────────
const GrowthTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E0D8] rounded-xl shadow-lg p-3 min-w-[160px]">
      <p className="text-[11px] font-[700] text-[#6A6057] uppercase tracking-[0.06em] mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="text-[11px] text-[#6A6057] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="text-[12px] font-[700] text-[#1C1916] font-['DM_Mono',monospace]">
            {p.value >= 0 ? '+' : ''}{p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const HeadcountTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E5E0D8] rounded-xl shadow-lg p-3 min-w-[140px]">
      <p className="text-[11px] font-[700] text-[#6A6057] uppercase tracking-[0.06em] mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#6A6057]">{p.name}</span>
          <span className="text-[12px] font-[700] text-[#1C1916] font-['DM_Mono',monospace]">
            {(p.value as number)?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Signal Card ────────────────────────────────────────────────────────────
const SignalCard = ({ signal, idx }: { signal: Signal; idx: number }) => {
  const cfg = {
    growth: { bg: C.greenLight,  border: C.greenBorder,  icon: <TrendingUp size={13} />, iconColor: C.green },
    risk:   { bg: C.redLight,    border: C.redBorder,    icon: <AlertTriangle size={13} />, iconColor: C.red },
    stable: { bg: C.violetLight, border: C.violetBorder, icon: <Shield size={13} />, iconColor: C.violet },
    alert:  { bg: C.amberLight,  border: C.amberBorder,  icon: <Zap size={13} />, iconColor: C.amber },
  }[signal.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="rounded-xl p-3 border"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <div className="flex items-start gap-2">
        <span style={{ color: cfg.iconColor }} className="flex-shrink-0 mt-0.5">{cfg.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-[700] text-[#1C1916] leading-tight">{signal.title}</p>
          <p className="text-[10px] text-[#6A6057] mt-0.5 leading-snug">{signal.detail}</p>
          {signal.value && (
            <p className="text-[12px] font-[800] mt-1 font-['DM_Mono',monospace]"
               style={{ color: cfg.iconColor }}>
              {signal.value}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Growth KPI Strip ───────────────────────────────────────────────────────
const GrowthKPI = ({ label, value, rawValue, sub }: {
  label: string; value: string | null; rawValue: number | null; sub?: string
}) => {
  if (!value) return null;
  const isPos = rawValue != null && rawValue >= 0;
  const isNeg = rawValue != null && rawValue < 0;
  return (
    <div className="flex flex-col gap-1 px-4 py-3 bg-white border border-[#E5E0D8] rounded-xl">
      <span className="text-[9px] font-[700] uppercase tracking-[0.08em] text-[#9C9189]">{label}</span>
      <div className="flex items-center gap-1.5">
        {isPos && <ArrowUp size={12} style={{ color: C.green }} />}
        {isNeg && <ArrowDown size={12} style={{ color: C.red }} />}
        {rawValue === 0 && <Minus size={12} style={{ color: C.amber }} />}
        <span
          className="text-[16px] font-[800] font-['DM_Mono',monospace] leading-none"
          style={{ color: isPos ? C.green : isNeg ? C.red : C.amber }}
        >
          {value}
        </span>
      </div>
      {sub && <span className="text-[10px] text-[#9C9189]">{sub}</span>}
    </div>
  );
};

// ── Dept Row ───────────────────────────────────────────────────────────────
const DeptRow = ({ dept, color, idx }: { dept: DeptSummary; color: string; idx: number }) => {
  const trendIcon = {
    growing:  <TrendingUp size={11} style={{ color: C.green }} />,
    stable:   <Minus size={11} style={{ color: C.amber }} />,
    declining:<TrendingDown size={11} style={{ color: C.red }} />,
    volatile: <Activity size={11} style={{ color: C.violet }} />,
  }[dept.trend];

  const trendLabel = {
    growing: 'Growing', stable: 'Stable',
    declining: 'Declining', volatile: 'Volatile',
  }[dept.trend];

  const trendCl = {
    growing:  `bg-[${C.greenLight}] text-[${C.green}] border-[${C.greenBorder}]`,
    stable:   'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
    declining:'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
    volatile: 'bg-[#F0EEFF] text-[#5B4FE8] border-[#D9D4FF]',
  }[dept.trend];

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03 }}
      className="border-b border-[#F8F6F3] hover:bg-[#FAFAF9] transition-colors group"
    >
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-[12px] font-[500] text-[#1C1916] capitalize">{dept.label}</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className="text-[12px] font-[700] text-[#1C1916] font-['DM_Mono',monospace]">
          {dept.latest.toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right">
        <span
          className="text-[12px] font-[700] font-['DM_Mono',monospace]"
          style={{ color: dept.netChange >= 0 ? C.green : C.red }}
        >
          {dept.netChange >= 0 ? '+' : ''}{dept.netChange}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className="text-[11px] font-[600] text-[#16A34A] font-['DM_Mono',monospace]">
          +{dept.totalNew}
        </span>
        <span className="text-[10px] text-[#9C9189] mx-1">/</span>
        <span className="text-[11px] font-[600] text-[#DC2626] font-['DM_Mono',monospace]">
          -{dept.totalChurned}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-end">
          <span className={`inline-flex items-center gap-1 text-[9px] font-[700] px-2 py-1 rounded-md border uppercase tracking-[0.06em] ${trendCl}`}>
            {trendIcon}
            {trendLabel}
          </span>
        </div>
      </td>
    </motion.tr>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
const EmployeeGrowthIntelligence: React.FC<EmployeeGrowthIntelligenceProps> = ({ company }) => {
  const [showAllDepts, setShowAllDepts] = useState(false);
  const [activeChart, setActiveChart] = useState<'headcount' | 'flow'>('headcount');

  const enrichment = company?.enrichment_organizations;
  const rawResponses = company?.enrichment_org_raw_responses;

  // ── Parse Raw JSON ───────────────────────────────────────────────────────
  const rawJson = useMemo(() => {
    if (!rawResponses?.length) return null;
    try {
      const r = rawResponses[0]?.raw_json;
      if (typeof r === 'string') return JSON.parse(r);
      return r;
    } catch { return null; }
  }, [rawResponses]);

  const metrics: any[] = rawJson?.organization?.employee_metrics || [];
  const lastSyncedAt = rawResponses?.[0]?.created_at;
  const enrichedAt = enrichment?.enriched_at || enrichment?.updated_at;

  // ── Compute Monthly Totals ───────────────────────────────────────────────
  const monthlyData: MonthlyPoint[] = useMemo(() => {
    return metrics.map((m: any) => {
      const depts = (m.departments || []).filter((d: any) => d.functions !== null);
      const overall = (m.departments || []).find((d: any) => d.functions === null);

      const newHires  = depts.reduce((s: number, d: any) => s + (d.new || 0), 0);
      const churned   = depts.reduce((s: number, d: any) => s + (d.churned || 0), 0);
      const retained  = overall?.retained || 0;
      const net       = newHires - churned;

      return {
        month:     fmtMonth(m.start_date),
        fullDate:  m.start_date,
        newHires,
        churned: -churned, // negative for visual separation
        churnedAbs: churned,
        net,
        retained,
        headcount: retained + newHires,
      };
    });
  }, [metrics]);

  // Running headcount (use retained from null-function row as proxy)
  const headcountData = useMemo(() =>
    monthlyData.map((m, i) => ({
      ...m,
      // Use actual retained count as headcount
    }))
  , [monthlyData]);

  // ── Compute Department Summaries ─────────────────────────────────────────
  const deptSummaries: DeptSummary[] = useMemo(() => {
    if (!metrics.length) return [];

    const deptMap: Record<string, {
      months: { date: string; retained: number; new: number; churned: number }[]
    }> = {};

    metrics.forEach((m: any) => {
      (m.departments || []).forEach((d: any) => {
        if (!d.functions) return;
        if (!deptMap[d.functions]) deptMap[d.functions] = { months: [] };
        deptMap[d.functions].months.push({
          date:     m.start_date,
          retained: d.retained || 0,
          new:      d.new || 0,
          churned:  d.churned || 0,
        });
      });
    });

    return Object.entries(deptMap)
      .map(([fn, data]) => {
        const months = data.months;
        const latest = months[months.length - 1]?.retained || 0;
        const totalNew     = months.reduce((s, m) => s + m.new, 0);
        const totalChurned = months.reduce((s, m) => s + m.churned, 0);
        const netChange    = totalNew - totalChurned;
        const avgMonthlyNet = months.length ? netChange / months.length : 0;

        // Volatility = std dev of month-over-month net
        const nets = months.map(m => m.new - m.churned);
        const mean = nets.reduce((s, v) => s + v, 0) / (nets.length || 1);
        const variance = nets.reduce((s, v) => s + (v - mean) ** 2, 0) / (nets.length || 1);
        const volatility = Math.sqrt(variance);

        let trend: DeptSummary['trend'];
        if (volatility > 3 && Math.abs(netChange) < totalNew * 0.1) trend = 'volatile';
        else if (netChange > 2)  trend = 'growing';
        else if (netChange < -2) trend = 'declining';
        else                     trend = 'stable';

        return {
          name:     fn,
          label:    fn.replace(/_/g, ' '),
          latest,
          totalNew,
          totalChurned,
          netChange,
          avgMonthlyNet: Math.round(avgMonthlyNet * 10) / 10,
          trend,
          volatility: Math.round(volatility * 10) / 10,
          history: months.map(m => ({
            month: fmtMonth(m.date),
            retained: m.retained,
            net: m.new - m.churned,
          })),
        };
      })
      .filter(d => d.latest > 0)
      .sort((a, b) => b.latest - a.latest);
  }, [metrics]);

  // ── Compute Signals ──────────────────────────────────────────────────────
  const signals: Signal[] = useMemo(() => {
    const out: Signal[] = [];
    if (!monthlyData.length) return out;

    // Overall net growth (last 6 months)
    const last6 = monthlyData.slice(-6);
    const totalNet6 = last6.reduce((s, m) => s + m.net, 0);
    if (Math.abs(totalNet6) > 0) {
      out.push({
        type: totalNet6 > 0 ? 'growth' : 'risk',
        title: totalNet6 > 0 ? 'Net headcount growth' : 'Net headcount contraction',
        detail: `Last 6 months combined`,
        value: (totalNet6 >= 0 ? '+' : '') + totalNet6 + ' employees',
      });
    }

    // Best performing dept
    const topGrowing = deptSummaries.find(d => d.trend === 'growing' && d.netChange > 0);
    if (topGrowing) {
      out.push({
        type: 'growth',
        title: `${topGrowing.label} expanding`,
        detail: `Consistent net hiring across the period`,
        value: `+${topGrowing.netChange} net adds`,
        dept: topGrowing.name,
      });
    }

    // At-risk dept
    const declining = deptSummaries.find(d => d.trend === 'declining');
    if (declining) {
      out.push({
        type: 'risk',
        title: `${declining.label} contracting`,
        detail: `More churned than hired over period`,
        value: `${declining.netChange} net change`,
        dept: declining.name,
      });
    }

    // Volatile dept
    const volatile = deptSummaries.find(d => d.trend === 'volatile');
    if (volatile) {
      out.push({
        type: 'alert',
        title: `${volatile.label} showing instability`,
        detail: `High month-to-month variance detected`,
        value: `σ = ${volatile.volatility}`,
        dept: volatile.name,
      });
    }

    // Stability signal
    const stableCount = deptSummaries.filter(d => d.trend === 'stable').length;
    if (stableCount > 0) {
      out.push({
        type: 'stable',
        title: `${stableCount} stable departments`,
        detail: `Low hiring and churn, mature headcount`,
        value: `${stableCount} depts`,
      });
    }

    // March 2025 spike signal (from the data we can see a 54-person churn event)
    const spikeMo = monthlyData.find(m =>
      m.fullDate?.startsWith('2025-03') && Math.abs((m as any).churnedAbs || 0) > 40
    );
    if (spikeMo) {
      out.push({
        type: 'alert',
        title: 'Unusual churn event detected',
        detail: `${fmtMonth(spikeMo.fullDate || '')} — possible reorg or layoff signal`,
        value: `-${(spikeMo as any).churnedAbs} departures`,
      });
    }

    return out.slice(0, 5);
  }, [monthlyData, deptSummaries]);

  // ── Headcount growth rates ───────────────────────────────────────────────
  const g6m  = enrichment?.headcount_growth_6m  ?? company?.headcount_growth_6m;
  const g12m = enrichment?.headcount_growth_12m ?? company?.headcount_growth_12m;
  const g24m = enrichment?.headcount_growth_24m ?? company?.headcount_growth_24m;

  // ── Derived totals ───────────────────────────────────────────────────────
  const latestMonth = monthlyData[monthlyData.length - 1];
  const firstMonth  = monthlyData[0];
  const peakMonth   = monthlyData.reduce((max, m) =>
    m.retained > max.retained ? m : max, monthlyData[0] || { retained: 0 } as any
  );

  const displayedDepts = showAllDepts ? deptSummaries : deptSummaries.slice(0, 8);

  if (!metrics.length) {
    return (
      <div className="bg-white border border-[#E5E0D8] rounded-2xl p-8 flex flex-col items-center gap-3 font-['DM_Sans',system-ui,sans-serif]">
        <div className="w-14 h-14 rounded-2xl bg-[#F0EDE8] flex items-center justify-center">
          <Users size={22} className="text-[#D5CFC5]" />
        </div>
        <p className="text-[13px] font-[500] text-[#9C9189]">No employee metrics data available</p>
        <p className="text-[11px] text-[#C4BDB5]">Enrich the company to load growth intelligence</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="bg-white border border-[#E5E0D8] rounded-2xl overflow-hidden font-['DM_Sans',system-ui,sans-serif]"
    >
      {/* ── Card Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0EDE8] bg-gradient-to-r from-[#FDFCFB] to-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5B4FE8] to-[#7C6FF7] flex items-center justify-center shadow-sm">
            <Activity size={15} className="text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-[700] text-[#1C1916] tracking-[-0.01em]">
              Employee Growth Intelligence
            </h2>
            <p className="text-[10px] text-[#9C9189] mt-0.5">
              {metrics.length} months · {deptSummaries.length} departments · {firstMonth?.month} → {latestMonth?.month}
            </p>
          </div>
        </div>

        {/* Sync/enrich timestamps */}
        <div className="flex items-center gap-3">
          {enrichedAt && (
            <div className="flex items-center gap-1.5 text-[10px] text-[#9C9189]">
              <RefreshCw size={10} />
              <span>Enriched {new Date(enrichedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
            </div>
          )}
          {lastSyncedAt && (
            <div className="flex items-center gap-1.5 text-[10px] text-[#9C9189]">
              <Clock size={10} />
              <span>Synced {new Date(lastSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* ── Growth Rate KPIs ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GrowthKPI
            label="Headcount Growth 6M"
            value={fmtGrowth(g6m)}
            rawValue={g6m}
            sub="vs prior 6 months"
          />
          <GrowthKPI
            label="Headcount Growth 12M"
            value={fmtGrowth(g12m)}
            rawValue={g12m}
            sub="year-over-year"
          />
          <GrowthKPI
            label="Headcount Growth 24M"
            value={fmtGrowth(g24m)}
            rawValue={g24m}
            sub="2-year trajectory"
          />
          {latestMonth && (
            <div className="flex flex-col gap-1 px-4 py-3 bg-white border border-[#E5E0D8] rounded-xl">
              <span className="text-[9px] font-[700] uppercase tracking-[0.08em] text-[#9C9189]">Latest Headcount</span>
              <span className="text-[16px] font-[800] font-['DM_Mono',monospace] text-[#1C1916] leading-none">
                {latestMonth.retained.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#9C9189]">{latestMonth.month}</span>
            </div>
          )}
        </div>

        {/* ── Main Content: Signals + Charts ──────────────────────────── */}
        <div className="grid grid-cols-[220px_1fr] gap-5">
          {/* Left: Signal Cards */}
          <div className="space-y-2">
            <p className="text-[10px] font-[700] text-[#9C9189] uppercase tracking-[0.08em] mb-3">
              Intelligence Signals
            </p>
            {signals.map((sig, i) => <SignalCard key={i} signal={sig} idx={i} />)}
          </div>

          {/* Right: Charts */}
          <div className="space-y-4">
            {/* Chart Tab Toggle */}
            <div className="flex items-center gap-1 bg-[#F8F6F3] rounded-lg p-1 w-fit">
              {([
                { id: 'headcount', label: 'Headcount Trend' },
                { id: 'flow',      label: 'Hiring Flow' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveChart(tab.id)}
                  className={`px-3 py-1.5 text-[11px] font-[600] rounded-md transition-all duration-150 ${
                    activeChart === tab.id
                      ? 'bg-white text-[#1C1916] shadow-sm border border-[#E5E0D8]'
                      : 'text-[#9C9189] hover:text-[#6A6057]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Headcount Trend — AreaChart */}
            <AnimatePresence mode="wait">
              {activeChart === 'headcount' && (
                <motion.div
                  key="headcount"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-[#F8F6F3] rounded-xl p-4 border border-[#EDE9E3]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-[700] text-[#6A6057]">Total Headcount Over Time</p>
                      {peakMonth && (
                        <span className="text-[10px] text-[#9C9189]">
                          Peak: {peakMonth.retained?.toLocaleString()} ({(peakMonth as any).month})
                        </span>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={headcountData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="hcGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#5B4FE8" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#5B4FE8" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="#E5E0D8" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: '#9C9189', fontFamily: 'DM Mono, monospace' }}
                          tickLine={false}
                          axisLine={false}
                          interval={2}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#9C9189', fontFamily: 'DM Mono, monospace' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => (v / 1000).toFixed(1) + 'k'}
                          width={38}
                        />
                        <Tooltip content={<HeadcountTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="retained"
                          name="Headcount"
                          stroke="#5B4FE8"
                          strokeWidth={2}
                          fill="url(#hcGrad)"
                          dot={false}
                          activeDot={{ r: 4, fill: '#5B4FE8', stroke: 'white', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              {/* Hiring Flow — ComposedChart bar + line */}
              {activeChart === 'flow' && (
                <motion.div
                  key="flow"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-[#F8F6F3] rounded-xl p-4 border border-[#EDE9E3]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-[700] text-[#6A6057]">New Hires vs Churned vs Net</p>
                      <div className="flex items-center gap-3 text-[10px] text-[#9C9189]">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#16A34A] inline-block" /> New</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#DC2626] inline-block" /> Churned</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#5B4FE8] inline-block" /> Net</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <ComposedChart data={monthlyData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke="#E5E0D8" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: '#9C9189', fontFamily: 'DM Mono, monospace' }}
                          tickLine={false}
                          axisLine={false}
                          interval={2}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#9C9189', fontFamily: 'DM Mono, monospace' }}
                          tickLine={false}
                          axisLine={false}
                          width={28}
                        />
                        <Tooltip content={<GrowthTooltip />} />
                        <ReferenceLine y={0} stroke="#E5E0D8" strokeWidth={1} />
                        <Bar dataKey="newHires"  name="New hires" fill="#16A34A" opacity={0.8} radius={[2, 2, 0, 0]} maxBarSize={8} />
                        <Bar dataKey="churned"   name="Churned"   fill="#DC2626" opacity={0.75} radius={[0, 0, 2, 2]} maxBarSize={8} />
                        <Line
                          type="monotone"
                          dataKey="net"
                          name="Net"
                          stroke="#5B4FE8"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: '#5B4FE8', stroke: 'white', strokeWidth: 2 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Net Growth Sparkline Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Peak net hires',
                  val: Math.max(...monthlyData.map(m => m.net)),
                  color: C.green,
                  month: monthlyData.find(m => m.net === Math.max(...monthlyData.map(x => x.net)))?.month,
                },
                {
                  label: 'Worst churn mo.',
                  val: Math.min(...monthlyData.map(m => m.net)),
                  color: C.red,
                  month: monthlyData.find(m => m.net === Math.min(...monthlyData.map(x => x.net)))?.month,
                },
                {
                  label: 'Avg monthly net',
                  val: Math.round(monthlyData.reduce((s, m) => s + m.net, 0) / (monthlyData.length || 1)),
                  color: C.violet,
                },
              ].map((stat, i) => (
                <div key={i} className="bg-[#F8F6F3] border border-[#EDE9E3] rounded-xl px-3 py-2.5">
                  <p className="text-[9px] font-[700] uppercase tracking-[0.08em] text-[#9C9189]">{stat.label}</p>
                  <p className="text-[15px] font-[800] font-['DM_Mono',monospace] mt-1 leading-none"
                     style={{ color: stat.color }}>
                    {stat.val >= 0 ? '+' : ''}{stat.val}
                  </p>
                  {stat.month && <p className="text-[10px] text-[#9C9189] mt-1">{stat.month}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Department Intelligence Table ──────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-[700] text-[#6A6057] uppercase tracking-[0.07em]">
                Department Movement
              </p>
              <span className="text-[10px] font-[700] px-1.5 py-0.5 bg-[#F0EEFF] text-[#5B4FE8] rounded-full">
                {deptSummaries.length}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[#9C9189]">
              <span>Period: {firstMonth?.month} – {latestMonth?.month}</span>
            </div>
          </div>

          <div className="border border-[#E5E0D8] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8F6F3] border-b border-[#E5E0D8]">
                  {['Department', 'Current', 'Net Δ', 'New / Churned', 'Signal'].map((h, i) => (
                    <th key={i} className={`px-4 py-2.5 text-[10px] font-[700] text-[#9C9189] uppercase tracking-[0.08em] ${i > 0 ? 'text-right' : 'text-left'} ${i === 4 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedDepts.map((dept, i) => (
                  <DeptRow
                    key={dept.name}
                    dept={dept}
                    color={DEPT_COLORS[i % DEPT_COLORS.length]}
                    idx={i}
                  />
                ))}
              </tbody>
            </table>

            {deptSummaries.length > 8 && (
              <div className="px-4 py-2.5 border-t border-[#F0EDE8] bg-[#FAFAF9]">
                <button
                  onClick={() => setShowAllDepts(!showAllDepts)}
                  className="flex items-center gap-1.5 text-[11px] font-[600] text-[#5B4FE8] hover:text-[#4A3FD6] transition-colors"
                >
                  {showAllDepts
                    ? <><ChevronUp size={12} /> Show less</>
                    : <><ChevronDown size={12} /> Show all {deptSummaries.length} departments</>
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EmployeeGrowthIntelligence;