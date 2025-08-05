"use client"

import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Loader2 } from "lucide-react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Define interfaces for data
interface RevenueExpenseData {
  month: string;
  revenue: number;
  expense: number;
}

interface Props {
  projectId: string;
}

const RevenueExpenseChart: React.FC<Props> = ({ projectId }) => {
  const [revenueExpenseData, setRevenueExpenseData] = useState<RevenueExpenseData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevenueExpenseData = async () => {
      setIsLoading(true);
      try {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyData: RevenueExpenseData[] = months.map((month) => ({
          month,
          revenue: 0,
          expense: 0,
        }));

        // Fetch employees data for the specific project
        const { data: employeesData, error: employeesError } = await supabase
          .from("hr_project_employees")
          .select(`
            id,
            assign_employee,
            project_id,
            salary,
            client_billing,
            billing_type,
            salary_type,
            salary_currency,
            start_date,
            end_date,
            hr_employees!hr_project_employees_assign_employee_fkey(first_name, last_name, salary_type),
            hr_projects!hr_project_employees_project_id_fkey(id, client_id)
          `)
          .eq("project_id", projectId);

        if (employeesError) {
          console.error("Supabase query error (hr_project_employees):", employeesError);
          throw new Error(`Error fetching employees data: ${employeesError.message}`);
        }

        // Fetch time logs for the current year
        const currentYear = new Date().getFullYear();
        const { data: timeLogsData, error: timeLogsError } = await supabase
          .from("time_logs")
          .select("id, employee_id, date, project_time_data, total_working_hours")
          .eq("is_approved", true)
          .gte("date", `${currentYear}-01-01`)
          .lte("date", `${currentYear}-12-31`);

        if (timeLogsError) {
          console.error("Supabase query error (time_logs):", timeLogsError);
          throw new Error(`Error fetching time logs: ${timeLogsError.message}`);
        }

        // Fetch clients to get currency information
        const { data: clientsData, error: clientsError } = await supabase
          .from("hr_clients")
          .select("id, currency");

        if (clientsError) {
          console.error("Supabase query error (hr_clients):", clientsError);
          throw new Error(`Error fetching clients data: ${clientsError.message}`);
        }

        // Process employees data for revenue and expense
        const USD_TO_INR_RATE = 84;
        employeesData?.forEach((employee) => {
          const client = clientsData?.find((c) => c.id === employee.hr_projects?.client_id);
          const currency = client?.currency || "INR";
          let clientBilling = employee.client_billing || 0;
          let salary = employee.salary || 0;

          if (currency === "USD") {
            clientBilling *= USD_TO_INR_RATE;
            salary *= USD_TO_INR_RATE;
          }

          // Convert billing to hourly rate
          let hourlyRate = clientBilling;
          if (employee.billing_type === "Monthly") {
            hourlyRate = (clientBilling * 12) / (365 * 8);
          } else if (employee.billing_type === "LPA") {
            hourlyRate = clientBilling / (365 * 8);
          }

          // Convert salary to hourly rate
          let hourlySalary = salary;
          const salaryType = employee.salary_type || "LPA";
          if (salaryType === "Monthly") {
            hourlySalary = (salary * 12) / (365 * 8);
          } else if (salaryType === "LPA") {
            hourlySalary = salary / (365 * 8);
          }

          // Calculate total hours per month
          const relevantTimeLogs = timeLogsData?.filter((log) =>
            log.project_time_data?.projects?.some((proj) => proj.projectId === projectId && log.employee_id === employee.assign_employee)
          ) || [];

          relevantTimeLogs.forEach((log) => {
            const date = new Date(log.date);
            const monthIndex = date.getMonth();
            const projectEntry = log.project_time_data?.projects?.find((proj) => proj.projectId === projectId);
            const hours = projectEntry?.hours || 0;

            monthlyData[monthIndex].revenue += hours * hourlyRate;
            monthlyData[monthIndex].expense += hours * hourlySalary;
          });
        });

        setRevenueExpenseData(monthlyData);
        setErrorMessage(null);
      } catch (err) {
        console.error("Error fetching revenue/expense data:", err);
        setErrorMessage("Error fetching data. Check the console for details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRevenueExpenseData();
  }, [projectId]);

  // Format numbers for display
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);

  // Calculate totals for display
  const totalRevenue = revenueExpenseData.reduce((sum, data) => sum + data.revenue, 0);
  const totalExpense = revenueExpenseData.reduce((sum, data) => sum + data.expense, 0);

  // Helper function to create revenue gradient
  const createRevenueGradient = (context: any) => {
    const chart = context.chart;
    const { ctx, chartArea } = chart;

    if (!chartArea) {
      return null;
    }

    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, "#9333ea");
    gradient.addColorStop(1, "#6366f1");
    return gradient;
  };

  // Helper function to create expense gradient
  const createExpenseGradient = (context: any) => {
    const chart = context.chart;
    const { ctx, chartArea } = chart;

    if (!chartArea) {
      return null;
    }

    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, "#eab308");
    gradient.addColorStop(1, "#facc15");
    return gradient;
  };

  // Chart.js data and options for Revenue chart
  const revenueChartData = {
    labels: revenueExpenseData.map((data) => data.month),
    datasets: [
      {
        label: "Revenue",
        data: revenueExpenseData.map((data) => data.revenue),
        backgroundColor: createRevenueGradient,
        hoverBackgroundColor: createRevenueGradient,
        borderWidth: 0,
        borderRadius: 12,
      },
    ],
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: "#000000",
          font: {
            size: 12,
            weight: "600" as const,
          },
        },
      },
      y: {
        display: false,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(99, 102, 241, 0.9)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#6366f1",
        borderWidth: 2,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `Revenue: ₹${context.parsed.y.toLocaleString("en-IN")}`,
        },
      },
    },
  };

  // Chart.js data and options for Expense chart
  const expenseChartData = {
    labels: revenueExpenseData.map((data) => data.month),
    datasets: [
      {
        label: "Expenses",
        data: revenueExpenseData.map((data) => data.expense),
        backgroundColor: createExpenseGradient,
        hoverBackgroundColor: createExpenseGradient,
        borderWidth: 0,
        borderRadius: 12,
      },
    ],
  };

  const expenseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: "#000000",
          font: {
            size: 12,
            weight: "600" as const,
          },
        },
      },
      y: {
        display: false,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(250, 204, 21, 0.9)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#facc15",
        borderWidth: 2,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `Expenses: ₹${context.parsed.y.toLocaleString("en-IN")}`,
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Card */}
      <Card className="shadow-xl h-[350px] border-none bg-white text-gray-900 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
        <CardHeader className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-4 h-4 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50"></div>
              Revenue
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-indigo-600">{formatCurrency(totalRevenue)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : errorMessage ? (
            <p className="text-red-500 text-center font-medium">{errorMessage}</p>
          ) : (
            <div className="h-[200px]">
              <Bar data={revenueChartData} options={revenueChartOptions} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Card */}
      <Card className="shadow-xl border-none bg-white text-gray-900 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
        <CardHeader className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/50"></div>
              Profit
            </CardTitle>
            <span className="text-lg font-bold text-yellow-600">{formatCurrency(totalExpense)}</span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
            </div>
          ) : errorMessage ? (
            <p className="text-red-500 text-center font-medium">{errorMessage}</p>
          ) : (
            <div className="h-[200px]">
              <Bar data={expenseChartData} options={expenseChartOptions} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueExpenseChart;