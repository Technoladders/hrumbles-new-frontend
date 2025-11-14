import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, subDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import DailyAttendanceReport from './DailyAttendanceReport';
import MonthlyAttendanceReport from './MonthlyAttendanceReport';
import MonthlyInOutReport from './MonthlyInOutReport';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface TimeLog {
  id: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  duration_minutes: number | null;
  employee_id: string;
  employee_name: string;
  is_billable: boolean;
}

export interface Employee {
  id: string;
  name: string;
}

const AttendanceReportsPage: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [activeTab, setActiveTab] = useState('daily');
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!organizationId) return;
      try {
        const { data, error } = await supabase
          .from('hr_employees')
          .select('id, first_name, last_name')
          .eq('organization_id', organizationId)
          .order('first_name');
        if (error) throw error;
        setEmployees(data.map(e => ({ id: e.id, name: `${e.first_name} ${e.last_name}` })));
      } catch (err: any) {
        setError('Failed to fetch employee list.');
      }
    };
    fetchEmployees();
  }, [organizationId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return;

      let startDate, endDate;
      if (activeTab === 'daily') {
        startDate = endDate = selectedDate;
      } else {
        const [year, month] = selectedMonth.split('-').map(Number);
        const firstDay = startOfMonth(new Date(year, month - 1));
        const lastDay = endOfMonth(firstDay);
        startDate = firstDay;
        endDate = lastDay;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('time_logs')
          .select('*, hr_employees!time_logs_employee_id_fkey(first_name, last_name)')
          .eq('organization_id', organizationId)
          .gte('date', format(startDate, 'yyyy-MM-dd'))
          .lte('date', format(endDate, 'yyyy-MM-dd'))
          .order('date', { ascending: false });

        if (error) throw error;

        const formattedData: TimeLog[] = data.map((log: any) => ({
          id: log.id,
          date: log.date,
          clock_in_time: log.clock_in_time,
          clock_out_time: log.clock_out_time,
          duration_minutes: log.duration_minutes,
          employee_id: log.employee_id,
          employee_name: log.hr_employees ? `${log.hr_employees.first_name} ${log.hr_employees.last_name}` : 'Unknown',
          is_billable: log.project_time_data?.projects && Array.isArray(log.project_time_data.projects) && log.project_time_data.projects.length > 0,
        }));
        setTimeLogs(formattedData);
      } catch (err: any) {
        setError(err.message || 'An error occurred fetching time logs.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [organizationId, activeTab, selectedDate, selectedMonth]);

  const filteredLogs = useMemo(() => {
    return selectedEmployees.length > 0
      ? timeLogs.filter(log => selectedEmployees.includes(log.employee_id))
      : timeLogs;
  }, [timeLogs, selectedEmployees]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), i, 1);
    return { value: `${d.getFullYear()}-${String(i + 1).padStart(2, '0')}`, label: format(d, 'MMMM yyyy') };
  });

  const exportToCSV = () => {
    const csvData = filteredLogs.map(log => ({
      Date: format(new Date(log.date), 'yyyy-MM-dd'),
      Employee: log.employee_name,
      'Clock In': log.clock_in_time || 'N/A',
      'Clock Out': log.clock_out_time || 'N/A',
      'Duration (minutes)': log.duration_minutes || 'N/A',
      'Billable': log.is_billable ? 'Yes' : 'No',
    }));
    const csv = Papa.unparse(csvData, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Attendance Report', 14, 20);
    (doc as any).autoTable({
      head: [['Date', 'Employee', 'Clock In', 'Clock Out', 'Duration (minutes)', 'Billable']],
      body: filteredLogs.map(log => [
        format(new Date(log.date), 'yyyy-MM-dd'),
        log.employee_name,
        log.clock_in_time || 'N/A',
        log.clock_out_time || 'N/A',
        log.duration_minutes?.toString() || 'N/A',
        log.is_billable ? 'Yes' : 'No',
      ]),
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [123, 67, 241] },
    });
    doc.save(`attendance_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl animate-scale-in">
      <CardHeader>
        <CardTitle>Attendance & In-Out Reports</CardTitle>
        <CardDescription>Analyze daily and monthly attendance records for your team.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
  <div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">
    {/* Tabs */}
    <div className="flex-shrink-0 order-1">
      <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
        <TabsTrigger
          value="daily"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
        >
          Daily Attendance
        </TabsTrigger>
        <TabsTrigger
          value="monthly"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
        >
          Monthly Attendance
        </TabsTrigger>
        <TabsTrigger
          value="monthly-inout"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
            data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
        >
          Monthly In-Out
        </TabsTrigger>
      </TabsList>
    </div>

    {/* Filter Users */}
    <div className="flex-shrink-0 order-2 w-full sm:w-auto">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm flex items-center gap-2 justify-start">
            <UserIcon className="h-4 w-4" />
            {selectedEmployees.length > 0 ? `${selectedEmployees.length} Users Selected` : 'All Users'}
            {selectedEmployees.length > 0 && <Badge variant="secondary">{selectedEmployees.length}</Badge>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            <Button variant="ghost" size="sm" onClick={() => setSelectedEmployees([])}>Clear Selection</Button>
            {employees.map(e => (
              <Label key={e.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted font-normal">
                <Checkbox 
                  checked={selectedEmployees.includes(e.id)} 
                  onCheckedChange={() => setSelectedEmployees(p => p.includes(e.id) ? p.filter(id => id !== e.id) : [...p, e.id])}
                />
                {e.name}
              </Label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>

    {/* Date/Month Selector */}
    <div className="flex-shrink-0 order-3 w-full sm:w-[180px]">
      {activeTab === 'daily' ? (
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="h-10 w-full rounded-full border border-input bg-gray-100 dark:bg-gray-800 shadow-inner px-3 text-sm text-gray-600 dark:text-gray-300"
        />
      ) : (
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
            <SelectValue placeholder="Select Month" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>

    {/* Export Buttons */}
    <div className="flex gap-2 flex-shrink-0 order-4">
      <Button variant="outline" size="sm" onClick={exportToCSV} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
        <Download className="w-4 h-4 mr-2" />
        Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={exportToPDF} className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
        <Download className="w-4 h-4 mr-2" />
        Export PDF
      </Button>
    </div>
  </div>
  {isLoading ? (
    <div className="flex justify-center items-center h-64 animate-fade-in">
      <LoadingSpinner size={60} className="border-[6px] animate-spin text-indigo-600" />
    </div>
  ) : error ? (
    <Alert variant="destructive" className="animate-fade-in">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : (
    <>
      <TabsContent value="daily" className="mt-4">
        <DailyAttendanceReport data={filteredLogs} />
      </TabsContent>
      <TabsContent value="monthly" className="mt-4">
        <MonthlyAttendanceReport data={filteredLogs} employees={employees} selectedMonth={new Date(selectedMonth)} />
      </TabsContent>
      <TabsContent value="monthly-inout" className="mt-4">
        <MonthlyInOutReport data={filteredLogs} employees={employees} selectedMonth={new Date(selectedMonth)} />
      </TabsContent>
    </>
  )}
</Tabs>
      </CardContent>
    </Card>
  );
};

export default AttendanceReportsPage;