// src/components/reports/time-and-attendance/AttendanceReport.tsx
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, isValid } from 'date-fns';
import { TimeLog } from './TimeAndAttendanceReportPage';
import { Badge } from '@/components/ui/badge';

interface AttendanceReportProps {
  data: TimeLog[];
}

const AttendanceReport: React.FC<AttendanceReportProps> = ({ data }) => {
  const [viewType, setViewType] = useState<'billable' | 'non_billable'>('billable');

  const processedData = useMemo(() => {
    return data.filter(log => viewType === 'billable' ? log.is_billable : !log.is_billable);
  }, [data, viewType]);

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return isValid(date) ? format(date, 'p') : 'Invalid Time';
  };
  
  const formatDuration = (minutes: number | null) => {
    if (minutes === null || isNaN(minutes)) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Attendance Log</CardTitle>
        <CardDescription>View employee clock-in, clock-out, and work duration details.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={viewType} onValueChange={(value) => setViewType(value as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="billable">Billable</TabsTrigger>
            <TabsTrigger value="non_billable">Non-Billable</TabsTrigger>
          </TabsList>
          <TabsContent value={viewType} className="mt-4">
             <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedData.length > 0 ? (
                      processedData.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.employee_name}</TableCell>
                          <TableCell>{format(new Date(log.date), 'PPP')}</TableCell>
                          <TableCell>{formatTime(log.clock_in_time)}</TableCell>
                          <TableCell>{formatTime(log.clock_out_time)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{formatDuration(log.duration_minutes)}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No {viewType === 'billable' ? 'billable' : 'non-billable'} attendance records found for the selected criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AttendanceReport;