import React from "react";
import { cn } from "@/lib/utils";

interface ProgressScoreBarProps {
  score: number; // score from 0 to 100
  className?: string;
  height?: number; // height in px
  showLabel?: boolean; // show % text inside
  color?: string; // Tailwind color class
}

const ProgressScoreBar: React.FC<ProgressScoreBarProps> = ({
  score,
  className,
  height = 15,
  showLabel = true,
  color,
}) => {
  const clampedScore = Math.min(Math.max(score, 0), 100);

  return (
    <div
      className={cn(
        "w-full rounded-full overflow-hidden bg-gray-200 transition-all duration-500",
        "border-none outline-none", // ensure border is gone
        className
      )}
      style={{ height }}
    >
      <div
        className={cn(
          "h-full text-white text-[10px] flex items-center justify-center transition-all duration-700 ease-out",
          color,
          "border-none outline-none" // ensure inner bar has no border
        )}
        style={{
          width: `${clampedScore}%`,
          borderRadius: clampedScore === 100 ? "9999px" : "9999px 0 0 9999px",
        }}
      >
        {showLabel && <span>{clampedScore}%</span>}
      </div>
    </div>
  );
};

export default ProgressScoreBar;
