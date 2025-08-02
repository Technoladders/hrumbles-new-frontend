import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TimeLog, Employee } from './AttendanceReportsPage';
import { getDaysInMonth, startOfMonth, format, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';

interface MonthlyAttendanceReportProps {
  data: TimeLog[];
  employees: Employee[];
  selectedMonth: Date;
}

const MonthlyAttendanceReport: React.FC<MonthlyAttendanceReportProps> = ({ data, employees, selectedMonth }) => {
  const [viewType, setViewType] = useState<'billable' | 'non_billable'>('non_billable');

  const { headers, rows } = useMemo(() => {
    const logs = data.filter(log => viewType === 'billable' ? log.is_billable : !log.is_billable);

    const firstDay = startOfMonth(selectedMonth);
    const numDays = getDaysInMonth(selectedMonth);
    const daysArray = Array.from({ length: numDays }, (_, i) => new Date(firstDay.getFullYear(), firstDay.getMonth(), i + 1));
    const headers = daysArray.map(day => ({ date: day, label: format(day, 'd') }));

    const employeeData = new Map<string, { [key: string]: number | null }>();
    logs.forEach(log => {
      if (!employeeData.has(log.employee_id)) employeeData.set(log.employee_id, {});
      employeeData.get(log.employee_id)![format(new Date(log.date), 'yyyy-MM-dd')] = log.duration_minutes;
    });

    const rows = employees.map(emp => {
      const empLogs = employeeData.get(emp.id) || {};
      let totalPresent = 0;
      const dailyData = headers.map(h => {
        const duration = empLogs[format(h.date, 'yyyy-MM-dd')];
        if (duration !== undefined && duration !== null && duration > 0) totalPresent++;
        return { date: h.date, duration };
      });
      const totalWeekdays = daysArray.filter(d => !isWeekend(d)).length;
      return { employee: emp, dailyData, totalPresent, totalAbsent: totalWeekdays - totalPresent };
    });

    return { headers, rows };
  }, [data, employees, selectedMonth, viewType]);

  const formatDuration = (minutes: number | null) => {
    if (minutes === null || isNaN(minutes) || minutes <= 0) return '00h 00m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  };

  return (
    <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl animate-scale-in w-full max-w-full">
      <CardHeader>
        <CardTitle>Monthly Attendance Report</CardTitle>
        <CardDescription>View attendance details for the selected month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={viewType} onValueChange={setViewType as any}>
          <TabsList className="m-4">
            <TabsTrigger value="billable">Billable</TabsTrigger>
            <TabsTrigger value="non_billable">Non-Billable</TabsTrigger>
          </TabsList>
          <div className="overflow-x-auto max-w-full" style={{ maxWidth: '85vw', overflowX: 'auto' }}>
            <Table className="min-w-[1000px] w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Employee</TableHead>
                  {headers.map(h => (
                    <TableHead key={h.label} className={cn("text-center", isWeekend(h.date) && "text-muted-foreground")}>
                      {h.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Total Present</TableHead>
                  <TableHead className="text-center">Total Absent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.employee.id}>
                    <TableCell className="sticky left-0 bg-white z-10 font-medium">{row.employee.name}</TableCell>
                    {row.dailyData.map((d, i) => (
                      <TableCell key={i} className={cn("text-center", { 'bg-red-100 dark:bg-red-900/50': d.duration === 0, 'bg-green-100 dark:bg-green-900/50': d.duration && d.duration > 0 })}>
                        {d.duration !== undefined ? formatDuration(d.duration) : 'N/A'}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold">{row.totalPresent}</TableCell>
                    <TableCell className="text-center font-bold">{row.totalAbsent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MonthlyAttendanceReport;