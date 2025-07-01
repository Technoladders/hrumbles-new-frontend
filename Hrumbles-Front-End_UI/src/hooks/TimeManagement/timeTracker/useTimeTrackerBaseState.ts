
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

  const resetState = () => {
    setIsTracking(false);
    setNotes("");
    setCurrentTimeLog(null);
    setInGracePeriod(false);
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
    resetState
  };
};
