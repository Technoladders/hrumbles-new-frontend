// src/components/jobs/job/invite/InviteCandidateModal.tsx  — v3
// Changes vs v2:
//   1. emailWarning handling: if email delivery delayed, show amber warning
//      banner with a "Copy link" button — invite is still created and valid
//   2. Smart Backspace/Delete: pressing Backspace when cursor is right after
//      a {variable} token deletes the whole token at once (not char-by-char)
//      Same for Delete key when cursor is right before a token.
//   3. Professional template content shown via DB templates (no in-file change)

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Send, Copy, Check, Mail, MessageSquare, Phone,
  MapPin, Briefcase, ChevronDown, ChevronUp, Eye, EyeOff,
  AlertCircle, AlertTriangle, Sparkles, Plus,
} from 'lucide-react';
import { sendCandidateInvite } from '@/services/inviteService';
import type { ExistingInvite, InviteSource } from '@/services/inviteService';
import WaTemplatePreviewSection from './WaTemplatePreviewSection';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  useEmailTemplates,
  substituteVariables,
  bodyTextToHtml,
  computeExpiryLabel,
  TEMPLATE_VARIABLES,
  type EmailTemplate,
} from '@/components/CandidateSearch/hooks/useEmailTemplates';

interface Job {
  id: string; title: string;
  location?: string[] | string;
  experience?: { min?: { value?: number }; max?: { value?: number } };
  skills?: string[]; description?: string;
  hiringMode?: string; jobType?: string;
  clientDetails?: { clientName?: string };
  noticePeriod?: string; department?: string;
  budget?: string; budgetType?: string;
}

interface InviteCandidateModalProps {
  isOpen:          boolean;
  onClose:         () => void;
  jobId:           string;
  job?:            Job;
  prefillEmail?:   string;
  prefillName?:    string;
  prefillPhone?:   string;
  candidateId?:    string;
  candidateOwnerId?: string;
  inviteSource?:   InviteSource;
  existingInvites?: ExistingInvite[];
}

type Channel = 'email' | 'whatsapp' | 'both';

const EXPIRY = [
  { label: '3d', value: 3 }, { label: '7d', value: 7 },
  { label: '14d', value: 14 }, { label: '30d', value: 30 },
];

function formatSalary(budget?: string, budgetType?: string): string {
  if (!budget) return '';
  const num = parseFloat(budget);
  if (isNaN(num) || num === 0) return '';
  if (budgetType === 'LPA') { const lac = num / 100000; return `${lac % 1 === 0 ? lac : lac.toFixed(1)} LPA`; }
  return `${num.toLocaleString('en-IN')}`;
}

function countTemplateVars(text: string): number {
  const m = text.match(/\{\{\d+\}\}/g);
  if (!m) return 0;
  return new Set(m.map(x => x.replace(/[{}]/g, ''))).size;
}
function computeExpirySlot(tpl: any): number {
  const hc = tpl?.components?.find((c: any) => c.type === 'HEADER');
  const bc = tpl?.components?.find((c: any) => c.type === 'BODY');
  const hvc = hc?.text ? countTemplateVars(hc.text) : 0;
  const bvc = bc?.text ? countTemplateVars(bc.text) : 0;
  return bvc === 0 ? -1 : hvc + bvc - 1;
}
function buildVarsForTemplate(tpl: any, opts: any): string[] {
  const hc = tpl?.components?.find((c: any) => c.type === 'HEADER');
  const bc = tpl?.components?.find((c: any) => c.type === 'BODY');
  const headerHasVars = hc?.text ? /\{\{\d+\}\}/.test(hc.text) : false;
  const bvc = bc?.text ? countTemplateVars(bc.text) : 0;
  const result: string[] = [];
  if (headerHasVars) result.push(opts.orgName);
  const bvv: Record<number, string> = {};
  if (bvc >= 1) bvv[0] = opts.firstName;
  if (bvc >= 2) bvv[1] = bvc <= 4 ? opts.profile : opts.industry;
  if (bvc >= 3) bvv[2] = bvc <= 4 ? opts.expiryLabel : opts.profile;
  if (bvc >= 4) bvv[3] = '';
  if (bvc >= 5) bvv[4] = opts.salary;
  if (bvc >= 6) bvv[5] = opts.location;
  if (bvc >= 7) bvv[6] = opts.expiryLabel;
  for (let i = 0; i < bvc; i++) result.push(bvv[i] ?? '');
  return result;
}
function getMissingVarLabels(tpl: any, vars: string[]): string[] {
  if (!tpl) return [];
  const hc = tpl?.components?.find((c: any) => c.type === 'HEADER');
  const bc = tpl?.components?.find((c: any) => c.type === 'BODY');
  const headerHasVars = hc?.text ? /\{\{\d+\}\}/.test(hc.text) : false;
  const hvc = headerHasVars ? countTemplateVars(hc.text) : 0;
  const bvc = bc?.text ? countTemplateVars(bc.text) : 0;
  const missing: string[] = [];
  let slot = 0;
  for (let n = 1; n <= hvc; n++) { if (!vars[slot]?.trim()) missing.push(`Header {{${n}}}`); slot++; }
  for (let n = 1; n <= bvc; n++) { if (!vars[slot]?.trim()) missing.push(`Body {{${n}}}`); slot++; }
  return missing;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: '7px',
  border: '1px solid #E5E7EB', fontSize: '12px', color: '#111827',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: 700, color: '#6B7280',
  textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px',
};
const secLabel: React.CSSProperties = {
  fontSize: '9px', fontWeight: 700, color: '#9CA3AF',
  textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px',
};

// ── VAR TOKEN REGEX — matches {anyLowerCamelCase} ─────────────────────────────
const VAR_PATTERN = /\{[a-zA-Z]+\}/g;

// ── Smart delete handler ──────────────────────────────────────────────────────
// Backspace when cursor is right after a {variable} → deletes whole token.
// Delete  when cursor is right before a {variable} → deletes whole token.
// Falls through to default if no token found at cursor boundary.
function makeSmartKeyDown(
  text: string,
  setText: (v: string) => void,
  elRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement>
) {
  return (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    const el = elRef.current;
    if (!el) return;
    const selStart = el.selectionStart ?? 0;
    const selEnd   = el.selectionEnd   ?? 0;
    if (selStart !== selEnd) return; // user has a selection — let default handle

    if (e.key === 'Backspace') {
      // Check if the characters just before cursor form a complete {variable}
      const before = text.slice(0, selStart);
      const match  = before.match(/(\{[a-zA-Z]+\})$/);
      if (match) {
        e.preventDefault();
        const removeStart = selStart - match[1].length;
        const next = text.slice(0, removeStart) + text.slice(selStart);
        setText(next);
        requestAnimationFrame(() => { el.setSelectionRange(removeStart, removeStart); });
      }
    } else {
      // Delete: check if characters just after cursor form a {variable}
      const after = text.slice(selEnd);
      const match = after.match(/^(\{[a-zA-Z]+\})/);
      if (match) {
        e.preventDefault();
        const removeEnd = selEnd + match[1].length;
        const next = text.slice(0, selEnd) + text.slice(removeEnd);
        setText(next);
        requestAnimationFrame(() => { el.setSelectionRange(selEnd, selEnd); });
      }
    }
  };
}

// ── Main modal ────────────────────────────────────────────────────────────────
const InviteCandidateModal: React.FC<InviteCandidateModalProps> = ({
  isOpen, onClose, jobId, job,
  prefillEmail = '', prefillName = '', prefillPhone = '',
  candidateId, candidateOwnerId, inviteSource = 'zivex',
  existingInvites = [],
}) => {
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const orgName        = useSelector((s: any) => s.auth.organization_name ?? '');

  const { data: emailTemplates = [] } = useEmailTemplates(organizationId);
  const globalTemplates = emailTemplates.filter(t => t.is_global);
  const orgTemplates    = emailTemplates.filter(t => !t.is_global);

  const [name,    setName]    = useState(prefillName);
  const [email,   setEmail]   = useState(prefillEmail);
  const [phone,   setPhone]   = useState(prefillPhone);
  const [channel, setChannel] = useState<Channel>(() =>
    prefillEmail && prefillPhone ? 'email' : prefillPhone ? 'whatsapp' : 'email'
  );
  const [expiry,  setExpiry]  = useState(7);
  const [sending, setSending] = useState(false);

  // ── Sent state — now tracks emailWarning too ──────────────────────────────
  const [sentLink,     setSentLink]     = useState('');
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [copied,       setCopied]       = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [emailSubject,       setEmailSubject]        = useState('');
  const [emailBody,          setEmailBody]           = useState('');
  const [showPreview,        setShowPreview]         = useState(false);

  const bodyRef    = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  const [showWaSection, setShowWaSection] = useState(false);
  const [waCfg,         setWaCfg]         = useState<any>(null);
  const [waTpl,         setWaTpl]         = useState('');
  const [waTplLang,     setWaTplLang]     = useState('en_US');
  const [waTplVars,     setWaTplVars]     = useState<string[]>(Array(8).fill(''));
  const [showWaPreview, setShowWaPreview] = useState(false);

  const activeInviteForJob = existingInvites.find(inv => inv.job_id === jobId);

  const buildVars = (days: number = expiry) => ({
    name:       prefillName || name,
    firstName:  (prefillName || name).split(' ')[0] || '',
    jobTitle:   job?.title   || '',
    company:    orgName      || '',
    expiryDate: computeExpiryLabel(days),
    location:   Array.isArray(job?.location) ? (job.location as string[]).join(', ') : (job?.location ?? ''),
    experience: (() => {
      const mn = job?.experience?.min?.value, mx = job?.experience?.max?.value;
      return mn != null && mx != null ? `${mn}–${mx} yrs` : mn != null ? `${mn}+ yrs` : '';
    })(),
    skills:     (job?.skills ?? []).slice(0, 5).join(', '),
    department: job?.department ?? '',
    salary:     formatSalary(job?.budget, job?.budgetType),
  });

  const applyTemplate = (tpl: EmailTemplate, days = expiry) => {
    const vars = buildVars(days);
    setEmailSubject(substituteVariables(tpl.subject_line, vars));
    setEmailBody(substituteVariables(tpl.body_text, vars));
    setSelectedTemplateId(tpl.id);
  };

  useEffect(() => {
    if (!isOpen) return;
    setName(prefillName); setEmail(prefillEmail); setPhone(prefillPhone);
    setChannel(prefillEmail && prefillPhone ? 'email' : prefillPhone ? 'whatsapp' : 'email');
    setExpiry(7); setSentLink(''); setEmailWarning(null); setCopied(false);
    setShowPreview(false); setShowWaSection(false);

    if (emailTemplates.length > 0) {
      const defaultTpl = emailTemplates.find(t => t.is_default) || emailTemplates[0];
      applyTemplate(defaultTpl, 7);
    } else {
      const fn = prefillName.split(' ')[0] || '';
      setEmailSubject(`Invitation to Apply — ${job?.title || ''}`);
      setEmailBody(`Dear ${fn || 'Candidate'},\n\nWe are pleased to invite you to apply for the ${job?.title || ''} position at ${orgName || 'our organisation'}.\n\nPlease use the link below to complete your application at your earliest convenience.\n\nThis invitation is valid until ${computeExpiryLabel(7)}.\n\nWarm regards,\n${orgName || ''} Talent Acquisition Team`);
    }

    if (organizationId) {
      supabase.from('hr_organizations').select('whatsapp_config, name').eq('id', organizationId).single()
        .then(({ data }) => {
          const cfg = data?.whatsapp_config;
          if (!cfg?.is_active) return;
          setWaCfg(cfg);
          const approved     = (cfg.templates || []).filter((t: any) => t.status === 'APPROVED');
          const resolvedName = cfg.default_template_name || approved[0]?.name || '';
          const resolvedLang = cfg.default_template_language || approved[0]?.language || 'en_US';
          setWaTpl(resolvedName); setWaTplLang(resolvedLang);
          const locs = Array.isArray(job?.location) ? job.location : [job?.location ?? ''];
          const resolvedTplObj = approved.find((t: any) => t.name === resolvedName);
          setWaTplVars(buildVarsForTemplate(resolvedTplObj, {
            orgName: cfg.company_name || data?.name || '', firstName: prefillName.split(' ')[0] || '',
            industry: job?.department || '', profile: job?.title || '',
            salary: formatSalary(job?.budget, job?.budgetType),
            location: (locs as string[]).join(', '), expiryLabel: computeExpiryLabel(7),
          }));
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !emailTemplates.length || selectedTemplateId) return;
    const defaultTpl = emailTemplates.find(t => t.is_default) || emailTemplates[0];
    applyTemplate(defaultTpl, expiry);
  }, [emailTemplates.length, isOpen]);

  // ── Insert variable at cursor ─────────────────────────────────────────────
  const insertVariable = (varKey: string) => {
    const el = bodyRef.current;
    if (!el) { setEmailBody(prev => prev + varKey); return; }
    const s = el.selectionStart ?? emailBody.length;
    const e = el.selectionEnd   ?? emailBody.length;
    const next = emailBody.slice(0, s) + varKey + emailBody.slice(e);
    setEmailBody(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + varKey.length, s + varKey.length); }, 0);
  };

  const handleExpiryChange = (days: number) => {
    setExpiry(days);
    if (selectedTemplateId) {
      const tpl = emailTemplates.find(t => t.id === selectedTemplateId);
      if (tpl) applyTemplate(tpl, days);
    }
    if (waCfg && waTpl) {
      const tpl = (waCfg.templates || []).find((t: any) => t.name === waTpl);
      const slot = computeExpirySlot(tpl);
      if (slot >= 0) setWaTplVars(prev => { const n = [...prev]; n[slot] = computeExpiryLabel(days); return n; });
    }
  };

  if (!isOpen) return null;

  const needsEmail = channel === 'email' || channel === 'both';
  const needsWA    = channel === 'whatsapp' || channel === 'both';

  // ── Smart keydown handlers ────────────────────────────────────────────────
  const bodyKeyDown    = makeSmartKeyDown(emailBody,    setEmailBody,    bodyRef);
  const subjectKeyDown = makeSmartKeyDown(emailSubject, setEmailSubject, subjectRef);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!email && needsEmail) { toast.error('Email address is required'); return; }
    if (!phone && needsWA)    { toast.error('Phone number is required'); return; }

    if (needsWA && waTpl) {
      const waApproved = waCfg?.templates?.filter((t: any) => t.status === 'APPROVED') || [];
      const tpl = waApproved.find((t: any) => t.name === waTpl);
      const missing = getMissingVarLabels(tpl, waTplVars);
      if (missing.length > 0) {
        toast.error(`Please fill all template variables: ${missing.join(', ')}`, { duration: 4000 });
        setShowWaPreview(true);
        return;
      }
    }

    setSending(true);
    try {
      const vars = buildVars();
      const renderedBody    = substituteVariables(emailBody, vars);
      const renderedHtml    = bodyTextToHtml(renderedBody);
      const renderedSubject = substituteVariables(emailSubject, vars);

      const r = await sendCandidateInvite({
        jobId, jobTitle: job?.title || '',
        candidateName:  name    || undefined,
        candidateEmail: email   || undefined,
        candidatePhone: phone   || undefined,
        channel, expiryDays: expiry,
        emailSubject:    needsEmail ? renderedSubject   : undefined,
        emailBodyHtml:   needsEmail ? renderedHtml      : undefined,
        emailTemplateId: selectedTemplateId ?? undefined,
        candidateId, candidateOwnerId, inviteSource,
        ...(waTpl ? {
          whatsappTemplateName:     waTpl,
          whatsappTemplateLanguage: waTplLang,
          whatsappBodyVars:         waTplVars.some(Boolean) ? waTplVars : undefined,
        } : {}),
      }) as any; // includes emailSent, emailWarning from v3 edge function

      setSentLink(r.link);

      if (r.emailWarning) {
        setEmailWarning(r.emailWarning);
        toast.warning('Invite created — email delivery delayed. Copy the link below to share manually.', { duration: 6000 });
      } else {
        setEmailWarning(null);
        toast.success('Invite sent successfully!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to send invite. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCopy = () => { navigator.clipboard.writeText(sentLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const close      = () => { setSentLink(''); setEmailWarning(null); setCopied(false); onClose(); };

  const vars = buildVars();
  const previewHtml = bodyTextToHtml(substituteVariables(emailBody, vars));

  const locs   = job?.location ? (Array.isArray(job.location) ? job.location : [job.location]) : [];
  const expMin = job?.experience?.min?.value, expMax = job?.experience?.max?.value;
  const expTxt = expMin != null && expMax != null ? `${expMin}–${expMax} yrs` : expMin != null ? `${expMin}+ yrs` : null;
  const waApproved = waCfg?.templates?.filter((t: any) => t.status === 'APPROVED') || [];

  const modal = (
    <>
      <div onClick={close}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99999 }}/>

      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 100000, width: 'calc(100vw - 24px)', maxWidth: '520px',
        maxHeight: '90vh', background: '#fff', borderRadius: '14px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{ flexShrink: 0, padding: '12px 16px',
          background: 'linear-gradient(135deg,#6D28D9,#7C3AED)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#fff' }}>
              {inviteSource === 'pipeline' ? 'Request Profile Authorization' : 'Send Invite'}
            </p>
            {job && (
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.9)',
                  background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '99px' }}>
                  💼 {job.title}
                </span>
                {locs.length > 0 && (
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)',
                    display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={9} style={{ flexShrink: 0 }}/>{locs[0]}{locs.length > 1 ? ` +${locs.length-1}` : ''}
                  </span>
                )}
                {expTxt && (
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)',
                    display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Briefcase size={9} style={{ flexShrink: 0 }}/>{expTxt}
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={close}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: '6px', padding: '5px', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
            <X size={13} color="#fff"/>
          </button>
        </div>

        {/* ── Active invite warning ── */}
        {activeInviteForJob && (
          <div style={{ flexShrink: 0, padding: '8px 14px', background: '#FFFBEB',
            borderBottom: '1px solid #FDE68A',
            display: 'flex', alignItems: 'center', gap: '7px' }}>
            <AlertCircle size={12} color="#D97706" style={{ flexShrink: 0 }}/>
            <span style={{ fontSize: '11px', color: '#92400E' }}>
              <strong>Active invite exists</strong> for this job · Sent{' '}
              {Math.floor((Date.now() - new Date(activeInviteForJob.sent_at).getTime()) / 86_400_000)}d ago
              · Status: <em style={{ textTransform: 'capitalize' }}>{activeInviteForJob.status}</em>
            </span>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

          {sentLink ? (
            /* ── Sent / email-warning state ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Success or warning banner */}
              {emailWarning ? (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px',
                  padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }}/>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 700, color: '#92400E' }}>
                      Invite created — email delivery delayed
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#78350F', lineHeight: 1.5 }}>
                      Gmail temporarily rejected the email (rate limit). The invite link below is valid —
                      share it directly with the candidate. Email delivery may succeed if retried later.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '10px',
                  padding: '10px 14px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 700, color: '#15803D' }}>
                    ✓ Invite sent successfully
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#166534' }}>
                    Candidate will receive the application link via {channel}.
                  </p>
                </div>
              )}

              {/* Application link — always shown */}
              <div>
                <label style={lbl}>Application Link</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input readOnly value={sentLink}
                    style={{ ...inp, fontFamily: 'monospace', fontSize: '10px', flex: 1, background: '#F9FAFB' }}/>
                  <button onClick={handleCopy}
                    style={{ padding: '7px 12px', borderRadius: '7px', border: 'none',
                      background: copied ? '#D1FAE5' : '#7C3AED',
                      color: copied ? '#065F46' : '#fff',
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {copied ? <Check size={11}/> : <Copy size={11}/>}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p style={{ margin: '5px 0 0', fontSize: '10px', color: '#9CA3AF' }}>
                  Share this link with the candidate — it works regardless of email status.
                </p>
              </div>

              <button onClick={close}
                style={{ width: '100%', padding: '9px', borderRadius: '8px',
                  border: '1px solid #E5E7EB', background: '#fff',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                Close
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Channel */}
              <div>
                <p style={secLabel}>Channel</p>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['email', 'whatsapp', 'both'] as Channel[]).map(ch => (
                    <button key={ch} onClick={() => setChannel(ch)} style={{
                      flex: 1, padding: '6px 4px', borderRadius: '7px', cursor: 'pointer',
                      border: channel === ch ? '2px solid #7C3AED' : '1px solid #E5E7EB',
                      background: channel === ch ? '#EDE9FE' : '#F9FAFB',
                      color: channel === ch ? '#7C3AED' : '#6B7280',
                      fontSize: '10px', fontWeight: 700,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                    }}>
                      {ch === 'email' && <Mail size={12}/>}
                      {ch === 'whatsapp' && <MessageSquare size={12}/>}
                      {ch === 'both' && <Phone size={12}/>}
                      {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <p style={secLabel}>Candidate</p>
                <div style={{ display: 'grid', gap: '6px',
                  gridTemplateColumns: needsEmail && needsWA ? '1fr 1fr' : '1fr' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Name <span style={{ color: '#9CA3AF', textTransform: 'none' }}>optional</span></label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Full name" style={inp}/>
                  </div>
                  {needsEmail && (
                    <div>
                      <label style={lbl}>Email <span style={{ color: '#EF4444' }}>*</span></label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="email@example.com" style={inp}/>
                    </div>
                  )}
                  {needsWA && (
                    <div>
                      <label style={lbl}>Phone <span style={{ color: '#EF4444' }}>*</span></label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                        placeholder="+91 9876543210" style={inp}/>
                    </div>
                  )}
                </div>
              </div>

              {/* Expiry */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ ...secLabel, margin: 0, whiteSpace: 'nowrap' }}>Expires in</p>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {EXPIRY.map(o => (
                    <button key={o.value} onClick={() => handleExpiryChange(o.value)} style={{
                      padding: '3px 9px', borderRadius: '5px', fontSize: '10px', fontWeight: 600,
                      cursor: 'pointer',
                      border: expiry === o.value ? '2px solid #7C3AED' : '1px solid #E5E7EB',
                      background: expiry === o.value ? '#EDE9FE' : '#fff',
                      color: expiry === o.value ? '#7C3AED' : '#6B7280',
                    }}>{o.label}</button>
                  ))}
                </div>
              </div>

              {/* ── Email section ── */}
              {needsEmail && (
                <div style={{ border: '1px solid #EDE9FE', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: '#F5F3FF',
                    borderBottom: '1px solid #EDE9FE',
                    display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={11} color="#7C3AED"/>
                    <p style={{ ...secLabel, margin: 0, color: '#7C3AED' }}>Email Message</p>
                  </div>
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    {/* Template selector */}
                    <div>
                      <label style={lbl}>Template</label>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <select
                          value={selectedTemplateId ?? ''}
                          onChange={e => {
                            const tpl = emailTemplates.find(t => t.id === e.target.value);
                            if (tpl) applyTemplate(tpl);
                          }}
                          style={{ ...inp, flex: 1, paddingRight: '6px' }}>
                          <option value="">— Choose a template —</option>
                          {globalTemplates.length > 0 && (
                            <optgroup label="⭐ Global Templates">
                              {globalTemplates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {orgTemplates.length > 0 && (
                            <optgroup label="✏️ My Templates">
                              {orgTemplates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        <a href="/settings/email-templates" target="_blank" rel="noopener noreferrer"
                          title="Manage custom templates"
                          style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #E5E7EB',
                            background: '#F9FAFB', color: '#6B7280', fontSize: '10px',
                            display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none',
                            whiteSpace: 'nowrap' }}>
                          <Plus size={10}/> New
                        </a>
                      </div>
                    </div>

                    {/* Subject — smart delete enabled */}
                    <div>
                      <label style={lbl}>Subject line</label>
                      <input
                        ref={subjectRef as React.RefObject<HTMLInputElement>}
                        type="text"
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                        onKeyDown={subjectKeyDown}
                        placeholder="Email subject…"
                        style={inp}/>
                    </div>

                    {/* Body — smart delete enabled */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ ...lbl, margin: 0 }}>Message body</label>
                        <button onClick={() => setShowPreview(!showPreview)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '10px', color: '#7C3AED', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '3px' }}>
                          {showPreview ? <><EyeOff size={10}/> Edit</> : <><Eye size={10}/> Preview</>}
                        </button>
                      </div>

                      {showPreview ? (
                        <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px',
                          padding: '12px', minHeight: '120px', background: '#FAFAFA',
                          fontSize: '13px', lineHeight: 1.65 }}
                          dangerouslySetInnerHTML={{ __html: previewHtml }}/>
                      ) : (
                        <textarea
                          ref={bodyRef}
                          value={emailBody}
                          onChange={e => setEmailBody(e.target.value)}
                          onKeyDown={bodyKeyDown}
                          rows={7}
                          placeholder="Dear {firstName},&#10;&#10;We are pleased to invite you…"
                          style={{ ...inp, height: 'auto', minHeight: '140px',
                            resize: 'vertical', lineHeight: 1.65, fontFamily: 'inherit' }}/>
                      )}

                      {/* Variable chips */}
                      {!showPreview && (
                        <div style={{ marginTop: '6px' }}>
                          <p style={{ ...secLabel, fontSize: '8px', marginBottom: '4px' }}>
                            Insert variable — Backspace/Delete removes whole token:
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {TEMPLATE_VARIABLES.all.map(({ key, label }) => (
                              <button key={key} onClick={() => insertVariable(key)}
                                style={{ padding: '2px 8px', borderRadius: '99px',
                                  border: '1px solid #DDD6FE', background: '#EDE9FE',
                                  color: '#7C3AED', fontSize: '10px', fontWeight: 600,
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Sparkles size={8}/>{key}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── WhatsApp (collapsible) ── */}
              {needsWA && (
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden' }}>
                  <button onClick={() => setShowWaSection(!showWaSection)}
                    style={{ width: '100%', padding: '8px 12px', background: '#F9FAFB',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={11} color="#25D366"/>
                      <p style={{ ...secLabel, margin: 0, color: '#374151' }}>WhatsApp Message</p>
                    </div>
                    {showWaSection ? <ChevronUp size={13} color="#6B7280"/> : <ChevronDown size={13} color="#6B7280"/>}
                  </button>
                  {showWaSection && (
                    <div style={{ padding: '12px', borderTop: '1px solid #F3F4F6',
                      display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {!waCfg ? (
                        <p style={{ margin: 0, fontSize: '10px', color: '#D97706',
                          background: '#FFFBEB', padding: '6px 8px', borderRadius: '6px',
                          border: '1px solid #FDE68A' }}>
                          ⚠️ Configure WhatsApp in Settings to enable this channel
                        </p>
                      ) : waApproved.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '10px', color: '#9CA3AF' }}>
                          No approved templates. Sync in Settings → WhatsApp.
                        </p>
                      ) : (
                        <>
                          <div>
                            <label style={lbl}>WA Template</label>
                            <select value={waTpl} onChange={e => {
                              const t = waApproved.find((x: any) => x.name === e.target.value);
                              setWaTpl(e.target.value);
                              if (t) {
                                setWaTplLang(t.language);
                                const locs = job?.location ? (Array.isArray(job.location) ? job.location : [job.location]) : [];
                                setWaTplVars(buildVarsForTemplate(t, {
                                  orgName: waCfg?.company_name || '', firstName: (name || prefillName || '').split(' ')[0] || '',
                                  industry: job?.department || '', profile: job?.title || '',
                                  salary: formatSalary(job?.budget, job?.budgetType),
                                  location: (locs as string[]).join(', '), expiryLabel: computeExpiryLabel(expiry),
                                }));
                              }
                            }} style={inp}>
                              <option value="">— Select template —</option>
                              {waApproved.map((t: any) => (
                                <option key={t.name} value={t.name}>{t.display_name} ({t.language})</option>
                              ))}
                            </select>
                          </div>
                          {waTpl && (
                            <WaTemplatePreviewSection
                              waCfg={waCfg} waTpl={waTpl}
                              waTplVars={waTplVars} setWaTplVars={setWaTplVars}
                              showWaPreview={showWaPreview} setShowWaPreview={setShowWaPreview}
                              inp={inp} lbl={lbl}/>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', paddingTop: '2px' }}>
                <button onClick={close}
                  style={{ flex: 1, padding: '9px', borderRadius: '8px',
                    border: '1px solid #E5E7EB', background: '#fff',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                  Cancel
                </button>
                <button onClick={handleSend} disabled={sending} style={{
                  flex: 2, padding: '9px', borderRadius: '8px', border: 'none',
                  background: sending ? '#C4B5FD' : 'linear-gradient(135deg,#6D28D9,#7C3AED)',
                  color: '#fff', fontSize: '12px', fontWeight: 700,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  boxShadow: sending ? 'none' : '0 3px 12px rgba(124,58,237,0.3)',
                }}>
                  {sending
                    ? <><Ring/> Sending…</>
                    : <><Send size={12}/>
                        {inviteSource === 'pipeline' ? 'Send Authorization Request' : 'Send Invite'}
                      </>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes ring-spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );

  return createPortal(modal, document.body);
};

function Ring() {
  return <span style={{ display: 'inline-block', width: '12px', height: '12px',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    borderRadius: '50%', animation: 'ring-spin 0.7s linear infinite' }}/>;
}

export default InviteCandidateModal;