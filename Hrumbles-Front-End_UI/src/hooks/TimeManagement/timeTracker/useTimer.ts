
import { useState, useEffect, useRef } from "react";
import { formatTime } from "@/utils/timeFormatters";

export const useTimer = (isTracking: boolean, initialSeconds: number = 0) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds);
  const [time, setTime] = useState(formatTime(initialSeconds));
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isTracking) {
      // Clear any existing interval first to prevent multiple intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Set up a new interval
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const newValue = prev + 1;
          setTime(formatTime(newValue));
          return newValue;
        });
      }, 1000);
    } else if (intervalRef.current) {
      // Clean up interval when not tracking
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Clean up function for when component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTracking]);

  // Update time display when initialSeconds changes
  useEffect(() => {
    setElapsedSeconds(initialSeconds);
    setTime(formatTime(initialSeconds));
  }, [initialSeconds]);

  return {
    elapsedSeconds,
    setElapsedSeconds,
    time,
    setTime
  };
};
