
import { cn } from "@/lib/utils";
import { Circle } from "lucide-react";
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
  const [hours, minutes, seconds] = time.split(':');
  const [progress, setProgress] = useState(0);
  
  // Calculate progress for the circular animation
  useEffect(() => {
    const totalSeconds = 
      parseInt(hours || '0') * 3600 + 
      parseInt(minutes || '0') * 60 + 
      parseInt(seconds || '0');
    
    // Calculate progress percentage (assuming 9-hour workday = 32400 seconds)
    const workdaySeconds = DEFAULT_SETTINGS.workingHoursPerDay * 3600;
    const calculatedProgress = Math.min(
      (totalSeconds / workdaySeconds) * 100, 
      100
    );
    
    setProgress(calculatedProgress);
  }, [time, hours, minutes, seconds]);

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Circular progress */}
      <div className="relative w-64 h-64">
        {/* Background circle */}
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle 
            className="text-gray-200" 
            strokeWidth="4" 
            stroke="currentColor" 
            fill="transparent" 
            r="42" 
            cx="50" 
            cy="50" 
          />
          {/* Progress circle */}
          <circle 
            className={cn(
              "transition-all duration-500 ease-in-out",
              inGracePeriod ? "text-orange-400" : "text-primary"
            )} 
            strokeWidth="4" 
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
            strokeLinecap="round" 
            stroke="currentColor" 
            fill="transparent" 
            r="42" 
            cx="50" 
            cy="50" 
          />
        </svg>
        
        {/* Time display in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold font-mono tracking-tight">
            {hours}<span className="text-muted-foreground">:</span>{minutes}
            <span className="text-xs align-top ml-1">{seconds}s</span>
          </div>
          
          <div className={cn(
            "mt-2 px-3 py-1 text-xs rounded-full font-medium",
            isTracking 
              ? inGracePeriod 
                ? "bg-orange-100 text-orange-700" 
                : "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          )}>
            {isTracking 
              ? inGracePeriod 
                ? "Grace Period" 
                : "Active" 
              : "Inactive"}
          </div>
        </div>
      </div>
      
      {/* Status indicators */}
      {inGracePeriod && (
        <div className="mt-4 text-orange-500 text-sm flex items-center gap-1">
          <Circle className="h-3 w-3 fill-orange-500" />
          <span>Regular working hours completed. Please clock out soon.</span>
        </div>
      )}
    </div>
  );
}
