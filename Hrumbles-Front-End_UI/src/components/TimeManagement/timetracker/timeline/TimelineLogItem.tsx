
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TimeLog } from "@/types/time-tracker-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TimelineLogItemProps {
  log: TimeLog;
  onViewDetails: () => void;
}

export function TimelineLogItem({ log, onViewDetails }: TimelineLogItemProps) {
  const getStatusBadge = (log: TimeLog) => {
    if (log.is_approved) {
      return { color: "bg-green-500/10 text-green-600", text: "Approved" };
    }
    if (log.is_submitted) {
      return { color: "bg-purple-500/10 text-purple-500", text: "Submitted" };
    }
    return { color: "bg-orange-500/10 text-orange-500", text: "Pending" };
  };

  const formatTimeDisplay = (timeStr: string | null) => {
    if (!timeStr) return "N/A";
    return format(new Date(timeStr), "h:mm a");
  };

  const calculateWorkingHours = (log: TimeLog) => {
    if (log.duration_minutes) {
      const hours = Math.floor(log.duration_minutes / 60);
      const minutes = log.duration_minutes % 60;
      return `${hours}h ${minutes}m`;
    }
    return "In progress";
  };

  const badge = getStatusBadge(log);
  const isAbsent = log.status === 'absent';
  const logDate = format(new Date(log.date || log.clock_in_time), "MMM dd, yyyy");
  const isApproved = log.is_approved === true;

  return (
    <div className="relative">
      <div className={cn(
        "absolute left-3 top-6 z-10 w-1.5 h-1.5 rounded-full transform -translate-x-[3px]",
        isAbsent ? "bg-gray-400" : isApproved ? "bg-green-500" : "bg-purple-500"
      )} />

      <div className={cn(
        "ml-8 bg-white rounded-lg border shadow-sm",
        isApproved ? "border-green-100" : "border-border"
      )}>
        <div className="p-3">
          <div className="flex justify-between items-center mb-2.5">
            <p className="font-medium text-sm">{logDate}</p>
            <Badge variant="outline" className={badge.color}>
              {badge.text}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-1 mb-2">
            <div className="bg-gray-50/80 p-2 rounded">
              <div className="text-xs text-muted-foreground">Clock In</div>
              <div className="font-medium">{formatTimeDisplay(log.clock_in_time)}</div>
            </div>
            <div className="bg-gray-50/80 p-2 rounded">
              <div className="text-xs text-muted-foreground">Clock Out</div>
              <div className="font-medium">{formatTimeDisplay(log.clock_out_time)}</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-border">
            <span className="text-xs text-muted-foreground">Total Hours</span>
            <span className="text-sm font-medium">{calculateWorkingHours(log)}</span>
          </div>
          
          {!isAbsent && (
            <Button
              variant="ghost" 
              size="sm"
              className={cn(
                "w-full mt-2 text-xs border",
                isApproved 
                  ? "border-green-100 text-green-700 bg-green-50/50" 
                  : "border-gray-100 bg-gray-50/50"
              )}
              onClick={onViewDetails}
            >
              View Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
