// src/components/dashboard/widgets/InterviewsWidget.tsx
// Drop-in widget + full page. Route: <Route path="/interviews" element={<InterviewsPage />} />

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  isToday, isTomorrow, isThisWeek, isPast, parseISO, isValid,
  format, startOfDay,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Search, SlidersHorizontal,
  RefreshCw, Calendar, Clock, MapPin, Video, User,
  CheckCircle2, XCircle, AlertCircle, Loader2,
  MessageSquare, ChevronDown, ChevronUp, ExternalLink,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InterviewRow {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email?: string;
  job_id?: string;
  job_title?: string;
  interview_date: string;
  interview_time?: string;
  interview_round: string;
  interview_type?: string;
  location?: string;
  status: string;
  feedback?: { result?: string; comments?: string } | null;
  created_by: string;
  owner_name?: string;
  organization_id: string;
}

type TabKey = 'all' | 'today' | 'upcoming' | 'completed';

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (s?: string) => {
  if (!s) return '—';
  try {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (isToday(dt))    return 'Today';
    if (isTomorrow(dt)) return 'Tomorrow';
    return format(dt, 'dd MMM yyyy');
  } catch { return s; }
};

const fmtTime = (s?: string) => {
  if (!s || !s.trim()) return '';
  try {
    const [h, m] = s.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0);
    return format(d, 'h:mm a');
  } catch { return s; }
};

const getInitials = (name = '') => {
  const p = name.trim().split(' ');
  return `${p[0]?.[0] || ''}${p[p.length - 1]?.[0] || ''}`.toUpperCase() || '?';
};

const avatarColor = (name = '') => {
  const colors = [
    'from-violet-500 to-purple-700',
    'from-indigo-500 to-blue-600',
    'from-pink-500 to-rose-600',
    'from-teal-500 to-cyan-600',
    'from-orange-500 to-amber-600',
    'from-green-500 to-emerald-600',
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};

// Status badge — matches exact app pill style
const StatusBadge = ({ status, feedback }: { status: string; feedback?: InterviewRow['feedback'] }) => {
  if (status === 'completed' || status === 'rejected') {
    const result = feedback?.result;
    if (result === 'Selected')
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="h-3 w-3" />Selected</span>;
    if (result === 'Rejected')
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200"><XCircle className="h-3 w-3" />Rejected</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"><CheckCircle2 className="h-3 w-3" />Completed</span>;
  }
  if (status === 'rescheduled')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"><RefreshCw className="h-3 w-3" />Rescheduled</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200"><Calendar className="h-3 w-3" />Scheduled</span>;
};

const RoundBadge = ({ round }: { round: string }) => {
  const map: Record<string, string> = {
    'Technical Assessment': 'bg-sky-50 text-sky-700 border-sky-200',
    'L1': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'L2': 'bg-purple-50 text-purple-700 border-purple-200',
    'L3': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    'End Client Round': 'bg-orange-50 text-orange-700 border-orange-200',
  };
  const cls = map[round] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      {round}
    </span>
  );
};

// ICS download
const downloadIcs = (iv: InterviewRow) => {
  try {
    const date   = iv.interview_date.replace(/-/g, '');
    const tStr   = (iv.interview_time || '09:00').replace(':', '');
    const dtStart = `${date}T${tStr}00`;
    const endH   = String(parseInt(tStr.slice(0, 2)) + 1).padStart(2, '0');
    const dtEnd  = `${date}T${endH}${tStr.slice(2)}00`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Xrilic ATS//Interview//EN',
      'BEGIN:VEVENT', `UID:${iv.id}@xrilic.ai`,
      `DTSTART:${dtStart}`, `DTEND:${dtEnd}`,
      `SUMMARY:${iv.interview_round} \u2013 ${iv.candidate_name}`,
      `DESCRIPTION:Job: ${iv.job_title || 'N/A'}\\nCandidate: ${iv.candidate_name}`,
      `LOCATION:${iv.location || 'Virtual'}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })),
      download: `interview_${iv.candidate_name.replace(/\s/g, '_')}.ics`,
    });
    a.click();
  } catch {}
};

// ─── Feedback Expander ───────────────────────────────────────────────────────

const FeedbackCell = ({ feedback }: { feedback?: InterviewRow['feedback'] }) => {
  const [open, setOpen] = useState(false);
  if (!feedback?.comments) return <span className="text-xs text-gray-400">—</span>;
  const short = feedback.comments.slice(0, 40);
  const long  = feedback.comments.length > 40;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-start gap-1 text-left group w-full">
          <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-gray-400 flex-shrink-0 group-hover:text-violet-500 transition-colors" />
          <span className="text-xs text-gray-700 leading-5">
            {open ? feedback.comments : short}{!open && long && '…'}
          </span>
          {long && (open
            ? <ChevronUp className="h-3 w-3 mt-1 flex-shrink-0 text-gray-400" />
            : <ChevronDown className="h-3 w-3 mt-1 flex-shrink-0 text-gray-400" />
          )}
        </button>
      </CollapsibleTrigger>
    </Collapsible>
  );
};

// ─── Main Widget (embeddable, maxRows mode) ───────────────────────────────────

interface InterviewsWidgetProps {
  maxRows?: number;
}

const InterviewsWidget: React.FC<InterviewsWidgetProps> = ({ maxRows = 5 }) => {
  const navigate       = useNavigate();
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const user           = useSelector((s: any) => s.auth.user);
  const userRole       = useSelector((s: any) => s.auth.role);
  const [rows, setRows]     = useState<InterviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const isPrivileged = userRole === 'organization_superadmin' || userRole === 'admin';
    let q = supabase
      .from('hr_candidate_interviews')
      .select(`
        id, candidate_id, interview_date, interview_time, interview_round,
        interview_type, location, status, feedback, created_by, organization_id,
        candidate:hr_job_candidates!candidate_id(
          name, email, job_id,
          job:hr_jobs!job_id(id, title)
        ),
        owner:hr_employees!created_by(first_name, last_name)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'scheduled')
      .gte('interview_date', today)
      .order('interview_date', { ascending: true })
      .order('interview_time', { ascending: true })
      .limit(maxRows);

    if (!isPrivileged) {
      q = q.eq('created_by', user?.id);
    }

    q.then(({ data }) => {
      setRows(mapRows(data || []));
      setLoading(false);
    });
  }, [organizationId, userRole, user?.id, maxRows]);

  if (loading) return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="h-10 bg-gradient-to-r from-purple-600 to-violet-600" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Header — purple gradient matching Jobs.tsx */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-2.5 flex items-center justify-between">
        <span className="text-white font-semibold text-sm">Upcoming Interviews</span>
        <Button variant="ghost" size="sm" onClick={() => navigate('/interviews')}
          className="text-purple-200 hover:text-white hover:bg-white/10 h-7 text-xs px-2">
          View All <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">No upcoming interviews</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {rows.map(iv => (
            <div key={iv.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer group"
              onClick={() => iv.job_id && navigate(`/jobs/candidateprofile/${iv.candidate_id}/${iv.job_id}`)}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(iv.candidate_name)} flex items-center justify-center text-white text-xs font-bold`}>
                {getInitials(iv.candidate_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 truncate">{iv.candidate_name}</span>
                  <RoundBadge round={iv.interview_round} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500 truncate">{iv.job_title || '—'}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-500">{fmtDate(iv.interview_date)}</span>
                  {iv.interview_time && <><span className="text-gray-300">·</span><span className="text-xs text-gray-500">{fmtTime(iv.interview_time)}</span></>}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-violet-500 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterviewsWidget;

// ─── Map raw Supabase rows ─────────────────────────────────────────────────────

function mapRows(data: any[]): InterviewRow[] {
  return data.map((r) => ({
    id:             r.id,
    candidate_id:   r.candidate_id,
    candidate_name: r.candidate?.name || 'Unknown',
    candidate_email: r.candidate?.email,
    job_id:         r.candidate?.job?.id || r.job_id,
    job_title:      r.candidate?.job?.title || '',
    interview_date: r.interview_date,
    interview_time: r.interview_time,
    interview_round: r.interview_round || '',
    interview_type: r.interview_type,
    location:       r.location,
    status:         r.status,
    feedback:       typeof r.feedback === 'string'
                      ? tryParse(r.feedback)
                      : r.feedback,
    created_by:     r.created_by,
    owner_name:     r.owner
                      ? `${r.owner.first_name || ''} ${r.owner.last_name || ''}`.trim()
                      : '',
    organization_id: r.organization_id,
  }));
}

function tryParse(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}

// ─── Full Interviews Page ─────────────────────────────────────────────────────
// Route: <Route path="/interviews" element={<InterviewsPage />} />

export const InterviewsPage: React.FC = () => {
  const navigate       = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const user           = useSelector((s: any) => s.auth.user);
  const userRole       = useSelector((s: any) => s.auth.role);

  // Persist all filter state in URL params
  const getParam = (key: string, fallback: string) => searchParams.get(key) || fallback;

  const [allRows, setAllRows]   = useState<InterviewRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter state — synced with URL
  const [search,     setSearch]     = useState(getParam('q', ''));
  const [tab,        setTab]        = useState<TabKey>(getParam('tab', 'all') as TabKey);
  const [statusF,    setStatusF]    = useState(getParam('status', 'all'));
  const [roundF,     setRoundF]     = useState(getParam('round', 'all'));
  const [typeF,      setTypeF]      = useState(getParam('type', 'all'));
  const [page,       setPage]       = useState(Number(getParam('page', '1')));
  const [perPage,    setPerPage]    = useState(Number(getParam('perPage', '10')));

  // Sync URL whenever filters change
  const syncParams = useCallback((updates: Record<string, string>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v && v !== 'all' && v !== '' && v !== '1' && v !== '10') next.set(k, v);
        else next.delete(k);
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); syncParams({ q: v, page: '' }); };
  const handleTab    = (v: TabKey) => { setTab(v);   setPage(1); syncParams({ tab: v, page: '' }); };
  const handleStatus = (v: string) => { setStatusF(v); setPage(1); syncParams({ status: v, page: '' }); };
  const handleRound  = (v: string) => { setRoundF(v);  setPage(1); syncParams({ round: v, page: '' }); };
  const handleType   = (v: string) => { setTypeF(v);   setPage(1); syncParams({ type: v, page: '' }); };
  const handlePage   = (v: number) => { setPage(v); syncParams({ page: String(v) }); };
  const handlePerPage = (v: string) => { setPerPage(Number(v)); setPage(1); syncParams({ perPage: v, page: '' }); };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);

    let q = supabase
      .from('hr_candidate_interviews')
      .select(`
        id, candidate_id, interview_date, interview_time, interview_round,
        interview_type, location, status, feedback, created_by, organization_id,
        candidate:hr_job_candidates!candidate_id(
          name, email, job_id,
          job:hr_jobs!job_id(id, title)
        ),
        owner:hr_employees!created_by(first_name, last_name)
      `)
      .eq('organization_id', organizationId)
      .order('interview_date', { ascending: false })
      .order('interview_time', { ascending: true })
      .limit(500);

    // Only organization_superadmin and admin see all data.
    // Every other role (employee, recruiter, etc.) sees only interviews they created.
    const isPrivileged = userRole === 'organization_superadmin' || userRole === 'admin';
    if (!isPrivileged) {
      q = q.eq('created_by', user?.id);
    }

    q.then(({ data, error }) => {
      if (error) console.error(error);
      setAllRows(mapRows(data || []));
      setLoading(false);
    });
  }, [organizationId, user?.id, userRole, refreshKey]);

  // ── Unique round + type lists for filters ──────────────────────────────────
  const uniqueRounds = useMemo(() => [...new Set(allRows.map(r => r.interview_round).filter(Boolean))], [allRows]);
  const uniqueTypes  = useMemo(() => [...new Set(allRows.map(r => r.interview_type).filter(Boolean))], [allRows]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allRows.filter(iv => {
      // Tab
      if (tab !== 'all') {
        try {
          const d = new Date(iv.interview_date + 'T00:00:00');
          if (tab === 'today'    && !isToday(d))    return false;
          if (tab === 'upcoming' && (isPast(d) || isToday(d))) return false;
          if (tab === 'completed' && iv.status === 'scheduled') return false;
        } catch {}
      }
      // Status
      if (statusF !== 'all') {
        if (statusF === 'selected' && iv.feedback?.result !== 'Selected') return false;
        if (statusF === 'rejected' && iv.feedback?.result !== 'Rejected') return false;
        if (statusF === 'scheduled' && iv.status !== 'scheduled')         return false;
      }
      // Round
      if (roundF !== 'all' && iv.interview_round !== roundF) return false;
      // Type
      if (typeF !== 'all' && iv.interview_type !== typeF) return false;
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          iv.candidate_name.toLowerCase().includes(q) ||
          (iv.job_title || '').toLowerCase().includes(q) ||
          (iv.owner_name || '').toLowerCase().includes(q) ||
          iv.interview_round.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allRows, tab, statusF, roundF, typeF, search]);

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const tabCount = useMemo(() => ({
    all: allRows.length,
    today: allRows.filter(iv => { try { return isToday(new Date(iv.interview_date + 'T00:00:00')); } catch { return false; } }).length,
    upcoming: allRows.filter(iv => { try { const d = new Date(iv.interview_date + 'T00:00:00'); return !isPast(d) && !isToday(d); } catch { return false; } }).length,
    completed: allRows.filter(iv => iv.status !== 'scheduled').length,
  }), [allRows]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  // ── Render ─────────────────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'today',     label: 'Today' },
    { key: 'upcoming',  label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="p-6 space-y-4">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Interviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all scheduled interviews across your organisation</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}
          className="gap-1.5 h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Filters bar ── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">

        {/* Search + dropdowns */}
        <div className="flex items-center gap-3 px-4 py-3 flex-wrap border-b border-gray-100">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search candidate, job, owner..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          <Select value={statusF} onValueChange={handleStatus}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="selected">Selected</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={roundF} onValueChange={handleRound}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="Round" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rounds</SelectItem>
              {uniqueRounds.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={typeF} onValueChange={handleType}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          {(search || statusF !== 'all' || roundF !== 'all' || typeF !== 'all') && (
            <Button variant="ghost" size="sm" className="h-9 text-gray-500 hover:text-gray-800"
              onClick={() => { handleSearch(''); handleStatus('all'); handleRound('all'); handleType('all'); }}>
              Clear
            </Button>
          )}
        </div>

        {/* Tab pills */}
        <div className="flex items-center px-4 gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => handleTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}>
              {t.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {tabCount[t.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">

        {/* Purple gradient header — exact Jobs.tsx pattern */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3
          bg-gradient-to-r from-purple-600 to-violet-600 border-b border-purple-700">
          {[
            ['col-span-3', 'Candidate'],
            ['col-span-2', 'Position'],
            ['col-span-1', 'Round'],
            ['col-span-1', 'Date & Time'],
            ['col-span-1', 'Location'],
            ['col-span-1', 'Type'],
            ['col-span-1', 'Status'],
            ['col-span-1', 'Feedback'],
            ['col-span-1', 'Owner'],
          ].map(([cls, label]) => (
            <div key={label} className={`${cls} text-[11px] font-semibold text-white uppercase tracking-wider`}>
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                <div className="col-span-3 flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-20" /></div>
                </div>
                {[2,1,1,1,1,1,1,1].map((span, j) => (
                  <div key={j} className={`col-span-${span}`}><Skeleton className="h-3 w-full" /></div>
                ))}
              </div>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No interviews found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginated.map((iv, idx) => (
              <div key={iv.id}
                className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-start hover:bg-slate-50 transition-colors group
                  ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>

                {/* Candidate */}
                <div className="col-span-3 flex items-center gap-2 min-w-0">
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br ${avatarColor(iv.candidate_name)}
                    flex items-center justify-center text-white text-xs font-bold`}>
                    {getInitials(iv.candidate_name)}
                  </div>
                  <div className="min-w-0">
                    <button
                      onClick={() => iv.job_id && navigate(`/jobs/candidateprofile/${iv.candidate_id}/${iv.job_id}`)}
                      className="text-sm font-semibold text-gray-900 hover:text-purple-700 truncate block max-w-[160px] text-left transition-colors">
                      {iv.candidate_name}
                    </button>
                    {iv.candidate_email && (
                      <span className="text-[11px] text-gray-400 truncate block max-w-[160px]">{iv.candidate_email}</span>
                    )}
                  </div>
                </div>

                {/* Position */}
                <div className="col-span-2 flex items-center">
                  {iv.job_id ? (
                    <button
                      onClick={() => navigate(`/jobs/${iv.job_id}`)}
                      className="text-sm text-gray-700 hover:text-purple-700 font-medium truncate max-w-[140px] text-left transition-colors">
                      {iv.job_title || '—'}
                    </button>
                  ) : (
                    <span className="text-sm text-gray-500 truncate">{iv.job_title || '—'}</span>
                  )}
                </div>

                {/* Round */}
                <div className="col-span-1 flex items-center">
                  <RoundBadge round={iv.interview_round} />
                </div>

                {/* Date & Time */}
                <div className="col-span-1">
                  <div className="flex items-center gap-1 text-xs text-gray-700 font-medium whitespace-nowrap">
                    <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    {fmtDate(iv.interview_date)}
                  </div>
                  {iv.interview_time && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                      <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      {fmtTime(iv.interview_time)}
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="col-span-1 flex items-center gap-1 text-xs text-gray-600">
                  {(iv.location || '').toLowerCase() === 'virtual'
                    ? <Video className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    : <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />}
                  <span className="truncate">{iv.location || 'Virtual'}</span>
                </div>

                {/* Type */}
                <div className="col-span-1 text-xs text-gray-600 truncate">
                  {iv.interview_type || '—'}
                </div>

                {/* Status */}
                <div className="col-span-1">
                  <StatusBadge status={iv.status} feedback={iv.feedback} />
                </div>

                {/* Feedback */}
                <div className="col-span-1">
                  <FeedbackCell feedback={iv.feedback} />
                </div>

                {/* Owner + ICS */}
                <div className="col-span-1 flex items-center justify-between gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`h-6 w-6 rounded-full bg-gradient-to-br ${avatarColor(iv.owner_name || '')}
                          flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 cursor-default`}>
                          {getInitials(iv.owner_name || '')}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent><p>{iv.owner_name || 'Unknown'}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => downloadIcs(iv)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-violet-100 text-violet-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent><p>Add to Calendar</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination — exact Jobs.tsx style ── */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <Select value={String(perPage)} onValueChange={handlePerPage}>
              <SelectTrigger className="w-[70px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">per page</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              onClick={() => handlePage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
              .reduce<(number | '…')[]>((acc, p, i, arr) => {
                if (i > 0 && (arr[i - 1] as number) + 1 < p) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                ) : (
                  <Button key={p} size="sm"
                    variant={safePage === p ? 'default' : 'outline'}
                    className={`h-8 w-8 p-0 text-sm ${safePage === p ? 'bg-purple-600 hover:bg-purple-700 border-purple-600 text-white' : ''}`}
                    onClick={() => handlePage(p as number)}>
                    {p}
                  </Button>
                )
              )}

            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              onClick={() => handlePage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <span className="text-sm text-gray-500">
            Showing {(safePage - 1) * perPage + 1}–{Math.min(safePage * perPage, filtered.length)} of {filtered.length}
          </span>
        </div>
      )}

    </div>
  );
};