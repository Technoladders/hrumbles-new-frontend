import { format, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

interface WorkingHoursChartProps {
  totalHours: number;
  dailyHours: Array<{ date: string; hours: number }>;
  startDate: Date;
  endDate: Date;
}

const DAILY_GOAL = 8;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const hrs = payload[0].value as number;
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-0.5">{label}</p>
      <p className="text-violet-600 dark:text-violet-400 font-bold">{hrs}h</p>
      {hrs < DAILY_GOAL && (
        <p className="text-red-400 mt-0.5">{(DAILY_GOAL - hrs).toFixed(1)}h short</p>
      )}
    </div>
  );
};

export const WorkingHoursChart = ({
  totalHours, dailyHours, startDate, endDate,
}: WorkingHoursChartProps) => {
  // Estimate expected hours from the date span (rough weekday count × 8)
  const spanDays      = differenceInDays(endDate, startDate) + 1;
  const expectedHours = Math.round((spanDays / 7) * 5) * DAILY_GOAL; // approx working days × 8
  const pct           = expectedHours > 0 ? Math.min(100, Math.round((totalHours / expectedHours) * 100)) : 0;

  const rangeLabel = `${format(startDate, 'dd MMM')} – ${format(endDate, 'dd MMM yyyy')}`;

  return (
    <Card className="shadow-sm border-gray-100 dark:border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Working Hours
            </CardTitle>
            <CardDescription className="text-xs">{rangeLabel}</CardDescription>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-violet-50 dark:bg-violet-900/30 px-3 py-1">
            <Clock className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
              {totalHours}h
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>{totalHours}h logged</span>
            <span>~{pct}% of goal</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {dailyHours.length > 0 ? (
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyHours} margin={{ top: 8, right: 4, left: -20, bottom: 0 }} barSize={14}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                  domain={[0, Math.max(DAILY_GOAL + 2, ...dailyHours.map(d => d.hours))]}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,92,246,0.06)' }} />
                <ReferenceLine
                  y={DAILY_GOAL} stroke="#f59e0b"
                  strokeDasharray="4 3" strokeWidth={1.5}
                  label={{ value: '8h', position: 'right', fontSize: 9, fill: '#f59e0b' }}
                />
                <Bar dataKey="hours" radius={[5, 5, 0, 0]}>
                  {dailyHours.map((e, i) => (
                    <Cell
                      key={i}
                      fill={e.hours >= DAILY_GOAL ? '#7c3aed' : e.hours >= 6 ? '#a78bfa' : '#ddd6fe'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[190px] flex items-center justify-center text-sm text-gray-400">
            No hours logged yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};