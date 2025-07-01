
import { Clock } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";

export function WeeklyTimesheet() {
  // Get the current week days
  const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  
  // Hardcoded timesheet data for this week
  const timesheetData = [
    { day: 10, month: 'may', hours: '43h 26m' },
    { day: 11, month: 'may', hours: '23h 56m' },
    { day: 12, month: 'may', hours: '18h 6m' },
    { day: 13, month: 'may', hours: '19h 56m' },
    { day: 14, month: 'may', hours: '12h 30m' },
    { day: 15, month: 'may', hours: '8h 15m' },
    { day: 16, month: 'may', hours: '16h 45m' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {timesheetData.map((day, index) => (
        <div key={index} className="col-span-1">
          <div className="text-xs text-gray-500 mb-1">
            {day.month} {day.day}
          </div>
          <div className="flex items-center justify-center bg-gray-50 rounded-md p-2">
            <Clock className="h-3 w-3 text-gray-400 mr-1" />
            <span className="text-xs font-medium">{day.hours}</span>
          </div>
        </div>
      ))}
      
      <div className="col-span-1">
        <div className="text-xs text-gray-500 mb-1">
          Weekly Total
        </div>
        <div className="flex items-center justify-center bg-gray-50 rounded-md p-2">
          <span className="text-xs font-medium text-emerald-500">142h 54m</span>
        </div>
      </div>
    </div>
  );
}
