import React, { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TimeLog, Employee,
  CalendarContext, EMPTY_CALENDAR_CTX,
  isWorkedAnomaly, anomalyLabel,
  OrgDayStatus,
} from './AttendanceReportsPage';
import { getDaysInMonth, startOfMonth, format, differenceInMinutes, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

const calcDuration = (ci: string | null, co: string | null): number | null => {
  if (!ci || !co) return null;
  try { const m = differenceInMinutes(parseISO(co), parseISO(ci)); return m > 0 ? m : null; }
  catch { return null; }
};

const formatTime = (t: string | null) => {
  if (!t) return null;
  try { return format(new Date(t), 'p'); }
  catch { return null; }
};

function dayPairBg(status: OrgDayStatus | undefined, hasWork: boolean): string {
  if (!hasWork && status === 'working') return '';
  switch (status) {
    case 'holiday':              return 'bg-orange-50 dark:bg-orange-950/15';
    case 'weekend':              return 'bg-gray-100/60 dark:bg-gray-800/30';
    case 'exception_nonworking': return 'bg-rose-50 dark:bg-rose-950/15';
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

interface MonthlyInOutReportProps {
  data:          TimeLog[];
  employees:     Employee[];
  selectedMonth: Date;
  calendarCtx:   CalendarContext;
}

const MonthlyInOutReport: React.FC<MonthlyInOutReportProps> = ({
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

    // employee → date → {in, out}
    const empData = new Map<string, Map<string, { in: string | null; out: string | null }>>();
    const empLogData = new Map<string, Map<string, TimeLog>>();
    logs.forEach((log) => {
      const dk = format(new Date(log.date), 'yyyy-MM-dd');
      if (!empData.has(log.employee_id)) empData.set(log.employee_id, new Map());
      empData.get(log.employee_id)!.set(dk, { in: log.clock_in_time, out: log.clock_out_time });
      if (!empLogData.has(log.employee_id)) empLogData.set(log.employee_id, new Map());
      empLogData.get(log.employee_id)!.set(dk, log);
    });

    const rows = filteredEmp.map((emp) => {
      const dailyData = headers.map((h) => {
        const times = empData.get(emp.id)?.get(h.dateKey) ?? { in: null, out: null };
        const log   = empLogData.get(emp.id)?.get(h.dateKey);
        const dur   = log ? calcDuration(log.clock_in_time, log.clock_out_time) : null;
        const anomaly = isWorkedAnomaly(h.dateKey, emp.id, !!dur, calendarCtx);
        return {
          in:           times.in,
          out:          times.out,
          anomaly,
          anomalyLabel: anomaly ? anomalyLabel(h.dateKey, emp.id, calendarCtx) : '',
        };
      });
      return { employee: emp, dailyData };
    });

    return { headers, rows };
  }, [data, employees, selectedMonth, viewType, calendarCtx]);

  const tabCls =
    'px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 ' +
    'data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all';

  return (
    <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl animate-scale-in w-full max-w-full">
      <CardHeader>
        <CardTitle>Monthly In-Out Report</CardTitle>
        <CardDescription>
          Daily clock-in and clock-out times. Holidays, weekends and overrides are colour-coded.
          ⚠ marks days with unexpected work (holiday / leave / non-working day).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs value={viewType} onValueChange={setViewType as any}>
          <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
            <TabsTrigger value="billable"     className={tabCls}>Billable</TabsTrigger>
            <TabsTrigger value="non_billable" className={tabCls}>Non-Billable</TabsTrigger>
          </TabsList>

          <div className="overflow-x-auto max-w-full mt-4" style={{ maxWidth: '85vw' }}>
            <TooltipProvider delayDuration={150}>
              <Table className="min-w-[1000px] w-full">
                <TableHeader>
                  {/* Row 1: day numbers */}
                  <TableRow>
                    <TableHead
                      rowSpan={2}
                      className="sticky left-0 bg-background z-10 min-w-[150px] align-middle"
                    >
                      Employee
                    </TableHead>
                    {headers.map((h) => (
                      <Tooltip key={h.dateKey}>
                        <TooltipTrigger asChild>
                          <TableHead
                            colSpan={2}
                            className={cn('text-center', dayHeaderBg(h.dayInfo?.status))}
                          >
                            {h.label}
                            {/* Small dot for holiday/exception */}
                            {h.dayInfo && h.dayInfo.status !== 'working' && h.dayInfo.status !== 'weekend' && (
                              <span className={cn(
                                'ml-0.5 inline-block w-1 h-1 rounded-full align-super',
                                h.dayInfo.status === 'holiday'              ? 'bg-orange-400' :
                                h.dayInfo.status === 'exception_nonworking' ? 'bg-rose-400'   :
                                'bg-teal-400'
                              )} />
                            )}
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
                  </TableRow>

                  {/* Row 2: In / Out sub-headers */}
                  <TableRow>
                    {headers.map((h, i) => (
                      <React.Fragment key={i}>
                        <TableHead className={cn('text-center text-[10px] font-medium', dayHeaderBg(h.dayInfo?.status))}>
                          In
                        </TableHead>
                        <TableHead className={cn('text-center text-[10px] font-medium', dayHeaderBg(h.dayInfo?.status))}>
                          Out
                        </TableHead>
                      </React.Fragment>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.length > 0 ? (
                    rows.map((row) => (
                      <TableRow key={row.employee.id} className="hover:bg-gray-50/60 transition-colors">
                        <TableCell className="sticky left-0 bg-white dark:bg-gray-950 z-10 font-medium">
                          {row.employee.name}
                        </TableCell>

                        {row.dailyData.map((d, i) => {
                          const status  = headers[i].dayInfo?.status;
                          const hasWork = !!(d.in || d.out);
                          const pairBg  = dayPairBg(status, hasWork);
                          const inTime  = formatTime(d.in);
                          const outTime = formatTime(d.out);

                          const cellContent = (isIn: boolean) => {
                            const t = isIn ? inTime : outTime;
                            if (d.anomaly) {
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex flex-col items-center gap-0.5 cursor-default">
                                      <span className={cn(t ? 'text-amber-700 font-medium' : 'text-gray-400')}>
                                        {t ?? 'N/A'}
                                      </span>
                                      {isIn && (
                                        <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
                                      )}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top"
                                    className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 shadow-xl px-3 py-2 text-xs max-w-[200px]">
                                    <div className="flex items-center gap-1.5">
                                      <AlertTriangle className="h-3 w-3" />
                                      {d.anomalyLabel}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            }
                            return (
                              <span className={cn(t ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400')}>
                                {t ?? 'N/A'}
                              </span>
                            );
                          };

                          return (
                            <React.Fragment key={i}>
                              <TableCell className={cn('text-center text-xs py-1.5', pairBg)}>
                                {cellContent(true)}
                              </TableCell>
                              <TableCell className={cn('text-center text-xs py-1.5', pairBg)}>
                                {cellContent(false)}
                              </TableCell>
                            </React.Fragment>
                          );
                        })}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={headers.length * 2 + 1} className="h-24 text-center text-gray-400">
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

export default MonthlyInOutReport;