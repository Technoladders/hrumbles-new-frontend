// src/pages/talent-pool/ResumeProcessingPage.tsx
//
// Shows upload progress and candidate creation status for the current user.
// Admins / superadmins see all uploads across the organisation.
// Regular users see only their own uploads.
// All labels use plain, non-technical language.

import { FC, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  FileText, RefreshCw, RotateCcw,
  CheckCircle, AlertCircle, Loader2, Activity,
  Cpu, Users, Clock,
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

const ADMIN_ROLES = ['admin', 'organization_superadmin', 'global_superadmin'];

// ── Friendly stage labels ─────────────────────────────────────────────────────
const STAGE_LABEL: Record<Stage, string> = {
  parse:  '① Reading Files',
  ai:     '② Extracting Info',
  ingest: '③ Adding to Pool',
};

const ACTION_LABEL: Record<string, string> = {
  INSERT: 'New candidate added',
  UPDATE: 'Candidate updated',
  SKIP:   'Already existed',
  FAIL:   'Could not be saved',
};

const ACTION_COLOR: Record<string, string> = {
  INSERT: G, UPDATE: ACCENT, SKIP: A, FAIL: R,
};

const ResumeProcessingPage: FC = () => {
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const user           = useSelector((s: any) => s.auth.user);
  const userRole       = useSelector((s: any) => s.auth.role);
  const isAdmin        = ADMIN_ROLES.includes(userRole);

  const [stats,       setStats]       = useState<Stats | null>(null);
  const [activeStage, setActiveStage] = useState<Stage>('parse');
  const [failed,      setFailed]      = useState<FailedFile[]>([]);
  const [logs,        setLogs]        = useState<LogRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [retrying,    setRetrying]    = useState(false);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());

  // uploaded_by filter — admins see all, regular users see only their own
  const uploadedByFilter = isAdmin ? null : (user?.id ?? null);

  // ── Fetch stats ───────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!organizationId) return;
    const { data } = await supabase.rpc('get_bulk_pipeline_stats', {
      p_org_id:      organizationId,
      p_uploaded_by: uploadedByFilter,
    });
    if (data) setStats(data as Stats);
  }, [organizationId, uploadedByFilter]);

  // ── Fetch failed files ────────────────────────────────────────────────────
  const fetchFailed = useCallback(async (stage: Stage) => {
    if (!organizationId) return;
    setLoading(true);
    setSelected(new Set());
    try {
      const statusCol = stage === 'parse' ? 'parse_status' : stage === 'ai' ? 'ai_status' : 'ingest_status';
      const cols = stage === 'parse'
        ? 'id,file_name,parse_status,parse_error,parse_attempts,uploaded_at'
        : stage === 'ai' ? 'id,file_name,ai_status,uploaded_at'
        : 'id,file_name,ingest_status,ingest_error,uploaded_at';

      let q = supabase.from('hr_resume_files')
        .select(cols)
        .eq('organization_id', organizationId)
        .eq(statusCol, 'failed')
        .order('uploaded_at', { ascending: false })
        .limit(200);

      if (uploadedByFilter) q = (q as any).eq('uploaded_by', uploadedByFilter);

      const { data } = await q;
      setFailed((data || []) as FailedFile[]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, uploadedByFilter]);

  // ── Fetch ingest log ──────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    if (!organizationId) return;
    // Join with hr_resume_files to filter by uploaded_by if needed
    const { data } = await supabase.from('hr_resume_ingest_log')
      .select('id,candidate_email,action,reason,field_changes,error_detail,created_at,resume_file_id')
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

  useEffect(() => { fetchFailed(activeStage); }, [activeStage]);

  // ── Retry ─────────────────────────────────────────────────────────────────
  const retry = async (fileIds?: string[]) => {
    setRetrying(true);
    try {
      const body: any = { org_id: organizationId, stage: activeStage };
      if (fileIds?.length) body.file_ids = fileIds;

      const workerUrl = import.meta.env.VITE_BULK_WORKER_URL || 'http://172.19.0.4:5010';
      const res = await fetch(`${workerUrl}/api/bulk/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());

      toast.success(fileIds?.length ? `Re-queued ${fileIds.length} file${fileIds.length !== 1 ? 's' : ''}` : 'All failed files re-queued');
      await fetchStats();
      await fetchFailed(activeStage);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(`Could not retry: ${e.message}`);
    } finally {
      setRetrying(false);
    }
  };

  const refresh = async () => {
    await Promise.all([fetchStats(), fetchFailed(activeStage), fetchLogs()]);
    toast.success('Refreshed');
  };

  // ── Summary cards ─────────────────────────────────────────────────────────
  const cards = stats ? [
    { label: 'Total Resumes Uploaded',  value: stats.total,                           color: ACCENT, icon: FileText  },
    { label: 'Successfully Read',        value: stats.parsed + stats.image_only,        color: G,      icon: CheckCircle },
    { label: 'Info Extracted by AI',     value: stats.ai_done,                          color: '#7C3AED', icon: Cpu     },
    { label: 'New Candidates Added',     value: stats.inserted + stats.updated,         color: G,      icon: Users    },
    { label: 'Already in Pool',          value: stats.skipped,                          color: A,      icon: CheckCircle },
    { label: 'Issues to Review',         value: stats.parse_failed + stats.ai_failed + stats.ingest_failed, color: R, icon: AlertCircle },
  ] : [];

  const pct = stats && stats.total > 0
    ? Math.round((stats.fully_done / stats.total) * 100) : 0;

  // ── Stage stat rows ───────────────────────────────────────────────────────
  const stageStats: Record<Stage, { label: string; val: number; color: string }[]> = {
    parse: stats ? [
      { label: 'Waiting to be read',  val: stats.pending_parse, color: A },
      { label: 'Read successfully',   val: stats.parsed,         color: G },
      { label: 'Image/Scanned files', val: stats.image_only,     color: '#6B7280' },
      { label: 'Could not be read',   val: stats.parse_failed,   color: R },
    ] : [],
    ai: stats ? [
      { label: 'Waiting for AI',     val: stats.ai_queued, color: A },
      { label: 'Info extracted',     val: stats.ai_done,   color: G },
      { label: 'AI could not read',  val: stats.ai_failed, color: R },
      { label: 'Total resumes',      val: stats.total,     color: ACCENT },
    ] : [],
    ingest: stats ? [
      { label: 'New candidates',    val: stats.inserted,      color: G },
      { label: 'Profiles updated', val: stats.updated,       color: ACCENT },
      { label: 'Already existed',  val: stats.skipped,       color: '#6B7280' },
      { label: 'Could not save',   val: stats.ingest_failed, color: R },
    ] : [],
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1722', margin: 0 }}>
            Upload Progress
          </h1>
          <p style={{ fontSize: 12, color: '#8b8499', margin: '4px 0 0' }}>
            {isAdmin
              ? 'Showing all uploads across the organisation · Refresh for latest counts'
              : 'Showing your uploads · Refresh to see the latest status'}
          </p>
        </div>
        <button onClick={refresh} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: `1px solid ${ACCENT}30`, background: `${ACCENT}08`, color: ACCENT, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Overall progress */}
      {stats && (
        <div style={{ marginBottom: 24, padding: '16px 20px', background: 'linear-gradient(135deg,#4C1D95,#6D28D9)', borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Overall Progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#C4B5FD' }}>{pct}% complete</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#A78BFA,#7C3AED)', borderRadius: 4, transition: 'width .5s ease' }} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
            {stats.fully_done.toLocaleString()} of {stats.total.toLocaleString()} resumes fully processed into candidates
            {stats.ai_queued > 0 && ` · ${stats.ai_queued.toLocaleString()} waiting for AI`}
            {stats.pending_parse > 0 && ` · ${stats.pending_parse.toLocaleString()} waiting to be read`}
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 24 }}>
        {cards.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 12, padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Icon size={12} style={{ color: k.color }} />
                <span style={{ fontSize: 9, color: '#8b8499', lineHeight: 1.3 }}>{k.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value.toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>

        {/* Left: stage breakdown + failed list */}
        <div>
          {/* Stage tabs */}
          <div style={{ display: 'flex', borderRadius: '10px 10px 0 0', overflow: 'hidden', border: '1px solid #ece9f0', borderBottom: 'none' }}>
            {(['parse', 'ai', 'ingest'] as Stage[]).map((s, i) => {
              const errCount = stats
                ? s === 'parse' ? stats.parse_failed : s === 'ai' ? stats.ai_failed : stats.ingest_failed
                : 0;
              const isActive = activeStage === s;
              return (
                <button key={s} onClick={() => setActiveStage(s)} style={{
                  flex: 1, padding: '10px 12px', border: 'none',
                  borderRight: i < 2 ? '1px solid #ece9f0' : 'none',
                  background: isActive ? '#fff' : '#f7f5fb', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  borderBottom: isActive ? '2px solid #fff' : '2px solid #ece9f0',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? ACCENT : '#8b8499' }}>
                    {STAGE_LABEL[s]}
                  </span>
                  {errCount > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: R, borderRadius: 8, padding: '1px 5px' }}>
                      {errCount} issue{errCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Stage stats */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderLeft: '1px solid #ece9f0', borderRight: '1px solid #ece9f0', background: '#f7f5fb' }}>
              {stageStats[activeStage].map((s, i, arr) => (
                <div key={s.label} style={{ padding: '8px 14px', borderRight: i < arr.length - 1 ? '1px solid #ece9f0' : 'none' }}>
                  <div style={{ fontSize: 10, color: '#8b8499' }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}

          {/* Failed files */}
          <div style={{ border: '1px solid #ece9f0', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f0edf5' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                {loading ? 'Loading…' : failed.length === 0 ? 'No issues at this stage ✓' : `${failed.length} file${failed.length !== 1 ? 's' : ''} with issues`}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {selected.size > 0 && (
                  <button onClick={() => retry(Array.from(selected))} disabled={retrying}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: `1px solid ${ACCENT}40`, background: `${ACCENT}10`, color: ACCENT, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                    {retrying ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={10} />}
                    Try again ({selected.size} selected)
                  </button>
                )}
                {failed.length > 0 && selected.size === 0 && (
                  <button onClick={() => retry()} disabled={retrying}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: `1px solid ${R}30`, background: `${R}08`, color: R, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                    {retrying ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={10} />}
                    Try all again ({failed.length})
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <Loader2 size={24} style={{ color: ACCENT, animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12, color: '#8b8499', margin: 0 }}>Loading…</p>
              </div>
            ) : failed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <CheckCircle size={28} style={{ color: G, display: 'block', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>Everything looks good here</p>
                <p style={{ fontSize: 11, color: '#8b8499', margin: '4px 0 0' }}>No files had issues at this stage</p>
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <div style={{ padding: '6px 14px', background: '#fff8f5', borderBottom: '1px solid #f0edf5', fontSize: 10, color: '#8b8499' }}>
                  Click a file to select it, then use "Try again" to re-process it.
                </div>
                {failed.map(f => (
                  <div key={f.id}
                    onClick={() => setSelected(prev => { const n = new Set(prev); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; })}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f7f5fb', cursor: 'pointer', background: selected.has(f.id) ? `${ACCENT}06` : 'transparent' }}>
                    <input type="checkbox" checked={selected.has(f.id)} readOnly style={{ marginTop: 2, accentColor: ACCENT, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.file_name}
                      </p>
                      {(f.parse_error || f.ingest_error) && (
                        <p style={{ fontSize: 9, color: R, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.parse_error?.includes('method=failed') ? 'File could not be read — unsupported format' :
                           f.parse_error?.includes('image_only') ? 'Scanned image — text could not be extracted' :
                           f.parse_error || f.ingest_error}
                        </p>
                      )}
                      <p style={{ fontSize: 9, color: '#9CA3AF', margin: '2px 0 0' }}>
                        Uploaded {new Date(f.uploaded_at).toLocaleString()}
                        {f.parse_attempts !== undefined && f.parse_attempts > 1 && ` · Tried ${f.parse_attempts} times`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Activity log */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0edf5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={13} style={{ color: ACCENT }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Recent Activity</span>
              </div>
              <span style={{ fontSize: 9, color: '#8b8499' }}>Last 100 actions</span>
            </div>
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Clock size={20} style={{ color: '#c4c0cc', display: 'block', margin: '0 auto 6px' }} />
                  <p style={{ fontSize: 11, color: '#8b8499', margin: 0 }}>No activity yet</p>
                  <p style={{ fontSize: 10, color: '#c4c0cc', margin: '3px 0 0' }}>Candidate creation events will appear here</p>
                </div>
              ) : logs.map(l => {
                const color = ACTION_COLOR[l.action] ?? '#6B7280';
                const label = ACTION_LABEL[l.action] ?? l.action;
                return (
                  <div key={l.id} style={{ padding: '8px 14px', borderBottom: '1px solid #f7f5fb', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 4 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                          {l.candidate_email || '(no email found)'}
                        </p>
                        <span style={{ fontSize: 9, fontWeight: 700, color, flexShrink: 0, marginLeft: 6 }}>{label}</span>
                      </div>
                      {l.error_detail && (
                        <p style={{ fontSize: 9, color: R, margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.error_detail.includes('23502') ? 'Missing required field — contact support' : l.error_detail}
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

          {/* Help card */}
          <div style={{ marginTop: 12, padding: '12px 14px', background: '#f7f5fb', borderRadius: 12, border: '1px solid #ece9f0' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>How it works</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { step: '①', label: 'Reading Files', desc: 'We extract text from each resume' },
                { step: '②', label: 'Extracting Info', desc: 'AI identifies name, skills, experience, etc.' },
                { step: '③', label: 'Adding to Pool', desc: 'Candidate profiles are created in your talent pool' },
              ].map(s => (
                <div key={s.step} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, flexShrink: 0 }}>{s.step}</span>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{s.label} </span>
                    <span style={{ fontSize: 10, color: '#8b8499' }}>— {s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ResumeProcessingPage;