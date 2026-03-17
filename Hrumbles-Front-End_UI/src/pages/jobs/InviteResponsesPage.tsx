// src/pages/jobs/InviteResponsesPage.tsx
// Redesigned to match Jobs.tsx — stat cards, purple gradient header table,
// pill filter tabs, search, pagination, invite modal, response drawer.

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, Send, RefreshCw, Users, Search, ChevronLeft,
  ChevronRight, Eye, Mail, MessageSquare, CheckCircle,
  Clock, XCircle, AlertCircle, Loader2,
} from 'lucide-react';
import {
  getInvitesForJob, getInviteStatsForJob, CandidateInvite,
} from '@/services/inviteService';
import InviteStatusBadge from '@/components/jobs/job/invite/InviteStatusBadge';
import InviteResponseDrawer from '@/components/jobs/job/invite/InviteResponseDrawer';
import InviteCandidateModal from '@/components/jobs/job/invite/InviteCandidateModal';
import { supabase } from '@/integrations/supabase/client';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/jobs/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/jobs/ui/tooltip';
import { Button } from '@/components/jobs/ui/button';
import { Input } from '@/components/jobs/ui/input';
import { Card } from '@/components/jobs/ui/card';
import { Badge } from '@/components/jobs/ui/badge';
import Loader from '@/components/ui/Loader';
import moment from 'moment';

type FilterStatus = 'all' | 'sent' | 'opened' | 'applied' | 'expired';

const SRC = {
  pipeline:   { label: 'Pipeline',    bg: '#EDE9FE', color: '#7C3AED' },
  zivex:      { label: 'Zive-X',      bg: '#DBEAFE', color: '#1D4ED8' },
  talentpool: { label: 'Talent Pool', bg: '#D1FAE5', color: '#065F46' },
};

function SrcBadge({ source }: { source: string }) {
  const c = SRC[source as keyof typeof SRC] || SRC.zivex;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const cfg = {
    email:     { icon: <Mail size={11} />,        bg: '#F0F9FF', color: '#0369A1', label: 'Email' },
    whatsapp:  { icon: <MessageSquare size={11} />, bg: '#F0FDF4', color: '#15803D', label: 'WhatsApp' },
    both:      { icon: <Send size={11} />,         bg: '#FAF5FF', color: '#7C3AED', label: 'Both' },
  };
  const c = cfg[channel as keyof typeof cfg] || cfg.email;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.color }}>
      {c.icon}{c.label}
    </span>
  );
}

const InviteResponsesPage: React.FC = () => {
  const { id: jobId } = useParams<{ id: string }>();
  const navigate      = useNavigate();

  const [filter,      setFilter]      = useState<FilterStatus>('all');
  const [search,      setSearch]      = useState('');
  const [srcFilter,   setSrcFilter]   = useState('all');
  const [selected,    setSelected]    = useState<CandidateInvite | null>(null);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage,     setPerPage]     = useState(20);

  // ── Data ──────────────────────────────────────────────────────────────────
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

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...invites];
    if (filter !== 'all')   list = list.filter(i => i.status === filter);
    if (srcFilter !== 'all') list = list.filter(i => i.invite_source === srcFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        (i.candidate_name || '').toLowerCase().includes(q) ||
        (i.candidate_email || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [invites, filter, srcFilter, search]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const startIdx   = (currentPage - 1) * perPage;
  const paginated  = useMemo(
    () => filtered.slice(startIdx, startIdx + perPage),
    [filtered, currentPage, perPage]
  );

  const conversion = stats && stats.total > 0
    ? Math.round((stats.applied / stats.total) * 100) : 0;

  // ── Action button ─────────────────────────────────────────────────────────
  const ActionBtn = ({ invite }: { invite: CandidateInvite }) => {
    const res    = invite.candidate_invite_responses;
    const isPipe = invite.invite_source === 'pipeline';

    if (!res && invite.status !== 'applied')
      return <span className="text-xs text-gray-300">—</span>;

    if (isPipe && res?.status === 'auto_updated')
      return (
        <button onClick={() => { setSelected(invite); setDrawerOpen(true); }}
          className="px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all hover:opacity-80"
          style={{ background: '#EDE9FE', color: '#7C3AED', border: '1px solid #DDD6FE' }}>
          Updated ✓
        </button>
      );

    const lbl = res?.status === 'added_to_job' ? 'Added ✓'
              : res?.status === 'rejected'     ? 'Rejected'
              : invite.status === 'applied'    ? 'Review'
              : '—';

    if (lbl === '—') return <span className="text-xs text-gray-300">—</span>;

    return (
      <button onClick={() => { setSelected(invite); setDrawerOpen(true); }}
        className="px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all hover:opacity-80"
        style={{ background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>
        {lbl}
      </button>
    );
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <Loader size={60} className="border-[6px]" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6">

      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/jobs/${jobId}`)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold mb-0.5">Invite Responses</h1>
            {job && (
              <p className="text-gray-500 text-sm flex items-center gap-2">
                <Link to={`/jobs/${jobId}`} className="hover:underline text-purple-600 font-medium">{job.title}</Link>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-3 pl-1.5 pr-5 py-1 rounded-full text-white font-bold bg-[#7731E8] hover:bg-[#6528cc] shadow-[0_4px_15px_rgba(119,49,232,0.4)] hover:shadow-[0_6px_20px_rgba(119,49,232,0.6)] transform hover:scale-105 transition-all duration-300 h-10">
            <div className="relative flex items-center justify-center w-7 h-7 mr-0.5">
              <div className="absolute inset-0 bg-white blur-md scale-110 opacity-50 animate-pulse" />
              <div className="relative w-full h-full rounded-full flex items-center justify-center z-10 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.2)]"
                style={{ background: 'radial-gradient(circle at 30% 30%, #ffffff, #f1f5f9)' }}>
                <Send size={14} className="text-purple-700" />
              </div>
            </div>
            <span className="tracking-wide text-sm">Send Invite</span>
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Invites',  value: stats.total,            icon: <Users size={20} className="text-purple-600" />,  bg: 'bg-purple-50', iconBg: 'bg-purple-100', val: 'text-purple-700', clickVal: 'all'     },
            { label: 'Sent',           value: stats.sent,             icon: <Send size={20} className="text-gray-500" />,      bg: 'bg-gray-50',   iconBg: 'bg-gray-100',   val: 'text-gray-700',  clickVal: 'sent'    },
            { label: 'Opened',         value: stats.opened,           icon: <Eye size={20} className="text-amber-600" />,      bg: 'bg-amber-50',  iconBg: 'bg-amber-100',  val: 'text-amber-700', clickVal: 'opened'  },
            { label: 'Applied',        value: stats.applied,          icon: <CheckCircle size={20} className="text-green-600" />, bg: 'bg-green-50', iconBg: 'bg-green-100', val: 'text-green-700', clickVal: 'applied' },
            { label: 'Expired',        value: stats.expired,          icon: <AlertCircle size={20} className="text-red-500" />,  bg: 'bg-red-50',   iconBg: 'bg-red-100',   val: 'text-red-600',   clickVal: 'expired' },
          ].map(({ label, value, icon, bg, iconBg, val, clickVal }) => (
            <Card key={label}
              onClick={() => { setFilter(clickVal as FilterStatus); setCurrentPage(1); }}
              className={`p-4 flex justify-between items-start cursor-pointer hover:shadow-lg transition-shadow ${bg}`}>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <h3 className={`text-3xl font-bold ${val}`}>{value}</h3>
              </div>
              <div className={`p-2 ${iconBg} rounded-lg`}>{icon}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Conversion bar */}
      {stats && stats.total > 0 && (
        <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-5 py-3 border border-purple-100">
          <Users size={16} className="text-purple-600 flex-shrink-0" />
          <span className="text-sm text-purple-800 font-semibold">
            Conversion Rate: {conversion}%
          </span>
          <div className="flex-1 h-2 bg-purple-100 rounded-full overflow-hidden ml-2">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-600 transition-all duration-700"
              style={{ width: `${conversion}%` }} />
          </div>
          <span className="text-xs text-purple-500 flex-shrink-0">
            {stats.applied}/{stats.total} applied
          </span>
        </div>
      )}

      {/* ── Toolbar: filters + search ── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Status pill tabs */}
        <div className="flex-shrink-0">
          <div className="inline-flex items-center rounded-full bg-gray-100 p-1 shadow-inner gap-0.5">
            {(['all','sent','opened','applied','expired'] as FilterStatus[]).map(f => (
              <button key={f} onClick={() => { setFilter(f); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && stats && (
                  <span className={`ml-1.5 text-xs rounded-full h-4 w-4 inline-flex items-center justify-center ${
                    filter === f ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {stats[f as keyof typeof stats] ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Source filter */}
        <Select value={srcFilter} onValueChange={v => { setSrcFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-36 rounded-full bg-gray-100 border-transparent text-gray-600 text-sm h-10">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="pipeline">Pipeline</SelectItem>
            <SelectItem value="zivex">Zive-X</SelectItem>
            <SelectItem value="talentpool">Talent Pool</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-grow min-w-[220px] max-w-[360px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9 h-10 rounded-full bg-gray-100 border-transparent text-sm focus-visible:ring-purple-500"
          />
        </div>

        <span className="ml-auto text-sm text-gray-400 font-medium">{filtered.length} invite{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20">
          <Send size={36} className="text-purple-200 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-500">No invites found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting filters or send a new invite</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-600 to-violet-600">
                <tr>
                  {['Candidate', 'Source', 'Channel', 'Status', 'Sent', 'Expires', 'Recruiter', 'Action'].map(h => (
                    <th key={h} scope="col"
                      className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginated.map((inv) => {
                  const recruiter = inv.hr_employees
                    ? `${inv.hr_employees.first_name || ''} ${inv.hr_employees.last_name || ''}`.trim()
                    : '—';
                  const isExpired  = inv.status === 'expired';
                  const isApplied  = inv.status === 'applied';

                  return (
                    <tr key={inv.id}
                      className="transition-all duration-150 hover:shadow-sm hover:-translate-y-px hover:bg-gray-50">

                      {/* Candidate */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                          {inv.candidate_name || '—'}
                        </p>
                        {inv.candidate_email && (
                          <p className="text-xs text-gray-400 mt-0.5">{inv.candidate_email}</p>
                        )}
                        {inv.candidate_phone && (
                          <p className="text-xs text-gray-400">{inv.candidate_phone}</p>
                        )}
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3"><SrcBadge source={inv.invite_source} /></td>

                      {/* Channel */}
                      <td className="px-4 py-3"><ChannelBadge channel={inv.channel} /></td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <InviteStatusBadge status={inv.status} size="sm" />
                        {inv.opened_at && (
                          <p className="text-xs text-amber-500 mt-0.5">
                            Opened {moment(inv.opened_at).fromNow()}
                          </p>
                        )}
                      </td>

                      {/* Sent */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{moment(inv.sent_at || inv.created_at).format('DD MMM YYYY')}</span>
                        <p className="text-xs text-gray-400">{moment(inv.sent_at || inv.created_at).fromNow()}</p>
                      </td>

                      {/* Expires */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-medium ${isExpired ? 'text-red-500' : isApplied ? 'text-green-600' : 'text-gray-600'}`}>
                          {isApplied ? '—' : moment(inv.expires_at).format('DD MMM YYYY')}
                        </span>
                        {!isApplied && (
                          <p className={`text-xs ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
                            {isExpired ? 'Expired' : moment(inv.expires_at).fromNow()}
                          </p>
                        )}
                      </td>

                      {/* Recruiter */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{recruiter}</span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 shadow-sm border border-slate-200 w-fit">
                          <ActionBtn invite={inv} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <Select value={perPage.toString()} onValueChange={v => { setPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm text-gray-500">
            Showing {startIdx + 1}–{Math.min(startIdx + perPage, filtered.length)} of {filtered.length}
          </span>
        </div>
      )}

      {/* ── Modals ── */}
      <InviteCandidateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        jobId={jobId!} job={job} inviteSource="zivex"
      />
      <InviteResponseDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        invite={selected}
        response={selected?.candidate_invite_responses || null}
        jobId={jobId!}
        onAction={() => refetch()}
      />
    </div>
  );
};

export default InviteResponsesPage;