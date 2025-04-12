
import React from "react";
import { cn } from "@/lib/utils";

interface TimerDisplayProps {
  elapsedTime: number;
  status: string | null;
  formatTime: (seconds: number) => string;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  elapsedTime,
  status,
  formatTime,
}) => {
  return (
    <div className="relative w-36 h-36 mb-4">
      <div className={cn(
        "absolute inset-0 rounded-full border-4 transition-colors duration-300",
        status === 'running' 
          ? 'border-brand-accent animate-pulse bg-gradient-to-r from-brand-accent/10 to-brand-accent/5' 
          : status === 'paused'
          ? 'border-orange-400'
          : 'border-gray-200'
      )} />
      <div className="absolute inset-2 rounded-full border border-brand-accent/20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold tracking-normal">{formatTime(elapsedTime)}</div>
        <div className="text-xs text-gray-500 mt-1">
          {status === 'running' ? 'Currently Working' : 
           status === 'paused' ? 'Paused' : 
           'Work Time'}
        </div>
      </div>
    </div>
  );
};
