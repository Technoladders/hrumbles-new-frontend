// src/pages/superadmin/MigrationPage.tsx  ─── FINAL
// ─────────────────────────────────────────────────────────────────────────────
// Route: /migration  (global_superadmin only)
// Features:
//   • Header-driven column alignment (all Naukri export formats)
//   • Column mapping modal (review + manual override)
//   • Migration session tracking (hr_migration_logs)
//   • Pause/Resume with localStorage checkpoint
//   • Full-data error CSV export
//   • Link to migration history
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import supabase from "@/config/supabaseClient";
import {
  useMigrationEngine,
  MigrationStatus,
  ErrorRecord,
  loadCheckpoint,
  clearCheckpoint,
  fingerprintForFile,
} from "@/hooks/useMigrationEngine";
// Note: finalizeStatus is now returned from useMigrationEngine hook
import { NaukriRow, parseMultipleEmails, parseMultiplePhones } from "@/utils/naukriColumnMapper";
import ColumnMapperModal from "@/components/migration/ColumnMapperModal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileSpreadsheet, Play, Pause, RotateCcw, Download,
  CheckCircle2, XCircle, SkipForward, AlertTriangle,
  Building2, RefreshCw, Info, Upload, History, Columns,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function csvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = Array.isArray(val) ? val.join("; ") : String(val);
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadFullDataCsv(rows: ErrorRecord[], filename: string): void {
  const FIELDS: Array<[string, string]> = [
    ["_row",                 "Row #"],
    ["_reason",              "Reason"],
    ["candidate_name",       "Name"],
    ["email",                "Email (raw)"],
    ["phone",                "Phone (raw)"],
    ["current_location",     "Location"],
    ["current_company",      "Company"],
    ["current_designation",  "Designation"],
    ["total_experience",     "Experience"],
    ["current_salary",       "Salary"],
    ["notice_period",        "Notice Period"],
    ["key_skills",           "Key Skills"],
    ["resume_headline",      "Resume Headline"],
    ["ug_degree",            "UG Degree"],
    ["ug_university",        "UG University"],
    ["ug_year",              "UG Year"],
    ["pg_degree",            "PG Degree"],
    ["pg_university",        "PG University"],
    ["industry",             "Industry"],
    ["suggested_title",      "Job Title"],
    ["applied_at",           "Applied Date"],
    ["preferred_locations",  "Preferred Locations"],
    ["gender",               "Gender"],
    ["date_of_birth",        "DOB"],
    ["source_platform",      "Source"],
  ];
  const header = FIELDS.map(([, l]) => csvCell(l)).join(",");
  const lines  = rows.map((rec) => {
    const row = rec.rowData ?? {};
    return FIELDS.map(([field]) => {
      if (field === "_row")    return csvCell(rec.rowIndex);
      if (field === "_reason") return csvCell(rec.reason);
      return csvCell((row as Record<string, unknown>)[field] ?? "");
    }).join(",");
  });
  const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const STATUS_COLOR: Record<MigrationStatus, string> = {
  idle:      "bg-slate-100 text-slate-600",
  parsing:   "bg-blue-100 text-blue-700",
  ready:     "bg-violet-100 text-violet-700",
  running:   "bg-amber-100 text-amber-700",
  paused:    "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
  saving:    "bg-blue-100 text-blue-700",
  error:     "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<MigrationStatus, string> = {
  idle:      "Ready",
  parsing:   "Parsing…",
  ready:     "File Ready",
  running:   "Migrating…",
  paused:    "Paused",
  completed: "Completed",
  saving:    "Saving files…",
  error:     "Parse Error",
};

// ─── Org picker ───────────────────────────────────────────────────────────────
interface Org { id: string; name: string; status: string }
function useOrganizations() {
  const [orgs, setOrgs]       = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("hr_organizations").select("id,name,status").order("name")
      .then(({ data }) => { if (data) setOrgs(data as Org[]); setLoading(false); });
  }, []);
  return { orgs, loading };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Step({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${active ? "bg-violet-600" : "bg-slate-300"}`}>
        {n}
      </div>
      <h2 className="font-semibold text-slate-800">{label}</h2>
    </div>
  );
}

function StatCard({ icon, label, value, bg, text }: {
  icon: React.ReactNode; label: string; value: number; bg: string; text: string;
}) {
  return (
    <div className={`rounded-lg ${bg} px-4 py-3`}>
      <div className="flex items-center gap-2">{icon}<span className="text-xs text-slate-500">{label}</span></div>
      <p className={`mt-1 text-2xl font-bold ${text}`}>{value.toLocaleString()}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MigrationPage() {
  const navigate = useNavigate();
  const { orgs, loading: orgsLoading } = useOrganizations();
  const [selectedOrgId, setSelectedOrgId]     = useState("");
  const [selectedOrgName, setSelectedOrgName] = useState("");
  const [pendingFile, setPendingFile]           = useState<File | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [ckptInfo, setCkptInfo]                 = useState<ReturnType<typeof loadCheckpoint>>(null);
  const [showMapperModal, setShowMapperModal]   = useState(false);

  const {
    status, stats, errors, previewRows, fileInfo, sessionId, finalizeStatus,
    loadFile, startMigration, pauseMigration, resetMigration, updateColumnMapping,
  } = useMigrationEngine();

  // ── Drop ────────────────────────────────────────────────────────────────────
  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file || !selectedOrgId) return;
    const ckpt = loadCheckpoint(fingerprintForFile(file, selectedOrgId));
    if (ckpt) { setPendingFile(file); setCkptInfo(ckpt); setShowResumeDialog(true); }
    else       { await loadFile(file, selectedOrgId); }
  }, [selectedOrgId, loadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    maxFiles: 1,
    disabled: !selectedOrgId || status === "running" || status === "parsing",
  });

  // ── Resume dialog ───────────────────────────────────────────────────────────
  async function handleResumeYes() {
    setShowResumeDialog(false);
    if (pendingFile) { await loadFile(pendingFile, selectedOrgId); setPendingFile(null); }
  }
  async function handleResumeNo() {
    setShowResumeDialog(false);
    if (pendingFile) {
      clearCheckpoint(fingerprintForFile(pendingFile, selectedOrgId));
      setCkptInfo(null);
      await loadFile(pendingFile, selectedOrgId);
      setPendingFile(null);
    }
  }

  function handleOrgChange(val: string) {
    setSelectedOrgId(val);
    setSelectedOrgName(orgs.find((o) => o.id === val)?.name ?? "");
    if (fileInfo) resetMigration();
  }

  // Progress
  const pct = stats.totalRows > 0
    ? Math.min(100, Math.round((stats.processedRows / stats.totalRows) * 100))
    : 0;

  const isRunning   = status === "running";
  const isPaused    = status === "paused";
  const isCompleted = status === "completed";
  const isSaving    = status === "saving";
  const isReady     = status === "ready";
  const isIdle      = status === "idle";
  const hasFile     = !!fileInfo;

  // Build shift display for file info bar
  const shiftBadges = fileInfo?.shiftStats
    ? Object.entries(fileInfo.shiftStats)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([shift, count]) => {
          const s = parseInt(shift);
          const labels: Record<number, [string, string]> = {
            0:  ["Standard",   "bg-emerald-50 border-emerald-200 text-emerald-700"],
            "-3":["Name-first", "bg-blue-50 border-blue-200 text-blue-700"],
            1:  ["NA-shifted",  "bg-amber-50 border-amber-200 text-amber-700"],
            2:  ["DCS-prefix",  "bg-orange-50 border-orange-200 text-orange-700"],
            "-1":["No-source",  "bg-purple-50 border-purple-200 text-purple-700"],
          };
          const [label, cls] = labels[s] ?? [`shift ${s > 0 ? `+${s}` : s}`, "bg-slate-50 border-slate-200 text-slate-600"];
          return { label, cls, count };
        })
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Upload className="h-5 w-5 text-violet-600" />
              Talent Pool Migration
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Any Naukri.com Excel export — column shifts auto-corrected
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/migration/history")}
              className="text-slate-500 hover:text-slate-800"
            >
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-5 px-6 py-8">

        {/* Step 1: Org */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Step n={1} label="Select Target Organisation" active />
          <div className="flex items-center gap-3 flex-wrap">
            <Building2 className="h-4 w-4 text-slate-400" />
            <Select value={selectedOrgId} onValueChange={handleOrgChange} disabled={isRunning}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder={orgsLoading ? "Loading…" : "Choose an organisation"} />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                    {org.status !== "active" && (
                      <span className="ml-2 text-xs text-red-500">({org.status})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOrgName && (
              <span className="rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-medium text-violet-700">
                {selectedOrgName}
              </span>
            )}
          </div>
        </section>

        {/* Step 2: File */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Step n={2} label="Upload Naukri Excel File" active={!!selectedOrgId} />
          <p className="text-xs text-slate-400 -mt-2 mb-4">
            Any Naukri export format — 70-col, 75-col, 89-col, or merged. Column shifts detected per-row automatically.
          </p>

          {!hasFile ? (
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-all ${
                !selectedOrgId
                  ? "cursor-not-allowed border-slate-200 bg-slate-50"
                  : isDragActive
                  ? "border-violet-400 bg-violet-50 scale-[1.01]"
                  : "border-slate-300 hover:border-violet-400 hover:bg-violet-50"
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              {!selectedOrgId ? (
                <p className="text-sm text-slate-400">Select an organisation first</p>
              ) : isDragActive ? (
                <p className="text-sm font-medium text-violet-700">Drop it here…</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">
                    Drag & drop your Naukri <code className="text-xs bg-slate-100 px-1 rounded">.xlsx</code> file, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Only .xlsx files accepted</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileSpreadsheet className="h-8 w-8 text-violet-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{fileInfo.name}</p>
                    <p className="text-xs text-slate-500">
                      {fmtBytes(fileInfo.size)} ·{" "}
                      <span className="font-medium text-slate-700">{fileInfo.rowCount.toLocaleString()}</span> rows
                      {" "}· Email col: <code className="bg-slate-200 px-1 rounded">index {fileInfo.expectedEmailIdx}</code>
                    </p>
                    {/* Shift pattern badges */}
                    {shiftBadges.length > 1 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {shiftBadges.map(({ label, cls, count }) => (
                          <span key={label} className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
                            ⚡ {count.toLocaleString()} {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Column mapping button */}
                  {(isReady || isPaused || isIdle) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMapperModal(true)}
                      className="text-xs"
                    >
                      <Columns className="mr-1.5 h-3.5 w-3.5" />
                      Column Mapping
                    </Button>
                  )}
                  {!isRunning && (
                    <button onClick={resetMigration} className="text-xs text-slate-400 hover:text-slate-700 underline">
                      Change
                    </button>
                  )}
                </div>
              </div>

              {/* Paused banner */}
              {isPaused && stats.processedRows > 0 && (
                <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <RefreshCw className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold">Session paused — progress saved</p>
                    <p className="mt-0.5">
                      {stats.processedRows.toLocaleString()} / {stats.totalRows.toLocaleString()} rows done.
                      {sessionId && <span className="ml-1 text-amber-600">Session #{sessionId.slice(0, 8)} recorded in DB.</span>}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Step 3: Preview */}
        {previewRows.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <Step n={3} label="Row Preview (first 5)" active />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    {["Name", "Email", "Phone", "Company", "Designation", "Experience", "Location"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((row, i) => {
                    const { primary: pe, hasMultiple: me } = parseMultipleEmails(row.email);
                    const { additional: ap }               = parseMultiplePhones(row.phone);
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2 max-w-[130px] truncate font-medium text-slate-800">
                          {row.candidate_name || "—"}
                        </td>
                        <td className="px-4 py-2 text-slate-600 max-w-[180px]">
                          <div className="flex items-center gap-1">
                            {pe ? <span className="truncate">{pe}</span>
                                : <span className="text-red-500 font-medium">⚠ Missing</span>}
                            {me && <span className="flex-shrink-0 rounded bg-blue-50 border border-blue-200 px-1 text-[10px] text-blue-600">+multi</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                          {row.phone ? (
                            <span>
                              {row.phone.split(",")[0].trim()}
                              {ap.length > 0 && <span className="ml-1 text-[10px] text-slate-400">+{ap.length}</span>}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-2 max-w-[130px] truncate text-slate-500">{row.current_company || "—"}</td>
                        <td className="px-4 py-2 max-w-[130px] truncate text-slate-500">{row.current_designation || "—"}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-slate-500">{row.total_experience || "—"}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-slate-500">{row.current_location || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Step 4: Controls + Progress */}
        {hasFile && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Step n={4} label="Run Migration" active />

            <div className="flex flex-wrap gap-3 mb-6">
              {(isReady || isIdle) && (
                <Button
                  onClick={() => startMigration(selectedOrgId, false)}
                  disabled={!selectedOrgId}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Play className="mr-2 h-4 w-4" /> Start Migration
                </Button>
              )}
              {isPaused && (
                <>
                  <Button onClick={() => startMigration(selectedOrgId, true)} className="bg-violet-600 hover:bg-violet-700 text-white">
                    <Play className="mr-2 h-4 w-4" />
                    Resume from row {(stats.processedRows + 1).toLocaleString()}
                  </Button>
                  <Button variant="outline" onClick={() => { clearCheckpoint(fingerprintForFile(fileInfo, selectedOrgId)); resetMigration(); }}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Discard & Start Fresh
                  </Button>
                </>
              )}
              {isRunning && (
                <Button variant="outline" onClick={pauseMigration} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </Button>
              )}
              {isCompleted && (
                <Button variant="outline" onClick={resetMigration}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Migrate Another File
                </Button>
              )}
            </div>

            {(isRunning || isPaused || isCompleted) && stats.totalRows > 0 && (
              <div className="mb-6">
                <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                  <span>{stats.processedRows.toLocaleString()} of {stats.totalRows.toLocaleString()} rows</span>
                  <span className="font-bold text-violet-700">{pct}%</span>
                </div>
                <Progress value={pct} className="h-2.5 bg-slate-200" />
                {sessionId && (
                  <p className="text-xs text-slate-400 mt-1">
                    Session <code className="bg-slate-100 px-1 rounded">{sessionId.slice(0, 8)}</code> logged in database
                  </p>
                )}
              </div>
            )}

            {stats.totalRows > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Inserted" value={stats.insertedCount} bg="bg-emerald-50" text="text-emerald-700" />
                <StatCard icon={<SkipForward className="h-4 w-4 text-slate-400" />} label="Duplicates Skipped" value={stats.skippedCount} bg="bg-slate-50" text="text-slate-700" />
                <StatCard icon={<XCircle className="h-4 w-4 text-red-500" />} label="DB Errors" value={stats.errorCount} bg="bg-red-50" text="text-red-700" />
                <StatCard icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="No Email (skipped)" value={stats.invalidRows} bg="bg-amber-50" text="text-amber-700" />
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Column alignment:</strong> Each row independently corrected using the "Email ID" header position as anchor.
                Works for all Naukri export formats without config.
                <strong className="ml-1">Re-upload safe:</strong> Duplicate emails silently skipped.
                <strong className="ml-1">Sessions logged</strong> to <code>hr_migration_logs</code> for audit trail.
                {isPaused && <span className="ml-1 font-medium"> Checkpoint saved — safe to close this tab.</span>}
              </p>
            </div>
          </section>
        )}

        {/* Step 5: Results */}
        {(errors.length > 0 || isCompleted) && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Step n={5} label="Results & Downloads" active />

            {isCompleted && (
              <div className="mb-4 flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Migration Complete!</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    <strong>{stats.insertedCount.toLocaleString()}</strong> candidates added to <strong>{selectedOrgName}</strong>.
                    {stats.skippedCount > 0 && <> {stats.skippedCount.toLocaleString()} duplicates skipped.</>}
                    {(stats.errorCount + stats.invalidRows) > 0 && (
                      <> {(stats.errorCount + stats.invalidRows).toLocaleString()} rows had issues — download below.</>
                    )}
                  </p>
                  <button
                    onClick={() => navigate("/migration/history")}
                    className="text-xs text-emerald-600 underline mt-1"
                  >
                    View in Migration History →
                  </button>
                </div>
              </div>
            )}

            {/* Saving/finalize status banner */}
            {(isSaving || finalizeStatus === "saving" || finalizeStatus === "saved" || finalizeStatus === "failed") && (
              <div className={`mb-4 flex items-start gap-3 rounded-lg border px-4 py-3 ${
                isSaving || finalizeStatus === "saving"
                  ? "border-blue-200 bg-blue-50"
                  : finalizeStatus === "saved"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}>
                <RefreshCw className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                  isSaving || finalizeStatus === "saving"
                    ? "text-blue-500 animate-spin"
                    : finalizeStatus === "saved"
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`} />
                <div className="text-xs">
                  {(isSaving || finalizeStatus === "saving") && (
                    <>
                      <p className="font-semibold text-blue-800">Saving source file and result data…</p>
                      <p className="mt-0.5 text-blue-700">
                        Uploading original Excel to secure storage and compressing success/duplicate/error rows.
                        This may take a moment for large files.
                      </p>
                    </>
                  )}
                  {finalizeStatus === "saved" && (
                    <>
                      <p className="font-semibold text-emerald-800">All data saved ✓</p>
                      <p className="mt-0.5 text-emerald-700">
                        Source file, success rows, duplicate rows, and error rows are all stored in the database.
                        View full details in <button onClick={() => navigate("/migration/history")} className="underline font-medium">Migration History</button>.
                      </p>
                    </>
                  )}
                  {finalizeStatus === "failed" && (
                    <>
                      <p className="font-semibold text-amber-800">File storage partially failed</p>
                      <p className="mt-0.5 text-amber-700">
                        The migration data was inserted successfully. However, storing the source file or result rows in the database encountered an error.
                        The candidate data is safe. Check Migration History for details.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {errors.length > 0 && (
              <>
                <div className="flex flex-wrap gap-3 mb-3">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => downloadFullDataCsv(errors, `migration-errors-${Date.now()}.csv`)}
                    className="border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Full Error Data ({errors.length.toLocaleString()} rows)
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  CSV includes all candidate fields. Fix issues and re-import — duplicates are protected so only fixed rows insert.
                </p>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-500 w-14">Row</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500 w-40">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Email</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {errors.slice(0, 30).map((err, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-400 font-mono">{err.rowIndex}</td>
                          <td className="px-3 py-2 text-slate-700 max-w-[140px] truncate">{err.name || err.rowData?.candidate_name || "—"}</td>
                          <td className="px-3 py-2 font-mono text-slate-600 max-w-[200px] truncate">{err.email || err.rowData?.email || "—"}</td>
                          <td className="px-3 py-2 text-red-600">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {errors.length > 30 && (
                    <p className="px-3 py-2 text-xs text-slate-400 border-t border-slate-100">
                      … and {(errors.length - 30).toLocaleString()} more. Download CSV for full list.
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        )}
      </div>

      {/* Column mapping modal */}
      {fileInfo && (
        <ColumnMapperModal
          open={showMapperModal}
          onClose={() => setShowMapperModal(false)}
          mappings={fileInfo.columnMappings}
          onUpdate={updateColumnMapping}
        />
      )}

      {/* Resume dialog */}
      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Previous session found</AlertDialogTitle>
            <AlertDialogDescription>
              {ckptInfo && (
                <>
                  A migration for this file was paused after{" "}
                  <strong>{(ckptInfo.completedBatches * 50).toLocaleString()}</strong> rows
                  ({ckptInfo.insertedCount?.toLocaleString() ?? 0} inserted).
                  Resume or start fresh?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleResumeNo}>Start Fresh</AlertDialogCancel>
            <AlertDialogAction onClick={handleResumeYes}>Resume</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}