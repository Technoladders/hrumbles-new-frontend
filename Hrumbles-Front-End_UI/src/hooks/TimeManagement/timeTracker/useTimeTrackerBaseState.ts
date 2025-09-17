
import { useState } from "react";
import { TimeLog } from "@/types/time-tracker-types";

export const useTimeTrackerBaseState = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [notes, setNotes] = useState("");
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [currentTimeLog, setCurrentTimeLog] = useState<TimeLog | null>(null);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastEmployeeId, setLastEmployeeId] = useState<string>('');
    const [isOnBreak, setIsOnBreak] = useState(false);
  const [currentBreakLog, setCurrentBreakLog] = useState<any | null>(null);

  const resetState = () => {
    setIsTracking(false);
    setNotes("");
    setCurrentTimeLog(null);
    setInGracePeriod(false);
    setIsOnBreak(false);
    setCurrentBreakLog(null);
  };

  return {
    isTracking,
    notes,
    timeLogs,
    currentTimeLog,
    inGracePeriod,
    isLoading,
    lastEmployeeId,
    setIsTracking,
    setNotes,
    setTimeLogs,
    setCurrentTimeLog,
    setInGracePeriod,
    setIsLoading,
    setLastEmployeeId,
    isOnBreak,
    currentBreakLog,
    setIsOnBreak,
    setCurrentBreakLog,
    resetState
  };
};
