// src/components/candidates/talent-pool/UploadProgressFloat.tsx
// Floating widget that renders at App root level (via portal).
// Persists across page navigation. Shows detailed per-file progress.
// On page load, detects and offers to resume interrupted sessions.

import { FC, useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { uploadManager, UploadSession, UploadFileState } from '@/lib/UploadSessionManager';
import { useSelector } from 'react-redux';
import {
  X, Minus, Maximize2, CheckCircle, XCircle, AlertCircle,
  Loader2, UploadCloud, ChevronDown, ChevronUp, FileText,
  RefreshCw,
} from 'lucide-react';

interface RootState { auth: { user: { id: string } | null } }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtPct = (n: number, t: number) => t > 0 ? Math.round((n / t) * 100) : 0;

const FileStatusIcon: FC<{ status: UploadFileState['status'] }> = ({ status }) => {
  if (status === 'done')      return <CheckCircle size={10} style={{ color: '#059669', flexShrink: 0 }}/>;
  if (status === 'failed')    return <XCircle     size={10} style={{ color: '#DC2626', flexShrink: 0 }}/>;
  if (status === 'duplicate') return <AlertCircle size={10} style={{ color: '#D97706', flexShrink: 0 }}/>;
  if (status === 'skipped')   return <AlertCircle size={10} style={{ color: '#D97706', flexShrink: 0 }}/>;
  if (status === 'parsing' || status === 'uploading')
    return <Loader2 size={10} style={{ color: '#7C3AED', animation: 'spin 1s linear infinite', flexShrink: 0 }}/>;
  return <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #D1D5DB', flexShrink: 0 }}/>;
};

// ─── Main floating component ───────────────────────────────────────────────────
const UploadProgressFloat: FC = () => {
  const user = useSelector((s: RootState) => s.auth.user);

  const [session,     setSession]     = useState<UploadSession | null>(null);
  const [minimized,   setMinimized]   = useState(false);
  const [showFiles,   setShowFiles]   = useState(false);
  const [showResume,  setShowResume]  = useState(false);
  const [resumeSession, setResumeSession] = useState<UploadSession | null>(null);
  const fileScrollRef = useRef<HTMLDivElement>(null);

  // ── Listen to upload manager events ───────────────────────────────────────
  const handleEvent = useCallback((e: any) => {
    if (e.type === 'progress' || e.type === 'resumed') {
      setSession({ ...e.session });
      if (e.type === 'resumed') {
        setShowResume(true);
        setResumeSession(e.session);
      }
    }
    if (e.type === 'submitted') {
      toast.success('All files submitted to AI batch processing!');
      setTimeout(() => setSession(null), 3000);
    }
    if (e.type === 'error') {
      toast.error(e.message);
    }
  }, []);

  useEffect(() => {
    uploadManager.on(handleEvent);
    // Check for incomplete session on mount
    if (user?.id) {
      uploadManager.checkForIncompleteSession(user.id).catch(() => {});
    }
    return () => uploadManager.off(handleEvent);
  }, [user?.id, handleEvent]);

  // Auto-scroll file list to active file
  useEffect(() => {
    if (showFiles && fileScrollRef.current) {
      const active = fileScrollRef.current.querySelector('[data-active="true"]');
      active?.scrollIntoView({ block: 'nearest' });
    }
  }, [session?.files, showFiles]);

  if (!session && !showResume) return null;

  // ── Counts ────────────────────────────────────────────────────────────────
  const total     = session?.totalFiles ?? 0;
  const done      = session?.files.filter(f => f.status === 'done').length ?? 0;
  const failed    = session?.files.filter(f => f.status === 'failed').length ?? 0;
  const dupes     = session?.files.filter(f => f.status === 'duplicate' || f.status === 'skipped').length ?? 0;
  const active    = session?.files.filter(f => f.status === 'parsing' || f.status === 'uploading').length ?? 0;
  const remaining = total - done - failed - dupes;
  const pct       = fmtPct(done + failed + dupes, total);
  const isSubmitting = session?.status === 'submitting';
  const isSubmitted  = session?.status === 'submitted';

  const widget = (
    <div style={{
      position   : 'fixed',
      bottom     : 24,
      right      : 24,
      zIndex     : 99999,
      width      : minimized ? 280 : 360,
      background : '#fff',
      borderRadius: 14,
      boxShadow  : '0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(124,58,237,0.15)',
      overflow   : 'hidden',
      transition : 'width .2s ease',
      fontFamily : 'inherit',
    }}>

      {/* Resume banner */}
      {showResume && resumeSession && !session?.status.startsWith('upload') && (
        <div style={{ padding: '12px 14px', background: '#FEF3C7', borderBottom: '0.5px solid #FDE68A' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', margin: '0 0 6px' }}>
            ⚠️ Interrupted upload detected
          </p>
          <p style={{ fontSize: 11, color: '#92400E', margin: '0 0 8px' }}>
            {resumeSession.totalFiles} files — {resumeSession.files.filter(f=>f.status==='done').length} already uploaded.
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => {
                setShowResume(false);
                // Show file picker to re-select files for resume
                toast.info('Select the same files again to resume where you left off.');
              }}
              style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', cursor: 'pointer', background: '#D97706', color: '#fff', fontSize: 11, fontWeight: 700 }}
            >
              Resume Upload
            </button>
            <button
              onClick={async () => {
                await uploadManager.cancelSession();
                setShowResume(false);
                setResumeSession(null);
              }}
              style={{ padding: '6px 10px', borderRadius: 7, border: '0.5px solid #FDE68A', cursor: 'pointer', background: '#fff', color: '#92400E', fontSize: 11 }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      {session && (
        <div style={{
          background : 'linear-gradient(135deg,#4C1D95,#6D28D9,#7C3AED)',
          padding    : '10px 12px',
          display    : 'flex',
          alignItems : 'center',
          gap        : 8,
        }}>
          {/* Icon */}
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isSubmitting
              ? <RefreshCw size={12} color="#fff" style={{ animation: 'spin 1s linear infinite' }}/>
              : isSubmitted
                ? <CheckCircle size={12} color="#fff"/>
                : <UploadCloud size={12} color="#fff"/>
            }
          </div>

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isSubmitting ? 'Submitting to AI queue…' : isSubmitted ? 'Batch submitted!' : `Uploading ${total} files`}
            </p>
            {!minimized && (
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                {done} done · {failed > 0 ? `${failed} failed · ` : ''}{dupes > 0 ? `${dupes} skipped · ` : ''}{remaining > 0 ? `${remaining} remaining` : ''}
              </p>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={() => setMinimized(m => !m)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 5, padding: 4, cursor: 'pointer', display: 'flex', color: '#fff' }}>
              {minimized ? <Maximize2 size={11}/> : <Minus size={11}/>}
            </button>
            {(isSubmitted || failed === total) && (
              <button onClick={() => setSession(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 5, padding: 4, cursor: 'pointer', display: 'flex', color: '#fff' }}>
                <X size={11}/>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Body — hidden when minimized */}
      {session && !minimized && (
        <div>
          {/* Big progress bar */}
          <div style={{ padding: '10px 14px 0' }}>
            <div style={{ height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: isSubmitted ? '#059669' : isSubmitting ? '#D97706' : 'linear-gradient(90deg,#6D28D9,#7C3AED)',
                borderRadius: 3, transition: 'width .4s ease',
              }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>{pct}% complete</span>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                {active > 0 ? `${active} uploading now` : isSubmitting ? 'Sending to OpenAI…' : ''}
              </span>
            </div>
          </div>

          {/* Stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, padding: '8px 14px' }}>
            {[
              { label: 'Done',      value: done,      col: '#059669', bg: '#ECFDF5' },
              { label: 'Uploading', value: active,     col: '#7C3AED', bg: '#EDE9FE' },
              { label: 'Pending',   value: Math.max(remaining - active, 0), col: '#6B7280', bg: '#F3F4F6' },
              { label: 'Failed',    value: failed,    col: '#DC2626', bg: '#FEE2E2' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '5px 4px', background: s.bg, borderRadius: 7 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: s.col }}>{s.value}</div>
                <div style={{ fontSize: 9, color: s.col, opacity: 0.7 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Duplicate warning */}
          {dupes > 0 && (
            <div style={{ margin: '0 14px 6px', padding: '5px 8px', background: '#FEF3C7', borderRadius: 7, fontSize: 10, color: '#92400E' }}>
              <AlertCircle size={10} style={{ display: 'inline', marginRight: 4 }}/>
              {dupes} duplicate file{dupes !== 1 ? 's' : ''} detected and skipped (same content already uploaded)
            </div>
          )}

          {/* File list toggle */}
          <button
            onClick={() => setShowFiles(f => !f)}
            style={{ width: '100%', padding: '6px 14px', border: 'none', borderTop: '0.5px solid #F3F4F6', background: '#FAFAFA', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6B7280', fontWeight: 600 }}
          >
            <FileText size={10}/>
            {showFiles ? 'Hide' : 'Show'} file list
            {showFiles ? <ChevronUp size={10} style={{ marginLeft: 'auto' }}/> : <ChevronDown size={10} style={{ marginLeft: 'auto' }}/>}
          </button>

          {/* Scrollable file list */}
          {showFiles && (
            <div ref={fileScrollRef} style={{ maxHeight: 180, overflowY: 'auto', borderTop: '0.5px solid #F3F4F6' }}>
              {session.files.map((f, i) => {
                const isNow = f.status === 'parsing' || f.status === 'uploading';
                return (
                  <div key={i} data-active={isNow ? 'true' : 'false'} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                    borderBottom: '0.5px solid #F9FAFB',
                    background: isNow ? '#F5F3FF' : 'transparent',
                  }}>
                    <FileStatusIcon status={f.status}/>
                    <span style={{ fontSize: 10, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.fileName}
                    </span>
                    <span style={{ fontSize: 9, color: '#9CA3AF', flexShrink: 0 }}>
                      {f.status === 'parsing'   ? 'parsing…'  :
                       f.status === 'uploading' ? 'uploading…':
                       f.status === 'done'      ? '✓'         :
                       f.status === 'failed'    ? f.error?.slice(0,20) ?? 'failed' :
                       f.status === 'duplicate' ? 'duplicate' :
                       f.status === 'skipped'   ? 'skipped'   : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cancel button — only while uploading, not after submit */}
          {!isSubmitting && !isSubmitted && (
            <div style={{ padding: '8px 14px', borderTop: '0.5px solid #F3F4F6' }}>
              <button
                onClick={async () => {
                  if (window.confirm('Cancel this upload? Progress will be saved and you can resume later.')) {
                    await uploadManager.cancelSession();
                    setSession(null);
                  }
                }}
                style={{ width: '100%', padding: '6px', borderRadius: 7, border: '0.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel Upload
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return createPortal(widget, document.body);
};

export default UploadProgressFloat;