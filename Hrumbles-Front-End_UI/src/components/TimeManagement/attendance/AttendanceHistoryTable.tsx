
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AttendanceStatus } from "./AttendanceStatus";

interface AttendanceRecord {
  id: string;
  date: string;
  clock_in_time: string;
  clock_out_time: string | null;
  duration_minutes: number | null;
  status: string;
}

interface AttendanceHistoryTableProps {
  records: AttendanceRecord[];
  isExternal: boolean;
}

export const AttendanceHistoryTable = ({ records, isExternal }: AttendanceHistoryTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance History</CardTitle>
        <CardDescription>
          Your daily attendance records
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Clock In</TableHead>
              <TableHead>Clock Out</TableHead>
              <TableHead>Working Hours</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length > 0 ? (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{format(new Date(record.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{format(new Date(record.date), 'EEEE')}</TableCell>
                  <TableCell>{format(new Date(record.clock_in_time), 'hh:mm a')}</TableCell>
                  <TableCell>
                    {record.clock_out_time 
                      ? format(new Date(record.clock_out_time), 'hh:mm a')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {record.duration_minutes 
                      ? `${Math.floor(record.duration_minutes / 60)}h ${record.duration_minutes % 60}m`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <AttendanceStatus 
                      status={isExternal ? 'present' : (record.status === 'grace_period' ? 'late' : 'present')}
                      showLabel
                      employeeType={isExternal ? 'external' : 'internal'}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Clock className="w-8 h-8 mb-2 opacity-30" />
                    <p>No attendance records found</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
