
import { useState } from "react";
import { TimeLog } from "@/types/time-tracker-types";

export interface TimeTrackerState {
  isTracking: boolean;
  time: string;
  notes: string;
  elapsedSeconds: number;
  timeLogs: TimeLog[];
  currentTimeLog: TimeLog | null;
  inGracePeriod: boolean;
  
  setIsTracking: (value: boolean) => void;
  setTime: (value: string) => void;
  setNotes: (value: string) => void;
  setElapsedSeconds: (value: number | ((prev: number) => number)) => void;
  setTimeLogs: (value: TimeLog[]) => void;
  setCurrentTimeLog: (value: TimeLog | null) => void;
  setInGracePeriod: (value: boolean) => void;
  resetState: () => void;
}

export const useTimeTrackerState = (): TimeTrackerState => {
  const [isTracking, setIsTracking] = useState(false);
  const [time, setTime] = useState("00:00:00");
  const [notes, setNotes] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [currentTimeLog, setCurrentTimeLog] = useState<TimeLog | null>(null);
  const [inGracePeriod, setInGracePeriod] = useState(false);

  const resetState = () => {
    setIsTracking(false);
    setTime("00:00:00");
    setElapsedSeconds(0);
    setCurrentTimeLog(null);
    setInGracePeriod(false);
  };

  return {
    isTracking,
    time,
    notes,
    elapsedSeconds,
    timeLogs,
    currentTimeLog,
    inGracePeriod,
    
    setIsTracking,
    setTime,
    setNotes,
    setElapsedSeconds,
    setTimeLogs,
    setCurrentTimeLog,
    setInGracePeriod,
    resetState
  };
};
