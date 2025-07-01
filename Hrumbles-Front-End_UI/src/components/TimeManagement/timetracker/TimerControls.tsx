
import { Button } from "@/components/ui/button";
import { Pause, Play, StopCircle } from "lucide-react";
import { Alert } from "@/components/TimeManagement/ui/alert";

interface TimerControlsProps {
  isTracking: boolean;
  hasUnsubmittedTimesheets: boolean;
  hasAssignedProjects: boolean;
  selectedEmployee: string;
  totalAllocatedTime: number;
  handleClockIn?: () => void;
  handleClockOut: () => void;
  hasProjects: boolean;
  isOnApprovedLeave?: boolean;
}

export function TimerControls({
  isTracking,
  hasUnsubmittedTimesheets,
  hasAssignedProjects,
  selectedEmployee,
  totalAllocatedTime,
  handleClockIn,
  handleClockOut,
  hasProjects,
  isOnApprovedLeave = false
}: TimerControlsProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {hasUnsubmittedTimesheets && (
        <Alert variant="warning" className="mb-2">
          You have unsubmitted timesheets. Please submit them before clocking in.
        </Alert>
      )}

      {isOnApprovedLeave && (
        <Alert variant="warning" className="mb-2">
          You are on approved leave today. Time tracking is disabled.
        </Alert>
      )}
      
      <div className="flex justify-center gap-4 w-full">
        {isTracking ? (
          <Button 
            variant="destructive"
            size="lg"
            className="w-full gap-2 shadow-md"
            onClick={handleClockOut}
          >
            <StopCircle className="h-5 w-5" />
            Log Out
          </Button>
        ) : (
          <Button 
            className="w-full gap-2 py-6 px-8 text-lg shadow-md bg-gradient-to-r from-primary to-primary/80" 
            onClick={handleClockIn}
            disabled={!selectedEmployee || !handleClockIn || hasUnsubmittedTimesheets || isOnApprovedLeave}
            size="lg"
            title={!handleClockIn ? "Submit previous timesheets before clocking in" : undefined}
          >
            <Play className="h-5 w-5" />
            Log In
            {hasUnsubmittedTimesheets && (
              <span className="text-xs block mt-1">(Submit previous timesheets first)</span>
            )}
            {isOnApprovedLeave && (
              <span className="text-xs block mt-1">(Disabled during approved leave)</span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
