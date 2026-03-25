import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TimeLog, Employee, BreakLog } from './AttendanceReportsPage';
import { getDaysInMonth, startOfMonth, format, isWeekend, differenceInMinutes, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Coffee, UtensilsCrossed, Clock } from 'lucide-react';

interface MonthlyAttendanceReportProps {
  data: TimeLog[];
  employees: Employee[];
  selectedMonth: Date;
}

// ── Authoritative duration: always compute from timestamps ───────────────────
const calcDuration = (clockIn: string | null, clockOut: string | null): number | null => {
  if (!clockIn || !clockOut) return null;
  try {
    const mins = differenceInMinutes(parseISO(clockOut), parseISO(clockIn));
    return mins > 0 ? mins : null;
  } catch {
    return null;
  }
};

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

// ── Duration formatter ────────────────────────────────────────────────────────
const fmtMins = (mins: number | null): string => {
  if (mins === null || isNaN(mins) || mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
};

// ── Break type icon ───────────────────────────────────────────────────────────
const BreakIcon = ({ type }: { type: string }) => {
  switch (type.toLowerCase()) {
    case 'coffee': return <Coffee className="h-3 w-3 text-amber-500" />;
    case 'lunch':  return <UtensilsCrossed className="h-3 w-3 text-orange-500" />;
    default:       return <Clock className="h-3 w-3 text-gray-400" />;
  }
};

// ── Break tooltip content ─────────────────────────────────────────────────────
const BreakTooltip = ({ breakLogs, date }: { breakLogs: BreakLog[]; date: string }) => {
  if (!breakLogs.length) return (
    <div className="text-xs text-gray-400 px-1">No breaks on {format(parseISO(date), 'dd MMM')}</div>
  );

  const total = breakLogs.reduce(
    (s, b) => s + calcBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes),
    0
  );

  return (
    <div className="min-w-[180px]">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Breaks · {format(parseISO(date), 'dd MMM')}
      </p>
      <div className="space-y-1.5">
        {breakLogs.map((b) => {
          const bMins = calcBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes);
          return (
            <div key={b.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <BreakIcon type={b.break_type} />
                <span className="text-xs capitalize text-gray-700 dark:text-gray-200">
                  {b.break_type}
                </span>
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {bMins > 0 ? `${bMins}m` : '—'}
              </span>
            </div>
          );
        })}
      </div>
      {breakLogs.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Total</span>
          <span className="text-xs font-bold text-amber-600">{fmtMins(total)}</span>
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const MonthlyAttendanceReport: React.FC<MonthlyAttendanceReportProps> = ({
  data, employees, selectedMonth,
}) => {
  const [viewType, setViewType] = useState<'billable' | 'non_billable'>('non_billable');

  const { headers, rows } = useMemo(() => {
    const logs = data.filter(log =>
      viewType === 'billable' ? log.is_billable : !log.is_billable
    );

    const relevantEmployeeIds = new Set(logs.map(log => log.employee_id));
    const filteredEmployees   = employees.filter(emp => relevantEmployeeIds.has(emp.id));

    const firstDay  = startOfMonth(selectedMonth);
    const numDays   = getDaysInMonth(selectedMonth);
    const daysArray = Array.from(
      { length: numDays },
      (_, i) => new Date(firstDay.getFullYear(), firstDay.getMonth(), i + 1)
    );
    const headers = daysArray.map(day => ({ date: day, label: format(day, 'd') }));

    // Map employee → date → full log (need clock times + break_logs)
    const employeeLogMap = new Map<string, Map<string, TimeLog>>();
    logs.forEach(log => {
      if (!employeeLogMap.has(log.employee_id)) employeeLogMap.set(log.employee_id, new Map());
      employeeLogMap.get(log.employee_id)!.set(format(new Date(log.date), 'yyyy-MM-dd'), log);
    });

    const rows = filteredEmployees.map(emp => {
      const empLogs    = employeeLogMap.get(emp.id) ?? new Map<string, TimeLog>();
      let totalPresent = 0;

      const dailyData = headers.map(h => {
        const dateKey = format(h.date, 'yyyy-MM-dd');
        const log     = empLogs.get(dateKey) ?? null;

        // Always compute duration from timestamps — ignore stored duration_minutes
        const duration = log
          ? calcDuration(log.clock_in_time, log.clock_out_time)
          : null;

        if (duration !== null && duration > 0) totalPresent++;

        return {
          date:      dateKey,
          duration,
          breakLogs: log?.break_logs ?? [],
        };
      });

      const totalWeekdays = daysArray.filter(d => !isWeekend(d)).length;

      return {
        employee: emp,
        dailyData,
        totalPresent,
        totalAbsent: Math.max(0, totalWeekdays - totalPresent),
      };
    });

    return { headers, rows };
  }, [data, employees, selectedMonth, viewType]);

  const tabTriggerClass =
    'px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 ' +
    'data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all';

  return (
    <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl animate-scale-in w-full max-w-full">
      <CardHeader>
        <CardTitle>Monthly Attendance Report</CardTitle>
        <CardDescription>
          Hover any day cell to see break details. Duration is calculated from clock-in / clock-out times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={viewType} onValueChange={setViewType as any}>
          <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
            <TabsTrigger value="billable"     className={tabTriggerClass}>Billable</TabsTrigger>
            <TabsTrigger value="non_billable" className={tabTriggerClass}>Non-Billable</TabsTrigger>
          </TabsList>

          <div className="overflow-x-auto max-w-full mt-4" style={{ maxWidth: '85vw' }}>
            <TooltipProvider delayDuration={200}>
              <Table className="min-w-[1000px] w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">
                      Employee
                    </TableHead>
                    {headers.map(h => (
                      <TableHead
                        key={h.label}
                        className={cn(
                          'text-center',
                          isWeekend(h.date) && 'text-muted-foreground bg-gray-50 dark:bg-gray-800/40'
                        )}
                      >
                        {h.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                      Present
                    </TableHead>
                    <TableHead className="text-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                      Absent
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.length > 0 ? (
                    rows.map(row => (
                      <TableRow key={row.employee.id}>
                        <TableCell className="sticky left-0 bg-white dark:bg-gray-950 z-10 font-medium">
                          {row.employee.name}
                        </TableCell>

                        {row.dailyData.map((d, i) => {
                          const isWknd      = isWeekend(headers[i].date);
                          const hasActivity = d.duration !== null && d.duration > 0;
                          const hasBreaks   = d.breakLogs.length > 0;

                          return (
                            <TableCell
                              key={i}
                              className={cn(
                                'text-center text-xs p-0',
                                isWknd
                                  ? 'bg-gray-50/80 dark:bg-gray-800/30 text-gray-300'
                                  : hasActivity
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200'
                                  : d.duration === 0
                                  ? 'bg-red-50 dark:bg-red-900/20 text-red-400'
                                  : 'text-gray-300',
                                hasBreaks && hasActivity && 'ring-1 ring-inset ring-amber-300 dark:ring-amber-600'
                              )}
                            >
                              <Tooltip>
                                <TooltipTrigger
                                  className="w-full h-full flex items-center justify-center px-2 py-2 select-none"
                                  style={{ background: 'none', border: 'none', cursor: 'default' }}
                                >
                                  <span className="font-medium">{fmtMins(d.duration)}</span>
                                  {hasBreaks && hasActivity && (
                                    <span className="ml-0.5 inline-block h-1 w-1 rounded-full bg-amber-400 align-super flex-shrink-0" />
                                  )}
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-3"
                                >
                                  <BreakTooltip breakLogs={d.breakLogs} date={d.date} />
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                          );
                        })}

                        <TableCell className="text-center font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/10">
                          {row.totalPresent}
                        </TableCell>
                        <TableCell className="text-center font-bold text-red-600 dark:text-red-400 bg-red-50/60 dark:bg-red-900/10">
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