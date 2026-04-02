import React, { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TimeLog, Employee, BreakLog,
  CalendarContext, EMPTY_CALENDAR_CTX,
  isWorkedAnomaly, anomalyLabel,
  OrgDayStatus,
} from './AttendanceReportsPage';
import {
  getDaysInMonth, startOfMonth, format,
  differenceInMinutes, parseISO,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Coffee, UtensilsCrossed, Clock, AlertTriangle } from 'lucide-react';

// ── Duration helpers ──────────────────────────────────────────────────────────
const calcDuration = (ci: string | null, co: string | null): number | null => {
  if (!ci || !co) return null;
  try { const m = differenceInMinutes(parseISO(co), parseISO(ci)); return m > 0 ? m : null; }
  catch { return null; }
};
const calcBreakDuration = (s: string | null, e: string | null, stored: number | null): number => {
  if (s && e) { try { const m = differenceInMinutes(parseISO(e), parseISO(s)); if (m > 0) return m; } catch {} }
  return stored ?? 0;
};
const fmtMins = (mins: number | null): string => {
  if (mins === null || isNaN(mins) || mins <= 0) return '—';
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
};

// ── Break tooltip ─────────────────────────────────────────────────────────────
const BreakIcon = ({ type }: { type: string }) => {
  switch (type.toLowerCase()) {
    case 'coffee': return <Coffee className="h-3 w-3 text-amber-500" />;
    case 'lunch':  return <UtensilsCrossed className="h-3 w-3 text-orange-500" />;
    default:       return <Clock className="h-3 w-3 text-gray-400" />;
  }
};

const BreakTooltip = ({ breakLogs, date }: { breakLogs: BreakLog[]; date: string }) => {
  if (!breakLogs.length) return (
    <div className="text-xs text-gray-400 px-1">No breaks on {format(parseISO(date), 'dd MMM')}</div>
  );
  const total = breakLogs.reduce(
    (s, b) => s + calcBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes), 0
  );
  return (
    <div className="min-w-[180px]">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Breaks · {format(parseISO(date), 'dd MMM')}
      </p>
      <div className="space-y-1.5">
        {breakLogs.map((b) => {
          const bm = calcBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes);
          return (
            <div key={b.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <BreakIcon type={b.break_type} />
                <span className="text-xs capitalize text-gray-700 dark:text-gray-200">{b.break_type}</span>
              </div>
              <span className="text-xs font-medium text-gray-600">{bm > 0 ? `${bm}m` : '—'}</span>
            </div>
          );
        })}
      </div>
      {breakLogs.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between">
          <span className="text-[10px] font-semibold text-gray-500 uppercase">Total</span>
          <span className="text-xs font-bold text-amber-600">{fmtMins(total)}</span>
        </div>
      )}
    </div>
  );
};

// ── Cell background by org day status ────────────────────────────────────────
function dayCellBg(status: OrgDayStatus | undefined, hasActivity: boolean): string {
  switch (status) {
    case 'holiday':              return 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300';
    case 'weekend':              return 'bg-gray-100/80 dark:bg-gray-800/40 text-gray-400';
    case 'exception_nonworking': return 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400';
    case 'exception_working':    return hasActivity
                                   ? 'bg-teal-50 dark:bg-teal-950/20 text-teal-700'
                                   : 'bg-teal-50/40 dark:bg-teal-950/10 text-teal-500';
    default:
      return hasActivity
        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200'
        : 'text-gray-300';
  }
}

// ── Day header background ─────────────────────────────────────────────────────
function dayHeaderBg(status: OrgDayStatus | undefined): string {
  switch (status) {
    case 'holiday':              return 'bg-orange-100/60 text-orange-600';
    case 'weekend':              return 'bg-gray-100/60 text-gray-400';
    case 'exception_nonworking': return 'bg-rose-100/60 text-rose-500';
    case 'exception_working':    return 'bg-teal-100/60 text-teal-600';
    default:                     return '';
  }
}

// ── Day header tooltip ─────────────────────────────────────────────────────────
function DayHeaderTooltip({ dayInfo }: { dayInfo: ReturnType<CalendarContext['dayInfoMap']['get']> }) {
  if (!dayInfo || dayInfo.status === 'working') return null;
  const label =
    dayInfo.status === 'holiday'              ? (dayInfo.holidayName ?? 'Holiday') :
    dayInfo.status === 'weekend'              ? 'Weekend'                           :
    dayInfo.status === 'exception_nonworking' ? (dayInfo.exceptionReason ?? 'Non-working day') :
    dayInfo.status === 'exception_working'    ? (dayInfo.exceptionReason ?? 'Working override') :
    '';
  if (!label) return null;
  return (
    <div className="text-xs max-w-[160px] text-center">
      {label}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface MonthlyAttendanceReportProps {
  data:          TimeLog[];
  employees:     Employee[];
  selectedMonth: Date;
  calendarCtx:   CalendarContext;
}

// ── Component ─────────────────────────────────────────────────────────────────
const MonthlyAttendanceReport: React.FC<MonthlyAttendanceReportProps> = ({
  data, employees, selectedMonth,
  calendarCtx = EMPTY_CALENDAR_CTX,
}) => {
  const [viewType, setViewType] = useState<'billable' | 'non_billable'>('non_billable');

  const { headers, rows } = useMemo(() => {
    const logs = data.filter((l) => viewType === 'billable' ? l.is_billable : !l.is_billable);
    const relevantIds = new Set(logs.map((l) => l.employee_id));
    const filteredEmp = employees.filter((e) => relevantIds.has(e.id));

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

    // employee → date → log
    const empLogMap = new Map<string, Map<string, TimeLog>>();
    logs.forEach((log) => {
      if (!empLogMap.has(log.employee_id)) empLogMap.set(log.employee_id, new Map());
      empLogMap.get(log.employee_id)!.set(format(new Date(log.date), 'yyyy-MM-dd'), log);
    });

    const rows = filteredEmp.map((emp) => {
      const empLogs    = empLogMap.get(emp.id) ?? new Map<string, TimeLog>();
      let totalPresent = 0;
      let totalAbsent  = 0;

      const dailyData = headers.map((h) => {
        const log     = empLogs.get(h.dateKey) ?? null;
        const dur     = log ? calcDuration(log.clock_in_time, log.clock_out_time) : null;
        const hasWork = dur !== null && dur > 0;
        const status  = h.dayInfo?.status ?? 'working';
        const isNonWorking = status === 'weekend' || status === 'holiday' || status === 'exception_nonworking';

        if (!isNonWorking) {
          if (hasWork) totalPresent++;
          else         totalAbsent++;
        }

        const anomaly = isWorkedAnomaly(h.dateKey, emp.id, hasWork, calendarCtx);

        return {
          dateKey:   h.dateKey,
          duration:  dur,
          breakLogs: log?.break_logs ?? [],
          anomaly,
          anomalyLabel: anomaly ? anomalyLabel(h.dateKey, emp.id, calendarCtx) : '',
        };
      });

      return { employee: emp, dailyData, totalPresent, totalAbsent };
    });

    return { headers, rows };
  }, [data, employees, selectedMonth, viewType, calendarCtx]);

  const tabCls =
    'px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 ' +
    'data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all';

  return (
    <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl animate-scale-in w-full max-w-full">
      <CardHeader>
        <CardTitle>Monthly Attendance Report</CardTitle>
        <CardDescription>
          Hover any cell for break details. Holidays, weekends and working-day overrides are
          colour-coded. ⚠ marks days where an employee worked during leave / holiday / non-working day.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-[11px]">
          {[
            { dot: 'bg-emerald-400', label: 'Present' },
            { dot: 'bg-orange-400',  label: 'Holiday' },
            { dot: 'bg-gray-300',    label: 'Weekend' },
            { dot: 'bg-rose-400',    label: 'Non-working override' },
            { dot: 'bg-teal-400',    label: 'Working override' },
            { dot: 'bg-amber-400',   label: '⚠ Anomaly' },
          ].map(({ dot, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-gray-500">
              <span className={cn('h-2.5 w-2.5 rounded-sm', dot)} />
              {label}
            </span>
          ))}
        </div>

        <Tabs value={viewType} onValueChange={setViewType as any}>
          <TabsList className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
            <TabsTrigger value="billable"     className={tabCls}>Billable</TabsTrigger>
            <TabsTrigger value="non_billable" className={tabCls}>Non-Billable</TabsTrigger>
          </TabsList>

          <div className="overflow-x-auto max-w-full mt-4" style={{ maxWidth: '85vw' }}>
            <TooltipProvider delayDuration={150}>
              <Table className="min-w-[1000px] w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">
                      Employee
                    </TableHead>
                    {headers.map((h) => (
                      <Tooltip key={h.dateKey}>
                        <TooltipTrigger asChild>
                          <TableHead className={cn('text-center', dayHeaderBg(h.dayInfo?.status))}>
                            {h.label}
                          </TableHead>
                        </TooltipTrigger>
                        {h.dayInfo && h.dayInfo.status !== 'working' && (
                          <TooltipContent side="top"
                            className="rounded-xl bg-white dark:bg-gray-900 border shadow-xl px-3 py-2">
                            <DayHeaderTooltip dayInfo={h.dayInfo} />
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ))}
                    <TableHead className="text-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700">
                      Present
                    </TableHead>
                    <TableHead className="text-center bg-red-50 dark:bg-red-900/20 text-red-600">
                      Absent
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.length > 0 ? (
                    rows.map((row) => (
                      <TableRow key={row.employee.id}>
                        <TableCell className="sticky left-0 bg-white dark:bg-gray-950 z-10 font-medium">
                          {row.employee.name}
                        </TableCell>

                        {row.dailyData.map((d, i) => {
                          const hasActivity = d.duration !== null && d.duration > 0;
                          const hasBreaks   = d.breakLogs.length > 0;
                          const status      = headers[i].dayInfo?.status;

                          return (
                            <TableCell
                              key={i}
                              className={cn(
                                'text-center text-xs p-0 relative',
                                dayCellBg(status, hasActivity),
                                hasBreaks && hasActivity && 'ring-1 ring-inset ring-amber-300'
                              )}
                            >
                              <Tooltip>
                                <TooltipTrigger className="w-full h-full flex flex-col items-center justify-center px-1 py-1.5 gap-0.5 cursor-default select-none">
                                  <span className="font-medium">{fmtMins(d.duration)}</span>

                                  <div className="flex gap-0.5 items-center">
                                    {/* Break dot */}
                                    {hasBreaks && hasActivity && (
                                      <span className="h-1 w-1 rounded-full bg-amber-400" />
                                    )}
                                    {/* Anomaly flag */}
                                    {d.anomaly && (
                                      <AlertTriangle className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top"
                                  className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-3 min-w-[180px]">
                                  {d.anomaly ? (
                                    <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1.5 text-[11px] font-semibold">
                                      <AlertTriangle className="h-3 w-3" />
                                      {d.anomalyLabel}
                                    </div>
                                  ) : null}
                                  <BreakTooltip breakLogs={d.breakLogs} date={d.dateKey} />
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          );
                        })}

                        <TableCell className="text-center font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/60">
                          {row.totalPresent}
                        </TableCell>
                        <TableCell className="text-center font-bold text-red-600 dark:text-red-400 bg-red-50/60">
                          {row.totalAbsent}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={headers.length + 3} className="h-24 text-center text-gray-400">
                        No records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MonthlyAttendanceReport;