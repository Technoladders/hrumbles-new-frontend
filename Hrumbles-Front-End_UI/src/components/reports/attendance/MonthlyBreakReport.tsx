import React, { useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TimeLog, Employee,
  CalendarContext, EMPTY_CALENDAR_CTX,
  isWorkedAnomaly, anomalyLabel,
  OrgDayStatus,
} from './AttendanceReportsPage';
import {
  getDaysInMonth, startOfMonth, format,
  differenceInMinutes, parseISO,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Coffee, Clock, AlertTriangle } from 'lucide-react';

const calcBreakDuration = (s: string | null, e: string | null, stored: number | null): number => {
  if (s && e) { try { const m = differenceInMinutes(parseISO(e), parseISO(s)); if (m > 0) return m; } catch {} }
  return stored ?? 0;
};
const calcDuration = (ci: string | null, co: string | null): number | null => {
  if (!ci || !co) return null;
  try { const m = differenceInMinutes(parseISO(co), parseISO(ci)); return m > 0 ? m : null; }
  catch { return null; }
};

const BREAK_WARN  = 45;
const BREAK_HIGH  = 90;

const fmtMins = (mins: number | null, fallback = '—'): string => {
  if (mins === null || mins === undefined) return fallback;
  if (mins <= 0) return '0m';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};

const breakCellClass = (breakMins: number | null): string => {
  if (breakMins === null) return 'text-gray-200 dark:text-gray-700';
  if (breakMins >= BREAK_HIGH) return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium';
  if (breakMins >= BREAK_WARN) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium';
  if (breakMins > 0)           return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300';
  return 'text-gray-300 dark:text-gray-600';
};

function dayCellBg(status: OrgDayStatus | undefined): string {
  switch (status) {
    case 'holiday':              return 'bg-orange-50/60 dark:bg-orange-950/10';
    case 'weekend':              return 'bg-gray-100/60 dark:bg-gray-800/30';
    case 'exception_nonworking': return 'bg-rose-50/60 dark:bg-rose-950/10';
    case 'exception_working':    return 'bg-teal-50/40 dark:bg-teal-950/10';
    default:                     return '';
  }
}

function dayHeaderBg(status: OrgDayStatus | undefined): string {
  switch (status) {
    case 'holiday':              return 'bg-orange-100/60 text-orange-600';
    case 'weekend':              return 'bg-gray-100/60 text-gray-400';
    case 'exception_nonworking': return 'bg-rose-100/60 text-rose-500';
    case 'exception_working':    return 'bg-teal-100/60 text-teal-600';
    default:                     return '';
  }
}

interface MonthlyBreakReportProps {
  data:          TimeLog[];
  employees:     Employee[];
  selectedMonth: Date;
  calendarCtx:   CalendarContext;
}

const MonthlyBreakReport: React.FC<MonthlyBreakReportProps> = ({
  data, employees, selectedMonth,
  calendarCtx = EMPTY_CALENDAR_CTX,
}) => {
  const { headers, rows, grandTotalBreak } = useMemo(() => {
    const firstDay  = startOfMonth(selectedMonth);
    const numDays   = getDaysInMonth(selectedMonth);
    const daysArray = Array.from(
      { length: numDays },
      (_, i) => new Date(firstDay.getFullYear(), firstDay.getMonth(), i + 1)
    );
    const headers = daysArray.map((day) => ({
      date:    day,
      label:   format(day, 'd'),
      dateKey: format(day, 'yyyy-MM-dd'),
      dayInfo: calendarCtx.dayInfoMap.get(format(day, 'yyyy-MM-dd')),
    }));

    const logIndex = new Map<string, Map<string, TimeLog>>();
    data.forEach((log) => {
      const dk = format(new Date(log.date), 'yyyy-MM-dd');
      if (!logIndex.has(log.employee_id)) logIndex.set(log.employee_id, new Map());
      logIndex.get(log.employee_id)!.set(dk, log);
    });

    const relevantIds       = new Set(data.map((l) => l.employee_id));
    const filteredEmployees = employees.filter((e) => relevantIds.has(e.id));

    let grandTotalBreak = 0;

    const rows = filteredEmployees.map((emp) => {
      const empMap       = logIndex.get(emp.id) ?? new Map<string, TimeLog>();
      let totalBreakMins = 0;
      let daysWithBreaks = 0;

      const dailyData = headers.map((h) => {
        const log       = empMap.get(h.dateKey);
        if (!log) return { breakMins: null, anomaly: false, anomalyLabel: '' };

        const breakMins = log.break_logs.reduce(
          (s, b) => s + calcBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes), 0
        );

        totalBreakMins += breakMins;
        if (breakMins > 0) daysWithBreaks++;

        const dur     = calcDuration(log.clock_in_time, log.clock_out_time);
        const anomaly = isWorkedAnomaly(h.dateKey, emp.id, !!dur, calendarCtx);

        return {
          breakMins,
          anomaly,
          anomalyLabel: anomaly ? anomalyLabel(h.dateKey, emp.id, calendarCtx) : '',
        };
      });

      grandTotalBreak += totalBreakMins;

      return {
        employee: emp,
        dailyData,
        totalBreakMins,
        daysWithBreaks,
        avgBreakPerDay: daysWithBreaks > 0 ? Math.round(totalBreakMins / daysWithBreaks) : 0,
      };
    });

    return { headers, rows, grandTotalBreak };
  }, [data, employees, selectedMonth, calendarCtx]);

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
              Break time per employee per day. ⚠ marks anomalies (break taken on holiday/leave/non-working day).
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-200 border border-emerald-400" />
              Normal (&lt;{BREAK_WARN}m)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-200 border border-amber-400" />
              Extended (≥{BREAK_WARN}m)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-200 border border-red-400" />
              Excessive (≥{BREAK_HIGH}m)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-orange-200 border border-orange-400" />
              Holiday
            </span>
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Anomaly
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border bg-gray-50 dark:bg-gray-900/30 p-3 flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 dark:bg-violet-900/40 p-2">
              <Clock className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Break Time</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{fmtMins(grandTotalBreak)}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-gray-50 dark:bg-gray-900/30 p-3 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 dark:bg-amber-900/40 p-2">
              <Coffee className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Employees Tracked</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{rows.length}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-w-full rounded-xl border border-gray-200 dark:border-gray-700"
          style={{ maxWidth: '85vw' }}>
          <TooltipProvider delayDuration={150}>
            <Table className="min-w-[1000px] w-full">
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-900/40">
                  <TableHead className="sticky left-0 bg-gray-50 dark:bg-gray-900/40 z-20 min-w-[160px] border-r border-gray-200 dark:border-gray-700">
                    Employee
                  </TableHead>
                  {headers.map((h) => (
                    <Tooltip key={h.dateKey}>
                      <TooltipTrigger asChild>
                        <TableHead className={cn('text-center text-xs border-l border-gray-100 dark:border-gray-800',
                          dayHeaderBg(h.dayInfo?.status))}>
                          {h.label}
                        </TableHead>
                      </TooltipTrigger>
                      {h.dayInfo && h.dayInfo.status !== 'working' && (
                        <TooltipContent side="top"
                          className="rounded-xl bg-white dark:bg-gray-900 border shadow-xl px-3 py-2 text-xs">
                          {h.dayInfo.holidayName ?? h.dayInfo.exceptionReason ?? h.dayInfo.status}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
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
                  rows.map((row) => (
                    <TableRow key={row.employee.id} className="hover:bg-gray-50/70 transition-colors">
                      <TableCell className="sticky left-0 bg-white dark:bg-gray-950 z-10 font-medium border-r border-gray-100">
                        {row.employee.name}
                      </TableCell>

                      {row.dailyData.map((d, i) => {
                        const status = headers[i].dayInfo?.status;
                        return (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>
                              <TableCell className={cn(
                                'text-center text-xs px-1 cursor-default',
                                dayCellBg(status),
                                breakCellClass(d.breakMins)
                              )}>
                                <span className="flex flex-col items-center gap-0.5">
                                  {d.breakMins !== null && d.breakMins > 0
                                    ? fmtMins(d.breakMins)
                                    : <span className="text-gray-200 dark:text-gray-700">·</span>}
                                  {d.anomaly && (
                                    <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
                                  )}
                                </span>
                              </TableCell>
                            </TooltipTrigger>
                            {d.anomaly && (
                              <TooltipContent side="top"
                                className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 shadow-xl px-3 py-2 text-xs max-w-[200px]">
                                <div className="flex items-center gap-1.5">
                                  <AlertTriangle className="h-3 w-3" />
                                  {d.anomalyLabel}
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })}

                      <TableCell className="text-center font-semibold text-violet-700 dark:text-violet-300 bg-violet-50/60 border-l-2 border-violet-100">
                        {fmtMins(row.totalBreakMins)}
                      </TableCell>
                      <TableCell className="text-center bg-violet-50/60">
                        <span className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                          row.avgBreakPerDay >= BREAK_HIGH
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40'
                            : row.avgBreakPerDay >= BREAK_WARN
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20'
                        )}>
                          {fmtMins(row.avgBreakPerDay)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={headers.length + 3} className="h-24 text-center text-gray-400">
                      No break data found for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyBreakReport;