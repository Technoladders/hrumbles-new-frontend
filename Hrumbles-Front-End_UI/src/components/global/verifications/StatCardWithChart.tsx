import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

// A custom tooltip for a consistent, clean look across all charts
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
      const formattedValue = formatter ? formatter(payload[0].value) : payload[0].value;
      return (
        <div className="px-3 py-1.5 text-sm bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl">
          <p className="font-bold text-gray-800">{formattedValue}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      );
    }
    return null;
};

interface StatCardWithChartProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  chartData: { name: string; value: number }[];
  chartType?: 'area' | 'bar';
  chartColor: string;
  valueFormatter?: (value: number) => string; // Optional formatter for the tooltip
}

const StatCardWithChart: React.FC<StatCardWithChartProps> = ({
  title,
  value,
  icon,
  chartData,
  chartType = 'area', // Default to area chart
  chartColor,
  valueFormatter
}) => {
  return (
    <Card className="shadow-lg border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <div className="p-6 pb-2 flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <div className="p-3 bg-gray-100 rounded-lg">
          {icon}
        </div>
      </div>
      <CardContent className="h-[80px] p-0 -mb-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${chartColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<CustomTooltip formatter={valueFormatter} />} cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2.5} fill={`url(#gradient-${chartColor.replace('#', '')})`} dot={false} />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
                <Tooltip content={<CustomTooltip formatter={valueFormatter} />} cursor={{ fill: 'rgba(123, 67, 241, 0.1)' }} />
                <Bar dataKey="value" fill={chartColor} radius={[2, 2, 2, 2]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default StatCardWithChart;