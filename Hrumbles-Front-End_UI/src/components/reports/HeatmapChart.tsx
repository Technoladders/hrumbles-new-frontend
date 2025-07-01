
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HeatmapProps {
  data: {
    day: string;
    hour: string;
    value: number;
  }[];
  title: string;
}

const HeatmapChart: React.FC<HeatmapProps> = ({ data, title }) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = Array.from({ length: 12 }, (_, i) => `${i + 9}:00`);
  
  const maxValue = Math.max(...data.map(item => item.value));
  
  // Create a mapping of day-hour to value for quick lookup
  const valueMap = data.reduce((acc, item) => {
    acc[`${item.day}-${item.hour}`] = item.value;
    return acc;
  }, {} as Record<string, number>);
  
  // Function to get color based on value intensity
  const getColor = (value: number) => {
    if (!value) return '#f5f5f5';
    const intensity = (value / maxValue) * 0.9; // Max intensity 90%
    return `rgba(79, 70, 229, ${intensity})`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="flex mb-1">
              <div className="w-20"></div>
              {hours.map(hour => (
                <div key={hour} className="flex-1 text-center text-xs font-medium text-gray-500">
                  {hour}
                </div>
              ))}
            </div>
            
            {days.map(day => (
              <div key={day} className="flex mb-1">
                <div className="w-20 pr-2 text-right text-xs font-medium text-gray-500 flex items-center justify-end">
                  {day}
                </div>
                {hours.map(hour => {
                  const value = valueMap[`${day}-${hour}`] || 0;
                  return (
                    <div 
                      key={`${day}-${hour}`} 
                      className="flex-1 aspect-square m-0.5 rounded-sm relative group"
                      style={{ backgroundColor: getColor(value) }}
                    >
                      {value > 0 && (
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap transition-opacity">
                          {day} {hour}: {value} submissions
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            
            <div className="mt-4 flex items-center justify-end">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 bg-gray-100 rounded"></div>
                <span className="text-xs text-gray-500">0</span>
                <div className="h-3 w-3 bg-indigo-200 rounded"></div>
                <span className="text-xs text-gray-500">Low</span>
                <div className="h-3 w-3 bg-indigo-400 rounded"></div>
                <span className="text-xs text-gray-500">Medium</span>
                <div className="h-3 w-3 bg-indigo-600 rounded"></div>
                <span className="text-xs text-gray-500">High</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeatmapChart;
