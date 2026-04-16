import React, { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TimeLog, CalendarContext, EMPTY_CALENDAR_CTX,
  isWorkedAnomaly, anomalyLabel,
} from './AttendanceReportsPage';
import { format, isValid, differenceInMinutes, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronDown, ChevronRight, Coffee, UtensilsCrossed,
  Clock, AlertTriangle, Sun, CalendarOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Duration helpers ──────────────────────────────────────────────────────────
const calcDuration = (clockIn: string | null, clockOut: string | null): number | null => {
  if (!clockIn || !clockOut) return null;
  try { const m = differenceInMinutes(parseISO(clockOut), parseISO(clockIn)); return m > 0 ? m : null; }
  catch { return null; }
};

const calcBreakDuration = (s: string | null, e: string | null, stored: number | null): number | null => {
  if (s && e) { try { const m = differenceInMinutes(parseISO(e), parseISO(s)); if (m > 0) return m; } catch {} }
  return stored ?? null;
};

const formatTime = (t: string | null) => {
  if (!t) return 'N/A';
  const d = new Date(t);
  return isValid(d) ? format(d, 'p') : 'Invalid';
};

const formatDuration = (mins: number | null | undefined) => {
  if (mins === null || mins === undefined || isNaN(mins) || mins < 0) return '00h:00m:00s';
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  const s = Math.round((mins * 60) % 60);
  return `${String(h).padStart(2, '0')}h:${String(m).padStart(2, '0')}m:${String(s).padStart(2, '0')}s`;
};

const formatShortDuration = (mins: number | null | undefined) => {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ── Break config ──────────────────────────────────────────────────────────────
const BREAK_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  coffee: { label: 'Coffee', icon: <Coffee className="h-3 w-3" />,         color: 'bg-amber-100 text-amber-700 border-amber-200'  },
  lunch:  { label: 'Lunch',  icon: <UtensilsCrossed className="h-3 w-3" />, color: 'bg-orange-100 text-orange-700 border-orange-200' },
};
const getBreakConfig = (type: string) =>
  BREAK_TYPE_CONFIG[type.toLowerCase()] ?? {
    label: type.charAt(0).toUpperCase() + type.slice(1),
    icon:  <Clock className="h-3 w-3" />,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  };

// ── Day status pill ───────────────────────────────────────────────────────────
function DayStatusPill({
  date, employeeId, ctx,
}: { date: string; employeeId: string; ctx: CalendarContext }) {
  const dayInfo   = ctx.dayInfoMap.get(date);
  const leaveInfo = ctx.employeeLeaveMap.get(employeeId)?.get(date);

  if (leaveInfo) {
    return (
      <Badge className="text-[10px] px-1.5 py-0 font-medium border"
        style={{ background: `${leaveInfo.leaveTypeColor}20`, borderColor: leaveInfo.leaveTypeColor, color: leaveInfo.leaveTypeColor }}>
        {leaveInfo.leaveTypeName}
      </Badge>
    );
  }

  if (!dayInfo || dayInfo.status === 'working') return null;

  const cfg = {
    holiday:              { label: dayInfo.holidayName ?? 'Holiday',      cls: 'bg-orange-100 text-orange-700 border-orange-200'   },
    weekend:              { label: 'Weekend',                              cls: 'bg-slate-100 text-slate-600 border-slate-200'      },
    exception_working:    { label: dayInfo.exceptionReason ?? 'Working',  cls: 'bg-teal-100 text-teal-700 border-teal-200'         },
    exception_nonworking: { label: dayInfo.exceptionReason ?? 'Day off',  cls: 'bg-rose-100 text-rose-700 border-rose-200'         },
  }[dayInfo.status];

  if (!cfg) return null;
  return (
    <Badge className={cn('text-[10px] px-1.5 py-0 font-medium border', cfg.cls)}>
      {cfg.label}
    </Badge>
  );
}

// ── Anomaly badge ─────────────────────────────────────────────────────────────
function AnomalyBadge({
  date, employeeId, hasWork, ctx,
}: { date: string; employeeId: string; hasWork: boolean; ctx: CalendarContext }) {
  if (!isWorkedAnomaly(date, employeeId, hasWork, ctx)) return null;
  const label = anomalyLabel(date, employeeId, ctx);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 text-amber-700 px-2 py-0.5 text-[10px] font-semibold cursor-default">
          <AlertTriangle className="h-3 w-3" />
          Anomaly
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 max-w-[200px]">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface DailyAttendanceReportProps {
  data:        TimeLog[];
  calendarCtx: CalendarContext;
}

// ── Component ─────────────────────────────────────────────────────────────────
const DailyAttendanceReport: React.FC<DailyAttendanceReportProps> = ({
  data,
  calendarCtx = EMPTY_CALENDAR_CTX,
}) => {
  const [viewType,     setViewType]     = useState<'billable' | 'non_billable'>('non_billable');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const processedData = useMemo(
    () => data.filter((log) => (viewType === 'billable' ? log.is_billable : !log.is_billable)),
    [data, viewType]
  );

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl animate-scale-in">
      <CardContent className="p-0">
        <TooltipProvider delayDuration={150}>
          <Tabs value={viewType} onValueChange={setViewType as any}>
            <div className="px-4 pt-4 pb-2">
              <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
                <TabsTrigger value="billable"
                  className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                  Billable
                </TabsTrigger>
                <TabsTrigger value="non_billable"
                  className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                  Non-Billable
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900/40">
                    <TableHead className="w-8" />
                    <TableHead className="sticky left-0 bg-gray-50 dark:bg-gray-900/40 z-10 min-w-[160px]">
                      Employee
                    </TableHead>
                    {/* NEW: Day status column */}
                    <TableHead className="min-w-[130px]">Day</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead>Working Time</TableHead>
                    <TableHead>Break Time</TableHead>
                    <TableHead>Net Time</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {processedData.length > 0 ? (
                    processedData.map((log) => {
                      const isExpanded = expandedRows.has(log.id);
                      const hasBreaks  = log.break_logs && log.break_logs.length > 0;

                      const computedDuration = calcDuration(log.clock_in_time, log.clock_out_time);
                      const totalBreakMins   = log.break_logs.reduce(
                        (s, b) => s + (calcBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes) ?? 0),
                        0
                      );
                      const netMins        = (computedDuration ?? 0) - totalBreakMins;
                      const breaksByType   = log.break_logs.reduce<Record<string, number>>((acc, b) => {
                        const t = b.break_type.toLowerCase();
                        acc[t] = (acc[t] ?? 0) + (calcBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes) ?? 0);
                        return acc;
                      }, {});

                      const dayInfo   = calendarCtx.dayInfoMap.get(log.date);
                      const hasAnomaly = isWorkedAnomaly(log.date, log.employee_id, !!computedDuration, calendarCtx);

                      // Row tint for non-working days
                      const rowTint =
                        dayInfo?.status === 'holiday'              ? 'bg-orange-50/40 dark:bg-orange-950/10' :
                        dayInfo?.status === 'weekend'              ? 'bg-slate-50/60 dark:bg-slate-900/20'   :
                        dayInfo?.status === 'exception_nonworking' ? 'bg-rose-50/30 dark:bg-rose-950/10'     :
                        dayInfo?.status === 'exception_working'    ? 'bg-teal-50/30 dark:bg-teal-950/10'     :
                        '';

                      return (
                        <React.Fragment key={log.id}>
                          <TableRow
                            className={cn(
                              'transition-colors',
                              rowTint,
                              isExpanded && 'bg-violet-50/60 dark:bg-violet-900/10',
                              hasBreaks && 'cursor-pointer hover:bg-gray-50'
                            )}
                            onClick={() => hasBreaks && toggleRow(log.id)}
                          >
                            {/* Expand toggle */}
                            <TableCell className="w-8 pr-0">
                              {hasBreaks ? (
                                <span className="flex items-center justify-center text-gray-400">
                                  {isExpanded
                                    ? <ChevronDown className="h-4 w-4 text-violet-500" />
                                    : <ChevronRight className="h-4 w-4" />}
                                </span>
                              ) : null}
                            </TableCell>

                            <TableCell className="sticky left-0 bg-white dark:bg-gray-950 z-10 font-medium">
                              {log.employee_name}
                            </TableCell>

                            {/* Day status + anomaly */}
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <DayStatusPill
                                  date={log.date} employeeId={log.employee_id}
                                  ctx={calendarCtx}
                                />
                                <AnomalyBadge
                                  date={log.date} employeeId={log.employee_id}
                                  hasWork={!!computedDuration} ctx={calendarCtx}
                                />
                              </div>
                            </TableCell>

                            <TableCell>{formatTime(log.clock_in_time)}</TableCell>
                            <TableCell>{formatTime(log.clock_out_time)}</TableCell>
                            <TableCell>
  <span className={cn('font-medium', netMins < 0 ? 'text-red-500' : 'text-emerald-600')}>
    {computedDuration !== null ? formatDuration(Math.max(0, netMins)) : '—'}
  </span>
</TableCell>

                            <TableCell>
                              {hasBreaks ? (
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(breaksByType).map(([type, mins]) => {
                                    const cfg = getBreakConfig(type);
                                    return (
                                      <span key={type} className={cn(
                                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                                        cfg.color
                                      )}>
                                        {cfg.icon}
                                        {cfg.label}: {formatShortDuration(mins)}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </TableCell>

<TableCell>{formatDuration(computedDuration)}</TableCell>
                          </TableRow>

                          {/* Expanded break detail */}
                          {isExpanded && hasBreaks && (
                            <TableRow className="bg-violet-50/40 dark:bg-violet-900/5 hover:bg-violet-50/40">
                              <TableCell colSpan={8} className="py-0 px-6">
                                <div className="py-3">
                                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">
                                    Break Details
                                  </p>
                                  <div className="rounded-lg border border-violet-100 dark:border-violet-900/30 overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="bg-violet-100/60 dark:bg-violet-900/20 text-left">
                                          {['Type', 'Start', 'End', 'Duration'].map((h) => (
                                            <th key={h} className="px-3 py-2 font-medium text-violet-700 dark:text-violet-300">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {log.break_logs.map((b, idx) => {
                                          const cfg = getBreakConfig(b.break_type);
                                          return (
                                            <tr key={b.id} className={cn(
                                              'border-t border-violet-100/60 dark:border-violet-900/20',
                                              idx % 2 === 0 ? 'bg-white' : 'bg-violet-50/30'
                                            )}>
                                              <td className="px-3 py-2">
                                                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', cfg.color)}>
                                                  {cfg.icon}{cfg.label}
                                                </span>
                                              </td>
                                              <td className="px-3 py-2 text-gray-600">{formatTime(b.break_start_time)}</td>
                                              <td className="px-3 py-2 text-gray-600">{formatTime(b.break_end_time)}</td>
                                              <td className="px-3 py-2 font-medium text-gray-700">
                                                {formatShortDuration(calcBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes))}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                        <tr className="border-t-2 border-violet-200 bg-violet-100/40 font-semibold">
                                          <td className="px-3 py-2 text-violet-700" colSpan={3}>Total Break Time</td>
                                          <td className="px-3 py-2 text-violet-700">{formatShortDuration(totalBreakMins)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-gray-400">
                        No records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Tabs>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default DailyAttendanceReport;