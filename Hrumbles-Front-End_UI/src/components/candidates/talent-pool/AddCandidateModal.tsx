// src/components/candidates/talent-pool/AddCandidateModal.tsx
// BULK TAB ONLY CHANGE: triggers UploadSessionManager instead of handling upload inline.
// Single upload and paste tabs are UNCHANGED.
// The floating UploadProgressFloat widget (mounted at App root) handles all progress display.

import React, { useState, FC } from 'react';
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
  CheckCircle, XCircle, Loader2, FileCheck, ChevronRight,
} from 'lucide-react';
import { uploadManager } from '@/lib/UploadSessionManager';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCandidateAdded: () => void;
}
type Tab = 'paste' | 'single' | 'bulk';

// ─── Helpers (unchanged) ───────────────────────────────────────────────────────
const BUCKET   = 'talent-pool-resumes';
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

// ─── Component ─────────────────────────────────────────────────────────────────
const AddCandidateModal: FC<AddCandidateModalProps> = ({ isOpen, onClose, onCandidateAdded }) => {
  const [tab,        setTab]        = useState<Tab>('single');
  const [resumeText, setResumeText] = useState('');
  const [isLoading,  setIsLoading]  = useState(false);

  const user           = useSelector((s: any) => s.auth.user);
  const organizationId = useSelector((s: any) => s.auth.organization_id);

  // ── Parse single file (unchanged) ─────────────────────────────────────────
  const parseSingleFile = async (file: File): Promise<{ text: string; compressedBlob: Blob }> => {
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

  // ── Analyse + save single (unchanged) ─────────────────────────────────────
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
      try { const b = await error.context?.json?.(); msg = b?.error || msg; } catch {}
      throw new Error(msg);
    }
    if (!data) throw new Error('No response from analysis service.');
    return data;
  };

  // ── HANDLER: Single file (unchanged) ──────────────────────────────────────
  const handleSingle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsLoading(true);
    toast.promise(
      (async () => {
        const { text, compressedBlob } = await parseSingleFile(file);
        const { status } = await analyseAndSave(text, compressedBlob, file.name);
        if (status === 'INSERTED' || status === 'UPDATED') { onCandidateAdded(); return `Profile ${status.toLowerCase()} successfully!`; }
        if (status === 'SKIPPED_RECENT') { onClose(); return 'Already exists and updated recently.'; }
      })(),
      { loading: 'Parsing & analysing…', success: m => m as string, error: e => (e as Error).message, finally: () => setIsLoading(false) }
    );
  };

  // ── HANDLER: Paste (unchanged) ────────────────────────────────────────────
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

  // ── HANDLER: Bulk — NEW: delegates entirely to UploadSessionManager ────────
  // The modal closes immediately. UploadProgressFloat (at App root) handles everything.
  const handleBulk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    if (uploadManager.isActive) {
      toast.error('An upload is already in progress. Wait for it to complete or cancel it.');
      return;
    }

    const fileArr = Array.from(files);
    toast.info(`Starting background upload of ${fileArr.length} file${fileArr.length !== 1 ? 's' : ''}. You can close this modal and continue working.`);

    // Close modal immediately — upload continues in background
    onClose();

    // Start session async (don't await — let it run in background)
    uploadManager.startSession(fileArr, organizationId, user.id).catch(err => {
      toast.error(`Upload failed to start: ${err.message}`);
    });
  };

  const handleClose = () => {
    setResumeText(''); setTab('single');
    onClose();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'single', label: 'Single Upload', icon: <Zap size={13}/> },
    { id: 'paste',  label: 'Paste Text',   icon: <AlignLeft size={13}/> },
    { id: 'bulk',   label: 'Bulk Upload',  icon: <UploadCloud size={13}/> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      style={{
        content: {
          top: '50%', left: '50%', right: 'auto', bottom: 'auto',
          marginRight: '-50%', transform: 'translate(-50%,-50%)',
          width: '92%', maxWidth: 600, maxHeight: '90vh',
          padding: 0, border: 'none', borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        },
        overlay: { backgroundColor: 'rgba(17,12,46,0.55)', zIndex: 9999, backdropFilter: 'blur(3px)' },
      }}
    >
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#4C1D95,#6D28D9,#7C3AED)', padding: '18px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Add to Talent Pool</h2>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: '2px 0 0' }}>Upload resumes to build your candidate pipeline</p>
          </div>
          <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 7, padding: 6, cursor: 'pointer', display: 'flex', color: '#fff' }}>
            <X size={14}/>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px',
              border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0',
              fontSize: 12, fontWeight: 600,
              background: tab === t.id ? '#fff' : 'rgba(255,255,255,0.08)',
              color: tab === t.id ? '#6D28D9' : 'rgba(255,255,255,0.75)',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#FAFAFA' }}>

        {/* ── SINGLE TAB (unchanged) ── */}
        {tab === 'single' && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 16, background: 'linear-gradient(135deg,#EDE9FE,#F5F3FF)', border: '0.5px solid #C4B5FD', borderRadius: 10 }}>
              <Zap size={16} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 1 }}/>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#5B21B6', margin: 0 }}>Instant result — candidate added immediately</p>
                <p style={{ fontSize: 11, color: '#7C3AED', margin: '2px 0 0' }}>Best for single file. AI analyses right now while you wait.</p>
              </div>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 28, border: '1.5px dashed #C4B5FD', borderRadius: 12, background: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
              {isLoading ? <Loader2 size={28} style={{ color: '#7C3AED', animation: 'spin 1s linear infinite' }}/> : (
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={20} style={{ color: '#7C3AED' }}/>
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>{isLoading ? 'Processing…' : 'Drop resume here or click to browse'}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>PDF or DOCX · Compressed automatically</p>
              </div>
              <input type="file" accept=".pdf,.docx" onChange={handleSingle} disabled={isLoading} style={{ display: 'none' }}/>
            </label>
          </div>
        )}

        {/* ── PASTE TAB (unchanged) ── */}
        {tab === 'paste' && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 14, background: 'linear-gradient(135deg,#EDE9FE,#F5F3FF)', border: '0.5px solid #C4B5FD', borderRadius: 10 }}>
              <AlignLeft size={16} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 1 }}/>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#5B21B6', margin: 0 }}>Paste resume text — instant result</p>
                <p style={{ fontSize: 11, color: '#7C3AED', margin: '2px 0 0' }}>AI extracts and saves the profile immediately.</p>
              </div>
            </div>
            <textarea
              placeholder="Paste the full resume text here…"
              value={resumeText} onChange={e => setResumeText(e.target.value)}
              disabled={isLoading}
              style={{ width: '100%', height: 220, padding: 12, resize: 'vertical', border: '0.5px solid #D1D5DB', borderRadius: 10, fontSize: 12, color: '#374151', background: '#fff', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }}
            />
          </div>
        )}

        {/* ── BULK TAB — NEW simplified UI ── */}
        {tab === 'bulk' && (
          <div style={{ padding: 20 }}>
            {/* Hero card */}
            <div style={{ padding: 16, marginBottom: 14, borderRadius: 12, background: 'linear-gradient(135deg,#ECFDF5,#F0FDF4)', border: '0.5px solid #6EE7B7' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UploadCloud size={16} style={{ color: '#059669' }}/>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#065F46', margin: 0 }}>Batch processing</p>
                  {/* <p style={{ fontSize: 11, color: '#059669', margin: '2px 0 0' }}>
                    Even if you refresh, close the tab, or restart your computer — the upload resumes automatically from where it stopped.
                  </p> */}
                </div>
              </div>
              {/* Steps */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', gap: 2 } as any}>
                {['Select files','Files stored','AI analyses & Candidates added automatically'].map((s, i, arr) => (
                  <React.Fragment key={s}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#fff', borderRadius: 20, border: '0.5px solid #A7F3D0' }}>
                      <div style={{ width: 15, height: 15, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>{i+1}</span>
                      </div>
                      <span style={{ fontSize: 10, color: '#065F46' }}>{s}</span>
                    </div>
                    {i < arr.length-1 && <ChevronRight size={10} style={{ color: '#A7F3D0' }}/>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Features */}
            {/* <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
              {[
                { icon: '🔄', text: 'Auto-resumes if interrupted' },
                { icon: '🚫', text: 'Duplicate files auto-skipped' },
                { icon: '📊', text: 'Real-time progress tracker' },
                { icon: '🔒', text: 'Safe to close modal instantly' },
              ].map(f => (
                <div key={f.text} style={{ display: 'flex', gap: 6, padding: '6px 9px', background: '#fff', borderRadius: 8, border: '0.5px solid #E5E7EB', fontSize: 11, color: '#374151', alignItems: 'center' }}>
                  <span style={{ fontSize: 14 }}>{f.icon}</span>{f.text}
                </div>
              ))}
            </div> */}

            {/* Tip for small uploads */}
            <div style={{ display: 'flex', gap: 7, padding: '8px 12px', marginBottom: 14, background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: 9 }}>
              <AlertCircle size={13} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }}/>
              <p style={{ fontSize: 11, color: '#92400E', margin: 0 }}>
                <strong>Tip:</strong> For fewer than 5 files, use <strong>Single Upload</strong> for instant results.
              </p>
            </div>

            {/* File picker */}
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 24, border: '1.5px dashed #A7F3D0', borderRadius: 12, background: '#fff', cursor: 'pointer' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UploadCloud size={18} style={{ color: '#059669' }}/>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>Select files to start background upload</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>PDF or DOCX · Modal closes immediately · Progress shown in floating tracker</p>
              </div>
              <input type="file" accept=".pdf,.docx" onChange={handleBulk} multiple style={{ display: 'none' }}/>
            </label>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '0.5px solid #E5E7EB', background: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
        <button onClick={handleClose} disabled={isLoading} style={{ padding: '8px 16px', borderRadius: 8, border: '0.5px solid #D1D5DB', background: '#fff', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
        {tab === 'paste' && (
          <button onClick={handlePaste} disabled={isLoading || !resumeText.trim()} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: isLoading || !resumeText.trim() ? '#E9D5FF' : 'linear-gradient(135deg,#6D28D9,#7C3AED)', color: '#fff', fontSize: 12, fontWeight: 700 }}>
            {isLoading ? 'Analysing…' : 'Analyse & Save'}
          </button>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
};

export default AddCandidateModal;