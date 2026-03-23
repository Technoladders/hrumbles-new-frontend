// src/components/jobs/job/invite/InviteResponseDrawer.tsx
// Pipeline invites: show submitted fields with "Apply Updates" button.
// Zive-X / Talent Pool: unchanged — Add to Pipeline / Reject.

import React, { useState, useEffect } from 'react';
import {
  X, ExternalLink, FileText, Briefcase, MapPin,
  DollarSign, Clock, Linkedin, RefreshCw, CheckCircle2,
} from 'lucide-react';
import {
  CandidateInviteResponse,
  CandidateInvite,
  addInviteResponseToJob,
  rejectInviteResponse,
  applyProfileUpdate,
} from '@/services/inviteService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InviteResponseDrawerProps {
  isOpen:   boolean;
  onClose:  () => void;
  invite:   CandidateInvite | null;
  response: CandidateInviteResponse | null;
  jobId:    string;
  onAction: () => void;
}

const InviteResponseDrawer: React.FC<InviteResponseDrawerProps> = ({
  isOpen, onClose, invite, response, jobId, onAction,
}) => {
  const [isApplying,     setIsApplying]     = useState(false);
  const [isAdding,       setIsAdding]       = useState(false);
  const [isRejecting,    setIsRejecting]    = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNotes,    setRejectNotes]    = useState('');
  // Current hr_job_candidates values for diff display
  const [currentValues,  setCurrentValues]  = useState<Record<string, any>>({});

  // Fetch current candidate values so we can show before/after diff
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

  if (!isOpen || !response || !invite) return null;

  const isPipeline  = invite.invite_source === 'pipeline';
  const isDecided   = response.status === 'auto_updated' || response.status === 'added_to_job' || response.status === 'rejected';

  const fmt = (v: number | null | undefined) =>
    v ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v) : null;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // ── Apply pipeline updates to hr_job_candidates ────────────────────────────
  const handleApplyUpdates = async () => {
    if (!invite.candidate_id) return;
    setIsApplying(true);
    try {
      await applyProfileUpdate(
        response.id,
        invite.candidate_id,
        response,
        invite.candidate_owner_id || invite.created_by
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

  // ── Add Zive-X response to pipeline ───────────────────────────────────────
  const handleAdd = async () => {
    setIsAdding(true);
    try {
      await addInviteResponseToJob(
        response.id, invite.id, jobId, response,
        invite.candidate_owner_id || invite.created_by
      );
      toast.success(`${response.candidate_name} added to job`);
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

  // ── Status bar config ──────────────────────────────────────────────────────
  const statusBarConfig: Record<string, { bg: string; color: string; label: string }> = {
    auto_updated: { bg: '#EDE9FE', color: '#7C3AED', label: '🔄 Profile applied to candidate record' },
    added_to_job: { bg: '#D1FAE5', color: '#065F46', label: '✅ Added to job' },
    rejected:     { bg: '#FEE2E2', color: '#991B1B', label: '❌ Rejected' },
  };
  const statusBar = statusBarConfig[response.status];

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1000 }} />

      <div style={{
        position:'fixed', top:0, right:0, bottom:0, width:'520px',
        maxWidth:'95vw', background:'#fff', zIndex:1001,
        display:'flex', flexDirection:'column',
        boxShadow:'-4px 0 24px rgba(0,0,0,0.12)',
      }}>
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #F3F4F6',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
              <h2 style={{ margin:0, fontSize:'17px', fontWeight:700, color:'#111827' }}>
                {response.candidate_name}
              </h2>
              <SourceBadge source={invite.invite_source} />
            </div>
            <p style={{ margin:0, fontSize:'12px', color:'#9CA3AF' }}>
              Submitted {fmtDate(response.submitted_at)}
            </p>
          </div>
          <button onClick={onClose} style={{ background:'#F3F4F6', border:'none',
            borderRadius:'8px', padding:'8px', cursor:'pointer', display:'flex' }}>
            <X size={16} color="#6B7280" />
          </button>
        </div>

        {/* Status bar if already decided */}
        {isDecided && statusBar && (
          <div style={{ padding:'10px 24px', background:statusBar.bg, borderBottom:'1px solid #E5E7EB' }}>
            <p style={{ margin:0, fontSize:'13px', fontWeight:600, color:statusBar.color }}>
              {statusBar.label}
            </p>
            {response.recruiter_notes && (
              <p style={{ margin:'4px 0 0 0', fontSize:'12px', color:'#374151' }}>
                Notes: {response.recruiter_notes}
              </p>
            )}
          </div>
        )}

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

          {/* ── PIPELINE DIFF VIEW ── */}
          {isPipeline && !isDecided && (
            <div style={{ marginBottom:'20px' }}>
              <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA',
                borderRadius:'10px', padding:'14px 16px', marginBottom:'16px' }}>
                <p style={{ margin:0, fontSize:'13px', fontWeight:600, color:'#C2410C' }}>
                  ⚠️ Review changes before applying
                </p>
                <p style={{ margin:'4px 0 0 0', fontSize:'12px', color:'#9A3412' }}>
                  The candidate has submitted updated details. Compare below and click "Apply Updates" to save to their profile.
                </p>
              </div>

              {/* Diff table */}
              <div style={{ border:'1px solid #F3F4F6', borderRadius:'10px', overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
                  padding:'8px 14px', background:'#F8FAFC', borderBottom:'1px solid #F3F4F6' }}>
                  {['Field','Current Value','New Value (Submitted)'].map(h => (
                    <span key={h} style={{ fontSize:'11px', fontWeight:700, color:'#64748B', textTransform:'uppercase' }}>{h}</span>
                  ))}
                </div>

                {[
                  { field:'Name',           cur: currentValues.name,          nxt: response.candidate_name },
                  { field:'Email',          cur: currentValues.email,         nxt: response.email          },
                  { field:'Phone',          cur: currentValues.phone,         nxt: response.phone          },
                  { field:'Experience',     cur: currentValues.experience,    nxt: response.total_experience },
                  { field:'Location',       cur: currentValues.location,      nxt: response.current_location },
                  { field:'Current CTC',    cur: currentValues.current_salary ? fmt(Number(currentValues.current_salary)) : null, nxt: response.parsed_current_ctc ? fmt(response.parsed_current_ctc) : null },
                  { field:'Expected CTC',   cur: currentValues.expected_salary ? fmt(Number(currentValues.expected_salary)) : null, nxt: response.parsed_expected_ctc ? fmt(response.parsed_expected_ctc) : null },
                  { field:'Notice Period',  cur: currentValues.notice_period, nxt: response.notice_period  },
                  { field:'LinkedIn',       cur: currentValues.metadata?.linkedInId, nxt: response.linkedin_url },
                  { field:'Resume',         cur: currentValues.resume_url ? 'Existing resume' : null, nxt: response.resume_url ? 'New resume uploaded' : null },
                ].filter(row => row.nxt).map((row, i) => {
                  const hasChanged = row.cur !== row.nxt && row.nxt;
                  return (
                    <div key={i} style={{
                      display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
                      padding:'10px 14px',
                      borderBottom: i < 9 ? '1px solid #F9FAFB' : 'none',
                      background: hasChanged ? '#FFFBEB' : '#fff',
                    }}>
                      <span style={{ fontSize:'12px', fontWeight:600, color:'#374151' }}>{row.field}</span>
                      <span style={{ fontSize:'12px', color: hasChanged ? '#9CA3AF' : '#374151',
                        textDecoration: hasChanged ? 'line-through' : 'none' }}>
                        {row.cur || '—'}
                      </span>
                      <span style={{ fontSize:'12px', fontWeight: hasChanged ? 700 : 400,
                        color: hasChanged ? '#7C3AED' : '#374151' }}>
                        {row.nxt || '—'}
                        {hasChanged && <span style={{ marginLeft:'4px', fontSize:'10px' }}>✨</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── ZIVE-X: standard profile view ── */}
          {!isPipeline && (
            <>
              <DrawSec title="Contact">
                <InfoRow label="Email"  value={response.email} />
                <InfoRow label="Phone"  value={response.phone || '—'} />
                {response.linkedin_url && (
                  <InfoRow label="LinkedIn" value={
                    <a href={response.linkedin_url} target="_blank" rel="noopener noreferrer"
                      style={{ color:'#7B43F1', fontSize:'13px', display:'flex', alignItems:'center', gap:'4px' }}>
                      <Linkedin size={13} /> View Profile
                    </a>
                  } />
                )}
              </DrawSec>

              <DrawSec title="Professional">
                <InfoRow label="Experience" icon={<Briefcase size={14} />}
                  value={response.total_experience || `${response.parsed_experience_years ?? 0} yrs`} />
                {response.current_company     && <InfoRow label="Company"     value={response.current_company} />}
                {response.current_designation && <InfoRow label="Designation" value={response.current_designation} />}
                <InfoRow label="Location" icon={<MapPin size={14} />}  value={response.current_location || '—'} />
                <InfoRow label="Notice"   icon={<Clock   size={14} />} value={response.notice_period    || '—'} />
              </DrawSec>

              <DrawSec title="Compensation">
                <InfoRow label="Current CTC"
                  value={response.parsed_current_ctc ? fmt(response.parsed_current_ctc) : response.current_salary || '—'} />
                <InfoRow label="Expected CTC"
                  value={response.parsed_expected_ctc ? fmt(response.parsed_expected_ctc) : response.expected_salary || '—'} />
              </DrawSec>

              {response.top_skills && response.top_skills.length > 0 && (
                <DrawSec title="Skills">
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                    {response.top_skills.map((s, i) => (
                      <span key={i} style={{ padding:'3px 10px', borderRadius:'99px',
                        background:'#EDE9FE', color:'#7C3AED', fontSize:'12px', fontWeight:500 }}>
                        {typeof s === 'string' ? s : s.name}
                      </span>
                    ))}
                  </div>
                </DrawSec>
              )}

              {response.resume_url && (
                <DrawSec title="Resume">
                  <a href={response.resume_url} target="_blank" rel="noopener noreferrer"
                    style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'10px 16px',
                      borderRadius:'8px', border:'1px solid #DDD6FE', background:'#F5F3FF',
                      color:'#7C3AED', fontSize:'13px', fontWeight:600, textDecoration:'none' }}>
                    <FileText size={14} /> View Resume <ExternalLink size={12} />
                  </a>
                </DrawSec>
              )}
            </>
          )}

          {/* Pipeline: also show resume link if submitted */}
          {isPipeline && response.resume_url && (
            <div style={{ marginTop:'8px' }}>
              <a href={response.resume_url} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'10px 16px',
                  borderRadius:'8px', border:'1px solid #DDD6FE', background:'#F5F3FF',
                  color:'#7C3AED', fontSize:'13px', fontWeight:600, textDecoration:'none' }}>
                <FileText size={14} /> View New Resume <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!isDecided && (
          <div style={{ padding:'16px 24px', borderTop:'1px solid #F3F4F6', flexShrink:0, background:'#fff' }}>

            {/* ── PIPELINE: Apply Updates button ── */}
            {isPipeline && (
              <div style={{ display:'flex', gap:'10px' }}>
                <button
                  onClick={() => { setShowRejectForm(true); }}
                  style={outBtn}
                >
                  Dismiss
                </button>
                <button
                  onClick={handleApplyUpdates}
                  disabled={isApplying}
                  style={{
                    flex:2, padding:'12px 16px', borderRadius:'10px', border:'none',
                    background: isApplying
                      ? '#C4B5FD'
                      : 'linear-gradient(135deg,#6D28D9,#7C3AED)',
                    color:'#fff', fontSize:'14px', fontWeight:700,
                    cursor: isApplying ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                    boxShadow: isApplying ? 'none' : '0 4px 12px rgba(124,58,237,0.3)',
                  }}
                >
                  {isApplying
                    ? <><SpinRing /> Applying...</>
                    : <><CheckCircle2 size={16} /> Apply Updates to Profile</>
                  }
                </button>
              </div>
            )}

            {/* ── ZIVE-X: Add to Pipeline / Reject ── */}
            {!isPipeline && (
              showRejectForm ? (
                <div>
                  <label style={{ fontSize:'12px', fontWeight:600, color:'#374151', display:'block', marginBottom:'8px' }}>
                    Rejection notes (optional)
                  </label>
                  <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)}
                    placeholder="Reason..." rows={3}
                    style={{ width:'100%', padding:'10px 12px', borderRadius:'8px',
                      border:'1px solid #E5E7EB', fontSize:'13px', resize:'vertical',
                      fontFamily:'inherit', boxSizing:'border-box', outline:'none' }} />
                  <div style={{ display:'flex', gap:'10px', marginTop:'10px' }}>
                    <button onClick={() => { setShowRejectForm(false); setRejectNotes(''); }} style={outBtn}>Cancel</button>
                    <button onClick={handleReject} disabled={isRejecting}
                      style={{ ...dangBtn, opacity: isRejecting ? 0.6 : 1 }}>
                      {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={() => setShowRejectForm(true)} style={outBtn}>Reject</button>
                  <button onClick={handleAdd} disabled={isAdding}
                    style={{ ...primBtn, flex:2, opacity: isAdding ? 0.7 : 1 }}>
                    {isAdding ? 'Adding...' : '+ Add to Job Pipeline'}
                  </button>
                </div>
              )
            )}

            {/* Dismiss confirm for pipeline */}
            {isPipeline && showRejectForm && (
              <div style={{ marginTop:'12px', padding:'12px', background:'#FEF2F2',
                borderRadius:'8px', border:'1px solid #FECACA' }}>
                <p style={{ margin:'0 0 10px 0', fontSize:'13px', color:'#991B1B', fontWeight:600 }}>
                  Dismiss this update request?
                </p>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => setShowRejectForm(false)} style={outBtn}>Cancel</button>
                  <button onClick={handleReject} disabled={isRejecting}
                    style={{ ...dangBtn, opacity: isRejecting ? 0.6 : 1 }}>
                    {isRejecting ? 'Dismissing...' : 'Dismiss'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SourceBadge({ source }) {
  const config = {
    pipeline:   { label:'Pipeline',    bg:'#EDE9FE', color:'#7C3AED' },
    zivex:      { label:'Zive-X',      bg:'#DBEAFE', color:'#1D4ED8' },
    talentpool: { label:'Talent Pool', bg:'#D1FAE5', color:'#065F46' },
  };
  const c = config[source] || config.zivex;
  return (
    <span style={{ padding:'2px 8px', borderRadius:'99px', background:c.bg,
      color:c.color, fontSize:'11px', fontWeight:700 }}>
      {c.label}
    </span>
  );
}

function DrawSec({ title, children }) {
  return (
    <div style={{ marginBottom:'20px' }}>
      <p style={{ margin:'0 0 10px 0', fontSize:'11px', fontWeight:700, color:'#9CA3AF',
        textTransform:'uppercase', letterSpacing:'0.6px' }}>{title}</p>
      <div style={{ background:'#FAFAFA', borderRadius:'10px', border:'1px solid #F3F4F6',
        padding:'12px 14px', display:'flex', flexDirection:'column', gap:'10px' }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon = null }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <span style={{ fontSize:'12px', color:'#9CA3AF', display:'flex', alignItems:'center', gap:'4px' }}>
        {icon}{label}
      </span>
      <span style={{ fontSize:'13px', color:'#111827', fontWeight:500, textAlign:'right', maxWidth:'60%' }}>
        {value}
      </span>
    </div>
  );
}

function SpinRing() {
  return (
    <span style={{ display:'inline-block', width:'14px', height:'14px',
      border:'2px solid rgba(255,255,255,0.35)', borderTopColor:'#fff',
      borderRadius:'50%', animation:'spin-ring 0.7s linear infinite' }} />
  );
}

const primBtn: React.CSSProperties = {
  flex:1, padding:'11px 16px', borderRadius:'10px', border:'none',
  background:'#7B43F1', color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer',
};
const outBtn: React.CSSProperties = {
  flex:1, padding:'11px 16px', borderRadius:'10px',
  border:'1px solid #E5E7EB', background:'#fff',
  color:'#374151', fontSize:'14px', fontWeight:600, cursor:'pointer',
};
const dangBtn: React.CSSProperties = {
  flex:1, padding:'11px 16px', borderRadius:'10px', border:'none',
  background:'#DC2626', color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer',
};

export default InviteResponseDrawer;
// 