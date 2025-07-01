
import { clockIn, clockOut } from "@/api/timeTracker";

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
    prepareClockInData
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
    }
  };

  return {
    handleClockIn,
    handleClockOut
  };
};
