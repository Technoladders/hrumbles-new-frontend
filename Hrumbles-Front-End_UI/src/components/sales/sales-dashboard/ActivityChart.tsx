// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/ActivityChart.tsx
import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { Button } from '@/components/ui/button';
import { BarChart3, LineChart, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityChartProps {
  data: Array<{
    date: string;
    label: string;
    total: number;
    calls: number;
    emails: number;
    meetings: number;
  }>;
  title: string;
}

type ChartType = 'area' | 'bar';

export const ActivityChart: React.FC<ActivityChartProps> = ({ data, title }) => {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[140px]">
        <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 capitalize">{entry.name}</span>
            </div>
            <span className="font-semibold text-gray-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const categories = [
    { key: 'calls', color: '#F59E0B', label: 'Calls' },
    { key: 'emails', color: '#6366F1', label: 'Emails' },
    { key: 'meetings', color: '#10B981', label: 'Meetings' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Last 7 days activity breakdown</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Category Filters */}
          <div className="flex items-center gap-1 mr-4">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                  activeCategory === cat.key || activeCategory === null
                    ? "opacity-100"
                    : "opacity-40"
                )}
                style={{ 
                  backgroundColor: `${cat.color}15`,
                  color: cat.color
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 rounded-md",
                chartType === 'area' && "bg-white shadow-sm"
              )}
              onClick={() => setChartType('area')}
            >
              <LineChart size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 rounded-md",
                chartType === 'bar' && "bg-white shadow-sm"
              )}
              onClick={() => setChartType('bar')}
            >
              <BarChart3 size={14} />
            </Button>
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis 
                dataKey="label" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {(!activeCategory || activeCategory === 'calls') && (
                <Area
                  type="monotone"
                  dataKey="calls"
                  name="Calls"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCalls)"
                />
              )}
              {(!activeCategory || activeCategory === 'emails') && (
                <Area
                  type="monotone"
                  dataKey="emails"
                  name="Emails"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEmails)"
                />
              )}
              {(!activeCategory || activeCategory === 'meetings') && (
                <Area
                  type="monotone"
                  dataKey="meetings"
                  name="Meetings"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMeetings)"
                />
              )}
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis 
                dataKey="label" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {(!activeCategory || activeCategory === 'calls') && (
                <Bar dataKey="calls" name="Calls" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              )}
              {(!activeCategory || activeCategory === 'emails') && (
                <Bar dataKey="emails" name="Emails" fill="#6366F1" radius={[4, 4, 0, 0]} />
              )}
              {(!activeCategory || activeCategory === 'meetings') && (
                <Bar dataKey="meetings" name="Meetings" fill="#10B981" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
        {categories.map((cat) => {
          const total = data.reduce((sum, d) => sum + (d[cat.key as keyof typeof d] as number || 0), 0);
          const avg = Math.round(total / data.length);
          return (
            <div key={cat.key} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-xs font-medium text-gray-500">{cat.label}</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">{total}</p>
              <p className="text-xs text-gray-400">avg {avg}/day</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};