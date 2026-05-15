// src/pages/talent-pool/ResumeProcessingPage.tsx
//
// Dashboard for monitoring the bulk resume pipeline.
// Route: /talent-pool/resume-processing
// Shows: pipeline stats, per-stage failed files, retry buttons, ingest log.

import { FC, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  FileText, RefreshCw, RotateCcw, ChevronRight,
  CheckCircle, AlertCircle, Loader2, Activity,
  UploadCloud, Cpu, Users, Clock,
} from 'lucide-react';

interface Stats {
  total: number; pending_parse: number; parsed: number;
  image_only: number; parse_failed: number;
  ai_queued: number; ai_done: number; ai_failed: number;
  inserted: number; updated: number; skipped: number;
  ingest_failed: number; fully_done: number;
}

interface FailedFile {
  id: string; file_name: string;
  parse_status?: string; parse_error?: string; parse_attempts?: number;
  ai_status?: string; ingest_status?: string; ingest_error?: string;
  uploaded_at: string;
}

interface LogRow {
  id: string; candidate_email: string; action: string;
  reason: string; field_changes: any; error_detail: string;
  created_at: string;
}

type Stage = 'parse' | 'ai' | 'ingest';

const ACCENT = '#6d4aff';
const G      = '#059669';
const R      = '#DC2626';
const A      = '#D97706';

const ResumeProcessingPage: FC = () => {
  const organizationId = useSelector((s: any) => s.auth.organization_id);

  const [stats,       setStats]       = useState<Stats | null>(null);
  const [activeStage, setActiveStage] = useState<Stage>('parse');
  const [failed,      setFailed]      = useState<FailedFile[]>([]);
  const [logs,        setLogs]        = useState<LogRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [retrying,    setRetrying]    = useState(false);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());

  // ── Fetch stats ─────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!organizationId) return;
    const { data } = await supabase.rpc('get_bulk_pipeline_stats', { p_org_id: organizationId });
    if (data) setStats(data as Stats);
  }, [organizationId]);

  // ── Fetch failed files for active stage ─────────────────────────────────
  const fetchFailed = useCallback(async (stage: Stage) => {
    if (!organizationId) return;
    setLoading(true);
    setSelected(new Set());
    try {
      const cols = stage === 'parse'
        ? 'id,file_name,parse_status,parse_error,parse_attempts,uploaded_at'
        : stage === 'ai'
        ? 'id,file_name,ai_status,uploaded_at'
        : 'id,file_name,ingest_status,ingest_error,uploaded_at';

      const statusCol = stage === 'parse' ? 'parse_status' : stage === 'ai' ? 'ai_status' : 'ingest_status';

      const { data } = await supabase.from('hr_resume_files')
        .select(cols)
        .eq('organization_id', organizationId)
        .eq(statusCol, 'failed')
        .order('uploaded_at', { ascending: false })
        .limit(200);

      setFailed((data || []) as FailedFile[]);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // ── Fetch recent ingest log ──────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    if (!organizationId) return;
    const { data } = await supabase.from('hr_resume_ingest_log')
      .select('id,candidate_email,action,reason,field_changes,error_detail,created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100);
    setLogs((data || []) as LogRow[]);
  }, [organizationId]);

  useEffect(() => {
    fetchStats();
    fetchFailed(activeStage);
    fetchLogs();
  }, [organizationId]);

  useEffect(() => {
    fetchFailed(activeStage);
  }, [activeStage]);

  // ── Retry ────────────────────────────────────────────────────────────────
  const retry = async (fileIds?: string[]) => {
    setRetrying(true);
    try {
      const body: any = { org_id: organizationId, stage: activeStage };
      if (fileIds?.length) body.file_ids = fileIds;

      const res = await fetch(
        `${import.meta.env.VITE_BULK_WORKER_URL || 'http://localhost:5010'}/api/bulk/retry`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );

      if (!res.ok) throw new Error(await res.text());
      toast.success(`Queued ${fileIds?.length ?? 'all'} files for retry`);
      await fetchStats();
      await fetchFailed(activeStage);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(`Retry failed: ${e.message}`);
    } finally {
      setRetrying(false);
    }
  };

  const refresh = async () => {
    await Promise.all([fetchStats(), fetchFailed(activeStage), fetchLogs()]);
    toast.success('Refreshed');
  };

  // ── KPI cards ────────────────────────────────────────────────────────────
  const kpis = stats ? [
    { label: 'Total Files',    value: stats.total,        icon: FileText,   color: ACCENT },
    { label: 'Parsed',         value: stats.parsed + stats.image_only,       icon: FileText,   color: G      },
    { label: 'AI Done',        value: stats.ai_done,      icon: Cpu,        color: '#7C3AED'  },
    { label: 'Candidates In',  value: stats.inserted + stats.updated, icon: Users, color: G },
    { label: 'Skipped',        value: stats.skipped,      icon: CheckCircle, color: A         },
    { label: 'Total Errors',   value: stats.parse_failed + stats.ai_failed + stats.ingest_failed, icon: AlertCircle, color: R },
  ] : [];

  const pct = stats && stats.total > 0
    ? Math.round((stats.fully_done / stats.total) * 100) : 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1722', margin: 0 }}>Resume Processing Dashboard</h1>
          <p style={{ fontSize: 12, color: '#8b8499', margin: '4px 0 0' }}>
            Monitor the bulk upload pipeline · Refresh to see latest counts · Retry failed files
          </p>
        </div>
        <button onClick={refresh} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: `1px solid ${ACCENT}30`, background: `${ACCENT}08`, color: ACCENT, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Overall progress bar */}
      {stats && (
        <div style={{ marginBottom: 24, padding: '16px 20px', background: 'linear-gradient(135deg,#4C1D95,#6D28D9)', borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Overall Progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#C4B5FD' }}>{pct}%</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#A78BFA,#7C3AED)', borderRadius: 4, transition: 'width .5s ease' }} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
            {stats.fully_done.toLocaleString()} of {stats.total.toLocaleString()} files fully processed
            {stats.ai_queued > 0 && ` · ${stats.ai_queued.toLocaleString()} in AI queue`}
            {stats.pending_parse > 0 && ` · ${stats.pending_parse.toLocaleString()} pending parse`}
          </p>
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 24 }}>
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 12, padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Icon size={12} style={{ color: k.color }} />
                <span style={{ fontSize: 10, color: '#8b8499' }}>{k.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value.toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      {/* Two columns: stage details + ingest log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>

        {/* Left: Stage breakdown + failed files */}
        <div>
          {/* Stage tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 1, borderRadius: '10px 10px 0 0', overflow: 'hidden', border: '1px solid #ece9f0', borderBottom: 'none' }}>
            {(['parse', 'ai', 'ingest'] as Stage[]).map((s, i) => {
              const label  = s === 'parse' ? '① Text Parse' : s === 'ai' ? '② AI Analysis' : '③ Ingest';
              const err    = stats
                ? s === 'parse' ? stats.parse_failed
                : s === 'ai' ? stats.ai_failed
                : stats.ingest_failed
                : 0;
              const active = activeStage === s;
              return (
                <button
                  key={s}
                  onClick={() => setActiveStage(s)}
                  style={{ flex: 1, padding: '10px 12px', border: 'none', borderRight: i < 2 ? '1px solid #ece9f0' : 'none', background: active ? '#fff' : '#f7f5fb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, borderBottom: active ? '2px solid #fff' : '2px solid #ece9f0' }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? ACCENT : '#8b8499' }}>{label}</span>
                  {err > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: R, borderRadius: 8, padding: '1px 5px' }}>{err}</span>}
                </button>
              );
            })}
          </div>

          {/* Stage stats row */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, borderLeft: '1px solid #ece9f0', borderRight: '1px solid #ece9f0', background: '#f7f5fb' }}>
             {(
  activeStage === 'parse' ? [
    { label: 'Pending', val: stats.pending_parse, color: A },
    { label: 'Parsed',  val: stats.parsed, color: G },
    { label: 'Scanned', val: stats.image_only, color: '#6B7280' },
    { label: 'Failed',  val: stats.parse_failed, color: R },
  ] : activeStage === 'ai' ? [
    { label: 'In Queue', val: stats.ai_queued, color: A },
    { label: 'Done',     val: stats.ai_done, color: G },
    { label: 'Failed',   val: stats.ai_failed, color: R },
    { label: 'Total',    val: stats.total, color: ACCENT },
  ] : [
    { label: 'Inserted', val: stats.inserted, color: G },
    { label: 'Updated',  val: stats.updated, color: ACCENT },
    { label: 'Skipped',  val: stats.skipped, color: '#6B7280' },
    { label: 'Failed',   val: stats.ingest_failed, color: R },
  ]
).map((s, i, arr) => (
                <div key={s.label} style={{ padding: '8px 14px', borderRight: i < arr.length - 1 ? '1px solid #ece9f0' : 'none' }}>
                  <div style={{ fontSize: 10, color: '#8b8499' }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}

          {/* Failed files list */}
          <div style={{ border: '1px solid #ece9f0', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden', background: '#fff' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f0edf5' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                {loading ? 'Loading…' : `${failed.length} failed files`}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {selected.size > 0 && (
                  <button
                    onClick={() => retry(Array.from(selected))}
                    disabled={retrying}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: `1px solid ${ACCENT}40`, background: `${ACCENT}10`, color: ACCENT, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {retrying ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={10} />}
                    Retry {selected.size} selected
                  </button>
                )}
                {failed.length > 0 && (
                  <button
                    onClick={() => retry()}
                    disabled={retrying}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: `1px solid ${R}30`, background: `${R}08`, color: R, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {retrying ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={10} />}
                    Retry all {failed.length}
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <Loader2 size={24} style={{ color: ACCENT, animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12, color: '#8b8499', margin: 0 }}>Loading…</p>
              </div>
            ) : failed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <CheckCircle size={28} style={{ color: G, margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>No failed files at this stage</p>
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {failed.map(f => (
                  <div
                    key={f.id}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f7f5fb', cursor: 'pointer', background: selected.has(f.id) ? `${ACCENT}06` : 'transparent' }}
                    onClick={() => setSelected(prev => {
                      const n = new Set(prev);
                      n.has(f.id) ? n.delete(f.id) : n.add(f.id);
                      return n;
                    })}
                  >
                    <input type="checkbox" checked={selected.has(f.id)} readOnly style={{ marginTop: 2, accentColor: ACCENT, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.file_name}
                      </p>
                      {(f.parse_error || f.ingest_error) && (
                        <p style={{ fontSize: 9, color: R, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.parse_error || f.ingest_error}
                        </p>
                      )}
                      <p style={{ fontSize: 9, color: '#9CA3AF', margin: '2px 0 0' }}>
                        {new Date(f.uploaded_at).toLocaleString()}
                        {f.parse_attempts !== undefined && ` · ${f.parse_attempts} attempts`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Ingest log */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0edf5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={13} style={{ color: ACCENT }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Recent Ingest Log</span>
              </div>
              <span style={{ fontSize: 9, color: '#8b8499' }}>Last 100 rows</span>
            </div>
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Clock size={20} style={{ color: '#c4c0cc', display: 'block', margin: '0 auto 6px' }} />
                  <p style={{ fontSize: 11, color: '#8b8499', margin: 0 }}>No ingest activity yet</p>
                </div>
              ) : logs.map(l => {
                const color = l.action === 'INSERT' ? G : l.action === 'UPDATE' ? ACCENT : l.action === 'FAIL' ? R : '#6B7280';
                return (
                  <div key={l.id} style={{ padding: '8px 14px', borderBottom: '1px solid #f7f5fb', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                          {l.candidate_email || '(no email)'}
                        </p>
                        <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color, flexShrink: 0 }}>{l.reason}</span>
                      </div>
                      {l.error_detail && (
                        <p style={{ fontSize: 9, color: R, margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.error_detail}
                        </p>
                      )}
                      <p style={{ fontSize: 8, color: '#9CA3AF', margin: '1px 0 0' }}>
                        {new Date(l.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ResumeProcessingPage;