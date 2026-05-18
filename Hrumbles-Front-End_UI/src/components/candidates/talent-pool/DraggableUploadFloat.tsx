// src/components/candidates/talent-pool/DraggableUploadFloat.tsx
//
// Globally mounted draggable floating window for bulk upload progress.
// Shows when upload is in progress, minimises when done.
// Draggable anywhere on screen by the header.
// Survives route changes — mounted at App root level.
//
// Usage in App.jsx:
//   import DraggableUploadFloat from '@/components/candidates/talent-pool/DraggableUploadFloat'
//   <DraggableUploadFloat />

import {
  FC, useState, useRef, useCallback, useEffect,
  createContext, useContext, ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  UploadCloud, X, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Loader2, Minimize2,
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════
// Context — lets BulkUploadV2Modal push upload state into the float
// ════════════════════════════════════════════════════════════════════════════

export interface UploadJob {
  id:           string;
  fileName:     string;
  totalFiles:   number;
  done:         number;
  failed:       number;
  duplicates:   number;
  status:       'hashing' | 'checking' | 'uploading' | 'done' | 'cancelled';
  startedAt:    Date;
}

interface UploadFloatCtx {
  jobs:      UploadJob[];
  addJob:    (job: UploadJob) => void;
  updateJob: (id: string, patch: Partial<UploadJob>) => void;
  removeJob: (id: string) => void;
}

const UploadFloatContext = createContext<UploadFloatCtx>({
  jobs: [], addJob: () => {}, updateJob: () => {}, removeJob: () => {},
});

export const useUploadFloat = () => useContext(UploadFloatContext);

export const UploadFloatProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  const addJob    = useCallback((job: UploadJob) =>
    setJobs(prev => [job, ...prev.slice(0, 4)]), []);

  const updateJob = useCallback((id: string, patch: Partial<UploadJob>) =>
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j)), []);

  const removeJob = useCallback((id: string) =>
    setJobs(prev => prev.filter(j => j.id !== id)), []);

  return (
    <UploadFloatContext.Provider value={{ jobs, addJob, updateJob, removeJob }}>
      {children}
    </UploadFloatContext.Provider>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Draggable Float Widget
// ════════════════════════════════════════════════════════════════════════════

const ACCENT = '#6d4aff';
const G      = '#059669';
const R      = '#DC2626';
const A      = '#D97706';

const DraggableUploadFloat: FC = () => {
  const { jobs, removeJob } = useUploadFloat();

  // ── Drag state ────────────────────────────────────────────────────────────
  const [pos,        setPos]        = useState({ x: 24, y: window.innerHeight - 380 });
  const [minimised,  setMinimised]  = useState(false);
  const dragging                    = useRef(false);
  const dragOffset                  = useRef({ x: 0, y: 0 });
  const floatRef                    = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging.current  = true;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const maxX = window.innerWidth  - (floatRef.current?.offsetWidth  || 300);
      const maxY = window.innerHeight - (floatRef.current?.offsetHeight || 200);
      setPos({
        x: Math.max(0, Math.min(maxX, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(maxY, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => { dragging.current = false; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, []);

  // Touch support
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const t = e.touches[0];
    dragging.current   = true;
    dragOffset.current = { x: t.clientX - pos.x, y: t.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    const onMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      const t = e.touches[0];
      setPos({
        x: Math.max(0, t.clientX - dragOffset.current.x),
        y: Math.max(0, t.clientY - dragOffset.current.y),
      });
    };
    const onEnd = () => { dragging.current = false; };
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend',  onEnd);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onEnd);
    };
  }, []);

  // Don't render if no jobs
  if (!jobs.length) return null;

  const activeJobs = jobs.filter(j => j.status !== 'done' && j.status !== 'cancelled');
  const doneJobs   = jobs.filter(j => j.status === 'done');
  const totalFiles = jobs.reduce((s, j) => s + j.totalFiles, 0);
  const totalDone  = jobs.reduce((s, j) => s + j.done, 0);
  const totalFail  = jobs.reduce((s, j) => s + j.failed, 0);
  const overallPct = totalFiles > 0 ? Math.round((totalDone + totalFail) / totalFiles * 100) : 0;
  const hasActive  = activeJobs.length > 0;

  const widget = (
    <div
      ref={floatRef}
      style={{
        position:   'fixed',
        left:        pos.x,
        top:         pos.y,
        zIndex:      99999,
        width:       minimised ? 240 : 320,
        background:  '#fff',
        borderRadius: 16,
        boxShadow:   '0 12px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(109,74,255,0.15)',
        overflow:    'hidden',
        userSelect:  'none',
        transition:  'width .2s ease, box-shadow .2s ease',
      }}
    >
      {/* ── Header (drag handle) ─────────────────────────────────────────── */}
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{
          background:  'linear-gradient(135deg,#4C1D95,#6D28D9)',
          padding:     '11px 12px',
          display:     'flex',
          alignItems:  'center',
          gap:          8,
          cursor:      dragging.current ? 'grabbing' : 'grab',
        }}
      >
        {/* Icon */}
        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {hasActive
            ? <Loader2 size={12} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
            : <CheckCircle size={12} color="#fff" />}
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hasActive ? `Uploading ${totalFiles.toLocaleString()} files…` : `Upload complete`}
          </p>
          {!minimised && (
            <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.65)' }}>
              {totalDone.toLocaleString()} done · {totalFail > 0 ? `${totalFail} failed · ` : ''}{overallPct}%
            </p>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setMinimised(m => !m)}
            title={minimised ? 'Expand' : 'Minimise'}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 5, padding: '3px 6px', cursor: 'pointer', color: '#fff', display: 'flex' }}
          >
            {minimised ? <ChevronUp size={11} /> : <Minimize2 size={11} />}
          </button>
          {!hasActive && (
            <button
              onClick={() => jobs.forEach(j => removeJob(j.id))}
              title="Dismiss"
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 5, padding: '3px 6px', cursor: 'pointer', color: '#fff', display: 'flex' }}
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Overall progress bar ────────────────────────────────────────────── */}
      <div style={{ height: 4, background: '#f0edf5' }}>
        <div style={{
          height:     '100%',
          width:      `${overallPct}%`,
          background: hasActive
            ? `linear-gradient(90deg,#6D28D9,${ACCENT})`
            : `linear-gradient(90deg,${G},#34D399)`,
          transition: 'width .4s ease',
        }} />
      </div>

      {/* ── Per-job list (hidden when minimised) ────────────────────────────── */}
      {!minimised && (
        <div style={{ maxHeight: 300, overflowY: 'auto', padding: '8px 0' }}>
          {jobs.map(job => {
            const pct     = job.totalFiles > 0 ? Math.round((job.done + job.failed) / job.totalFiles * 100) : 0;
            const toUpload = job.totalFiles - job.duplicates;
            const isDone  = job.status === 'done';
            const isErr   = job.failed > 0;

            return (
              <div key={job.id} style={{ padding: '8px 14px', borderBottom: '1px solid #f7f5fb' }}>
                {/* Job header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#1a1722', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {job.fileName || `Batch of ${job.totalFiles} files`}
                    </p>
                    <p style={{ fontSize: 9, color: '#8b8499', margin: '1px 0 0' }}>
                      {_statusLabel(job)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: isDone ? G : ACCENT }}>
                      {pct}%
                    </span>
                    {isDone && (
                      <button onClick={() => removeJob(job.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#c4c0cc', display: 'flex' }}>
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 4, background: '#f0edf5', borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
                  <div style={{
                    height:     '100%',
                    width:      `${pct}%`,
                    background: isDone && !isErr
                      ? `linear-gradient(90deg,${G},#34D399)`
                      : isErr
                      ? `linear-gradient(90deg,${A},${R})`
                      : `linear-gradient(90deg,#6D28D9,${ACCENT})`,
                    borderRadius: 2,
                    transition: 'width .4s ease',
                  }} />
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { label: 'Total',   val: job.totalFiles,  color: '#6b647a' },
                    { label: 'Skip',    val: job.duplicates,  color: A          },
                    { label: 'Upload',  val: toUpload,        color: ACCENT     },
                    { label: 'Done',    val: job.done,        color: G          },
                    ...(job.failed > 0 ? [{ label: 'Fail', val: job.failed, color: R }] : []),
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.val.toLocaleString()}</div>
                      <div style={{ fontSize: 8, color: '#9CA3AF' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer hint ────────────────────────────────────────────────────── */}
      {!minimised && hasActive && (
        <div style={{ padding: '7px 14px', background: '#F5F3FF', borderTop: '1px solid #EDE9FE' }}>
          <p style={{ fontSize: 9, color: '#7C3AED', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <UploadCloud size={9} />
            You can navigate freely — upload continues in the background
          </p>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return createPortal(widget, document.body);
};

function _statusLabel(job: UploadJob): string {
  if (job.status === 'hashing')   return `Computing fingerprints…`;
  if (job.status === 'checking')  return `Checking ${job.totalFiles.toLocaleString()} files for duplicates…`;
  if (job.status === 'uploading') return `Uploading ${(job.totalFiles - job.duplicates).toLocaleString()} new files…`;
  if (job.status === 'done') {
    const elapsed = Math.round((Date.now() - job.startedAt.getTime()) / 1000);
    return `Done in ${elapsed}s · ${job.done} uploaded · ${job.duplicates} skipped`;
  }
  return '';
}

export default DraggableUploadFloat;