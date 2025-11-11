import { useState } from 'react'; 
import { clockIn, clockOut, startBreak, endBreak } from "@/api/timeTracker";
import { formatTime } from "@/utils/timeFormatters";
import { useTimesheetStore } from '@/stores/timesheetStore';

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

  const [isProcessingClockIn, setIsProcessingClockIn] = useState(false);
  const openSubmissionModal = useTimesheetStore((state) => state.openSubmissionModal);

  const handleClockIn = async () => {
    // --- FIX: Add a guard clause ---
    if (!employeeId || isProcessingClockIn) return;
    
    setIsProcessingClockIn(true); // Set lock

    try {
    
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
    } catch (error) {
      console.error("Clock in failed:", error);
      // Handle error, maybe show a toast
    } finally {
      setIsProcessingClockIn(false); // Release lock
    }
  };

  const handleClockOut = async () => {
    console.log("DEBUG: 2. [useTimeTrackerOperations] handleClockOut called.");
    
    if (!currentTimeLog) {
      console.error("DEBUG: handleClockOut FAILED because currentTimeLog is null or undefined.");
      return;
    }

    const finalDurationMinutes = Math.floor(elapsedSeconds / 60);
    
    console.log("DEBUG: 3. [useTimeTrackerOperations] Preparing to open modal with:", {
      timeLogId: currentTimeLog.id,
      finalDurationMinutes: finalDurationMinutes
    });

    openSubmissionModal(currentTimeLog, finalDurationMinutes);
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
