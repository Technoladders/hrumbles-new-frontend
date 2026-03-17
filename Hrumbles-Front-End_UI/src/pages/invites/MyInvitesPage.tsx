// src/pages/invites/MyInvitesPage.tsx
// "My Invites" sidebar menu page.
// Lists all invites sent by the current user across all jobs.
// Matches Jobs.tsx style — stat cards, purple table, filter tabs, search, pagination.

import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  Send, Search, Eye, RefreshCw, ChevronLeft, ChevronRight,
  Users, CheckCircle, Clock, AlertCircle, Mail, MessageSquare,
  Briefcase, ArrowUpDown, Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import InviteResponseDrawer from '@/components/jobs/job/invite/InviteResponseDrawer';
import InviteStatusBadge from '@/components/jobs/job/invite/InviteStatusBadge';
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

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'sent' | 'opened' | 'applied' | 'expired';

interface InviteRow {
  id:               string;
  job_id:           string;
  candidate_name:   string | null;
  candidate_email:  string | null;
  candidate_phone:  string | null;
  channel:          string;
  status:           string;
  invite_source:    string;
  expires_at:       string;
  sent_at:          string | null;
  created_at:       string;
  opened_at:        string | null;
  invite_token:     string;
  hr_jobs:          { id: string; title: string; job_id: string } | null;
  candidate_invite_responses: any | null;
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

const SRC = {
  pipeline:   { label: 'Pipeline',    bg: '#EDE9FE', color: '#7C3AED' },
  zivex:      { label: 'Zive-X',      bg: '#DBEAFE', color: '#1D4ED8' },
  talentpool: { label: 'Talent Pool', bg: '#D1FAE5', color: '#065F46' },
};

function SrcBadge({ source }: { source: string }) {
  const c = SRC[source as keyof typeof SRC] || SRC.zivex;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}>{c.label}</span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const cfg = {
    email:    { icon: <Mail size={11} />,           bg: '#F0F9FF', color: '#0369A1', label: 'Email'     },
    whatsapp: { icon: <MessageSquare size={11} />,  bg: '#F0FDF4', color: '#15803D', label: 'WhatsApp'  },
    both:     { icon: <Send size={11} />,            bg: '#FAF5FF', color: '#7C3AED', label: 'Both'      },
  };
  const c = cfg[channel as keyof typeof cfg] || cfg.email;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.color }}>{c.icon}{c.label}</span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const MyInvitesPage: React.FC = () => {
  const navigate    = useNavigate();
  const user        = useSelector((s: any) => s.auth.user);
  const userRole    = useSelector((s: any) => s.auth.role);
  const isEmployee  = userRole === 'employee';

  const [filter,      setFilter]      = useState<FilterStatus>('all');
  const [srcFilter,   setSrcFilter]   = useState('all');
  const [jobFilter,   setJobFilter]   = useState('all');
  const [search,      setSearch]      = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage,     setPerPage]     = useState(20);
  const [selected,    setSelected]    = useState<InviteRow | null>(null);
  const [drawerOpen,  setDrawerOpen]  = useState(false);

  // ── Fetch all invites for this user (or all if admin) ─────────────────────
  const { data: invites = [], isLoading, refetch } = useQuery<InviteRow[]>({
    queryKey: ['my-invites', user?.id, userRole],
    queryFn: async () => {
      let q = supabase
        .from('candidate_invites')
        .select(`
          id, job_id, candidate_name, candidate_email, candidate_phone,
          channel, status, invite_source, expires_at, sent_at, created_at, opened_at, invite_token,
          hr_jobs ( id, title, job_id ),
          candidate_invite_responses (
            id, status, candidate_name, email, phone,
            total_experience, current_location, current_company,
            current_designation, current_salary, expected_salary,
            parsed_current_ctc, parsed_expected_ctc,
            notice_period, linkedin_url, resume_url, top_skills, metadata,
            submitted_at, recruiter_notes
          )
        `)
        .order('created_at', { ascending: false });

      // Employees only see their own invites
      if (isEmployee) q = q.eq('created_by', user.id);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // ── Derived counts ────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:   invites.length,
    sent:    invites.filter(i => i.status === 'sent').length,
    opened:  invites.filter(i => i.status === 'opened').length,
    applied: invites.filter(i => i.status === 'applied').length,
    expired: invites.filter(i => i.status === 'expired').length,
  }), [invites]);

  const conversion = stats.total > 0 ? Math.round((stats.applied / stats.total) * 100) : 0;

  const uniqueJobs = useMemo(() => {
    const map = new Map<string, string>();
    invites.forEach(i => { if (i.hr_jobs) map.set(i.job_id, i.hr_jobs.title); });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [invites]);

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...invites];
    if (filter !== 'all')    list = list.filter(i => i.status === filter);
    if (srcFilter !== 'all') list = list.filter(i => i.invite_source === srcFilter);
    if (jobFilter !== 'all') list = list.filter(i => i.job_id === jobFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        (i.candidate_name  || '').toLowerCase().includes(q) ||
        (i.candidate_email || '').toLowerCase().includes(q) ||
        (i.hr_jobs?.title  || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [invites, filter, srcFilter, jobFilter, search]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const startIdx   = (currentPage - 1) * perPage;
  const paginated  = filtered.slice(startIdx, startIdx + perPage);

  // ── Action button ─────────────────────────────────────────────────────────
  const ActionBtn = ({ invite }: { invite: InviteRow }) => {
    const res    = invite.candidate_invite_responses;
    const isPipe = invite.invite_source === 'pipeline';

    if (!res && invite.status !== 'applied')
      return <span className="text-xs text-gray-300">—</span>;

    if (isPipe && res?.status === 'auto_updated')
      return (
        <button onClick={() => { setSelected(invite); setDrawerOpen(true); }}
          className="px-3 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80"
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
        className="px-3 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80"
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
        <div>
          <h1 className="text-3xl font-bold mb-1">My Invites</h1>
          <p className="text-gray-500 text-sm">All candidate invites {isEmployee ? 'you have sent' : 'across your organization'}</p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Invites', value: stats.total,   icon: <Users size={22} className="text-purple-600" />, bg: 'bg-purple-50', iconBg: 'bg-purple-100', val: 'text-purple-700', clickVal: 'all'     },
          { label: 'Sent',          value: stats.sent,    icon: <Send size={22} className="text-gray-500" />,    bg: 'bg-gray-50',   iconBg: 'bg-gray-100',   val: '',               clickVal: 'sent'    },
          { label: 'Opened',        value: stats.opened,  icon: <Eye size={22} className="text-amber-600" />,   bg: 'bg-amber-50',  iconBg: 'bg-amber-100',  val: 'text-amber-700', clickVal: 'opened'  },
          { label: 'Applied',       value: stats.applied, icon: <CheckCircle size={22} className="text-green-600" />, bg: 'bg-green-50', iconBg: 'bg-green-100', val: 'text-green-700', clickVal: 'applied' },
          { label: 'Expired',       value: stats.expired, icon: <AlertCircle size={22} className="text-red-500" />,  bg: 'bg-red-50',   iconBg: 'bg-red-100',   val: 'text-red-600',   clickVal: 'expired' },
        ].map(({ label, value, icon, bg, iconBg, val, clickVal }) => (
          <Card key={label}
            onClick={() => { setFilter(clickVal as FilterStatus); setCurrentPage(1); }}
            className={`p-4 flex justify-between items-start cursor-pointer hover:shadow-lg transition-shadow ${bg}`}>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <h3 className={`text-3xl font-bold ${val || 'text-gray-800'}`}>{value}</h3>
            </div>
            <div className={`p-2 ${iconBg} rounded-lg`}>{icon}</div>
          </Card>
        ))}
      </div>

      {/* Conversion bar */}
      {stats.total > 0 && (
        <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-5 py-3 border border-purple-100">
          <Users size={16} className="text-purple-600 flex-shrink-0" />
          <span className="text-sm text-purple-800 font-semibold">Conversion Rate: {conversion}%</span>
          <div className="flex-1 h-2 bg-purple-100 rounded-full overflow-hidden ml-2">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-600 transition-all duration-700"
              style={{ width: `${conversion}%` }} />
          </div>
          <span className="text-xs text-purple-500 flex-shrink-0">{stats.applied}/{stats.total} applied</span>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Status tabs */}
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
                <span className={`ml-1.5 text-xs rounded-full h-4 w-4 inline-flex items-center justify-center ${
                  filter === f ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {f === 'all' ? stats.total : stats[f as keyof typeof stats]}
                </span>
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

        {/* Job filter */}
        <Select value={jobFilter} onValueChange={v => { setJobFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-44 rounded-full bg-gray-100 border-transparent text-gray-600 text-sm h-10">
            <SelectValue placeholder="All Jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {uniqueJobs.map(j => (
              <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-grow min-w-[220px] max-w-[380px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Search by name, email, or job…"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9 h-10 rounded-full bg-gray-100 border-transparent text-sm focus-visible:ring-purple-500"
          />
        </div>

        <span className="ml-auto text-sm text-gray-400 font-medium">
          {filtered.length} invite{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20 shadow-sm">
          <Send size={36} className="text-purple-200 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-500">No invites found</p>
          <p className="text-sm text-gray-400 mt-1">Adjust your filters or go to a job to send invites</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-600 to-violet-600">
                <tr>
                  {['Candidate','Job','Source','Channel','Status','Sent','Expires','Action'].map(h => (
                    <th key={h} scope="col"
                      className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginated.map((inv) => {
                  const isExpired = inv.status === 'expired';
                  const isApplied = inv.status === 'applied';

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

                      {/* Job */}
                      <td className="px-4 py-3">
                        {inv.hr_jobs ? (
                          <Link to={`/jobs/${inv.job_id}/invites`}
                            className="text-sm font-medium text-purple-600 hover:underline leading-tight">
                            {inv.hr_jobs.title}
                          </Link>
                        ) : <span className="text-xs text-gray-400">—</span>}
                        {inv.hr_jobs?.job_id && (
                          <span className="block mt-0.5">
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-100 px-1.5 py-0">
                              {inv.hr_jobs.job_id}
                            </Badge>
                          </span>
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
                        <span className="text-sm text-gray-600">
                          {moment(inv.sent_at || inv.created_at).format('DD MMM YYYY')}
                        </span>
                        <p className="text-xs text-gray-400">
                          {moment(inv.sent_at || inv.created_at).fromNow()}
                        </p>
                      </td>

                      {/* Expires */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          isApplied ? 'text-green-600' : isExpired ? 'text-red-500' : 'text-gray-600'
                        }`}>
                          {isApplied ? '—' : moment(inv.expires_at).format('DD MMM YYYY')}
                        </span>
                        {!isApplied && (
                          <p className={`text-xs ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
                            {isExpired ? 'Expired' : moment(inv.expires_at).fromNow()}
                          </p>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 shadow-sm border border-slate-200 w-fit">
                          <ActionBtn invite={inv} />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link to={`/jobs/${inv.job_id}/invites`}>
                                  <Button variant="ghost" size="icon"
                                    className="h-7 w-7 rounded-full text-slate-500 hover:bg-purple-600 hover:text-white transition-colors">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent><p>View Job Invites</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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

      {/* ── Response drawer ── */}
      {selected && (
        <InviteResponseDrawer
          isOpen={drawerOpen}
          onClose={() => { setDrawerOpen(false); setSelected(null); }}
          invite={selected as any}
          response={selected.candidate_invite_responses || null}
          jobId={selected.job_id}
          onAction={() => refetch()}
        />
      )}
    </div>
  );
};

export default MyInvitesPage;