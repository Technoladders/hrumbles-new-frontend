// src/pages/client-dashboard/ClientManagementDashboard.tsx
// Light mode — bg-[#F7F7F8], white cards, #7B43F1 violet accent

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { useSelector } from "react-redux";
import AddClientDialog from "@/components/Client/AddClientDialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Briefcase, ChevronLeft, ChevronRight, Eye, Edit, Trash2, Loader2, Plus,
  ReceiptIndianRupee, TrendingUp, Search, UserCheck2, Building2, BarChart3,
  ChevronDown, ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell,
} from "recharts";

// --- Constants (UNCHANGED) ---
const STATUS_CONFIG = {
  default: {
    OFFERED_STATUS_ID: "9d48d0f9-8312-4f60-aaa4-bafdce067417",
    OFFER_ISSUED_SUB_STATUS_ID: "bcc84d3b-fb76-4912-86cc-e95448269d6b",
    JOINED_STATUS_ID: "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e",
    JOINED_SUB_STATUS_ID: "c9716374-3477-4606-877a-dfa5704e7680",
  },
  demo: {
    OFFERED_STATUS_ID: "0557a2c9-6c27-46d5-908c-a826b82a6c47",
    OFFER_ISSUED_SUB_STATUS_ID: "7ad5ab45-21ab-4af1-92b9-dd0cb1d52887",
    JOINED_STATUS_ID: "5ab8833c-c409-46b8-a6b0-dbf23591827b",
    JOINED_SUB_STATUS_ID: "247ef818-9fbe-41ee-a755-a446d620ebb6",
  }
};
const DEMO_ORGANIZATION_ID = '53989f03-bdc9-439a-901c-45b274eff506';
const USD_TO_INR_RATE = 84;

const CHART_COLORS = ['#7B43F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
const PIE_COLORS = ['#7B43F1', '#F59E0B', '#10B981'];
const STATUS_COLORS: Record<string, string> = {
  active: '#10B981', inactive: '#EF4444', pending: '#F59E0B',
};

// --- Types (UNCHANGED) ---
interface Client {
  id: string; display_name: string; client_name: string; service_type: string[];
  status: string; commission_value?: number; commission_type?: string; currency: string;
  internal_contact?: string; hr_employees?: { first_name?: string; last_name?: string };
}
interface Candidate { id: string; name: string; job_id: string; ctc?: string; accrual_ctc?: string; expected_salary?: number; main_status_id?: string; }
interface Employee { id: string; assign_employee: string; project_id: string; client_id: string; salary: number; client_billing: number; billing_type: string; salary_type: string; salary_currency: string; working_hours?: number; working_days_config?: 'all_days' | 'weekdays_only' | 'saturday_working'; }
interface Job { id: string; title: string; client_owner: string; job_type_category: string; }
interface TimeLog { id: string; employee_id: string; date: string; project_time_data: { projects: { hours: number; projectId: string }[] }; }
interface Metrics { totalRevenue: number; totalProfit: number; totalClients: number; activeClients: number; }

// ─── Shared UI helpers ────────────────────────────────────────────────────────
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-violet-700" />
    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{children}</span>
  </div>
);

const KpiCard = ({ title, value, icon, color, sub }: { title: string; value: string; icon: React.ReactNode; color: string; sub?: string }) => (
  <Card className="p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-2">
      <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <ArrowUpRight size={13} className="text-gray-300" />
    </div>
    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">{title}</p>
    <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
  </Card>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    inactive: 'bg-red-50 text-red-600 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const dots: Record<string, string> = { active: 'bg-green-500', inactive: 'bg-red-500', pending: 'bg-amber-500' };
  const key = status?.toLowerCase() || '';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${styles[key] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[key] || 'bg-gray-400'}`} />
      {status || 'Unknown'}
    </span>
  );
};

const LightTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: ₹{(p.value / 1000).toFixed(1)}k
        </p>
      ))}
    </div>
  );
};

const ClientManagementDashboard = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ totalRevenue: 0, totalProfit: 0, totalClients: 0, activeClients: 0 });
  const [clientFinancials, setClientFinancials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const statusIds = useMemo(() => organization_id === DEMO_ORGANIZATION_ID ? STATUS_CONFIG.demo : STATUS_CONFIG.default, [organization_id]);

  // --- ALL CALCULATION FUNCTIONS UNCHANGED ---
  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  const parseSalary = (salary: string | number | undefined): number => {
    if (!salary) return 0;
    let amountStr = salary.toString().trim();
    const currencies = [{ value: "USD", symbol: "$" }, { value: "INR", symbol: "₹" }];
    let currency = currencies.find((c) => amountStr.startsWith(c.symbol)) || { value: "INR" };
    if ((currency as any).symbol) amountStr = amountStr.replace((currency as any).symbol, "").trim();
    const parts = amountStr.split(" ");
    const amount = parseFloat(parts[0].replace(/,/g, '')) || 0;
    let convertedAmount = amount;
    if (currency.value === "USD") convertedAmount *= USD_TO_INR_RATE;
    if (parts.length > 1) { const bt = parts[1].toLowerCase(); if (bt === "monthly") convertedAmount *= 12; else if (bt === "hourly") convertedAmount *= 2016; }
    return convertedAmount;
  };
  const calculateProfit = (candidate: Candidate, currency: string, commissionType: string, commissionValue: number, jobType: Job): number => {
    const accrualAmount = candidate.accrual_ctc ? parseSalary(candidate.accrual_ctc) : 0;
    const salaryAmount = candidate.ctc ? parseSalary(candidate.ctc) : (candidate.expected_salary || 0);
    if (jobType.job_type_category?.toLowerCase() === "internal") return accrualAmount - salaryAmount;
    if (commissionType?.toLowerCase() === "percentage" && commissionValue) return (salaryAmount * commissionValue) / 100;
    if (commissionType?.toLowerCase() === "fixed" && commissionValue) return currency === "USD" ? commissionValue * USD_TO_INR_RATE : commissionValue;
    return 0;
  };
  const calculateEmployeeHours = (employeeId: string, projectId: string, timeLogs: TimeLog[]): number =>
    timeLogs?.filter(log => log.employee_id === employeeId).reduce((acc, log) => acc + (log.project_time_data?.projects?.find(p => p.projectId === projectId)?.hours || 0), 0);
  const calculateEmployeeRevenue = (employee: Employee, projectId: string, clientCurrency: string, timeLogs: TimeLog[]): number => {
    const hours = calculateEmployeeHours(employee.assign_employee, projectId, timeLogs);
    const config = employee.working_days_config || 'all_days';
    let clientBilling = Number(employee.client_billing) || 0;
    if (clientCurrency === "USD") clientBilling *= USD_TO_INR_RATE;
    let hourlyRate = 0;
    const avg = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
    const hrs = employee.working_hours || 8;
    switch (employee.billing_type?.toLowerCase()) { case "monthly": hourlyRate = (clientBilling * 12) / (avg * hrs); break; case "lpa": hourlyRate = clientBilling / (avg * hrs); break; case "hourly": hourlyRate = clientBilling; break; }
    return hours * (hourlyRate || 0);
  };
  const calculateEmployeeProfit = (employee: Employee, projectId: string, clientCurrency: string, timeLogs: TimeLog[]): number => {
    const revenue = calculateEmployeeRevenue(employee, projectId, clientCurrency, timeLogs);
    const hours = calculateEmployeeHours(employee.assign_employee, projectId, timeLogs);
    const config = employee.working_days_config || 'all_days';
    let salary = Number(employee.salary) || 0;
    if (employee.salary_currency === "USD") salary *= USD_TO_INR_RATE;
    let hourlySalaryRate = 0;
    const avg = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
    const hrs = employee.working_hours || 8;
    switch (employee.salary_type?.toLowerCase()) { case "monthly": hourlySalaryRate = (salary * 12) / (avg * hrs); break; case "lpa": hourlySalaryRate = salary / (avg * hrs); break; case "hourly": hourlySalaryRate = salary; break; }
    return revenue - (hours * (hourlySalaryRate || 0));
  };

  // --- DATA FETCHING UNCHANGED ---
  const fetchAllData = useCallback(async () => {
    if (!organization_id) return;
    setLoading(true);
    try {
      const { data: clientsData, error: clientsError } = await supabase.from("hr_clients").select("*, hr_employees:hr_employees!hr_clients_created_by_fkey(first_name, last_name)").eq("organization_id", organization_id);
      if (clientsError) throw clientsError;
      if (!clientsData) { setLoading(false); return; }
      setClients(clientsData);
      const { data: candidatesData } = await supabase.from("hr_job_candidates").select(`*, hr_jobs!hr_job_candidates_job_id_fkey(*)`).or(`main_status_id.eq.${statusIds.JOINED_STATUS_ID},main_status_id.eq.${statusIds.OFFERED_STATUS_ID}`).in("sub_status_id", [statusIds.JOINED_SUB_STATUS_ID, statusIds.OFFER_ISSUED_SUB_STATUS_ID]);
      const { data: employeesData } = await supabase.from("hr_project_employees").select("*");
      const { data: timeLogs } = await supabase.from("time_logs").select("*").eq("is_approved", true);
      let totalRevenue = 0, totalProfit = 0;
      const metricsByClient: { [k: string]: { revenue: number; profit: number } } = {};
      clientsData.forEach(c => { metricsByClient[c.client_name] = { revenue: 0, profit: 0 }; });
      if (candidatesData) {
        candidatesData.forEach((candidate) => {
          const job = (candidate as any).hr_jobs;
          const client = clientsData.find((c) => c.client_name === job?.client_owner);
          if (!job || !client) return;
          const candProfit = calculateProfit(candidate, client.currency || "INR", client.commission_type || "", client.commission_value || 0, job);
          const candRevenue = job.job_type_category.toLowerCase() === "internal" ? parseSalary(candidate.accrual_ctc) : candProfit;
          totalRevenue += candRevenue; totalProfit += candProfit;
          if (metricsByClient[client.client_name]) { metricsByClient[client.client_name].revenue += candRevenue; metricsByClient[client.client_name].profit += candProfit; }
        });
      }
      if (employeesData) {
        employeesData.forEach((employee) => {
          const client = clientsData.find((c) => c.id === employee.client_id);
          if (!client) return;
          const empRevenue = calculateEmployeeRevenue(employee, employee.project_id, client.currency, timeLogs || []);
          const empProfit = calculateEmployeeProfit(employee, employee.project_id, client.currency, timeLogs || []);
          totalRevenue += empRevenue; totalProfit += empProfit;
          if (metricsByClient[client.client_name]) { metricsByClient[client.client_name].revenue += empRevenue; metricsByClient[client.client_name].profit += empProfit; }
        });
      }
      setMetrics({ totalRevenue, totalProfit, totalClients: clientsData.length, activeClients: clientsData.filter(c => c.status === "active").length });
      setClientFinancials(clientsData.map(c => ({ client_name: c.client_name, revenue_inr: metricsByClient[c.client_name]?.revenue || 0, profit_inr: metricsByClient[c.client_name]?.profit || 0 })));
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to load data: ${error.message}`, variant: "destructive" });
    } finally { setLoading(false); }
  }, [organization_id, toast, statusIds]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // --- DERIVED DATA ---
  const chartData = useMemo(() =>
    [...clientFinancials].filter(c => c.revenue_inr > 0).sort((a, b) => b.revenue_inr - a.revenue_inr).slice(0, 10)
      .map(item => ({
        ...item,
        name: item.client_name.length > 10 ? item.client_name.substring(0, 10) + '…' : item.client_name,
      })), [clientFinancials]);

  const serviceTypeDistribution = useMemo(() => {
    const dist = { permanent: 0, contractual: 0, both: 0 };
    clients.forEach(c => { const isP = c.service_type?.includes('permanent'); const isC = c.service_type?.includes('contractual'); if (isP && isC) dist.both++; else if (isP) dist.permanent++; else if (isC) dist.contractual++; });
    return [{ name: 'Permanent', value: dist.permanent }, { name: 'Contractual', value: dist.contractual }, { name: 'Both', value: dist.both }].filter(i => i.value > 0);
  }, [clients]);

  const clientStatusDist = useMemo(() => {
    const d = { active: 0, inactive: 0, pending: 0 };
    clients.forEach(c => { if (c.status === 'active') d.active++; else if (c.status === 'inactive') d.inactive++; else if (c.status === 'pending') d.pending++; });
    return [{ name: 'Active', value: d.active }, { name: 'Inactive', value: d.inactive }, { name: 'Pending', value: d.pending }].filter(i => i.value > 0);
  }, [clients]);

  const processedClients = useMemo(() => {
    const statusOrder: Record<string, number> = { active: 1, pending: 2, inactive: 3 };
    return clients.filter(client => {
      if (!client.client_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (activeFilter === "all") return true;
      const isP = client.service_type?.includes("permanent"); const isC = client.service_type?.includes("contractual");
      if (activeFilter === "permanent") return isP && !isC;
      if (activeFilter === "contractual") return isC && !isP;
      if (activeFilter === "both") return isP && isC;
      return false;
    }).sort((a, b) => { const oA = statusOrder[a.status] || 99; const oB = statusOrder[b.status] || 99; return oA !== oB ? oA - oB : a.client_name.localeCompare(b.client_name); });
  }, [clients, searchQuery, activeFilter]);

  const paginatedClients = useMemo(() => processedClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [processedClients, currentPage, itemsPerPage]);
  const totalPages = Math.ceil(processedClients.length / itemsPerPage);

  // --- HANDLERS UNCHANGED ---
  const handleClientClick = (clientName: string) => navigate(`/clients/${encodeURIComponent(clientName)}/candidates`);
  const handleStatusChange = async (clientId: string, status: string) => {
    setStatusUpdateLoading(clientId);
    try { const { error } = await supabase.from("hr_clients").update({ status }).eq("id", clientId); if (error) throw error; await fetchAllData(); toast({ title: "Status Updated" }); }
    catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setStatusUpdateLoading(null); }
  };
  const handleEditClient = (client: Client) => { setEditClient(client); setAddClientOpen(true); };
  const handleDeleteClient = (client: Client) => { setClientToDelete(client); setDeleteDialogOpen(true); };
  const confirmDeleteClient = async () => {
    if (!clientToDelete) return; setActionLoading(true);
    try { const { error } = await supabase.from("hr_clients").delete().eq("id", clientToDelete.id); if (error) throw error; await fetchAllData(); toast({ title: "Client Deleted" }); }
    catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setActionLoading(false); setDeleteDialogOpen(false); setClientToDelete(null); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F7F7F8] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <p className="text-sm text-gray-400">Loading clients…</p>
      </div>
    </div>
  );

  const profitMarginPct = metrics.totalRevenue > 0 ? ((metrics.totalProfit / metrics.totalRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage clients, track revenue and performance</p>
          </div>
          <button
            onClick={() => setAddClientOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7B43F1, #6D28D9)' }}
          >
            <Plus size={15} /> Add Client
          </button>
        </div>

        {/* ── KPI Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Total Revenue" value={formatCurrency(metrics.totalRevenue)} icon={<ReceiptIndianRupee size={16} />} color="#7B43F1" sub="All-time" />
          <KpiCard title="Total Profit" value={formatCurrency(metrics.totalProfit)} icon={<TrendingUp size={16} />} color="#06B6D4" sub={`${profitMarginPct}% margin`} />
          <KpiCard title="Total Clients" value={metrics.totalClients.toString()} icon={<Briefcase size={16} />} color="#10B981" sub={`${metrics.activeClients} active`} />
          <KpiCard title="Active Clients" value={metrics.activeClients.toString()} icon={<UserCheck2 size={16} />} color="#F59E0B" sub={`${metrics.totalClients > 0 ? Math.round((metrics.activeClients / metrics.totalClients) * 100) : 0}% of total`} />
        </div>

        {/* ── Charts ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Chart */}
          <Card className="lg:col-span-2 p-5">
            <SectionTitle>Revenue & Profit — Top 10 Clients</SectionTitle>
            {chartData.length > 0 ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 40 }}>
                    <defs>
                      <linearGradient id="revBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7B43F1" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#7B43F1" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="profAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={48} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#7B43F1' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#06B6D4' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip content={<LightTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#6B7280', paddingTop: 4 }} />
                    <Bar yAxisId="left" dataKey="revenue_inr" name="Revenue" fill="url(#revBarGrad)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    <Area yAxisId="right" type="monotone" dataKey="profit_inr" name="Profit" stroke="#06B6D4" strokeWidth={2} fill="url(#profAreaGrad)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center flex-col gap-2">
                <BarChart3 size={32} className="text-gray-200" />
                <p className="text-sm text-gray-400">No financial data yet</p>
              </div>
            )}
          </Card>

          {/* Right mini charts */}
          <div className="flex flex-col gap-4">
            {/* Service Type Donut */}
            <Card className="p-4 flex-1">
              <SectionTitle>Service Types</SectionTitle>
              {serviceTypeDistribution.length > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="w-[100px] h-[100px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={serviceTypeDistribution} cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={3} dataKey="value" stroke="none">
                          {serviceTypeDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {serviceTypeDistribution.map((entry, i) => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-[11px] text-gray-500">{entry.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-700">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-4">No data</p>}
            </Card>

            {/* Status bar chart */}
            <Card className="p-4 flex-1">
              <SectionTitle>Client Status</SectionTitle>
              <div className="space-y-2.5">
                {clientStatusDist.map(entry => {
                  const pct = metrics.totalClients > 0 ? Math.round((entry.value / metrics.totalClients) * 100) : 0;
                  const color = STATUS_COLORS[entry.name.toLowerCase()] || '#9CA3AF';
                  return (
                    <div key={entry.name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] text-gray-500">{entry.name}</span>
                        <span className="text-xs font-bold" style={{ color }}>{entry.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Client Table ─────────────────────────────────────────── */}
        <Card>
          {/* Toolbar */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex gap-1 p-1 rounded-lg bg-gray-100">
              {["all", "permanent", "contractual", "both"].map(f => (
                <button key={f} onClick={() => { setActiveFilter(f); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${activeFilter === f ? 'bg-white text-violet-700 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'}`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search clients…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Client Name", "Internal Contact", "Service Type", "Status", "Created By", "Actions"].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedClients.length > 0 ? paginatedClients.map(client => (
                  <tr key={client.id} className="hover:bg-violet-50/40 transition-colors group">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <button onClick={() => handleClientClick(client.client_name)} className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                        <Building2 size={13} className="opacity-60" />{client.client_name}
                      </button>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-gray-500">{client.internal_contact || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {client.service_type?.length ? client.service_type.map((type, i) => (
                          <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${type === 'permanent' ? 'bg-violet-50 text-violet-700' : 'bg-cyan-50 text-cyan-700'}`}>{type}</span>
                        )) : <span className="text-gray-300 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1">
                            {statusUpdateLoading === client.id ? <Loader2 size={13} className="animate-spin text-gray-400" /> : (
                              <span className="flex items-center gap-1">
                                <StatusBadge status={client.status} />
                                <ChevronDown size={10} className="text-gray-400" />
                              </span>
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-36 rounded-xl shadow-lg">
                          {['active', 'pending', 'inactive'].map(s => (
                            <DropdownMenuItem key={s} onClick={() => handleStatusChange(client.id, s)} className="capitalize text-xs">{s}</DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-gray-500">
                      {client.hr_employees ? `${client.hr_employees.first_name} ${client.hr_employees.last_name}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                          <Tooltip><TooltipTrigger asChild><button onClick={() => handleClientClick(client.client_name)} className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-600 transition-all"><Eye size={13} /></button></TooltipTrigger><TooltipContent side="top" className="text-xs">View</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><button onClick={() => handleEditClient(client)} className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-all"><Edit size={13} /></button></TooltipTrigger><TooltipContent side="top" className="text-xs">Edit</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><button onClick={() => handleDeleteClient(client)} className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all"><Trash2 size={13} /></button></TooltipTrigger><TooltipContent side="top" className="text-xs">Delete</TooltipContent></Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-5 py-14 text-center">
                    <Building2 size={32} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No clients found</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {processedClients.length > itemsPerPage && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Rows</span>
                <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-200">
                  {[5, 10, 20].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all"><ChevronLeft size={13} /></button>
                <span className="text-xs text-gray-500 font-medium">{currentPage} / {totalPages || 1}</span>
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all"><ChevronRight size={13} /></button>
              </div>
              <span className="text-xs text-gray-400">{paginatedClients.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, processedClients.length)} of {processedClients.length}</span>
            </div>
          )}
        </Card>
      </div>

      <AddClientDialog open={addClientOpen} onOpenChange={open => { setAddClientOpen(open); if (!open) setEditClient(null); }} clientToEdit={editClient} onClientAdded={fetchAllData} />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete <strong>{clientToDelete?.client_name}</strong>. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteClient} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
              {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientManagementDashboard;