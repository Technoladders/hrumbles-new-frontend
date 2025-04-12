
import React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressTrackerProps {
  progress: number;
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
  color?: string;
  className?: string;
  animate?: boolean;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  progress,
  size = "md",
  showPercentage = true,
  color,
  className,
  animate = true,
}) => {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setValue(progress), 100);
      return () => clearTimeout(timer);
    } else {
      setValue(progress);
    }
  }, [progress, animate]);

  const getHeightClass = () => {
    switch (size) {
      case "sm":
        return "h-1.5";
      case "lg":
        return "h-3";
      default:
        return "h-2";
    }
  };

  const getTextSizeClass = () => {
    switch (size) {
      case "sm":
        return "text-xs";
      case "lg":
        return "text-base";
      default:
        return "text-sm";
    }
  };

  const getProgressColor = () => {
    if (color) return color;

    if (progress < 25) return "bg-red-500";
    if (progress < 50) return "bg-orange-500";
    if (progress < 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        {showPercentage && (
          <p
            className={cn(
              getTextSizeClass(),
              "font-medium",
              progress < 25
                ? "text-red-600"
                : progress < 50
                ? "text-orange-600"
                : progress < 75
                ? "text-yellow-600"
                : "text-green-600"
            )}
          >
            {progress}%
          </p>
        )}
      </div>
      <Progress
        value={value}
        className={cn(getHeightClass(), "bg-gray-100", getProgressColor())}
      />
    </div>
  );
};

export default ProgressTracker;
