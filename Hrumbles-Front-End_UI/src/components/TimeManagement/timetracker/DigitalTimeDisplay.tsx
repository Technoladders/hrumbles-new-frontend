import { CheckCircle, Utensils } from 'lucide-react';
import { format, isToday, parseISO, differenceInSeconds } from 'date-fns';

interface DigitalTimeDisplayProps {
  time: string;      // The running session timer, e.g., "04:02:40"
  timeLogs: any[];   // The list of all clock-in/out records for the user
  isOnBreak: boolean;  // Is the user currently on a break?
  breakTime: string;   // The running break timer
}

// MODIFIED: This helper now correctly parses the full ISO timestamp string.
const formatDisplayTime = (timeStr: string | null) => {
  if (!timeStr) return '-';
  try {
    const date = parseISO(timeStr); // Use parseISO for reliability
    return format(date, 'hh:mm a'); // Format as "08:02 AM"
  } catch (error) {
    console.error("Error parsing time:", timeStr, error);
    return '-';
  }
};

// --- NEW HELPER: Formats total seconds into HH:MM:SS ---
const formatSecondsToHHMMSS = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function DigitalTimeDisplay({ time, timeLogs, isOnBreak, breakTime }: DigitalTimeDisplayProps) {

  // Find the log for the current day to display its data.
  const todayLog = timeLogs.find(log => log.date && isToday(parseISO(log.date)));

  const clockInTime = todayLog ? todayLog.clock_in_time : null;
  const clockOutTime = todayLog ? todayLog.clock_out_time : null;

  const totalBreakMinutes = (todayLog?.break_logs || [])
    .filter(b => b.duration_minutes)
    .reduce((sum, breakItem) => sum + breakItem.duration_minutes, 0);
    
  const totalBreakHours = Math.floor(totalBreakMinutes / 60);
  const remainingBreakMinutes = totalBreakMinutes % 60;
  
  const totalBreakTimeDisplay = totalBreakMinutes > 0
    ? `${String(totalBreakHours).padStart(2, '0')}:${String(remainingBreakMinutes).padStart(2, '0')}`
    : '00:00';

  // --- START: CORRECTED DURATION LOGIC ---
  let sessionDurationDisplay = time; 

  if (clockInTime && clockOutTime) {
      try {
        const clockInDate = parseISO(clockInTime);
        const clockOutDate = parseISO(clockOutTime);
        
        // 1. Calculate the gross duration in seconds from the timestamps
        const grossTotalSeconds = differenceInSeconds(clockOutDate, clockInDate);
        
        // 2. Convert total break minutes to seconds
        const totalBreakSeconds = totalBreakMinutes * 60;

        // 3. Calculate net work seconds
        const netWorkSeconds = grossTotalSeconds - totalBreakSeconds;

        // 4. Format the result as HH:MM:SS
        sessionDurationDisplay = formatSecondsToHHMMSS(netWorkSeconds);
      } catch (e) {
        console.error("Could not calculate final duration", e);
        sessionDurationDisplay = "Error"; // Show an error if dates are invalid
      }
  }
  // --- END: CORRECTED DURATION LOGIC ---



  return (
    <div className="w-full bg-gray-50 p-2 rounded-lg border">
      {/* Date Header */}
      <div className="flex items-center text-sm text-gray-600 mb-4">
        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
        Clock {format(new Date(), 'eeee, d MMMM yyyy')}
      </div>

      {/* Clock In / Out Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white p-3 rounded-md border text-center">
          <p className="text-xs text-gray-500">Clock In</p>
          <p className="text-lg font-semibold">{formatDisplayTime(clockInTime)}</p>
        </div>
        <div className="bg-white p-3 rounded-md border text-center">
          <p className="text-xs text-gray-500">Clock Out</p>
          <p className="text-lg font-semibold">{formatDisplayTime(clockOutTime)}</p>
        </div>
      </div>
      
      {/* Break Info (Static placeholder) */}
      <div className="text-center text-gray-500 my-4">
        {/* <Utensils className="h-5 w-5 mx-auto mb-1" /> */}
        <p className="text-xs font-semibold">Live Tracker</p>
        {/* <p className="text-xs">12:00 - 01:30 pm</p> */}
      </div>
      
      {/* Corrected Current Time / Break Time Display */}
       <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          {/* Use the new sessionDurationDisplay variable */}
          <p className="text-2xl font-mono font-bold">{sessionDurationDisplay}</p>
          <p className="text-xs text-gray-500">Session Duration</p>
        </div>
        <div>
          <p className="text-2xl font-mono font-bold">
            {isOnBreak ? breakTime : totalBreakTimeDisplay}
          </p>
          <p className="text-xs text-gray-500">Break Time</p>
        </div>
      </div>
    </div>
  );
}