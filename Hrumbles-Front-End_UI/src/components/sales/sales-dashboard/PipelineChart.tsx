// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/PipelineChart.tsx
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PipelineChartProps {
  stageCounts: Record<string, number>;
}

const STAGE_COLORS: Record<string, string> = {
  'Lead': '#60A5FA', // blue-400
  'Contacted': '#A78BFA', // violet-400
  'Qualified': '#FBBF24', // amber-400
  'Proposal': '#F97316', // orange-500
  'Negotiation': '#EC4899', // pink-500
  'Closed Won': '#22C55E', // green-500
  'Closed Lost': '#EF4444', // red-500
  'Unassigned': '#9CA3AF', // gray-400
};

const STAGE_ORDER = [
  'Lead',
  'Contacted', 
  'Qualified',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
  'Unassigned'
];

export const PipelineChart: React.FC<PipelineChartProps> = ({ stageCounts }) => {
  // Transform data for chart
  const chartData = STAGE_ORDER
    .filter(stage => stageCounts[stage] !== undefined || stage === 'Unassigned')
    .map(stage => ({
      name: stage,
      value: stageCounts[stage] || 0,
      color: STAGE_COLORS[stage] || STAGE_COLORS['Unassigned'],
    }))
    .filter(item => item.value > 0 || STAGE_ORDER.slice(0, 6).includes(item.name));

  // If no data, show placeholder
  const hasData = chartData.some(item => item.value > 0);

  const totalContacts = Object.values(stageCounts).reduce((sum, count) => sum + count, 0);
  const closedWon = stageCounts['Closed Won'] || 0;
  const conversionRate = totalContacts > 0 ? Math.round((closedWon / totalContacts) * 100) : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-gray-300">{payload[0].value} contacts</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Pipeline Overview</h3>
            <p className="text-xs text-gray-500 mt-0.5">Contacts by stage</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">Conversion Rate</p>
              <p className="text-lg font-semibold text-gray-900 flex items-center gap-1">
                {conversionRate}%
                <TrendingUp size={14} className="text-green-500" />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-5">
        {hasData ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar 
                dataKey="value" 
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">No pipeline data yet</p>
              <p className="text-xs text-gray-500 mt-1">Start adding contacts to see your pipeline</p>
            </div>
          </div>
        )}
      </div>

      {/* Stage Legend */}
      <div className="px-5 pb-4">
        <div className="flex flex-wrap gap-3">
          {chartData.slice(0, 6).map((stage) => (
            <div key={stage.name} className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: stage.color }}
              />
              <span className="text-xs text-gray-600">{stage.name}</span>
              <span className="text-xs font-medium text-gray-900">{stage.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};