
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
  Clock,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Input } from "../ui/input";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import AssignEmployeeDialog from "./AssignEmployeeDialog";
import Loader from "@/components/ui/Loader";
import {
ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie
} from "recharts";
import RevenueProfitChart from "../Client/RevenueProfitChart";
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
import { Calendar as CalendarIcon,UserRoundCheck, UserRoundX, ReceiptIndianRupee  } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as UICalendar } from "@/components/ui/calendar"; // Assuming available in your UI library
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, isWithinInterval } from "date-fns";

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
  hr_employees?: {
    first_name: string;
    last_name: string;
    salary_type: string;
  } | null;
}

interface Client {
  id: string;
  currency: string;
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
 const [timePeriod, setTimePeriod] = useState<"week" | "month" | "year">("week");
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

  // Fetch time logs for actual calculations
  const { data: timeLogs = [], isLoading: loadingTimeLogs, error: timeLogsError } = useQuery<
    TimeLog[]
  >({
    queryKey: ["time_logs", id],
    queryFn: async () => {
      if (!id) throw new Error("Project ID is missing");
      const { data, error } = await supabase
        .from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
        // .eq("organization_id", organization_id);
            .eq("is_approved", true)
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
        .select("id, currency")
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data as Client[];
    },
  });

  useEffect(() => {
    if (projectError || employeesError || clientsError || timeLogsError) {
      toast.error("Failed to fetch data");
      console.error("Errors:", { projectError, employeesError, clientsError, timeLogsError });
    }
    setLoading(loadingProject || loadingEmployees || loadingClients || loadingTimeLogs);
  }, [
    projectError,
    employeesError,
    clientsError,
    timeLogsError,
    loadingProject,
    loadingEmployees,
    loadingClients,
    loadingTimeLogs,
  ]);

// Calculate total hours per employee from time logs with time filter
  const calculateEmployeeHoursWithFilter = (employeeId: string, filter: "week" | "month" | "year") => {
    const now = new Date();
    let startDate: Date;

    if (filter === "week") {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (filter === "month") {
      startDate = new Date(now.setMonth(now.getMonth() - 1));
    } else {
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
    }

    return timeLogs
      .filter((log) => {
        const logDate = new Date(log.date);
        return log.employee_id === employeeId && logDate >= startDate;
      })
      .reduce((acc, log) => {
        const projectEntry = log.project_time_data?.projects?.find(
          (proj) => proj.projectId === id
        );
        return acc + (projectEntry?.hours || 0);
      }, 0);
  };

  // Existing calculateEmployeeHours for table and other calculations
  const calculateEmployeeHours = (employeeId: string) => {
    return timeLogs
      .filter((log) => log.employee_id === employeeId)
      .reduce((acc, log) => {
        const projectEntry = log.project_time_data?.projects?.find(
          (proj) => proj.projectId === id
        );
        return acc + (projectEntry?.hours || 0);
      }, 0);
  };

  // New function to calculate total hours by time interval
  const calculateTotalHoursByInterval = (period: "week" | "month" | "year", referenceDate: Date) => {
    let intervalStart: Date;
    let intervalEnd: Date;
    let data: { name: string; hours: number }[] = [];

    if (period === "week") {
      intervalStart = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday start
      intervalEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: intervalStart, end: intervalEnd });
      data = days.map((day) => ({
        name: format(day, "EEE"), // Mon, Tue, etc.
        hours: timeLogs
          .filter((log) => isSameDay(new Date(log.date), day))
          .reduce((acc, log) => {
            const projectEntry = log.project_time_data?.projects?.find(
              (proj) => proj.projectId === id
            );
            return acc + (projectEntry?.hours || 0);
          }, 0),
      }));
    } else if (period === "month") {
      intervalStart = startOfMonth(referenceDate);
      intervalEnd = endOfMonth(referenceDate);
      const weeks = eachWeekOfInterval({ start: intervalStart, end: intervalEnd }, { weekStartsOn: 1 });
      data = weeks.map((weekStart, index) => ({
        name: `Week ${index + 1}`,
        hours: timeLogs
          .filter((log) => {
            const logDate = new Date(log.date);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
          })
          .reduce((acc, log) => {
            const projectEntry = log.project_time_data?.projects?.find(
              (proj) => proj.projectId === id
            );
            return acc + (projectEntry?.hours || 0);
          }, 0),
      }));
    } else {
      intervalStart = startOfYear(referenceDate);
      intervalEnd = endOfYear(referenceDate);
      const months = eachMonthOfInterval({ start: intervalStart, end: intervalEnd });
      data = months.map((month) => ({
        name: format(month, "MMM"), // Jan, Feb, etc.
        hours: timeLogs
          .filter((log) => {
            const logDate = new Date(log.date);
            return logDate.getFullYear() === month.getFullYear() && logDate.getMonth() === month.getMonth();
          })
          .reduce((acc, log) => {
            const projectEntry = log.project_time_data?.projects?.find(
              (proj) => proj.projectId === id
            );
            return acc + (projectEntry?.hours || 0);
          }, 0),
      }));
    }

    return data;
  };

  // Convert client_billing to LPA or per-hour for accrual and actual calculations
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
          clientBilling *= workingHours;
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
      const hours = calculateEmployeeHours(employee.assign_employee);
      const hourlyRate = convertToLPA(employee, "actual");
      return hours * hourlyRate;
    }
  };

  console.log("employee", assignEmployee)
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
      const hours = calculateEmployeeHours(employee.assign_employee);

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

  // Calculate total revenue
  const totalRevenue = assignEmployee.reduce(
    (acc, emp) => acc + calculateRevenue(emp, calculationMode),
    0
  ) || 0;

  // Calculate total profit
  const totalProfit = assignEmployee.reduce(
    (acc, emp) => acc + calculateProfit(emp, calculationMode),
    0
  ) || 0;

  // Calculate employee counts from assignEmployee array
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

  // Filter employees based on search and status
  const filteredEmployees = assignEmployee.filter((employee) => {
    const employeeName = employee.hr_employees
      ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
      : "";
    const matchesSearch = employeeName.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "working") return matchesSearch && employee.status === "Working";
    if (activeTab === "relieved") return matchesSearch && employee.status === "Relieved";
    if (activeTab === "terminated") return matchesSearch && employee.status === "Terminated";
    return matchesSearch;
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
      Hours: calculationMode === "actual" ? `${calculateEmployeeHours(employee.assign_employee).toFixed(2)} hours` : "",
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
          ? `${employee.duration} days`
          : `${calculateEmployeeHours(employee.assign_employee).toFixed(2)} hours`,
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

    // Helper function to calculate salary (extracted from calculateProfit)
const calculateSalary = (employee: AssignEmployee, mode: "accrual" | "actual") => {
  let salary = employee.salary || 0;
  const salaryType = employee?.salary_type || "LPA";

  if (employee.salary_currency === "USD") {
    salary *= EXCHANGE_RATE_USD_TO_INR;
  }


    const durationDays = employee.duration || 1;

    if (salaryType === "LPA") {
      salary = (salary * durationDays) / 365;
    } else if (salaryType === "Monthly") {
      const monthlyToDaily = salary / 30;
      salary = monthlyToDaily * durationDays;
    } else if (salaryType === "Hourly") {
      salary = salary * durationDays * 8;
    }
  

  return salary;
};

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
                      ? `${employee.duration} days`
                      : `${calculateEmployeeHours(employee.assign_employee).toFixed(2)} hours`}
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
                onClick={() => navigate("/projects")} // Adjust route as needed
              >
                Projects
              </span>
              <span>/</span>
              <span
                className="cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() =>
                  navigate(`/client/${clientId}`) // Adjust route as needed
                }
              >
                {client?.client_name || "Loading..."}
              </span>
              {/* <span>/</span>
              <span className="font-medium text-gray-800">{project?.name || "Project"}</span> */}
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Total Employees</p>
              <h3 className="text-2xl font-bold text-gray-800">{totalEmployees}</h3>
              <p className="text-xs text-gray-500 mt-1">All assigned employees</p>
            </div>
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-full">
              <Briefcase size={24} className="text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Working Employees</p>
              <h3 className="text-2xl font-bold text-gray-800">{workingCount}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {totalEmployees ? Math.round((workingCount / totalEmployees) * 100) : 0}% of total
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-400 to-green-600 p-3 rounded-full">
              <Calendar size={24} className="text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Relieved Employees</p>
              <h3 className="text-2xl font-bold text-gray-800">{relievedCount}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {totalEmployees ? Math.round((relievedCount / totalEmployees) * 100) : 0}% of total
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-3 rounded-full">
              <Clock size={24} className="text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Terminated Employees</p>
              <h3 className="text-2xl font-bold text-gray-800">{terminatedCount}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {totalEmployees ? Math.round((terminatedCount / totalEmployees) * 100) : 0}% of total
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-400 to-red-600 p-3 rounded-full">
              <Briefcase size={24} className="text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-800">₹ {formatINR(totalRevenue)}</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <p className="text-xs text-gray-500 mt-1">
                      ${(totalRevenue / EXCHANGE_RATE_USD_TO_INR).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                    </p>
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border-gray-200 shadow-lg rounded-lg p-2">
                    <p>Converted at 1 USD = ₹ {EXCHANGE_RATE_USD_TO_INR}</p>
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
              <h3 className="text-2xl font-bold text-gray-800">₹ {formatINR(totalProfit)}</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <p className="text-xs text-gray-500 mt-1">
                      ${(totalProfit / EXCHANGE_RATE_USD_TO_INR).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                    </p>
                  </TooltipTrigger>
                  <TooltipContent className="bg-white border-gray-200 shadow-lg rounded-lg p-2">
                    <p>Converted at 1 USD = ₹ {EXCHANGE_RATE_USD_TO_INR}</p>
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
            <h2 className="text-xl md:text-2xl font-semibold">Employee Financials</h2>
          </CardHeader>
          <CardContent className="p-6 overflow-x-auto">
            <div style={{ minWidth: `${assignEmployee.length * 100}px` }}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={assignEmployee.map((employee) => ({
                    name: employee.hr_employees
                      ? `${employee.hr_employees.first_name} ${employee.hr_employees.last_name}`
                      : "N/A",
                    revenue: calculateRevenue(employee, calculationMode),
                    salary: employee.salary,
                    profit: calculateProfit(employee, calculationMode),
                  }))}
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
                    label={{ value: "Employees", position: "insideBottom", offset: -10, fill: "#4b5563" }}
                    className="text-sm font-medium purple-text-color"
                    tick={{ fontSize: 12, fill: "#4b5563" }}
                    tickFormatter={(value) => (value.length > 7 ? `${value.slice(0, 7)}...` : value)}
                  />
                  <YAxis
                    label={{ value: "Value (INR)", angle: -90, position: "insideLeft", offset: -10, fill: "#4b5563" }}
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
                    formatter={(value: number, name) => {
                      const usd = value / EXCHANGE_RATE_USD_TO_INR;
                      return [
                        `₹${formatINR(value)} ($${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })})`,
                        name,
                      ];
                    }}
                    itemStyle={{ color: "#4b5563" }}
                    cursor={{ fill: "#f3e8ff" }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "14px", color: "#4b5563" }} />
                  <Bar dataKey="revenue" fill="#7B43F1" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="salary" fill="#A74BC8" name="Salary" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#B343B5" name="Profit" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
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
// 