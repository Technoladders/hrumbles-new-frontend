"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import supabase from "../../config/supabaseClient";
import { useSelector } from "react-redux";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Loader2 } from "lucide-react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { startOfMonth, endOfMonth, isWithinInterval, eachMonthOfInterval, format } from "date-fns";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TimeLog {
  id: string;
  employee_id: string;
  date: string;
  project_time_data: {
    projects: { hours: number; report: string; clientId: string; projectId: string }[];
  };
  total_working_hours: string;
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

interface Client {
  id: string;
  currency: string;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
  key: string;
}

interface RevenueExpenseData {
  month: string;
  revenue: number;
  expense: number;
}

interface Props {
  dateRange: DateRange;
  dataType: "revenue" | "profit";
}

const EXCHANGE_RATE_USD_TO_INR = 84;

const getFinancialYear = (endDate: Date) => {
  const year = endDate.getMonth() < 3 ? endDate.getFullYear() - 1 : endDate.getFullYear();
  const startDate = new Date(year, 3, 1); // April 1
  const endDateFY = new Date(year + 1, 2, 31, 23, 59, 59, 999); // March 31
  return { startDate, endDate: endDateFY, year };
};

const ClientRevenueExpenseChart: React.FC<Props> = ({ dateRange, dataType }) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [revenueExpenseData, setRevenueExpenseData] = useState<RevenueExpenseData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { startDate: financialYearStart, endDate: financialYearEnd, year: financialYear } = getFinancialYear(dateRange.endDate);

  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ["clients", organization_id],
    queryFn: async () => {
      if (!organization_id) throw new Error("Organization ID is missing");
      const { data, error } = await supabase
        .from("hr_clients")
        .select("id, currency")
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization_id,
  });

  const { data: projectEmployees, isLoading: loadingEmployees } = useQuery({
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
          salary_currency
        `)
        .eq("organization_id", organization_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization_id,
  });

  const { data: chartTimeLogs, isLoading: loadingChartTimeLogs } = useQuery({
    queryKey: ["chart_time_logs", organization_id, financialYearStart, financialYearEnd],
    queryFn: async () => {
      if (!organization_id) throw new Error("Organization ID is missing");
      const { data, error } = await supabase
        .from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
        .eq("is_approved", true)
        .eq("organization_id", organization_id)
        .gte("date", financialYearStart.toISOString())
        .lte("date", financialYearEnd.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization_id,
  });

  // Memoize the computed revenue/expense data to avoid recalculating unless dependencies change
  const computedRevenueExpenseData = useMemo(() => {
    if (!clients || !projectEmployees || !chartTimeLogs) return [];

    const months = eachMonthOfInterval({ start: financialYearStart, end: financialYearEnd });
    const monthlyData: RevenueExpenseData[] = months.map((month, index) => ({
      month: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"][index],
      revenue: 0,
      expense: 0,
    }));

    const employeesData = projectEmployees || [];
    employeesData.forEach((employee) => {
      const clientCurrency = clients?.find((client: Client) => client.id === employee.client_id)?.currency || "INR";
      let clientBilling = Number(employee.client_billing) || 0;
      let salary = Number(employee.salary) || 0;

      if (clientCurrency === "USD") {
        clientBilling *= EXCHANGE_RATE_USD_TO_INR;
        salary *= EXCHANGE_RATE_USD_TO_INR;
      }

      let hourlyRate = clientBilling;
      if (employee.billing_type === "Monthly") {
        hourlyRate = (clientBilling * 12) / (365 * 8);
      } else if (employee.billing_type === "LPA") {
        hourlyRate = clientBilling / (365 * 8);
      }

      let hourlySalary = salary;
      const salaryType = employee.salary_type || "LPA";
      if (salaryType === "Monthly") {
        hourlySalary = (salary * 12) / (365 * 8);
      } else if (salaryType === "LPA") {
        hourlySalary = salary / (365 * 8);
      }

      const relevantTimeLogs = chartTimeLogs?.filter((log) =>
        isWithinInterval(new Date(log.date), {
          start: financialYearStart,
          end: financialYearEnd,
        })
      ) || [];

      relevantTimeLogs.forEach((log) => {
        const date = new Date(log.date);
        const monthIndex = (date.getMonth() + 9) % 12; // Adjust for April (3) to March (2)
        const projectEntry = log.project_time_data?.projects?.find(
          (proj) => proj.projectId === employee.project_id
        );
        const hours = projectEntry?.hours || 0;

        monthlyData[monthIndex].revenue += hours * hourlyRate;
        monthlyData[monthIndex].expense += hours * hourlySalary;
      });
    });

    return monthlyData;
  }, [clients, projectEmployees, chartTimeLogs, financialYearStart, financialYearEnd]);

  useEffect(() => {
    if (clients && projectEmployees && chartTimeLogs) {
      setIsLoading(true);
      try {
        // Only update state if data has changed
        setRevenueExpenseData((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(computedRevenueExpenseData)) {
            return prev;
          }
          return computedRevenueExpenseData;
        });
        setErrorMessage(null);
      } catch (err) {
        console.error("Error processing revenue/expense data:", err);
        setErrorMessage("Error processing data. Check the console for details.");
      } finally {
        setIsLoading(false);
      }
    }
  }, [computedRevenueExpenseData]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);

  const totalRevenue = revenueExpenseData.reduce((sum, data) => sum + data.revenue, 0);
  const totalProfit = revenueExpenseData.reduce((sum, data) => sum + data.expense, 0);

  const createGradient = (context: any, startColor: string, endColor: string) => {
    const chart = context.chart;
    const { ctx, chartArea } = chart;
    if (!chartArea) return null;
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    return gradient;
  };

  const chartData = {
    labels: revenueExpenseData.map((data) => data.month),
    datasets: [
      {
        label: dataType === "revenue" ? "Revenue" : "Profit",
        data: revenueExpenseData.map((data) => (dataType === "revenue" ? data.revenue : data.expense)),
        backgroundColor: (context: any) =>
          createGradient(context, dataType === "revenue" ? "#9333ea" : "#eab308", dataType === "revenue" ? "#6366f1" : "#facc15"),
        hoverBackgroundColor: (context: any) =>
          createGradient(context, dataType === "revenue" ? "#9333ea" : "#eab308", dataType === "revenue" ? "#6366f1" : "#facc15"),
        borderWidth: 0,
        borderRadius: 12,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: { color: "#000000", font: { size: 12, weight: "600" as const } },
      },
      y: { display: false },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: dataType === "revenue" ? "rgba(99, 102, 241, 0.9)" : "rgba(250, 204, 21, 0.9)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: dataType === "revenue" ? "#6366f1" : "#facc15",
        borderWidth: 2,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `${dataType === "revenue" ? "Revenue" : "Profit"}: ₹${context.parsed.y.toLocaleString("en-IN")}`,
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="shadow-xl h-[300px] border-none bg-white text-gray-900 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
        <CardHeader className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg md:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className={`w-4 h-4 ${dataType === "revenue" ? "bg-indigo-500" : "bg-yellow-500"} rounded-full shadow-lg ${dataType === "revenue" ? "shadow-indigo-500/50" : "shadow-yellow-500/50"}`}></div>
              {dataType === "revenue" ? "Revenue" : "Profit"} ({financialYear}-{financialYear + 1})
            </CardTitle>
            <span className={`text-lg font-bold ${dataType === "revenue" ? "text-indigo-600" : "text-yellow-600"}`}>
              {formatCurrency(dataType === "revenue" ? totalRevenue : totalProfit)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading || loadingClients || loadingEmployees || loadingChartTimeLogs ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className={`h-8 w-8 animate-spin ${dataType === "revenue" ? "text-indigo-500" : "text-yellow-500"}`} />
            </div>
          ) : errorMessage ? (
            <p className="text-red-500 text-center font-medium">{errorMessage}</p>
          ) : (
            <div className="h-[190px]">
              <Bar data={chartData} options={chartOptions} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientRevenueExpenseChart;

// Revenue profit correction