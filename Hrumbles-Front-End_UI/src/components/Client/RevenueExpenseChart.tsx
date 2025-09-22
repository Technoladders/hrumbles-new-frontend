"use client";
 
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Loader2 } from "lucide-react";
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { eachDayOfInterval, startOfMonth, startOfYear, getDaysInMonth, isSunday, isWeekend } from "date-fns";
 
// --- INTERFACES ---
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
  assignEmployee: AssignEmployee[];
}
 
// Helper function to count working days
const countWorkingDays = (startDate: Date, endDate: Date, config: 'all_days' | 'weekdays_only' | 'saturday_working' = 'all_days'): number => {
  if (!startDate || !endDate || startDate > endDate) return 0;
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  switch (config) {
    case 'weekdays_only': return days.filter(day => !isWeekend(day)).length;
    case 'saturday_working': return days.filter(day => !isSunday(day)).length;
    default: return days.length;
  }
};
 
const RevenueExpenseChart: React.FC<Props> = ({ assignEmployee }) => {
 
  const { data: clientsData, isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients_for_chart"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_clients").select("id, currency");
      if (error) throw new Error(error.message);
      return data;
    },
  });
 
  const monthlyData = useMemo(() => {
    if (!clientsData || !assignEmployee) return [];
 
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const processedData = months.map(monthName => ({ name: monthName, revenue: 0, profit: 0 }));
    const USD_TO_INR_RATE = 84;
 
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
        const dayOfWeek = day.getDay();
        const isWorkingDay = (config === 'all_days') || (config === 'weekdays_only' && dayOfWeek > 0 && dayOfWeek < 6) || (config === 'saturday_working' && dayOfWeek > 0);
       
        if (isWorkingDay) {
          const monthIndex = day.getMonth();
          processedData[monthIndex].revenue += dailyRevenue;
          const profit = dailyRevenue - dailyExpense;
          processedData[monthIndex].profit += profit;
        }
      });
    });
 
    return processedData;
  }, [assignEmployee, clientsData]);
 
  const isLoading = isLoadingClients;
 
  return (
  <Card className="shadow-xl border-none bg-white h-full">
  <CardHeader>
      <CardTitle className="text-lg font-bold">Monthly Revenue vs. Profit (Accrual)</CardTitle>
  </CardHeader>
  <CardContent>
      {isLoading ? (
        <div className="flex items-center justify-center h-[250px]">
          <Loader2 className="animate-spin text-indigo-500" />
        </div>
      ) : (
        <ResponsiveContainer width="90%" height={250}>
          <ComposedChart data={monthlyData}>
              {/* 1. DEFINE BOTH GRADIENTS HERE */}
              <defs>
                {/* Gradient for the Revenue bars (dark grey) */}
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#505050" stopOpacity={0.8} />
                  <stop offset="50%" stopColor="#505050" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#505050" stopOpacity={0.1} />
                </linearGradient>
 
                {/* Gradient for the Profit area (purple) */}
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7235DD" stopOpacity={0.8} />
                  <stop offset="50%" stopColor="#7235DD" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#7235DD" stopOpacity={0.1} />
                </linearGradient>
              </defs>
 
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" orientation="left" stroke="#505050" tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
              <YAxis yAxisId="right" orientation="right" stroke="#6912ffff" tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
              <RechartsTooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
              <Legend />
             
              {/* 2. UPDATE THE AREA COMPONENT TO USE THE PURPLE GRADIENT */}
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="profit"
                name="Profit"
                fill="url(#profitGradient)"
                stroke="#7235DD"
              />
 
              {/* Bar component is already correct from our last step */}
              <Bar
                yAxisId="left"
                dataKey="revenue"
                name="Revenue"
                fill="url(#revenueGradient)"
                radius={[4, 4, 0, 0]}
              />
          </ComposedChart>
        </ResponsiveContainer>
      )}
  </CardContent>
</Card>
  );
};
 
export default RevenueExpenseChart;