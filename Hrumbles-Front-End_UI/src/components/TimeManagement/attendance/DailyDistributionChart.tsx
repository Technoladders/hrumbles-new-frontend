import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface DailyDistributionChartProps {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  isExternal: boolean;
}

const COLORS = {
  present: '#10b981',
  late:    '#f59e0b',
  onLeave: '#6366f1',
  absent:  '#e5e7eb',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200">{name}</p>
      <p className="text-gray-500">{value} day{value !== 1 ? 's' : ''}</p>
    </div>
  );
};

export const DailyDistributionChart = ({
  present, absent, late, onLeave, isExternal,
}: DailyDistributionChartProps) => {
  const onTime = present - late;
  const total  = present + absent + onLeave;

  const segments = [
    ...(onTime > 0    ? [{ name: 'On Time',  value: onTime,  color: COLORS.present }] : []),
    ...(!isExternal && late > 0 ? [{ name: 'Late', value: late, color: COLORS.late }] : []),
    ...(onLeave > 0   ? [{ name: 'On Leave', value: onLeave, color: COLORS.onLeave }] : []),
    ...(absent > 0    ? [{ name: 'Absent',   value: absent,  color: COLORS.absent  }] : []),
    // fallback so chart always renders
    ...(total === 0   ? [{ name: 'No Data', value: 1, color: '#f3f4f6' }] : []),
  ];

  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <Card className="shadow-sm border-gray-100 dark:border-gray-800">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Attendance Distribution
        </CardTitle>
        <CardDescription className="text-xs">
          Breakdown of your attendance status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Donut */}
          <div className="relative h-[160px] w-[160px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segments}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {segments.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{pct}%</span>
              <span className="text-[10px] text-gray-400">present</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {segments.map(s => (
              <div key={s.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{s.name}</span>
                </div>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 flex-shrink-0">
                  {s.value === 1 && total === 0 ? 0 : s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};