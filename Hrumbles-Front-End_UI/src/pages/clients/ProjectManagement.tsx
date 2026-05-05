// src/pages/clients/ProjectManagement.tsx
// Light mode — bg-[#F7F7F8], white cards, #7B43F1 violet, rich visualizations

import React, { useState, Component, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProjectTable from "@/components/Project/ProjectTable";
import AddProjectDialog from "@/components/Client/AddProjectDialog";
import { Button } from "@/components/ui/button";
import {
  Plus, Briefcase, CheckCircle, XCircle, ReceiptIndianRupee, TrendingUp,
  Star, ArrowUpRight, Activity, Layers,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie,
} from "recharts";
import Loader from "@/components/ui/Loader";
import { useSelector } from "react-redux";
import { Tooltip as ReactTooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector";
import { startOfYear, eachMonthOfInterval, format, isWithinInterval } from "date-fns";

const EXCHANGE_RATE_USD_TO_INR = 84;

// ─── Types (UNCHANGED) ────────────────────────────────────────────────────────
interface Project { id: string; name: string; status: string; client_id: string; start_date: string; created_by_name: string; hr_clients: { display_name: string; currency: string } | null; }
interface ProjectEmployee { client_id: string; project_id: string; assign_employee: string; salary: number; client_billing: number; billing_type: string; salary_type: string; salary_currency: string; working_hours?: number; working_days_config?: 'all_days' | 'weekdays_only' | 'saturday_working'; }
interface TimeLog { id: string; employee_id: string; date: string; project_time_data: { projects: { hours: number; report: string; clientId: string; projectId: string }[] }; total_working_hours: string; }
export interface ProjectFinancialData extends Project { assigned_employees: number; revenue_inr: number; revenue_usd: number; }
interface DateRange { startDate: Date | null; endDate: Date | null; }

// ─── Shared UI helpers ────────────────────────────────────────────────────────
const WCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-1">
    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-violet-700" />
    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{children}</span>
  </div>
);

const KpiCard = ({ title, value, sub, icon, color, trend }: { title: string; value: string; sub?: string; icon: React.ReactNode; color: string; trend?: string }) => (
  <WCard className="p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-2">
      <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <ArrowUpRight size={13} className="text-gray-300" />
    </div>
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{title}</p>
    <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
  </WCard>
);

const LightTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: ₹{(p.value / 1000).toFixed(1)}k
        </p>
      ))}
    </div>
  );
};

// ─── Error Boundary (UNCHANGED) ───────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string | null }> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error: error.message }; }
  render() {
    if (this.state.hasError) return <div className="text-red-500 text-center p-4 text-sm">Error: {this.state.error}</div>;
    return this.props.children;
  }
}

// ─── Palette ─────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = { ongoing: '#3B82F6', completed: '#10B981', cancelled: '#EF4444' };
const CHART_PALETTE = ['#7B43F1', '#A855F7', '#EC4899', '#6366F1', '#C026D3', '#8B5CF6'];

const ProjectManagement = () => {
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [chartView, setChartView] = useState<'topRevenue' | 'all'>('topRevenue');
  const [currentPage, setCurrentPage] = useState(0);
  const [editingProject, setEditingProject] = useState<ProjectFinancialData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: startOfYear(new Date()), endDate: new Date() });
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => { setCurrentPage(0); }, [chartView]);

  // ── Queries (UNCHANGED logic) ─────────────────────────────────────────────
  const { data: projects, isLoading: lP, isSuccess: sP } = useQuery({
    queryKey: ["projects", organization_id],
    queryFn: async () => {
      if (!organization_id) return [];
      const { data, error } = await supabase.from("hr_projects").select(`id, name, status, client_id, start_date, created_by, hr_clients!hr_projects_client_id_fkey(display_name, currency), users:created_by(first_name, last_name)`).eq("organization_id", organization_id);
      if (error) throw error;
      return data?.map(p => ({ ...p, created_by_name: `${p.users?.first_name || 'N/A'} ${p.users?.last_name || ''}`.trim() })) as Project[] || [];
    },
    enabled: !!organization_id,
  });

  const { data: projectEmployees, isLoading: lE, isSuccess: sE } = useQuery({
    queryKey: ["project-employees", organization_id],
    queryFn: async () => {
      if (!organization_id) return [];
      const { data, error } = await supabase.from("hr_project_employees").select(`client_id, project_id, assign_employee, salary, client_billing, billing_type, salary_type, salary_currency, organization_id, working_hours, working_days_config`).eq("organization_id", organization_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization_id,
  });

  const { data: timeLogs, isLoading: lT, isSuccess: sT } = useQuery({
    queryKey: ["time_logs", organization_id, dateRange],
    queryFn: async () => {
      if (!organization_id || !dateRange.startDate || !dateRange.endDate) return [];
      const { data, error } = await supabase.from("time_logs").select("id, employee_id, date, project_time_data, total_working_hours").eq("is_approved", true).eq("organization_id", organization_id).gte("date", dateRange.startDate.toISOString()).lte("date", dateRange.endDate.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization_id,
  });

  // ── Calculation helpers (UNCHANGED) ──────────────────────────────────────
  const calculateEmployeeHours = (employeeId: string, projectId: string, logs: TimeLog[]) =>
    logs?.filter(l => l.employee_id === employeeId).reduce((acc, l) => acc + (l.project_time_data?.projects?.find(p => p.projectId === projectId)?.hours || 0), 0) || 0;

  const calculateActualRevenue = (employee: ProjectEmployee, projectId: string, clientCurrency: string, logs: TimeLog[]) => {
    const hours = calculateEmployeeHours(employee.assign_employee, projectId, logs);
    const config = employee.working_days_config || 'all_days';
    let clientBilling = Number(employee.client_billing) || 0;
    if (clientCurrency === "USD") clientBilling *= EXCHANGE_RATE_USD_TO_INR;
    let hourlyRate = 0;
    const avg = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
    const hrs = employee.working_hours || 8;
    switch (employee.billing_type) { case "Monthly": hourlyRate = (clientBilling * 12) / (avg * hrs); break; case "LPA": hourlyRate = clientBilling / (avg * hrs); break; case "Hourly": hourlyRate = clientBilling; break; }
    return hours * (hourlyRate || 0);
  };

  // ── Project financials (UNCHANGED logic) ─────────────────────────────────
  const projectFinancials: ProjectFinancialData[] = useMemo(() => {
    if (!projects || !projectEmployees || !timeLogs) return [];
    return projects.map(project => {
      const emps = projectEmployees.filter(pe => pe.project_id === project.id);
      const currency = project.hr_clients?.currency || "INR";
      const totalRev = emps.reduce((acc, pe) => acc + calculateActualRevenue(pe, project.id, currency, timeLogs), 0);
      return { ...project, assigned_employees: emps.length, revenue_inr: totalRev, revenue_usd: totalRev / EXCHANGE_RATE_USD_TO_INR };
    });
  }, [projects, projectEmployees, timeLogs]);

  // ── Monthly chart data (UNCHANGED logic) ─────────────────────────────────
  const monthlyChartData = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return [];
    const months = eachMonthOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
    const init = months.map(m => ({ month: format(m, 'MMM'), revenue: 0 }));
    if (!timeLogs || !projectEmployees || !projects) return init;
    timeLogs.forEach(log => {
      const lm = format(new Date(log.date), 'MMM');
      const mData = init.find(m => m.month === lm);
      if (mData && log.project_time_data?.projects) {
        log.project_time_data.projects.forEach(p => {
          const emp = projectEmployees.find(e => e.assign_employee === log.employee_id && e.project_id === p.projectId);
          const proj = projects.find(proj => proj.id === p.projectId);
          if (emp && proj) {
            const config = emp.working_days_config || 'all_days';
            const dWH = emp.working_hours || 8;
            const avg = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
            let hr = 0; let cb = Number(emp.client_billing) || 0;
            if (proj.hr_clients?.currency === 'USD') cb *= EXCHANGE_RATE_USD_TO_INR;
            switch (emp.billing_type) { case "Monthly": hr = (cb * 12) / (avg * dWH); break; case "LPA": hr = cb / (avg * dWH); break; case "Hourly": hr = cb; break; }
            mData.revenue += (p.hours || 0) * hr;
          }
        });
      }
    });
    return init;
  }, [timeLogs, projectEmployees, projects, dateRange]);

  const dataForChart = useMemo(() => {
    const copy = [...projectFinancials];
    if (chartView === 'topRevenue') return copy.sort((a, b) => b.revenue_inr - a.revenue_inr).slice(0, 10);
    const si = currentPage * ITEMS_PER_PAGE;
    return copy.slice(si, si + ITEMS_PER_PAGE);
  }, [projectFinancials, chartView, currentPage]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalProjects = projectFinancials.length;
  const ongoingProjects = projectFinancials.filter(p => p.status === "ongoing").length;
  const completedProjects = projectFinancials.filter(p => p.status === "completed").length;
  const cancelledProjects = projectFinancials.filter(p => p.status === "cancelled").length;
  const totalRevenueINR = projectFinancials.reduce((acc, p) => acc + p.revenue_inr, 0) || 0;
  const topPerformer = projectFinancials.reduce<ProjectFinancialData | null>((top, p) => (!top || p.revenue_inr > top.revenue_inr) ? p : top, null);
  const isDataLoading = !sP || !sE || !sT;
  const formatINR = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const statusPieData = [
    { name: 'Ongoing', value: ongoingProjects, color: STATUS_COLORS.ongoing },
    { name: 'Completed', value: completedProjects, color: STATUS_COLORS.completed },
    { name: 'Cancelled', value: cancelledProjects, color: STATUS_COLORS.cancelled },
  ].filter(d => d.value > 0);

  // Top 5 projects for mini leaderboard
  const top5 = [...projectFinancials].sort((a, b) => b.revenue_inr - a.revenue_inr).slice(0, 5);

  if (lP || lE || lT) return (
    <div className="min-h-screen bg-[#F7F7F8] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3"><Loader size={40} className="border-[4px] animate-spin text-violet-600" /><p className="text-sm text-gray-400">Loading projects…</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track revenue and manage all project activities</p>
          </div>
          <div className="flex items-center gap-3">
            <EnhancedDateRangeSelector value={dateRange} onChange={setDateRange} />
            <button
              onClick={() => setAddProjectOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #7B43F1, #6D28D9)' }}
            >
              <Plus size={15} /> Create Project
            </button>
          </div>
        </div>

        {/* ── KPI Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard title="Total Projects" value={totalProjects.toString()} icon={<Briefcase size={16} />} color="#7B43F1" />
          <KpiCard title="Ongoing" value={ongoingProjects.toString()} icon={<Activity size={16} />} color="#3B82F6" sub={`${totalProjects > 0 ? Math.round((ongoingProjects / totalProjects) * 100) : 0}% of total`} />
          <KpiCard title="Completed" value={completedProjects.toString()} icon={<CheckCircle size={16} />} color="#10B981" />
          <KpiCard title="Cancelled" value={cancelledProjects.toString()} icon={<XCircle size={16} />} color="#EF4444" />
          <KpiCard title="Total Revenue" value={`₹${(totalRevenueINR / 100000).toFixed(1)}L`} icon={<ReceiptIndianRupee size={16} />} color="#F59E0B" sub={topPerformer ? `Top: ${topPerformer.name.substring(0, 14)}` : undefined} />
        </div>

        {/* ── Charts Row 1 ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Monthly revenue area chart */}
          <WCard className="lg:col-span-2 p-5">
            <SectionLabel>Monthly Revenue Trend</SectionLabel>
            {monthlyChartData.length > 0 ? (
              <div className="h-[200px] mt-2">
                <ResponsiveContainer width="100%" height="130%">
                  <AreaChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pmRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7B43F1" stopOpacity={0.5} />
                        <stop offset="50%" stopColor="#A855F7" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<LightTooltip />} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#7B43F1" strokeWidth={2} fill="url(#pmRevGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="h-[200px] flex items-center justify-center"><p className="text-sm text-gray-300">No data for selected period</p></div>}
          </WCard>

          {/* Status distribution + top projects */}
          <div className="flex flex-col gap-4">
            {/* Status pie */}
            <WCard className="p-4 flex-1">
              <SectionLabel>Status Distribution</SectionLabel>
              {statusPieData.length > 0 ? (
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-[80px] h-[80px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={22} outerRadius={36} dataKey="value" stroke="none">
                          {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {statusPieData.map(entry => (
                      <div key={entry.name}>
                        <div className="flex justify-between items-center mb-0.5">
                          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-[11px] text-gray-500">{entry.name}</span></div>
                          <span className="text-[11px] font-bold text-gray-700">{entry.value}</span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-100">
                          <div className="h-full rounded-full" style={{ width: `${totalProjects > 0 ? (entry.value / totalProjects) * 100 : 0}%`, backgroundColor: entry.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-xs text-gray-300 mt-2">No data</p>}
            </WCard>

            {/* Top performer mini */}
            <WCard className="p-4 flex-1">
              <SectionLabel>Top Revenue Projects</SectionLabel>
              <div className="space-y-2 mt-2">
                {top5.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full flex-shrink-0 text-[9px] font-bold text-white flex items-center justify-center" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-gray-700 truncate">{p.name}</p>
                      <div className="h-1 rounded-full bg-gray-100 mt-0.5">
                        <div className="h-full rounded-full bg-violet-400" style={{ width: `${top5[0].revenue_inr > 0 ? (p.revenue_inr / top5[0].revenue_inr) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 flex-shrink-0">₹{(p.revenue_inr / 1000).toFixed(0)}k</span>
                  </div>
                ))}
              </div>
            </WCard>
          </div>
        </div>

        {/* ── Revenue per Project chart ──────────────────────────────── */}
        <WCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Revenue per Project</SectionLabel>
            <div className="flex gap-1 p-1 rounded-lg bg-gray-100">
              {(['topRevenue', 'all'] as const).map(v => (
                <button key={v} onClick={() => setChartView(v)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${chartView === v ? 'bg-white text-violet-700 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'}`}>
                  {v === 'topRevenue' ? 'Top 10' : 'All'}
                </button>
              ))}
            </div>
          </div>
          {isDataLoading ? (
            <div className="flex items-center justify-center h-[220px]"><Loader size={32} /></div>
          ) : dataForChart.length > 0 ? (
            <>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="130%">
                  <BarChart data={dataForChart.map(d => ({ ...d, name: d.name.length > 12 ? d.name.substring(0, 12) + '…' : d.name }))} margin={{ top: 5, right: 10, left: 5, bottom: 40 }}>
                    <defs>
                      <linearGradient id="pmBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7B43F1" stopOpacity={1} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="name" angle={0} textAnchor="end" interval={0} height={48} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<LightTooltip />} />
                    <Bar dataKey="revenue_inr" name="Revenue" fill="url(#pmBarGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {chartView === 'all' && projectFinancials.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-center gap-3 mt-3">
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 0))} disabled={currentPage === 0} className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all">Prev</button>
                  <span className="text-xs text-gray-500">{currentPage + 1} / {Math.ceil(projectFinancials.length / ITEMS_PER_PAGE)}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(projectFinancials.length / ITEMS_PER_PAGE) - 1))} disabled={currentPage >= Math.ceil(projectFinancials.length / ITEMS_PER_PAGE) - 1} className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all">Next</button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-[220px]"><p className="text-sm text-gray-400">No project data for selected period</p></div>
          )}
        </WCard>

        {/* ── Table ──────────────────────────────────────────────────── */}
        <WCard className="overflow-hidden">
          <div className="p-5">
            <ProjectTable projectFinancials={projectFinancials} setAddProjectOpen={setAddProjectOpen} isLoading={isDataLoading} setEditingProject={setEditingProject} />
          </div>
        </WCard>
      </div>

      <AddProjectDialog open={addProjectOpen} onOpenChange={open => { setAddProjectOpen(open); if (!open) setEditingProject(null); }} editingProject={editingProject} />
    </div>
  );
};

export default ProjectManagement;
// cloro