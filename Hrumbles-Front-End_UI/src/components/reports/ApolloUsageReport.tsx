// src/pages/reports/ApolloUsageReport.tsx
// ============================================================================
// GLOBAL SUPERADMIN — Apollo API Usage & Rate Limits Report
// Route: /reports/apollo-usage
// Edge fn: get-apollo-usage
// ============================================================================

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link as RouterLink } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, PieChart, Pie, Legend
} from "recharts";
import moment from "moment";
import { startOfWeek, startOfMonth, subDays, startOfYear } from "date-fns";

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector";
import { Input } from "@/components/ui/input";

// Icons
import {
  ArrowLeft, Activity, Search, RefreshCw, BarChart3, Database,
  AlertTriangle, Gauge, Globe, Download, Zap, Layers, ServerCrash,
  ShieldAlert, CheckCircle2
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface RateLimit {
  limit: number;
  consumed: number;
  left_over: number;
}

interface ApolloEndpointStat {
  id: string;
  endpoint: string;
  action: string;
  day: RateLimit;
  hour: RateLimit;
  minute: RateLimit;
  total_consumed_day: number;
}

// ── Date presets ─────────────────────────────────────────────────────────────
const DATE_PRESETS =[
  { id: "thisWeek",  label: "This Week",   get: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }) },
  { id: "last7",     label: "Last 7 Days", get: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { id: "thisMonth", label: "This Month",  get: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { id: "last30",    label: "Last 30",     get: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { id: "thisYear",  label: "This Year",   get: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtNumber = (val: number) => new Intl.NumberFormat("en-US").format(val);

const getProgressColor = (consumed: number, limit: number) => {
  if (limit === 0) return "#e7e5e4"; // stone-200
  const ratio = consumed / limit;
  if (ratio >= 0.9) return "#ef4444"; // red-500
  if (ratio >= 0.7) return "#f59e0b"; // amber-500
  return "#10b981"; // emerald-500
};

const getTextColorClass = (consumed: number, limit: number) => {
  if (limit === 0) return "text-stone-500";
  const ratio = consumed / limit;
  if (ratio >= 0.9) return "text-red-600 font-bold";
  if (ratio >= 0.7) return "text-amber-600 font-semibold";
  return "text-stone-700 font-medium";
};

// ── Shared Components ────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, icon, colorClass }: {
  title: string; value: string | React.ReactNode; subtitle?: string; icon: React.ReactNode; colorClass: string;
}) => (
  <Card className="border-stone-200 bg-white shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">{title}</p>
          <div className="text-2xl font-bold tracking-tight text-stone-900 truncate">{value}</div>
          {subtitle && <p className="text-[11px] text-stone-500">{subtitle}</p>}
        </div>
        <div className={"w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-2 " + colorClass}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ProgressBar = ({ consumed, limit }: { consumed: number; limit: number }) => {
  const percent = limit > 0 ? Math.min((consumed / limit) * 100, 100) : 0;
  const color = getProgressColor(consumed, limit);
  return (
    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden mt-1.5">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: color }} />
    </div>
  );
};

// ── Chart Tooltip ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-stone-200 px-4 py-3 text-xs min-w-[160px]">
      <p className="font-semibold text-stone-700 mb-1.5">{data.endpoint} / {data.action}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-stone-500">Consumed:</span>
        <span className="font-semibold text-indigo-600">{fmtNumber(data.total_consumed_day)}</span>
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const ApolloUsageReport = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("thisWeek");
  const[dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: new Date(),
  });

  const startTime = useMemo(() => Math.floor(dateRange.from.getTime() / 1000),[dateRange.from]);
  const endTime = useMemo(() => {
    const e = new Date(dateRange.to);
    e.setHours(23, 59, 59, 999);
    return Math.floor(e.getTime() / 1000);
  },[dateRange.to]);

  const handlePreset = (id: string) => {
    const p = DATE_PRESETS.find((x) => x.id === id);
    if (p) { setSelectedPreset(id); setDateRange(p.get()); }
  };
  
  const handleManualDateChange = (range: any) => {
    const from = range?.from || range?.startDate;
    const to   = range?.to   || range?.endDate;
    if (from && to) { setSelectedPreset("custom"); setDateRange({ from: new Date(from), to: new Date(to) }); }
  };

  const { data: endpoints =[], isLoading, isError, error, refetch, isFetching } = useQuery<ApolloEndpointStat[]>({
    queryKey: ["apollo-usage", startTime, endTime],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-apollo-usage", {
        body: { start_time: startTime, end_time: endTime } // Passed to function if you build DB logging later
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data ||[];
    },
    refetchInterval: 60000, // Refresh live rate limits every minute
  });

  // ── Derived Data ───────────────────────────────────────────────────────────
  const filteredEndpoints = useMemo(() => {
    if (!searchTerm.trim()) return endpoints;
    const q = searchTerm.toLowerCase();
    return endpoints.filter(e => 
      e.endpoint.toLowerCase().includes(q) || 
      e.action.toLowerCase().includes(q)
    );
  }, [endpoints, searchTerm]);

  const activeEndpoints = useMemo(() => endpoints.filter(e => e.day.consumed > 0), [endpoints]);
  const totalConsumedToday = useMemo(() => endpoints.reduce((acc, curr) => acc + curr.day.consumed, 0), [endpoints]);
  
  const maxUtilizationPct = useMemo(() => {
    if (!endpoints.length) return 0;
    return Math.max(...endpoints.map(e => e.day.limit > 0 ? (e.day.consumed / e.day.limit) : 0));
  }, [endpoints]);

  const systemHealth = maxUtilizationPct >= 0.9 ? "Critical" : maxUtilizationPct >= 0.7 ? "Warning" : "Healthy";
  const topConsumed = activeEndpoints.sort((a, b) => b.day.consumed - a.day.consumed).slice(0, 5);

  const dateRangeLabel = useMemo(() => {
    const p = DATE_PRESETS.find((x) => x.id === selectedPreset);
    if (p) return p.label;
    return moment(dateRange.from).format("MMM D") + " – " + moment(dateRange.to).format("MMM D, YYYY");
  }, [selectedPreset, dateRange]);

  const handleExportCSV = () => {
    if (!filteredEndpoints.length) return;
    const headers =["Endpoint", "Action", "Daily Consumed", "Daily Limit", "Hourly Consumed", "Hourly Limit", "Minute Consumed", "Minute Limit"];
    const rows = filteredEndpoints.map((e) =>[
      e.endpoint, e.action, e.day.consumed, e.day.limit, e.hour.consumed, e.hour.limit, e.minute.consumed, e.minute.limit
    ]);
    const csv =[headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = "apollo-limits-" + moment().format("YYYY-MM-DD") + ".csv";
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-stone-50/60 font-['DM_Sans',system-ui,sans-serif]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/96 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-400 py-2 border-b border-stone-100">
            <RouterLink to="/organization" className="hover:text-stone-700 transition-colors flex items-center gap-0.5">
              <ArrowLeft size={11} /> Dashboard
            </RouterLink>
            <span className="text-stone-300">›</span>
            <span className="text-stone-700">Apollo API Usage</span>
          </div>

          <div className="flex items-start justify-between py-3 gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
                <Database size={20} className="text-indigo-600" />
                Apollo API Rate Limits
                <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-600 border-indigo-200 ml-1">hrumbles org</Badge>
              </h1>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {dateRangeLabel} · Live monitoring of endpoint consumption and throttling limits
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Calendar picker */}
              <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg p-1">
                <EnhancedDateRangeSelector
                  value={dateRange}
                  onChange={handleManualDateChange}
                  onApply={handleManualDateChange}
                  monthsView={2}
                />
              </div>
              {/* Preset pills */}
              <div className="flex items-center gap-1">
                {DATE_PRESETS.map((p) => (
                  <button key={p.id} onClick={() => handlePreset(p.id)}
                    className={"px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all " +
                      (selectedPreset === p.id
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700")}>
                    {p.label}
                  </button>
                ))}
              </div>
              
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!filteredEndpoints.length} className="h-9 text-xs border-stone-200">
                <Download size={13} className="mr-1.5" /> Export
              </Button>
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} className="h-9 w-9 border-stone-200">
                <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold">Failed to load Apollo usage data</p>
              <p className="text-xs mt-0.5 text-red-500">{(error as Error)?.message}</p>
            </div>
          </div>
        )}

        {/* ── Summary Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard 
            title="Total API Calls Today" 
            value={isLoading ? "..." : fmtNumber(totalConsumedToday)} 
            subtitle="Combined across endpoints" 
            icon={<Activity size={18} className="text-indigo-600" />} 
            colorClass="bg-indigo-50" 
          />
          <StatCard 
            title="Active Endpoints" 
            value={
              isLoading ? "..." : 
              <span className="flex items-baseline gap-1">
                {activeEndpoints.length} <span className="text-sm font-normal text-stone-400">/ {endpoints.length}</span>
              </span>
            }
            subtitle="With >0 calls today" 
            icon={<Layers size={18} className="text-blue-600" />} 
            colorClass="bg-blue-50" 
          />
          <StatCard 
            title="Highest Limit Usage" 
            value={isLoading ? "..." : `${(maxUtilizationPct * 100).toFixed(1)}%`} 
            subtitle="Closest to throttling" 
            icon={<Zap size={18} className="text-amber-600" />} 
            colorClass="bg-amber-50" 
          />
          <StatCard 
            title="API Health Status" 
            value={
              isLoading ? "..." : 
              <span className={`flex items-center gap-1.5 ${systemHealth === 'Healthy' ? 'text-emerald-600' : systemHealth === 'Warning' ? 'text-amber-500' : 'text-red-600'}`}>
                {systemHealth === 'Healthy' ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
                {systemHealth}
              </span>
            } 
            subtitle="Based on rate limits" 
            icon={<Gauge size={18} className={systemHealth === 'Healthy' ? 'text-emerald-600' : systemHealth === 'Warning' ? 'text-amber-600' : 'text-red-600'} />} 
            colorClass={systemHealth === 'Healthy' ? 'bg-emerald-50' : systemHealth === 'Warning' ? 'bg-amber-50' : 'bg-red-50'} 
          />
        </div>

        {/* ── Charts Row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-stone-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <BarChart3 size={15} className="text-indigo-500" />
                Top Consumed Endpoints
              </CardTitle>
              <CardDescription className="text-[11px]">Endpoints with the highest traffic today</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                 <Skeleton className="h-[200px] w-full rounded-xl" />
              ) : topConsumed.length === 0 ? (
                <div className="h-[200px] flex flex-col items-center justify-center text-stone-400 gap-2">
                  <ServerCrash size={24} className="text-stone-300" />
                  <p className="text-sm">No API calls recorded today.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topConsumed} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E7E5E4" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="action" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#57534E' }} 
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F5F5F4' }} />
                    <Bar dataKey="total_consumed_day" radius={[0, 4, 4, 0]} barSize={24}>
                      {topConsumed.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#6366f1" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-stone-200 shadow-sm flex flex-col justify-center items-center text-center p-6 bg-gradient-to-br from-indigo-50 to-white">
            <Database size={40} className="text-indigo-200 mb-4" />
            <h3 className="text-lg font-bold text-stone-800 mb-1">Live Rate Limits</h3>
            <p className="text-xs text-stone-500 max-w-[250px]">
              Apollo provisions rate limits on a rolling Day, Hour, and Minute basis. Keep an eye on the minute-limits for bulk jobs to prevent 429 errors.
            </p>
          </Card>
        </div>

        {/* ── Rate Limits Table ──────────────────────────────────────── */}
        <Card className="border-stone-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-stone-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                  <Globe size={15} className="text-stone-500" />
                  All Endpoint Rate Limits
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">
                  Detailed breakdown of daily, hourly, and per-minute throttling windows.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px] text-stone-500 border-stone-200 hidden md:flex">
                  {filteredEndpoints.length} endpoint{filteredEndpoints.length !== 1 ? "s" : ""}
                </Badge>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={13} />
                  <Input
                    placeholder="Search endpoint or action..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-8 text-xs w-[220px] border-stone-200"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
               <div className="p-6 space-y-3">
                 {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
               </div>
            ) : filteredEndpoints.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-16 text-center">
                 <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-3"><Search size={20} className="text-stone-400" /></div>
                 <p className="text-sm font-medium text-stone-600">No matching endpoints found</p>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="w-full table-fixed min-w-[800px]">
                  <TableHeader>
                    <TableRow className="bg-stone-50/50 hover:bg-stone-50/50 border-b border-stone-200">
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider pl-6 w-[28%]">Endpoint & Action</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider w-[24%] pr-6">Daily Limit</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider w-[24%] pr-6">Hourly Limit</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider w-[24%] pr-6">Minute Limit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEndpoints.map((item) => (
                      <TableRow key={item.id} className="hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-b-0">
                        
                        <TableCell className="pl-6 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-stone-800">{item.action}</span>
                            <span className="text-[10px] text-stone-400 font-mono mt-0.5 tracking-tight">/{item.endpoint}</span>
                          </div>
                        </TableCell>

                        {/* DAILY */}
                        <TableCell className="pr-6 align-middle">
                          <div className="flex flex-col w-full">
                            <div className="flex justify-between items-end text-xs mb-0.5">
                              <span className={getTextColorClass(item.day.consumed, item.day.limit)}>
                                {fmtNumber(item.day.consumed)}
                              </span>
                              <span className="text-[10px] text-stone-400 font-medium">/ {fmtNumber(item.day.limit)}</span>
                            </div>
                            <ProgressBar consumed={item.day.consumed} limit={item.day.limit} />
                          </div>
                        </TableCell>

                        {/* HOURLY */}
                        <TableCell className="pr-6 align-middle">
                           <div className="flex flex-col w-full">
                            <div className="flex justify-between items-end text-xs mb-0.5">
                              <span className={getTextColorClass(item.hour.consumed, item.hour.limit)}>
                                {fmtNumber(item.hour.consumed)}
                              </span>
                              <span className="text-[10px] text-stone-400 font-medium">/ {fmtNumber(item.hour.limit)}</span>
                            </div>
                            <ProgressBar consumed={item.hour.consumed} limit={item.hour.limit} />
                          </div>
                        </TableCell>

                        {/* MINUTE */}
                        <TableCell className="pr-6 align-middle">
                           <div className="flex flex-col w-full">
                            <div className="flex justify-between items-end text-xs mb-0.5">
                              <span className={getTextColorClass(item.minute.consumed, item.minute.limit)}>
                                {fmtNumber(item.minute.consumed)}
                              </span>
                              <span className="text-[10px] text-stone-400 font-medium">/ {fmtNumber(item.minute.limit)}</span>
                            </div>
                            <ProgressBar consumed={item.minute.consumed} limit={item.minute.limit} />
                          </div>
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {!isLoading && filteredEndpoints.length > 0 && (
              <div className="border-t border-stone-200 bg-stone-50 px-6 py-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-stone-500">Auto-refreshing every 60s</p>
                <div className="flex items-center gap-6 text-[11px]">
                  <span className="text-stone-500">
                    Total Calls Today: <span className="font-bold text-stone-800">{fmtNumber(totalConsumedToday)}</span>
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApolloUsageReport;