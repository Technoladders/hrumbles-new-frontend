import { useEffect } from "react";

import { useTimeTrackerBaseState } from "./timeTracker/useTimeTrackerBaseState";
import { useTimeTrackerData } from "./timeTracker/useTimeTrackerData";
import { useTimeTrackerOperations } from "./timeTracker/useTimeTrackerOperations";
import { useTimer } from "./timeTracker/useTimer";
import { useProjectTimeData } from "./timeTracker/useProjectTimeData";
import { useEmployeeLeaves } from "./useEmployeeLeaves";
import { hasGracePeriodEnded, isWithinGracePeriod } from "@/utils/timeTrackerUtils";
import { autoTerminateTimeLog } from "@/api/timeTracker";
import { useTimeTrackerMonitoring } from "./timeTracker/useTimeTrackerMonitoring";
import { formatTime } from "@/utils/timeFormatters"; 

export const useTimeTracker = (employeeId: string) => {
  const baseState = useTimeTrackerBaseState();
  const {
     isOnBreak,
    currentBreakLog,
    setIsOnBreak,
    setCurrentBreakLog,
    isTracking,
    notes,
    timeLogs,
    currentTimeLog,
    inGracePeriod,
    isLoading,
    lastEmployeeId,
    setIsTracking,
    setNotes,
    setTimeLogs,
    setCurrentTimeLog,
    setInGracePeriod,
    setIsLoading,
    setLastEmployeeId,
    resetState
  } = baseState;

  const {
    elapsedSeconds,
    setElapsedSeconds,
    time,
    setTime
  } = useTimer(isTracking && !isOnBreak);

  const {
    time: breakTime,
    setElapsedSeconds: setBreakElapsedSeconds
  } = useTimer(isOnBreak);

  const {
    title,
    setTitle,
    projectTimeData,
    setProjectTimeData,
    totalWorkingHours,
    setTotalWorkingHours,
    prepareClockInData
  } = useProjectTimeData();

  const { isLeaveDay } = useEmployeeLeaves(employeeId);

  const handleAutoTerminate = async () => {
    if (!currentTimeLog) return;
    const success = await autoTerminateTimeLog(currentTimeLog.id, elapsedSeconds);
    if (success) {
      resetState();
      loadTimeLogs();
    }
  };

  const { checkForActiveTimeLog, loadTimeLogs } = useTimeTrackerData(
    employeeId,
    {
      setIsOnBreak,
      setCurrentBreakLog,
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
    }
  );

  // Use the monitoring hook to check for grace period and auto-termination
  useTimeTrackerMonitoring(
    isTracking,
    currentTimeLog,
    inGracePeriod,
    setInGracePeriod,
    elapsedSeconds,
    handleAutoTerminate
  );

  const { handleClockIn, handleClockOut, handleStartBreak, handleEndBreak  } = useTimeTrackerOperations(
    employeeId,
    {
      setElapsedSeconds,
      setTime,
        isOnBreak,
      currentBreakLog,
      setIsOnBreak,
      setCurrentBreakLog,
      notes,
      currentTimeLog,
      resetState,
      loadTimeLogs,
      setCurrentTimeLog,
      setIsTracking,
      elapsedSeconds,
      inGracePeriod,
      prepareClockInData
    }
  );

  // --- NEW: Effect to calculate ongoing break duration on load ---
  useEffect(() => {
    if (isOnBreak && currentBreakLog?.break_start_time) {
      const breakStartTime = new Date(currentBreakLog.break_start_time);
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - breakStartTime.getTime()) / 1000);
      setBreakElapsedSeconds(diffSeconds);
    }
  }, [isOnBreak, currentBreakLog, setBreakElapsedSeconds]);


  return {
    isTracking,
    time,
    notes,
    setNotes,
    title,
    setTitle,
    projectTimeData,
    setProjectTimeData,
    totalWorkingHours,
    setTotalWorkingHours,
    timeLogs,
    currentTimeLog,
    inGracePeriod,
    handleClockIn,
    handleClockOut,
    isOnBreak,
    breakTime,
    handleStartBreak,
    handleEndBreak,
    loadTimeLogs
  };
};
