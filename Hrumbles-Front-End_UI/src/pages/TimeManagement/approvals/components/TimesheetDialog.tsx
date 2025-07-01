import { TimeLog } from "@/types/time-tracker-types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { TimesheetInfo } from "./dialog/TimesheetInfo";
import { TimesheetActions } from "./dialog/TimesheetActions";
import { TimeLogDetails } from "@/components/TimeManagement/timesheet/dialog/TimeLogDetails";


export interface DialogProps {
  dialogTimesheet: TimeLog | null;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  handleApprove: (timesheetId: string) => Promise<void>;
  handleRequestClarification: (timesheetId: string, reason: string) => Promise<void>;
  type: 'normal' | 'clarification';
}

const TimesheetDialog = ({
  dialogTimesheet,
  dialogOpen,
  setDialogOpen,
  handleApprove,
  handleRequestClarification,
  type
}: DialogProps) => {
  const [clarificationDialogOpen, setClarificationDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  if (!dialogTimesheet) return null;

  const handleSendRequest = () => {
    if (!rejectionReason.trim()) {
      return;
    }
    handleRequestClarification(dialogTimesheet.id, rejectionReason);
    setClarificationDialogOpen(false);
  };

  const getProjectName = (projectId: string | null) => {
    return projectId ? `Project ${projectId.substring(0, 8)}` : "Unassigned";
  };

  const isApproved = dialogTimesheet.is_approved || dialogTimesheet.approval_status === 'approved';

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="w-[95vw] max-w-[90vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[80vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle>
            {isApproved 
              ? "Approved Timesheet" 
              : type === 'normal' 
                ? "Review Timesheet" 
                : "Review Clarification"
            }
          </DialogTitle>
          <DialogDescription>
            {isApproved 
              ? "This timesheet has been approved" 
              : type === 'normal' 
                ? "Review the timesheet details before approving or requesting clarification"
                : "Review the employee's clarification response"
            }
          </DialogDescription>
        </DialogHeader>
        
        <TimesheetInfo dialogTimesheet={dialogTimesheet} type={type} />
        
        <div className="mt-4">
          <TimeLogDetails 
            timeLog={dialogTimesheet}
            getProjectName={getProjectName}
          />
        </div>

        <DialogFooter className="flex justify-between sm:justify-between mt-4">
          <TimesheetActions
            isApproved={isApproved}
            type={type}
            dialogTimesheet={dialogTimesheet}
            clarificationDialogOpen={clarificationDialogOpen}
            setClarificationDialogOpen={setClarificationDialogOpen}
            rejectionReason={rejectionReason}
            setRejectionReason={setRejectionReason}
            handleSendRequest={handleSendRequest}
            handleApprove={handleApprove}
            setDialogOpen={setDialogOpen}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TimesheetDialog;
// 