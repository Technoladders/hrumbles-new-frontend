// src/components/candidates/talent-pool/BulkUploadV2Modal.tsx
//
// Completely new bulk upload — replaces the old session-based approach.
// Flow:
//   1. User selects files
//   2. Browser computes sha256 hashes in parallel (Web Crypto API)
//   3. Single RPC call checks which hashes already exist in DB
//   4. User sees summary (new vs duplicate)
//   5. Upload new files directly to Supabase Storage (no edge function)
//   6. Insert rows into hr_resume_files
//   7. Modal closes — worker container handles everything else

import { useState, useRef, useCallback, FC } from 'react';
import Modal from 'react-modal';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import {
  UploadCloud, X, CheckCircle, AlertCircle,
  FileText, Loader2, ChevronRight, Zap,
} from 'lucide-react';

const BUCKET        = 'talent-pool-resumes';
const BULK_PREFIX   = 'bulk';
const CONCURRENCY   = 6;    // parallel uploads
const HASH_PARALLEL = 20;   // hashes computed at once

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ── SHA-256 using Web Crypto API ──────────────────────────────────────────────
async function sha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash   = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

// ── Upload state ──────────────────────────────────────────────────────────────
type Phase = 'idle' | 'hashing' | 'checking' | 'confirming' | 'uploading' | 'done';

interface UploadStats {
  total:      number;
  duplicates: number;
  toUpload:   number;
  done:       number;
  failed:     number;
}

const ACCENT = '#6d4aff';

const BulkUploadV2Modal: FC<Props> = ({ isOpen, onClose }) => {
  const user           = useSelector((s: any) => s.auth.user);
  const organizationId = useSelector((s: any) => s.auth.organization_id);

  const [phase,        setPhase]       = useState<Phase>('idle');
  const [stats,        setStats]       = useState<UploadStats>({ total: 0, duplicates: 0, toUpload: 0, done: 0, failed: 0 });
  const [failedFiles,  setFailedFiles] = useState<string[]>([]);
  const abortRef                       = useRef(false);
  const fileInputRef                   = useRef<HTMLInputElement>(null);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setPhase('idle');
    setStats({ total: 0, duplicates: 0, toUpload: 0, done: 0, failed: 0 });
    setFailedFiles([]);
    abortRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Main upload flow ──────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    abortRef.current = false;

    const accepted = files.filter(f =>
      f.type === 'application/pdf' ||
      f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      f.type === 'application/msword' ||
      f.name.toLowerCase().endsWith('.pdf') ||
      f.name.toLowerCase().endsWith('.docx') ||
      f.name.toLowerCase().endsWith('.doc')
    );

    if (!accepted.length) {
      toast.error('No valid files. Accepted: PDF, DOCX, DOC');
      return;
    }

    setPhase('hashing');
    setStats({ total: accepted.length, duplicates: 0, toUpload: 0, done: 0, failed: 0 });

    // ── 1. Compute hashes in parallel batches ─────────────────────────────
    const hashes: string[] = new Array(accepted.length).fill('');
    for (let i = 0; i < accepted.length; i += HASH_PARALLEL) {
      const batch = accepted.slice(i, i + HASH_PARALLEL);
      const batchHashes = await Promise.all(batch.map(sha256));
      batchHashes.forEach((h, j) => { hashes[i + j] = h; });
    }

    // ── 2. Check which hashes already exist ───────────────────────────────
    setPhase('checking');
    let existingHashes = new Set<string>();
    try {
      // Check in chunks of 1000 to stay within array parameter limits
      for (let i = 0; i < hashes.length; i += 1000) {
        const chunk = hashes.slice(i, i + 1000);
        const { data } = await supabase.rpc('check_resume_hashes_bulk', {
          p_hashes: chunk,
          p_org_id: organizationId,
        });
        (data || []).forEach((h: string) => existingHashes.add(h));
      }
    } catch (e) {
      toast.error('Could not check for duplicates. Proceeding with all files.');
    }

    const newFiles   = accepted.filter((_, i) => !existingHashes.has(hashes[i]));
    const newHashes  = hashes.filter((_, i) => !existingHashes.has(hashes[i]));
    const dupCount   = accepted.length - newFiles.length;

    setStats({ total: accepted.length, duplicates: dupCount, toUpload: newFiles.length, done: 0, failed: 0 });
    setPhase('confirming');

    // Auto-proceed if all files are new and < 100 files
    if (dupCount === 0 && newFiles.length <= 100) {
      await startUploading(newFiles, newHashes);
    }
    // Otherwise wait for user to click "Upload X files"

    return { newFiles, newHashes };
  }, [organizationId]);

  const startUploading = async (newFiles: File[], newHashes: string[]) => {
    if (!newFiles.length) {
      toast.info('All files already in database. Nothing to upload.');
      reset();
      return;
    }

    setPhase('uploading');
    const failed: string[] = [];
    let done = 0;

    // Worker function for concurrent uploads
    const queue = newFiles.map((f, i) => ({ file: f, hash: newHashes[i] }));
    const inProgress: Promise<void>[] = [];

    const worker = async () => {
      while (queue.length > 0 && !abortRef.current) {
        const item = queue.shift();
        if (!item) break;

        try {
          // Upload to Supabase Storage
          const ext        = item.file.name.split('.').pop()?.toLowerCase() || 'pdf';
          const storageKey = `${BULK_PREFIX}/${organizationId}/${crypto.randomUUID()}-${sanitize(item.file.name)}`;

          const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(storageKey, item.file, { cacheControl: '3600', upsert: false });

          if (uploadErr) throw new Error(`Storage: ${uploadErr.message}`);

          // Insert DB row — ON CONFLICT DO NOTHING (hash unique constraint)
          const { error: dbErr } = await supabase.from('hr_resume_files').insert({
            organization_id: organizationId,
            uploaded_by:     user?.id || null,
            file_name:       item.file.name,
            file_size:       item.file.size,
            mime_type:       item.file.type || _guessMime(item.file.name),
            file_hash:       item.hash,
            storage_path:    storageKey,
            parse_status:    'pending',
            ai_status:       'pending',
            ingest_status:   'pending',
          });

          if (dbErr && !dbErr.message?.includes('unique')) {
            // Unique constraint errors are expected and safe to ignore
            throw new Error(`DB: ${dbErr.message}`);
          }

          done++;
        } catch (e: any) {
          failed.push(item.file.name);
        }

        setStats(prev => ({ ...prev, done: done, failed: failed.length }));
      }
    };

    for (let i = 0; i < CONCURRENCY; i++) {
      inProgress.push(worker());
    }
    await Promise.all(inProgress);

    setFailedFiles(failed);
    setPhase('done');

    if (done > 0) {
      toast.success(`${done} files queued for processing. Worker will analyse them automatically.`);
    }
    if (failed.length > 0) {
      toast.warning(`${failed.length} files failed to upload — see details below.`);
    }
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const progress = stats.toUpload > 0
    ? Math.round(((stats.done + stats.failed) / stats.toUpload) * 100)
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      style={{
        content: {
          top: '50%', left: '50%', right: 'auto', bottom: 'auto',
          marginRight: '-50%', transform: 'translate(-50%,-50%)',
          width: '92%', maxWidth: 560, padding: 0,
          border: 'none', borderRadius: 18,
          boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        },
        overlay: { backgroundColor: 'rgba(17,12,46,0.55)', zIndex: 9999, backdropFilter: 'blur(4px)' },
      }}
    >
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#4C1D95,#6D28D9,#7C3AED)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Bulk Resume Upload</h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: '2px 0 0' }}>Files upload directly — AI processing runs automatically in the background</p>
        </div>
        <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 7, padding: 6, cursor: 'pointer', color: '#fff', display: 'flex' }}>
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 20, background: '#faf9fb', flex: 1 }}>

        {/* IDLE / CONFIRMING — Drop zone */}
        {(phase === 'idle' || phase === 'hashing' || phase === 'checking' || phase === 'confirming') && (
          <>
            {/* Info banner */}
            <div style={{ display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 16, background: 'linear-gradient(135deg,#ECFDF5,#F0FDF4)', border: '0.5px solid #6EE7B7', borderRadius: 10 }}>
              <Zap size={15} style={{ color: '#059669', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#065F46', margin: 0 }}>New upload system — no waiting</p>
                <p style={{ fontSize: 11, color: '#059669', margin: '2px 0 0' }}>
                  Files go directly to storage. Parsing → AI analysis → candidate creation happens automatically. You can close this and continue working.
                </p>
              </div>
            </div>

            {/* Drop zone */}
            <label
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: '32px 24px',
                border: `2px dashed ${isDragging ? ACCENT : '#C4B5FD'}`,
                borderRadius: 14, background: isDragging ? '#EDE9FE' : '#fff',
                cursor: phase === 'idle' ? 'pointer' : 'default',
                transition: 'all .2s ease',
              }}
            >
              {phase === 'hashing' && (
                <div style={{ textAlign: 'center' }}>
                  <Loader2 size={32} style={{ color: ACCENT, animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>Computing file fingerprints…</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>Checking for duplicates before uploading</p>
                </div>
              )}
              {phase === 'checking' && (
                <div style={{ textAlign: 'center' }}>
                  <Loader2 size={32} style={{ color: ACCENT, animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>Checking database…</p>
                </div>
              )}
              {phase === 'idle' && (
                <>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UploadCloud size={24} style={{ color: ACCENT }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>Drop resumes here or click to browse</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>PDF, DOCX, DOC · Any number of files · Duplicates skipped automatically</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => { const f = Array.from(e.target.files || []); handleFiles(f); }}
                  />
                </>
              )}
              {phase === 'confirming' && (
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Total selected', value: stats.total,      color: '#6b647a' },
                      { label: 'Already in DB',  value: stats.duplicates, color: '#D97706' },
                      { label: 'Will upload',    value: stats.toUpload,   color: '#059669' },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: '#8b8499', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {stats.toUpload > 0 ? (
                    <button
                      onClick={async () => {
                        // Need to re-access files — store them
                        if (fileInputRef.current?.files) {
                          const all   = Array.from(fileInputRef.current.files);
                          const hashes = await Promise.all(all.map(sha256));
                          const existChk = await supabase.rpc('check_resume_hashes_bulk', { p_hashes: hashes, p_org_id: organizationId });
                          const existing = new Set<string>((existChk.data || []) as string[]);
                          const newF  = all.filter((_, i) => !existing.has(hashes[i]));
                          const newH  = hashes.filter((_, i) => !existing.has(hashes[i]));
                          await startUploading(newF, newH);
                        }
                      }}
                      style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,#6D28D9,${ACCENT})`, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 2px 12px ${ACCENT}40` }}
                    >
                      <UploadCloud size={14} />
                      Upload {stats.toUpload.toLocaleString()} new file{stats.toUpload !== 1 ? 's' : ''}
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '12px', background: '#ECFDF5', borderRadius: 10, border: '1px solid #6EE7B7' }}>
                      <CheckCircle size={18} style={{ color: '#059669', margin: '0 auto 4px' }} />
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#065F46', margin: 0 }}>All files already in database</p>
                    </div>
                  )}
                </div>
              )}
            </label>
          </>
        )}

        {/* UPLOADING — progress */}
        {phase === 'uploading' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Uploading',  value: stats.toUpload,  color: ACCENT },
                { label: 'Done',       value: stats.done,       color: '#059669' },
                { label: 'Failed',     value: stats.failed,     color: '#DC2626' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: '#8b8499', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Upload progress</span>
                <span style={{ fontSize: 11, color: '#8b8499', fontFamily: 'monospace' }}>{progress}%</span>
              </div>
              <div style={{ height: 8, background: '#ece9f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,#6D28D9,${ACCENT})`, borderRadius: 4, transition: 'width .4s ease' }} />
              </div>
              <p style={{ fontSize: 10, color: '#8b8499', margin: '6px 0 0' }}>
                {stats.done + stats.failed} of {stats.toUpload} files · {stats.done} uploaded · {stats.failed} failed
              </p>
            </div>

            <div style={{ padding: '10px 14px', background: 'linear-gradient(135deg,#EDE9FE,#F5F3FF)', borderRadius: 10, fontSize: 11, color: '#5B21B6' }}>
              <Loader2 size={11} style={{ display: 'inline', marginRight: 5, animation: 'spin 1s linear infinite' }} />
              You can close this modal safely — uploads continue in the background and you'll see progress in the floating indicator.
            </div>

            <button
              onClick={() => { abortRef.current = true; }}
              style={{ width: '100%', marginTop: 12, padding: '8px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel remaining uploads
            </button>
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={40} style={{ color: '#059669', margin: '0 auto 12px', display: 'block' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1722', margin: '0 0 4px' }}>Upload complete</h3>
            <p style={{ fontSize: 12, color: '#8b8499', margin: '0 0 16px' }}>
              {stats.done} files queued. The pipeline will parse, analyse, and create candidates automatically.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Queued',     value: stats.done,       color: '#059669' },
                { label: 'Duplicates', value: stats.duplicates, color: '#D97706' },
                { label: 'Failed',     value: stats.failed,     color: '#DC2626' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: '#8b8499', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {failedFiles.length > 0 && (
              <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 10, padding: '10px 14px', textAlign: 'left', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <AlertCircle size={12} style={{ color: '#DC2626' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>{failedFiles.length} failed to upload</span>
                </div>
                <div style={{ maxHeight: 100, overflowY: 'auto' }}>
                  {failedFiles.slice(0, 20).map(name => (
                    <div key={name} style={{ fontSize: 10, color: '#6B7280', padding: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </div>
                  ))}
                  {failedFiles.length > 20 && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>+{failedFiles.length - 20} more</div>}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={reset} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #ece9f0', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Upload more
              </button>
              <button onClick={handleClose} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,#6D28D9,${ACCENT})`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
};

function _guessMime(name: string): string {
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'pdf')  return 'application/pdf';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'doc')  return 'application/msword';
  return 'application/octet-stream';
}

export default BulkUploadV2Modal;