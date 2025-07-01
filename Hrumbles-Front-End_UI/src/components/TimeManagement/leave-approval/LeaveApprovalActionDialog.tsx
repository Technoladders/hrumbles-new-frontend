
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

interface LeaveApprovalActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LeaveRequest | null;
  actionType: 'approve' | 'reject' | 'cancel';
  onConfirm: (requestId: string, reason?: string) => void;
}

export function LeaveApprovalActionDialog({
  open,
  onOpenChange,
  request,
  actionType,
  onConfirm,
}: LeaveApprovalActionDialogProps) {
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

  const actionConfig = {
    approve: {
      title: "Approve Leave Request",
      description: "Are you sure you want to approve this leave request?",
      confirmText: "Approve",
      confirmVariant: "default" as const,
      requiresReason: false
    },
    reject: {
      title: "Reject Leave Request",
      description: "Please provide a reason for rejecting this leave request.",
      confirmText: "Reject",
      confirmVariant: "destructive" as const,
      requiresReason: true
    },
    cancel: {
      title: "Cancel Approved Leave",
      description: "Please provide a reason for cancelling this approved leave.",
      confirmText: "Cancel Leave",
      confirmVariant: "destructive" as const,
      requiresReason: true
    }
  };

  const config = actionConfig[actionType];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">Employee:</div>
              <div>{request.employee?.name || 'Unknown'}</div>
              
              <div className="font-medium">Leave Type:</div>
              <div>{request.leave_type?.name || 'Unknown'}</div>
              
              <div className="font-medium">Period:</div>
              <div>
                {format(parseISO(request.start_date), 'MMM dd, yyyy')} - {format(parseISO(request.end_date), 'MMM dd, yyyy')}
              </div>
              
              <div className="font-medium">Working Days:</div>
              <div>{request.working_days} days</div>
            </div>
          </div>
          
          {(config.requiresReason || actionType !== 'approve') && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                {actionType === 'reject' ? 'Rejection Reason' : 'Cancellation Reason'}
              </Label>
              <Textarea
                id="reason"
                placeholder={`Please provide a reason for ${actionType === 'reject' ? 'rejecting' : 'cancelling'} this leave request`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="resize-none"
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant={config.confirmVariant} 
            onClick={handleConfirm}
            disabled={config.requiresReason && !reason.trim()}
          >
            {config.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
