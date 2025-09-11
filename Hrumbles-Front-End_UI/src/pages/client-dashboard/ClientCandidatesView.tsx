import React, { useState, useEffect, useMemo } from "react"; // --- CHANGED: Added useMemo
import { useParams, useNavigate, Link } from "react-router-dom";
import supabase from "../../config/supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Search, TrendingUp, ChevronLeft, ChevronRight, ArrowUpDown, Loader2, Plus, Briefcase, Calendar, Clock, DollarSign, UserRoundCheck, UserRoundX, ReceiptIndianRupee, Users } from "lucide-react"; // --- ADDED: Users icon
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import HiddenContactCell from "@/components/ui/HiddenContactCell";
import { format } from "date-fns";
import moment from "moment";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/jobs/ui/dropdown-menu";
import { useSelector } from "react-redux";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie } from "recharts";

// --- ADDED: New components for UI enhancements
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


// --- NEW DYNAMIC STATUS ID CONFIGURATION ---
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

// Static USD to INR conversion rates
const USD_TO_INR_RATE_CANDIDATES = 84;
const USD_TO_INR_RATE_EMPLOYEES = 84;

// --- ADDED: Type for sorting configuration
type SortConfig = {
  key: keyof Candidate | keyof Employee;
  direction: "ascending" | "descending";
} | null;

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  experience: string;
  skills: string[];
  status: string;
  job_id: string;
  job_title?: string;
  main_status_id?: string;
  sub_status_id?: string;
  ctc?: string;
  accrual_ctc?: string;
  expected_salary?: number;
  profit?: number;
  job_type_category?: string;
  joining_date?: string;
  applied_from?: string; // --- ADDED: To match usage in table
  hr_jobs?: {
    client_details?: {
      pointOfContact?: string;
    };
  };
}

interface Employee {
  id: string;
  employee_name: string;
  project_id: string;
  project_name?: string;
  salary: number;
  salary_type: string;
  salary_formatted: string;
  client_billing: number;
  billing_type: string;
  billing_type_formatted: string;
  currency: string;
  actual_revenue_inr: number;
  actual_profit_inr: number;
  salary_currency: string;
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

interface Job {
  id: string;
  title: string;
  client_owner: string;
  job_type_category: string;
  budget?: number;
  budget_type?: string;
}

interface Client {
  id: string;
  client_name: string;
  commission_value?: number;
  commission_type?: string;
  currency: string;
  service_type: string[];
}

interface ClientMetrics {
  candidateRevenue: number;
  candidateProfit: number;
  candidateCount: number;
  employeeRevenueINR: number;
  employeeProfitINR: number;
  employeeCount: number;
}

const ClientCandidatesView = () => {
  const { clientName } = useParams<{ clientName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
    const statusIds = useMemo(() => {
    return organization_id === DEMO_ORGANIZATION_ID ? STATUS_CONFIG.demo : STATUS_CONFIG.default;
  }, [organization_id]);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [metrics, setMetrics] = useState<ClientMetrics>({
    candidateRevenue: 0,
    candidateProfit: 0,
    candidateCount: 0,
    employeeRevenueINR: 0,
    employeeProfitINR: 0,
    employeeCount: 0,
  });
  const [serviceType, setServiceType] = useState<string[]>([]);
  const [clientCurrency, setClientCurrency] = useState<string>("INR");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPageCandidates, setCurrentPageCandidates] = useState(1);
  const [currentPageEmployees, setCurrentPageEmployees] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);

  // --- ADDED: State for sorting
  const [candidateSortConfig, setCandidateSortConfig] = useState<SortConfig>(null);
  const [employeeSortConfig, setEmployeeSortConfig] = useState<SortConfig>(null);


  const isEmployee = false;

  const currencies = [
    { value: "INR", symbol: "₹" },
    { value: "USD", symbol: "$" },
  ];
  
// --- START: All calculation and fetching functions remain the same --- //
  const parseSalary = (salary: string | undefined): number => {
    if (!salary) return 0;
    const currency = currencies.find((c) => salary.startsWith(c.symbol)) || currencies[0];
    const parts = salary.replace(currency.symbol, "").trim().split(" ");
    const amount = parseFloat(parts[0]) || 0;
    const budgetType = parts[1] || "LPA";

    let convertedAmount = amount;

    if (currency.value === "USD") {
      convertedAmount *= USD_TO_INR_RATE_CANDIDATES;
    }

    if (budgetType === "Monthly") {
      convertedAmount *= 12;
    } else if (budgetType === "Hourly") {
      convertedAmount *= 2016;
    }

    return convertedAmount;
  };

  const calculateCandidateProfit = (
    candidate: Candidate,
    job: Job,
    client: Client
  ): number => {
    let salary = candidate.ctc || candidate.expected_salary || 0;
    let budget = candidate.accrual_ctc || 0;
    let commissionValue = client.commission_value || 0;

    let salaryAmount = 0;
    let salaryCurrency = "INR";
    let salaryType = "LPA";

    if (typeof salary === "string" && candidate.ctc) {
      const currency = currencies.find((c) => salary.startsWith(c.symbol)) || currencies[0];
      const parts = salary.replace(currency.symbol, "").trim().split(" ");
      salaryAmount = parseFloat(parts[0]) || 0;
      salaryCurrency = currency.value;
      salaryType = parts[1] || "LPA";
    } else if (typeof salary === "number" && candidate.expected_salary) {
      salaryAmount = salary;
      salaryCurrency = "INR";
      salaryType = "LPA";
    }

    let budgetAmount = 0;
    let budgetCurrency = "INR";
    let budgetType = "LPA";

    if (typeof budget === "string" && candidate.accrual_ctc) {
      const currency = currencies.find((c) => budget.startsWith(c.symbol)) || currencies[0];
      const parts = budget.replace(currency.symbol, "").trim().split(" ");
      budgetAmount = parseFloat(parts[0]) || 0;
      budgetCurrency = currency.value;
      budgetType = parts[1] || "LPA";
    }

    if (salaryCurrency === "USD") {
      salaryAmount *= USD_TO_INR_RATE_CANDIDATES;
    }
    if (salaryType === "Monthly") {
      salaryAmount *= 12;
    } else if (salaryType === "Hourly") {
      salaryAmount *= 2016;
    }

    if (budgetCurrency === "USD") {
      budgetAmount *= USD_TO_INR_RATE_CANDIDATES;
    }
    if (budgetType === "Monthly") {
      budgetAmount *= 12;
    } else if (budgetType === "Hourly") {
      budgetAmount *= 2016;
    }

    if (client.currency === "USD" && client.commission_type === "fixed") {
      commissionValue *= USD_TO_INR_RATE_CANDIDATES;
    }

    if (job.job_type_category === "Internal") {
      const profit = budgetAmount - salaryAmount;
      return profit;
    } else {
      if (client.commission_type === "percentage" && client.commission_value) {
        return (salaryAmount * client.commission_value) / 100;
      } else if (client.commission_type === "fixed" && commissionValue) {
        return commissionValue;
      }
    }

    return 0;
  };
  

  const formatBilling = (amount: number, billingType: string, currency?: string): string => { // --- CHANGED: currency optional
    const currencySymbol = currencies.find((c) => c.value === currency)?.symbol || "₹";
    const formattedAmount = amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    switch (billingType) {
      case "Hourly":
        return `${currencySymbol}${formattedAmount}/hr`;
      case "Monthly":
        return `${currencySymbol}${formattedAmount}/Month`;
      case "LPA":
        return `${currencySymbol}${formattedAmount}/year`;
      default:
        return `${currencySymbol}${formattedAmount}/year`;
    }
  };

  const calculateEmployeeHours = (employeeId: string, projectId: string, timeLogs: TimeLog[]) =>
    timeLogs
      .filter((log) => log.employee_id === employeeId)
      .reduce((acc, log) => {
        const projectEntry = log.project_time_data?.projects?.find(
          (proj) => proj.projectId === projectId
        );
        return acc + (projectEntry?.hours || 0);
      }, 0);

  const convertToHourly = (amount: number, billingType: string, currency: string) => {
    let hourlyRate = amount;

    if (currency === "USD") {
      hourlyRate *= USD_TO_INR_RATE_EMPLOYEES;
    }

    switch (billingType) {
      case "Monthly":
        hourlyRate = (hourlyRate * 12) / (365 * 8);
        break;
      case "Hourly":
        break;
      case "LPA":
        hourlyRate = hourlyRate / (365 * 8);
        break;
      default:
        break;
    }

    return hourlyRate;
  };

  const calculateRevenue = (employee: Employee, projectId: string, timeLogs: TimeLog[]) => {
    const hours = calculateEmployeeHours(employee.id, projectId, timeLogs);
    const hourlyRate = convertToHourly(employee.client_billing, employee.billing_type, employee.currency);
    return hours * hourlyRate;
  };

  const calculateProfit = (employee: Employee, projectId: string, timeLogs: TimeLog[]) => {
    const revenue = calculateRevenue(employee, projectId, timeLogs);
    const hours = calculateEmployeeHours(employee.id, projectId, timeLogs);
    let salary = employee.salary;
    
  if (employee.salary_currency === "USD") {
    salary *= USD_TO_INR_RATE_EMPLOYEES;
  }

    const salaryType = employee.salary_type;
    if (salaryType === "LPA") {
      const hourlySalary = salary / (365 * 8);
      salary = hours * hourlySalary;
    } else if (salaryType === "Monthly") {
      const monthlyToHourly = (salary / 30) / 8;
      salary = hours * monthlyToHourly;
    } else if (salaryType === "Hourly") {
      salary = salary * hours;
    }

    return revenue - salary;
  };

 
const fetchCandidatesAndEmployees = async (client: string) => {
  try {
    setLoading(true);

    const { data: clientData, error: clientError } = await supabase
      .from("hr_clients")
      .select("id, client_name, commission_value, commission_type, currency, service_type")
      .eq("client_name", client)
      .eq("organization_id", organization_id)
      .single();

    if (clientError) throw clientError;

    setServiceType(clientData.service_type || []);
    setClientCurrency(clientData.currency || "INR");

    const { data: jobsData, error: jobsError } = await supabase
      .from("hr_jobs")
      .select("id, title, client_owner, job_type_category, budget, budget_type")
      .eq("client_owner", client)
      .eq("organization_id", organization_id);

    if (jobsError) throw jobsError;

    let candidateRevenue = 0;
    let candidateProfit = 0;
    let candidateCount = 0;
    let employeeRevenueINR = 0;
    let employeeProfitINR = 0;
    let employeeCount = 0;

    if (jobsData && jobsData.length > 0) {
      const jobIds = jobsData.map((job) => job.id);

      const { data: candidatesData, error: candidatesError } = await supabase
        .from("hr_job_candidates")
        .select(`
          id, name, email, phone, experience, skills, status, job_id,
          main_status_id, sub_status_id, ctc, accrual_ctc, expected_salary, joining_date, applied_from,
          hr_jobs!hr_job_candidates_job_id_fkey(id, title, job_type_category, client_details)
        `)
        .in("job_id", jobIds)
       .or(`main_status_id.eq.${statusIds.JOINED_STATUS_ID},main_status_id.eq.${statusIds.OFFERED_STATUS_ID}`)
          .in("sub_status_id", [statusIds.JOINED_SUB_STATUS_ID, statusIds.OFFER_ISSUED_SUB_STATUS_ID]);
        
      if (candidatesError) throw candidatesError;

      if (candidatesData && candidatesData.length > 0) {
        const enhancedCandidates = candidatesData.map((candidate) => {
          const job = jobsData.find((job) => job.id === candidate.job_id);
          const candProfit = job ? calculateCandidateProfit(candidate, job, clientData) : 0;
          const candRevenue = job?.job_type_category === "Internal"
            ? (candidate.accrual_ctc ? parseSalary(candidate.accrual_ctc) : 0)
            : candProfit;

          candidateRevenue += candRevenue;
          candidateProfit += candProfit;

          return {
            ...candidate,
            job_title: job ? job.title : "Unknown",
            job_type_category: job ? job.job_type_category : "Unknown",
            profit: candProfit,
          };
        });

        candidateCount = candidatesData.length;
        setCandidates(enhancedCandidates);
        setFilteredCandidates(enhancedCandidates);
      } else {
        setCandidates([]);
        setFilteredCandidates([]);
      }
    } else {
      setCandidates([]);
      setFilteredCandidates([]);
    }

    if (clientData.service_type.includes("contractual")) {
      const { data: projectsData, error: projectsError } = await supabase
        .from("hr_projects")
        .select("id, client_id, name")
        .eq("client_id", clientData.id)
        .eq("organization_id", organization_id);

      if (projectsError) throw projectsError;

      const { data: employeesData, error: employeesError } = await supabase
        .from("hr_project_employees")
        .select(`
          id,
          assign_employee,
          project_id,
          client_id,
          salary,
          salary_currency,
          salary_type,
          client_billing,
          billing_type,
          hr_employees:hr_employees!hr_project_employees_assign_employee_fkey(first_name, last_name)
        `)
        .eq("client_id", clientData.id)
        .eq("organization_id", organization_id);

      if (employeesError) throw employeesError;

      const projectIds = projectsData?.map((p) => p.id) || [];

      const { data: timeLogsData, error: timeLogsError } = await supabase
        .from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
            .eq("is_approved", true);

      if (timeLogsError) throw timeLogsError;

      const relevantTimeLogs = timeLogsData?.filter((log) =>
        log.project_time_data?.projects?.some((proj) => projectIds.includes(proj.projectId))
      ) || [];

      if (employeesData && employeesData.length > 0) {
        const enhancedEmployees = employeesData.map((employee) => {
          const project = projectsData?.find((p) => p.id === employee.project_id);
          const employeeName = employee.hr_employees
            ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
            : "Unknown";
          const salaryType = employee.salary_type || "LPA";
          const salaryCurrency = employee.salary_currency || "INR";
          const actualRevenue = calculateRevenue(
            {
              id: employee.assign_employee,
              employee_name: employeeName,
              project_id: employee.project_id,
              project_name: project?.name,
              salary: Number(employee.salary) || 0,
              salary_type: salaryType,
              salary_currency: salaryCurrency,
              salary_formatted: "",
              client_billing: Number(employee.client_billing) || 0,
              billing_type: employee.billing_type || "LPA",
              billing_type_formatted: "",
              currency: clientData.currency,
              actual_revenue_inr: 0,
              actual_profit_inr: 0,
            },
            employee.project_id,
            relevantTimeLogs
          );
          const actualProfit = calculateProfit(
            {
              id: employee.assign_employee,
              employee_name: employeeName,
              project_id: employee.project_id,
              project_name: project?.name,
              salary: Number(employee.salary) || 0,
              salary_type: salaryType,
              salary_currency: salaryCurrency,
              salary_formatted: "",
              client_billing: Number(employee.client_billing) || 0,
              billing_type: employee.billing_type || "LPA",
              billing_type_formatted: "",
              currency: clientData.currency,
              actual_revenue_inr: 0,
              actual_profit_inr: 0,
            },
            employee.project_id,
            relevantTimeLogs
          );

          employeeRevenueINR += actualRevenue;
          employeeProfitINR += actualProfit;

          return {
            id: employee.assign_employee,
            employee_name: employeeName,
            project_id: employee.project_id,
            project_name: project ? project.name : "Unknown",
            salary: Number(employee.salary) || 0,
            salary_type: salaryType,
            salary_currency: salaryCurrency,
            salary_formatted: formatBilling(Number(employee.salary) || 0, salaryType),
            client_billing: Number(employee.client_billing) || 0,
            billing_type: employee.billing_type || "LPA",
            billing_type_formatted: formatBilling(Number(employee.client_billing) || 0, employee.billing_type || "LPA", clientData.currency), // --- CHANGED: Pass currency
            currency: clientData.currency,
            actual_revenue_inr: actualRevenue,
            actual_profit_inr: actualProfit,
          };
        });

        employeeCount = employeesData.length;
        setEmployees(enhancedEmployees);
        setFilteredEmployees(enhancedEmployees);
      } else {
        setEmployees([]);
        setFilteredEmployees([]);
      }
    } else {
      setEmployees([]);
      setFilteredEmployees([]);
    }

    setMetrics({
      candidateRevenue,
      candidateProfit,
      candidateCount,
      employeeRevenueINR,
      employeeProfitINR,
      employeeCount,
    });
  } catch (error) {
    toast({
      title: "Error fetching data",
      description: "An error occurred while fetching candidate or employee data.",
      variant: "destructive",
    });
    console.error("Error fetching data:", error);
  } finally {
    setLoading(false);
  }
};
// --- END: All calculation and fetching functions remain the same --- //


// --- START: NEW AND MODIFIED UI/UX Functions --- //

  // --- ADDED: Sorting function
  const handleSort = (key: keyof Candidate | keyof Employee, type: 'candidate' | 'employee') => {
    const sortConfig = type === 'candidate' ? candidateSortConfig : employeeSortConfig;
    const setSortConfig = type === 'candidate' ? setCandidateSortConfig : setEmployeeSortConfig;

    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // --- ADDED: useMemo to sort data only when necessary
  const sortedCandidates = useMemo(() => {
    const sortableItems = [...filteredCandidates];
    if (candidateSortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[candidateSortConfig.key as keyof Candidate] ?? '';
        const bValue = b[candidateSortConfig.key as keyof Candidate] ?? '';

        if (aValue < bValue) {
          return candidateSortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return candidateSortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredCandidates, candidateSortConfig]);

  const sortedEmployees = useMemo(() => {
    const sortableItems = [...filteredEmployees];
    if (employeeSortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[employeeSortConfig.key as keyof Employee] ?? '';
        const bValue = b[employeeSortConfig.key as keyof Employee] ?? '';
        if (aValue < bValue) {
          return employeeSortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return employeeSortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredEmployees, employeeSortConfig]);


  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPageCandidates(1);
    setCurrentPageEmployees(1);

    if (!value.trim()) {
      setFilteredCandidates(candidates);
      setFilteredEmployees(employees);
      return;
    }

    const searchTermLower = value.toLowerCase();
    const filteredCandidates = candidates.filter(
      (candidate) =>
        candidate.name.toLowerCase().includes(searchTermLower) ||
        candidate.email.toLowerCase().includes(searchTermLower) ||
        candidate.phone?.toLowerCase().includes(searchTermLower) ||
        candidate.skills?.some((skill) => skill.toLowerCase().includes(searchTermLower)) ||
        candidate.job_title?.toLowerCase().includes(searchTermLower)
    );

    const filteredEmployees = employees.filter(
      (employee) =>
        employee.employee_name.toLowerCase().includes(searchTermLower) ||
        employee.project_name?.toLowerCase().includes(searchTermLower)
    );

    setFilteredCandidates(filteredCandidates);
    setFilteredEmployees(filteredEmployees);
  };


  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return moment(date).format("DD MMM YYYY");
    } catch {
      return "-";
    }
  };

  const goBack = () => {
    navigate("/clients");
  };

  const getStatusBadgeColor = (statusId: string | undefined) => {
    switch (statusId) {
      case statusIds.OFFER_ISSUED_SUB_STATUS_ID:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case statusIds.JOINED_SUB_STATUS_ID:
        return "bg-green-100 text-green-800 hover:bg-green-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const getStatusText = (statusId: string | undefined) => {
    switch (statusId) {
      case statusIds.OFFER_ISSUED_SUB_STATUS_ID:
        return "Offer Issued";
      case statusIds.JOINED_SUB_STATUS_ID:
        return "Joined";
      default:
        return "Unknown";
    }
  };

const handleStatusChange = async (candidateId: string, subStatusId: string) => {
    setStatusUpdateLoading(candidateId);
    try {
      const { error } = await supabase
        .from("hr_job_candidates")
         .update({
          main_status_id: subStatusId === statusIds.OFFER_ISSUED_SUB_STATUS_ID ? statusIds.OFFERED_STATUS_ID : statusIds.JOINED_STATUS_ID,
          sub_status_id: subStatusId
        })
        .eq("id", candidateId);

      if (error) throw error;

      await fetchCandidatesAndEmployees(decodeURIComponent(clientName || ""));
      toast({
        title: "Status Updated",
        description: "Candidate status updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update candidate status.",
        variant: "destructive",
      });
      console.error("Error updating status:", error);
    } finally {
      setStatusUpdateLoading(null);
    }
  };



  const totalCandidatePages = Math.ceil(sortedCandidates.length / itemsPerPage);
  const candidateStartIndex = (currentPageCandidates - 1) * itemsPerPage;
  const paginatedCandidates = sortedCandidates.slice(
    candidateStartIndex,
    candidateStartIndex + itemsPerPage
  );

  const totalEmployeePages = Math.ceil(sortedEmployees.length / itemsPerPage);
  const employeeStartIndex = (currentPageEmployees - 1) * itemsPerPage;
  const paginatedEmployees = sortedEmployees.slice(
    employeeStartIndex,
    employeeStartIndex + itemsPerPage
  );

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPageCandidates(1);
    setCurrentPageEmployees(1);
  };

// --- END: NEW AND MODIFIED UI/UX Functions --- //

  // Chart data
  const financialData = [
    ...candidates.map((c) => ({
      name: c.name,
      revenue: c.job_type_category === "Internal" ? (c.accrual_ctc ? parseSalary(c.accrual_ctc) : 0) : (c.profit || 0),
      profit: c.profit || 0,
      type: "Candidate",
    })),
    ...employees.map((e) => ({
      name: e.employee_name,
      revenue: e.actual_revenue_inr,
      profit: e.actual_profit_inr,
      type: "Employee",
    })),
  ].slice(0, 10); // Limit to top 10 for display

  const pieChartData = [
    { name: "Candidate Revenue", value: metrics.candidateRevenue, fill: "#7B43F1" },
    { name: "Employee Revenue", value: metrics.employeeRevenueINR, fill: "#A74BC8" },
    { name: "Candidate Profit", value: metrics.candidateProfit, fill: "#B343B5" },
    { name: "Employee Profit", value: metrics.employeeProfitINR, fill: "#D946EF" },
  ];

  // --- ADDED: Enhanced Empty State Component
  const EmptyState = ({ message, description }: { message: string, description: string }) => (
    <div className="text-center py-10 px-4">
      <Users className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">{message}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );

  // --- ADDED: Skeleton Loader Components
  const MetricsSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="shadow-lg border-none bg-white"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
      <Card className="shadow-lg border-none bg-white"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
      <Card className="shadow-lg border-none bg-white"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
    </div>
  );

  const TableSkeleton = ({ rows = 5 }) => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );

  // --- START: All render functions are modified for new features --- //
  const renderPagination = (totalPages: number, isCandidates: boolean) => {
    const currentPage = isCandidates ? currentPageCandidates : currentPageEmployees;
    const setCurrentPage = isCandidates ? setCurrentPageCandidates : setCurrentPageEmployees;
    const startIndex = isCandidates ? candidateStartIndex : employeeStartIndex;
    const itemCount = isCandidates ? filteredCandidates.length : filteredEmployees.length;

    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-600">Show</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[60px] sm:w-[70px] text-xs sm:text-sm">
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

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev: number) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1 sm:p-2"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, currentPage - 2),
                Math.min(totalPages, currentPage + 1)
              )
              .map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="px-2 py-1 text-xs sm:text-sm"
                >
                  {page}
                </Button>
              ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev: number) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1 sm:p-2"
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <span className="text-xs sm:text-sm text-gray-600">
          Showing {startIndex + 1} to{" "}
          {Math.min(startIndex + itemsPerPage, itemCount)} of {itemCount}
        </span>
      </div>
    );
  };

  const renderCandidateCard = (candidate: Candidate) => (
    <Card key={candidate.id} className="mb-4 p-4">
      <div className="space-y-2">
        <div>
          <strong className="text-sm">Name:</strong>
          <p className="text-sm">{candidate.name}</p>
        </div>
        <div>
          <strong className="text-sm">Contact:</strong>
          <HiddenContactCell
            email={candidate.email}
            phone={candidate.phone}
            candidateId={candidate.id}
            className="text-sm"
          />
        </div>
        <div>
          <strong className="text-sm">Position:</strong>
          <Link to={`/jobs/${candidate.job_id}`} className="text-sm text-blue-600 hover:underline">
            {candidate.job_title}
          </Link>
        </div>
        <div>
          <strong className="text-sm">Experience:</strong>
          <p className="text-sm">{candidate.experience || "-"}</p>
        </div>
        <div>
          <strong className="text-sm">Date of Join:</strong>
          <p className="text-sm">{formatDate(candidate.joining_date)}</p>
        </div>
        <div>
          <strong className="text-sm">Status:</strong>
          <Badge className={`${getStatusBadgeColor(candidate.main_status_id)} text-xs mt-1`}>
            {getStatusText(candidate.main_status_id)}
          </Badge>
        </div>
        <div>
          <strong className="text-sm">Salary (LPA):</strong>
          <p className="text-sm">
            {candidate.ctc
              ? formatCurrency(parseSalary(candidate.ctc))
              : candidate.expected_salary
              ? formatCurrency(candidate.expected_salary)
              : "-"}
          </p>
        </div>
        <div>
          <strong className="text-sm">Profit (INR):</strong>
          <p className={`text-sm ${candidate.profit && candidate.profit > 0 ? "text-green-600" : "text-red-600"}`}>
            {candidate.profit ? formatCurrency(candidate.profit) : "-"}
          </p>
        </div>
      </div>
    </Card>
  );

  const renderEmployeeCard = (employee: Employee) => (
    <Card key={employee.id} className="mb-4 p-4">
      <div className="space-y-2">
        <div>
          <strong className="text-sm">Name:</strong>
          <p className="text-sm">{employee.employee_name}</p>
        </div>
        <div>
          <strong className="text-sm">Project:</strong>
          <p className="text-sm">{employee.project_name || "Unknown"}</p>
        </div>
        <div>
          <strong className="text-sm">Salary:</strong>
          <p className="text-sm">{employee.salary_formatted}</p>
        </div>
        <div>
          <strong className="text-sm">Client Billing:</strong>
          <p className="text-sm">{employee.billing_type_formatted}</p>
        </div>
        <div>
          <strong className="text-sm">Actual Revenue:</strong>
          <p className="text-sm">{formatCurrency(employee.actual_revenue_inr)}</p>
        </div>
        <div>
          <strong className="text-sm">Actual Profit:</strong>
          <p className={`text-sm ${employee.actual_profit_inr >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(employee.actual_profit_inr)}
          </p>
        </div>
        <div>
          <strong className="text-sm">Currency:</strong>
          <p className="text-sm">{employee.currency}</p>
        </div>
      </div>
    </Card>
  );

  const renderCandidateTable = (candidates: Candidate[]) => (
    <div className="w-full min-w-0">
      <div className="md:hidden">
        {candidates.length > 0 ? (
          candidates.map((candidate) => renderCandidateCard(candidate))
        ) : (
          <EmptyState message="No candidates found" description={searchTerm ? "Try adjusting your search." : "No candidates match the criteria for this client."} />
        )}
      </div>
      <div className="hidden md:block rounded-md border max-h-[400px] overflow-y-auto overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('name', 'candidate')}>
                  Name
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('job_title', 'candidate')}>
                  Position
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Experience</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Join</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary (LPA)</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Profit (INR)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {candidates.length > 0 ? (
              candidates.map((candidate) => (
                // --- CHANGED: Added zebra striping class
                <tr key={candidate.id} className="hover:bg-gray-50 transition odd:bg-white even:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <Link to={`/candidates/${candidate.id}/${candidate.job_id}`} className="font-medium text-blue-600 hover:underline">
                        {candidate.name}
                      </Link>
                      <span className="text-xs text-gray-500">
                        <Badge
                          variant="outline"
                          className="bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full text-[10px]"
                        >
                          {candidate?.applied_from ?? "N/A"}
                        </Badge>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <HiddenContactCell
                      email={candidate.email ?? "N/A"}
                      phone={candidate.phone ?? "N/A"}
                      candidateId={candidate.id}
                      className="text-xs md:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <Link to={`/jobs/${candidate.job_id}`} className="font-medium text-blue-600 hover:underline">
                        {candidate.job_title || "Unknown"}
                      </Link>
                      <span className="text-xs text-gray-500">
                        <Badge
                          variant="outline"
                          className="bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full text-[10px]"
                        >
                          {candidate?.hr_jobs?.client_details?.pointOfContact?.trim() ?? "N/A"}
                        </Badge>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                    {candidate.experience || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {candidate.joining_date ? `${formatDate(candidate.joining_date)} (${moment(candidate.joining_date).fromNow()})` : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {isEmployee ? (
                      <Badge variant="outline" className={getStatusBadgeColor(candidate.sub_status_id)}>
                        {getStatusText(candidate.sub_status_id)}
                      </Badge>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 px-2 py-0">
                            {statusUpdateLoading === candidate.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Badge
                                variant="outline"
                                className={getStatusBadgeColor(candidate.sub_status_id)}
                              >
                                {getStatusText(candidate.sub_status_id)}
                              </Badge>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center">
                          <DropdownMenuItem
                            className="text-yellow-600 focus:text-yellow-600 focus:bg-yellow-50"
                            onClick={() => handleStatusChange(candidate.id, statusIds.OFFER_ISSUED_SUB_STATUS_ID)}
                          > 
                            Offer Issued
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-green-600 focus:text-green-600 focus:bg-green-50"
                            onClick={() => handleStatusChange(candidate.id, statusIds.JOINED_SUB_STATUS_ID)}
                          >
                            Joined
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {candidate.ctc
                      ? formatCurrency(parseSalary(candidate.ctc))
                      : candidate.expected_salary
                      ? formatCurrency(candidate.expected_salary)
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium hidden lg:table-cell">
                    <span className={candidate.profit && candidate.profit > 0 ? "text-green-600" : "text-red-600"}>
                      {candidate.profit ? formatCurrency(candidate.profit) : "-"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                   <EmptyState message="No candidates found" description={searchTerm ? "Try adjusting your search." : "No candidates match the criteria for this client."} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {candidates.length > 0 && renderPagination(totalCandidatePages, true)}
    </div>
  );

  const renderEmployeeTable = (employees: Employee[]) => (
    <div className="w-full min-w-0">
      <div className="md:hidden">
        {employees.length > 0 ? (
          employees.map((employee) => renderEmployeeCard(employee))
        ) : (
          <EmptyState message="No employees found" description={searchTerm ? "Try adjusting your search." : "No employees are assigned for this client."} />
        )}
      </div>
      <div className="hidden md:block rounded-md border max-h-[400px] overflow-y-auto overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('employee_name', 'employee')}>
                  Name
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('project_name', 'employee')}>
                  Project
                  <ArrowUpDown size={14} />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Billing</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Revenue</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Profit</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.length > 0 ? (
              employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 transition odd:bg-white even:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.employee_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.project_name || "Unknown"}
                  </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-pointer">
                          {(() => {
                            const currency = employee.salary_currency || "INR";
                            const salary = employee.salary || 0;
                            const salaryType = employee.salary_type || "LPA";
                            const currencySymbol = currency === "USD" ? "$" : "₹";
                            const salaryTypeText = salaryType === "Hourly" ? "hr" : salaryType === "Monthly" ? "month" : "year";
                            return `${currencySymbol}${salary.toLocaleString('en-IN')}/${salaryTypeText}`;
                          })()}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {(() => {
                            const currency = employee.salary_currency || "INR";
                            const salary = employee.salary || 0;
                            const salaryType = employee.salary_type || "LPA";
                            const convertedSalary = currency === "USD" ? salary * 84 : salary;
                            const salaryTypeText = salaryType === "Hourly" ? "hr" : salaryType === "Monthly" ? "month" : "year";
                            const annualSalary = (salaryType === 'Monthly' ? convertedSalary * 12 : (salaryType === 'Hourly' ? convertedSalary * 2016 : convertedSalary));
                            return `₹${annualSalary.toLocaleString('en-IN')}/year (INR)`;
                          })()}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.billing_type_formatted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(employee.actual_revenue_inr)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={employee.actual_profit_inr >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(employee.actual_profit_inr)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.currency}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                  <EmptyState message="No employees found" description={searchTerm ? "Try adjusting your search." : "No employees are assigned for this client."} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {employees.length > 0 && renderPagination(totalEmployeePages, false)}
    </div>
  );

  // --- END: All render functions modified --- //


  useEffect(() => {
    if (clientName && organization_id) {
      fetchCandidatesAndEmployees(decodeURIComponent(clientName));
    }
  }, [clientName, organization_id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 md:p-10">
     <main className="w-full max-w-8xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="h-8 w-8 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-tight">
                {clientName} - Overview
              </h1>
              <p className="text-gray-500 text-sm md:text-base mt-2">
                Manage and track candidate and employee activities
              </p>
            </div>
          </div>
           {/* --- CHANGED: Moved search bar to the top for better visibility --- */}
           <div className="w-full sm:w-72 relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search candidates and employees..."
                className="pl-8 w-full text-sm border-gray-300 focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
        </div>

        {/* --- CHANGED: Added loading skeleton for stats --- */}
        {loading ? <MetricsSkeleton /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
                    <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Total Count</p>
                        <h3 className="text-2xl font-bold text-gray-800">{metrics.candidateCount + metrics.employeeCount}</h3>
                        <p className="text-xs text-gray-500 mt-1">{metrics.candidateCount} Candidates, {metrics.employeeCount} Employees</p>
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
                        <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(metrics.candidateRevenue + metrics.employeeRevenueINR)}</h3>
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                <p className="text-xs text-gray-500 mt-1">
                                    ~${((metrics.candidateRevenue + metrics.employeeRevenueINR) / USD_TO_INR_RATE_CANDIDATES).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                                </p>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white border-gray-200 shadow-lg rounded-lg p-2">
                                <p>Converted at 1 USD = ₹ {USD_TO_INR_RATE_CANDIDATES}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-full">
                        <DollarSign size={24} className="text-white" />
                    </div>
                    </CardContent>
                </Card>
                <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
                    <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Total Profit</p>
                        <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(metrics.candidateProfit + metrics.employeeProfitINR)}</h3>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                <p className="text-xs text-gray-500 mt-1">
                                    ~${((metrics.candidateProfit + metrics.employeeProfitINR) / USD_TO_INR_RATE_CANDIDATES).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                                </p>
                                </TooltipTrigger>
                                <TooltipContent className="bg-white border-gray-200 shadow-lg rounded-lg p-2">
                                <p>Converted at 1 USD = ₹ {USD_TO_INR_RATE_CANDIDATES}</p>
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
        )}
        

        {/* --- CHARTS SECTION (Unchanged) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6">
              <h2 className="text-xl md:text-2xl font-semibold">Revenue & Profit by Individual</h2>
            </CardHeader>
            <CardContent className="p-6 overflow-x-auto">
              <div style={{ minWidth: `${financialData.length * 100}px` }}>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={financialData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
                    className="animate-fade-in"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      angle={0}
                      textAnchor="middle"
                      interval={0}
                      height={50}
                      label={{ value: "Individuals", position: "insideBottom", offset: -10, fill: "#4b5563" }}
                      tick={{ fontSize: 12, fill: "#4b5563" }}
                      tickFormatter={(value) => (value.length > 7 ? `${value.slice(0, 7)}...` : value)}
                    />
                    <YAxis
                      label={{ value: "Value (INR)", angle: -90, position: "insideLeft", offset: -10, fill: "#4b5563" }}
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
                        const usd = val / USD_TO_INR_RATE_CANDIDATES;
                        return [
                          `₹${val.toLocaleString()} ($${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })})`,
                          name,
                        ];
                      }}
                      itemStyle={{ color: "#4b5563" }}
                      cursor={{ fill: "#f3e8ff" }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "14px", color: "#4b5563" }} />
                    <Bar dataKey="revenue" fill="#7B43F1" name="Revenue" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" fill="#A74BC8" name="Profit" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6">
              <h2 className="text-xl md:text-2xl font-semibold">Revenue vs Profit Distribution</h2>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart className="animate-fade-in">
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={140}
                    cornerRadius={50}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ₹${value.toLocaleString()}`}
                    labelLine={false}
                    className="font-medium"
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
                      const usd = val / USD_TO_INR_RATE_CANDIDATES;
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

        {/* --- ADDED: Tabbed interface for tables --- */}
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl rounded-2xl">
          <CardContent className="p-6">
            {loading ? (
                <TableSkeleton />
            ) : (
                <Tabs defaultValue="candidates" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="candidates">Candidates ({filteredCandidates.length})</TabsTrigger>
                        {serviceType.includes("contractual") && (
                            <TabsTrigger value="employees">Employees ({filteredEmployees.length})</TabsTrigger>
                        )}
                    </TabsList>
                    <TabsContent value="candidates" className="mt-4">
                        {renderCandidateTable(paginatedCandidates)}
                    </TabsContent>
                    {serviceType.includes("contractual") && (
                        <TabsContent value="employees" className="mt-4">
                            {renderEmployeeTable(paginatedEmployees)}
                        </TabsContent>
                    )}
                </Tabs>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  );
};

export default ClientCandidatesView;