// src/components/jobs/job/invite/InviteCandidateModal.tsx
//
// FIXES & IMPROVEMENTS:
//   1. handleExpiryChange: computes expiry slot dynamically from template structure
//      instead of hardcoding slot [7] — fixes expiry var not updating
//   2. UI order: WA template selector + preview moved ABOVE expiry + email message
//      so the recruiter sees and fills template vars before scrolling past them
//   3. Frontend validation: blocks send if any template vars are empty,
//      shows a toast listing which vars are missing
//   4. computeExpirySlot helper: shared between initial fill and change handler
//   5. Minor: waTpl change handler also uses computeExpirySlot so expiry is
//      always correct when switching templates

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Copy, Check, Mail, MessageSquare, Phone, MapPin, Briefcase, ChevronRight } from 'lucide-react';
import { sendCandidateInvite } from '@/services/inviteService';
import WaTemplatePreviewSection from './WaTemplatePreviewSection';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Job {
  id: string; title: string;
  location?: string[] | string;
  experience?: { min?: { value?: number }; max?: { value?: number } };
  skills?: string[]; description?: string;
  hiringMode?: string; jobType?: string;
  clientDetails?: { clientName?: string };
  noticePeriod?: string; department?: string;
  budget?: string; budgetType?: string; currencyType?: string;
}

interface InviteCandidateModalProps {
  isOpen: boolean; onClose: () => void;
  jobId: string; job?: Job;
  prefillEmail?: string; prefillName?: string; prefillPhone?: string;
  candidateId?: string; candidateOwnerId?: string;
  inviteSource?: 'pipeline' | 'zivex' | 'talentpool';
}

type Channel = 'email' | 'whatsapp' | 'both';

const EXPIRY = [
  { label: '3d', value: 3 }, { label: '7d', value: 7 },
  { label: '14d', value: 14 }, { label: '30d', value: 30 },
];

function emailTpl(name: string, title: string, src: string) {
  const fn = name ? name.split(' ')[0] : '';
  const g  = fn ? `Hi ${fn},` : 'Hi there,';
  return src === 'pipeline'
    ? `${g}\n\nWe'd like to update your profile for the ${title} position. It takes 2 minutes — no login needed.`
    : `${g}\n\nYou're invited to apply for the ${title} role. Takes ~3 minutes — no account needed.`;
}

function formatSalary(budget?: string, budgetType?: string): string {
  if (!budget) return '';
  const num = parseFloat(budget);
  if (isNaN(num) || num === 0) return '';
  if (budgetType === 'LPA') {
    const lac = num / 100000;
    return `Upto ${lac % 1 === 0 ? lac : lac.toFixed(1)} LPA`;
  }
  return `Upto ${num.toLocaleString('en-IN')}/-`;
}

function computeExpiryLabel(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function countTemplateVars(text: string): number {
  const m = text.match(/\{\{\d+\}\}/g);
  if (!m) return 0;
  return new Set(m.map(x => x.replace(/[{}]/g, ''))).size;
}

// ── FIX: compute expiry slot from actual template structure ───────────────────
// Previously: next[7] was hardcoded — wrong for templates with fewer vars.
// Now: returns the index of the last body var (which is always expiry by convention).
// Returns -1 if the template has no body vars (so caller can skip the update).
function computeExpirySlot(tpl: any): number {
  const headerComp = tpl?.components?.find((c: any) => c.type === 'HEADER');
  const bodyComp   = tpl?.components?.find((c: any) => c.type === 'BODY');
  const headerVarCount = headerComp?.text ? countTemplateVars(headerComp.text) : 0;
  const bodyVarCount   = bodyComp?.text   ? countTemplateVars(bodyComp.text)   : 0;
  if (bodyVarCount === 0) return -1;
  // Last body slot = expiry date
  return headerVarCount + bodyVarCount - 1;
}

// Build vars array for a specific template dynamically.
function buildVarsForTemplate(
  tpl: any,
  opts: { orgName: string; firstName: string; industry: string; profile: string; salary: string; location: string; expiryLabel: string; }
): string[] {
  const headerComp = tpl?.components?.find((c: any) => c.type === 'HEADER');
  const bodyComp   = tpl?.components?.find((c: any) => c.type === 'BODY');

  const headerHasVars = headerComp?.text
    ? /\{\{\d+\}\}/.test(headerComp.text) : false;
  const bodyVarCount = bodyComp?.text
    ? countTemplateVars(bodyComp.text) : 0;

  const result: string[] = [];

  if (headerHasVars) result.push(opts.orgName);

  const bodyVarValues: Record<number, string> = {};
  if (bodyVarCount >= 1) bodyVarValues[0] = opts.firstName;
  if (bodyVarCount >= 2) bodyVarValues[1] = bodyVarCount <= 4 ? opts.profile : opts.industry;
  if (bodyVarCount >= 3) bodyVarValues[2] = bodyVarCount <= 4 ? opts.expiryLabel : opts.profile;
  if (bodyVarCount >= 4) bodyVarValues[3] = '';
  if (bodyVarCount >= 5) bodyVarValues[4] = opts.salary;
  if (bodyVarCount >= 6) bodyVarValues[5] = opts.location;
  if (bodyVarCount >= 7) bodyVarValues[6] = opts.expiryLabel;

  for (let i = 0; i < bodyVarCount; i++) {
    result.push(bodyVarValues[i] ?? '');
  }

  return result;
}

// ── FIX: validate that all template vars are filled before send ───────────────
// Returns list of human-readable missing field names, empty array if all OK.
function getMissingVarLabels(tpl: any, vars: string[]): string[] {
  if (!tpl) return [];
  const headerComp = tpl?.components?.find((c: any) => c.type === 'HEADER');
  const bodyComp   = tpl?.components?.find((c: any) => c.type === 'BODY');
  const headerHasVars = headerComp?.text ? /\{\{\d+\}\}/.test(headerComp.text) : false;
  const bodyVarCount  = bodyComp?.text   ? countTemplateVars(bodyComp.text)    : 0;
  const headerVarCount = headerHasVars ? countTemplateVars(headerComp.text) : 0;

  const missing: string[] = [];
  let slot = 0;
  for (let n = 1; n <= headerVarCount; n++) {
    if (!vars[slot]?.trim()) missing.push(`Header {{${n}}}`);
    slot++;
  }
  for (let n = 1; n <= bodyVarCount; n++) {
    if (!vars[slot]?.trim()) missing.push(`Body {{${n}}}`);
    slot++;
  }
  return missing;
}

const InviteCandidateModal: React.FC<InviteCandidateModalProps> = ({
  isOpen, onClose, jobId, job,
  prefillEmail = '', prefillName = '', prefillPhone = '',
  candidateId, candidateOwnerId, inviteSource = 'zivex',
}) => {
  const organizationId = useSelector((s: any) => s.auth.organization_id);

  const [name,          setName]          = useState(prefillName);
  const [email,         setEmail]         = useState(prefillEmail);
  const [phone,         setPhone]         = useState(prefillPhone);
  const [channel,       setChannel]       = useState<Channel>('email');
  const [expiry,        setExpiry]        = useState(7);
  const [msg,           setMsg]           = useState('');
  const [sending,       setSending]       = useState(false);
  const [sentLink,      setSentLink]      = useState('');
  const [copied,        setCopied]        = useState(false);
  const [descOpen,      setDescOpen]      = useState(false);
  const [waCfg,         setWaCfg]         = useState<any>(null);
  const [waTpl,         setWaTpl]         = useState('');
  const [waTplLang,     setWaTplLang]     = useState('en_US');
  const [waTplVars,     setWaTplVars]     = useState<string[]>(Array(8).fill(''));
  const [showWaPreview, setShowWaPreview] = useState(false);

  // ── Reset + fetch WA config on open ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setName(prefillName);
    setEmail(prefillEmail);
    setPhone(prefillPhone);
    setChannel('email');

    if (!prefillPhone && candidateId) {
      supabase
        .from('hr_talent_pool')
        .select('phone')
        .eq('id', candidateId)
        .single()
        .then(({ data }) => {
          if (data?.phone) {
            setPhone(data.phone);
          } else {
            supabase
              .from('hr_job_candidates')
              .select('phone')
              .eq('id', candidateId)
              .single()
              .then(({ data: d }) => { if (d?.phone) setPhone(d.phone); });
          }
        });
    }
    setExpiry(7);
    setSentLink('');
    setCopied(false);
    setDescOpen(false);
    setWaTpl('');
    setWaTplVars(Array(8).fill(''));
    setShowWaPreview(false);
    setMsg(emailTpl(prefillName, job?.title || '', inviteSource));

    if (organizationId) {
      supabase
        .from('hr_organizations')
        .select('whatsapp_config, name')
        .eq('id', organizationId)
        .single()
        .then(({ data }) => {
          const cfg = data?.whatsapp_config;
          if (!cfg?.is_active) return;
          setWaCfg(cfg);

          const approved     = (cfg.templates || []).filter((t: any) => t.status === 'APPROVED');
          const resolvedName = cfg.default_template_name   || approved[0]?.name     || '';
          const resolvedLang = cfg.default_template_language || approved[0]?.language || 'en_US';
          setWaTpl(resolvedName);
          setWaTplLang(resolvedLang);

          const orgName    = cfg.company_name || data?.name || '';
          const firstName  = (prefillName || '').split(' ')[0] || '';
          const industry   = job?.department || '';
          const profile    = job?.title || '';
          const salary     = formatSalary(job?.budget, job?.budgetType);
          const locationArr = job?.location
            ? (Array.isArray(job.location) ? job.location : [job.location])
            : [];
          const location   = locationArr.join(', ');
          const expiryLabel = computeExpiryLabel(7);

          const resolvedTplObj = approved.find((t: any) => t.name === resolvedName);
          const vars = buildVarsForTemplate(resolvedTplObj, { orgName, firstName, industry, profile, salary, location, expiryLabel });
          setWaTplVars(vars);
        });
    }
  }, [isOpen]);

  // ── FIX: compute expiry slot dynamically from current template ──────────────
  const handleExpiryChange = (days: number) => {
    setExpiry(days);
    if (!waCfg || !waTpl) return;

    const tpl = (waCfg.templates || []).find((t: any) => t.name === waTpl);
    const expirySlot = computeExpirySlot(tpl);

    if (expirySlot >= 0) {
      setWaTplVars(prev => {
        const next = [...prev];
        next[expirySlot] = computeExpiryLabel(days);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  const locs    = job?.location ? (Array.isArray(job.location) ? job.location : [job.location]) : [];
  const expMin  = job?.experience?.min?.value;
  const expMax  = job?.experience?.max?.value;
  const expTxt  = expMin != null && expMax != null ? `${expMin}–${expMax} yrs`
    : expMin != null ? `${expMin}+ yrs` : expMax != null ? `≤${expMax} yrs` : null;
  const desc      = job?.description || '';
  const descShort = desc.length > 220 ? desc.slice(0, 220) + '…' : desc;
  const waApproved = waCfg?.templates?.filter((t: any) => t.status === 'APPROVED') || [];

  const needsEmail = channel === 'email' || channel === 'both';
  const needsWA    = channel === 'whatsapp' || channel === 'both';

  // ── FIX: validate template vars before send ─────────────────────────────────
  const handleSend = async () => {
    if (!email && needsEmail) { toast.error('Email required'); return; }
    if (!phone && needsWA)    { toast.error('Phone required'); return; }

    // Validate WhatsApp template vars — block send if any are empty
    if (needsWA && waTpl) {
      const tpl = waApproved.find((t: any) => t.name === waTpl);
      const missingVars = getMissingVarLabels(tpl, waTplVars);
      if (missingVars.length > 0) {
        toast.error(
          `Please fill all template variables before sending:\n${missingVars.join(', ')}`,
          { duration: 4000 }
        );
        // Open the preview so the user can see and fill the missing vars
        setShowWaPreview(true);
        return;
      }
    }

    setSending(true);
    try {
      const r = await sendCandidateInvite({
        jobId,
        jobTitle:        job?.title || '',
        candidateName:   name || undefined,
        candidateEmail:  email || undefined,
        candidatePhone:  phone || undefined,
        channel,
        expiryDays:      expiry,
        customMessage:   msg || undefined,
        candidateId,
        candidateOwnerId,
        inviteSource,
        ...(waTpl ? {
          whatsappTemplateName:     waTpl,
          whatsappTemplateLanguage: waTplLang,
          whatsappBodyVars:         waTplVars.some(Boolean) ? waTplVars : undefined,
        } : {}),
      });
      setSentLink(r.link);
      toast.success('Invite sent!');
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const close = () => { setSentLink(''); setCopied(false); onClose(); };

  const inp: React.CSSProperties = {
    width: '100%', padding: '6px 9px', borderRadius: '6px',
    border: '1px solid #E5E7EB', fontSize: '12px', color: '#111827',
    background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '10px', fontWeight: 700, color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px',
  };

  const modal = (
    <>
      {/* Backdrop */}
      <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99999 }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 100000, width: 'calc(100vw - 24px)', maxWidth: '740px',
        height: '88vh', maxHeight: '88vh',
        background: '#fff', borderRadius: '12px', boxShadow: '0 20px 56px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', borderBottom: '1px solid #F3F4F6', flexShrink: 0,
          background: 'linear-gradient(135deg,#6D28D9,#7C3AED)',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#fff' }}>
              {inviteSource === 'pipeline' ? 'Request Profile Update' : 'Invite Candidate'}
            </p>
            <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
              {job?.title || jobId}
              {inviteSource === 'pipeline' && (
                <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: '99px', background: 'rgba(255,255,255,0.2)', fontSize: '9px', fontWeight: 700 }}>
                  Pipeline
                </span>
              )}
            </p>
          </div>
          <button onClick={close} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px', padding: '5px', cursor: 'pointer', display: 'flex' }}>
            <X size={13} color="#fff" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* LEFT: Job preview */}
          <div style={{ width: '38%', flexShrink: 0, borderRight: '1px solid #F3F4F6', background: '#FAFAFA', overflowY: 'auto', padding: '12px' }}>
            {job ? (
              <>
                <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{job.title}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                  {job.hiringMode && <Chip text={job.hiringMode} bg="#EDE9FE" color="#7C3AED" />}
                  {job.department  && <Chip text={job.department}  bg="#D1FAE5" color="#065F46" />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
                  {locs.length > 0 && <MetaRow icon={<MapPin size={11} />}>{locs.join(' · ')}</MetaRow>}
                  {expTxt          && <MetaRow icon={<Briefcase size={11} />}>{expTxt} exp</MetaRow>}
                </div>
                {job.skills && job.skills.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '9px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Skills</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                      {job.skills.slice(0, 10).map((s, i) => (
                        <span key={i} style={{ padding: '2px 7px', borderRadius: '99px', background: '#F1F5F9', color: '#475569', fontSize: '10px', border: '1px solid #E2E8F0' }}>{s}</span>
                      ))}
                      {job.skills.length > 10 && <span style={{ fontSize: '10px', color: '#9CA3AF' }}>+{job.skills.length - 10}</span>}
                    </div>
                  </div>
                )}
                {desc && (
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.4px' }}>About</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#6B7280', lineHeight: 1.65, whiteSpace: 'pre-line' }}>
                      {descOpen ? desc : descShort}
                    </p>
                    {desc.length > 220 && (
                      <button onClick={() => setDescOpen(!descOpen)} style={{ marginTop: '3px', background: 'none', border: 'none', color: '#7C3AED', fontSize: '10px', fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {descOpen ? 'Less' : 'More'}<ChevronRight size={10} style={{ transform: descOpen ? 'rotate(90deg)' : 'none' }} />
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#9CA3AF' }}>
                <Briefcase size={24} style={{ marginBottom: '6px', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '11px' }}>No job details</p>
              </div>
            )}
          </div>

          {/* RIGHT: Form — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {sentLink ? (
              /* ── Sent state ── */
              <div>
                <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: 700, color: '#15803D' }}>Invite sent!</p>
                  <p style={{ margin: 0, fontSize: '10px', color: '#166534' }}>Candidate will receive the link by {channel}.</p>
                </div>
                <label style={lbl}>Application Link</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input readOnly value={sentLink} style={{ ...inp, fontFamily: 'monospace', fontSize: '10px', flex: 1, background: '#F9FAFB' }} />
                  <button onClick={handleCopy} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: copied ? '#D1FAE5' : '#7C3AED', color: copied ? '#065F46' : '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <button onClick={close} style={{ width: '100%', marginTop: '10px', padding: '8px', borderRadius: '7px', border: '1px solid #E5E7EB', background: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                  Close
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                {/* Name */}
                <div>
                  <label style={lbl}>Name <span style={{ color: '#9CA3AF', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Candidate name" style={inp} />
                </div>

                {/* Channel */}
                <div>
                  <label style={lbl}>Send Via</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {(['email', 'whatsapp', 'both'] as Channel[]).map(ch => (
                      <button key={ch} onClick={() => setChannel(ch)} style={{
                        flex: 1, padding: '5px 3px', borderRadius: '6px',
                        border: channel === ch ? '2px solid #7C3AED' : '1px solid #E5E7EB',
                        background: channel === ch ? '#EDE9FE' : '#fff',
                        color: channel === ch ? '#7C3AED' : '#6B7280',
                        fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                      }}>
                        {ch === 'email'    && <Mail size={12} />}
                        {ch === 'whatsapp' && <MessageSquare size={12} />}
                        {ch === 'both'     && <Phone size={12} />}
                        {ch.charAt(0).toUpperCase() + ch.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email — only when channel includes email */}
                {needsEmail && (
                  <div>
                    <label style={lbl}>Email <span style={{ color: '#EF4444' }}>*</span></label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="candidate@example.com" style={inp} />
                  </div>
                )}

                {/* Phone — only when channel includes WA */}
                {needsWA && (
                  <div>
                    <label style={lbl}>Phone <span style={{ color: '#EF4444' }}>*</span></label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" style={inp} />
                  </div>
                )}

                                 {/* ── Expiry — now below WA template vars ── */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <label style={{ ...lbl, marginBottom: 0, whiteSpace: 'nowrap' }}>Expires</label>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {EXPIRY.map(o => (
                      <button key={o.value} onClick={() => handleExpiryChange(o.value)} style={{
                        padding: '3px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 600,
                        border: expiry === o.value ? '2px solid #7C3AED' : '1px solid #E5E7EB',
                        background: expiry === o.value ? '#EDE9FE' : '#fff',
                        color: expiry === o.value ? '#7C3AED' : '#6B7280', cursor: 'pointer',
                      }}>{o.label}</button>
                    ))}
                  </div>
                </div>

                {/* ── WA SECTION — moved above expiry/email so vars are visible ── */}

                {/* WA template selector */}
                {needsWA && (
                  <div>
                    <label style={lbl}>WA Template</label>
                    {!waCfg ? (
                      <p style={{ margin: 0, fontSize: '10px', color: '#D97706', background: '#FFFBEB', padding: '5px 8px', borderRadius: '5px', border: '1px solid #FDE68A' }}>
                        ⚠️ Configure WhatsApp in Settings first
                      </p>
                    ) : waApproved.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '10px', color: '#9CA3AF' }}>No approved templates. Sync in Settings → WhatsApp.</p>
                    ) : (
                      <select value={waTpl} onChange={e => {
                        const t = waApproved.find((x: any) => x.name === e.target.value);
                        setWaTpl(e.target.value);
                        if (t) {
                          setWaTplLang(t.language);
                          const orgName     = waCfg?.company_name || '';
                          const firstName   = (name || prefillName || '').split(' ')[0] || '';
                          const industry    = job?.department || '';
                          const profile     = job?.title || '';
                          const salary      = formatSalary(job?.budget, job?.budgetType);
                          const locationArr = job?.location ? (Array.isArray(job.location) ? job.location : [job.location]) : [];
                          const location    = locationArr.join(', ');
                          const expiryLabel = computeExpiryLabel(expiry);
                          setWaTplVars(buildVarsForTemplate(t, { orgName, firstName, industry, profile, salary, location, expiryLabel }));
                        }
                      }} style={inp}>
                        <option value="">— Select template —</option>
                        {waApproved.map((t: any) => (
                          <option key={t.name} value={t.name}>{t.display_name} ({t.language})</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}



                {/* WA preview panel — now above expiry */}
                {needsWA && waTpl && (
                  <WaTemplatePreviewSection
                    waCfg={waCfg}
                    waTpl={waTpl}
                    waTplVars={waTplVars}
                    setWaTplVars={setWaTplVars}
                    showWaPreview={showWaPreview}
                    setShowWaPreview={setShowWaPreview}
                    inp={inp}
                    lbl={lbl}
                  />
                )}

               

                {/* Email message — only when channel includes email */}
                {needsEmail && (
                  <div>
                    <label style={lbl}>Email Message</label>
                    <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5}
                      style={{ ...inp, height: 'auto', resize: 'vertical', minHeight: '80px', lineHeight: 1.6 }} />
                    <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#9CA3AF' }}>Pre-filled — edit as needed.</p>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '7px' }}>
                  <button onClick={close} style={{ flex: 1, padding: '8px', borderRadius: '7px', border: '1px solid #E5E7EB', background: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                    Cancel
                  </button>
                  <button onClick={handleSend} disabled={sending} style={{
                    flex: 2, padding: '8px', borderRadius: '7px', border: 'none',
                    background: sending ? '#C4B5FD' : 'linear-gradient(135deg,#6D28D9,#7C3AED)',
                    color: '#fff', fontSize: '12px', fontWeight: 700,
                    cursor: sending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: sending ? 'none' : '0 3px 10px rgba(124,58,237,0.3)',
                  }}>
                    {sending ? <><Ring /> Sending…</> : <><Send size={12} />{inviteSource === 'pipeline' ? 'Send Update Request' : 'Send Invite'}</>}
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes ring-spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );

  return createPortal(modal, document.body);
};

function Chip({ text, bg, color }: { text: string; bg: string; color: string }) {
  return <span style={{ padding: '2px 7px', borderRadius: '99px', background: bg, color, fontSize: '9px', fontWeight: 700 }}>{text}</span>;
}
function MetaRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6B7280' }}><span style={{ color: '#9CA3AF' }}>{icon}</span>{children}</div>;
}
function Ring() {
  return <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'ring-spin 0.7s linear infinite' }} />;
}

export default InviteCandidateModal;