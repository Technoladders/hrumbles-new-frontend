import { useState, useEffect } from "react";
import { useTimeTracker } from "@/hooks/TimeManagement/useTimeTracker";
import { isPreviousDayTimesheet, filterUnsubmittedTimesheets } from "@/utils/timeTrackerUtils";
import { useNavigate } from "react-router-dom";
import { useEmployeeLeaves } from "@/hooks/TimeManagement/useEmployeeLeaves";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isToday, parseISO } from "date-fns";

// Import the necessary components
import { DigitalTimeDisplay } from "@/components/TimeManagement/timetracker/DigitalTimeDisplay";
import { TimerControls } from "@/components/TimeManagement/timetracker/TimerControls";

interface TimeTrackerProps {
  employeeId: string;
}

const TimeTracker: React.FC<TimeTrackerProps> = ({ employeeId }) => {
  const navigate = useNavigate();
  const [hasPreviousDayUnsubmitted, setHasPreviousDayUnsubmitted] = useState(false);
  // --- START: ADDED STATE ---
  // This state specifically tracks if today's log needs submission.
  const [hasTodayUnsubmitted, setHasTodayUnsubmitted] = useState(false);
  // --- END: ADDED STATE ---
  const [canClockInToday, setCanClockInToday] = useState(true);

  const { isLeaveDay } = useEmployeeLeaves(employeeId);
  const isOnApprovedLeave = isLeaveDay(new Date());

  const {
    isTracking, time, timeLogs, handleClockIn, handleClockOut, loadTimeLogs, 
    isOnBreak, breakTime, handleStartBreak, handleEndBreak 
  } = useTimeTracker(employeeId);

  // This useEffect now manages all submission-related states.
useEffect(() => {
    if (timeLogs && timeLogs.length > 0) {
      // --- NEW SIMPLIFIED LOGIC ---
      // Check if ANY log entry exists for today's date.
      const todayLogExists = timeLogs.some(log => isToday(parseISO(log.date)));
      // You can only clock in if a log for today does NOT exist.
      setCanClockInToday(!todayLogExists);
      // --- END NEW LOGIC ---

      // --- Logic for Alerts ---
      const unsubmittedLogs = filterUnsubmittedTimesheets(timeLogs);
      
      const previousDayLogs = unsubmittedLogs.filter(isPreviousDayTimesheet);
      setHasPreviousDayUnsubmitted(previousDayLogs.length > 0);

      // Show "Submit Now" alert only if there is a log for today that is clocked out but NOT submitted.
      const todayUnsubmittedLog = unsubmittedLogs.find(log => 
        isToday(parseISO(log.date)) && log.clock_out_time
      );
      setHasTodayUnsubmitted(!!todayUnsubmittedLog);

    } else {
      // If no logs exist at all, reset all states
      setHasPreviousDayUnsubmitted(false);
      setHasTodayUnsubmitted(false);
      setCanClockInToday(true);
    }
  }, [timeLogs]);

  useEffect(() => {
    if (employeeId) {
      const interval = setInterval(() => loadTimeLogs(), 300000);
      return () => clearInterval(interval);
    }
  }, [employeeId, loadTimeLogs]);

  return (
    <Card className="shadow-md rounded-xl h-auto flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Timer className="h-5 w-5 text-purple-500 mr-2" />
          Time Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-2 flex flex-col h-full justify-between space-y-2">
        {/* Alert for PREVIOUS days (most critical) */}
        {hasPreviousDayUnsubmitted && (
          <Alert variant="destructive" className="p-3">
            <AlertDescription className="flex justify-between items-center text-xs">
              Submit previous timesheets before clocking in.
              <Button onClick={() => navigate("/employee/timesheet")} size="sm" variant="link" className="p-0 h-auto ml-1">Go Now</Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* --- START: NEW ALERT --- */}
        {/* Shows ONLY if today's log is unsubmitted, the user is clocked out, and there are no older logs pending */}
        {hasTodayUnsubmitted && !isTracking && !hasPreviousDayUnsubmitted && (
           <Alert variant="default" className="p-3">
            <AlertDescription className="flex justify-between items-center text-xs">
              Today's log is ready. Please submit your timesheet.
              <Button onClick={() => navigate("/employee/timesheet")} size="sm" variant="link" className="p-0 h-auto ml-1">Submit Now</Button>
            </AlertDescription>
          </Alert>
        )}
        {/* --- END: NEW ALERT --- */}
        
        <DigitalTimeDisplay 
          time={time} 
          timeLogs={timeLogs} 
          isOnBreak={isOnBreak} 
          breakTime={breakTime} 
        />
        
        <TimerControls
          isTracking={isTracking}
          isOnBreak={isOnBreak}
           handleClockIn={isOnApprovedLeave || hasPreviousDayUnsubmitted || !canClockInToday ? undefined : handleClockIn}
          handleClockOut={handleClockOut}
          handleStartBreak={handleStartBreak}
          handleEndBreak={handleEndBreak}
          isOnApprovedLeave={isOnApprovedLeave}
        />
      </CardContent>
    </Card>
  );
};

export default TimeTracker;