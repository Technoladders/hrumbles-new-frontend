import React from "react";
import { cn } from "@/lib/utils";

interface TimerDisplayProps {
  elapsedTime: number;
  status: string | null;
  formatTime: (seconds: number) => string;
}

// Utility function to format time as MM:SS with leading zeros
const formatTimeAsMMSS = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  elapsedTime,
  status,
  formatTime = formatTimeAsMMSS, // Use the new format function as default
}) => {
  return (
    <div className="relative w-36 h-36 mb-4">
      {/* Main timer background */}
      <div
        className={cn(
          "absolute inset-0 rounded-full bg-white/20 backdrop-blur-sm transition-colors duration-300",
          status === "running" && "animate-pulse"
        )}
      />
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold tracking-tight text-[#0055D4]">
          {formatTime(elapsedTime)}
        </div>
        <div className="text-xs mt-1 text-[#0055D4]">
          {status === "running"
            ? "Currently Working"
            : status === "paused"
            ? "Paused"
            : "Work Time"}
        </div>
      </div>
    </div>
  );
};