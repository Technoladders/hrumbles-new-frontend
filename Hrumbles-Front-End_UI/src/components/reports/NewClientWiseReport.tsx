// Hrumbles-Front-End_UI\src\components\reports\NewClientWiseReport.tsx
// v2: correct parent→child ordering, vertical sub-menu nav, full data export

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedDateRangeSelector } from '@/components/ui/EnhancedDateRangeSelector';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Building2, Download, TrendingUp, Users, BarChart3,
  ChevronDown, ChevronUp, Search, ChevronRight,
  ArrowUpRight, FileSpreadsheet, FileText,
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

interface ClientRow {
  clientName: string;
  totalCandidates: number;
  statusCounts: Record<string, number>;   // subStatusId → count
  submittedCount: number;
  joinedCount: number;
}

// ─── Theme ───────────────────────────────────────────────────────────────────
const P = '#7B43F1';
const ACCENT = ['#7B43F1','#6366F1','#8B5CF6','#A78BFA','#4F46E5','#C4B5FD'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns sub-statuses ordered: parent display_order asc, then child display_order asc */
function buildOrderedSubStatuses(statuses: StatusDef[]): StatusDef[] {
  const mains = statuses.filter(s => s.type === 'main').sort((a, b) => a.display_order - b.display_order);
  const result: StatusDef[] = [];
  mains.forEach(main => {
    const children = statuses
      .filter(s => s.type === 'sub' && s.parent_id === main.id)
      .sort((a, b) => a.display_order - b.display_order);
    result.push(...children);
  });
  return result;
}

function fmt(d: Date) { return format(d, 'dd MMM yyyy'); }

// ─── Mini components ─────────────────────────────────────────────────────────
const KPI: React.FC<{ label: string; value: string | number; icon: React.ElementType; accent?: string }> = ({
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
          <span className="text-gray-500 truncate">{p.name}</span>
          <span className="font-bold" style={{ color: p.fill }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const NewClientWiseReport: React.FC = () => {
  const { organization_id: orgId } = useSelector((s: any) => s.auth);

const [dateRange, setDateRange] = useState<DateRange>({
  startDate: null,
  endDate: null,
});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [statuses, setStatuses] = useState<StatusDef[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('totalCandidates');
  const [sortAsc, setSortAsc] = useState(false);
  // const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Vertical sub-menu: which main status is selected for detail view (null = overview)
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
        id, candidate_id, main_status_id, sub_status_id,
        hr_jobs!hr_status_change_counts_job_id_fkey(client_details),
        sub_status:job_statuses!hr_status_change_counts_sub_status_id_fkey(id, name)
      `)
      .eq('organization_id', orgId)
      .not('candidate_id', 'is', null);

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
        id, submission_date, joining_date,
        hr_jobs!hr_job_candidates_job_id_fkey(client_details)
      `)
      .eq('organization_id', orgId);

    if (hasDateFilter) {
      candQuery = candQuery
        .gte('created_at', dateRange.startDate!.toISOString())
        .lte('created_at', dateRange.endDate!.toISOString());
    }

    const { data: cands, error: cErr } = await candQuery;
    if (cErr) throw cErr;

      // ── Aggregate ───────────────────────────────────────────────────────
      const map: Record<string, ClientRow> = {};
      const seen = new Set<string>();

      const ensure = (cn: string) => {
        if (!map[cn]) map[cn] = { clientName: cn, totalCandidates: 0, statusCounts: {}, submittedCount: 0, joinedCount: 0 };
      };

      (rows ?? []).forEach((r: any) => {
        const cn = r.hr_jobs?.client_details?.clientName?.trim();
        if (!cn || !r.sub_status_id) return;

        // De-dup: one entry per candidate per sub-status transition
        const key = `${r.candidate_id}:${r.sub_status_id}`;
        if (seen.has(key)) return;
        seen.add(key);

        ensure(cn);
        const c = map[cn];
        // Unique candidate per client
        const ck = `${cn}:${r.candidate_id}`;
        if (!seen.has(ck)) { seen.add(ck); c.totalCandidates++; }
        c.statusCounts[r.sub_status_id] = (c.statusCounts[r.sub_status_id] ?? 0) + 1;
      });

      (cands ?? []).forEach((c: any) => {
        const cn = c.hr_jobs?.client_details?.clientName?.trim();
        if (!cn) return;
        ensure(cn);
        if (c.submission_date) map[cn].submittedCount++;
        if (c.joining_date)    map[cn].joinedCount++;
      });

      setClients(Object.values(map).filter(c => c.totalCandidates > 0));
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

  // Ordered subs: parent display_order → child display_order
  const orderedSubs = useMemo(() => buildOrderedSubStatuses(statuses), [statuses]);

  // Subs for selected main (null = all subs)
  const visibleSubs = useMemo(() => {
    if (!activeMainId) return orderedSubs;
    return orderedSubs.filter(s => s.parent_id === activeMainId);
  }, [orderedSubs, activeMainId]);

  const filtered = useMemo(() => {
    let d = clients.filter(c => !search || c.clientName.toLowerCase().includes(search.toLowerCase()));
    return [...d].sort((a, b) => {
      let av = 0, bv = 0;
      if (sortKey === 'clientName') return sortAsc ? a.clientName.localeCompare(b.clientName) : b.clientName.localeCompare(a.clientName);
      if (sortKey === 'totalCandidates') { av = a.totalCandidates; bv = b.totalCandidates; }
      else if (sortKey === 'submittedCount') { av = a.submittedCount; bv = b.submittedCount; }
      else if (sortKey === 'joinedCount') { av = a.joinedCount; bv = b.joinedCount; }
      else { av = a.statusCounts[sortKey] ?? 0; bv = b.statusCounts[sortKey] ?? 0; }
      return sortAsc ? av - bv : bv - av;
    });
  }, [clients, search, sortKey, sortAsc]);

  const totalCands  = useMemo(() => clients.reduce((s, c) => s + c.totalCandidates, 0), [clients]);
  const totalJoined = useMemo(() => clients.reduce((s, c) => s + c.joinedCount, 0), [clients]);
  const topClient   = useMemo(() => [...clients].sort((a, b) => b.totalCandidates - a.totalCandidates)[0], [clients]);

  // Chart: top 8 clients, bars = main statuses
  const chartData = useMemo(() => {
    const subByMain: Record<string, string[]> = {};
    statuses.filter(s => s.type === 'sub').forEach(s => {
      if (s.parent_id) (subByMain[s.parent_id] ??= []).push(s.id);
    });
    return [...filtered].slice(0, 8).map(c => {
      const entry: any = {
        name: c.clientName.length > 12 ? c.clientName.slice(0, 12) + '…' : c.clientName,
        _full: c.clientName,
      };
      mainStatuses.forEach(m => {
        const ids = subByMain[m.id] ?? [];
        entry[m.name] = ids.reduce((s, id) => s + (c.statusCounts[id] ?? 0), 0);
      });
      return entry;
    });
  }, [filtered, mainStatuses, statuses]);

  // ── Export: FULL data (all columns) ─────────────────────────────────────
  const buildExportRows = () => {
    return filtered.map(c => {
      const row: any = {
        'Client Name': c.clientName,
        'Total': c.totalCandidates,
        'Submitted': c.submittedCount,
        'Joined': c.joinedCount,
      };
      // Group by parent for readability
      mainStatuses.forEach(main => {
        const children = orderedSubs.filter(s => s.parent_id === main.id);
        children.forEach(sub => {
          row[`[${main.name}] ${sub.name}`] = c.statusCounts[sub.id] ?? 0;
        });
      });
      return row;
    });
  };

  const exportCSV = () => {
    const rows = buildExportRows();
    const blob = new Blob([Papa.unparse(rows, { header: true })], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
   a.download = `client_report_${
  dateRange.startDate && dateRange.endDate
    ? `${fmt(dateRange.startDate)}_to_${fmt(dateRange.endDate)}`
    : 'all_time'
}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('Client-Wise Report', 14, 16);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    const periodText = dateRange.startDate && dateRange.endDate
  ? `${fmt(dateRange.startDate)} – ${fmt(dateRange.endDate)}`
  : 'All Time';

doc.text(
  `Period: ${periodText} | Total Candidates: ${totalCands} | Clients: ${clients.length}`,
  14,
  22
);

    // Build columns: base + per-main grouped headers
    const baseHeaders = ['Client Name', 'Total', 'Submitted', 'Joined'];
    const dynamicHeaders: string[] = [];
    mainStatuses.forEach(main => {
      const children = orderedSubs.filter(s => s.parent_id === main.id);
      children.forEach(sub => dynamicHeaders.push(`[${main.name}]\n${sub.name}`));
    });
    const allHeaders = [...baseHeaders, ...dynamicHeaders];

    const body = filtered.map(c => {
      const base = [c.clientName, c.totalCandidates.toString(), c.submittedCount.toString(), c.joinedCount.toString()];
      const dynamic: string[] = [];
      mainStatuses.forEach(main => {
        const children = orderedSubs.filter(s => s.parent_id === main.id);
        children.forEach(sub => dynamic.push((c.statusCounts[sub.id] ?? 0).toString()));
      });
      return [...base, ...dynamic];
    });

    // Totals row
    const totals = ['TOTAL', totalCands.toString(),
      filtered.reduce((s,c) => s+c.submittedCount,0).toString(),
      filtered.reduce((s,c) => s+c.joinedCount,0).toString(),
      ...mainStatuses.flatMap(main => orderedSubs.filter(s => s.parent_id === main.id).map(sub =>
        filtered.reduce((s,c) => s+(c.statusCounts[sub.id]??0),0).toString()
      ))
    ];
    body.push(totals);

    autoTable(doc, {
      head: [allHeaders],
      body,
      startY: 26,
      styles: { fontSize: 6, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: { fillColor: [123, 67, 241], textColor: 255, fontSize: 6, fontStyle: 'bold', cellPadding: 2 },
      alternateRowStyles: { fillColor: [250, 248, 255] },
      footStyles: { fillColor: [241, 238, 255], textColor: [50, 50, 50], fontStyle: 'bold' },
      didParseCell: (data) => {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fillColor = [235, 228, 255];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      columnStyles: { 0: { cellWidth: 30 } },
    });
    doc.save(`client_report_${fmt(dateRange.startDate!).replace(/ /g,'_')}.pdf`);
  };

  const doSort = (k: string) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(false); } };

  // Columns for current view
  const tableCols = useMemo(() => [
    { key: 'clientName', label: 'Client', fixed: true },
    { key: 'totalCandidates', label: 'Total', fixed: true },
    { key: 'submittedCount', label: 'Submitted', fixed: true },
    { key: 'joinedCount', label: 'Joined', fixed: true },
    ...visibleSubs.map(s => ({ key: s.id, label: s.name, fixed: false, color: s.color })),
  ], [visibleSubs]);

  if (loading && clients.length === 0) return <div className="flex h-48 items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (error) return <div className="text-xs text-red-600 bg-red-50 rounded-lg p-3">{error}</div>;

  return (
    <div className="flex gap-0 h-full min-h-0">

      {/* ── LEFT: Vertical sub-menu ─────────────────────────────────────── */}
      <div className="flex-shrink-0 w-[148px] bg-white border-r border-gray-100 flex flex-col shadow-sm">
        <div className="px-3 pt-3 pb-2 border-b border-gray-50">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status View</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1" style={{ scrollbarWidth: 'none' }}>
          {/* Overview = all statuses */}
          <button
            onClick={() => setActiveMainId(null)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all group"
            style={{ background: !activeMainId ? '#F5F3FF' : 'transparent' }}
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: !activeMainId ? P : '#CBD5E1' }} />
            <span className="text-xs font-semibold truncate" style={{ color: !activeMainId ? P : '#64748B' }}>
              Overview
            </span>
            {!activeMainId && <ChevronRight size={10} style={{ color: P }} className="ml-auto flex-shrink-0" />}
          </button>

          <div className="px-3 py-1">
            <div className="h-px bg-gray-100" />
          </div>

          {mainStatuses.map(main => {
            const isActive = activeMainId === main.id;
            const childCount = orderedSubs.filter(s => s.parent_id === main.id).length;
            // Total across all clients for this main
            const mainTotal = clients.reduce((sum, c) => {
              const ids = orderedSubs.filter(s => s.parent_id === main.id).map(s => s.id);
              return sum + ids.reduce((s2, id) => s2 + (c.statusCounts[id] ?? 0), 0);
            }, 0);
            return (
              <button
                key={main.id}
                onClick={() => setActiveMainId(isActive ? null : main.id)}
                className="w-full flex flex-col px-3 py-2 text-left transition-all group"
                style={{ background: isActive ? '#F5F3FF' : 'transparent' }}
              >
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
                    <span className="text-[9px] font-bold px-1 rounded" style={{ background: `${P}15`, color: P }}>
                      {mainTotal}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Export buttons at bottom of sidebar */}
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

      {/* ── RIGHT: Main content ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 size={14} style={{ color: P }} />
            <div>
              <p className="text-xs font-bold text-gray-800 leading-none">
                {activeMainId ? mainStatuses.find(m => m.id === activeMainId)?.name : 'All Clients'}
              </p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">
                {filtered.length} clients · {activeMainId ? visibleSubs.length : orderedSubs.length} status columns
              </p>
            </div>
          </div>
          <EnhancedDateRangeSelector value={dateRange} onChange={setDateRange} />
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search client…"
              className="pl-7 pr-3 py-1.5 text-[11px] rounded-lg border border-gray-200 focus:outline-none focus:border-violet-400 w-40" />
          </div>
          {loading && <LoadingSpinner size={14} />}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <KPI label="Total Candidates" value={totalCands} icon={Users} />
            <KPI label="Clients" value={clients.length} icon={Building2} />
            <KPI label="Joined" value={totalJoined} icon={TrendingUp} accent="#059669" />
            <KPI label="Top Client" value={topClient?.clientName ?? '—'} icon={ArrowUpRight}
              accent="#7B43F1" />
          </div>

          {/* Chart (only in overview) */}
          {!activeMainId && chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <p className="text-[10px] font-semibold text-gray-500 mb-2">Top 8 Clients by Main Status</p>
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
                    {/* Main status group headers — shown when viewing all (overview) */}
                    {!activeMainId && (
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th colSpan={4} className="px-3 py-1 text-left text-[9px] text-gray-400" />
                        {mainStatuses.map(main => {
                          const cnt = orderedSubs.filter(s => s.parent_id === main.id).length;
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
                    {/* Selected main header */}
                    {activeMainId && (
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th colSpan={4} className="px-3 py-1 text-left text-[9px] text-gray-400" />
                        <th colSpan={visibleSubs.length}
                          className="px-2 py-1 text-center text-[9px] font-bold border-l border-gray-100"
                          style={{ color: mainStatuses.find(m => m.id === activeMainId)?.color ?? P, background: `${P}0d` }}>
                          {mainStatuses.find(m => m.id === activeMainId)?.name}
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
                            {sortKey === col.key ? (sortAsc ? <ChevronUp size={9} /> : <ChevronDown size={9} />) : null}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => {
                      // const isExp = expanded.has(row.clientName);
                      return (
                        <React.Fragment key={row.clientName}>
<tr className="border-b border-gray-50 hover:bg-violet-50/30 transition-colors">
                            {tableCols.map((col) => {
                              let cell: any;
                              if (col.key === 'clientName') {
cell = (
  <span className="flex items-center gap-1.5">
    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
      style={{ background: ACCENT[i % ACCENT.length] }}>
      {row.clientName.charAt(0).toUpperCase()}
    </span>
    <span className="font-medium text-gray-800 text-xs truncate max-w-[120px]">{row.clientName}</span>
  </span>
);
                              } else if (col.key === 'totalCandidates') {
                                const pct = topClient ? (row.totalCandidates / topClient.totalCandidates) * 100 : 0;
                                cell = (
                                  <span className="flex items-center gap-1.5">
                                    <span className="font-bold text-gray-800 text-xs">{row.totalCandidates}</span>
                                    <div className="w-10 h-1 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: P }} />
                                    </div>
                                  </span>
                                );
                              } else if (col.key === 'submittedCount') {
                                cell = row.submittedCount > 0
                                  ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: '#EDE9FE', color: P }}>{row.submittedCount}</span>
                                  : <span className="text-gray-200 text-[10px]">—</span>;
                              } else if (col.key === 'joinedCount') {
                                cell = row.joinedCount > 0
                                  ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700">{row.joinedCount}</span>
                                  : <span className="text-gray-200 text-[10px]">—</span>;
                              } else {
                                const n = row.statusCounts[col.key] ?? 0;
                                cell = n > 0
                                  ? <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: `${col.color ?? P}18`, color: col.color ?? P }}>{n}</span>
                                  : <span className="text-gray-200 text-[10px]">0</span>;
                              }
                              return (
                                <td key={col.key} className="px-3 py-1.5 whitespace-nowrap border-l first:border-l-0 border-gray-50">
                                  {cell}
                                </td>
                              );
                            })}
                          </tr>
                          {/* Expanded row: show all sub-statuses regardless of nav selection */}
                          {/* {isExp && (
                            <tr>
                              <td colSpan={tableCols.length} className="px-4 py-2 bg-violet-50/30 border-b border-gray-100">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5">
                                  {mainStatuses.map(main => {
                                    const children = orderedSubs.filter(s => s.parent_id === main.id && (row.statusCounts[s.id] ?? 0) > 0);
                                    if (!children.length) return null;
                                    return (
                                      <React.Fragment key={main.id}>
                                        <div className="col-span-full">
                                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: main.color ?? P }}>
                                            {main.name}
                                          </span>
                                        </div>
                                        {children.map(s => (
                                          <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-2 py-1 border border-gray-100">
                                            <span className="text-[9px] text-gray-600 truncate">{s.name}</span>
                                            <span className="text-[10px] font-bold ml-1.5 flex-shrink-0" style={{ color: s.color ?? P }}>{row.statusCounts[s.id]}</span>
                                          </div>
                                        ))}
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )} */}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  {/* Totals footer */}
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                      {tableCols.map(col => {
                        let val: any = '';
                        if (col.key === 'clientName') val = <span className="text-xs font-bold text-gray-700">Total</span>;
                        else if (col.key === 'totalCandidates') val = <span className="text-xs">{filtered.reduce((s,c)=>s+c.totalCandidates,0)}</span>;
                        else if (col.key === 'submittedCount') val = <span className="text-xs">{filtered.reduce((s,c)=>s+c.submittedCount,0)}</span>;
                        else if (col.key === 'joinedCount') val = <span className="text-xs">{filtered.reduce((s,c)=>s+c.joinedCount,0)}</span>;
                        else {
                          const t = filtered.reduce((s,c)=>s+(c.statusCounts[col.key]??0),0);
                          val = t > 0 ? <span className="text-[10px]">{t}</span> : <span className="text-gray-300 text-[10px]">0</span>;
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

export default NewClientWiseReport;