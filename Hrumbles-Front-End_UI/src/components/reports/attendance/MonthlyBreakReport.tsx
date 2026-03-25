import React, { useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TimeLog, Employee } from './AttendanceReportsPage';
import { getDaysInMonth, startOfMonth, format, isWeekend, differenceInMinutes, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Coffee, Clock } from 'lucide-react';

/** Prefer break timestamp pair; fall back to stored duration_minutes */
const calcBreakDuration = (start: string | null, end: string | null, stored: number | null): number => {
  if (start && end) {
    try {
      const mins = differenceInMinutes(parseISO(end), parseISO(start));
      if (mins > 0) return mins;
    } catch { /* fall through */ }
  }
  return stored ?? 0;
};

interface MonthlyBreakReportProps {
  data: TimeLog[];
  employees: Employee[];
  selectedMonth: Date;
}

// Thresholds for colour-coding total daily break time
const BREAK_WARN_THRESHOLD = 45;  // amber
const BREAK_HIGH_THRESHOLD = 90;  // red

const fmtMins = (mins: number | null, fallback = '—'): string => {
  if (mins === null || mins === undefined) return fallback;
  if (mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};

const breakCellClass = (breakMins: number | null): string => {
  if (breakMins === null) return 'text-gray-200 dark:text-gray-700';
  if (breakMins >= BREAK_HIGH_THRESHOLD)
    return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium';
  if (breakMins >= BREAK_WARN_THRESHOLD)
    return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium';
  if (breakMins > 0)
    return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300';
  return 'text-gray-300 dark:text-gray-600';
};

const MonthlyBreakReport: React.FC<MonthlyBreakReportProps> = ({
  data, employees, selectedMonth,
}) => {
  const { headers, rows, grandTotalBreak } = useMemo(() => {
    const firstDay  = startOfMonth(selectedMonth);
    const numDays   = getDaysInMonth(selectedMonth);
    const daysArray = Array.from(
      { length: numDays },
      (_, i) => new Date(firstDay.getFullYear(), firstDay.getMonth(), i + 1)
    );
    const headers = daysArray.map(day => ({ date: day, label: format(day, 'd') }));

    // Index logs by employee → date
    const logIndex = new Map<string, Map<string, TimeLog>>();
    data.forEach(log => {
      const dateKey = format(new Date(log.date), 'yyyy-MM-dd');
      if (!logIndex.has(log.employee_id)) logIndex.set(log.employee_id, new Map());
      logIndex.get(log.employee_id)!.set(dateKey, log);
    });

    const relevantIds       = new Set(data.map(l => l.employee_id));
    const filteredEmployees = employees.filter(e => relevantIds.has(e.id));

    let grandTotalBreak = 0;

    const rows = filteredEmployees.map(emp => {
      const empMap        = logIndex.get(emp.id) ?? new Map<string, TimeLog>();
      let totalBreakMins  = 0;
      let daysWithBreaks  = 0;

      const dailyData = headers.map(h => {
        const dateKey = format(h.date, 'yyyy-MM-dd');
        const log     = empMap.get(dateKey);
        if (!log) return { breakMins: null };

        const breakMins = log.break_logs.reduce(
          (sum, b) => sum + calcBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes),
          0
        );

        totalBreakMins += breakMins;
        if (breakMins > 0) daysWithBreaks++;

        return { breakMins };
      });

      grandTotalBreak += totalBreakMins;

      return {
        employee: emp,
        dailyData,
        totalBreakMins,
        daysWithBreaks,
        avgBreakPerDay: daysWithBreaks > 0
          ? Math.round(totalBreakMins / daysWithBreaks)
          : 0,
      };
    });

    return { headers, rows, grandTotalBreak };
  }, [data, employees, selectedMonth]);

  return (
    <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl animate-scale-in w-full max-w-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-violet-500" />
              Monthly Break Report
            </CardTitle>
            <CardDescription className="mt-1">
              Break time per employee per day.
            </CardDescription>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-200 border border-emerald-400" />
              Normal (&lt;{BREAK_WARN_THRESHOLD}m)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-200 border border-amber-400" />
              Extended (≥{BREAK_WARN_THRESHOLD}m)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-200 border border-red-400" />
              Excessive (≥{BREAK_HIGH_THRESHOLD}m)
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary cards — break only */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border bg-gray-50 dark:bg-gray-900/30 p-3 flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 dark:bg-violet-900/40 p-2">
              <Clock className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Break Time</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                {fmtMins(grandTotalBreak)}
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-gray-50 dark:bg-gray-900/30 p-3 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 dark:bg-amber-900/40 p-2">
              <Coffee className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Employees Tracked</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{rows.length}</p>
            </div>
          </div>
        </div>

        {/* Main table — one column per day (break only) */}
        <div
          className="overflow-x-auto max-w-full rounded-xl border border-gray-200 dark:border-gray-700"
          style={{ maxWidth: '85vw' }}
        >
          <Table className="min-w-[1000px] w-full">
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-900/40">
                {/* sticky employee column */}
                <TableHead className="sticky left-0 bg-gray-50 dark:bg-gray-900/40 z-20 min-w-[160px] border-r border-gray-200 dark:border-gray-700">
                  Employee
                </TableHead>

                {/* one column per day */}
                {headers.map(h => (
                  <TableHead
                    key={h.label}
                    className={cn(
                      'text-center text-xs border-l border-gray-100 dark:border-gray-800',
                      isWeekend(h.date) && 'text-muted-foreground bg-gray-100/60 dark:bg-gray-800/40'
                    )}
                  >
                    {h.label}
                  </TableHead>
                ))}

                {/* Summary columns — break only */}
                <TableHead className="text-center text-[10px] font-semibold text-violet-600 bg-violet-50 dark:bg-violet-900/20 border-l-2 border-violet-200 dark:border-violet-700 min-w-[90px]">
                  Total Break
                </TableHead>
                <TableHead className="text-center text-[10px] font-semibold text-amber-600 bg-violet-50 dark:bg-violet-900/20 min-w-[90px]">
                  Avg / Day
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length > 0 ? (
                rows.map(row => (
                  <TableRow key={row.employee.id} className="hover:bg-gray-50/70 transition-colors">
                    <TableCell className="sticky left-0 bg-white dark:bg-gray-950 z-10 font-medium border-r border-gray-100 dark:border-gray-800">
                      {row.employee.name}
                    </TableCell>

                    {row.dailyData.map((d, i) => {
                      const isWknd = isWeekend(headers[i].date);
                      return (
                        <TableCell
                          key={i}
                          className={cn(
                            'text-center text-xs px-1',
                            isWknd && 'bg-gray-50/60 dark:bg-gray-800/20',
                            breakCellClass(d.breakMins)
                          )}
                        >
                          {d.breakMins !== null
                            ? (d.breakMins > 0 ? fmtMins(d.breakMins) : <span className="text-gray-200 dark:text-gray-700">·</span>)
                            : <span className="text-gray-200 dark:text-gray-700">·</span>
                          }
                        </TableCell>
                      );
                    })}

                    {/* Total break */}
                    <TableCell className="text-center font-semibold text-violet-700 dark:text-violet-300 bg-violet-50/60 dark:bg-violet-900/10 border-l-2 border-violet-100 dark:border-violet-800">
                      {fmtMins(row.totalBreakMins)}
                    </TableCell>

                    {/* Avg break per day with colour pill */}
                    <TableCell className="text-center bg-violet-50/60 dark:bg-violet-900/10">
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                          row.avgBreakPerDay >= BREAK_HIGH_THRESHOLD
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : row.avgBreakPerDay >= BREAK_WARN_THRESHOLD
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                        )}
                      >
                        {fmtMins(row.avgBreakPerDay)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={headers.length + 3}
                    className="h-24 text-center text-gray-400"
                  >
                    No break data found for this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyBreakReport;