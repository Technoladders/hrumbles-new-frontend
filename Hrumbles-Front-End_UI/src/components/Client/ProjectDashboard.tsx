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
  Calendar as CalendarIcon,
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
import { startOfMonth, startOfWeek, isSameDay, isWithinInterval, format, eachDayOfInterval, startOfYear } from "date-fns";
import { DateRangePickerField } from "@/components/ui/DateRangePickerField";
import RevenueExpenseChart from "./RevenueExpenseChart";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as UICalendar } from "@/components/ui/calendar"; 

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
  startDate: Date;
  endDate: Date;
  key: string;
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
    key: "selection",
  });
  const [timePeriod, setTimePeriod] = useState<"week" | "month" | "year">("month");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  if (!user || !organization_id) {
    return (
      <div className="text-center text-red-600 font-semibold mt-10">
        Authentication error: Missing user or organization ID
      </div>
    );
  }

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
            )
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

  // Fetch time logs for Logged Hours chart (filtered by timePeriod and selectedDate)
  const { data: timeLogs = [], isLoading: loadingTimeLogs, error: timeLogsError } = useQuery<
    TimeLog[]
  >({
    queryKey: ["time_logs_chart", id, timePeriod, selectedDate],
    queryFn: async () => {
      if (!id) throw new Error("Project ID is missing");
      let query = supabase
        .from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
        .eq("is_approved", true);
      
      if (timePeriod === "week") {
        const startOfWeekDate = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const endOfWeekDate = new Date(startOfWeekDate);
        endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);
        query = query
          .gte("date", startOfWeekDate.toISOString())
          .lte("date", endOfWeekDate.toISOString());
      } else if (timePeriod === "month") {
        const startOfMonthDate = startOfMonth(selectedDate);
        const endOfMonthDate = new Date(startOfMonthDate);
        endOfMonthDate.setMonth(startOfMonthDate.getMonth() + 1);
        endOfMonthDate.setDate(0);
        query = query
          .gte("date", startOfMonthDate.toISOString())
          .lte("date", endOfMonthDate.toISOString());
      } else if (timePeriod === "year") {
        const startOfYearDate = startOfYear(selectedDate);
        const endOfYearDate = new Date(startOfYearDate);
        endOfYearDate.setFullYear(startOfYearDate.getFullYear() + 1);
        endOfYearDate.setDate(0);
        query = query
          .gte("date", startOfYearDate.toISOString())
          .lte("date", endOfYearDate.toISOString());
      }

      const { data, error } = await query;
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
      if (!id) throw new Error("Project ID is missing");
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
    enabled: calculationMode === "actual" && !!id,
  });

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

  // Calculate employee hours for chart (using filtered timeLogs)
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
  const calculateEmployeeHoursForTable = (employeeId: string) => {
    return tableTimeLogs
      .filter((log) => 
        isWithinInterval(new Date(log.date), {
          start: dateRange.startDate,
          end: dateRange.endDate,
        })
      )
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

  // Calculate total hours by interval for the chart
  const calculateTotalHoursByInterval = (timePeriod: "week" | "month" | "year", selectedDate: Date) => {
    let intervals: string[] = [];
    let startDate: Date;

    if (timePeriod === "week") {
      startDate = startOfWeek(selectedDate, { weekStartsOn: 0 });
      intervals = Array.from({ length: 7 }, (_, i) =>
        format(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000), "EEE")
      );
    } else if (timePeriod === "month") {
      startDate = startOfMonth(selectedDate);
      intervals = Array.from({ length: 4 }, (_, i) =>
        format(
          new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
          "MMM dd"
        )
      );
    } else {
      intervals = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
    }

    const hoursByInterval = intervals.map((interval, index) => {
      let intervalStart: Date;
      let intervalEnd: Date;

      if (timePeriod === "week") {
        intervalStart = new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000);
        intervalEnd = new Date(intervalStart);
        intervalEnd.setHours(23, 59, 59, 999);
      } else if (timePeriod === "month") {
        intervalStart = new Date(startDate.getTime() + index * 7 * 24 * 60 * 60 * 1000);
        intervalEnd = new Date(intervalStart);
        intervalEnd.setDate(intervalStart.getDate() + 6);
        intervalEnd.setHours(23, 59, 59, 999);
      } else {
        intervalStart = new Date(selectedDate.getFullYear(), index, 1);
        intervalEnd = new Date(selectedDate.getFullYear(), index + 1, 0);
        intervalEnd.setHours(23, 59, 59, 999);
      }

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

      return { name: interval, hours: totalHours };
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

  // Calculate revenue for an employee
  const calculateRevenue = (employee: AssignEmployee, mode: "accrual" | "actual") => {
    if (mode === "accrual") {
      return convertToLPA(employee, "accrual");
    } else {
      const hours = calculateEmployeeHoursForRevenueProfit(employee.assign_employee);
      const hourlyRate = convertToLPA(employee, "actual");
      return hours * hourlyRate;
    }
  };

  // Calculate profit for an employee
  const calculateProfit = (employee: AssignEmployee, mode: "accrual" | "actual") => {
    const revenue = calculateRevenue(employee, mode);
    let salary = employee.salary || 0;
    const salaryType = employee?.salary_type || "LPA";

    if (employee.salary_currency === "USD") {
      salary *= EXCHANGE_RATE_USD_TO_INR;
    }

    if (mode === "accrual") {
      const durationDays = employee.duration || 1;
      if (salaryType === "LPA") {
        salary = (salary * durationDays) / 365;
      } else if (salaryType === "Monthly") {
        const monthlyToDaily = salary / 30;
        salary = monthlyToDaily * durationDays;
      } else if (salaryType === "Hourly") {
        salary = salary * durationDays * 8;
      }
    } else {
      const hours = calculateEmployeeHoursForRevenueProfit(employee.assign_employee);
      if (salaryType === "LPA") {
        const hourlySalary = salary / (365 * 8);
        salary = hours * hourlySalary;
      } else if (salaryType === "Monthly") {
        const monthlyToHourly = (salary / 30) / 8;
        salary = hours * monthlyToHourly;
      } else if (salaryType === "Hourly") {
        salary = hours * salary;
      }
    }

    return revenue - salary;
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
    const isWithinDateRange =
      calculationMode === "actual" ||
      (new Date(employee.start_date) <= dateRange.endDate &&
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
        calculationMode === "accrual"
          ? `${Math.ceil(
              (Math.min(new Date(employee.end_date).getTime(), dateRange.endDate.getTime()) -
                Math.max(new Date(employee.start_date).getTime(), dateRange.startDate.getTime())) /
                (1000 * 60 * 60 * 24)
            )} days`
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
                    {calculationMode === "accrual"
                      ? `${Math.ceil(
                          (Math.min(new Date(employee.end_date).getTime(), dateRange.endDate.getTime()) -
                            Math.max(new Date(employee.start_date).getTime(), dateRange.startDate.getTime())) /
                            (1000 * 60 * 60 * 24)
                        )} days`
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
                  <td className="px-4 py-2">{formatINR(calculateProfit(employee, calculationMode))}</td>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Tabs
            value={calculationMode}
            onValueChange={(value) => setCalculationMode(value as "accrual" | "actual")}
            className="mb-6"
          >
            <TabsList className="grid grid-cols-2 w-[200px]">
              <TabsTrigger value="actual">Actual</TabsTrigger>
              <TabsTrigger value="accrual">Accrual</TabsTrigger>
            </TabsList>
          </Tabs>
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
                {/* <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <Briefcase size={16} className="mr-2 text-white" />
                    <span>Project ID:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">{project?.id}</span>
                </li> */}
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
            <RevenueExpenseChart projectId={id} timeLogs={unfilteredTimeLogs} />
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {calculationMode === "actual" ? (
            <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
              <CardHeader className="purple-gradient text-white p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl md:text-2xl font-semibold">Logged Hours</h2>
                  <div className="flex items-center gap-2">
                    <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as "week" | "month" | "year")}>
                      <SelectTrigger className="w-[100px] bg-white text-gray-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-[170px] justify-start text-left font-normal text-black bg-white border-gray-200"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(selectedDate, timePeriod === "week" ? "'Week of' MMM d, yyyy" : timePeriod === "month" ? "MMM yyyy" : "yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <UICalendar
                          mode={timePeriod === "year" ? "year" : "default"}
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          initialFocus
                          disabled={(date) => date > new Date()}
                          {...(timePeriod === "year" ? { views: ["year"] } : {})}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={calculateTotalHoursByInterval(timePeriod, selectedDate)}
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
                      label={{ value: "Time Intervals", position: "insideBottom", offset: -10, fill: "#4b5563" }}
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
            <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
              <CardHeader className="purple-gradient text-white p-6">
                <h2 className="text-xl md:text-2xl font-semibold">Revenue vs Profit</h2>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart className="animate-fade-in">
                    <Pie
                      data={[
                        { name: "Revenue", value: totalRevenue, fill: "#7B43F1" },
                        { name: "Profit", value: totalProfit, fill: "#A74BC8" },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={100}
                      outerRadius={140}
                      cornerRadius={50}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ₹${formatINR(value)}`}
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
                      formatter={(value: number, name) => {
                        const usd = value / EXCHANGE_RATE_USD_TO_INR;
                        return [
                          `₹${formatINR(value)} ($${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })})`,
                          name,
                        ];
                      }}
                      itemStyle={{ color: "#4b5563" }}
                    />
                    <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: "14px", color: "#4b5563" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Table Section */}
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl rounded-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full sm:w-[400px]">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="working" className="flex items-center gap-1">
                    <Briefcase size={14} />
                    <span>Working</span>
                  </TabsTrigger>
                  <TabsTrigger value="relieved" className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>Relieved</span>
                  </TabsTrigger>
                  <TabsTrigger value="terminated" className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>Terminated</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative flex-grow">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <Input
                  placeholder="Search for employees..."
                  className="pl-10 h-10 rounded-lg border-gray-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <DateRangePickerField
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                onApply={() => {}}
                className="mt-4 sm:mt-0"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV} className="border-gray-200 hover:bg-gray-50">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF} className="border-gray-200 hover:bg-gray-50">
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