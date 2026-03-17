// src/components/jobs/job/invite/InviteCandidateModal.tsx
// Two-column: LEFT = job preview, RIGHT = invite form
// Responsive, scrollable, pre-filled message template
// All new — nothing reused.

import React, { useState, useEffect } from 'react';
import {
  X, Send, Copy, Check, Mail, MessageSquare, Phone,
  Clock, ChevronDown, MapPin, Briefcase, Tag, ChevronRight,
  Users, Building2,
} from 'lucide-react';
import { sendCandidateInvite } from '@/services/inviteService';
import { toast } from 'sonner';

interface Job {
  id: string;
  title: string;
  location?: string[] | string;
  experience?: { min?: { value?: number }; max?: { value?: number } };
  skills?: string[];
  description?: string;
  hiringMode?: string;
  jobType?: string;
  clientDetails?: { clientName?: string };
  noticePeriod?: string;
  department?: string;
}

interface InviteCandidateModalProps {
  isOpen:             boolean;
  onClose:            () => void;
  jobId:              string;
  job?:               Job;
  prefillEmail?:      string;
  prefillName?:       string;
  prefillPhone?:      string;
  // Pipeline-invite extras
  candidateId?:       string;
  candidateOwnerId?:  string;
  inviteSource?:      'pipeline' | 'zivex' | 'talentpool';
}

type Channel = 'email' | 'whatsapp' | 'both';

const EXPIRY_OPTIONS = [
  { label: '3 days',  value: 3  },
  { label: '7 days',  value: 7  },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
];

function buildTemplate(name: string, jobTitle: string, source: string) {
  const firstName = name ? name.split(' ')[0] : '';
  const greeting  = firstName ? `Hi ${firstName},` : 'Hi there,';
  if (source === 'pipeline') {
    return `${greeting}\n\nWe're preparing to present your profile for the ${jobTitle} position and would love to make sure your details are up to date.\n\nPlease take 2 minutes to verify and update your information — this helps us represent you accurately to our clients.`;
  }
  return `${greeting}\n\nWe came across your profile and think you'd be a great fit for the ${jobTitle} role.\n\nWe'd love to learn more about you! Please take 3 minutes to complete your application.`;
}

const InviteCandidateModal: React.FC<InviteCandidateModalProps> = ({
  isOpen, onClose, jobId, job,
  prefillEmail = '', prefillName = '', prefillPhone = '',
  candidateId, candidateOwnerId,
  inviteSource = 'zivex',
}) => {
  const [name,          setName]          = useState(prefillName);
  const [email,         setEmail]         = useState(prefillEmail);
  const [phone,         setPhone]         = useState(prefillPhone);
  const [channel,       setChannel]       = useState<Channel>('email');
  const [expiryDays,    setExpiryDays]    = useState(7);
  const [message,       setMessage]       = useState('');
  const [isSending,     setIsSending]     = useState(false);
  const [sentLink,      setSentLink]      = useState('');
  const [copied,        setCopied]        = useState(false);
  const [showExpiry,    setShowExpiry]    = useState(false);
  const [descExpanded,  setDescExpanded]  = useState(false);
  
  console.log("jobdatainInvitemodal", job);

  // Build pre-filled template whenever name or job changes
  useEffect(() => {
    if (job?.title) {
      setMessage(buildTemplate(prefillName, job.title, inviteSource));
    }
  }, [prefillName, job?.title, inviteSource]);

  if (!isOpen) return null;

  const locations = job?.location
    ? (Array.isArray(job.location) ? job.location : [job.location])
    : [];

  const expMin = job?.experience?.min?.value;
  const expMax = job?.experience?.max?.value;
  const expText = expMin != null && expMax != null
    ? `${expMin}–${expMax} yrs`
    : expMin != null ? `${expMin}+ yrs`
    : expMax != null ? `Up to ${expMax} yrs`
    : null;

  const descPreview = job?.description
    ? (descExpanded ? job.description : job.description.slice(0, 300) + (job.description.length > 300 ? '...' : ''))
    : null;

  const handleSend = async () => {
    if (!email && (channel === 'email' || channel === 'both')) {
      toast.error('Email is required'); return;
    }
    if (!phone && (channel === 'whatsapp' || channel === 'both')) {
      toast.error('Phone is required'); return;
    }
    setIsSending(true);
    try {
      const result = await sendCandidateInvite({
        jobId,
        jobTitle:         job?.title || '',
        candidateName:    name       || undefined,
        candidateEmail:   email      || undefined,
        candidatePhone:   phone      || undefined,
        channel,
        expiryDays,
        customMessage:    message    || undefined,
        candidateId,
        candidateOwnerId,
        inviteSource,
      });
      setSentLink(result.link);
      toast.success('Invite sent successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sentLink);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setSentLink('');
    setCopied(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
      />

      {/* Modal */}
      <div style={{
        position:    'fixed',
        top:         '50%',
        left:        '55%',
        transform:   'translate(-50%, -50%)',
        zIndex:      1001,
        width:       'calc(100vw - 32px)',
        maxWidth:    '860px',
        maxHeight:   '75vh',
        background:  '#fff',
        borderRadius: '16px',
        boxShadow:   '0 24px 64px rgba(0,0,0,0.2)',
        display:     'flex',
        flexDirection: 'column',
        overflow:    'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          padding:        '18px 24px',
          borderBottom:   '1px solid #F3F4F6',
          flexShrink:     0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>
              {inviteSource === 'pipeline' ? 'Request Profile Update' : 'Invite Candidate'}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9CA3AF' }}>
              {job?.title || 'Job Invite'}
              {inviteSource === 'pipeline' && (
                <span style={{
                  marginLeft: '8px', padding: '2px 8px', borderRadius: '99px',
                  background: '#EDE9FE', color: '#7C3AED', fontSize: '11px', fontWeight: 600,
                }}>
                  Pipeline
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: '#F3F4F6', border: 'none', borderRadius: '8px',
              padding: '7px', cursor: 'pointer', display: 'flex',
            }}
          >
            <X size={16} color="#6B7280" />
          </button>
        </div>

        {/* ── Body — two columns ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* ── LEFT: Job preview ── */}
          <div style={{
            width:         '42%',
            flexShrink:    0,
            background:    '#FAFAFA',
            borderRight:   '1px solid #F3F4F6',
            overflowY:     'auto',
            padding:       '24px 20px',
          }}>
            {job ? (
              <>
                {/* Title + badges */}
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
                    {job.title}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {job.hiringMode && <Badge text={job.hiringMode} color="#7C3AED" bg="#EDE9FE" />}
                    {job.jobType    && <Badge text={job.jobType}    color="#0369A1" bg="#E0F2FE" />}
                    {job.department && <Badge text={job.department} color="#065F46" bg="#D1FAE5" />}
                  </div>
                </div>

                {/* Meta rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {locations.length > 0 && (
                    <MetaRow icon={<MapPin size={13} />}>
                      {locations.join(' · ')}
                    </MetaRow>
                  )}
                  {expText && (
                    <MetaRow icon={<Briefcase size={13} />}>
                      {expText} experience
                    </MetaRow>
                  )}
                  {job.noticePeriod && (
                    <MetaRow icon={<Clock size={13} />}>
                      Notice: {job.noticePeriod}
                    </MetaRow>
                  )}
                  {job.clientDetails?.clientName && (
                    <MetaRow icon={<Building2 size={13} />}>
                      {job.clientDetails.clientName}
                    </MetaRow>
                  )}
                </div>

                {/* Skills */}
                {job.skills && job.skills.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 700,
                      color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Required Skills
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {job.skills.slice(0, 12).map((s, i) => (
                        <span key={i} style={{
                          padding: '3px 9px', borderRadius: '99px',
                          background: '#F1F5F9', color: '#475569',
                          fontSize: '11px', fontWeight: 500, border: '1px solid #E2E8F0',
                        }}>
                          {s}
                        </span>
                      ))}
                      {job.skills.length > 12 && (
                        <span style={{ padding: '3px 9px', fontSize: '11px', color: '#9CA3AF' }}>
                          +{job.skills.length - 12} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {descPreview && (
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 700,
                      color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Job Description
                    </p>
                    <p style={{
                      margin: 0, fontSize: '12px', color: '#6B7280',
                      lineHeight: 1.7, whiteSpace: 'pre-line',
                    }}>
                      {descPreview}
                    </p>
                    {job.description && job.description.length > 300 && (
                      <button
                        onClick={() => setDescExpanded(!descExpanded)}
                        style={{
                          marginTop: '6px', background: 'none', border: 'none',
                          color: '#7C3AED', fontSize: '12px', fontWeight: 600,
                          cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '3px',
                        }}
                      >
                        {descExpanded ? 'Show less' : 'Read more'}
                        <ChevronRight size={12} style={{ transform: descExpanded ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: '#9CA3AF' }}>
                <Briefcase size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '13px' }}>No job details available</p>
              </div>
            )}
          </div>

          {/* ── RIGHT: Invite form ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {sentLink ? (
              // ── Success state ──
              <div>
                <div style={{
                  background: '#F0FDF4', border: '1px solid #86EFAC',
                  borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, color: '#15803D' }}>
                    Invite sent successfully!
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#166534' }}>
                    {inviteSource === 'pipeline'
                      ? 'The candidate will receive an email to update their profile.'
                      : 'The candidate will receive an email with their application link.'
                    }
                  </p>
                </div>

                <Label>Application Link</Label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <input readOnly value={sentLink} style={{
                    flex: 1, padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #E5E7EB', fontSize: '11px',
                    color: '#374151', background: '#F9FAFB', fontFamily: 'monospace',
                  }} />
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: '10px 14px', borderRadius: '8px', border: 'none',
                      background: copied ? '#D1FAE5' : '#7C3AED',
                      color: copied ? '#065F46' : '#fff',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <button onClick={handleClose} style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  border: '1px solid #E5E7EB', background: '#fff',
                  color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}>
                  Close
                </button>
              </div>
            ) : (
              // ── Form ──
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Candidate name */}
                <div>
                  <Label>Candidate Name <Opt /></Label>
                  <input
                    type="text" value={name} placeholder="e.g. Kamesh Rajan"
                    onChange={e => setName(e.target.value)}
                    style={ipt}
                  />
                </div>

                {/* Channel */}
                <div>
                  <Label>Send Via</Label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['email', 'whatsapp', 'both'] as Channel[]).map(ch => (
                      <button key={ch} type="button" onClick={() => setChannel(ch)} style={{
                        flex: 1, padding: '9px 4px', borderRadius: '10px',
                        border: channel === ch ? '2px solid #7C3AED' : '1px solid #E5E7EB',
                        background: channel === ch ? '#EDE9FE' : '#fff',
                        color: channel === ch ? '#7C3AED' : '#6B7280',
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      }}>
                        {ch === 'email'    && <Mail size={14} />}
                        {ch === 'whatsapp' && <MessageSquare size={14} />}
                        {ch === 'both'     && <Phone size={14} />}
                        {ch.charAt(0).toUpperCase() + ch.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email */}
                {(channel === 'email' || channel === 'both') && (
                  <div>
                    <Label>Email Address <Req /></Label>
                    <input
                      type="email" value={email} placeholder="candidate@example.com"
                      onChange={e => setEmail(e.target.value)}
                      style={ipt}
                    />
                  </div>
                )}

                {/* Phone */}
                {(channel === 'whatsapp' || channel === 'both') && (
                  <div>
                    <Label>Phone Number <Req /></Label>
                    <input
                      type="tel" value={phone} placeholder="+91 9876543210"
                      onChange={e => setPhone(e.target.value)}
                      style={ipt}
                    />
                  </div>
                )}

                {/* Expiry */}
                <div>
                  <Label>Link Expires After</Label>
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button" onClick={() => setShowExpiry(!showExpiry)}
                      style={{
                        ...ipt, display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', cursor: 'pointer',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} color="#9CA3AF" />
                        {EXPIRY_OPTIONS.find(o => o.value === expiryDays)?.label}
                      </span>
                      <ChevronDown size={13} color="#9CA3AF" />
                    </button>
                    {showExpiry && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        zIndex: 10, background: '#fff', border: '1px solid #E5E7EB',
                        borderRadius: '8px', marginTop: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                      }}>
                        {EXPIRY_OPTIONS.map(opt => (
                          <button key={opt.value} type="button"
                            onClick={() => { setExpiryDays(opt.value); setShowExpiry(false); }}
                            style={{
                              width: '100%', padding: '10px 14px', border: 'none', textAlign: 'left',
                              background: expiryDays === opt.value ? '#EDE9FE' : '#fff',
                              color: expiryDays === opt.value ? '#7C3AED' : '#374151',
                              fontSize: '13px', fontWeight: expiryDays === opt.value ? 600 : 400,
                              cursor: 'pointer',
                            }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <Label>Message Template</Label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={6}
                    style={{ ...ipt, height: 'auto', resize: 'vertical', minHeight: '120px', lineHeight: 1.6 }}
                  />
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#9CA3AF' }}>
                    Pre-filled based on candidate and job — edit as needed.
                  </p>
                </div>

                {/* Send button */}
                <button
                  type="button" onClick={handleSend} disabled={isSending}
                  style={{
                    padding: '14px', borderRadius: '10px', border: 'none',
                    background: isSending ? '#C4B5FD' : 'linear-gradient(135deg,#6D28D9,#7C3AED)',
                    color: '#fff', fontSize: '14px', fontWeight: 700,
                    cursor: isSending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: isSending ? 'none' : '0 4px 12px rgba(124,58,237,0.35)',
                  }}
                >
                  {isSending ? (
                    <><SpinRing />&nbsp;Sending...</>
                  ) : (
                    <><Send size={14} />{inviteSource === 'pipeline' ? 'Send Update Request' : 'Send Invite'}</>
                  )}
                </button>

              </div>
            )}
          </div>
        </div>

      </div>
      <style>{`@keyframes spin-ring { to { transform:rotate(360deg); } }`}</style>
    </>
  );
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function Badge({ text, color, bg }) {
  return (
    <span style={{ padding: '2px 8px', borderRadius: '99px', background: bg,
      color, fontSize: '11px', fontWeight: 600 }}>
      {text}
    </span>
  );
}

function MetaRow({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px',
      fontSize: '12px', color: '#6B7280' }}>
      <span style={{ color: '#9CA3AF', flexShrink: 0 }}>{icon}</span>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700,
      color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px',
      marginBottom: '6px' }}>
      {children}
    </label>
  );
}

function Req() {
  return <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>;
}

function Opt() {
  return <span style={{ color: '#9CA3AF', fontWeight: 400, textTransform: 'none',
    fontSize: '10px', marginLeft: '4px' }}>(optional)</span>;
}

function SpinRing() {
  return (
    <span style={{
      display: 'inline-block', width: '14px', height: '14px',
      border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
      borderRadius: '50%', animation: 'spin-ring 0.7s linear infinite',
    }} />
  );
}

const ipt: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '1px solid #E5E7EB', fontSize: '13px', color: '#111827',
  background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

export default InviteCandidateModal;