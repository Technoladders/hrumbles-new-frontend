// src/pages/jobs/InviteResponsesPage.tsx
// Shows all invites for a job.
// Source badge: Pipeline (purple) | Zive-X (blue) | Talent Pool (teal)
// Action button forks on invite_source.

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Send, RefreshCw, Users } from 'lucide-react';
import {
  getInvitesForJob,
  getInviteStatsForJob,
  CandidateInvite,
} from '@/services/inviteService';
import InviteStatusBadge from '@/components/jobs/job/invite/InviteStatusBadge';
import InviteResponseDrawer from '@/components/jobs/job/invite/InviteResponseDrawer';
import InviteCandidateModal from '@/components/jobs/job/invite/InviteCandidateModal';
import { supabase } from '@/integrations/supabase/client';

type FilterStatus = 'all' | 'sent' | 'opened' | 'applied' | 'expired';

const SOURCE_CONFIG = {
  pipeline:   { label: 'Pipeline',    bg: '#EDE9FE', color: '#7C3AED' },
  zivex:      { label: 'Zive-X',      bg: '#DBEAFE', color: '#1D4ED8' },
  talentpool: { label: 'Talent Pool', bg: '#D1FAE5', color: '#065F46' },
};

function SourceBadge({ source }: { source: string }) {
  const c = SOURCE_CONFIG[source] || SOURCE_CONFIG.zivex;
  return (
    <span style={{ padding: '2px 8px', borderRadius: '99px', background: c.bg,
      color: c.color, fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

const InviteResponsesPage: React.FC = () => {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate      = useNavigate();

  const [filter,      setFilter]      = useState<FilterStatus>('all');
  const [selected,    setSelected]    = useState<CandidateInvite | null>(null);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);

  const { data: job } = useQuery({
    queryKey: ['job-for-invites', jobId],
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_jobs')
        .select('id, title, location, experience, skills, description, hiringMode, job_type_category, noticePeriod, department')
        .eq('id', jobId!)
        .single();
      return data;
    },
    enabled: !!jobId,
  });

  const { data: invites = [], isLoading, refetch } = useQuery({
    queryKey: ['job-invites', jobId],
    queryFn:  () => getInvitesForJob(jobId!),
    enabled:  !!jobId,
  });

  const { data: stats } = useQuery({
    queryKey: ['invite-stats', jobId],
    queryFn:  () => getInviteStatsForJob(jobId!),
    enabled:  !!jobId,
  });

  const filtered = filter === 'all' ? invites : invites.filter(i => i.status === filter);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const getActionBtn = (invite: CandidateInvite) => {
    const res     = invite.candidate_invite_responses;
    const source  = invite.invite_source;

    if (!res) {
      if (invite.status === 'applied') return <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Loading...</span>;
      return <span style={{ fontSize: '12px', color: '#D1D5DB' }}>—</span>;
    }

    // Pipeline: auto-updated — show read-only badge
    if (source === 'pipeline' || res.status === 'auto_updated') {
      return (
        <button
          onClick={() => { setSelected(invite); setDrawerOpen(true); }}
          style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #DDD6FE',
            background: '#EDE9FE', color: '#7C3AED', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
          Updated ✓
        </button>
      );
    }

    // Zive-X / Talent Pool — Review / Added / Rejected
    const label = res.status === 'added_to_job' ? 'Added ✓'
                : res.status === 'rejected'     ? 'Rejected'
                : 'Review';

    return (
      <button
        onClick={() => { setSelected(invite); setDrawerOpen(true); }}
        style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #DDD6FE',
          background: '#F5F3FF', color: '#7C3AED', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
        {label}
      </button>
    );
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px', fontFamily: 'inherit' }}>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate(`/jobs/${jobId}`)}
          style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={18} color="#6B7280" />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>Invite Responses</h1>
          {job && <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#6B7280' }}>{job.title}</p>}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label:'Total',   value: stats.total,   color:'#7B43F1', bg:'#EDE9FE' },
            { label:'Sent',    value: stats.sent,    color:'#6B7280', bg:'#F3F4F6' },
            { label:'Opened',  value: stats.opened,  color:'#D97706', bg:'#FEF3C7' },
            { label:'Applied', value: stats.applied, color:'#059669', bg:'#D1FAE5' },
            { label:'Expired', value: stats.expired, color:'#DC2626', bg:'#FEE2E2' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: bg, borderRadius: '10px', padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color }}>{value}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: 700, color, textTransform: 'uppercase' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Conversion */}
      {stats && stats.total > 0 && (
        <div style={{ background: '#F5F3FF', borderRadius: '10px', padding: '12px 18px',
          marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={16} color="#7C3AED" />
          <span style={{ fontSize: '13px', color: '#5B21B6', fontWeight: 600 }}>
            Conversion: {Math.round((stats.applied / stats.total) * 100)}%
            &nbsp;({stats.applied} of {stats.total} invites resulted in an application)
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['all','sent','opened','applied','expired'] as FilterStatus[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: '99px',
              border:     filter === f ? '2px solid #7B43F1' : '1px solid #E5E7EB',
              background: filter === f ? '#EDE9FE' : '#fff',
              color:      filter === f ? '#7C3AED' : '#6B7280',
              fontSize: '12px', fontWeight: filter === f ? 700 : 500, cursor: 'pointer',
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && stats && (
                <span style={{ marginLeft: '5px', opacity: 0.7 }}>({stats[f as keyof typeof stats] ?? 0})</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => refetch()} style={{ padding: '8px 14px', borderRadius: '8px',
            border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setModalOpen(true)} style={{ padding: '8px 16px', borderRadius: '8px',
            border: 'none', background: '#7B43F1', color: '#fff',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Send size={14} /> Send New Invite
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #EDE9FE', borderTopColor: '#7B43F1',
            borderRadius: '50%', animation: 'irp-spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          Loading invites...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff',
          borderRadius: '12px', border: '1px solid #F3F4F6' }}>
          <Send size={32} color="#DDD6FE" style={{ marginBottom: '12px' }} />
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#374151' }}>No invites found</p>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#9CA3AF' }}>Send your first invite above</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #F3F4F6', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1fr',
            padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #F3F4F6' }}>
            {['Candidate','Source','Channel','Status','Sent At','Action'].map(h => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 700, color: '#64748B',
                textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
            ))}
          </div>

          {filtered.map((inv, idx) => {
            const recruiter = inv.hr_employees
              ? `${inv.hr_employees.first_name} ${inv.hr_employees.last_name}`.trim()
              : '—';

            return (
              <div key={inv.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 1fr',
                padding: '12px 16px', alignItems: 'center',
                borderBottom: idx < filtered.length - 1 ? '1px solid #F9FAFB' : 'none',
                background: idx % 2 === 0 ? '#fff' : '#FAFAFA',
              }}>
                {/* Candidate */}
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                    {inv.candidate_name || inv.candidate_email || '—'}
                  </p>
                  {inv.candidate_email && inv.candidate_name && (
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#9CA3AF' }}>{inv.candidate_email}</p>
                  )}
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#9CA3AF' }}>by {recruiter}</p>
                </div>

                {/* Source */}
                <SourceBadge source={inv.invite_source} />

                {/* Channel */}
                <span style={{ fontSize: '12px', color: '#6B7280', textTransform: 'capitalize' }}>
                  {inv.channel}
                </span>

                {/* Status */}
                <InviteStatusBadge status={inv.status} size="sm" />

                {/* Sent at */}
                <div>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{fmtDate(inv.sent_at)}</span>
                  {inv.opened_at && (
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#D97706' }}>
                      Opened {fmtDate(inv.opened_at)}
                    </p>
                  )}
                </div>

                {/* Action */}
                {getActionBtn(inv)}
              </div>
            );
          })}
        </div>
      )}

      {/* Send invite modal */}
      <InviteCandidateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        jobId={jobId!}
        job={job}
        inviteSource="zivex"
      />

      {/* Response drawer */}
      <InviteResponseDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        invite={selected}
        response={selected?.candidate_invite_responses || null}
        jobId={jobId!}
        onAction={() => refetch()}
      />

      <style>{`@keyframes irp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default InviteResponsesPage;