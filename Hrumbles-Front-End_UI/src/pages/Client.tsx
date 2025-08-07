import React, { useState, Component, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import supabase from "../config/supabaseClient";
import ClientTable from "../components/Client/ClientTable";
import AddClientDialog from "../components/Client/AddClientDialog";
import ClientRevenueExpenseChart from "../components/Client/ClientRevenueExpenseChart";
import { Button } from "../components/ui/button";
import { Plus, Briefcase, UserRoundCheck, UserRoundX, ReceiptIndianRupee, TrendingUp, Star } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "../components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import Loader from "@/components/ui/Loader";
import { useSelector } from "react-redux";
import { Tooltip as ReactTooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { DateRangePickerField } from "../components/ui/DateRangePickerField";
import { startOfYear, endOfYear, setMonth, setDate, eachMonthOfInterval, startOfMonth, endOfMonth, format, isWithinInterval } from "date-fns";

const EXCHANGE_RATE_USD_TO_INR = 84;

interface Client {
  id: string;
  display_name: string;
  status: string;
  internal_contact: string;
  currency: string;
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

interface ClientFinancialData extends Client {
    total_projects: number;
    revenue_inr: number;
    revenue_usd: number;
    profit_inr: number;
    profit_usd: number;
}

// Helper function to get financial year boundaries
const getFinancialYearRange = (date: Date): { start: Date; end: Date } => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const fyStartYear = month < 3 ? year - 1 : year;
  return {
    start: setMonth(setDate(new Date(fyStartYear, 3, 1), 1), 3), // April 1
    end: setMonth(setDate(new Date(fyStartYear + 1, 2, 31), 31), 2), // March 31
  };
};

// Error Boundary Component
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: string | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

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

const ClientManagement = () => {
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [dataType, setDataType] = useState<"revenue" | "profit">("revenue");
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date; key: string }>({
    startDate: startOfYear(new Date()),
    endDate: new Date(),
    key: "selection",
  });

  console.log("%c--- RENDER CYCLE START ---", "color: blue; font-weight: bold;");

  // Fetch Clients
 // In Client.tsx within the ClientManagement component

const { data: clients, isLoading: loadingClients, isSuccess: successClients } = useQuery({
  // Add "contractual" to the key to make it unique
  queryKey: ["clients", "contractual", organization_id], 
  queryFn: async () => {
    if (!organization_id) return [];
    console.log("Fetching CONTRACTUAL clients from DB...");
    const { data, error } = await supabase
      .from("hr_clients")
      .select("id, display_name, status, internal_contact, currency")
      .eq("organization_id", organization_id)
      .contains("service_type", ["contractual"]);
    if (error) throw error;
    return data || [];
  },
  enabled: !!organization_id,
});

  // Fetch Project Employees
  const { data: projectEmployees, isLoading: loadingEmployees, isSuccess: successEmployees  } = useQuery({
    queryKey: ["project-employees", organization_id],
    queryFn: async () => {
      if (!organization_id) throw new Error("Organization ID is missing");
      const { data, error } = await supabase
        .from("hr_project_employees")
        .select(`
          client_id,
          project_id,
          assign_employee,
          salary,
          client_billing,
          billing_type,
          salary_type,
          salary_currency,
          organization_id
        `)
        .eq("organization_id", organization_id);
      if (error) throw error;
      console.log("Project Employees Data:", data);
      return data || [];
    },
    enabled: !!organization_id,
  });

  // Fetch Time Logs for calculations (selected date range)
  const { data: timeLogs, isLoading: loadingTimeLogs, isSuccess: successTimeLogs } = useQuery({
    queryKey: ["time_logs", organization_id, dateRange],
    queryFn: async () => {
      if (!organization_id) throw new Error("Organization ID is missing");
      const { data, error } = await supabase
        .from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
        .eq("is_approved", true)
        .eq("organization_id", organization_id)
        .gte("date", dateRange.startDate.toISOString())
        .lte("date", dateRange.endDate.toISOString());
      if (error) throw error;
      console.log("Time Logs Data:", data);
      return data || [];
    },
    enabled: !!organization_id,
  });

  // Calculate total hours per employee from time logs
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

  // Convert client_billing to hourly rate
  const convertToHourly = (employee: ProjectEmployee, clientCurrency: string) => {
    let clientBilling = Number(employee.client_billing) || 0;

    if (clientCurrency === "USD") {
      clientBilling *= EXCHANGE_RATE_USD_TO_INR;
    }

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
        clientBilling = 0;
        break;
    }

    return clientBilling;
  };

  // Calculate revenue for an employee
  const calculateRevenue = (employee: ProjectEmployee, projectId: string, clientCurrency: string, logs: TimeLog[]) => {
    const hours = calculateEmployeeHours(employee.assign_employee, projectId, logs);
    const hourlyRate = convertToHourly(employee, clientCurrency);
    return hours * hourlyRate;
  };

  // Calculate profit for an employee
  const calculateProfit = (employee: ProjectEmployee, projectId: string, clientCurrency: string, logs: TimeLog[]) => {
    const revenue = calculateRevenue(employee, projectId, clientCurrency, logs);
    let salary = Number(employee.salary) || 0;
    const salaryType = employee?.salary_type || "LPA";

    if (employee.salary_currency === "USD") {
      salary *= EXCHANGE_RATE_USD_TO_INR;
    }

    const hours = calculateEmployeeHours(employee.assign_employee, projectId, logs);

    let hourlySalary = salary;
    switch (salaryType) {
      case "LPA":
        hourlySalary = salary / (365 * 8);
        break;
      case "Monthly":
        hourlySalary = (salary * 12) / (365 * 8);
        break;
      case "Hourly":
        break;
      default:
        hourlySalary = 0;
        break;
    }

    return revenue - (hours * hourlySalary);
  };


  // --- **THE FIX**: Memoized and Guarded Calculation ---
  const clientFinancials: ClientFinancialData[] = useMemo(() => {
    console.log("[CALC] Attempting to calculate client financials...");
    console.log(`[CALC] Data Available? Clients: ${!!clients}, Employees: ${!!projectEmployees}, TimeLogs: ${!!timeLogs}`);

    // This guard prevents calculations from running with incomplete data.
    if (!clients || !projectEmployees || !timeLogs) {
      console.warn("[CALC] Calculation aborted: Not all data is available yet. Returning empty array.");
      return [];
    }

    console.log(`%c[CALC] All data ready! Calculating for ${clients.length} clients.`, "color: green;");
    
    return clients.map((client) => {
      const clientProjects = projectEmployees.filter((pe) => pe.client_id === client.id);
      const totalRevenueINR = clientProjects.reduce((acc, pe) => acc + calculateRevenue(pe, pe.project_id, client.currency || "INR", timeLogs), 0);
      const totalProfitINR = clientProjects.reduce((acc, pe) => acc + calculateProfit(pe, pe.project_id, client.currency || "INR", timeLogs), 0);
      return {
        ...client,
        total_projects: new Set(clientProjects.map((pe) => pe.project_id)).size,
        revenue_inr: totalRevenueINR,
        revenue_usd: totalRevenueINR / EXCHANGE_RATE_USD_TO_INR,
        profit_inr: totalProfitINR,
        profit_usd: totalProfitINR / EXCHANGE_RATE_USD_TO_INR,
      };
    });
  }, [clients, projectEmployees, timeLogs]);
  // Filter clients with non-zero revenue or profit
  const filteredClientFinancials = clientFinancials.filter(client => 
    dataType === "revenue" ? client.revenue_inr > 0 : client.profit_inr > 0
  );

  // Find top performer client
  const topPerformer = clientFinancials.reduce((top, client) => (!top || client.revenue_inr > top.revenue_inr) ? client : top, null);
  const totalClients = clientFinancials.length;
  const activeClients = clientFinancials.filter((client) => client.status === "active").length;
  const inactiveClients = clientFinancials.filter((client) => client.status === "inactive").length;
  const totalProjects = clientFinancials.reduce((acc, c) => acc + c.total_projects, 0) || 0;
  const totalRevenueINR = clientFinancials.reduce((acc, c) => acc + c.revenue_inr, 0) || 0;
  const totalProfitINR = clientFinancials.reduce((acc, c) => acc + c.profit_inr, 0) || 0;
  const totalRevenueUSD = totalRevenueINR / EXCHANGE_RATE_USD_TO_INR;
  const totalProfitUSD = totalProfitINR / EXCHANGE_RATE_USD_TO_INR;

  // Chart Data for selected date range
  const months = eachMonthOfInterval({ start: dateRange.startDate, end: dateRange.endDate });
  const chartData = months.map((month) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const monthLogs = timeLogs?.filter((log: TimeLog) =>
      isWithinInterval(new Date(log.date), { start: monthStart, end: monthEnd })
    ) || [];

    const totalRevenue = projectEmployees?.reduce((acc, employee: ProjectEmployee) => {
      const projectId = employee.project_id;
      const clientCurrency = clients?.find((client: Client) => client.id === employee.client_id)?.currency || "INR";
      return acc + calculateRevenue(employee, projectId, clientCurrency, monthLogs);
    }, 0) || 0;

    const totalProfit = projectEmployees?.reduce((acc, employee: ProjectEmployee) => {
      const projectId = employee.project_id;
      const clientCurrency = clients?.find((client: Client) => client.id === employee.client_id)?.currency || "INR";
      return acc + calculateProfit(employee, projectId, clientCurrency, monthLogs);
    }, 0) || 0;

    return {
      month: format(month, "MMM yyyy"),
      Revenue: totalRevenue,
      Profit: totalProfit,
    };
  });
  console.log("Chart Data:", chartData);

  // Format numbers for display
  const formatINR = (number: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(number);

    const isDataLoading = !successClients || !successEmployees || !successTimeLogs;
  
  console.log(`[STATE] Top Performer: ${topPerformer?.display_name ?? 'N/A'}`);
  console.log(`[STATE] Final Loading State for Table: isDataLoading = ${isDataLoading}`);
  console.log("[PROPS] Passing to ClientTable:", { clientFinancials, isDataLoading });

 if (loadingClients || loadingEmployees || loadingTimeLogs) {
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
              Client Management
            </h1>
            <p className="text-gray-500 text-sm md:text-base mt-2">
              Manage and track all client activities
            </p>
          </div>
          <Button
            onClick={() => setAddClientOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200"
          >
            <Plus size={16} />
            <span>Create New Client</span>
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

        {/* Clients Overview Card and Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="purple-gradient h-[300px] flex flex-col lg:col-span-1">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-lg font-semibold text-white flex items-center">
                <Briefcase className="mr-2" size={18} />
                Clients Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 flex-grow overflow-auto">
              <ul className="space-y-5">
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <Briefcase size={16} className="mr-2 text-white" />
                    <span>Total Clients:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">{totalClients}</span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <UserRoundCheck size={16} className="mr-2 text-white" />
                    <span>Active Clients:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">
                    {totalClients ? Math.round((activeClients / totalClients) * 100) : 0}% ({activeClients})
                  </span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <UserRoundX size={16} className="mr-2 text-white" />
                    <span>Inactive Clients:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">
                    {totalClients ? Math.round((inactiveClients / totalClients) * 100) : 0}% ({inactiveClients})
                  </span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <Briefcase size={16} className="mr-2 text-white" />
                    <span>Total Projects:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">{totalProjects}</span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <ReceiptIndianRupee size={16} className="mr-2 text-white" />
                    <span>Total Revenue:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">
                    {formatINR(totalRevenueINR)}
                    <br />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs">
                            ${totalRevenueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="bg-white border-gray-200 shadow-lg rounded-lg p-2">
                          <p>Converted at 1 USD = ₹ {EXCHANGE_RATE_USD_TO_INR}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <TrendingUp size={16} className="mr-2 text-white" />
                    <span>Total Profit:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">
                    {formatINR(totalProfitINR)}
                    <br />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs">
                            ${totalProfitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="bg-white border-gray-200 shadow-lg rounded-lg p-2">
                          <p>Converted at 1 USD = ₹ {EXCHANGE_RATE_USD_TO_INR}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </li>
                <li className="flex items-start justify-between">
                  <div className="flex items-center text-sm text-white">
                    <Star size={16} className="mr-2 text-white" />
                    <span>Top Performer:</span>
                  </div>
                  <span className="font-small text-sm text-right text-white">
                    {topPerformer ? topPerformer.display_name : "N/A"}
                    <br />
                    <span className="text-xs">
                      {topPerformer ? `₹${topPerformer.revenue_inr.toLocaleString()}` : "No data"}
                    </span>
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
          <div className="lg:col-span-2">
            <ErrorBoundary>
              <ClientRevenueExpenseChart dateRange={dateRange} dataType={dataType} />
            </ErrorBoundary>
          </div>
        </div>

        {/* Projects & Revenue/Profit per Client Chart */}
     <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
  <CardHeader className="purple-gradient text-white p-3 flex justify-between items-center">
    <div className="flex items-center justify-between w-full">
      <h2 className="text-xl md:text-2xl font-semibold">
        Projects & {dataType === "revenue" ? "Revenue" : "Profit"} per Client
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
    <div style={{ minWidth: `${filteredClientFinancials.length * 100}px` }}>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={filteredClientFinancials}
          margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
          className="animate-fade-in"
          barSize={40} // Fixed bar width
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="display_name"
            angle={0}
            textAnchor="middle"
            interval={0}
            height={50}
            label={{ value: "Clients", position: "insideBottom", offset: -10, fill: "#4b5563" }}
            tick={{ fontSize: 12, fill: "#4b5563" }}
            tickFormatter={(value) => (value.length > 7 ? `${value.slice(0, 7)}...` : value)}
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
            radius={[4, 4, 0, 0]} // Top corners rounded
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>

        {/* Table Section */}
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl rounded-2xl">
          <CardContent className="p-6">
            <ClientTable clientFinancials={clientFinancials} setAddClientOpen={setAddClientOpen} isLoading={isDataLoading}/>
          </CardContent>
        </Card>
      </main>

      {/* Add Client Dialog */}
      <AddClientDialog open={addClientOpen} onOpenChange={setAddClientOpen} />
    </div>
  );
};

export default ClientManagement;