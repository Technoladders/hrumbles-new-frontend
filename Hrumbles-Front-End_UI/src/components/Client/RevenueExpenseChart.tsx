// src/components/Client/RevenueExpenseChart.tsx
// Purple / Indigo / Pink theme — gradient bars per employee, gradient profit area
// ALL calculation logic UNCHANGED

"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  eachDayOfInterval, startOfMonth, startOfYear,
  getDaysInMonth, isSunday, isWeekend,
} from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AssignEmployee {
  id: string; assign_employee: string; project_id: string; client_id: string;
  start_date: string; end_date: string; salary: number; client_billing: number;
  billing_type?: string; salary_type?: string; salary_currency?: string;
  working_hours?: number;
  working_days_config?: "all_days" | "weekdays_only" | "saturday_working";
  hr_employees?: { first_name: string; last_name: string };
}
interface Props {
  projectId: string;
  assignEmployee: AssignEmployee[];
  calculationMode: "accrual" | "actual";
}

// ─── Purple / Indigo / Pink theme ─────────────────────────────────────────────
// Each entry = [gradientFrom, gradientTo] — all within the purple-pink-violet family
const EMP_GRAD_PAIRS: [string, string][] = [
  ["#7B43F1", "#6366F1"],  // violet → indigo
  ["#A855F7", "#9333EA"],  // purple → deep-purple
  ["#EC4899", "#DB2777"],  // pink → dark-pink
  ["#8B5CF6", "#7C3AED"],  // violet-light → violet-deep
  ["#C026D3", "#A21CAF"],  // fuchsia → dark-fuchsia
  ["#D946EF", "#C026D3"],  // magenta → fuchsia
  ["#6366F1", "#4F46E5"],  // indigo → indigo-dark
  ["#E879F9", "#D946EF"],  // light-pink → magenta
  ["#9333EA", "#7E22CE"],  // purple mid-tones
  ["#7E22CE", "#6B21A8"],
];
const EMP_COLORS = EMP_GRAD_PAIRS.map(p => p[0]);

// ─── Helpers (UNCHANGED) ─────────────────────────────────────────────────────
const countWorkingDays = (
  sd: Date, ed: Date,
  config: "all_days" | "weekdays_only" | "saturday_working" = "all_days"
): number => {
  if (!sd || !ed || sd > ed) return 0;
  const days = eachDayOfInterval({ start: sd, end: ed });
  switch (config) {
    case "weekdays_only": return days.filter(d => !isWeekend(d)).length;
    case "saturday_working": return days.filter(d => !isSunday(d)).length;
    default: return days.length;
  }
};

const fmtINR = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, employees }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div
      className="rounded-xl text-xs overflow-hidden min-w-[220px]"
      style={{
        background: "#fff",
        border: "1px solid rgba(139,92,246,0.2)",
        boxShadow: "0 8px 24px rgba(109,40,217,0.12)",
      }}
    >
      {/* Gradient header band */}
      <div
        className="px-3 py-2"
        style={{ background: "linear-gradient(135deg, #7B43F1, #6366F1)" }}
      >
        <p className="font-bold text-white">{label}</p>
      </div>

      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex justify-between items-center pb-1.5 border-b border-violet-50">
          <span className="text-gray-400 font-medium">Total Revenue</span>
          <span className="font-bold text-violet-700">{fmtINR(data.totalRevenue)}</span>
        </div>
        <div className="flex justify-between items-center pb-1.5 border-b border-pink-50">
          <span className="text-gray-400 font-medium">Total Profit</span>
          <span className="font-bold text-pink-600">{fmtINR(data.totalProfit)}</span>
        </div>

        {/* Per-employee breakdown */}
        {employees.map((emp: AssignEmployee, i: number) => {
          const rev = data[`revenue_${emp.id}`] || 0;
          const prof = data[`profit_${emp.id}`] || 0;
          if (!rev) return null;
          const name = emp.hr_employees
            ? `${emp.hr_employees.first_name} ${emp.hr_employees.last_name}`
            : "Unknown";
          return (
            <div key={emp.id} className="flex items-start justify-between pt-1">
              <div className="flex items-center gap-1.5 mt-0.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: EMP_COLORS[i % EMP_COLORS.length] }}
                />
                <span className="text-gray-600 max-w-[110px] truncate">{name}</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-800">{fmtINR(rev)}</p>
                {prof !== 0 && (
                  <p className={`text-[9px] ${prof >= 0 ? "text-violet-400" : "text-pink-500"}`}>
                    {prof >= 0 ? "+" : ""}{fmtINR(prof)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const RevenueExpenseChart: React.FC<Props> = ({ assignEmployee, calculationMode }) => {
  const { data: clientsData, isLoading } = useQuery({
    queryKey: ["clients_for_chart"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_clients").select("id, currency");
      if (error) throw error;
      return data;
    },
  });

  // ── UNCHANGED calculation logic ───────────────────────────────────────────
  const monthlyData = useMemo(() => {
    if (!clientsData || !assignEmployee) return [];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const processed = months.map(name => ({
      name,
      totalRevenue: 0,
      totalProfit: 0,
      ...assignEmployee.reduce((acc, emp) => ({
        ...acc,
        [`revenue_${emp.id}`]: 0,
        [`profit_${emp.id}`]: 0,
      }), {}),
    }));

    const USD_INR = 84;

    assignEmployee.forEach(emp => {
      const sdRaw = new Date(emp.start_date);
      const edRaw = new Date(emp.end_date);
      if (sdRaw > edRaw) return;
      const config = emp.working_days_config || "all_days";
      const wHPD = emp.working_hours || 8;
      const cl = clientsData.find(c => c.id === emp.client_id);
      let cb = emp.client_billing || 0;
      if (cl?.currency === "USD") cb *= USD_INR;
      let sal = emp.salary || 0;
      if (emp.salary_currency === "USD") sal *= USD_INR;

      // dailyRev
      let dailyRev = 0;
      const sdForBilling = new Date(emp.start_date);
      switch (emp.billing_type) {
        case "Monthly":
          dailyRev = cb / (countWorkingDays(startOfMonth(sdForBilling), new Date(sdForBilling.setDate(getDaysInMonth(sdForBilling))), config) || 1);
          break;
        case "LPA":
          dailyRev = cb / (countWorkingDays(startOfYear(new Date(emp.start_date)), new Date(new Date(emp.start_date).setMonth(11, 31)), config) || 1);
          break;
        case "Hourly":
          dailyRev = cb * wHPD;
          break;
      }

      // dailyExp
      let dailyExp = 0;
      const sdForSal = new Date(emp.start_date);
      switch (emp.salary_type) {
        case "Monthly":
          dailyExp = sal / (countWorkingDays(startOfMonth(sdForSal), new Date(sdForSal.setDate(getDaysInMonth(sdForSal))), config) || 1);
          break;
        case "LPA":
          dailyExp = sal / (countWorkingDays(startOfYear(new Date(emp.start_date)), new Date(new Date(emp.start_date).setMonth(11, 31)), config) || 1);
          break;
        case "Hourly":
          dailyExp = sal * wHPD;
          break;
      }

      eachDayOfInterval({ start: new Date(emp.start_date), end: new Date(emp.end_date) }).forEach(day => {
        const dow = day.getDay();
        const isWork =
          config === "all_days" ||
          (config === "weekdays_only" && dow > 0 && dow < 6) ||
          (config === "saturday_working" && dow > 0);
        if (isWork) {
          const mi = day.getMonth();
          (processed[mi] as any)[`revenue_${emp.id}`] += dailyRev;
          (processed[mi] as any)[`profit_${emp.id}`] += dailyRev - dailyExp;
          processed[mi].totalRevenue += dailyRev;
          processed[mi].totalProfit += dailyRev - dailyExp;
        }
      });
    });

    return processed;
  }, [assignEmployee, clientsData]);

  if (isLoading) {
    return (
      <div className="h-[280px] flex items-center justify-center">
        <Loader2 className="animate-spin text-violet-500" size={28} />
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <defs>
            {/* Per-employee bar gradients */}
            {assignEmployee.map((emp, i) => {
              const [from, to] = EMP_GRAD_PAIRS[i % EMP_GRAD_PAIRS.length];
              return (
                <linearGradient key={emp.id} id={`empGrad_${emp.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={from} stopOpacity={1} />
                  <stop offset="100%" stopColor={to} stopOpacity={0.78} />
                </linearGradient>
              );
            })}

            {/* Profit area — pink / fuchsia / magenta fade */}
            <linearGradient id="profitAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EC4899" stopOpacity={0.5} />
              <stop offset="45%" stopColor="#D946EF" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#C026D3" stopOpacity={0.03} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="4 4"
            stroke="rgba(139,92,246,0.08)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          />
          <RechartsTooltip
            content={<CustomTooltip employees={assignEmployee} />}
            cursor={{ fill: "rgba(139,92,246,0.06)", radius: 4 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12, color: "#6B7280" }}
            iconType="circle"
            iconSize={8}
          />

          {/* Stacked bars — each employee its own gradient */}
          {assignEmployee.map((emp, i) => (
            <Bar
              key={emp.id}
              dataKey={`revenue_${emp.id}`}
              name={
                emp.hr_employees
                  ? `${emp.hr_employees.first_name} ${emp.hr_employees.last_name}`
                  : "Unknown"
              }
              stackId="revenue"
              fill={`url(#empGrad_${emp.id})`}
              radius={i === assignEmployee.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={52}
            />
          ))}

          {/* Profit overlay area — pink stroke, fuchsia fill */}
          <Area
            type="monotone"
            dataKey="totalProfit"
            name="Total Profit"
            stroke="#EC4899"
            strokeWidth={2.5}
            fill="url(#profitAreaFill)"
            dot={{ fill: "#EC4899", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#EC4899", stroke: "#fff", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueExpenseChart;