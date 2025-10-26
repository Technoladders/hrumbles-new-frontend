import React from 'react';
import { Sparkles } from 'lucide-react';

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  percentage: number;
  colorClass?: string;
  onEnrichClick?: () => void;
  showEnrichButton?: boolean;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 32,
  strokeWidth = 3.5,
  percentage,
  colorClass = "text-slate-500",
  onEnrichClick,
  showEnrichButton = false
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  const getProgressColor = () => {
    if (percentage >= 100) return '#10b981'; // green-500
    if (percentage >= 70) return '#eab308'; // yellow-500
    if (percentage >= 40) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const progressColor = getProgressColor();

  return (
    <div className="flex items-center gap-2">
      {/* Circular Progress */}
      <div className="relative group">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transition-transform duration-300 group-hover:scale-110"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
          }}
        >
          {/* Background and Progress Rings... */}
          <circle
            className="text-slate-100"
            stroke="currentColor"
            strokeWidth={strokeWidth + 1}
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            opacity="0.3"
          />
          <circle
            className="text-slate-200"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="white"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <defs>
            <linearGradient id={`gradient-${percentage}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={progressColor} stopOpacity="1" />
              <stop offset="100%" stopColor={progressColor} stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <circle
            stroke={`url(#gradient-${percentage})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            className="transition-all duration-500 ease-in-out"
          />
          <text
            x={size / 2}
            y={size / 2}
            dy="0.35em"
            textAnchor="middle"
            fill={'#111827'}
            fontSize={`${size * 0.28}px`}
            fontWeight="700"
            transform={`rotate(90, ${size / 2}, ${size / 2})`}
          >
            {`${Math.min(percentage, 100)}%`}
          </text>
        </svg>
      </div>

      {/* Enrich Now Button (only when incomplete) */}
      {showEnrichButton && percentage < 100 && onEnrichClick && (
        <button
          onClick={onEnrichClick}
          // MODIFIED: Replaced gradient with solid background color
className="whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 bg-violet-200 text-violet-800 
             text-xs font  rounded-full shadow-sm border border-violet-300/50
             hover:shadow-md hover:bg-violet-300
             transition-all duration-200 transform hover:scale-105
             active:scale-95"
>
          <Sparkles className="h-3 w-3" />
          <span>Enrich Now</span>
        </button>
      )}
    </div>
  );
};

export default CircularProgress;