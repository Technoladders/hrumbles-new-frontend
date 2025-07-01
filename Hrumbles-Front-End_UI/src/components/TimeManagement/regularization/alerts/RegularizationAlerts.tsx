
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, AlertCircle } from "lucide-react";
import { TimeLog } from "@/types/time-tracker-types";
import { format } from "date-fns";

interface RegularizationAlertsProps {
  isFromTimesheet: boolean;
  existingTimesheet: TimeLog | null;
  isChecking: boolean;
  date: Date;
}

export const RegularizationAlerts = ({
  isFromTimesheet,
  existingTimesheet,
  isChecking,
  date
}: RegularizationAlertsProps) => {
  if (isFromTimesheet) {
    return (
      <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
        <Clock className="h-4 w-4 text-blue-800" />
        <AlertTitle>Timesheet Regularization</AlertTitle>
        <AlertDescription>
          You're requesting regularization for an existing timesheet entry. The original clock in/out times are 
          pre-filled. Please adjust the times as needed and provide a reason for the change.
        </AlertDescription>
      </Alert>
    );
  }

  if (!isFromTimesheet && existingTimesheet && !isChecking) {
    return (
      <Alert className="mb-4">
        <Clock className="h-4 w-4" />
        <AlertTitle>Existing Timesheet Found</AlertTitle>
        <AlertDescription>
          A timesheet entry exists for this date. Your regularization request will update this timesheet if approved.
          Original times: {format(new Date(existingTimesheet.clock_in_time), 'hh:mm a')} - 
          {existingTimesheet.clock_out_time ? format(new Date(existingTimesheet.clock_out_time), 'hh:mm a') : 'Not clocked out'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!isFromTimesheet && !existingTimesheet && !isChecking && date) {
    return (
      <Alert className="mb-4" variant="warning">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Timesheet Found</AlertTitle>
        <AlertDescription>
          No timesheet entry exists for this date. Your regularization request will create a new timesheet entry if approved.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
