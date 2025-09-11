import React, { useState, Component, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProjectTable from "@/components/Project/ProjectTable"; // UPDATED
import AddProjectDialog from "@/components/Client/AddProjectDialog"; // UPDATED
import ClientRevenueExpenseChart from "@/components/Client/ClientRevenueExpenseChart";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, UserRoundCheck, UserRoundX, ReceiptIndianRupee, TrendingUp, Star, CheckCircle, XCircle } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import Loader from "@/components/ui/Loader";
import { useSelector } from "react-redux";
import { Tooltip as ReactTooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePickerField } from "@/components/ui/DateRangePickerField";
import { startOfYear, endOfYear, setMonth, setDate, eachMonthOfInterval, startOfMonth, endOfMonth, format, isWithinInterval } from "date-fns";

const EXCHANGE_RATE_USD_TO_INR = 84;

// INTERFACES UPDATED FOR PROJECTS
interface Project {
  id: string;
  name: string;
  status: string;
  client_id: string;
  start_date: string;
  created_by_name: string;
  hr_clients: {
    display_name: string;
    currency: string;
  } | null;
}

interface ProjectEmployee {
  client_id: string;
  project_id: string;
  assign_employee: string;
  salary: number;
  client_billing: number;
  billing_type: string;
  salary_type: string;
  salary_currency: string;
    working_hours?: number;
  working_days_config?: 'all_days' | 'weekdays_only' | 'saturday_working';
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

export interface ProjectFinancialData extends Project {
    assigned_employees: number;
    revenue_inr: number;
    revenue_usd: number;
    profit_inr: number;
    profit_usd: number;
}

// Helper function to get financial year boundaries (retained)
const getFinancialYearRange = (date: Date): { start: Date; end: Date } => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const fyStartYear = month < 3 ? year - 1 : year;
  return {
    start: setMonth(setDate(new Date(fyStartYear, 3, 1), 1), 3), // April 1
    end: setMonth(setDate(new Date(fyStartYear + 1, 2, 31), 31), 2), // March 31
  };
};

// Error Boundary Component (retained)
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string | null }> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error: error.message }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="text-red-500 text-center p-4">
          <p>Error: {this.state.error}</p>
          <p>Please refresh the page or contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProjectManagement = () => {
  const [addProjectOpen, setAddProjectOpen] = useState(false); // UPDATED
  const [dataType, setDataType] = useState<"revenue" | "profit">("revenue");
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [editingProject, setEditingProject] = useState<ProjectFinancialData | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date; key: string }>({
    startDate: startOfYear(new Date()),
    endDate: new Date(),
    key: "selection",
  });

  // Fetch Projects (Primary data source is now projects)
  const { data: projects, isLoading: loadingProjects, isSuccess: successProjects } = useQuery({
    queryKey: ["projects", organization_id],
    queryFn: async () => {
      if (!organization_id) return [];
      const { data, error } = await supabase
        .from("hr_projects")
        .select(`
          id,
          name,
          status,
          client_id,
          start_date, 
        created_by, 
          hr_clients!hr_projects_client_id_fkey ( display_name, currency ),
          users:created_by (first_name, last_name)
        `)
        .eq("organization_id", organization_id);
     if (error) throw error;

    return (
      data?.map(p => ({
        ...p,
        created_by_name: `${p.users?.first_name || 'N/A'} ${p.users?.last_name || ''}`.trim()
      })) as Project[]
    ) || [];
  },
  enabled: !!organization_id,
});

  // Fetch Project Employees (Remains the same, needed for calculations)
  const { data: projectEmployees, isLoading: loadingEmployees, isSuccess: successEmployees } = useQuery({
    queryKey: ["project-employees", organization_id],
    queryFn: async () => {
        if (!organization_id) return [];
        const { data, error } = await supabase
            .from("hr_project_employees")
            .select(`client_id, project_id, assign_employee, salary, client_billing, billing_type, salary_type, salary_currency, organization_id, working_hours, working_days_config`)
            .eq("organization_id", organization_id);
        if (error) throw error;
        return data || [];
    },
    enabled: !!organization_id,
  });

  // Fetch Time Logs (Remains the same, needed for calculations)
  const { data: timeLogs, isLoading: loadingTimeLogs, isSuccess: successTimeLogs } = useQuery({
    queryKey: ["time_logs", organization_id, dateRange],
    queryFn: async () => {
        if (!organization_id) return [];
        const { data, error } = await supabase
            .from("time_logs")
            .select("id, employee_id, date, project_time_data, total_working_hours")
            .eq("is_approved", true)
            .eq("organization_id", organization_id)
            .gte("date", dateRange.startDate.toISOString())
            .lte("date", dateRange.endDate.toISOString());
        if (error) throw error;
        return data || [];
    },
    enabled: !!organization_id,
  });

  // --- CALCULATION HELPERS (Unchanged) ---
// Calculate total hours per employee from time logs (This function remains)
const calculateEmployeeHours = (employeeId: string, projectId: string, logs: TimeLog[]) => {
  return (
    logs
      ?.filter((log: TimeLog) => log.employee_id === employeeId)
      .reduce((acc: number, log: TimeLog) => {
        const projectEntry = log.project_time_data?.projects?.find(
          (proj) => proj.projectId === projectId
        );
        return acc + (projectEntry?.hours || 0);
      }, 0) || 0
  );
};

// NEW: Calculate revenue for an employee using the improved 'Actual' logic
const calculateActualRevenue = (employee: ProjectEmployee, projectId: string, clientCurrency: string, logs: TimeLog[]) => {
    const hours = calculateEmployeeHours(employee.assign_employee, projectId, logs);
    const config = employee.working_days_config || 'all_days';
    let clientBilling = Number(employee.client_billing) || 0;
    if (clientCurrency === "USD") {
        clientBilling *= EXCHANGE_RATE_USD_TO_INR;
    }

    let hourlyRate = 0;
    // Use average working days per year for stable conversion
    const avgWorkingDaysInYear = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
    const dailyWorkingHours = employee.working_hours || 8;

    switch (employee.billing_type) {
        case "Monthly":
            hourlyRate = (clientBilling * 12) / (avgWorkingDaysInYear * dailyWorkingHours);
            break;
        case "LPA":
            hourlyRate = clientBilling / (avgWorkingDaysInYear * dailyWorkingHours);
            break;
        case "Hourly":
            hourlyRate = clientBilling;
            break;
    }
    return hours * (hourlyRate || 0);
};

// NEW: Calculate profit for an employee using the improved 'Actual' logic
const calculateActualProfit = (employee: ProjectEmployee, projectId: string, clientCurrency: string, logs: TimeLog[]) => {
    const revenue = calculateActualRevenue(employee, projectId, clientCurrency, logs);
    const hours = calculateEmployeeHours(employee.assign_employee, projectId, logs);
    const config = employee.working_days_config || 'all_days';
    let salary = Number(employee.salary) || 0;
    if (employee.salary_currency === "USD") {
        salary *= EXCHANGE_RATE_USD_TO_INR;
    }
    
    let salaryCost = 0;
    let hourlySalaryRate = 0;
    const avgWorkingDaysInYear = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
    const dailyWorkingHours = employee.working_hours || 8;

    switch (employee.salary_type) {
        case "Monthly":
            hourlySalaryRate = (salary * 12) / (avgWorkingDaysInYear * dailyWorkingHours);
            break;
        case "LPA":
            hourlySalaryRate = salary / (avgWorkingDaysInYear * dailyWorkingHours);
            break;
        case "Hourly":
            hourlySalaryRate = salary;
            break;
    }
    salaryCost = hours * (hourlySalaryRate || 0);

    return revenue - salaryCost;
};
  // --- CORE LOGIC CHANGE: Calculate financials per project ---
// ~ line 226
const projectFinancials: ProjectFinancialData[] = useMemo(() => {
  if (!projects || !projectEmployees || !timeLogs) {
    return [];
  }

  return projects.map((project) => {
    const employeesOnProject = projectEmployees.filter((pe) => pe.project_id === project.id);
    const projectCurrency = project.hr_clients?.currency || "INR";

    // MODIFIED LINES: Use the new calculation functions
    const totalRevenueINR = employeesOnProject.reduce(
      (acc, pe) => acc + calculateActualRevenue(pe, project.id, projectCurrency, timeLogs),
      0
    );
    const totalProfitINR = employeesOnProject.reduce(
      (acc, pe) => acc + calculateActualProfit(pe, project.id, projectCurrency, timeLogs),
      0
    );

    return {
      ...project,
      assigned_employees: employeesOnProject.length,
      revenue_inr: totalRevenueINR,
      revenue_usd: totalRevenueINR / EXCHANGE_RATE_USD_TO_INR,
      profit_inr: totalProfitINR,
      profit_usd: totalProfitINR / EXCHANGE_RATE_USD_TO_INR,
    };
  });
}, [projects, projectEmployees, timeLogs]);

  // In ProjectManagement.tsx, after the 'projectFinancials' useMemo hook

// ~ line 251
const monthlyChartData = useMemo(() => {
  const months = eachMonthOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
  const initialData = months.map(month => ({
    month: format(month, 'MMM'),
    revenue: 0,
    profit: 0,
  }));

  if (!timeLogs || !projectEmployees || !projects) return initialData;

  timeLogs.forEach(log => {
    const logMonth = format(new Date(log.date), 'MMM');
    const monthData = initialData.find(m => m.month === logMonth);

    if (monthData && log.project_time_data?.projects) {
      log.project_time_data.projects.forEach(p => {
        const employee = projectEmployees.find(e => e.assign_employee === log.employee_id && e.project_id === p.projectId);
        const project = projects.find(proj => proj.id === p.projectId);
        
        if (employee && project) {
          const projectCurrency = project.hr_clients?.currency || "INR";
          const hours = p.hours || 0;

          // --- START OF MODIFIED LOGIC ---
          const config = employee.working_days_config || 'all_days';
          const dailyWorkingHours = employee.working_hours || 8;
          const avgWorkingDaysInYear = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;

          // Calculate revenue for this specific log
          let hourlyRate = 0;
          let clientBilling = Number(employee.client_billing) || 0;
          if (projectCurrency === 'USD') clientBilling *= EXCHANGE_RATE_USD_TO_INR;

          switch (employee.billing_type) {
              case "Monthly": hourlyRate = (clientBilling * 12) / (avgWorkingDaysInYear * dailyWorkingHours); break;
              case "LPA": hourlyRate = clientBilling / (avgWorkingDaysInYear * dailyWorkingHours); break;
              case "Hourly": hourlyRate = clientBilling; break;
          }
          const logRevenue = hours * hourlyRate;
          
          // Calculate profit for this specific log
          let salary = Number(employee.salary) || 0;
          if (employee.salary_currency === "USD") salary *= EXCHANGE_RATE_USD_TO_INR;

          let hourlySalary = 0;
          switch (employee.salary_type) {
              case "Monthly": hourlySalary = (salary * 12) / (avgWorkingDaysInYear * dailyWorkingHours); break;
              case "LPA": hourlySalary = salary / (avgWorkingDaysInYear * dailyWorkingHours); break;
              case "Hourly": hourlySalary = salary; break;
          }
          const logExpense = hours * hourlySalary;
          const logProfit = logRevenue - logExpense;
          // --- END OF MODIFIED LOGIC ---
          
          // Add to the monthly totals
          monthData.revenue += logRevenue;
          monthData.profit += logProfit;
        }
      });
    }
  });

  return initialData;
}, [timeLogs, projectEmployees, projects, dateRange]);

  // Filter projects with non-zero revenue or profit for the chart
  const filteredProjectFinancials = projectFinancials.filter(project =>
    dataType === "revenue" ? project.revenue_inr > 0 : project.profit_inr > 0
  );

  // --- UPDATED STATS FOR OVERVIEW CARD ---
   const topPerformer = projectFinancials.reduce((top, project) => (!top || project.revenue_inr > top.revenue_inr) ? project : top, null);
  const totalProjects = projectFinancials.length;
  // ** NEW STATS **
  const ongoingProjects = projectFinancials.filter((project) => project.status === "ongoing").length;
  const completedProjects = projectFinancials.filter((project) => project.status === "completed").length;
  const cancelledProjects = projectFinancials.filter((project) => project.status === "cancelled").length;
  // Revenue and profit stats remain unchanged
  const totalRevenueINR = projectFinancials.reduce((acc, p) => acc + p.revenue_inr, 0) || 0;
  const totalProfitINR = projectFinancials.reduce((acc, p) => acc + p.profit_inr, 0) || 0;
  const totalRevenueUSD = totalRevenueINR / EXCHANGE_RATE_USD_TO_INR;
  const totalProfitUSD = totalProfitINR / EXCHANGE_RATE_USD_TO_INR;

  const isDataLoading = !successProjects || !successEmployees || !successTimeLogs;
  const formatINR = (number: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(number);

 if (loadingProjects || loadingEmployees || loadingTimeLogs) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader size={60} className="border-[6px] animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 md:p-10">
      <main className="w-full max-w-8xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-tight">
              Project Management {/* UPDATED */}
            </h1>
            <p className="text-gray-500 text-sm md:text-base mt-2">
              Manage and track all project activities {/* UPDATED */}
            </p>
          </div>
          <Button
            onClick={() => setAddProjectOpen(true)} // UPDATED
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200"
          >
            <Plus size={16} />
            <span>Create New Project</span> {/* UPDATED */}
          </Button>
        </div>

        {/* Date Range Picker */}
        <div className="flex justify-end">
          <ErrorBoundary>
            <DateRangePickerField
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onApply={() => {}}
              className="w-full sm:w-80"
            />
          </ErrorBoundary>
        </div>

        {/* Projects Overview Card and Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       <Card className="purple-gradient h-auto flex flex-col lg:col-span-1">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-lg font-semibold text-white flex items-center">
                <Briefcase className="mr-2" size={18} />
                Projects Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 flex-grow overflow-auto">
              <ul className="space-y-3">
                 <li className="flex items-center justify-between text-sm text-white">
                    <div className="flex items-center"><Briefcase size={16} className="mr-2" /><span>Total Projects:</span></div>
                    <span className="font-medium">{totalProjects}</span>
                </li>
                <li className="flex items-center justify-between text-sm text-white">
                    <div className="flex items-center"><Briefcase size={16} className="mr-2 text-blue-300" /><span>Ongoing:</span></div>
                    <span className="font-medium">{ongoingProjects}</span>
                </li>
                <li className="flex items-center justify-between text-sm text-white">
                    <div className="flex items-center"><CheckCircle size={16} className="mr-2 text-green-300" /><span>Completed:</span></div>
                    <span className="font-medium">{completedProjects}</span>
                </li>
                <li className="flex items-center justify-between text-sm text-white">
                    <div className="flex items-center"><XCircle size={16} className="mr-2 text-red-300" /><span>Cancelled:</span></div>
                    <span className="font-medium">{cancelledProjects}</span>
                </li>
                <li className="flex items-start justify-between">
                    <div className="flex items-center text-sm text-white"><ReceiptIndianRupee size={16} className="mr-2" /><span>Total Revenue:</span></div>
                    <div className="text-right text-white">
                        <span className="font-medium">{formatINR(totalRevenueINR)}</span><br />
                        <TooltipProvider><ReactTooltip><TooltipTrigger asChild><span className="text-xs opacity-80">${totalRevenueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD</span></TooltipTrigger><TooltipContent><p>Converted at 1 USD = ₹{EXCHANGE_RATE_USD_TO_INR}</p></TooltipContent></ReactTooltip></TooltipProvider>
                    </div>
                </li>
                <li className="flex items-start justify-between">
                    <div className="flex items-center text-sm text-white"><TrendingUp size={16} className="mr-2" /><span>Total Profit:</span></div>
                     <div className="text-right text-white">
                        <span className="font-medium">{formatINR(totalProfitINR)}</span><br />
                        <TooltipProvider><ReactTooltip><TooltipTrigger asChild><span className="text-xs opacity-80">${totalProfitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD</span></TooltipTrigger><TooltipContent><p>Converted at 1 USD = ₹{EXCHANGE_RATE_USD_TO_INR}</p></TooltipContent></ReactTooltip></TooltipProvider>
                    </div>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white"><Star size={16} className="mr-2 text-yellow-300" /><span>Top Performer:</span></div>
                  <div className="text-right text-white">
                    <span className="font-medium">{topPerformer ? topPerformer.name : "N/A"}</span><br/>
                    <span className="text-xs opacity-80">{topPerformer ? formatINR(topPerformer.revenue_inr) : "No data"}</span>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
           <div className="lg:col-span-2">
            <ErrorBoundary>
              {/* This component can be reused if its internal logic is based on props */}
              <ClientRevenueExpenseChart 
      chartData={monthlyChartData} 
      dataType={dataType} 
      isLoading={isDataLoading} />
            </ErrorBoundary>
          </div>
        </div>

        {/* REVENUE/PROFIT PER PROJECT CHART (updated) */}
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="purple-gradient text-white p-3 flex justify-between items-center">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-xl md:text-2xl font-semibold">
                {dataType === "revenue" ? "Revenue" : "Profit"} per Project {/* UPDATED */}
              </h2>
              <Tabs value={dataType} onValueChange={(value) => setDataType(value as "revenue" | "profit")}>
                <TabsList>
                  <TabsTrigger value="revenue">Revenue</TabsTrigger>
                  <TabsTrigger value="profit">Profit</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-6 overflow-x-auto">
            <div style={{ minWidth: `${filteredProjectFinancials.length * 100}px` }}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={filteredProjectFinancials} // USE PROJECT FINANCIALS
                  margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
                  className="animate-fade-in"
                  barSize={40}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name" // UPDATED from display_name to name
                    angle={0}
                    textAnchor="middle"
                    interval={0}
                    height={50}
                    label={{ value: "Projects", position: "insideBottom", offset: -10, fill: "#4b5563" }} // UPDATED
                    tick={{ fontSize: 12, fill: "#4b5563" }}
                    tickFormatter={(value) => (value.length > 10 ? `${value.slice(0, 10)}...` : value)}
                  />
                  <YAxis
                    label={{ value: dataType === "revenue" ? "Revenue (INR)" : "Profit (INR)", angle: -90, position: "insideLeft", offset: -10, fill: "#4b5563" }}
                    tick={{ fontSize: 12, fill: "#4b5563" }}
                  />
                  <Tooltip
                             contentStyle={{
                               backgroundColor: "#fff",
                               border: "1px solid oklch(62.7% 0.265 303.9)",
                               borderRadius: "8px",
                               boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                             }}
                             formatter={(value, name) => {
                               const val = Number(value);
                               const usd = val / EXCHANGE_RATE_USD_TO_INR;
                               return [
                                 `₹${val.toLocaleString()} ($${usd.toLocaleString(undefined, {
                                   maximumFractionDigits: 0,
                                 })})`,
                                 name,
                               ];
                             }}
                             itemStyle={{ color: "#4b5563" }}
                             cursor={{ fill: "#f3e8ff" }}
                           />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "14px", color: "#4b5563" }} />
                  <Bar
                    dataKey={dataType === "revenue" ? "revenue_inr" : "profit_inr"}
                    fill={dataType === "revenue" ? "#7B43F1" : "#B343B5"}
                    name={dataType === "revenue" ? "Revenue" : "Profit"}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Table Section - Now using ProjectTable */}
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl rounded-2xl">
          <CardContent className="p-6">
            <ProjectTable projectFinancials={projectFinancials} setAddProjectOpen={setAddProjectOpen} isLoading={isDataLoading} setEditingProject={setEditingProject}/>
          </CardContent>
        </Card>
      </main>

      {/* Add Project Dialog */}
     <AddProjectDialog 
  open={addProjectOpen} 
  onOpenChange={(open) => {
    setAddProjectOpen(open);
    if (!open) setEditingProject(null); // Clear editing state when dialog closes
  }} 
  editingProject={editingProject} // <-- PASS THE PROJECT TO EDIT
/>
    </div>
  );
};

export default ProjectManagement;