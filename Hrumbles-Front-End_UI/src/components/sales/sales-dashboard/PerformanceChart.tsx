// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/PerformanceChart.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Phone, Mail, Calendar, CheckSquare, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceChartProps {
  data: Array<{
    type: string;
    count: number;
    color: string;
  }>;
  title: string;
}

const activityIcons: Record<string, React.ReactNode> = {
  call: <Phone size={14} />,
  email: <Mail size={14} />,
  meeting: <Calendar size={14} />,
  task: <CheckSquare size={14} />,
  note: <StickyNote size={14} />
};

const activityLabels: Record<string, string> = {
  call: 'Calls',
  email: 'Emails',
  meeting: 'Meetings',
  task: 'Tasks',
  note: 'Notes'
};

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, title }) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    
    const item = payload[0].payload;
    const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5">
        <div className="flex items-center gap-2">
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm font-medium text-gray-900 capitalize">
            {activityLabels[item.type] || item.type}
          </span>
        </div>
        <div className="mt-1 pl-4">
          <span className="text-lg font-bold text-gray-900">{item.count}</span>
          <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 h-full">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">Distribution by type</p>
      </div>

      {/* Donut Chart */}
      <div className="h-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="count"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {data.map((item) => {
          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div 
              key={item.type}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${item.color}15`, color: item.color }}
                >
                  {activityIcons[item.type]}
                </div>
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {activityLabels[item.type] || item.type}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                <div className="w-12">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: item.color 
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};