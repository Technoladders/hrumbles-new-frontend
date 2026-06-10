// CreditUsagePage.tsx — Credit Usage Report
// Route: /recruiter-x/credits
// Shows: stats, spending trend, breakdown chart, transaction table
// No API provider names shown anywhere in UI.

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate }   from "react-router-dom";
import { useSelector }   from "react-redux";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend,
} from "recharts";
import {
  ArrowLeft, Coins, Search, Eye, TrendingDown,
  TrendingUp, RefreshCw, Copy, Check,
} from "lucide-react";
import { cn }       from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// ─── Friendly display names (no API provider names) ───────────────────────────
const TX_LABEL: Record<string, string> = {
  co_search:        "People Search",
  ti_reveal:        "Contact Reveal",
  enrichment_usage: "Profile Enrichment",
  usage:            "Verification",
  credit_addition:  "Credits Added",
};
const VT_LABEL: Record<string, string> = {
  co_search_per_result:    "Search · per result",
  co_search_per_page:      "Search · per page",
  co_search_billing_mode:  "Search Billing",
  ti_rr_email_reveal:      "Email Reveal",
  ti_rr_phone_reveal:      "Phone Reveal",
  ti_apollo_email_reveal:  "Email Reveal",
  ti_apollo_phone_reveal:  "Phone Reveal",
  co_email_reveal:         "Email Reveal",
  co_phone_reveal:         "Phone Reveal",
  contact_email_reveal:    "Email Reveal",
  contact_phone_reveal:    "Phone Reveal",
  candidate_email_reveal:  "Candidate Email",
  candidate_phone_reveal:  "Candidate Phone",
  latest_employment_uan:   "Employment Check",
  latest_employment_mobile:"Employment (Mobile)",
  pan_to_uan:              "PAN Lookup",
  uan_full_history:        "UAN History",
  uan_full_history_gl:     "UAN History",
  mobile_to_uan:           "Mobile Lookup",
  latest_passbook_mobile:  "Passbook Mobile",
  company_search:          "Company Search",
  company_enrich:          "Company Enrichment",
};

function friendlyLabel(tx: CreditTx): string {
  if (tx.verification_type && VT_LABEL[tx.verification_type]) return VT_LABEL[tx.verification_type];
  return TX_LABEL[tx.transaction_type] ?? tx.transaction_type;
}

function friendlyDesc(desc: string | null): string {
  if (!desc) return "—";
  // Strip provider names from description strings
  return desc
    .replace(/contactout/gi, "People Search")
    .replace(/rocketreach/gi, "Reveal API")
    .replace(/apollo/gi, "Enrichment API")
    .replace(/gridlines/gi, "Verification")
    .replace(/truthscreen/gi, "Verification");
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CreditTx {
  id:                string;
  transaction_type:  string;
  verification_type: string | null;
  source:            string | null;
  amount:            string;
  balance_after:     string | null;
  description:       string | null;
  created_at:        string;
  created_by:        string | null;
}

// ─── Theme ───────────────────────────────────────────────────────────────────
const THEME = ["#8B5CF6","#6366F1","#EC4899","#7C3AED","#A78BFA","#818CF8"];
const SPEND_COLOR  = "#8B5CF6";
const SEARCH_COLOR = "#6366F1";
const REVEAL_COLOR = "#EC4899";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(s: string): string {
  const d = new Date(s);
  return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}
function fmtDateShort(s: string): string {
  const d = new Date(s);
  return `${(d.getMonth()+1)}/${d.getDate()}`;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string; value: string | number | null;
  icon: React.ElementType; color: string; sub: string;
}> = ({ label, value, icon: Icon, color, sub }) => (
  <div className={cn("rounded-xl border p-4 flex flex-col gap-2.5", color)}>
    <div className="flex items-start justify-between">
      <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center", color)}>
        <Icon size={14} className="opacity-70" />
      </div>
      <span className="text-2xl font-extrabold leading-none mt-0.5">
        {value === null
          ? <span className="block w-10 h-6 rounded bg-current opacity-20 animate-pulse" />
          : value}
      </span>
    </div>
    <div>
      <p className="text-[11px] font-bold leading-tight">{label}</p>
      <p className="text-[9px] leading-tight mt-0.5 opacity-70">{sub}</p>
    </div>
  </div>
);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-md text-[10px]">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }} className="leading-tight">
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const CreditUsagePage: React.FC = () => {
  const navigate     = useNavigate();
  const orgId        = useSelector((s: any) => s.auth?.organization_id ?? s.auth?.user?.organization_id ?? null);
  const [txs,        setTxs]        = useState<CreditTx[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [copiedId,   setCopiedId]   = useState<string | null>(null);
  const [txPage,     setTxPage]     = useState(1);
  const TX_PAGE_SIZE = 20;

  const copyVal = (val: string, id: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopiedId(id); setTimeout(() => setCopiedId(null), 1500);
  };

  useEffect(() => {
    if (!orgId) return;
    supabase.from("credit_transactions")
      .select("id,transaction_type,verification_type,source,amount,balance_after,description,created_at,created_by")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => { setTxs((data ?? []) as CreditTx[]); setLoading(false); });
  }, [orgId]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const { searches, reveals, totalSpend, latestBalance } = useMemo(() => {
    const since30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent  = txs.filter(t => new Date(t.created_at).getTime() >= since30);
    return {
      searches:      recent.filter(t => t.transaction_type === "co_search").length,
      reveals:       recent.filter(t => t.transaction_type === "ti_reveal").length,
      totalSpend:    recent.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0),
      latestBalance: txs.length > 0 ? Number(txs[0].balance_after ?? 0) : null,
    };
  }, [txs]);

  // ── Trend data (last 30 days, daily) ──────────────────────────────────────
  const trendData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split("T")[0];
    });
    const map = new Map<string, { day: string; spend: number; searches: number; reveals: number }>(
      days.map(d => [d, { day: fmtDateShort(d + "T00:00:00"), spend: 0, searches: 0, reveals: 0 }])
    );
    txs.forEach(t => {
      const dk = t.created_at.split("T")[0];
      const pt = map.get(dk);
      if (!pt) return;
      if (Number(t.amount) < 0) pt.spend += Math.abs(Number(t.amount));
      if (t.transaction_type === "co_search")  pt.searches++;
      if (t.transaction_type === "ti_reveal")  pt.reveals++;
    });
    return [...map.values()];
  }, [txs]);

  // ── Breakdown by type ──────────────────────────────────────────────────────
  const breakdownData = useMemo(() => {
    const map: Record<string, number> = {};
    txs.forEach(t => {
      if (Number(t.amount) >= 0) return;
      const label = friendlyLabel(t);
      map[label] = (map[label] ?? 0) + Math.abs(Number(t.amount));
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [txs]);

  const txPaged      = useMemo(() => txs.slice((txPage-1)*TX_PAGE_SIZE, txPage*TX_PAGE_SIZE), [txs, txPage]);
  const txTotalPages = Math.ceil(txs.length / TX_PAGE_SIZE);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="flex-shrink-0 h-11 px-5 flex items-center gap-3 bg-white border-b border-slate-100">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-violet-700 transition-colors">
          <ArrowLeft size={13} /> Back
        </button>
        <div className="h-4 w-px bg-slate-200" />
        <p className="text-[12px] font-extrabold text-slate-800">Credit Usage Report</p>
        {loading && <RefreshCw size={11} className="animate-spin text-slate-400 ml-1" />}
        <span className="ml-auto text-[9px] text-slate-400">Last 30 days · your organisation</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-5 space-y-5">

          {/* ── Stats ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Searches"      value={searches}                icon={Search}       color="bg-violet-50 border-violet-100 text-violet-800" sub="This month" />
            <StatCard label="Reveals"       value={reveals}                 icon={Eye}          color="bg-pink-50 border-pink-100 text-pink-800"     sub="This month" />
            <StatCard label="Credits Spent" value={totalSpend > 0 ? totalSpend.toFixed(1) : "0"} icon={TrendingDown}  color="bg-indigo-50 border-indigo-100 text-indigo-800" sub="This month" />
            <StatCard label="Balance"       value={latestBalance !== null ? latestBalance.toFixed(1) : null} icon={Coins} color="bg-purple-50 border-purple-100 text-purple-800" sub="Current balance" />
          </div>

          {/* ── Charts ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
            {/* Spending + Activity Trend */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <TrendingUp size={9} /> 30-Day Activity Trend
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={SPEND_COLOR}  stopOpacity={0.25} />
                      <stop offset="95%" stopColor={SPEND_COLOR}  stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gSearch" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={SEARCH_COLOR} stopOpacity={0.2}  />
                      <stop offset="95%" stopColor={SEARCH_COLOR} stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gReveal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={REVEAL_COLOR} stopOpacity={0.2}  />
                      <stop offset="95%" stopColor={REVEAL_COLOR} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 7, fill: "#94A3B8" }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 7, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 8 }} />
                  <Area type="monotone" dataKey="spend"    name="Credits Spent" stroke={SPEND_COLOR}  fill="url(#gSpend)"  strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="searches" name="Searches"       stroke={SEARCH_COLOR} fill="url(#gSearch)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="reveals"  name="Reveals"        stroke={REVEAL_COLOR} fill="url(#gReveal)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Breakdown by type */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <Coins size={9} /> Spend by Activity
              </p>
              {breakdownData.length === 0 ? (
                <div className="h-[160px] flex items-center justify-center text-[10px] text-slate-400">No spend data</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={breakdownData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barSize={10}>
                    <XAxis type="number" tick={{ fontSize: 7, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 7, fill: "#64748B" }} tickLine={false} axisLine={false} width={90} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="value" name="Credits" radius={[0, 3, 3, 0]}>
                      {breakdownData.map((_, i) => (
                        <Cell key={i} fill={THEME[i % THEME.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Transaction Table ─────────────────────────────────────── */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Recent Transactions ({txs.length})
            </p>
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
              {/* Header */}
              <div className="bg-slate-50 border-b border-slate-200 grid text-[8px] font-bold uppercase tracking-wider text-slate-500"
                style={{ gridTemplateColumns: "1.6fr 2.4fr 80px 90px 90px 30px" }}>
                {["Activity", "Detail", "Amount", "Balance After", "Date", ""].map(h => (
                  <div key={h} className="px-3 py-2">{h}</div>
                ))}
              </div>

              {/* Rows */}
              {loading ? (
                <div className="py-10 flex items-center justify-center text-[11px] text-slate-400 gap-2">
                  <RefreshCw size={13} className="animate-spin" /> Loading transactions…
                </div>
              ) : txs.length === 0 ? (
                <div className="py-10 text-center text-[11px] text-slate-400">No transactions found</div>
              ) : (
                txPaged.map((tx, i) => {
                  const amount    = Number(tx.amount);
                  const isDebit   = amount < 0;
                  const isCredit  = amount > 0;
                  const isZero    = amount === 0;
                  const label     = friendlyLabel(tx);
                  const desc      = friendlyDesc(tx.description);
                  const amountStr = isZero ? "—" : `${isDebit ? "−" : "+"}${Math.abs(amount).toFixed(2)}`;

                  return (
                    <div key={tx.id}
                      className={cn("grid items-center transition-colors hover:bg-slate-50",
                        i < txPaged.length - 1 && "border-b border-slate-100")}
                      style={{ gridTemplateColumns: "1.6fr 2.4fr 80px 90px 90px 30px" }}
                    >
                      {/* Activity */}
                      <div className="px-3 py-2.5">
                        <span className="text-[9px] font-semibold text-slate-700">{label}</span>
                      </div>
                      {/* Detail */}
                      <div className="px-3 py-2.5 text-[9px] text-slate-500 truncate max-w-[300px]" title={desc}>
                        {desc}
                      </div>
                      {/* Amount */}
                      <div className="px-3 py-2.5">
                        <span className={cn("text-[9px] font-bold font-mono",
                          isDebit ? "text-red-600" : isCredit ? "text-green-700" : "text-slate-400")}>
                          {amountStr}
                        </span>
                      </div>
                      {/* Balance After */}
                      <div className="px-3 py-2.5 text-[9px] text-slate-500 font-mono">
                        {tx.balance_after ?? "—"}
                      </div>
                      {/* Date */}
                      <div className="px-3 py-2.5 text-[8px] text-slate-400 whitespace-nowrap font-mono">
                        {fmtDate(tx.created_at)}
                      </div>
                      {/* Copy */}
                      <div className="px-2 py-2.5 flex items-center justify-center">
                        <button onClick={() => copyVal(tx.id, tx.id)}
                          title="Copy transaction ID"
                          className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors">
                          {copiedId === tx.id ? <Check size={9} className="text-green-500" /> : <Copy size={9} />}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Pagination */}
              {txTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200 rounded-b-xl">
                  <span className="text-[9px] text-slate-400">
                    Showing {(txPage-1)*TX_PAGE_SIZE+1}–{Math.min(txPage*TX_PAGE_SIZE, txs.length)} of {txs.length} transactions
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button disabled={txPage <= 1} onClick={() => setTxPage(p => p-1)}
                      className="px-3 py-1 rounded-lg border text-[9px] font-semibold border-slate-200 text-slate-500 hover:border-violet-400 hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      ← Previous
                    </button>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {txPage} / {txTotalPages}
                    </span>
                    <button disabled={txPage >= txTotalPages} onClick={() => setTxPage(p => p+1)}
                      className="px-3 py-1 rounded-lg border text-[9px] font-semibold border-slate-200 text-slate-500 hover:border-violet-400 hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditUsagePage;