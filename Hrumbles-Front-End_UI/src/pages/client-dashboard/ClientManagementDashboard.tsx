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
  ChevronDown, ArrowUpRight, Star, StarOff, Pencil, Undo2, FileSpreadsheet, Settings2, Info
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell,
} from "recharts";
import TemplateEditorDialog, { ColumnItem, ALL_COLUMNS } from "@/components/clients-new/TemplateEditorDialog";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrganizationStatusIds } from "@/hooks/useOrganizationStatusIds";


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
  internal_contact?: string; internal_contact_ids?: string[]; hr_employees?: { first_name?: string; last_name?: string };
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

  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  // Template management state
const [isTemplateDialogOpen, setTemplateDialogOpen] = useState(false);
const [templateClient, setTemplateClient] = useState<Client | null>(null);
const [templateClientTemplates, setTemplateClientTemplates] = useState<any[]>([]);
const [editingTemplate, setEditingTemplate] = useState<{
  name: string; columns: ColumnItem[]; index: number;
} | null>(null);
const [isTemplateEditorOpen, setTemplateEditorOpen] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const { data: statusIds } = useOrganizationStatusIds(organization_id);

  console.log("Status IDs from hook:", statusIds);

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
    if (!statusIds) return;
    setLoading(true);
    try {
      const { data: clientsData, error: clientsError } = await supabase.from("hr_clients").select("*, hr_employees:hr_employees!hr_clients_created_by_fkey(first_name, last_name), internal_contact_employee:hr_employees!hr_clients_internal_contact_id_fkey(first_name, last_name)").eq("organization_id", organization_id);
      if (clientsError) throw clientsError;
      if (!clientsData) { setLoading(false); return; }
      setClients(clientsData);
       const { data: employeesData } = await supabase
      .from("hr_employees")
      .select("id, first_name, last_name")
      .eq("organization_id", organization_id)
      .in("employment_status", ["active", "Active"]);
    
    if (employeesData) {
      setAllEmployees(employeesData);
    }

      const { data: candidatesData } = await supabase.from("hr_job_candidates").select(`*, hr_jobs!hr_job_candidates_job_id_fkey(*)`).or(`main_status_id.eq.${statusIds.joinedMainId},main_status_id.eq.${statusIds.offeredMainId}`).in("sub_status_id", [statusIds.joinedSubId, statusIds.offerIssuedSubId]);
      
      const { data: timeLogs } = await supabase.from("time_logs").select("*").eq("is_approved", true);
      let totalRevenue = 0, totalProfit = 0;
      const metricsByClient: { [k: string]: { revenue: number; profit: number } } = {};
      clientsData.forEach(c => { metricsByClient[c.client_name] = { revenue: 0, profit: 0 }; });
      if (candidatesData) {
        candidatesData.forEach((candidate) => {
          const job = (candidate as any).hr_jobs;
          const jobClientName = job?.client_details?.clientName;
const client = jobClientName 
  ? clientsData.find((c) => c.client_name === jobClientName) 
  : undefined;
          if (!job || !client) return;
          const candProfit = calculateProfit(candidate, client.currency || "INR", client.commission_type || "", client.commission_value || 0, job);
          const candRevenue = job.job_type_category.toLowerCase() === "internal" ? parseSalary(candidate.accrual_ctc) : candProfit;
          totalRevenue += candRevenue; totalProfit += candProfit;
          if (metricsByClient[client.client_name]) { metricsByClient[client.client_name].revenue += candRevenue; metricsByClient[client.client_name].profit += candProfit; }
        });
      }
  console.log("candidatedata", candidatesData);

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


  // Helper function to get employee names from IDs
const getInternalContactNames = useCallback((client: Client) => {
  // First try to use the new internal_contact_ids array
  if (client.internal_contact_ids && client.internal_contact_ids.length > 0 && allEmployees.length > 0) {
    const names = client.internal_contact_ids
      .map(id => {
        const emp = allEmployees.find(e => e.id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : null;
      })
      .filter(Boolean);
    
    if (names.length > 0) return names.join(", ");
  }
  
  // Fall back to single internal_contact_employee
  if (client.internal_contact_employee?.first_name) {
    return `${client.internal_contact_employee.first_name} ${client.internal_contact_employee.last_name}`;
  }
  
  // Final fallback to old internal_contact text field
  if (client.internal_contact) return client.internal_contact;
  
  return null;
}, [allEmployees]);

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

  // Template management handlers
const handleOpenTemplateManager = async (client: Client) => {
  setTemplateClient(client);
  
  // Fetch existing templates for this client
  const { data, error } = await supabase
    .from("hr_clients")
    .select("export_template_config")
    .eq("id", client.id)
    .single();
  
  if (!error && data?.export_template_config) {
    setTemplateClientTemplates(data.export_template_config as any[]);
  } else {
    setTemplateClientTemplates([]);
  }
  
  setTemplateDialogOpen(true);
};

const saveTemplates = async (updatedTemplates: any[]) => {
  if (!templateClient) return;
  
  const { error } = await supabase
    .from("hr_clients")
    .update({ export_template_config: updatedTemplates })
    .eq("id", templateClient.id);
  
  if (error) {
    toast.error("Failed to save templates");
    throw error;
  }
  
  setTemplateClientTemplates(updatedTemplates);
  toast.success("Templates saved");
};

const handleAddTemplate = () => {
  setEditingTemplate({ name: "", columns: ALL_COLUMNS.map(c => ({ ...c })), index: -1 });
  setTemplateEditorOpen(true);
};

const handleEditTemplate = (index: number) => {
  const t = templateClientTemplates[index];
  setEditingTemplate({ name: t.name, columns: t.columns, index });
  setTemplateEditorOpen(true);
};

const handleDeleteTemplate = async (index: number) => {
  const updated = templateClientTemplates.filter((_, i) => i !== index);
  await saveTemplates(updated);
};

const handleSetDefault = async (index: number) => {
  const updated = templateClientTemplates.map((t, i) => ({ ...t, is_default: i === index }));
  await saveTemplates(updated);
};

const handleTemplateSave = async (name: string, columns: ColumnItem[]) => {
  const newTemplate = { name, columns, is_default: false };
  let updatedTemplates: any[];
  
  if (editingTemplate?.index !== undefined && editingTemplate.index >= 0) {
    updatedTemplates = templateClientTemplates.map((t, i) =>
      i === editingTemplate.index ? { ...t, ...newTemplate } : t
    );
  } else {
    updatedTemplates = [...templateClientTemplates, newTemplate];
  }
  
  await saveTemplates(updatedTemplates);
};

// Add this new handler
const handleRemoveDefaultFromDialog = async (index: number) => {
  const updated = templateClientTemplates.map((t, i) => ({ ...t, is_default: false }));
  await saveTemplates(updated);
  toast.success("Default removed — export will prompt to choose template");
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
              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="130%">
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
                    <XAxis dataKey="name" angle={0} textAnchor="end" interval={0} height={48} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#7B43F1' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#06B6D4' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip content={<LightTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, color: '#6B7280', paddingTop: 2 }} />
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
<td className="px-5 py-3 text-xs text-gray-500 max-w-[200px]">
  {(() => {
    const contactNames = getInternalContactNames(client);
    const hasMultipleContacts = client.internal_contact_ids && client.internal_contact_ids.length > 1;
    
    if (!contactNames) {
      return <span className="text-gray-300">—</span>;
    }
    
    if (hasMultipleContacts) {
      const firstContact = client.internal_contact_ids!
        .map(id => allEmployees.find(e => e.id === id))
        .filter(Boolean)
        .map(emp => `${emp.first_name} ${emp.last_name}`)[0];
      
      return (
        <div className="relative group inline-block max-w-full">
          <div className="truncate cursor-pointer flex items-center">
            <span className="truncate">{firstContact}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-medium flex-shrink-0">
              +{client.internal_contact_ids!.length - 1}
            </span>
          </div>
          {/* Instant hover tooltip */}
          <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block z-50 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-[300px] whitespace-normal break-words">
              {contactNames}
              <div className="absolute left-3 -bottom-1 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="truncate" title={contactNames}>
        {contactNames}
      </div>
    );
  })()}
</td>
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
                          <Tooltip>
  <TooltipTrigger asChild>
    <button 
      onClick={() => handleOpenTemplateManager(client)} 
      className="p-1.5 rounded-lg hover:bg-emerald-100 text-gray-400 hover:text-emerald-600 transition-all"
    >
      <Settings2 size={13} />
    </button>
  </TooltipTrigger>
<TooltipContent
  side="top"
  sideOffset={8}
  collisionPadding={16}
  className="z-[9999] max-w-[260px] min-w-[220px] rounded-lg border border-gray-200 bg-white shadow-xl p-3 break-words whitespace-normal"
>
  <div className="flex flex-col leading-tight">
    <p className="text-xs font-semibold text-gray-900 mb-2">
      Export Templates
    </p>
    <p className="text-[10px] text-gray-500 whitespace-normal break-words">
      Configure CSV export columns for this client's jobs
    </p>
  </div>
</TooltipContent>
</Tooltip>
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

{/* Template Management Dialog */}
<Dialog open={isTemplateDialogOpen} onOpenChange={setTemplateDialogOpen}>
  <DialogContent className="sm:max-w-[650px]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100">
          <Settings2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <span className="text-lg font-bold text-gray-800">Export Templates</span>
          <span className="text-sm font-normal text-gray-400 ml-2">— {templateClient?.client_name}</span>
        </div>
      </DialogTitle>
      <DialogDescription className="flex items-start gap-2 mt-2">
        <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <span>
          Manage export tracker templates for this client. 
          <strong className="text-amber-600"> Default templates auto-apply during job exports.</strong>
        </span>
      </DialogDescription>
    </DialogHeader>

    {/* Guide Banner */}
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-2">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-blue-100 flex-shrink-0">
          <Info size={14} className="text-blue-600" />
        </div>
        <div className="space-y-2 text-xs">
          <div>
            <p className="font-semibold text-blue-800 mb-1">How templates work:</p>
            <ul className="space-y-1 text-blue-700">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                Create templates to customize which columns appear in exports
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                Set a <strong>default template</strong> to export directly without choosing
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0"></span>
                Remove default to show template picker during export
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <ScrollArea className="max-h-[380px] pr-2">
      <div className="space-y-3">
        {templateClientTemplates.length > 0 ? (
          templateClientTemplates.map((t, idx) => (
            <div 
              key={idx} 
              className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                t.is_default 
                  ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 shadow-sm' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Default indicator ribbon */}
              {t.is_default && (
                <div className="absolute -top-0 -right-[-10px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-white shadow-sm">
                    <Star size={10} className="fill-white" />
                    DEFAULT
                  </span>
                </div>
              )}

              {/* Template Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  t.is_default ? 'bg-amber-100' : 'bg-gray-100'
                }`}>
                  {t.is_default ? (
                    <Star size={16} className="text-amber-600 fill-amber-600" />
                  ) : (
                    <StarOff size={16} className="text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{t.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-gray-500">
                      {t.columns?.filter((c: any) => c.selected).length || 0} columns selected
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-[11px] text-gray-400">
                      {t.is_default ? 'Applied automatically' : 'Manual selection'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 ml-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditTemplate(idx)}
                        className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Edit Template</TooltipContent>
                  </Tooltip>

                  {t.is_default ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveDefaultFromDialog(idx)} 
                          className="h-8 w-8 p-0 rounded-lg text-amber-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Undo2 size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">Remove as Default</p>
                        <p className="text-gray-400">Export will ask to choose template</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSetDefault(idx)} 
                          className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                        >
                          <Star size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p className="font-medium">Set as Default</p>
                        <p className="text-gray-400">Auto-apply during export</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteTemplate(idx)} 
                        className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Delete Template</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <div className="p-3 rounded-full bg-gray-100 inline-flex mb-3">
              <FileSpreadsheet size={28} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">No templates yet</p>
            <p className="text-xs text-gray-400">Create a template to customize your export columns</p>
          </div>
        )}
      </div>
    </ScrollArea>

    {/* Footer */}
    <div className="space-y-3 pt-4 border-t">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleAddTemplate} 
        className="w-full justify-center gap-2 h-9 rounded-xl border-dashed border-2 border-gray-300 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
      >
        <Plus size={14} />
        <span className="text-xs font-medium">Add New Template</span>
      </Button>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Default
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-300"></span>
            Optional
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setTemplateDialogOpen(false)}
          className="rounded-lg"
        >
          Close
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

{/* Template Editor Dialog */}
{isTemplateEditorOpen && (
  <TemplateEditorDialog
    open={isTemplateEditorOpen}
    onOpenChange={setTemplateEditorOpen}
    initialColumns={editingTemplate?.columns || ALL_COLUMNS}
    initialTemplateName={editingTemplate?.name || ""}
    onSave={handleTemplateSave}
  />
)}
    </div>
  );
};

export default ClientManagementDashboard;