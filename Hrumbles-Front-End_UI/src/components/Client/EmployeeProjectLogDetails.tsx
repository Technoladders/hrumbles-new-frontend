// src/components/projects/EmployeeProjectLogDetails.tsx
// Completely redesigned — useful layout from user perspective
// dateRange defaults to null (all data) — uses EnhancedDateRangeSelector
// Purple / pink / indigo theme throughout

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import supabase from "../../config/supabaseClient";
import { format, parseISO, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns";
import Loader from "@/components/ui/Loader";
import {
  ArrowLeft, Clock, CalendarDays, TrendingUp, Flame, FileText,
  ChevronLeft, ChevronRight, X, AlignLeft, CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Cell, AreaChart, Area, LineChart, Line,
} from "recharts";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LogDetail { date: string; hours: number; report: string; }
interface DateRange { startDate: Date | null; endDate: Date | null; }

// ─── Theme ────────────────────────────────────────────────────────────────────
const VIOLET   = "#7B43F1";
const PURPLE   = "#A855F7";
const PINK     = "#EC4899";
const INDIGO   = "#6366F1";
const FUCHSIA  = "#D946EF";

// Day-of-week palette — 7 shades across the purple-pink family
const DOW_COLORS = [
  "#6366F1", // Sun — indigo
  "#7B43F1", // Mon — violet
  "#8B5CF6", // Tue — violet-light
  "#A855F7", // Wed — purple
  "#C026D3", // Thu — fuchsia-dark
  "#EC4899", // Fri — pink
  "#D946EF", // Sat — magenta
];

// ─── UI Atoms ────────────────────────────────────────────────────────────────
const WCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
    <div className="w-1 h-4 rounded-full" style={{ background: `linear-gradient(to bottom, ${VIOLET}, ${INDIGO})` }} />
    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{children}</span>
  </div>
);

const StatCard = ({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
}) => (
  <WCard className="p-4">
    <div className="flex items-start justify-between mb-3">
      <div className="p-2.5 rounded-xl" style={{ background: `${color}18` }}>
        <Icon size={16} style={{ color }} />
      </div>
    </div>
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
    <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-1.5">{sub}</p>}
  </WCard>
);

const LightTooltip = ({ active, payload, label, unit = "hrs" }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl overflow-hidden text-xs"
      style={{
        background: "#fff",
        border: "1px solid rgba(139,92,246,0.2)",
        boxShadow: "0 8px 24px rgba(109,40,217,0.12)",
      }}
    >
      <div className="px-3 py-1.5" style={{ background: `linear-gradient(135deg, ${VIOLET}, ${INDIGO})` }}>
        <p className="font-bold text-white">{label}</p>
      </div>
      <div className="px-3 py-2">
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color || p.fill || VIOLET }} className="font-semibold">
            {p.value?.toFixed?.(2) ?? p.value} {unit}
          </p>
        ))}
      </div>
    </div>
  );
};

// Hours intensity badge
const HoursBar = ({ hours, max }: { hours: number; max: number }) => {
  const pct = max > 0 ? (hours / max) * 100 : 0;
  const color = pct > 80 ? PINK : pct > 50 ? PURPLE : VIOLET;
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <span className="text-sm font-bold" style={{ color }}>{hours.toFixed(2)}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const EmployeeProjectLogDetails = () => {
  const navigate = useNavigate();
  const { projectId, employeeId } = useParams<{ projectId: string; employeeId: string }>();
  const [searchParams] = useSearchParams();

  // Default: null = all data (consistent with client pages)
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [reportSearch, setReportSearch] = useState("");

  // If navigated here with startDate/endDate params, pre-fill them
  useEffect(() => {
    const s = searchParams.get("startDate");
    const e = searchParams.get("endDate");
    if (s && e) {
      setDateRange({ startDate: new Date(s), endDate: new Date(e) });
    }
  }, []);

  // ── Data fetch ────────────────────────────────────────────────────────────
  const { data, isLoading, error } = useQuery({
    queryKey: ["employeeLogDetails", projectId, employeeId, dateRange],
    queryFn: async () => {
      if (!projectId || !employeeId) throw new Error("Missing params.");

      const [empRes, projRes] = await Promise.all([
        supabase.from("hr_employees").select("first_name, last_name").eq("id", employeeId).single(),
        supabase.from("hr_projects").select("name, start_date").eq("id", projectId).single(),
      ]);

      let logsQuery = supabase
        .from("time_logs")
        .select("date, project_time_data")
        .eq("employee_id", employeeId)
        .eq("is_approved", true)
        .order("date", { ascending: false });

      if (dateRange.startDate) logsQuery = logsQuery.gte("date", dateRange.startDate.toISOString());
      if (dateRange.endDate)   logsQuery = logsQuery.lte("date", dateRange.endDate.toISOString());

      const { data: logsRaw, error: logsErr } = await logsQuery;
      if (logsErr) throw logsErr;

      const logs: LogDetail[] = (logsRaw ?? [])
        .map(l => {
          const p = l.project_time_data?.projects?.find((p: any) => p.projectId === projectId);
          return p ? { date: l.date, hours: p.hours, report: p.report || "" } : null;
        })
        .filter((l): l is LogDetail => l !== null);

      return {
        employeeName: `${empRes.data?.first_name || ""} ${empRes.data?.last_name || ""}`.trim(),
        projectName: projRes.data?.name || "Unknown",
        projectStart: projRes.data?.start_date,
        logs,
      };
    },
    enabled: !!projectId && !!employeeId,
  });

  // ── Analytics (all derived from logs, no calculation logic change) ─────────
  const {
    totalHours, daysWorked, avgHoursPerDay, peakHours, peakDate,
    monthlyData, dowData, weeklyData, filteredLogs, totalPages,
  } = useMemo(() => {
    const logs = data?.logs ?? [];
    if (!logs.length) {
      return {
        totalHours: 0, daysWorked: 0, avgHoursPerDay: 0, peakHours: 0, peakDate: "",
        monthlyData: [], dowData: [], weeklyData: [], filteredLogs: [], totalPages: 0,
      };
    }

    const totalHours = logs.reduce((s, l) => s + l.hours, 0);
    const daysWorked = logs.length;
    const peakLog = logs.reduce((max, l) => l.hours > max.hours ? l : max, logs[0]);
    const peakHours = peakLog.hours;
    const peakDate = peakLog.date;

    // Monthly aggregation
    const monthMap: Record<string, number> = {};
    logs.forEach(l => {
      const mk = format(parseISO(l.date), "MMM yy");
      monthMap[mk] = (monthMap[mk] || 0) + l.hours;
    });
    // Sort by actual date order
    const sortedMonths = Object.entries(monthMap)
      .map(([label, hours]) => ({ label, hours }))
      .sort((a, b) => {
        const da = new Date(`01 ${a.label}`);
        const db = new Date(`01 ${b.label}`);
        return da.getTime() - db.getTime();
      });

    // Day-of-week aggregation — shows AVERAGE hours per day-of-week (more useful than total)
    const dowTotal: number[] = [0, 0, 0, 0, 0, 0, 0];
    const dowCount: number[] = [0, 0, 0, 0, 0, 0, 0];
    logs.forEach(l => {
      const dow = parseISO(l.date).getDay();
      dowTotal[dow] += l.hours;
      dowCount[dow]++;
    });
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dowData = dayNames.map((name, i) => ({
      name,
      avg: dowCount[i] > 0 ? parseFloat((dowTotal[i] / dowCount[i]).toFixed(2)) : 0,
      total: parseFloat(dowTotal[i].toFixed(2)),
    }));

    // Weekly totals — last 12 weeks
    const weekMap: Record<string, number> = {};
    logs.forEach(l => {
      const d = parseISO(l.date);
      const wkStart = format(startOfWeek(d, { weekStartsOn: 1 }), "dd MMM");
      weekMap[wkStart] = (weekMap[wkStart] || 0) + l.hours;
    });
    const weeklyData = Object.entries(weekMap)
      .map(([week, hours]) => ({ week, hours: parseFloat(hours.toFixed(2)) }))
      .slice(-12);

    // Filter log entries by report search
    const searched = reportSearch
      ? logs.filter(l =>
          l.report.toLowerCase().includes(reportSearch.toLowerCase()) ||
          format(parseISO(l.date), "dd MMM yyyy").toLowerCase().includes(reportSearch.toLowerCase())
        )
      : logs;

    const si = (currentPage - 1) * itemsPerPage;
    return {
      totalHours, daysWorked,
      avgHoursPerDay: daysWorked > 0 ? totalHours / daysWorked : 0,
      peakHours, peakDate,
      monthlyData: sortedMonths,
      dowData,
      weeklyData,
      filteredLogs: searched.slice(si, si + itemsPerPage),
      totalPages: Math.ceil(searched.length / itemsPerPage),
    };
  }, [data, currentPage, itemsPerPage, reportSearch]);

  // ── Loading / error ───────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-[#F7F7F8] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader size={44} className="border-[4px] animate-spin text-violet-600" />
        <p className="text-sm text-gray-400">Loading logs…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F7F7F8] flex items-center justify-center">
      <p className="text-red-500 text-sm">{(error as Error).message}</p>
    </div>
  );

  const hasDateFilter = !!(dateRange.startDate || dateRange.endDate);

  return (
    <div className="min-h-screen bg-[#F7F7F8]">

      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-5 py-2.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <div>
              <h1 className="text-base font-bold text-gray-800">{data?.employeeName || "—"}</h1>
              <p className="text-xs text-gray-400">
                Project: <span className="font-semibold text-gray-600">{data?.projectName}</span>
                {data?.projectStart && (
                  <span className="ml-2 text-gray-300">· started {format(parseISO(data.projectStart), "MMM d, yyyy")}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <EnhancedDateRangeSelector value={dateRange} onChange={setDateRange} />
            {hasDateFilter && (
              <button
                onClick={() => setDateRange({ startDate: null, endDate: null })}
                className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-800 px-2 py-1 rounded-lg hover:bg-violet-50 transition-all"
              >
                <X size={10} /> Clear
              </button>
            )}
            {!hasDateFilter && (
              <span className="text-[10px] text-gray-400 italic">All time</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-5 py-5 space-y-5">

        {/* ── KPI Strip ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Hours Logged"
            value={totalHours.toFixed(2)}
            sub="across all log entries"
            icon={Clock}
            color={VIOLET}
          />
          <StatCard
            label="Days Worked"
            value={String(daysWorked)}
            sub={`avg ${avgHoursPerDay.toFixed(1)} hrs/day`}
            icon={CalendarDays}
            color={INDIGO}
          />
          <StatCard
            label="Avg Hours / Day"
            value={avgHoursPerDay.toFixed(2)}
            sub="across logged days"
            icon={TrendingUp}
            color={PURPLE}
          />
          <StatCard
            label="Peak Day"
            value={`${peakHours.toFixed(2)} hrs`}
            sub={peakDate ? format(parseISO(peakDate), "MMM d, yyyy") : "—"}
            icon={Flame}
            color={PINK}
          />
        </div>

        {/* ── Charts ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Monthly hours area */}
          <WCard className="lg:col-span-2">
            <CardTitle>Hours Logged by Month</CardTitle>
            <div className="p-4 h-[200px]">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="monthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={VIOLET} stopOpacity={0.5} />
                        <stop offset="40%" stopColor={PURPLE} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={INDIGO} stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(139,92,246,0.08)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <RechartsTooltip content={<LightTooltip unit="hrs" />} />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      name="Hours"
                      stroke={VIOLET}
                      strokeWidth={2.5}
                      fill="url(#monthGrad)"
                      dot={{ fill: VIOLET, r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: VIOLET, stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-gray-300">No data for selected period</p>
                </div>
              )}
            </div>
          </WCard>

          {/* Day-of-week AVERAGE hours — far more useful than total */}
          <WCard>
            <CardTitle>Avg Hours by Day of Week</CardTitle>
            <div className="p-4 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dowData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category" dataKey="name"
                    tick={{ fontSize: 11, fill: "#4B5563", fontWeight: 500 }}
                    axisLine={false} tickLine={false} width={28}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-violet-100 rounded-lg shadow-lg p-2.5 text-xs"
                          style={{ boxShadow: "0 4px 16px rgba(109,40,217,0.1)" }}>
                          <p className="font-bold text-gray-700 mb-1">{label}</p>
                          <p style={{ color: VIOLET }}>Avg: {d.avg} hrs</p>
                          <p className="text-gray-400">Total: {d.total} hrs</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="avg" name="Avg hrs" radius={[0, 5, 5, 0]} maxBarSize={18}>
                    {dowData.map((_, i) => (
                      <Cell key={i} fill={DOW_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </WCard>
        </div>

        {/* Weekly trend line */}
        {weeklyData.length > 1 && (
          <WCard>
            <CardTitle>Weekly Hours Trend (last 12 weeks)</CardTitle>
            <div className="p-4 h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weekLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={VIOLET} />
                      <stop offset="50%" stopColor={PINK} />
                      <stop offset="100%" stopColor={FUCHSIA} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(139,92,246,0.08)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<LightTooltip unit="hrs" />} />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    name="Weekly hrs"
                    stroke="url(#weekLineGrad)"
                    strokeWidth={2.5}
                    dot={{ fill: VIOLET, r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: PINK, stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </WCard>
        )}

        {/* ── Log Entries ────────────────────────────────────────────────── */}
        <WCard>
          {/* Table toolbar */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: `linear-gradient(to bottom, ${VIOLET}, ${INDIGO})` }} />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Daily Log Entries</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: `${VIOLET}18`, color: VIOLET }}
              >
                {(data?.logs ?? []).length}
              </span>
            </div>
            <div className="relative">
              <AlignLeft size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search date or report…"
                value={reportSearch}
                onChange={e => { setReportSearch(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:border-violet-400 transition-all w-52"
                style={{ '--tw-ring-color': `${VIOLET}40` } as any}
              />
            </div>
          </div>

          {/* Log cards grid — more scannable than a plain table */}
          {filteredLogs.length > 0 ? (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredLogs.map((log, i) => {
                const pct = peakHours > 0 ? (log.hours / peakHours) * 100 : 0;
                const barColor = pct > 85 ? PINK : pct > 55 ? PURPLE : VIOLET;
                const hasReport = log.report && log.report !== "N/A" && log.report.trim() !== "";
                return (
                  <div
                    key={`${log.date}-${i}`}
                    className="rounded-xl border border-gray-100 p-3.5 hover:border-violet-200 hover:shadow-sm transition-all"
                    style={{ background: pct > 85 ? `${PINK}06` : `${VIOLET}04` }}
                  >
                    {/* Date + hours row */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs font-bold text-gray-800">
                          {format(parseISO(log.date), "EEE, dd MMM yyyy")}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {format(parseISO(log.date), "EEEE")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className="text-lg font-bold leading-none"
                          style={{ color: barColor }}
                        >
                          {log.hours.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-0.5">hrs</span>
                      </div>
                    </div>

                    {/* Hours intensity bar */}
                    <div className="h-1.5 rounded-full bg-gray-100 mb-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>

                    {/* Work report */}
                    {hasReport ? (
                      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">
                        {log.report}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-300 italic">No report submitted</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center">
              <FileText size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                {reportSearch ? "No entries match your search" : "No logs for selected period"}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "1px solid #F3F4F6" }}
            >
              <span className="text-[11px] text-gray-400">
                {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, (data?.logs ?? []).length)} of {(data?.logs ?? []).length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-xs text-gray-500 font-medium">{currentPage} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </WCard>
      </div>
    </div>
  );
};

export default EmployeeProjectLogDetails;