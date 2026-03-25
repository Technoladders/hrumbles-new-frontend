import { useState } from "react";
import { format } from "date-fns";
import { AttendanceStatsCards } from "./AttendanceStatsCards";
import { WorkingHoursChart } from "./WorkingHoursChart";
import { DailyDistributionChart } from "./DailyDistributionChart";
import { AttendanceHistoryTable } from "./AttendanceHistoryTable";
import { AttendanceCalendarView } from "./AttendanceCalendarView";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector";
import { Button } from "@/components/ui/button";
import { CalendarDays, TableProperties } from "lucide-react";
import type { AttendanceData, DateRange } from "@/hooks/TimeManagement/useAttendanceData";
import { resolveRange } from "@/hooks/TimeManagement/useAttendanceData";

interface AttendanceContentProps {
  dateRange: DateRange | null;
  onDateRangeChange: (r: DateRange | null) => void;
  attendanceData: AttendanceData;
  isExternal: boolean;
  employeeId: string;
}

type HistoryView = 'calendar' | 'table';

export function AttendanceContent({
  dateRange, onDateRangeChange, attendanceData, isExternal,
}: AttendanceContentProps) {
  const [historyView, setHistoryView] = useState<HistoryView>('calendar');

  // Resolve effective dates for display labels (fallback to current month)
  const { start, end } = resolveRange(dateRange);

  // Human-readable period label for stat cards sub-text
  const now = new Date();
  const isThisMonth =
    start.getMonth() === now.getMonth() &&
    start.getFullYear() === now.getFullYear() &&
    start.getDate() === 1;
  const periodLabel = isThisMonth
    ? 'This month'
    : `${format(start, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}`;

  return (
    <div className="space-y-6">
      {/* ── Date-range selector ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <EnhancedDateRangeSelector
          value={dateRange}
          onChange={onDateRangeChange}
          monthsView={2}
        />
        {/* Show resolved range as a subtle pill when range is set */}
        {dateRange?.startDate && dateRange?.endDate && (
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline-flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-full px-3 py-1 border border-gray-200 dark:border-gray-700">
            {format(start, 'dd MMM yyyy')}
            <span className="text-gray-300 dark:text-gray-600 mx-0.5">→</span>
            {format(end, 'dd MMM yyyy')}
          </span>
        )}
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <AttendanceStatsCards
        present={attendanceData.present}
        absent={attendanceData.absent}
        late={attendanceData.late}
        onLeave={attendanceData.onLeave}
        attendanceRate={attendanceData.attendanceRate}
        totalWorkingDays={attendanceData.totalWorkingDays}
        isExternal={isExternal}
        periodLabel={periodLabel}
      />

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        <WorkingHoursChart
          totalHours={attendanceData.totalHours}
          dailyHours={attendanceData.dailyHours}
          startDate={start}
          endDate={end}
        />
        <DailyDistributionChart
          present={attendanceData.present}
          absent={attendanceData.absent}
          late={attendanceData.late}
          onLeave={attendanceData.onLeave}
          isExternal={isExternal}
        />
      </div>

      {/* ── Calendar / Table toggle ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
          Attendance History
        </h2>
        <div className="flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 p-1">
          <Button
            variant="ghost" size="sm"
            onClick={() => setHistoryView('calendar')}
            className={`rounded-full h-8 px-3 gap-1.5 text-xs transition-all ${
              historyView === 'calendar'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-700 dark:text-violet-300 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => setHistoryView('table')}
            className={`rounded-full h-8 px-3 gap-1.5 text-xs transition-all ${
              historyView === 'table'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-700 dark:text-violet-300 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TableProperties className="h-3.5 w-3.5" />
            Table
          </Button>
        </div>
      </div>

      {historyView === 'calendar' ? (
        <AttendanceCalendarView
          records={attendanceData.records}
          startDate={start}
          endDate={end}
        />
      ) : (
        <AttendanceHistoryTable records={attendanceData.records} isExternal={isExternal} />
      )}
    </div>
  );
}