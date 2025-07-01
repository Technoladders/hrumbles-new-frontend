
import { AlertTriangle } from "lucide-react";

export function TimelineActivityEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
      <p className="text-muted-foreground mb-1">No recent activity found</p>
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        There might be a temporary connection issue, or you haven't clocked in yet.
      </p>
    </div>
  );
}
