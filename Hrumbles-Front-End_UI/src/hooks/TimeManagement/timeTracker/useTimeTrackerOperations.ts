
import { clockIn, clockOut, startBreak, endBreak } from "@/api/timeTracker";
import { formatTime } from "@/utils/timeFormatters";

export const useTimeTrackerOperations = (
  employeeId: string,
  {
    notes,
    currentTimeLog,
    resetState,
    loadTimeLogs,
    setCurrentTimeLog,
    setIsTracking,
    elapsedSeconds,
    inGracePeriod,
    prepareClockInData,
     setElapsedSeconds,
    setTime,
    setIsOnBreak,
    setCurrentBreakLog,
    currentBreakLog
  }: any
) => {
  const handleClockIn = async () => {
    if (!employeeId) return;
    
    const clockInData = prepareClockInData(notes);
    const newTimeLog = await clockIn(
      employeeId, 
      clockInData.notes,
      clockInData.project_time_data,
      clockInData.total_working_hours
    );
    
    if (newTimeLog) {
      setCurrentTimeLog(newTimeLog);
      setIsTracking(true);
      loadTimeLogs();
    }
  };

  const handleClockOut = async () => {
    if (!currentTimeLog) return;
    
    const success = await clockOut(currentTimeLog.id, elapsedSeconds, inGracePeriod);
    if (success) {
      resetState();
      loadTimeLogs();
      if (setElapsedSeconds && setTime) {
        setElapsedSeconds(0);
        setTime(formatTime(0));
      }
    }
  };

  // --- NEW: handleStartBreak ---
  const handleStartBreak = async (breakType: 'lunch' | 'coffee') => {
    if (!currentTimeLog) return;
    const newBreakLog = await startBreak(currentTimeLog.id, breakType);
    if (newBreakLog) {
      setIsOnBreak(true);
      setCurrentBreakLog(newBreakLog);
      loadTimeLogs(); // Refresh to show the new break in the log
    }
  };

  // --- NEW: handleEndBreak ---
  const handleEndBreak = async () => {
    if (!currentBreakLog) return;
    const success = await endBreak(currentBreakLog.id);
    if (success) {
      setIsOnBreak(false);
      setCurrentBreakLog(null);
      loadTimeLogs(); // Refresh to get the end time and duration
    }
  };

  return {
    handleClockIn,
    handleClockOut,
    handleStartBreak, 
    handleEndBreak
  };
};
