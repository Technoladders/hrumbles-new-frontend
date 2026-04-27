import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, FileText, Upload, Loader2, Check, Zap, Sparkles, AlertCircle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import './quick-apply-modal.css';
import { v4 as uuidv4 } from 'uuid';

interface QuickApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: { id: string; title: string; company: string; logoUrl?: string; };
  organizationId: string;
}

interface ParsedInfo {
  fullName: string;
  email: string;
  phone: string;
}

const BUCKET_NAME = 'candidate_resumes';
const COUNTDOWN_SECS = 3;

// Parse overlay steps — paced to stay visible
const PARSE_STEPS = [
  { label: 'Uploading resume…',              minPct: 0  },
  { label: 'Extracting content & text…',     minPct: 20 },
  { label: 'Scanning work history…',         minPct: 40 },
  { label: 'Identifying your details…',      minPct: 60 },
  { label: 'Auto-filling your profile…',     minPct: 80 },
  { label: 'Almost there…',                  minPct: 93 },
];

type ModalPhase =
  | 'upload'          // initial: just the upload zone
  | 'parsing'         // uploading + AI parse overlay
  | 'confirm'         // 4-field pre-filled + auto countdown
  | 'submitting'      // spinner while API call runs
  | 'success'         // done
  | 'already_applied' // duplicate detected

const QuickApplyModal: React.FC<QuickApplyModalProps> = ({ isOpen, onClose, job, organizationId }) => {
  const { toast } = useToast();

  const [phase, setPhase]         = useState<ModalPhase>('upload');
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // AI parse state
  const [parseProgress, setParseProgress]   = useState(0);
  const [parseStepLabel, setParseStepLabel] = useState('');
  const [parseComplete, setParseComplete]   = useState(false);
  const unlockedPctRef = useRef(15);
  const pctRef         = useRef(0);

  // Confirmed candidate info (editable)
  const [info, setInfo] = useState<ParsedInfo>({ fullName: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Countdown
  const [countdown, setCountdown]       = useState(COUNTDOWN_SECS);
  const [cdProgress, setCdProgress]     = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdProgressRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Already-applied date
  const [appliedDate, setAppliedDate] = useState<string | null>(null);

  // Success particles
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; delay: number }[]>([]);

  // ── Reset on close ────────────────────────────────────────────
  const resetAll = useCallback(() => {
    clearCountdownTimers();
    setPhase('upload');
    setResumeUrl(null);
    setUploadError(null);
    setParseProgress(0);
    setParseStepLabel('');
    setParseComplete(false);
    setInfo({ fullName: '', email: '', phone: '' });
    setErrors({});
    setCountdown(COUNTDOWN_SECS);
    setCdProgress(0);
    setIsCountingDown(false);
    setAppliedDate(null);
    pctRef.current = 0;
    unlockedPctRef.current = 15;
  }, []);

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // ── Success particles ──────────────────────────────────────────
  useEffect(() => {
    if (phase === 'success') {
      setParticles(
        Array.from({ length: 14 }, (_, i) => ({
          id: i, x: Math.random() * 100, y: Math.random() * 100,
          size: Math.random() * 8 + 4, delay: Math.random() * 0.8,
        }))
      );
    }
  }, [phase]);

  // ── Parse progress animation ───────────────────────────────────
  const startParseAnimation = (): ReturnType<typeof setInterval> => {
    pctRef.current = 0;
    unlockedPctRef.current = 15;
    setParseProgress(0);
    setParseComplete(false);
    setParseStepLabel(PARSE_STEPS[0].label);

    return setInterval(() => {
      const ceiling = Math.min(unlockedPctRef.current, 99);
      if (pctRef.current >= ceiling) return;
      pctRef.current = Math.min(pctRef.current + (Math.random() * 1.2 + 0.5), ceiling);
      const pct = Math.round(pctRef.current);
      setParseProgress(pct);
      const idx = PARSE_STEPS.reduce((best, s, i) => (pct >= s.minPct ? i : best), 0);
      setParseStepLabel(PARSE_STEPS[idx].label);
    }, 120);
  };

  // ── Duplicate check (via service-role edge function) ──────────
  const checkDuplicate = async (email: string): Promise<{ isDuplicate: boolean; appliedDate?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('check-duplicate-application', {
        body: { jobId: job.id, email: email.trim().toLowerCase() },
      });
      if (error) return { isDuplicate: false }; // fail open — don't block
      return data ?? { isDuplicate: false };
    } catch {
      return { isDuplicate: false };
    }
  };

  // ── File upload + parse ────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setUploadError('File size exceeds 5 MB.'); return; }
    const ext = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${ext}`;

    setUploadError(null);
    setPhase('parsing');

    const animInterval = startParseAnimation();

    try {
      // Upload to storage
      const { error: upErr } = await supabase.storage
        .from(BUCKET_NAME).upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      unlockedPctRef.current = 50;

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
      if (!urlData?.publicUrl) throw new Error('Failed to retrieve resume URL.');
      const url = urlData.publicUrl;
      setResumeUrl(url);
      unlockedPctRef.current = 65;

      // AI parse
      const { data: parsed, error: fnErr } = await supabase.functions.invoke('parse-resume', {
        body: { fileUrl: url },
      });
      if (fnErr) throw new Error(`AI Parsing Error: ${fnErr.message}`);
      unlockedPctRef.current = 92;

      // Extract the 4 fields we care about
      const fullName = parsed
        ? `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim()
        : '';
      const email    = parsed?.email   || '';
      const phone    = parsed?.phone   || '';

      // ── Duplicate check before showing confirm screen ──────────
      if (email) {
        const dup = await checkDuplicate(email);
        if (dup.isDuplicate) {
          clearInterval(animInterval);
          setAppliedDate(dup.appliedDate || null);
          setPhase('already_applied');
          return;
        }
      }

      setInfo({ fullName, email, phone });
    } catch (err: any) {
      setUploadError(`Processing failed: ${err.message}`);
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
      clearInterval(animInterval);
      setPhase('upload');
      return;
    } finally {
      clearInterval(animInterval);
      unlockedPctRef.current = 100;
      setParseProgress(100);
      setParseComplete(true);
    }

    // Brief "done" moment before transitioning to confirm
    await new Promise(r => setTimeout(r, 700));
    setPhase('confirm');
    // Start the auto-submit countdown immediately
    startCountdown();
  };

  // ── Countdown ─────────────────────────────────────────────────
  const clearCountdownTimers = () => {
    if (countdownRef.current)  { clearInterval(countdownRef.current);  countdownRef.current  = null; }
    if (cdProgressRef.current) { clearInterval(cdProgressRef.current); cdProgressRef.current = null; }
  };

  const startCountdown = () => {
    setCountdown(COUNTDOWN_SECS);
    setCdProgress(0);
    setIsCountingDown(true);
  };

  const cancelCountdown = () => {
    clearCountdownTimers();
    setIsCountingDown(false);
    setCountdown(COUNTDOWN_SECS);
    setCdProgress(0);
  };

  useEffect(() => {
    if (!isCountingDown) return;

    // Smooth fill bar: 100% in COUNTDOWN_SECS seconds
    cdProgressRef.current = setInterval(() => {
      setCdProgress(prev => Math.min(prev + (100 / (COUNTDOWN_SECS * 20)), 100));
    }, 50);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearCountdownTimers();
          setIsCountingDown(false);
          doSubmit();
          return COUNTDOWN_SECS;
        }
        return next;
      });
    }, 1000);

    return clearCountdownTimers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCountingDown]);

  // ── Validate before manual submit ────────────────────────────
  const validateInfo = (): boolean => {
    const e: Record<string, string> = {};
    const nameParts = info.fullName.trim().split(' ');
    if (!info.fullName.trim()) e.fullName = 'Name is required';
    else if (nameParts.length < 2 || !nameParts[1]) e.fullName = 'Please enter first and last name';
    if (!info.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────
  const doSubmit = async () => {
    if (!resumeUrl) return;
    setPhase('submitting');

    const nameParts = info.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName  = nameParts.slice(1).join(' ') || '';

    try {
      const { error } = await supabase.functions.invoke('submit-application', {
        body: {
          applicationData: {
            personalInfo: {
              fullName:     info.fullName,
              email:        info.email,
              phone:        info.phone,
              location:     '',
              availability: '',
            },
            resume:      resumeUrl,
            coverLetter: '',
          },
          jobId: job.id,
          orgId: organizationId,
        },
      });
      if (error) throw error;
      setPhase('success');
      toast({ title: 'Application Submitted!', description: `Applied for ${job.title}.` });
    } catch (err: any) {
      toast({ title: 'Submission Failed', description: err.message, variant: 'destructive' });
      setPhase('confirm');
    }
  };

  const handleManualSubmit = () => {
    cancelCountdown();
    if (validateInfo()) doSubmit();
    else toast({ title: 'Please fix the errors', variant: 'destructive' });
  };

  // ── Name split helpers ─────────────────────────────────────────
  const nameParts = info.fullName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName  = nameParts.slice(1).join(' ') || '';
  const setFirstName = (v: string) => setInfo(p => ({ ...p, fullName: `${v} ${lastName}`.trim() }));
  const setLastName  = (v: string) => setInfo(p => ({ ...p, fullName: `${firstName} ${v}`.trim() }));

  // Ring maths
  const CIRC = 264;
  const ringOffset = CIRC - (parseProgress / 100) * CIRC;

  if (!isOpen) return null;

  return (
    <div className="qa-overlay" onClick={handleClose}>
      <div className="qa-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="qa-header">
          <div className="qa-header-left">
            {job.logoUrl
              ? <img src={job.logoUrl} alt={job.company} className="qa-logo" />
              : <div className="qa-logo-placeholder">{job.company.charAt(0)}</div>
            }
            <div>
              <h2 className="qa-title">Quick Apply</h2>
              <p className="qa-subtitle">{job.title} · <span className="qa-company">{job.company}</span></p>
            </div>
          </div>
          <button onClick={handleClose} className="qa-close-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="qa-content">

          {/* ═══ PHASE: upload ═══ */}
          {phase === 'upload' && (
            <div className="qa-upload-phase">
              <div className="qa-upload-hero">
                <div className="qa-upload-hero-icon">
                  <Zap size={28} />
                </div>
                <h3 className="qa-upload-hero-title">One-click apply</h3>
                <p className="qa-upload-hero-sub">
                  Upload your resume and we'll fill everything in automatically.
                </p>
              </div>

              <div className={`qa-upload-zone ${uploadError ? 'qa-upload-zone--error' : ''}`}>
                <input type="file" id="qa-resume-upload" accept=".pdf,.doc,.docx"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                  style={{ display: 'none' }} />
                <label htmlFor="qa-resume-upload" className="qa-upload-label">
                  <div className="qa-upload-icon-wrap"><Upload size={22} /></div>
                  <p className="qa-upload-title">Drop your resume here</p>
                  <p className="qa-upload-sub-text">PDF, DOC, DOCX · max 5 MB</p>
                  <button type="button" className="qa-upload-btn"
                    onClick={e => { e.preventDefault(); document.getElementById('qa-resume-upload')?.click(); }}>
                    Choose File
                  </button>
                </label>
              </div>
              {uploadError && (
                <div className="qa-error-banner">
                  <AlertCircle size={14} /> {uploadError}
                </div>
              )}
            </div>
          )}

          {/* ═══ PHASE: parsing ═══ */}
          {phase === 'parsing' && (
            <div className="qa-parse-phase">
              <div className="qa-parse-bg-glow" />

              <div className="qa-parse-ring-wrap">
                <svg className="qa-parse-svg" viewBox="0 0 96 96">
                  <defs>
                    <linearGradient id="qa-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="50%" stopColor="#7731e8" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>
                  <circle className="qa-ring-track"        cx="48" cy="48" r="42" />
                  <circle className="qa-ring-glow-stroke"  cx="48" cy="48" r="42" style={{ strokeDashoffset: ringOffset }} />
                  <circle className="qa-ring-fill"         cx="48" cy="48" r="42" style={{ strokeDashoffset: ringOffset }} />
                </svg>
                <div className="qa-parse-center">
                  {parseComplete
                    ? <Check size={28} className="qa-parse-done-icon" />
                    : <span className="qa-parse-pct">{parseProgress}%</span>
                  }
                  <span className="qa-parse-sublabel">{parseComplete ? 'Done!' : ''}</span>
                </div>
              </div>

              <div className="qa-parse-text">
                <p className="qa-parse-headline">
                  <Sparkles size={14} className="qa-parse-sparkle" />
                  Analysing Resume
                </p>
                <p className="qa-parse-step">{parseStepLabel}</p>
              </div>

              <div className="qa-parse-dots">
                {PARSE_STEPS.map((s, i) => (
                  <span key={i} className={`qa-parse-dot ${parseProgress >= s.minPct ? 'active' : ''}`} />
                ))}
              </div>
            </div>
          )}

          {/* ═══ PHASE: confirm ═══ */}
          {phase === 'confirm' && (
            <div className="qa-confirm-phase">
              {/* Resume pill */}
              <div className="qa-resume-pill">
                <div className="qa-resume-pill-icon"><FileText size={16} /></div>
                <span className="qa-resume-pill-name">
                  {resumeUrl?.split('/').pop()?.split('?')[0] || 'resume'}
                </span>
                <span className="qa-resume-pill-badge">✓ Uploaded</span>
              </div>

              {/* 4-field grid */}
              <div className="qa-confirm-grid">
                <div className="qa-field">
                  <label className="qa-label">First Name <span className="qa-asterisk">*</span></label>
                  <input type="text" className={`qa-input ${errors.fullName ? 'qa-input--error' : ''}`}
                    value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
                </div>
                <div className="qa-field">
                  <label className="qa-label">Last Name <span className="qa-asterisk">*</span></label>
                  <input type="text" className={`qa-input ${errors.fullName ? 'qa-input--error' : ''}`}
                    value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
                </div>
                {errors.fullName && <p className="qa-error qa-field-full">{errors.fullName}</p>}

                <div className="qa-field">
                  <label className="qa-label">Email <span className="qa-asterisk">*</span></label>
                  <input type="email" className={`qa-input ${errors.email ? 'qa-input--error' : ''}`}
                    value={info.email}
                    onChange={e => setInfo(p => ({ ...p, email: e.target.value }))}
                    placeholder="jane@example.com" />
                  {errors.email && <p className="qa-error">{errors.email}</p>}
                </div>

                <div className="qa-field">
                  <label className="qa-label">Phone</label>
                  <PhoneInput international defaultCountry="IN" placeholder="Phone number"
                    value={info.phone}
                    onChange={val => setInfo(p => ({ ...p, phone: val || '' }))}
                    className="qa-phone-wrapper" />
                </div>
              </div>

              {/* Auto-submit notice */}
              {isCountingDown && (
                <div className="qa-auto-notice">
                  <Zap size={13} className="qa-auto-notice-icon" />
                  Submitting automatically in <strong>{countdown}s</strong> — or edit above and submit manually.
                </div>
              )}
            </div>
          )}

          {/* ═══ PHASE: submitting ═══ */}
          {phase === 'submitting' && (
            <div className="qa-submitting-phase">
              <div className="qa-submitting-ring">
                <Loader2 size={36} className="qa-submitting-spinner" />
              </div>
              <p className="qa-submitting-title">Submitting your application…</p>
              <p className="qa-submitting-sub">Just a moment while we send your details to the hiring team.</p>
            </div>
          )}

          {/* ═══ PHASE: success ═══ */}
          {phase === 'success' && (
            <div className="qa-success">
              <div className="qa-success-particles">
                {particles.map(p => (
                  <span key={p.id} className="qa-particle"
                    style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s` }} />
                ))}
              </div>
              <div className="qa-success-ring">
                <div className="qa-success-check"><Check size={40} strokeWidth={3} /></div>
              </div>
              <h3 className="qa-success-title">You're all set! 🎉</h3>
              <p className="qa-success-msg">
                Your application for <strong>{job.title}</strong> at <strong>{job.company}</strong> has been submitted.
              </p>
              {/* {info.email && (
                <p className="qa-success-note">Confirmation sent to <strong>{info.email}</strong></p>
              )} */}
            </div>
          )}

          {/* ═══ PHASE: already_applied ═══ */}
          {phase === 'already_applied' && (
            <div className="qa-already-applied">
              <div className="qa-already-icon">
                <Check size={32} />
              </div>
              <h3 className="qa-already-title">Already Applied</h3>
              <p className="qa-already-msg">
                You've already applied for <strong>{job.title}</strong> at <strong>{job.company}</strong>.
              </p>
              {appliedDate && (
                <div className="qa-already-date">
                  <Calendar size={13} />
                  Applied on {new Date(appliedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              )}
              <p className="qa-already-hint">
                The hiring team will reach out if your profile is a great fit.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="qa-footer">

          {/* Upload phase */}
          {phase === 'upload' && (
            <button type="button" onClick={handleClose} className="qa-btn-ghost qa-btn-full-ghost">
              Cancel
            </button>
          )}

          {/* Parsing phase */}
          {phase === 'parsing' && (
            <div className="qa-footer-info">
              <Loader2 size={14} className="qa-spinner" />
              <span>Analysing your resume…</span>
            </div>
          )}

          {/* Confirm phase — countdown or manual */}
          {phase === 'confirm' && isCountingDown && (
            <>
              <button type="button" onClick={cancelCountdown} className="qa-btn-ghost qa-btn-ghost--danger">
                <X size={14} /> Cancel auto-submit
              </button>
              <div className="qa-cd-btn">
                <div className="qa-cd-fill" style={{ width: `${cdProgress}%` }} />
                <div className="qa-cd-inner">
                  <Loader2 size={15} className="qa-cd-spinner" />
                  <span className="qa-cd-label">Submitting in {countdown}s…</span>
                </div>
              </div>
            </>
          )}

          {phase === 'confirm' && !isCountingDown && (
            <>
              <button type="button" onClick={handleClose} className="qa-btn-ghost">Cancel</button>
              <button type="button" onClick={handleManualSubmit} className="qa-btn-primary">
                <Zap size={15} /> Submit Application
              </button>
            </>
          )}

          {/* Submitting */}
          {phase === 'submitting' && (
            <div className="qa-footer-info">
              <Loader2 size={14} className="qa-spinner" />
              <span>Submitting application…</span>
            </div>
          )}

          {/* Success */}
          {phase === 'success' && (
            <button type="button" onClick={handleClose} className="qa-btn-primary qa-btn-full">
              Close
            </button>
          )}

          {/* Already applied */}
          {phase === 'already_applied' && (
            <button type="button" onClick={handleClose} className="qa-btn-primary qa-btn-full">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickApplyModal;