
import { useEffect } from "react";
import { checkActiveTimeLog, fetchTimeLogs } from "@/api/timeTracker";
import { formatTime } from "@/utils/timeFormatters";
import { TimeLog } from "@/types/time-tracker-types";
import { hasGracePeriodEnded } from "@/utils/timeTrackerUtils";

export const useTimeTrackerData = (
  employeeId: string,
  {
    isLoading,
    lastEmployeeId,
    setIsLoading,
    setLastEmployeeId,
    setCurrentTimeLog,
    setIsTracking,
    setElapsedSeconds,
    setTime,
    setNotes,
    setInGracePeriod,
    setTimeLogs,
    handleAutoTerminate,
    setIsOnBreak,
    setCurrentBreakLog,
  }: any
) => {
  const checkForActiveTimeLog = async () => {
    if (isLoading || !employeeId) return;
    
    setIsLoading(true);
    const activeLog = await checkActiveTimeLog(employeeId);
    
    if (activeLog) {
      setCurrentTimeLog(activeLog);
      setIsTracking(true);
      
      const startTime = new Date(activeLog.clock_in_time);
      const currentTime = new Date();

      // This is the new logic that correctly calculates work time by subtracting breaks
      let totalBreakSeconds = 0;
      let activeBreakLog = null;

      (activeLog.break_logs || []).forEach(breakLog => {
        if (breakLog.break_end_time) {
          // Add duration of completed breaks
          totalBreakSeconds += (breakLog.duration_minutes || 0) * 60;
        } else {
          // This is the currently active break
          activeBreakLog = breakLog;
          const breakStartTime = new Date(breakLog.break_start_time);
          // Add its duration from its start until now
          totalBreakSeconds += Math.floor((currentTime.getTime() - breakStartTime.getTime()) / 1000);
        }
      });

      const totalElapsedSecondsSinceClockIn = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
      
      // Calculate the actual work time by subtracting all break time
      const actualWorkSeconds = totalElapsedSecondsSinceClockIn - totalBreakSeconds;

      // Initialize the main timer with the corrected work duration
      setElapsedSeconds(actualWorkSeconds);
      setTime(formatTime(actualWorkSeconds));

      setNotes(activeLog.notes || "");
      
      // Restore the "on break" state if an active break was found
      if (activeBreakLog) {
        setIsOnBreak(true);
        setCurrentBreakLog(activeBreakLog);
      }
      
      if (hasGracePeriodEnded(activeLog.clock_in_time)) {
        handleAutoTerminate();
      }
    } else {
      // Reset timer when no active log found
      setElapsedSeconds(0);
      setTime(formatTime(0));
    }
    setIsLoading(false);
  };

  const loadTimeLogs = async () => {
    if (!employeeId) return;
    const logs = await fetchTimeLogs(employeeId);
    setTimeLogs(logs);
  };

  // Fetch data when employee changes
  useEffect(() => {
    if (!employeeId || employeeId === lastEmployeeId) return;
    
    setLastEmployeeId(employeeId);
    checkForActiveTimeLog();
    loadTimeLogs();
  }, [employeeId]);

  return {
    checkForActiveTimeLog,
    loadTimeLogs
  };
};
