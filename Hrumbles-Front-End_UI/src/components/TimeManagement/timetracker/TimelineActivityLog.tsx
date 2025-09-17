import { TimeLog } from "@/types/time-tracker-types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { TimeLogDetails } from "@/components/TimeManagement/timesheet/dialog/TimeLogDetails";
import { TimelineActivityEmpty } from "./timeline/TimelineActivityEmpty";
import { TimelineLoadingSkeleton } from "./timeline/TimelineLoadingSkeleton";
import { TimelineLogItem } from "./timeline/TimelineLogItem";

interface TimelineActivityLogProps {
  timeLogs: TimeLog[];
  isLoading?: boolean;
  onViewDetails?: (log: TimeLog) => void;
}

export function TimelineActivityLog({ 
  timeLogs, 
  isLoading = false,
  onViewDetails
}: TimelineActivityLogProps) {
  const [selectedLog, setSelectedLog] = useState<TimeLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const getProjectName = (projectId: string | null) => {
    return projectId ? `Project ${projectId.substring(0, 8)}` : "Unassigned";
  };

  const handleViewDetails = (log: TimeLog) => {
    if (onViewDetails) {
      onViewDetails(log);
    } else {
      setSelectedLog(log);
      setDialogOpen(true);
    }
  };

  if (isLoading) {
    return <TimelineLoadingSkeleton />;
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-12 bottom-4 w-0.5 bg-gradient-to-b from-purple-500 via-pink-500 to-transparent" />
      
      <h3 className="font-medium text-lg mb-5">Recent Activity</h3>
      
      {timeLogs.length === 0 ? (
        <TimelineActivityEmpty />
      ) : (
        <ScrollArea className="h-[180px] pr-4">
          <div className="space-y-3">
            {timeLogs.map((log) => (
              <TimelineLogItem
                key={log.id}
                log={log}
                onViewDetails={() => handleViewDetails(log)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-gradient-to-b from-white to-slate-50">
          {selectedLog && (
            <TimeLogDetails 
              timeLog={selectedLog}
              getProjectName={getProjectName}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
