// src/pages/superadmin/MigrationHistoryPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shows all past migration sessions across all organisations.
// Route: /migration/history  (global_superadmin only)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/config/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, Clock, Pause,
  ChevronLeft, Download, FileSpreadsheet, RefreshCw,
} from "lucide-react";

interface MigrationLog {
  id: string;
  organization_id: string;
  org_name?: string;
  file_name: string;
  file_size: number;
  total_rows: number;
  inserted_count: number;
  skipped_count: number;
  error_count: number;
  invalid_rows: number;
  status: "running" | "paused" | "completed" | "failed";
  pattern_summary: Record<string, number> | null;
  source_file_path: string | null;
  source_file_url: string | null;
  success_rows_count: number;
  duplicate_rows_count: number;
  error_rows_count: number;
  // bytea columns come as \\x<hex> strings from PostgREST
  success_rows_gz: string | null;
  duplicate_rows_gz: string | null;
  error_rows_gz: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_CONFIG = {
  completed: { label: "Completed", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  paused:    { label: "Paused",    icon: Pause,        cls: "bg-amber-50  text-amber-700  border-amber-200"  },
  running:   { label: "Running",   icon: RefreshCw,    cls: "bg-blue-50   text-blue-700   border-blue-200"   },
  failed:    { label: "Failed",    icon: XCircle,      cls: "bg-red-50    text-red-700    border-red-200"    },
};

/** Decompress gzip bytea and parse JSON.
 *
 * PostgREST returns bytea columns in TWO possible formats:
 *   1. Hex string:    "\\x1f8b0800..." (starts with \x)
 *   2. Base64 string: "H4sI..."        (legacy / older PostgREST)
 *
 * The edge function stores bytea using "\\x<hex>" format via toHex().
 * PostgREST then returns it back as the same "\\x<hex>" string.
 * We must hex-decode it, NOT base64-decode it.
 */
async function decompressGzJson<T>(raw: string): Promise<T> {
  let bytes: Uint8Array;

  // Detect format: PostgREST hex bytea starts with \x or \\x
  const hexMatch = raw.match(/^\\+x([0-9a-fA-F]+)$/);
  if (hexMatch) {
    // Hex format: convert each pair of hex chars to a byte
    const hex = hexMatch[1];
    bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
  } else {
    // Base64 fallback (older PostgREST versions)
    const binary = atob(raw);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  }

  // Decompress gzip using native DecompressionStream
  const ds     = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();

  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const all   = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { all.set(c, off); off += c.length; }

  return JSON.parse(new TextDecoder().decode(all)) as T;
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

async function downloadSuccessCsv(log: MigrationLog) {
  if (!log.success_rows_gz) return;
  try {
    const rows = await decompressGzJson<Array<{ i: number; e: string; n: string }>>(log.success_rows_gz);
    const lines = ["Row #,Email,Name", ...rows.map((r) => `${r.i},${csvCell(r.e)},${csvCell(r.n)}`)];
    downloadCsv(lines.join("\n"), `migration-inserted-${log.id.slice(0, 8)}.csv`);
  } catch (e) { console.error("Decompress failed:", e); alert("Failed to decompress success data"); }
}

async function downloadDuplicateCsv(log: MigrationLog) {
  if (!log.duplicate_rows_gz) return;
  try {
    const rows = await decompressGzJson<Array<{ i: number; e: string; n: string }>>(log.duplicate_rows_gz);
    const lines = ["Row #,Email,Name", ...rows.map((r) => `${r.i},${csvCell(r.e)},${csvCell(r.n)}`)];
    downloadCsv(lines.join("\n"), `migration-duplicates-${log.id.slice(0, 8)}.csv`);
  } catch (e) { console.error("Decompress failed:", e); alert("Failed to decompress duplicate data"); }
}

async function downloadErrorCsv(log: MigrationLog) {
  if (!log.error_rows_gz) return;
  try {
    type ErrorRow = { rowIndex: number; email?: string; name?: string; reason: string; rowData?: Record<string, unknown> };
    const rows = await decompressGzJson<ErrorRow[]>(log.error_rows_gz);
    const FIELDS = [
      ["rowIndex","Row #"], ["name","Name"], ["email","Email"], ["reason","Reason"],
      ["candidate_name","Candidate Name"], ["current_company","Company"],
      ["current_designation","Designation"], ["total_experience","Experience"],
      ["current_salary","Salary"], ["key_skills","Key Skills"],
      ["current_location","Location"], ["ug_degree","UG Degree"],
      ["ug_university","UG Univ"], ["phone","Phone"],
    ];
    const header = FIELDS.map(([, l]) => csvCell(l)).join(",");
    const lines  = rows.map((r) => FIELDS.map(([field]) => {
      if (field === "rowIndex") return csvCell(r.rowIndex);
      if (field === "email")    return csvCell(r.email);
      if (field === "name")     return csvCell(r.name);
      if (field === "reason")   return csvCell(r.reason);
      return csvCell(r.rowData?.[field] ?? "");
    }).join(","));
    downloadCsv([header, ...lines].join("\n"), `migration-errors-${log.id.slice(0, 8)}.csv`);
  } catch (e) { console.error("Decompress failed:", e); alert("Failed to decompress error data"); }
}

function downloadSourceFile(log: MigrationLog) {
  if (!log.source_file_url) return;
  const a = document.createElement("a");
  a.href = log.source_file_url;
  a.download = log.file_name;
  a.target = "_blank";
  a.click();
}

export default function MigrationHistoryPage() {
  const navigate = useNavigate();
  const [logs, setLogs]       = useState<MigrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("hr_migration_logs")
      .select(`
        *,
        hr_organizations ( name )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      setLogs(
        data.map((d) => ({
          ...d,
          org_name: (d.hr_organizations as { name: string } | null)?.name ?? "—",
        }))
      );
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/migration")}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Migration
            </button>
            <span className="text-slate-300">|</span>
            <h1 className="text-lg font-semibold text-slate-900">Migration History</h1>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FileSpreadsheet className="mx-auto h-12 w-12 mb-3 opacity-30" />
            <p>No migration sessions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.failed;
              const Icon = cfg.icon;
              const isExpanded = expanded === log.id;
              const successRate = log.total_rows > 0
                ? Math.round((log.inserted_count / log.total_rows) * 100)
                : 0;

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                >
                  {/* Row summary */}
                  <button
                    className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* File icon + name */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileSpreadsheet className="h-5 w-5 text-violet-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{log.file_name}</p>
                          <p className="text-xs text-slate-400">
                            {log.org_name} · {fmtBytes(log.file_size)} · {log.total_rows.toLocaleString()} rows
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                        <span className="text-emerald-700 font-semibold">
                          +{log.inserted_count.toLocaleString()}
                        </span>
                        <span className="text-slate-400">
                          {log.skipped_count.toLocaleString()} dup
                        </span>
                        {log.error_count > 0 && (
                          <span className="text-red-500">
                            {log.error_count.toLocaleString()} err
                          </span>
                        )}
                        <span className="text-slate-400">{successRate}%</span>
                      </div>

                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>

                      {/* Date */}
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {fmtDate(log.started_at)}
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-4 bg-slate-50">
                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 mb-4">
                        {[
                          { label: "Total Rows",  val: log.total_rows,      cls: "text-slate-700" },
                          { label: "Inserted",    val: log.inserted_count,  cls: "text-emerald-700" },
                          { label: "Skipped",     val: log.skipped_count,   cls: "text-slate-500" },
                          { label: "Errors",      val: log.error_count,     cls: "text-red-600" },
                          { label: "No Email",    val: log.invalid_rows,    cls: "text-amber-600" },
                        ].map(({ label, val, cls }) => (
                          <div key={label} className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-center">
                            <p className={`text-lg font-bold ${cls}`}>{val.toLocaleString()}</p>
                            <p className="text-xs text-slate-400">{label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Pattern summary */}
                      {log.pattern_summary && Object.keys(log.pattern_summary).length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-slate-500 mb-1.5">Column patterns detected:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(log.pattern_summary).map(([shift, count]) => (
                              <span key={shift} className="text-[11px] rounded border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
                                shift {Number(shift) > 0 ? `+${shift}` : shift}: {Number(count).toLocaleString()} rows
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Duration */}
                      {log.completed_at && (
                        <p className="text-xs text-slate-400 mb-3">
                          <Clock className="inline h-3 w-3 mr-1" />
                          Duration: {Math.round(
                            (new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 60000
                          )} min
                        </p>
                      )}

                      {/* Storage actions */}
                      <div className="mb-4 flex flex-wrap gap-2">
                        {log.source_file_url && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => downloadSourceFile(log)}>
                            <Download className="mr-1.5 h-3 w-3" />
                            Source File (.xlsx)
                          </Button>
                        )}
                        {log.success_rows_gz && (
                          <Button variant="outline" size="sm" className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => downloadSuccessCsv(log)}>
                            <Download className="mr-1.5 h-3 w-3" />
                            Inserted ({(log.success_rows_count ?? 0).toLocaleString()})
                          </Button>
                        )}
                        {log.duplicate_rows_gz && (
                          <Button variant="outline" size="sm" className="h-7 text-xs border-slate-200 text-slate-600 hover:bg-slate-50" onClick={() => downloadDuplicateCsv(log)}>
                            <Download className="mr-1.5 h-3 w-3" />
                            Duplicates ({(log.duplicate_rows_count ?? 0).toLocaleString()})
                          </Button>
                        )}
                        {log.error_rows_gz && (
                          <Button variant="outline" size="sm" className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50" onClick={() => downloadErrorCsv(log)}>
                            <Download className="mr-1.5 h-3 w-3" />
                            Errors ({(log.error_rows_count ?? 0).toLocaleString()})
                          </Button>
                        )}
                        {!log.source_file_url && !log.success_rows_gz && (
                          <p className="text-xs text-slate-400 italic">No stored data — migration pre-dates storage feature</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}