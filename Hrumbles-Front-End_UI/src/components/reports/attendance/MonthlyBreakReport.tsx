import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TimeLog, Employee } from './AttendanceReportsPage';
import { getDaysInMonth, startOfMonth, format, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { Coffee, UtensilsCrossed, Clock, TrendingUp } from 'lucide-react';

interface MonthlyBreakReportProps {
  data: TimeLog[];
  employees: Employee[];
  selectedMonth: Date;
}

// Thresholds (in minutes) for colour-coding total daily break time
const BREAK_WARN_THRESHOLD = 45;  // amber
const BREAK_HIGH_THRESHOLD = 90;  // red

const MonthlyBreakReport: React.FC<MonthlyBreakReportProps> = ({
  data,
  employees,
  selectedMonth,
}) => {
  const { headers, rows, grandTotals } = useMemo(() => {
    // Build day headers for the selected month
    const firstDay = startOfMonth(selectedMonth);
    const numDays = getDaysInMonth(selectedMonth);
    const daysArray = Array.from(
      { length: numDays },
      (_, i) => new Date(firstDay.getFullYear(), firstDay.getMonth(), i + 1)
    );
    const headers = daysArray.map((day) => ({ date: day, label: format(day, 'd') }));

    // Index logs by employee → date
    const logIndex = new Map<string, Map<string, TimeLog>>();
    data.forEach((log) => {
      const dateKey = format(new Date(log.date), 'yyyy-MM-dd');
      if (!logIndex.has(log.employee_id)) logIndex.set(log.employee_id, new Map());
      logIndex.get(log.employee_id)!.set(dateKey, log);
    });

    // Only show employees who have at least one log in the current data set
    const relevantIds = new Set(data.map((l) => l.employee_id));
    const filteredEmployees = employees.filter((e) => relevantIds.has(e.id));

    let grandBreak = 0;
    let grandNet = 0;

    const rows = filteredEmployees.map((emp) => {
      const empMap = logIndex.get(emp.id) ?? new Map<string, TimeLog>();
      let totalBreakMins = 0;
      let totalNetMins = 0;
      let daysWorked = 0;

      const dailyData = headers.map((h) => {
        const dateKey = format(h.date, 'yyyy-MM-dd');
        const log = empMap.get(dateKey);
        if (!log) return { breakMins: null, netMins: null, working: null };

        const breakMins = log.break_logs.reduce(
          (sum, b) => sum + (b.duration_minutes ?? 0),
          0
        );
        const working = log.duration_minutes ?? 0;
        const net = Math.max(0, working - breakMins);

        totalBreakMins += breakMins;
        totalNetMins += net;
        if (working > 0) daysWorked++;

        return { breakMins, netMins: net, working };
      });

      grandBreak += totalBreakMins;
      grandNet += totalNetMins;

      return {
        employee: emp,
        dailyData,
        totalBreakMins,
        totalNetMins,
        daysWorked,
        avgBreakPerDay: daysWorked > 0 ? Math.round(totalBreakMins / daysWorked) : 0,
      };
    });

    return { headers, rows, grandTotals: { grandBreak, grandNet } };
  }, [data, employees, selectedMonth]);

  const fmtMins = (mins: number | null, fallback = '—') => {
    if (mins === null || mins === undefined) return fallback;
    if (mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
  };

  const breakCellClass = (breakMins: number | null) => {
    if (breakMins === null) return '';
    if (breakMins >= BREAK_HIGH_THRESHOLD)
      return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
    if (breakMins >= BREAK_WARN_THRESHOLD)
      return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';
    if (breakMins > 0)
      return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300';
    return 'text-gray-400';
  };

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
              Break time and net working time per employee per day.
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
              Extended (&ge;{BREAK_WARN_THRESHOLD}m)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-200 border border-red-400" />
              Excessive (&ge;{BREAK_HIGH_THRESHOLD}m)
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-gray-50 dark:bg-gray-900/30 p-3 flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 dark:bg-violet-900/40 p-2">
              <Clock className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Break Time</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                {fmtMins(grandTotals.grandBreak)}
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-gray-50 dark:bg-gray-900/30 p-3 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/40 p-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Net Work</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                {fmtMins(grandTotals.grandNet)}
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-gray-50 dark:bg-gray-900/30 p-3 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 dark:bg-amber-900/40 p-2">
              <Coffee className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Employees Tracked</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                {rows.length}
              </p>
            </div>
          </div>
        </div>

        {/* Main table */}
        <div
          className="overflow-x-auto max-w-full rounded-xl border border-gray-200 dark:border-gray-700"
          style={{ maxWidth: '85vw' }}
        >
          <Table className="min-w-[1200px] w-full">
            <TableHeader>
              {/* Day-number header row */}
              <TableRow className="bg-gray-50 dark:bg-gray-900/40">
                <TableHead
                  rowSpan={2}
                  className="sticky left-0 bg-gray-50 dark:bg-gray-900/40 z-20 min-w-[160px] align-middle border-r border-gray-200 dark:border-gray-700"
                >
                  Employee
                </TableHead>
                {headers.map((h) => (
                  <TableHead
                    key={h.label}
                    colSpan={2}
                    className={cn(
                      'text-center border-l border-gray-100 dark:border-gray-800',
                      isWeekend(h.date) && 'text-muted-foreground bg-gray-100/60 dark:bg-gray-800/40'
                    )}
                  >
                    {h.label}
                  </TableHead>
                ))}
                <TableHead
                  colSpan={3}
                  className="text-center bg-violet-50 dark:bg-violet-900/20 border-l-2 border-violet-200 dark:border-violet-700"
                >
                  Summary
                </TableHead>
              </TableRow>

              {/* Sub-header row: Break / Net per day + summary cols */}
              <TableRow className="bg-gray-50 dark:bg-gray-900/40 text-xs">
                {headers.map((h, i) => (
                  <React.Fragment key={i}>
                    <TableHead
                      className={cn(
                        'text-center text-[10px] font-medium text-gray-500 pb-2 border-l border-gray-100 dark:border-gray-800',
                        isWeekend(h.date) && 'bg-gray-100/60 dark:bg-gray-800/40'
                      )}
                    >
                      Brk
                    </TableHead>
                    <TableHead
                      className={cn(
                        'text-center text-[10px] font-medium text-gray-500 pb-2',
                        isWeekend(h.date) && 'bg-gray-100/60 dark:bg-gray-800/40'
                      )}
                    >
                      Net
                    </TableHead>
                  </React.Fragment>
                ))}
                <TableHead className="text-center text-[10px] font-semibold text-violet-600 bg-violet-50 dark:bg-violet-900/20 border-l-2 border-violet-200 dark:border-violet-700">
                  Total Break
                </TableHead>
                <TableHead className="text-center text-[10px] font-semibold text-emerald-600 bg-violet-50 dark:bg-violet-900/20">
                  Total Net
                </TableHead>
                <TableHead className="text-center text-[10px] font-semibold text-amber-600 bg-violet-50 dark:bg-violet-900/20">
                  Avg Break/Day
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <TableRow key={row.employee.id} className="hover:bg-gray-50/70 transition-colors">
                    <TableCell className="sticky left-0 bg-white z-10 font-medium border-r border-gray-100 dark:border-gray-800">
                      {row.employee.name}
                    </TableCell>

                    {row.dailyData.map((d, i) => {
                      const isWknd = isWeekend(headers[i].date);
                      return (
                        <React.Fragment key={i}>
                          {/* Break cell */}
                          <TableCell
                            className={cn(
                              'text-center text-xs border-l border-gray-50 dark:border-gray-800/50 px-1',
                              isWknd && 'bg-gray-50/60 dark:bg-gray-800/20',
                              d.breakMins !== null && breakCellClass(d.breakMins)
                            )}
                          >
                            {d.breakMins !== null ? fmtMins(d.breakMins, '—') : (
                              <span className="text-gray-200">·</span>
                            )}
                          </TableCell>
                          {/* Net cell */}
                          <TableCell
                            className={cn(
                              'text-center text-xs px-1',
                              isWknd && 'bg-gray-50/60 dark:bg-gray-800/20',
                              d.netMins !== null && d.netMins > 0
                                ? 'text-gray-700 dark:text-gray-300'
                                : 'text-gray-300'
                            )}
                          >
                            {d.netMins !== null ? fmtMins(d.netMins, '—') : (
                              <span className="text-gray-200">·</span>
                            )}
                          </TableCell>
                        </React.Fragment>
                      );
                    })}

                    {/* Summary columns */}
                    <TableCell className="text-center font-semibold text-violet-700 dark:text-violet-300 bg-violet-50/60 dark:bg-violet-900/10 border-l-2 border-violet-100 dark:border-violet-800">
                      {fmtMins(row.totalBreakMins)}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-emerald-700 dark:text-emerald-300 bg-violet-50/60 dark:bg-violet-900/10">
                      {fmtMins(row.totalNetMins)}
                    </TableCell>
                    <TableCell className="text-center font-medium text-amber-700 dark:text-amber-300 bg-violet-50/60 dark:bg-violet-900/10">
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-xs',
                          row.avgBreakPerDay >= BREAK_HIGH_THRESHOLD
                            ? 'bg-red-100 text-red-700'
                            : row.avgBreakPerDay >= BREAK_WARN_THRESHOLD
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
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
                    colSpan={headers.length * 2 + 4}
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
// ── Monthly Break Report ───────────────────────────────────────────────────────