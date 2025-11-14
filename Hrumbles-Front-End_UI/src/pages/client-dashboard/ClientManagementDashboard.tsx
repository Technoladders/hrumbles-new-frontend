import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";

// --- UI Components ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

// --- Icons ---
import { Briefcase, ChevronLeft, ChevronRight, Eye, Edit, Trash2, Loader2, Plus, ReceiptIndianRupee, TrendingUp, Search, UserCheck2 } from "lucide-react";

// --- Charts ---
import { ResponsiveContainer, BarChart, RadialBarChart, Bar, ComposedChart, Line, Area, ScatterChart, Scatter, ErrorBar, LabelList, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,RadialBar, Legend, PieChart, Pie, Cell } from "recharts";

// --- State Management & Dialogs ---
import { useSelector } from "react-redux";
import AddClientDialog from "@/components/Client/AddClientDialog";

// --- Constants ---
const STATUS_CONFIG = {
  default: {
    OFFERED_STATUS_ID: "9d48d0f9-8312-4f60-aaa4-bafdce067417",
    OFFER_ISSUED_SUB_STATUS_ID: "bcc84d3b-fb76-4912-86cc-e95448269d6b",
    JOINED_STATUS_ID: "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e",
    JOINED_SUB_STATUS_ID: "c9716374-3477-4606-877a-dfa5704e7680",
  },
  demo: { // organization_id: 53989f03-bdc9-439a-901c-45b274eff506
    OFFERED_STATUS_ID: "0557a2c9-6c27-46d5-908c-a826b82a6c47",
    OFFER_ISSUED_SUB_STATUS_ID: "7ad5ab45-21ab-4af1-92b9-dd0cb1d52887",
    JOINED_STATUS_ID: "5ab8833c-c409-46b8-a6b0-dbf23591827b",
    JOINED_SUB_STATUS_ID: "247ef818-9fbe-41ee-a755-a446d620ebb6",
  }
};
const DEMO_ORGANIZATION_ID = '53989f03-bdc9-439a-901c-45b274eff506';
const USD_TO_INR_RATE = 84;
// 🚨 Updated colors to match the target image: purple, orange, green
const DONUT_CHART_COLORS = ['#8854D2', '#F79B0A', '#10B981']; 
const STATUS_CHART_COLORS = ['#A74BC8', '#ef4444', '#f59e0b'];

// --- Type Definitions / Interfaces ---
interface Client { id: string; display_name: string; client_name: string; service_type: string[]; status: string; commission_value?: number; commission_type?: string; currency: string; internal_contact?: string; hr_employees?: { first_name?: string; last_name?: string; }; }
interface Candidate { id: string; name: string; job_id: string; ctc?: string; accrual_ctc?: string; expected_salary?: number; main_status_id?: string; }
interface Employee { 
    id: string; 
    assign_employee: string; 
    project_id: string; 
    client_id: string; 
    salary: number; 
    client_billing: number; 
    billing_type: string; 
    salary_type: string; 
    salary_currency: string; 
    working_hours?: number;
    working_days_config?: 'all_days' | 'weekdays_only' | 'saturday_working';
}
interface Job { id: string; title: string; client_owner: string; job_type_category: string; }
interface TimeLog { id: string; employee_id: string; date: string; project_time_data: { projects: { hours: number, projectId: string }[] }; }
interface Metrics { totalRevenue: number; totalProfit: number; totalClients: number; activeClients: number; }

// --- Reusable Styled Components ---
// --- Reusable Styled Components (Updated for new design) ---
const KpiCard = ({ title, value, icon, bgColor, iconColor }) => (
    <Card className={`shadow-md border-2 border-transparent ${bgColor} transition-shadow duration-300`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
            <div className={`p-2 rounded-full ${iconColor}`}>{icon}</div>
        </CardHeader>
        <CardContent>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
        </CardContent>
    </Card>
);

// New color palette for the KPI cards
const KPI_CARD_COLORS = [
    { bg: 'bg-gradient-to-br from-teal-50 to-indigo-100', icon: 'text-indigo-600', iconBg: 'bg-indigo-200' },
    { bg: 'bg-gradient-to-br from-teal-50 to-indigo-100', icon: 'text-indigo-600', iconBg: 'bg-indigo-200' },
    {bg: 'bg-gradient-to-br from-teal-50 to-indigo-100', icon: 'text-indigo-600', iconBg: 'bg-indigo-200' },
    { bg: 'bg-gradient-to-br from-teal-50 to-indigo-100',icon: 'text-indigo-600', iconBg: 'bg-indigo-200' },
];

const ClientManagementDashboard = () => {
    // --- State Management ---
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
    
    // --- Hooks & Global State ---
    const navigate = useNavigate();
    const { toast } = useToast();
    const organization_id = useSelector((state: any) => state.auth.organization_id);

    const statusIds = useMemo(() => {
        return organization_id === DEMO_ORGANIZATION_ID ? STATUS_CONFIG.demo : STATUS_CONFIG.default;
    }, [organization_id]);

    // --- Data Calculation & Formatting Functions (Restored from Original Logic) ---
    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
    
    const parseSalary = (salary: string | number | undefined): number => {
        if (!salary) return 0;
        let amountStr = salary.toString().trim();
        const currencies = [{ value: "USD", symbol: "$" }, { value: "INR", symbol: "₹" }];
        let currency = currencies.find((c) => amountStr.startsWith(c.symbol)) || { value: "INR" };
        if(currency.symbol) amountStr = amountStr.replace(currency.symbol, "").trim();
        const parts = amountStr.split(" ");
        const amount = parseFloat(parts[0].replace(/,/g, '')) || 0;
        let convertedAmount = amount;
        if (currency.value === "USD") convertedAmount *= USD_TO_INR_RATE;
        if (parts.length > 1) {
            const budgetType = parts[1].toLowerCase();
            if (budgetType === "monthly") convertedAmount *= 12;
            else if (budgetType === "hourly") convertedAmount *= 2016;
        }
        return convertedAmount;
    };
    
    const calculateProfit = (candidate: Candidate, currency: string, commissionType: string, commissionValue: number, jobType: Job): number => {
        const accrualAmount = candidate.accrual_ctc ? parseSalary(candidate.accrual_ctc) : 0;
        const salaryAmount = candidate.ctc ? parseSalary(candidate.ctc) : (candidate.expected_salary || 0);
        if (jobType.job_type_category?.toLowerCase() === "internal") {
            return accrualAmount - salaryAmount;
        } else {
            if (commissionType?.toLowerCase() === "percentage" && commissionValue) {
                return (salaryAmount * commissionValue) / 100;
            } else if (commissionType?.toLowerCase() === "fixed" && commissionValue) {
                return currency === "USD" ? commissionValue * USD_TO_INR_RATE : commissionValue;
            }
        }
        return 0;
    };

const calculateEmployeeHours = (employeeId: string, projectId: string, timeLogs: TimeLog[]): number => {
    return timeLogs?.filter(log => log.employee_id === employeeId)
                   .reduce((acc, log) => {
                       const projectEntry = log.project_time_data?.projects?.find(p => p.projectId === projectId);
                       return acc + (projectEntry?.hours || 0);
                   }, 0);
};

    const convertToHourly = (employee: Employee, clientCurrency: string): number => {
        let clientBilling = Number(employee.client_billing) || 0;
        if (isNaN(clientBilling)) return 0;
        if (clientCurrency === "USD") clientBilling *= USD_TO_INR_RATE;
        switch (employee.billing_type?.toLowerCase()) {
            case "monthly": return (clientBilling * 12) / (365 * 8);
            case "lpa": return clientBilling / (365 * 8);
            default: return clientBilling;
        }
    };
    
const calculateEmployeeRevenue = (employee: Employee, projectId: string, clientCurrency: string, timeLogs: TimeLog[]): number => {
    const hours = calculateEmployeeHours(employee.assign_employee, projectId, timeLogs);
    const config = employee.working_days_config || 'all_days';
    let clientBilling = Number(employee.client_billing) || 0;
    if (clientCurrency === "USD") {
        clientBilling *= USD_TO_INR_RATE;
    }

    let hourlyRate = 0;
    // Use average working days per year for stable conversion
    const avgWorkingDaysInYear = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
    const dailyWorkingHours = employee.working_hours || 8;

    switch (employee.billing_type?.toLowerCase()) {
        case "monthly":
            hourlyRate = (clientBilling * 12) / (avgWorkingDaysInYear * dailyWorkingHours);
            break;
        case "lpa":
            hourlyRate = clientBilling / (avgWorkingDaysInYear * dailyWorkingHours);
            break;
        case "hourly":
            hourlyRate = clientBilling;
            break;
    }
    return hours * (hourlyRate || 0);
};

  const calculateEmployeeProfit = (employee: Employee, projectId: string, clientCurrency: string, timeLogs: TimeLog[]): number => {
    const revenue = calculateEmployeeRevenue(employee, projectId, clientCurrency, timeLogs);
    const hours = calculateEmployeeHours(employee.assign_employee, projectId, timeLogs);
    const config = employee.working_days_config || 'all_days';
    let salary = Number(employee.salary) || 0;
    if (employee.salary_currency === "USD") {
        salary *= USD_TO_INR_RATE;
    }
    
    let salaryCost = 0;
    let hourlySalaryRate = 0;
    const avgWorkingDaysInYear = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
    const dailyWorkingHours = employee.working_hours || 8;

    switch (employee.salary_type?.toLowerCase()) {
        case "monthly":
            hourlySalaryRate = (salary * 12) / (avgWorkingDaysInYear * dailyWorkingHours);
            break;
        case "lpa":
            hourlySalaryRate = salary / (avgWorkingDaysInYear * dailyWorkingHours);
            break;
        case "hourly":
            hourlySalaryRate = salary;
            break;
    }
    salaryCost = hours * (hourlySalaryRate || 0);

    return revenue - salaryCost;
};

    // --- Data Fetching & Processing ---
    const fetchAllData = useCallback(async () => {
        if (!organization_id) return;
        setLoading(true);
        try {
            const { data: clientsData, error: clientsError } = await supabase.from("hr_clients").select("*, hr_employees:hr_employees!hr_clients_created_by_fkey(first_name, last_name)").eq("organization_id", organization_id);
            if (clientsError) throw clientsError;
            if (!clientsData) { setLoading(false); return; }
            
            setClients(clientsData);

            const { data: jobsData } = await supabase.from("hr_jobs").select("*");
            const { data: candidatesData } = await supabase.from("hr_job_candidates")
                 .select(`*, hr_jobs!hr_job_candidates_job_id_fkey(*)`)
                 .or(`main_status_id.eq.${statusIds.JOINED_STATUS_ID},main_status_id.eq.${statusIds.OFFERED_STATUS_ID}`)
                 .in("sub_status_id", [statusIds.JOINED_SUB_STATUS_ID, statusIds.OFFER_ISSUED_SUB_STATUS_ID]);
            const { data: employeesData } = await supabase.from("hr_project_employees").select("*");
            const { data: timeLogs } = await supabase.from("time_logs").select("*").eq("is_approved", true);

            let totalRevenue = 0, totalProfit = 0;
            const metricsByClient: { [clientName: string]: { revenue: number; profit: number; }; } = {};
            clientsData.forEach(c => { metricsByClient[c.client_name] = { revenue: 0, profit: 0 }; });

            if (candidatesData) {
                candidatesData.forEach((candidate) => {
                    const job = (candidate as any).hr_jobs;
                    const client = clientsData.find((c) => c.client_name === job?.client_owner);
                    if (!job || !client) return;

                    const candProfit = calculateProfit(candidate, client.currency || "INR", client.commission_type || "", client.commission_value || 0, job);
                    const candRevenue = job.job_type_category.toLowerCase() === "internal" ? parseSalary(candidate.accrual_ctc) : candProfit;
                    
                    totalRevenue += candRevenue;
                    totalProfit += candProfit;
                    if (metricsByClient[client.client_name]) {
                        metricsByClient[client.client_name].revenue += candRevenue;
                        metricsByClient[client.client_name].profit += candProfit;
                    }
                });
            }

            if (employeesData) {
                employeesData.forEach((employee) => {
                    const client = clientsData.find((c) => c.id === employee.client_id);
                    if (!client) return;

                    const empRevenue = calculateEmployeeRevenue(employee, employee.project_id, client.currency, timeLogs || []);
                    const empProfit = calculateEmployeeProfit(employee, employee.project_id, client.currency, timeLogs || []);
                    
                    totalRevenue += empRevenue;
                    totalProfit += empProfit;
                    if (metricsByClient[client.client_name]) {
                        metricsByClient[client.client_name].revenue += empRevenue;
                        metricsByClient[client.client_name].profit += empProfit;
                    }
                });
            }

            setMetrics({ totalRevenue, totalProfit, totalClients: clientsData.length, activeClients: clientsData.filter(c => c.status === "active").length });
            setClientFinancials(clientsData.map(c => ({ client_name: c.client_name, revenue_inr: metricsByClient[c.client_name]?.revenue || 0, profit_inr: metricsByClient[c.client_name]?.profit || 0 })));
        
        } catch (error: any) {
            toast({ title: "Error", description: `Failed to load dashboard data: ${error.message}`, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [organization_id, toast, statusIds]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // --- Derived Data for UI ---
    const topClientsByRevenue = useMemo(() => [...clientFinancials].sort((a, b) => b.revenue_inr - a.revenue_inr).slice(0, 5), [clientFinancials]);
    const serviceTypeDistribution = useMemo(() => {
        const dist = { permanent: 0, contractual: 0, both: 0 };
        clients.forEach(c => {
            const isP = c.service_type?.includes('permanent');
            const isC = c.service_type?.includes('contractual');
            if (isP && isC) dist.both++; else if (isP) dist.permanent++; else if (isC) dist.contractual++;
        });
        return [{ name: 'Permanent', value: dist.permanent }, { name: 'Contractual', value: dist.contractual }, { name: 'Both', value: dist.both }].filter(i => i.value > 0);
    }, [clients]);
    
    const processedClients = useMemo(() => {
        const statusOrder: { [key: string]: number } = { active: 1, pending: 2, inactive: 3 };
        return clients
            .filter(client => {
                const matchesSearch = client.client_name.toLowerCase().includes(searchQuery.toLowerCase());
                if (!matchesSearch) return false;
                if (activeFilter === "all") return true;
                if (!client.service_type) return false;
                const isP = client.service_type.includes("permanent");
                const isC = client.service_type.includes("contractual");
                if (activeFilter === "permanent") return isP && !isC;
                if (activeFilter === "contractual") return isC && !isP;
                if (activeFilter === "both") return isP && isC;
                return false;
            })
            .sort((a, b) => {
                const orderA = statusOrder[a.status] || 99;
                const orderB = statusOrder[b.status] || 99;
                if (orderA !== orderB) return orderA - orderB;
                return a.client_name.localeCompare(b.client_name);
            });
    }, [clients, searchQuery, activeFilter]);
    
    const paginatedClients = useMemo(() => {
        return processedClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [processedClients, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(processedClients.length / itemsPerPage);

    // --- Event Handlers ---
    const handleClientClick = (clientName: string) => navigate(`/client-dashboard/${encodeURIComponent(clientName)}/candidates`);
    const handleClientAdded = () => fetchAllData();
    const getStatusBadgeColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "active": return "bg-green-100 text-green-800 hover:bg-green-200";
            case "inactive": return "bg-red-100 text-red-800 hover:bg-red-200";
            case "pending": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
            default: return "bg-gray-100 text-gray-800 hover:bg-gray-200";
        }
    };
    const handleStatusChange = async (clientId: string, status: string) => {
        setStatusUpdateLoading(clientId);
        try {
            const { error } = await supabase.from("hr_clients").update({ status }).eq("id", clientId);
            if (error) throw error;
            await fetchAllData();
            toast({ title: "Status Updated", description: "Client status has been updated." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update client status.", variant: "destructive" });
        } finally {
            setStatusUpdateLoading(null);
        }
    };
    const handleEditClient = (client: Client) => { setEditClient(client); setAddClientOpen(true); };
    const handleDeleteClient = (client: Client) => { setClientToDelete(client); setDeleteDialogOpen(true); };
    const confirmDeleteClient = async () => {
        if (!clientToDelete) return;
        setActionLoading(true);
        try {
            const { error } = await supabase.from("hr_clients").delete().eq("id", clientToDelete.id);
            if (error) throw error;
            await fetchAllData();
            toast({ title: "Client Deleted", description: `${clientToDelete.client_name} has been deleted.` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete the client.", variant: "destructive" });
        } finally {
            setActionLoading(false);
            setDeleteDialogOpen(false);
            setClientToDelete(null);
        }
    };

    
    const handleItemsPerPageChange = (value: string) => { setItemsPerPage(Number(value)); setCurrentPage(1); };
    const renderPagination = () => (
        <div className="flex flex-col items-center gap-4 mt-4 px-6 pb-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                    <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm text-gray-700">Page {currentPage} of {totalPages || 1}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="text-sm text-gray-600">
                Showing {paginatedClients.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
                {Math.min(currentPage * itemsPerPage, processedClients.length)} of {processedClients.length}
            </div>
        </div>
    );

    const clientStatusDistribution = useMemo(() => {
        const distribution = { active: 0, inactive: 0, pending: 0 };
        clients.forEach(client => {
            if (client.status === 'active') distribution.active++;
            else if (client.status === 'inactive') distribution.inactive++;
            else if (client.status === 'pending') distribution.pending++;
        });
        return [
            { name: 'Active', value: distribution.active },
            { name: 'Inactive', value: distribution.inactive },
            { name: 'Pending', value: distribution.pending },
        ].filter(item => item.value > 0);
    }, [clients]);

    const chartData = useMemo(() => {
        return [...clientFinancials]
            .filter(c => c.revenue_inr > 0)
            .sort((a, b) => b.revenue_inr - a.revenue_inr)
            .slice(0, 10);
    }, [clientFinancials]);
    
    interface CustomLegendProps {
      payload?: Array<{
        value: string;
        payload: {
          name: string;
          value: number;
          fill: string;
          percent: number;
        };
      }>;
    }

    const CustomLegend = ({ payload }: CustomLegendProps) => {
      if (!payload) return null;

      return (
        <div className="flex flex-col justify-center h-full space-y-4">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center text-sm">
              <div
                className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                style={{ backgroundColor: entry.payload.fill }}
              />
              <div className="flex justify-between items-center w-full">
                <span className="text-gray-600">{entry.value}</span>
                <span className="font-semibold text-gray-800">
                  {`${(entry.payload.percent * 100).toFixed(0)}%`}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-indigo-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
            <main className="w-full max-w-8xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Client Dashboard</h1>
                        <p className="text-gray-600 mt-1">Manage and track all client activities, including jobs and projects</p>
                    </div>
                    <Button onClick={() => setAddClientOpen(true)} className="flex-shrink-0">
                        <Plus size={18} className="mr-2" /> 
                        Add Client
                    </Button>
                </div>

                {/* KPI Cards */}
                {/* KPI Cards */}
               {/* KPI Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    <KpiCard
        title="Total Revenue"
        value={formatCurrency(metrics.totalRevenue)}
        icon={<ReceiptIndianRupee className="h-5 w-5" />}
        bgColor={KPI_CARD_COLORS[0].bg}
        iconColor={KPI_CARD_COLORS[0].icon}
    />
    <KpiCard
        title="Total Profit"
        value={formatCurrency(metrics.totalProfit)}
        icon={<TrendingUp className="h-5 w-5" />}
        bgColor={KPI_CARD_COLORS[1].bg}
        iconColor={KPI_CARD_COLORS[1].icon}
    />
    <KpiCard
        title="Total Clients"
        value={metrics.totalClients.toString()}
        icon={<Briefcase className="h-5 w-5" />}
        bgColor={KPI_CARD_COLORS[2].bg}
        iconColor={KPI_CARD_COLORS[2].icon}
    />
    <KpiCard
        title="Active Clients"
        value={metrics.activeClients.toString()}
        icon={<UserCheck2 className="h-5 w-5" />}
        bgColor={KPI_CARD_COLORS[3].bg}
        iconColor={KPI_CARD_COLORS[3].icon}
    />
</div>
                {/* Main Dashboard Grid */}
              {/* Main Dashboard Grid */}
<div className="grid grid-cols lg:grid-cols-3 gap-2 items-start">
    {/* Left Column - Main Chart + Service Type */}
    <div className="lg:col-span-2 space-y-6">
        {/* Chart 1: Main Revenue & Profit Analysis - Reduced Size */}
        <Card className="shadow-2xl bg-white/70 backdrop-blur-xl border border-white/20 hover:shadow-3xl transition-all duration-300">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg font-bold text-gray-900">
                    <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full mr-3"></div>
                    Top 10 Clients: Revenue & Profit Analysis
                </CardTitle>
                <CardDescription className="text-gray-600 text-sm">
                    Interactive comparison of revenue streams and profitability metrics
                </CardDescription>
            </CardHeader>
            <CardContent className="px-4 h-[300px]">
            {chartData.length > 0 ? (
                <ResponsiveContainer width="95%" height="120%">
                    <ComposedChart
                        data={chartData.map(item => ({
                            ...item,
                            client_name: item.client_name.length > 15 
                                ? item.client_name.split(' ').length > 2 
                                    ? item.client_name.split(' ').slice(0, 2).join(' ') + '...'
                                    : item.client_name.substring(0, 17) + '...'
                                : item.client_name
                        }))}
                        margin={{ top: 10, right: 20, left: 20, bottom: 50 }}
                        barCategoryGap="20%"
                    >
                        <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke="#f0f0f0" 
                            strokeOpacity={0.7}
                        />
                        <XAxis
                            dataKey="client_name"
                            angle={0}
                            textAnchor="middle" 
                            interval={0}
                            height={5}
                            tick={{ 
                                fontSize: 8, 
                                fill: '#6b7280'
                            }}
                            axisLine={{ stroke: '#d1d5db' }}
                            tickLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxis
                            yAxisId="left"
                            padding={{ top: 20, bottom: 20 }}
                            tick={{ 
                                fontSize: 11, 
                                fill: '#4c1d95'
                            }}
                            stroke="#4c1d95"
                            axisLine={{ stroke: '#d1d5db' }}
                            tickLine={{ stroke: '#d1d5db' }}
                            tickFormatter={(value) => `₹${Number(value) / 1000}k`}
                        />
                        <YAxis
                            yAxisId="right"
                            padding={{ top: 20, bottom: 20 }}
                            orientation="right"
                            tick={{ 
                                fontSize: 15, 
                                fill: '#059669'
                            }}
                            stroke="#059669"
                            axisLine={{ stroke: '#d1d5db' }}
                            tickLine={{ stroke: '#d1d5db' }}
                            tickFormatter={(value) => `₹${Number(value) / 1000}k`}
                        />
                        <RechartsTooltip 
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                        />
                        <Legend 
                            wrapperStyle={{ paddingTop: '0px', fontSize: '10px' }}
                            iconType="rect"
                            iconSize={8}
                            layout="horizontal"
                            align="center"
                            verticalAlign="top"
                        />
                        <defs>
                            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#059669" stopOpacity={0.8} />
                                <stop offset="50%" stopColor="#059669" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#059669" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="profit_inr"
                            name="Profit"
                            stroke="#059669"
                            strokeWidth={2}
                            fill="url(#profitGradient)"
                            fillOpacity={1}
                        />
                        <Bar
                            yAxisId="left"
                            dataKey="revenue_inr"
                            name="Revenue"
                            fill="#505050"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={60}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No client financial data available to display.</p>
                </div>
            )}
        </CardContent>
    </Card>

<div className="grid grid-cols-2 lg:grid-cols-2 gap-4  ">
    <div className="col-span-1 lg:col-span-1">
   {/* <Card className="shadow-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-white/30 hover:shadow-3xl transition-all duration-300">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-bold text-gray-900">
                    <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full mr-3"></div>
                    Top 5 Clients by Revenue
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[320px] p-4">
                {topClientsByRevenue.length > 0 ? (
                    <div className="h-full flex flex-col">
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="50%"
                                    outerRadius="100%"
                                    data={topClientsByRevenue.slice(0, 4).map((item, index) => ({
                                        ...item,
                                        fill: ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4'][index],
                                        percentage: Math.round((item.revenue_inr / topClientsByRevenue[0].revenue_inr) * 100)
                                    }))}
                                >
                                    <RadialBar
                                        dataKey="percentage"
                                        cornerRadius={6}
                                        stroke="none"
                                    />
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            backdropFilter: 'blur(10px)',
                                            border: 'none',
                                            borderRadius: '12px',
                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                                        }}
                                        formatter={(value, name, props) => [
                                            formatCurrency(props.payload.revenue_inr),
                                            props.payload.client_name
                                        ]}
                                    />
                                </RadialBarChart>
                            </ResponsiveContainer>
                        </div>
                       
                        {/* Legend */}
                        {/* <div className="space-y-1 mt-2">
                            {topClientsByRevenue.slice(0, 4).map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center">
                                        <div
                                            className="w-2 h-2 rounded-full mr-2"
                                            style={{ backgroundColor: ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4'][index] }}
                                        />
                                        <span className="text-gray-700 font-medium truncate">
                                            {item.client_name.length > 12 ? item.client_name.substring(0, 12) + '...' : item.client_name}
                                        </span>
                                    </div>
                                    <span className="text-gray-900 font-bold">{formatCurrency(item.revenue_inr)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-gray-500">No data available.</p>
                    </div>
                )}
            </CardContent>
        </Card> */}
 
            </div>
    <div className="col-span-1 lg:col-span-1">

             {/* Chart 3: Top 5 Clients by Profit */}
             {/* <Card className="shadow-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-xl border border-white/30 hover:shadow-3xl transition-all duration-300">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center text-gray-900">
                        <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full mr-2"></div>
                        Financial Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center h-[200px] p-3">
                    <div className="w-full h-full flex flex-col">
                        <div className="flex-1 flex justify-center items-center relative">
                            <ResponsiveContainer width="130%" height="100%">
                                <PieChart>
                                    <defs>
                                        <filter id="financialDonutShadow" x="-50%" y="-50%" width="200%" height="200%">
                                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.15"/>
                                        </filter>
                                    </defs>
                                    <Pie
                                        data={[
                                            { name: 'Profit', value: 3127918, color: '#10b981' },
                                            { name: 'Cost', value: 4960740 - 3127918, color: '#f59e0b' }
                                        ]}
                                        dataKey="value"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={30}
                                        outerRadius={60}
                                        paddingAngle={0}
                                        filter="url(#financialDonutShadow)"
                                    >
                                        <Cell fill="#10b981" />
                                        <Cell fill="#f59e0b" />
                                    </Pie>
                                    <RechartsTooltip formatter={(value, name) => [`₹${(value / 100000).toFixed(2)}L`, name]} />
                                </PieChart>
                            </ResponsiveContainer>
                            
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-xs text-gray-600">Total</div>
                                    <div className="text-sm font-bold text-gray-900">₹49.61L</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1 mt-1">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center">
                                    <div className="w-2 h-2 rounded-full mr-1 bg-green-500" />
                                    <span className="text-gray-700 font-medium">Profit</span>
                                </div>
                                <span className="text-green-600 font-bold">₹31L</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center">
                                    <div className="w-2 h-2 rounded-full mr-1 bg-amber-500" />
                                    <span className="text-gray-700 font-medium">Cost</span>
                                </div>
                                <span className="text-amber-600 font-bold">₹18L</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card> */}
           
            </div>

            </div>

</div>

    <div className="space-y-6 h-full w-full">
        {/* Chart 2: Top Clients Radial Chart */}
       <Card className="shadow-2xl backdrop-blur-xl border border-white/30 hover:shadow-3xl transition-all duration-300">
    <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center text-gray-900">
            <div className="w-1 h-4 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full mr-2"></div>
            By Service Type
        </CardTitle>
    </CardHeader>
    <CardContent className="flex items-center h-[330px] p-3">
        {serviceTypeDistribution.length > 0 ? (
            <div className="h-full flex flex-col w-full">
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="50%"
                            outerRadius="100%"
                            data={serviceTypeDistribution.map((item, index) => ({
                                ...item,
                                fill: DONUT_CHART_COLORS[index % DONUT_CHART_COLORS.length],
                                percentage: Math.round((item.value / metrics.totalClients) * 100) || 0
                            }))}
                        >
                            <RadialBar
                                dataKey="percentage"
                                cornerRadius={6}
                                stroke="none"
                            />
                            <RechartsTooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    backdropFilter: 'blur(10px)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                                }}
                                formatter={(value, name, props) => [
                                    `${props.payload.value} Clients (${value}%)`,
                                    props.payload.name
                                ]}
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div className="space-y-1 mt-2">
                    {serviceTypeDistribution.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                            <div className="flex items-center">
                                <div
                                    className="w-2 h-2 rounded-full mr-2"
                                    style={{ backgroundColor: DONUT_CHART_COLORS[index % DONUT_CHART_COLORS.length] }}
                                />
                                <span className="text-gray-700 font-medium truncate">
                                    {entry.name}
                                </span>
                            </div>
                            <span className="text-gray-900 font-bold">
                                {Math.round((entry.value / metrics.totalClients) * 100) || 0}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <div className="flex items-center justify-center w-full">
                <p className="text-xs text-gray-500">No data available.</p>
            </div>
        )}
    </CardContent>
</Card>

        {/* Chart 3: Service Type Distribution - Modern Cards */}
        {/* Bottom Row - Three Charts in a Row */}
        <div className="space-y-4">
            
            {/* Chart 1: By Service Type */}
            
            {/* Chart 2: Financial Overview */}
            
             {/* <Card className="shadow-2xl bg-gradient-to-br from-purple-50/80 to-pink-50/80 backdrop-blur-xl border border-white/30 hover:shadow-3xl transition-all duration-300">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center text-gray-900">
                        <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full mr-2"></div>
                        Top 5 Clients by Profit
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center h-[195px] p-3">
                    {chartData.length > 0 ? (
                        <div className="w-full h-full flex flex-col">
                            <div className="flex-1 flex justify-center items-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <defs>
                                            <filter id="profitDonutShadow" x="-50%" y="-50%" width="200%" height="200%">
                                                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.15"/>
                                            </filter>
                                        </defs>
                                        <Pie
                                            data={chartData.slice(0, 5).map((item, index) => ({
                                                ...item,
                                                fill: ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981'][index]
                                            }))}
                                            dataKey="profit_inr"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={30}
                                            outerRadius={60}
                                            paddingAngle={0}
                                            filter="url(#profitDonutShadow)"
                                        >
                                            {chartData.slice(0, 5).map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981'][index]}
                                                    stroke="none"
                                                />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value, name, props) => [
                                            `₹${(value / 100000).toFixed(1)}L`, 
                                            props.payload.client_name
                                        ]} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-1 mt-1 max-h-16 overflow-y-auto">
                                {chartData.slice(0, 3).map((client, index) => (
                                    <div key={index} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center">
                                            <div 
                                                className="w-2 h-2 rounded-full mr-1"
                                                style={{ backgroundColor: ['#8b5cf6', '#6366f1', '#3b82f6'][index] }}
                                            />
                                            <span className="text-gray-700 font-medium truncate max-w-16">
                                                {client.client_name.length > 12 ? 
                                                    client.client_name.substring(0, 12) + '...' : 
                                                    client.client_name
                                                }
                                            </span>
                                        </div>
                                        <span className="text-gray-900 font-bold">
                                            ₹{(client.profit_inr / 100000).toFixed(1)}L
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center w-full">
                            <p className="text-xs text-gray-500">No data available.</p>
                        </div>
                    )}
                </CardContent>
            </Card> */}

           
        </div>
    </div>
</div>
                {/* Client List Table */}
                <Tabs value={activeFilter} onValueChange={(value) => { setActiveFilter(value); setCurrentPage(1); }}>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-3 ">
                        <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
        <TabsTrigger
          value="all"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
        >
          All
        </TabsTrigger>
        <TabsTrigger
          value="permanent"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
        >
          Permanent
        </TabsTrigger>
        <TabsTrigger
          value="contractual"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
        >
          Contractual
        </TabsTrigger>
        <TabsTrigger
          value="both"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
        >
          Both
        </TabsTrigger>
      </TabsList>
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
    <Input
      placeholder="Search Clients..."
      className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
                        </div>
                    </div>
                    <Card className="shadow-sm">
                        <TabsContent value={activeFilter} className="p-0">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Internal Contact</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedClients.length > 0 ? (
                                            paginatedClients.map((client) => (
                                                <tr key={client.id} className="hover:bg-gray-50 transition">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        <span className="text-indigo-600 hover:underline cursor-pointer" onClick={() => handleClientClick(client.client_name)}>{client.client_name}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.internal_contact || '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-wrap gap-1">
                                                            {client.service_type?.length ? client.service_type.map((type, index) => (
                                                                <Badge key={index} variant="secondary" className="capitalize text-xs">{type}</Badge>
                                                            )) : <span className="text-gray-500">-</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 px-2 py-0 data-[state=open]:bg-gray-100">
                                                                    {statusUpdateLoading === client.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Badge variant="outline" className={getStatusBadgeColor(client.status)}>{client.status || 'Unknown'}</Badge>}
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="center">
                                                                <DropdownMenuItem onClick={() => handleStatusChange(client.id, 'active')}>Active</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStatusChange(client.id, 'pending')}>Pending</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStatusChange(client.id, 'inactive')}>Inactive</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.hr_employees ? `${client.hr_employees.first_name} ${client.hr_employees.last_name}` : '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex items-center space-x-1">
                                                            <TooltipProvider>
                                                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleClientClick(client.client_name)}><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>View Client</p></TooltipContent></Tooltip>
                                                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClient(client)}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Edit Client</p></TooltipContent></Tooltip>
                                                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDeleteClient(client)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Delete Client</p></TooltipContent></Tooltip>
                                                            </TooltipProvider>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">No clients found matching your criteria.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {processedClients.length > itemsPerPage && renderPagination()}
                        </TabsContent>
                    </Card>
                </Tabs>
                <AddClientDialog open={addClientOpen} onOpenChange={(open) => { setAddClientOpen(open); if (!open) setEditClient(null); }} clientToEdit={editClient} onClientAdded={handleClientAdded} />
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete the client "{clientToDelete?.client_name}". This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDeleteClient} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
                                {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>
        </div>
    );
};

export default ClientManagementDashboard;