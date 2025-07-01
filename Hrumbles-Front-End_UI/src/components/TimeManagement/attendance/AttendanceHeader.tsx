
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface AttendanceHeaderProps {
  isExternal: boolean;
  onMarkAttendance: () => void;
}

export function AttendanceHeader({ isExternal, onMarkAttendance }: AttendanceHeaderProps) {
  return (
    <div className="mb-8 flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-primary">
          <Clock className="h-6 w-6" />
          Attendance Records
        </h1>
        <p className="text-muted-foreground">
          View your attendance history and statistics
        </p>
      </div>
      
      {isExternal && (
        <Button onClick={onMarkAttendance} className="shadow-md">
          Mark Attendance
        </Button>
      )}
    </div>
  );
}
