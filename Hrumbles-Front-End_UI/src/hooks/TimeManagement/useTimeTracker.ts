
import { useTimeTrackerBaseState } from "./timeTracker/useTimeTrackerBaseState";
import { useTimeTrackerData } from "./timeTracker/useTimeTrackerData";
import { useTimeTrackerOperations } from "./timeTracker/useTimeTrackerOperations";
import { useTimer } from "./timeTracker/useTimer";
import { useProjectTimeData } from "./timeTracker/useProjectTimeData";
import { useEmployeeLeaves } from "./useEmployeeLeaves";
import { hasGracePeriodEnded, isWithinGracePeriod } from "@/utils/timeTrackerUtils";
import { autoTerminateTimeLog } from "@/api/timeTracker";
import { useTimeTrackerMonitoring } from "./timeTracker/useTimeTrackerMonitoring";

export const useTimeTracker = (employeeId: string) => {
  const baseState = useTimeTrackerBaseState();
  const {
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
  } = useTimer(isTracking);

  const {
    title,
    setTitle,
    projectTimeData,
    setProjectTimeData,
    totalWorkingHours,
    setTotalWorkingHours,
    prepareClockInData
  } = useProjectTimeData();

  const { leaveDays, isLeaveDay } = useEmployeeLeaves(employeeId);

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

  const { handleClockIn, handleClockOut } = useTimeTrackerOperations(
    employeeId,
    {
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
    loadTimeLogs
  };
};
