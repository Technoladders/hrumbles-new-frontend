import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Phone, Mail, Calendar, CheckSquare, StickyNote, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceChartProps {
  data: Array<{
    type: string;
    count: number;
    color: string;
  }>;
  title?: string;
  delay?: number;
}

const activityIcons: Record<string, React.ReactNode> = {
  call: <Phone size={14} />,
  email: <Mail size={14} />,
  meeting: <Calendar size={14} />,
  task: <CheckSquare size={14} />,
  note: <StickyNote size={14} />,
  linkedin: <Zap size={14} />, // if you add later
};

const activityLabels: Record<string, string> = {
  call: 'Calls',
  email: 'Emails',
  meeting: 'Meetings',
  task: 'Tasks',
  note: 'Notes',
  linkedin: 'LinkedIn',
};

// Purple-indigo friendly palette (you can override passed colors if needed)
const defaultColors = [
  '#7c3aed', // violet-600
  '#6366f1', // indigo-500
  '#a855f7', // purple-500
  '#8b5cf6', // violet-500
  '#c084fc', // purple-400
];

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  title = 'Activity Breakdown',
  delay = 0.25,
}) => {
  // Optional: harmonize colors to purple spectrum if original colors don't fit
  const harmonizedData = data.map((item, idx) => ({
    ...item,
    color: item.color || defaultColors[idx % defaultColors.length],
  }));

  const total = harmonizedData.reduce((sum, item) => sum + item.count, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const entry = payload[0].payload;
    const percentage = total > 0 ? Math.round((entry.count / total) * 100) : 0;

    return (
      <div className="bg-white/95 backdrop-blur border border-purple-200 rounded-xl shadow-xl p-3 text-xs min-w-[160px]">
        <div className="flex items-center gap-2.5 mb-2 pb-2 border-b border-purple-100/60">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="font-semibold text-gray-800 capitalize">
            {activityLabels[entry.type] || entry.type}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-lg font-bold text-gray-900">{entry.count}</span>
          <span className="text-sm text-purple-600 font-medium">({percentage}%)</span>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-purple-100/60 shadow-sm overflow-hidden relative flex flex-col h-full"
      style={{
        boxShadow: '0 1px 3px rgba(124,58,237,0.06), 0 4px 20px rgba(124,58,237,0.04)',
      }}
    >
      {/* Subtle purple mesh background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 85% 15%, rgba(167,139,250,0.09) 0%, transparent 60%), ' +
            'radial-gradient(ellipse at 15% 85%, rgba(124,58,237,0.07) 0%, transparent 55%)',
        }}
      />

      {/* Header */}
      <div className="relative z-10 px-5 pt-5 pb-3 border-b border-purple-100/40 bg-gradient-to-r from-purple-50/70 to-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-sm">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 tracking-tight">{title}</h3>
            <p className="text-xs text-purple-600/90 mt-0.5">
              Distribution • {total.toLocaleString()} activities
            </p>
          </div>
        </div>
      </div>

      {/* Donut Chart Area */}
      <div className="relative flex-1 px-4 py-6 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={harmonizedData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="count"
              stroke="none"
              labelLine={false}
            >
              {harmonizedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center total */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900 tracking-tight">{total}</p>
            <p className="text-xs text-gray-500 font-medium mt-1">Total</p>
          </div>
        </div>
      </div>

      {/* Legend – more elegant, hoverable */}
      <div className="relative z-10 px-5 pb-5 pt-2 border-t border-purple-100/40 bg-purple-50/20">
        <div className="space-y-2.5">
          {harmonizedData.map((item) => {
            const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div
                key={item.type}
                className="group flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-purple-50/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm transition-transform group-hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${item.color}30, ${item.color}10)`,
                      color: item.color,
                    }}
                  >
                    {activityIcons[item.type] || <Zap size={14} />}
                  </div>
                  <span className="text-sm font-medium text-gray-800 capitalize">
                    {activityLabels[item.type] || item.type}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-base font-semibold text-gray-900">{item.count}</span>

                  <div className="w-20">
                    <div className="h-2 bg-purple-100/60 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>

                  <span className="text-xs font-medium text-purple-700 w-10 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};