import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TimeLog, Employee } from './AttendanceReportsPage';
import { getDaysInMonth, startOfMonth, format, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';

interface MonthlyInOutReportProps {
  data: TimeLog[];
  employees: Employee[];
  selectedMonth: Date;
}

const MonthlyInOutReport: React.FC<MonthlyInOutReportProps> = ({ data, employees, selectedMonth }) => {
  const [viewType, setViewType] = useState<'billable' | 'non_billable'>('non_billable');

  const { headers, rows } = useMemo(() => {
    const logs = data.filter(log => viewType === 'billable' ? log.is_billable : !log.is_billable);

    const firstDay = startOfMonth(selectedMonth);
    const numDays = getDaysInMonth(selectedMonth);
    const daysArray = Array.from({ length: numDays }, (_, i) => new Date(firstDay.getFullYear(), firstDay.getMonth(), i + 1));
    const headers = daysArray.map(day => ({ date: day, label: format(day, 'd') }));

    const employeeData = new Map<string, { [key: string]: { in: string | null; out: string | null } }>();
    logs.forEach(log => {
      if (!employeeData.has(log.employee_id)) employeeData.set(log.employee_id, {});
      employeeData.get(log.employee_id)![format(new Date(log.date), 'yyyy-MM-dd')] = { in: log.clock_in_time, out: log.clock_out_time };
    });

    const rows = employees.map(emp => ({
      employee: emp,
      dailyData: headers.map(h => employeeData.get(emp.id)?.[format(h.date, 'yyyy-MM-dd')] || { in: null, out: null }),
    }));

    return { headers, rows };
  }, [data, employees, selectedMonth, viewType]);

  const formatTime = (timeStr: string | null) => (timeStr ? format(new Date(timeStr), 'p') : 'N/A');

  return (
    <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl animate-scale-in w-full max-w-full">
      <CardHeader>
        <CardTitle>Monthly In-Out Report</CardTitle>
        <CardDescription>Track daily in-out times for the selected month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={viewType} onValueChange={setViewType as any}>
          <TabsList className="m-4">
            <TabsTrigger value="billable">Billable</TabsTrigger>
            <TabsTrigger value="non_billable">Non-Billable</TabsTrigger>
          </TabsList>
          <div className="overflow-x-auto max-w-full" style={{ maxWidth: '80vw', overflowX: 'auto' }}>
            <Table className="min-w-[1000px] w-full">
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="sticky left-0 bg-background z-10 min-w-[150px] align-middle">Employee</TableHead>
                  {headers.map(h => (
                    <TableHead key={h.label} colSpan={2} className={cn("text-center", isWeekend(h.date) && "text-muted-foreground")}>
                      {h.label}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow>
                  {headers.map((h, i) => (
                    <React.Fragment key={i}>
                      <TableHead className="text-center">In</TableHead>
                      <TableHead className="text-center">Out</TableHead>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.employee.id}>
                    <TableCell className="sticky left-0 bg-white z-10 font-medium">{row.employee.name}</TableCell>
                    {row.dailyData.map((d, i) => (
                      <React.Fragment key={i}>
                        <TableCell className={cn("text-center", { 'text-red-500': d.in === null })}>{formatTime(d.in)}</TableCell>
                        <TableCell className={cn("text-center", { 'text-red-500': d.out === null })}>{formatTime(d.out)}</TableCell>
                      </React.Fragment>
                    ))}
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

export default MonthlyInOutReport;