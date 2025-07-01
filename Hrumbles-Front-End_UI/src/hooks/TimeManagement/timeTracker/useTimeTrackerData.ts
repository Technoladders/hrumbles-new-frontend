
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
    handleAutoTerminate
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
      const diffSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
      setElapsedSeconds(diffSeconds);
      setTime(formatTime(diffSeconds));
      setNotes(activeLog.notes || "");
      
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
