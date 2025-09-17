import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS } from "@/utils/timeTrackerUtils";

interface CircularTimerDisplayProps {
  time: string;
  isTracking: boolean;
  inGracePeriod?: boolean;
}

export function CircularTimerDisplay({ 
  time, 
  isTracking, 
  inGracePeriod = false 
}: CircularTimerDisplayProps) {
  const [hours, minutes] = time.split(':');
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const totalSeconds = parseInt(hours || '0') * 3600 + parseInt(minutes || '0') * 60;
    const workdaySeconds = DEFAULT_SETTINGS.workingHoursPerDay * 3600;
    const calculatedProgress = Math.min((totalSeconds / workdaySeconds) * 100, 100);
    setProgress(calculatedProgress);
  }, [time, hours, minutes]);

  return (
    <div className="flex flex-col items-center justify-center py-2">
      {/* --- MODIFIED: Smaller container (was w-64 h-64) --- */}
      <div className="relative w-40 h-40"> 
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle className="text-gray-200" strokeWidth="6" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
          <circle 
            className={cn("transition-all duration-500", inGracePeriod ? "text-orange-400" : "text-primary")} 
            strokeWidth="6" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={(2 * Math.PI * 42) * (1 - progress / 100)}
            strokeLinecap="round" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" 
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* --- MODIFIED: Smaller font sizes --- */}
          <div className="text-3xl font-bold font-mono tracking-tight">
            {hours}<span className="text-muted-foreground">:</span>{minutes}
          </div>
          <div className={cn("mt-1 px-2 py-0.5 text-xs rounded-full font-medium",
            isTracking ? (inGracePeriod ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700") : "bg-gray-100 text-gray-700"
          )}>
            {isTracking ? (inGracePeriod ? "Grace" : "Active") : "Logged Out"}
          </div>
        </div>
      </div>
      
      {inGracePeriod && (
        <p className="mt-2 text-orange-600 text-xs text-center">Grace period active.</p>
      )}
    </div>
  );
}