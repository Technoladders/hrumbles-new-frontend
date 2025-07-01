
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RegularizationRequest } from "@/types/time-tracker-types";
import { format, parseISO } from "date-fns";

interface RegularizationDetailsProps {
  request: RegularizationRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RegularizationDetails = ({ request, open, onOpenChange }: RegularizationDetailsProps) => {
  if (!request) return null;

  const formatDateTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return "N/A";
    try {
      return format(parseISO(dateTimeStr), "MMM dd, yyyy hh:mm a");
    } catch (error) {
      console.error("Error formatting date time:", error);
      return dateTimeStr;
    }
  };

  // Format time preserving original input time without timezone conversion
  const formatTimeOnly = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return "N/A";
    try {
      console.log("Details modal formatting time from:", dateTimeStr);
      
      // Extract only the time portion from the ISO string to prevent timezone conversion
      const timeParts = dateTimeStr.split('T');
      if (timeParts.length < 2) {
        console.log("Invalid dateTimeStr format in details, using fallback");
        return format(parseISO(dateTimeStr), "hh:mm a");
      }
      
      // Extract time part and remove any timezone information
      let timePart = timeParts[1];
      timePart = timePart.split('+')[0].split('-')[0].split('Z')[0];
      
      // Extract hours and minutes
      const timeComponents = timePart.split(':');
      const hours = parseInt(timeComponents[0], 10);
      const minutes = parseInt(timeComponents[1], 10);
      
      // Create a new date object with just the time info
      const timeDate = new Date();
      timeDate.setHours(hours, minutes, 0, 0);
      
      // Format in 12-hour format
      return format(timeDate, "hh:mm a");
    } catch (error) {
      console.error("Error formatting time:", error, "for value:", dateTimeStr);
      // If there's an error, log additional details to help diagnose
      if (dateTimeStr) {
        console.log("Original dateTimeStr:", dateTimeStr);
      }
      return dateTimeStr || "N/A";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Regularization Request Details</DialogTitle>
          <DialogDescription>
            Review the details of this regularization request
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                {request.employees?.name}
              </h3>
              <p className="text-sm text-muted-foreground">{request.employees?.department}</p>
            </div>
            {getStatusBadge(request.status)}
          </div>
          
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{format(new Date(request.date), "MMMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Submitted On</p>
              <p className="font-medium">{format(new Date(request.created_at), "MMMM dd, yyyy")}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Time Adjustment</h4>
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Original Clock In</p>
                  <p className="font-medium">{formatTimeOnly(request.original_clock_in)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Original Clock Out</p>
                  <p className="font-medium">{formatTimeOnly(request.original_clock_out)}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Requested Clock In</p>
                  <p className="font-medium">{formatTimeOnly(request.requested_clock_in)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requested Clock Out</p>
                  <p className="font-medium">{formatTimeOnly(request.requested_clock_out)}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Reason for Regularization</h4>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm">{request.reason}</p>
            </div>
          </div>

          {request.approver_notes && (
            <div>
              <h4 className="text-sm font-semibold mb-2">
                {request.status === 'approved' ? 'Approval Notes' : 'Rejection Reason'}
              </h4>
              <div className={`p-4 rounded-lg ${
                request.status === 'approved' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <p className="text-sm">{request.approver_notes}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
