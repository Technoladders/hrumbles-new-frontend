// src/components/reports/time-and-attendance/TimeAndAttendanceReportPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Search, User as UserIcon, CheckCircle } from 'lucide-react';
import { DateRangePickerField } from './DateRangePickerField';
import { supabase } from '@/integrations/supabase/client';
import AttendanceReport from './AttendanceReport';
import TimesheetReport from './TimesheetReport';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export interface TimeLog {
  id: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  duration_minutes: number | null;
  total_working_hours: number;
  is_submitted: boolean;
  is_approved: boolean | null;
  notes: string | null;
  employee_id: string;
  employee_name: string;
  is_billable: boolean;
  project_time_data: any;
}

interface Employee {
  id: string;
  name: string;
}

const TimeAndAttendanceReportPage: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [rawData, setRawData] = useState<TimeLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    key: 'selection',
  });
  const [searchTerm, setSearchTerm] = useState('');
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
      if (!organizationId || !dateRange.startDate || !dateRange.endDate) return;
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('time_logs')
          .select('*, hr_employees!time_logs_employee_id_fkey(first_name, last_name)')
          .eq('organization_id', organizationId)
          .gte('date', dateRange.startDate.toISOString().split('T')[0])
          .lte('date', dateRange.endDate.toISOString().split('T')[0])
          .order('date', { ascending: false });

        if (error) throw error;

        const formattedData: TimeLog[] = data.map((log: any) => {
          const projects = log.project_time_data?.projects;
          const isBillable = projects && Array.isArray(projects) && projects.length > 0;
          return {
            id: log.id,
            date: log.date,
            clock_in_time: log.clock_in_time,
            clock_out_time: log.clock_out_time,
            duration_minutes: log.duration_minutes,
            total_working_hours: log.total_working_hours,
            is_submitted: log.is_submitted,
            is_approved: log.is_approved,
            notes: log.notes,
            employee_id: log.employee_id,
            employee_name: log.hr_employees ? `${log.hr_employees.first_name} ${log.hr_employees.last_name}` : 'Unknown Employee',
            is_billable: isBillable,
            project_time_data: log.project_time_data,
          };
        });
        setRawData(formattedData);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred while fetching time logs.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [organizationId, dateRange]);

  const filteredData = useMemo(() => {
    return rawData.filter(log => {
      const matchesEmployee = selectedEmployees.length === 0 || selectedEmployees.includes(log.employee_id);
      const matchesSearch = searchTerm === '' || log.employee_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesEmployee && matchesSearch;
    });
  }, [rawData, searchTerm, selectedEmployees]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Time & Attendance Reports</CardTitle>
          <CardDescription>
            Analyze employee attendance, work duration, and timesheet submissions.
            Filter by date range, employee, and view either Billable or Non-Billable work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Date Range</Label>
              <DateRangePickerField dateRange={dateRange} onDateRangeChange={setDateRange} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search-employee">Search Employee</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-employee"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Filter Employees
                  {selectedEmployees.length > 0 && <Badge variant="secondary">{selectedEmployees.length}</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedEmployees([])}>Deselect All</Button>
                  {employees.map(employee => (
                    <Label key={employee.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted font-normal">
                      <Checkbox
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={() => setSelectedEmployees(prev =>
                          prev.includes(employee.id) ? prev.filter(id => id !== employee.id) : [...prev, employee.id]
                        )}
                      />
                      {employee.name}
                    </Label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>
      ) : (
        <Tabs defaultValue="attendance">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="attendance">Attendance Report</TabsTrigger>
            <TabsTrigger value="timesheet">Timesheet Summary</TabsTrigger>
          </TabsList>
          <TabsContent value="attendance" className="mt-4">
            <AttendanceReport data={filteredData} />
          </TabsContent>
          <TabsContent value="timesheet" className="mt-4">
            <TimesheetReport data={filteredData} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default TimeAndAttendanceReportPage;