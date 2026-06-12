// src/components/candidates/talent-pool/YohrCsvUploadModal.tsx
// Portal-based modal (renders above MainLayout via document.body).
// • Pre-validates CSV headers before upload — blocks on format errors
// • Fixed compact size (480 px wide) — never grows with session list
// • Internal scroll for sessions, responsive to viewport height
// • Navigate button → /talent-pool/import-csv full sessions page
// • Manual ▶ trigger button for stuck pending sessions

import React, { useState, useRef, useCallback, useEffect, FC } from 'react';
import ReactDOM from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import moment from 'moment';
import {
  X, CloudUpload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Loader2, Clock, PlayCircle, ExternalLink, RefreshCw,
} from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const V   = '#7C3AED';
const VL  = '#EDE9FE';
const G   = '#059669';
const GL  = '#D1FAE5';
const R   = '#DC2626';
const RL  = '#FEE2E2';
const AM  = '#D97706';
const AML = '#FEF3C7';
const GR  = '#9CA3AF';
const GRL = '#F3F4F6';

// ── CSV pre-check: expected PyjamHR column positions ─────────────────────────
// Format: name | designation | company | notice(days) | location |
//         phone | email | resume(URL) | linkedin | degrees | feedback_details | [extras...]
const EXPECTED: { idx: number; keys: string[]; label: string; required: boolean }[] = [
  { idx: 0, keys: ['name', 'candidate'],                  label: 'Name (col 1)',         required: true  },
  { idx: 5, keys: ['phone', 'mobile', 'contact', 'tel'],  label: 'Phone (col 6)',        required: true  },
  { idx: 6, keys: ['email', 'mail'],                      label: 'Email (col 7)',        required: true  },
  { idx: 7, keys: ['resume', 'cv', 'url', 'link'],        label: 'Resume URL (col 8)',   required: false },
  { idx: 8, keys: ['linkedin'],                           label: 'LinkedIn (col 9)',     required: false },
];

interface CsvCheck {
  valid: boolean; errors: string[]; warnings: string[]; totalRows: number;
}

function checkCsv(text: string): CsvCheck {
  const lines = text.split('\n').filter(l => l.trim());
  if (!lines.length) return { valid: false, errors: ['File is empty.'], warnings: [], totalRows: 0 };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const totalRows = lines.length - 1;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (headers.length < 11)
    errors.push(`Only ${headers.length} columns — PyjamHR export needs at least 11.`);

  for (const col of EXPECTED) {
    const actual = headers[col.idx] || '(empty)';
    if (!col.keys.some(k => actual.includes(k))) {
      const msg = `Col ${col.idx + 1} is "${headers[col.idx] || 'empty'}" — expected ${col.label}`;
      col.required ? errors.push(msg) : warnings.push(msg);
    }
  }
  if (totalRows === 0) errors.push('No data rows (header only).');

  return { valid: errors.length === 0, errors, warnings, totalRows };
}

// ── Stages ────────────────────────────────────────────────────────────────────
const STAGES = [
  { id: 's1', label: 'Parse',    dk: 's1_done', fk: 's1_failed', w: 10 },
  { id: 's2', label: 'Download', dk: 's2_done', fk: 's2_failed', w: 25 },
  { id: 's3', label: 'AI',       dk: 's3_done', fk: 's3_failed', w: 40 },
  { id: 's4', label: 'Ingest',   dk: 's4_done', fk: 's4_failed', w: 25 },
] as const;

interface Session {
  id: string; org_id: string; filename: string; total_rows: number;
  s1_done: number; s1_failed: number; s2_done: number; s2_failed: number;
  s3_done: number; s3_failed: number; s4_done: number; s4_failed: number;
  status: string; error_summary: string | null; created_at: string; updated_at: string;
}

const getProgress = (s: Session) => {
  const t = Math.max(s.total_rows, 1);
  return Math.min(100, Math.round(
    (s.s1_done / t) * 10 + (s.s2_done / t) * 25 +
    (s.s3_done / t) * 40 + (s.s4_done / t) * 25
  ));
};

const getBadge = (s: Session) => {
  if (s.status === 'done')       return { text: 'Complete',   color: G,  bg: GL  };
  if (s.status === 'failed')     return { text: 'Failed',     color: R,  bg: RL  };
  if (s.s3_done > 0 || s.s3_failed > 0) return { text: 'AI Extract', color: V, bg: VL };
  if (s.s2_done > 0 || s.s2_failed > 0) return { text: 'Download',   color: AM, bg: AML };
  if (s.s1_done > 0)             return { text: 'Parsed',     color: AM, bg: AML };
  if (s.status === 'processing') return { text: 'Processing', color: V,  bg: VL  };
  return                                 { text: 'Pending',   color: GR, bg: GRL };
};

const isActive = (s: Session) =>
  ['processing', 'pending'].includes(s.status) && s.s4_done < s.total_rows;

// ── Stage pill ─────────────────────────────────────────────────────────────────
const Pill: FC<{ stage: typeof STAGES[number]; s: Session }> = ({ stage, s }) => {
  const done   = (s as any)[stage.dk];
  const failed = (s as any)[stage.fk];
  const t      = s.total_rows;
  let bg = GRL, color = GR;
  if (failed > 0 && done === 0) { bg = RL; color = R; }
  else if (done === t && t > 0) { bg = GL; color = G; }
  else if (done > 0 || failed > 0) { bg = VL; color = V; }
  return (
    <div style={{ flex: 1, padding: '4px 2px', borderRadius: 5, background: bg, textAlign: 'center' }}>
      <div style={{ fontSize: 8, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.05em' }}>{stage.label}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color, marginTop: 1 }}>{done}/{t}</div>
    </div>
  );
};

// ── Session card ───────────────────────────────────────────────────────────────
const Card: FC<{ s: Session; isNew?: boolean; onTrigger: (id: string) => void; triggering: boolean }> = ({ s, isNew, onTrigger, triggering }) => {
  const pct   = getProgress(s);
  const badge = getBadge(s);
  const stuck = s.status === 'pending' && s.s1_done === 0;
  const live  = isActive(s);
  return (
    <div style={{ background: '#fff', border: `1px solid ${isNew ? '#C4B5FD' : '#E5E7EB'}`, borderRadius: 9, padding: '9px 11px', boxShadow: isNew ? '0 0 0 2px #EDE9FE' : '0 1px 2px rgba(0,0,0,0.04)' }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: VL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileSpreadsheet size={12} color={V} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.filename}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
            <Clock size={8} color={GR} />
            <span style={{ fontSize: 9, color: GR }}>{moment(s.created_at).fromNow()} · {s.total_rows} rows</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <div style={{ padding: '2px 7px', borderRadius: 20, background: badge.bg, display: 'flex', alignItems: 'center', gap: 3 }}>
            {live && <Loader2 size={8} style={{ color: badge.color, animation: 'spin 1s linear infinite' }} />}
            <span style={{ fontSize: 9, fontWeight: 700, color: badge.color }}>{badge.text}</span>
          </div>
          {stuck && (
            <button onClick={() => onTrigger(s.id)} disabled={triggering} title="Start pipeline"
              style={{ width: 22, height: 22, borderRadius: 5, background: triggering ? GRL : VL, border: `1px solid ${triggering ? '#E5E7EB' : '#C4B5FD'}`, cursor: triggering ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {triggering ? <Loader2 size={10} style={{ color: GR, animation: 'spin 1s linear infinite' }} /> : <PlayCircle size={10} color={V} />}
            </button>
          )}
        </div>
      </div>
      {/* Pill row */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 7 }}>
        {STAGES.map(st => <Pill key={st.id} stage={st} s={s} />)}
      </div>
      {/* Progress */}
      <div style={{ height: 4, background: GRL, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? `linear-gradient(90deg,${G},#34D399)` : `linear-gradient(90deg,#6D28D9,${V})`, borderRadius: 2, transition: 'width .5s ease' }} />
      </div>
      {pct > 0 && <div style={{ textAlign: 'right', fontSize: 8, color: pct === 100 ? G : V, marginTop: 1, fontWeight: 700 }}>{pct}%</div>}
      {s.error_summary && (
        <div style={{ marginTop: 5, padding: '3px 7px', borderRadius: 4, background: RL, fontSize: 9, color: R, display: 'flex', alignItems: 'center', gap: 3 }}>
          <AlertTriangle size={8} />{s.error_summary}
        </div>
      )}
    </div>
  );
};

// ── Validation banner ──────────────────────────────────────────────────────────
const CheckBanner: FC<{ check: CsvCheck }> = ({ check }) => {
  if (check.valid && !check.warnings.length)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: GL, borderRadius: 7, marginBottom: 10 }}>
        <CheckCircle2 size={12} color={G} />
        <span style={{ fontSize: 11, color: '#065F46', fontWeight: 500 }}>Format OK — {check.totalRows} candidate{check.totalRows !== 1 ? 's' : ''} ready</span>
      </div>
    );
  if (!check.valid)
    return (
      <div style={{ padding: '8px 10px', background: RL, borderRadius: 7, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          <AlertTriangle size={11} color={R} />
          <span style={{ fontSize: 11, fontWeight: 700, color: R }}>Format mismatch — upload blocked</span>
        </div>
        {check.errors.map((e, i) => <div key={i} style={{ fontSize: 10, color: '#7F1D1D', marginLeft: 16, marginTop: 2 }}>• {e}</div>)}
        <div style={{ fontSize: 10, color: '#B45309', marginTop: 5, marginLeft: 16 }}>Use a PyjamHR CSV export (Candidates section).</div>
      </div>
    );
  return (
    <div style={{ padding: '7px 10px', background: AML, borderRadius: 7, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        <AlertTriangle size={11} color={AM} />
        <span style={{ fontSize: 11, fontWeight: 600, color: AM }}>{check.totalRows} rows — {check.warnings.length} column warning{check.warnings.length !== 1 ? 's' : ''}</span>
      </div>
      {check.warnings.map((w, i) => <div key={i} style={{ fontSize: 10, color: '#92400E', marginLeft: 16, marginTop: 2 }}>• {w}</div>)}
      <div style={{ fontSize: 10, color: '#78350F', marginTop: 4, marginLeft: 16 }}>You can still upload — some fields may not map correctly.</div>
    </div>
  );
};

// ── Main modal ────────────────────────────────────────────────────────────────
interface Props { onClose: () => void; }

const YohrCsvUploadModal: FC<Props> = ({ onClose }) => {
  const navigate       = useNavigate();
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const [file,        setFile]        = useState<File | null>(null);
  const [csvCheck,    setCsvCheck]    = useState<CsvCheck | null>(null);
  const [checking,    setChecking]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadErr,   setUploadErr]   = useState<string | null>(null);
  const [newSessId,   setNewSessId]   = useState<string | null>(null);
  const [trigId,      setTrigId]      = useState<string | null>(null);
  const [dragging,    setDragging]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

const { data: sessions = [], refetch } = useQuery<Session[]>({
  queryKey: ['yohr-sessions', organizationId],
  queryFn: async () => {
    const { data, error } = await (supabase as any)
      .from('org_csv_import_sessions')
      .select('*')
      .eq('org_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  },

  refetchInterval: (query) => {
    const sessions = (query.state.data as Session[]) || [];
    return sessions.some(isActive) ? 4000 : false;
  },
});

  useEffect(() => {
    const ch = (supabase as any).channel(`yohr_modal_${organizationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'org_csv_import_sessions', filter: `org_id=eq.${organizationId}` }, () => refetch())
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [organizationId, refetch]);

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.endsWith('.csv')) { setUploadErr('Only .csv files are accepted.'); return; }
    if (f.size > 10 * 1024 * 1024) { setUploadErr('File exceeds 10 MB limit.'); return; }
    setFile(f); setUploadErr(null); setCsvCheck(null); setChecking(true);
    try {
      setCsvCheck(checkCsv(await f.text()));
    } catch { setCsvCheck({ valid: false, errors: ['Could not read file.'], warnings: [], totalRows: 0 }); }
    finally { setChecking(false); }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  const clearFile = () => { setFile(null); setCsvCheck(null); setUploadErr(null); if (fileRef.current) fileRef.current.value = ''; };

  const handleUpload = async () => {
    if (!file || (csvCheck && !csvCheck.valid)) return;
    setUploading(true); setUploadErr(null);
    try {
      const { data: { session: auth } } = await (supabase as any).auth.getSession();
      if (!auth?.access_token) throw new Error('Not authenticated');
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch(
        `${(supabase as any).supabaseUrl}/functions/v1/yohr-csv-intake`,
        { method: 'POST', headers: { Authorization: `Bearer ${auth.access_token}` }, body: fd }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`);
      setNewSessId(json.session_id);
      clearFile();
      refetch();
    } catch (err: any) { setUploadErr(err.message); }
    finally { setUploading(false); }
  };

  const handleTrigger = async (id: string) => {
    setTrigId(id);
    try {
      const { error } = await (supabase as any).functions.invoke('yohr-trigger', { body: { session_id: id } });
      if (error) throw error;
      setTimeout(() => refetch(), 2000);
    } catch (e: any) { console.error('Trigger failed:', e); }
    finally { setTrigId(null); }
  };

  const blocked = !!csvCheck && !csvCheck.valid;
  const canClose = !uploading;

  const modal = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onMouseDown={(e) => { if (canClose && e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }} />

      {/* Modal container — fixed width, capped height, never grows */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 464,
        maxHeight: 'min(92vh, 640px)',
        background: '#FAFAFA',
        borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Header — fixed, doesn't scroll */}
        <div style={{ padding: '12px 14px 11px', borderBottom: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: VL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={13} color={V} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Import Candidates</div>
              <div style={{ fontSize: 10, color: GR }}>PyjamHR CSV export</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <button onClick={() => { onClose(); navigate('/talent-pool/import-csv'); }}
              style={{ height: 26, padding: '0 9px', borderRadius: 6, background: VL, border: '1px solid #C4B5FD', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ExternalLink size={10} color={V} />
              <span style={{ fontSize: 10, fontWeight: 600, color: V }}>All Sessions</span>
            </button>
            <button onClick={() => { if (canClose) onClose(); }} disabled={!canClose}
              style={{ width: 26, height: 26, borderRadius: 6, background: GRL, border: 'none', cursor: canClose ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} color={canClose ? '#374151' : GR} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '11px 13px' }}>

          {/* Drop zone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !file && fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? V : file ? (blocked ? R : V) : '#D1D5DB'}`,
              borderRadius: 9, padding: '11px 10px',
              background: dragging ? VL : file ? (blocked ? '#FFF5F5' : '#FAF8FF') : '#fff',
              cursor: file ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 9,
              marginBottom: 9, transition: 'all .15s ease',
            }}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div style={{ width: 32, height: 32, borderRadius: 7, background: file ? VL : GRL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {checking ? <Loader2 size={14} color={V} style={{ animation: 'spin 1s linear infinite' }} />
               : file    ? <FileSpreadsheet size={14} color={V} />
                         : <CloudUpload size={14} color={GR} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {file
                ? (<><div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                    <div style={{ fontSize: 10, color: GR }}>{(file.size / 1024).toFixed(1)} KB{csvCheck && ` · ${csvCheck.totalRows} rows`}</div></>)
                : (<><div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Drop CSV here or click to browse</div>
                    <div style={{ fontSize: 10, color: GR }}>PyjamHR export · max 10 MB</div></>)
              }
            </div>
            {file && (
              <button onClick={(e) => { e.stopPropagation(); clearFile(); }}
                style={{ width: 20, height: 20, borderRadius: 4, background: GRL, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={9} color="#6B7280" />
              </button>
            )}
          </div>

          {/* Validation */}
          {csvCheck && <CheckBanner check={csvCheck} />}

          {/* Upload error */}
          {uploadErr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 9px', background: RL, borderRadius: 7, marginBottom: 9 }}>
              <AlertTriangle size={11} color={R} />
              <span style={{ fontSize: 11, color: R }}>{uploadErr}</span>
            </div>
          )}

          {/* Upload button */}
          {file && csvCheck && (
            <button onClick={handleUpload} disabled={uploading || blocked}
              style={{
                width: '100%', height: 34, borderRadius: 8, border: 'none',
                background: blocked ? '#E5E7EB' : uploading ? '#8B5CF6' : V,
                color: blocked ? GR : '#fff',
                fontSize: 12, fontWeight: 700,
                cursor: blocked || uploading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                marginBottom: 13, transition: 'background .15s',
              }}>
              {uploading ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</>
               : blocked  ? '⚠ Fix format to upload'
               : csvCheck.warnings.length ? `Upload anyway (${csvCheck.totalRows} rows)`
               : `Import ${csvCheck.totalRows} candidate${csvCheck.totalRows !== 1 ? 's' : ''}`}
            </button>
          )}

          {/* Sessions list */}
          {sessions.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.06em' }}>Recent Imports</span>
                <button onClick={() => refetch()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <RefreshCw size={10} color={GR} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {sessions.map(s => (
                  <Card key={s.id} s={s} isNew={s.id === newSessId}
                    onTrigger={handleTrigger} triggering={trigId === s.id} />
                ))}
              </div>
            </div>
          )}

          {sessions.length === 0 && !file && (
            <div style={{ textAlign: 'center', padding: '18px 0', color: GR, fontSize: 12 }}>
              No imports yet — upload a CSV above to start.
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

export default YohrCsvUploadModal;