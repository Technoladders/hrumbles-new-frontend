// IdleState.tsx — v4
// Analytics dashboard: search history (DB), live stats, mini charts, compact waterfall table
// No API provider names anywhere in UI.
//
// DB dependencies:
//   hr_employees.search_history  jsonb DEFAULT '[]'   (migration: see sql/add_search_history.sql)
//   credit_transactions          — search & reveal counts + credit spend
//   candidate_waterfall          — requests table with hr_employees join for requested_by
//
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Eye, Coins, Clock, ChevronRight, X,
  BarChart2, Droplets, ArrowRight, TrendingUp, Filter,
  CheckCircle2, XCircle, Loader2, History,
  MailOpen, Phone, ExternalLink, Copy, Check,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { cn }      from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RecentSearchEntry {
  id:        string;
  timestamp: number;
  summary:   string;
  chips:     string[];
  filters:   Record<string, unknown>;
  provider:  string;
}

interface WaterfallRow {
  id:                  string;
  linkedin_url:        string;
  requested_by:        string | null;
  full_name:           string | null;
  title:               string | null;
  company_name:        string | null;
  profile_picture_url: string | null;
  status:              "pending" | "found" | "not_found" | "expired";
  reveal_type:         "email" | "phone";
  found_email:         string | null;
  found_phone:         string | null;
  created_at:          string;
  profile_snapshot:    any | null;
  hr_employees:        { id: string; first_name: string | null; last_name: string | null } | null;
}

interface DayPoint { day: string; searches: number; reveals: number; }

interface IdleStateProps {
  orgId:             string | null;
  userId:            string | null;
  waterfallEnabled?: boolean;
  recentSearches:    RecentSearchEntry[];          // localStorage fallback
  onApplyRecent:     (r: RecentSearchEntry) => void;
  onRemoveRecent:    (id: string) => void;
  onQuickSearch:     (titles: string[]) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts: number | string): string {
  const ms = typeof ts === "string" ? new Date(ts).getTime() : ts;
  const m = Math.floor((Date.now() - ms) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : `${Math.floor(d / 7)}w ago`;
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0] ?? "").slice(0, 2).join("").toUpperCase();
}

// Show full contact details (no masking — recruiter needs the real data)
function fullEmail(e: string | null): string { return e || "—"; }
function fullPhone(p: string | null): string { return p || "—"; }

const STATUS_CFG = {
  pending:   { label: "Pending",    bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-400",  icon: Clock         },
  found:     { label: "Found",      bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  icon: CheckCircle2  },
  not_found: { label: "Not Found",  bg: "bg-red-100",    text: "text-red-600",    dot: "bg-red-400",    icon: XCircle       },
  expired:   { label: "Expired",    bg: "bg-slate-100",  text: "text-slate-500",  dot: "bg-slate-400",  icon: XCircle       },
} as const;

const PIE_COLORS: Record<string, string> = {
  Pending: "#F59E0B", Found: "#8B5CF6", "Not Found": "#EC4899", Expired: "#94A3B8",
};

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string; value: string | number | null; icon: React.ElementType;
  color: "violet" | "blue" | "amber" | "green"; sub: string;
}> = ({ label, value, icon: Icon, color, sub }) => {
  const p = {
    violet: "bg-violet-50 border-violet-100 [--num:theme(colors.violet.800)] [--ico:theme(colors.violet.500)] [--sub:theme(colors.violet.600)]",
    blue:   "bg-blue-50   border-blue-100   [--num:theme(colors.blue.800)]   [--ico:theme(colors.blue.500)]   [--sub:theme(colors.blue.600)]",
    amber:  "bg-amber-50  border-amber-100  [--num:theme(colors.amber.800)]  [--ico:theme(colors.amber.500)]  [--sub:theme(colors.amber.700)]",
    green:  "bg-green-50  border-green-100  [--num:theme(colors.green.800)]  [--ico:theme(colors.green.500)]  [--sub:theme(colors.green.700)]",
  }[color];
  const numCls  = { violet: "text-violet-800", blue: "text-blue-800", amber: "text-amber-800", green: "text-green-800" }[color];
  const icoCls  = { violet: "text-violet-500", blue: "text-blue-500", amber: "text-amber-500", green: "text-green-500" }[color];
  const subCls  = { violet: "text-violet-600/70", blue: "text-blue-600/70", amber: "text-amber-700/70", green: "text-green-700/70" }[color];
  const wrapCls = { violet: "bg-violet-50 border-violet-100", blue: "bg-blue-50 border-blue-100", amber: "bg-amber-50 border-amber-100", green: "bg-green-50 border-green-100" }[color];
  return (
    <div className={cn("rounded-xl border p-3.5 flex flex-col gap-2", wrapCls)}>
      <div className="flex items-start justify-between">
        <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center", wrapCls)}>
          <Icon size={13} className={icoCls} />
        </div>
        <span className={cn("text-2xl font-extrabold leading-none mt-0.5", numCls)}>
          {value === null
            ? <span className="block w-8 h-5 rounded bg-current opacity-20 animate-pulse" />
            : value}
        </span>
      </div>
      <div>
        <p className={cn("text-[11px] font-bold leading-tight", numCls)}>{label}</p>
        <p className={cn("text-[9px] leading-tight mt-0.5", subCls)}>{sub}</p>
      </div>
    </div>
  );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-md text-[10px]">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="leading-tight">
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string; compact?: boolean }> = ({ status, compact }) => {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.expired;
  if (compact) return (
    <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-semibold whitespace-nowrap", cfg.bg, cfg.text)}>
      <span className={cn("w-1 h-1 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
};

// ─── IdleState (main) ─────────────────────────────────────────────────────────
export const IdleState: React.FC<IdleStateProps> = ({
  orgId, userId, waterfallEnabled = false,
  recentSearches: lsSearches, onApplyRecent, onRemoveRecent,
}) => {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [searches,    setSearches]    = useState<number | null>(null);
  const [reveals,     setReveals]     = useState<number | null>(null);
  const [credits,     setCredits]     = useState<string | null>(null);
  const [trendData,   setTrendData]   = useState<DayPoint[]>([]);
  const [revealBar,   setRevealBar]   = useState<{ name: string; value: number }[]>([]);
  const [wfPie,       setWfPie]       = useState<{ name: string; value: number }[]>([]);
  const [wfRows,      setWfRows]      = useState<WaterfallRow[]>([]);
  const [wfFilter,    setWfFilter]    = useState<"all"|"pending"|"found"|"not_found">("all");
  const [wfReqFilter, setWfReqFilter]  = useState<string>("all");
  const [wfPage,      setWfPage]       = useState(1);
  const WF_PAGE_SIZE = 10;
  const [dbSearches,  setDbSearches]  = useState<RecentSearchEntry[]>([]);
  const [loadingDb,   setLoadingDb]   = useState(true);
  const [copiedId,    setCopiedId]    = useState<string | null>(null);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id); setTimeout(() => setCopiedId(null), 1800);
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId || !userId) return;
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const since7  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      // 1. Search count (30d)
      supabase.from("credit_transactions").select("*", { count: "exact", head: true })
        .eq("organization_id", orgId).eq("transaction_type", "co_search").gte("created_at", since30),
      // 2. Reveal count (30d)
      supabase.from("credit_transactions").select("*", { count: "exact", head: true })
        .eq("organization_id", orgId).eq("transaction_type", "ti_reveal").gte("created_at", since30),
      // 3. Credit spend (30d)
      supabase.from("credit_transactions").select("amount")
        .eq("organization_id", orgId).lt("amount", 0).gte("created_at", since30),
      // 4. Trend data (7d)
      supabase.from("credit_transactions")
        .select("created_at, transaction_type")
        .eq("organization_id", orgId)
        .in("transaction_type", ["co_search", "ti_reveal"])
        .gte("created_at", since7).order("created_at"),
      // 5. Waterfall rows with requested_by name
      waterfallEnabled
        ? supabase.from("candidate_waterfall")
            .select(`id,linkedin_url,requested_by,full_name,title,company_name,profile_picture_url,profile_snapshot,status,reveal_type,found_email,found_phone,created_at,hr_employees!candidate_waterfall_requested_by_fkey(id,first_name,last_name)`)
            .eq("organization_id", orgId).order("created_at", { ascending: false }).limit(25)
        : Promise.resolve({ data: [] }),
      // 6. Waterfall status counts
      waterfallEnabled
        ? supabase.from("candidate_waterfall").select("status").eq("organization_id", orgId)
        : Promise.resolve({ data: [] }),
      // 7. Search history from DB
      supabase.from("hr_employees").select("search_history").eq("id", userId).single(),
    ]).then(([srch, rev, cred, trend, wfRowsRes, wfStats, emp]) => {
      setSearches(srch.count ?? 0);
      setReveals(rev.count ?? 0);

      // Credits spent
      const spent = ((cred as any).data ?? []).reduce((s: number, r: any) => s + Math.abs(Number(r.amount)), 0);
      setCredits(spent > 0 ? spent.toFixed(1) : "0");

      // Trend chart — last 7 days
      const days7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });
      const dayMap = new Map<string, DayPoint>(days7.map(d => [d, { day: d.slice(5).replace("-", "/"), searches: 0, reveals: 0 }]));
      ((trend as any).data ?? []).forEach((tx: any) => {
        const dk = tx.created_at.split("T")[0];
        const pt = dayMap.get(dk);
        if (pt) { if (tx.transaction_type === "co_search") pt.searches++; else pt.reveals++; }
      });
      setTrendData([...dayMap.values()]);

      // Waterfall pie
      const statusMap: Record<string, number> = { pending: 0, found: 0, not_found: 0, expired: 0 };
      ((wfStats as any).data ?? []).forEach((r: any) => { if (statusMap[r.status] !== undefined) statusMap[r.status]++; });
      setWfPie([
        { name: "Pending",   value: statusMap.pending   },
        { name: "Found",     value: statusMap.found     },
        { name: "Not Found", value: statusMap.not_found },
        { name: "Expired",   value: statusMap.expired   },
      ].filter(d => d.value > 0));

      // Reveal bar (email vs phone from waterfall type col)
      const emailCount = ((wfRowsRes as any).data ?? []).filter((r: any) => r.reveal_type === "email").length;
      const phoneCount = ((wfRowsRes as any).data ?? []).filter((r: any) => r.reveal_type === "phone").length;
      setRevealBar([
        { name: "Email", value: emailCount },
        { name: "Phone", value: phoneCount },
      ]);

      setWfRows(((wfRowsRes as any).data ?? []) as WaterfallRow[]);

      // DB search history
      const history = Array.isArray((emp as any)?.data?.search_history)
        ? (emp as any).data.search_history : [];
      if (history.length > 0) setDbSearches(history);
      setLoadingDb(false);
    }).catch(() => setLoadingDb(false));
  }, [orgId, userId, waterfallEnabled]);

  const searches$ = useMemo(() =>
    dbSearches.length > 0 ? dbSearches : lsSearches,
    [dbSearches, lsSearches]
  );
  const wfFiltered = useMemo(() => {
    let rows = wfFilter === "all" ? wfRows : wfRows.filter(r => r.status === wfFilter);
    if (wfReqFilter !== "all") rows = rows.filter(r => r.requested_by === wfReqFilter);
    return rows;
  }, [wfRows, wfFilter, wfReqFilter]);

  const uniqueRequestors = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    wfRows.forEach(r => {
      if (r.requested_by && !seen.has(r.requested_by)) {
        seen.add(r.requested_by);
        const name = r.hr_employees
          ? `${r.hr_employees.first_name ?? ""} ${r.hr_employees.last_name ?? ""}`.trim()
          : r.requested_by.slice(0, 8);
        list.push({ id: r.requested_by, name: name || "—" });
      }
    });
    return list;
  }, [wfRows]);

  const wfPaged      = useMemo(() => wfFiltered.slice((wfPage - 1) * WF_PAGE_SIZE, wfPage * WF_PAGE_SIZE), [wfFiltered, wfPage]);
  const wfTotalPages = Math.ceil(wfFiltered.length / WF_PAGE_SIZE);
  const wfCounts = useMemo(() => {
    const m: Record<string, number> = { pending: 0, found: 0, not_found: 0, expired: 0 };
    wfRows.forEach(r => { if (m[r.status] !== undefined) m[r.status]++; });
    return m;
  }, [wfRows]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-6 py-5 space-y-5">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">Search Analytics</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Your activity · last 30 days unless noted</p>
          </div>
          <button
            onClick={() => navigate("/recruiter-x/credits")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-violet-300 hover:text-violet-700 text-slate-600 text-[10px] font-semibold transition-all"
          >
            <Coins size={11} /> Credit Usage <ArrowRight size={10} />
          </button>
        </div>

        {/* ── Stats Row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Searches"       value={searches} icon={Search}     color="blue"   sub="This month · all search modes"   />
          <StatCard label="Contact Reveals" value={reveals}  icon={Eye}        color="violet" sub="This month · reveals triggered"  />
          <StatCard label="Credits Used"    value={credits !== null ? credits : null} icon={Coins} color="amber" sub="This month · deductions only" />
        </div>

        {/* ── 1/3 + 2/3 Row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">

          {/* ── Recent Searches (1/3) ──────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 pb-0.5">
              <History size={11} className="text-slate-400" />
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Recent Searches</p>
              {loadingDb && <Loader2 size={9} className="animate-spin text-slate-300 ml-auto" />}
            </div>

            {searches$.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-400">
                <Search size={20} className="mb-2 opacity-40" />
                <p className="text-[10px]">No recent searches yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {searches$.slice(0, 5).map(r => (
                  <div
                    key={r.id}
                    onClick={() => onApplyRecent(r)}
                    className="group relative flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50/20 cursor-pointer transition-all"
                  >
                    <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <p className="text-[10px] font-semibold text-slate-700 truncate group-hover:text-violet-700 transition-colors">
                          {r.summary}
                        </p>
                        <span className="text-[8px] text-slate-400 flex-shrink-0 font-mono whitespace-nowrap">{timeAgo(r.timestamp)}</span>
                      </div>
                      {r.chips.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {r.chips.slice(0, 7).map((chip, i) => (
                            <span key={i} className={cn("text-[7px] px-1 py-0.5 rounded border",
                              chip.startsWith("⭐") ? "bg-amber-50 text-amber-700 border-amber-100" :
                              chip.startsWith("📍") ? "bg-blue-50 text-blue-600 border-blue-100" :
                              chip.startsWith("🎓") ? "bg-green-50 text-green-600 border-green-100" :
                              "bg-violet-50 text-violet-600 border-violet-100"
                            )}>{chip}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                      <ChevronRight size={11} className="text-slate-300 group-hover:text-violet-500 transition-colors" />
                      <button type="button"
                        onClick={e => { e.stopPropagation(); onRemoveRecent(r.id); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 text-slate-400 transition-all"
                      ><X size={8} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Charts (2/3) ────────────────────────────────────────── */}
          <div className="space-y-3">
            {/* Trend Chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <TrendingUp size={9} /> Search &amp; Reveal Trend — last 7 days
              </p>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={trendData} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#EC4899" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#EC4899" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 8, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="searches" name="Searches" stroke="#8B5CF6" fill="url(#gS)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="reveals"  name="Reveals"  stroke="#EC4899" fill="url(#gR)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Pie + Bar row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Waterfall pie */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                  <Droplets size={9} className="text-amber-400" /> Request Status
                </p>
                {wfPie.length === 0 ? (
                  <div className="h-[90px] flex items-center justify-center text-[9px] text-slate-400">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={90}>
                    <PieChart>
                      <Pie data={wfPie} cx="50%" cy="50%" innerRadius={24} outerRadius={38} paddingAngle={2} dataKey="value">
                        {wfPie.map((entry, i) => (
                          <Cell key={i} fill={PIE_COLORS[entry.name] ?? "#8B5CF6"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any) => [`${v}`, n]} contentStyle={{ fontSize: 9, borderRadius: 6 }} />
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Reveal type bar */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                  <BarChart2 size={9} /> Requests by Type
                </p>
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={revealBar} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={22}>
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="value" name="Count" radius={[3, 3, 0, 0]}>
                      {revealBar.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "#6366F1" : "#EC4899"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* ── Waterfall Table ──────────────────────────────────────────── */}
        {waterfallEnabled && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Droplets size={11} className="text-amber-500" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Contact Requests</p>
                <span className="text-[8px] text-slate-400">({wfRows.length} total)</span>
              </div>
              {/* View All button removed — waterfall route is superadmin only */}
            </div>

            {/* Status + Requested By filters */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <div className="flex items-center gap-1">
                {(["all", "pending", "found", "not_found"] as const).map(f => {
                  const labels = { all: `All (${wfRows.length})`, pending: `Pending (${wfCounts.pending})`, found: `Found (${wfCounts.found})`, not_found: `Not Found (${wfCounts.not_found})` };
                  const active = wfFilter === f;
                  return (
                    <button key={f} type="button" onClick={() => { setWfFilter(f); setWfPage(1); }}
                      className={cn("px-2 py-1 rounded-lg text-[8px] font-semibold border transition-all",
                        active ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600")}>
                      {labels[f]}
                    </button>
                  );
                })}
              </div>
              {uniqueRequestors.length > 1 && (
                <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
                  <span className="text-[8px] text-slate-400">By:</span>
                  <button type="button" onClick={() => { setWfReqFilter("all"); setWfPage(1); }}
                    className={cn("px-2 py-1 rounded-lg text-[8px] font-semibold border transition-all",
                      wfReqFilter === "all" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600")}>
                    Everyone
                  </button>
                  {uniqueRequestors.map(req => (
                    <button key={req.id} type="button" onClick={() => { setWfReqFilter(req.id); setWfPage(1); }}
                      className={cn("px-2 py-1 rounded-lg text-[8px] font-semibold border transition-all",
                        wfReqFilter === req.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600")}>
                      {req.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {wfFiltered.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white py-6 flex flex-col items-center gap-1.5 text-slate-400">
                <Filter size={16} className="opacity-40" />
                <p className="text-[10px]">No requests for this filter</p>
              </div>
            ) : (
              <>
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-200 grid text-[8px] font-bold uppercase tracking-wider text-slate-500"
                  style={{ gridTemplateColumns: "1fr 110px 100px 70px 85px 120px 55px 36px" }}>
                  {["Profile", "Company", "Requested By", "Type", "Status", "Result", "Age", ""].map(h => (
                    <div key={h} className="px-2.5 py-2">{h}</div>
                  ))}
                </div>

                {/* Rows */}
                {wfPaged.map((row, i) => {
                  // Navigate via linkedin_url → lookup master_contactout_profiles UUID
                  const handleRowNav = async () => {
                    if (!row.linkedin_url) return;
                    try {
                      const { data } = await supabase
                        .from("master_contactout_profiles")
                        .select("id")
                        .eq("linkedin_url", row.linkedin_url)
                        .single();
                      if (data?.id) navigate(`/profile-hub/profile/${data.id}`);
                    } catch {}
                  };
                  const reqBy = row.hr_employees
                    ? `${row.hr_employees.first_name ?? ""} ${row.hr_employees.last_name ?? ""}`.trim() || "—"
                    : "—";
                  const resultVal = row.status === "found"
                    ? (row.reveal_type === "email" ? fullEmail(row.found_email) : fullPhone(row.found_phone))
                    : null;

                  return (
                    <div key={row.id}
                      className={cn("grid items-center hover:bg-violet-50/30 transition-colors",
                        i < wfPaged.length - 1 && "border-b border-slate-100")}
                      style={{ gridTemplateColumns: "1fr 110px 100px 70px 85px 120px 55px 36px" }}
                    >
                      {/* Profile */}
                      <div className="px-2.5 py-2 flex items-center gap-2 min-w-0">
                        {row.profile_picture_url ? (
                          <img src={row.profile_picture_url} alt="" className="w-6 h-6 rounded-full flex-shrink-0 border border-slate-200 object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full flex-shrink-0 bg-gradient-to-br from-violet-100 to-purple-200 border border-violet-200 text-[7px] font-extrabold text-violet-700 flex items-center justify-center">
                            {initials(row.full_name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold text-slate-700 truncate leading-tight">{row.full_name ?? "—"}</p>
                          <p className="text-[7px] text-slate-400 truncate leading-tight">{row.title ?? ""}</p>
                        </div>
                      </div>
                      {/* Company */}
                      <div className="px-2.5 py-2 text-[9px] text-slate-600 truncate">{row.company_name ?? "—"}</div>
                      {/* Requested By */}
                      <div className="px-2.5 py-2 text-[9px] text-slate-500 truncate">{reqBy}</div>
                      {/* Type */}
                      <div className="px-2.5 py-2">
                        <span className={cn("inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-semibold border whitespace-nowrap",
                          row.reveal_type === "email" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-violet-50 text-violet-600 border-violet-100")}>
                          {row.reveal_type === "email" ? <MailOpen size={7} /> : <Phone size={7} />}
                          {row.reveal_type}
                        </span>
                      </div>
                      {/* Status */}
                      <div className="px-2.5 py-2"><StatusBadge status={row.status} compact /></div>
                      {/* Result */}
                      <div className="px-2.5 py-2">
                        {row.status === "found" && resultVal && resultVal !== "—" ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[8px] text-green-700 bg-green-50 px-1 py-0.5 rounded border border-green-100 whitespace-nowrap max-w-[100px] truncate">{resultVal}</span>
                            <button onClick={e => { e.stopPropagation(); copyText(resultVal!, row.id); }}
                              className="flex-shrink-0 p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-violet-600 transition-colors" title="Copy">
                              {copiedId === row.id ? <Check size={8} className="text-green-500" /> : <Copy size={8} />}
                            </button>
                          </div>
                        ) : row.status === "pending" ? (
                          <span className="text-[8px] text-amber-600 italic">Yet to reveal</span>
                        ) : (
                          <span className="text-[8px] text-slate-400 italic">—</span>
                        )}
                      </div>
                      {/* Age */}
                      <div className="px-2.5 py-2 text-[8px] text-slate-400 whitespace-nowrap">{timeAgo(row.created_at)}</div>
                      {/* Link */}
                      <div className="px-2.5 py-2 flex items-center justify-center">
                        <button onClick={handleRowNav}
                          className="p-1 rounded hover:bg-violet-100 text-slate-400 hover:text-violet-600 transition-colors" title="View profile">
                          <ExternalLink size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Pagination */}
              {wfTotalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                  <span className="text-[8px] text-slate-400">
                    {(wfPage-1)*WF_PAGE_SIZE+1}–{Math.min(wfPage*WF_PAGE_SIZE, wfFiltered.length)} of {wfFiltered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button disabled={wfPage <= 1} onClick={() => setWfPage(p => p-1)}
                      className="px-2 py-0.5 rounded border text-[8px] font-semibold border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      ← Prev
                    </button>
                    <span className="text-[8px] text-slate-500 font-mono px-1">{wfPage}/{wfTotalPages}</span>
                    <button disabled={wfPage >= wfTotalPages} onClick={() => setWfPage(p => p+1)}
                      className="px-2 py-0.5 rounded border text-[8px] font-semibold border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      Next →
                    </button>
                  </div>
                </div>
              )}
              </>
           
            )}
          </div>
        )}

        {/* footer */}
        <p className="text-[8px] text-slate-400 text-center pb-2">
          Use sidebar filters to begin a new search · all data reflects current organisation
        </p>
      </div>
    </div>
  );
};