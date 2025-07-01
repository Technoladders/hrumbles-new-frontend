
import { TimeLog } from "@/types/time-tracker-types";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface TimesheetActionsProps {
  isApproved: boolean;
  type: 'normal' | 'clarification';
  dialogTimesheet: TimeLog;
  clarificationDialogOpen: boolean;
  setClarificationDialogOpen: (open: boolean) => void;
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
  handleSendRequest: () => void;
  handleApprove: (timesheetId: string) => void;
  setDialogOpen: (open: boolean) => void;
}

export const TimesheetActions = ({
  isApproved,
  type,
  dialogTimesheet,
  clarificationDialogOpen,
  setClarificationDialogOpen,
  rejectionReason,
  setRejectionReason,
  handleSendRequest,
  handleApprove,
  setDialogOpen
}: TimesheetActionsProps) => {
  const [reasonError, setReasonError] = useState(false);

  return (
    <>
      {!isApproved && (
        <>
          <AlertDialog open={clarificationDialogOpen} onOpenChange={setClarificationDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <HelpCircle className="h-4 w-4" />
                {type === 'normal' ? 'Clarification' : 'Need More Clarification'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {type === 'normal' ? 'Request Clarification' : 'Request Additional Clarification'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {type === 'normal' 
                    ? 'Request additional information from the employee before making a decision.'
                    : 'Request additional information from the employee'
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <label htmlFor="reason" className="block text-sm font-medium mb-2">
                  Reason for {type === 'normal' ? '' : 'additional '}clarification
                </label>
                <Textarea 
                  id="reason" 
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (e.target.value.trim()) setReasonError(false);
                  }}
                  placeholder={`Please specify what ${type === 'normal' ? '' : 'additional '}information you need from the employee`}
                  className={`min-h-[100px] ${reasonError ? 'border-red-500' : ''}`}
                />
                {reasonError && (
                  <p className="text-red-500 text-sm mt-1">Please provide a reason for clarification</p>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setRejectionReason("");
                  setReasonError(false);
                }}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleSendRequest}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Send Request
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button 
            variant="default" 
            onClick={() => handleApprove(dialogTimesheet.id)}
            className="flex items-center gap-1"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </Button>
        </>
      )}
      {isApproved && (
        <div className="ml-auto">
          <Button 
            variant="outline" 
            onClick={() => setDialogOpen(false)}
          >
            Close
          </Button>
        </div>
      )}
    </>
  );
};
