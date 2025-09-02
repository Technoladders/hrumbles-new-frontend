// src/components/projects/EmployeeProjectLogDetails.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import supabase from "../../config/supabaseClient";
import { format } from "date-fns";
import Loader from "@/components/ui/Loader";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BarChart2, Clock, FileText, ChevronLeft, ChevronRight, CalendarDays, TrendingUp, BarChartHorizontal } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip as RechartsTooltip, YAxis } from "recharts";
import { DateRangePickerField } from "@/components/ui/DateRangePickerField";

// --- INTERFACES ---
interface LogDetail {
  date: string;
  hours: number;
  report: string;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
  key: string;
}

// --- REUSABLE KPI CARD COMPONENT ---
const KpiCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string, icon: React.ElementType, isLoading: boolean }) => (
  <Card className="shadow-md border-none bg-white">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      <Icon className="h-4 w-4 text-gray-400" />
    </CardHeader>
    <CardContent>
      {isLoading ? <Loader size={24} /> : <div className="text-2xl font-bold">{value}</div>}
    </CardContent>
  </Card>
);

// --- MAIN COMPONENT ---
const EmployeeProjectLogDetails = () => {
  const navigate = useNavigate();
  const { projectId, employeeId } = useParams<{ projectId: string; employeeId: string }>();
  const [searchParams] = useSearchParams();

  // --- STATE MANAGEMENT ---
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // --- INITIALIZE DATE RANGE ---
  useEffect(() => {
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    if (startDateParam && endDateParam) {
      setDateRange({ startDate: new Date(startDateParam), endDate: new Date(endDateParam), key: "selection" });
    }
  }, []);

  // --- DATA FETCHING ---
  const { data, isLoading, error } = useQuery({
    queryKey: ["employeeLogDetails", projectId, employeeId, dateRange],
    queryFn: async () => {
      if (!projectId || !employeeId || !dateRange) throw new Error("Missing params.");
      const [employeeRes, projectRes, logsRes] = await Promise.all([
        supabase.from("hr_employees").select("first_name, last_name").eq("id", employeeId).single(),
        supabase.from("hr_projects").select("name").eq("id", projectId).single(),
        supabase.from("time_logs").select("date, project_time_data").eq("employee_id", employeeId).eq("is_approved", true).gte("date", dateRange.startDate.toISOString()).lte("date", dateRange.endDate.toISOString()).order("date", { ascending: false })
      ]);
      if (logsRes.error) throw logsRes.error;
      const processedLogs: LogDetail[] = logsRes.data.map(log => {
        const p = log.project_time_data?.projects?.find((p: any) => p.projectId === projectId);
        return p ? { date: log.date, hours: p.hours, report: p.report || "N/A" } : null;
      }).filter((l): l is LogDetail => l !== null);
      return {
        employeeName: `${employeeRes.data?.first_name || ''} ${employeeRes.data?.last_name || ''}`.trim(),
        projectName: projectRes.data?.name || "Unknown",
        logs: processedLogs,
      };
    },
    enabled: !!projectId && !!employeeId && !!dateRange,
  });

  // --- DATA PROCESSING & DERIVED STATE (MEMOIZED) ---
  const { stats, monthlyChartData, dayOfWeekData, paginatedLogs, totalPages } = useMemo(() => {
    if (!data?.logs) return { stats: {}, monthlyChartData: [], dayOfWeekData: [], paginatedLogs: [], totalPages: 0 };
    
    const logs = data.logs;
    const totalHours = logs.reduce((acc, log) => acc + log.hours, 0);
    const daysWorked = logs.length;
    const avgHours = daysWorked > 0 ? totalHours / daysWorked : 0;

    const months = Array.from({ length: 12 }, (_, i) => ({ name: format(new Date(0, i), 'MMM'), Hours: 0 }));
    logs.forEach(log => { months[new Date(log.date).getMonth()].Hours += log.hours; });

    const days = [
        { name: 'Sun', Hours: 0 }, { name: 'Mon', Hours: 0 }, { name: 'Tue', Hours: 0 }, 
        { name: 'Wed', Hours: 0 }, { name: 'Thu', Hours: 0 }, { name: 'Fri', Hours: 0 }, { name: 'Sat', Hours: 0 }
    ];
    logs.forEach(log => { days[new Date(log.date).getDay()].Hours += log.hours; });

    const startIndex = (currentPage - 1) * itemsPerPage;
    
    return {
      stats: { totalHours, daysWorked, avgHours },
      monthlyChartData: months.filter(m => m.Hours > 0),
      dayOfWeekData: days,
      paginatedLogs: logs.slice(startIndex, startIndex + itemsPerPage),
      totalPages: Math.ceil(logs.length / itemsPerPage)
    };
  }, [data, currentPage, itemsPerPage]);

  // --- RENDER ---
  if (isLoading || !dateRange) return <div className="flex items-center justify-center h-[80vh]"><Loader size={60} /></div>;
  if (error) return <div className="text-center p-10 text-red-500">Error: {error.message}</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
      <main className="w-full max-w-7xl mx-auto space-y-6">
        {/* --- HEADER --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 text-gray-600"><ArrowLeft size={20}/></Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{data?.employeeName}</h1>
              <p className="text-sm text-gray-500">Project: <strong>{data?.projectName}</strong></p>
            </div>
          </div>
          <DateRangePickerField dateRange={dateRange} onDateRangeChange={setDateRange} onApply={() => {}} className="w-full sm:w-auto"/>
        </div>

        {/* --- ROW 1: KPI CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard title="Total Logged Hours" value={stats.totalHours?.toFixed(2) || '0.00'} icon={Clock} isLoading={isLoading} />
          <KpiCard title="Total Days Worked" value={String(stats.daysWorked || 0)} icon={CalendarDays} isLoading={isLoading} />
          <KpiCard title="Average Daily Hours" value={stats.avgHours?.toFixed(2) || '0.00'} icon={TrendingUp} isLoading={isLoading} />
        </div>

        {/* --- ROW 2: CHARTS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-md border-none bg-white">
                <CardHeader><CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2"><BarChart2 /> Monthly Summary</CardTitle></CardHeader>
                <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-xs" />
                            <RechartsTooltip cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }} contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '0.5rem' }}/>
                            <Bar dataKey="Hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card className="shadow-md border-none bg-white">
                <CardHeader><CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2"><BarChartHorizontal /> Day of Week Performance</CardTitle></CardHeader>
                <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dayOfWeekData} layout="vertical" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} className="text-xs" />
                            <RechartsTooltip cursor={{ fill: 'rgba(234, 179, 8, 0.1)' }} contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '0.5rem' }}/>
                            <Bar dataKey="Hours" fill="#eab308" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>

        {/* --- ROW 3: DETAILED TABLE --- */}
        <Card className="shadow-md border-none bg-white flex flex-col">
          <CardHeader><CardTitle className="text-base font-semibold text-gray-700">Detailed Log Entries</CardTitle></CardHeader>
          <CardContent className="flex-grow"><table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Hours</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Work Report</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedLogs.map((log, index) => (
                    <tr key={index}>
                      <td className="px-3 py-3 whitespace-nowrap">{format(new Date(log.date), "MMM dd, yyyy")}</td>
                      <td className="px-3 py-3 font-medium">{log.hours.toFixed(2)}</td>
                      <td className="px-3 py-3 text-gray-600 break-words">{log.report}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data?.logs.length === 0 && <p className="text-center py-16 text-gray-500">No logs found for this period.</p>}
</CardContent>
          {/* Pagination Footer */}
          {totalPages > 1 && (
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t">
                  <div className="flex items-center gap-2 mb-4 sm:mb-0">
                      <span className="text-sm text-gray-600">Show</span>
                      <Select value={String(itemsPerPage)} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
                          <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                      <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
              </CardFooter>
            )}
        </Card>
      </main>
    </div>
  );
};

export default EmployeeProjectLogDetails;