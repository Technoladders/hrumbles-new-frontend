import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import supabase from "../../config/supabaseClient";
import { useSelector } from "react-redux";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  ArrowLeft,
  Download,
  Plus,
  Search,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  FileText,
  Users,
  UserRoundCheck,
  UserRoundX,
  ReceiptIndianRupee,
  TrendingUp,
  Clock,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Input } from "../ui/input";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import AssignEmployeeDialog from "./AssignEmployeeDialog";
import Loader from "@/components/ui/Loader";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Pie,
  PieChart,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { startOfMonth, startOfWeek, isSameDay, isWithinInterval, format, eachDayOfInterval, startOfYear, getDaysInMonth, // <-- ADD THIS
  getDaysInYear, 
  isSunday,    
  isWeekend } from "date-fns";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector";
import RevenueExpenseChart from "./RevenueExpenseChart";

interface AssignEmployee {
  id: string;
  assign_employee: string;
  project_id: string;
  client_id: string;
  start_date: string;
  end_date: string;
  salary: number;
  client_billing: number;
  status: string;
  sow: string | null;
  duration: number;
  billing_type?: string;
  working_days_config?: 'all_days' | 'weekdays_only' | 'saturday_working';
  salary_type?: string;
  salary_currency?: string;
  hr_employees?: {
    first_name: string;
    last_name: string;
    salary_type: string;
  } | null;
}

interface Client {
  id: string;
  currency: string;
  client_name: string;
}

interface Project {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  duration: number;
  revenue: number;
  profit: number;
  status: string;
  employees_needed: number;
  employees_assigned: number;
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

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

const EXCHANGE_RATE_USD_TO_INR = 84;

const formatINR = (number: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(number);
};

const ProjectDashboard = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("client_id");
  const queryClient = useQueryClient();
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<AssignEmployee | null>(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [calculationMode, setCalculationMode] = useState<"accrual" | "actual">("actual");
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: startOfMonth(new Date()),
    endDate: new Date(),
  });

  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  if (!user || !organization_id) {
    return (
      <div className="text-center text-red-600 font-semibold mt-10">
        Authentication error: Missing user or organization ID
      </div>
    );
  }

  // Determine financial year from dateRange.endDate
  const getFinancialYear = (endDate: Date) => {
    const year = endDate.getMonth() < 3 ? endDate.getFullYear() - 1 : endDate.getFullYear();
    const startDate = new Date(year, 3, 1); // April 1
    const endDateFY = new Date(year + 1, 2, 31, 23, 59, 59, 999); // March 31
    return { startDate, endDate: endDateFY, year };
  };

  const { startDate: financialYearStart, endDate: financialYearEnd, year: financialYear } = dateRange.endDate ? getFinancialYear(dateRange.endDate) : { startDate: new Date(), endDate: new Date(), year: new Date().getFullYear() };

  // Check if dateRange spans multiple financial years
  const spansMultipleYears = dateRange.startDate && dateRange.endDate && (dateRange.startDate.getFullYear() !== dateRange.endDate.getFullYear() ||
    (dateRange.startDate.getFullYear() === dateRange.endDate.getFullYear() &&
     dateRange.startDate.getMonth() < 3 && dateRange.endDate.getMonth() >= 3));

  // Fetch client details
  const { data: client, isLoading: loadingClient, error: clientError } = useQuery<Client>({
    queryKey: ["client", clientId],
    queryFn: async () => {
      if (!clientId) throw new Error("Client ID is missing");
      const { data, error } = await supabase
        .from("hr_clients")
        .select("id, client_name, currency")
        .eq("id", clientId)
        .eq("organization_id", organization_id)
        .single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!clientId,
  });

  // Fetch project details
  const { data: project, isLoading: loadingProject, error: projectError } = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: async () => {
      if (!id) throw new Error("Project ID is missing");
      const { data, error } = await supabase
        .from("hr_projects")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization_id)
        .single();
      if (error) throw error;
      return {
        ...data,
        duration: data.duration ?? 0,
        start_date: data.start_date ?? "",
        end_date: data.end_date ?? "",
        status: data.status ?? "unknown",
        revenue: 0,
        profit: 0,
      } as Project;
    },
    enabled: !!id,
  });

  // Fetch assigned employees for the project
  const { data: assignEmployee = [], isLoading: loadingEmployees, error: employeesError } = useQuery<
    AssignEmployee[]
  >({
    queryKey: ["project-employee", id],
    queryFn: async () => {
      if (!id) throw new Error("Project ID is missing");
      const { data, error } = await supabase
        .from("hr_project_employees")
        .select(`
          id,
          assign_employee,
          project_id,
          client_id,
          start_date,
          end_date,
          salary,
          client_billing,
          status,
          sow,
          billing_type,
          salary_type,
          salary_currency,
          working_hours,
           working_days_config,
          hr_employees:hr_employees!hr_project_employees_assign_employee_fkey (first_name, last_name, salary_type)
        `)
        .eq("project_id", id)
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data.map((employee) => ({
        ...employee,
        duration: employee.start_date && employee.end_date
          ? Math.ceil(
              (new Date(employee.end_date).getTime() - new Date(employee.start_date).getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1
          : 0,
        hr_employees: employee.hr_employees ?? null,
        sow: employee.sow ?? null,
      })) as AssignEmployee[];
    },
    enabled: !!id,
  });

  // Fetch unfiltered time logs for Project Overview and RevenueExpenseChart (no date filters)
  const { data: unfilteredTimeLogs = [], isLoading: loadingUnfilteredTimeLogs, error: unfilteredTimeLogsError } = useQuery<
    TimeLog[]
  >({
    queryKey: ["unfiltered_time_logs", id],
    queryFn: async () => {
      if (!id) throw new Error("Project ID is missing");
      const { data, error } = await supabase
        .from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
        .eq("is_approved", true);
      if (error) throw error;
      return data.filter((log) =>
        log.project_time_data?.projects?.some((proj) => proj.projectId === id)
      ) as TimeLog[];
    },
    enabled: calculationMode === "actual" && !!id,
  });

  // Fetch time logs for Logged Hours chart (filtered by financial year from dateRange)
  const { data: timeLogs = [], isLoading: loadingTimeLogs, error: timeLogsError } = useQuery<
    TimeLog[]
  >({
    queryKey: ["time_logs_chart", id, financialYear],
    queryFn: async () => {
      if (!id) throw new Error("Project ID is missing");
      const { data, error } = await supabase
        .from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
        .eq("is_approved", true)
        .gte("date", financialYearStart.toISOString())
        .lte("date", financialYearEnd.toISOString());
      if (error) throw error;
      return data.filter((log) =>
        log.project_time_data?.projects?.some((proj) => proj.projectId === id)
      ) as TimeLog[];
    },
    enabled: calculationMode === "actual" && !!id,
  });

 

  // Fetch time logs for table (filtered by dateRange)
  const { data: tableTimeLogs = [], isLoading: loadingTableTimeLogs, error: tableTimeLogsError } = useQuery<
    TimeLog[]
  >({
    queryKey: ["time_logs_table", id, dateRange],
    queryFn: async () => {
      if (!id || !dateRange.startDate || !dateRange.endDate) return [];
      const { data, error } = await supabase
        .from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
        .eq("is_approved", true)
        .gte("date", dateRange.startDate.toISOString())
        .lte("date", dateRange.endDate.toISOString());
      if (error) throw error;
      return data.filter((log) =>
        log.project_time_data?.projects?.some((proj) => proj.projectId === id)
      ) as TimeLog[];
    },
    enabled: calculationMode === "actual" && !!id && !!dateRange.startDate && !!dateRange.endDate,
  });

   console.log("unfilteredTimeLogs", unfilteredTimeLogs);
  console.log("timeLogs", timeLogs);
  console.log("tableTimeLogs", tableTimeLogs);

  // Fetch clients to get currency information
  const { data: clients = [], isLoading: loadingClients, error: clientsError } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_clients")
        .select("id, currency, client_name")
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data as Client[];
    },
  });

  // Add this useEffect hook to set the initial date range
useEffect(() => {
  // Check if the project data has been successfully loaded and has a start date
  if (project && project.start_date) {
    // Set the date range from the project's start date until today
    setDateRange({
      startDate: new Date(project.start_date),
      endDate: new Date(),
    });
  }
}, [project]); // The dependency array ensures this runs only when the 'project' object changes

  useEffect(() => {
    if (projectError || employeesError || clientsError || unfilteredTimeLogsError || timeLogsError || tableTimeLogsError) {
      toast.error("Failed to fetch data");
      console.error("Errors:", { projectError, employeesError, clientsError, unfilteredTimeLogsError, timeLogsError, tableTimeLogsError });
    }
    setLoading(loadingProject || loadingEmployees || loadingClients || loadingUnfilteredTimeLogs || loadingTimeLogs || loadingTableTimeLogs);
  }, [
    projectError,
    employeesError,
    clientsError,
    unfilteredTimeLogsError,
    timeLogsError,
    tableTimeLogsError,
    loadingProject,
    loadingEmployees,
    loadingClients,
    loadingUnfilteredTimeLogs,
    loadingTimeLogs,
    loadingTableTimeLogs,
  ]);

  // Calculate employee hours for chart (using timeLogs filtered by financial year)
  const calculateEmployeeHoursForChart = (employeeId: string) => {
    return timeLogs
      .filter((log) => log.employee_id === employeeId)
      .reduce((acc, log) => {
        const projectEntry = log.project_time_data?.projects?.find(
          (proj) => proj.projectId === id
        );
        return acc + (projectEntry?.hours || 0);
      }, 0);
  };

  // Calculate employee hours for table (using tableTimeLogs)
// CORRECTED: Calculate employee hours for table (using tableTimeLogs)
const calculateEmployeeHoursForTable = (employeeId: string) => {
  return tableTimeLogs
    .filter((log) => log.employee_id === employeeId) // <-- This is the critical fix
    .reduce((acc, log) => {
      const projectEntry = log.project_time_data?.projects?.find(
        (proj) => proj.projectId === id
      );
      return acc + (projectEntry?.hours || 0);
    }, 0);
};

  // Calculate employee hours for revenue/profit (using unfilteredTimeLogs)
  const calculateEmployeeHoursForRevenueProfit = (employeeId: string) => {
    return unfilteredTimeLogs
      .filter((log) => log.employee_id === employeeId)
      .reduce((acc, log) => {
        const projectEntry = log.project_time_data?.projects?.find(
          (proj) => proj.projectId === id
        );
        return acc + (projectEntry?.hours || 0);
      }, 0);
  };

  // Calculate total hours by interval for the chart (financial year, April to March)
  const calculateTotalHoursByInterval = () => {
    const intervals = [
      "Apr", "May", "Jun", "Jul", "Aug", "Sep",
      "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"
    ];

    const hoursByInterval = intervals.map((month, index) => {
      const monthIndex = (index + 3) % 12; // April (3) to March (2)
      const year = monthIndex < 3 ? financialYear + 1 : financialYear;
      const intervalStart = new Date(year, monthIndex, 1);
      const intervalEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

      const totalHours = timeLogs
        .filter((log) =>
          isWithinInterval(new Date(log.date), {
            start: intervalStart,
            end: intervalEnd,
          })
        )
        .reduce((acc, log) => {
          const projectEntry = log.project_time_data?.projects?.find(
            (proj) => proj.projectId === id
          );
          return acc + (projectEntry?.hours || 0);
        }, 0);

      return { name: month, hours: totalHours };
    });

    return hoursByInterval;
  };

  // Convert client_billing to LPA or per-hour for accrual calculations
  const convertToLPA = (employee: AssignEmployee, mode: "accrual" | "actual") => {
    const client = clients.find((c) => c.id === employee.client_id);
    const currency = client?.currency || "INR";
    let clientBilling = employee.client_billing || 0;

    if (currency === "USD") {
      clientBilling *= EXCHANGE_RATE_USD_TO_INR;
    }

    const durationDays = employee.duration || 1;
    const workingHours = durationDays * 8;

    if (mode === "accrual") {
      switch (employee.billing_type) {
        case "Monthly":
          clientBilling = (clientBilling * 12 * durationDays) / 365;
          break;
        case "Hourly":
          clientBilling *= durationDays * 8;
          break;
        case "LPA":
        default:
          clientBilling = (clientBilling * durationDays) / 365;
          break;
      }
    } else {
      switch (employee.billing_type) {
        case "Monthly":
          clientBilling = (clientBilling * 12) / (365 * 8);
          break;
        case "Hourly":
          break;
        case "LPA":
          clientBilling = clientBilling / (365 * 8);
          break;
        default:
          break;
      }
    }

    return clientBilling;
  };

  // 4. NEW: Create a helper function to count working days based on the config
const countWorkingDays = (
  startDate: Date,
  endDate: Date,
  config: 'all_days' | 'weekdays_only' | 'saturday_working' = 'all_days'
): number => {
  if (!startDate || !endDate || startDate > endDate) return 0;
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  switch (config) {
    case 'weekdays_only':
      return days.filter(day => !isWeekend(day)).length;
    case 'saturday_working':
      return days.filter(day => !isSunday(day)).length;
    case 'all_days':
    default:
      return days.length;
  }
};
  // Calculate revenue for an employee
// Calculate revenue for an employee
const calculateRevenue = (employee: AssignEmployee, mode: "accrual" | "actual") => {
    const config = employee.working_days_config || 'all_days';
    const client = clients.find((c) => c.id === employee.client_id);
    let clientBilling = employee.client_billing || 0;
    if (client?.currency === "USD") {
        clientBilling *= EXCHANGE_RATE_USD_TO_INR;
    }

    if (mode === "accrual") {
        const assignmentDays = countWorkingDays(new Date(employee.start_date), new Date(employee.end_date), config);
        let dailyRate = 0;

        switch (employee.billing_type) {
            case "Monthly":
                const daysInMonth = getDaysInMonth(new Date(employee.start_date)); // Or an average
                const workingDaysInBillingMonth = countWorkingDays(startOfMonth(new Date(employee.start_date)), new Date(employee.start_date).setDate(daysInMonth), config);
                dailyRate = clientBilling / (workingDaysInBillingMonth || 1);
                break;
            case "LPA":
                const daysInYear = getDaysInYear(new Date(employee.start_date));
                const workingDaysInBillingYear = countWorkingDays(startOfYear(new Date(employee.start_date)), new Date(employee.start_date).setMonth(11, 31), config);
                dailyRate = clientBilling / (workingDaysInBillingYear || 1);
                break;
            case "Hourly":
                return clientBilling * assignmentDays * (employee.working_hours || 8);
        }
        return dailyRate * assignmentDays;
    } else { // Actual mode
        const hours = calculateEmployeeHoursForRevenueProfit(employee.assign_employee);
        let hourlyRate = 0;
        
        // Use yearly averages for more stable hourly rate conversion
        const avgWorkingDaysInYear = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;

        switch (employee.billing_type) {
            case "Monthly":
                hourlyRate = (clientBilling * 12) / (avgWorkingDaysInYear * (employee.working_hours || 8));
                break;
            case "LPA":
                hourlyRate = clientBilling / (avgWorkingDaysInYear * (employee.working_hours || 8));
                break;
            case "Hourly":
                hourlyRate = clientBilling;
                break;
        }
        return hours * (hourlyRate || 0);
    }
};

// Calculate profit for an employee (similar logic applied to salary)
const calculateProfit = (employee: AssignEmployee, mode: "accrual" | "actual") => {
    const revenue = calculateRevenue(employee, mode);
    const config = employee.working_days_config || 'all_days';
    let salary = employee.salary || 0;
    
    if (employee.salary_currency === "USD") {
        salary *= EXCHANGE_RATE_USD_TO_INR;
    }
    
    let salaryCost = 0;

    if (mode === "accrual") {
        const assignmentDays = countWorkingDays(new Date(employee.start_date), new Date(employee.end_date), config);
        let dailySalaryRate = 0;

        switch (employee.salary_type) {
            case "Monthly":
                const daysInMonth = getDaysInMonth(new Date(employee.start_date));
                const workingDaysInSalaryMonth = countWorkingDays(startOfMonth(new Date(employee.start_date)), new Date(employee.start_date).setDate(daysInMonth), config);
                dailySalaryRate = salary / (workingDaysInSalaryMonth || 1);
                break;
            case "LPA":
                const daysInYear = getDaysInYear(new Date(employee.start_date));
                const workingDaysInSalaryYear = countWorkingDays(startOfYear(new Date(employee.start_date)), new Date(employee.start_date).setMonth(11, 31), config);
                dailySalaryRate = salary / (workingDaysInSalaryYear || 1);
                break;
            case "Hourly":
                salaryCost = salary * assignmentDays * (employee.working_hours || 8);
                break;
        }
        if (employee.salary_type !== 'Hourly') {
            salaryCost = dailySalaryRate * assignmentDays;
        }
    } else { // Actual mode
        const hours = calculateEmployeeHoursForRevenueProfit(employee.assign_employee);
        let hourlySalaryRate = 0;

        const avgWorkingDaysInYear = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;

        switch (employee.salary_type) {
            case "Monthly":
                hourlySalaryRate = (salary * 12) / (avgWorkingDaysInYear * (employee.working_hours || 8));
                break;
            case "LPA":
                hourlySalaryRate = salary / (avgWorkingDaysInYear * (employee.working_hours || 8));
                break;
            case "Hourly":
                hourlySalaryRate = salary;
                break;
        }
        salaryCost = hours * (hourlySalaryRate || 0);
    }

    return revenue - salaryCost;
};

 const calculateActualRevenueForTable = (employee: AssignEmployee) => {
    const hours = calculateEmployeeHoursForTable(employee.assign_employee);
    const config = employee.working_days_config || 'all_days';
    const client = clients.find((c) => c.id === employee.client_id);
    let clientBilling = employee.client_billing || 0;
    if (client?.currency === "USD") {
        clientBilling *= EXCHANGE_RATE_USD_TO_INR;
    }

    let hourlyRate = 0;
    const avgWorkingDaysInYear = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;

    switch (employee.billing_type) {
        case "Monthly":
            hourlyRate = (clientBilling * 12) / (avgWorkingDaysInYear * (employee.working_hours || 8));
            break;
        case "LPA":
            hourlyRate = clientBilling / (avgWorkingDaysInYear * (employee.working_hours || 8));
            break;
        case "Hourly":
            hourlyRate = clientBilling;
            break;
    }
    return hours * (hourlyRate || 0);
  };

  const calculateActualProfitForTable = (employee: AssignEmployee) => {
    const revenue = calculateActualRevenueForTable(employee);
    const hours = calculateEmployeeHoursForTable(employee.assign_employee);
    const config = employee.working_days_config || 'all_days';
    let salary = employee.salary || 0;
    if (employee.salary_currency === "USD") {
        salary *= EXCHANGE_RATE_USD_TO_INR;
    }
    
    let salaryCost = 0;
    let hourlySalaryRate = 0;
    const avgWorkingDaysInYear = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;

    switch (employee.salary_type) {
        case "Monthly":
            hourlySalaryRate = (salary * 12) / (avgWorkingDaysInYear * (employee.working_hours || 8));
            break;
        case "LPA":
            hourlySalaryRate = salary / (avgWorkingDaysInYear * (employee.working_hours || 8));
            break;
        case "Hourly":
            hourlySalaryRate = salary;
            break;
    }
    salaryCost = hours * (hourlySalaryRate || 0);

    return revenue - salaryCost;
  };

  // Calculate total revenue (using unfilteredTimeLogs)
  const totalRevenue = assignEmployee.reduce(
    (acc, emp) => acc + calculateRevenue(emp, calculationMode),
    0
  ) || 0;

  // Calculate total profit (using unfilteredTimeLogs)
  const totalProfit = assignEmployee.reduce(
    (acc, emp) => acc + calculateProfit(emp, calculationMode),
    0
  ) || 0;

  // Calculate employee counts (not affected by date range)
  const totalEmployees = assignEmployee.length;
  const workingCount = assignEmployee.filter((emp) => emp.status === "Working").length || 0;
  const relievedCount = assignEmployee.filter((emp) => emp.status === "Relieved").length || 0;
  const terminatedCount = assignEmployee.filter((emp) => emp.status === "Terminated").length || 0;

  // Delete employee mutation
  const deleteEmployee = useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from("hr_project_employees")
        .delete()
        .eq("id", employeeId)
        .eq("organization_id", organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-employee", id] });
      toast.success("Employee removed successfully");
      setDeleteEmployeeId(null);
    },
    onError: () => {
      toast.error("Failed to remove employee");
    },
  });

  // Filter employees based on search, status, and date range (for table only)
  const filteredEmployees = assignEmployee.filter((employee) => {
    const employeeName = employee.hr_employees
      ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
      : "";
    const matchesSearch = employeeName.toLowerCase().includes(searchQuery.toLowerCase());

    // CHANGE_HIGHLIGHT: The date range filter is now conditional. It's always true for accrual mode.
    const isWithinDateRange =
      calculationMode === "accrual" || // For accrual, we don't filter by date range
      (dateRange.startDate && dateRange.endDate &&
        new Date(employee.start_date) <= dateRange.endDate &&
        new Date(employee.end_date) >= dateRange.startDate);

    if (activeTab === "all") return matchesSearch && isWithinDateRange;
    if (activeTab === "working") return matchesSearch && employee.status === "Working" && isWithinDateRange;
    if (activeTab === "relieved") return matchesSearch && employee.status === "Relieved" && isWithinDateRange;
    if (activeTab === "terminated") return matchesSearch && employee.status === "Terminated" && isWithinDateRange;
    return matchesSearch && isWithinDateRange;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvData = filteredEmployees.map((employee) => ({
      "Employee Name": employee.hr_employees
        ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
        : "N/A",
      Duration: calculationMode === "accrual" ? `${employee.duration} days` : "",
      Hours: calculationMode === "actual" ? `${calculateEmployeeHoursForTable(employee.assign_employee).toFixed(2)} hours` : "",
      "Start Date": calculationMode === "accrual" ? new Date(employee.start_date).toLocaleDateString() : "",
      "End Date": calculationMode === "accrual" ? new Date(employee.end_date).toLocaleDateString() : "",
      Salary: formatINR(employee.salary),
      "Client Billing": formatINR(calculateRevenue(employee, calculationMode)),
      Profit: formatINR(calculateProfit(employee, calculationMode)),
      Status: employee.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, `Project_Employees_${calculationMode}.csv`);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Project Employees Report (${calculationMode.toUpperCase()})`, 14, 10);
    (doc as any).autoTable({
      head: [
        [
          "Employee Name",
          calculationMode === "accrual" ? "Duration" : "Hours",
          ...(calculationMode === "accrual" ? ["Start Date", "End Date"] : []),
          "Salary",
          "Client Billing",
          "Profit",
          "Status",
        ],
      ],
      body: filteredEmployees.map((employee) => [
        employee.hr_employees
          ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
          : "N/A",
        // CHANGE_HIGHLIGHT: Use employee.duration for accrual mode to show total assignment duration.
        calculationMode === "accrual"
          ? `${employee.duration} days`
          : `${calculateEmployeeHoursForTable(employee.assign_employee).toFixed(2)} hours`,
        ...(calculationMode === "accrual"
          ? [
              new Date(employee.start_date).toLocaleDateString(),
              new Date(employee.end_date).toLocaleDateString(),
            ]
          : []),
        formatINR(employee.salary),
        formatINR(calculateRevenue(employee, calculationMode)),
        formatINR(calculateProfit(employee, calculationMode)),
        employee.status,
      ]),
      startY: 20,
    });
    doc.save(`Project_Employees_${calculationMode}.pdf`);
  };

  // NEW: Calculate revenue for the table based on the selected date range
const calculateRevenueForTable = (employee: AssignEmployee) => {
  const hours = calculateEmployeeHoursForTable(employee.assign_employee);
  const hourlyRate = convertToLPA(employee, "actual");
  return hours * hourlyRate;
};

// NEW: Calculate profit for the table based on the selected date range
const calculateProfitForTable = (employee: AssignEmployee) => {
  const revenue = calculateRevenueForTable(employee);
  let salary = employee.salary || 0;
  const salaryType = employee?.salary_type || "LPA";

  if (employee.salary_currency === "USD") {
    salary *= EXCHANGE_RATE_USD_TO_INR;
  }

  const hours = calculateEmployeeHoursForTable(employee.assign_employee);
  let salaryCost = 0;

  if (salaryType === "LPA") {
    const hourlySalary = salary / (365 * 8);
    salaryCost = hours * hourlySalary;
  } else if (salaryType === "Monthly") {
    const monthlyToHourly = (salary / 30) / 8;
    salaryCost = hours * monthlyToHourly;
  } else if (salaryType === "Hourly") {
    salaryCost = hours * salary;
  }

  return revenue - salaryCost;
};

  // Mutation for updating employee status
  const updateEmployeeStatus = useMutation({
    mutationFn: async ({ employeeId, newStatus }: { employeeId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("hr_project_employees")
        .update({ status: newStatus })
        .eq("id", employeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-employee", id] });
      toast.success("Employee status updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update employee status.");
    },
  });

  const renderTable = (employees: AssignEmployee[]) => {
    if (employees.length === 0) {
      return (
        <div className="text-center p-12 text-gray-500">
          <p>No employees found.</p>
        </div>
      );
    }
console.log("pagiodkmndndu", assignEmployee)
    return (
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm animate-scale-in">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Employee Name
                </th>
                 <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Working Days
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  {calculationMode === "accrual" ? "Duration" : "Hours"}
                </th>
                {calculationMode === "accrual" && (
                  <>
                    <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                      Start Date
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                      End Date
                    </th>
                  </>
                )}
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Salary
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Client Billing
                </th>
                 <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  {calculationMode === "accrual" ? "Estimated Revenue" : "Actual Revenue"}
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  {calculationMode === "accrual" ? "Estimated Profit" : "Actual Profit"}
                </th>
               
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Status
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2 font-medium">
                    {employee.hr_employees
                      ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
                      : "N/A"}
                  </td>
                  <td className="px-4 py-2">
                    {(() => {
                      if (calculationMode === 'accrual') {
                        const totalWorkingDays = countWorkingDays(
                          new Date(employee.start_date),
                          new Date(employee.end_date),
                          employee.working_days_config
                        );
                        return `${totalWorkingDays} days`;
                      } else { // Actual mode
                        // Calculate intersection of employee assignment and date range
                        const effectiveStartDate = dateRange.startDate && dateRange.endDate ? new Date(Math.max(new Date(employee.start_date).getTime(), dateRange.startDate.getTime())) : new Date(employee.start_date);
                        const effectiveEndDate = dateRange.startDate && dateRange.endDate ? new Date(Math.min(new Date(employee.end_date).getTime(), dateRange.endDate.getTime())) : new Date(employee.end_date);
                        
                        const daysInPeriod = countWorkingDays(effectiveStartDate, effectiveEndDate, employee.working_days_config);
                        return `${daysInPeriod} days`;
                      }
                    })()}
                  </td>
                  <td className={`px-4 py-2 ${calculationMode === "actual" ? "cursor-pointer hover:bg-indigo-50 transition" : ""}`}
  onClick={() => {
    if (calculationMode === "actual" && dateRange.startDate && dateRange.endDate) {
      // Pass projectId, employeeId, and the current dateRange to the new page
      navigate(
        `/project/${id}/employee/${employee.assign_employee}/details?startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}`
      );
    }
  }}>
                    {/* CHANGE_HIGHLIGHT: Use employee.duration for accrual mode to show total assignment duration. */}
                    {calculationMode === "accrual"
                      ? `${employee.duration} days`
                      : `${calculateEmployeeHoursForTable(employee.assign_employee).toFixed(2)} hours`}
                  </td>
                  {calculationMode === "accrual" && (
                    <>
                      <td className="px-4 py-2">{new Date(employee.start_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{new Date(employee.end_date).toLocaleDateString()}</td>
                    </>
                  )}
                  <td className="px-4 py-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-pointer">
                          {(() => {
                            const currency = employee.salary_currency || "INR";
                            const salary = employee.salary || 0;
                            const salaryType = employee.salary_type || "LPA";
                            const currencySymbol = currency === "USD" ? "$" : "₹";
                            const salaryTypeText = salaryType === "Hourly" ? "/hr" : salaryType === "Monthly" ? "/month" : "/year";
                            return `${currencySymbol}${salary.toLocaleString('en-IN')}${salaryTypeText}`;
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
                            const salaryTypeText = salaryType === "Hourly" ? "/hr" : salaryType === "Monthly" ? "/month" : "/year";
                            return `₹${convertedSalary.toLocaleString('en-IN')}${salaryTypeText}`;
                          })()}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-pointer">
                          {(() => {
                            const client = clients.find((c) => c.id === employee.client_id);
                            const currency = client?.currency || "INR";
                            const clientBilling = employee.client_billing || 0;
                            const billingType = employee.billing_type || "LPA";
                            const currencySymbol = currency === "USD" ? "$" : "₹";
                            const billingTypeText = billingType === "Hourly" ? "/hr" : billingType === "Monthly" ? "/month" : "/year";
                            return `${currencySymbol}${clientBilling.toLocaleString('en-IN')}${billingTypeText}`;
                          })()}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {(() => {
                            const client = clients.find((c) => c.id === employee.client_id);
                            const currency = client?.currency || "INR";
                            const clientBilling = employee.client_billing || 0;
                            const billingType = employee.billing_type || "LPA";
                            const convertedBilling = currency === "USD" ? clientBilling * EXCHANGE_RATE_USD_TO_INR : clientBilling;
                            const billingTypeText = billingType === "Hourly" ? "/hr" : billingType === "Monthly" ? "/month" : "/year";
                            return `₹${convertedBilling.toLocaleString('en-IN')}${billingTypeText}`;
                          })()}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-2">
                {formatINR(
                  calculationMode === "actual"
                    ? calculateActualRevenueForTable(employee) // <-- USE NEW CORRECT FUNCTION
                    : calculateRevenue(employee, "accrual")
                )}
              </td>
              <td className="px-4 py-2">
                {formatINR(
                  calculationMode === "actual"
                    ? calculateActualProfitForTable(employee) // <-- USE NEW CORRECT FUNCTION
                    : calculateProfit(employee, "accrual")
                )}
              </td>
                  <td className="px-4 py-2">
                    <Select
                      defaultValue={employee.status}
                      onValueChange={(newStatus) =>
                        updateEmployeeStatus.mutate({ employeeId: employee.id, newStatus })
                      }
                    >
                      <SelectTrigger
                        className={`h-8 px-2 py-0 rounded-full text-[10px] ${
                          employee.status === "Working"
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : employee.status === "Relieved"
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            : employee.status === "Terminated"
                            ? "bg-red-100 text-red-800 hover:bg-red-200"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Working" className="text-green-700">
                          Working
                        </SelectItem>
                        <SelectItem value="Relieved" className="text-yellow-700">
                          Relieved
                        </SelectItem>
                        <SelectItem value="Terminated" className="text-red-700">
                          Terminated
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        setEditEmployee(employee);
                        setAddProjectOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-red-600 hover:text-red-700 hover:border-red-300"
                      onClick={() => setDeleteEmployeeId(employee.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    {employee.sow && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => window.open(employee.sow, "_blank")}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        SOW
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">per page</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
              .map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredEmployees.length)} of{" "}
          {filteredEmployees.length} employees
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader size={60} className="border-[6px]" />
      </div>
    );
  }

  // Define colors for employees (using a simple palette)
  const employeeColors = [
    "#7B43F1",
    "#A74BC8",
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEEAD",
    "#D4A5A5",
    "#9B59B6",
    "#3498DB",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 md:p-10">
      <main className="w-full max-w-8xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-all duration-200"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </Button>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span
                className="cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => navigate("/projects")}
              >
                Projects
              </span>
              <span>/</span>
              <span
                className="cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => navigate(`/client/${clientId}`)}
              >
                {client?.client_name || "Loading..."}
              </span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-tight">
                {project?.name} Dashboard
              </h1>
              <p className="text-gray-500 text-sm md:text-base mt-2">
                Manage and track all employees for this project
              </p>
            </div>
          </div>
          <Button
            onClick={() => setAddProjectOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Assign New Employee</span>
          </Button>
        </div>

        {/* Calculation Mode Tabs */}
<div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">
  <div className="flex-shrink-0 order-1">
    <Tabs
      value={calculationMode}
      onValueChange={(value) => setCalculationMode(value as "accrual" | "actual")}
    >
      <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
        <TabsTrigger
          value="actual"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
        >
          Actual
        </TabsTrigger>
        <TabsTrigger
          value="accrual"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
        >
          Accrual
        </TabsTrigger>
      </TabsList>
    </Tabs>
  </div>
</div>

        {/* Stats Overview and Finance Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 purple-gradient h-[350px] flex flex-col">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-lg font-semibold text-white flex items-center">
                <Briefcase className="mr-2" size={18} />
                Project Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 flex-grow overflow-auto">
              <ul className="space-y-3">
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <FileText size={16} className="mr-2 text-white" />
                    <span className="text-sm">Project Name:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">{project?.name}</span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <Calendar size={16} className="mr-2 text-white" />
                    <span>Start Date:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">
                    {project?.start_date ? new Date(project.start_date).toLocaleDateString() : "N/A"}
                  </span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <Calendar size={16} className="mr-2 text-white" />
                    <span>End Date:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">
                    {project?.end_date ? new Date(project.end_date).toLocaleDateString() : "N/A"}
                  </span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <Users size={16} className="mr-2 text-white" />
                    <span>Total Employees:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">{totalEmployees}</span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <UserRoundCheck size={16} className="mr-2 text-white" />
                    <span>Working Employees:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">{workingCount}</span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <UserRoundX size={16} className="mr-2 text-white" />
                    <span>Relieved Employees:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">{relievedCount}</span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <UserRoundX size={16} className="mr-2 text-white" />
                    <span>Terminated Employees:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">{terminatedCount}</span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <ReceiptIndianRupee size={16} className="mr-2 text-white" />
                    <span>Total Revenue:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">{formatINR(totalRevenue)}</span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <TrendingUp size={16} className="mr-2 text-white" />
                    <span>Total Profit:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">{formatINR(totalProfit)}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
          <div className="lg:col-span-3">
            {calculationMode === "actual" ? (
              <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl h-[350px]">
                <CardHeader className="purple-gradient text-white p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl md:text-2xl font-semibold">
                        Logged Hours (Financial Year {financialYear}-{financialYear + 1})
                      </h2>
                      {spansMultipleYears && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info size={18} className="text-white cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              The date range spans multiple financial years. Showing data for the most recent financial year
                              ({financialYear}-{financialYear + 1}). Adjust the table's date range to view a specific financial year.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={calculateTotalHoursByInterval()}
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
                        label={{ value: "Months", position: "insideBottom", offset: -10, fill: "#4b5563" }}
                        className="text-sm font-medium purple-text-color"
                        tick={{ fontSize: 12, fill: "#4b5563" }}
                        tickFormatter={(value) => (value.length > 7 ? `${value.slice(0, 7)}...` : value)}
                      />
                      <YAxis
                        label={{ value: "Hours", angle: -90, position: "insideLeft", offset: -10, fill: "#4b5563" }}
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
                        formatter={(value: number) => `${value.toFixed(2)} hours`}
                        itemStyle={{ color: "#4b5563" }}
                        cursor={{ fill: "#f3e8ff" }}
                      />
                      <Bar dataKey="hours" fill="#7B43F1" name="Logged Hours" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <RevenueExpenseChart
                projectId={id}
                assignEmployee={assignEmployee}
                calculationMode={calculationMode}
              />
            )}
          </div>
        </div>

        {/* Table Section */}
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl rounded-2xl">
          <CardContent className="p-6">
<div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">
  <div className="flex-shrink-0 order-1">
    <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
        <TabsTrigger
          value="all"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
        >
          All
        </TabsTrigger>
        <TabsTrigger
          value="working"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-1"
        >
          <Briefcase size={14} />
          <span>Working</span>
        </TabsTrigger>
        <TabsTrigger
          value="relieved"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-1"
        >
          <Calendar size={14} />
          <span>Relieved</span>
        </TabsTrigger>
        <TabsTrigger
          value="terminated"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-1"
        >
          <Clock size={14} />
          <span>Terminated</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  </div>
  <div className="relative flex-grow order-2 min-w-[200px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[320px]">
    <Search
      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
      size={18}
    />
    <Input
      placeholder="Search for employees..."
      className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  </div>
  {/* CHANGE_HIGHLIGHT: Conditionally render the DateRangePickerField */}
  {calculationMode === "actual" && (
    <div className="flex-shrink-0 order-3 w-full sm:w-auto">
      <EnhancedDateRangeSelector
        value={dateRange}
        onChange={setDateRange}
      />
    </div>
  )}
  <div className="flex gap-2 flex-shrink-0 order-4">
    <Button variant="outline" size="sm" onClick={exportToCSV} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm border-gray-200 hover:bg-gray-50">
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
    <Button variant="outline" size="sm" onClick={exportToPDF} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm border-gray-200 hover:bg-gray-50">
      <Download className="w-4 h-4 mr-2" />
      Export PDF
    </Button>
  </div>
</div>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="all" className="space-y-6">
                {renderTable(paginatedEmployees)}
                {filteredEmployees.length > 0 && renderPagination()}
              </TabsContent>
              <TabsContent value="working" className="space-y-6">
                {renderTable(paginatedEmployees.filter((employee) => employee.status === "Working"))}
                {filteredEmployees.length > 0 && renderPagination()}
              </TabsContent>
              <TabsContent value="relieved" className="space-y-6">
                {renderTable(paginatedEmployees.filter((employee) => employee.status === "Relieved"))}
                {filteredEmployees.length > 0 && renderPagination()}
              </TabsContent>
              <TabsContent value="terminated" className="space-y-6">
                {renderTable(paginatedEmployees.filter((employee) => employee.status === "Terminated"))}
                {filteredEmployees.length > 0 && renderPagination()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {clientId && id && (
          <>
            <AssignEmployeeDialog
              open={addProjectOpen}
              onOpenChange={(open) => {
                setAddProjectOpen(open);
                if (!open) setEditEmployee(null);
              }}
              projectId={id}
              clientId={clientId}
              editEmployee={editEmployee}
              project={project}
            />
            <AlertDialog open={!!deleteEmployeeId} onOpenChange={() => setDeleteEmployeeId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently remove the employee from this project. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => deleteEmployeeId && deleteEmployee.mutate(deleteEmployeeId)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </main>
    </div>
  );
};

export default ProjectDashboard;