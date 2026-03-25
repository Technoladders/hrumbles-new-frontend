import { TrendingUp, UserCheck, UserX, Clock, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceStatsProps {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  attendanceRate: number;
  totalWorkingDays: number;
  isExternal: boolean;
  periodLabel: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  iconColor: string;
  valueColor?: string;
}

const StatCard = ({ label, value, sub, icon, accent, iconColor, valueColor }: StatCardProps) => (
  <div className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className={cn("absolute -top-4 -right-4 h-20 w-20 rounded-full opacity-10", accent)} />
    <div className="relative flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
        <p className={cn("text-3xl font-bold tracking-tight", valueColor ?? "text-gray-900 dark:text-gray-50")}>
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
      </div>
      <div className={cn("flex-shrink-0 rounded-xl p-2.5 bg-opacity-15", accent)}>
        <span className={iconColor}>{icon}</span>
      </div>
    </div>
  </div>
);

export const AttendanceStatsCards = ({
  present, absent, late, onLeave, attendanceRate,
  totalWorkingDays, isExternal, periodLabel,
}: AttendanceStatsProps) => {
  const rateColor =
    attendanceRate >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
    attendanceRate >= 70 ? 'text-amber-600  dark:text-amber-400'    :
                           'text-red-600    dark:text-red-400';

  return (
    <div className={cn(
      "grid gap-4",
      isExternal ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-5"
    )}>
      <StatCard
        label="Present Days"  value={present}  sub={periodLabel}
        icon={<UserCheck className="h-5 w-5" />}
        accent="bg-emerald-500" iconColor="text-emerald-600 dark:text-emerald-400"
        valueColor="text-emerald-700 dark:text-emerald-400"
      />
      <StatCard
        label="Absent Days"  value={absent}  sub={periodLabel}
        icon={<UserX className="h-5 w-5" />}
        accent="bg-red-500" iconColor="text-red-500 dark:text-red-400"
        valueColor={absent > 0 ? "text-red-600 dark:text-red-400" : undefined}
      />
      {!isExternal && (
        <StatCard
          label="Late Arrivals"  value={late}  sub={periodLabel}
          icon={<Clock className="h-5 w-5" />}
          accent="bg-amber-500" iconColor="text-amber-600 dark:text-amber-400"
          valueColor={late > 0 ? "text-amber-700 dark:text-amber-400" : undefined}
        />
      )}
      <StatCard
        label="On Leave"  value={onLeave}
        sub={`of ${totalWorkingDays} working days`}
        icon={<CalendarOff className="h-5 w-5" />}
        accent="bg-blue-500" iconColor="text-blue-600 dark:text-blue-400"
      />
      <StatCard
        label="Attendance Rate"  value={`${attendanceRate}%`}
        sub={`${present} of ${totalWorkingDays} days`}
        icon={<TrendingUp className="h-5 w-5" />}
        accent="bg-violet-500" iconColor="text-violet-600 dark:text-violet-400"
        valueColor={rateColor}
      />
    </div>
  );
};