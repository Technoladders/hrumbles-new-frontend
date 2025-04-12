
import React from "react";
import { AlertCircle, Coffee, UtensilsCrossed } from "lucide-react";

interface BreakStatusProps {
  pauseReason?: string;
  pauseDuration: number;
  formatTime: (seconds: number) => string;
}

export const BreakStatus: React.FC<BreakStatusProps> = ({
  pauseReason,
  pauseDuration,
  formatTime,
}) => {
  const getPauseIcon = (reason?: string) => {
    switch (reason) {
      case 'Lunch Break':
        return <UtensilsCrossed className="h-4 w-4" />;
      case 'Coffee Break':
        return <Coffee className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getBreakStatus = () => {
    if (!pauseReason) return null;
    const maxDuration = pauseReason === 'Lunch Break' ? 45 : 15;
    const currentDuration = Math.floor(pauseDuration / 60);
    if (currentDuration > maxDuration) {
      return (
        <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Break exceeded by {currentDuration - maxDuration} minutes
        </div>
      );
    }
    return null;
  };

  if (!pauseReason) return null;

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 bg-orange-50 rounded-full px-4 py-2 text-orange-600">
        {getPauseIcon(pauseReason)}
        <span className="text-sm font-medium">{pauseReason}</span>
        <span className="text-sm font-semibold ml-2">
          {formatTime(pauseDuration)}
        </span>
      </div>
      {getBreakStatus()}
    </div>
  );
};
