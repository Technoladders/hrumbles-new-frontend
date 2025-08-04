import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Briefcase, ChevronLeft, ChevronRight, ArrowUpDown, Eye, Edit, Trash2, Loader2, Plus, ReceiptIndianRupee, TrendingUp, UserRoundCheck, UserRoundX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import AddClientDialog from "@/components/Client/AddClientDialog";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie } from "recharts";
import { useSelector } from "react-redux";

// Status IDs for Offered and Joined candidates
const OFFERED_STATUS_ID = "9d48d0f9-8312-4f60-aaa4-bafdce067417";
const OFFER_ISSUED_SUB_STATUS_ID = "bcc84d3b-fb76-4912-86cc-e95448269d6b";
const JOINED_STATUS_ID = "5b4e0b82-0774-4e3b-bb1e-96bc2743f96e";
const JOINED_SUB_STATUS_ID = "c9716374-3477-4606-877a-dfa5704e7680";

// Static USD to INR conversion rates
const USD_TO_INR_RATE = 84;

interface Client {
  id: string;
  display_name: string;
  client_name: string;
  service_type: string[];
  status: string;
  commission_value?: number;
  commission_type?: string;
  currency: string;
  internal_contact?: string;
  hr_employees?: {
    first_name?: string;
    last_name?: string;
  };
}

interface Candidate {
  id: string;
  name: string;
  job_id: string;
  ctc?: string;
  accrual_ctc?: string;
  expected_salary?: number;
  main_status_id?: string;
}

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
  hr_employees?: {
    first_name?: string;
    last_name?: string;
  };
}

interface Job {
  id: string;
  title: string;
  client_owner: string;
  job_type_category: string;
  budget?: number;
  budget_type?: string;
}

interface Project {
  id: string;
  client_id: string;
}

interface TimeLog {
  id: string;
  employee_id: string;
  date: string;
  project_time_data: {
    projects: { hours: number; report: string; clientId: string; projectId: string }[];
  };
  total_working_hours: string;
}

interface Metrics {
  totalRevenue: number;
  totalProfit: number;
  totalCandidates: number;
  totalEmployees: number;
  permanentCandidates: number;
  contractualCandidates: number;
  bothCandidates: number;
  permanentEmployees: number;
  contractualEmployees: number;
  bothEmployees: number;
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalProjects: number;
}

const ClientManagementDashboard = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalRevenue: 0,
    totalProfit: 0,
    totalCandidates: 0,
    totalEmployees: 0,
    permanentCandidates: 0,
    contractualCandidates: 0,
    bothCandidates: 0,
    permanentEmployees: 0,
    contractualEmployees: 0,
    bothEmployees: 0,
    totalClients: 0,
    activeClients: 0,
    inactiveClients: 0,
    totalProjects: 0,
  });
  const [clientFinancials, setClientFinancials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // Currency options for parsing
  const currencies = [
    { value: "INR", symbol: "₹" },
    { value: "USD", symbol: "$" },
  ];

  // Candidate Calculations
  const parseSalary = (salary: string | number | undefined): number => {
    if (!salary) {
      console.log("parseSalary: No salary provided, returning 0");
      return 0;
    }

    let amountStr = salary.toString().trim();
    console.log(`parseSalary: Processing salary string: ${amountStr}`);

    // Detect currency
    let currency = currencies.find((c) => amountStr.startsWith(c.symbol)) || currencies[0];
    amountStr = amountStr.replace(currency.symbol, "").trim();
    console.log(`parseSalary: Detected currency: ${currency.value}, cleaned amount: ${amountStr}`);

    const parts = amountStr.split(" ");
    const amount = parseFloat(parts[0]) || 0;
    let convertedAmount = amount;

    if (currency.value === "USD") {
      convertedAmount *= USD_TO_INR_RATE;
      console.log(`parseSalary: Converted USD to INR: ${amount} * ${USD_TO_INR_RATE} = ${convertedAmount}`);
    }

    // Handle different budget types
    if (parts.length > 1) {
      const budgetType = parts[1].toLowerCase();
      console.log(`parseSalary: Budget type: ${budgetType}`);
      if (budgetType === "monthly") {
        convertedAmount *= 12; // Convert monthly to annual
        console.log(`parseSalary: Converted monthly to annual: ${convertedAmount}`);
      } else if (budgetType === "hourly") {
        convertedAmount *= 2016; // 8 hours/day, 252 working days/year
        console.log(`parseSalary: Converted hourly to annual: ${convertedAmount}`);
      }
    }

    console.log(`parseSalary: Final amount: ${convertedAmount}`);
    return convertedAmount;
  };

  const calculateProfit = (
    candidate: Candidate,
    currency: string,
    commissionType: string,
    commissionValue: number,
    jobType: Job
  ): number => {
    console.log(`calculateProfit: Processing candidate ID ${candidate.id}, job: ${jobType.title}`);
    
    // Parse accrual_ctc and ctc
    const accrualAmount = candidate.accrual_ctc ? parseSalary(candidate.accrual_ctc) : 0;
    const salaryAmount = candidate.ctc ? parseSalary(candidate.ctc) : (candidate.expected_salary || 0);
    console.log(`calculateProfit: accrual_ctc=${accrualAmount}, salaryAmount=${salaryAmount}, currency=${currency}`);

    if (jobType.job_type_category.toLowerCase() === "internal") {
      // For internal jobs, profit is revenue minus salary
      const profit = accrualAmount - salaryAmount;
      console.log(`calculateProfit: Internal job profit = ${accrualAmount} - ${salaryAmount} = ${profit}`);
      return profit;
    } else {
      if (commissionType.toLowerCase() === "percentage" && commissionValue) {
        // For external jobs with percentage commission
        const profit = (salaryAmount * commissionValue) / 100;
        console.log(`calculateProfit: External job, percentage commission: ${salaryAmount} * ${commissionValue}% = ${profit}`);
        return profit;
      } else if (commissionType.toLowerCase() === "fixed" && commissionValue) {
        // Convert fixed commission to INR if in USD
        const profit = currency === "USD" ? commissionValue * USD_TO_INR_RATE : commissionValue;
        console.log(`calculateProfit: External job, fixed commission: ${commissionValue} (${currency}) = ${profit} INR`);
        return profit;
      }
    }

    console.log("calculateProfit: No profit calculated, returning 0");
    return 0;
  };

  // Employee Calculations
  const calculateEmployeeHours = (employeeId: string, projectId: string, timeLogs: TimeLog[]) => {
    const matchingLogs = timeLogs?.filter((log: TimeLog) => log.employee_id === employeeId) || [];
    if (!matchingLogs.length) {
      console.log(`calculateEmployeeHours: No time logs found for employee ${employeeId}, project ${projectId}`);
      return 0;
    }

    const hours = matchingLogs.reduce((acc: number, log: TimeLog) => {
      if (!log.project_time_data?.projects) {
        console.log(`calculateEmployeeHours: Invalid project_time_data for log ${log.id}`);
        return acc;
      }
      const projectEntry = log.project_time_data.projects.find(
        (proj) => proj.projectId === projectId
      );
      const hours = projectEntry?.hours || 0;
      console.log(`calculateEmployeeHours: Log ${log.id}, Project ${projectId}, Hours: ${hours}`);
      return acc + hours;
    }, 0);

    console.log(`calculateEmployeeHours: Employee ${employeeId}, Project ${projectId}, Total Hours: ${hours}`);
    return hours;
  };

  const convertToHourly = (employee: Employee, clientCurrency: string) => {
    let clientBilling = Number(employee.client_billing) || 0;
    console.log(`convertToHourly: Employee ${employee.id}, client_billing=${clientBilling}, currency=${clientCurrency}`);

    if (isNaN(clientBilling)) {
      console.log("convertToHourly: Invalid client_billing, returning 0");
      return 0;
    }

    if (clientCurrency === "USD") {
      clientBilling *= USD_TO_INR_RATE;
      console.log(`convertToHourly: Converted USD to INR: ${clientBilling}`);
    }

    switch (employee.billing_type?.toLowerCase()) {
      case "monthly":
        clientBilling = (clientBilling * 12) / (365 * 8);
        console.log(`convertToHourly: Converted monthly to hourly: ${clientBilling}`);
        break;
      case "hourly":
        break;
      case "lpa":
        clientBilling = clientBilling / (365 * 8);
        console.log(`convertToHourly: Converted LPA to hourly: ${clientBilling}`);
        break;
      default:
        console.log(`convertToHourly: Unknown billing_type ${employee.billing_type}, using default`);
        break;
    }

    return clientBilling;
  };

  const calculateEmployeeRevenue = (employee: Employee, projectId: string, clientCurrency: string, timeLogs: TimeLog[]) => {
    const hours = calculateEmployeeHours(employee.assign_employee, projectId, timeLogs);
    const hourlyRate = convertToHourly(employee, clientCurrency);
    const revenue = hours * hourlyRate;
    console.log(`calculateEmployeeRevenue: Employee ${employee.assign_employee}, Hours=${hours}, HourlyRate=${hourlyRate}, Revenue=${revenue}`);
    return revenue;
  };

  const calculateEmployeeProfit = (employee: Employee, projectId: string, clientCurrency: string, timeLogs: TimeLog[]) => {
    const revenue = calculateEmployeeRevenue(employee, projectId, clientCurrency, timeLogs);
    
    let salary = Number(employee.salary) || 0;
    const salaryType = employee.salary_type?.toLowerCase() || "lpa";
    console.log(`calculateEmployeeProfit: Employee ${employee.assign_employee}, Salary=${salary}, SalaryType=${salaryType}`);

    if (isNaN(salary)) {
      console.log("calculateEmployeeProfit: Invalid salary, returning 0 profit");
      return 0;
    }

    if (employee.salary_currency === "USD") {
      salary *= USD_TO_INR_RATE;
      console.log(`calculateEmployeeProfit: Converted salary USD to INR: ${salary}`);
    }

    const hours = calculateEmployeeHours(employee.assign_employee, projectId, timeLogs);

    if (salaryType === "lpa") {
      const hourlySalary = salary / (365 * 8);
      salary = hours * hourlySalary;
      console.log(`calculateEmployeeProfit: LPA to hourly salary: ${hourlySalary}, Total=${salary}`);
    } else if (salaryType === "monthly") {
      const monthlyToHourly = (salary / 30) / 8;
      salary = hours * monthlyToHourly;
      console.log(`calculateEmployeeProfit: Monthly to hourly salary: ${monthlyToHourly}, Total=${salary}`);
    } else if (salaryType === "hourly") {
      salary = hours * salary;
      console.log(`calculateEmployeeProfit: Hourly salary: ${salary}`);
    }

    const profit = revenue - salary;
    console.log(`calculateEmployeeProfit: Revenue=${revenue}, Salary=${salary}, Profit=${profit}`);
    return profit;
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("hr_clients")
        .select("id, display_name, client_name, service_type, status, commission_value, commission_type, currency, internal_contact, hr_employees:hr_employees!hr_clients_created_by_fkey (first_name, last_name)")
        .eq("organization_id", organization_id);

      if (error) throw error;

      console.log("fetchClients: Fetched clients:", data);
      if (data) {
        setClients(data);
        setFilteredClients(data);
      }
    } catch (error) {
      toast({
        title: "Error fetching clients",
        description: "An error occurred while fetching client data.",
        variant: "destructive",
      });
      console.error("Error fetching clients:", error);
    }
  };

const fetchMetrics = async () => {
    try {
      setLoading(true);

      const { data: clientsData, error: clientsError } = await supabase
        .from("hr_clients")
        .select("id, client_name, service_type, commission_value, commission_type, currency")
        .eq("organization_id", organization_id);

      if (clientsError) throw clientsError;
      console.log("fetchMetrics: Fetched clients:", clientsData);

      if (!clientsData || clientsData.length === 0) {
        console.log("fetchMetrics: No clients found, exiting");
        setLoading(false);
        return;
      }

      const { data: jobsData, error: jobsError } = await supabase
        .from("hr_jobs")
        .select("id, title, client_owner, job_type_category, budget, budget_type")
        // .eq("organization_id", organization_id);

      if (jobsError) throw jobsError;
      console.log("fetchMetrics: Fetched jobs:", jobsData);

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("hr_job_candidates")
        .select(`
            id, name, email, phone, experience, skills, status, job_id,
            main_status_id, sub_status_id, ctc, accrual_ctc, expected_salary, joining_date, applied_from,
            hr_jobs:hr_job_candidates_job_id_fkey(id, title, job_type_category, client_details)
          `)
        // .eq("organization_id", organization_id)
     .or(`main_status_id.eq.${JOINED_STATUS_ID},main_status_id.eq.${OFFERED_STATUS_ID}`)
          .in("sub_status_id", [JOINED_SUB_STATUS_ID, OFFER_ISSUED_SUB_STATUS_ID]);

      if (candidatesError) throw candidatesError;
      console.log("fetchMetrics: Fetched candidates:", candidatesData);

      const { data: projectsData, error: projectsError } = await supabase
        .from("hr_projects")
        .select("id, client_id")
        // .eq("organization_id", organization_id);

      if (projectsError) throw projectsError;
      console.log("fetchMetrics: Fetched projects:", projectsData);

      const { data: employeesData, error: employeesError } = await supabase
        .from("hr_project_employees")
        .select(`
          id,
          assign_employee,
          project_id,
          client_id,
          salary,
          client_billing,
          billing_type,
          salary_type,
          salary_currency,
          hr_employees:hr_employees!hr_project_employees_assign_employee_fkey(first_name, last_name)
        `)
        // .eq("organization_id", organization_id);

      if (employeesError) throw employeesError;
      console.log("fetchMetrics: Fetched employees:", employeesData);

      const { data: timeLogs, error: timeLogsError } = await supabase
        .from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
            .eq("is_approved", true)
        // .eq("organization_id", organization_id);

      if (timeLogsError) throw timeLogsError;
      console.log("fetchMetrics: Fetched time logs:", timeLogs);

      let totalRevenue = 0;
      let totalProfit = 0;
      let permanentCandidates = 0;
      let contractualCandidates = 0;
      let bothCandidates = 0;
      let permanentEmployees = 0;
      let contractualEmployees = 0;
      let bothEmployees = 0;

      const metricsByServiceType: {
        [key: string]: { revenue: number; profit: number };
      } = {
        permanent: { revenue: 0, profit: 0 },
        contractual: { revenue: 0, profit: 0 },
        both: { revenue: 0, profit: 0 },
      };

      const metricsByClient: {
        [clientName: string]: { revenue: number; profit: number; total_projects: number };
      } = {};

      // Process candidates
      if (candidatesData && candidatesData.length > 0) {
        console.log(`fetchMetrics: Processing ${candidatesData.length} candidates`);
        candidatesData.forEach((candidate) => {
          const job = jobsData?.find((j) => j.id === candidate.job_id);
          const client = clientsData?.find((c) => c.client_name === job?.client_owner);

          if (!job || !client) {
            console.log(`fetchMetrics: Skipping candidate ${candidate.id}, job or client not found. JobID=${candidate.job_id}, ClientOwner=${job?.client_owner}`);
            return;
          }

          // Calculate candidate profit
          const candProfit = calculateProfit(
            candidate,
            client.currency || "INR",
            client.commission_type || "",
            client.commission_value || 0,
            job
          );

          // Calculate candidate revenue
          const candRevenue = job.job_type_category.toLowerCase() === "internal"
            ? (candidate.accrual_ctc ? parseSalary(candidate.accrual_ctc) : 0)
            : candProfit;

          console.log(`fetchMetrics: Candidate ${candidate.id}, Revenue=${candRevenue}, Profit=${candProfit}`);

          totalRevenue += candRevenue;
          totalProfit += candProfit;

          if (!metricsByClient[client.client_name]) {
            metricsByClient[client.client_name] = { revenue: 0, profit: 0, total_projects: 0 };
          }
          metricsByClient[client.client_name].revenue += candRevenue;
          metricsByClient[client.client_name].profit += candProfit;

          const isPermanent = client.service_type.includes("permanent") && !client.service_type.includes("contractual");
          const isContractual = client.service_type.includes("contractual") && !client.service_type.includes("permanent");
          const isBoth = client.service_type.includes("permanent") && client.service_type.includes("contractual");

          if (isPermanent) {
            permanentCandidates++;
            metricsByServiceType.permanent.revenue += candRevenue;
            metricsByServiceType.permanent.profit += candProfit;
          } else if (isContractual) {
            contractualCandidates++;
            metricsByServiceType.contractual.revenue += candRevenue;
            metricsByServiceType.contractual.profit += candProfit;
          } else if (isBoth) {
            bothCandidates++;
            metricsByServiceType.both.revenue += candRevenue;
            metricsByServiceType.both.profit += candProfit;
          }
        });
      } else {
        console.log("fetchMetrics: No candidates found");
      }

      // Process employees
      if (employeesData && employeesData.length > 0) {
        console.log(`fetchMetrics: Processing ${employeesData.length} employees`);
        employeesData.forEach((employee) => {
          const project = projectsData?.find((p) => p.id === employee.project_id);
          const client = clientsData?.find((c) => c.id === project?.client_id || c.id === employee.client_id);

          if (!client) {
            console.log(`fetchMetrics: Skipping employee ${employee.assign_employee}, client not found. ProjectID=${employee.project_id}, ClientID=${employee.client_id}`);
            return;
          }

          const empRevenue = calculateEmployeeRevenue(employee, employee.project_id, client.currency, timeLogs);
          const empProfit = calculateEmployeeProfit(employee, employee.project_id, client.currency, timeLogs);

          console.log(`fetchMetrics: Employee ${employee.assign_employee}, Revenue=${empRevenue}, Profit=${empProfit}`);

          totalRevenue += empRevenue;
          totalProfit += empProfit;

          if (!metricsByClient[client.client_name]) {
            metricsByClient[client.client_name] = { revenue: 0, profit: 0, total_projects: 0 };
          }
          metricsByClient[client.client_name].revenue += empRevenue;
          metricsByClient[client.client_name].profit += empProfit;
          metricsByClient[client.client_name].total_projects += 1;

          const isPermanent = client.service_type.includes("permanent") && !client.service_type.includes("contractual");
          const isContractual = client.service_type.includes("contractual") && !client.service_type.includes("permanent");
          const isBoth = client.service_type.includes("permanent") && client.service_type.includes("contractual");

          if (isPermanent) {
            permanentEmployees++;
            metricsByServiceType.permanent.revenue += empRevenue;
            metricsByServiceType.permanent.profit += empProfit;
          } else if (isContractual) {
            contractualEmployees++;
            metricsByServiceType.contractual.revenue += empRevenue;
            metricsByServiceType.contractual.profit += empProfit;
          } else if (isBoth) {
            bothEmployees++;
            metricsByServiceType.both.revenue += empRevenue;
            metricsByServiceType.both.profit += empProfit;
          }
        });
      } else {
        console.log("fetchMetrics: No employees found");
      }

      // Log final metrics
      console.log("fetchMetrics: Final metricsByClient:", metricsByClient);
      console.log(`fetchMetrics: Total Revenue=${totalRevenue}, Total Profit=${totalProfit}`);

      // Calculate client financials for charts
      const clientFinancialsData = clientsData.map((client) => ({
        ...client,
        total_projects: metricsByClient[client.client_name]?.total_projects || 0,
        revenue_inr: metricsByClient[client.client_name]?.revenue || 0,
        revenue_usd: (metricsByClient[client.client_name]?.revenue || 0) / USD_TO_INR_RATE,
        profit_inr: metricsByClient[client.client_name]?.profit || 0,
        profit_usd: (metricsByClient[client.client_name]?.profit || 0) / USD_TO_INR_RATE,
      }));

      console.log("fetchMetrics: Client financials:", clientFinancialsData);
      setClientFinancials(clientFinancialsData);

      setMetrics({
        totalRevenue,
        totalProfit,
        totalCandidates: candidatesData?.length || 0,
        totalEmployees: employeesData?.length || 0,
        permanentCandidates,
        contractualCandidates,
        bothCandidates,
        permanentEmployees,
        contractualEmployees,
        bothEmployees,
        totalClients: clientsData.length,
        activeClients: clientsData.filter((c) => c.status === "active").length,
        inactiveClients: clientsData.filter((c) => c.status === "inactive").length,
        totalProjects: projectsData?.length || 0,
      });
    } catch (error) {
      toast({
        title: "Error fetching metrics",
        description: "An error occurred while fetching data.",
        variant: "destructive",
      });
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = (filter: string) => {
    setActiveFilter(filter);
    setCurrentPage(1);

    if (filter === "all") {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter((client) => {
      if (!client.service_type || !Array.isArray(client.service_type)) {
        return false;
      }

      if (filter === "both") {
        return (
          client.service_type.includes("permanent") &&
          client.service_type.includes("contractual")
        );
      }

      if (filter === "permanent") {
        return (
          client.service_type.includes("permanent") &&
          !client.service_type.includes("contractual")
        );
      }

      if (filter === "contractual") {
        return (
          client.service_type.includes("contractual") &&
          !client.service_type.includes("permanent")
        );
      }

      return false;
    });

    setFilteredClients(filtered);
  };

  const handleClientClick = (clientName: string) => {
    navigate(`/client-dashboard/${encodeURIComponent(clientName)}/candidates`);
  };

  const handleClientAdded = () => {
  fetchClients(); // Trigger fetchClients when a client is added
};

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "inactive":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleStatusChange = async (clientId: string, status: string) => {
    setStatusUpdateLoading(clientId);
    try {
      const { error } = await supabase
        .from("hr_clients")
        .update({ status })
        .eq("id", clientId);

      if (error) throw error;

      await fetchClients();
      toast({
        title: "Status Updated",
        description: "Client status updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update client status.",
        variant: "destructive",
      });
      console.error("Error updating status:", error);
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditClient(client);
    setAddClientOpen(true);
  };

  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("hr_clients")
        .delete()
        .eq("id", clientToDelete.id);

      if (error) throw error;

      await fetchClients();
      toast({
        title: "Client Deleted",
        description: "Client deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete client.",
        variant: "destructive",
      });
      console.error("Error deleting client:", error);
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const renderPagination = () => {
    return (
      <div className="flex flex-col items-center gap-4 mt-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-600">Show</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[60px] sm:w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs sm:text-sm text-gray-600">per page</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, currentPage - 3),
                Math.min(totalPages, currentPage + 2)
              )
              .map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="h-8 w-8 p-0"
                >
                  {page}
                </Button>
              ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-xs sm:text-sm text-gray-600">
          Showing {startIndex + 1} to{" "}
          {Math.min(startIndex + itemsPerPage, filteredClients.length)} of{" "}
          {filteredClients.length} clients
        </span>
      </div>
    );
  };

  useEffect(() => {
    Promise.all([fetchClients(), fetchMetrics()]).then(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 md:p-10">
      <main className="w-full max-w-8xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-tight">
              Client Dashboard
            </h1>
            <p className="text-gray-500 text-sm md:text-base mt-2">
              Manage and track all client activities, including jobs and projects
            </p>
          </div>
         <Button 
              onClick={() => setAddClientOpen(true)}
              className="flex items-center gap-2 text-xs sm:text-sm"
              size="sm"
              >
            <Plus size={16} />
            <span>Create New Client</span>
          </Button>
        </div>

        {/* Stats Overview */}
        {loading ? (
          <div className="flex items-center justify-center h-[80vh]">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Total Clients</p>
                    <h3 className="text-2xl font-bold text-gray-800">{metrics.totalClients}</h3>
                    <p className="text-xs text-gray-500 mt-1">All clients</p>
                  </div>
                  <div className="bg-gradient-to-br from-fuchsia-400 to-fuchsia-600 p-3 rounded-full">
                    <Briefcase size={24} className="text-white" />
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Active Clients</p>
                    <h3 className="text-2xl font-bold text-gray-800">{metrics.activeClients}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {metrics.totalClients ? Math.round((metrics.activeClients / metrics.totalClients) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-full">
                    <UserRoundCheck size={24} className="text-white" />
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Inactive Clients</p>
                    <h3 className="text-2xl font-bold text-gray-800">{metrics.inactiveClients}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {metrics.totalClients ? Math.round((metrics.inactiveClients / metrics.totalClients) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-red-400 to-red-600 p-3 rounded-full">
                    <UserRoundX size={24} className="text-white" />
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Total Projects</p>
                    <h3 className="text-2xl font-bold text-gray-800">{metrics.totalProjects}</h3>
                    <p className="text-xs text-gray-500 mt-1">Across all clients</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-3 rounded-full">
                    <Briefcase size={24} className="text-white" />
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(metrics.totalRevenue)}</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <p className="text-xs text-gray-500 mt-1">
                            ${(metrics.totalRevenue / USD_TO_INR_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-white border-gray-200 shadow-lg rounded-lg p-2">
                          <p>Converted at 1 USD = ₹ {USD_TO_INR_RATE}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-full">
                    <ReceiptIndianRupee size={24} className="text-white" />
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Total Profit</p>
                    <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(metrics.totalProfit)}</h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <p className="text-xs text-gray-500 mt-1">
                            ${(metrics.totalProfit / USD_TO_INR_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="bg-white border-gray-200 shadow-lg rounded-lg p-2">
                          <p>Converted at 1 USD = ₹ {USD_TO_INR_RATE}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-full">
                    <TrendingUp size={24} className="text-white" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <CardHeader className="purple-gradient text-white p-6">
                  <h2 className="text-xl md:text-2xl font-semibold">Projects & Revenue per Client</h2>
                </CardHeader>
                <CardContent className="p-6 overflow-x-auto">
                  <div style={{ minWidth: `${clientFinancials.length * 100}px` }}>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={clientFinancials}
                        margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
                        className="animate-fade-in"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="client_name"
                          angle={0}
                          textAnchor="middle"
                          interval={0}
                          height={50}
                          label={{ value: "Clients", position: "insideBottom", offset: -10, fill: "#4b5563" }}
                          className="text-sm font-medium purple-text-color"
                          tick={{ fontSize: 12, fill: "#4b5563" }}
                          tickFormatter={(value) => (value.length > 7 ? `${value.slice(0, 7)}...` : value)}
                        />
                        <YAxis
                          label={{ value: "Value", angle: -90, position: "insideLeft", offset: -10, fill: "#4b5563" }}
                          className="text-sm font-medium purple-text-color"
                          tick={{ fontSize: 12, fill: "#4b5563" }}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid oklch(62.7% 0.265 303.9)",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                          }}
                          formatter={(value, name) => {
                            const val = Number(value);
                            if (name === "Revenue" || name === "Profit") {
                              const usd = val / USD_TO_INR_RATE;
                              return [
                                `₹${val.toLocaleString()} ($${usd.toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                                })})`,
                                name,
                              ];
                            }
                            return [val.toLocaleString(), name];
                          }}
                          itemStyle={{ color: "#4b5563" }}
                          cursor={{ fill: "#f3e8ff" }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "14px", color: "#4b5563" }} />
                        <Bar dataKey="total_projects" fill="#7B43F1" name="Projects" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="revenue_inr" fill="#A74BC8" name="Revenue" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit_inr" fill="#B343B5" name="Profit" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <CardHeader className="purple-gradient text-white p-6">
                  <h2 className="text-xl md:text-2xl font-semibold">Revenue vs Profit</h2>
                </CardHeader>
                <CardContent className="p-6 flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart className="animate-fade-in">
                      <Pie
                        data={[
                          { name: "Revenue", value: metrics.totalRevenue, fill: "#7B43F1" },
                          { name: "Profit", value: metrics.totalProfit, fill: "#A74BC8" },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={100}
                        outerRadius={140}
                        cornerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ₹${value.toLocaleString()}`}
                        labelLine={false}
                        className="font-medium purple-text-color"
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid oklch(62.7% 0.265 303.9)",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                        }}
                        formatter={(value, name) => {
                          const val = Number(value);
                          const usd = val / USD_TO_INR_RATE;
                          return [`₹${val.toLocaleString()} ($${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })})`, name];
                        }}
                        itemStyle={{ color: "#4b5563" }}
                      />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: "14px", color: "#4b5563" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Client Table */}
            <Tabs defaultValue="all" value={activeFilter} onValueChange={filterClients} className="mb-4">
              <TabsList className="flex flex-col sm:flex-row justify-start w-full">
                <TabsTrigger value="all" className="flex-1 sm:flex-none text-xs sm:text-sm">All</TabsTrigger>
                <TabsTrigger value="permanent" className="flex-1 sm:flex-none text-xs sm:text-sm">Permanent</TabsTrigger>
                <TabsTrigger value="contractual" className="flex-1 sm:flex-none text-xs sm:text-sm">Contractual</TabsTrigger>
                <TabsTrigger value="both" className="flex-1 sm:flex-none text-xs sm:text-sm">Both</TabsTrigger>
              </TabsList>
              <TabsContent value={activeFilter}>
                <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl rounded-2xl">
                  <CardContent className="p-6">
                    <div className="sm:hidden flex flex-col gap-3">
                      {paginatedClients.length > 0 ? (
                        paginatedClients.map((client) => (
                          <Card key={client.id} className="p-3">
                            <div className="flex flex-col gap-2">
                              <div>
                                <span
                                  className="font-medium text-black text-sm hover:underline cursor-pointer"
                                  onClick={() => handleClientClick(client.client_name)}
                                >
                                  {client.client_name}
                                </span>
                                <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full text-[10px]">
                                  {client.display_name || 'N/A'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Status:</span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="transparent" className="h-7 px-2 py-0">
                                      {statusUpdateLoading === client.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className={getStatusBadgeColor(client.status)}
                                        >
                                          {client.status || 'Unknown'}
                                        </Badge>
                                      )}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    <DropdownMenuItem
                                      className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                      onClick={() => handleStatusChange(client.id, 'Active')}
                                    >
                                      Active
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                      onClick={() => handleStatusChange(client.id, 'Inactive')}
                                    >
                                      Inactive
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-yellow-600 focus:text-yellow-600 focus:bg-yellow-50"
                                      onClick={() => handleStatusChange(client.id, 'Pending')}
                                    >
                                      Pending
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="flex space-x-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleClientClick(client.client_name);
                                        }}
                                        aria-label="View Client"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View Client</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditClient(client);
                                        }}
                                        aria-label="Edit Client"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Edit Client</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteClient(client);
                                        }}
                                        aria-label="Delete Client"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Delete Client</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <Card className="p-4 text-center">
                          <p className="text-sm text-gray-500">No clients found matching the selected filter.</p>
                        </Card>
                      )}
                    </div>
                    <div className="hidden sm:block rounded-md border overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <div className="flex items-center gap-1">
                                Client Name
                                <button aria-label="Sort by Client Name">
                                  <ArrowUpDown size={12} />
                                </button>
                              </div>
                            </th>
                            <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <div className="flex items-center gap-1">
                                Internal Contact
                                <button aria-label="Sort by Internal Contact">
                                  <ArrowUpDown size={12} />
                                </button>
                              </div>
                            </th>
                            <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</th>
                            <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                            <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                            <th scope="col" className="px-4 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedClients.length > 0 ? (
                            paginatedClients.map((client) => (
                              <tr
                                key={client.id}
                                className="hover:bg-gray-50 transition"
                              >
                                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                  <div className="flex flex-col">
                                    <span
                                      className="font-medium text-black-600 hover:underline cursor-pointer"
                                      onClick={() => handleClientClick(client.client_name)}
                                    >
                                      {client.client_name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                  {client.internal_contact || '-'}
                                </td>
                                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                  <div className="flex flex-wrap gap-1">
                                    {client.service_type?.length ? (
                                      client.service_type.map((type, index) => (
                                        <Badge key={index} variant="outline" className="capitalize text-[8px] sm:text-xs bg-blue-100 text-blue-800 hover:bg-blue-200">
                                          {type}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-gray-500">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                  {client.currency || '-'}
                                </td>
                                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="transparent" className="h-7 sm:h-8 px-2 py-0">
                                        {statusUpdateLoading === client.id ? (
                                          <Loader2 className="h-3 sm:h-4 w-3 sm:w-4 animate-spin mr-1" />
                                        ) : (
                                          <Badge
                                            variant="outline"
                                            className={getStatusBadgeColor(client.status)}
                                          >
                                            {client.status || 'Unknown'}
                                          </Badge>
                                        )}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="center">
                                      <DropdownMenuItem
                                        className="text-green-600 focus:text-green-600 focus:bg-green-50"
                                        onClick={() => handleStatusChange(client.id, 'Active')}
                                      >
                                        Active
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                        onClick={() => handleStatusChange(client.id, 'Inactive')}
                                      >
                                        Inactive
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-yellow-600 focus:text-yellow-600 focus:bg-yellow-50"
                                        onClick={() => handleStatusChange(client.id, 'Pending')}
                                      >
                                        Pending
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                  {client.hr_employees?.first_name && client.hr_employees?.last_name
                                    ? `${client.hr_employees.first_name} ${client.hr_employees.last_name}`
                                    : '-'}
                                </td>
                                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-[10px] sm:text-sm text-gray-900">
                                  <div className="flex space-x-2">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 sm:h-8 w-7 sm:w-8"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleClientClick(client.client_name);
                                            }}
                                            aria-label="View Client"
                                          >
                                            <Eye className="h-3 sm:h-4 w-3 sm:w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>View Client</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 sm:h-8 w-7 sm:w-8"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditClient(client);
                                            }}
                                            aria-label="Edit Client"
                                          >
                                            <Edit className="h-3 sm:h-4 w-3 sm:w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Edit Client</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 sm:h-8 w-7 sm:w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteClient(client);
                                            }}
                                            aria-label="Delete Client"
                                          >
                                            <Trash2 className="h-3 sm:h-4 w-3 sm:w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Delete Client</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-4 sm:px-6 py-6 sm:py-8 text-center text-[10px] sm:text-sm text-gray-500">
                                No clients found matching the selected filter.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {filteredClients.length > 0 && renderPagination()}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Add/Edit Client Dialog */}
        <AddClientDialog
          open={addClientOpen}
          onOpenChange={(open) => {
            setAddClientOpen(open);
            if (!open) setEditClient(null);
          }}
          clientToEdit={editClient}
          onClientAdded={handleClientAdded}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the client "{clientToDelete?.client_name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteClient}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default ClientManagementDashboard;
// Final// 
// Check