// src/components/candidates/talent-pool/AddCandidateModal.tsx
// Redesigned with Hrumbles purple theme + clear UX guidance for batch vs single

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
  X, Upload, FileText, Zap, Clock, CheckCircle, XCircle,
  AlertCircle, Loader2, FileCheck, ChevronRight, Users,
  UploadCloud, AlignLeft, Info,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCandidateAdded: () => void;
}
interface BulkResult {
  fileName: string;
  status: 'uploading' | 'success' | 'failed' | 'skipped';
  message: string;
}
interface BatchItem {
  fileName: string;
  resumeText: string;
  resumePath: string | null;
}

const BUCKET = 'talent-pool-resumes';
type Tab = 'paste' | 'single' | 'bulk';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Component ────────────────────────────────────────────────────────────────
const AddCandidateModal: FC<AddCandidateModalProps> = ({ isOpen, onClose, onCandidateAdded }) => {
  const [tab, setTab]                   = useState<Tab>('single');
  const [resumeText, setResumeText]     = useState('');
  const [isLoading, setIsLoading]       = useState(false);
  const [isBulkProc, setIsBulkProc]     = useState(false);
  const [bulkSubmitted, setBulkSubmitted] = useState(false);
  const [bulkResults, setBulkResults]   = useState<BulkResult[]>([]);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkPhase, setBulkPhase]       = useState<'parse' | 'submit' | 'done'>('parse');

  const user           = useSelector((s: any) => s.auth.user);
  const organizationId = useSelector((s: any) => s.auth.organization_id);

  // ── Parse file ──────────────────────────────────────────────────────────────
  const parseFile = async (file: File): Promise<{ text: string; compressedBlob: Blob; mimeType: string }> => {
    if (file.type === 'application/pdf') {
      const { data, error } = await supabase.functions.invoke('talent-pool-parser', { body: file });
      if (error) throw new Error(`PDF parse error: ${error.message}`);
      if (!data?.text) throw new Error('Parser returned no text.');
      return { text: data.text, compressedBlob: base64ToBlob(data.compressedBase64, 'application/pdf'), mimeType: 'application/pdf' };
    }
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const ab = await file.arrayBuffer();
      const r  = await mammoth.extractRawText({ arrayBuffer: ab });
      return { text: r.value, compressedBlob: new Blob([ab], { type: file.type }), mimeType: file.type };
    }
    throw new Error('Unsupported file type. Use PDF or DOCX.');
  };

  // ── Upload to storage ────────────────────────────────────────────────────────
  const uploadFile = async (blob: Blob, name: string): Promise<string | null> => {
    try {
      const key = `${uuidv4()}-${sanitize(name)}`;
      const { data, error } = await supabase.storage.from(BUCKET).upload(key, blob, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      return supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
    } catch { return null; }
  };

  // ── Single / paste analyse ───────────────────────────────────────────────────
  const analyseAndSave = async (text: string, blob?: Blob, name?: string) => {
    const resumePath = (blob && name) ? await uploadFile(blob, name) : null;
    const { data, error } = await supabase.functions.invoke('talent-analyse-resume', {
      body: { resumeText: text, organizationId, userId: user.id, resumePath },
    });
    if (error) {
      let msg = error.message || 'Unknown error';
      try { const b = await error.context?.json?.(); msg = b?.error || msg; } catch {}
      if (msg.includes('SKIPPED_NO_EMAIL') || msg.includes('email')) msg = 'No valid email found in resume.';
      throw new Error(msg);
    }
    if (!data) throw new Error('No response from analysis service.');
    if (data.status === 'SKIPPED_NO_EMAIL') throw new Error('No valid email found in resume.');
    return data;
  };

  // ── HANDLER: Single file ──────────────────────────────────────────────────────
  const handleSingle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsLoading(true);
    toast.promise(
      (async () => {
        const { text, compressedBlob } = await parseFile(file);
        const { status } = await analyseAndSave(text, compressedBlob, file.name);
        if (status === 'INSERTED' || status === 'UPDATED') { onCandidateAdded(); return `Profile ${status.toLowerCase()} successfully!`; }
        if (status === 'SKIPPED_RECENT') { onClose(); return 'Already exists and was updated recently.'; }
      })(),
      { loading: 'Parsing & analysing resume…', success: m => m as string, error: e => (e as Error).message, finally: () => setIsLoading(false) }
    );
  };

  // ── HANDLER: Paste ────────────────────────────────────────────────────────────
  const handlePaste = async () => {
    if (!resumeText.trim()) return toast.error('Resume text is empty.');
    setIsLoading(true);
    toast.promise(
      (async () => {
        const { status } = await analyseAndSave(resumeText);
        if (status === 'INSERTED' || status === 'UPDATED') { onCandidateAdded(); return `Profile ${status.toLowerCase()} successfully!`; }
        if (status === 'SKIPPED_RECENT') { onClose(); return 'Already exists and was updated recently.'; }
      })(),
      { loading: 'Analysing resume…', success: m => m as string, error: e => (e as Error).message, finally: () => setIsLoading(false) }
    );
  };

  // ── HANDLER: Bulk ─────────────────────────────────────────────────────────────
  const handleBulk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return;
    setIsLoading(true); setIsBulkProc(true); setBulkSubmitted(false);
    setBulkResults([]); setBulkProgress(0); setBulkPhase('parse');

    const results: BulkResult[] = [];
    const items: BatchItem[]    = [];

    // Phase 1: parse + upload
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      results.push({ fileName: file.name, status: 'uploading', message: 'Parsing & compressing…' });
      setBulkResults([...results]);
      try {
        const { text, compressedBlob } = await parseFile(file);
        const resumePath = await uploadFile(compressedBlob, file.name);
        items.push({ fileName: file.name, resumeText: text, resumePath });
        results[i] = { fileName: file.name, status: 'success', message: resumePath ? 'Compressed & uploaded ✓' : 'Parsed ✓ (storage skipped)' };
      } catch (err: any) {
        results[i] = { fileName: file.name, status: 'failed', message: (err.message || 'Parse failed').slice(0, 100) };
      }
      setBulkProgress(Math.round(((i + 1) / files.length) * 80));
      setBulkResults([...results]);
    }

    if (!items.length) {
      toast.error('No files could be parsed.'); setIsLoading(false); setIsBulkProc(false); return;
    }

    // Phase 2: submit batch
    setBulkPhase('submit'); setBulkProgress(88);
    try {
      const { error } = await supabase.functions.invoke('talent-batch-submit', {
        body: { items, organizationId, userId: user.id },
      });
      if (error) throw new Error(error.message);
      setBulkProgress(100); setBulkPhase('done'); setBulkSubmitted(true);
      items.forEach(item => {
        const idx = results.findIndex(r => r.fileName === item.fileName && r.status === 'success');
        if (idx >= 0) results[idx].message = 'Queued for AI analysis ✓';
      });
      setBulkResults([...results]);
      toast.success(`${items.length} resume${items.length !== 1 ? 's' : ''} queued for background processing.`);
    } catch (err: any) {
      toast.error(`Batch submit failed: ${err.message}`); setBulkPhase('parse');
    }
    setIsLoading(false); setIsBulkProc(false);
  };

  // ── Reset + close ──────────────────────────────────────────────────────────
  const handleClose = () => {
    if (bulkSubmitted) onCandidateAdded(); else onClose();
    setResumeText(''); setBulkResults([]); setBulkProgress(0);
    setBulkSubmitted(false); setIsBulkProc(false); setBulkPhase('parse'); setTab('single');
  };

  const phaseLabel =
    bulkPhase === 'parse'  ? 'Parsing & uploading files…' :
    bulkPhase === 'submit' ? 'Submitting to AI batch queue…' : 'Submitted!';

  // ─── TAB DEFINITIONS ─────────────────────────────────────────────────────────
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
          width: '92%', maxWidth: 640, maxHeight: '92vh',
          padding: 0, border: 'none', borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        },
        overlay: { backgroundColor: 'rgba(17,12,46,0.55)', zIndex: 9999, backdropFilter: 'blur(3px)' },
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #4C1D95, #6D28D9, #7C3AED)',
        padding: '18px 20px 0', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={14} color="#fff"/>
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Add to Talent Pool</h2>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
              Upload resumes to build your candidate pipeline
            </p>
          </div>
          <button onClick={handleClose} style={{
            background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 7,
            padding: 6, cursor: 'pointer', display: 'flex', color: '#fff',
          }}>
            <X size={14}/>
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', border: 'none', cursor: 'pointer',
              borderRadius: '8px 8px 0 0', fontSize: 12, fontWeight: 600,
              background: tab === t.id ? '#fff' : 'rgba(255,255,255,0.08)',
              color: tab === t.id ? '#6D28D9' : 'rgba(255,255,255,0.75)',
              transition: 'all .15s',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#FAFAFA' }}>

        {/* ── SINGLE TAB ── */}
        {tab === 'single' && (
          <div style={{ padding: 20 }}>
            {/* Info banner */}
            <div style={{
              display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 16,
              background: 'linear-gradient(135deg, #EDE9FE, #F5F3FF)',
              border: '0.5px solid #C4B5FD', borderRadius: 10,
            }}>
              <Zap size={16} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 1 }}/>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#5B21B6', margin: 0 }}>
                  Instant result - candidate added immediately
                </p>
                <p style={{ fontSize: 11, color: '#7C3AED', margin: '2px 0 0' }}>
                  Best for single file. AI analyses the resume right now while you wait.
                </p>
              </div>
            </div>

            {/* Upload area */}
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: 28, border: '1.5px dashed #C4B5FD', borderRadius: 12,
              background: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'border-color .2s, background .2s',
            }}
              onMouseEnter={e => { if (!isLoading) { (e.currentTarget as HTMLLabelElement).style.borderColor = '#7C3AED'; (e.currentTarget as HTMLLabelElement).style.background = '#F5F3FF'; }}}
              onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = '#C4B5FD'; (e.currentTarget as HTMLLabelElement).style.background = '#fff'; }}
            >
              {isLoading
                ? <Loader2 size={28} style={{ color: '#7C3AED', animation: 'spin 1s linear infinite' }}/>
                : <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={20} style={{ color: '#7C3AED' }}/>
                  </div>
              }
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>
                  {isLoading ? 'Processing resume…' : 'Drop resume here or click to browse'}
                </p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>PDF or DOCX · Compressed automatically</p>
              </div>
              <input type="file" accept=".pdf,.docx" onChange={handleSingle} disabled={isLoading} style={{ display: 'none' }}/>
            </label>

            {/* Comparison hint */}
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <Info size={11} style={{ color: '#9CA3AF' }}/>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                  Upload mode guide
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { icon: <Zap size={10}/>, label: 'Single Upload', desc: 'Single file · Instant · Waits for result', col: '#7C3AED', bg: '#EDE9FE' },
                  { icon: <UploadCloud size={10}/>, label: 'Bulk Upload', desc: '5+ files · Background · No waiting', col: '#059669', bg: '#ECFDF5' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '7px 9px', borderRadius: 7, background: item.bg, border: `0.5px solid ${item.col}30` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: item.col, marginBottom: 2 }}>
                      {item.icon}
                      <span style={{ fontSize: 10, fontWeight: 700 }}>{item.label}</span>
                    </div>
                    <p style={{ fontSize: 10, color: '#6B7280', margin: 0 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PASTE TAB ── */}
        {tab === 'paste' && (
          <div style={{ padding: 20 }}>
            <div style={{
              display: 'flex', gap: 10, padding: '10px 14px', marginBottom: 14,
              background: 'linear-gradient(135deg, #EDE9FE, #F5F3FF)',
              border: '0.5px solid #C4B5FD', borderRadius: 10,
            }}>
              <AlignLeft size={16} style={{ color: '#7C3AED', flexShrink: 0, marginTop: 1 }}/>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#5B21B6', margin: 0 }}>Paste resume text — instant result</p>
                <p style={{ fontSize: 11, color: '#7C3AED', margin: '2px 0 0' }}>Copy-paste the full resume content below. AI extracts and saves the profile immediately.</p>
              </div>
            </div>
            <textarea
              placeholder="Paste the full resume text here…&#10;&#10;Name, email, phone, work experience, skills, education…"
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              disabled={isLoading}
              style={{
                width: '100%', height: 220, padding: 12, resize: 'vertical',
                border: '0.5px solid #D1D5DB', borderRadius: 10, fontSize: 12,
                color: '#374151', background: '#fff', outline: 'none',
                fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* ── BULK TAB ── */}
        {tab === 'bulk' && (
          <div style={{ padding: 20 }}>
            {/* Hero info card */}
            <div style={{
              padding: 16, marginBottom: 16, borderRadius: 12,
              background: 'linear-gradient(135deg, #ECFDF5, #F0FDF4)',
              border: '0.5px solid #6EE7B7',
            }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UploadCloud size={16} style={{ color: '#059669' }}/>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#065F46', margin: 0 }}>Batch processing</p>
                  <p style={{ fontSize: 11, color: '#059669', margin: '2px 0 0' }}>
                    Best for 5+ files. Closes immediately - candidates appear automatically in talent pool when done.
                  </p>
                </div>
              </div>

              {/* Step pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
                {[
                  { n: '1', label: 'Select files' },
                  { n: '2', label: 'Files compressed & stored securely' },
                  { n: '3', label: 'AI analyses in background' },
                  { n: '4', label: 'Candidates added automatically' },
                ].map((step, i, arr) => (
                  <React.Fragment key={step.n}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', background: '#fff', borderRadius: 20, border: '0.5px solid #A7F3D0' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{step.n}</span>
                      </div>
                      <span style={{ fontSize: 10, color: '#065F46', fontWeight: 500 }}>{step.label}</span>
                    </div>
                    {i < arr.length - 1 && <ChevronRight size={10} style={{ color: '#A7F3D0', margin: '0 2px' }}/>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Warning for < 5 files */}
            <div style={{
              display: 'flex', gap: 8, padding: '8px 12px', marginBottom: 14,
              background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: 9,
            }}>
              <AlertCircle size={13} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }}/>
              <p style={{ fontSize: 11, color: '#92400E', margin: 0 }}>
                <strong>Tip:</strong> For fewer than 5 files, use <strong>Single Upload</strong> instead — you'll get instant results without waiting.
              </p>
            </div>

            {/* File input */}
            {!isBulkProc && !bulkSubmitted && (
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: 24, border: '1.5px dashed #A7F3D0', borderRadius: 12,
                background: '#fff', cursor: 'pointer',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UploadCloud size={18} style={{ color: '#059669' }}/>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>Select multiple files</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>PDF or DOCX · Safe to close app while processing</p>
                </div>
                <input type="file" accept=".pdf,.docx" onChange={handleBulk} disabled={isLoading} multiple style={{ display: 'none' }}/>
              </label>
            )}

            {/* Progress bar */}
            {(isBulkProc || bulkProgress > 0) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  {isBulkProc
                    ? <Loader2 size={12} style={{ color: '#059669', animation: 'spin 1s linear infinite' }}/>
                    : <FileCheck size={12} style={{ color: '#059669' }}/>
                  }
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', flex: 1 }}>{phaseLabel}</span>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>{bulkProgress}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${bulkProgress}%`, background: 'linear-gradient(90deg,#059669,#10B981)', borderRadius: 3, transition: 'width .4s ease' }}/>
                </div>
              </div>
            )}

            {/* Per-file results */}
            {bulkResults.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>File Status</span>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                    {bulkResults.filter(r => r.status === 'success').length}/{bulkResults.length} ready
                  </span>
                </div>
                <ScrollArea style={{ height: 150 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
                    {bulkResults.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#fff', borderRadius: 7, border: '0.5px solid #E5E7EB' }}>
                        {r.status === 'success'   && <CheckCircle size={12} style={{ color: '#059669', flexShrink: 0 }}/>}
                        {r.status === 'uploading' && <Loader2 size={12} style={{ color: '#7C3AED', animation: 'spin 1s linear infinite', flexShrink: 0 }}/>}
                        {r.status === 'failed'    && <XCircle size={12} style={{ color: '#DC2626', flexShrink: 0 }}/>}
                        {r.status === 'skipped'   && <AlertCircle size={12} style={{ color: '#D97706', flexShrink: 0 }}/>}
                        <span style={{ fontSize: 10, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.fileName}</span>
                        <span style={{ fontSize: 9, color: '#9CA3AF', flexShrink: 0 }}>{r.message}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Submitted state */}
            {bulkSubmitted && (
              <div style={{ marginTop: 12, padding: 14, background: '#ECFDF5', border: '0.5px solid #6EE7B7', borderRadius: 10, display: 'flex', gap: 10 }}>
                <CheckCircle size={18} style={{ color: '#059669', flexShrink: 0, marginTop: 1 }}/>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#065F46', margin: 0 }}>Batch submitted!</p>
                  <p style={{ fontSize: 11, color: '#059669', margin: '3px 0 0' }}>
                    Track progress in the <strong>Batch Jobs</strong> panel on the Talent Pool page. Candidates appear automatically as each resume completes.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 20px', borderTop: '0.5px solid #E5E7EB', background: '#fff',
        display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0,
      }}>
        {tab === 'bulk' && bulkSubmitted ? (
          <button onClick={handleClose} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#059669,#10B981)', color: '#fff',
            fontSize: 12, fontWeight: 700,
          }}>
            Done — View Talent Pool
          </button>
        ) : (
          <>
            <button onClick={handleClose} disabled={isLoading} style={{
              padding: '8px 16px', borderRadius: 8, border: '0.5px solid #D1D5DB',
              background: '#fff', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>Cancel</button>
            {tab === 'paste' && (
              <button onClick={handlePaste} disabled={isLoading || !resumeText.trim()} style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isLoading || !resumeText.trim() ? '#E9D5FF' : 'linear-gradient(135deg,#6D28D9,#7C3AED)',
                color: '#fff', fontSize: 12, fontWeight: 700,
              }}>
                {isLoading ? 'Analysing…' : 'Analyse & Save'}
              </button>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Modal>
  );
};

export default AddCandidateModal;