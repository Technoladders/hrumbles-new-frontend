// src/pages/GlobalSuperAdmin/WaterfallPage.tsx — v2
// Changes from v1:
//   - Added "Settings" tab in header linking to /waterfall/settings
//   - Auto-waterfall entries show sla_hours=3 (30-180 min) correctly in SLABadge

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  Loader2, RefreshCw, Clock, Check, AlertCircle,
  User, Building2, Linkedin, Search, Settings,
} from "lucide-react";
import { WaterfallEntryModal, WaterfallEntry } from "@/components/global/WaterfallEntryModal";

type StatusFilter = "all" | "pending" | "found" | "not_found" | "expired";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-amber-100 text-amber-700 border-amber-300" },
  found:     { label: "Found",     cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  not_found: { label: "Not Found", cls: "bg-slate-100 text-slate-500 border-slate-300" },
  expired:   { label: "Expired",   cls: "bg-red-100 text-red-600 border-red-300" },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.expired;
  return <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", m.cls)}>{m.label}</span>;
}

function SLABadge({ entry }: { entry: WaterfallEntry }) {
  if (entry.status !== "pending") return null;
  const hoursLeft = (new Date(entry.expires_at).getTime() - Date.now()) / 3_600_000;
  const breached  = hoursLeft < 0;
  const urgent    = !breached && hoursLeft < 1; // urgent if less than 1h for 3h SLA entries

  // Show minutes for short-SLA entries (auto-waterfall = 3h)
  const isShortSLA = entry.sla_hours <= 3;
  const timeLabel = isShortSLA
    ? breached
      ? `${Math.abs(Math.round(hoursLeft * 60))}m overdue`
      : `${Math.round(hoursLeft * 60)}m left`
    : breached
      ? `${Math.abs(Math.round(hoursLeft))}h overdue`
      : `${Math.round(hoursLeft)}h left`;

  return (
    <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
      breached ? "bg-red-100 text-red-600" : urgent ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500")}>
      {timeLabel}
    </span>
  );
}

function Avatar({ entry }: { entry: WaterfallEntry }) {
  const [err, setErr] = useState(false);
  if (entry.profile_picture_url && !err)
    return <img src={entry.profile_picture_url} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 flex-shrink-0" onError={() => setErr(true)} />;
  return (
    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
      <User size={13} className="text-violet-500" />
    </div>
  );
}

export function WaterfallPage() {
  const navigate = useNavigate();

  const [entries,   setEntries]   = useState<WaterfallEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState<StatusFilter>("pending");
  const [search,    setSearch]    = useState("");
  const [resolving, setResolving] = useState<WaterfallEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let q = supabase
        .from("candidate_waterfall")
        .select(`*, hr_organizations ( name )`)
        .order("created_at", { ascending: false })
        .limit(200);

      if (filter !== "all") q = q.eq("status", filter);

      const { data, error: dbErr } = await q;
      if (dbErr) throw new Error(dbErr.message);

      const rows = (data ?? []).map((r: any) => ({
        ...r,
        org_name: r.hr_organizations?.name ?? null,
      })) as WaterfallEntry[];
      setEntries(rows);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("waterfall-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "candidate_waterfall" }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const filtered = entries.filter(e => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (e.full_name ?? "").toLowerCase().includes(s)
      || (e.company_name ?? "").toLowerCase().includes(s)
      || (e.linkedin_url ?? "").toLowerCase().includes(s)
      || (e.org_name ?? "").toLowerCase().includes(s);
  });

  const counts = entries.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 70px)" }}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-gradient-to-r from-amber-600 to-orange-600 border-b border-amber-700/30">
        <div>
          <h1 className="text-[14px] font-bold text-white">Waterfall Queue</h1>
          <p className="text-[10px] text-amber-100 mt-0.5">
            {counts["pending"] ?? 0} pending · {counts["found"] ?? 0} resolved · {counts["expired"] ?? 0} expired
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/waterfall/settings")}
            title="Notification settings"
            className="flex items-center gap-1.5 px-3 py-1.5 text-amber-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-[11px] font-medium border border-amber-400/40 hover:border-amber-300">
            <Settings size={12} />
            Settings
          </button>
          <button onClick={load} title="Refresh" className="p-2 text-amber-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5 bg-white border-b border-slate-100">
        <div className="flex items-center gap-1">
          {(["all", "pending", "found", "not_found", "expired"] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn("px-3 py-1 rounded-full text-[10px] font-semibold transition-all",
                filter === s
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100")}>
              {s === "all" ? `All (${entries.length})` : `${STATUS_META[s]?.label} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 h-7 focus-within:border-amber-400 transition-colors w-52">
            <Search size={10} className="text-slate-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, org, company…"
              className="flex-1 bg-transparent text-[11px] text-slate-700 placeholder-slate-300 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-amber-500" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertCircle size={14} /> {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <Clock size={36} className="mb-3" />
            <p className="text-slate-400 text-sm">No {filter === "all" ? "" : filter} entries</p>
          </div>
        ) : (
          <table className="w-full border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["Profile", "Organisation", "Status / SLA", "Found Contact", "SLA Type", "Requested", "Action"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, idx) => (
                <tr key={entry.id}
                  className={cn("border-b border-slate-50 hover:bg-slate-50/60 transition-colors",
                    idx % 2 === 1 && "bg-slate-50/30")}>

                  {/* Profile */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar entry={entry} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-800 truncate max-w-[160px]">{entry.full_name ?? "Unknown"}</p>
                        <p className="text-[9px] text-slate-500 truncate max-w-[160px]">
                          {entry.title ?? ""}{entry.company_name ? ` · ${entry.company_name}` : ""}
                        </p>
                        {entry.linkedin_url && (
                          <a href={entry.linkedin_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-0.5 text-[9px] text-blue-500 hover:text-blue-700 mt-0.5">
                            <Linkedin size={8} />
                            <span className="truncate max-w-[120px]">{entry.linkedin_url.replace("https://www.linkedin.com/in/", "")}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Organisation */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 text-[10px] text-slate-600">
                      <Building2 size={9} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate max-w-[120px]">{entry.org_name ?? entry.organization_id.slice(0, 8)}</span>
                    </div>
                  </td>

                  {/* Status / SLA */}
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={entry.status} />
                      <SLABadge entry={entry} />
                    </div>
                  </td>

                  {/* Found Contact */}
                  <td className="px-4 py-2.5">
                    {entry.found_email || entry.found_phone ? (
                      <div className="space-y-0.5">
                        {entry.found_email && <p className="text-[10px] font-mono text-emerald-700 truncate max-w-[160px]">{entry.found_email}</p>}
                        {entry.found_phone && <p className="text-[10px] font-mono text-slate-600">{entry.found_phone}</p>}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300">—</span>
                    )}
                  </td>

                  {/* SLA Type — shows if auto-added or manual */}
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full font-semibold",
                      entry.sla_hours <= 3
                        ? "bg-violet-100 text-violet-700"
                        : "bg-slate-100 text-slate-500"
                    )}>
                      {entry.sla_hours <= 3 ? "Auto (30–180 min)" : "Manual (48h)"}
                    </span>
                  </td>

                  {/* Requested */}
                  <td className="px-4 py-2.5">
                    <p className="text-[10px] text-slate-500">
                      {new Date(entry.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {new Date(entry.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => setResolving(entry)}
                      className={cn("px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all",
                        entry.status === "pending"
                          ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600 shadow-sm"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-400")}>
                      {entry.status === "pending" ? "Resolve" : "Edit"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {resolving && (
        <WaterfallEntryModal
          entry={resolving}
          onClose={() => setResolving(null)}
          onSaved={() => { setResolving(null); load(); }}
        />
      )}
    </div>
  );
}