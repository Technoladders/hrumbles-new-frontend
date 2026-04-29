// src/components/clients-new/EmployeesTab.tsx
// Light mode — rich mini visualizations + utilization bars + proper pagination + separate child headers

import React, { useState, useMemo } from 'react';
import { Employee, SortConfig } from './ClientTypes';
import { ArrowUpDown, ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon, Briefcase, TrendingUp, Users, IndianRupee, Activity } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell, PieChart, Pie } from 'recharts';

interface GroupedEmployee { id: string; employee_name: string; total_salary_cost_inr: number; total_revenue_inr: number; total_profit_inr: number; assignments: Employee[]; }

const ITEMS_PER_PAGE = 10;
const PALETTE = ['#7B43F1', '#10B981', '#06B6D4', '#F59E0B', '#EF4444'];

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);
const CardHead = ({ title }: { title: string }) => (
  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-500 to-cyan-700" />
    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
  </div>
);

const Skel = () => (
  <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />)}</div>
);

const statusStyle = (s: string) => {
  switch (s?.toLowerCase()) {
    case 'working': return 'bg-green-50 text-green-700 border-green-200';
    case 'relieved': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'terminated': return 'bg-red-50 text-red-600 border-red-200';
    default: return 'bg-gray-50 text-gray-500 border-gray-200';
  }
};

const EmployeesTab: React.FC<{ employees: Employee[]; loading: boolean }> = ({ employees, loading }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig<GroupedEmployee>>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const fmtBilling = (amount: number, type: string, currency: string) =>
    `${currency === 'USD' ? '$' : '₹'}${amount.toLocaleString('en-IN')}${type === 'Hourly' ? '/hr' : type === 'Monthly' ? '/mo' : '/yr'}`;

  const handleSort = (key: keyof GroupedEmployee) => {
    setSortConfig(prev => ({ key, direction: prev?.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending' }));
  };
  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedRows(next);
  };

  const grouped = useMemo((): GroupedEmployee[] => {
    const g: Record<string, GroupedEmployee> = {};
    employees.forEach(a => {
      if (!g[a.id]) g[a.id] = { id: a.id, employee_name: a.employee_name, total_salary_cost_inr: 0, total_revenue_inr: 0, total_profit_inr: 0, assignments: [] };
      g[a.id].assignments.push(a);
      g[a.id].total_revenue_inr += a.actual_revenue_inr;
      g[a.id].total_profit_inr += a.actual_profit_inr;
      g[a.id].total_salary_cost_inr += (a.actual_revenue_inr - a.actual_profit_inr);
    });
    return Object.values(g);
  }, [employees]);

  const sorted = useMemo(() => {
    let items = [...grouped];
    if (sortConfig) items.sort((a, b) => {
      const av = a[sortConfig.key] || '', bv = b[sortConfig.key] || '';
      return sortConfig.direction === 'ascending' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
    });
    return items;
  }, [grouped, sortConfig]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Analytics ──────────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const totalRevenue = grouped.reduce((s, e) => s + e.total_revenue_inr, 0);
    const totalProfit = grouped.reduce((s, e) => s + e.total_profit_inr, 0);
    const totalCost = grouped.reduce((s, e) => s + e.total_salary_cost_inr, 0);

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    employees.forEach(e => { statusCounts[e.status || 'unknown'] = (statusCounts[e.status || 'unknown'] || 0) + 1; });
    const statusData = Object.entries(statusCounts).map(([name, count]) => ({ name, count }));

    // Revenue per employee (top 5)
    const revenuePerEmp = grouped.sort((a, b) => b.total_revenue_inr - a.total_revenue_inr).slice(0, 6).map(e => ({
      name: e.employee_name.split(' ')[0],
      revenue: Math.round(e.total_revenue_inr / 1000),
      profit: Math.round(e.total_profit_inr / 1000),
    }));

    // Billing type breakdown
    const billingCounts: Record<string, number> = {};
    employees.forEach(e => { billingCounts[e.billing_type || 'unknown'] = (billingCounts[e.billing_type || 'unknown'] || 0) + 1; });
    const billingData = Object.entries(billingCounts).map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }));

    return { totalRevenue, totalProfit, totalCost, statusData, revenuePerEmp, billingData, margin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0 };
  }, [grouped, employees]);

  if (loading) return <Skel />;

  const SortTh = ({ label, field }: { label: string; field: keyof GroupedEmployee }) => (
    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
      <button onClick={() => handleSort(field)} className="flex items-center gap-1 hover:text-gray-600 transition-colors">{label}<ArrowUpDown size={9} /></button>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* ── Mini visualizations ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="p-1.5 rounded-lg bg-cyan-50"><Users size={14} className="text-cyan-600" /></div>
          </div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Employees</p>
          <p className="text-2xl font-bold text-gray-800">{grouped.length}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{employees.length} assignment{employees.length !== 1 ? 's' : ''}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Revenue</p>
            <IndianRupee size={12} className="text-gray-300" />
          </div>
          <p className="text-lg font-bold text-gray-800">₹{(analytics.totalRevenue / 100000).toFixed(1)}L</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Cost: ₹{(analytics.totalCost / 100000).toFixed(1)}L</p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${Math.min((analytics.totalRevenue / (analytics.totalRevenue + analytics.totalCost + 1)) * 100, 100)}%` }} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Profit</p>
            <TrendingUp size={12} className="text-gray-300" />
          </div>
          <p className="text-lg font-bold text-gray-800">₹{(analytics.totalProfit / 100000).toFixed(1)}L</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{analytics.margin}% margin</p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${analytics.margin}%` }} />
          </div>
        </Card>

        {/* Status donut */}
        <Card className="p-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">By Status</p>
          <div className="flex items-center gap-2">
            <div className="w-[56px] h-[56px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.statusData} cx="50%" cy="50%" innerRadius={16} outerRadius={26} dataKey="count" stroke="none">
                    {analytics.statusData.map((_, i) => <Cell key={i} fill={['#10B981', '#F59E0B', '#EF4444'][i % 3]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {analytics.statusData.slice(0, 3).map((s, i) => (
                <div key={s.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ['#10B981', '#F59E0B', '#EF4444'][i % 3] }} />
                    <span className="text-[9px] text-gray-500 capitalize">{s.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-700">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue per employee chart */}
      {analytics.revenuePerEmp.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <CardHead title="Revenue by Employee (₹k)" />
            <div className="p-4 h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.revenuePerEmp} margin={{ top: 0, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 11 }} formatter={(v: any, n: string) => [`₹${v}k`, n]} />
                  <Bar dataKey="revenue" name="Revenue" fill="#06B6D4" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="profit" name="Profit" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <CardHead title="Billing Type Mix" />
            <div className="p-4 h-[140px] flex items-center gap-4">
              <div className="w-[90px] h-[90px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.billingData} cx="50%" cy="50%" innerRadius={24} outerRadius={40} dataKey="count" stroke="none">
                      {analytics.billingData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {analytics.billingData.map((b, i) => (
                  <div key={b.name}>
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                        <span className="text-[11px] text-gray-500">{b.name}</span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-700">{b.count}</span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${(b.count / employees.length) * 100}%`, backgroundColor: PALETTE[i % PALETTE.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Employee Table ────────────────────────────────────────────────── */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-500 to-cyan-700" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contractual Staffing</span>
            <span className="text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded font-bold ml-1">{grouped.length}</span>
          </div>
          <span className="text-[11px] text-gray-400">Showing {paginated.length} of {sorted.length}</span>
        </div>

        <div className="max-h-[480px] overflow-auto">
          <table className="min-w-full">
            {/* Parent table header — no Status column here */}
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 w-1/4">
                  <button onClick={() => handleSort('employee_name')} className="flex items-center gap-1 hover:text-gray-600 transition-colors">Name<ArrowUpDown size={9} /></button>
                </th>
                <SortTh label="Salary Cost" field="total_salary_cost_inr" />
                <SortTh label="Revenue" field="total_revenue_inr" />
                <SortTh label="Profit" field="total_profit_inr" />
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length > 0 ? paginated.map(emp => (
                <React.Fragment key={emp.id}>
                  {/* Parent row */}
                  <tr className="hover:bg-cyan-50/20 transition-colors font-medium">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {emp.assignments.length > 0 ? (
                          <button onClick={() => toggleRow(emp.id)} className="p-1 rounded text-gray-300 hover:text-cyan-600 hover:bg-cyan-100 transition-all">
                            {expandedRows.has(emp.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                        ) : <span className="inline-block w-6" />}
                        <span className="text-sm text-gray-800">{emp.employee_name}</span>
                        {emp.assignments.length > 1 && (
                          <span className="text-[9px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">{emp.assignments.length} projects</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{fmt(emp.total_salary_cost_inr)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-800">{fmt(emp.total_revenue_inr)}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-xs font-bold ${emp.total_profit_inr >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(emp.total_profit_inr)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {emp.total_revenue_inr > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(Math.max((emp.total_profit_inr / emp.total_revenue_inr) * 100, 0), 100)}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-500">{Math.round((emp.total_profit_inr / emp.total_revenue_inr) * 100)}%</span>
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                  </tr>

                  {/* Expanded child table — has its own separate header */}
                  {expandedRows.has(emp.id) && emp.assignments.length > 0 && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <div className="bg-violet-50/30 border-l-2 border-violet-300 ml-8">
                          <table className="min-w-full">
                            {/* Child table own separate header */}
                            <thead>
                              <tr className="bg-violet-50/60">
                                <th className="pl-6 pr-4 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-violet-500">Project</th>
                                <th className="px-4 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-violet-500">Status</th>
                                <th className="px-4 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-violet-500">Salary</th>
                                <th className="px-4 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-violet-500">Billing</th>
                                <th className="px-4 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-violet-500">Revenue</th>
                                <th className="px-4 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-violet-500">Profit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-violet-100/50">
                              {emp.assignments.map(a => (
                                <tr key={a.project_id} className="hover:bg-violet-50/50 transition-colors">
                                  <td className="pl-6 pr-4 py-2.5 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <Briefcase size={10} className="text-violet-400/60" />
                                      <span className="text-xs text-gray-600">{a.project_name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 whitespace-nowrap">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize font-semibold ${statusStyle(a.status)}`}>{a.status}</span>
                                  </td>
                                  <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="cursor-default">{fmtBilling(a.salary, a.salary_type, a.salary_currency)}</span>
                                        </TooltipTrigger>
                                        {a.salary_currency === 'USD' && (
                                          <TooltipContent className="text-xs rounded-lg"><p>{fmtBilling(a.salary * 84, a.salary_type, 'INR')}</p></TooltipContent>
                                        )}
                                      </Tooltip>
                                    </TooltipProvider>
                                  </td>
                                  <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500">
                                    {fmtBilling(a.client_billing, a.billing_type, a.currency || 'INR')}
                                  </td>
                                  <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-700 font-medium">{fmt(a.actual_revenue_inr)}</td>
                                  <td className={`px-4 py-2.5 whitespace-nowrap text-xs font-medium ${a.actual_profit_inr >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(a.actual_profit_inr)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )) : (
                <tr><td colSpan={5} className="px-4 py-12 text-center">
                  <Briefcase size={28} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No employees for this period</p>
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
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-cyan-300 hover:text-cyan-600 disabled:opacity-40 transition-all"><ChevronLeft size={13} /></button>
              <span className="text-xs text-gray-500 font-medium">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-cyan-300 hover:text-cyan-600 disabled:opacity-40 transition-all"><ChevronRightIcon size={13} /></button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default EmployeesTab;