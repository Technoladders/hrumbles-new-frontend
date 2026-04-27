import React, { useState, useEffect, useRef } from 'react';
import { X, User, Mail, FileText, Upload, Loader2, Check, Calendar, Zap, Sparkles } from 'lucide-react';
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

interface FormData {
  personalInfo: { fullName: string; email: string; phone: string; location: string; availability: string; };
  resume: string | null;
  coverLetter: string;
}

const BUCKET_NAME = 'candidate_resumes';
const COUNTDOWN_SECS = 5;

// Steps with minimum progress thresholds — forces slow animation
const PARSE_STEPS = [
  { label: 'Uploading your resume…',         minPct: 0  },
  { label: 'Extracting content & text…',     minPct: 20 },
  { label: 'Scanning work history…',         minPct: 40 },
  { label: 'Identifying skills & contact…',  minPct: 60 },
  { label: 'Auto-filling your profile…',     minPct: 80 },
  { label: 'Almost there…',                  minPct: 93 },
];

const QuickApplyModal: React.FC<QuickApplyModalProps> = ({ isOpen, onClose, job, organizationId }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'success'>('form');

  // Parsing
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseStepLabel, setParseStepLabel] = useState('');
  const [parseComplete, setParseComplete] = useState(false);
  // Ref so async work can unlock the throttle
  const pctRef = useRef(0);
  const unlockedPctRef = useRef(0);

  // Countdown
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  // 0→100 progress for the fill bar
  const [cdProgress, setCdProgress] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; delay: number }[]>([]);

  const [formData, setFormData] = useState<FormData>({
    personalInfo: { fullName: '', email: '', phone: '', location: '', availability: '' },
    resume: null,
    coverLetter: '',
  });

  // Confetti on success
  useEffect(() => {
    if (step === 'success') {
      setParticles(
        Array.from({ length: 14 }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 8 + 4,
          delay: Math.random() * 0.8,
        }))
      );
    }
  }, [step]);

  // ── Parse animation — paced, cannot outrun real async work ──
  const runParseAnimation = () => {
    pctRef.current = 0;
    unlockedPctRef.current = 15; // allow up to 15% before first unlock
    setParseProgress(0);
    setParseComplete(false);
    setParseStepLabel(PARSE_STEPS[0].label);

    const interval = setInterval(() => {
      const ceiling = Math.min(unlockedPctRef.current, 99);
      if (pctRef.current >= ceiling) return;

      pctRef.current = Math.min(pctRef.current + (Math.random() * 1.2 + 0.5), ceiling);
      const pct = Math.round(pctRef.current);
      setParseProgress(pct);

      // Advance step label
      const idx = PARSE_STEPS.reduce(
        (best, s, i) => (pct >= s.minPct ? i : best), 0
      );
      setParseStepLabel(PARSE_STEPS[idx].label);

      if (pct >= 99) clearInterval(interval);
    }, 120);

    return interval;
  };

  // ── File upload ───────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setUploadError('File size exceeds 5 MB.'); return; }
    const ext = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${ext}`;
    setIsParsing(true);
    setUploadError(null);

    const animInterval = runParseAnimation();

    try {
      const { error: upErr } = await supabase.storage
        .from(BUCKET_NAME).upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      unlockedPctRef.current = 50;

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
      if (!urlData?.publicUrl) throw new Error('Failed to retrieve resume URL.');
      const resumeUrl = urlData.publicUrl;
      setFormData(prev => ({ ...prev, resume: resumeUrl }));
      unlockedPctRef.current = 65;

      const { data: parsed, error: fnErr } = await supabase.functions.invoke('parse-resume', {
        body: { fileUrl: resumeUrl },
      });
      if (fnErr) throw new Error(`AI Parsing Error: ${fnErr.message}`);
      unlockedPctRef.current = 92;

      if (parsed) {
        setFormData(prev => ({
          ...prev,
          personalInfo: {
            ...prev.personalInfo,
            fullName: `${parsed.firstName || ''} ${parsed.lastName || ''}`.trim(),
            email: parsed.email || prev.personalInfo.email,
            phone: parsed.phone || prev.personalInfo.phone,
            location: parsed.currentLocation || prev.personalInfo.location,
          },
        }));
        toast({ title: 'Resume parsed!', description: 'Your details have been auto-filled.' });
      }
    } catch (err: any) {
      setUploadError(`Processing failed: ${err.message}`);
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      clearInterval(animInterval);
      unlockedPctRef.current = 100;
      setParseProgress(100);
      setParseComplete(true);
      setTimeout(() => setIsParsing(false), 900);
    }
  };

  const handleRemoveResume = async () => {
    if (formData.resume) {
      const filePath = formData.resume.split(`${BUCKET_NAME}/`)[1];
      if (filePath) await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    }
    setFormData(prev => ({ ...prev, resume: null }));
  };

  // ── Validation ────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.personalInfo.fullName.trim()) e.fullName = 'Full name is required';
    if (!formData.personalInfo.email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalInfo.email)) {
      e.email = 'Please enter a valid email';
    }
    if (!formData.resume) e.resume = 'Resume is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Countdown ─────────────────────────────────────────────────
  const clearCountdownTimers = () => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
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

    // Smooth fill bar
    cdProgressRef.current = setInterval(() => {
      setCdProgress(prev => {
        const next = prev + (100 / (COUNTDOWN_SECS * 20)); // 20 ticks/sec
        return Math.min(next, 100);
      });
    }, 50);

    // Actual second countdown
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

  // ── Submit ────────────────────────────────────────────────────
  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('submit-application', {
        body: { applicationData: formData, jobId: job.id, orgId: organizationId },
      });
      if (error) throw error;
      setStep('success');
      toast({ title: 'Application Submitted!', description: `Applied for ${job.title}.` });
    } catch (err: any) {
      toast({ title: 'Submission Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    if (validateForm()) {
      startCountdown();
    } else {
      toast({ title: 'Please fix the errors', description: 'Name, Email, and Resume are required.', variant: 'destructive' });
    }
  };

  const handleClose = () => {
    cancelCountdown();
    if (step === 'success') {
      setFormData({ personalInfo: { fullName: '', email: '', phone: '', location: '', availability: '' }, resume: null, coverLetter: '' });
      setStep('form');
    }
    onClose();
  };

  // ── Name helpers ──────────────────────────────────────────────
  const splitName = (full: string) => {
    const parts = full.split(' ');
    return { first: parts[0] || '', last: parts.slice(1).join(' ') };
  };
  const { first, last } = splitName(formData.personalInfo.fullName);
  const updateName = (field: 'first' | 'last', val: string) => {
    const full = field === 'first' ? `${val} ${last}`.trim() : `${first} ${val}`.trim();
    setFormData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, fullName: full } }));
  };

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

        {/* ── Scrollable content ── */}
        <div className="qa-content">

          {/* AI Parse Overlay */}
          {isParsing && (
            <div className="qa-parse-overlay">
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
                  <circle className="qa-ring-glow-stroke"  cx="48" cy="48" r="42"
                    style={{ strokeDashoffset: ringOffset }} />
                  <circle className="qa-ring-fill"         cx="48" cy="48" r="42"
                    style={{ strokeDashoffset: ringOffset }} />
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
                  Parsing Resume
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

          {/* ── Form ── */}
          {step === 'form' && (
            <div className="qa-form">
              <p className="qa-required-note">Fields marked <span className="qa-asterisk">*</span> are required</p>

              {/* Resume */}
              <div className="qa-section">
                <h3 className="qa-section-title">
                  <FileText size={16} /> Resume <span className="qa-asterisk">*</span>
                </h3>
                {formData.resume ? (
                  <div className="qa-resume-uploaded">
                    <div className="qa-resume-uploaded-left">
                      <div className="qa-resume-icon-wrap"><FileText size={20} /></div>
                      <div>
                        <p className="qa-resume-name">{formData.resume.split('/').pop()}</p>
                        <a href={formData.resume} target="_blank" rel="noopener noreferrer" className="qa-resume-link">View file ↗</a>
                      </div>
                    </div>
                    <button type="button" onClick={handleRemoveResume} className="qa-resume-remove" disabled={isParsing}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className={`qa-upload-zone ${errors.resume ? 'qa-upload-zone--error' : ''}`}>
                    <input type="file" id="qa-resume-upload" accept=".pdf,.doc,.docx"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                      disabled={isParsing} style={{ display: 'none' }} />
                    <label htmlFor="qa-resume-upload" className="qa-upload-label">
                      <div className="qa-upload-icon-wrap"><Upload size={22} /></div>
                      <p className="qa-upload-title">Drop your resume here</p>
                      <p className="qa-upload-sub">PDF, DOC, DOCX · max 5 MB</p>
                      <button type="button" className="qa-upload-btn" disabled={isParsing}
                        onClick={e => { e.preventDefault(); document.getElementById('qa-resume-upload')?.click(); }}>
                        Choose File
                      </button>
                    </label>
                  </div>
                )}
                {uploadError && <p className="qa-error">{uploadError}</p>}
                {errors.resume && <p className="qa-error">{errors.resume}</p>}
              </div>

              {/* Personal Info */}
              <div className="qa-section">
                <h3 className="qa-section-title"><User size={16} /> Personal Information</h3>
                <div className="qa-grid">
                  <div className="qa-field">
                    <label className="qa-label">First Name <span className="qa-asterisk">*</span></label>
                    <input type="text" className={`qa-input ${errors.fullName ? 'qa-input--error' : ''}`}
                      value={first} onChange={e => updateName('first', e.target.value)} placeholder="Jane" />
                  </div>
                  <div className="qa-field">
                    <label className="qa-label">Last Name <span className="qa-asterisk">*</span></label>
                    <input type="text" className={`qa-input ${errors.fullName ? 'qa-input--error' : ''}`}
                      value={last} onChange={e => updateName('last', e.target.value)} placeholder="Smith" />
                  </div>
                  {errors.fullName && <p className="qa-error qa-field-full">{errors.fullName}</p>}

                  <div className="qa-field">
                    <label className="qa-label">Email <span className="qa-asterisk">*</span></label>
                    <div className="qa-input-icon-wrap">
                      <Mail size={14} className="qa-input-icon" />
                      <input type="email" className={`qa-input qa-input--icon ${errors.email ? 'qa-input--error' : ''}`}
                        value={formData.personalInfo.email}
                        onChange={e => setFormData(p => ({ ...p, personalInfo: { ...p.personalInfo, email: e.target.value } }))}
                        placeholder="jane@example.com" />
                    </div>
                    {errors.email && <p className="qa-error">{errors.email}</p>}
                  </div>

                  <div className="qa-field">
                    <label className="qa-label">Phone</label>
                    <PhoneInput international defaultCountry="IN" placeholder="Enter phone number"
                      value={formData.personalInfo.phone}
                      onChange={val => setFormData(p => ({ ...p, personalInfo: { ...p.personalInfo, phone: val || '' } }))}
                      className="qa-phone-wrapper" />
                  </div>

                  <div className="qa-field qa-field-full">
                    <label className="qa-label">Availability</label>
                    <div className="qa-input-icon-wrap">
                      <Calendar size={14} className="qa-input-icon" />
                      <select className="qa-input qa-input--icon"
                        value={formData.personalInfo.availability}
                        onChange={e => setFormData(p => ({ ...p, personalInfo: { ...p.personalInfo, availability: e.target.value } }))}>
                        <option value="">Select availability</option>
                        {['Immediate', '15 Days', '30 Days', '45 Days', '60 Days', '90 Days'].map(o =>
                          <option key={o} value={o}>{o}</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Letter */}
              <div className="qa-section">
                <h3 className="qa-section-title">
                  <FileText size={16} /> Cover Letter
                  <span className="qa-optional">(Optional)</span>
                </h3>
                <textarea className="qa-textarea" rows={3}
                  value={formData.coverLetter}
                  onChange={e => setFormData(p => ({ ...p, coverLetter: e.target.value }))}
                  placeholder="Why are you excited about this role?" />
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {step === 'success' && (
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
              <p className="qa-success-note">
                Confirmation sent to <strong>{formData.personalInfo.email}</strong>
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="qa-footer">

          {/* Normal state */}
          {step === 'form' && !isCountingDown && !submitting && (
            <>
              <button type="button" onClick={handleClose} className="qa-btn-ghost">Cancel</button>
              <button type="button" onClick={handleSubmitClick} className="qa-btn-primary">
                <Zap size={15} /> Submit Application
              </button>
            </>
          )}

          {/* Countdown state — cancel + progress bar, same layout as normal */}
          {step === 'form' && isCountingDown && (
            <>
              <button type="button" onClick={cancelCountdown} className="qa-btn-ghost qa-btn-ghost--danger">
                <X size={14} /> Cancel
              </button>
              {/* Progress submit button — fixed width, no layout shift */}
              <div className="qa-cd-btn">
                <div className="qa-cd-fill" style={{ width: `${cdProgress}%` }} />
                <div className="qa-cd-inner">
                  <Loader2 size={15} className="qa-cd-spinner" />
                  <span className="qa-cd-label">Submitting in {countdown}s…</span>
                </div>
              </div>
            </>
          )}

          {/* Submitting spinner */}
          {step === 'form' && submitting && (
            <>
              <span />
              <button type="button" className="qa-btn-primary" disabled>
                <Loader2 size={15} className="qa-spinner" /> Submitting…
              </button>
            </>
          )}

          {step === 'success' && (
            <button type="button" onClick={handleClose} className="qa-btn-primary qa-btn-full">
              Close &amp; Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickApplyModal;