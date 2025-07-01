
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RegularizationRequest } from "@/types/time-tracker-types";

interface RegularizationActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'approve' | 'reject' | null;
  approverNotes: string;
  onApproverNotesChange: (notes: string) => void;
  onAction: () => void;
}

export const RegularizationActionDialog = ({
  open,
  onOpenChange,
  actionType,
  approverNotes,
  onApproverNotesChange,
  onAction
}: RegularizationActionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actionType === 'approve' ? 'Approve Regularization Request' : 'Reject Regularization Request'}
          </DialogTitle>
          <DialogDescription>
            {actionType === 'approve' 
              ? 'This will update the timesheet with the requested time.' 
              : 'Please provide a reason for rejecting this request.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="notes" className="text-sm font-medium">
              {actionType === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
            </label>
            <Textarea
              id="notes"
              placeholder={actionType === 'approve' 
                ? "Add any additional comments (optional)" 
                : "Please explain why this request is being rejected"}
              value={approverNotes}
              onChange={(e) => onApproverNotesChange(e.target.value)}
              required={actionType === 'reject'}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant={actionType === 'approve' ? "default" : "destructive"}
            onClick={onAction}
            className="gap-2"
          >
            {actionType === 'approve' ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
