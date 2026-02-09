// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/MiniSparkline.tsx
import React, { useMemo } from 'react';

interface MiniSparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  color,
  width = 60,
  height = 24
}) => {
  const pathData = useMemo(() => {
    if (!data || data.length < 2) return '';

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    
    const xStep = width / (data.length - 1);
    const yScale = (height - 4) / range;

    const points = data.map((value, index) => ({
      x: index * xStep,
      y: height - 2 - ((value - min) * yScale)
    }));

    // Create smooth curve using bezier
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` Q ${prev.x + (curr.x - prev.x) / 4} ${prev.y}, ${cpx} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${curr.x - (curr.x - prev.x) / 4} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    return path;
  }, [data, width, height]);

  const areaPath = useMemo(() => {
    if (!pathData) return '';
    return `${pathData} L ${width} ${height} L 0 ${height} Z`;
  }, [pathData, width, height]);

  if (!data || data.length < 2) {
    return <div style={{ width, height }} />;
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#gradient-${color.replace('#', '')})`}
      />
      
      {/* Line */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* End dot */}
      <circle
        cx={width}
        cy={height - 2 - ((data[data.length - 1] - Math.min(...data, 0)) * (height - 4) / (Math.max(...data, 1) - Math.min(...data, 0) || 1))}
        r="3"
        fill={color}
      />
    </svg>
  );
};