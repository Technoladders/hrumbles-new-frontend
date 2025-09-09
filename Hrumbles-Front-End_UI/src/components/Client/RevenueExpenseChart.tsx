// RevenueExpenseChart.tsx

"use client"

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Loader2 } from "lucide-react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { eachDayOfInterval, startOfMonth, startOfYear, getDaysInMonth, isSunday, isWeekend } from "date-fns";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// CHANGE: `TimeLog` interface is no longer needed here.
// interface TimeLog { ... }

// Updated interface to match parent component
interface AssignEmployee {
  id: string;
  assign_employee: string;
  project_id: string;
  client_id: string;
  start_date: string;
  end_date: string;
  salary: number;
  client_billing: number;
  billing_type?: string;
  salary_type?: string;
  salary_currency?: string;
  working_hours?: number;
  working_days_config?: 'all_days' | 'weekdays_only' | 'saturday_working';
}

interface Props {
  projectId: string;
  assignEmployee: AssignEmployee[];
  // CHANGE: `calculationMode` is kept for consistency, but `timeLogs` is removed.
  calculationMode: "accrual"; // This component now only serves accrual mode
}

// Helper function to count working days
const countWorkingDays = (
  startDate: Date,
  endDate: Date,
  config: 'all_days' | 'weekdays_only' | 'saturday_working' = 'all_days'
): number => {
  if (!startDate || !endDate || startDate > endDate) return 0;
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  switch (config) {
    case 'weekdays_only': return days.filter(day => !isWeekend(day)).length;
    case 'saturday_working': return days.filter(day => !isSunday(day)).length;
    case 'all_days': default: return days.length;
  }
};

const RevenueExpenseChart: React.FC<Props> = ({ projectId, assignEmployee, calculationMode }) => {

  const { data: clientsData, isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients_for_chart"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_clients").select("id, currency");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { monthlyData } = useMemo(() => {
    if (!clientsData) return { monthlyData: [] };

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const processedData = months.map(month => ({ month, revenue: 0, expense: 0 }));
    const USD_TO_INR_RATE = 84;

    // --- ACCRUAL CALCULATION LOGIC ---
    assignEmployee.forEach((employee) => {
      const startDate = new Date(employee.start_date);
      const endDate = new Date(employee.end_date);
      if (startDate > endDate) return;

      const config = employee.working_days_config || 'all_days';
      const workingHoursPerDay = employee.working_hours || 8;

      const client = clientsData.find(c => c.id === employee.client_id);
      let clientBilling = employee.client_billing || 0;
      if (client?.currency === "USD") clientBilling *= USD_TO_INR_RATE;

      let salary = employee.salary || 0;
      if (employee.salary_currency === "USD") salary *= USD_TO_INR_RATE;

      let dailyRevenue = 0;
      switch (employee.billing_type) {
        case "Monthly":
          const workingDaysInBillingMonth = countWorkingDays(startOfMonth(startDate), new Date(startDate).setDate(getDaysInMonth(startDate)), config);
          dailyRevenue = clientBilling / (workingDaysInBillingMonth || 1);
          break;
        case "LPA":
          const workingDaysInBillingYear = countWorkingDays(startOfYear(startDate), new Date(startDate).setMonth(11, 31), config);
          dailyRevenue = clientBilling / (workingDaysInBillingYear || 1);
          break;
        case "Hourly":
          dailyRevenue = clientBilling * workingHoursPerDay;
          break;
      }

      let dailyExpense = 0;
      switch (employee.salary_type) {
        case "Monthly":
          const workingDaysInSalaryMonth = countWorkingDays(startOfMonth(startDate), new Date(startDate).setDate(getDaysInMonth(startDate)), config);
          dailyExpense = salary / (workingDaysInSalaryMonth || 1);
          break;
        case "LPA":
          const workingDaysInSalaryYear = countWorkingDays(startOfYear(startDate), new Date(startDate).setMonth(11, 31), config);
          dailyExpense = salary / (workingDaysInSalaryYear || 1);
          break;
        case "Hourly":
          dailyExpense = salary * workingHoursPerDay;
          break;
      }

      const interval = eachDayOfInterval({ start: startDate, end: endDate });
      interval.forEach(day => {
        // Only add cost/revenue for the configured working days
        const dayOfWeek = day.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const isWorkingDay = (config === 'all_days') ||
                             (config === 'weekdays_only' && dayOfWeek > 0 && dayOfWeek < 6) ||
                             (config === 'saturday_working' && dayOfWeek > 0);
        
        if (isWorkingDay) {
          const monthIndex = day.getMonth();
          processedData[monthIndex].revenue += dailyRevenue;
          processedData[monthIndex].expense += dailyExpense;
        }
      });
    });

    const finalData = processedData.map(data => ({
      ...data,
      profit: data.revenue - data.expense,
    }));

    return { monthlyData: finalData };

  // CHANGE: Simplified useMemo dependencies
  }, [assignEmployee, clientsData]);

  // ... (The rest of the component remains the same: isLoading, formatCurrency, chart data, chart options, and JSX)
  const isLoading = isLoadingClients;

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
  const totalRevenue = monthlyData.reduce((sum, data) => sum + data.revenue, 0);
  const totalProfit = monthlyData.reduce((sum, data) => sum + data.profit, 0);

  const createGradient = (context: any, colorStops: { offset: number; color: string }[]) => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return null;
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    colorStops.forEach(stop => gradient.addColorStop(stop.offset, stop.color));
    return gradient;
  };

  const revenueChartData = {
    labels: monthlyData.map((data) => data.month),
    datasets: [{
        label: "Revenue",
        data: monthlyData.map((data) => data.revenue),
        backgroundColor: (context: any) => createGradient(context, [{ offset: 0, color: "#9333ea" }, { offset: 1, color: "#6366f1" }]),
        borderRadius: 8,
    }],
  };
  
  const profitChartData = {
    labels: monthlyData.map((data) => data.month),
    datasets: [{
      label: "Profit",
      data: monthlyData.map((data) => data.profit),
      backgroundColor: (context: any) => createGradient(context, [{ offset: 0, color: "#eab308" }, { offset: 1, color: "#facc15" }]),
      borderRadius: 8,
    }],
  };

  const chartOptions = (type: 'Revenue' | 'Profit') => ({
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
        backgroundColor: "rgba(22, 22, 21, 0.9)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#fffffeff",
        borderWidth: 2,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
        },
      },
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Revenue</CardTitle>
          <span className="text-lg font-bold text-indigo-600">{formatCurrency(totalRevenue)}</span>
        </CardHeader>
        <CardContent>
          {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 
           <div className="h-[250px]"><Bar data={revenueChartData} options={chartOptions('Revenue')} /></div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Profit</CardTitle>
          <span className="text-lg font-bold text-yellow-600">{formatCurrency(totalProfit)}</span>
        </CardHeader>
        <CardContent>
          {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 
           <div className="h-[250px]"><Bar data={profitChartData} options={chartOptions('Profit')} /></div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueExpenseChart;