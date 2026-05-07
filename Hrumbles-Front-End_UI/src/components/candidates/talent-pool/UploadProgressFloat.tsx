// src/components/candidates/talent-pool/UploadProgressFloat.tsx
//
// Floating widget mounted at App root via createPortal.
// Persists across page navigation. Shows per-file progress with retry info.
//
// KEY CHANGES from original:
//   1. Resume banner is a fully independent widget (not nested inside the main widget)
//   2. handleEvent: 'resumed' only sets resumeSession — does NOT set session
//      (session only activates when user re-selects files and resume actually starts)
//   3. Resume banner has a real file picker that calls uploadManager.resumeSession()
//   4. Resume shows accurate counts from DB (done, pending, total)
//   5. Retry count shown per file in the file list

import { FC, useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { uploadManager, UploadSession, UploadFileState } from '@/lib/UploadSessionManager';
import { useSelector } from 'react-redux';
import {
  X, Minus, Maximize2, CheckCircle, XCircle, AlertCircle,
  Loader2, UploadCloud, ChevronDown, ChevronUp, FileText,
  RefreshCw, FolderOpen,
} from 'lucide-react';

interface RootState { auth: { user: { id: string } | null } }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtPct = (n: number, t: number) => t > 0 ? Math.round((n / t) * 100) : 0;

const FileStatusIcon: FC<{ status: UploadFileState['status']; retries?: number }> = ({ status, retries }) => {
  if (status === 'done')      return <CheckCircle size={10} style={{ color: '#059669', flexShrink: 0 }}/>;
  if (status === 'failed')    return <XCircle     size={10} style={{ color: '#DC2626', flexShrink: 0 }}/>;
  if (status === 'duplicate') return <AlertCircle size={10} style={{ color: '#D97706', flexShrink: 0 }}/>;
  if (status === 'skipped')   return <AlertCircle size={10} style={{ color: '#D97706', flexShrink: 0 }}/>;
  if (status === 'parsing' || status === 'uploading')
    return <Loader2 size={10} style={{ color: '#7C3AED', animation: 'spin 1s linear infinite', flexShrink: 0 }}/>;
  // pending — show retry badge if retrying
  if (retries && retries > 0)
    return <RefreshCw size={10} style={{ color: '#D97706', flexShrink: 0 }}/>;
  return <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #D1D5DB', flexShrink: 0 }}/>;
};

// ─── Resume Banner (standalone widget) ────────────────────────────────────────
const ResumeBanner: FC<{
  session: UploadSession;
  onDismiss: () => void;
  onResumeStart: (files: File[]) => void;
}> = ({ session, onDismiss, onResumeStart }) => {
  const done    = session.files.filter(f => f.status === 'done').length;
  const skipped = session.files.filter(f => f.status === 'duplicate' || f.status === 'skipped').length;
  const total   = session.totalFiles;
  const remaining = total - done - skipped;

  return (
    <div style={{
      position   : 'fixed',
      bottom     : 24,
      right      : 24,
      zIndex     : 99999,
      width      : 340,
      background : '#fff',
      borderRadius: 14,
      boxShadow  : '0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(217,119,6,0.3)',
      overflow   : 'hidden',
      fontFamily : 'inherit',
    }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#92400E,#D97706)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertCircle size={16} color="#fff" style={{ flexShrink: 0 }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>Interrupted upload detected</p>
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
            {total.toLocaleString()} total · {done.toLocaleString()} done · {remaining.toLocaleString()} remaining
          </p>
        </div>
        <button onClick={onDismiss} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 5, padding: 4, cursor: 'pointer', display: 'flex', color: '#fff', flexShrink: 0 }}>
          <X size={11}/>
        </button>
      </div>

      {/* Progress bar showing how far we got */}
      <div style={{ padding: '10px 14px 6px' }}>
        <div style={{ height: 5, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${fmtPct(done + skipped, total)}%`, background: 'linear-gradient(90deg,#D97706,#F59E0B)', borderRadius: 3 }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: '#9CA3AF' }}>{fmtPct(done + skipped, total)}% uploaded</span>
          <span style={{ fontSize: 10, color: '#9CA3AF' }}>{remaining.toLocaleString()} files left</span>
        </div>
      </div>

      {/* Explanation */}
      <div style={{ padding: '4px 14px 10px', fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>
        The previous upload was interrupted. Already-uploaded files will be skipped automatically.
        Select the <strong style={{ color: '#374151' }}>same files</strong> (or all of them) to continue.
      </div>

      {/* Actions */}
      <div style={{ padding: '0 14px 14px', display: 'flex', gap: 8 }}>
        <label style={{
          flex          : 1,
          display       : 'flex',
          alignItems    : 'center',
          justifyContent: 'center',
          gap           : 6,
          padding       : '8px 0',
          borderRadius  : 8,
          border        : 'none',
          cursor        : 'pointer',
          background    : 'linear-gradient(135deg,#D97706,#F59E0B)',
          color         : '#fff',
          fontSize      : 12,
          fontWeight    : 700,
        }}>
          <FolderOpen size={13}/>
          Select files to resume
          <input
            type="file"
            accept=".pdf,.docx"
            multiple
            style={{ display: 'none' }}
            onChange={e => {
              const files = e.target.files;
              if (!files?.length) return;
              onResumeStart(Array.from(files));
            }}
          />
        </label>
        <button
          onClick={onDismiss}
          style={{ padding: '8px 12px', borderRadius: 8, border: '0.5px solid #FDE68A', cursor: 'pointer', background: '#FFFBEB', color: '#92400E', fontSize: 11, fontWeight: 600 }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

// ─── Main floating upload widget ───────────────────────────────────────────────
const UploadProgressFloat: FC = () => {
  const user = useSelector((s: RootState) => s.auth.user);

  const [session,       setSession]       = useState<UploadSession | null>(null);
  const [minimized,     setMinimized]     = useState(false);
  const [showFiles,     setShowFiles]     = useState(false);
  const [resumeSession, setResumeSession] = useState<UploadSession | null>(null);
  const fileScrollRef = useRef<HTMLDivElement>(null);

  // ── Listen to upload manager ───────────────────────────────────────────────
  const handleEvent = useCallback((e: any) => {
    if (e.type === 'progress') {
      // Active upload in progress — show the main widget
      setSession(prev => {
        // Merge to avoid full re-render of unchanged files
        if (!prev) return { ...e.session };
        return { ...e.session, files: [...e.session.files] };
      });
      // If resume banner was showing, clear it (we're now actively uploading)
      setResumeSession(null);
    }

    if (e.type === 'resumed') {
      // Incomplete session found on mount — show resume banner ONLY
      // Do NOT set `session` — the main widget should not appear until user acts
      setResumeSession({ ...e.session });
    }

    if (e.type === 'submitted') {
      toast.success(`✅ All files submitted to AI processing!`);
      // Keep the widget visible for 4 seconds showing "submitted" state, then hide
      setTimeout(() => setSession(null), 4000);
    }

    if (e.type === 'error') {
      toast.error(e.message);
    }
  }, []);

  useEffect(() => {
    uploadManager.on(handleEvent);
    if (user?.id) {
      uploadManager.checkForIncompleteSession(user.id).catch(() => {});
    }
    return () => uploadManager.off(handleEvent);
  }, [user?.id, handleEvent]);

  // Auto-scroll to active file
  useEffect(() => {
    if (showFiles && fileScrollRef.current) {
      const active = fileScrollRef.current.querySelector('[data-active="true"]');
      active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [session?.files, showFiles]);

  const handleDismissResume = async () => {
    if (resumeSession) {
      await uploadManager.cancelSession();
    }
    setResumeSession(null);
  };

  const handleResumeStart = async (files: File[]) => {
    if (!resumeSession) return;
    const snap = { ...resumeSession };
    setResumeSession(null); // hide banner — main widget will appear via 'progress' event
    toast.info(`Resuming — ${files.length} file${files.length !== 1 ? 's' : ''} selected. Checking which ones are already uploaded…`);
    try {
      await uploadManager.resumeSession(snap, files);
    } catch (err: any) {
      toast.error(`Resume failed: ${err.message}`);
    }
  };

  // Nothing to show at all
  if (!session && !resumeSession) return null;

  // ── Derived counts ────────────────────────────────────────────────────────
  const total      = session?.totalFiles ?? 0;
  const done       = session?.files.filter(f => f.status === 'done').length ?? 0;
  const failed     = session?.files.filter(f => f.status === 'failed').length ?? 0;
  const dupes      = session?.files.filter(f => f.status === 'duplicate' || f.status === 'skipped').length ?? 0;
  const active     = session?.files.filter(f => f.status === 'parsing' || f.status === 'uploading').length ?? 0;
  const pending    = session?.files.filter(f => f.status === 'pending').length ?? 0;
  const pct        = fmtPct(done + failed + dupes, total);
  const isSubmitting = session?.status === 'submitting';
  const isSubmitted  = session?.status === 'submitted';

  const widget = (
    <>
      {/* ── Resume banner — only when no active session ── */}
      {resumeSession && !session && (
        <ResumeBanner
          session={resumeSession}
          onDismiss={handleDismissResume}
          onResumeStart={handleResumeStart}
        />
      )}

      {/* ── Active upload widget ── */}
      {session && (
        <div style={{
          position    : 'fixed',
          bottom      : 24,
          right       : 24,
          zIndex      : 99999,
          width       : minimized ? 280 : 360,
          background  : '#fff',
          borderRadius: 14,
          boxShadow   : '0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(124,58,237,0.15)',
          overflow    : 'hidden',
          transition  : 'width .2s ease',
          fontFamily  : 'inherit',
        }}>
          {/* Header */}
          <div style={{
            background : 'linear-gradient(135deg,#4C1D95,#6D28D9,#7C3AED)',
            padding    : '10px 12px',
            display    : 'flex',
            alignItems : 'center',
            gap        : 8,
          }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isSubmitting
                ? <RefreshCw  size={12} color="#fff" style={{ animation: 'spin 1s linear infinite' }}/>
                : isSubmitted
                  ? <CheckCircle size={12} color="#fff"/>
                  : <UploadCloud size={12} color="#fff"/>
              }
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isSubmitting
                  ? 'Submitting to AI queue…'
                  : isSubmitted
                    ? '✅ Batch submitted!'
                    : `Uploading ${total.toLocaleString()} files`
                }
              </p>
              {!minimized && (
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                  {done.toLocaleString()} done
                  {failed  > 0 ? ` · ${failed} failed`        : ''}
                  {dupes   > 0 ? ` · ${dupes} skipped`        : ''}
                  {pending > 0 ? ` · ${pending.toLocaleString()} remaining` : ''}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={() => setMinimized(m => !m)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 5, padding: 4, cursor: 'pointer', display: 'flex', color: '#fff' }}>
                {minimized ? <Maximize2 size={11}/> : <Minus size={11}/>}
              </button>
              {(isSubmitted || (failed > 0 && pending === 0 && active === 0)) && (
                <button onClick={() => setSession(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 5, padding: 4, cursor: 'pointer', display: 'flex', color: '#fff' }}>
                  <X size={11}/>
                </button>
              )}
            </div>
          </div>

          {/* Body — hidden when minimized */}
          {!minimized && (
            <div>
              {/* Progress bar */}
              <div style={{ padding: '10px 14px 0' }}>
                <div style={{ height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
                  <div style={{
                    height     : '100%',
                    width      : `${pct}%`,
                    background : isSubmitted
                      ? '#059669'
                      : isSubmitting
                        ? '#D97706'
                        : 'linear-gradient(90deg,#6D28D9,#7C3AED)',
                    borderRadius: 3,
                    transition  : 'width .4s ease',
                  }}/>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>{pct}% complete</span>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                    {active > 0
                      ? `${active} uploading now`
                      : isSubmitting
                        ? 'Sending to AI…'
                        : isSubmitted
                          ? 'Done!'
                          : ''}
                  </span>
                </div>
              </div>

              {/* Stat row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, padding: '8px 14px' }}>
                {[
                  { label: 'Done',     value: done,    col: '#059669', bg: '#ECFDF5' },
                  { label: 'Active',   value: active,  col: '#7C3AED', bg: '#EDE9FE' },
                  { label: 'Pending',  value: pending, col: '#6B7280', bg: '#F3F4F6' },
                  { label: 'Failed',   value: failed,  col: '#DC2626', bg: '#FEE2E2' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '5px 4px', background: s.bg, borderRadius: 7 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: s.col }}>{s.value.toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: s.col, opacity: 0.7 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Duplicate warning */}
              {dupes > 0 && (
                <div style={{ margin: '0 14px 6px', padding: '5px 8px', background: '#FEF3C7', borderRadius: 7, fontSize: 10, color: '#92400E' }}>
                  <AlertCircle size={10} style={{ display: 'inline', marginRight: 4 }}/>
                  {dupes} duplicate file{dupes !== 1 ? 's' : ''} skipped — already in your database
                </div>
              )}

              {/* Failed warning with retry info */}
              {failed > 0 && !isSubmitting && pending === 0 && active === 0 && (
                <div style={{ margin: '0 14px 6px', padding: '5px 8px', background: '#FEE2E2', borderRadius: 7, fontSize: 10, color: '#991B1B' }}>
                  <XCircle size={10} style={{ display: 'inline', marginRight: 4 }}/>
                  {failed} file{failed !== 1 ? 's' : ''} failed after retries. Check the file list for details.
                </div>
              )}

              {/* File list toggle */}
              <button
                onClick={() => setShowFiles(f => !f)}
                style={{ width: '100%', padding: '6px 14px', border: 'none', borderTop: '0.5px solid #F3F4F6', background: '#FAFAFA', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6B7280', fontWeight: 600 }}
              >
                <FileText size={10}/>
                {showFiles ? 'Hide' : 'Show'} file list ({total.toLocaleString()} files)
                {showFiles ? <ChevronUp size={10} style={{ marginLeft: 'auto' }}/> : <ChevronDown size={10} style={{ marginLeft: 'auto' }}/>}
              </button>

              {/* Scrollable file list */}
              {showFiles && (
                <div ref={fileScrollRef} style={{ maxHeight: 200, overflowY: 'auto', borderTop: '0.5px solid #F3F4F6' }}>
                  {session.files.map((f, i) => {
                    const isNow = f.status === 'parsing' || f.status === 'uploading';
                    return (
                      <div
                        key={f.id + i}
                        data-active={isNow ? 'true' : 'false'}
                        style={{
                          display     : 'flex',
                          alignItems  : 'center',
                          gap         : 6,
                          padding     : '5px 12px',
                          borderBottom: '0.5px solid #F9FAFB',
                          background  : isNow ? '#F5F3FF' : f.status === 'failed' ? '#FFF5F5' : 'transparent',
                        }}
                      >
                        <FileStatusIcon status={f.status} retries={f.retries}/>
                        <span style={{ fontSize: 10, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.fileName}
                        </span>
                        <span style={{ fontSize: 9, color: '#9CA3AF', flexShrink: 0, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.status === 'parsing'   ? 'parsing…'
                          : f.status === 'uploading' ? 'uploading…'
                          : f.status === 'done'      ? '✓'
                          : f.status === 'failed'    ? (f.error?.slice(0, 24) ?? 'failed')
                          : f.status === 'duplicate' ? 'duplicate'
                          : f.status === 'skipped'   ? 'skipped'
                          : f.retries && f.retries > 0 ? `retry ${f.retries}/3`
                          : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cancel button */}
              {!isSubmitting && !isSubmitted && (
                <div style={{ padding: '8px 14px', borderTop: '0.5px solid #F3F4F6' }}>
                  <button
                    onClick={async () => {
                      if (window.confirm('Cancel this upload? Progress is saved — you can resume by re-selecting files.')) {
                        await uploadManager.cancelSession();
                        setSession(null);
                      }
                    }}
                    style={{ width: '100%', padding: '6px', borderRadius: 7, border: '0.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel upload (progress saved)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );

  return createPortal(widget, document.body);
};

export default UploadProgressFloat;