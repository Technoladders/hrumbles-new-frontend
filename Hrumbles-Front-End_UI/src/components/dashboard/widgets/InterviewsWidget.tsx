// src/components/dashboard/widgets/InterviewsWidget.tsx
// Add to any dashboard page: <InterviewsWidget />
// Add route: <Route path="/interviews" element={<InterviewsPage />} />

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, isThisWeek, isPast, parseISO, isValid } from 'date-fns';
import {
  Calendar, Clock, Video, MapPin, User, ChevronRight,
  CalendarDays, Loader2, AlertCircle, CheckCircle2, XCircle,
  RefreshCw, ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InterviewEntry {
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
  status: 'scheduled' | 'completed' | 'rejected' | 'rescheduled';
  feedback?: any;
  created_by: string;
  organization_id: string;
}

type TabKey = 'today' | 'tomorrow' | 'week' | 'all';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatInterviewTime = (timeStr?: string): string => {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0);
    return format(d, 'h:mm a');
  } catch { return timeStr; }
};

const formatInterviewDate = (dateStr: string): string => {
  try {
    const d = parseISO(dateStr);
    if (isToday(d))    return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'dd MMM yyyy');
  } catch { return dateStr; }
};

const getStatusConfig = (status: string, feedback?: any) => {
  if (status === 'completed') {
    const result = feedback?.result;
    if (result === 'Selected') return { label: 'Selected', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> };
    if (result === 'Rejected') return { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-3 w-3" /> };
    return { label: 'Completed', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <CheckCircle2 className="h-3 w-3" /> };
  }
  if (status === 'rejected') return { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-3 w-3" /> };
  if (status === 'rescheduled') return { label: 'Rescheduled', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <RefreshCw className="h-3 w-3" /> };
  return { label: 'Scheduled', color: 'bg-violet-50 text-violet-700 border-violet-200', icon: <Calendar className="h-3 w-3" /> };
};

const getRoundBadgeColor = (round: string): string => {
  const map: Record<string, string> = {
    'Technical Assessment': 'bg-sky-50 text-sky-700',
    'L1': 'bg-indigo-50 text-indigo-700',
    'L2': 'bg-purple-50 text-purple-700',
    'L3': 'bg-fuchsia-50 text-fuchsia-700',
    'End Client Round': 'bg-orange-50 text-orange-700',
  };
  return map[round] || 'bg-gray-100 text-gray-600';
};

const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  return `${parts[0]?.[0] || ''}${parts[parts.length - 1]?.[0] || ''}`.toUpperCase() || 'NA';
};

// ── Generate .ics calendar file ───────────────────────────────────────────────
const downloadIcs = (interview: InterviewEntry) => {
  try {
    const date = interview.interview_date.replace(/-/g, '');
    const timeStr = interview.interview_time?.replace(':', '') || '090000';
    const dtStart = `${date}T${timeStr}00`;
    // Default 1hr duration
    const endHour = String(parseInt(timeStr.slice(0, 2)) + 1).padStart(2, '0');
    const dtEnd   = `${date}T${endHour}${timeStr.slice(2)}00`;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hrumbles ATS//Interview//EN',
      'BEGIN:VEVENT',
      `UID:${interview.id}@hrumbles.ai`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${interview.interview_round} – ${interview.candidate_name}`,
      `DESCRIPTION:Job: ${interview.job_title || 'N/A'}\\nCandidate: ${interview.candidate_name}\\nRound: ${interview.interview_round}`,
      `LOCATION:${interview.location || 'Virtual'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `interview_${interview.candidate_name.replace(/\s/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('ICS download failed', e);
  }
};

// ── Main Component ────────────────────────────────────────────────────────────

interface InterviewsWidgetProps {
  /** Show all org interviews (admin) or only created_by current user (recruiter) */
  scope?: 'all' | 'mine';
  /** Max rows to display in widget mode */
  maxRows?: number;
  /** If true, shows the full-page version with filters */
  fullPage?: boolean;
}

const InterviewsWidget: React.FC<InterviewsWidgetProps> = ({
  scope = 'all',
  maxRows = 8,
  fullPage = false,
}) => {
  const navigate = useNavigate();
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const user           = useSelector((state: any) => state.auth.user);
  const userRole       = useSelector((state: any) => state.auth.role);

  const [interviews, setInterviews] = useState<InterviewEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<TabKey>('today');
  const [refreshKey, setRefreshKey] = useState(0);

  // Full-page filter state
  const [filterStatus, setFilterStatus]   = useState<string>('all');
  const [filterRound, setFilterRound]     = useState<string>('all');
  const [searchTerm, setSearchTerm]       = useState('');

  const effectiveScope = userRole === 'employee' ? 'mine' : scope;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!organizationId) return;

    const fetchInterviews = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('hr_candidate_interviews')
          .select(`
            id, candidate_id, interview_date, interview_time, interview_round,
            interview_type, location, status, feedback, created_by, organization_id,
            job_id,
            candidate:hr_job_candidates!candidate_id (
              name, email,
              job:hr_jobs!job_id ( id, title )
            )
          `)
          .eq('organization_id', organizationId)
          .order('interview_date', { ascending: true })
          .order('interview_time', { ascending: true });

        if (effectiveScope === 'mine') {
          query = query.eq('created_by', user?.id);
        }

        // For widget mode — only fetch future + today
        if (!fullPage) {
          const today = new Date().toISOString().split('T')[0];
          query = query.gte('interview_date', today);
        }

        const { data, error } = await query.limit(fullPage ? 200 : 50);
        if (error) throw error;

        const mapped: InterviewEntry[] = (data || []).map((row: any) => ({
          id:               row.id,
          candidate_id:     row.candidate_id,
          candidate_name:   row.candidate?.name || 'Unknown',
          candidate_email:  row.candidate?.email,
          job_id:           row.candidate?.job?.id || row.job_id,
          job_title:        row.candidate?.job?.title || '',
          interview_date:   row.interview_date,
          interview_time:   row.interview_time,
          interview_round:  row.interview_round,
          interview_type:   row.interview_type,
          location:         row.location,
          status:           row.status,
          feedback:         row.feedback,
          created_by:       row.created_by,
          organization_id:  row.organization_id,
        }));

        setInterviews(mapped);
      } catch (e) {
        console.error('Failed to load interviews:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, [organizationId, user?.id, effectiveScope, refreshKey, fullPage]);

  // ── Filter by tab ──────────────────────────────────────────────────────────
  const filteredByTab = useMemo(() => {
    return interviews.filter((iv) => {
      try {
        const d = parseISO(iv.interview_date);
        if (!isValid(d)) return false;
        switch (activeTab) {
          case 'today':    return isToday(d);
          case 'tomorrow': return isTomorrow(d);
          case 'week':     return isThisWeek(d, { weekStartsOn: 1 }) && !isPast(d) && !isToday(d);
          case 'all':
          default:         return true;
        }
      } catch { return false; }
    });
  }, [interviews, activeTab]);

  // Full-page additional filters
  const displayRows = useMemo(() => {
    if (!fullPage) return filteredByTab.slice(0, maxRows);

    return filteredByTab.filter((iv) => {
      const matchStatus = filterStatus === 'all' || iv.status === filterStatus;
      const matchRound  = filterRound  === 'all' || iv.interview_round === filterRound;
      const matchSearch = !searchTerm  || iv.candidate_name.toLowerCase().includes(searchTerm.toLowerCase())
                          || iv.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchRound && matchSearch;
    });
  }, [filteredByTab, fullPage, filterStatus, filterRound, searchTerm, maxRows]);

  const tabCounts = useMemo(() => {
    const count = (pred: (d: Date) => boolean) =>
      interviews.filter((iv) => { try { return pred(parseISO(iv.interview_date)); } catch { return false; } }).length;
    return {
      today:    count(isToday),
      tomorrow: count(isTomorrow),
      week:     count((d) => isThisWeek(d, { weekStartsOn: 1 }) && !isPast(d) && !isToday(d)),
      all:      interviews.length,
    };
  }, [interviews]);

  // ── Unique rounds for full-page filter ────────────────────────────────────
  const uniqueRounds = useMemo(() =>
    [...new Set(interviews.map((iv) => iv.interview_round))],
  [interviews]);

  // ── Render row ─────────────────────────────────────────────────────────────
  const renderRow = (iv: InterviewEntry) => {
    const statusCfg = getStatusConfig(iv.status, iv.feedback);
    const dateLabel = formatInterviewDate(iv.interview_date);
    const timeLabel = formatInterviewTime(iv.interview_time);
    const isDateToday = isToday(parseISO(iv.interview_date));

    return (
      <div
        key={iv.id}
        className={`group flex items-center gap-3 px-4 py-3 hover:bg-violet-50/50 transition-colors border-b border-gray-100 last:border-0 cursor-pointer ${isDateToday ? 'bg-amber-50/30' : ''}`}
        onClick={() => iv.job_id && navigate(`/jobs/candidateprofile/${iv.candidate_id}/${iv.job_id}`)}
      >
        {/* Avatar */}
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-xs font-bold">
          {getInitials(iv.candidate_name)}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">{iv.candidate_name}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getRoundBadgeColor(iv.interview_round)}`}>
              {iv.interview_round}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {iv.job_title && (
              <span className="text-xs text-gray-500 truncate max-w-[140px]">{iv.job_title}</span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              {dateLabel}
            </span>
            {timeLabel && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {timeLabel}
              </span>
            )}
            {iv.location && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                {iv.location.toLowerCase() === 'virtual'
                  ? <Video className="h-3 w-3" />
                  : <MapPin className="h-3 w-3" />}
                {iv.location}
              </span>
            )}
          </div>
        </div>

        {/* Status badge */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          <span className={`hidden sm:flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>

          {/* Add to calendar */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadIcs(iv); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-violet-100 text-violet-600"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Add to Calendar (.ics)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-violet-500 transition-colors" />
        </div>
      </div>
    );
  };

  // ── Tab bar ────────────────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'today',    label: 'Today' },
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'week',     label: 'This Week' },
    { key: 'all',      label: 'All' },
  ];

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${fullPage ? 'min-h-[600px]' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50/60 to-purple-50/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-100 rounded-lg">
            <Video className="h-4 w-4 text-violet-700" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Interviews & Meetings</h2>
            <p className="text-[11px] text-gray-500 mt-0">
              {effectiveScope === 'mine' ? 'Your scheduled interviews' : 'Organisation-wide interviews'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-1.5 rounded-md hover:bg-violet-100 text-violet-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {!fullPage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/interviews')}
              className="text-xs text-violet-600 hover:text-violet-800 hover:bg-violet-100 h-7 px-2"
            >
              View All <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Full-page search + filters */}
      {fullPage && (
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 flex-wrap bg-gray-50/50">
          <input
            type="text"
            placeholder="Search by candidate or job..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[180px] text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filterRound}
            onChange={(e) => setFilterRound(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="all">All Rounds</option>
            {uniqueRounds.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-gray-100 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? 'text-violet-700 border-b-2 border-violet-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : displayRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center mb-3">
              <Calendar className="h-5 w-5 text-violet-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No interviews {activeTab === 'all' ? '' : `${activeTab}`}</p>
            <p className="text-xs text-gray-400 mt-1">
              {activeTab === 'today' ? 'No interviews scheduled for today' : 'Nothing to show for this period'}
            </p>
          </div>
        ) : (
          <div>{displayRows.map(renderRow)}</div>
        )}
      </div>

      {/* Footer — count */}
      {!loading && displayRows.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            Showing {displayRows.length} interview{displayRows.length !== 1 ? 's' : ''}
            {!fullPage && filteredByTab.length > maxRows && ` of ${filteredByTab.length}`}
          </p>
          {!fullPage && filteredByTab.length > maxRows && (
            <button
              onClick={() => navigate('/interviews')}
              className="text-[11px] text-violet-600 font-semibold hover:underline"
            >
              +{filteredByTab.length - maxRows} more →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default InterviewsWidget;


// ══════════════════════════════════════════════════════════════
// FULL PAGE VERSION — InterviewsPage.tsx
// Route: <Route path="/interviews" element={<InterviewsPage />} />
// ══════════════════════════════════════════════════════════════

export const InterviewsPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-xl">
            <Video className="h-5 w-5 text-violet-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Interviews & Meetings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track all scheduled interviews across your organisation</p>
          </div>
        </div>
      </div>

      {/* Widget in full-page mode */}
      <div className="flex-1 p-6">
        <InterviewsWidget fullPage scope="all" />
      </div>
    </div>
  );
};