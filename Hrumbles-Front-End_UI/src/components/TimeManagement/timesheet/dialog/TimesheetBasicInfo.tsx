import React from 'react';
import { formatDate } from "@/utils/timeFormatters";
import { TimeLog } from "@/types/time-tracker-types";
import { format } from "date-fns";

interface TimesheetBasicInfoProps {
  timesheet: TimeLog;
}

export const TimesheetBasicInfo: React.FC<TimesheetBasicInfoProps> = ({ timesheet }) => {
  const formatDuration = (minutes?: number | null) => {
    if (minutes === null || minutes === undefined) return "N/A";
    if (minutes === 0) return "0m";
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0 && remainingMinutes > 0) {
        return `${hours}h ${remainingMinutes}m`;
    } else if (hours > 0) {
        return `${hours}h`;
    } else {
        return `${remainingMinutes}m`;
    }
  };

  // Format clock-in and clock-out times
  const formatTime = (time: string | null) => {
    if (!time) return "N/A";
    return format(new Date(time), "h:mm a");
  };

  // --- NEW: Calculate total break minutes ---
  const totalBreakMinutes = timesheet.break_logs?.reduce(
    (sum, breakLog) => sum + (breakLog.duration_minutes || 0), 0
  ) || 0;

  console.log("Timesheet data (with breaks):", timesheet);

  return (
    // --- UPDATED: Changed grid to 3 columns for better layout ---
    <div className="grid grid-cols-3 gap-4">
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground">Date</h3>
        <p>{formatDate(timesheet.date)}</p>
      </div>
      
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground">Total Duration</h3>
        <p>{formatDuration(timesheet.duration_minutes)}</p>
      </div>

      {/* --- NEW: Display Total Breaks --- */}
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground">Total Breaks</h3>
        <p className="text-orange-600">{formatDuration(totalBreakMinutes)}</p>
      </div>
      
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground">Clock In</h3>
        <p>{formatTime(timesheet.clock_in_time)}</p>
      </div>
      
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground">Clock Out</h3>
        <p>{formatTime(timesheet.clock_out_time)}</p>
      </div>
      
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground">Status</h3>
        <p className="capitalize">{timesheet.status || 'Normal'}</p>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-muted-foreground">Submission Status</h3>
        <p>{timesheet.is_submitted ? 'Submitted' : 'Not submitted'}</p>
      </div>
    </div>
  );
};