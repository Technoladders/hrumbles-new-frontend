import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import supabase from "../config/supabaseClient";
import ClientTable from "../components/Client/ClientTable";
import AddClientDialog from "../components/Client/AddClientDialog";
import { Button } from "../components/ui/button";
import { Plus, Briefcase, Calendar, Clock, DollarSign, TrendingUp, UserRoundCheck, UserRoundX, ReceiptIndianRupee } from "lucide-react";
import { Card, CardHeader, CardContent } from "../components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie } from "recharts";
import RevenueProfitChart from "../components/Client/RevenueProfitChart";
import Loader from "@/components/ui/Loader";
import { useSelector } from "react-redux";
import { Tooltip as ReactTooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "../components/ui/tooltip";

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
  hr_employees?: {
    salary_type: string;
  } | null;
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

const ClientManagement = () => {
  const [addClientOpen, setAddClientOpen] = useState(false);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // Fetch Clients
  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ["clients", organization_id],
    queryFn: async () => {
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
  const { data: projectEmployees, isLoading: loadingEmployees } = useQuery({
    queryKey: ["project-employees", organization_id],
    queryFn: async () => {
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
          salary_currency
          hr_employees:hr_employees!hr_project_employees_assign_employee_fkey (salary_type)
        `)
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization_id,
  });

  // Fetch Time Logs
  const { data: timeLogs, isLoading: loadingTimeLogs } = useQuery({
    queryKey: ["time_logs", organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
            .eq("is_approved", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization_id,
  });

  // Combine loading states
  const isLoading = loadingClients || loadingEmployees || loadingTimeLogs;

  // Calculate total hours per employee from time logs
  const calculateEmployeeHours = (employeeId: string, projectId: string) => {
    return (
      timeLogs
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
        clientBilling = (clientBilling * 12) / (365 * 8); // Convert monthly to hourly
        break;
      case "Hourly":
        // Already in hourly rate
        break;
      case "LPA":
        clientBilling = clientBilling / (365 * 8); // Convert LPA to hourly
        break;
      default:
        break;
    }

    return clientBilling;
  };

  // Calculate revenue for an employee
  const calculateRevenue = (employee: ProjectEmployee, projectId: string, clientCurrency: string) => {
    const hours = calculateEmployeeHours(employee.assign_employee, projectId);
    const hourlyRate = convertToHourly(employee, clientCurrency);
    return hours * hourlyRate;
  };

  // Calculate profit for an employee
  const calculateProfit = (employee: ProjectEmployee, projectId: string, clientCurrency: string) => {
    const revenue = calculateRevenue(employee, projectId, clientCurrency);
    
    let salary = employee.salary || 0;
    const salaryType = employee?.salary_type || "LPA";

    if (employee.salary_currency === "USD") {
      salary *= EXCHANGE_RATE_USD_TO_INR;
    }

    const hours = calculateEmployeeHours(employee.assign_employee, projectId);

    if (salaryType === "LPA") {
      const hourlySalary = salary / (365 * 8);
      salary = hours * hourlySalary;
    } else if (salaryType === "Monthly") {
      const monthlyToHourly = (salary / 30) / 8;
      salary = hours * monthlyToHourly;
    } else if (salaryType === "Hourly") {
      salary = hours * salary;
    }

    return revenue - salary;
  };

  // Calculate Revenue & Profit Per Client
  const clientFinancials = clients?.map((client: Client) => {
    const clientProjects = projectEmployees?.filter((pe) => pe.client_id === client.id) || [];
    const totalRevenueINR = clientProjects.reduce(
      (acc, pe) => acc + calculateRevenue(pe, pe.project_id, client.currency || "INR"),
      0
    );
    const totalProfitINR = clientProjects.reduce(
      (acc, pe) => acc + calculateProfit(pe, pe.project_id, client.currency || "INR"),
      0
    );
    return {
      ...client,
      total_projects: new Set(clientProjects.map((pe) => pe.project_id)).size,
      revenue_inr: totalRevenueINR,
      revenue_usd: totalRevenueINR / EXCHANGE_RATE_USD_TO_INR,
      profit_inr: totalProfitINR,
      profit_usd: totalProfitINR / EXCHANGE_RATE_USD_TO_INR,
    };
  }) || [];

  // Calculate Overall Stats
  const totalClients = clientFinancials.length;
  const activeClients = clientFinancials.filter((client) => client.status === "active").length;
  const inactiveClients = clientFinancials.filter((client) => client.status === "inactive").length;
  const totalProjects = clientFinancials.reduce((acc, c) => acc + c.total_projects, 0) || 0;
  const totalRevenueINR = clientFinancials.reduce((acc, c) => acc + c.revenue_inr, 0) || 0;
  const totalProfitINR = clientFinancials.reduce((acc, c) => acc + c.profit_inr, 0) || 0;
  const totalRevenueUSD = totalRevenueINR / EXCHANGE_RATE_USD_TO_INR;
  const totalProfitUSD = totalProfitINR / EXCHANGE_RATE_USD_TO_INR;

  if (isLoading) {
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
              Project Management
            </h1>
            <p className="text-gray-500 text-sm md:text-base mt-2">
              Manage and track all project activities
            </p>
          </div>
          {/* <Button
            onClick={() => setAddClientOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200"
          >
            <Plus size={16} />
            <span>Create New Client</span>
          </Button> */}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Total Clients</p>
                <h3 className="text-2xl font-bold text-gray-800">{totalClients}</h3>
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
                <h3 className="text-2xl font-bold text-gray-800">{activeClients}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {totalClients ? Math.round((activeClients / totalClients) * 100) : 0}% of total
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
                <h3 className="text-2xl font-bold text-gray-800">{inactiveClients}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {totalClients ? Math.round((inactiveClients / totalClients) * 100) : 0}% of total
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
                <h3 className="text-2xl font-bold text-gray-800">{totalProjects}</h3>
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
                <h3 className="text-2xl font-bold text-gray-800">₹ {totalRevenueINR.toLocaleString()}</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <p className="text-xs text-gray-500 mt-1">
                        ${totalRevenueUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
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
                <h3 className="text-2xl font-bold text-gray-800">₹ {totalProfitINR.toLocaleString()}</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <p className="text-xs text-gray-500 mt-1">
                        ${totalProfitUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
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
            dataKey="display_name"
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
          <Tooltip
  contentStyle={{
    backgroundColor: "#fff",
    border: "1px solid oklch(62.7% 0.265 303.9)",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  }}
  formatter={(value, name) => {
    const val = Number(value);
    if (name === "Revenue" || name === "Profit") {
      const usd = val / EXCHANGE_RATE_USD_TO_INR;
      return [
        `₹${val.toLocaleString()} ($${usd.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })})`,
        name,
      ];
    }
    // For Projects
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
            { name: "Revenue", value: totalRevenueINR, fill: "#7B43F1" },
            { name: "Profit", value: totalProfitINR, fill: "#A74BC8" },
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

        {/* Table Section */}
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl rounded-2xl">
          <CardContent className="p-6">
            <ClientTable clientFinancials={clientFinancials} setAddClientOpen={setAddClientOpen} />
          </CardContent>
        </Card>
      </main>

      {/* Add Client Dialog */}
      <AddClientDialog open={addClientOpen} onOpenChange={setAddClientOpen} />
    </div>
  );
};

export default ClientManagement;