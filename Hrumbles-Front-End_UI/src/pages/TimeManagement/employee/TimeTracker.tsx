import { useState, useEffect } from "react";
import { useTimeTracker } from "@/hooks/TimeManagement/useTimeTracker";
import { TimeTrackerCard } from "@/components/TimeManagement/timetracker/TimeTrackerCard";
import { Timer } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/TimeManagement/ui/alert";
import { hasUnsubmittedTimesheets, filterUnsubmittedTimesheets, isPreviousDayTimesheet } from "@/utils/timeTrackerUtils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEmployeeLeaves } from "@/hooks/TimeManagement/useEmployeeLeaves";
import { Card, CardContent } from "@/components/ui/card";

interface TimeTrackerProps {
  employeeId: string;
}

const TimeTracker: React.FC<TimeTrackerProps> = ({ employeeId }) => {
  const navigate = useNavigate();
  const [hasUnsubmitted, setHasUnsubmitted] = useState(false);
  const [hasPreviousDayUnsubmitted, setHasPreviousDayUnsubmitted] = useState(false);

  // Add leave check
  const { isLeaveDay } = useEmployeeLeaves(employeeId);
  const isOnApprovedLeave = isLeaveDay(new Date());

  const {
    isTracking,
    time,
    notes,
    setNotes,
    timeLogs,
    inGracePeriod,
    handleClockIn,
    handleClockOut,
    loadTimeLogs
  } = useTimeTracker(employeeId);

  // Check for unsubmitted timesheets
  useEffect(() => {
    if (timeLogs.length > 0) {
      const unsubmitted = filterUnsubmittedTimesheets(timeLogs);
      setHasUnsubmitted(unsubmitted.length > 0);
      setHasPreviousDayUnsubmitted(unsubmitted.some(isPreviousDayTimesheet));
    }
  }, [timeLogs]);

  // Reload time logs periodically to check for unsubmitted timesheets
  useEffect(() => {
    if (employeeId) {
      const interval = setInterval(() => {
        loadTimeLogs();
      }, 300000); // Check every 5 minutes
      return () => clearInterval(interval);
    }
  }, [employeeId, loadTimeLogs]);

  const goToTimesheet = () => {
    navigate("/employee/timesheet");
  };

  return (
    <Card className="shadow-md rounded-xl h-[300px] md:h-[325px] lg:h-[600px] flex flex-col">
      <CardContent className="pt-6 flex flex-col h-full">
        <div className="flex items-center mb-4">
          <Timer className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Time Tracker</h3>
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          <p className="text-sm text-muted-foreground mb-4">
            Track your daily work hours and attendance
          </p>
          {hasPreviousDayUnsubmitted && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Unsubmitted Timesheets</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                <div>You have unsubmitted timesheets from previous days. Please submit them before clocking in today.</div>
                <Button onClick={goToTimesheet} variant="outline">Go to Timesheets</Button>
              </AlertDescription>
            </Alert>
          )}
          {hasUnsubmitted && !hasPreviousDayUnsubmitted && (
            <Alert variant="warning" className="mb-6">
              <AlertTitle>Pending Timesheets</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                <div>You have timesheets that need to be submitted.</div>
                <Button onClick={goToTimesheet} variant="outline">Go to Timesheets</Button>
              </AlertDescription>
            </Alert>
          )}
          <TimeTrackerCard
            employeeId={employeeId}
            isTracking={isTracking}
            time={time}
            notes={notes}
            setNotes={setNotes}
            handleClockIn={isOnApprovedLeave ? undefined : (hasPreviousDayUnsubmitted ? undefined : handleClockIn)}
            handleClockOut={handleClockOut}
            inGracePeriod={inGracePeriod}
            timeLogs={timeLogs}
            isOnApprovedLeave={isOnApprovedLeave}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeTracker;