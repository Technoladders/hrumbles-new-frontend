// Hrumbles-Front-End_UI/src/components/reports/RecruiterActivityLogReport.tsx
// Route: /reports?type=recruiter_activity
// Data source: hr_candidate_activities (talent pool recruiter activity log)

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
  parseISO, differenceInDays, eachDayOfInterval, isToday,
} from 'date-fns';
import {
  Phone, Mail, Linkedin, StickyNote, TrendingUp, TrendingDown,
  Users, Filter, Download, RefreshCw, Search, ChevronDown, ChevronUp,
  ChevronsUpDown, BarChart3, PieChart as PieIcon, Activity, Clock,
  Target, Award, Eye, X, ChevronLeft, ChevronRight, AlertCircle,
  MessageSquare, ArrowUpRight, ArrowDownLeft, Tag, User, Calendar,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type SortField  = 'activity_date' | 'type' | 'title' | 'outcome' | 'creator' | 'candidate';
type SortDir    = 'asc' | 'desc';
type ChartView  = 'trend' | 'breakdown' | 'comparison' | 'outcome' | 'heatmap';
type TypeFilter = 'all' | 'call' | 'email' | 'whatsapp' | 'linkedin' | 'note';

// ─── Config ───────────────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, {
  label: string; color: string; light: string;
  icon: React.FC<any>; dot: string;
}> = {
  call:     { label: 'Calls',     color: '#10B981', light: '#D1FAE5', icon: Phone,        dot: 'bg-emerald-500' },
  email:    { label: 'Emails',    color: '#3B82F6', light: '#DBEAFE', icon: Mail,         dot: 'bg-blue-500'    },
  whatsapp: { label: 'WhatsApp',  color: '#22C55E', light: '#DCFCE7', icon: MessageSquare, dot: 'bg-green-500'   },
  linkedin: { label: 'LinkedIn',  color: '#0EA5E9', light: '#E0F2FE', icon: Linkedin,     dot: 'bg-sky-500'     },
  note:     { label: 'Notes',     color: '#8B5CF6', light: '#EDE9FE', icon: StickyNote,   dot: 'bg-violet-500'  },
};

const OUTCOME_COLORS: Record<string, string> = {
  Reached:            '#10B981',
  'No Answer':        '#F59E0B',
  'Left Voicemail':   '#F97316',
  'Callback Requested': '#6366F1',
  'Wrong Number':     '#EF4444',
  Replied:            '#10B981',
  'No Reply':         '#94A3B8',
  Bounced:            '#EF4444',
  'Auto-Reply':       '#F97316',
  Opened:             '#6366F1',
  'Not Opened':       '#94A3B8',
  Seen:               '#10B981',
  Delivered:          '#6366F1',
  'No Response':      '#94A3B8',
  Blocked:            '#EF4444',
  Connected:          '#10B981',
  Accepted:           '#22C55E',
  Pending:            '#8B5CF6',
  Ignored:            '#94A3B8',
  'Not Connected':    '#F59E0B',
};

const RADAR_COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EC4899', '#0A66C2'];

// ─── Date presets ─────────────────────────────────────────────────────────────
const DATE_PRESETS = [
  { label: 'Today',        days: 0 },
  { label: 'Last 7 days',  days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'This month',   days: -1 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const stripHtml = (s: string) => s?.replace(/<[^>]*>/g, '') ?? '';

const dlCSV = (rows: any[], name: string) => {
  if (!rows.length) return;
  const h   = Object.keys(rows[0]);
  const csv = [h.join(','), ...rows.map(r => h.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const a   = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: name,
  });
  a.click();
};

const sortList = (list: any[], field: SortField, dir: SortDir) =>
  [...list].sort((a, b) => {
    let av: any, bv: any;
    if      (field === 'activity_date') { av = a.activity_date; bv = b.activity_date; }
    else if (field === 'type')          { av = a.type; bv = b.type; }
    else if (field === 'title')         { av = a.title || ''; bv = b.title || ''; }
    else if (field === 'outcome')       { av = a.outcome || ''; bv = b.outcome || ''; }
    else if (field === 'candidate')     { av = a.candidate?.candidate_name || ''; bv = b.candidate?.candidate_name || ''; }
    else { av = a.creator?.first_name || ''; bv = b.creator?.first_name || ''; }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ?  1 : -1;
    return 0;
  });

const pageNums = (cur: number, total: number, max = 7) => {
  const count = Math.min(total, max);
  const start = total <= max ? 1
    : cur <= Math.ceil(max / 2) ? 1
    : cur >= total - Math.floor(max / 2) ? total - max + 1
    : cur - Math.floor(max / 2);
  return Array.from({ length: count }, (_, i) => start + i);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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

const SIcon: React.FC<{ f: SortField; a: SortField; d: SortDir }> = ({ f, a, d }) => {
  if (a !== f) return <ChevronsUpDown size={11} className="text-gray-300" />;
  return d === 'asc' ? <ChevronUp size={11} className="text-violet-500" /> : <ChevronDown size={11} className="text-violet-500" />;
};

// WhatsApp SVG icon
const WAIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={cn('fill-current', className)}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TypeIcon: React.FC<{ type: string; size?: number }> = ({ type, size = 14 }) => {
  if (type === 'call')     return <Phone size={size} />;
  if (type === 'email')    return <Mail size={size} />;
  if (type === 'whatsapp') return <WAIcon size={size} />;
  if (type === 'linkedin') return <Linkedin size={size} />;
  return <StickyNote size={size} />;
};

// ─── Chart Panel ──────────────────────────────────────────────────────────────
const CHART_H = 300;

const ChartPanel: React.FC<{ view: ChartView; analytics: any }> = ({ view, analytics }) => {
  const empty = (msg = 'No data for this period') => (
    <div style={{ height: CHART_H }} className="flex flex-col items-center justify-center gap-2 text-gray-400">
      <AlertCircle size={26} className="opacity-30" />
      <p className="text-sm">{msg}</p>
    </div>
  );

  if (view === 'trend') {
    const d = analytics?.dailyTrend ?? [];
    if (!d.length || d.every((r: any) => r.total === 0)) return empty();
    return (
      <div style={{ height: CHART_H }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={d} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              {Object.entries(TYPE_CFG).map(([type, cfg]) => (
                <linearGradient key={type} id={`ra-lg-${type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={cfg.color} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 4" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} dy={6} interval="preserveStartEnd" />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} dx={-4} />
            <Tooltip content={<CTooltip />} />
            <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span className="text-xs text-gray-600">{v}</span>} wrapperStyle={{ paddingTop: 8 }} />
            {Object.entries(TYPE_CFG).map(([type, cfg]) => (
              <Area key={type} type="monotone" dataKey={type} name={cfg.label}
                stroke={cfg.color} strokeWidth={2} fill={`url(#ra-lg-${type})`}
                dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (view === 'breakdown') {
    const d = (analytics?.typeBreakdown ?? []).filter((t: any) => t.count > 0);
    if (!d.length) return empty();
    return (
      <div style={{ height: CHART_H }} className="flex items-center gap-8">
        <div style={{ height: CHART_H, flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={d} cx="50%" cy="50%" innerRadius="50%" outerRadius="76%" paddingAngle={3} dataKey="count" nameKey="label">
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

  if (view === 'comparison') {
    const emps: any[] = analytics?.byEmployee ?? [];
    if (emps.length < 2) return empty('Need ≥ 2 recruiters for comparison');
    const rd = ['call', 'email', 'whatsapp', 'linkedin', 'note'].map(type => {
      const row: Record<string, any> = { metric: TYPE_CFG[type]?.label };
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
            <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span className="text-xs text-gray-600">{v}</span>} />
            <Tooltip content={<CTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (view === 'outcome') {
    const d = analytics?.outcomeBreakdown ?? [];
    if (!d.length) return empty('No outcome data logged');
    return (
      <div style={{ height: CHART_H }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d} layout="vertical" margin={{ left: 8, right: 48, top: 6, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
            <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} width={140} />
            <Tooltip content={<CTooltip />} />
            <Bar dataKey="count" name="Activities" radius={[0, 6, 6, 0]} maxBarSize={24}
              label={{ position: 'right', fontSize: 10, fill: '#6B7280', fontWeight: 700 }}>
              {d.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (view === 'heatmap') {
    const hourly: any[] = analytics?.hourly ?? [];
    const dow:    any[] = analytics?.dow    ?? [];
    const maxDow = Math.max(...dow.map((d: any) => d.count), 1);
    return (
      <div style={{ height: CHART_H }} className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Activity by Hour of Day</p>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8' }} interval={2} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8' }} width={22} />
                <Tooltip content={<CTooltip />} />
                <Bar dataKey="count" name="Activities" fill="#8B5CF6" radius={[3, 3, 0, 0]} maxBarSize={18} />
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
                  <div className="w-full bg-violet-50 rounded overflow-hidden flex flex-col justify-end" style={{ height: 36 }}>
                    <div className="w-full bg-violet-500 rounded transition-all" style={{ height: `${pct}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-400">{d.label}</span>
                  <span className="text-[9px] font-bold text-violet-600">{d.count}</span>
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

// ─── Main Component ───────────────────────────────────────────────────────────
const RecruiterActivityLogReport: React.FC = () => {
  const user           = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const userRole       = useSelector((state: any) => state.auth.role);

  const isAdmin = useMemo(() => {
    if (typeof userRole !== 'string') return false;
    return ['organization_superadmin', 'admin'].includes(userRole.toLowerCase().trim().replace(/\s+/g, '_'));
  }, [userRole]);

  // ── Date range state ──────────────────────────────────────────────────────
  const [preset,     setPreset]     = useState('Last 30 days');
  const [dateRange,  setDateRange]  = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end:   endOfMonth(new Date()),
  });

  const applyPreset = (p: string) => {
    setPreset(p);
    const now = new Date();
    if (p === 'Today')        { setDateRange({ start: startOfDay(now),             end: endOfDay(now) }); }
    else if (p === 'Last 7 days')  { setDateRange({ start: startOfDay(subDays(now, 6)), end: endOfDay(now) }); }
    else if (p === 'Last 30 days') { setDateRange({ start: startOfDay(subDays(now, 29)), end: endOfDay(now) }); }
    else if (p === 'This month')   { setDateRange({ start: startOfMonth(now),           end: endOfMonth(now) }); }
  };

  // ── Filters / table state ─────────────────────────────────────────────────
  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>('all');
  const [statFilter,  setStatFilter]  = useState<string | null>(null);
  const [recruiterFilter, setRecruiterFilter] = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [activeChart, setActiveChart] = useState<ChartView>('trend');
  const [page,        setPage]        = useState(1);
  const [sortF,       setSortF]       = useState<SortField>('activity_date');
  const [sortD,       setSortD]       = useState<SortDir>('desc');
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const PS = 15;

  const df = useMemo(() => ({
    start: startOfDay(dateRange.start).toISOString(),
    end:   endOfDay(dateRange.end).toISOString(),
  }), [dateRange]);

  const prevDf = useMemo(() => {
    const days = differenceInDays(dateRange.end, dateRange.start) + 1;
    const pe   = subDays(dateRange.start, 1);
    return {
      start: startOfDay(subDays(pe, days - 1)).toISOString(),
      end:   endOfDay(pe).toISOString(),
    };
  }, [dateRange]);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: recruiters } = useQuery({
    queryKey: ['ra-recruiters', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('user_id, first_name, last_name, profile_picture_url')
        .eq('organization_id', organizationId)
        .not('user_id', 'is', null);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organizationId && isAdmin,
  });

  const { data: allActs, isLoading, refetch } = useQuery({
    queryKey: ['ra-activities', organizationId, df, recruiterFilter, isAdmin, user?.id],
    queryFn: async () => {
      let q = supabase
        .from('hr_candidate_activities')
        .select(`
          id, type, title, description, description_html,
          outcome, direction, duration_minutes, activity_date,
          metadata, created_at,
          candidate:hr_talent_pool!hr_candidate_activities_candidate_id_fkey(
            id, candidate_name, email, current_company, current_designation
          ),
          creator:hr_employees!hr_candidate_activities_created_by_fkey(
            user_id, first_name, last_name, profile_picture_url
          )
        `)
        .eq('organization_id', organizationId)
        .gte('activity_date', df.start)
        .lte('activity_date', df.end)
        .order('activity_date', { ascending: false });

      if (!isAdmin) q = q.eq('created_by', user?.id);
      else if (recruiterFilter) q = q.eq('created_by', recruiterFilter);

      const { data, error } = await q.limit(3000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organizationId,
  });

  const { data: prevActs } = useQuery({
    queryKey: ['ra-activities-prev', organizationId, prevDf, recruiterFilter, isAdmin, user?.id],
    queryFn: async () => {
      let q = supabase
        .from('hr_candidate_activities')
        .select('type')
        .eq('organization_id', organizationId)
        .gte('activity_date', prevDf.start)
        .lte('activity_date', prevDf.end);
      if (!isAdmin) q = q.eq('created_by', user?.id);
      else if (recruiterFilter) q = q.eq('created_by', recruiterFilter);
      const { data, error } = await q.limit(3000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organizationId,
  });

  // ── Analytics ─────────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const acts = allActs ?? [];
    if (!acts.length) return null;

    const counts: Record<string, number> = {};
    acts.forEach((a: any) => { counts[a.type] = (counts[a.type] || 0) + 1; });

    const prevCounts: Record<string, number> = {};
    (prevActs ?? []).forEach((a: any) => { prevCounts[a.type] = (prevCounts[a.type] || 0) + 1; });

    const getTrend = (type: string) => {
      const c = counts[type] || 0, p = prevCounts[type] || 0;
      return p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100);
    };

    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const intv = days.length > 60 ? 7 : days.length > 30 ? 3 : 1;

    const dailyTrend = days.map((day, i) => {
      const ds = format(day, 'yyyy-MM-dd');
      const da = acts.filter((a: any) => format(parseISO(a.activity_date), 'yyyy-MM-dd') === ds);
      return {
        label:    i % intv === 0 ? format(day, 'MMM d') : '',
        date:     ds,
        total:    da.length,
        call:     da.filter((a: any) => a.type === 'call').length,
        email:    da.filter((a: any) => a.type === 'email').length,
        whatsapp: da.filter((a: any) => a.type === 'whatsapp').length,
        linkedin: da.filter((a: any) => a.type === 'linkedin').length,
        note:     da.filter((a: any) => a.type === 'note').length,
      };
    });

    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h, label: format(new Date(2024, 0, 1, h), 'ha'),
      count: acts.filter((a: any) => parseISO(a.activity_date).getHours() === h).length,
    }));

    const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label, d) => ({
      label, count: acts.filter((a: any) => parseISO(a.activity_date).getDay() === d).length,
    }));

    const empMap: Record<string, any> = {};
    acts.forEach((a: any) => {
      const id = a.creator?.user_id || 'unknown';
      if (!empMap[id]) empMap[id] = {
        id, avatar: a.creator?.profile_picture_url,
        name: a.creator ? `${a.creator.first_name} ${a.creator.last_name}` : 'Unknown',
        total: 0, call: 0, email: 0, whatsapp: 0, linkedin: 0, note: 0,
      };
      empMap[id].total++;
      empMap[id][a.type] = (empMap[id][a.type] || 0) + 1;
    });
    const byEmployee = Object.values(empMap).sort((a: any, b: any) => b.total - a.total);

    const typeBreakdown = Object.entries(TYPE_CFG).map(([type, cfg]) => ({
      type, label: cfg.label, color: cfg.color,
      count: counts[type] || 0,
      pct: acts.length > 0 ? Math.round(((counts[type] || 0) / acts.length) * 100) : 0,
    }));

    const outMap: Record<string, number> = {};
    acts.forEach((a: any) => { if (a.outcome) outMap[a.outcome] = (outMap[a.outcome] || 0) + 1; });
    const outcomeBreakdown = Object.entries(outMap)
      .sort(([, a], [, b]) => b - a)
      .map(([outcome, count]) => ({
        outcome, count,
        label: outcome,
        color: OUTCOME_COLORS[outcome] || '#94A3B8',
      }));

    const total = acts.length;
    const prevTotal = prevActs?.length ?? 0;
    const totalTrend = prevTotal === 0 ? (total > 0 ? 100 : 0) : Math.round(((total - prevTotal) / prevTotal) * 100);
    const avgPerDay = days.length > 0 ? Math.round(total / days.length) : 0;
    const uniqueCandidates = new Set(acts.map((a: any) => a.candidate?.id).filter(Boolean)).size;

    return { total, totalTrend, counts, getTrend, dailyTrend, hourly, dow,
             byEmployee, typeBreakdown, outcomeBreakdown, avgPerDay, uniqueCandidates };
  }, [allActs, prevActs, dateRange]);

  // ── Filtered table data ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...(allActs ?? [])];
    if (statFilter || typeFilter !== 'all')
      list = list.filter((a: any) => a.type === (statFilter || typeFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a: any) =>
        a.title?.toLowerCase().includes(q) ||
        a.candidate?.candidate_name?.toLowerCase().includes(q) ||
        a.creator?.first_name?.toLowerCase().includes(q) ||
        a.outcome?.toLowerCase().includes(q)
      );
    }
    return sortList(list, sortF, sortD);
  }, [allActs, statFilter, typeFilter, search, sortF, sortD]);

  const totalPages = Math.ceil(filtered.length / PS);
  const paged      = filtered.slice((page - 1) * PS, page * PS);

  const handleSort = useCallback((f: SortField) => {
    if (sortF === f) setSortD(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortF(f); setSortD('desc'); }
    setPage(1);
  }, [sortF]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6 space-y-6">
        <Skeleton className="h-16 rounded-2xl" />
        <div className="grid grid-cols-5 gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        <Skeleton className="h-[380px] rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Recruiter Activity Report</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {analytics?.total ?? 0} activities · {analytics?.uniqueCandidates ?? 0} candidates reached
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 w-44 h-9 text-xs bg-gray-50 border-gray-200" />
            </div>

            {/* Date presets */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {DATE_PRESETS.map(p => (
                <button key={p.label} onClick={() => applyPreset(p.label)}
                  className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                    preset === p.label ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Recruiter filter (admin) */}
            {isAdmin && recruiters && (
              <Select value={recruiterFilter ?? 'all'} onValueChange={v => { setRecruiterFilter(v === 'all' ? null : v); setPage(1); }}>
                <SelectTrigger className="h-9 w-44 text-xs bg-white border-gray-200">
                  <User size={12} className="mr-1.5 text-gray-400 flex-shrink-0" />
                  <SelectValue placeholder="All Recruiters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Recruiters</SelectItem>
                  {recruiters.map((r: any) => (
                    <SelectItem key={r.user_id} value={r.user_id}>
                      {r.first_name} {r.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Type filter */}
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v as TypeFilter); setStatFilter(null); setPage(1); }}>
              <SelectTrigger className="h-9 w-36 text-xs bg-white border-gray-200">
                <Filter size={12} className="mr-1.5 text-gray-400 flex-shrink-0" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TYPE_CFG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Export */}
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-gray-200"
              onClick={() => dlCSV(filtered.map((a: any) => ({
                Date:        format(parseISO(a.activity_date), 'yyyy-MM-dd HH:mm'),
                Type:        a.type,
                Title:       a.title || '',
                Candidate:   a.candidate?.candidate_name || '',
                Company:     a.candidate?.current_company || '',
                Recruiter:   a.creator ? `${a.creator.first_name} ${a.creator.last_name}` : '',
                Outcome:     a.outcome || '',
                Direction:   a.direction || '',
                Duration:    a.duration_minutes ? `${a.duration_minutes}m` : '',
                Notes:       stripHtml(a.description || ''),
              })), `recruiter-activity-${format(new Date(), 'yyyy-MM-dd')}.csv`)}>
              <Download size={12} /> Export CSV
            </Button>

            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => refetch()}>
              <RefreshCw size={13} className="text-gray-400" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {Object.entries(TYPE_CFG).map(([type, cfg], i) => (
            <StatCard key={type}
              title={cfg.label}
              value={(analytics?.counts[type] || 0).toLocaleString()}
              icon={type === 'whatsapp' ? (() => <WAIcon size={18} />) : cfg.icon}
              color={cfg.color} light={cfg.light}
              trend={analytics?.getTrend(type)}
              delay={i * 0.07}
              active={statFilter === type}
              onClick={() => { setStatFilter(statFilter === type ? null : type); setTypeFilter('all'); setPage(1); }}
            />
          ))}
        </div>

        {/* ── KPI ROW ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Activities', v: (analytics?.total || 0).toLocaleString(),
              sub: `${(analytics?.totalTrend ?? 0) >= 0 ? '+' : ''}${analytics?.totalTrend ?? 0}% vs prior period`,
              ok: (analytics?.totalTrend ?? 0) >= 0, icon: Activity, color: '#8B5CF6' },
            { label: 'Avg / Day', v: analytics?.avgPerDay ?? 0,
              sub: `${analytics?.dailyTrend?.filter((d: any) => d.total > 0).length ?? 0} active days`,
              ok: true, icon: Clock, color: '#10B981' },
            { label: 'Candidates Reached', v: analytics?.uniqueCandidates ?? 0,
              sub: 'Unique candidates this period', ok: true, icon: Users, color: '#F59E0B' },
            { label: 'Recruiters Active', v: analytics?.byEmployee?.length ?? 0,
              sub: 'Members with logged activities', ok: true, icon: Award, color: '#0EA5E9' },
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

        {/* ── CHARTS ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 flex items-center overflow-x-auto">
            {([
              { id: 'trend',      label: 'Activity Trend',  icon: TrendingUp },
              { id: 'breakdown',  label: 'Type Breakdown',  icon: PieIcon    },
              { id: 'comparison', label: 'Team Comparison', icon: Users      },
              { id: 'outcome',    label: 'Outcomes',        icon: Target     },
              { id: 'heatmap',    label: 'Time Heatmap',    icon: Clock      },
            ] as { id: ChartView; label: string; icon: React.FC<any> }[]).map(tab => (
              <button key={tab.id} onClick={() => setActiveChart(tab.id)}
                className={cn('flex items-center gap-1.5 px-5 py-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-all',
                  activeChart === tab.id
                    ? 'border-violet-500 text-violet-600 bg-violet-50/40'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/60')}>
                <tab.icon size={13} />{tab.label}
              </button>
            ))}
          </div>
          <div className="px-5 py-5">
            <AnimatePresence mode="wait">
              <motion.div key={activeChart} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                <ChartPanel view={activeChart} analytics={analytics} />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── TEAM BREAKDOWN ── */}
        {isAdmin && (analytics?.byEmployee || []).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                <Award size={15} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Recruiter Performance Breakdown</h2>
                <p className="text-xs text-gray-400">{(analytics?.byEmployee || []).length} active recruiters this period</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-gray-400 font-semibold w-8">#</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-semibold">Recruiter</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-semibold">Total</th>
                    {Object.entries(TYPE_CFG).map(([t, c]) => (
                      <th key={t} className="text-center px-4 py-3 font-semibold" style={{ color: c.color }}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.byEmployee || []).map((emp: any, idx: number) => {
                    const mx = (analytics?.byEmployee[0] as any)?.total || 1;
                    return (
                      <tr key={emp.id} className="border-b border-gray-50 hover:bg-violet-50/15 transition-colors">
                        <td className="px-5 py-3 text-[11px] text-gray-400 font-bold">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarImage src={emp.avatar} />
                              <AvatarFallback className="text-[9px] bg-violet-100 text-violet-700 font-bold">
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
                              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.round((emp.total / mx) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        {Object.entries(TYPE_CFG).map(([type, cfg]) => (
                          <td key={type} className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold"
                              style={emp[type] > 0 ? { backgroundColor: `${cfg.color}18`, color: cfg.color } : { color: '#D1D5DB' }}>
                              {emp[type] || 0}
                            </span>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── ACTIVITY LOG TABLE ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                <BarChart3 size={15} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Activity Log
                  <span className="ml-1.5 text-xs font-normal text-gray-400">Calls · Emails · WhatsApp · LinkedIn · Notes</span>
                </h2>
                <p className="text-xs text-gray-400">
                  {filtered.length} records
                  {statFilter && (
                    <button className="ml-2 text-violet-500 hover:text-violet-700 inline-flex items-center gap-1 text-[10px]"
                      onClick={() => setStatFilter(null)}><X size={9} />clear filter</button>
                  )}
                </p>
              </div>
            </div>
            {/* Type pills */}
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(TYPE_CFG).map(([type, cfg]) => (
                <button key={type}
                  onClick={() => { setStatFilter(statFilter === type ? null : type); setTypeFilter('all'); setPage(1); }}
                  className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all',
                    statFilter === type ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')}
                  style={statFilter === type ? { backgroundColor: cfg.color } : {}}>
                  {type === 'whatsapp' ? <WAIcon size={10} /> : <cfg.icon size={10} />}
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
                    { f: 'candidate'     as SortField, label: 'Candidate',    w: 'w-44' },
                    { f: 'creator'       as SortField, label: 'Recruiter',    w: 'w-28' },
                    { f: 'outcome'       as SortField, label: 'Outcome',      w: 'w-32' },
                    { f: null,                          label: 'Direction',    w: 'w-20' },
                    { f: null,                          label: '',             w: 'w-8'  },
                  ] as any[]).map((col: any, i: number) => (
                    <th key={i}
                      className={cn('text-left px-4 py-3 font-semibold text-gray-400 select-none', col.w,
                        col.f && 'cursor-pointer hover:text-violet-500')}
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
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle size={26} className="opacity-30" />
                        <p className="text-sm font-medium">No activities found</p>
                        <p className="text-xs">Try adjusting filters or date range</p>
                      </div>
                    </td>
                  </tr>
                ) : paged.map((act: any) => {
                  const cfg  = TYPE_CFG[act.type];
                  const isEx = expanded === act.id;
                  const isOut = ['outbound', 'sent'].includes((act.direction ?? '').toLowerCase());

                  return (
                    <React.Fragment key={act.id}>
                      <tr className={cn('border-b border-gray-50 group hover:bg-violet-50/20 transition-colors', isEx && 'bg-violet-50/25')}>

                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-gray-700 font-medium">{format(parseISO(act.activity_date), 'MMM d')}</p>
                          <p className="text-gray-400 text-[10px]">{format(parseISO(act.activity_date), 'h:mm a')}</p>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                            style={{ backgroundColor: `${cfg?.color}18`, color: cfg?.color }}>
                            <TypeIcon type={act.type} size={10} />
                            {cfg?.label}
                          </span>
                        </td>

                        {/* Title */}
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-gray-800 font-medium truncate">{act.title || '—'}</p>
                          {act.description && (
                            <p className="text-gray-400 text-[10px] truncate mt-0.5">
                              {stripHtml(act.description).slice(0, 80)}…
                            </p>
                          )}
                          {act.metadata?.tag && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-violet-500 mt-0.5">
                              <Tag size={9} />{act.metadata.tag}
                            </span>
                          )}
                        </td>

                        {/* Candidate */}
                        <td className="px-4 py-3">
                          {act.candidate ? (
                            <div>
                              <p className="text-gray-700 font-medium truncate max-w-[160px]">{act.candidate.candidate_name}</p>
                              <p className="text-gray-400 text-[10px] truncate max-w-[160px]">
                                {act.candidate.current_company || act.candidate.email || '—'}
                              </p>
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Recruiter */}
                        <td className="px-4 py-3">
                          {act.creator ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 flex-shrink-0">
                                <AvatarImage src={act.creator.profile_picture_url} />
                                <AvatarFallback className="text-[9px] bg-violet-100 text-violet-700 font-bold">
                                  {act.creator.first_name?.[0]}{act.creator.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-gray-700 truncate max-w-[80px]">{act.creator.first_name}</span>
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Outcome */}
                        <td className="px-4 py-3">
                          {act.outcome ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{ backgroundColor: `${OUTCOME_COLORS[act.outcome] || '#94A3B8'}18`, color: OUTCOME_COLORS[act.outcome] || '#94A3B8' }}>
                              {act.outcome}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Direction */}
                        <td className="px-4 py-3">
                          {act.direction && act.type !== 'note' ? (
                            <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-medium',
                              isOut ? 'text-orange-500' : 'text-cyan-600')}>
                              {isOut ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                              {act.direction.charAt(0).toUpperCase() + act.direction.slice(1)}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>

                        {/* Expand */}
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setExpanded(isEx ? null : act.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-violet-100 rounded-lg">
                            {isEx ? <ChevronUp size={13} className="text-violet-500" /> : <Eye size={13} className="text-gray-400" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      <AnimatePresence>
                        {isEx && (
                          <motion.tr key={`ex-${act.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <td colSpan={8} className="bg-violet-50/40 px-10 py-4 border-b border-violet-100/40">
                              <div className="grid grid-cols-3 gap-6">
                                <div className="col-span-2">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Notes / Content</p>
                                  {act.description_html ? (
                                    <div className="prose prose-xs max-w-none text-xs text-gray-700 leading-relaxed"
                                      dangerouslySetInnerHTML={{ __html: act.description_html }} />
                                  ) : (
                                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                      {stripHtml(act.description || 'No notes provided.')}
                                    </p>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Details</p>
                                  {[
                                    act.duration_minutes && { label: 'Duration', value: `${act.duration_minutes} min` },
                                    act.metadata?.activityType && { label: 'LinkedIn Type', value: act.metadata.activityType },
                                    act.metadata?.subject && { label: 'Subject', value: act.metadata.subject },
                                    act.metadata?.tag && { label: 'Tag', value: act.metadata.tag },
                                  ].filter(Boolean).map((row: any) => (
                                    <div key={row.label} className="flex justify-between text-xs gap-2">
                                      <span className="text-gray-400">{row.label}</span>
                                      <span className="text-gray-700 font-medium">{row.value}</span>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/40">
              <p className="text-xs text-gray-400">
                {(page - 1) * PS + 1}–{Math.min(page * PS, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}><ChevronLeft size={12} /></Button>
                {pageNums(page, totalPages).map(n => (
                  <Button key={n} variant={page === n ? 'default' : 'outline'} size="sm"
                    className={cn('h-7 w-7 p-0 text-xs', page === n && 'bg-violet-600 text-white border-violet-600')}
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

export default RecruiterActivityLogReport;