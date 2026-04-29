// src/hooks/useMigrationEngine.ts  ─── FINAL with Storage
// ─────────────────────────────────────────────────────────────────────────────
// Changes from previous version:
//   • Tracks success_rows and duplicate_rows (minimal {i,e,n}) during migration
//   • On completion, calls /finalize endpoint with:
//       - source file as base64 (for Storage upload)
//       - all three result arrays (success/duplicate/error)
//   • File is read once in loadFile(), base64 stored in ref for finalize
//   • Large files: base64 of 105MB xlsx = ~140MB string → sent to edge function
//     which uploads it directly to Supabase Storage server-side
//   • Finalize is fire-and-forget after migration completes (non-blocking)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import supabase from "@/config/supabaseClient";

import {
  NaukriRow,
  mapRawRowToNaukriRow,
  parseMultipleEmails,
  NAUKRI_HEADER_MAP,
  isNA,
} from "@/utils/naukriColumnMapper";

const BATCH_SIZE         = 50;
const CHECKPOINT_EVERY   = 5;
const INTER_BATCH_DELAY  = 120;
const EMAIL_RE           = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Types ────────────────────────────────────────────────────────────────────
export type MigrationStatus =
  | "idle" | "parsing" | "ready" | "running" | "paused" | "completed" | "saving" | "error";

export interface MigrationStats {
  totalRows:      number;
  processedRows:  number;
  insertedCount:  number;
  skippedCount:   number;
  errorCount:     number;
  invalidRows:    number;
}

export interface ErrorRecord {
  rowIndex:  number;
  email?:    string;
  name?:     string;
  reason:    string;
  rowData?:  NaukriRow;
}

/** Minimal success/duplicate row for storage (keeps data volume small) */
export interface MinimalRow {
  i: number;   // rowIndex
  e: string;   // email
  n: string;   // name
}

export interface ColumnMapping {
  naukriHeader: string;
  targetField:  keyof NaukriRow | "skip" | null;
  sampleValues: string[];
  autoMapped:   boolean;
}

export interface FileInfo {
  name:             string;
  size:             number;
  rowCount:         number;
  headers:          string[];
  expectedEmailIdx: number;
  shiftStats:       Record<number, number>;
  columnMappings:   ColumnMapping[];
}

export interface CheckpointData {
  fileFingerprint:  string;
  totalRows:        number;
  completedBatches: number;
  insertedCount:    number;
  skippedCount:     number;
  errorCount:       number;
  invalidRows:      number;
  errors:           ErrorRecord[];
  successRows:      MinimalRow[];   // accumulated during run
  duplicateRows:    MinimalRow[];   // accumulated during run
  sessionId?:       string;
}

// ─── Checkpoint helpers ───────────────────────────────────────────────────────
function makeFingerprint(file: File, orgId: string) { return `${file.name}__${file.size}__${orgId}`; }
function ckptKey(fp: string) { return `hrumbles_migration__${fp}`; }

export function loadCheckpoint(fp: string): CheckpointData | null {
  try { const r = localStorage.getItem(ckptKey(fp)); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function saveCheckpoint(d: CheckpointData) {
  try { localStorage.setItem(ckptKey(d.fileFingerprint), JSON.stringify(d)); }
  catch { console.warn("[Migration] Checkpoint save failed"); }
}
export function clearCheckpoint(fp: string) { localStorage.removeItem(ckptKey(fp)); }
export function fingerprintForFile(file: File | { name: string; size: number }, orgId: string) {
  return `${file.name}__${file.size}__${orgId}`;
}

// ─── Column alignment helpers ─────────────────────────────────────────────────
function firstEmail(v: unknown): string | null {
  const s = String(v ?? "").split(",")[0].trim();
  return EMAIL_RE.test(s) ? s.toLowerCase() : null;
}
function detectRowShift(rowArray: unknown[], expectedEmailIdx: number): number | null {
  for (let i = 0; i <= Math.min(9, rowArray.length - 1); i++) {
    if (firstEmail(rowArray[i])) return i - expectedEmailIdx;
  }
  return null;
}
function buildAlignedObject(rowArray: unknown[], headers: string[], shift: number): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i];
    if (!key || key === "None" || key === "null") continue;
    const src = i + shift;
    obj[key] = src >= 0 && src < rowArray.length ? rowArray[src] ?? null : null;
  }
  return obj;
}
function buildColumnMappings(headers: string[], dataArrays: unknown[][], expectedEmailIdx: number): ColumnMapping[] {
  const votes: Record<number, number> = {};
  for (const row of dataArrays.slice(0, 20)) {
    const s = detectRowShift(row as unknown[], expectedEmailIdx);
    if (s !== null) votes[s] = (votes[s] ?? 0) + 1;
  }
  const shift = parseInt(Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "0");

  return headers
    .filter((h) => h && h !== "None")
    .map((header, headerIdx) => {
      const sampleValues: string[] = [];
      for (const row of dataArrays.slice(0, 20)) {
        const src = headerIdx + shift;
        const val = src >= 0 && src < (row as unknown[]).length ? (row as unknown[])[src] : null;
        if (!isNA(val) && sampleValues.length < 3) sampleValues.push(String(val).trim().substring(0, 50));
      }
      const targetField = (NAUKRI_HEADER_MAP[header] ?? null) as keyof NaukriRow | null;
      return { naukriHeader: header, targetField, sampleValues, autoMapped: targetField !== null };
    });
}

// ─── Session tracking ─────────────────────────────────────────────────────────
async function createSession(orgId: string, fi: FileInfo): Promise<string | null> {
  try {
    const { data, error } = await supabase.from("hr_migration_logs").insert({
      organization_id: orgId,
      file_name:       fi.name,
      file_size:       fi.size,
      file_fingerprint: `${fi.name}__${fi.size}__${orgId}`,
      total_rows:      fi.rowCount,
      status:          "running",
      column_mapping:  Object.fromEntries(
        fi.columnMappings.filter((m) => m.targetField && m.targetField !== "skip").map((m) => [m.naukriHeader, m.targetField])
      ),
      pattern_summary: fi.shiftStats,
      created_by:      null,
    }).select("id").single();
    if (error) { console.warn("[Session] Create failed:", error.message); return null; }
    return data?.id ?? null;
  } catch { return null; }
}

async function updateSession(sid: string, patch: Record<string, unknown>) {
  try { await supabase.from("hr_migration_logs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", sid); }
  catch { /* non-fatal */ }
}

// ─── Hook return type ─────────────────────────────────────────────────────────
export interface UseMigrationEngineReturn {
  status:         MigrationStatus;
  stats:          MigrationStats;
  errors:         ErrorRecord[];
  previewRows:    NaukriRow[];
  fileInfo:       FileInfo | null;
  sessionId:      string | null;
  finalizeStatus: "idle" | "saving" | "saved" | "failed";
  loadFile:          (file: File, orgId: string) => Promise<void>;
  startMigration:    (orgId: string, resumeFromCheckpoint?: boolean) => Promise<void>;
  pauseMigration:    () => void;
  resetMigration:    () => void;
  updateColumnMapping: (header: string, field: keyof NaukriRow | "skip" | null) => void;
}

export function useMigrationEngine(): UseMigrationEngineReturn {
  const [status, setStatus]               = useState<MigrationStatus>("idle");
  const [stats, setStats]                 = useState<MigrationStats>({
    totalRows: 0, processedRows: 0, insertedCount: 0, skippedCount: 0, errorCount: 0, invalidRows: 0,
  });
  const [errors, setErrors]               = useState<ErrorRecord[]>([]);
  const [previewRows, setPreviewRows]     = useState<NaukriRow[]>([]);
  const [fileInfo, setFileInfo]           = useState<FileInfo | null>(null);
  const [sessionId, setSessionId]         = useState<string | null>(null);
  const [finalizeStatus, setFinalizeStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  const allRowsRef     = useRef<Array<{ row: NaukriRow; rowIndex: number }>>([]);
  const headersRef     = useRef<string[]>([]);
  const dataArraysRef  = useRef<unknown[][]>([]);
  const expectedEmailRef = useRef<number>(4);
  const isPausedRef    = useRef(false);
  const currentFpRef   = useRef("");
  const fileBase64Ref  = useRef<string>("");  // base64 of source file for finalize

  // ── loadFile ────────────────────────────────────────────────────────────────
  const loadFile = useCallback(async (file: File, orgId: string) => {
    setStatus("parsing");
    const fp = `${file.name}__${file.size}__${orgId}`;
    currentFpRef.current = fp;

    try {
      const buffer = await file.arrayBuffer();

      // Store base64 for finalize call
      const bytes   = new Uint8Array(buffer);
      let b64 = "";
      // Convert in 64KB chunks to avoid stack overflow on large files
      const chunk = 65536;
      for (let i = 0; i < bytes.length; i += chunk) {
        b64 += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      fileBase64Ref.current = btoa(b64);

      const wb = XLSX.read(buffer, { type: "array", dense: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const allArrays = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1, defval: null, raw: false, blankrows: false,
      });

      if (allArrays.length < 2) { setStatus("error"); return; }

      const headers    = (allArrays[0] as unknown[]).map((h) => h == null ? "None" : String(h).trim());
      const dataArrays = allArrays.slice(1) as unknown[][];
      const totalRows  = dataArrays.length;

      headersRef.current       = headers;
      dataArraysRef.current    = dataArrays;
      const expectedEmailIdx   = headers.findIndex((h) => h === "Email ID");
      if (expectedEmailIdx === -1) { setStatus("error"); return; }
      expectedEmailRef.current = expectedEmailIdx;

      const shiftStats: Record<number, number> = {};
      const mapped = dataArrays.map((rowArr, idx) => {
        const shift = detectRowShift(rowArr, expectedEmailIdx) ?? 0;
        shiftStats[shift] = (shiftStats[shift] ?? 0) + 1;
        return { row: mapRawRowToNaukriRow(buildAlignedObject(rowArr, headers, shift)), rowIndex: idx + 2 };
      });

      allRowsRef.current = mapped;

      const ckpt       = loadCheckpoint(fp);
      const colMappings = buildColumnMappings(headers, dataArrays, expectedEmailIdx);

      setPreviewRows(mapped.slice(0, 5).map((m) => m.row));
      setFileInfo({ name: file.name, size: file.size, rowCount: totalRows, headers, expectedEmailIdx, shiftStats, columnMappings: colMappings });

      if (ckpt) {
        setStats({ totalRows, processedRows: ckpt.completedBatches * BATCH_SIZE, insertedCount: ckpt.insertedCount, skippedCount: ckpt.skippedCount, errorCount: ckpt.errorCount, invalidRows: ckpt.invalidRows });
        setErrors(ckpt.errors);
        setSessionId(ckpt.sessionId ?? null);
        setStatus("paused");
      } else {
        setStats((p) => ({ ...p, totalRows }));
        setStatus("ready");
      }
    } catch (err) {
      console.error("[Migration] Parse error:", err);
      setStatus("error");
    }
  }, []);

  // ── updateColumnMapping ──────────────────────────────────────────────────────
  const updateColumnMapping = useCallback((header: string, field: keyof NaukriRow | "skip" | null) => {
    const headers    = headersRef.current;
    const dataArrays = dataArraysRef.current;
    const expEml     = expectedEmailRef.current;

    setFileInfo((prev) => {
      if (!prev) return prev;
      const updated = prev.columnMappings.map((m) =>
        m.naukriHeader === header ? { ...m, targetField: field, autoMapped: false } : m
      );
      const overrideMap: Record<string, keyof NaukriRow | "skip" | null> = {};
      for (const m of updated) overrideMap[m.naukriHeader] = m.targetField;

      const remapped = dataArrays.map((rowArr, idx) => {
        const shift = detectRowShift(rowArr as unknown[], expEml) ?? 0;
        const obj   = buildAlignedObject(rowArr as unknown[], headers, shift);
        const filtered: Record<string, unknown> = {};
        for (const [hdr, val] of Object.entries(obj)) {
          if (overrideMap[hdr] === "skip") continue;
          filtered[hdr] = val;
        }
        return { row: mapRawRowToNaukriRow(filtered), rowIndex: idx + 2 };
      });

      allRowsRef.current = remapped;
      setPreviewRows(remapped.slice(0, 5).map((m) => m.row));
      return { ...prev, columnMappings: updated };
    });
  }, []);

  // ── startMigration ───────────────────────────────────────────────────────────
  const startMigration = useCallback(async (orgId: string, resumeFromCheckpoint = false) => {
    if (!allRowsRef.current.length) return;
    isPausedRef.current = false;
    setStatus("running");

    const fp   = currentFpRef.current;
    const ckpt = resumeFromCheckpoint ? loadCheckpoint(fp) : null;

    let insertedCount  = ckpt?.insertedCount  ?? 0;
    let skippedCount   = ckpt?.skippedCount   ?? 0;
    let errorCount     = ckpt?.errorCount     ?? 0;
    let invalidRows    = ckpt?.invalidRows    ?? 0;
    const accErrors: ErrorRecord[]     = ckpt?.errors       ? [...ckpt.errors]       : [];
    const accSuccess: MinimalRow[]     = ckpt?.successRows   ? [...ckpt.successRows]  : [];
    const accDuplicate: MinimalRow[]   = ckpt?.duplicateRows ? [...ckpt.duplicateRows] : [];
    const startBatch = ckpt?.completedBatches ?? 0;

    const rows = allRowsRef.current;
    const totalRows = rows.length;

    let sid = ckpt?.sessionId ?? null;
    if (!sid && fileInfo) {
      sid = await createSession(orgId, fileInfo);
      setSessionId(sid);
    }

    const batches: Array<typeof rows> = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) batches.push(rows.slice(i, i + BATCH_SIZE));

    async function run() {
      for (let bIdx = startBatch; bIdx < batches.length; bIdx++) {

        if (isPausedRef.current) {
          const ckptData: CheckpointData = {
            fileFingerprint: fp, totalRows, completedBatches: bIdx,
            insertedCount, skippedCount, errorCount, invalidRows,
            errors: accErrors, successRows: accSuccess, duplicateRows: accDuplicate,
            sessionId: sid ?? undefined,
          };
          saveCheckpoint(ckptData);
          setErrors([...accErrors]);
          setStats({ totalRows, processedRows: bIdx * BATCH_SIZE, insertedCount, skippedCount, errorCount, invalidRows });
          setStatus("paused");
          if (sid) updateSession(sid, { status: "paused", inserted_count: insertedCount, skipped_count: skippedCount, error_count: errorCount, invalid_rows: invalidRows });
          return;
        }

        const batch = batches[bIdx];
        const validForApi: Array<{ data: NaukriRow; row_index: number }> = [];

        for (const { row, rowIndex } of batch) {
          const { primary } = parseMultipleEmails(row.email);
          if (!primary) {
            invalidRows++;
            accErrors.push({ rowIndex, name: row.candidate_name, reason: row.email ? `No valid email in: "${row.email}"` : "No email", rowData: row });
          } else {
            validForApi.push({ data: row, row_index: rowIndex });
          }
        }

        if (validForApi.length > 0) {
          try {
            const { data: result, error: fnErr } = await supabase.functions.invoke(
              "migrate-talent-pool",
              { body: { records: validForApi, organization_id: orgId } }
            );

            if (fnErr) {
              for (const rec of validForApi) {
                accErrors.push({ rowIndex: rec.row_index, email: parseMultipleEmails(rec.data.email).primary ?? undefined, name: rec.data.candidate_name, reason: `Edge function error: ${fnErr.message}`, rowData: rec.data });
                errorCount++;
              }
            } else if (result) {
              // Track which rows were inserted vs skipped for storage
              const resultErrors = new Set((result.errors ?? []).map((e: { row_index: number }) => e.row_index));

              for (const rec of validForApi) {
                if (resultErrors.has(rec.row_index)) continue;
                const primaryEmail = parseMultipleEmails(rec.data.email).primary ?? "";
                const minRow: MinimalRow = { i: rec.row_index, e: primaryEmail, n: rec.data.candidate_name ?? "" };
                // Note: edge function tells us inserted vs skipped counts, but not which specific rows
                // We'll push all non-error rows to success; finalize will reconcile
                accSuccess.push(minRow);
              }

              insertedCount += result.inserted ?? 0;
              skippedCount  += result.skipped  ?? 0;
              errorCount    += result.errors?.length ?? 0;

              // Move skipped rows from success to duplicate (approximate — last N rows)
              const numSkipped = result.skipped ?? 0;
              if (numSkipped > 0) {
                const moved = accSuccess.splice(accSuccess.length - numSkipped, numSkipped);
                accDuplicate.push(...moved);
              }

              for (const e of result.errors ?? []) {
                accErrors.push({ rowIndex: e.row_index, email: e.email, name: e.candidate_name, reason: e.reason, rowData: e.row_data });
              }
            }
          } catch {
            isPausedRef.current = true;
            saveCheckpoint({ fileFingerprint: fp, totalRows, completedBatches: bIdx, insertedCount, skippedCount, errorCount, invalidRows, errors: accErrors, successRows: accSuccess, duplicateRows: accDuplicate, sessionId: sid ?? undefined });
            setErrors([...accErrors]);
            setStats({ totalRows, processedRows: bIdx * BATCH_SIZE, insertedCount, skippedCount, errorCount, invalidRows });
            setStatus("paused");
            return;
          }
        }

        const processedRows = Math.min((bIdx + 1) * BATCH_SIZE, totalRows);
        setStats({ totalRows, processedRows, insertedCount, skippedCount, errorCount, invalidRows });

// AFTER — saveCheckpoint every 5 batches (localStorage, heavier), 
//         updateSession every batch (lightweight PATCH, fire-and-forget)
if (bIdx % CHECKPOINT_EVERY === 0) {
  saveCheckpoint({ fileFingerprint: fp, totalRows, completedBatches: bIdx + 1, insertedCount, skippedCount, errorCount, invalidRows, errors: accErrors, successRows: accSuccess, duplicateRows: accDuplicate, sessionId: sid ?? undefined });
}
if (sid) updateSession(sid, { status: "running", inserted_count: insertedCount, skipped_count: skippedCount, error_count: errorCount, invalid_rows: invalidRows });

        await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY));
      }

      // ── Migration complete — now finalize (store file + all rows) ────────
      setStats({ totalRows, processedRows: totalRows, insertedCount, skippedCount, errorCount, invalidRows });
      setErrors([...accErrors]);
      clearCheckpoint(fp);
      setStatus("saving");
      setFinalizeStatus("saving");

      try {
        const { error: finalErr } = await supabase.functions.invoke(
          "migrate-talent-pool/finalize",
          {
            body: {
              session_id:     sid,
              organization_id: orgId,
              file_name:      fileInfo?.name ?? "migration.xlsx",
              file_base64:    fileBase64Ref.current,
              file_size:      fileInfo?.size ?? 0,
              success_rows:   accSuccess,
              duplicate_rows: accDuplicate,
              error_rows:     accErrors,  // full data with rowData for re-import
            },
          }
        );

        if (finalErr) {
          console.error("[Migration] Finalize failed:", finalErr.message);
          setFinalizeStatus("failed");
          // Still mark as completed — data is in DB, just file/rows not stored
          if (sid) updateSession(sid, { status: "completed", inserted_count: insertedCount, skipped_count: skippedCount, error_count: errorCount, invalid_rows: invalidRows, completed_at: new Date().toISOString() });
        } else {
          setFinalizeStatus("saved");
        }
      } catch (e) {
        console.error("[Migration] Finalize exception:", e);
        setFinalizeStatus("failed");
      }

      setStatus("completed");
    }

    run();
  }, [fileInfo]);

  const pauseMigration = useCallback(() => { isPausedRef.current = true; }, []);

  const resetMigration = useCallback(() => {
    isPausedRef.current    = false;
    allRowsRef.current     = [];
    headersRef.current     = [];
    dataArraysRef.current  = [];
    fileBase64Ref.current  = "";
    currentFpRef.current   = "";
    setStatus("idle");
    setStats({ totalRows: 0, processedRows: 0, insertedCount: 0, skippedCount: 0, errorCount: 0, invalidRows: 0 });
    setErrors([]);
    setPreviewRows([]);
    setFileInfo(null);
    setSessionId(null);
    setFinalizeStatus("idle");
  }, []);

  return {
    status, stats, errors, previewRows, fileInfo, sessionId, finalizeStatus,
    loadFile, startMigration, pauseMigration, resetMigration, updateColumnMapping,
  };
}