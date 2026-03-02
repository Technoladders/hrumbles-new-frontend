// src/pages/reports/CreditUsageReport.tsx
// ============================================================================
// GLOBAL SUPERADMIN — Credit Usage Report
//
// Shows credit consumption across all organizations with:
//   - Summary stat cards (total consumed, enrichment vs verification)
//   - Daily usage trend chart (stacked bar: enrichment + verification)
//   - Enrichment type breakdown donut
//   - Organization table with usage breakdown
//   - Expandable rows → per-user usage within each org
//   - Date range filter + category filter
//
// Route: /reports/credit-usage
// ============================================================================

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link as RouterLink } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid, Area, AreaChart
} from 'recharts';
import moment from 'moment';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Icons
import {
  ArrowLeft, Coins, TrendingDown, Building2, Users,
  ChevronDown, ChevronRight, Mail, Phone, Search, Sparkles,
  Shield, Calendar, Filter, Download, RefreshCw, Loader2,
  BarChart3, Activity, Zap, Globe
} from 'lucide-react';

// ── Styles ──────────────────────────────────────────────────────────────────

const COLORS = {
  enrichment: '#6366f1',   // indigo
  verification: '#f59e0b', // amber
  email: '#3b82f6',        // blue
  phone: '#10b981',        // emerald
  company: '#8b5cf6',      // violet
  companySearch: '#f97316', // orange
  bg: '#FAFAF9',
  card: '#FFFFFF',
  border: '#E7E5E4',
  text: '#1C1917',
  textMuted: '#78716C',
  accent: '#6366f1',
};

const PIE_COLORS =[COLORS.email, COLORS.phone, COLORS.company, COLORS.companySearch];

// ── Helpers ─────────────────────────────────────────────────────────────────

const formatCredits = (val: number) => {
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toFixed(val % 1 === 0 ? 0 : 2)}`;
};

const formatNumber = (val: number) => {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return String(val);
};

const ENRICHMENT_LABELS: Record<string, string> = {
  contact_email_reveal: 'Email Reveals',
  contact_phone_reveal: 'Phone Reveals',
  company_enrich: 'Company Enrich',
  company_search: 'Company Search',
};

// ── Date presets ────────────────────────────────────────────────────────────

const DATE_PRESETS =[
  { label: 'Last 7 days', value: '7d', start: () => moment().subtract(7, 'days').startOf('day').toISOString(), end: () => moment().endOf('day').toISOString() },
  { label: 'Last 30 days', value: '30d', start: () => moment().subtract(30, 'days').startOf('day').toISOString(), end: () => moment().endOf('day').toISOString() },
  { label: 'Last 90 days', value: '90d', start: () => moment().subtract(90, 'days').startOf('day').toISOString(), end: () => moment().endOf('day').toISOString() },
  { label: 'This month', value: 'month', start: () => moment().startOf('month').toISOString(), end: () => moment().endOf('day').toISOString() },
  { label: 'Last month', value: 'lastMonth', start: () => moment().subtract(1, 'month').startOf('month').toISOString(), end: () => moment().subtract(1, 'month').endOf('month').toISOString() },
  { label: 'All time', value: 'all', start: () => moment('2020-01-01').toISOString(), end: () => moment().endOf('day').toISOString() },
];

// ── Stat Card ───────────────────────────────────────────────────────────────

const StatCard = ({ title, value, subtitle, icon, color }: {
  title: string; value: string; subtitle?: string; icon: React.ReactNode; color: string;
}) => (
  <Card className="border-stone-200 bg-white shadow-sm hover:shadow-md transition-shadow">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-stone-900">{value}</p>
          {subtitle && <p className="text-[11px] text-stone-500">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

// ── User Row (inside expanded org) ──────────────────────────────────────────

const UserUsageRow = ({ user }: { user: any }) => (
  <TableRow className="hover:bg-stone-50 border-b border-stone-100 last:border-b-0">
    <TableCell className="w-8 pl-4">
      {user.profile_picture_url ? (
        <img src={user.profile_picture_url} alt="" className="w-7 h-7 rounded-full object-cover border border-stone-200" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-600 border border-indigo-200">
          {user.user_name?.charAt(0)?.toUpperCase() || '?'}
        </div>
      )}
    </TableCell>

    <TableCell>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-stone-800 truncate">{user.user_name}</p>
        <p className="text-[10px] text-stone-400 truncate">{user.user_email}</p>
      </div>
    </TableCell>

    <TableCell className="text-right text-xs text-stone-400">—</TableCell>

    <TableCell className="text-right">
      <span className="text-sm font-bold text-stone-900">₹{Number(user.total_consumed || 0).toFixed(2)}</span>
    </TableCell>

    <TableCell>
      <div className="flex items-center gap-1.5 flex-wrap">
        {user.email_reveals > 0 && (
          <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200 py-0">
            <Mail size={8} className="mr-0.5" />{user.email_reveals}
          </Badge>
        )}
        {user.phone_reveals > 0 && (
          <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-600 border-emerald-200 py-0">
            <Phone size={8} className="mr-0.5" />{user.phone_reveals}
          </Badge>
        )}
        {user.company_enriches > 0 && (
          <Badge variant="outline" className="text-[9px] bg-violet-50 text-violet-600 border-violet-200 py-0">
            <Building2 size={8} className="mr-0.5" />{user.company_enriches}
          </Badge>
        )}
        {user.company_searches > 0 && (
          <Badge variant="outline" className="text-[9px] bg-orange-50 text-orange-600 border-orange-200 py-0">
            <Search size={8} className="mr-0.5" />{user.company_searches}
          </Badge>
        )}
        {user.verification_checks > 0 && (
          <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-600 border-amber-200 py-0">
            <Shield size={8} className="mr-0.5" />{user.verification_checks}
          </Badge>
        )}
      </div>
    </TableCell>

    <TableCell className="text-right text-[11px] text-stone-500">
      {user.total_transactions || 0} txns
    </TableCell>

    <TableCell className="text-right pr-4 text-xs text-stone-400">—</TableCell>
  </TableRow>
);

// ── Organization Row (expandable) ───────────────────────────────────────────

const OrgRow = ({ org, startDate, endDate }: { org: any; startDate: string; endDate: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: users =[], isLoading: usersLoading } = useQuery({
    queryKey:['credit-usage-users', org.organization_id, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_credit_usage_by_user', {
        p_org_id: org.organization_id,
        p_start_date: startDate,
        p_end_date: endDate
      });
      if (error) throw error;
      return data ||[];
    },
    enabled: isOpen
  });

  const totalConsumed = Number(org.total_consumed) || 0;
  const enrichmentUsed = Number(org.enrichment_used) || 0;
  const verificationUsed = Number(org.verification_used) || 0;
  const enrichPct = totalConsumed > 0 ? (enrichmentUsed / totalConsumed) * 100 : 0;

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-stone-50 transition-colors group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="w-8 pl-4">
          <div className="text-stone-400 group-hover:text-stone-600 transition-colors">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-[11px] font-bold text-stone-600 border border-stone-200">
              {org.organization_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <RouterLink
                to={`/organization/${org.organization_id}`}
                className="text-sm font-semibold text-stone-800 hover:text-indigo-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {org.organization_name}
              </RouterLink>
              <p className="text-[10px] text-stone-400">
                {org.active_users} user{Number(org.active_users) !== 1 ? 's' : ''} active
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <span className="text-sm font-bold text-stone-800">₹{Number(org.credit_balance).toFixed(2)}</span>
        </TableCell>
        <TableCell className="text-right">
          <span className="text-sm font-bold text-stone-900">₹{totalConsumed.toFixed(2)}</span>
        </TableCell>
        <TableCell className="w-[160px]">
          {/* Stacked progress bar */}
          <div className="w-full">
            <div className="flex h-2 rounded-full overflow-hidden bg-stone-100">
              {enrichmentUsed > 0 && (
                <div
                  className="bg-indigo-500 transition-all"
                  style={{ width: `${enrichPct}%` }}
                  title={`Enrichment: ₹${enrichmentUsed.toFixed(2)}`}
                />
              )}
              {verificationUsed > 0 && (
                <div
                  className="bg-amber-400 transition-all"
                  style={{ width: `${100 - enrichPct}%` }}
                  title={`Verification: ₹${verificationUsed.toFixed(2)}`}
                />
              )}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-indigo-500 font-medium">₹{enrichmentUsed.toFixed(0)}</span>
              <span className="text-[9px] text-amber-500 font-medium">₹{verificationUsed.toFixed(0)}</span>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {Number(org.email_reveals) > 0 && (
              <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200 py-0">
                <Mail size={8} className="mr-0.5" />{org.email_reveals}
              </Badge>
            )}
            {Number(org.phone_reveals) > 0 && (
              <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-600 border-emerald-200 py-0">
                <Phone size={8} className="mr-0.5" />{org.phone_reveals}
              </Badge>
            )}
            {Number(org.company_enriches) > 0 && (
              <Badge variant="outline" className="text-[9px] bg-violet-50 text-violet-600 border-violet-200 py-0">
                <Building2 size={8} className="mr-0.5" />{org.company_enriches}
              </Badge>
            )}
            {Number(org.company_searches) > 0 && (
              <Badge variant="outline" className="text-[9px] bg-orange-50 text-orange-600 border-orange-200 py-0">
                <Search size={8} className="mr-0.5" />{org.company_searches}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right pr-4">
          <span className="text-[11px] text-stone-400">
            {org.last_activity ? moment(org.last_activity).fromNow() : '—'}
          </span>
        </TableCell>
      </TableRow>

      {isOpen && (
        <TableRow className="bg-stone-50">
          <TableCell colSpan={7} className="p-0 border-0">
            {/* User Breakdown Header */}
            <div className="px-6 py-3 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={12} /> USER BREAKDOWN — {org.organization_name}
                </p>
                <div className="flex items-center gap-4 text-[10px] text-stone-400">
                  <span className="flex items-center gap-1"><Mail size={9} className="text-blue-500" /> Email</span>
                  <span className="flex items-center gap-1"><Phone size={9} className="text-emerald-500" /> Phone</span>
                  <span className="flex items-center gap-1"><Building2 size={9} className="text-violet-500" /> Company</span>
                  <span className="flex items-center gap-1"><Search size={9} className="text-orange-500" /> Search</span>
                  <span className="flex items-center gap-1"><Shield size={9} className="text-amber-500" /> Verification</span>
                </div>
              </div>
            </div>

            {/* User Table */}
            {usersLoading ? (
              <div className="px-6 py-6 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : users.length === 0 ? (
              <div className="px-6 py-12 text-center text-stone-400 text-sm">
                No user-level data for this period
              </div>
            ) : (
              <Table className="table-fixed">
                <TableBody>
                  {users.map((u: any) => (
                    <UserUsageRow key={u.user_id} user={u} />
                  ))}
                </TableBody>
              </Table>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

// ── Custom Tooltip ──────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-stone-200 px-4 py-3 text-xs">
      <p className="font-semibold text-stone-700 mb-1.5">{moment(label).format('ddd, MMM D')}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold">₹{Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

const CreditUsageReport = () => {
  const [datePreset, setDatePreset] = useState('30d');
  const[category, setCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const activePreset = DATE_PRESETS.find(p => p.value === datePreset) || DATE_PRESETS[1];
  const startDate = activePreset.start();
  const endDate = activePreset.end();

  // ── Queries ────────────────────────────────────────────────────────────

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey:['credit-usage-summary', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_credit_usage_summary', {
        p_start_date: startDate,
        p_end_date: endDate
      });
      if (error) throw error;
      return data;
    }
  });

  const { data: orgData =[], isLoading: orgLoading } = useQuery({
    queryKey: ['credit-usage-orgs', startDate, endDate, category],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_credit_usage_by_organization', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_category: category
      });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: trendData =[], isLoading: trendLoading } = useQuery({
    queryKey: ['credit-usage-trend', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_credit_usage_daily_trend', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_org_id: null
      });
      if (error) throw error;
      return (data ||[]).map((d: any) => ({
        ...d,
        day: d.day,
        dayLabel: moment(d.day).format('MMM D'),
        enrichment_credits: Number(d.enrichment_credits),
        verification_credits: Number(d.verification_credits),
        total_credits: Number(d.total_credits)
      }));
    }
  });

  // ── Filtered org data ──────────────────────────────────────────────────

  const filteredOrgs = useMemo(() => {
    if (!searchTerm.trim()) return orgData;
    const q = searchTerm.toLowerCase();
    return orgData.filter((org: any) =>
      org.organization_name?.toLowerCase().includes(q)
    );
  }, [orgData, searchTerm]);

  // ── Pie data for enrichment breakdown ─────────────────────────────────

  const enrichmentPieData = useMemo(() => {
    if (!summary?.by_enrichment_type) return[];
    return summary.by_enrichment_type.map((item: any) => ({
      name: ENRICHMENT_LABELS[item.verification_type] || item.verification_type,
      value: Number(item.total_credits),
      count: Number(item.usage_count)
    }));
  }, [summary]);

  // ── Loading ────────────────────────────────────────────────────────────

  const isLoading = summaryLoading && orgLoading;

  const handleRefresh = () => {
    refetchSummary();
  };

  // ── Export CSV ─────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (!orgData.length) return;
    
    const headers =['Organization', 'Balance', 'Total Consumed', 'Enrichment', 'Verification', 'Email Reveals', 'Phone Reveals', 'Company Enriches', 'Company Searches', 'Active Users', 'Last Activity'];
    const rows = orgData.map((org: any) =>[
      org.organization_name,
      org.credit_balance,
      org.total_consumed,
      org.enrichment_used,
      org.verification_used,
      org.email_reveals,
      org.phone_reveals,
      org.company_enriches,
      org.company_searches,
      org.active_users,
      org.last_activity ? moment(org.last_activity).format('YYYY-MM-DD HH:mm') : ''
    ]);

    const csv =[headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit-usage-report-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-stone-50/60 font-['DM_Sans',system-ui,sans-serif]">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/96 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-[1600px] mx-auto px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-400 py-2 border-b border-stone-100">
            <RouterLink to="/organization" className="hover:text-stone-700 transition-colors flex items-center gap-0.5">
              <ArrowLeft size={11} /> Dashboard
            </RouterLink>
            <span className="text-stone-300">›</span>
            <span className="text-stone-700">Credit Usage Report</span>
          </div>

          {/* Title + Controls */}
          <div className="flex items-center justify-between py-3 gap-4">
            <div>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
                <BarChart3 size={20} className="text-indigo-500" />
                Credit Usage Report
              </h1>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {activePreset.label} · {filteredOrgs.length} organization{filteredOrgs.length !== 1 ? 's' : ''} with activity
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Date preset selector */}
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="w-[150px] h-9 text-xs border-stone-200">
                  <Calendar size={13} className="mr-1.5 text-stone-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map(p => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category filter */}
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[140px] h-9 text-xs border-stone-200">
                  <Filter size={13} className="mr-1.5 text-stone-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Credits</SelectItem>
                  <SelectItem value="enrichment" className="text-xs">Enrichment Only</SelectItem>
                  <SelectItem value="verification" className="text-xs">Verification Only</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 text-xs border-stone-200">
                <Download size={13} className="mr-1.5" /> Export
              </Button>

              <Button variant="outline" size="icon" onClick={handleRefresh} className="h-9 w-9 border-stone-200">
                <RefreshCw size={13} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* ── Summary Stats ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            title="Total Consumed"
            value={summaryLoading ? '...' : formatCredits(Number(summary?.total_consumed) || 0)}
            subtitle={`${summary?.total_transactions || 0} transactions`}
            icon={<TrendingDown size={18} className="text-red-500" />}
            color="bg-red-50"
          />
          <StatCard
            title="Credits Added"
            value={summaryLoading ? '...' : formatCredits(Number(summary?.total_added) || 0)}
            icon={<Coins size={18} className="text-yellow-600" />}
            color="bg-yellow-50"
          />
          <StatCard
            title="Enrichment"
            value={summaryLoading ? '...' : formatCredits(Number(summary?.enrichment_consumed) || 0)}
            subtitle="Apollo usage"
            icon={<Sparkles size={18} className="text-indigo-500" />}
            color="bg-indigo-50"
          />
          <StatCard
            title="Verification"
            value={summaryLoading ? '...' : formatCredits(Number(summary?.verification_consumed) || 0)}
            subtitle="EPFO / Gridlines"
            icon={<Shield size={18} className="text-amber-500" />}
            color="bg-amber-50"
          />
          <StatCard
            title="Active Orgs"
            value={summaryLoading ? '...' : String(summary?.active_orgs || 0)}
            icon={<Building2 size={18} className="text-stone-500" />}
            color="bg-stone-100"
          />
          <StatCard
            title="Active Users"
            value={summaryLoading ? '...' : String(summary?.active_users || 0)}
            icon={<Users size={18} className="text-emerald-500" />}
            color="bg-emerald-50"
          />
        </div>

        {/* ── Charts Row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Usage Trend */}
          <Card className="lg:col-span-2 border-stone-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <Activity size={15} className="text-indigo-500" />
                Daily Credit Consumption
              </CardTitle>
              <CardDescription className="text-[11px]">Enrichment vs Verification over time</CardDescription>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <Skeleton className="h-[200px] w-full rounded-xl" />
              ) : trendData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-stone-400">
                  No usage data for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="gradEnrich" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.enrichment} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.enrichment} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradVerify" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.verification} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.verification} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                    <XAxis
                      dataKey="dayLabel"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#78716C' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#78716C' }}
                      width={40}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="enrichment_credits"
                      name="Enrichment"
                      stackId="1"
                      stroke={COLORS.enrichment}
                      fill="url(#gradEnrich)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="verification_credits"
                      name="Verification"
                      stackId="1"
                      stroke={COLORS.verification}
                      fill="url(#gradVerify)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Enrichment Breakdown Pie */}
          <Card className="border-stone-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <Zap size={15} className="text-indigo-500" />
                Enrichment Breakdown
              </CardTitle>
              <CardDescription className="text-[11px]">By service type</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-[200px] w-full rounded-xl" />
              ) : enrichmentPieData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-stone-400">
                  No enrichment data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={enrichmentPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {enrichmentPieData.map((_: any, index: number) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) =>[`₹${value.toFixed(2)}`, name]}
                      contentStyle={{ fontSize: '11px', borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Organization Table ──────────────────────────────────────── */}
        <Card className="border-stone-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                  <Globe size={15} className="text-stone-500" />
                  Organization Usage
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">
                  Click any row to expand and see individual user activity
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={13} />
                <Input
                  placeholder="Filter organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-8 text-xs w-56 border-stone-200"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {orgLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : filteredOrgs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-3">
                  <Coins size={20} className="text-stone-400" />
                </div>
                <p className="text-sm font-medium text-stone-600">No credit usage found</p>
                <p className="text-xs text-stone-400 mt-1">Try adjusting the date range or category filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className='table-fixed w-full'>
                  <TableHeader>
                    <TableRow className="bg-stone-50 hover:bg-stone-50 border-b border-stone-200">
                      <TableHead className="w-8 pl-4"></TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Organization</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right">Balance</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right">Consumed</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider w-[160px]">
                        <span className="flex items-center gap-1.5 justify-center">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" /> Enrich
                          <span className="text-stone-300">|</span>
                          <span className="w-2 h-2 rounded-full bg-amber-400" /> Verify
                        </span>
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right">Services Used</TableHead>
                      <TableHead className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider text-right pr-4">Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrgs.map((org: any) => (
                      <OrgRow
                        key={org.organization_id}
                        org={org}
                        startDate={startDate}
                        endDate={endDate}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          {/* Totals footer */}
          {!orgLoading && filteredOrgs.length > 0 && (
            <div className="border-t border-stone-200 bg-stone-50 px-6 py-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-stone-500">
                {filteredOrgs.length} organization{filteredOrgs.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-6 text-[11px]">
                <span className="text-stone-500">
                  Total Balance:{' '}
                  <span className="font-bold text-stone-800">
                    ₹{filteredOrgs.reduce((sum: number, org: any) => sum + Number(org.credit_balance || 0), 0).toFixed(2)}
                  </span>
                </span>
                <span className="text-stone-500">
                  Total Consumed:{' '}
                  <span className="font-bold text-red-600">
                    ₹{filteredOrgs.reduce((sum: number, org: any) => sum + Number(org.total_consumed || 0), 0).toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CreditUsageReport;