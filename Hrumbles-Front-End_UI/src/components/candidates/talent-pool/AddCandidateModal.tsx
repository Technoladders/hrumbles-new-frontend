// src/components/candidates/talent-pool/AddCandidateModal.tsx
//
// BULK TAB — Smart mode:
//   ≤ 20 files  → "Instant" mode: processes each file immediately via edge function,
//                 shows live per-file results (pass/fail) before closing.
//   > 20 files  → "Background" mode: hash-dedup check → confirm → background upload
//                 via DraggableUploadFloat. Modal closes immediately.
//
// Single upload and paste tabs are UNCHANGED from original.

import React, { useState, useCallback, FC } from 'react';
import Modal from 'react-modal';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import mammoth from 'mammoth';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X, Upload, Zap, AlignLeft, UploadCloud, AlertCircle,
  CheckCircle, XCircle, Loader2, ChevronRight,
} from 'lucide-react';
import { useUploadFloat } from './DraggableUploadFloat';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCandidateAdded: () => void;
}
type Tab = 'paste' | 'single' | 'bulk';

// Instant mode (≤20 files)
interface InstantResult {
  fileName: string;
  status: 'success' | 'skipped' | 'failed';
  message: string;
}

// Background mode (>20 files)
type BulkPhase = 'idle' | 'hashing' | 'checking' | 'confirming';

// ─── Constants ──────────────────────────────────────────────────────────────────
const BUCKET      = 'talent-pool-resumes';
const BULK_PREFIX = 'bulk';
const INSTANT_MAX = 20;   // files below this threshold use instant AI processing
const CONCURRENCY = 6;
const HASH_BATCH  = 20;

// ─── Helpers ────────────────────────────────────────────────────────────────────
const sanitize = (n: string) => n.replace(/[\[\]\+\s]+/g, '_');

const base64ToBlob = (b64: string, mime: string): Blob => {
  const CHUNK = 8192; const chunks: Uint8Array[] = [];
  const raw = atob(b64);
  for (let i = 0; i < raw.length; i += CHUNK) {
    const s = raw.slice(i, i + CHUNK);
    const b = new Uint8Array(s.length);
    for (let j = 0; j < s.length; j++) b[j] = s.charCodeAt(j);
    chunks.push(b);
  }
  return new Blob(chunks, { type: mime });
};

async function sha256(file: File): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function guessMime(name: string): string {
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'pdf')  return 'application/pdf';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'doc')  return 'application/msword';
  return 'application/octet-stream';
}

// ─── Component ─────────────────────────────────────────────────────────────────
const AddCandidateModal: FC<AddCandidateModalProps> = ({ isOpen, onClose, onCandidateAdded }) => {
  const [tab,       setTab]       = useState<Tab>('single');
  const [resumeText, setResumeText] = useState('');
  const [isLoading,  setIsLoading]  = useState(false);

  // ── Instant bulk state (≤20) ────────────────────────────────────────────────
  const [instantResults,   setInstantResults]   = useState<InstantResult[]>([]);
  const [instantProgress,  setInstantProgress]  = useState(0);
  const [isInstantRunning, setIsInstantRunning] = useState(false);
  const [instantDone,      setInstantDone]      = useState(false);

  // ── Background bulk state (>20) ─────────────────────────────────────────────
  const [bulkPhase,  setBulkPhase]  = useState<BulkPhase>('idle');
  const [bulkFiles,  setBulkFiles]  = useState<File[]>([]);
  const [bulkHashes, setBulkHashes] = useState<string[]>([]);
  const [dupCount,   setDupCount]   = useState(0);
  const [newCount,   setNewCount]   = useState(0);

  const user           = useSelector((s: any) => s.auth.user);
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const { addJob, updateJob } = useUploadFloat();

  // ── Parse a single file to text ─────────────────────────────────────────────
  const parseFileToText = async (file: File): Promise<{ text: string; compressedBlob: Blob }> => {
    if (file.type === 'application/pdf') {
      const { data, error } = await supabase.functions.invoke('talent-pool-parser', { body: file });
      if (error) throw new Error(`PDF parse error: ${error.message}`);
      if (!data?.text) throw new Error('Parser returned no text.');
      return { text: data.text, compressedBlob: base64ToBlob(data.compressedBase64, 'application/pdf') };
    }
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const ab = await file.arrayBuffer();
      const r  = await mammoth.extractRawText({ arrayBuffer: ab });
      return { text: r.value, compressedBlob: new Blob([ab], { type: file.type }) };
    }
    throw new Error('Unsupported file type. Use PDF or DOCX.');
  };

  // ── Call the AI edge function and save ──────────────────────────────────────
  const analyseAndSave = async (text: string, blob?: Blob, name?: string) => {
    let resumePath: string | null = null;
    if (blob && name) {
      const key = `${uuidv4()}-${sanitize(name)}`;
      const { data, error } = await supabase.storage.from(BUCKET).upload(key, blob, { cacheControl: '3600', upsert: false });
      if (!error) resumePath = supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
    }
    const { data, error } = await supabase.functions.invoke('talent-analyse-resume', {
      body: { resumeText: text, organizationId, userId: user.id, resumePath },
    });
    if (error) {
      let msg = error.message || 'Unknown error';
      try {
        if (error.context?.json) { const b = await error.context.json(); msg = b?.error || b?.message || msg; }
      } catch {}
      if (msg.includes('unsupported Unicode')) msg = 'Resume has invalid characters — try a clean PDF/DOCX.';
      if (msg.includes('SKIPPED_NO_EMAIL') || msg.includes('email')) msg = 'No email address found in resume.';
      throw new Error(msg);
    }
    if (!data) throw new Error('No response from analysis service.');
    return data;
  };

  // ── HANDLER: Single file ─────────────────────────────────────────────────────
  const handleSingle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsLoading(true);
    toast.promise(
      (async () => {
        const { text, compressedBlob } = await parseFileToText(file);
        const { status } = await analyseAndSave(text, compressedBlob, file.name);
        if (status === 'INSERTED' || status === 'UPDATED') { onCandidateAdded(); return `Profile ${status.toLowerCase()} successfully!`; }
        if (status === 'SKIPPED_RECENT') { onClose(); return 'Already exists and updated recently.'; }
      })(),
      { loading: 'Reading resume…', success: m => m as string, error: e => (e as Error).message, finally: () => setIsLoading(false) }
    );
  };

  // ── HANDLER: Paste ───────────────────────────────────────────────────────────
  const handlePaste = async () => {
    if (!resumeText.trim()) return toast.error('Resume text is empty.');
    setIsLoading(true);
    toast.promise(
      (async () => {
        const { status } = await analyseAndSave(resumeText);
        if (status === 'INSERTED' || status === 'UPDATED') { onCandidateAdded(); return `Profile ${status.toLowerCase()} successfully!`; }
        if (status === 'SKIPPED_RECENT') { onClose(); return 'Already exists.'; }
      })(),
      { loading: 'Analysing…', success: m => m as string, error: e => (e as Error).message, finally: () => setIsLoading(false) }
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // BULK — File picker: decides which mode to use based on file count
  // ════════════════════════════════════════════════════════════════════════════
  const handleBulkFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f =>
      /\.(pdf|docx|doc)$/i.test(f.name) ||
      ['application/pdf',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'application/msword'].includes(f.type)
    );
    if (!files.length) { toast.error('No valid files. Accepted: PDF, DOCX, DOC'); return; }

    if (files.length <= INSTANT_MAX) {
      // ── Instant mode: AI processes each file right now ──────────────────────
      await runInstantBulk(files);
    } else {
      // ── Background mode: hash check → confirm → float ───────────────────────
      await startBackgroundFlow(files);
    }
  }, [organizationId, user]);

  // ════════════════════════════════════════════════════════════════════════════
  // INSTANT MODE (≤20 files) — same as old bulk upload
  // ════════════════════════════════════════════════════════════════════════════
  const runInstantBulk = async (files: File[]) => {
    setIsInstantRunning(true);
    setInstantDone(false);
    setInstantResults([]);
    setInstantProgress(0);

    const results: InstantResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const { text, compressedBlob } = await parseFileToText(file);
        const { status, profile } = await analyseAndSave(text, compressedBlob, file.name);
        const name = profile?.candidate_name || file.name;

        if (status === 'INSERTED') {
          results.push({ fileName: file.name, status: 'success', message: `${name} — Added to talent pool` });
        } else if (status === 'UPDATED') {
          results.push({ fileName: file.name, status: 'success', message: `${name} — Profile updated` });
        } else if (status === 'SKIPPED_RECENT') {
          results.push({ fileName: file.name, status: 'skipped', message: `${name} — Already in pool (added recently)` });
        } else {
          results.push({ fileName: file.name, status: 'skipped', message: `${name} — ${status}` });
        }
      } catch (err: any) {
        const msg = (err.message || 'Processing failed');
        results.push({ fileName: file.name, status: 'failed', message: msg.length > 150 ? msg.slice(0, 147) + '…' : msg });
      }

      setInstantProgress(Math.round(((i + 1) / files.length) * 100));
      setInstantResults([...results]);
    }

    setIsInstantRunning(false);
    setInstantDone(true);

    const ok   = results.filter(r => r.status === 'success').length;
    const skip = results.filter(r => r.status === 'skipped').length;
    const fail = results.filter(r => r.status === 'failed').length;
    toast.success(`Done — ${ok} added${skip ? `, ${skip} skipped` : ''}${fail ? `, ${fail} failed` : ''}`);
    onCandidateAdded();   // refetch the table in the background
  };

  // ════════════════════════════════════════════════════════════════════════════
  // BACKGROUND MODE (>20 files) — hash dedup → confirm → float upload
  // ════════════════════════════════════════════════════════════════════════════
  const startBackgroundFlow = async (files: File[]) => {
    setBulkFiles(files);
    setBulkPhase('hashing');

    const hashes: string[] = new Array(files.length).fill('');
    for (let i = 0; i < files.length; i += HASH_BATCH) {
      const batch = await Promise.all(files.slice(i, i + HASH_BATCH).map(sha256));
      batch.forEach((h, j) => { hashes[i + j] = h; });
    }
    setBulkHashes(hashes);

    setBulkPhase('checking');
    const existing = new Set<string>();
    try {
      for (let i = 0; i < hashes.length; i += 1000) {
        const { data } = await supabase.rpc('check_resume_hashes_bulk', {
          p_hashes: hashes.slice(i, i + 1000), p_org_id: organizationId,
        });
        (data || []).forEach((h: string) => existing.add(h));
      }
    } catch { toast.warning('Could not check for duplicates — will upload all files'); }

    const dups = hashes.filter(h => existing.has(h)).length;
    setDupCount(dups);
    setNewCount(files.length - dups);
    setBulkPhase('confirming');
  };

  const handleBackgroundStart = useCallback(async () => {
    // Re-check duplicates at confirm time
    const existing = new Set<string>();
    try {
      for (let i = 0; i < bulkHashes.length; i += 1000) {
        const { data } = await supabase.rpc('check_resume_hashes_bulk', {
          p_hashes: bulkHashes.slice(i, i + 1000), p_org_id: organizationId,
        });
        (data || []).forEach((h: string) => existing.add(h));
      }
    } catch {}

    const newFiles  = bulkFiles.filter((_, i) => !existing.has(bulkHashes[i]));
    const newHashes = bulkHashes.filter(h => !existing.has(h));

    if (!newFiles.length) {
      toast.info('All selected files are already in your talent pool.');
      resetBulk(); return;
    }

    const jobId = crypto.randomUUID();
    addJob({
      id:         jobId,
      fileName:   newFiles.length === 1 ? newFiles[0].name : `${bulkFiles.length} resumes`,
      totalFiles: bulkFiles.length,
      done:       0, failed: 0, duplicates: dupCount,
      status:     'uploading',
      startedAt:  new Date(),
    });

    handleClose();

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
            organization_id: organizationId,
            uploaded_by:     user?.id ?? null,
            file_name:       item.file.name,
            file_size:       item.file.size,
            mime_type:       item.file.type || guessMime(item.file.name),
            file_hash:       item.hash,
            storage_path:    key,
            parse_status:    'pending',
            ai_status:       'pending',
            ingest_status:   'pending',
          });
          if (de && !de.message?.includes('unique') && !de.code?.includes('23505')) throw de;
          done++;
        } catch { failed++; }
        updateJob(jobId, { done, failed });
      }
    };

    await Promise.all(Array(CONCURRENCY).fill(null).map(() => worker()));
    updateJob(jobId, { done, failed, status: 'done' });
    if (done > 0)   toast.success(`${done} resumes queued — candidates will be added automatically.`);
    if (failed > 0) toast.warning(`${failed} files could not be uploaded.`);
  }, [bulkFiles, bulkHashes, dupCount, organizationId, user, addJob, updateJob]);

  // ── Reset bulk state ─────────────────────────────────────────────────────────
  const resetBulk = () => {
    setBulkPhase('idle');
    setBulkFiles([]); setBulkHashes([]);
    setDupCount(0); setNewCount(0);
    setInstantResults([]); setInstantProgress(0);
    setIsInstantRunning(false); setInstantDone(false);
  };

  const handleClose = () => {
    setResumeText('');
    setTab('single');
    resetBulk();
    onClose();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'single', label: 'Single Upload', icon: <Zap size={13}/> },
    { id: 'paste',  label: 'Paste Text',    icon: <AlignLeft size={13}/> },
    { id: 'bulk',   label: 'Bulk Upload',   icon: <UploadCloud size={13}/> },
  ];

  const isBulkBusy = isInstantRunning || bulkPhase === 'hashing' || bulkPhase === 'checking';

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose}
      style={{
        content: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%',
          transform: 'translate(-50%,-50%)', width: '92%', maxWidth: 620, maxHeight: '90vh',
          padding: 0, border: 'none', borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
        overlay: { backgroundColor: 'rgba(17,12,46,0.55)', zIndex: 9999, backdropFilter: 'blur(3px)' },
      }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#4C1D95,#6D28D9,#7C3AED)', padding: '18px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Add to Talent Pool</h2>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: '2px 0 0' }}>Upload resumes to build your candidate pipeline</p>
          </div>
          <button onClick={handleClose} disabled={isBulkBusy}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 7, padding: 6, cursor: isBulkBusy ? 'not-allowed' : 'pointer', display: 'flex', color: '#fff', opacity: isBulkBusy ? 0.5 : 1 }}>
            <X size={14}/>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id}
              onClick={() => { if (!isBulkBusy) { setTab(t.id); if (t.id !== 'bulk') resetBulk(); } }}
              disabled={isBulkBusy}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px',
                border: 'none', cursor: isBulkBusy ? 'not-allowed' : 'pointer', borderRadius: '8px 8px 0 0',
                fontSize: 12, fontWeight: 600,
                background: tab === t.id ? '#fff' : 'rgba(255,255,255,0.08)',
                color: tab === t.id ? '#6D28D9' : 'rgba(255,255,255,0.75)',
                opacity: isBulkBusy && tab !== t.id ? 0.5 : 1 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#FAFAFA' }}>

        {/* ── SINGLE TAB ── */}
        {tab === 'single' && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 16, background: 'linear-gradient(135deg,#EDE9FE,#F5F3FF)', border: '0.5px solid #C4B5FD', borderRadius: 10 }}>
              <Zap size={16} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 1 }}/>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#5B21B6', margin: 0 }}>Instant result — candidate added right away</p>
                <p style={{ fontSize: 11, color: '#7C3AED', margin: '2px 0 0' }}>Best for one resume. AI reads it while you wait.</p>
              </div>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 28, border: '1.5px dashed #C4B5FD', borderRadius: 12, background: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
              {isLoading
                ? <Loader2 size={28} style={{ color: '#7C3AED', animation: 'spin 1s linear infinite' }}/>
                : <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Upload size={20} style={{ color: '#7C3AED' }}/></div>}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>{isLoading ? 'Reading resume…' : 'Drop resume here or click to browse'}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>PDF or DOCX · Processed automatically</p>
              </div>
              <input type="file" accept=".pdf,.docx" onChange={handleSingle} disabled={isLoading} style={{ display: 'none' }}/>
            </label>
          </div>
        )}

        {/* ── PASTE TAB ── */}
        {tab === 'paste' && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 14, background: 'linear-gradient(135deg,#EDE9FE,#F5F3FF)', border: '0.5px solid #C4B5FD', borderRadius: 10 }}>
              <AlignLeft size={16} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 1 }}/>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#5B21B6', margin: 0 }}>Paste resume text — instant result</p>
                <p style={{ fontSize: 11, color: '#7C3AED', margin: '2px 0 0' }}>Copy and paste the resume, we'll extract the profile automatically.</p>
              </div>
            </div>
            <textarea placeholder="Paste the full resume text here…" value={resumeText}
              onChange={e => setResumeText(e.target.value)} disabled={isLoading}
              style={{ width: '100%', height: 220, padding: 12, resize: 'vertical', border: '0.5px solid #D1D5DB', borderRadius: 10, fontSize: 12, color: '#374151', background: '#fff', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }} />
          </div>
        )}

        {/* ── BULK TAB ── */}
        {tab === 'bulk' && (
          <div style={{ padding: 20 }}>

            {/* ─ IDLE: file picker ─ */}
            {bulkPhase === 'idle' && !isInstantRunning && !instantDone && (
              <>
                {/* Info */}
                <div style={{ padding: '12px 14px', marginBottom: 14, borderRadius: 12, background: 'linear-gradient(135deg,#ECFDF5,#F0FDF4)', border: '0.5px solid #6EE7B7' }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <UploadCloud size={16} style={{ color: '#059669' }}/>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#065F46', margin: 0 }}>Upload multiple resumes at once</p>
                      <p style={{ fontSize: 11, color: '#059669', margin: '2px 0 0' }}>
                        Up to <strong>20 files</strong> — instant results shown here.<br/>
                        More than 20 — runs in the background so you can keep working.
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {['Select files', 'AI reads each resume', 'Candidates added', 'See results instantly'].map((s, i, arr) => (
                      <React.Fragment key={s}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#fff', borderRadius: 20, border: '0.5px solid #A7F3D0' }}>
                          <div style={{ width: 15, height: 15, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>{i + 1}</span>
                          </div>
                          <span style={{ fontSize: 10, color: '#065F46' }}>{s}</span>
                        </div>
                        {i < arr.length - 1 && <ChevronRight size={10} style={{ color: '#A7F3D0' }}/>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 28, border: '1.5px dashed #A7F3D0', borderRadius: 12, background: '#fff', cursor: 'pointer' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UploadCloud size={22} style={{ color: '#059669' }}/>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>Click to choose resume files</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>PDF, DOCX, DOC · ≤20 files = instant · &gt;20 files = background</p>
                  </div>
                  <input type="file" accept=".pdf,.docx,.doc" onChange={handleBulkFileSelect} multiple style={{ display: 'none' }}/>
                </label>
              </>
            )}

            {/* ─ INSTANT MODE: hashing/checking spinner ─ */}
            {(bulkPhase === 'hashing' || bulkPhase === 'checking') && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Loader2 size={36} style={{ color: '#6D28D9', animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }}/>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>
                  {bulkPhase === 'hashing' ? 'Scanning your files…' : 'Checking for duplicates…'}
                </p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>
                  {bulkPhase === 'hashing' ? `Reading ${bulkFiles.length} files` : 'Comparing with your talent pool'}
                </p>
              </div>
            )}

            {/* ─ BACKGROUND MODE: confirm screen ─ */}
            {bulkPhase === 'confirming' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Files selected',       value: bulkFiles.length, color: '#6b647a', bg: '#f7f5fb' },
                    { label: 'Already in your pool', value: dupCount,          color: '#D97706', bg: '#FFFBEB' },
                    { label: 'New to upload',         value: newCount,          color: '#059669', bg: '#ECFDF5' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}20`, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: '#8b8499', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {newCount === 0 ? (
                  <div style={{ textAlign: 'center', padding: 16, background: '#ECFDF5', borderRadius: 12, border: '1px solid #6EE7B7' }}>
                    <CheckCircle size={22} style={{ color: '#059669', display: 'block', margin: '0 auto 6px' }}/>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#065F46', margin: 0 }}>All files are already in your talent pool</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: '#EDE9FE', borderRadius: 10, marginBottom: 14 }}>
                      <UploadCloud size={14} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 1 }}/>
                      <p style={{ fontSize: 11, color: '#5B21B6', margin: 0 }}>A <strong>small progress window</strong> will appear at the bottom of your screen. You can navigate anywhere while the upload runs.</p>
                    </div>
                    <button onClick={handleBackgroundStart}
                      style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg,#6D28D9,#7C3AED)', color: '#fff', fontSize: 13, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        boxShadow: '0 4px 16px rgba(109,74,255,0.4)' }}>
                      <UploadCloud size={15} />
                      Upload {newCount.toLocaleString()} new resume{newCount !== 1 ? 's' : ''} in the background
                    </button>
                    <button onClick={resetBulk}
                      style={{ width: '100%', marginTop: 8, padding: 9, borderRadius: 8, border: '1px solid #ece9f0', background: 'transparent', color: '#8b8499', fontSize: 11, cursor: 'pointer' }}>
                      Choose different files
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ─ INSTANT MODE: live progress + results ─ */}
            {(isInstantRunning || instantDone) && (
              <div>
                {/* Progress bar — only while running */}
                {isInstantRunning && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        <Loader2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5, color: '#6D28D9', animation: 'spin 1s linear infinite' }}/>
                        Processing {instantResults.length} of {bulkFiles.length} resumes…
                      </span>
                      <span style={{ fontSize: 12, color: '#6D28D9', fontWeight: 700 }}>{instantProgress}%</span>
                    </div>
                    <div style={{ height: 6, background: '#EDE9FE', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${instantProgress}%`, background: 'linear-gradient(90deg,#6D28D9,#7C3AED)', borderRadius: 4, transition: 'width .3s ease' }} />
                    </div>
                  </div>
                )}

                {/* Done banner */}
                {instantDone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 12, background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 10 }}>
                    <CheckCircle size={16} style={{ color: '#059669', flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#065F46', margin: 0 }}>All done!</p>
                      <p style={{ fontSize: 10, color: '#059669', margin: '1px 0 0' }}>
                        {instantResults.filter(r => r.status === 'success').length} added ·{' '}
                        {instantResults.filter(r => r.status === 'skipped').length} skipped ·{' '}
                        {instantResults.filter(r => r.status === 'failed').length} failed
                      </p>
                    </div>
                    <button onClick={resetBulk}
                      style={{ fontSize: 10, color: '#059669', background: 'none', border: '1px solid #6EE7B7', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                      Upload more
                    </button>
                  </div>
                )}

                {/* Per-file results list */}
                <div style={{ maxHeight: 280, overflowY: 'auto', borderRadius: 10, border: '1px solid #ece9f0', background: '#fff' }}>
                  {instantResults.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderBottom: '1px solid #f7f5fb' }}>
                      <div style={{ flexShrink: 0, marginTop: 1 }}>
                        {r.status === 'success' && <CheckCircle size={14} style={{ color: '#059669' }}/>}
                        {r.status === 'skipped' && <AlertCircle size={14} style={{ color: '#D97706' }}/>}
                        {r.status === 'failed'  && <XCircle     size={14} style={{ color: '#DC2626' }}/>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.fileName}
                        </p>
                        <p style={{ fontSize: 10, color: r.status === 'failed' ? '#DC2626' : r.status === 'skipped' ? '#D97706' : '#059669', margin: '2px 0 0' }}>
                          {r.message}
                        </p>
                      </div>
                    </div>
                  ))}
                  {/* Pending files while running */}
                  {isInstantRunning && Array.from({ length: bulkFiles.length - instantResults.length }).map((_, i) => (
                    <div key={`pending-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid #f7f5fb', opacity: 0.4 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#ece9f0', flexShrink: 0 }}/>
                      <div style={{ height: 10, background: '#f0edf5', borderRadius: 4, flex: 1 }}/>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '0.5px solid #E5E7EB', background: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
        {tab === 'bulk' && instantDone ? (
          <button onClick={handleClose}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6D28D9,#7C3AED)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Close
          </button>
        ) : (
          <>
            <button onClick={handleClose} disabled={isBulkBusy}
              style={{ padding: '8px 16px', borderRadius: 8, border: '0.5px solid #D1D5DB', background: '#fff', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: isBulkBusy ? 'not-allowed' : 'pointer', opacity: isBulkBusy ? 0.5 : 1 }}>
              {isBulkBusy ? 'Processing…' : 'Close'}
            </button>
            {tab === 'paste' && (
              <button onClick={handlePaste} disabled={isLoading || !resumeText.trim()}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: isLoading || !resumeText.trim() ? '#E9D5FF' : 'linear-gradient(135deg,#6D28D9,#7C3AED)',
                  color: '#fff', fontSize: 12, fontWeight: 700 }}>
                {isLoading ? 'Reading…' : 'Analyse & Save'}
              </button>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
};

export default AddCandidateModal;