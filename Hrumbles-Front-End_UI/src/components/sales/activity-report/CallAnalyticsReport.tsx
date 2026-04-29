// Hrumbles-Front-End_UI/src/components/sales/activity-report/CallAnalyticsReport.tsx
// Route: /sales/call-analytics

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis, ComposedChart, Line,
} from 'recharts';
import {
  format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth,
  parseISO, differenceInDays, isToday, eachDayOfInterval, startOfWeek,
  endOfWeek, getHours, getDay, addDays,
} from 'date-fns';
import {
  Phone, PhoneCall, PhoneOff, PhoneIncoming, PhoneOutgoing,
  PhoneMissed, Voicemail, Clock, Calendar, TrendingUp, TrendingDown,
  Users, Filter, Download, RefreshCw, Search,
  ChevronDown, ChevronUp, ChevronsUpDown, BarChart3,
  PieChart as PieIcon, Activity, Target, Award,
  Eye, X, ChevronLeft, ChevronRight, AlertCircle,
  CheckCircle2, MessageSquare, Timer, Zap,
  ThumbsUp, ThumbsDown, UserCheck, UserX, Percent,
  ArrowUpRight, ArrowDownRight, Gauge, Hash,
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
type SortField = 'activity_date' | 'title' | 'outcome' | 'direction' | 'duration_minutes' | 'creator';
type SortDir = 'asc' | 'desc';
type ChartView = 'trend' | 'outcomes' | 'direction' | 'duration' | 'heatmap' | 'team';

// ─────────────────────────────────────────────
// CALL OUTCOME CONFIG
// ─────────────────────────────────────────────
const CALL_OUTCOME_CFG: Record<string, { label: string; color: string; light: string; icon: React.FC<any> }> = {
  connected:      { label: 'Connected',       color: '#10B981', light: '#D1FAE5', icon: PhoneCall },
  no_answer:      { label: 'No Answer',       color: '#F59E0B', light: '#FEF3C7', icon: PhoneMissed },
  left_voicemail: { label: 'Left Voicemail',  color: '#8B5CF6', light: '#EDE9FE', icon: Voicemail },
  left_message:   { label: 'Left Message',    color: '#EC4899', light: '#FCE7F3', icon: MessageSquare },
  busy:           { label: 'Busy',            color: '#EF4444', light: '#FEE2E2', icon: PhoneOff },
  interested:     { label: 'Interested',       color: '#0891B2', light: '#CFFAFE', icon: ThumbsUp },
  not_interested: { label: 'Not Interested',   color: '#6B7280', light: '#F3F4F6', icon: ThumbsDown },
  call_back:      { label: 'Call Back',        color: '#6366F1', light: '#EEF2FF', icon: Phone },
  scheduled:      { label: 'Scheduled',        color: '#059669', light: '#D1FAE5', icon: Calendar },
};

const DIRECTION_CFG: Record<string, { label: string; color: string; icon: React.FC<any> }> = {
  inbound:  { label: 'Inbound',  color: '#6366F1', icon: PhoneIncoming },
  outbound: { label: 'Outbound', color: '#F59E0B', icon: PhoneOutgoing },
};

const RADAR_COLORS = ['#F59E0B', '#6366F1', '#10B981', '#EC4899', '#8B5CF6'];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function dlCSV(rows: any[], name: string) {
  if (!rows.length) return;
  const h = Object.keys(rows[0]);
  const csv = [h.join(','), ...rows.map(r => h.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: name,
  });
  a.click();
}

function stripHtml(s: string) { return s?.replace(/<[^>]*>/g, '') ?? ''; }

function getOutcomeLabel(outcome: string | null): string {
  if (!outcome) return 'Unknown';
  return CALL_OUTCOME_CFG[outcome]?.label || outcome.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getOutcomeColor(outcome: string | null): string {
  if (!outcome) return '#94A3B8';
  return CALL_OUTCOME_CFG[outcome]?.color || '#94A3B8';
}

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
const StatCard: React.FC<{
  title: string; value: string | number; subtitle?: string;
  icon: React.FC<any>; color: string; light: string;
  trend?: number; delay?: number; active?: boolean; onClick?: () => void;
}> = ({ title, value, subtitle, icon: Icon, color, light, trend, delay = 0, active, onClick }) => (
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
    {subtitle && <p className="text-[10px] text-gray-400 mt-0.5 relative z-10">{subtitle}</p>}
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
          <span className="font-bold text-gray-900">{typeof e.value === 'number' ? e.value.toLocaleString() : e.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// SORT ICON
// ─────────────────────────────────────────────
const SIcon: React.FC<{ f: SortField; a: SortField; d: SortDir }> = ({ f, a, d }) => {
  if (a !== f) return <ChevronsUpDown size={11} className="text-gray-300" />;
  return d === 'asc' ? <ChevronUp size={11} className="text-amber-500" /> : <ChevronDown size={11} className="text-amber-500" />;
};

// ─────────────────────────────────────────────
// CHART PANEL
// ─────────────────────────────────────────────
const CHART_H = 320;

const ChartPanel: React.FC<{ view: ChartView; analytics: any }> = ({ view, analytics }) => {
  const empty = (msg = 'No data for this period') => (
    <div style={{ height: CHART_H }} className="flex flex-col items-center justify-center gap-2 text-gray-400">
      <AlertCircle size={26} className="opacity-30" />
      <p className="text-sm">{msg}</p>
    </div>
  );

  /* CALL TREND */
  if (view === 'trend') {
    const d = analytics?.dailyTrend ?? [];
    if (!d.length || d.every((r: any) => r.total === 0)) return empty();
    return (
      <div style={{ height: CHART_H }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="connGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 4" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false}
              tick={{ fontSize: 10, fill: '#94A3B8' }} dy={6} interval="preserveStartEnd" />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} dx={-4} />
            <Tooltip content={<CTooltip />} />
            <Legend iconType="circle" iconSize={8}
              formatter={(v: string) => <span className="text-xs text-gray-600">{v}</span>}
              wrapperStyle={{ paddingTop: 8 }} />
            <Area type="monotone" dataKey="total" name="Total Calls"
              stroke="#F59E0B" strokeWidth={2} fill="url(#callGrad)"
              dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="connected" name="Connected"
              stroke="#10B981" strokeWidth={2} fill="url(#connGrad)"
              dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
            <Line type="monotone" dataKey="avgDuration" name="Avg Duration (min)"
              stroke="#6366F1" strokeWidth={1.5} strokeDasharray="5 3"
              dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* OUTCOMES BREAKDOWN */
  if (view === 'outcomes') {
    const d = analytics?.outcomeBreakdown ?? [];
    if (!d.length) return empty('No outcome data logged');
    return (
      <div style={{ height: CHART_H }} className="flex items-center gap-8">
        <div style={{ height: CHART_H, flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={d} cx="50%" cy="50%"
                innerRadius="45%" outerRadius="72%"
                paddingAngle={3} dataKey="count" nameKey="label">
                {d.map((e: any, i: number) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
              </Pie>
              <Tooltip content={<CTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-56 flex-shrink-0 space-y-2.5">
          {d.map((t: any) => (
            <div key={t.outcome} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
              <span className="text-xs text-gray-600 flex-1 truncate">{t.label}</span>
              <span className="text-xs font-bold text-gray-900 tabular-nums">{t.count}</span>
              <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums">{t.pct}%</span>
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

  /* DIRECTION SPLIT */
  if (view === 'direction') {
    const d = analytics?.directionBreakdown ?? [];
    if (!d.length) return empty();
    return (
      <div style={{ height: CHART_H }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 4" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false}
              tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} dy={6} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} dx={-4} />
            <Tooltip content={<CTooltip />} />
            <Bar dataKey="count" name="Calls" radius={[6, 6, 0, 0]} maxBarSize={80}>
              {d.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* DURATION ANALYSIS */
  if (view === 'duration') {
    const dur = analytics?.durationBreakdown ?? [];
    if (!dur.length) return empty('No duration data available');
    return (
      <div style={{ height: CHART_H }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dur} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 4" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false}
              tick={{ fontSize: 10, fill: '#94A3B8' }} dy={6} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} dx={-4} />
            <Tooltip content={<CTooltip />} />
            <Bar dataKey="count" name="Calls" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {dur.map((e: any, i: number) => (
                <Cell key={i} fill={e.count > (dur[0]?.count || 1) * 0.5 ? '#F59E0B' : '#FCD34D'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  /* HEATMAP */
  if (view === 'heatmap') {
    const hourly: any[] = analytics?.hourly ?? [];
    const dow: any[] = analytics?.dow ?? [];
    const maxDow = Math.max(...dow.map((d: any) => d.count), 1);
    return (
      <div style={{ height: CHART_H }} className="flex flex-col gap-4">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            <Clock size={10} className="inline mr-1" />Call Volume by Hour
          </p>
          <div style={{ height: 170 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false}
                  tick={{ fontSize: 9, fill: '#94A3B8' }} interval={2} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8' }} width={22} />
                <Tooltip content={<CTooltip />} />
                <Bar dataKey="count" name="Calls" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            <Calendar size={10} className="inline mr-1" />By Day of Week
          </p>
          <div className="flex gap-2">
            {dow.map((d: any) => {
              const pct = Math.round((d.count / maxDow) * 100);
              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-amber-50 rounded overflow-hidden flex flex-col justify-end" style={{ height: 36 }}>
                    <div className="w-full bg-amber-500 rounded transition-all" style={{ height: `${pct}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-400">{d.label}</span>
                  <span className="text-[9px] font-bold text-amber-600 tabular-nums">{d.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* TEAM COMPARISON */
  if (view === 'team') {
    const emps: any[] = analytics?.byEmployee ?? [];
    if (emps.length < 2) return empty('Need ≥ 2 team members for comparison');
    const radarData = ['connected', 'no_answer', 'left_voicemail', 'interested', 'call_back'].map(outcome => {
      const row: Record<string, any> = { metric: CALL_OUTCOME_CFG[outcome]?.label || outcome };
      emps.slice(0, 5).forEach((e: any) => { row[e.name.split(' ')[0]] = e.outcomes?.[outcome] || 0; });
      return row;
    });
    return (
      <div style={{ height: CHART_H }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#64748B' }} />
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

  return null;
};

// ─────────────────────────────────────────────
// SORT HELPER
// ─────────────────────────────────────────────
function sortList(list: any[], field: SortField, dir: SortDir) {
  return [...list].sort((a, b) => {
    let av: any, bv: any;
    if (field === 'activity_date') { av = a.activity_date; bv = b.activity_date; }
    else if (field === 'title') { av = a.title || ''; bv = b.title || ''; }
    else if (field === 'outcome') { av = a.outcome || ''; bv = b.outcome || ''; }
    else if (field === 'direction') { av = a.direction || ''; bv = b.direction || ''; }
    else if (field === 'duration_minutes') { av = a.duration_minutes || 0; bv = b.duration_minutes || 0; }
    else { av = (a.creator as any)?.first_name || ''; bv = (b.creator as any)?.first_name || ''; }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
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
export const CallAnalyticsReport: React.FC = () => {
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const userRole = useSelector((state: any) => state.auth.role);

  // ── Filters ──
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeChart, setActiveChart] = useState<ChartView>('trend');
  const [outcomeFilter, setOutcomeFilter] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<string | null>(null);

  // ── Table ──
  const [page, setPage] = useState(1);
  const [sortF, setSortF] = useState<SortField>('activity_date');
  const [sortD, setSortD] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState<string | null>(null);
  const PS = 15;

  const isAdmin = useMemo(() => {
    if (typeof userRole !== 'string') return false;
    return userRole.toLowerCase().trim().replace(/\s+/g, '_') === 'organization_superadmin';
  }, [userRole]);

  const df = useMemo(() => ({
    start: dateRange.startDate ? startOfDay(dateRange.startDate).toISOString() : null,
    end: dateRange.endDate ? endOfDay(dateRange.endDate).toISOString() : null,
  }), [dateRange]);

  const cf = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return { start: null, end: null };
    const days = differenceInDays(dateRange.endDate, dateRange.startDate) + 1;
    const pe = subDays(dateRange.startDate, 1);
    return {
      start: startOfDay(subDays(pe, days - 1)).toISOString(),
      end: endOfDay(pe).toISOString(),
    };
  }, [dateRange]);

  // ─── QUERIES ────────────────────────────────
  const { data: teamMembers } = useQuery({
    queryKey: ['call-report-team', organizationId],
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

  const { data: calls, isLoading, refetch } = useQuery({
    queryKey: ['call-report', organizationId, df, selectedEmployee],
    queryFn: async () => {
      let q = supabase
        .from('contact_activities')
        .select(`
          id, type, title, description, outcome, direction,
          activity_date, duration_minutes, priority, status, metadata,
          contact:contact_id(id, name, email, photo_url, companies(name)),
          creator:created_by(id, first_name, last_name, profile_picture_url),
          assignee:assigned_to(id, first_name, last_name, profile_picture_url)
        `)
        .eq('organization_id', organizationId)
        .eq('type', 'call')
        .order('activity_date', { ascending: false });

      if (df.start) q = q.gte('activity_date', df.start);
      if (df.end) q = q.lte('activity_date', df.end);
      if (!isAdmin) q = q.eq('created_by', user?.id);
      else if (selectedEmployee) q = q.eq('created_by', selectedEmployee);

      const { data, error } = await q.limit(3000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organizationId,
  });

  const { data: prevCalls } = useQuery({
    queryKey: ['call-report-prev', organizationId, cf, selectedEmployee],
    queryFn: async () => {
      let q = supabase
        .from('contact_activities')
        .select('type, outcome, duration_minutes')
        .eq('organization_id', organizationId)
        .eq('type', 'call');
      if (cf.start) q = q.gte('activity_date', cf.start);
      if (cf.end) q = q.lte('activity_date', cf.end);
      if (!isAdmin) q = q.eq('created_by', user?.id);
      else if (selectedEmployee) q = q.eq('created_by', selectedEmployee);
      const { data, error } = await q.limit(3000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organizationId && !!cf.start,
  });

  // ─── ANALYTICS ──────────────────────────────
  const callData = useMemo(() => calls ?? [], [calls]);

  const analytics = useMemo(() => {
    if (!callData.length) return null;

    const total = callData.length;
    const prevTotal = prevCalls?.length ?? 0;

    // Connected calls
    const connected = callData.filter(c => c.outcome === 'connected').length;
    const prevConnected = (prevCalls ?? []).filter(c => c.outcome === 'connected').length;

    // Unique contacts
    const uniqueContacts = new Set(callData.map(c => (c.contact as any)?.id).filter(Boolean)).size;

    // Trends
    const totalTrend = prevTotal === 0 ? (total > 0 ? 100 : 0) : Math.round(((total - prevTotal) / prevTotal) * 100);
    const connectTrend = prevConnected === 0 ? (connected > 0 ? 100 : 0) : Math.round(((connected - prevConnected) / prevConnected) * 100);

    // Connect rate
    const connectRate = total > 0 ? Math.round((connected / total) * 100) : 0;

    // Avg duration (for calls with duration)
    const callsWithDuration = callData.filter(c => c.duration_minutes != null);
    const avgDuration = callsWithDuration.length > 0
      ? Math.round((callsWithDuration.reduce((s, c) => s + (c.duration_minutes || 0), 0) / callsWithDuration.length) * 10) / 10
      : 0;
    const totalDuration = callsWithDuration.reduce((s, c) => s + (c.duration_minutes || 0), 0);

    // Daily trend
    const s = dateRange.startDate ?? subDays(new Date(), 29);
    const e = dateRange.endDate ?? new Date();
    const days = eachDayOfInterval({ start: s, end: e });
    const intv = days.length > 60 ? 7 : days.length > 30 ? 3 : 1;

    const dailyTrend = days.map((day, i) => {
      const ds = format(day, 'yyyy-MM-dd');
      const dayCalls = callData.filter(c => format(parseISO(c.activity_date), 'yyyy-MM-dd') === ds);
      const dayWithDur = dayCalls.filter(c => c.duration_minutes != null);
      return {
        label: i % intv === 0 ? format(day, 'MMM d') : '',
        date: ds,
        total: dayCalls.length,
        connected: dayCalls.filter(c => c.outcome === 'connected').length,
        avgDuration: dayWithDur.length > 0
          ? Math.round((dayWithDur.reduce((sum, c) => sum + (c.duration_minutes || 0), 0) / dayWithDur.length) * 10) / 10
          : 0,
      };
    });

    // Outcome breakdown
    const outMap: Record<string, number> = {};
    callData.forEach(c => { const o = c.outcome || 'unknown'; outMap[o] = (outMap[o] || 0) + 1; });
    const outcomeBreakdown = Object.entries(outMap)
      .sort(([, a], [, b]) => b - a)
      .map(([outcome, count]) => ({
        outcome,
        count,
        label: getOutcomeLabel(outcome),
        color: getOutcomeColor(outcome),
        pct: Math.round((count / total) * 100),
      }));

    // Direction breakdown
    const dirMap: Record<string, number> = {};
    callData.forEach(c => { const d = c.direction || 'unknown'; dirMap[d] = (dirMap[d] || 0) + 1; });
    const directionBreakdown = Object.entries(dirMap)
      .sort(([, a], [, b]) => b - a)
      .map(([direction, count]) => ({
        direction,
        count,
        label: DIRECTION_CFG[direction]?.label || direction,
        color: DIRECTION_CFG[direction]?.color || '#94A3B8',
        pct: Math.round((count / total) * 100),
      }));

    // Duration buckets
    const durationBuckets = [
      { min: 0, max: 1, label: '< 1m' },
      { min: 1, max: 3, label: '1-3m' },
      { min: 3, max: 5, label: '3-5m' },
      { min: 5, max: 10, label: '5-10m' },
      { min: 10, max: 15, label: '10-15m' },
      { min: 15, max: 30, label: '15-30m' },
      { min: 30, max: 999, label: '30m+' },
    ];
    const durationBreakdown = durationBuckets.map(bucket => ({
      ...bucket,
      count: callData.filter(c => {
        const d = c.duration_minutes;
        return d != null && d >= bucket.min && d < bucket.max;
      }).length,
    }));

    // Hourly
    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: format(new Date(2024, 0, 1, h), 'ha'),
      count: callData.filter(c => getHours(parseISO(c.activity_date)) === h).length,
    }));

    // Day of week
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, d) => ({
      label,
      count: callData.filter(c => getDay(parseISO(c.activity_date)) === d).length,
    }));

    // By employee
    const empMap: Record<string, any> = {};
    callData.forEach(c => {
      const id = (c.creator as any)?.id || 'unknown';
      if (!empMap[id]) {
        empMap[id] = {
          id,
          avatar: (c.creator as any)?.profile_picture_url,
          name: c.creator ? `${(c.creator as any).first_name} ${(c.creator as any).last_name}` : 'Unknown',
          total: 0,
          connected: 0,
          outcomes: {} as Record<string, number>,
          totalDuration: 0,
          callsWithDuration: 0,
        };
      }
      empMap[id].total++;
      if (c.outcome === 'connected') empMap[id].connected++;
      empMap[id].outcomes[c.outcome || 'unknown'] = (empMap[id].outcomes[c.outcome || 'unknown'] || 0) + 1;
      if (c.duration_minutes != null) {
        empMap[id].totalDuration += c.duration_minutes;
        empMap[id].callsWithDuration++;
      }
    });
    const byEmployee = Object.values(empMap)
      .map((e: any) => ({
        ...e,
        connectRate: e.total > 0 ? Math.round((e.connected / e.total) * 100) : 0,
        avgDuration: e.callsWithDuration > 0
          ? Math.round((e.totalDuration / e.callsWithDuration) * 10) / 10
          : 0,
      }))
      .sort((a: any, b: any) => b.total - a.total);

    return {
      total, totalTrend, connected, connectTrend, connectRate,
      uniqueContacts, avgDuration, totalDuration, dailyTrend,
      outcomeBreakdown, directionBreakdown, durationBreakdown,
      hourly, dow, byEmployee,
    };
  }, [callData, prevCalls, dateRange]);

  // ─── FILTERED TABLE ──────────────────────────
  const filteredCalls = useMemo(() => {
    let list = [...callData];
    if (outcomeFilter) list = list.filter(c => c.outcome === outcomeFilter);
    if (directionFilter) list = list.filter(c => c.direction === directionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        (c.contact as any)?.name?.toLowerCase().includes(q) ||
        (c.creator as any)?.first_name?.toLowerCase().includes(q) ||
        c.outcome?.toLowerCase().includes(q) ||
        c.direction?.toLowerCase().includes(q)
      );
    }
    return sortList(list, sortF, sortD);
  }, [callData, outcomeFilter, directionFilter, search, sortF, sortD]);

  const totalPages = Math.ceil(filteredCalls.length / PS);
  const pagedCalls = filteredCalls.slice((page - 1) * PS, page * PS);

  const handleSort = useCallback((f: SortField) => {
    if (sortF === f) setSortD(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortF(f); setSortD('desc'); }
    setPage(1);
  }, [sortF]);

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
  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── HEADER ─────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl shadow-sm">
              <PhoneCall className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Call Analytics</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {analytics?.total ?? 0} calls · {analytics?.connectRate ?? 0}% connect rate · {analytics?.uniqueContacts ?? 0} contacts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search calls…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 w-48 h-9 text-xs bg-gray-50 border-gray-200" />
            </div>

            <EnhancedDateRangeSelector value={dateRange} onChange={setDateRange} onApply={() => refetch()} />

            {isAdmin && teamMembers && (
              <EmployeeSelector employees={teamMembers} selectedEmployee={selectedEmployee} onSelect={setSelectedEmployee} />
            )}

            <Select value={directionFilter || 'all'} onValueChange={v => { setDirectionFilter(v === 'all' ? null : v); setPage(1); }}>
              <SelectTrigger className="h-9 w-32 text-xs bg-white border-gray-200">
                <Filter size={12} className="mr-1.5 text-gray-400 flex-shrink-0" />
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-gray-200"
              onClick={() => dlCSV(filteredCalls.map(c => ({
                Date: format(parseISO(c.activity_date), 'yyyy-MM-dd HH:mm'),
                Direction: c.direction || '',
                Outcome: getOutcomeLabel(c.outcome),
                Title: c.title || '',
                Contact: (c.contact as any)?.name || '',
                Company: (c.contact as any)?.companies?.name || '',
                Creator: c.creator ? `${(c.creator as any).first_name} ${(c.creator as any).last_name}` : '',
                Duration: c.duration_minutes ? `${c.duration_minutes}m` : '',
              })), `calls-${format(new Date(), 'yyyy-MM-dd')}.csv`)}>
              <Download size={12} />Export
            </Button>

            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => refetch()}>
              <RefreshCw size={13} className="text-gray-400" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">

        {/* ── TOP STAT CARDS ───────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Total Calls" value={analytics?.total?.toLocaleString() ?? '0'}
            icon={Phone} color="#F59E0B" light="#FEF3C7"
            trend={analytics?.totalTrend} delay={0}
          />
          <StatCard
            title="Connected" value={analytics?.connected?.toLocaleString() ?? '0'}
            subtitle={`${analytics?.connectRate ?? 0}% connect rate`}
            icon={PhoneCall} color="#10B981" light="#D1FAE5"
            trend={analytics?.connectTrend} delay={0.07}
            active={outcomeFilter === 'connected'}
            onClick={() => { setOutcomeFilter(outcomeFilter === 'connected' ? null : 'connected'); setPage(1); }}
          />
          <StatCard
            title="Avg Duration" value={analytics?.avgDuration ? `${analytics.avgDuration}m` : '—'}
            subtitle={`${analytics?.totalDuration ?? 0} min total`}
            icon={Timer} color="#6366F1" light="#EEF2FF"
            delay={0.14}
          />
          <StatCard
            title="Unique Contacts" value={analytics?.uniqueContacts?.toLocaleString() ?? '0'}
            subtitle="Distinct contacts reached"
            icon={Users} color="#8B5CF6" light="#EDE9FE"
            delay={0.21}
          />
        </div>

        {/* ── SECONDARY KPI ROW ────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Connect Rate', v: `${analytics?.connectRate ?? 0}%`,
              sub: 'Connected / Total',
              ok: (analytics?.connectRate ?? 0) >= 30,
              icon: Percent, color: '#10B981',
            },
            {
              label: 'No Answer Rate', v: `${analytics ? Math.round(((analytics.outcomeBreakdown?.find(o => o.outcome === 'no_answer')?.count || 0) / analytics.total) * 100) : 0}%`,
              sub: 'Unanswered calls',
              ok: true, icon: PhoneMissed, color: '#F59E0B',
            },
            {
              label: 'Voicemail Left', v: analytics?.outcomeBreakdown?.find(o => o.outcome === 'left_voicemail')?.count || 0,
              sub: 'Messages delivered',
              ok: true, icon: Voicemail, color: '#8B5CF6',
            },
            {
              label: 'Interested', v: analytics?.outcomeBreakdown?.find(o => o.outcome === 'interested')?.count || 0,
              sub: 'Positive responses',
              ok: true, icon: ThumbsUp, color: '#0891B2',
            },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${k.color}14` }}>
                <k.icon size={20} style={{ color: k.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 tabular-nums">{k.v}</p>
                <p className="text-xs text-gray-500 truncate">{k.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{k.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── CHARTS PANEL ─────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="border-b border-gray-100 flex items-center overflow-x-auto">
            {([
              { id: 'trend', label: 'Call Trend', icon: TrendingUp },
              { id: 'outcomes', label: 'Outcomes', icon: PieIcon },
              { id: 'direction', label: 'In/Outbound', icon: PhoneIncoming },
              { id: 'duration', label: 'Duration', icon: Timer },
              { id: 'heatmap', label: 'Heatmap', icon: Clock },
              { id: 'team', label: 'Team Comparison', icon: Users },
            ] as { id: ChartView; label: string; icon: React.FC<any> }[]).map(tab => (
              <button key={tab.id} onClick={() => setActiveChart(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-all',
                  activeChart === tab.id
                    ? 'border-amber-500 text-amber-600 bg-amber-50/40'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/60'
                )}>
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>

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

        {/* ── TEAM PERFORMANCE TABLE ───────────── */}
        {isAdmin && (analytics?.byEmployee || []).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
                <Award size={15} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Team Call Performance</h2>
                <p className="text-xs text-gray-400">{(analytics?.byEmployee || []).length} team members</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-gray-400 font-semibold w-8">#</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-semibold">Member</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-semibold">Calls</th>
                    <th className="text-center px-4 py-3 text-emerald-600 font-semibold">Connected</th>
                    <th className="text-center px-4 py-3 text-indigo-600 font-semibold">Rate</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-semibold">Avg Dur</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-semibold">Total Dur</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.byEmployee || []).map((emp: any, idx: number) => {
                    const mx = (analytics?.byEmployee[0] as any)?.total || 1;
                    const bestConnectRate = Math.max(...(analytics?.byEmployee || []).map((e: any) => e.connectRate), 1);
                    return (
                      <tr key={emp.id} className="border-b border-gray-50 hover:bg-amber-50/15 transition-colors">
                        <td className="px-5 py-3 text-[11px] text-gray-400 font-bold">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarImage src={emp.avatar} />
                              <AvatarFallback className="text-[9px] bg-amber-100 text-amber-700 font-bold">
                                {emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-gray-800">{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-gray-900 tabular-nums">{emp.total}</span>
                            <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${Math.round((emp.total / mx) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-emerald-600 tabular-nums">{emp.connected}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${Math.round((emp.connectRate / bestConnectRate) * 100)}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-indigo-600 tabular-nums w-7">{emp.connectRate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 tabular-nums">
                          {emp.avgDuration > 0 ? `${emp.avgDuration}m` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 tabular-nums">
                          {emp.totalDuration > 0 ? `${emp.totalDuration}m` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── CALL LOG TABLE ───────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <BarChart3 size={15} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Call Log</h2>
                <p className="text-xs text-gray-400">
                  {filteredCalls.length} records
                  {(outcomeFilter || directionFilter) && (
                    <button className="ml-2 text-amber-500 hover:text-amber-700 inline-flex items-center gap-1 text-[10px]"
                      onClick={() => { setOutcomeFilter(null); setDirectionFilter(null); }}>
                      <X size={9} />clear filters
                    </button>
                  )}
                </p>
              </div>
            </div>

            {/* Outcome quick filter pills */}
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(CALL_OUTCOME_CFG).map(([key, cfg]) => {
                const count = analytics?.outcomeBreakdown?.find(o => o.outcome === key)?.count || 0;
                if (count === 0 && outcomeFilter !== key) return null;
                return (
                  <button key={key}
                    onClick={() => { setOutcomeFilter(outcomeFilter === key ? null : key); setPage(1); }}
                    className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all',
                      outcomeFilter === key ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')}
                    style={outcomeFilter === key ? { backgroundColor: cfg.color } : {}}>
                    <cfg.icon size={10} />
                    {cfg.label}
                    <span className={cn('px-1 rounded-full text-[9px]', outcomeFilter === key ? 'bg-white/20' : 'bg-gray-100')}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {([
                    { f: 'activity_date' as SortField, label: 'Date & Time', w: 'w-32' },
                    { f: 'direction' as SortField, label: 'Dir', w: 'w-20' },
                    { f: 'outcome' as SortField, label: 'Outcome', w: 'w-28' },
                    { f: 'title' as SortField, label: 'Activity', w: '' },
                    { f: null, label: 'Contact', w: 'w-40' },
                    { f: 'creator' as SortField, label: 'Rep', w: 'w-28' },
                    { f: 'duration_minutes' as SortField, label: 'Duration', w: 'w-20' },
                    { f: null, label: '', w: 'w-8' },
                  ] as any[]).map((col: any, i: number) => (
                    <th key={i}
                      className={cn('text-left px-4 py-3 font-semibold text-gray-400 select-none', col.w,
                        col.f && 'cursor-pointer hover:text-amber-500')}
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
                {pagedCalls.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Phone size={26} className="opacity-30" />
                        <p className="text-sm font-medium">No calls found</p>
                        <p className="text-xs">Try adjusting filters or date range</p>
                      </div>
                    </td>
                  </tr>
                ) : pagedCalls.map((call: any) => {
                  const outcomeCfg = CALL_OUTCOME_CFG[call.outcome];
                  const directionCfg = DIRECTION_CFG[call.direction];
                  const DirectionIcon = directionCfg?.icon || Phone;
                  const isEx = expanded === call.id;
                  return (
                    <React.Fragment key={call.id}>
                      <tr className={cn('border-b border-gray-50 group hover:bg-amber-50/20 transition-colors',
                        isEx && 'bg-amber-50/25')}>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-gray-700 font-medium">{format(parseISO(call.activity_date), 'MMM d')}</p>
                          <p className="text-gray-400 text-[10px]">{format(parseISO(call.activity_date), 'h:mm a')}</p>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: `${directionCfg?.color || '#94A3B8'}18`,
                              color: directionCfg?.color || '#94A3B8',
                            }}>
                            <DirectionIcon size={10} />
                            {directionCfg?.label || call.direction || '—'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: `${outcomeCfg?.color || '#94A3B8'}18`,
                              color: outcomeCfg?.color || '#94A3B8',
                            }}>
                            {outcomeCfg?.icon && <outcomeCfg.icon size={10} />}
                            {getOutcomeLabel(call.outcome)}
                          </span>
                        </td>

                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-gray-800 font-medium truncate">{call.title || '—'}</p>
                          {call.description && (
                            <p className="text-gray-400 text-[10px] truncate mt-0.5">
                              {stripHtml(call.description).slice(0, 80)}…
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {call.contact ? (
                            <div>
                              <p className="text-gray-700 font-medium truncate max-w-[140px]">
                                {(call.contact as any).name}
                              </p>
                              <p className="text-gray-400 text-[10px] truncate max-w-[140px]">
                                {(call.contact as any)?.companies?.name || (call.contact as any).email || '—'}
                              </p>
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>

                        <td className="px-4 py-3">
                          {call.creator ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 flex-shrink-0">
                                <AvatarImage src={(call.creator as any).profile_picture_url} />
                                <AvatarFallback className="text-[9px] bg-amber-100 text-amber-700 font-bold">
                                  {(call.creator as any).first_name?.[0]}{(call.creator as any).last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-gray-700 truncate max-w-[80px]">{(call.creator as any).first_name}</span>
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>

                        <td className="px-4 py-3 text-gray-600 tabular-nums">
                          {call.duration_minutes ? `${call.duration_minutes}m` : '—'}
                        </td>

                        <td className="px-3 py-3">
                          <button
                            onClick={() => setExpanded(isEx ? null : call.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-amber-100 rounded-lg">
                            {isEx
                              ? <ChevronUp size={13} className="text-amber-500" />
                              : <Eye size={13} className="text-gray-400" />}
                          </button>
                        </td>
                      </tr>

                      <AnimatePresence>
                        {isEx && (
                          <motion.tr key={`ex-${call.id}`}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <td colSpan={8} className="bg-amber-50/40 px-10 py-4 border-b border-amber-100/40">
                              <div className="grid grid-cols-3 gap-6">
                                <div className="col-span-2">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    Description
                                  </p>
                                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {stripHtml(call.description || 'No description provided.')}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Details</p>
                                  {[
                                    { label: 'Direction', value: call.direction },
                                    { label: 'Outcome', value: getOutcomeLabel(call.outcome) },
                                    { label: 'Duration', value: call.duration_minutes ? `${call.duration_minutes} min` : '—' },
                                    call.assignee && {
                                      label: 'Assignee',
                                      value: `${(call.assignee as any).first_name} ${(call.assignee as any).last_name}`,
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
                {(page - 1) * PS + 1}–{Math.min(page * PS, filteredCalls.length)} of {filteredCalls.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}><ChevronLeft size={12} /></Button>
                {pageNums(page, totalPages).map(n => (
                  <Button key={n} variant={page === n ? 'default' : 'outline'} size="sm"
                    className={cn('h-7 w-7 p-0 text-xs', page === n && 'bg-amber-600 text-white border-amber-600')}
                    onClick={() => setPage(n)}>{n}</Button>
                ))}
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}><ChevronRight size={12} /></Button>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default CallAnalyticsReport;