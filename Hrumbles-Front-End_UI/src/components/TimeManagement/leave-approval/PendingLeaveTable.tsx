import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Calendar, Check, X } from "lucide-react";
import { LeaveRequest } from "@/types/leave-types";

interface PendingLeaveTableProps {
  requests: LeaveRequest[];
  isLoading: boolean;
  onApprove: (request: LeaveRequest) => void;
  onReject: (request: LeaveRequest) => void;
}

export function PendingLeaveTable({ 
  requests, 
  isLoading,
  onApprove,
  onReject
}: PendingLeaveTableProps) {
  console.log("PendingLeaveTable requests", requests);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Leave Type</TableHead>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Days</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </TableCell>
          </TableRow>
        ) : requests.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Calendar className="w-8 h-8 mb-2 opacity-30" />
                <p>No pending leave requests</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">
            {request.employee? `${request.employee.first_name || ''} ${request.employee.last_name || ''}`.trim() || request.employee.email: 'Unknown'}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: request.leave_type?.color || '#3b82f6' }}
                  ></div>
                  {request.leave_type?.name || 'Unknown'}
                </div>
              </TableCell>
              <TableCell>
                {request.start_date ? format(parseISO(request.start_date), 'MMM dd, yyyy') : 'N/A'}
              </TableCell>
              <TableCell>
                {request.end_date ? format(parseISO(request.end_date), 'MMM dd, yyyy') : 'N/A'}
              </TableCell>
              <TableCell>{request.working_days} working days</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onApprove(request)}
                    className="text-green-600 border-green-600"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onReject(request)}
                    className="text-destructive border-destructive"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}