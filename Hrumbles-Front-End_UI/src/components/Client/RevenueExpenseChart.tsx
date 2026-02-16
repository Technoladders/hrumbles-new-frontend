"use client";
 
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Loader2 } from "lucide-react";
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { eachDayOfInterval, startOfMonth, startOfYear, getDaysInMonth, isSunday, isWeekend } from "date-fns";
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
 
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
  working_days_config?: "all_days" | "weekdays_only" | "saturday_working";
  hr_employees?: {
    first_name: string;
    last_name: string;
  };
}
 
interface Props {
  projectId: string; // Added for context if needed later
  assignEmployee: AssignEmployee[];
  calculationMode: "accrual" | "actual";
}
 
// --- CONSTANTS ---
const EMPLOYEE_COLORS = [
  "#7B43F1", // Purple
  "#F97316", // Orange
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#8B5CF6", // Violet
  "#EF4444", // Red
];

// --- HELPER FUNCTIONS ---
const countWorkingDays = (
  startDate: Date,
  endDate: Date,
  config: "all_days" | "weekdays_only" | "saturday_working" = "all_days"
): number => {
  if (!startDate || !endDate || startDate > endDate) return 0;
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  switch (config) {
    case "weekdays_only":
      return days.filter((day) => !isWeekend(day)).length;
    case "saturday_working":
      return days.filter((day) => !isSunday(day)).length;
    default:
      return days.length;
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

// --- CUSTOM TOOLTIP COMPONENT ---
const CustomTooltip = ({
  active,
  payload,
  label,
  employees,
}: TooltipProps<ValueType, NameType> & { employees: AssignEmployee[] }) => {
  if (active && payload && payload.length) {
    // Extract totals from the payload (usually the Area chart carries the total Profit)
    // However, our data structure has the totals in the root object.
    const data = payload[0].payload;
    
    return (
      <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-xl text-sm min-w-[250px]">
        <p className="font-bold text-gray-700 mb-2 border-b pb-1">{label}</p>
        
        {/* Overall Stats */}
        <div className="flex justify-between items-center mb-1">
          <span className="font-semibold text-gray-600">Total Revenue:</span>
          <span className="text-gray-900 font-bold">{formatCurrency(data.totalRevenue)}</span>
        </div>
        <div className="flex justify-between items-center mb-3">
          <span className="font-semibold text-indigo-600">Total Profit:</span>
          <span className="text-indigo-600 font-bold">{formatCurrency(data.totalProfit)}</span>
        </div>

        {/* Employee Breakdown */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Employee Contributions
          </p>
          {employees.map((emp, index) => {
            const revKey = `revenue_${emp.id}`;
            const profKey = `profit_${emp.id}`;
            const empRevenue = data[revKey] || 0;
            const empProfit = data[profKey] || 0;

            if (empRevenue === 0 && empProfit === 0) return null;

            const color = EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length];
            const name = emp.hr_employees 
              ? `${emp.hr_employees.first_name} ${emp.hr_employees.last_name}`
              : "Unknown";

            return (
              <div key={emp.id} className="flex flex-col border-b border-gray-50 last:border-0 py-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: color }} 
                    />
                    <span className="text-gray-600">{name}</span>
                  </div>
                  <span className="font-medium text-gray-800">{formatCurrency(empRevenue)}</span>
                </div>
                <div className="flex justify-end text-[10px] text-gray-400">
                   Profit: {formatCurrency(empProfit)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};
 
const RevenueExpenseChart: React.FC<Props> = ({ assignEmployee, calculationMode }) => {
 
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

    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    
    // Initialize structure: { name: 'Jan', totalRevenue: 0, totalProfit: 0, revenue_emp1: 0, profit_emp1: 0, ... }
    const processedData = months.map((monthName) => ({
      name: monthName,
      totalRevenue: 0,
      totalProfit: 0,
      // Dynamic keys will be added below
      ...assignEmployee.reduce((acc, emp) => ({
        ...acc, 
        [`revenue_${emp.id}`]: 0, 
        [`profit_${emp.id}`]: 0 
      }), {})
    }));

    const USD_TO_INR_RATE = 84;

    assignEmployee.forEach((employee) => {
      const startDate = new Date(employee.start_date);
      const endDate = new Date(employee.end_date);
      if (startDate > endDate) return;

      const config = employee.working_days_config || "all_days";
      const workingHoursPerDay = employee.working_hours || 8;

      const client = clientsData.find((c) => c.id === employee.client_id);
      let clientBilling = employee.client_billing || 0;
      if (client?.currency === "USD") clientBilling *= USD_TO_INR_RATE;

      let salary = employee.salary || 0;
      if (employee.salary_currency === "USD") salary *= USD_TO_INR_RATE;

      let dailyRevenue = 0;
      switch (employee.billing_type) {
        case "Monthly":
          const workingDaysInBillingMonth = countWorkingDays(
            startOfMonth(startDate),
            new Date(startDate).setDate(getDaysInMonth(startDate)),
            config
          );
          dailyRevenue = clientBilling / (workingDaysInBillingMonth || 1);
          break;
        case "LPA":
          const workingDaysInBillingYear = countWorkingDays(
            startOfYear(startDate),
            new Date(startDate).setMonth(11, 31),
            config
          );
          dailyRevenue = clientBilling / (workingDaysInBillingYear || 1);
          break;
        case "Hourly":
          dailyRevenue = clientBilling * workingHoursPerDay;
          break;
      }

      let dailyExpense = 0;
      switch (employee.salary_type) {
        case "Monthly":
          const workingDaysInSalaryMonth = countWorkingDays(
            startOfMonth(startDate),
            new Date(startDate).setDate(getDaysInMonth(startDate)),
            config
          );
          dailyExpense = salary / (workingDaysInSalaryMonth || 1);
          break;
        case "LPA":
          const workingDaysInSalaryYear = countWorkingDays(
            startOfYear(startDate),
            new Date(startDate).setMonth(11, 31),
            config
          );
          dailyExpense = salary / (workingDaysInSalaryYear || 1);
          break;
        case "Hourly":
          dailyExpense = salary * workingHoursPerDay;
          break;
      }

      const interval = eachDayOfInterval({ start: startDate, end: endDate });
      interval.forEach((day) => {
        const dayOfWeek = day.getDay();
        const isWorkingDay =
          config === "all_days" ||
          (config === "weekdays_only" && dayOfWeek > 0 && dayOfWeek < 6) ||
          (config === "saturday_working" && dayOfWeek > 0);

        if (isWorkingDay) {
          const monthIndex = day.getMonth(); // 0 = Jan
          
          // Add to employee specific data
          // @ts-ignore - dynamic key access
          processedData[monthIndex][`revenue_${employee.id}`] += dailyRevenue;
          // @ts-ignore
          processedData[monthIndex][`profit_${employee.id}`] += (dailyRevenue - dailyExpense);

          // Add to Totals
          processedData[monthIndex].totalRevenue += dailyRevenue;
          processedData[monthIndex].totalProfit += (dailyRevenue - dailyExpense);
        }
      });
    });

    return processedData;
  }, [assignEmployee, clientsData]); // Add timeLogs here if using actual
 
  const isLoading = isLoadingClients;

  console.log("Monthly Revenue & Profit data for chart:", monthlyData);
 
 return (
    <Card className="shadow-xl border-none bg-white h-full">
      <CardHeader>
        <CardTitle className="text-lg font-bold">
          Monthly Revenue vs. Profit ({calculationMode === 'accrual' ? 'Accrual' : 'Actual'})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[250px]">
            <Loader2 className="animate-spin text-indigo-500" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7235DD" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#7235DD" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#7235DD" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: "#6B7280" }} 
                axisLine={false} 
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="#6B7280"
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }} 
              />
              {/* Optional Right YAxis for Profit if scales are vastly different */}
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                hide 
              />

              <RechartsTooltip content={<CustomTooltip employees={assignEmployee} />} />
              <Legend wrapperStyle={{ paddingTop: "20px" }} />

              {/* 
                Render a Bar for EACH employee. 
                using stackId="revenue" makes them stack on top of each other.
              */}
              {assignEmployee.map((emp, index) => {
                 const name = emp.hr_employees 
                 ? `${emp.hr_employees.first_name} ${emp.hr_employees.last_name}`
                 : "Unknown";

                 return (
                  <Bar
                    key={emp.id}
                    yAxisId="left"
                    dataKey={`revenue_${emp.id}`}
                    name={name} // This shows in the legend
                    stackId="revenue"
                    fill={EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length]}
                    radius={[0, 0, 0, 0]} // Square corners for middle of stack
                  />
                 )
              })}

              {/* Total Profit Area Overlay */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="totalProfit"
                name="Total Profit"
                stroke="#7235DD"
                strokeWidth={3}
                fill="url(#profitGradient)"
              />

            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
 
export default RevenueExpenseChart;