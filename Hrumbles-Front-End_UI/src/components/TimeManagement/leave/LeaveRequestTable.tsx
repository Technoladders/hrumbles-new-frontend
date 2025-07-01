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
import { Calendar, Eye, X } from "lucide-react";
import { LeaveRequest } from "@/types/leave-types";

interface LeaveRequestTableProps {
  requests: LeaveRequest[];
  onCancel: (request: LeaveRequest) => void;
  onViewDetails: (request: LeaveRequest) => void;
}

export function LeaveRequestTable({ 
  requests, 
  onCancel,
  onViewDetails 
}: LeaveRequestTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const canCancelRequest = (request: LeaveRequest) => {
    return request.status === 'pending' || request.status === 'approved';
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Leave Type</TableHead>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Calendar className="w-8 h-8 mb-2 opacity-30" />
                <p>No leave requests found</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: request.leave_type?.color || '#3b82f6' }}
                  ></div>
                  {request.leave_type?.name}
                </div>
              </TableCell>
              <TableCell>{format(parseISO(request.start_date), 'MMM dd, yyyy')}</TableCell>
              <TableCell>{format(parseISO(request.end_date), 'MMM dd, yyyy')}</TableCell>
              <TableCell>{request.working_days} working days</TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewDetails(request)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canCancelRequest(request) && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onCancel(request)}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
