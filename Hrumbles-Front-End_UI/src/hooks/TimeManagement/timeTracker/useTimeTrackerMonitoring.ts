
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { TimeLog } from "@/types/time-tracker-types";
import { 
  isWithinGracePeriod, 
  hasGracePeriodEnded,
  calculateExpectedClockOutTime,
  formatTimeDisplay
} from "@/utils/timeTrackerUtils";

export const useTimeTrackerMonitoring = (
  isTracking: boolean,
  currentTimeLog: TimeLog | null,
  inGracePeriod: boolean,
  setInGracePeriod: (value: boolean) => void,
  elapsedSeconds: number,
  handleAutoTerminate: () => void
) => {
  const autoTerminateCheckRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentTimeLog && isTracking) {
      if (autoTerminateCheckRef.current) {
        clearInterval(autoTerminateCheckRef.current);
      }

      autoTerminateCheckRef.current = setInterval(() => {
        if (!currentTimeLog) return;

        if (isWithinGracePeriod(currentTimeLog.clock_in_time) && !inGracePeriod) {
          setInGracePeriod(true);
          const expectedEndTime = formatTimeDisplay(calculateExpectedClockOutTime(currentTimeLog.clock_in_time));
          toast.warning(`Regular working hours ended at ${expectedEndTime}. You are now in grace period.`);
        }

        if (hasGracePeriodEnded(currentTimeLog.clock_in_time)) {
          handleAutoTerminate();
        }
      }, 60000); // Check every minute
    }

    return () => {
      if (autoTerminateCheckRef.current) {
        clearInterval(autoTerminateCheckRef.current);
      }
    };
  }, [currentTimeLog, isTracking, inGracePeriod]);

  return { inGracePeriod };
};
