import { Card, CardContent } from "@/components/ui/card";
import { CircularTimerDisplay } from "./CircularTimerDisplay";
import { TimelineActivityLog } from "./TimelineActivityLog";
import { TimerControls } from "./TimerControls";
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TimeLogDetails } from "@/components/TimeManagement/timesheet/dialog/TimeLogDetails";
import { useNavigate } from "react-router-dom";
import { useEmployees } from "@/hooks/TimeManagement/useEmployees";

interface TimeTrackerCardProps {
  employeeId: string;
  isTracking: boolean;
  time: string;
  notes: string;
  setNotes: (notes: string) => void;
  handleClockIn?: () => void;
  handleClockOut: () => void;
  inGracePeriod?: boolean;
  timeLogs: any[];
  isOnApprovedLeave?: boolean;
}

export function TimeTrackerCard({
  employeeId,
  isTracking,
  time,
  notes,
  setNotes,
  handleClockIn,
  handleClockOut,
  inGracePeriod = false,
  timeLogs,
  isOnApprovedLeave = false
}: TimeTrackerCardProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeLog, setSelectedTimeLog] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const { employees } = useEmployees();

  useEffect(() => {
    if (employeeId) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [employeeId]);

  useEffect(() => {
    if (timeLogs.length > 0) {
      setIsLoading(false);
    }
  }, [timeLogs]);

  const handleViewTimesheet = (log: any) => {
    setSelectedTimeLog(log);
    setDetailsDialogOpen(true);
  };

  const handleRegularizationRequest = () => {
    if (selectedTimeLog) {
      setDetailsDialogOpen(false);
      navigate('/employee/regularization', {
        state: {
          timeLogId: selectedTimeLog.id,
          employeeId: selectedTimeLog.employee_id,
          date: selectedTimeLog.date,
          clockIn: selectedTimeLog.clock_in_time,
          clockOut: selectedTimeLog.clock_out_time
        }
      });
    }
  };

  const selectedEmployeeData = employees.find(emp => emp.id === employeeId);
  const hasProjects = selectedEmployeeData?.has_projects === true;

  const getProjectName = (projectId: string | null) => {
    return projectId ? `Project ${projectId.substring(0, 8)}` : "Unassigned";
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="col-span-1">
        <CardContent className="p-6">
          <div className="space-y-6">
            <CircularTimerDisplay
              time={time}
              isTracking={isTracking}
              inGracePeriod={inGracePeriod}
            />
            <TimerControls
              isTracking={isTracking}
              hasAssignedProjects={hasProjects}
              selectedEmployee={employeeId}
              totalAllocatedTime={0}
              handleClockIn={isOnApprovedLeave ? undefined : handleClockIn}
              handleClockOut={handleClockOut}
              hasUnsubmittedTimesheets={timeLogs.some(log =>
                log.clock_out_time && !log.is_submitted
              )}
              hasProjects={hasProjects}
              isOnApprovedLeave={isOnApprovedLeave}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="col-span-1">
        <CardContent className="p-6">
          <TimelineActivityLog
            timeLogs={timeLogs}
            onViewDetails={handleViewTimesheet}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-gradient-to-b from-white to-slate-50">
          {selectedTimeLog && (
            <TimeLogDetails
              timeLog={selectedTimeLog}
              getProjectName={getProjectName}
              onRegularizationRequest={handleRegularizationRequest}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}