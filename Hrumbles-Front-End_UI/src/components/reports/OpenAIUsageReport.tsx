// src/pages/reports/OpenAIUsageReport.tsx
// ============================================================================
// GLOBAL SUPERADMIN — OpenAI Usage Report
// Route: /reports/openai-usage
// Edge fn: get-openai-usage
// ============================================================================

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link as RouterLink } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import moment from "moment";
import { startOfWeek, startOfMonth, subDays, startOfYear } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector";
import { AlertCircle } from "lucide-react";

import {
  ArrowLeft, DollarSign, Cpu, Zap, BarChart3, Activity,
  Download, RefreshCw, TrendingUp, Layers, Hash,
  ArrowUpRight, ArrowDownRight, Sparkles, Wallet,
} from "lucide-react";

// ── Colour palette ─────────────────────────────────────────────────────────────
const MODEL_COLORS: Record<string, string> = {
  "gpt-4o": "#6366f1", "gpt-4o-mini": "#3b82f6",
  "gpt-4.1": "#8b5cf6", "gpt-4.1-mini": "#a78bfa", "gpt-4.1-nano": "#c4b5fd",
  "gpt-4-turbo": "#06b6d4", "gpt-4": "#0ea5e9", "gpt-3.5-turbo": "#10b981",
  "gpt-5": "#f43f5e", "gpt-5-mini": "#fb7185",
  "o1": "#f59e0b", "o1-mini": "#fbbf24", "o3": "#ef4444", "o3-mini": "#f87171", "o4-mini": "#fb923c",
  "text-embedding-3-small": "#64748b", "text-embedding-3-large": "#475569",
  "whisper-1": "#84cc16", "tts-1": "#a3e635", unknown: "#a8a29e",
};
const TOKEN_COLORS = { input: "#6366f1", output: "#10b981", cached: "#f59e0b" };
const getModelColor = (model: string): string => {
  if (MODEL_COLORS[model]) return MODEL_COLORS[model];
  for (const key of Object.keys(MODEL_COLORS)) {
    if (model.startsWith(key) || model.includes(key)) return MODEL_COLORS[key];
  }
  return MODEL_COLORS.unknown;
};

// ── Date presets ───────────────────────────────────────────────────────────────
const DATE_PRESETS = [
  { id: "thisWeek",  label: "This Week",   get: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }) },
  { id: "last7",     label: "Last 7 Days", get: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { id: "thisMonth", label: "This Month",  get: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { id: "last30",    label: "Last 30",     get: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { id: "thisYear",  label: "This Year",   get: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const safeNum = (v: any): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
};
const fmtCost = (v: any): string => {
  const n = safeNum(v);
  if (n === 0) return "$0.00";
  if (n < 0.001) return "$" + n.toFixed(6);
  if (n < 0.01)  return "$" + n.toFixed(5);
  if (n >= 1000) return "$" + (n / 1000).toFixed(2) + "K";
  return "$" + n.toFixed(4);
};
const fmtCostShort = (v: any): string => {
  const n = safeNum(v);
  if (n === 0) return "$0";
  if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "K";
  if (n >= 1)    return "$" + n.toFixed(2);
  if (n >= 0.01) return "$" + n.toFixed(3);
  return "$" + n.toFixed(5);
};
const fmtTokens = (v: number): string => {
  if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(v);
};
const fmtNumber = (v: number): string => {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(v);
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, icon, colorClass }: {
  title: string; value: string; subtitle?: string; icon: React.ReactNode; colorClass: string;
}) => (
  <Card className="border-stone-200 bg-white shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-stone-900 truncate">{value}</p>
          {subtitle && <p className="text-[11px] text-stone-500">{subtitle}</p>}
        </div>
        <div className={"w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-2 " + colorClass}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

// ── Chart Tooltip ─────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-stone-200 px-4 py-3 text-xs min-w-[160px]">
      <p className="font-semibold text-stone-700 mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold">
            {p.name === "Cost" ? fmtCostShort(p.value) : fmtTokens(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Model Badge ───────────────────────────────────────────────────────────────
const ModelBadge = ({ model }: { model: string }) => {
  const color = getModelColor(model);
  const label = model.length > 24 ? model.slice(0, 22) + "…" : model;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
      style={{ color, borderColor: color + "40", backgroundColor: color + "12" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const OpenAIUsageReport = () => {
  const [selectedPreset, setSelectedPreset] = useState("thisWeek");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: new Date(),
  });

  const startTime = useMemo(() => Math.floor(dateRange.from.getTime() / 1000), [dateRange.from]);
  const endTime = useMemo(() => {
    const e = new Date(dateRange.to);
    e.setHours(23, 59, 59, 999);
    return Math.floor(e.getTime() / 1000);
  }, [dateRange.to]);

  const handlePreset = (id: string) => {
    const p = DATE_PRESETS.find((x) => x.id === id);
    if (p) { setSelectedPreset(id); setDateRange(p.get()); }
  };
  const handleManualDateChange = (range: any) => {
    const from = range?.from || range?.startDate;
    const to   = range?.to   || range?.endDate;
    if (from && to) { setSelectedPreset("custom"); setDateRange({ from: new Date(from), to: new Date(to) }); }
  };

  // ── Usage from Supabase Edge Function ───────────────────────────────────────
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["openai-usage", startTime, endTime],
    queryFn: async () => {
      const { data: result, error: fnError } = await supabase.functions.invoke("get-openai-usage", {
        body: { start_time: startTime, end_time: endTime, bucket_width: "1d" },
      });
      if (fnError) throw new Error(fnError.message);
      if (result?.error) throw new Error(result.error);
      return result as {
        summary: { total_cost: number; total_input_tokens: number; total_output_tokens: number; total_cached_tokens: number; total_requests: number; models_used: number };
        by_model: { model: string; input_tokens: number; output_tokens: number; cached_tokens: number; audio_input_tokens: number; audio_output_tokens: number; requests: number; total_tokens: number; avg_tokens_per_request: number }[];
        daily_trend: { day: string; input_tokens: number; output_tokens: number; cached_tokens: number; requests: number; cost: number }[];
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Client-side OpenAI Credit Grants Fetch (browser session only) ───────────
// ── Credits from Supabase Edge Function ─────────────────────────────────────
const creditsQuery = useQuery({
  queryKey: ["openai-credits"],
  queryFn: async () => {
    const { data, error } = await supabase.functions.invoke("get-openai-credits");

    if (error) throw error;

    return data as {
      total_granted: number;
      total_used: number;
      total_available: number;
    };
  },
  staleTime: 10 * 60 * 1000,
});

  const summary    = data?.summary;
  const byModel    = data?.by_model    ?? [];
  const dailyTrend = data?.daily_trend ?? [];

  const trendChartData = useMemo(() =>
    dailyTrend.map((d) => ({ ...d, cost: safeNum(d.cost), dayLabel: moment(d.day).format("MMM D") })),
    [dailyTrend]
  );
  const tokenPieData = useMemo(() => {
    if (!summary) return [];
    const total = summary.total_input_tokens + summary.total_output_tokens + summary.total_cached_tokens;
    if (total === 0) return [];
    return [
      { name: "Input",  value: summary.total_input_tokens,  color: TOKEN_COLORS.input  },
      { name: "Output", value: summary.total_output_tokens, color: TOKEN_COLORS.output },
      ...(summary.total_cached_tokens > 0 ? [{ name: "Cached", value: summary.total_cached_tokens, color: TOKEN_COLORS.cached }] : []),
    ];
  }, [summary]);

  const dateRangeLabel = useMemo(() => {
    const p = DATE_PRESETS.find((x) => x.id === selectedPreset);
    if (p) return p.label;
    return moment(dateRange.from).format("MMM D") + " – " + moment(dateRange.to).format("MMM D, YYYY");
  }, [selectedPreset, dateRange]);

  const handleExportCSV = () => {
    if (!byModel.length) return;
    const headers = ["Model","Requests","Input Tokens","Output Tokens","Cached Tokens","Total Tokens","Avg Tokens/Request"];
    const rows = byModel.map((m) => [m.model,m.requests,m.input_tokens,m.output_tokens,m.cached_tokens,m.total_tokens,m.avg_tokens_per_request]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = "openai-usage-" + moment().format("YYYY-MM-DD") + ".csv";
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-stone-50/60 font-['DM_Sans',system-ui,sans-serif]">
      <header className="sticky top-0 z-40 bg-white/96 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-400 py-2 border-b border-stone-100">
            <RouterLink to="/organization" className="hover:text-stone-700 transition-colors flex items-center gap-0.5">
              <ArrowLeft size={11} /> Dashboard
            </RouterLink>
            <span className="text-stone-300">›</span>
            <span className="text-stone-700">OpenAI Usage Report</span>
          </div>
          <div className="flex items-start justify-between py-3 gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-500" />
                OpenAI Usage Report
                <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-600 border-indigo-200 ml-1">hrumblesai org</Badge>
              </h1>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {dateRangeLabel} · {moment(dateRange.from).format("MMM D")} – {moment(dateRange.to).format("MMM D, YYYY")}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg p-1">
                <EnhancedDateRangeSelector
                  value={dateRange}
                  onChange={handleManualDateChange}
                  onApply={handleManualDateChange}
                  monthsView={2}
                />
              </div>
              {DATE_PRESETS.map((p) => (
                <button key={p.id} onClick={() => handlePreset(p.id)}
                  className={"px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all " +
                    (selectedPreset === p.id
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700")}>
                  {p.label}
                </button>
              ))}
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!byModel.length} className="h-9 text-xs border-stone-200">
                <Download size={13} className="mr-1.5" /> Export
              </Button>
              <Button variant="outline" size="icon" onClick={() => { refetch(); creditsQuery.refetch(); }} disabled={isFetching || creditsQuery.isFetching} className="h-9 w-9 border-stone-200">
                <RefreshCw size={13} className={(isFetching || creditsQuery.isFetching) ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold">Failed to load OpenAI usage data</p>
              <p className="text-xs mt-0.5 text-red-500">{(error as Error)?.message}</p>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <StatCard title="Total Cost" value={isLoading ? "..." : fmtCost(summary?.total_cost)} subtitle={dateRangeLabel} icon={<DollarSign size={18} className="text-emerald-600" />} colorClass="bg-emerald-50" />
          <StatCard title="Total Requests" value={isLoading ? "..." : fmtNumber(summary?.total_requests ?? 0)} subtitle="API calls" icon={<Activity size={18} className="text-indigo-500" />} colorClass="bg-indigo-50" />
          <StatCard title="Input Tokens" value={isLoading ? "..." : fmtTokens(summary?.total_input_tokens ?? 0)} subtitle="Prompt tokens" icon={<ArrowUpRight size={18} className="text-blue-500" />} colorClass="bg-blue-50" />
          <StatCard title="Output Tokens" value={isLoading ? "..." : fmtTokens(summary?.total_output_tokens ?? 0)} subtitle="Completion tokens" icon={<ArrowDownRight size={18} className="text-violet-500" />} colorClass="bg-violet-50" />
          <StatCard title="Cached Tokens" value={isLoading ? "..." : fmtTokens(summary?.total_cached_tokens ?? 0)} subtitle="Prompt cache hits" icon={<Layers size={18} className="text-amber-500" />} colorClass="bg-amber-50" />
          <StatCard title="Models Used" value={isLoading ? "..." : String(summary?.models_used ?? 0)} subtitle="Distinct models" icon={<Cpu size={18} className="text-stone-500" />} colorClass="bg-stone-100" />
          <StatCard
            title="Credits Available"
            value={
              creditsQuery.isLoading ? "..." :
              creditsQuery.isError || !creditsQuery.data?.total_available ? "—" :
              fmtCost(creditsQuery.data.total_available)
            }
            subtitle={
              creditsQuery.isError || !creditsQuery.data?.total_available
                ? "View in OpenAI dashboard"
                : "Remaining balance"
            }
            icon={<Wallet size={18} className="text-amber-600" />}
            colorClass="bg-amber-50"
          />
        </div>

        {/* Credit Info / Fallback Note */}
        {(creditsQuery.isError || !creditsQuery.data?.total_available) && !creditsQuery.isLoading && (
          <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3 text-sm text-amber-800">
              <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-medium">Remaining credits not loaded</p>
                <p className="text-xs mt-0.5">
                  Exact balance is only visible when logged into{" "}
                  <a
                    href="https://platform.openai.com/settings/organization/billing/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    OpenAI Billing <ArrowUpRight size={12} />
                  </a>{" "}
                  in this browser. Try logging in there first, then refresh.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-stone-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <TrendingUp size={15} className="text-indigo-500" /> Daily Cost Trend
              </CardTitle>
              <CardDescription className="text-[11px]">USD spend per day</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[200px] w-full rounded-xl" /> :
               trendChartData.length === 0 ? <div className="h-[200px] flex items-center justify-center text-sm text-stone-400">No usage data for this period</div> : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendChartData}>
                    <defs>
                      <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                    <XAxis dataKey="dayLabel" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#78716C" }} interval="preserveStartEnd" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#78716C" }} width={55} tickFormatter={fmtCostShort} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="cost" name="Cost" stroke="#6366f1" fill="url(#gradCost)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-stone-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <Hash size={15} className="text-indigo-500" /> Token Breakdown
              </CardTitle>
              <CardDescription className="text-[11px]">Input · Output · Cached</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[200px] w-full rounded-xl" /> :
               tokenPieData.length === 0 ? <div className="h-[200px] flex items-center justify-center text-sm text-stone-400">No token data</div> : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={tokenPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={76} paddingAngle={3} dataKey="value">
                      {tokenPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [fmtTokens(v), n]}
                      contentStyle={{ fontSize: "11px", borderRadius: "10px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Model Breakdown Table */}
        <Card className="border-stone-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                  <Zap size={15} className="text-stone-500" /> Model Breakdown
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">Token consumption and request volume per model</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] text-stone-500 border-stone-200">
                {byModel.length} model{byModel.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
            ) : byModel.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-3"><BarChart3 size={20} className="text-stone-400" /></div>
                <p className="text-sm font-medium text-stone-600">No model usage found</p>
                <p className="text-xs text-stone-400 mt-1">Try adjusting the date range</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow className="bg-stone-50 hover:bg-stone-50 border-b border-stone-200">
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider pl-5">Model</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right w-[110px]">Requests</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right w-[130px]">Input Tokens</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right w-[130px]">Output Tokens</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right w-[130px]">Cached Tokens</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right w-[130px]">Total Tokens</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right w-[140px] pr-5">Avg / Request</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byModel.map((m) => {
                      const totalReqs = byModel.reduce((s, x) => s + x.requests, 0) || 1;
                      const reqPct = (m.requests / totalReqs) * 100;
                      return (
                        <TableRow key={m.model} className="hover:bg-stone-50 border-b border-stone-100 last:border-b-0">
                          <TableCell className="pl-5 py-3"><ModelBadge model={m.model} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-sm font-bold text-stone-800">{fmtNumber(m.requests)}</span>
                              <div className="w-16 h-1 rounded-full bg-stone-100 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: reqPct + "%", backgroundColor: getModelColor(m.model) }} />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right"><span className="text-sm font-semibold text-blue-600">{fmtTokens(m.input_tokens)}</span></TableCell>
                          <TableCell className="text-right"><span className="text-sm font-semibold text-violet-600">{fmtTokens(m.output_tokens)}</span></TableCell>
                          <TableCell className="text-right">
                            {m.cached_tokens > 0 ? <span className="text-sm font-semibold text-amber-600">{fmtTokens(m.cached_tokens)}</span> : <span className="text-xs text-stone-300">—</span>}
                          </TableCell>
                          <TableCell className="text-right"><span className="text-sm font-bold text-stone-800">{fmtTokens(m.total_tokens)}</span></TableCell>
                          <TableCell className="text-right pr-5"><span className="text-[11px] text-stone-500 font-medium">{fmtNumber(m.avg_tokens_per_request)} tok</span></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {!isLoading && byModel.length > 0 && (
              <div className="border-t border-stone-200 bg-stone-50 px-5 py-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-stone-500">{byModel.length} model{byModel.length !== 1 ? "s" : ""}</p>
                <div className="flex items-center gap-6 text-[11px]">
                  <span className="text-stone-500">Total Requests: <span className="font-bold text-stone-800">{fmtNumber(summary?.total_requests ?? 0)}</span></span>
                  <span className="text-stone-500">Total Tokens: <span className="font-bold text-stone-800">{fmtTokens((summary?.total_input_tokens ?? 0) + (summary?.total_output_tokens ?? 0))}</span></span>
                  <span className="text-stone-500">Est. Cost: <span className="font-bold text-emerald-600">{fmtCost(summary?.total_cost)}</span></span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Detail Table */}
        <Card className="border-stone-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
              <Activity size={15} className="text-stone-500" /> Daily Detail
            </CardTitle>
            <CardDescription className="text-[11px]">Per-day token and cost breakdown</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
            ) : dailyTrend.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-stone-400">No daily data for this period</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow className="bg-stone-50 hover:bg-stone-50 border-b border-stone-200">
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider pl-5 w-[140px]">Date</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right">Requests</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right">Input Tokens</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right">Output Tokens</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right">Cached Tokens</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right pr-5">Cost (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...dailyTrend].reverse().map((d) => {
                      const costNum = safeNum(d.cost);
                      return (
                        <TableRow key={d.day} className="hover:bg-stone-50 border-b border-stone-100 last:border-b-0">
                          <TableCell className="pl-5 py-2.5">
                            <p className="text-xs font-semibold text-stone-700">{moment(d.day).format("MMM D, YYYY")}</p>
                            <p className="text-[10px] text-stone-400">{moment(d.day).format("dddd")}</p>
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-stone-700">{fmtNumber(d.requests)}</TableCell>
                          <TableCell className="text-right text-xs text-blue-600 font-medium">{fmtTokens(d.input_tokens)}</TableCell>
                          <TableCell className="text-right text-xs text-violet-600 font-medium">{fmtTokens(d.output_tokens)}</TableCell>
                          <TableCell className="text-right text-xs text-amber-600 font-medium">
                            {d.cached_tokens > 0 ? fmtTokens(d.cached_tokens) : <span className="text-stone-300">—</span>}
                          </TableCell>
                          <TableCell className="text-right pr-5">
                            {costNum > 0
                              ? <span className="text-xs font-bold text-emerald-600">{fmtCost(costNum)}</span>
                              : <span className="text-stone-300 text-xs">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default OpenAIUsageReport;