// src/components/clients-new/AllCandidatesTab.tsx
// Light mode — fully dynamic statuses from job_statuses table
// Rich compact visualizations + proper pagination in child tables

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import supabase from '@/config/supabaseClient';
import { format, isValid } from 'date-fns';
import {
  AlertCircle, Layers, List, Search, Download, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Sigma, Star, Tag, User, Loader2, GitMerge,
  UserCheck, Crown, MessageSquare, TrendingUp, Users, Target, Award,
  ArrowUpRight, BarChart3, Activity, Briefcase,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Cell, PieChart, Pie, FunnelChart, Funnel,
  LabelList, AreaChart, Area,
} from 'recharts';
import { Progress } from '@/components/ui/progress';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StatusDef {
  id: string; name: string; type: 'main' | 'sub';
  parent_id: string | null; display_order: number; color: string | null;
}
interface Candidate {
  id: string; name: string; created_at: string; main_status_id: string | null;
  sub_status_id: string | null; job_title: string | null; recruiter_name: string | null;
  client_name: string | null; current_salary: number | null; expected_salary: number | null;
  location: string | null; notice_period: string | null; overall_score: number | null;
  job_id: string; metadata: any; interview_date?: string | null;
  interview_time?: string | null; interview_feedback?: string | null;
}
interface DateRange { startDate: Date | null; endDate: Date | null; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number | null | undefined) =>
  v == null ? 'N/A' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
const fmtV = (v: any) => (v != null && v !== '') ? String(v) : 'N/A';
const fmtDate = (d: string) => isValid(new Date(d)) ? format(new Date(d), 'MMM d, yyyy') : 'N/A';
const fmtTime = (t?: string | null) => {
  if (!t) return '';
  try { const [h, m] = t.split(':'); const d = new Date(); d.setHours(+h, +m, 0); return format(d, 'h:mm a'); } catch { return t; }
};
const scoreColor = (s: number | null | undefined) => {
  if (s == null) return 'bg-gray-100 text-gray-600';
  if (s > 80) return 'bg-green-100 text-green-700';
  if (s > 50) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-600';
};

// ─── CHART COLORS ─────────────────────────────────────────────────────────────
const PALETTE = ['#7B43F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#3B82F6', '#14B8A6', '#F97316'];

// ─── Reusable UI Pieces ───────────────────────────────────────────────────────
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);
const CardHead = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="px-4 py-3 border-b border-gray-100">
    <div className="flex items-center gap-2">
      <div className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-violet-700" />
      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{title}</span>
    </div>
    {sub && <p className="text-[11px] text-gray-400 mt-0.5 ml-3">{sub}</p>}
  </div>
);

// Mini KPI chip
const KpiChip = ({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: React.ReactNode }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-md" style={{ background: `${color}18` }}>
        <div style={{ color, width: 13, height: 13 }}>{icon}</div>
      </div>
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
    <span className="text-sm font-bold text-gray-800">{value}</span>
  </div>
);

// Table chip
const StatusChip = ({ name, color }: { name: string; color?: string }) => (
  <span
    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold"
    style={{
      background: color ? `${color}18` : '#7B43F118',
      color: color || '#7B43F1',
      border: `1px solid ${color ? `${color}30` : '#7B43F130'}`,
    }}
  >
    {name}
  </span>
);

const LightTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>{p.name || p.dataKey}: {p.value}</p>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
interface AllCandidatesTabProps {
  clientName: string;
  dateRange: DateRange | null;
}

const ITEMS_PER_PAGE = 20;

const AllCandidatesTab: React.FC<AllCandidatesTabProps> = ({ clientName, dateRange }) => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // Status definitions fetched once from DB
  const [statusDefs, setStatusDefs] = useState<StatusDef[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & view
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recruiterFilter, setRecruiterFilter] = useState('all');
  const [isGrouped, setIsGrouped] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // ── Dynamic status helpers derived from statusDefs ────────────────────────
  const statusMap = useMemo(() => {
    const m: Record<string, StatusDef> = {};
    statusDefs.forEach(s => { m[s.id] = s; });
    return m;
  }, [statusDefs]);

  const mainStatusByName = useMemo(() => {
    const m: Record<string, StatusDef> = {};
    statusDefs.filter(s => s.type === 'main').forEach(s => { m[s.name.toLowerCase()] = s; });
    return m;
  }, [statusDefs]);

  // IDs resolved dynamically from job_statuses table by matching status NAMES
  const dynamicIds = useMemo(() => {
    const find = (name: string, type: 'main' | 'sub') =>
      statusDefs.find(s => s.name.toLowerCase() === name.toLowerCase() && s.type === type)?.id;
    const findMany = (names: string[], type: 'main' | 'sub') =>
      names.map(n => find(n, type)).filter(Boolean) as string[];

    return {
      interviewMainId:    find('Interview', 'main') || '',
      scheduledSubIds:    findMany(['Technical Assessment', 'L1', 'L2', 'L3', 'End Client Round'], 'sub'),
      rescheduledSubIds:  findMany(['Reschedule Technical Assessment', 'Reschedule L1', 'Reschedule L2', 'Reschedule L3', 'Reschedule End Client Round'], 'sub'),
      outcomeSubIds:      findMany(['Technical Assessment Selected', 'Technical Assessment Rejected', 'L1 Selected', 'L1 Rejected', 'L2 Selected', 'L2 Rejected', 'L3 Selected', 'L3 Rejected', 'End Client Selected', 'End Client Rejected'], 'sub'),
      joinedMainId:       find('Joined', 'main') || '',
      offeredMainId:      find('Offered', 'main') || '',
      joinedSubId:        find('Joined', 'sub') || '',
    };
  }, [statusDefs]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId || !clientName) return;
      setIsLoading(true); setError(null);
      try {
        // 1. Fetch status definitions dynamically for this org
        const { data: statuses, error: sErr } = await supabase
          .from('job_statuses')
          .select('id, name, type, parent_id, display_order, color')
          .eq('organization_id', organizationId)
          .order('display_order', { ascending: true });
        if (sErr) throw sErr;
        setStatusDefs((statuses as StatusDef[]) || []);

        // 2. Fetch jobs for this client
        const { data: jobs, error: jErr } = await supabase
          .from('hr_jobs').select('id')
          .eq('organization_id', organizationId)
          .eq('client_details->>clientName', clientName);
        if (jErr) throw jErr;
        if (!jobs?.length) { setCandidates([]); return; }

        // 3. Fetch candidates
        let q = supabase.from('hr_job_candidates').select(`
          id, name, created_at, main_status_id, sub_status_id, metadata, job_id,
          interview_date, interview_time, interview_feedback,
          job:hr_jobs!hr_job_candidates_job_id_fkey(title),
          recruiter:created_by(first_name, last_name),
          analysis:candidate_resume_analysis!candidate_id(overall_score)
        `)
          .eq('organization_id', organizationId)
          .in('job_id', jobs.map(j => j.id));

        if (dateRange?.startDate && dateRange?.endDate) {
          q = q
            .gte('created_at', format(dateRange.startDate, 'yyyy-MM-dd'))
            .lte('created_at', format(dateRange.endDate, 'yyyy-MM-dd'));
        }
        const { data: raw, error: cErr } = await q.order('created_at', { ascending: false });
        if (cErr) throw cErr;

        setCandidates((raw as any[]).map(c => ({
          id: c.id, job_id: c.job_id, name: c.name, created_at: c.created_at,
          main_status_id: c.main_status_id, sub_status_id: c.sub_status_id, metadata: c.metadata,
          job_title: c.job?.title || 'N/A',
          recruiter_name: c.recruiter ? `${c.recruiter.first_name} ${c.recruiter.last_name}`.trim() : 'N/A',
          client_name: clientName,
          current_salary: c.metadata?.currentSalary ?? null,
          expected_salary: c.metadata?.expectedSalary ?? null,
          location: c.metadata?.currentLocation ?? null,
          notice_period: c.metadata?.noticePeriod ?? null,
          overall_score: c.analysis?.[0]?.overall_score ?? null,
          interview_date: c.interview_date,
          interview_time: c.interview_time,
          interview_feedback: c.interview_feedback,
        })));
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [organizationId, clientName, dateRange]);

  // ── Recruiter options ──────────────────────────────────────────────────────
  const recruiterOptions = useMemo(() =>
    [...new Set(candidates.map(c => c.recruiter_name).filter(r => r && r !== 'N/A'))].sort() as string[],
    [candidates]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => candidates.filter(c => {
    const subStatusName = statusMap[c.sub_status_id || '']?.name || '';
    return (statusFilter === 'all' || subStatusName === statusFilter)
      && (recruiterFilter === 'all' || c.recruiter_name === recruiterFilter)
      && (!searchTerm || [c.name, c.job_title, c.recruiter_name].some(v => v?.toLowerCase().includes(searchTerm.toLowerCase())));
  }), [candidates, searchTerm, statusMap, statusFilter, recruiterFilter]);

  // ── Analytics ─────────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const conversionIds = [dynamicIds.interviewMainId, dynamicIds.offeredMainId, dynamicIds.joinedMainId].filter(Boolean);
    let joined = 0, converted = 0, scoreSum = 0, scoreCount = 0;
    const recruiterProfiles: Record<string, number> = {};
    const recruiterJoins: Record<string, number> = {};
    const recruiterConversions: Record<string, number> = {};

    filtered.forEach(c => {
      if (c.main_status_id && conversionIds.includes(c.main_status_id)) {
        converted++;
        if (c.recruiter_name && c.recruiter_name !== 'N/A')
          recruiterConversions[c.recruiter_name] = (recruiterConversions[c.recruiter_name] || 0) + 1;
      }
      if (c.main_status_id === dynamicIds.joinedMainId && c.sub_status_id === dynamicIds.joinedSubId) {
        joined++;
        if (c.recruiter_name && c.recruiter_name !== 'N/A')
          recruiterJoins[c.recruiter_name] = (recruiterJoins[c.recruiter_name] || 0) + 1;
      }
      if (c.recruiter_name && c.recruiter_name !== 'N/A')
        recruiterProfiles[c.recruiter_name] = (recruiterProfiles[c.recruiter_name] || 0) + 1;
      if (c.overall_score != null) { scoreSum += c.overall_score; scoreCount++; }
    });

    const top = (obj: Record<string, number>) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    // Pipeline: group by main status, ordered by display_order
    const mainCounts: Record<string, number> = {};
    filtered.forEach(c => {
      const name = statusMap[c.main_status_id || '']?.name || 'Unknown';
      mainCounts[name] = (mainCounts[name] || 0) + 1;
    });
    const pipelineStages = statusDefs
      .filter(s => s.type === 'main' && mainCounts[s.name])
      .map(s => ({ stage: s.name, count: mainCounts[s.name], color: s.color || '#7B43F1' }));

    // Sub-status breakdown
    const subCounts: Record<string, { count: number; color: string | null }> = {};
    filtered.forEach(c => {
      const def = statusMap[c.sub_status_id || ''];
      if (def) subCounts[def.name] = { count: (subCounts[def.name]?.count || 0) + 1, color: def.color };
    });

    // Recruiter table
    const recruiterTable = Object.entries(recruiterProfiles)
      .map(([name, profiles]) => ({
        name, profiles,
        conversions: recruiterConversions[name] || 0,
        joins: recruiterJoins[name] || 0,
      }))
      .sort((a, b) => b.profiles - a.profiles);

    return {
      total: filtered.length, converted, joined,
      conversionRate: filtered.length > 0 ? `${((converted / filtered.length) * 100).toFixed(1)}%` : '—',
      joinedRate: filtered.length > 0 ? `${((joined / filtered.length) * 100).toFixed(1)}%` : '—',
      avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
      topProfiles: top(recruiterProfiles),
      topConverted: top(recruiterConversions),
      topJoined: top(recruiterJoins),
      pipelineStages,
      subCounts: Object.entries(subCounts).map(([name, { count, color }]) => ({ name, count, color })).sort((a, b) => b.count - a.count),
      recruiterTable,
    };
  }, [filtered, statusMap, statusDefs, dynamicIds]);

  // ── Grouped view ──────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    // Group by main status, preserve display_order
    const g: Record<string, Candidate[]> = {};
    filtered.forEach(c => {
      const key = statusMap[c.main_status_id || '']?.name || 'Unknown';
      if (!g[key]) g[key] = [];
      g[key].push(c);
    });
    // Sort groups by display_order
    return statusDefs
      .filter(s => s.type === 'main' && g[s.name])
      .map(s => ({ statusName: s.name, candidates: g[s.name], color: s.color }));
  }, [filtered, statusMap, statusDefs]);

  const flatRows = useMemo(() => {
    if (!isGrouped) return filtered;
    return grouped.flatMap(g => (expandedGroups.has(g.statusName) ? g.candidates : []));
  }, [isGrouped, filtered, grouped, expandedGroups]);

  const totalPages = Math.ceil((isGrouped ? 0 : filtered.length) / ITEMS_PER_PAGE);
  const paginated = isGrouped ? [] : filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleGroup = (name: string) => {
    const next = new Set(expandedGroups);
    if (next.has(name)) next.delete(name); else next.add(name);
    setExpandedGroups(next);
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!filtered.length) return;
    const csv = Papa.unparse(filtered.map(c => ({
      'Name': c.name, 'Status': statusMap[c.sub_status_id || '']?.name || '',
      'AI Score': fmtV(c.overall_score), 'Job': fmtV(c.job_title),
      'Recruiter': fmtV(c.recruiter_name), 'Applied': fmtDate(c.created_at),
      'CCTC': c.current_salary, 'ECTC': c.expected_salary,
      'Notice': fmtV(c.notice_period), 'Location': fmtV(c.location),
    })), { header: true });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
    a.download = `${clientName}_candidates_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };
  const exportPDF = () => {
    if (!filtered.length) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text(`Candidates — ${clientName}`, 14, 15);
    (doc as any).autoTable({
      head: [['Name', 'Status', 'Score', 'Job', 'Recruiter', 'Applied', 'CCTC', 'ECTC', 'Notice', 'Location']],
      body: filtered.map(c => [c.name, statusMap[c.sub_status_id || '']?.name || '', fmtV(c.overall_score), fmtV(c.job_title), fmtV(c.recruiter_name), fmtDate(c.created_at), fmt(c.current_salary), fmt(c.expected_salary), fmtV(c.notice_period), fmtV(c.location)]),
      startY: 20, theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [123, 67, 241] },
    });
    doc.save(`${clientName}_candidates_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // ── Status cell with interview details ────────────────────────────────────
  const StatusCell = ({ c }: { c: Candidate }) => {
    const subDef = statusMap[c.sub_status_id || ''];
    const isScheduled = c.main_status_id === dynamicIds.interviewMainId && c.sub_status_id && dynamicIds.scheduledSubIds.includes(c.sub_status_id);
    const isRescheduled = c.main_status_id === dynamicIds.interviewMainId && c.sub_status_id && dynamicIds.rescheduledSubIds.includes(c.sub_status_id);
    const isOutcome = c.main_status_id === dynamicIds.interviewMainId && c.sub_status_id && dynamicIds.outcomeSubIds.includes(c.sub_status_id);
    const name = subDef?.name || '—';
    const displayName = isScheduled ? `${name} (Scheduled)` : name;
    return (
      <div>
        <StatusChip name={displayName} color={subDef?.color || undefined} />
        {(isScheduled || isRescheduled) && c.interview_date && (
          <p className="text-[10px] text-gray-400 mt-1">{fmtDate(c.interview_date)}{c.interview_time ? ` · ${fmtTime(c.interview_time)}` : ''}</p>
        )}
        {isOutcome && c.interview_feedback && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 cursor-help">
                  <MessageSquare size={9} />{c.interview_feedback.substring(0, 20)}…
                </p>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs"><p>{c.interview_feedback}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  if (isLoading) return (
    <div className="flex h-40 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
    </div>
  );
  if (error) return (
    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
      <AlertCircle size={16} />{error}
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Row 1: KPI chips ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Candidates</p>
          <p className="text-2xl font-bold text-gray-800">{analytics.total}</p>
          <div className="mt-2 flex gap-3">
            <div><p className="text-[10px] text-gray-400">Converted</p><p className="text-sm font-bold text-violet-600">{analytics.converted}</p></div>
            <div><p className="text-[10px] text-gray-400">Joined</p><p className="text-sm font-bold text-emerald-600">{analytics.joined}</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Conversion Rate</p>
          <p className="text-2xl font-bold text-gray-800">{analytics.conversionRate}</p>
          <p className="text-[11px] text-gray-400 mt-1">Joined rate: <span className="font-semibold text-emerald-600">{analytics.joinedRate}</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Avg AI Score</p>
          <p className="text-2xl font-bold text-gray-800">{analytics.avgScore ?? '—'}</p>
          {analytics.avgScore && (
            <div className="mt-2 h-1.5 rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${analytics.avgScore}%` }} />
            </div>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Top Performers</p>
          <div className="space-y-1 mt-1">
            {[
              { label: 'Profiles', value: analytics.topProfiles },
              { label: 'Converted', value: analytics.topConverted },
              { label: 'Joined', value: analytics.topJoined },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">{item.label}</span>
                <span className="text-[11px] font-semibold text-gray-700 max-w-[100px] truncate">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 2: Pipeline funnel + Sub-status breakdown + Recruiter table ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pipeline bar chart — ordered by display_order */}
        <Card className="lg:col-span-1">
          <CardHead title="Candidate Pipeline" sub="By main status" />
          <div className="p-4 h-[200px]">
            {analytics.pipelineStages.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.pipelineStages} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 10, fill: '#4B5563' }} axisLine={false} tickLine={false} width={80} />
                  <RechartsTooltip content={<LightTooltip />} />
                  <Bar dataKey="count" name="Candidates" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {analytics.pipelineStages.map((entry, i) => (
                      <Cell key={i} fill={entry.color || PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center"><p className="text-xs text-gray-300">No pipeline data</p></div>}
          </div>
        </Card>

        {/* Sub-status donut */}
        <Card>
          <CardHead title="Status Breakdown" sub="By sub-status" />
          <div className="p-4 h-[200px] flex items-center">
            {analytics.subCounts.length > 0 ? (
              <div className="flex items-center gap-3 w-full">
                <div className="w-[90px] h-[90px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analytics.subCounts} cx="50%" cy="50%" innerRadius={24} outerRadius={42} paddingAngle={2} dataKey="count" stroke="none">
                        {analytics.subCounts.map((entry, i) => (
                          <Cell key={i} fill={entry.color || PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                  {analytics.subCounts.slice(0, 8).map((entry, i) => (
                    <div key={entry.name}>
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color || PALETTE[i % PALETTE.length] }} />
                          <span className="text-[10px] text-gray-500 truncate max-w-[100px]">{entry.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-700">{entry.count}</span>
                      </div>
                      <div className="h-1 rounded-full bg-gray-100">
                        <div className="h-full rounded-full" style={{ width: `${(entry.count / analytics.total) * 100}%`, backgroundColor: entry.color || PALETTE[i % PALETTE.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="w-full flex items-center justify-center"><p className="text-xs text-gray-300">No data</p></div>}
          </div>
        </Card>

        {/* Recruiter performance */}
        <Card>
          <CardHead title="Recruiter Performance" />
          <div className="p-4 space-y-2 max-h-[200px] overflow-y-auto">
            {analytics.recruiterTable.length > 0 ? analytics.recruiterTable.map((r, i) => (
              <div key={r.name} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">{r.name}</p>
                  <div className="h-1 rounded-full bg-gray-100 mt-0.5">
                    <div className="h-full rounded-full bg-violet-400" style={{ width: `${(r.profiles / analytics.recruiterTable[0].profiles) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-gray-800">{r.profiles}</p>
                  <p className="text-[9px] text-gray-400">{r.joins} joined</p>
                </div>
              </div>
            )) : <p className="text-xs text-gray-300 text-center py-6">No recruiter data</p>}
          </div>
        </Card>
      </div>

      {/* ── Candidate Table ───────────────────────────────────────────────── */}
      <Card>
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search name, job, recruiter…"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-200 min-w-[130px]"
          >
            <option value="all">All Statuses</option>
            {/* Ordered by parent's display_order then child display_order */}
            {statusDefs.filter(s => s.type === 'main').map(main => {
              const children = statusDefs.filter(s => s.type === 'sub' && s.parent_id === main.id);
              return children.map(child => (
                <option key={child.id} value={child.name}>{main.name} → {child.name}</option>
              ));
            })}
          </select>

          {/* Recruiter filter */}
          <select
            value={recruiterFilter}
            onChange={e => { setRecruiterFilter(e.target.value); setCurrentPage(1); }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-200 min-w-[130px]"
          >
            <option value="all">All Recruiters</option>
            {recruiterOptions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {/* Group toggle */}
          <button
            onClick={() => setIsGrouped(!isGrouped)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${isGrouped ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-violet-300'}`}
          >
            {isGrouped ? <List size={12} /> : <Layers size={12} />}
            {isGrouped ? 'Ungroup' : 'Group by Status'}
          </button>

          {/* Export */}
          <div className="flex gap-1.5">
            <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:border-violet-300 transition-all">
              <Download size={11} />CSV
            </button>
            <button onClick={exportPDF} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:border-violet-300 transition-all">
              <Download size={11} />PDF
            </button>
          </div>

          <span className="text-[11px] text-gray-400 ml-auto">{filtered.length} candidates</span>
        </div>

        {/* Table — grouped view */}
        {isGrouped ? (
          <div className="divide-y divide-gray-100">
            {grouped.map(group => (
              <div key={group.statusName}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.statusName)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-violet-50/50 transition-colors text-left"
                >
                  {expandedGroups.has(group.statusName) ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ background: group.color ? `${group.color}18` : '#7B43F118', color: group.color || '#7B43F1' }}
                  >
                    {group.statusName}
                  </span>
                  <span className="text-[11px] text-gray-500">{group.candidates.length} candidates</span>
                </button>

                {/* Expanded child table — has its own header */}
                {expandedGroups.has(group.statusName) && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      {/* Child table own header */}
                      <thead>
                        <tr className="bg-violet-50/40">
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-violet-500">Candidate</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-violet-500">Sub-status</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-violet-500">Score</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-violet-500">Job</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-violet-500">Recruiter</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-violet-500">Applied</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-violet-500">CCTC</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-violet-500">ECTC</th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-violet-500">Notice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {group.candidates.map(c => (
                          <tr key={c.id} className="hover:bg-violet-50/20 transition-colors">
                            <td className="px-4 py-2.5"><Link to={`/jobs/candidateprofile/${c.id}/${c.job_id}`} className="text-xs font-semibold text-violet-600 hover:text-violet-800">{c.name}</Link></td>
                            <td className="px-4 py-2.5"><StatusCell c={c} /></td>
                            <td className="px-4 py-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${scoreColor(c.overall_score)}`}>{fmtV(c.overall_score)}</span></td>
                            <td className="px-4 py-2.5 text-xs text-gray-500"><Link to={`/jobs/${c.job_id}`} className="hover:text-violet-600 transition-colors">{fmtV(c.job_title)}</Link></td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{fmtV(c.recruiter_name)}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(c.created_at)}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmt(c.current_salary)}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmt(c.expected_salary)}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{fmtV(c.notice_period)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Pagination inside child group if large */}
                    {group.candidates.length > 10 && (
                      <div className="px-4 py-2 text-[11px] text-gray-400 bg-violet-50/20">
                        Showing all {group.candidates.length} candidates in this group
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Flat view with outer pagination */
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Candidate', 'Status', 'Score', 'Job', 'Recruiter', 'Applied', 'CCTC', 'ECTC', 'Notice', 'Location'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.length > 0 ? paginated.map(c => (
                    <tr key={c.id} className="hover:bg-violet-50/30 transition-colors">
                      <td className="px-4 py-3"><Link to={`/jobs/candidateprofile/${c.id}/${c.job_id}`} className="text-xs font-semibold text-violet-600 hover:text-violet-800">{c.name}</Link></td>
                      <td className="px-4 py-3"><StatusCell c={c} /></td>
                      <td className="px-4 py-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${scoreColor(c.overall_score)}`}>{fmtV(c.overall_score)}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500"><Link to={`/jobs/${c.job_id}`} className="hover:text-violet-600">{fmtV(c.job_title)}</Link></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtV(c.recruiter_name)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(c.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(c.current_salary)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(c.expected_salary)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtV(c.notice_period)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmtV(c.location)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={10} className="px-4 py-12 text-center">
                      <Users size={28} className="text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No candidates found</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Outer pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-[11px] text-gray-400">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all"><ChevronLeft size={13} /></button>
                  <span className="text-xs text-gray-500 font-medium">{currentPage} / {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all"><ChevronRight size={13} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default AllCandidatesTab;