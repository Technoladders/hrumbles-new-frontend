
import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";
import { LeaveRequest } from "@/types/leave-types";

interface CancelLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LeaveRequest | null;
  onConfirm: (requestId: string, reason: string) => void;
}

export function CancelLeaveDialog({
  open,
  onOpenChange,
  request,
  onConfirm,
}: CancelLeaveDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (request) {
      onConfirm(request.id, reason);
      setReason("");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
    }
    onOpenChange(newOpen);
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: request.leave_type?.color || '#3b82f6' }}
            />
            Cancel Leave Request
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this leave request?
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm bg-muted/20 p-3 rounded-md">
              <div className="font-medium">Leave Type:</div>
              <div>{request.leave_type?.name}</div>
              
              <div className="font-medium">Period:</div>
              <div>
                {format(parseISO(request.start_date), 'MMM dd, yyyy')} - {format(parseISO(request.end_date), 'MMM dd, yyyy')}
              </div>
              
              <div className="font-medium">Working Days:</div>
              <div>{request.working_days} days</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for cancellation</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for cancelling this leave request"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Keep Leave
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            Cancel Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
