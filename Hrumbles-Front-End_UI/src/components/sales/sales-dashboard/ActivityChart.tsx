import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BarChart3, LineChart, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityChartProps {
  data: Array<{
    date: string;
    label: string;
    total: number;
    calls: number;
    emails: number;
    meetings: number;
    linkedins?: number; // optional – if you later add it
  }>;
  title?: string;
  delay?: number;
}

type ChartType = 'area' | 'bar';

export const ActivityChart: React.FC<ActivityChartProps> = ({
  data,
  title = "Activity Trend",
  delay = 0.2,
}) => {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [
    { key: 'calls',    color: '#F59E0B', label: 'Calls',    light: '#FCD34D' },
    { key: 'emails',   color: '#6366F1', label: 'Emails',   light: '#C7D2FE' },
    { key: 'meetings', color: '#10B981', label: 'Meetings', light: '#A7F3D0' },
    // Add linkedin later if needed → { key: 'linkedins', color: '#0A66C2', label: 'LinkedIn', light: '#BFDBFE' }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-indigo-100 rounded-xl shadow-xl p-3 text-xs z-50 min-w-[160px]">
        <p className="font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1.5">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600 capitalize">{entry.name}</span>
            </div>
            <span className="font-bold text-gray-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const totalActivities = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden relative h-full flex flex-col"
      style={{
        boxShadow: "0 1px 3px rgba(79,70,229,0.06), 0 4px 20px rgba(79,70,229,0.04)",
      }}
    >
      {/* Subtle mesh background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 90% 10%, rgba(129,140,248,0.07) 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, rgba(99,102,241,0.05) 0%, transparent 55%)",
        }}
      />

      {/* Header */}
      <div className="relative z-10 px-5 pt-5 pb-3 flex items-center justify-between border-b border-indigo-100/40 bg-gradient-to-r from-indigo-50/60 to-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-sm">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 tracking-tight">{title}</h3>
            <p className="text-xs text-indigo-500/90 mt-0.5">
              Last 7 days • {totalActivities.toLocaleString()} activities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Category toggles – pill style */}
          <div className="flex gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border",
                  activeCategory === cat.key || activeCategory === null
                    ? "bg-white shadow-sm border-indigo-200 text-gray-900"
                    : "bg-transparent border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/80"
                )}
              >
                <span style={{ color: cat.color }}>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Chart type switch */}
          <div className="flex bg-indigo-50/60 rounded-xl p-1 border border-indigo-100/60">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-medium",
                chartType === 'area' && "bg-white shadow-sm text-indigo-700"
              )}
              onClick={() => setChartType('area')}
            >
              Area
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-medium",
                chartType === 'bar' && "bg-white shadow-sm text-indigo-700"
              )}
              onClick={() => setChartType('bar')}
            >
              Bar
            </Button>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 px-3 pt-4 pb-2 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                {categories.map((cat) => (
                  <React.Fragment key={cat.key}>
                    <linearGradient id={`color${cat.key.charAt(0).toUpperCase() + cat.key.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={cat.color} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={cat.color} stopOpacity={0.05} />
                    </linearGradient>
                  </React.Fragment>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke="#E0E7FF" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                dx={-8}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />

              {categories.map((cat) =>
                (!activeCategory || activeCategory === cat.key) && (
                  <Area
                    key={cat.key}
                    type="monotone"
                    dataKey={cat.key}
                    name={cat.label}
                    stroke={cat.color}
                    strokeWidth={2.2}
                    fill={`url(#color${cat.key.charAt(0).toUpperCase() + cat.key.slice(1)})`}
                    fillOpacity={1}
                    activeDot={{ r: 5, stroke: cat.color, strokeWidth: 2, fill: '#fff' }}
                  />
                )
              )}
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 4" stroke="#E0E7FF" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                dx={-8}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />

              {categories.map((cat) =>
                (!activeCategory || activeCategory === cat.key) && (
                  <Bar
                    key={cat.key}
                    dataKey={cat.key}
                    name={cat.label}
                    fill={cat.color}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                )
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer summary – optional but matches other widgets */}
      <div className="relative z-10 px-5 py-3.5 border-t border-indigo-100/40 bg-indigo-50/30">
        <div className="grid grid-cols-3 gap-4 text-center">
          {categories.map((cat) => {
            const total = data.reduce((sum, d) => sum + (Number(d[cat.key as keyof typeof d]) || 0), 0);
            return (
              <div key={cat.key}>
                <div className="text-xs font-medium text-gray-600 mb-1">{cat.label}</div>
                <p className="text-lg font-bold" style={{ color: cat.color }}>
                  {total}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};