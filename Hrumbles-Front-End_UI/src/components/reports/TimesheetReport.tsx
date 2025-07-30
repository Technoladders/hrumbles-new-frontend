// src/components/reports/time-and-attendance/TimesheetReport.tsx
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, isValid } from 'date-fns';
import { TimeLog } from './TimeAndAttendanceReportPage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye } from 'lucide-react';

interface TimesheetReportProps {
  data: TimeLog[];
}

const TimesheetReport: React.FC<TimesheetReportProps> = ({ data }) => {
  const [viewType, setViewType] = useState<'billable' | 'non_billable'>('billable');

  const processedData = useMemo(() => {
    return data.filter(log => viewType === 'billable' ? log.is_billable : !log.is_billable);
  }, [data, viewType]);
  
  const getStatusBadge = (log: TimeLog) => {
    if (log.is_approved === true) return <Badge color="green">Approved</Badge>;
    if (log.is_approved === false) return <Badge variant="destructive">Rejected</Badge>;
    if (log.is_submitted) return <Badge color="yellow">Pending Approval</Badge>;
    return <Badge variant="outline">Not Submitted</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timesheet Submission Summary</CardTitle>
        <CardDescription>Review submitted hours, approval status, and work notes.</CardDescription>
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
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedData.length > 0 ? (
                      processedData.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.employee_name}</TableCell>
                          <TableCell>{format(new Date(log.date), 'PPP')}</TableCell>
                          <TableCell>{log.total_working_hours}h</TableCell>
                          <TableCell>{getStatusBadge(log)}</TableCell>
                          <TableCell className="text-center">
                            {log.notes ? (
                               <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[625px]">
                                  <DialogHeader>
                                    <DialogTitle>Work Notes for {log.employee_name} on {format(new Date(log.date), 'PPP')}</DialogTitle>
                                  </DialogHeader>
                                  <ScrollArea className="h-72 w-full rounded-md border p-4">
                                    <div
                                        className="prose dark:prose-invert"
                                        dangerouslySetInnerHTML={{ __html: log.notes }}
                                    />
                                  </ScrollArea>
                                </DialogContent>
                              </Dialog>
                            ) : (
                                "N/A"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No {viewType === 'billable' ? 'billable' : 'non-billable'} timesheet records found for the selected criteria.
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

export default TimesheetReport;