import React, { useState, Component, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProjectTable from "@/components/Project/ProjectTable"; // UPDATED
import AddProjectDialog from "@/components/Client/AddProjectDialog"; // UPDATED
import ClientRevenueExpenseChart from "@/components/Client/ClientRevenueExpenseChart";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, UserRoundCheck, UserRoundX, ReceiptIndianRupee, TrendingUp, Star, CheckCircle, XCircle } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, Area, ComposedChart, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import Loader from "@/components/ui/Loader";
import { useSelector } from "react-redux";
import { Tooltip as ReactTooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector";
import { startOfYear, endOfYear, setMonth, setDate, eachMonthOfInterval, startOfMonth, endOfMonth, format, isWithinInterval } from "date-fns";

const EXCHANGE_RATE_USD_TO_INR = 84;

// INTERFACES UPDATED FOR PROJECTS (PROFIT REMOVED)
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
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
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
  const [chartView, setChartView] = useState<'topRevenue' | 'all'>('topRevenue'); // PROFIT VIEW REMOVED
  const [currentPage, setCurrentPage] = useState(0);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [editingProject, setEditingProject] = useState<ProjectFinancialData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: startOfYear(new Date()),
    endDate: new Date(),
  });

  const ITEMS_PER_PAGE = 10;

// Reset current page when chart view changes
useEffect(() => {
  setCurrentPage(0);
}, [chartView]);

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
        if (!organization_id || !dateRange.startDate || !dateRange.endDate) return [];
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

  // --- CALCULATION HELPERS (PROFIT FUNCTION REMOVED) ---
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

  // --- CORE LOGIC CHANGE: Calculate financials per project (PROFIT REMOVED) ---
const projectFinancials: ProjectFinancialData[] = useMemo(() => {
  if (!projects || !projectEmployees || !timeLogs) {
    return [];
  }

  return projects.map((project) => {
    const employeesOnProject = projectEmployees.filter((pe) => pe.project_id === project.id);
    const projectCurrency = project.hr_clients?.currency || "INR";

    // MODIFIED LINES: Use the new calculation functions (PROFIT REMOVED)
    const totalRevenueINR = employeesOnProject.reduce(
      (acc, pe) => acc + calculateActualRevenue(pe, project.id, projectCurrency, timeLogs),
      0
    );
    
    return {
      ...project,
      assigned_employees: employeesOnProject.length,
      revenue_inr: totalRevenueINR,
      revenue_usd: totalRevenueINR / EXCHANGE_RATE_USD_TO_INR,
    };
  });
}, [projects, projectEmployees, timeLogs]);

// In ProjectManagement.tsx, after the 'projectFinancials' useMemo hook (PROFIT REMOVED)
const monthlyChartData = useMemo(() => {
  if (!dateRange.startDate || !dateRange.endDate) {
    return [];
  }
  const months = eachMonthOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
  const initialData = months.map(month => ({
    month: format(month, 'MMM'),
    revenue: 0,
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
          
          // Add to the monthly totals
          monthData.revenue += logRevenue;
        }
      });
    }
  });

  return initialData;
}, [timeLogs, projectEmployees, projects, dateRange]);


const dataForChart = useMemo(() => {
  const projectsCopy = [...projectFinancials];

  switch (chartView) {
    case 'topRevenue':
      return projectsCopy.sort((a, b) => b.revenue_inr - a.revenue_inr).slice(0, 10);
    case 'all':
      const startIndex = currentPage * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      return projectsCopy.slice(startIndex, endIndex);
    default:
      return projectsCopy.sort((a, b) => b.revenue_inr - a.revenue_inr).slice(0, 10);
  }
}, [projectFinancials, chartView, currentPage]);

  // --- UPDATED STATS FOR OVERVIEW CARD (PROFIT REMOVED) ---
   const topPerformer = projectFinancials.reduce((top, project) => (!top || project.revenue_inr > top.revenue_inr) ? project : top, null);
  const totalProjects = projectFinancials.length;
  // ** NEW STATS **
  const ongoingProjects = projectFinancials.filter((project) => project.status === "ongoing").length;
  const completedProjects = projectFinancials.filter((project) => project.status === "completed").length;
  const cancelledProjects = projectFinancials.filter((project) => project.status === "cancelled").length;
  // Revenue stats remain unchanged
  const totalRevenueINR = projectFinancials.reduce((acc, p) => acc + p.revenue_inr, 0) || 0;
  const totalRevenueUSD = totalRevenueINR / EXCHANGE_RATE_USD_TO_INR;

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
            <EnhancedDateRangeSelector value={dateRange} onChange={setDateRange} />
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
                {/* TOTAL PROFIT REMOVED */}
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
  <Card className="shadow-xl border-none bg-white overflow-hidden h-full">
    <CardHeader className="p-6">
      <CardTitle className="text-xl md:text-xl font-semibold text-gray-800">
        Monthly Revenue
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <ErrorBoundary>
          {isDataLoading ? (
              <div className="flex items-center justify-center h-[240px]">
                  <Loader size={40} />
              </div>
          ) : (
              <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart
                    data={monthlyChartData} 
                    margin={{ top: 0, right: 10, left: -30, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="monthlyRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7B43F1" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#7B43F1" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    
                    
                    <YAxis 
                      tickCount={5}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#37b762ff' }}
                      tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                    />

                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                    <Legend 
    verticalAlign="top" 
    wrapperStyle={{ paddingBottom: '10px' }} 
  />
                    <Area 
                      type="monotone"  
                      dataKey="revenue" 
                      name="Revenue" 
                      stroke="#7B43F1"
                      strokeWidth={3}
                      fill="url(#monthlyRevenueGradient)"
                      fillOpacity={1}
                    />
                  </ComposedChart>
              </ResponsiveContainer>
          )}
      </ErrorBoundary>
    </CardContent>
  </Card>
</div>
        </div>

        {/* REVENUE PER PROJECT CHART (updated to only show Revenue Area chart) */}
     <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
    <h2 className="text-xl md:text-xl font-semibold text-gray-800">
      Revenue per Project
    </h2>
    <div className="flex items-center gap-2">
      <Button variant={chartView === 'topRevenue' ? 'default' : 'outline'} size="sm" onClick={() => setChartView('topRevenue')}>Top 10 Revenue</Button>
      {/* PROFIT BUTTON REMOVED */}
      <Button variant={chartView === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setChartView('all')}>Show All</Button>
    </div>
  </CardHeader>
  <CardContent className="p-6 pt-0">
    {isDataLoading ? (
      <div className="flex items-center justify-center h-[300px]">
        <Loader size={40} className="border-[4px] animate-spin text-indigo-600" />
      </div>
    ) : dataForChart && dataForChart.length > 0 ? (
      <div className="h-[250px]">
        <div className="overflow-x-auto h-full">
          <div style={{ minWidth: `${dataForChart.length * 80}px`, height: '100%' }}>
            <ResponsiveContainer width="100%" height={250}>
               {/* CHART UPDATED TO BE AN AREA CHART FOR REVENUE ONLY */}
              <ComposedChart
                data={dataForChart}
                margin={{ top: 20, right: 40, left: 40, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="projectRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="#7B43F1" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#7B43F1" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  angle={0} 
                  textAnchor="middle"
                  interval={0}
                  height={50} 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => (value.length > 15 ? `${value.slice(0, 15)}...` : value)}
                />
                <YAxis
                  yAxisId="revenue"
                  orientation="left"
                  tickCount={5}
                  tick={{ fontSize: 11, fill: '#7B43F1', fontWeight: '600' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Revenue (₹)", angle: -90, position: "insideLeft", style: { textAnchor: 'middle', fill: '#7B43F1' }}}
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(10px)", border: "none", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"}}
                  formatter={(value, name) => {
                    const val = Number(value);
                    const usd = val / EXCHANGE_RATE_USD_TO_INR;
                    return [`₹${val.toLocaleString()} ($${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })})`, name];
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                />
                <Legend verticalAlign="top" height={46} wrapperStyle={{ fontSize: "14px", color: "#4b5563", paddingBottom: "20px" }} iconType="rect"/>
                <Area yAxisId="revenue" type="monotone" dataKey="revenue_inr" name="Revenue" stroke="#7B43F1" strokeWidth={3} fill="url(#projectRevenueGradient)" fillOpacity={1}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        {chartView === 'all' && projectFinancials.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-center gap-4 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <span className="text-sm font-medium text-gray-600">
              Page {currentPage + 1} of {Math.ceil(projectFinancials.length / ITEMS_PER_PAGE)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= Math.ceil(projectFinancials.length / ITEMS_PER_PAGE) - 1}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    ) : (
      <div className="flex items-center justify-center h-[400px] text-gray-500 bg-gray-50 rounded-lg">
        <p>No project data to display for the selected period.</p>
      </div>
    )}
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