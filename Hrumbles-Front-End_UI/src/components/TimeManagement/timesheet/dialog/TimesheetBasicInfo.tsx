import React from 'react';
import { formatDate } from "@/utils/timeFormatters";
import { TimeLog } from "@/types/time-tracker-types";
import { format } from "date-fns";
import { Clock, Calendar, Briefcase, FileCheck, CircleSlash, Hourglass, CheckCircle, AlertCircle } from 'lucide-react'; 

interface TimesheetBasicInfoProps {
  timesheet: TimeLog;
  temporaryClockOutTime?: string | null;
  temporaryDurationMinutes?: number | null;  // NEW: Added optional prop for temporary clock-out time
}

export const TimesheetBasicInfo: React.FC<TimesheetBasicInfoProps> = ({ timesheet, temporaryClockOutTime, temporaryDurationMinutes  }) => {
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

const getDayOfWeek = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Date Display */}
   <div className="lg:col-span-1 bg-green-100 rounded-lg border border-slate-200 flex flex-col items-center justify-center p-6 text-center">
    <Calendar className="w-16 h-16 text-blue-500 mb-4" />
    <p className="text-xl font-bold">{getDayOfWeek(timesheet.date)}</p>
    <p className="text-3xl font-bold text-slate-800">{formatDate(timesheet.date)}</p>
</div>

      {/* Right Column: Details Overview */}
      <div className="lg:col-span-2 p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white">
        <h2 className="text-2xl font-bold mb-6">Timesheet Details</h2>
        <div className="space-y-4">
{/* Total Duration */}
<div className="flex justify-between items-center">
  <div className="flex items-center">
    <Hourglass className="w-5 h-5 mr-3" />
    <p className="font-semibold">Total Duration</p>
  </div>
  {/* UPDATED: Prioritize the temporary duration, otherwise fall back to the saved one */}
  <p className="font-bold text-lg">
    {formatDuration(temporaryDurationMinutes ?? timesheet.duration_minutes)}
  </p>
</div>

          {/* Total Breaks */}
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <CircleSlash className="w-5 h-5 mr-3" />
              <p className="font-semibold">Total Breaks</p>
            </div>
            <p className="font-bold text-lg">{formatDuration(totalBreakMinutes)}</p>
          </div>

 {/* Time Log */}
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Briefcase className="w-5 h-5 mr-3" />
              <p className="font-semibold">Time Log</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Clock In block */}
              <div className="bg-white/10 rounded-md px-3 py-1 text-center">
                <p className="text-xs font-light tracking-wider opacity-80">IN</p>
                <p className="font-semibold text-sm">{formatTime(timesheet.clock_in_time)}</p>
              </div>
              {/* Clock Out block */}
              <div className="bg-white/10 rounded-md px-3 py-1 text-center">
                <p className="text-xs font-light tracking-wider opacity-80">OUT</p>
                {/* UPDATED: Prioritize temporary time if it exists, otherwise use the saved time */}
                <p className="font-semibold text-sm">{formatTime(temporaryClockOutTime || timesheet.clock_out_time)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};