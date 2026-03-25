// src/components/jobs/job/invite/InviteResponseDrawer.tsx
//
// Changes from previous version:
//  1. createPortal — renders above all layout layers, fixes z-index/header overlap
//  2. Fit signals panel — skills match %, salary fit, experience fit, notice period
//  3. Career preview — 2 most recent roles from metadata.resumeParsedFields
//  4. "View Full Profile" link when talent_pool_id is present
//  5. Pipeline stage picker on "Add to Job" (Screening / Shortlisted / Interview)
//  6. Inline recruiter notes — always visible, saves on blur
//  7. applyProfileUpdate now also receives organizationId for silent talent pool sync

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ExternalLink, FileText, Briefcase, MapPin,
  DollarSign, Clock, Linkedin, CheckCircle2,
  Users, TrendingUp, AlertTriangle, ChevronDown, ChevronUp,
  UserCheck, RefreshCw, XCircle, Eye as EyeIcon,
} from 'lucide-react';
import {
  CandidateInviteResponse,
  CandidateInvite,
  addInviteResponseToJob,
  rejectInviteResponse,
  applyProfileUpdate,
} from '@/services/inviteService';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';

interface InviteResponseDrawerProps {
  isOpen:   boolean;
  onClose:  () => void;
  invite:   CandidateInvite | null;
  response: CandidateInviteResponse | null;
  jobId:    string;
  onAction: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number | null | undefined) =>
  v ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v) : null;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// ── Sub-components ────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source: string }) {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    pipeline:         { label: 'Pipeline',      bg: '#EDE9FE', color: '#7C3AED' },
    zivex:            { label: 'Zive-X',        bg: '#DBEAFE', color: '#1D4ED8' },
    talentpool:       { label: 'Talent Pool',   bg: '#D1FAE5', color: '#065F46' },
    candidate_search: { label: 'Global Search', bg: '#FEF3C7', color: '#92400E' },
  };
  const c = config[source] || config.zivex;
  return (
    <span style={{ padding: '2px 8px', borderRadius: '99px', background: c.bg, color: c.color, fontSize: '11px', fontWeight: 700 }}>
      {c.label}
    </span>
  );
}

function DrawSec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{title}</p>
      <div style={{ background: '#FAFAFA', borderRadius: '10px', border: '1px solid #F3F4F6', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon = null }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '12px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>{icon}{label}</span>
      <span style={{ fontSize: '13px', color: '#111827', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

function SpinRing() {
  return <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin-ring 0.7s linear infinite' }} />;
}

// ── Fit Signals ───────────────────────────────────────────────────────────────
function FitSignals({ response, job }: { response: CandidateInviteResponse; job: any }) {
  // Skills match
  const jobSkills = (job?.skills || []).map((s: string) => s.toLowerCase());
  const candSkills = (response.top_skills || []).map(s => (typeof s === 'string' ? s : s.name).toLowerCase());
  const matchCount = candSkills.filter(s => jobSkills.some(j => j.includes(s) || s.includes(j))).length;
  const skillPct = jobSkills.length > 0 ? Math.round((matchCount / jobSkills.length) * 100) : null;

  // Experience fit
  const expMin = job?.experience?.min?.value;
  const expMax = job?.experience?.max?.value;
  const candExp = response.parsed_experience_years;
  const expFit = candExp != null && (expMin != null || expMax != null)
    ? (expMin != null && candExp < expMin ? 'under' : expMax != null && candExp > expMax + 2 ? 'over' : 'fit')
    : null;

  // Salary fit — just show expected vs current
  const expCTC = response.parsed_expected_ctc;

  // Notice period
  const noticeDays: Record<string, number> = {
    'Immediate': 0, '15 days': 15, '30 days': 30, '45 days': 45, '60 days': 60, '90 days': 90,
  };
  const nDays = response.notice_period ? noticeDays[response.notice_period] : null;

  const hasAny = skillPct !== null || expFit || expCTC || nDays !== null;
  if (!hasAny) return null;

  return (
    <div style={{ marginBottom: '20px', padding: '12px 14px', borderRadius: '12px', background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', border: '1px solid #DDD6FE' }}>
      <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Fit Signals
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Skills match */}
        {skillPct !== null && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>
                Skills match
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: skillPct >= 70 ? '#065F46' : skillPct >= 40 ? '#92400E' : '#991B1B' }}>
                {matchCount}/{jobSkills.length} · {skillPct}%
              </span>
            </div>
            <div style={{ height: '5px', background: '#DDD6FE', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${skillPct}%`, borderRadius: '99px', transition: 'width 0.6s', background: skillPct >= 70 ? '#10B981' : skillPct >= 40 ? '#F59E0B' : '#EF4444' }} />
            </div>
          </div>
        )}
        {/* Experience */}
        {expFit && candExp != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Briefcase size={12} color="#7C3AED" style={{ flexShrink: 0 }} />
            <span style={{ color: '#374151', fontWeight: 500 }}>{candExp} yrs experience</span>
            {expMin != null && expMax != null && (
              <span style={{ color: '#9CA3AF' }}>· Required {expMin}–{expMax} yrs</span>
            )}
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: expFit === 'fit' ? '#065F46' : expFit === 'under' ? '#991B1B' : '#92400E' }}>
              {expFit === 'fit' ? '✓ Fit' : expFit === 'under' ? '↑ Under' : '↓ Over'}
            </span>
          </div>
        )}
        {/* Expected CTC */}
        {expCTC != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <DollarSign size={12} color="#7C3AED" style={{ flexShrink: 0 }} />
            <span style={{ color: '#374151', fontWeight: 500 }}>Expected {fmt(expCTC)}</span>
            {response.parsed_current_ctc && (
              <span style={{ color: '#9CA3AF' }}>· Current {fmt(response.parsed_current_ctc)}</span>
            )}
          </div>
        )}
        {/* Notice period */}
        {nDays !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Clock size={12} color="#7C3AED" style={{ flexShrink: 0 }} />
            <span style={{ color: '#374151', fontWeight: 500 }}>
              {nDays === 0 ? 'Immediate joiner' : `${response.notice_period} notice`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Career Preview ────────────────────────────────────────────────────────────
function CareerPreview({ response }: { response: CandidateInviteResponse }) {
  const [expanded, setExpanded] = useState(false);
  const history: any[] = response.metadata?.resumeParsedFields?.workExperience || [];
  if (history.length === 0) return null;
  const visible = expanded ? history : history.slice(0, 2);
  return (
    <DrawSec title="Career History">
      {visible.map((role: any, i: number) => (
        <div key={i} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: role.end_date === 'Present' || !role.end_date ? '#7C3AED' : '#D1D5DB', marginTop: '3px' }} />
            {i < visible.length - 1 && <div style={{ width: '1px', flex: 1, background: '#F3F4F6', marginTop: '4px' }} />}
          </div>
          <div style={{ paddingBottom: '12px', minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#111827' }}>
              {role.designation || role.title || '—'}
              {(role.end_date === 'Present' || !role.end_date) && (
                <span style={{ marginLeft: '6px', fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', background: '#EDE9FE', color: '#7C3AED' }}>Now</span>
              )}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6B7280' }}>{role.company || '—'}</p>
            {(role.start_date || role.end_date) && (
              <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#9CA3AF' }}>
                {[role.start_date, role.end_date].filter(Boolean).join(' – ')}
              </p>
            )}
          </div>
        </div>
      ))}
      {history.length > 2 && (
        <button onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', color: '#7C3AED', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {expanded ? <><ChevronUp size={12} />Show less</> : <><ChevronDown size={12} />+{history.length - 2} more roles</>}
        </button>
      )}
    </DrawSec>
  );
}

// ── Stage Picker ──────────────────────────────────────────────────────────────
const STAGES = ['Screening', 'Shortlisted', 'Interview'] as const;
type Stage = typeof STAGES[number];

function StagePicker({ value, onChange }: { value: Stage; onChange: (s: Stage) => void }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Add to Stage
      </p>
      <div style={{ display: 'flex', gap: '6px' }}>
        {STAGES.map(s => (
          <button key={s} onClick={() => onChange(s)} type="button"
            style={{
              flex: 1, padding: '8px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              background: value === s ? 'linear-gradient(135deg,#6D28D9,#7C3AED)' : '#F3F4F6',
              color: value === s ? '#fff' : '#374151',
              boxShadow: value === s ? '0 2px 8px rgba(109,40,217,0.3)' : 'none',
              transition: 'all 0.15s',
            }}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Inline Notes ──────────────────────────────────────────────────────────────
function InlineNotes({ responseId, initialNotes }: { responseId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (notes === (initialNotes || '')) return;
    setSaving(true);
    await supabase.from('candidate_invite_responses')
      .update({ recruiter_notes: notes || null })
      .eq('id', responseId);
    setSaving(false);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Recruiter Notes</p>
        {saving && <span style={{ fontSize: '10px', color: '#9CA3AF' }}>Saving…</span>}
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={save}
        placeholder="Add notes about this candidate…"
        rows={3}
        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: '#374151', background: '#FAFAFA' }}
      />
    </div>
  );
}

// ── Button styles ─────────────────────────────────────────────────────────────
const primBtn: React.CSSProperties = { flex: 1, padding: '11px 16px', borderRadius: '10px', border: 'none', background: '#7B43F1', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' };
const outBtn:  React.CSSProperties = { flex: 1, padding: '11px 16px', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer' };
const dangBtn: React.CSSProperties = { flex: 1, padding: '11px 16px', borderRadius: '10px', border: 'none', background: '#DC2626', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' };

// ── Main drawer ───────────────────────────────────────────────────────────────
const InviteResponseDrawer: React.FC<InviteResponseDrawerProps> = ({
  isOpen, onClose, invite, response, jobId, onAction,
}) => {
  const organizationId = useSelector((s: any) => s.auth.organization_id);

  const [isApplying,     setIsApplying]     = useState(false);
  const [isAdding,       setIsAdding]       = useState(false);
  const [isRejecting,    setIsRejecting]    = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNotes,    setRejectNotes]    = useState('');
  const [stage,          setStage]          = useState<Stage>('Screening');
  const [currentValues,  setCurrentValues]  = useState<Record<string, any>>({});
  const [job,            setJob]            = useState<any>(null);

  // Fetch pipeline candidate current values for diff
  useEffect(() => {
    if (!invite?.candidate_id || invite.invite_source !== 'pipeline') return;
    (async () => {
      const { data } = await supabase
        .from('hr_job_candidates')
        .select('name, email, phone, experience, location, current_salary, expected_salary, notice_period, resume_url, metadata')
        .eq('id', invite.candidate_id)
        .single();
      if (data) setCurrentValues(data);
    })();
  }, [invite?.candidate_id]);

  // Fetch job for fit signals
  useEffect(() => {
    if (!jobId) return;
    supabase.from('hr_jobs').select('title, skills, experience').eq('id', jobId).single()
      .then(({ data }) => { if (data) setJob(data); });
  }, [jobId]);

  if (!isOpen || !response || !invite) return null;

  const isPipeline = invite.invite_source === 'pipeline';
  const isDecided  = ['auto_updated', 'added_to_job', 'rejected'].includes(response.status);

  const talentPoolId = (invite as any).talent_id || response.talent_pool_id;

  const statusBarConfig: Record<string, { bg: string; color: string; label: string }> = {
    auto_updated: { bg: '#EDE9FE', color: '#7C3AED', label: '🔄 Profile applied to candidate record' },
    added_to_job: { bg: '#D1FAE5', color: '#065F46', label: '✅ Added to job' },
    rejected:     { bg: '#FEE2E2', color: '#991B1B', label: '❌ Rejected' },
  };
  const statusBar = statusBarConfig[response.status];

  const handleApplyUpdates = async () => {
    if (!invite.candidate_id) return;
    setIsApplying(true);
    try {
      await applyProfileUpdate(
        response.id,
        invite.candidate_id,
        response,
        invite.candidate_owner_id || invite.created_by,
        organizationId   // ← passes org for silent talent pool sync
      );
      toast.success(`Profile updated for ${response.candidate_name}`);
      onAction();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply updates');
    } finally {
      setIsApplying(false);
    }
  };

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      await addInviteResponseToJob(
        response.id, invite.id, jobId, response,
        invite.candidate_owner_id || invite.created_by,
        stage,           // ← stage picker value
        organizationId   // ← passes org for talent pool sync
      );
      toast.success(`${response.candidate_name} added to ${stage}`);
      onAction(); onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add candidate');
    } finally { setIsAdding(false); }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await rejectInviteResponse(response.id, rejectNotes || undefined);
      toast.success('Response rejected');
      onAction(); onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject');
    } finally { setIsRejecting(false); }
  };

  const content = (
    <>
      <style>{`@keyframes spin-ring { to { transform: rotate(360deg); } }`}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1200 }} />

      {/* Panel */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '520px', maxWidth: '95vw', background: '#fff', zIndex: 1201, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#111827' }}>
                {response.candidate_name}
              </h2>
              <SourceBadge source={invite.invite_source} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>
                Submitted {fmtDate(response.submitted_at || response.created_at)}
              </p>
              {/* View Full Profile link */}
              {talentPoolId && (
                <a href={`/talent-pool/${talentPoolId}`}
                  style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}>
                  <EyeIcon size={11} /> Full Profile
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex' }}>
            <X size={16} color="#6B7280" />
          </button>
        </div>

        {/* Status bar */}
        {isDecided && statusBar && (
          <div style={{ padding: '10px 24px', background: statusBar.bg, borderBottom: '1px solid #E5E7EB' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: statusBar.color }}>{statusBar.label}</p>
            {response.recruiter_notes && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#374151' }}>Notes: {response.recruiter_notes}</p>
            )}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Fit signals — always shown */}
          {job && <FitSignals response={response} job={job} />}

          {/* Inline notes — always visible */}
          <InlineNotes responseId={response.id} initialNotes={response.recruiter_notes} />

          {/* ── PIPELINE DIFF ── */}
          {isPipeline && !isDecided && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#C2410C' }}>⚠️ Review changes before applying</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9A3412' }}>
                  The candidate submitted updated details. Compare below, then click "Apply Updates" to save to their profile.
                </p>
              </div>
              <div style={{ border: '1px solid #F3F4F6', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '8px 14px', background: '#F8FAFC', borderBottom: '1px solid #F3F4F6' }}>
                  {['Field', 'Current Value', 'New Value (Submitted)'].map(h => (
                    <span key={h} style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>
                {[
                  { field: 'Name',          cur: currentValues.name,          nxt: response.candidate_name },
                  { field: 'Email',         cur: currentValues.email,         nxt: response.email },
                  { field: 'Phone',         cur: currentValues.phone,         nxt: response.phone },
                  { field: 'Experience',    cur: currentValues.experience,    nxt: response.total_experience },
                  { field: 'Location',      cur: currentValues.location,      nxt: response.current_location },
                  { field: 'Current CTC',   cur: currentValues.current_salary ? fmt(Number(currentValues.current_salary)) : null, nxt: response.parsed_current_ctc ? fmt(response.parsed_current_ctc) : null },
                  { field: 'Expected CTC',  cur: currentValues.expected_salary ? fmt(Number(currentValues.expected_salary)) : null, nxt: response.parsed_expected_ctc ? fmt(response.parsed_expected_ctc) : null },
                  { field: 'Notice Period', cur: currentValues.notice_period, nxt: response.notice_period },
                  { field: 'LinkedIn',      cur: currentValues.metadata?.linkedInId, nxt: response.linkedin_url },
                  { field: 'Resume',        cur: currentValues.resume_url ? 'Existing resume' : null, nxt: response.resume_url ? 'New resume uploaded' : null },
                ].filter(r => r.nxt).map((row, i) => {
                  const changed = row.cur !== row.nxt && row.nxt;
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 14px', borderBottom: i < 9 ? '1px solid #F9FAFB' : 'none', background: changed ? '#FFFBEB' : '#fff' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{row.field}</span>
                      <span style={{ fontSize: '12px', color: changed ? '#9CA3AF' : '#374151', textDecoration: changed ? 'line-through' : 'none' }}>{row.cur || '—'}</span>
                      <span style={{ fontSize: '12px', fontWeight: changed ? 700 : 400, color: changed ? '#7C3AED' : '#374151' }}>
                        {row.nxt || '—'}{changed && <span style={{ marginLeft: '4px', fontSize: '10px' }}>✨</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── ZIVE-X standard view ── */}
          {!isPipeline && (
            <>
              <DrawSec title="Contact">
                <InfoRow label="Email" value={response.email} />
                <InfoRow label="Phone" value={response.phone || '—'} />
                {response.linkedin_url && (
                  <InfoRow label="LinkedIn" value={
                    <a href={response.linkedin_url} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#7B43F1', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Linkedin size={13} /> View Profile
                    </a>
                  } />
                )}
              </DrawSec>
              <DrawSec title="Professional">
                <InfoRow label="Experience" icon={<Briefcase size={14} />} value={response.total_experience || `${response.parsed_experience_years ?? 0} yrs`} />
                {response.current_company     && <InfoRow label="Company"     value={response.current_company} />}
                {response.current_designation && <InfoRow label="Designation" value={response.current_designation} />}
                <InfoRow label="Location" icon={<MapPin size={14} />} value={response.current_location || '—'} />
                <InfoRow label="Notice"   icon={<Clock size={14} />}  value={response.notice_period    || '—'} />
              </DrawSec>
              <DrawSec title="Compensation">
                <InfoRow label="Current CTC"  value={response.parsed_current_ctc  ? fmt(response.parsed_current_ctc)  : response.current_salary  || '—'} />
                <InfoRow label="Expected CTC" value={response.parsed_expected_ctc ? fmt(response.parsed_expected_ctc) : response.expected_salary || '—'} />
              </DrawSec>
              {response.top_skills?.length > 0 && (
                <DrawSec title="Skills">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {response.top_skills.map((s, i) => (
                      <span key={i} style={{ padding: '3px 10px', borderRadius: '99px', background: '#EDE9FE', color: '#7C3AED', fontSize: '12px', fontWeight: 500 }}>
                        {typeof s === 'string' ? s : s.name}
                      </span>
                    ))}
                  </div>
                </DrawSec>
              )}
            </>
          )}

          {/* Career preview (AI-parsed history) */}
          <CareerPreview response={response} />

          {/* Resume link */}
          {response.resume_url && (
            <div style={{ marginBottom: '16px' }}>
              <a href={response.resume_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: '1px solid #DDD6FE', background: '#F5F3FF', color: '#7C3AED', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                <FileText size={14} /> {isPipeline ? 'View New Resume' : 'View Resume'} <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!isDecided && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', flexShrink: 0, background: '#fff' }}>

            {/* PIPELINE: Apply Updates */}
            {isPipeline && !showRejectForm && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowRejectForm(true)} style={outBtn}>Dismiss</button>
                <button onClick={handleApplyUpdates} disabled={isApplying}
                  style={{ flex: 2, padding: '12px 16px', borderRadius: '10px', border: 'none', background: isApplying ? '#C4B5FD' : 'linear-gradient(135deg,#6D28D9,#7C3AED)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: isApplying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: isApplying ? 'none' : '0 4px 12px rgba(124,58,237,0.3)' }}>
                  {isApplying ? <><SpinRing /> Applying…</> : <><CheckCircle2 size={16} /> Apply Updates to Profile</>}
                </button>
              </div>
            )}

            {/* ZIVE-X: Stage picker + Add / Reject */}
            {!isPipeline && !showRejectForm && (
              <>
                <StagePicker value={stage} onChange={setStage} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowRejectForm(true)} style={outBtn}>Reject</button>
                  <button onClick={handleAdd} disabled={isAdding}
                    style={{ ...primBtn, flex: 2, opacity: isAdding ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {isAdding ? 'Adding…' : `+ Add to ${stage}`}
                  </button>
                </div>
              </>
            )}

            {/* Reject form */}
            {showRejectForm && !isPipeline && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px' }}>
                  Rejection notes (optional)
                </label>
                <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)}
                  placeholder="Reason…" rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => { setShowRejectForm(false); setRejectNotes(''); }} style={outBtn}>Cancel</button>
                  <button onClick={handleReject} disabled={isRejecting} style={{ ...dangBtn, opacity: isRejecting ? 0.6 : 1 }}>
                    {isRejecting ? 'Rejecting…' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            )}

            {/* Pipeline dismiss confirm */}
            {isPipeline && showRejectForm && (
              <div style={{ padding: '12px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#991B1B', fontWeight: 600 }}>Dismiss this update request?</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowRejectForm(false)} style={outBtn}>Cancel</button>
                  <button onClick={handleReject} disabled={isRejecting} style={{ ...dangBtn, opacity: isRejecting ? 0.6 : 1 }}>
                    {isRejecting ? 'Dismissing…' : 'Dismiss'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  return createPortal(content, document.body);
};

export default InviteResponseDrawer;