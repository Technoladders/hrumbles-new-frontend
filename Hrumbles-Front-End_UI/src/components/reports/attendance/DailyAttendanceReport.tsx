import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeLog } from './AttendanceReportsPage';
import { format, isValid } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface DailyAttendanceReportProps {
  data: TimeLog[];
}

const DailyAttendanceReport: React.FC<DailyAttendanceReportProps> = ({ data }) => {
  const [viewType, setViewType] = useState<'billable' | 'non_billable'>('non_billable');

  const processedData = useMemo(() => {
    return data.filter(log => viewType === 'billable' ? log.is_billable : !log.is_billable);
  }, [data, viewType]);

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return isValid(date) ? format(date, 'p') : 'Invalid';
  };

  const formatDuration = (minutes: number | null) => {
    if (minutes === null || isNaN(minutes) || minutes < 0) return '00h:00m:00s';
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    const s = Math.round(((minutes * 60) % 60));
    return `${String(h).padStart(2, '0')}h:${String(m).padStart(2, '0')}m:${String(s).padStart(2, '0')}s`;
  };

  return (
    <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl animate-scale-in">
      <CardContent className="p-0">
        <Tabs value={viewType} onValueChange={setViewType as any}>
          <TabsList className="m-4">
            <TabsTrigger value="billable">Billable</TabsTrigger>
            <TabsTrigger value="non_billable">Non-Billable</TabsTrigger>
          </TabsList>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Employee</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Working Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedData.length > 0 ? (
                  processedData.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="sticky left-0 bg-white z-10 font-medium">{log.employee_name}</TableCell>
                      <TableCell>{formatTime(log.clock_in_time)}</TableCell>
                      <TableCell>{formatTime(log.clock_out_time)}</TableCell>
                      <TableCell>{formatDuration(log.duration_minutes)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DailyAttendanceReport;