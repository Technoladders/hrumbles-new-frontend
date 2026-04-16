// src/components/jobs/job/invite/BulkInviteReviewModal.tsx
//
// IMPROVEMENTS over previous version:
//   1. Frontend validation before handleSendAll: checks all shared template vars
//      are filled, blocks send and shows toast listing which are missing
//   2. computeExpirySlot helper shared with InviteCandidateModal logic:
//      expiry slot is derived from real template structure, not position assumption
//   3. Auto-expand preview panel when validation fails so the user sees
//      the unfilled fields immediately

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { X, Send, Trash2, Clock, ChevronDown, CheckCircle2, AlertCircle, User, MessageSquare, Mail, Phone } from 'lucide-react';
import { sendCandidateInvite } from '@/services/inviteService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BulkInviteCandidate {
  id:               string;
  name:             string;
  email:            string;
  phone?:           string;
  candidateOwnerId?: string;
}

interface BulkInviteReviewModalProps {
  isOpen:       boolean;
  onClose:      () => void;
  candidates:   BulkInviteCandidate[];
  jobId:        string;
  jobTitle:     string;
  inviteSource: 'pipeline' | 'zivex' | 'talentpool';
  job?: {
    department?:   string;
    location?:     string[] | string;
    budget?:       string;
    budgetType?:   string;
    currencyType?: string;
  };
}

type SendStatus = 'idle' | 'pending' | 'sent' | 'failed';
type Channel    = 'email' | 'whatsapp' | 'both';

interface CandidateRow extends BulkInviteCandidate {
  sendStatus: SendStatus;
  errorMsg?:  string;
  phoneInput: string;
}

interface WaComponent {
  type:     string;
  text?:    string;
  format?:  string;
  buttons?: Array<{ type: string; text: string; url?: string }>;
}

interface WaTemplate {
  name:         string;
  language:     string;
  display_name: string;
  status:       string;
  category:     string;
  components?:  WaComponent[];
}

const EXPIRY_OPTIONS = [
  { label: '3 days',  value: 3  },
  { label: '7 days',  value: 7  },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
];

function buildEmailTemplate(jobTitle: string, source: string) {
  if (source === 'pipeline') {
    return `Hi [Candidate Name],\n\nWe're preparing to present your profile for the ${jobTitle} position and would love to make sure your details are up to date.\n\nPlease take 2 minutes to verify and update your information — this helps us represent you better.`;
  }
  return `Hi [Candidate Name],\n\nWe came across your profile and think you'd be a great fit for the ${jobTitle} role.\n\nPlease take 3 minutes to complete your application — no account needed, completely free.`;
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

function extractVarCount(text: string): number {
  const m = text.match(/\{\{\d+\}\}/g);
  if (!m) return 0;
  return new Set(m.map(x => x.replace(/[{}]/g, ''))).size;
}

// ── Compute expiry slot from real template structure ──────────────────────────
// Returns the index of the last body slot (convention = expiry date), or -1 if none.
function computeExpirySlot(tpl: WaTemplate | undefined): number {
  if (!tpl) return -1;
  const headerComp = tpl.components?.find(c => c.type === 'HEADER');
  const bodyComp   = tpl.components?.find(c => c.type === 'BODY');
  const headerVarCount = headerComp?.text ? extractVarCount(headerComp.text) : 0;
  const bodyVarCount   = bodyComp?.text   ? extractVarCount(bodyComp.text)   : 0;
  if (bodyVarCount === 0) return -1;
  return headerVarCount + bodyVarCount - 1;
}

// ── Validate shared vars — returns missing field labels ───────────────────────
// Excludes first body slot (candidate name — auto-personalised per row).
function getMissingSharedVarLabels(tpl: WaTemplate | undefined, vars: string[]): string[] {
  if (!tpl) return [];
  const headerComp = tpl.components?.find(c => c.type === 'HEADER');
  const bodyComp   = tpl.components?.find(c => c.type === 'BODY');
  const headerVarCount = headerComp?.text ? extractVarCount(headerComp.text) : 0;
  const bodyVarCount   = bodyComp?.text   ? extractVarCount(bodyComp.text)   : 0;

  const missing: string[] = [];
  let slot = 0;

  // Header vars — all must be filled
  for (let n = 1; n <= headerVarCount; n++) {
    if (!vars[slot]?.trim()) missing.push(`Header {{${n}}}`);
    slot++;
  }

  // Body vars — skip slot 0 (first name, auto-personalised), check rest
  for (let n = 1; n <= bodyVarCount; n++) {
    if (n > 1 && !vars[slot]?.trim()) missing.push(`Body {{${n}}}`);
    slot++;
  }

  return missing;
}

function renderPreviewNode(text: string, vars: string[], offset: number): React.ReactNode {
  const parts = text.split(/(\*[^*]+\*|\{\{\d+\}\})/g);
  return parts.map((p, i) => {
    if (p.startsWith('*') && p.endsWith('*')) return <strong key={i}>{p.slice(1,-1)}</strong>;
    const vm = p.match(/^\{\{(\d+)\}\}$/);
    if (vm) {
      const n = parseInt(vm[1]) - 1 + offset;
      const val = vars[n];
      return (
        <span key={i} style={{ background: val ? 'transparent' : '#FEF3C7', color: val ? 'inherit' : '#92400E', borderRadius: 3, padding: val ? 0 : '0 2px' }}>
          {val || p}
        </span>
      );
    }
    return p;
  });
}

const BulkInviteReviewModal: React.FC<BulkInviteReviewModalProps> = ({
  isOpen, onClose, candidates, jobId, jobTitle, inviteSource, job,
}) => {
  const organizationId = useSelector((s: any) => s.auth.organization_id);

  const [rows,           setRows]           = useState<CandidateRow[]>([]);
  const [message,        setMessage]        = useState('');
  const [expiryDays,     setExpiryDays]     = useState(7);
  const [showExpiry,     setShowExpiry]     = useState(false);
  const [isSending,      setIsSending]      = useState(false);
  const [isDone,         setIsDone]         = useState(false);
  const [channel,        setChannel]        = useState<Channel>('email');
  const [waCfg,          setWaCfg]          = useState<any>(null);
  const [waTpl,          setWaTpl]          = useState('');
  const [waTplLang,      setWaTplLang]      = useState('en_US');
  const [showWaPreview,  setShowWaPreview]  = useState(false);
  const [sharedVars,     setSharedVars]     = useState<string[]>(Array(12).fill(''));
  const [previewRowIdx,  setPreviewRowIdx]  = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setRows(candidates.map(c => ({ ...c, sendStatus: 'idle', phoneInput: c.phone || '' })));
    setMessage(buildEmailTemplate(jobTitle, inviteSource));
    setExpiryDays(7);
    setIsDone(false);
    setIsSending(false);
    setChannel('email');
    setShowWaPreview(false);
    setPreviewRowIdx(0);

    if (!organizationId) return;
    supabase
      .from('hr_organizations')
      .select('whatsapp_config, name')
      .eq('id', organizationId)
      .single()
      .then(({ data }) => {
        const cfg = data?.whatsapp_config;
        if (!cfg?.is_active) return;
        setWaCfg(cfg);

        const approved = (cfg.templates || []).filter((t: WaTemplate) => t.status === 'APPROVED');
        const tpl      = cfg.default_template_name
          ? approved.find((t: WaTemplate) => t.name === cfg.default_template_name) || approved[0]
          : approved[0];
        if (!tpl) return;
        setWaTpl(tpl.name);
        setWaTplLang(tpl.language);

        const headerComp = tpl.components?.find((c: WaComponent) => c.type === 'HEADER');
        const bodyComp   = tpl.components?.find((c: WaComponent) => c.type === 'BODY');
        const headerVarCount = headerComp?.text ? extractVarCount(headerComp.text) : 0;
        const bodyVarCount   = bodyComp?.text   ? extractVarCount(bodyComp.text)   : 0;

        const salary   = formatSalary(job?.budget, job?.budgetType);
        const locArr   = job?.location ? (Array.isArray(job.location) ? job.location : [job.location]) : [];
        const expiryLabel = computeExpiryLabel(7);
        const orgName  = cfg.company_name || data?.name || '';

        const filled = Array(headerVarCount + bodyVarCount).fill('');
        if (headerVarCount >= 1) filled[0] = orgName;
        if (bodyVarCount >= 1)  filled[headerVarCount]     = candidates[0]?.name?.split(' ')[0] || '';
        if (bodyVarCount >= 2)  filled[headerVarCount + 1] = job?.department || '';
        if (bodyVarCount >= 3)  filled[headerVarCount + 2] = jobTitle;
        if (bodyVarCount >= 5)  filled[headerVarCount + 4] = salary;
        if (bodyVarCount >= 6)  filled[headerVarCount + 5] = locArr.join(', ');
        if (bodyVarCount >= 7)  filled[headerVarCount + 6] = expiryLabel;

        setSharedVars(filled);
      });
  }, [isOpen, candidates, jobTitle, inviteSource, organizationId, job]);

  // ── FIX: use computeExpirySlot for dynamic slot resolution ─────────────────
  const handleExpiryChange = (days: number) => {
    setExpiryDays(days);
    const tpl = waCfg?.templates?.find((t: WaTemplate) => t.name === waTpl) as WaTemplate | undefined;
    const expirySlot = computeExpirySlot(tpl);
    if (expirySlot >= 0) {
      setSharedVars(prev => {
        const next = [...prev];
        next[expirySlot] = computeExpiryLabel(days);
        return next;
      });
    }
  };

  const previewVars = (() => {
    const row = rows[previewRowIdx];
    const tpl = waCfg?.templates?.find((t: WaTemplate) => t.name === waTpl) as WaTemplate | undefined;
    if (!row || !tpl) return sharedVars;
    const headerVarCount = tpl.components?.find((c: WaComponent) => c.type === 'HEADER')?.text
      ? extractVarCount(tpl.components!.find((c: WaComponent) => c.type === 'HEADER')!.text!)
      : 0;
    const next = [...sharedVars];
    next[headerVarCount] = row.name?.split(' ')[0] || '';
    return next;
  })();

  if (!isOpen) return null;

  const handleRemove = (id: string) => setRows(prev => prev.filter(r => r.id !== id));
  const handlePhoneChange = (id: string, value: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, phoneInput: value } : r));

  const handleSendAll = async () => {
    const toSend = rows.filter(r => r.sendStatus === 'idle');
    if (toSend.length === 0) return;

    if (channel !== 'email') {
      const missing = toSend.filter(r => !r.phoneInput?.trim());
      if (missing.length > 0) { toast.error(`${missing.length} candidate(s) missing phone`); return; }
    }

    // ── FIX: validate shared template vars before firing any requests ─────────
    if ((channel === 'whatsapp' || channel === 'both') && waTpl) {
      const tpl = waCfg?.templates?.find((t: WaTemplate) => t.name === waTpl) as WaTemplate | undefined;
      const missingVars = getMissingSharedVarLabels(tpl, sharedVars);
      if (missingVars.length > 0) {
        toast.error(
          `Fill all template variables before sending:\n${missingVars.join(', ')}`,
          { duration: 4000 }
        );
        // Auto-expand the preview panel so the user sees the empty fields
        setShowWaPreview(true);
        return;
      }
    }

    setIsSending(true);

    const tpl = waCfg?.templates?.find((t: WaTemplate) => t.name === waTpl) as WaTemplate | undefined;
    const headerVarCount = tpl?.components?.find((c: WaComponent) => c.type === 'HEADER')?.text
      ? extractVarCount(tpl.components!.find((c: WaComponent) => c.type === 'HEADER')!.text!)
      : 0;

    for (const row of toSend) {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, sendStatus: 'pending' } : r));
      try {
        const firstName = row.name?.split(' ')[0] || 'there';
        const personalised = message.replace('[Candidate Name]', firstName);

        const waBodyVars = [...sharedVars];
        waBodyVars[headerVarCount] = firstName;

        await sendCandidateInvite({
          jobId, jobTitle,
          candidateName:    row.name,
          candidateEmail:   row.email,
          candidatePhone:   row.phoneInput || row.phone,
          channel,
          expiryDays,
          customMessage:    personalised,
          candidateId:      inviteSource === 'pipeline' ? row.id : undefined,
          candidateOwnerId: row.candidateOwnerId,
          inviteSource,
          ...(waTpl ? {
            whatsappTemplateName:     waTpl,
            whatsappTemplateLanguage: waTplLang,
            whatsappBodyVars:         waBodyVars.some(Boolean) ? waBodyVars : undefined,
          } : {}),
        });
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, sendStatus: 'sent' } : r));
      } catch (err: any) {
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, sendStatus: 'failed', errorMsg: err.message } : r));
      }
    }
    setIsSending(false);
    setIsDone(true);
  };

  const sentCount   = rows.filter(r => r.sendStatus === 'sent').length;
  const failedCount = rows.filter(r => r.sendStatus === 'failed').length;
  const idleCount   = rows.filter(r => r.sendStatus === 'idle').length;
  const needsPhone  = channel !== 'email';

  const activeTpl = waCfg?.templates?.find((t: WaTemplate) => t.name === waTpl) as WaTemplate | undefined;
  const headerComp = activeTpl?.components?.find(c => c.type === 'HEADER');
  const bodyComp   = activeTpl?.components?.find(c => c.type === 'BODY');
  const footerComp = activeTpl?.components?.find(c => c.type === 'FOOTER');
  const btnsComp   = activeTpl?.components?.find(c => c.type === 'BUTTONS');
  const headerVarCount = headerComp?.text ? extractVarCount(headerComp.text) : 0;
  const bodyVarCount   = bodyComp?.text   ? extractVarCount(bodyComp.text)   : 0;
  const totalEditableVars = headerVarCount + bodyVarCount;
  const waApproved = waCfg?.templates?.filter((t: WaTemplate) => t.status === 'APPROVED') || [];

  type VarField = { slot: number; label: string; isHeader: boolean };
  const varFields: VarField[] = [];
  for (let n = 1; n <= headerVarCount; n++) varFields.push({ slot: n - 1, label: `Header {{${n}}}`, isHeader: true });
  for (let n = 1; n <= bodyVarCount; n++) varFields.push({ slot: headerVarCount + n - 1, label: `Body {{${n}}}`, isHeader: false });
  const editableFields = varFields.filter(f => !(f.slot === headerVarCount && !f.isHeader));

  const modal = (
    <>
      <div onClick={!isSending ? onClose : undefined}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100 }} />

      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 1101, width: 'calc(100vw - 32px)', maxWidth: '860px', maxHeight: '85vh',
        background: '#fff', borderRadius: '16px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid #F3F4F6', flexShrink: 0,
          background: 'linear-gradient(135deg,#7B43F1,#9B59F5)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>Review Bulk Invite</h2>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
              {jobTitle} · {rows.length} candidate{rows.length !== 1 ? 's' : ''}
            </p>
          </div>
          {!isSending && (
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: '8px', padding: '7px', cursor: 'pointer', display: 'flex' }}>
              <X size={16} color="#fff" />
            </button>
          )}
        </div>

        {/* Channel selector */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #F3F4F6',
          background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280',
            textTransform: 'uppercase', letterSpacing: '0.4px' }}>Send via</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['email', 'whatsapp', 'both'] as Channel[]).map(ch => (
              <button key={ch} onClick={() => !isSending && setChannel(ch)} style={{
                padding: '4px 12px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
                border: channel === ch ? '2px solid #7C3AED' : '1px solid #E5E7EB',
                background: channel === ch ? '#EDE9FE' : '#fff',
                color: channel === ch ? '#7C3AED' : '#6B7280',
                cursor: isSending ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                {ch === 'email'    && <Mail size={11} />}
                {ch === 'whatsapp' && <MessageSquare size={11} />}
                {ch === 'both'     && <Phone size={11} />}
                {ch.charAt(0).toUpperCase() + ch.slice(1)}
              </button>
            ))}
          </div>
          {needsPhone && !waCfg && (
            <span style={{ fontSize: '10px', color: '#D97706', background: '#FFFBEB',
              padding: '3px 8px', borderRadius: '5px', border: '1px solid #FDE68A' }}>
              ⚠️ Configure WhatsApp in Settings first
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* LEFT: Candidate list */}
          <div style={{ width: needsPhone ? '48%' : '40%', flexShrink: 0,
            borderRight: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6', background: '#F8FAFC', flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Recipients ({rows.length})
                {needsPhone && <span style={{ marginLeft: 6, fontWeight: 400, color: '#9CA3AF' }}>— enter phones</span>}
              </p>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {rows.map((row, i) => (
                <div key={row.id} style={{
                  padding: '8px 14px',
                  borderBottom: i < rows.length - 1 ? '1px solid #F9FAFB' : 'none',
                  background: row.sendStatus === 'sent'    ? '#F0FDF4'
                            : row.sendStatus === 'failed'  ? '#FEF2F2'
                            : row.sendStatus === 'pending' ? '#FFFBEB'
                            : showWaPreview && previewRowIdx === i ? '#F5F3FF' : '#fff',
                  cursor: showWaPreview && row.sendStatus === 'idle' ? 'pointer' : 'default',
                }} onClick={() => showWaPreview && row.sendStatus === 'idle' && setPreviewRowIdx(i)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flexShrink: 0 }}>
                      {row.sendStatus === 'idle'    && <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={12} color="#94A3B8" /></div>}
                      {row.sendStatus === 'pending' && <SpinRing />}
                      {row.sendStatus === 'sent'    && <CheckCircle2 size={18} color="#059669" />}
                      {row.sendStatus === 'failed'  && <AlertCircle  size={18} color="#DC2626" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.name || row.email}
                      </p>
                      <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.email}
                      </p>
                      {row.sendStatus === 'failed' && row.errorMsg && (
                        <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#DC2626' }}>{row.errorMsg.slice(0, 55)}</p>
                      )}
                    </div>
                    {row.sendStatus === 'idle' && !isSending && (
                      <button onClick={e => { e.stopPropagation(); handleRemove(row.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', borderRadius: '4px', display: 'flex', flexShrink: 0 }}>
                        <Trash2 size={13} color="#EF4444" />
                      </button>
                    )}
                    {row.sendStatus === 'sent' && <span style={{ fontSize: '10px', color: '#059669', fontWeight: 600, flexShrink: 0 }}>Sent</span>}
                  </div>
                  {needsPhone && row.sendStatus === 'idle' && (
                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={11} color="#9CA3AF" style={{ flexShrink: 0 }} />
                      <input type="tel" value={row.phoneInput} onChange={e => handlePhoneChange(row.id, e.target.value)}
                        onClick={e => e.stopPropagation()} placeholder="+91 9876543210"
                        style={{ flex: 1, padding: '4px 8px', borderRadius: '5px',
                          border: row.phoneInput ? '1px solid #D1FAE5' : '1px solid #FCA5A5',
                          fontSize: '11px', color: '#111827', outline: 'none',
                          background: row.phoneInput ? '#F0FDF4' : '#FFF1F2' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Config + Preview */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

            {/* Expiry */}
            <div style={{ marginBottom: '14px' }}>
              <label style={lbl}>Link Expires After</label>
              <div style={{ position: 'relative' }}>
                <button type="button" onClick={() => setShowExpiry(!showExpiry)} disabled={isSending}
                  style={{ ...ipt, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: isSending ? 'default' : 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={12} color="#9CA3AF" />
                    {EXPIRY_OPTIONS.find(o => o.value === expiryDays)?.label}
                  </span>
                  <ChevronDown size={12} color="#9CA3AF" />
                </button>
                {showExpiry && !isSending && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px',
                    marginTop: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    {EXPIRY_OPTIONS.map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => { handleExpiryChange(opt.value); setShowExpiry(false); }}
                        style={{ width: '100%', padding: '9px 14px', border: 'none', textAlign: 'left',
                          background: expiryDays === opt.value ? '#EDE9FE' : '#fff',
                          color: expiryDays === opt.value ? '#7C3AED' : '#374151',
                          fontSize: '13px', fontWeight: expiryDays === opt.value ? 600 : 400, cursor: 'pointer' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* WA Template selector */}
            {needsPhone && waCfg && (
              <div style={{ marginBottom: '14px' }}>
                <label style={lbl}>WA Template</label>
                <select value={waTpl} onChange={e => {
                  const t = waApproved.find((x: WaTemplate) => x.name === e.target.value);
                  setWaTpl(e.target.value);
                  if (t) setWaTplLang(t.language);
                }} style={ipt}>
                  <option value="">— Select template —</option>
                  {waApproved.map((t: WaTemplate) => (
                    <option key={t.name} value={t.name}>{t.display_name} ({t.language})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Dynamic WA template preview panel */}
            {needsPhone && waTpl && activeTpl && (
              <div style={{ marginBottom: '14px' }}>
                <button type="button" onClick={() => setShowWaPreview(!showWaPreview)} style={{
                  width: '100%', padding: '7px 10px', borderRadius: '7px',
                  border: showWaPreview ? '1.5px solid #7C3AED' : '1px solid #E5E7EB',
                  background: showWaPreview ? '#EDE9FE' : '#F9FAFB',
                  color: showWaPreview ? '#7C3AED' : '#6B7280',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>👁</span>
                    Preview · {activeTpl.display_name}
                    {totalEditableVars > 0 && (
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px',
                        borderRadius: '99px', background: '#7C3AED', color: '#fff' }}>
                        {totalEditableVars} var{totalEditableVars !== 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                  <span>{showWaPreview ? '▲' : '▼'}</span>
                </button>

                {showWaPreview && (
                  <div style={{ border: '1px solid #DDD6FE', borderRadius: '8px', overflow: 'hidden', marginTop: '6px' }}>
                    {editableFields.length > 0 && (
                      <div style={{ padding: '10px 12px', background: '#FAFAFA', borderBottom: '1px solid #EDE9FE' }}>
                        <p style={{ ...lbl, fontSize: '10px', marginBottom: '4px' }}>
                          Shared variables — apply to all candidates
                        </p>
                        <p style={{ margin: '0 0 8px', fontSize: '10px', color: '#9CA3AF' }}>
                          Candidate name auto-personalises per row. Click a recipient to preview their message.
                        </p>
                        {editableFields.map(({ slot, label, isHeader }) => {
                          const isMissing = !sharedVars[slot]?.trim();
                          return (
                            <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                              <span style={{
                                fontSize: '9px', fontWeight: 700,
                                color: isHeader ? '#92400E' : '#7C3AED',
                                background: isHeader ? '#FEF3C7' : '#EDE9FE',
                                padding: '2px 5px', borderRadius: '4px',
                                whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'monospace',
                                minWidth: '44px', textAlign: 'center',
                              }}>
                                {isHeader ? 'Header' : label.split(' ')[1]}
                              </span>
                              <span style={{ fontSize: '10px', color: '#9CA3AF', flexShrink: 0, width: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {label}
                              </span>
                              <input type="text" value={sharedVars[slot] || ''}
                                onChange={e => { const n = [...sharedVars]; n[slot] = e.target.value; setSharedVars(n); }}
                                placeholder={isHeader ? 'Company name' : `Value for ${label.split(' ')[1]}`}
                                style={{
                                  ...ipt, padding: '4px 8px', fontSize: '11px', flex: 1,
                                  // ── highlight empty required fields ──
                                  border: isMissing ? '1.5px solid #FCA5A5' : '1px solid #E5E7EB',
                                  background: isMissing ? '#FFF1F2' : '#fff',
                                }} />
                              {isMissing && (
                                <span style={{ fontSize: '9px', color: '#EF4444', whiteSpace: 'nowrap', flexShrink: 0 }}>Required</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Bubble preview */}
                    <div style={{ padding: '10px 12px', background: '#ECE5DD' }}>
                      <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#5a4a2a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Preview — {rows[previewRowIdx]?.name || 'Candidate'} (row {previewRowIdx + 1})
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ maxWidth: '100%', background: '#D9FDD3', borderRadius: '10px 10px 2px 10px',
                          overflow: 'hidden', fontSize: '12px', color: '#111', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                          {headerComp?.text && (
                            <div style={{ padding: '8px 10px 5px', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                              {renderPreviewNode(headerComp.text, previewVars, 0)}
                            </div>
                          )}
                          {!headerComp?.text && headerComp?.format && headerComp.format !== 'TEXT' && (
                            <div style={{ padding: '8px 10px 5px', color: '#6B7280', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                              {headerComp.format === 'IMAGE' ? '🖼 Image' : headerComp.format === 'VIDEO' ? '🎥 Video' : '📄 Document'}
                            </div>
                          )}
                          {bodyComp?.text && (
                            <div style={{ padding: '8px 10px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                              {renderPreviewNode(bodyComp.text, previewVars, headerVarCount)}
                            </div>
                          )}
                          {footerComp?.text && (
                            <div style={{ padding: '2px 10px 8px', fontSize: '10px', color: '#888' }}>
                              {footerComp.text}
                            </div>
                          )}
                          {btnsComp?.buttons && btnsComp.buttons.length > 0 && (
                            <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                              {btnsComp.buttons.map((btn, i) => (
                                <div key={i} style={{ padding: '6px 10px', textAlign: 'center',
                                  color: btn.type === 'PHONE_NUMBER' ? '#25D366' : '#0a7cff', fontSize: '11px',
                                  borderBottom: i < btnsComp.buttons!.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                                  {btn.type === 'PHONE_NUMBER' ? `📞 ${btn.text}` : `🔗 ${btn.text}`}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Email message */}
            {(channel === 'email' || channel === 'both') && (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <label style={lbl}>
                    Email Message
                    <span style={{ marginLeft: '6px', fontWeight: 400, textTransform: 'none', fontSize: '10px', color: '#9CA3AF' }}>
                      — use [Candidate Name] for personalisation
                    </span>
                  </label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    disabled={isSending} rows={7}
                    style={{ ...ipt, height: 'auto', resize: 'vertical', minHeight: '120px', lineHeight: 1.7, fontFamily: 'inherit', opacity: isSending ? 0.6 : 1 }} />
                </div>
                <div style={{ background: '#F8F7FF', borderRadius: '8px', padding: '12px 14px', border: '1px solid #EDE9FE' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Email preview (first recipient)
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                    {rows[0] ? message.replace('[Candidate Name]', rows[0].name?.split(' ')[0] || 'there') : message}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #F3F4F6', flexShrink: 0,
          background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>
            {isDone ? (
              <span>
                {sentCount   > 0 && <span style={{ color: '#059669', fontWeight: 600 }}>✓ {sentCount} sent</span>}
                {failedCount > 0 && <span style={{ color: '#DC2626', fontWeight: 600, marginLeft: '10px' }}>✗ {failedCount} failed</span>}
              </span>
            ) : (
              <span>{rows.length} invite{rows.length !== 1 ? 's' : ''} ready to send</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {!isDone ? (
              <>
                <button onClick={onClose} disabled={isSending} style={{ ...outBtn, opacity: isSending ? 0.5 : 1 }}>Cancel</button>
                <button onClick={handleSendAll} disabled={isSending || idleCount === 0}
                  style={{ padding: '10px 24px', borderRadius: '10px', border: 'none',
                    background: (isSending || idleCount === 0) ? '#C4B5FD' : 'linear-gradient(135deg,#6D28D9,#7C3AED)',
                    color: '#fff', fontSize: '14px', fontWeight: 700,
                    cursor: (isSending || idleCount === 0) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: isSending ? 'none' : '0 4px 12px rgba(124,58,237,0.3)' }}>
                  {isSending
                    ? <><SpinRing color="#fff" /> Sending {sentCount + failedCount + 1} of {idleCount + sentCount + failedCount}…</>
                    : <><Send size={14} /> Send {idleCount} Invite{idleCount !== 1 ? 's' : ''}</>}
                </button>
              </>
            ) : (
              <button onClick={onClose} style={{ ...outBtn, padding: '10px 24px' }}>Done</button>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin-ring { to { transform: rotate(360deg); } }`}</style>
    </>
  );

  return createPortal(modal, document.body);
};

function SpinRing({ color = '#7B43F1' }: { color?: string }) {
  return (
    <span style={{ display: 'inline-block', width: '18px', height: '18px',
      border: `3px solid ${color}30`, borderTopColor: color,
      borderRadius: '50%', animation: 'spin-ring 0.7s linear infinite', flexShrink: 0 }} />
  );
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
};
const ipt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1px solid #E5E7EB', fontSize: '13px', color: '#111827',
  background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};
const outBtn: React.CSSProperties = {
  padding: '10px 20px', borderRadius: '10px', border: '1px solid #E5E7EB',
  background: '#fff', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
};

export default BulkInviteReviewModal;