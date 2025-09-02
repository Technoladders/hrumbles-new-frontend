// RevenueExpenseChart.tsx

"use client"

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Loader2 } from "lucide-react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { eachDayOfInterval, addDays } from "date-fns";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Interfaces from parent
interface TimeLog {
  id: string;
  employee_id: string;
  date: string;
  project_time_data: { projects: { hours: number }[] };
}

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
}

interface Props {
  projectId: string;
  timeLogs: TimeLog[];
  assignEmployee: AssignEmployee[];
  calculationMode: "actual" | "accrual";
}

interface MonthlyData {
  month: string;
  revenue: number;
  profit: number;
}

const RevenueExpenseChart: React.FC<Props> = ({ projectId, timeLogs, assignEmployee, calculationMode }) => {

  const { data: clientsData, isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients_for_chart"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_clients").select("id, currency");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { monthlyData, errorMessage } = useMemo(() => {
    if (!clientsData) return { monthlyData: [], errorMessage: null };

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const processedData = months.map(month => ({ month, revenue: 0, expense: 0 }));
    const USD_TO_INR_RATE = 84;

    if (calculationMode === 'accrual') {
      // --- ACCRUAL CALCULATION LOGIC ---
      assignEmployee.forEach((employee) => {
        const startDate = new Date(employee.start_date);
        const endDate = new Date(employee.end_date);
        const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
        if (durationDays <= 0) return;

        const client = clientsData.find(c => c.id === employee.client_id);
        const clientCurrency = client?.currency || "INR";
        let clientBilling = employee.client_billing || 0;
        let salary = employee.salary || 0;

        // --- Calculate Total Accrual Revenue for employee ---
        let totalRevenue = 0;
        if (clientCurrency === "USD") clientBilling *= USD_TO_INR_RATE;
        
        switch (employee.billing_type) {
          case "Monthly": totalRevenue = (clientBilling / 30) * durationDays; break;
          case "Hourly": totalRevenue = clientBilling * 8 * durationDays; break;
          case "LPA": default: totalRevenue = (clientBilling / 365) * durationDays; break;
        }

        // --- Calculate Total Accrual Expense for employee ---
        let totalExpense = 0;
        if (employee.salary_currency === "USD") salary *= USD_TO_INR_RATE;

        switch (employee.salary_type) {
          case "Monthly": totalExpense = (salary / 30) * durationDays; break;
          case "Hourly": totalExpense = salary * 8 * durationDays; break;
          case "LPA": default: totalExpense = (salary / 365) * durationDays; break;
        }
        
        const dailyRevenue = totalRevenue / durationDays;
        const dailyExpense = totalExpense / durationDays;
        
        // Distribute daily amounts across the months
        const interval = eachDayOfInterval({ start: startDate, end: endDate });
        interval.forEach(day => {
          const monthIndex = day.getMonth();
          processedData[monthIndex].revenue += dailyRevenue;
          processedData[monthIndex].expense += dailyExpense;
        });
      });

    } else {
      // --- ACTUAL CALCULATION LOGIC ---
      assignEmployee.forEach((employee) => {
        const client = clientsData.find(c => c.id === employee.client_id);
        let clientBilling = employee.client_billing || 0;
        let salary = employee.salary || 0;
        
        if (client?.currency === 'USD') clientBilling *= USD_TO_INR_RATE;
        if (employee.salary_currency === 'USD') salary *= USD_TO_INR_RATE;

        let hourlyRate = clientBilling;
        if (employee.billing_type === "Monthly") hourlyRate = (clientBilling * 12) / (365 * 8);
        else if (employee.billing_type === "LPA") hourlyRate = clientBilling / (365 * 8);
        
        let hourlySalary = salary;
        if (employee.salary_type === "Monthly") hourlySalary = (salary / 30) / 8;
        else if (employee.salary_type === "LPA") hourlySalary = salary / (365 * 8);

        const relevantTimeLogs = timeLogs.filter(log => log.employee_id === employee.assign_employee);
        relevantTimeLogs.forEach(log => {
          const projectEntry = log.project_time_data?.projects?.find(p => p.projectId === projectId);
          if (projectEntry) {
            const monthIndex = new Date(log.date).getMonth();
            const hours = projectEntry.hours || 0;
            processedData[monthIndex].revenue += hours * hourlyRate;
            processedData[monthIndex].expense += hours * hourlySalary;
          }
        });
      });
    }

    const finalData = processedData.map(data => ({
      ...data,
      profit: data.revenue - data.expense,
    }));

    return { monthlyData: finalData, errorMessage: null };

  }, [projectId, timeLogs, assignEmployee, calculationMode, clientsData]);
  
  const isLoading = isLoadingClients;

  // ... (All formatting, total calculation, and chart options/data setup remain the same as the previous fix)

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
          label: (context: any) => `Expenses: ₹${context.parsed.y.toLocaleString("en-IN")}`,
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
           errorMessage ? <p className="text-red-500">{errorMessage}</p> : 
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
           errorMessage ? <p className="text-red-500">{errorMessage}</p> : 
           <div className="h-[250px]"><Bar data={profitChartData} options={chartOptions('Profit')} /></div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueExpenseChart;