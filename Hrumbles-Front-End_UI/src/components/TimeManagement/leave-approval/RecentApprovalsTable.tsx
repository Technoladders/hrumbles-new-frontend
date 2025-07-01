
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
import { CheckSquare, X } from "lucide-react";
import { LeaveRequest } from "@/types/leave-types";

interface RecentApprovalsTableProps {
  approvals: LeaveRequest[];
  isLoading: boolean;
  onCancel: (request: LeaveRequest) => void;
}

export function RecentApprovalsTable({ 
  approvals, 
  isLoading,
  onCancel
}: RecentApprovalsTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive text-destructive-foreground">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  console.log("approvals", approvals);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Leave Type</TableHead>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Approved By</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={8} className="h-24 text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </TableCell>
          </TableRow>
        ) : approvals.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="h-24 text-center">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <CheckSquare className="w-8 h-8 mb-2 opacity-30" />
                <p>No recent approval activity</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          approvals.map((approval) => (
            <TableRow key={approval.id}>
              <TableCell className="font-medium">{approval.employee? `${approval.employee.first_name || ''} ${approval.employee.last_name || ''}`.trim() || approval.employee.email: 'Unknown'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: approval.leave_type?.color || '#3b82f6' }}
                  ></div>
                  {approval.leave_type?.name || 'Unknown'}
                </div>
              </TableCell>
              <TableCell>{format(parseISO(approval.start_date), 'MMM dd, yyyy')}</TableCell>
              <TableCell>{format(parseISO(approval.end_date), 'MMM dd, yyyy')}</TableCell>
              <TableCell>{approval.working_days} working days</TableCell>
              <TableCell>{getStatusBadge(approval.status)}</TableCell>
              <TableCell>{approval.approved_by_employee
  ? `${approval.approved_by_employee.first_name} ${approval.approved_by_employee.last_name}`
  : 'N/A'}
</TableCell>
              <TableCell className="text-right">
                {approval.status === 'approved' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onCancel(approval)}
                    className="text-destructive"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
