// src/components/candidates/talent-pool/BulkProgressFloat.tsx
//
// Floating widget that shows the 4-stage bulk pipeline status.
// Polls get_bulk_pipeline_stats RPC every 15 seconds.
// Mounted in App.jsx alongside existing UploadProgressFloat.
// Only shows when there are files being processed.

import { FC, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  FileText, ChevronDown, ChevronUp, X,
  Loader2, CheckCircle, RefreshCw, ExternalLink,
} from 'lucide-react';

interface Stats {
  total:         number;
  pending_parse: number;
  parsed:        number;
  image_only:    number;
  parse_failed:  number;
  ai_queued:     number;
  ai_done:       number;
  ai_failed:     number;
  inserted:      number;
  updated:       number;
  skipped:       number;
  ingest_failed: number;
  fully_done:    number;
}

const ACCENT  = '#6d4aff';
const G       = '#059669';
const A       = '#D97706';
const R       = '#DC2626';
const POLL_MS = 15_000;

const BulkProgressFloat: FC = () => {
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const user           = useSelector((s: any) => s.auth.user);
const userRole       = useSelector((s: any) => s.auth.role);
  const navigate       = useNavigate();

  const [stats,      setStats]      = useState<Stats | null>(null);
  const [expanded,   setExpanded]   = useState(false);
  const [dismissed,  setDismissed]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [lastPoll,   setLastPoll]   = useState<Date | null>(null);

const poll = useCallback(async () => {
  if (!organizationId) return;
  setLoading(true);

  try {
    // Admins / superadmins can view org-wide stats
    const isAdmin = ['admin', 'organization_superadmin', 'global_superadmin'].includes(userRole);

    const { data } = await supabase.rpc('get_bulk_pipeline_stats', {
      p_org_id: organizationId,
      p_uploaded_by: isAdmin ? null : (user?.id ?? null),
    });

    if (data) {
      setStats(data as Stats);
      setLastPoll(new Date());
    }
  } catch (e) {
    // Silently fail — widget just shows stale data
  } finally {
    setLoading(false);
  }
}, [organizationId, user?.id, userRole]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  // Don't show if nothing in the pipeline at all
  if (!stats || stats.total === 0 || dismissed) return null;

  // Don't show if everything is done
  const activeWork = (stats.pending_parse + stats.ai_queued + (stats.total - stats.fully_done - stats.fully_done)) > 0;
  const hasErrors  = stats.parse_failed + stats.ai_failed + stats.ingest_failed > 0;

  if (!activeWork && !hasErrors) return null;

  const pct = stats.total > 0 ? Math.round((stats.fully_done / stats.total) * 100) : 0;
  const isFinishing = stats.pending_parse === 0 && stats.ai_queued === 0 && stats.ai_done > 0;

  const widget = (
    <div style={{
      position:     'fixed',
      bottom:       24,
      left:         24,           // left side — doesn't overlap old upload float (right side)
      zIndex:       99998,
      width:        expanded ? 320 : 260,
      background:   '#fff',
      borderRadius: 14,
      boxShadow:    '0 8px 32px rgba(0,0,0,0.16), 0 0 0 1px rgba(109,74,255,0.12)',
      overflow:     'hidden',
      transition:   'width .2s ease',
      fontFamily:   'inherit',
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg,#4C1D95,#6D28D9)`,
        padding:    '10px 12px',
        display:    'flex',
        alignItems: 'center',
        gap:        8,
      }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {loading
            ? <Loader2 size={11} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
            : <FileText size={11} color="#fff" />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Bulk Pipeline · {pct}% done
          </p>
          <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.65)' }}>
            {stats.total.toLocaleString()} files · {stats.fully_done.toLocaleString()} complete
          </p>
        </div>

        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button onClick={() => setExpanded(e => !e)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4, padding: '3px 5px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
            {expanded ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
          </button>
          <button onClick={() => setDismissed(true)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4, padding: '3px 5px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#ece9f0' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${ACCENT},#a37cff)`, transition: 'width .5s ease' }} />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '10px 12px' }}>
          {/* 4 pipeline stages */}
          {[
            {
              label:   '① Parse',
              active:  stats.pending_parse,
              done:    stats.parsed + stats.image_only,
              failed:  stats.parse_failed,
              detail:  `${stats.image_only > 0 ? `${stats.image_only} scanned, ` : ''}${stats.pending_parse} pending`,
            },
            {
              label:   '② AI Queue',
              active:  stats.ai_queued,
              done:    stats.ai_done,
              failed:  stats.ai_failed,
              detail:  `${stats.ai_queued} in queue`,
            },
            {
              label:   '③ Ingest',
              active:  stats.ai_done - (stats.inserted + stats.updated + stats.skipped + stats.ingest_failed),
              done:    stats.inserted + stats.updated + stats.skipped,
              failed:  stats.ingest_failed,
              detail:  `+${stats.inserted} new, ~${stats.updated} updated, =${stats.skipped} skipped`,
            },
          ].map(stage => (
            <div key={stage.label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#3a3540' }}>{stage.label}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {stage.active > 0 && <span style={{ fontSize: 9, color: ACCENT, fontFamily: 'monospace' }}>{stage.active.toLocaleString()} active</span>}
                  {stage.failed > 0 && <span style={{ fontSize: 9, color: R, fontFamily: 'monospace' }}>{stage.failed} failed</span>}
                  <span style={{ fontSize: 9, color: G, fontFamily: 'monospace' }}>{stage.done.toLocaleString()} ✓</span>
                </div>
              </div>
              <div style={{ height: 3, background: '#f0edf5', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.total > 0 ? (stage.done / stats.total) * 100 : 0}%`, background: G, borderRadius: 2, transition: 'width .5s ease' }} />
              </div>
              {stage.detail && <p style={{ fontSize: 9, color: '#8b8499', margin: '2px 0 0' }}>{stage.detail}</p>}
            </div>
          ))}

          {/* Errors summary */}
          {hasErrors && (
            <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 8, padding: '6px 10px', marginTop: 4, marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: R, margin: 0 }}>
                {stats.parse_failed + stats.ai_failed + stats.ingest_failed} errors across pipeline
              </p>
              <p style={{ fontSize: 9, color: '#6B7280', margin: '2px 0 0' }}>Open dashboard to retry failed files</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => navigate('/talent-pool/resume-processing')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 0', borderRadius: 7, border: `1px solid ${ACCENT}30`, background: `${ACCENT}10`, color: ACCENT, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
            >
              <ExternalLink size={10} /> Dashboard
            </button>
            <button
              onClick={poll}
              style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #ece9f0', background: '#fff', color: '#6b647a', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
            >
              <RefreshCw size={10} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>

          {lastPoll && (
            <p style={{ fontSize: 8, color: '#c4c0cc', margin: '6px 0 0', textAlign: 'right' }}>
              Last updated {lastPoll.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return createPortal(widget, document.body);
};

export default BulkProgressFloat;