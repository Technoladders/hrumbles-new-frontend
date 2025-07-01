
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { LeaveRequest } from "@/types/leave-types";
import { Badge } from "@/components/ui/badge";

interface LeaveRequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LeaveRequest | null;
}

export function LeaveRequestDetailsDialog({
  open,
  onOpenChange,
  request
}: LeaveRequestDetailsDialogProps) {
  if (!request) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: request.leave_type?.color || '#3b82f6' }}
            />
            Leave Request Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div className="flex justify-between items-center">
            <div className="font-medium text-lg">{request.leave_type?.name}</div>
            {getStatusBadge(request.status)}
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm bg-muted/20 p-3 rounded-md">
              <div className="font-medium">From:</div>
              <div>{format(parseISO(request.start_date), 'MMM dd, yyyy')}</div>
              
              <div className="font-medium">To:</div>
              <div>{format(parseISO(request.end_date), 'MMM dd, yyyy')}</div>
              
              <div className="font-medium">Working Days:</div>
              <div>{request.working_days} days</div>
              
              <div className="font-medium">Holiday Days:</div>
              <div>{request.holiday_days} days</div>
              
              <div className="font-medium">Total Days:</div>
              <div>{request.total_days} days</div>
              
              <div className="font-medium">Requested On:</div>
              <div>{request.created_at ? format(parseISO(request.created_at), 'MMM dd, yyyy') : 'N/A'}</div>
            </div>
          </div>
          
          {request.notes && (
            <div className="space-y-2">
              <div className="font-medium">Notes:</div>
              <div className="text-sm p-3 bg-muted/20 rounded-md">
                {request.notes}
              </div>
            </div>
          )}
          
          {request.status === 'approved' && request.approved_at && (
            <div className="space-y-2">
              <div className="font-medium">Approved On:</div>
              <div className="text-sm">{format(parseISO(request.approved_at), 'MMM dd, yyyy')}</div>
            </div>
          )}
          
          {request.status === 'rejected' && request.rejection_reason && (
            <div className="space-y-2">
              <div className="font-medium">Rejection Reason:</div>
              <div className="text-sm p-3 bg-red-50 text-red-700 rounded-md">
                {request.rejection_reason}
              </div>
            </div>
          )}
          
          {request.status === 'cancelled' && request.cancelled_at && (
            <div className="space-y-2">
              <div className="font-medium">Cancelled On:</div>
              <div className="text-sm">{format(parseISO(request.cancelled_at), 'MMM dd, yyyy')}</div>
              
              {request.cancellation_reason && (
                <>
                  <div className="font-medium">Cancellation Reason:</div>
                  <div className="text-sm p-3 bg-gray-50 rounded-md">
                    {request.cancellation_reason}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
