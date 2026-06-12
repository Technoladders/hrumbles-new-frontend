// src/pages/superadmin/YohrImportSessionDetailPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, CheckCircle2, AlertCircle, Clock, RefreshCw,
  ChevronDown, ChevronUp, RotateCcw, Download, X, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

// ── Types ────────────────────────────────────────────────────────────────────
interface Session {
  id: string; filename: string; total_rows: number; status: string;
  s1_done: number; s1_failed: number;
  s2_done: number; s2_failed: number;
  s3_done: number; s3_failed: number;
  s4_done: number; s4_failed: number;
}
interface ImportRow {
  id: string; row_number: number;
  raw_name: string; raw_email: string; raw_phone: string;
  raw_designation: string; raw_company: string; raw_location: string;
  parsed_phone: string; parsed_phone_country: string;
  stored_resume_path: string;
  s1_status: string; s1_error: string;
  s2_status: string; s2_error: string; s2_attempts: number;
  s3_status: string; s3_error: string; s3_attempts: number;
  s4_status: string; s4_error: string;
  ai_result: any;
  talent_pool_id: string;
}

// ── Stage status badge ───────────────────────────────────────────────────────
const StageBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, { text: string; cls: string }> = {
    pending:     { text: "pending",    cls: "bg-gray-100 text-gray-500" },
    done:        { text: "done",       cls: "bg-green-50 text-green-700" },
    failed:      { text: "failed",     cls: "bg-red-50 text-red-600" },
    skipped:     { text: "skipped",    cls: "bg-gray-100 text-gray-400" },
    duplicate:   { text: "duplicate",  cls: "bg-amber-50 text-amber-700" },
    processing:  { text: "processing", cls: "bg-blue-50 text-blue-600" },
    downloading: { text: "loading",    cls: "bg-blue-50 text-blue-600" },
    queued:      { text: "queued",     cls: "bg-purple-50 text-purple-600" },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${c.cls}`}>
      {c.text}
    </span>
  );
};

// ── Stage summary card ───────────────────────────────────────────────────────
interface StageCardProps {
  label: string; stage: number; done: number; failed: number; total: number;
  onRetry: (stage: number) => void; retrying: boolean;
}
const StageCard: React.FC<StageCardProps> = ({ label, stage, done, failed, total, onRetry, retrying }) => {
  const pct = total > 0 ? Math.round(((done) / total) * 100) : 0;
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {failed > 0 && (
          <button
            onClick={() => onRetry(stage)}
            disabled={retrying}
            className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            {retrying ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
            Retry {failed}
          </button>
        )}
      </div>
      <div className="flex items-end gap-2">
        <p className="text-xl font-semibold text-gray-900">{done}</p>
        <p className="text-xs text-gray-400 mb-0.5">/ {total}</p>
        {failed > 0 && <p className="text-xs text-red-500 mb-0.5 ml-auto">{failed} failed</p>}
      </div>
      {/* Progress bar */}
      <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${failed > 0 ? "bg-amber-400" : "bg-violet-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// ── Expandable row ───────────────────────────────────────────────────────────
const ExpandedRowDetails: React.FC<{ row: ImportRow; onRetryRow: (rowId: string, stage: number) => void }> = ({ row, onRetryRow }) => {
  const stages = [
    { n: 1, label: "Parse",    status: row.s1_status, error: row.s1_error,   attempts: null },
    { n: 2, label: "Download", status: row.s2_status, error: row.s2_error,   attempts: row.s2_attempts },
    { n: 3, label: "AI",       status: row.s3_status, error: row.s3_error,   attempts: row.s3_attempts },
    { n: 4, label: "Upsert",   status: row.s4_status, error: row.s4_error,   attempts: null },
  ];
  return (
    <tr>
      <td colSpan={8} className="px-4 pb-4 bg-gray-50/60">
        <div className="grid grid-cols-2 gap-4 py-3">
          {/* Stage details */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stage details</p>
            {stages.map((s) => (
              <div key={s.n} className="flex items-start gap-2">
                <span className="text-xs text-gray-400 w-16 shrink-0">S{s.n} {s.label}</span>
                <StageBadge status={s.status} />
                {s.error && (
                  <span className="text-[11px] text-red-500 flex-1 min-w-0 truncate" title={s.error}>{s.error}</span>
                )}
                {s.attempts !== null && s.attempts > 0 && (
                  <span className="text-[11px] text-gray-400">{s.attempts}× tried</span>
                )}
                {s.n >= 2 && s.status === "failed" && (
                  <button
                    onClick={() => onRetryRow(row.id, s.n)}
                    className="text-[11px] text-violet-600 hover:underline shrink-0"
                  >
                    Retry
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* AI result */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">AI result</p>
            {row.ai_result ? (
              <div className="space-y-1 text-[11px] text-gray-600">
                {row.ai_result.skills?.length > 0 && (
                  <p><span className="text-gray-400">Skills:</span> {row.ai_result.skills.slice(0, 8).join(", ")}{row.ai_result.skills.length > 8 ? ` +${row.ai_result.skills.length - 8}` : ""}</p>
                )}
                {row.ai_result.exp_years != null && (
                  <p><span className="text-gray-400">Exp:</span> {row.ai_result.exp_years}Y {row.ai_result.exp_months ?? 0}M</p>
                )}
                {row.ai_result.qualification && (
                  <p><span className="text-gray-400">Edu:</span> {row.ai_result.qualification}{row.ai_result.institution ? `, ${row.ai_result.institution}` : ""}</p>
                )}
                {row.ai_result.profile_text && (
                  <p className="mt-1 text-gray-500 whitespace-pre-wrap leading-relaxed">{row.ai_result.profile_text}</p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">Not processed yet</p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
type FilterTab = "all" | "failed" | "processing" | "done";

const YohrImportSessionDetailPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { organization_id } = getAuthDataFromLocalStorage();

  const [session, setSession]   = useState<Session | null>(null);
  const [rows, setRows]         = useState<ImportRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<FilterTab>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [retrying, setRetrying] = useState<Set<number>>(new Set());
  const [rowRetrying, setRowRetrying] = useState<Set<string>>(new Set());

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadRows = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("org_csv_import_rows")
      .select("*")
      .eq("session_id", sessionId)
      .order("row_number", { ascending: true })
      .limit(500);
    if (data) setRows(data as ImportRow[]);
  }, [sessionId]);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("org_csv_import_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    if (data) setSession(data as Session);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([loadSession(), loadRows()]).finally(() => setLoading(false));

    // Realtime: session stats
    const ch1 = supabase
      .channel(`session-${sessionId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "org_csv_import_sessions",
        filter: `id=eq.${sessionId}`,
      }, (p) => setSession((prev) => prev ? { ...prev, ...(p.new as Session) } : (p.new as Session)))
      .subscribe();

    // Realtime: rows (UPDATE only — inserts are rare post S1)
    const ch2 = supabase
      .channel(`rows-${sessionId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "org_csv_import_rows",
        filter: `session_id=eq.${sessionId}`,
      }, (p) => {
        setRows((prev) =>
          prev.map((r) => r.id === (p.new as ImportRow).id ? { ...r, ...(p.new as ImportRow) } : r)
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [sessionId]);

  // ── Filtered rows ──────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (filter === "all")        return rows;
    if (filter === "failed")     return rows.filter((r) =>
      r.s1_status === "failed" || r.s2_status === "failed" || r.s3_status === "failed" || r.s4_status === "failed"
    );
    if (filter === "processing") return rows.filter((r) =>
      r.s2_status === "downloading" || r.s3_status === "processing" ||
      (r.s1_status === "done" && r.s4_status === "pending")
    );
    if (filter === "done")       return rows.filter((r) => r.s4_status === "done" || r.s4_status === "duplicate");
    return rows;
  }, [rows, filter]);

  const failedCounts = useMemo(() => ({
    s2: rows.filter((r) => r.s2_status === "failed").length,
    s3: rows.filter((r) => r.s3_status === "failed").length,
    s4: rows.filter((r) => r.s4_status === "failed").length,
  }), [rows]);

  // ── Retry handlers ─────────────────────────────────────────────────────────
  async function handleBulkRetry(stage: number) {
    if (!sessionId) return;
    setRetrying((p) => new Set(p).add(stage));
    try {
      await supabase.rpc("reset_csv_failed_rows", { p_session_id: sessionId, p_stage: stage });
      await loadRows();
    } catch (e) {
      console.error("retry failed:", e);
    } finally {
      setRetrying((p) => { const s = new Set(p); s.delete(stage); return s; });
    }
  }

  async function handleRowRetry(rowId: string, stage: number) {
    const key = `${rowId}-${stage}`;
    setRowRetrying((p) => new Set(p).add(key));
    try {
      await supabase.rpc("reset_csv_row", { p_row_id: rowId, p_stage: stage });
    } finally {
      setRowRetrying((p) => { const s = new Set(p); s.delete(key); return s; });
    }
  }

  const toggleExpand = (id: string) =>
    setExpanded((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // ── Filter tabs ────────────────────────────────────────────────────────────
  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",        label: "All",        count: rows.length },
    { key: "failed",     label: "Failed",     count: rows.filter((r) => r.s2_status === "failed" || r.s3_status === "failed" || r.s4_status === "failed" || r.s1_status === "failed").length },
    { key: "processing", label: "In progress",count: rows.filter((r) => r.s4_status === "pending" && r.s1_status !== "failed").length },
    { key: "done",       label: "Done",       count: rows.filter((r) => r.s4_status === "done" || r.s4_status === "duplicate").length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={22} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={28} className="text-gray-300" />
        <p className="text-sm text-gray-400">Session not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/talent-pool/import-csv")}>
          <ArrowLeft size={14} className="mr-1.5" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <button
            onClick={() => navigate("/talent-pool/import-csv")}
            className="mt-0.5 text-gray-400 hover:text-gray-600 shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{session.filename}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {session.total_rows} rows · Session {session.id.slice(0, 8)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { loadSession(); loadRows(); }} className="shrink-0">
            <RefreshCw size={13} />
          </Button>
        </div>

        {/* Stage cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StageCard label="S1 · Parse"    stage={1} done={session.s1_done} failed={session.s1_failed} total={session.total_rows} onRetry={handleBulkRetry} retrying={retrying.has(1)} />
          <StageCard label="S2 · Download" stage={2} done={session.s2_done} failed={session.s2_failed} total={session.total_rows} onRetry={handleBulkRetry} retrying={retrying.has(2)} />
          <StageCard label="S3 · AI"       stage={3} done={session.s3_done} failed={session.s3_failed} total={session.total_rows} onRetry={handleBulkRetry} retrying={retrying.has(3)} />
          <StageCard label="S4 · Insert"   stage={4} done={session.s4_done} failed={session.s4_failed} total={session.total_rows} onRetry={handleBulkRetry} retrying={retrying.has(4)} />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === t.key
                  ? "bg-violet-100 text-violet-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                filter === t.key ? "bg-violet-200 text-violet-700" : "bg-gray-100 text-gray-500"
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Rows table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400">#</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400">Name / Email</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-400">Phone</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-400">S1</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-400">S2</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-400">S3</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-400">S4</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-sm text-gray-400">
                    No rows match this filter
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isExpanded = expanded.has(row.id);
                  const hasFail = row.s1_status === "failed" || row.s2_status === "failed" || row.s3_status === "failed" || row.s4_status === "failed";
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        className={`cursor-pointer transition-colors ${isExpanded ? "bg-gray-50" : "hover:bg-gray-50/70"}`}
                        onClick={() => toggleExpand(row.id)}
                      >
                        <td className="px-4 py-2.5 text-xs text-gray-400">{row.row_number}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-gray-800 text-xs truncate max-w-[200px]">
                            {row.raw_name || "—"}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate max-w-[200px]">
                            {row.raw_email || "—"}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">
                          {row.parsed_phone || row.raw_phone || "—"}
                          {row.parsed_phone_country && row.parsed_phone_country !== "UNKNOWN" && (
                            <span className="ml-1 text-gray-400">({row.parsed_phone_country})</span>
                          )}
                        </td>
                        <td className="text-center px-3 py-2.5"><StageBadge status={row.s1_status} /></td>
                        <td className="text-center px-3 py-2.5"><StageBadge status={row.s2_status} /></td>
                        <td className="text-center px-3 py-2.5"><StageBadge status={row.s3_status} /></td>
                        <td className="text-center px-3 py-2.5"><StageBadge status={row.s4_status} /></td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasFail && (
                              <AlertCircle size={13} className="text-red-400" />
                            )}
                            {isExpanded
                              ? <ChevronUp size={14} className="text-gray-400" />
                              : <ChevronDown size={14} className="text-gray-300" />
                            }
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <ExpandedRowDetails row={row} onRetryRow={handleRowRetry} />
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredRows.length > 0 && (
          <p className="text-xs text-gray-400 text-right mt-2">
            Showing {filteredRows.length} of {rows.length} rows
          </p>
        )}
      </div>
    </div>
  );
};

export default YohrImportSessionDetailPage;