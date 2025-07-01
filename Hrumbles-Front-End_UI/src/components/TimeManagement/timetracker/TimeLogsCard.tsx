
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CalendarClock } from "lucide-react";
import { formatDate } from "@/utils/timeFormatters";

interface TimeLog {
  id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  duration_minutes: number | null;
  notes: string | null;
  is_submitted: boolean;
}

interface TimeLogsCardProps {
  timeLogs: TimeLog[];
  selectedEmployeeName?: string;
  loading?: boolean; // Make loading an optional prop
  onViewTimesheet?: (log: TimeLog) => void; // Add the onViewTimesheet prop
}

export function TimeLogsCard({ 
  timeLogs, 
  selectedEmployeeName, 
  loading = false,
  onViewTimesheet 
}: TimeLogsCardProps) {
  return (
    <Card className="col-span-1 gradient-card card-hover">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-primary">
          <CalendarClock className="h-5 w-5" />
          Today's Activity
        </CardTitle>
        <CardDescription>
          Time entries for {selectedEmployeeName || 'selected employee'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">Loading time logs...</p>
          </div>
        ) : timeLogs.length > 0 ? (
          <div className="space-y-4">
            {timeLogs.map((log) => (
              <div 
                key={log.id} 
                className="border rounded-md p-3 bg-gradient-to-r from-transparent to-accent/5 hover:from-accent/5 hover:to-accent/10 transition-all duration-200 cursor-pointer"
                onClick={() => onViewTimesheet && onViewTimesheet(log)}
              >
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium">{formatDate(log.clock_in_time)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {log.notes?.substring(0, 20) || 'No notes'}
                      {log.notes?.length ? (log.notes.length > 20 ? '...' : '') : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-primary">
                      {log.duration_minutes ? `${Math.floor(log.duration_minutes / 60)}h ${log.duration_minutes % 60}m` : 'In progress'}
                    </div>
                    <div className="text-sm">
                      {log.is_submitted ? (
                        <span className="px-2 py-1 bg-success/20 text-success rounded-full text-xs">Submitted</span>
                      ) : (
                        <span className="px-2 py-1 bg-warning/20 text-warning rounded-full text-xs">Not submitted</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarClock className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">No activity recorded {selectedEmployeeName ? 'for this employee' : 'today'}</p>
            <p className="text-sm">
              {selectedEmployeeName ? 'Start the timer to begin tracking time' : 'Select an employee to view their activity'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
