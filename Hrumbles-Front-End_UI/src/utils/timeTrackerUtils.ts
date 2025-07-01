
import { TimeTrackerSettings } from "@/types/time-tracker-types";

/**
 * Default time tracker settings
 */
export const DEFAULT_SETTINGS: TimeTrackerSettings = {
workingHoursPerDay: 9 , 
  gracePeriodHours: 1  
};

/**
 * Calculate expected clock out time based on settings
 */
export const calculateExpectedClockOutTime = (
  clockInTime: string, 
  settings: TimeTrackerSettings = DEFAULT_SETTINGS
): Date => {
  const clockIn = new Date(clockInTime);
  const expectedClockOut = new Date(clockIn);
  expectedClockOut.setHours(clockIn.getHours() + settings.workingHoursPerDay);
  return expectedClockOut;
};

/**
 * Calculate grace period end time
 */
export const calculateGracePeriodEndTime = (
  clockInTime: string, 
  settings: TimeTrackerSettings = DEFAULT_SETTINGS
): Date => {
  const expectedClockOut = calculateExpectedClockOutTime(clockInTime, settings);
  const gracePeriodEnd = new Date(expectedClockOut);
  gracePeriodEnd.setHours(expectedClockOut.getHours() + settings.gracePeriodHours);
  return gracePeriodEnd;
};

/**
 * Check if current time is within grace period
 */
export const isWithinGracePeriod = (
  clockInTime: string,
  settings: TimeTrackerSettings = DEFAULT_SETTINGS
): boolean => {
  const now = new Date();
  const expectedClockOut = calculateExpectedClockOutTime(clockInTime, settings);
  const gracePeriodEnd = calculateGracePeriodEndTime(clockInTime, settings);
  
  return now > expectedClockOut && now <= gracePeriodEnd;
};

/**
 * Check if grace period has ended
 */
export const hasGracePeriodEnded = (
  clockInTime: string,
  settings: TimeTrackerSettings = DEFAULT_SETTINGS
): boolean => {
  const now = new Date();
  const gracePeriodEnd = calculateGracePeriodEndTime(clockInTime, settings);
  
  return now > gracePeriodEnd;
};

/**
 * Format time for display (HH:MM)
 */
export const formatTimeDisplay = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Check for unsubmitted timesheets
 */
export const hasUnsubmittedTimesheets = (timeLogs: any[]): boolean => {
  return timeLogs.some(log => 
    (log.clock_out_time && !log.is_submitted) || 
    (log.status === 'auto_terminated' && !log.is_submitted)
  );
};

/**
 * Filter unsubmitted timesheets
 */
export const filterUnsubmittedTimesheets = (timeLogs: any[]): any[] => {
  return timeLogs.filter(log => 
    (log.clock_out_time && !log.is_submitted) || 
    (log.status === 'auto_terminated' && !log.is_submitted)
  );
};

/**
 * Check if timesheet is from previous day
 */
export const isPreviousDayTimesheet = (timeLog: any): boolean => {
  if (!timeLog || !timeLog.date) return false;
  
  const logDate = new Date(timeLog.date);
  const today = new Date();
  
  // Reset hours to compare just the dates
  logDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return logDate < today;
};
