
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceStatusProps {
  status: 'present' | 'absent' | 'late';
  showLabel?: boolean;
  className?: string;
  employeeType?: 'internal' | 'external';
}

export const AttendanceStatus = ({ 
  status, 
  showLabel = false, 
  className,
  employeeType = 'internal'
}: AttendanceStatusProps) => {
  // External employees don't show "late" status
  const displayStatus = employeeType === 'external' && status === 'late' ? 'present' : status;
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Circle
        className={cn(
          "h-3 w-3 fill-current",
          displayStatus === 'present' && "text-green-500",
          displayStatus === 'absent' && "text-gray-300",
          displayStatus === 'late' && "text-yellow-500"
        )}
      />
      {showLabel && (
        <span className="text-sm text-muted-foreground capitalize">
          {displayStatus}
        </span>
      )}
    </div>
  );
};
