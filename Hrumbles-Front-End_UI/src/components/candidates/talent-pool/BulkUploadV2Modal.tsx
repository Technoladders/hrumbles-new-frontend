// src/components/candidates/talent-pool/BulkUploadV2Modal.tsx
//
// Modal closes immediately when upload starts.
// Progress is handed off to DraggableUploadFloat via UploadFloatContext.

import { FC, useState, useRef, useCallback } from 'react';
import Modal from 'react-modal';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { useUploadFloat } from './DraggableUploadFloat';
import { UploadCloud, X, Zap, CheckCircle, FileText, Loader2, ChevronRight } from 'lucide-react';

const BUCKET      = 'talent-pool-resumes';
const BULK_PREFIX = 'bulk';
const CONCURRENCY = 6;
const HASH_BATCH  = 20;
const ACCENT      = '#6d4aff';

interface Props { isOpen: boolean; onClose: () => void; }

async function sha256(file: File): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function sanitize(n: string) { return n.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100); }
function guessMime(n: string) {
  const e = n.toLowerCase().split('.').pop();
  return e === 'pdf' ? 'application/pdf'
    : e === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : e === 'doc'  ? 'application/msword'
    : 'application/octet-stream';
}

type Phase = 'idle' | 'hashing' | 'checking' | 'confirming';

const BulkUploadV2Modal: FC<Props> = ({ isOpen, onClose }) => {
  const user           = useSelector((s: any) => s.auth.user);
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const { addJob, updateJob } = useUploadFloat();

  const [phase,      setPhase]    = useState<Phase>('idle');
  const [allFiles,   setAllFiles] = useState<File[]>([]);
  const [allHashes,  setHashes]   = useState<string[]>([]);
  const [dupCount,   setDup]      = useState(0);
  const [newCount,   setNew]      = useState(0);
  const [dragging,   setDragging] = useState(false);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPhase('idle'); setAllFiles([]); setHashes([]); setDup(0); setNew(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleClose = () => { reset(); onClose(); };

  const processFiles = useCallback(async (files: File[]) => {
    const ok = files.filter(f => /\.(pdf|docx|doc)$/i.test(f.name) ||
      ['application/pdf',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'application/msword'].includes(f.type));
    if (!ok.length) { toast.error('No valid files — PDF, DOCX or DOC only'); return; }

    setPhase('hashing'); setAllFiles(ok);
    const hashes: string[] = new Array(ok.length).fill('');
    for (let i = 0; i < ok.length; i += HASH_BATCH) {
      const r = await Promise.all(ok.slice(i, i + HASH_BATCH).map(sha256));
      r.forEach((h, j) => { hashes[i + j] = h; });
    }
    setHashes(hashes);

    setPhase('checking');
    const existing = new Set<string>();
    try {
      for (let i = 0; i < hashes.length; i += 1000) {
        const { data } = await supabase.rpc('check_resume_hashes_bulk', {
          p_hashes: hashes.slice(i, i + 1000), p_org_id: organizationId });
        (data || []).forEach((h: string) => existing.add(h));
      }
    } catch { toast.warning('Could not check duplicates — uploading all files'); }

    const dups = hashes.filter(h => existing.has(h)).length;
    setDup(dups); setNew(ok.length - dups); setPhase('confirming');
  }, [organizationId]);

  const startUpload = useCallback(async () => {
    // Re-fetch existing hashes (user may have waited)
    const existing = new Set<string>();
    for (let i = 0; i < allHashes.length; i += 1000) {
      const { data } = await supabase.rpc('check_resume_hashes_bulk', {
        p_hashes: allHashes.slice(i, i + 1000), p_org_id: organizationId });
      (data || []).forEach((h: string) => existing.add(h));
    }
    const newFiles  = allFiles.filter((_, i) => !existing.has(allHashes[i]));
    const newHashes = allHashes.filter(h => !existing.has(h));

    if (!newFiles.length) { toast.info('All files already in database'); handleClose(); return; }

    // Register job in float, then close modal immediately
    const jobId = crypto.randomUUID();
    addJob({
      id:         jobId,
      fileName:   newFiles.length === 1 ? newFiles[0].name : `${allFiles.length} files`,
      totalFiles: allFiles.length,
      done:       0, failed: 0, duplicates: dupCount,
      status:     'uploading',
      startedAt:  new Date(),
    });
    reset(); onClose();

    // Background upload
    let done = 0, failed = 0;
    const queue = newFiles.map((f, i) => ({ file: f, hash: newHashes[i] }));
    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift(); if (!item) break;
        try {
          const key = `${BULK_PREFIX}/${organizationId}/${crypto.randomUUID()}-${sanitize(item.file.name)}`;
          const { error: se } = await supabase.storage.from(BUCKET).upload(key, item.file, { cacheControl: '3600', upsert: false });
          if (se) throw se;
          const { error: de } = await supabase.from('hr_resume_files').insert({
            organization_id: organizationId, uploaded_by: user?.id ?? null,
            file_name: item.file.name, file_size: item.file.size,
            mime_type: item.file.type || guessMime(item.file.name),
            file_hash: item.hash, storage_path: key,
            parse_status: 'pending', ai_status: 'pending', ingest_status: 'pending',
          });
          if (de && !de.message?.includes('unique') && !de.code?.includes('23505')) throw de;
          done++;
        } catch { failed++; }
        updateJob(jobId, { done, failed });
      }
    };
    await Promise.all(Array(CONCURRENCY).fill(null).map(() => worker()));
    updateJob(jobId, { done, failed, status: 'done' });
    if (done > 0)   toast.success(`${done} files queued for AI processing`);
    if (failed > 0) toast.warning(`${failed} files failed to upload`);
  }, [allFiles, allHashes, dupCount, organizationId, user, addJob, updateJob, onClose]);

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} style={{
      content: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%',
        transform: 'translate(-50%,-50%)', width: '92%', maxWidth: 500,
        padding: 0, border: 'none', borderRadius: 18, boxShadow: '0 24px 80px rgba(0,0,0,0.22)' },
      overlay: { backgroundColor: 'rgba(17,12,46,0.55)', zIndex: 9999, backdropFilter: 'blur(4px)' },
    }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#4C1D95,#6D28D9)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Bulk Resume Upload</h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: '2px 0 0' }}>Uploads run in background — drag the progress window anywhere</p>
        </div>
        <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 7, padding: 6, cursor: 'pointer', color: '#fff', display: 'flex' }}><X size={14} /></button>
      </div>

      <div style={{ padding: 20, background: '#faf9fb' }}>
        {/* Info banner */}
        <div style={{ display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 14, background: 'linear-gradient(135deg,#ECFDF5,#F0FDF4)', border: '0.5px solid #6EE7B7', borderRadius: 10 }}>
          <Zap size={14} style={{ color: '#059669', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: '#059669', margin: 0 }}>
            <strong style={{ color: '#065F46' }}>Upload and go.</strong> Click Upload → modal closes → a <strong>draggable floating window</strong> tracks every file. Navigate freely while thousands of files upload.
          </p>
        </div>

        {/* Idle */}
        {phase === 'idle' && (
          <label
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); processFiles(Array.from(e.dataTransfer.files)); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '36px 24px',
              border: `2px dashed ${dragging ? ACCENT : '#C4B5FD'}`, borderRadius: 14,
              background: dragging ? '#EDE9FE' : '#fff', cursor: 'pointer', transition: 'all .2s ease' }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UploadCloud size={24} style={{ color: ACCENT }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>Drop resumes here or click to browse</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>PDF · DOCX · DOC · Any quantity · Duplicates skipped</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc" multiple style={{ display: 'none' }}
              onChange={e => processFiles(Array.from(e.target.files || []))} />
          </label>
        )}

        {/* Hashing / checking */}
        {(phase === 'hashing' || phase === 'checking') && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Loader2 size={32} style={{ color: ACCENT, animation: 'spin 1s linear infinite', margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>
              {phase === 'hashing' ? 'Computing fingerprints…' : 'Checking for duplicates…'}
            </p>
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>
              {allFiles.length.toLocaleString()} files · takes a few seconds
            </p>
          </div>
        )}

        {/* Confirming */}
        {phase === 'confirming' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
              {[
                { l: 'Selected',      v: allFiles.length, c: '#6b647a' },
                { l: 'Already in DB', v: dupCount,         c: '#D97706' },
                { l: 'Will upload',   v: newCount,         c: '#059669' },
              ].map(s => (
                <div key={s.l} style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.c }}>{s.v.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: '#8b8499', marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {newCount === 0 ? (
              <div style={{ textAlign: 'center', padding: 14, background: '#ECFDF5', borderRadius: 10, border: '1px solid #6EE7B7' }}>
                <CheckCircle size={18} style={{ color: '#059669', display: 'block', margin: '0 auto 4px' }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#065F46', margin: 0 }}>All files already in database</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, padding: '9px 12px', background: '#EDE9FE', borderRadius: 10, marginBottom: 12 }}>
                  <FileText size={14} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 11, color: '#5B21B6', margin: 0 }}>
                    A <strong>draggable progress window</strong> will appear — drag it anywhere on your screen and keep working
                  </p>
                </div>
                <button onClick={startUpload} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg,#6D28D9,${ACCENT})`, color: '#fff', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: `0 4px 16px ${ACCENT}40` }}>
                  <UploadCloud size={14} />
                  Upload {newCount.toLocaleString()} file{newCount !== 1 ? 's' : ''} in background
                  <ChevronRight size={14} />
                </button>
                <button onClick={reset} style={{ width: '100%', marginTop: 8, padding: 9, borderRadius: 8,
                  border: '1px solid #ece9f0', background: 'transparent', color: '#8b8499', fontSize: 11, cursor: 'pointer' }}>
                  Choose different files
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </Modal>
  );
};

export default BulkUploadV2Modal;