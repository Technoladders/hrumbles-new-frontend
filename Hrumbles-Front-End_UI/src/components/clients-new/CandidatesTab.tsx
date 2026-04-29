// src/components/clients-new/CandidatesTab.tsx
// Light mode — rich mini visualizations + proper paginated table

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import supabase from '@/config/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, ArrowUpDown, Users, ChevronDown, ChevronLeft, ChevronRight, TrendingUp, Calendar, IndianRupee, Star } from 'lucide-react';
import moment from 'moment';
import { Candidate, SortConfig } from './ClientTypes';
import HiddenContactCell from '@/components/ui/HiddenContactCell';
import { useSelector } from 'react-redux';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell, PieChart, Pie } from 'recharts';

const STATUS_CONFIG = {
  default: { OFFERED_STATUS_ID: "9d48d0f9-8312-4f60-aaa4-bafdce067417", OFFER_ISSUED_SUB_STATUS_ID: "bcc84d3b-fb76-4912-86cc-e95448269d6b", JOINED_STATUS_ID: "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e", JOINED_SUB_STATUS_ID: "c9716374-3477-4606-877a-dfa5704e7680" },
  demo: { OFFERED_STATUS_ID: "0557a2c9-6c27-46d5-908c-a826b82a6c47", OFFER_ISSUED_SUB_STATUS_ID: "7ad5ab45-21ab-4af1-92b9-dd0cb1d52887", JOINED_STATUS_ID: "5ab8833c-c409-46b8-a6b0-dbf23591827b", JOINED_SUB_STATUS_ID: "247ef818-9fbe-41ee-a755-a446d620ebb6" },
};
const DEMO_ORGANIZATION_ID = '53989f03-bdc9-439a-901c-45b274eff506';
const USD_TO_INR_RATE = 84;
const ITEMS_PER_PAGE = 10;

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);
const CardHead = ({ title }: { title: string }) => (
  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-violet-700" />
    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
  </div>
);

const Skel = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, j) => <div key={j} className="h-24 rounded-xl bg-gray-100 animate-pulse" style={{ animationDelay: `${(i * 4 + j) * 40}ms` }} />)}</div>
    ))}
  </div>
);

const PALETTE = ['#7B43F1', '#10B981', '#06B6D4', '#F59E0B', '#EF4444'];

const CandidatesTab: React.FC<{ candidates: Candidate[]; loading: boolean; onUpdate: () => void }> = ({ candidates, loading, onUpdate }) => {
  const { toast } = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [sortConfig, setSortConfig] = useState<SortConfig<Candidate>>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const statusIds = useMemo(() => organization_id === DEMO_ORGANIZATION_ID ? STATUS_CONFIG.demo : STATUS_CONFIG.default, [organization_id]);

  const parseSalary = (s?: string): number => {
    if (!s) return 0;
    const isUSD = s.startsWith('$');
    const parts = s.replace(/[$,₹]/g, '').trim().split(' ');
    let amount = parseFloat(parts[0]) || 0;
    const bt = parts[1]?.toLowerCase() || 'lpa';
    if (isUSD) amount *= USD_TO_INR_RATE;
    if (bt === 'monthly') amount *= 12; else if (bt === 'hourly') amount *= 2016;
    return amount;
  };
  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const fmtDate = (d?: string) => d ? moment(new Date(d)).format('DD MMM YYYY') : '—';

  const statusStyle = (sid?: string) => sid === statusIds.JOINED_SUB_STATUS_ID ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200';
  const statusText = (sid?: string) => sid === statusIds.JOINED_SUB_STATUS_ID ? 'Joined' : 'Offer Issued';
  const statusDot = (sid?: string) => sid === statusIds.JOINED_SUB_STATUS_ID ? 'bg-green-500' : 'bg-amber-500';

  const handleStatusChange = async (id: string, subId: string) => {
    setStatusUpdateLoading(id);
    try {
      await supabase.from('hr_job_candidates').update({
        main_status_id: subId === statusIds.OFFER_ISSUED_SUB_STATUS_ID ? statusIds.OFFERED_STATUS_ID : statusIds.JOINED_STATUS_ID,
        sub_status_id: subId,
      }).eq('id', id);
      toast({ title: 'Status Updated' }); onUpdate();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setStatusUpdateLoading(null); }
  };

  const handleSort = (key: keyof Candidate) => {
    setSortConfig(prev => ({ key, direction: prev?.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending' }));
  };

  const sorted = useMemo(() => {
    let items = [...candidates];
    if (sortConfig) items.sort((a, b) => {
      const av = a[sortConfig.key] || '', bv = b[sortConfig.key] || '';
      return sortConfig.direction === 'ascending' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    });
    return items;
  }, [candidates, sortConfig]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Analytics for mini visualizations ─────────────────────────────────────
  const analytics = useMemo(() => {
    const joined = candidates.filter(c => c.sub_status_id === statusIds.JOINED_SUB_STATUS_ID).length;
    const offerIssued = candidates.filter(c => c.sub_status_id === statusIds.OFFER_ISSUED_SUB_STATUS_ID).length;

    // Salary distribution buckets
    const buckets: Record<string, number> = { '<5L': 0, '5–10L': 0, '10–20L': 0, '>20L': 0 };
    let totalSalary = 0, salCount = 0;
    candidates.forEach(c => {
      if (c.ctc) {
        const s = parseSalary(c.ctc);
        totalSalary += s; salCount++;
        if (s < 500000) buckets['<5L']++;
        else if (s < 1000000) buckets['5–10L']++;
        else if (s < 2000000) buckets['10–20L']++;
        else buckets['>20L']++;
      }
    });

    // Hires by month
    const byMonth: Record<string, number> = {};
    candidates.forEach(c => {
      if (c.joining_date) { const mk = moment(c.joining_date).format('MMM YY'); byMonth[mk] = (byMonth[mk] || 0) + 1; }
    });
    const monthData = Object.entries(byMonth).sort((a, b) => moment(a[0], 'MMM YY').valueOf() - moment(b[0], 'MMM YY').valueOf()).map(([month, count]) => ({ month, count }));

    // Profit summary
    let totalProfit = 0, profitCount = 0;
    candidates.forEach(c => { if (c.profit && c.profit > 0) { totalProfit += c.profit; profitCount++; } });

    return {
      joined, offerIssued,
      joinedRate: candidates.length > 0 ? Math.round((joined / candidates.length) * 100) : 0,
      salaryBuckets: Object.entries(buckets).map(([label, count]) => ({ label, count })),
      avgSalary: salCount > 0 ? totalSalary / salCount : 0,
      monthData,
      totalProfit, avgProfit: profitCount > 0 ? totalProfit / profitCount : 0,
      statusDist: [
        { name: 'Joined', value: joined, color: '#10B981' },
        { name: 'Offer Issued', value: offerIssued, color: '#F59E0B' },
      ].filter(d => d.value > 0),
    };
  }, [candidates, statusIds]);

  if (loading) return <Skel />;

  return (
    <div className="space-y-4">
      {/* ── Mini visualizations ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total KPI */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-violet-50"><Users size={14} className="text-violet-600" /></div>
          </div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Candidates</p>
          <p className="text-2xl font-bold text-gray-800 mt-0.5">{candidates.length}</p>
          <div className="flex gap-3 mt-2">
            <div><p className="text-[9px] text-gray-400">Joined</p><p className="text-xs font-bold text-green-600">{analytics.joined}</p></div>
            <div><p className="text-[9px] text-gray-400">Offered</p><p className="text-xs font-bold text-amber-600">{analytics.offerIssued}</p></div>
          </div>
        </Card>

        {/* Join rate donut */}
        <Card className="p-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Join Rate</p>
          <div className="flex items-center gap-3">
            <div className="w-[60px] h-[60px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ value: analytics.joinedRate }, { value: 100 - analytics.joinedRate }]} cx="50%" cy="50%" innerRadius={18} outerRadius={28} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                    <Cell fill="#10B981" />
                    <Cell fill="#F3F4F6" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{analytics.joinedRate}%</p>
              <p className="text-[10px] text-gray-400">of total</p>
            </div>
          </div>
        </Card>

        {/* Avg salary */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Avg Salary</p>
            <IndianRupee size={12} className="text-gray-300" />
          </div>
          <p className="text-lg font-bold text-gray-800">{analytics.avgSalary > 0 ? `₹${(analytics.avgSalary / 100000).toFixed(1)}L` : '—'}</p>
          {/* Salary buckets as tiny bars */}
          <div className="mt-2 flex items-end gap-1 h-8">
            {analytics.salaryBuckets.map((b, i) => {
              const maxCount = Math.max(...analytics.salaryBuckets.map(x => x.count), 1);
              return (
                <TooltipProvider key={b.label}>
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-full rounded-t" style={{ height: `${Math.max((b.count / maxCount) * 28, 3)}px`, backgroundColor: PALETTE[i % PALETTE.length], opacity: b.count > 0 ? 1 : 0.2 }} />
                  </div>
                </TooltipProvider>
              );
            })}
          </div>
          <div className="flex justify-between mt-0.5">
            {analytics.salaryBuckets.map(b => <span key={b.label} className="text-[8px] text-gray-300 text-center flex-1">{b.label}</span>)}
          </div>
        </Card>

        {/* Profit summary */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Profit</p>
            <TrendingUp size={12} className="text-gray-300" />
          </div>
          <p className="text-lg font-bold text-gray-800">{analytics.totalProfit > 0 ? `₹${(analytics.totalProfit / 100000).toFixed(1)}L` : '—'}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Avg: {analytics.avgProfit > 0 ? `₹${(analytics.avgProfit / 100000).toFixed(1)}L` : '—'}</p>
          {analytics.totalProfit > 0 && (
            <div className="mt-2 h-1.5 rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-violet-500" style={{ width: '70%' }} />
            </div>
          )}
        </Card>
      </div>

      {/* Hires by month + salary distribution */}
      {(analytics.monthData.length > 0 || analytics.salaryBuckets.some(b => b.count > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <CardHead title="Hires by Month" />
            <div className="p-4 h-[130px]">
              {analytics.monthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthData} margin={{ top: 0, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="count" name="Hires" fill="#7B43F1" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center"><p className="text-xs text-gray-300">No hire dates available</p></div>}
            </div>
          </Card>

          <Card>
            <CardHead title="Salary Range Distribution" />
            <div className="p-4 h-[130px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.salaryBuckets} margin={{ top: 0, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" name="Candidates" radius={[3, 3, 0, 0]} maxBarSize={36}>
                    {analytics.salaryBuckets.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* ── Candidate Table ───────────────────────────────────────────────── */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-violet-700" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">FTE Staffing</span>
            <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-bold">{candidates.length}</span>
          </div>
          <span className="text-[11px] text-gray-400">Showing {paginated.length} of {sorted.length}</span>
        </div>

        <div className="max-h-[480px] overflow-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {[
                  { label: 'Name', key: 'name' }, { label: 'Contact', key: null },
                  { label: 'Position', key: 'job_title' }, { label: 'Exp', key: null, hidden: true },
                  { label: 'Joined', key: null }, { label: 'Status', key: null },
                  { label: 'Salary', key: null }, { label: 'Profit', key: null, hidden: true },
                ].map(col => (
                  <th key={col.label} className={`px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 ${col.hidden ? 'hidden lg:table-cell' : ''}`}>
                    {col.key ? (
                      <button onClick={() => handleSort(col.key as keyof Candidate)} className="flex items-center gap-1 hover:text-gray-600 transition-colors">
                        {col.label}<ArrowUpDown size={9} />
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length > 0 ? paginated.map(c => (
                <tr key={c.id} className="hover:bg-violet-50/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap"><Link to={`/jobs/candidateprofile/${c.id}/${c.job_id}`} className="text-xs font-semibold text-violet-600 hover:text-violet-800">{c.name}</Link></td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500"><HiddenContactCell email={c.email} phone={c.phone} candidateId={c.id} /></td>
                  <td className="px-4 py-3 whitespace-nowrap"><Link to={`/jobs/${c.job_id}`} className="text-xs text-cyan-600 hover:text-cyan-800">{c.job_title}</Link></td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400 hidden lg:table-cell">{c.experience || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{fmtDate(c.joining_date)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1">
                          {statusUpdateLoading === c.id ? <Loader2 size={12} className="animate-spin text-gray-400" /> : (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusStyle(c.sub_status_id)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusDot(c.sub_status_id)}`} />{statusText(c.sub_status_id)}<ChevronDown size={8} />
                            </span>
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="rounded-xl shadow-lg w-36">
                        <DropdownMenuItem onClick={() => handleStatusChange(c.id, statusIds.OFFER_ISSUED_SUB_STATUS_ID)} className="text-xs text-amber-700">Offer Issued</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(c.id, statusIds.JOINED_SUB_STATUS_ID)} className="text-xs text-green-700">Joined</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{c.ctc ? fmt(parseSalary(c.ctc)) : '—'}</td>
                  <td className={`px-4 py-3 whitespace-nowrap text-xs font-semibold hidden lg:table-cell ${c.profit && c.profit > 0 ? 'text-green-600' : 'text-red-500'}`}>{c.profit ? fmt(c.profit) : '—'}</td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="px-4 py-12 text-center">
                  <Users size={28} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No candidates for this period</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-[11px] text-gray-400">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)} of {sorted.length}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all"><ChevronLeft size={13} /></button>
              <span className="text-xs text-gray-500 font-medium">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all"><ChevronRight size={13} /></button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

// Need TooltipProvider import (was missing in compact form)
import { TooltipProvider } from '@/components/ui/tooltip';

export default CandidatesTab;