// Hrumbles-Front-End_UI\src\components\reports\NewIndividualReport.tsx
// v2: parent→child sub-status ordering, vertical sub-menu nav, full export

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Users, Download, TrendingUp, BarChart3,
  ChevronDown, ChevronUp, Search, UserCheck,
  ArrowUpRight, ChevronRight, FileSpreadsheet, FileText,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DateRange { startDate: Date | null; endDate: Date | null }
interface StatusDef {
  id: string; name: string; parent_id: string | null;
  type: 'main' | 'sub'; display_order: number; color: string | null;
}
interface RecruiterRow {
  id: string; name: string;
  totalCandidates: number;
  statusCounts: Record<string, number>;  // subStatusId → count
  submittedCount: number;
  joinedCount: number;
}

const P = '#7B43F1';
const ACCENT = ['#7B43F1','#6366F1','#8B5CF6','#A78BFA','#4F46E5','#C4B5FD'];

function buildOrderedSubStatuses(statuses: StatusDef[]): StatusDef[] {
  const mains = statuses.filter(s => s.type === 'main').sort((a, b) => a.display_order - b.display_order);
  const result: StatusDef[] = [];
  mains.forEach(main => {
    statuses
      .filter(s => s.type === 'sub' && s.parent_id === main.id)
      .sort((a, b) => a.display_order - b.display_order)
      .forEach(s => result.push(s));
  });
  return result;
}

function fmt(d: Date) { return format(d, 'dd MMM yyyy'); }

const KPI: React.FC<{ label: string; value: string|number; icon: React.ElementType; accent?: string }> = ({
  label, value, icon: Icon, accent = P
}) => (
  <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 flex items-center gap-2.5 shadow-sm">
    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${accent}18` }}>
      <Icon size={13} style={{ color: accent }} />
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider leading-none">{label}</p>
      <p className="text-base font-bold text-gray-800 leading-tight truncate">{value}</p>
    </div>
  </div>
);

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-xl p-2 text-[11px] max-w-[160px]">
      <p className="font-bold text-gray-700 mb-1 truncate">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-3">
          <span className="text-gray-500 truncate">{p.name ?? p.dataKey}</span>
          <span className="font-bold" style={{ color: p.fill ?? P }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const NewIndividualReport: React.FC = () => {
  const { organization_id: orgId } = useSelector((s: any) => s.auth);

const [dateRange, setDateRange] = useState<DateRange>({
  startDate: null,
  endDate: null,
});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recruiters, setRecruiters] = useState<RecruiterRow[]>([]);
  const [statuses, setStatuses] = useState<StatusDef[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('totalCandidates');
  const [sortAsc, setSortAsc] = useState(false);
  // const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeMainId, setActiveMainId] = useState<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────
const fetchData = useCallback(async () => {
  if (!orgId) return;

  setLoading(true);
  setError(null);

  try {
    const hasDateFilter = !!(dateRange.startDate && dateRange.endDate);

    // 1. Statuses
    const { data: st, error: stErr } = await supabase
      .from('job_statuses')
      .select('id, name, parent_id, type, display_order, color')
      .eq('organization_id', orgId);

    if (stErr) throw stErr;
    setStatuses((st ?? []) as StatusDef[]);

    // 2. Status change counts
    let query = supabase
      .from('hr_status_change_counts')
      .select(`
        id, candidate_id, sub_status_id,
        hr_job_candidates!hr_status_change_counts_candidate_id_fkey!inner(
          created_by,
          hr_employees!hr_job_candidates_created_by_fkey(id, first_name, last_name)
        )
      `)
      .eq('organization_id', orgId)
      .not('candidate_id', 'is', null)
      .not('hr_job_candidates.created_by', 'is', null);

    if (hasDateFilter) {
      query = query
        .gte('created_at', dateRange.startDate!.toISOString())
        .lte('created_at', dateRange.endDate!.toISOString());
    }

    const { data: rows, error: rErr } = await query;
    if (rErr) throw rErr;

    // 3. Candidates
    let candQuery = supabase
      .from('hr_job_candidates')
      .select(`
        id, submission_date, joining_date, created_by,
        hr_employees!hr_job_candidates_created_by_fkey(id, first_name, last_name)
      `)
      .eq('organization_id', orgId)
      .not('created_by', 'is', null);

    if (hasDateFilter) {
      candQuery = candQuery
        .gte('created_at', dateRange.startDate!.toISOString())
        .lte('created_at', dateRange.endDate!.toISOString());
    }

    const { data: cands, error: cErr } = await candQuery;
    if (cErr) throw cErr;

    // 👉 KEEP YOUR EXISTING AGGREGATION LOGIC SAME

      // ── Aggregate ───────────────────────────────────────────────────────
      const map: Record<string, RecruiterRow> = {};
      const seen = new Set<string>();

      const ensure = (id: string, name: string) => {
        if (!map[id]) map[id] = { id, name, totalCandidates: 0, statusCounts: {}, submittedCount: 0, joinedCount: 0 };
      };

      (rows ?? []).forEach((r: any) => {
        const emp = r.hr_job_candidates?.hr_employees;
        if (!emp || !r.sub_status_id) return;
        const rId = emp.id;
        const rName = `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim();

        // De-dup: recruiter × candidate × sub-status
        const key = `${rId}:${r.candidate_id}:${r.sub_status_id}`;
        if (seen.has(key)) return;
        seen.add(key);

        ensure(rId, rName);
        const rec = map[rId];
        const ck = `${rId}:${r.candidate_id}`;
        if (!seen.has(ck)) { seen.add(ck); rec.totalCandidates++; }
        rec.statusCounts[r.sub_status_id] = (rec.statusCounts[r.sub_status_id] ?? 0) + 1;
      });

      (cands ?? []).forEach((c: any) => {
        const emp = c.hr_employees;
        if (!emp) return;
        ensure(emp.id, `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim());
        if (c.submission_date) map[emp.id].submittedCount++;
        if (c.joining_date)    map[emp.id].joinedCount++;
      });

      setRecruiters(Object.values(map).filter(r => r.totalCandidates > 0));
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [orgId, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const mainStatuses = useMemo(
    () => statuses.filter(s => s.type === 'main').sort((a, b) => a.display_order - b.display_order),
    [statuses]
  );
  const orderedSubs = useMemo(() => buildOrderedSubStatuses(statuses), [statuses]);
  const visibleSubs = useMemo(() => {
    if (!activeMainId) return orderedSubs;
    return orderedSubs.filter(s => s.parent_id === activeMainId);
  }, [orderedSubs, activeMainId]);

  const filtered = useMemo(() => {
    let d = recruiters.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));
    return [...d].sort((a, b) => {
      if (sortKey === 'name') return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      let av = 0, bv = 0;
      if (sortKey === 'totalCandidates') { av = a.totalCandidates; bv = b.totalCandidates; }
      else if (sortKey === 'submittedCount') { av = a.submittedCount; bv = b.submittedCount; }
      else if (sortKey === 'joinedCount') { av = a.joinedCount; bv = b.joinedCount; }
      else { av = a.statusCounts[sortKey] ?? 0; bv = b.statusCounts[sortKey] ?? 0; }
      return sortAsc ? av - bv : bv - av;
    });
  }, [recruiters, search, sortKey, sortAsc]);

  const totalCands   = useMemo(() => recruiters.reduce((s,r) => s+r.totalCandidates,0), [recruiters]);
  const totalSubmit  = useMemo(() => recruiters.reduce((s,r) => s+r.submittedCount,0), [recruiters]);
  const totalJoined  = useMemo(() => recruiters.reduce((s,r) => s+r.joinedCount,0), [recruiters]);
  const topRecruiter = useMemo(() => [...recruiters].sort((a,b)=>b.totalCandidates-a.totalCandidates)[0], [recruiters]);

  const subByMain = useMemo(() => {
    const m: Record<string, string[]> = {};
    statuses.filter(s=>s.type==='sub').forEach(s => { if(s.parent_id) (m[s.parent_id]??=[]).push(s.id); });
    return m;
  }, [statuses]);

  const chartData = useMemo(() => {
    return [...filtered].slice(0,8).map(r => {
      const entry: any = { name: r.name.split(' ')[0], _full: r.name, total: r.totalCandidates, submitted: r.submittedCount, joined: r.joinedCount };
      mainStatuses.forEach(m => {
        const ids = subByMain[m.id]??[];
        entry[m.name] = ids.reduce((s,id)=>s+(r.statusCounts[id]??0),0);
      });
      return entry;
    });
  }, [filtered, mainStatuses, subByMain]);

  // ── Full export ───────────────────────────────────────────────────────────
  const buildExportRows = () => filtered.map(r => {
    const row: any = { 'Recruiter': r.name, 'Total': r.totalCandidates, 'Submitted': r.submittedCount, 'Joined': r.joinedCount };
    mainStatuses.forEach(main => {
      orderedSubs.filter(s=>s.parent_id===main.id).forEach(sub => {
        row[`[${main.name}] ${sub.name}`] = r.statusCounts[sub.id]??0;
      });
    });
    return row;
  });

  const exportCSV = () => {
    const blob = new Blob([Papa.unparse(buildExportRows(), { header: true })], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `individual_report_${
  dateRange.startDate ? fmt(dateRange.startDate) : 'all_time'
}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    doc.setFontSize(13); doc.setFont('helvetica','bold');
    doc.text('Individual Recruiter Report', 14, 16);
    doc.setFontSize(8); doc.setFont('helvetica','normal');
    const periodText = dateRange.startDate && dateRange.endDate
  ? `${fmt(dateRange.startDate)} – ${fmt(dateRange.endDate)}`
  : 'All Time';

doc.text(`Period: ${periodText} | Total: ${totalCands} | Recruiters: ${recruiters.length}`, 14, 22);

    const baseH = ['Recruiter','Total','Submitted','Joined'];
    const dynH: string[] = [];
    mainStatuses.forEach(main => orderedSubs.filter(s=>s.parent_id===main.id).forEach(s=>dynH.push(`[${main.name}]\n${s.name}`)));
    const allH = [...baseH, ...dynH];

    const body = filtered.map(r => {
      const base = [r.name, r.totalCandidates.toString(), r.submittedCount.toString(), r.joinedCount.toString()];
      const dyn: string[] = [];
      mainStatuses.forEach(main => orderedSubs.filter(s=>s.parent_id===main.id).forEach(s=>dyn.push((r.statusCounts[s.id]??0).toString())));
      return [...base,...dyn];
    });

    // Totals
    body.push(['TOTAL', totalCands.toString(), totalSubmit.toString(), totalJoined.toString(),
      ...mainStatuses.flatMap(main => orderedSubs.filter(s=>s.parent_id===main.id).map(sub =>
        filtered.reduce((s,r)=>s+(r.statusCounts[sub.id]??0),0).toString()
      ))
    ]);

    autoTable(doc, {
      head: [allH], body, startY: 26,
      styles: { fontSize: 6, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: { fillColor: [123,67,241], textColor: 255, fontSize: 6, fontStyle: 'bold', cellPadding: 2 },
      alternateRowStyles: { fillColor: [250,248,255] },
      didParseCell: (data) => {
        if (data.row.index === body.length-1) {
          data.cell.styles.fillColor = [235,228,255];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      columnStyles: { 0: { cellWidth: 32 } },
    });
    doc.save(`individual_report_${fmt(dateRange.startDate!).replace(/ /g,'_')}.pdf`);
  };

  const doSort = (k: string) => { if(sortKey===k) setSortAsc(v=>!v); else { setSortKey(k); setSortAsc(false); }};

  const tableCols = useMemo(() => [
    { key: 'name', label: 'Recruiter', fixed: true },
    { key: 'totalCandidates', label: 'Total', fixed: true },
    { key: 'submittedCount', label: 'Submitted', fixed: true },
    { key: 'joinedCount', label: 'Joined', fixed: true },
    ...visibleSubs.map(s => ({ key: s.id, label: s.name, fixed: false, color: s.color })),
  ], [visibleSubs]);

  if (loading && recruiters.length === 0) return <div className="flex h-48 items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (error) return <div className="text-xs text-red-600 bg-red-50 rounded-lg p-3">{error}</div>;

  return (
    <div className="flex gap-0 h-full min-h-0">

      {/* ── LEFT: Vertical sub-menu ─────────────────────────────────────── */}
      <div className="flex-shrink-0 w-[148px] bg-white border-r border-gray-100 flex flex-col shadow-sm">
        <div className="px-3 pt-3 pb-2 border-b border-gray-50">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status View</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1" style={{ scrollbarWidth: 'none' }}>
          {/* Overview */}
          <button onClick={() => setActiveMainId(null)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all"
            style={{ background: !activeMainId ? '#F5F3FF' : 'transparent' }}>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: !activeMainId ? P : '#CBD5E1' }} />
            <span className="text-xs font-semibold truncate" style={{ color: !activeMainId ? P : '#64748B' }}>Overview</span>
            {!activeMainId && <ChevronRight size={10} style={{ color: P }} className="ml-auto flex-shrink-0" />}
          </button>
          <div className="px-3 py-1"><div className="h-px bg-gray-100" /></div>

          {mainStatuses.map(main => {
            const isActive = activeMainId === main.id;
            const childCount = orderedSubs.filter(s => s.parent_id === main.id).length;
            const mainTotal = recruiters.reduce((sum, r) => {
              return sum + orderedSubs.filter(s=>s.parent_id===main.id).reduce((s2,s)=>s2+(r.statusCounts[s.id]??0),0);
            },0);
            return (
              <button key={main.id} onClick={() => setActiveMainId(isActive ? null : main.id)}
                className="w-full flex flex-col px-3 py-2 text-left transition-all"
                style={{ background: isActive ? '#F5F3FF' : 'transparent' }}>
                <div className="flex items-center gap-2 w-full">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: isActive ? P : (main.color ?? '#CBD5E1') }} />
                  <span className="text-xs font-semibold truncate flex-1" style={{ color: isActive ? P : '#374151' }}>
                    {main.name}
                  </span>
                  {isActive && <ChevronRight size={10} style={{ color: P }} className="flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5 ml-3.5">
                  <span className="text-[9px] text-gray-400">{childCount} statuses</span>
                  {mainTotal > 0 && (
                    <span className="text-[9px] font-bold px-1 rounded" style={{ background: `${P}15`, color: P }}>{mainTotal}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {/* Export */}
        <div className="p-2 border-t border-gray-100 space-y-1">
          <button onClick={exportCSV}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors border border-gray-100">
            <FileSpreadsheet size={11} /> Export CSV
          </button>
          <button onClick={exportPDF}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors border border-gray-100">
            <FileText size={11} /> Export PDF
          </button>
        </div>
      </div>

      {/* ── RIGHT: Content ──────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Users size={14} style={{ color: P }} />
            <div>
              <p className="text-xs font-bold text-gray-800 leading-none">
                {activeMainId ? mainStatuses.find(m=>m.id===activeMainId)?.name : 'All Recruiters'}
              </p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">
                {filtered.length} recruiters · {activeMainId ? visibleSubs.length : orderedSubs.length} status columns
              </p>
            </div>
          </div>
          <EnhancedDateRangeSelector value={dateRange} onChange={setDateRange} />
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search recruiter…"
              className="pl-7 pr-3 py-1.5 text-[11px] rounded-lg border border-gray-200 focus:outline-none focus:border-violet-400 w-40" />
          </div>
          {loading && <LoadingSpinner size={14} />}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <KPI label="Total Candidates" value={totalCands} icon={Users} />
            <KPI label="Recruiters" value={recruiters.length} icon={UserCheck} />
            <KPI label="Submitted" value={totalSubmit} icon={TrendingUp} />
            <KPI label="Top Recruiter" value={topRecruiter?.name ?? '—'} icon={ArrowUpRight} />
          </div>

          {/* Chart */}
          {!activeMainId && chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <p className="text-[10px] font-semibold text-gray-500 mb-2">Top 8 Recruiters by Main Status</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<TT />} />
                  {mainStatuses.map((m, i) => (
                    <Bar key={m.id} dataKey={m.name} stackId="a"
                      fill={m.color ?? ACCENT[i % ACCENT.length]} maxBarSize={24} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <BarChart3 size={28} className="opacity-20 mb-2" />
                <p className="text-xs">No data</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: `${tableCols.length * 72 + 180}px` }}>
                  <thead>
                    {/* Group headers */}
                    {!activeMainId && (
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th colSpan={4} className="px-3 py-1 text-left text-[9px] text-gray-400" />
                        {mainStatuses.map(main => {
                          const cnt = orderedSubs.filter(s=>s.parent_id===main.id).length;
                          if (!cnt) return null;
                          return (
                            <th key={main.id} colSpan={cnt}
                              className="px-2 py-1 text-center text-[9px] font-bold border-l border-gray-100"
                              style={{ color: main.color ?? P, background: `${main.color ?? P}0d` }}>
                              {main.name}
                            </th>
                          );
                        })}
                      </tr>
                    )}
                    {activeMainId && (
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th colSpan={4} className="px-3 py-1" />
                        <th colSpan={visibleSubs.length}
                          className="px-2 py-1 text-center text-[9px] font-bold border-l border-gray-100"
                          style={{ color: mainStatuses.find(m=>m.id===activeMainId)?.color ?? P, background: `${P}0d` }}>
                          {mainStatuses.find(m=>m.id===activeMainId)?.name}
                        </th>
                      </tr>
                    )}
                    <tr className="border-b border-gray-100">
                      {tableCols.map(col => (
                        <th key={col.key} onClick={() => doSort(col.key)}
                          className="px-3 py-2 text-left font-semibold cursor-pointer hover:text-violet-600 whitespace-nowrap select-none border-l first:border-l-0 border-gray-50"
                          style={{ fontSize: 9, color: sortKey === col.key ? P : '#94A3B8' }}>
                          <span className="flex items-center gap-0.5">
                            {col.label}
                            {sortKey===col.key ? (sortAsc ? <ChevronUp size={9}/> : <ChevronDown size={9}/>) : null}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => {
        
                      const eff = row.totalCandidates > 0 ? Math.round((row.joinedCount/row.totalCandidates)*100) : 0;
                      return (
                        <React.Fragment key={row.id}>
<tr className="border-b border-gray-50 hover:bg-violet-50/30 transition-colors">
                            {tableCols.map(col => {
                              let cell: any;
                              if (col.key === 'name') {
cell = (
  <span className="flex items-center gap-1.5">
    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
      style={{ background: ACCENT[i%ACCENT.length] }}>
      {row.name.charAt(0).toUpperCase()}
    </span>
    <span className="font-medium text-gray-800 text-xs truncate max-w-[110px]">{row.name}</span>
    {eff > 0 && (
      <span className="text-[8px] px-1 rounded bg-emerald-50 text-emerald-600 font-semibold flex-shrink-0">{eff}%</span>
    )}
  </span>
);
                              } else if (col.key === 'totalCandidates') {
                                const pct = topRecruiter ? (row.totalCandidates/topRecruiter.totalCandidates)*100 : 0;
                                cell = (
                                  <span className="flex items-center gap-1.5">
                                    <span className="font-bold text-gray-800 text-xs">{row.totalCandidates}</span>
                                    <div className="w-10 h-1 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                                      <div className="h-full rounded-full" style={{ width:`${pct}%`, background: P }} />
                                    </div>
                                  </span>
                                );
                              } else if (col.key === 'submittedCount') {
                                cell = row.submittedCount > 0
                                  ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background:'#EDE9FE', color: P }}>{row.submittedCount}</span>
                                  : <span className="text-gray-200 text-[10px]">—</span>;
                              } else if (col.key === 'joinedCount') {
                                cell = row.joinedCount > 0
                                  ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700">{row.joinedCount}</span>
                                  : <span className="text-gray-200 text-[10px]">—</span>;
                              } else {
                                const n = row.statusCounts[col.key] ?? 0;
                                cell = n > 0
                                  ? <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background:`${col.color??P}18`, color: col.color??P }}>{n}</span>
                                  : <span className="text-gray-200 text-[10px]">0</span>;
                              }
                              return (
                                <td key={col.key} className="px-3 py-1.5 whitespace-nowrap border-l first:border-l-0 border-gray-50">{cell}</td>
                              );
                            })}
                          </tr>
                          {/* Expanded: all sub-statuses grouped by parent */}
                          {/* {isExp && (
                            <tr>
                              <td colSpan={tableCols.length} className="px-4 py-2 bg-violet-50/30 border-b border-gray-100">
                                <div className="space-y-2">
                                  {mainStatuses.map(main => {
                                    const children = orderedSubs.filter(s=>s.parent_id===main.id && (row.statusCounts[s.id]??0)>0);
                                    if (!children.length) return null;
                                    return (
                                      <div key={main.id}>
                                        <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: main.color??P }}>{main.name}</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5">
                                          {children.map(s => (
                                            <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-2 py-1 border border-gray-100">
                                              <span className="text-[9px] text-gray-600 truncate">{s.name}</span>
                                              <span className="text-[10px] font-bold ml-1.5 flex-shrink-0" style={{ color: s.color??P }}>{row.statusCounts[s.id]}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="flex gap-4 mt-2 text-[9px] text-gray-500">
                                  <span>Submitted: <strong className="text-gray-800">{row.submittedCount}</strong></span>
                                  <span>Joined: <strong className="text-emerald-700">{row.joinedCount}</strong></span>
                                  {eff > 0 && <span>Join rate: <strong style={{ color: P }}>{eff}%</strong></span>}
                                </div>
                              </td>
                            </tr>
                          )} */}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                      {tableCols.map(col => {
                        let val: any = '';
                        if (col.key==='name') val=<span className="text-xs font-bold text-gray-700">Total</span>;
                        else if (col.key==='totalCandidates') val=<span className="text-xs">{filtered.reduce((s,r)=>s+r.totalCandidates,0)}</span>;
                        else if (col.key==='submittedCount') val=<span className="text-xs">{filtered.reduce((s,r)=>s+r.submittedCount,0)}</span>;
                        else if (col.key==='joinedCount') val=<span className="text-xs">{filtered.reduce((s,r)=>s+r.joinedCount,0)}</span>;
                        else {
                          const t = filtered.reduce((s,r)=>s+(r.statusCounts[col.key]??0),0);
                          val = t>0 ? <span className="text-[10px]">{t}</span> : <span className="text-gray-300 text-[10px]">0</span>;
                        }
                        return <td key={col.key} className="px-3 py-2 whitespace-nowrap border-l first:border-l-0 border-gray-100">{val}</td>;
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewIndividualReport;