// src/components/Client/ProjectDashboard.tsx
// Light mode — bg-[#F7F7F8], white cards, #7B43F1 violet
// ALL calculation logic is UNCHANGED
// 
// Chart fix: logged hours now uses dateRange directly (not hardcoded FY).
// Granularity auto-switches: ≤45 days → daily, ≤180 days → weekly, else → monthly.
// dateRange defaults to null (all data from project start).

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import supabase from "../../config/supabaseClient";
import { useSelector } from "react-redux";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  ArrowLeft, Download, Plus, Search, Briefcase, Calendar, ChevronLeft, ChevronRight,
  Pencil, Trash2, FileText, Users, ReceiptIndianRupee, TrendingUp, Clock, X,
  Activity, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import AssignEmployeeDialog from "./AssignEmployeeDialog";
import Loader from "@/components/ui/Loader";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, PieChart, Pie, Cell,
} from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import {
  format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, getDaysInMonth, isSunday, isWeekend, isWithinInterval,
  differenceInDays, parseISO,
} from "date-fns";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector";
import RevenueExpenseChart from "./RevenueExpenseChart";

// ─── Types (UNCHANGED) ───────────────────────────────────────────────────────
interface AssignEmployee {
  id: string; assign_employee: string; project_id: string; client_id: string;
  start_date: string; end_date: string; salary: number; client_billing: number;
  status: string; sow: string | null; duration: number; billing_type?: string;
  working_days_config?: 'all_days' | 'weekdays_only' | 'saturday_working';
  salary_type?: string; salary_currency?: string; working_hours?: number;
  hr_employees?: { first_name: string; last_name: string; salary_type: string } | null;
}
interface Client { id: string; currency: string; client_name: string; }
interface Project {
  id: string; name: string; start_date: string; end_date: string;
  duration: number; revenue: number; profit: number; status: string;
  employees_needed: number; employees_assigned: number;
}
interface TimeLog {
  id: string; employee_id: string; date: string;
  project_time_data: { projects: { hours: number; report: string; clientId: string; projectId: string }[] };
  total_working_hours: string;
}
interface DateRange { startDate: Date | null; endDate: Date | null; }

// ─── Constants ───────────────────────────────────────────────────────────────
const EXCHANGE_RATE_USD_TO_INR = 84;
const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

// Purple / indigo / pink theme for employee bars
const EMPLOYEE_COLORS = [
  "#7B43F1","#A855F7","#EC4899","#6366F1",
  "#C026D3","#8B5CF6","#DB2777","#9333EA","#D946EF","#7C3AED",
];

// ─── UI helpers ──────────────────────────────────────────────────────────────
const WCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-violet-700" />
    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{children}</span>
  </div>
);

const LightTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>{p.name}: {p.value?.toFixed?.(1) ?? p.value}</p>
      ))}
    </div>
  );
};

// Gradient-header tooltip for the logged-hours chart
const HoursTooltip = ({ active, payload, label, employees }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div
      className="rounded-xl overflow-hidden text-xs min-w-[200px]"
      style={{
        background: "#fff",
        border: "1px solid rgba(139,92,246,0.2)",
        boxShadow: "0 8px 24px rgba(109,40,217,0.12)",
      }}
    >
      <div className="px-3 py-2" style={{ background: "linear-gradient(135deg, #7B43F1, #6366F1)" }}>
        <p className="font-bold text-white">{label}</p>
        <p className="text-white/70 text-[10px]">Total: {data.totalHours?.toFixed(2)} hrs</p>
      </div>
      <div className="px-3 py-2 space-y-1">
        {employees.map((emp: AssignEmployee, i: number) => {
          const hours = data[emp.assign_employee] || 0;
          if (!hours) return null;
          const name = emp.hr_employees
            ? `${emp.hr_employees.first_name} ${emp.hr_employees.last_name}`
            : 'Unknown';
          return (
            <div key={emp.id} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length] }} />
                <span className="text-gray-600">{name}</span>
              </div>
              <span className="font-semibold text-gray-800">{hours.toFixed(1)} hrs</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// UNCHANGED calculation helpers
const countWorkingDays = (
  startDate: Date, endDate: Date,
  config: 'all_days' | 'weekdays_only' | 'saturday_working' = 'all_days'
): number => {
  if (!startDate || !endDate || startDate > endDate) return 0;
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  switch (config) {
    case 'weekdays_only': return days.filter(d => !isWeekend(d)).length;
    case 'saturday_working': return days.filter(d => !isSunday(d)).length;
    default: return days.length;
  }
};

// ─── Chart granularity helper ─────────────────────────────────────────────────
// Returns the right grouping strategy based on the date range span.
type Granularity = 'daily' | 'weekly' | 'monthly';

const getGranularity = (startDate: Date | null, endDate: Date | null): Granularity => {
  if (!startDate || !endDate) return 'monthly';
  const days = differenceInDays(endDate, startDate);
  if (days <= 45)  return 'daily';
  if (days <= 180) return 'weekly';
  return 'monthly';
};

// Build the empty bucket array for the chart
const buildBuckets = (
  startDate: Date,
  endDate: Date,
  granularity: Granularity,
  employees: AssignEmployee[]
) => {
  const empKeys = employees.reduce((acc, e) => ({ ...acc, [e.assign_employee]: 0 }), {});

  if (granularity === 'daily') {
    return eachDayOfInterval({ start: startDate, end: endDate }).map(d => ({
      name: format(d, 'dd MMM'),
      _date: d,
      totalHours: 0,
      ...empKeys,
    }));
  }

  if (granularity === 'weekly') {
    // Build week buckets covering the range
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
    return weeks.map(wkStart => {
      const wkEnd = endOfWeek(wkStart, { weekStartsOn: 1 });
      return {
        name: `${format(wkStart, 'dd MMM')}`,
        _weekStart: wkStart,
        _weekEnd: wkEnd,
        totalHours: 0,
        ...empKeys,
      };
    });
  }

  // monthly
  return eachMonthOfInterval({ start: startDate, end: endDate }).map(m => ({
    name: format(m, 'MMM yy'),
    _monthIndex: m.getMonth(),
    _year: m.getFullYear(),
    totalHours: 0,
    ...empKeys,
  }));
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ProjectDashboard = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("client_id");
  const queryClient = useQueryClient();

  const [addProjectOpen, setAddProjectOpen]   = useState(false);
  const [editEmployee, setEditEmployee]       = useState<AssignEmployee | null>(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]         = useState("");
  const [activeTab, setActiveTab]             = useState("all");
  const [currentPage, setCurrentPage]         = useState(1);
  const [itemsPerPage, setItemsPerPage]       = useState(10);
  const [loading, setLoading]                 = useState(true);
  const [calculationMode, setCalculationMode] = useState<"accrual" | "actual">("actual");

  // ── dateRange defaults to null = all data (set to project.start_date once loaded)
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  if (!user || !organization_id) return <div className="text-center text-red-600 font-semibold mt-10">Authentication error</div>;

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: client } = useQuery<Client>({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_clients")
        .select("id, client_name, currency").eq("id", clientId!).eq("organization_id", organization_id).single();
      if (error) throw error; return data as Client;
    }, enabled: !!clientId,
  });

  const { data: project, isLoading: lPr } = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_projects")
        .select("*").eq("id", id!).eq("organization_id", organization_id).single();
      if (error) throw error;
      return { ...data, duration: data.duration ?? 0, start_date: data.start_date ?? "", end_date: data.end_date ?? "", status: data.status ?? "unknown", revenue: 0, profit: 0 } as Project;
    }, enabled: !!id,
  });

  const { data: assignEmployee = [], isLoading: lEmp } = useQuery<AssignEmployee[]>({
    queryKey: ["project-employee", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_project_employees")
        .select(`id, assign_employee, project_id, client_id, start_date, end_date, salary, client_billing, status, sow, billing_type, salary_type, salary_currency, working_hours, working_days_config,
          hr_employees:hr_employees!hr_project_employees_assign_employee_fkey(first_name, last_name, salary_type)`)
        .eq("project_id", id!).eq("organization_id", organization_id);
      if (error) throw error;
      return data.map(e => ({
        ...e,
        duration: e.start_date && e.end_date ? Math.ceil((new Date(e.end_date).getTime() - new Date(e.start_date).getTime()) / 86400000) + 1 : 0,
        hr_employees: e.hr_employees ?? null,
        sow: e.sow ?? null,
      })) as AssignEmployee[];
    }, enabled: !!id,
  });

  // Single time-logs query — respects dateRange (null = all data)
  const { data: timeLogs = [], isLoading: lTL } = useQuery<TimeLog[]>({
    queryKey: ["time_logs_project", id, dateRange],
    queryFn: async () => {
      let q = supabase.from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
        .eq("is_approved", true);
      if (dateRange.startDate) q = q.gte("date", dateRange.startDate.toISOString());
      if (dateRange.endDate)   q = q.lte("date", dateRange.endDate.toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).filter(l =>
        l.project_time_data?.projects?.some((p: any) => p.projectId === id)
      ) as TimeLog[];
    },
    enabled: calculationMode === "actual" && !!id,
  });

  // Unfiltered logs for revenue/profit calculation (always all-time)
  const { data: unfilteredTimeLogs = [], isLoading: lUTL } = useQuery<TimeLog[]>({
    queryKey: ["unfiltered_time_logs", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("time_logs")
        .select("id, employee_id, date, project_time_data, total_working_hours")
        .eq("is_approved", true);
      if (error) throw error;
      return (data ?? []).filter(l =>
        l.project_time_data?.projects?.some((p: any) => p.projectId === id)
      ) as TimeLog[];
    },
    enabled: calculationMode === "actual" && !!id,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_clients")
        .select("id, currency, client_name").eq("organization_id", organization_id);
      if (error) throw error; return data as Client[];
    },
  });

  // Once project loads, set dateRange to project start → today (acts as "all" for that project)
  useEffect(() => {
    if (project?.start_date) {
      setDateRange({ startDate: new Date(project.start_date), endDate: new Date() });
    }
  }, [project?.start_date]);

  useEffect(() => {
    setLoading(lPr || lEmp || lUTL || lTL);
  }, [lPr, lEmp, lUTL, lTL]);

  // ── ALL CALCULATION FUNCTIONS UNCHANGED ───────────────────────────────────
  const calcHoursFor = (eId: string, logs: TimeLog[]) =>
    logs.filter(l => l.employee_id === eId)
      .reduce((a, l) => a + (l.project_time_data?.projects?.find((p: any) => p.projectId === id)?.hours || 0), 0);

  const calcHoursForRevProfit = (eId: string) => calcHoursFor(eId, unfilteredTimeLogs);
  const calcHoursForTable     = (eId: string) => calcHoursFor(eId, timeLogs);

  const calculateRevenue = (emp: AssignEmployee, mode: "accrual" | "actual"): number => {
    const config = emp.working_days_config || 'all_days';
    const cl = clients.find(c => c.id === emp.client_id);
    let cb = emp.client_billing || 0;
    if (cl?.currency === "USD") cb *= EXCHANGE_RATE_USD_TO_INR;

    if (mode === "accrual") {
      const assignDays = countWorkingDays(new Date(emp.start_date), new Date(emp.end_date), config);
      let daily = 0;
      switch (emp.billing_type) {
        case "Monthly": daily = cb / (countWorkingDays(startOfMonth(new Date(emp.start_date)), new Date(new Date(emp.start_date).setDate(getDaysInMonth(new Date(emp.start_date)))), config) || 1); break;
        case "LPA":     daily = cb / (countWorkingDays(startOfYear(new Date(emp.start_date)), new Date(new Date(emp.start_date).setMonth(11, 31)), config) || 1); break;
        case "Hourly":  return cb * assignDays * (emp.working_hours || 8);
      }
      return daily * assignDays;
    } else {
      const hours = calcHoursForRevProfit(emp.assign_employee);
      let hr = 0;
      const avg = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
      switch (emp.billing_type) {
        case "Monthly": hr = (cb * 12) / (avg * (emp.working_hours || 8)); break;
        case "LPA":     hr = cb / (avg * (emp.working_hours || 8)); break;
        case "Hourly":  hr = cb; break;
      }
      return hours * (hr || 0);
    }
  };

  const calculateProfit = (emp: AssignEmployee, mode: "accrual" | "actual"): number => {
    const rev    = calculateRevenue(emp, mode);
    const config = emp.working_days_config || 'all_days';
    let sal      = emp.salary || 0;
    if (emp.salary_currency === "USD") sal *= EXCHANGE_RATE_USD_TO_INR;
    let cost = 0;

    if (mode === "accrual") {
      const assignDays = countWorkingDays(new Date(emp.start_date), new Date(emp.end_date), config);
      let daily = 0;
      switch (emp.salary_type) {
        case "Monthly": daily = sal / (countWorkingDays(startOfMonth(new Date(emp.start_date)), new Date(new Date(emp.start_date).setDate(getDaysInMonth(new Date(emp.start_date)))), config) || 1); break;
        case "LPA":     daily = sal / (countWorkingDays(startOfYear(new Date(emp.start_date)), new Date(new Date(emp.start_date).setMonth(11, 31)), config) || 1); break;
        case "Hourly":  cost = sal * assignDays * (emp.working_hours || 8); break;
      }
      if (emp.salary_type !== 'Hourly') cost = daily * assignDays;
    } else {
      const hours = calcHoursForRevProfit(emp.assign_employee);
      let hr = 0;
      const avg = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
      switch (emp.salary_type) {
        case "Monthly": hr = (sal * 12) / (avg * (emp.working_hours || 8)); break;
        case "LPA":     hr = sal / (avg * (emp.working_hours || 8)); break;
        case "Hourly":  hr = sal; break;
      }
      cost = hours * (hr || 0);
    }
    return rev - cost;
  };

  const calcActualRevForTable  = (emp: AssignEmployee): number => {
    const hours  = calcHoursForTable(emp.assign_employee);
    const config = emp.working_days_config || 'all_days';
    const cl     = clients.find(c => c.id === emp.client_id);
    let cb       = emp.client_billing || 0;
    if (cl?.currency === "USD") cb *= EXCHANGE_RATE_USD_TO_INR;
    let hr = 0;
    const avg = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
    switch (emp.billing_type) {
      case "Monthly": hr = (cb * 12) / (avg * (emp.working_hours || 8)); break;
      case "LPA":     hr = cb / (avg * (emp.working_hours || 8)); break;
      case "Hourly":  hr = cb; break;
    }
    return hours * (hr || 0);
  };

  const calcActualProfForTable = (emp: AssignEmployee): number => {
    const rev    = calcActualRevForTable(emp);
    const hours  = calcHoursForTable(emp.assign_employee);
    const config = emp.working_days_config || 'all_days';
    let sal      = emp.salary || 0;
    if (emp.salary_currency === "USD") sal *= EXCHANGE_RATE_USD_TO_INR;
    let hr = 0;
    const avg = config === 'weekdays_only' ? 260 : config === 'saturday_working' ? 312 : 365;
    switch (emp.salary_type) {
      case "Monthly": hr = (sal * 12) / (avg * (emp.working_hours || 8)); break;
      case "LPA":     hr = sal / (avg * (emp.working_hours || 8)); break;
      case "Hourly":  hr = sal; break;
    }
    return rev - hours * (hr || 0);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalRevenue    = assignEmployee.reduce((a, e) => a + calculateRevenue(e, calculationMode), 0) || 0;
  const totalProfit     = assignEmployee.reduce((a, e) => a + calculateProfit(e, calculationMode), 0) || 0;
  const workingCount    = assignEmployee.filter(e => e.status === "Working").length;
  const relievedCount   = assignEmployee.filter(e => e.status === "Relieved").length;
  const terminatedCount = assignEmployee.filter(e => e.status === "Terminated").length;

  // ── SMART HOURS CHART ─────────────────────────────────────────────────────
  // Granularity adapts to the selected date range span.
  const { chartData, granularity, chartLabel } = useMemo(() => {
    const effectiveStart = dateRange.startDate ?? (project?.start_date ? new Date(project.start_date) : null);
    const effectiveEnd   = dateRange.endDate ?? new Date();

    if (!effectiveStart || !effectiveEnd || !assignEmployee.length) {
      return { chartData: [], granularity: 'monthly' as Granularity, chartLabel: 'Logged Hours' };
    }

    const gran = getGranularity(effectiveStart, effectiveEnd);
    const buckets = buildBuckets(effectiveStart, effectiveEnd, gran, assignEmployee);

    // Distribute time log hours into the right bucket
    timeLogs.forEach(log => {
      const logDate = parseISO(log.date);
      const pe = log.project_time_data?.projects?.find((p: any) => p.projectId === id);
      if (!pe?.hours) return;

      let bucketIdx = -1;
      if (gran === 'daily') {
        bucketIdx = buckets.findIndex(b => format(b._date as Date, 'yyyy-MM-dd') === format(logDate, 'yyyy-MM-dd'));
      } else if (gran === 'weekly') {
        bucketIdx = buckets.findIndex(b => isWithinInterval(logDate, { start: b._weekStart as Date, end: b._weekEnd as Date }));
      } else {
        bucketIdx = buckets.findIndex(b => b._monthIndex === logDate.getMonth() && b._year === logDate.getFullYear());
      }

      if (bucketIdx === -1) return;
      const empId = log.employee_id;
      (buckets[bucketIdx] as any)[empId] = ((buckets[bucketIdx] as any)[empId] || 0) + pe.hours;
      buckets[bucketIdx].totalHours += pe.hours;
    });

    const days = differenceInDays(effectiveEnd, effectiveStart);
    const granLabel = gran === 'daily' ? 'Daily' : gran === 'weekly' ? 'Weekly' : 'Monthly';
    const label = `Logged Hours — ${granLabel} (${format(effectiveStart, 'dd MMM yy')} → ${format(effectiveEnd, 'dd MMM yy')})`;

    // Strip internal helpers before passing to chart
    const cleaned = buckets.map(({ _date, _weekStart, _weekEnd, _monthIndex, _year, ...rest }) => rest);

    return { chartData: cleaned, granularity: gran, chartLabel: label };
  }, [timeLogs, assignEmployee, dateRange, project, id]);

  // ── Employee revenue mini chart ───────────────────────────────────────────
  const empRevenueData = assignEmployee
    .map(e => ({
      name: e.hr_employees ? e.hr_employees.first_name : 'N/A',
      revenue: Math.round(calculateRevenue(e, calculationMode) / 1000),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const statusDist = [
    { name: 'Working',    value: workingCount,    color: '#7B43F1' },
    { name: 'Relieved',   value: relievedCount,   color: '#A855F7' },
    { name: 'Terminated', value: terminatedCount, color: '#EC4899' },
  ].filter(d => d.value > 0);

  // ── Table filter ──────────────────────────────────────────────────────────
  const filteredEmployees = assignEmployee.filter(e => {
    const name     = e.hr_employees ? `${e.hr_employees.first_name} ${e.hr_employees.last_name}` : "";
    const matchSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const inRange  = calculationMode === "accrual" ||
      !dateRange.startDate || !dateRange.endDate ||
      (new Date(e.start_date) <= dateRange.endDate && new Date(e.end_date) >= dateRange.startDate);
    if (activeTab === "all") return matchSearch && inRange;
    return matchSearch && inRange && e.status.toLowerCase() === activeTab;
  });
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginated  = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── Mutations (UNCHANGED) ─────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async ({ employeeId, newStatus }: { employeeId: string; newStatus: string }) => {
      const { error } = await supabase.from("hr_project_employees").update({ status: newStatus }).eq("id", employeeId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project-employee", id] }); toast.success("Status updated!"); },
    onError: () => toast.error("Failed to update."),
  });

  const deleteEmp = useMutation({
    mutationFn: async (eId: string) => {
      const { error } = await supabase.from("hr_project_employees").delete().eq("id", eId).eq("organization_id", organization_id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project-employee", id] }); toast.success("Employee removed"); setDeleteEmployeeId(null); },
    onError: () => toast.error("Failed to remove."),
  });

  // ── Export (UNCHANGED) ────────────────────────────────────────────────────
  const exportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filteredEmployees.map(e => ({
      "Employee":  e.hr_employees ? `${e.hr_employees.first_name} ${e.hr_employees.last_name}` : "N/A",
      "Hours":     calculationMode === "actual" ? calcHoursForTable(e.assign_employee).toFixed(2) : "",
      "Salary":    fmtINR(e.salary),
      "Revenue":   fmtINR(calculateRevenue(e, calculationMode)),
      "Profit":    fmtINR(calculateProfit(e, calculationMode)),
      "Status":    e.status,
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, `Project_Employees_${calculationMode}.csv`);
  };
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Project Employees (${calculationMode})`, 14, 10);
    (doc as any).autoTable({
      head: [["Employee", calculationMode === "accrual" ? "Duration" : "Hours", "Salary", "Revenue", "Profit", "Status"]],
      body: filteredEmployees.map(e => [
        e.hr_employees ? `${e.hr_employees.first_name} ${e.hr_employees.last_name}` : "N/A",
        calculationMode === "accrual" ? `${e.duration} days` : `${calcHoursForTable(e.assign_employee).toFixed(2)} hrs`,
        fmtINR(e.salary), fmtINR(calculateRevenue(e, calculationMode)), fmtINR(calculateProfit(e, calculationMode)), e.status,
      ]),
      startY: 20,
    });
    doc.save(`Project_${calculationMode}.pdf`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F7F7F8] flex items-center justify-center">
      <Loader size={48} className="border-[4px] animate-spin text-violet-600" />
    </div>
  );

  const STATUS_STYLE: Record<string, string> = {
    Working: 'bg-green-50 text-green-700',
    Relieved: 'bg-amber-50 text-amber-700',
    Terminated: 'bg-red-50 text-red-600',
  };

  const hasDateFilter = !!(dateRange.startDate || dateRange.endDate);

  // Granularity indicator pill
  const GRAN_LABELS: Record<Granularity, string> = {
    daily: 'Day-by-day',
    weekly: 'Week-by-week',
    monthly: 'Month-by-month',
  };
  const GRAN_COLORS: Record<Granularity, string> = {
    daily: '#7B43F1',
    weekly: '#A855F7',
    monthly: '#EC4899',
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      {/* ── Sticky Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-5 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-800">{project?.name} Dashboard</h1>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize"
                  style={{
                    background: project?.status === 'ongoing' ? '#EFF6FF' : project?.status === 'completed' ? '#F0FDF4' : '#FEF2F2',
                    color: project?.status === 'ongoing' ? '#1D4ED8' : project?.status === 'completed' ? '#15803D' : '#DC2626',
                    borderColor: project?.status === 'ongoing' ? '#BFDBFE' : project?.status === 'completed' ? '#BBF7D0' : '#FECACA',
                  }}
                >
                  {project?.status}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {client?.client_name} · {project?.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : '—'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setAddProjectOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #7B43F1, #6D28D9)' }}
          >
            <Plus size={15} /> Assign Employee
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-5 py-5 space-y-5">
        {/* ── Mode + date range row ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 rounded-lg bg-gray-100">
            {(['actual', 'accrual'] as const).map(m => (
              <button
                key={m}
                onClick={() => setCalculationMode(m)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                  calculationMode === m ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {calculationMode === 'actual' && (
            <div className="flex items-center gap-2">
              <EnhancedDateRangeSelector value={dateRange} onChange={setDateRange} />
              {hasDateFilter && (
                <button
                  onClick={() => project?.start_date
                    ? setDateRange({ startDate: new Date(project.start_date), endDate: new Date() })
                    : setDateRange({ startDate: null, endDate: null })}
                  className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-800 px-2 py-1 rounded-lg hover:bg-violet-50 transition-all"
                >
                  <X size={10} /> Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── KPI Row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <WCard className="p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-800">{fmtINR(totalRevenue)}</p>
            <p className="text-[11px] text-gray-400 mt-1 capitalize">{calculationMode} basis</p>
          </WCard>
          <WCard className="p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Profit</p>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-violet-600' : 'text-red-500'}`}>{fmtINR(totalProfit)}</p>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${totalRevenue > 0 ? Math.min((totalProfit / totalRevenue) * 100, 100) : 0}%`,
                  background: 'linear-gradient(to right, #7B43F1, #A855F7)',
                }}
              />
            </div>
          </WCard>
          <WCard className="p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Employees</p>
            <p className="text-2xl font-bold text-gray-800">{assignEmployee.length}</p>
            <div className="flex gap-3 mt-2">
              <div><p className="text-[9px] text-gray-400">Working</p><p className="text-xs font-bold text-violet-600">{workingCount}</p></div>
              <div><p className="text-[9px] text-gray-400">Relieved</p><p className="text-xs font-bold text-purple-500">{relievedCount}</p></div>
              <div><p className="text-[9px] text-gray-400">Terminated</p><p className="text-xs font-bold text-pink-500">{terminatedCount}</p></div>
            </div>
          </WCard>
          <WCard className="p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Project</p>
            <p className="text-sm font-semibold text-gray-700 truncate">{project?.name}</p>
            <p className="text-[11px] text-gray-400 mt-1">
              {project?.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : '—'}
              {project?.end_date ? ` → ${format(new Date(project.end_date), 'MMM d, yyyy')}` : ''}
            </p>
          </WCard>
        </div>

        {/* ── Charts Row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Smart logged-hours / accrual chart */}
          <WCard className="lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <SectionLabel>
                {calculationMode === 'actual' ? chartLabel : 'Monthly Revenue vs Profit'}
              </SectionLabel>
              {calculationMode === 'actual' && chartData.length > 0 && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: `${GRAN_COLORS[granularity]}18`,
                    color: GRAN_COLORS[granularity],
                    border: `1px solid ${GRAN_COLORS[granularity]}30`,
                  }}
                >
                  {GRAN_LABELS[granularity]}
                </span>
              )}
            </div>

            {calculationMode === 'actual' ? (
              chartData.length > 0 ? (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: granularity === 'daily' ? 30 : 0 }}>
                      <defs>
                        {assignEmployee.map((emp, i) => {
                          const from = EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length];
                          const to   = EMPLOYEE_COLORS[(i + 4) % EMPLOYEE_COLORS.length];
                          return (
                            <linearGradient key={emp.id} id={`pdEmpGrad_${emp.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={from} stopOpacity={1} />
                              <stop offset="100%" stopColor={to} stopOpacity={0.75} />
                            </linearGradient>
                          );
                        })}
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="rgba(139,92,246,0.08)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: granularity === 'daily' ? 8 : 10, fill: '#9CA3AF' }}
                        axisLine={false}
                        tickLine={false}
                        angle={granularity === 'daily' ? -45 : 0}
                        textAnchor={granularity === 'daily' ? 'end' : 'middle'}
                        interval={granularity === 'daily' ? 'preserveStartEnd' : 0}
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        content={<HoursTooltip employees={assignEmployee} />}
                        cursor={{ fill: 'rgba(139,92,246,0.06)', radius: 4 }}
                      />
                      {assignEmployee.map((emp, i) => (
                        <Bar
                          key={emp.id}
                          dataKey={emp.assign_employee}
                          name={emp.hr_employees ? `${emp.hr_employees.first_name} ${emp.hr_employees.last_name}` : 'Unknown'}
                          stackId="hours"
                          fill={`url(#pdEmpGrad_${emp.id})`}
                          radius={i === assignEmployee.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          maxBarSize={granularity === 'daily' ? 18 : granularity === 'weekly' ? 28 : 44}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[240px] flex items-center justify-center flex-col gap-2">
                  <Clock size={32} className="text-gray-200" />
                  <p className="text-sm text-gray-400">No approved time logs for this period</p>
                </div>
              )
            ) : (
              <RevenueExpenseChart projectId={id!} assignEmployee={assignEmployee} calculationMode={calculationMode} />
            )}
          </WCard>

          {/* Right column: status donut + employee revenue */}
          <div className="flex flex-col gap-4">
            <WCard className="p-4 flex-1">
              <SectionLabel>Employee Status</SectionLabel>
              {statusDist.length > 0 ? (
                <div className="flex items-center gap-3 mt-1">
                  <div className="w-[70px] h-[70px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusDist} cx="50%" cy="50%" innerRadius={20} outerRadius={32} dataKey="value" stroke="none">
                          {statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {statusDist.map(s => (
                      <div key={s.name}>
                        <div className="flex justify-between items-center mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            <span className="text-[11px] text-gray-500">{s.name}</span>
                          </div>
                          <span className="text-xs font-bold text-gray-700">{s.value}</span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${assignEmployee.length > 0 ? (s.value / assignEmployee.length) * 100 : 0}%`, backgroundColor: s.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-xs text-gray-300 mt-2">No data</p>}
            </WCard>

            {empRevenueData.length > 0 && (
              <WCard className="p-4 flex-1">
                <SectionLabel>Revenue by Employee (₹k)</SectionLabel>
                <div className="h-[120px] mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={empRevenueData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pdEmpRevHoriz" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#7B43F1" stopOpacity={1} />
                          <stop offset="100%" stopColor="#A855F7" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <XAxis type="number" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#4B5563' }} axisLine={false} tickLine={false} width={50} />
                      <RechartsTooltip content={<LightTooltip />} />
                      <Bar dataKey="revenue" name="Revenue (₹k)" fill="url(#pdEmpRevHoriz)" radius={[0, 4, 4, 0]} maxBarSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </WCard>
            )}
          </div>
        </div>

        {/* ── Employee Table ─────────────────────────────────────────── */}
        <WCard>
          <div className="px-5 py-3.5 border-b border-gray-100 flex flex-wrap items-center gap-3">
            {/* Status filter tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-gray-100">
              {[{ v: 'all', l: 'All' }, { v: 'working', l: 'Working' }, { v: 'relieved', l: 'Relieved' }, { v: 'terminated', l: 'Terminated' }].map(t => (
                <button
                  key={t.v}
                  onClick={() => { setActiveTab(t.v); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeTab === t.v ? 'bg-white text-violet-700 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search employees…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
              />
            </div>
            <div className="flex gap-1.5 ml-auto">
              <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:border-violet-300 transition-all">
                <Download size={11} /> CSV
              </button>
              <button onClick={exportPDF} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:border-violet-300 transition-all">
                <Download size={11} /> PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'Employee', 'Working Days',
                    calculationMode === 'accrual' ? 'Duration' : 'Hours',
                    ...(calculationMode === 'accrual' ? ['Start', 'End'] : []),
                    'Salary', 'Billing',
                    calculationMode === 'accrual' ? 'Est. Revenue' : 'Act. Revenue',
                    calculationMode === 'accrual' ? 'Est. Profit' : 'Act. Profit',
                    'Status', 'Actions',
                  ].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.length > 0 ? paginated.map(emp => {
                  const name     = emp.hr_employees ? `${emp.hr_employees.first_name} ${emp.hr_employees.last_name}` : 'N/A';
                  const currency = clients.find(c => c.id === emp.client_id)?.currency || 'INR';
                  const salSym   = emp.salary_currency === 'USD' ? '$' : '₹';
                  const bilSym   = currency === 'USD' ? '$' : '₹';
                  const salType  = emp.salary_type === 'Hourly' ? '/hr' : emp.salary_type === 'Monthly' ? '/mo' : '/yr';
                  const bilType  = emp.billing_type === 'Hourly' ? '/hr' : emp.billing_type === 'Monthly' ? '/mo' : '/yr';
                  const workDays = calculationMode === 'accrual'
                    ? countWorkingDays(new Date(emp.start_date), new Date(emp.end_date), emp.working_days_config)
                    : countWorkingDays(
                        dateRange.startDate
                          ? new Date(Math.max(new Date(emp.start_date).getTime(), dateRange.startDate.getTime()))
                          : new Date(emp.start_date),
                        dateRange.endDate
                          ? new Date(Math.min(new Date(emp.end_date).getTime(), dateRange.endDate.getTime()))
                          : new Date(emp.end_date),
                        emp.working_days_config
                      );
                  const actRev  = calcActualRevForTable(emp);
                  const actProf = calcActualProfForTable(emp);
                  const estRev  = calculateRevenue(emp, 'accrual');
                  const estProf = calculateProfit(emp, 'accrual');
                  const hours   = calcHoursForTable(emp.assign_employee);

                  return (
                    <tr key={emp.id} className="hover:bg-violet-50/30 transition-colors group">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800">{name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{workDays} days</td>
                      <td
                        className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 cursor-pointer hover:text-violet-600 hover:bg-violet-50/60 rounded transition-all"
                        onClick={() => {
                          if (calculationMode === 'actual') {
                            const s = dateRange.startDate?.toISOString() ?? '';
                            const e = dateRange.endDate?.toISOString() ?? '';
                            navigate(`/projects/${id}/employee/${emp.assign_employee}/details${s ? `?startDate=${s}&endDate=${e}` : ''}`);
                          }
                        }}
                      >
                        {calculationMode === 'accrual' ? `${emp.duration} days` : `${hours.toFixed(2)} hrs`}
                      </td>
                      {calculationMode === 'accrual' && (
                        <>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{new Date(emp.start_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">{new Date(emp.end_date).toLocaleDateString()}</td>
                        </>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <TooltipProvider><Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-gray-600 cursor-default">{salSym}{emp.salary?.toLocaleString('en-IN')}{salType}</span>
                          </TooltipTrigger>
                          {emp.salary_currency === 'USD' && (
                            <TooltipContent className="text-xs"><p>₹{(emp.salary * 84).toLocaleString('en-IN')}{salType}</p></TooltipContent>
                          )}
                        </Tooltip></TooltipProvider>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <TooltipProvider><Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-gray-600 cursor-default">{bilSym}{emp.client_billing?.toLocaleString('en-IN')}{bilType}</span>
                          </TooltipTrigger>
                          {currency === 'USD' && (
                            <TooltipContent className="text-xs"><p>₹{(emp.client_billing * EXCHANGE_RATE_USD_TO_INR).toLocaleString('en-IN')}{bilType}</p></TooltipContent>
                          )}
                        </Tooltip></TooltipProvider>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-800">
                        {fmtINR(calculationMode === 'actual' ? actRev : estRev)}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-xs font-bold ${(calculationMode === 'actual' ? actProf : estProf) >= 0 ? 'text-violet-600' : 'text-red-500'}`}>
                        {fmtINR(calculationMode === 'actual' ? actProf : estProf)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Select defaultValue={emp.status} onValueChange={ns => updateStatus.mutate({ employeeId: emp.id, newStatus: ns })}>
                          <SelectTrigger className="h-7 w-auto px-2 border-0 bg-transparent p-0 shadow-none focus:ring-0">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${STATUS_STYLE[emp.status] || 'bg-gray-50 text-gray-600'}`}>
                              {emp.status}
                            </span>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-lg">
                            <SelectItem value="Working"    className="text-xs text-green-700">Working</SelectItem>
                            <SelectItem value="Relieved"   className="text-xs text-amber-700">Relieved</SelectItem>
                            <SelectItem value="Terminated" className="text-xs text-red-600">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditEmployee(emp); setAddProjectOpen(true); }}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-all"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteEmployeeId(emp.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                          {emp.sow && (
                            <button
                              onClick={() => window.open(emp.sow!, '_blank')}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all"
                            >
                              <FileText size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center">
                      <Users size={28} className="text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No employees found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredEmployees.length > itemsPerPage && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Rows</span>
                <select
                  value={itemsPerPage}
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-200"
                >
                  {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-xs text-gray-500 font-medium">{currentPage} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 disabled:opacity-40 transition-all"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
              <span className="text-xs text-gray-400">
                {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length}
              </span>
            </div>
          )}
        </WCard>
      </div>

      {clientId && id && (
        <>
          <AssignEmployeeDialog
            open={addProjectOpen}
            onOpenChange={open => { setAddProjectOpen(open); if (!open) setEditEmployee(null); }}
            projectId={id}
            clientId={clientId}
            editEmployee={editEmployee}
            project={project}
          />
          <AlertDialog open={!!deleteEmployeeId} onOpenChange={() => setDeleteEmployeeId(null)}>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Remove employee?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently remove the employee from this project.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteEmployeeId && deleteEmp.mutate(deleteEmployeeId)}
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};

export default ProjectDashboard;