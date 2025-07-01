
import { toast } from "sonner";
import { formatTime } from "@/utils/timeFormatters";
import { TimeLog } from "@/types/time-tracker-types";
import { 
  checkActiveTimeLog, 
  fetchTimeLogs, 
  clockIn, 
  clockOut,
  autoTerminateTimeLog
} from "@/api/timeTracker";

export const useTimeTrackerAPI = (employeeId: string) => {
  const checkForActiveTimeLog = async (): Promise<TimeLog | null> => {
    if (!employeeId) return null;
    return await checkActiveTimeLog(employeeId);
  };

  const loadTimeLogs = async (): Promise<TimeLog[]> => {
    if (!employeeId) return [];
    return await fetchTimeLogs(employeeId);
  };

  const handleClockIn = async (
    clockInData: {
      notes: string;
      project_time_data?: any[];
      total_working_hours: number;
    }
  ): Promise<TimeLog | null> => {
    return await clockIn(
      employeeId, 
      clockInData.notes, 
      clockInData.project_time_data, 
      clockInData.total_working_hours
    );
  };

  const handleClockOut = async (
    timeLogId: string, 
    elapsedSeconds: number, 
    inGracePeriod: boolean
  ): Promise<boolean> => {
    if (!timeLogId) return false;
    return await clockOut(timeLogId, elapsedSeconds, inGracePeriod);
  };

  const handleAutoTerminate = async (
    timeLogId: string, 
    elapsedSeconds: number
  ): Promise<boolean> => {
    if (!timeLogId) return false;
    return await autoTerminateTimeLog(timeLogId, elapsedSeconds);
  };

  return {
    checkForActiveTimeLog,
    loadTimeLogs,
    handleClockIn,
    handleClockOut,
    handleAutoTerminate
  };
};
