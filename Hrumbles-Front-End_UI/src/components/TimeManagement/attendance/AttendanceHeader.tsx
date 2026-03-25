import { Button } from "@/components/ui/button";
import { Clock, Plus } from "lucide-react";

interface AttendanceHeaderProps {
  isExternal: boolean;
  onMarkAttendance: () => void;
}

export function AttendanceHeader({ isExternal, onMarkAttendance }: AttendanceHeaderProps) {
  return (
    <div className="mb-8 flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-gray-900 dark:text-gray-50">
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-900/40">
            <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </span>
          Attendance Records
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-11">
          View your attendance history, working hours and statistics
        </p>
      </div>

      {isExternal && (
        <Button
          onClick={onMarkAttendance}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Mark Attendance
        </Button>
      )}
    </div>
  );
}