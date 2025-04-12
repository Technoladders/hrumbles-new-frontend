
import { useState, useEffect } from 'react';
import { WorkTimeSession } from '@/types/workTime';

export const useTimer = (activeSession: WorkTimeSession | null) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (activeSession) {
      const startTime = new Date(activeSession.start_time).getTime();
      const currentTime = new Date().getTime();
      setElapsedTime(Math.floor((currentTime - startTime) / 1000));
    } else {
      setElapsedTime(0);
    }
  }, [activeSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession?.status === 'running') {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession?.status]);

  return { elapsedTime, setElapsedTime };
};
