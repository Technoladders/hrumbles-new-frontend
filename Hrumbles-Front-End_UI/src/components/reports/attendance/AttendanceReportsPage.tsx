// src/components/reports/attendance/AttendanceReportsPage.tsx
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
import DailyAttendanceReport from './DailyAttendanceReport';
import MonthlyAttendanceReport from './MonthlyAttendanceReport';
import MonthlyInOutReport from './MonthlyInOutReport';

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
        const { data, error } = await supabase.from('hr_employees').select('id, first_name, last_name').eq('organization_id', organizationId).order('first_name');
        if (error) throw error;
        setEmployees(data.map(e => ({ id: e.id, name: `${e.first_name} ${e.last_name}` })));
      } catch (err: any) { setError('Failed to fetch employee list.'); }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance & In-Out Reports</CardTitle>
        <CardDescription>Analyze daily and monthly attendance records for your team.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
              <TabsTrigger value="monthly">Monthly Attendance</TabsTrigger>
              <TabsTrigger value="monthly-inout">Monthly In-Out</TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
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
                        <Checkbox checked={selectedEmployees.includes(e.id)} onCheckedChange={() => setSelectedEmployees(p => p.includes(e.id) ? p.filter(id => id !== e.id) : [...p, e.id])}/>
                        {e.name}
                      </Label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {activeTab === 'daily' ? (
                <input type="date" value={format(selectedDate, 'yyyy-MM-dd')} onChange={e => setSelectedDate(new Date(e.target.value))} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"/>
              ) : (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select Month" /></SelectTrigger>
                  <SelectContent>{monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
          ) : error ? (
            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>
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