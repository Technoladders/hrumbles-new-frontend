// Hrumbles-Front-End_UI\src\components\reports\ConsolidatedStatusReport.tsx
// Compact modern redesign — same data logic, tightened layout, inline visualization

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { format, isValid } from 'date-fns';
import {
  AlertCircle, Layers, List, Search, Download,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Sigma, ArrowUp, Activity, TrendingUp, Tag, Building, User,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LabelList,
} from 'recharts';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Types (unchanged from original) ─────────────────────────────────────────
interface DateRange { startDate: Date | null; endDate: Date | null }
interface Candidate {
  id: string; name: string; created_at: string; updated_at: string;
  main_status_id: string | null; sub_status_id: string | null;
  job_title: string | null; recruiter_name: string | null;
  client_name: string | null; current_salary: number | null;
  expected_salary: number | null; location: string | null;
  notice_period: string | null; overall_score: number | null;
  job_id: string; schedule_date_time?: string; rejection_reason?: string;
}
interface StatusMap { [key: string]: string }
interface GroupedData { [statusName: string]: Candidate[] }
interface TableRowData {
  type: 'header' | 'data';
  statusName?: string; count?: number; candidate?: Candidate;
}
interface GroupedStatusOption { mainStatus: string; subStatuses: string[] }

// ─── Color map (unchanged) ────────────────────────────────────────────────────
const statusColorMap: Record<string, string> = {
  'New Applicants': '#F87171', 'Client Reject': '#F472B6', 'Internal Reject': '#F472B6',
  'Duplicate (Internal)': '#A3E635', 'Sourced': '#A3E635', 'Internal Hold': '#60A5FA',
  'Processed (Internal)': '#60A5FA', 'Processed (Client)': '#2DD4BF',
  'L1 Interview': '#60A5FA', 'L2 Interview': '#818CF8', 'HR Round': '#F472B6',
  'Offered': '#FBBF24', 'Joined': '#A78BFA', 'End Client Round': '#F97316',
  'L1': '#F97316', 'L2': '#F97316', 'Technical Assessment': '#FBBF24',
};
const defaultColor = '#9CA3AF';

// ─── Helpers (unchanged) ──────────────────────────────────────────────────────
const formatCurrency = (v: number | null | undefined) =>
  v == null ? 'N/A' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
const formatValue = (v: string | number | null | undefined) => v != null ? String(v) : 'N/A';
const formatDate = (d: string) => { const p = new Date(d); return isValid(p) ? format(p, 'MMM d, yyyy') : d; };
const formatScheduleDateTime = (dt: string | null | undefined): string | null => {
  if (!dt) return null;
  const p = new Date(dt); return isValid(p) ? format(p, 'MMM d, yyyy | h:mm a') : null;
};
const getScoreBadgeClass = (s: number | null | undefined) =>
  s == null ? 'bg-gray-100 text-gray-800' : s > 80 ? 'bg-green-100 text-green-800' : s > 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';

const colorToClassMap: Record<string, string> = {
  '#F87171': 'bg-red-100 text-red-800', '#F472B6': 'bg-pink-100 text-pink-800',
  '#A3E635': 'bg-lime-100 text-lime-800', '#60A5FA': 'bg-blue-100 text-blue-800',
  '#2DD4BF': 'bg-teal-100 text-teal-800', '#818CF8': 'bg-indigo-100 text-indigo-800',
  '#FBBF24': 'bg-amber-100 text-amber-800', '#A78BFA': 'bg-purple-100 text-purple-800',
  '#F97316': 'bg-orange-100 text-orange-800',
};
const getStatusBadgeClass = (name: string | null | undefined) =>
  name ? (colorToClassMap[statusColorMap[name]] ?? 'bg-gray-100 text-gray-800') : 'bg-gray-100 text-gray-800';

// ─── Compact tooltip for chart ────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, barDefs }: any) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const active2 = barDefs?.filter((b: any) => (row[b.key] || 0) > 0) ?? [];
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-xl p-2 text-[10px]" style={{ maxWidth: 180 }}>
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {active2.map((b: any) => (
        <div key={b.key} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: b.color }} />
          <span className="text-gray-500 flex-1">{b.name}:</span>
          <span className="font-bold text-gray-800">{row[b.key]}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-1.5 pt-1 flex justify-between font-bold text-gray-800">
        <span>Total</span><span>{row.total}</span>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const ConsolidatedStatusReport: React.FC = () => {
  const { organization_id: organizationId, user, role } = useSelector((s: any) => s.auth);

  const [candidates, setCandidates]       = useState<Candidate[]>([]);
  const [mainStatuses, setMainStatuses]   = useState<{ id: string; name: string; display_order: number }[]>([]);
  const [subStatuses, setSubStatuses]     = useState<{ id: string; name: string; parent_id: string; color: string; display_order: number }[]>([]);
  const [statusNameMap, setStatusNameMap] = useState<StatusMap>({});
  const [groupedStatusOptions, setGroupedStatusOptions] = useState<GroupedStatusOption[]>([]);

  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [isGrouped,     setIsGrouped]     = useState(false);
  const [searchTerm,    setSearchTerm]    = useState('');

  const [statusFilter,       setStatusFilter]       = useState<string[]>([]);
  const [tempStatusFilter,   setTempStatusFilter]   = useState<string[]>([]);
  const [clientFilter,       setClientFilter]       = useState<string[]>([]);
  const [tempClientFilter,   setTempClientFilter]   = useState<string[]>([]);
  const [recruiterFilter,    setRecruiterFilter]    = useState<string[]>([]);
  const [tempRecruiterFilter,setTempRecruiterFilter]= useState<string[]>([]);

  const [clientOptions,    setClientOptions]    = useState<string[]>([]);
  const [recruiterOptions, setRecruiterOptions] = useState<string[]>([]);
  const [currentPage,      setCurrentPage]      = useState(1);
  const [itemsPerPage,     setItemsPerPage]     = useState(20);
  const [expandedGroups,   setExpandedGroups]   = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
  });
  const [deptName,      setDeptName]      = useState<string | null>(null);
  const [deptLoading,   setDeptLoading]   = useState(true);

  const isRestrictedView = role === 'employee' && deptName === 'Human Resource';

  // Department fetch (unchanged)
  useEffect(() => {
    (async () => {
      if (!user?.id) { setDeptLoading(false); return; }
      try {
        const { data: emp } = await supabase.from('hr_employees').select('department_id').eq('id', user.id).single();
        if (!emp?.department_id) throw new Error();
        const { data: dept } = await supabase.from('hr_departments').select('name').eq('id', emp.department_id).single();
        setDeptName(dept?.name ?? null);
      } catch { setDeptName(null); }
      finally { setDeptLoading(false); }
    })();
  }, [user?.id]);

  // Main data fetch (unchanged logic)
  useEffect(() => {
    if (!organizationId || deptLoading || !dateRange.startDate || !dateRange.endDate) return;
    setIsLoading(true); setError(null);
    (async () => {
      try {
        let q = supabase.from('hr_job_candidates')
          .select(`id, name, created_at, updated_at, main_status_id, sub_status_id,
            current_salary, expected_salary, location, notice_period, overall_score,
            job_id, interview_date, interview_time, interview_feedback, metadata,
            job:hr_jobs!hr_job_candidates_job_id_fkey(title, client_details),
            recruiter:hr_employees!hr_job_candidates_created_by_fkey(first_name, last_name)`)
          .eq('organization_id', organizationId)
          .gte('created_at', dateRange.startDate!.toISOString())
          .lte('created_at', dateRange.endDate!.toISOString())
          .order('created_at', { ascending: false });
        if (isRestrictedView && user?.id) q = q.eq('created_by', user.id);

        const [{ data: cData, error: cErr }, { data: sData, error: sErr }] = await Promise.all([
          q,
          supabase.from('job_statuses').select('id, name, type, parent_id, color, display_order').eq('organization_id', organizationId),
        ]);
        if (cErr) throw cErr; if (sErr) throw sErr;

        const formatted: Candidate[] = (cData ?? []).map((c: any) => {
          const combine = (d: string, t: string) => {
            if (!d || !t) return null;
            const dt = new Date(`${d}T${t}`); return isNaN(dt.getTime()) ? null : dt.toISOString();
          };
          const meta = c.metadata || {};
          return {
            id: c.id, job_id: c.job_id, name: c.name,
            created_at: c.created_at, updated_at: c.updated_at,
            main_status_id: c.main_status_id, sub_status_id: c.sub_status_id,
            job_title: c.job?.title || 'N/A',
            recruiter_name: c.recruiter ? `${c.recruiter.first_name} ${c.recruiter.last_name}`.trim() : 'N/A',
            client_name: c.job?.client_details?.clientName || 'N/A',
            current_salary: c.current_salary ?? meta.currentSalary,
            expected_salary: c.expected_salary ?? meta.expectedSalary,
            location: c.location ?? meta.currentLocation,
            notice_period: c.notice_period ?? meta.noticePeriod,
            overall_score: c.overall_score,
            schedule_date_time: combine(c.interview_date, c.interview_time),
            rejection_reason: c.interview_feedback,
          };
        });
        setCandidates(formatted);

        const all = sData ?? [];
        setStatusNameMap(all.reduce((acc: StatusMap, s) => { acc[s.id] = s.name; return acc; }, {}));
        const mains = all.filter((s: any) => s.type === 'main').sort((a: any, b: any) => a.display_order - b.display_order);
        const subs  = all.filter((s: any) => s.type === 'sub');
        setMainStatuses(mains); setSubStatuses(subs);

        setGroupedStatusOptions(mains.map((m: any) => ({
          mainStatus: m.name,
          subStatuses: subs.filter((s: any) => s.parent_id === m.id).sort((a: any, b: any) => a.display_order - b.display_order).map((s: any) => s.name),
        })).filter((g: GroupedStatusOption) => g.subStatuses.length > 0));

        setClientOptions([...new Set(formatted.map(c => c.client_name).filter(Boolean))].sort() as string[]);
        setRecruiterOptions([...new Set(formatted.map(c => c.recruiter_name).filter(Boolean))].sort() as string[]);
      } catch (e: any) { setError(e.message ?? 'Error'); }
      finally { setIsLoading(false); }
    })();
  }, [organizationId, dateRange, user?.id, deptLoading, isRestrictedView]);

  // ── Derived state (unchanged logic) ──────────────────────────────────────
  const filteredCandidates = useMemo(() => candidates.filter(c => {
    const sn = (statusNameMap[c.sub_status_id ?? ''] || 'New Applicants').trim();
    const cl = (c.client_name || 'N/A').trim();
    const re = (c.recruiter_name || 'N/A').trim();
    const sl = searchTerm.toLowerCase();
    return (
      (!statusFilter.length    || statusFilter.includes(sn)) &&
      (!clientFilter.length    || clientFilter.includes(cl)) &&
      (isRestrictedView || !recruiterFilter.length || recruiterFilter.includes(re)) &&
      (!searchTerm || c.name.toLowerCase().includes(sl) || (c.job_title||'').toLowerCase().includes(sl) || (c.client_name||'').toLowerCase().includes(sl) || (c.recruiter_name||'').toLowerCase().includes(sl))
    );
  }), [candidates, searchTerm, statusNameMap, statusFilter, clientFilter, recruiterFilter, isRestrictedView]);

  const groupedBySubStatus = useMemo<GroupedData>(() => filteredCandidates.reduce((acc: GroupedData, c) => {
    const sn = statusNameMap[c.sub_status_id ?? ''] || 'New Applicant';
    if (!acc[sn]) acc[sn] = [];
    acc[sn].push(c); return acc;
  }, {}), [filteredCandidates, statusNameMap]);

  const dynamicChartConfig = useMemo(() => {
    if (!mainStatuses.length) return { barDefinitions: [], funnelData: [] };
    const barDefs = subStatuses.map(s => ({
      key: s.name.replace(/\s+/g, ''),
      name: s.name,
      color: statusColorMap[s.name] || s.color || defaultColor,
      parent_id: s.parent_id,
    }));
    const subToMain = new Map(subStatuses.map(s => [s.id, s.parent_id]));
    const tmpl = new Map(mainStatuses.map(m => [m.id, {
      name: m.name, total: 0,
      ...barDefs.reduce((a: any, b) => ({ ...a, [b.key]: 0 }), {}),
    }]));
    filteredCandidates.forEach(c => {
      const mid = c.main_status_id || (c.sub_status_id ? subToMain.get(c.sub_status_id) : null);
      if (mid && tmpl.has(mid)) {
        const entry = tmpl.get(mid)!;
        const sn = statusNameMap[c.sub_status_id ?? ''] || 'New Applicant';
        const sk = sn.replace(/\s+/g, '');
        if (sk in entry) { (entry as any)[sk]++; entry.total++; }
      }
    });
    const funnelData = Array.from(tmpl.values()) as any[];
    funnelData.forEach(row => {
      const last = [...barDefs.map(b => b.key)].reverse().find(k => row[k] > 0);
      if (last) row.lastKey = last;
    });
    return { barDefinitions: barDefs, funnelData };
  }, [mainStatuses, subStatuses, filteredCandidates, statusNameMap]);

  const tableRows = useMemo<TableRowData[]>(() => {
    if (!isGrouped) return filteredCandidates.map(c => ({ type: 'data', candidate: c, statusName: statusNameMap[c.sub_status_id ?? ''] || 'New Applicant' }));
    return Object.entries(groupedBySubStatus).sort((a, b) => a[0].localeCompare(b[0])).flatMap(([sn, list]) => [
      { type: 'header', statusName: sn, count: list.length } as TableRowData,
      ...(expandedGroups.includes(sn) ? list.map(c => ({ type: 'data' as const, candidate: c, statusName: sn })) : []),
    ]);
  }, [isGrouped, filteredCandidates, groupedBySubStatus, expandedGroups, statusNameMap]);

  const totalCandidates = filteredCandidates.length;
  const chartData2 = useMemo(() => Object.entries(groupedBySubStatus).map(([name, g]) => ({ name, value: g.length })).sort((a, b) => b.value - a.value), [groupedBySubStatus]);
  const peakStatus = chartData2.reduce((m, i) => i.value > m.value ? i : m, { name: 'N/A', value: 0 });
  const avgCandidates = (chartData2.length > 0 ? totalCandidates / chartData2.length : 0).toFixed(1);
  const topStatus = chartData2[0] || { name: 'N/A', value: 0 };

  const totalPages  = Math.ceil(tableRows.length / itemsPerPage);
  const startIndex  = (currentPage - 1) * itemsPerPage;
  const paginated   = tableRows.slice(startIndex, startIndex + itemsPerPage);

  // Axis helper (unchanged)
  const getAxis = (data: any[], step: number) => {
    const mx = Math.max(...data.map(d => d.total), 0);
    if (!mx) return { domain: [0, 40] as [number, number], ticks: [0,10,20,30,40] };
    const top = Math.ceil((mx + step/4) / step) * step;
    return { domain: [0, top] as [number, number], ticks: Array.from({ length: top/step + 1 }, (_, i) => i * step) };
  };
  const { domain: axisDomain, ticks: axisTicks } = getAxis(dynamicChartConfig.funnelData, 20);

  const exportToCSV = () => {
    const blob = new Blob([Papa.unparse(filteredCandidates.map(c => ({
      'Candidate Name': c.name, 'Status': statusNameMap[c.sub_status_id ?? ''] || 'New Applicant',
      'AI Score': formatValue(c.overall_score), 'Job Title': formatValue(c.job_title),
      'Client': formatValue(c.client_name), 'Recruiter': formatValue(c.recruiter_name),
      'Applied': formatDate(c.created_at), 'CCTC': formatCurrency(c.current_salary),
      'ECTC': formatCurrency(c.expected_salary), 'Notice': formatValue(c.notice_period), 'Location': formatValue(c.location),
    })), { header: true })], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `consolidated_report_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(12); doc.text('Consolidated Status Report', 14, 16);
    autoTable(doc, {
      head: [['Candidate','Status','Score','Job Title','Client','Recruiter','Applied','CCTC','ECTC','Notice','Location']],
      body: filteredCandidates.map(c => [c.name, statusNameMap[c.sub_status_id??'']||'New Applicant', formatValue(c.overall_score), formatValue(c.job_title), formatValue(c.client_name), formatValue(c.recruiter_name), formatDate(c.created_at), formatCurrency(c.current_salary), formatCurrency(c.expected_salary), formatValue(c.notice_period), formatValue(c.location)]),
      startY: 22, styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fillColor: [123, 67, 241] },
    });
    doc.save(`consolidated_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if ((isLoading && !candidates.length && !error) || deptLoading)
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size={40} /></div>;
  if (error)
    return <div className="p-4 text-xs text-red-600 bg-red-50 rounded-lg flex items-center gap-2"><AlertCircle size={14} />{error}</div>;

  return (
    <TooltipProvider>
      <div className="p-4 space-y-4">

        {/* ── KPIs ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: 'Total Candidates', value: totalCandidates, icon: Sigma,     color: '#7B43F1' },
            { label: 'Peak Status',      value: peakStatus.name, icon: ArrowUp,   color: '#059669' },
            { label: 'Avg per Status',   value: avgCandidates,   icon: Activity,  color: '#2563EB' },
            { label: 'Top Status',       value: topStatus.name,  icon: TrendingUp, color: '#059669' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 flex items-center gap-2.5 shadow-sm">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                <Icon size={13} style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider leading-none">{label}</p>
                <p className="text-sm font-bold text-gray-800 leading-tight truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Compact chart ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] font-semibold text-gray-500 mb-2">Candidates per Status</p>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><LoadingSpinner size={28} /></div>
          ) : dynamicChartConfig.funnelData.length > 0 ? (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicChartConfig.funnelData} layout="vertical"
                  margin={{ top: 4, right: 44, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} domain={axisDomain} ticks={axisTicks}
                    tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={100}
                    tick={{ fontSize: 9, fill: '#374151', fontWeight: 600 }} interval={0} />
                  <Tooltip content={<ChartTooltip barDefs={dynamicChartConfig.barDefinitions} />} cursor={{ fill: '#F5F3FF55' }} />
                  {dynamicChartConfig.barDefinitions.map((bar, idx, arr) => (
                    <Bar key={bar.key} dataKey={bar.key} stackId="a" name={bar.name}
                      fill={bar.color} stroke="#fff" strokeWidth={1}
                      radius={idx === arr.length - 1 ? [0, 4, 4, 0] : undefined}
                    >
                      <LabelList dataKey={bar.key} position="center" fill="#fff"
                        fontSize={9} fontWeight="bold"
                        formatter={(v: number) => v > 0 ? v : ''} />
                      <LabelList dataKey="total" content={(props: any) => {
                        const { x, y, width, height, index, value } = props;
                        const row = dynamicChartConfig.funnelData[index];
                        if (row?.lastKey === bar.key && value > 0) {
                          return <text x={Number(x)+Number(width)+6} y={Number(y)+Number(height)/2} dy={4}
                            textAnchor="start" fill="#374151" fontSize={10} fontWeight="bold">{value}</text>;
                        }
                        return null;
                      }} />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center text-xs text-gray-400">No data for this period</div>
          )}
        </div>

        {/* ── Filters + table card ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">

          {/* Filter bar */}
          <div className="px-4 pt-3 pb-3 border-b border-gray-50 flex flex-wrap items-center gap-2">
            <EnhancedDateRangeSelector value={dateRange} onChange={setDateRange} />

            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search name, job, client…"
                className="w-full pl-7 pr-3 py-1.5 text-[11px] rounded-lg border border-gray-200 focus:outline-none focus:border-violet-300 bg-gray-50" />
            </div>

            {/* Status filter */}
            <DropdownMenu onOpenChange={o => o && setTempStatusFilter(statusFilter)}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-[11px] text-gray-600 hover:border-violet-300 transition-colors">
                  <Tag size={11} />
                  {statusFilter.length === 0 ? 'All Statuses' : statusFilter.length === 1 ? statusFilter[0] : `${statusFilter.length} statuses`}
                  <ChevronDown size={10} className="text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-80 flex flex-col z-50">
                <div className="overflow-y-auto flex-1">
                  <DropdownMenuCheckboxItem checked={tempStatusFilter.length === 0}
                    onCheckedChange={() => setTempStatusFilter([])} onSelect={e => e.preventDefault()}>
                    All Statuses
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {groupedStatusOptions.map(g => (
                    <React.Fragment key={g.mainStatus}>
                      <DropdownMenuLabel>{g.mainStatus}</DropdownMenuLabel>
                      {g.subStatuses.map(s => (
                        <DropdownMenuCheckboxItem key={s}
                          checked={tempStatusFilter.includes(s)}
                          onCheckedChange={c => setTempStatusFilter(prev => c ? [...prev, s] : prev.filter(x => x !== s))}
                          onSelect={e => e.preventDefault()}>{s}</DropdownMenuCheckboxItem>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button size="sm" className="w-full" onClick={() => setStatusFilter(tempStatusFilter)}>Apply</Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Client filter */}
            <DropdownMenu onOpenChange={o => o && setTempClientFilter(clientFilter)}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-[11px] text-gray-600 hover:border-violet-300 transition-colors">
                  <Building size={11} />
                  {clientFilter.length === 0 ? 'All Clients' : `${clientFilter.length} clients`}
                  <ChevronDown size={10} className="text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-80 flex flex-col z-50">
                <div className="overflow-y-auto flex-1">
                  <DropdownMenuCheckboxItem checked={tempClientFilter.length === 0}
                    onCheckedChange={() => setTempClientFilter([])} onSelect={e => e.preventDefault()}>
                    All Clients
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {clientOptions.map(c => (
                    <DropdownMenuCheckboxItem key={c} checked={tempClientFilter.includes(c)}
                      onCheckedChange={ch => setTempClientFilter(prev => ch ? [...prev, c] : prev.filter(x => x !== c))}
                      onSelect={e => e.preventDefault()}>{c}</DropdownMenuCheckboxItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <div className="p-2"><Button size="sm" className="w-full" onClick={() => setClientFilter(tempClientFilter)}>Apply</Button></div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Recruiter filter */}
            {!isRestrictedView && (
              <DropdownMenu onOpenChange={o => o && setTempRecruiterFilter(recruiterFilter)}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-[11px] text-gray-600 hover:border-violet-300 transition-colors">
                    <User size={11} />
                    {recruiterFilter.length === 0 ? 'All Recruiters' : `${recruiterFilter.length} recruiters`}
                    <ChevronDown size={10} className="text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-80 flex flex-col z-50">
                  <div className="overflow-y-auto flex-1">
                    <DropdownMenuCheckboxItem checked={tempRecruiterFilter.length === 0}
                      onCheckedChange={() => setTempRecruiterFilter([])} onSelect={e => e.preventDefault()}>
                      All Recruiters
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {recruiterOptions.map(r => (
                      <DropdownMenuCheckboxItem key={r} checked={tempRecruiterFilter.includes(r)}
                        onCheckedChange={ch => setTempRecruiterFilter(prev => ch ? [...prev, r] : prev.filter(x => x !== r))}
                        onSelect={e => e.preventDefault()}>{r}</DropdownMenuCheckboxItem>
                    ))}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-2"><Button size="sm" className="w-full" onClick={() => setRecruiterFilter(tempRecruiterFilter)}>Apply</Button></div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Group toggle */}
            <button onClick={() => setIsGrouped(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-[11px] text-gray-600 hover:border-violet-300 transition-colors">
              {isGrouped ? <List size={11} /> : <Layers size={11} />}
              {isGrouped ? 'Ungroup' : 'Group'}
            </button>

            {/* Export */}
            <div className="flex gap-1.5 ml-auto">
              <button onClick={exportToCSV}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-[11px] text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                <Download size={11} /> CSV
              </button>
              <button onClick={exportToPDF}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-[11px] text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                <Download size={11} /> PDF
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: 1100 }}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Candidate','Status','Score','Job Title','Client','Recruiter','Applied','CCTC','ECTC','Notice','Location'].map(h => (
                    <th key={h} className="px-3 py-2 text-left whitespace-nowrap"
                      style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length > 0 ? paginated.map(row => {
                  if (row.type === 'header') {
                    return (
                      <tr key={row.statusName} className="border-b border-gray-50 bg-gray-50/80">
                        <td colSpan={11} className="px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setExpandedGroups(prev => prev.includes(row.statusName!) ? prev.filter(g => g !== row.statusName) : [...prev, row.statusName!])}
                              className="w-5 h-5 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
                              {expandedGroups.includes(row.statusName!) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            <span className="text-xs font-bold text-gray-700">{row.statusName}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 font-semibold">{row.count}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  const { candidate, statusName } = row;
                  if (!candidate) return null;
                  const sched = formatScheduleDateTime(candidate.schedule_date_time);
                  const snl = (statusName ?? '').toLowerCase();
                  const showSched = sched && ['interview','round','l1','l2','l3','assessment','reschedule'].some(k => snl.includes(k)) && !['rejected','selected','no show','hold'].some(k => snl.includes(k));
                  const showReason = candidate.rejection_reason && snl.includes('reject');
                  return (
                    <tr key={candidate.id} className="border-b border-gray-50 hover:bg-violet-50/20 transition-colors group">
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <Link to={candidate.job_id ? `/jobs/candidateprofile/${candidate.id}/${candidate.job_id}` : `/jobs/unassigned/candidate/${candidate.id}/bgv`}
                          className="text-xs font-medium text-violet-600 hover:underline hover:text-violet-800 truncate max-w-[160px] block">
                          {candidate.name}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5">
                        <div>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${getStatusBadgeClass(statusName)}`}>
                            {statusName}
                          </span>
                          {showReason && (
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <p className="text-[10px] text-gray-400 mt-0.5 cursor-help truncate max-w-[140px]">{candidate.rejection_reason}</p>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs"><p>{candidate.rejection_reason}</p></TooltipContent>
                            </UITooltip>
                          )}
                          {showSched && <p className="text-[10px] text-gray-400 mt-0.5">{sched}</p>}
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${getScoreBadgeClass(candidate.overall_score)}`}>
                          {formatValue(candidate.overall_score)}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <Link to={`/jobs/${candidate.job_id}`} className="text-[11px] text-violet-600 hover:underline truncate max-w-[180px] block">
                          {formatValue(candidate.job_title)}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 text-[11px] text-gray-600 whitespace-nowrap">{formatValue(candidate.client_name)}</td>
                      <td className="px-3 py-1.5 text-[11px] text-gray-600 whitespace-nowrap">{formatValue(candidate.recruiter_name)}</td>
                      <td className="px-3 py-1.5 text-[11px] text-gray-500 whitespace-nowrap">{formatDate(candidate.created_at)}</td>
                      <td className="px-3 py-1.5 text-[11px] text-gray-600 whitespace-nowrap">{formatCurrency(candidate.current_salary)}</td>
                      <td className="px-3 py-1.5 text-[11px] text-gray-600 whitespace-nowrap">{formatCurrency(candidate.expected_salary)}</td>
                      <td className="px-3 py-1.5 text-[11px] text-gray-600 whitespace-nowrap">{formatValue(candidate.notice_period)}</td>
                      <td className="px-3 py-1.5 text-[11px] text-gray-600 whitespace-nowrap">{formatValue(candidate.location)}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={11} className="px-3 py-8 text-center text-xs text-gray-400">No data found matching your criteria</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-2 border-t border-gray-50 flex items-center justify-between gap-3 text-[11px] text-gray-500">
              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="border border-gray-200 rounded-md px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-violet-300 bg-white">
                  {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(p-1,1))} disabled={currentPage === 1}
                  className="w-6 h-6 rounded flex items-center justify-center border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft size={11} />
                </button>
                <span className="px-2 font-medium">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(p+1,totalPages))} disabled={currentPage === totalPages}
                  className="w-6 h-6 rounded flex items-center justify-center border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRight size={11} />
                </button>
              </div>
              <span>{startIndex+1}–{Math.min(startIndex+itemsPerPage, tableRows.length)} of {tableRows.length}</span>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ConsolidatedStatusReport;