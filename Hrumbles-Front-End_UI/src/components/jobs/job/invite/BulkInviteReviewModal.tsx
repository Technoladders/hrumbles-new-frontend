// src/components/jobs/job/invite/BulkInviteReviewModal.tsx
// Shows before any bulk invite is sent.
// Recruiter can: remove individual candidates, edit message template, set expiry, then send.
// All new — nothing reused.

import React, { useState, useEffect } from 'react';
import { X, Send, Trash2, Clock, ChevronDown, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { sendCandidateInvite } from '@/services/inviteService';
import { toast } from 'sonner';

export interface BulkInviteCandidate {
  id:              string;
  name:            string;
  email:           string;
  phone?:          string;
  candidateOwnerId?: string;
}

interface BulkInviteReviewModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  candidates:  BulkInviteCandidate[];
  jobId:       string;
  jobTitle:    string;
  inviteSource: 'pipeline' | 'zivex' | 'talentpool';
}

type SendStatus = 'idle' | 'pending' | 'sent' | 'failed';

interface CandidateRow extends BulkInviteCandidate {
  sendStatus: SendStatus;
  errorMsg?:  string;
}

const EXPIRY_OPTIONS = [
  { label: '3 days',  value: 3  },
  { label: '7 days',  value: 7  },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
];

function buildTemplate(jobTitle: string, source: string) {
  if (source === 'pipeline') {
    return `Hi [Candidate Name],

We're preparing to present your profile for the ${jobTitle} position and would love to make sure your details are up to date.

Please take 2 minutes to verify and update your information — this helps us represent you better.`;
  }
  return `Hi [Candidate Name],

We came across your profile and think you'd be a great fit for the ${jobTitle} role.

Please take 3 minutes to complete your application — no account needed, completely free.`;
}

const BulkInviteReviewModal: React.FC<BulkInviteReviewModalProps> = ({
  isOpen, onClose, candidates, jobId, jobTitle, inviteSource,
}) => {
  const [rows,          setRows]          = useState<CandidateRow[]>([]);
  const [message,       setMessage]       = useState('');
  const [expiryDays,    setExpiryDays]    = useState(7);
  const [showExpiry,    setShowExpiry]    = useState(false);
  const [isSending,     setIsSending]     = useState(false);
  const [isDone,        setIsDone]        = useState(false);

  // Re-init when opened
  useEffect(() => {
    if (isOpen) {
      setRows(candidates.map(c => ({ ...c, sendStatus: 'idle' })));
      setMessage(buildTemplate(jobTitle, inviteSource));
      setExpiryDays(7);
      setIsDone(false);
      setIsSending(false);
    }
  }, [isOpen, candidates, jobTitle, inviteSource]);

  if (!isOpen) return null;

  const activeRows = rows.filter(r => r.sendStatus !== 'removed' as any);

  const handleRemove = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleSendAll = async () => {
    const toSend = rows.filter(r => r.sendStatus === 'idle');
    if (toSend.length === 0) return;

    setIsSending(true);

    for (const row of toSend) {
      // Mark as pending
      setRows(prev => prev.map(r =>
        r.id === row.id ? { ...r, sendStatus: 'pending' } : r
      ));

      // Personalise message — replace [Candidate Name] with actual first name
      const firstName    = row.name ? row.name.split(' ')[0] : '';
      const personalised = message.replace('[Candidate Name]', firstName || 'there');

      try {
        await sendCandidateInvite({
          jobId,
          jobTitle,
          candidateName:   row.name,
          candidateEmail:  row.email,
          candidatePhone:  row.phone,
          channel:         'email',
          expiryDays,
          customMessage:   personalised,
          candidateId:     inviteSource === 'pipeline' ? row.id : undefined,
          candidateOwnerId: row.candidateOwnerId,
          inviteSource,
        });

        setRows(prev => prev.map(r =>
          r.id === row.id ? { ...r, sendStatus: 'sent' } : r
        ));
      } catch (err: any) {
        setRows(prev => prev.map(r =>
          r.id === row.id ? { ...r, sendStatus: 'failed', errorMsg: err.message } : r
        ));
      }
    }

    setIsSending(false);
    setIsDone(true);
  };

  const sentCount   = rows.filter(r => r.sendStatus === 'sent').length;
  const failedCount = rows.filter(r => r.sendStatus === 'failed').length;
  const idleCount   = rows.filter(r => r.sendStatus === 'idle').length;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={!isSending ? onClose : undefined}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1100 }}
      />

      {/* Modal */}
      <div style={{
        position:      'fixed',
        top:           '55%',
        left:          '55%',
        transform:     'translate(-50%,-50%)',
        zIndex:        1101,
        width:         'calc(100vw - 32px)',
        maxWidth:      '780px',
        maxHeight:     '80vh',
        background:    '#fff',
        borderRadius:  '16px',
        boxShadow:     '0 24px 64px rgba(0,0,0,0.2)',
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
      }}>

        {/* Header */}
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'18px 24px', borderBottom:'1px solid #F3F4F6', flexShrink:0,
          background: 'linear-gradient(135deg,#7B43F1,#9B59F5)',
        }}>
          <div>
            <h2 style={{ margin:0, fontSize:'17px', fontWeight:700, color:'#fff' }}>
              Review Bulk Invite
            </h2>
            <p style={{ margin:'3px 0 0 0', fontSize:'12px', color:'rgba(255,255,255,0.75)' }}>
              {jobTitle} · {rows.length} candidate{rows.length !== 1 ? 's' : ''}
              {inviteSource === 'pipeline' && (
                <span style={{ marginLeft:'8px', padding:'2px 8px', borderRadius:'99px',
                  background:'rgba(255,255,255,0.2)', fontSize:'11px', fontWeight:600 }}>
                  Pipeline Update
                </span>
              )}
            </p>
          </div>
          {!isSending && (
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none',
              borderRadius:'8px', padding:'7px', cursor:'pointer', display:'flex' }}>
              <X size={16} color="#fff" />
            </button>
          )}
        </div>

        {/* Body — two columns */}
        <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>

          {/* LEFT: Candidate list */}
          <div style={{
            width:'42%', flexShrink:0, borderRight:'1px solid #F3F4F6',
            display:'flex', flexDirection:'column', overflow:'hidden',
          }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #F3F4F6',
              background:'#F8FAFC', flexShrink:0 }}>
              <p style={{ margin:0, fontSize:'11px', fontWeight:700, color:'#64748B',
                textTransform:'uppercase', letterSpacing:'0.5px' }}>
                Recipients ({rows.length})
              </p>
            </div>
            <div style={{ overflowY:'auto', flex:1 }}>
              {rows.map((row, i) => (
                <div key={row.id} style={{
                  display:'flex', alignItems:'center', gap:'10px',
                  padding:'10px 16px',
                  borderBottom: i < rows.length - 1 ? '1px solid #F9FAFB' : 'none',
                  background: row.sendStatus === 'sent'   ? '#F0FDF4'
                            : row.sendStatus === 'failed' ? '#FEF2F2'
                            : row.sendStatus === 'pending' ? '#FFFBEB'
                            : '#fff',
                }}>
                  {/* Status icon */}
                  <div style={{ flexShrink:0 }}>
                    {row.sendStatus === 'idle'    && <div style={{ width:24, height:24, borderRadius:'50%', background:'#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center' }}><User size={13} color="#94A3B8" /></div>}
                    {row.sendStatus === 'pending' && <SpinRing />}
                    {row.sendStatus === 'sent'    && <CheckCircle2 size={20} color="#059669" />}
                    {row.sendStatus === 'failed'  && <AlertCircle  size={20} color="#DC2626" />}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontSize:'13px', fontWeight:600, color:'#111827', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {row.name || row.email}
                    </p>
                    <p style={{ margin:'1px 0 0 0', fontSize:'11px', color:'#9CA3AF', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {row.email}
                    </p>
                    {row.sendStatus === 'failed' && row.errorMsg && (
                      <p style={{ margin:'2px 0 0 0', fontSize:'11px', color:'#DC2626' }}>
                        {row.errorMsg.slice(0, 50)}
                      </p>
                    )}
                  </div>

                  {/* Remove button — only for idle rows */}
                  {row.sendStatus === 'idle' && !isSending && (
                    <button
                      onClick={() => handleRemove(row.id)}
                      style={{ background:'none', border:'none', cursor:'pointer',
                        color:'#CBD5E1', padding:'4px', borderRadius:'4px',
                        display:'flex', flexShrink:0 }}
                      title="Remove from this batch"
                    >
                      <Trash2 size={14} color="red" />
                    </button>
                  )}

                  {/* Sent badge */}
                  {row.sendStatus === 'sent' && (
                    <span style={{ fontSize:'11px', color:'#059669', fontWeight:600, flexShrink:0 }}>Sent</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Message editor */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px 20px 16px' }}>

            {/* Expiry */}
            <div style={{ marginBottom:'16px' }}>
              <label style={lbl}>Link Expires After</label>
              <div style={{ position:'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowExpiry(!showExpiry)}
                  disabled={isSending}
                  style={{ ...ipt, display:'flex', justifyContent:'space-between',
                    alignItems:'center', cursor: isSending ? 'default' : 'pointer' }}
                >
                  <span style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <Clock size={13} color="#9CA3AF" />
                    {EXPIRY_OPTIONS.find(o => o.value === expiryDays)?.label}
                  </span>
                  <ChevronDown size={13} color="#9CA3AF" />
                </button>
                {showExpiry && !isSending && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:10,
                    background:'#fff', border:'1px solid #E5E7EB', borderRadius:'8px',
                    marginTop:'4px', boxShadow:'0 8px 24px rgba(0,0,0,0.1)', overflow:'hidden' }}>
                    {EXPIRY_OPTIONS.map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => { setExpiryDays(opt.value); setShowExpiry(false); }}
                        style={{ width:'100%', padding:'10px 14px', border:'none', textAlign:'left',
                          background: expiryDays === opt.value ? '#EDE9FE' : '#fff',
                          color: expiryDays === opt.value ? '#7C3AED' : '#374151',
                          fontSize:'13px', fontWeight: expiryDays === opt.value ? 600 : 400,
                          cursor:'pointer' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Message */}
            <div style={{ marginBottom:'12px' }}>
              <label style={lbl}>
                Message Template
                <span style={{ marginLeft:'6px', fontWeight:400, textTransform:'none',
                  fontSize:'10px', color:'#9CA3AF' }}>
                  — use [Candidate Name] for personalisation
                </span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                disabled={isSending}
                rows={10}
                style={{ ...ipt, height:'auto', resize:'vertical', minHeight:'180px',
                  lineHeight:1.7, fontFamily:'inherit',
                  opacity: isSending ? 0.6 : 1 }}
              />
              <p style={{ margin:'4px 0 0 0', fontSize:'11px', color:'#9CA3AF' }}>
                [Candidate Name] will be replaced with each recipient's first name automatically.
              </p>
            </div>

            {/* Preview example */}
            <div style={{ background:'#F8F7FF', borderRadius:'8px', padding:'12px 14px',
              border:'1px solid #EDE9FE' }}>
              <p style={{ margin:'0 0 6px 0', fontSize:'11px', fontWeight:700,
                color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                Preview (first recipient)
              </p>
              <p style={{ margin:0, fontSize:'12px', color:'#374151', lineHeight:1.7, whiteSpace:'pre-line' }}>
                {rows[0]
                  ? message.replace('[Candidate Name]', rows[0].name?.split(' ')[0] || 'there')
                  : message
                }
              </p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding:'14px 24px', borderTop:'1px solid #F3F4F6',
          flexShrink:0, background:'#fff',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px',
        }}>
          {/* Summary */}
          <div style={{ fontSize:'13px', color:'#6B7280' }}>
            {isDone ? (
              <span>
                {sentCount > 0 && <span style={{ color:'#059669', fontWeight:600 }}>✓ {sentCount} sent</span>}
                {failedCount > 0 && <span style={{ color:'#DC2626', fontWeight:600, marginLeft:'10px' }}>✗ {failedCount} failed</span>}
              </span>
            ) : (
              <span>
                {rows.length} invite{rows.length !== 1 ? 's' : ''} ready to send
              </span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:'10px' }}>
            {!isDone ? (
              <>
                <button
                  onClick={onClose}
                  disabled={isSending}
                  style={{ ...outBtn, opacity: isSending ? 0.5 : 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendAll}
                  disabled={isSending || idleCount === 0}
                  style={{
                    padding:'11px 28px', borderRadius:'10px', border:'none',
                    background: (isSending || idleCount === 0) ? '#C4B5FD'
                      : 'linear-gradient(135deg,#6D28D9,#7C3AED)',
                    color:'#fff', fontSize:'14px', fontWeight:700,
                    cursor: (isSending || idleCount === 0) ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', gap:'8px',
                    boxShadow: isSending ? 'none' : '0 4px 12px rgba(124,58,237,0.3)',
                  }}
                >
                  {isSending ? (
                    <><SpinRing color="#fff" /> Sending {sentCount + failedCount + 1} of {idleCount + sentCount + failedCount}...</>
                  ) : (
                    <><Send size={14} /> Send {idleCount} Invite{idleCount !== 1 ? 's' : ''}</>
                  )}
                </button>
              </>
            ) : (
              <button onClick={onClose} style={{ ...outBtn, padding:'11px 28px' }}>
                Done
              </button>
            )}
          </div>
        </div>

      </div>
      <style>{`@keyframes spin-ring { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function SpinRing({ color = '#7B43F1' }: { color?: string }) {
  return (
    <span style={{ display:'inline-block', width:'18px', height:'18px',
      border:`3px solid ${color}30`, borderTopColor: color,
      borderRadius:'50%', animation:'spin-ring 0.7s linear infinite', flexShrink:0 }} />
  );
}

const lbl: React.CSSProperties = {
  display:'block', fontSize:'11px', fontWeight:700, color:'#6B7280',
  textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px',
};

const ipt: React.CSSProperties = {
  width:'100%', padding:'10px 12px', borderRadius:'8px',
  border:'1px solid #E5E7EB', fontSize:'13px', color:'#111827',
  background:'#fff', outline:'none', boxSizing:'border-box', fontFamily:'inherit',
};

const outBtn: React.CSSProperties = {
  padding:'11px 20px', borderRadius:'10px', border:'1px solid #E5E7EB',
  background:'#fff', color:'#374151', fontSize:'14px', fontWeight:600, cursor:'pointer',
};

export default BulkInviteReviewModal;