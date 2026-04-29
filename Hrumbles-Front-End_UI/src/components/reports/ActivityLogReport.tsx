// Hrumbles-Front-End_UI/src/components/sales/activity-report/ActivityLogReport.tsx
// Route: /sales/activity-report

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth,
  parseISO, differenceInDays, isToday, eachDayOfInterval,
} from 'date-fns';
import {
  Phone, Mail, Calendar, Linkedin,
  CheckSquare, Zap, TrendingUp, TrendingDown,
  Users, Filter, Download, RefreshCw, Search,
  ChevronDown, ChevronUp, ChevronsUpDown, BarChart3,
  PieChart as PieIcon, Activity, Clock, Target, Award,
  Eye, X, ChevronLeft, ChevronRight, AlertCircle,
  CheckCircle2, ListTodo, FileText, Building2, PhoneCall, PhoneOff,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { EmployeeSelector } from '@/components/sales/sales-dashboard/EmployeeSelector';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type SortField  = 'activity_date' | 'type' | 'title' | 'outcome' | 'creator';
type SortDir    = 'asc' | 'desc';
type ChartView  = 'trend' | 'breakdown' | 'comparison' | 'outcome' | 'heatmap';
type MainFilter = 'all' | 'call' | 'email' | 'meeting' | 'linkedin';

// ─────────────────────────────────────────────
// CONFIG – main analytics types only
// ─────────────────────────────────────────────
const MAIN_CFG: Record<string, { label: string; color: string; light: string; icon: React.FC<any> }> = {
  call:     { label: 'Calls',    color: '#F59E0B', light: '#FEF3C7', icon: Phone },
  email:    { label: 'Emails',   color: '#6366F1', light: '#EEF2FF', icon: Mail },
  meeting:  { label: 'Meetings', color: '#10B981', light: '#D1FAE5', icon: Calendar },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', light: '#DBEAFE', icon: Linkedin },
};

const CALL_CONNECTED_CFG = {
  label: 'Connected',
  color: '#10B981',
  light: '#D1FAE5',
  icon: PhoneCall,
};

const OUTCOME_COLORS: Record<string, string> = {
  scheduled:      '#10B981',
  completed:      '#6366F1',
  no_answer:      '#F59E0B',
  no_response:    '#94A3B8',
  pending:        '#8B5CF6',
  interested:     '#0891B2',
  not_interested: '#EF4444',
  left_voicemail: '#F97316',
};

const RADAR_COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EC4899', '#0A66C2'];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function dlCSV(rows: any[], name: string) {
  if (!rows.length) return;
  const h   = Object.keys(rows[0]);
  const csv = [h.join(','), ...rows.map(r => h.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const a   = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: name,
  });
  a.click();
}

function stripHtml(s: string) { return s?.replace(/<[^>]*>/g, '') ?? ''; }

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
const StatCard: React.FC<{
  title: string; value: string | number;
  icon: React.FC<any>; color: string; light: string;
  trend?: number; delay?: number; active?: boolean; onClick?: () => void;
}> = ({ title, value, icon: Icon, color, light, trend, delay = 0, active, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay }}
    onClick={onClick}
    className={cn(
      'relative bg-white rounded-2xl border p-4 cursor-pointer overflow-hidden group transition-all duration-200',
      active ? 'ring-2 shadow-lg' : 'border-gray-100 hover:shadow-md',
    )}
    style={active ? { borderColor: color, boxShadow: `0 4px 20px ${color}20` } : {}}
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
      style={{ background: `radial-gradient(ellipse at 80% 20%, ${color}08 0%, transparent 65%)` }} />
    <div className="relative z-10 flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: light }}>
        <Icon size={18} style={{ color }} />
      </div>
      {trend !== undefined && (
        <span className={cn('flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full',
          trend >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50')}>
          {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 tabular-nums relative z-10">{value}</p>
    <p className="text-xs text-gray-500 mt-0.5 relative z-10">{title}</p>
  </motion.div>
);

// ─────────────────────────────────────────────
// CHART TOOLTIP
// ─────────────────────────────────────────────
const CTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3 text-xs min-w-[130px] z-50">
      {label && <p className="font-semibold text-gray-700 mb-1.5 border-b border-gray-100 pb-1.5">{label}</p>}
      {payload.map((e: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color || e.fill }} />
            <span className="text-gray-500 capitalize">{e.name}</span>
          </div>
          <span className="font-bold text-gray-900">{e.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// OUTCOME BADGE
// ─────────────────────────────────────────────
const OBadge: React.FC<{ outcome: string | null }> = ({ outcome }) => {
  if (!outcome) return <span className="text-gray-400">—</span>;
  const c = OUTCOME_COLORS[outcome] || '#6B7280';
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
      style={{ backgroundColor: `${c}18`, color: c }}>
      {outcome.replace(/_/g, ' ')}
    </span>
  );
};

// ─────────────────────────────────────────────
// SORT ICON
// ─────────────────────────────────────────────
const SIcon: React.FC<{ f: SortField; a: SortField; d: SortDir }> = ({ f, a, d }) => {
  if (a !== f) return <ChevronsUpDown size={11} className="text-gray-300" />;
  return d === 'asc' ? <ChevronUp size={11} className="text-indigo-500" /> : <ChevronDown size={11} className="text-indigo-500" />;
};

// ─────────────────────────────────────────────
// CHART PANEL (extracted – fixes AnimatePresence h-full=0 bug)
// Uses explicit pixel heights instead of h-full
// ─────────────────────────────────────────────
const CHART_H = 300;

const ChartPanel: React.FC<{ view: ChartView; analytics: any }> = ({ view, analytics }) => {
  const empty = (msg = 'No data for this period') => (
    <div style={{ height: CHART_H }} className="flex flex-col items-center justify-center gap-2 text-gray-400">
      <AlertCircle size={26} className="opacity-30" />
      <p className="text-sm">{msg}</p>
    </div>
  );

  /* TREND */
  if (view === 'trend') {
    const d = analytics?.dailyTrend ?? [];
    if (!d.length || d.every((r: any) => r.total === 0)) return empty();
    return (
      <div style={{ height: CHART_H }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={d} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              {Object.entries(MAIN_CFG).map(([type, cfg]) => (
                <linearGradient key={type} id={`lg-${type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={cfg.color} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 4" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false}
              tick={{ fontSize: 10, fill: '#94A3B8' }} dy={6} interval="preserveStartEnd" />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} dx={-4} />
            <Tooltip content={<CTooltip />} />
            <Legend iconType="circle" iconSize={8}
              formatter={(v: string) => <span className="text-xs text-gray-600">{v}</span>}
              wrapperStyle={{ paddingTop: 8 }} />
            {Object.entries(MAIN_CFG).map(([type, cfg]) => (
              <Area key={type} type="monotone" dataKey={type} name={cfg.label}
                stroke={cfg.color} strokeWidth={2} fill={`url(#lg-${type})`}
                dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* BREAKDOWN */
  if (view === 'breakdown') {
    const d = (analytics?.typeBreakdown ?? []).filter((t: any) => t.count > 0);
    if (!d.length) return empty();
    return (
      <div style={{ height: CHART_H }} className="flex items-center gap-8">
        <div style={{ height: CHART_H, flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={d} cx="50%" cy="50%"
                innerRadius="50%" outerRadius="76%"
                paddingAngle={3} dataKey="count" nameKey="label">
                {d.map((e: any, i: number) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
              </Pie>
              <Tooltip content={<CTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-52 flex-shrink-0 space-y-3">
          {d.map((t: any) => (
            <div key={t.type} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
              <span className="text-xs text-gray-600 flex-1 truncate">{t.label}</span>
              <span className="text-xs font-bold text-gray-900">{t.count}</span>
              <span className="text-[10px] text-gray-400 w-8 text-right">{t.pct}%</span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 flex justify-between text-xs">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-gray-900">{analytics?.total ?? 0}</span>
          </div>
        </div>
      </div>
    );
  }

  /* COMPARISON (Radar) */
  if (view === 'comparison') {
    const emps: any[] = analytics?.byEmployee ?? [];
    if (emps.length < 2) return empty('Need ≥ 2 team members for comparison');
    const rd = ['call', 'email', 'meeting', 'linkedin'].map(type => {
      const row: Record<string, any> = { metric: MAIN_CFG[type]?.label };
      emps.slice(0, 5).forEach((e: any) => { row[e.name.split(' ')[0]] = e[type] || 0; });
      return row;
    });
    return (
      <div style={{ height: CHART_H }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={rd}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748B' }} />
            <PolarRadiusAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
            {emps.slice(0, 5).map((e: any, i: number) => (
              <Radar key={e.id} name={e.name.split(' ')[0]} dataKey={e.name.split(' ')[0]}
                stroke={RADAR_COLORS[i]} fill={RADAR_COLORS[i]} fillOpacity={0.12} strokeWidth={2} />
            ))}
            <Legend iconType="circle" iconSize={8}
              formatter={(v: string) => <span className="text-xs text-gray-600">{v}</span>} />
            <Tooltip content={<CTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* OUTCOMES */
  if (view === 'outcome') {
    const d = analytics?.outcomeBreakdown ?? [];
    if (!d.length) return empty('No outcome data logged');
    return (
      <div style={{ height: CHART_H }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d} layout="vertical" margin={{ left: 8, right: 48, top: 6, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
            <YAxis type="category" dataKey="label" axisLine={false} tickLine={false}
              tick={{ fontSize: 10, fill: '#64748B' }} width={130} />
            <Tooltip content={<CTooltip />} />
            <Bar dataKey="count" name="Activities" radius={[0, 6, 6, 0]} maxBarSize={26}
              label={{ position: 'right', fontSize: 10, fill: '#6B7280', fontWeight: 700 }}>
              {d.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* HEATMAP */
  if (view === 'heatmap') {
    const hourly: any[] = analytics?.hourly ?? [];
    const dow:    any[] = analytics?.dow    ?? [];
    const maxDow = Math.max(...dow.map((d: any) => d.count), 1);
    return (
      <div style={{ height: CHART_H }} className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Activity by Hour</p>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false}
                  tick={{ fontSize: 9, fill: '#94A3B8' }} interval={2} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8' }} width={22} />
                <Tooltip content={<CTooltip />} />
                <Bar dataKey="count" name="Activities" fill="#6366F1" radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">By Day of Week</p>
          <div className="flex gap-2">
            {dow.map((d: any) => {
              const pct = Math.round((d.count / maxDow) * 100);
              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-indigo-50 rounded overflow-hidden flex flex-col justify-end" style={{ height: 36 }}>
                    <div className="w-full bg-indigo-500 rounded transition-all" style={{ height: `${pct}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-400">{d.label}</span>
                  <span className="text-[9px] font-bold text-indigo-600">{d.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// ─────────────────────────────────────────────
// SORT HELPER
// ─────────────────────────────────────────────
function sortList(list: any[], field: SortField, dir: SortDir) {
  return [...list].sort((a, b) => {
    let av: any, bv: any;
    if      (field === 'activity_date') { av = a.activity_date; bv = b.activity_date; }
    else if (field === 'type')          { av = a.type;          bv = b.type; }
    else if (field === 'title')         { av = a.title || '';   bv = b.title || ''; }
    else if (field === 'outcome')       { av = a.outcome || ''; bv = b.outcome || ''; }
    else { av = (a.creator as any)?.first_name || ''; bv = (b.creator as any)?.first_name || ''; }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ?  1 : -1;
    return 0;
  });
}

// ─────────────────────────────────────────────
// PAGINATION NUMBERS
// ─────────────────────────────────────────────
function pageNums(cur: number, total: number, max = 7) {
  const count = Math.min(total, max);
  const start = total <= max ? 1 : cur <= Math.ceil(max / 2) ? 1 :
    cur >= total - Math.floor(max / 2) ? total - max + 1 : cur - Math.floor(max / 2);
  return Array.from({ length: count }, (_, i) => start + i);
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export const ActivityLogReport: React.FC = () => {
  const user           = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const userRole       = useSelector((state: any) => state.auth.role);

  // ── Filters ──
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: startOfMonth(new Date()),
    endDate:   endOfMonth(new Date()),
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [mainFilter, setMainFilter] = useState<MainFilter>('all');
  const [search,     setSearch]     = useState('');
  const [activeChart, setActiveChart] = useState<ChartView>('trend');
  const [statFilter,  setStatFilter]  = useState<string | null>(null);

  // ── Main table ──
  const [page,      setPage]      = useState(1);
  const [sortF,     setSortF]     = useState<SortField>('activity_date');
  const [sortD,     setSortD]     = useState<SortDir>('desc');
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const PS = 15;

  // ── Tasks/Notes table ──
  const [tnPage,  setTnPage]  = useState(1);
  const [tnSortF, setTnSortF] = useState<SortField>('activity_date');
  const [tnSortD, setTnSortD] = useState<SortDir>('desc');
  const [tnFilter, setTnFilter] = useState<'all' | 'task' | 'note'>('all');
  const [tnSearch, setTnSearch] = useState('');
  const TN_PS = 10;

  const isAdmin = useMemo(() => {
    if (typeof userRole !== 'string') return false;
    return userRole.toLowerCase().trim().replace(/\s+/g, '_') === 'organization_superadmin';
  }, [userRole]);

  const df = useMemo(() => ({
    start: dateRange.startDate ? startOfDay(dateRange.startDate).toISOString() : null,
    end:   dateRange.endDate   ? endOfDay(dateRange.endDate).toISOString()     : null,
  }), [dateRange]);

  const cf = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return { start: null, end: null };
    const days = differenceInDays(dateRange.endDate, dateRange.startDate) + 1;
    const pe   = subDays(dateRange.startDate, 1);
    return {
      start: startOfDay(subDays(pe, days - 1)).toISOString(),
      end:   endOfDay(pe).toISOString(),
    };
  }, [dateRange]);

  // ─── QUERIES ────────────────────────────────
  const { data: teamMembers } = useQuery({
    queryKey: ['report-team', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, email, profile_picture_url, hr_departments!inner(name)')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .eq('hr_departments.name', 'Sales & Marketing');
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && isAdmin,
  });

  const { data: allActs, isLoading, refetch } = useQuery({
    queryKey: ['activity-report', organizationId, df, selectedEmployee],
    queryFn: async () => {
      let q = supabase
        .from('contact_activities')
        .select(`
          id, type, title, description, outcome, direction,
          activity_date, duration_minutes, priority, task_type,
          is_completed, due_date, due_time, status, metadata,
          contact:contact_id(id, name, email, photo_url, companies(name)),
          creator:created_by(id, first_name, last_name, profile_picture_url),
          assignee:assigned_to(id, first_name, last_name, profile_picture_url)
        `)
        .eq('organization_id', organizationId)
        .neq('type', 'stage_change')
        .order('activity_date', { ascending: false });

      if (df.start) q = q.gte('activity_date', df.start);
      if (df.end)   q = q.lte('activity_date', df.end);
      if (!isAdmin)             q = q.eq('created_by', user?.id);
      else if (selectedEmployee) q = q.eq('created_by', selectedEmployee);

      const { data, error } = await q.limit(2000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organizationId,
  });

  const { data: prevActs } = useQuery({
    queryKey: ['activity-report-prev', organizationId, cf, selectedEmployee],
    queryFn: async () => {
      let q = supabase
        .from('contact_activities')
        .select('type')
        .eq('organization_id', organizationId)
        .in('type', ['call', 'email', 'meeting', 'linkedin']);
      if (cf.start) q = q.gte('activity_date', cf.start);
      if (cf.end)   q = q.lte('activity_date', cf.end);
      if (!isAdmin)             q = q.eq('created_by', user?.id);
      else if (selectedEmployee) q = q.eq('created_by', selectedEmployee);
      const { data, error } = await q.limit(2000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organizationId && !!cf.start,
  });

  // ─── SPLIT ──────────────────────────────────
  const mainActs = useMemo(
    () => (allActs ?? []).filter((a: any) => ['call', 'email', 'meeting', 'linkedin'].includes(a.type)),
    [allActs]
  );
  const tnActs = useMemo(
    () => (allActs ?? []).filter((a: any) => ['task', 'note'].includes(a.type)),
    [allActs]
  );

  // ─── ANALYTICS ──────────────────────────────
  const analytics = useMemo(() => {
    if (!mainActs.length && !tnActs.length) return null;

    const counts: Record<string, number> = {};
    mainActs.forEach((a: any) => { counts[a.type] = (counts[a.type] || 0) + 1; });

    const prevCounts: Record<string, number> = {};
    (prevActs ?? []).forEach((a: any) => { prevCounts[a.type] = (prevCounts[a.type] || 0) + 1; });

    const getTrend = (type: string) => {
      const c = counts[type] || 0, p = prevCounts[type] || 0;
      return p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100);
    };

    const s = dateRange.startDate ?? subDays(new Date(), 29);
    const e = dateRange.endDate   ?? new Date();
    const days = eachDayOfInterval({ start: s, end: e });
    const intv = days.length > 60 ? 7 : days.length > 30 ? 3 : 1;

    const dailyTrend = days.map((day, i) => {
      const ds = format(day, 'yyyy-MM-dd');
      const da = mainActs.filter((a: any) => format(parseISO(a.activity_date), 'yyyy-MM-dd') === ds);
      return {
        label:    i % intv === 0 ? format(day, 'MMM d') : '',
        date:     ds,
        total:    da.length,
        call:     da.filter((a: any) => a.type === 'call').length,
        email:    da.filter((a: any) => a.type === 'email').length,
        meeting:  da.filter((a: any) => a.type === 'meeting').length,
        linkedin: da.filter((a: any) => a.type === 'linkedin').length,
      };
    });

    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h, label: format(new Date(2024, 0, 1, h), 'ha'),
      count: mainActs.filter((a: any) => parseISO(a.activity_date).getHours() === h).length,
    }));

    const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label, d) => ({
      label, count: mainActs.filter((a: any) => parseISO(a.activity_date).getDay() === d).length,
    }));

const empMap: Record<string, any> = {};
mainActs.forEach((a: any) => {
  const id = (a.creator as any)?.id || 'unknown';
  if (!empMap[id]) empMap[id] = {
    id, avatar: (a.creator as any)?.profile_picture_url,
    name: a.creator ? `${(a.creator as any).first_name} ${(a.creator as any).last_name}` : 'Unknown',
    total: 0, call: 0, call_connected: 0, email: 0, meeting: 0, linkedin: 0,
  };
  empMap[id].total++;
  if (a.type === 'call') {
    empMap[id].call = (empMap[id].call || 0) + 1;
    if (a.outcome === 'connected') {
      empMap[id].call_connected = (empMap[id].call_connected || 0) + 1;
    }
  }
  if (a.type !== 'call') {
    empMap[id][a.type] = (empMap[id][a.type] || 0) + 1;
  }
});
    const byEmployee = Object.values(empMap).sort((a: any, b: any) => b.total - a.total);

    const typeBreakdown = Object.entries(MAIN_CFG).map(([type, cfg]) => ({
      type, label: cfg.label, color: cfg.color,
      count: counts[type] || 0,
      pct: mainActs.length > 0 ? Math.round(((counts[type] || 0) / mainActs.length) * 100) : 0,
    }));

    const outMap: Record<string, number> = {};
    mainActs.forEach((a: any) => { if (a.outcome) outMap[a.outcome] = (outMap[a.outcome] || 0) + 1; });
    const outcomeBreakdown = Object.entries(outMap)
      .sort(([, a], [, b]) => b - a)
      .map(([outcome, count]) => ({
        outcome, count,
        label: outcome.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        color: OUTCOME_COLORS[outcome] || '#94A3B8',
      }));

    const total      = mainActs.length;
    const prevTotal  = prevActs?.length ?? 0;
    const totalTrend = prevTotal === 0 ? (total > 0 ? 100 : 0) : Math.round(((total - prevTotal) / prevTotal) * 100);
    const avgPerDay  = days.length > 0 ? Math.round(total / days.length) : 0;
    const uniqueContacts = new Set(mainActs.map((a: any) => (a.contact as any)?.id).filter(Boolean)).size;

    return { total, totalTrend, counts, getTrend, dailyTrend, hourly, dow, byEmployee,
             typeBreakdown, outcomeBreakdown, avgPerDay, uniqueContacts };
  }, [mainActs, tnActs, prevActs, dateRange]);

  // ─── FILTERED TABLE DATA ────────────────────
  const filteredMain = useMemo(() => {
    let list = statFilter ? mainActs.filter((a: any) => a.type === statFilter) : [...mainActs];
    if (mainFilter !== 'all') list = list.filter((a: any) => a.type === mainFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a: any) =>
        a.title?.toLowerCase().includes(q) ||
        (a.contact as any)?.name?.toLowerCase().includes(q) ||
        (a.creator as any)?.first_name?.toLowerCase().includes(q) ||
        a.outcome?.toLowerCase().includes(q)
      );
    }
    return sortList(list, sortF, sortD);
  }, [mainActs, statFilter, mainFilter, search, sortF, sortD]);

  const filteredTN = useMemo(() => {
    let list = tnFilter !== 'all' ? tnActs.filter((a: any) => a.type === tnFilter) : [...tnActs];
    if (tnSearch.trim()) {
      const q = tnSearch.toLowerCase();
      list = list.filter((a: any) =>
        a.title?.toLowerCase().includes(q) ||
        (a.contact as any)?.name?.toLowerCase().includes(q) ||
        (a.creator as any)?.first_name?.toLowerCase().includes(q)
      );
    }
    return sortList(list, tnSortF, tnSortD);
  }, [tnActs, tnFilter, tnSearch, tnSortF, tnSortD]);

  const totalPages   = Math.ceil(filteredMain.length / PS);
  const pagedMain    = filteredMain.slice((page - 1) * PS, page * PS);
  const tnTotalPages = Math.ceil(filteredTN.length / TN_PS);
  const pagedTN      = filteredTN.slice((tnPage - 1) * TN_PS, tnPage * TN_PS);

  const handleSort = useCallback((f: SortField) => {
    if (sortF === f) setSortD(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortF(f); setSortD('desc'); }
    setPage(1);
  }, [sortF]);

  const handleTNSort = useCallback((f: SortField) => {
    if (tnSortF === f) setTnSortD(d => d === 'asc' ? 'desc' : 'asc');
    else { setTnSortF(f); setTnSortD('desc'); }
    setTnPage(1);
  }, [tnSortF]);

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6 space-y-6">
        <Skeleton className="h-16 rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        <Skeleton className="h-[400px] rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  // Task stats
  const taskList      = tnActs.filter((a: any) => a.type === 'task');
  const completedTasks = taskList.filter((a: any) => a.is_completed).length;
  const overdueTasks   = taskList.filter((a: any) => !a.is_completed && a.due_date && new Date(a.due_date) < new Date()).length;
  const taskPct        = taskList.length > 0 ? Math.round((completedTasks / taskList.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── HEADER ─────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Activity Log & Analytics</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {analytics?.total ?? 0} activities · {tnActs.length} tasks/notes · {analytics?.uniqueContacts ?? 0} contacts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search activities…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 w-48 h-9 text-xs bg-gray-50 border-gray-200" />
            </div>

            <EnhancedDateRangeSelector value={dateRange} onChange={setDateRange} onApply={() => refetch()} />

            {isAdmin && teamMembers && (
              <EmployeeSelector employees={teamMembers} selectedEmployee={selectedEmployee} onSelect={setSelectedEmployee} />
            )}

            <Select value={mainFilter} onValueChange={v => { setMainFilter(v as MainFilter); setStatFilter(null); setPage(1); }}>
              <SelectTrigger className="h-9 w-36 text-xs bg-white border-gray-200">
                <Filter size={12} className="mr-1.5 text-gray-400 flex-shrink-0" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(MAIN_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-gray-200"
              onClick={() => dlCSV(filteredMain.map((a: any) => ({
                Date:     format(parseISO(a.activity_date), 'yyyy-MM-dd HH:mm'),
                Type:     a.type,
                Title:    a.title || '',
                Contact:  (a.contact as any)?.name || '',
                Company:  (a.contact as any)?.companies?.name || '',
                Creator:  a.creator ? `${(a.creator as any).first_name} ${(a.creator as any).last_name}` : '',
                Outcome:  a.outcome || '',
                Duration: a.duration_minutes ? `${a.duration_minutes}m` : '',
              })), `activities-${format(new Date(), 'yyyy-MM-dd')}.csv`)}>
              <Download size={12} />Export
            </Button>

            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => refetch()}>
              <RefreshCw size={13} className="text-gray-400" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">

        {/* ── STAT CARDS ────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
{Object.entries(MAIN_CFG).map(([type, cfg], i) => {
  if (type === 'call') {
    // Calculate connected calls count
    const connectedCount = mainActs.filter((a: any) => a.type === 'call' && a.outcome === 'connected').length;
    const totalCalls = analytics?.counts[type] || 0;
    
    return (
      <motion.div
        key={type}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: i * 0.07 }}
        onClick={() => { setStatFilter(statFilter === type ? null : type); setMainFilter('all'); setPage(1); }}
        className={cn(
          'relative bg-white rounded-2xl border p-4 cursor-pointer overflow-hidden group transition-all duration-200',
          statFilter === type ? 'ring-2 shadow-lg' : 'border-gray-100 hover:shadow-md',
        )}
        style={statFilter === type ? { borderColor: cfg.color, boxShadow: `0 4px 20px ${cfg.color}20` } : {}}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 80% 20%, ${cfg.color}08 0%, transparent 65%)` }} />
        <div className="relative z-10 flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cfg.light }}>
            <cfg.icon size={18} style={{ color: cfg.color }} />
          </div>
          {analytics?.getTrend(type) !== undefined && (
            <span className={cn('flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full',
              (analytics?.getTrend(type) ?? 0) >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50')}>
              {(analytics?.getTrend(type) ?? 0) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(analytics?.getTrend(type) ?? 0)}%
            </span>
          )}
        </div>
        
        {/* Split display for calls: Connected / Total */}
        <div className="relative z-10 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-emerald-600 tabular-nums">{connectedCount}</span>
          <span className="text-lg font-semibold text-gray-300 tabular-nums">/</span>
          <span className="text-2xl font-bold text-gray-900 tabular-nums">{totalCalls}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 relative z-10">
          {cfg.label} <span className="text-emerald-500 font-medium">({totalCalls > 0 ? Math.round((connectedCount / totalCalls) * 100) : 0}% connected)</span>
        </p>
      </motion.div>
    );
  }
  
  // For other types (email, meeting, linkedin) - keep original
  return (
    <StatCard key={type} title={cfg.label}
      value={(analytics?.counts[type] || 0).toLocaleString()}
      icon={cfg.icon} color={cfg.color} light={cfg.light}
      trend={analytics?.getTrend(type)}
      delay={i * 0.07}
      active={statFilter === type}
      onClick={() => { setStatFilter(statFilter === type ? null : type); setMainFilter('all'); setPage(1); }}
    />
  );
})}
        </div>

        {/* ── KPI ROW ──────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Activities', v: (analytics?.total || 0).toLocaleString(),
              sub: `${(analytics?.totalTrend ?? 0) >= 0 ? '+' : ''}${analytics?.totalTrend ?? 0}% vs prior period`,
              ok: (analytics?.totalTrend ?? 0) >= 0, icon: Zap, color: '#6366F1' },
            { label: 'Avg / Day', v: analytics?.avgPerDay ?? 0,
              sub: `${analytics?.dailyTrend?.filter((d: any) => d.total > 0).length ?? 0} active days`,
              ok: true, icon: Clock, color: '#10B981' },
            { label: 'Tasks Created', v: taskList.length,
              sub: `${completedTasks} done · ${overdueTasks} overdue`,
              ok: overdueTasks === 0, icon: CheckSquare, color: '#8B5CF6' },
            { label: 'Contacts Reached', v: analytics?.uniqueContacts ?? 0,
              sub: 'Unique contacts this period',
              ok: true, icon: Users, color: '#F59E0B' },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${k.color}14` }}>
                <k.icon size={20} style={{ color: k.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 tabular-nums">{k.v}</p>
                <p className="text-xs text-gray-500 truncate">{k.label}</p>
                <p className={cn('text-[10px] mt-0.5 truncate', k.ok ? 'text-emerald-500' : 'text-red-400')}>{k.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── CHARTS PANEL ─────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Tab nav */}
          <div className="border-b border-gray-100 flex items-center overflow-x-auto">
            {([
              { id: 'trend',      label: 'Activity Trend',  icon: TrendingUp },
              { id: 'breakdown',  label: 'Type Breakdown',  icon: PieIcon },
              { id: 'comparison', label: 'Team Comparison', icon: Users },
              { id: 'outcome',    label: 'Outcomes',        icon: Target },
              { id: 'heatmap',    label: 'Time Heatmap',    icon: Clock },
            ] as { id: ChartView; label: string; icon: React.FC<any> }[]).map(tab => (
              <button key={tab.id} onClick={() => setActiveChart(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-all',
                  activeChart === tab.id
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/40'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/60'
                )}>
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chart body — explicit padding around ChartPanel so ResponsiveContainer gets real px dimensions */}
          <div className="px-5 py-5">
            <AnimatePresence mode="wait">
              <motion.div key={activeChart}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}>
                <ChartPanel view={activeChart} analytics={analytics} />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── TEAM BREAKDOWN (admin) ────────────── */}
        {isAdmin && (analytics?.byEmployee || []).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
                <Award size={15} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Team Performance Breakdown</h2>
                <p className="text-xs text-gray-400">{(analytics?.byEmployee || []).length} active members</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
               <thead>
  <tr className="bg-gray-50 border-b border-gray-100">
    <th className="text-left px-5 py-3 text-gray-400 font-semibold">#</th>
    <th className="text-left px-4 py-3 text-gray-400 font-semibold">Member</th>
    <th className="text-center px-4 py-3 text-gray-500 font-semibold">Total</th>
    {Object.entries(MAIN_CFG).map(([t, c]) => {
      if (t === 'call') {
        return (
          <React.Fragment key={t}>
            <th className="text-center px-3 py-3">
              <div className="flex flex-col items-center">
                <span className="text-emerald-500 font-semibold text-[10px]">Connected</span>
                <span className="text-emerald-400 text-[9px] font-normal mt-0.5">Calls</span>
              </div>
            </th>
            <th className="text-center px-3 py-3">
              <div className="flex flex-col items-center">
                <span className="font-semibold" style={{ color: c.color }}>Total</span>
                <span className="text-gray-400 text-[9px] font-normal mt-0.5">Calls</span>
              </div>
            </th>
          </React.Fragment>
        );
      }
      return (
        <th key={t} className="text-center px-4 py-3 font-semibold" style={{ color: c.color }}>{c.label}</th>
      );
    })}
  </tr>
</thead>
<tbody>
  {(analytics?.byEmployee || []).map((emp: any, idx: number) => {
    const mx = (analytics?.byEmployee[0] as any)?.total || 1;
    return (
      <tr key={emp.id} className="border-b border-gray-50 hover:bg-amber-50/15 transition-colors">
        <td className="px-5 py-3 text-[11px] text-gray-400 font-bold">
          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarImage src={emp.avatar} />
              <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700 font-bold">
                {emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-gray-800">{emp.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className="font-bold text-gray-900">{emp.total}</span>
            <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${Math.round((emp.total / mx) * 100)}%` }} />
            </div>
          </div>
        </td>
        {Object.entries(MAIN_CFG).map(([type, cfg]) => {
          if (type === 'call') {
            const connected = emp.call_connected || 0;
            const total = emp.call || 0;
            const connectRate = total > 0 ? Math.round((connected / total) * 100) : 0;
            return (
              <React.Fragment key={type}>
                {/* Connected column */}
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg text-xs font-bold"
                    style={connected > 0
                      ? { backgroundColor: '#D1FAE5', color: '#10B981' }
                      : { color: '#D1D5DB' }}>
                    {connected}
                  </span>
                  {total > 0 && (
                    <div className="mt-1">
                      <span className="text-[9px] font-medium text-emerald-500">{connectRate}%</span>
                    </div>
                  )}
                </td>
                {/* Total column */}
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg text-xs font-bold"
                    style={total > 0
                      ? { backgroundColor: `${cfg.color}18`, color: cfg.color }
                      : { color: '#D1D5DB' }}>
                    {total}
                  </span>
                </td>
              </React.Fragment>
            );
          }
          return (
            <td key={type} className="px-4 py-3 text-center">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold"
                style={emp[type] > 0
                  ? { backgroundColor: `${cfg.color}18`, color: cfg.color }
                  : { color: '#D1D5DB' }}>
                {emp[type] || 0}
              </span>
            </td>
          );
        })}
      </tr>
    );
  })}
</tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── MAIN ACTIVITY LOG ─────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl">
                <BarChart3 size={15} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Activity Log
                  <span className="ml-1.5 text-xs font-normal text-gray-400">Calls · Emails · Meetings · LinkedIn</span>
                </h2>
                <p className="text-xs text-gray-400">
                  {filteredMain.length} records
                  {statFilter && (
                    <button className="ml-2 text-indigo-500 hover:text-indigo-700 inline-flex items-center gap-1 text-[10px]"
                      onClick={() => setStatFilter(null)}>
                      <X size={9} />clear
                    </button>
                  )}
                </p>
              </div>
            </div>
            {/* Type pills */}
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(MAIN_CFG).map(([type, cfg]) => (
                <button key={type}
                  onClick={() => { setStatFilter(statFilter === type ? null : type); setPage(1); }}
                  className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all',
                    statFilter === type ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')}
                  style={statFilter === type ? { backgroundColor: cfg.color } : {}}>
                  <cfg.icon size={10} />
                  {cfg.label}
                  <span className={cn('px-1 rounded-full text-[9px]', statFilter === type ? 'bg-white/20' : 'bg-gray-100')}>
                    {analytics?.counts[type] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {([
                    { f: 'activity_date' as SortField, label: 'Date & Time', w: 'w-32' },
                    { f: 'type'          as SortField, label: 'Type',         w: 'w-24' },
                    { f: 'title'         as SortField, label: 'Activity',     w: '' },
                    { f: null,                          label: 'Contact',      w: 'w-40' },
                    { f: 'creator'       as SortField, label: 'Rep',          w: 'w-28' },
                    { f: 'outcome'       as SortField, label: 'Outcome',      w: 'w-28' },
                    { f: null,                          label: 'Duration',     w: 'w-20' },
                    { f: null,                          label: '',             w: 'w-8'  },
                  ] as any[]).map((col: any, i: number) => (
                    <th key={i}
                      className={cn('text-left px-4 py-3 font-semibold text-gray-400 select-none', col.w,
                        col.f && 'cursor-pointer hover:text-indigo-500')}
                      onClick={() => col.f && handleSort(col.f)}>
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.f && <SIcon f={col.f} a={sortF} d={sortD} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedMain.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle size={26} className="opacity-30" />
                        <p className="text-sm font-medium">No activities found</p>
                        <p className="text-xs">Try adjusting filters or date range</p>
                      </div>
                    </td>
                  </tr>
                ) : pagedMain.map((act: any) => {
                  const cfg  = MAIN_CFG[act.type];
                  const Icon = cfg?.icon || Activity;
                  const isEx = expanded === act.id;
                  return (
                    <React.Fragment key={act.id}>
                      <tr className={cn('border-b border-gray-50 group hover:bg-indigo-50/20 transition-colors',
                        isEx && 'bg-indigo-50/25')}>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-gray-700 font-medium">{format(parseISO(act.activity_date), 'MMM d')}</p>
                          <p className="text-gray-400 text-[10px]">{format(parseISO(act.activity_date), 'h:mm a')}</p>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                            style={{ backgroundColor: `${cfg?.color}18`, color: cfg?.color }}>
                            <Icon size={10} />{cfg?.label}
                          </span>
                        </td>

                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-gray-800 font-medium truncate">{act.title || '—'}</p>
                          {act.description && (
                            <p className="text-gray-400 text-[10px] truncate mt-0.5">
                              {stripHtml(act.description).slice(0, 80)}…
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {act.contact ? (
                            <div>
                              <p className="text-gray-700 font-medium truncate max-w-[140px]">{(act.contact as any).name}</p>
                              <p className="text-gray-400 text-[10px] truncate max-w-[140px] flex items-center gap-1">
                                <Building2 size={9} />
                                {(act.contact as any)?.companies?.name || (act.contact as any).email || '—'}
                              </p>
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>

                        <td className="px-4 py-3">
                          {act.creator ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 flex-shrink-0">
                                <AvatarImage src={(act.creator as any).profile_picture_url} />
                                <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700 font-bold">
                                  {(act.creator as any).first_name?.[0]}{(act.creator as any).last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-gray-700 truncate max-w-[80px]">{(act.creator as any).first_name}</span>
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>

                        <td className="px-4 py-3"><OBadge outcome={act.outcome} /></td>

                        <td className="px-4 py-3 text-gray-500">
                          {act.duration_minutes ? `${act.duration_minutes}m` : '—'}
                        </td>

                        <td className="px-3 py-3">
                          <button
                            onClick={() => setExpanded(isEx ? null : act.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-indigo-100 rounded-lg">
                            {isEx
                              ? <ChevronUp size={13} className="text-indigo-500" />
                              : <Eye size={13} className="text-gray-400" />}
                          </button>
                        </td>
                      </tr>

                      <AnimatePresence>
                        {isEx && (
                          <motion.tr key={`ex-${act.id}`}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <td colSpan={8} className="bg-indigo-50/40 px-10 py-4 border-b border-indigo-100/40">
                              <div className="grid grid-cols-3 gap-6">
                                <div className="col-span-2">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description</p>
                                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {stripHtml(act.description || 'No description provided.')}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Details</p>
                                  {[
                                    { label: 'Status',    value: act.is_completed ? '✅ Completed' : '⏳ Pending' },
                                    { label: 'Direction', value: act.direction || '—' },
                                    act.assignee && {
                                      label: 'Assignee',
                                      value: `${(act.assignee as any).first_name} ${(act.assignee as any).last_name}`,
                                    },
                                  ].filter(Boolean).map((row: any) => (
                                    <div key={row.label} className="flex justify-between text-xs gap-2">
                                      <span className="text-gray-400">{row.label}</span>
                                      <span className="text-gray-700 font-medium capitalize">{row.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/40">
              <p className="text-xs text-gray-400">
                {(page - 1) * PS + 1}–{Math.min(page * PS, filteredMain.length)} of {filteredMain.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}><ChevronLeft size={12} /></Button>
                {pageNums(page, totalPages).map(n => (
                  <Button key={n} variant={page === n ? 'default' : 'outline'} size="sm"
                    className={cn('h-7 w-7 p-0 text-xs', page === n && 'bg-indigo-600 text-white border-indigo-600')}
                    onClick={() => setPage(n)}>{n}</Button>
                ))}
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}><ChevronRight size={12} /></Button>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── TASKS & NOTES TABLE ───────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl">
                <ListTodo size={15} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Tasks & Notes</h2>
                <p className="text-xs text-gray-400">
                  {taskList.length} tasks · {tnActs.filter((a: any) => a.type === 'note').length} notes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Search…" value={tnSearch}
                  onChange={e => { setTnSearch(e.target.value); setTnPage(1); }}
                  className="pl-7 w-40 h-8 text-xs bg-gray-50 border-gray-200" />
              </div>
              {(['all', 'task', 'note'] as const).map(t => (
                <button key={t}
                  onClick={() => { setTnFilter(t); setTnPage(1); }}
                  className={cn('px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all',
                    tnFilter === t
                      ? t === 'task' ? 'bg-purple-600 text-white border-purple-600'
                        : t === 'note' ? 'bg-pink-500 text-white border-pink-500'
                        : 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')}>
                  {t === 'all' ? 'All' : t === 'task' ? '☑ Tasks' : '📝 Notes'}
                </button>
              ))}
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-gray-200"
                onClick={() => dlCSV(filteredTN.map((a: any) => ({
                  Date:      format(parseISO(a.activity_date), 'yyyy-MM-dd HH:mm'),
                  Type:      a.type,
                  Title:     a.title || '',
                  Contact:   (a.contact as any)?.name || '',
                  DueDate:   a.due_date || '',
                  Priority:  a.priority || '',
                  Completed: a.is_completed ? 'Yes' : 'No',
                  Creator:   a.creator ? `${(a.creator as any).first_name} ${(a.creator as any).last_name}` : '',
                })), `tasks-notes-${format(new Date(), 'yyyy-MM-dd')}.csv`)}>
                <Download size={11} />Export
              </Button>
            </div>
          </div>

          {/* Task progress bar */}
          {taskList.length > 0 && (
            <div className="px-5 py-2.5 bg-purple-50/40 border-b border-purple-100/40 flex items-center gap-5 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="text-gray-600"><span className="font-bold text-emerald-600">{completedTasks}</span> completed</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Clock size={12} className="text-amber-500" />
                <span className="text-gray-600"><span className="font-bold text-amber-600">{overdueTasks}</span> overdue</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Clock size={12} className="text-indigo-400" />
                <span className="text-gray-600"><span className="font-bold text-indigo-600">{taskList.length - completedTasks}</span> pending</span>
              </div>
              <div className="flex-1 flex items-center gap-2 min-w-[120px]">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${taskPct}%` }} />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 w-8 text-right">{taskPct}%</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {([
                    { f: 'type'          as SortField, label: 'Type',      w: 'w-20' },
                    { f: 'activity_date' as SortField, label: 'Created',   w: 'w-28' },
                    { f: 'title'         as SortField, label: 'Title',     w: '' },
                    { f: null,                          label: 'Contact',   w: 'w-36' },
                    { f: 'creator'       as SortField, label: 'Creator',   w: 'w-28' },
                    { f: null,                          label: 'Due Date',  w: 'w-24' },
                    { f: null,                          label: 'Priority',  w: 'w-20' },
                    { f: null,                          label: 'Status',    w: 'w-24' },
                  ] as any[]).map((col: any, i: number) => (
                    <th key={i}
                      className={cn('text-left px-4 py-3 font-semibold text-gray-400 select-none', col.w,
                        col.f && 'cursor-pointer hover:text-purple-500')}
                      onClick={() => col.f && handleTNSort(col.f)}>
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.f && <SIcon f={col.f} a={tnSortF} d={tnSortD} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedTN.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <ListTodo size={26} className="opacity-30" />
                        <p className="text-sm font-medium">No tasks or notes found</p>
                      </div>
                    </td>
                  </tr>
                ) : pagedTN.map((act: any) => {
                  const isTask    = act.type === 'task';
                  const isOverdue = isTask && act.due_date && !act.is_completed && new Date(act.due_date) < new Date();

                  return (
                    <tr key={act.id}
                      className={cn('border-b border-gray-50 transition-colors',
                        isOverdue ? 'hover:bg-red-50/20' : 'hover:bg-purple-50/15',
                        act.is_completed && 'opacity-55')}>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                          isTask ? 'bg-purple-50 text-purple-600' : 'bg-pink-50 text-pink-600')}>
                          {isTask ? <CheckSquare size={10} /> : <FileText size={10} />}
                          {isTask ? 'Task' : 'Note'}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-gray-700">{format(parseISO(act.activity_date), 'MMM d')}</p>
                        <p className="text-gray-400 text-[10px]">{format(parseISO(act.activity_date), 'h:mm a')}</p>
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className={cn('font-medium truncate', act.is_completed ? 'line-through text-gray-400' : 'text-gray-800')}>
                          {act.title || '—'}
                        </p>
                        {isTask && act.task_type && (
                          <p className="text-gray-400 text-[10px] mt-0.5 capitalize">
                            {act.task_type.replace(/_/g, ' ')}
                          </p>
                        )}
                        {!isTask && act.description && (
                          <p className="text-gray-400 text-[10px] mt-0.5 truncate">
                            {stripHtml(act.description).slice(0, 70)}…
                          </p>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        {act.contact ? (
                          <div>
                            <p className="text-gray-700 font-medium truncate max-w-[130px]">{(act.contact as any).name}</p>
                            <p className="text-gray-400 text-[10px] truncate max-w-[130px] flex items-center gap-1">
                              <Building2 size={9} />
                              {(act.contact as any)?.companies?.name || (act.contact as any).email || '—'}
                            </p>
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Creator */}
                      <td className="px-4 py-3">
                        {act.creator ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 flex-shrink-0">
                              <AvatarImage src={(act.creator as any).profile_picture_url} />
                              <AvatarFallback className="text-[9px] bg-purple-100 text-purple-700 font-bold">
                                {(act.creator as any).first_name?.[0]}{(act.creator as any).last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-gray-700 truncate max-w-[70px]">{(act.creator as any).first_name}</span>
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Due date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isTask && act.due_date ? (
                          <span className={cn('text-xs font-medium',
                            isOverdue ? 'text-red-500' : isToday(parseISO(act.due_date)) ? 'text-amber-600' : 'text-gray-600')}>
                            {isOverdue ? '⚠ ' : ''}
                            {format(parseISO(act.due_date), 'MMM d')}
                            {act.due_time ? ` ${String(act.due_time).slice(0, 5)}` : ''}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3">
                        {act.priority && act.priority !== 'none' ? (
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize',
                            act.priority === 'high'   ? 'bg-red-50 text-red-500' :
                            act.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                                                        'bg-gray-100 text-gray-500')}>
                            {act.priority}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {isTask ? (
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                            act.is_completed ? 'bg-emerald-50 text-emerald-600' :
                            isOverdue        ? 'bg-red-50 text-red-500' :
                                               'bg-amber-50 text-amber-600')}>
                            {act.is_completed ? <CheckCircle2 size={9} /> : <Clock size={9} />}
                            {act.is_completed ? 'Done' : isOverdue ? 'Overdue' : 'Pending'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-50 text-pink-500">
                            <FileText size={9} />Logged
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {tnTotalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/40">
              <p className="text-xs text-gray-400">
                {(tnPage - 1) * TN_PS + 1}–{Math.min(tnPage * TN_PS, filteredTN.length)} of {filteredTN.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={tnPage === 1}
                  onClick={() => setTnPage(p => p - 1)}><ChevronLeft size={12} /></Button>
                {pageNums(tnPage, tnTotalPages, 5).map(n => (
                  <Button key={n} variant={tnPage === n ? 'default' : 'outline'} size="sm"
                    className={cn('h-7 w-7 p-0 text-xs', tnPage === n && 'bg-purple-600 text-white border-purple-600')}
                    onClick={() => setTnPage(n)}>{n}</Button>
                ))}
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={tnPage === tnTotalPages}
                  onClick={() => setTnPage(p => p + 1)}><ChevronRight size={12} /></Button>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default ActivityLogReport;