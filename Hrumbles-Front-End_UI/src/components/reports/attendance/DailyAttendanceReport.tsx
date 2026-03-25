import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TimeLog } from './AttendanceReportsPage';
import { format, isValid, differenceInMinutes, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Coffee, UtensilsCrossed, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Always derive duration from timestamps, never trust stored duration_minutes ──
const calcDuration = (clockIn: string | null, clockOut: string | null): number | null => {
  if (!clockIn || !clockOut) return null;
  try {
    const mins = differenceInMinutes(parseISO(clockOut), parseISO(clockIn));
    return mins > 0 ? mins : null;
  } catch {
    return null;
  }
};

// ── Also compute break duration from its own timestamps when available ─────────
const calcBreakDuration = (start: string | null, end: string | null, stored: number | null): number | null => {
  if (start && end) {
    try {
      const mins = differenceInMinutes(parseISO(end), parseISO(start));
      if (mins > 0) return mins;
    } catch { /* fall through */ }
  }
  return stored ?? null;
};

interface DailyAttendanceReportProps {
  data: TimeLog[];
}

const BREAK_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  coffee: {
    label: 'Coffee',
    icon: <Coffee className="h-3 w-3" />,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  lunch: {
    label: 'Lunch',
    icon: <UtensilsCrossed className="h-3 w-3" />,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
};

const getBreakConfig = (type: string) =>
  BREAK_TYPE_CONFIG[type.toLowerCase()] ?? {
    label: type.charAt(0).toUpperCase() + type.slice(1),
    icon: <Clock className="h-3 w-3" />,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  };

const DailyAttendanceReport: React.FC<DailyAttendanceReportProps> = ({ data }) => {
  const [viewType, setViewType] = useState<'billable' | 'non_billable'>('non_billable');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const processedData = useMemo(
    () => data.filter((log) => (viewType === 'billable' ? log.is_billable : !log.is_billable)),
    [data, viewType]
  );

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return 'N/A';
    const date = new Date(timeStr);
    return isValid(date) ? format(date, 'p') : 'Invalid';
  };

  const formatDuration = (minutes: number | null | undefined) => {
    if (minutes === null || minutes === undefined || isNaN(minutes) || minutes < 0)
      return '00h:00m:00s';
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    const s = Math.round((minutes * 60) % 60);
    return `${String(h).padStart(2, '0')}h:${String(m).padStart(2, '0')}m:${String(s).padStart(2, '0')}s`;
  };

  const formatShortDuration = (minutes: number | null | undefined) => {
    if (!minutes || minutes <= 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl animate-scale-in">
      <CardContent className="p-0">
        <Tabs value={viewType} onValueChange={setViewType as any}>
          <div className="px-4 pt-4 pb-2">
            <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
              <TabsTrigger
                value="billable"
                className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
              >
                Billable
              </TabsTrigger>
              <TabsTrigger
                value="non_billable"
                className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
              >
                Non-Billable
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-900/40">
                  {/* expand toggle column */}
                  <TableHead className="w-8" />
                  <TableHead className="sticky left-0 bg-gray-50 dark:bg-gray-900/40 z-10 min-w-[160px]">
                    Employee
                  </TableHead>
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
                    const hasBreaks = log.break_logs && log.break_logs.length > 0;

                    // Compute duration from timestamps — ignore stored duration_minutes
                    const computedDuration = calcDuration(log.clock_in_time, log.clock_out_time);

                    // Aggregate break data — prefer timestamp-derived break durations
                    const totalBreakMins = log.break_logs.reduce(
                      (sum, b) => sum + (calcBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes) ?? 0),
                      0
                    );
                    const netMins = (computedDuration ?? 0) - totalBreakMins;

                    // Group breaks by type for summary badges
                    const breaksByType = log.break_logs.reduce<Record<string, number>>(
                      (acc, b) => {
                        const t = b.break_type.toLowerCase();
                        acc[t] = (acc[t] ?? 0) + (calcBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes) ?? 0);
                        return acc;
                      },
                      {}
                    );

                    return (
                      <React.Fragment key={log.id}>
                        {/* Main row */}
                        <TableRow
                          className={cn(
                            'transition-colors',
                            isExpanded && 'bg-violet-50/60 dark:bg-violet-900/10',
                            hasBreaks && 'cursor-pointer hover:bg-gray-50'
                          )}
                          onClick={() => hasBreaks && toggleRow(log.id)}
                        >
                          {/* expand icon */}
                          <TableCell className="w-8 pr-0">
                            {hasBreaks ? (
                              <span className="flex items-center justify-center text-gray-400">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-violet-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </span>
                            ) : null}
                          </TableCell>

                          <TableCell className="sticky left-0 bg-white z-10 font-medium">
                            {log.employee_name}
                          </TableCell>
                          <TableCell>{formatTime(log.clock_in_time)}</TableCell>
                          <TableCell>{formatTime(log.clock_out_time)}</TableCell>
                          <TableCell>{formatDuration(computedDuration)}</TableCell>

                          {/* Break Time cell — shows type badges */}
                          <TableCell>
                            {hasBreaks ? (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(breaksByType).map(([type, mins]) => {
                                  const cfg = getBreakConfig(type);
                                  return (
                                    <span
                                      key={type}
                                      className={cn(
                                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                                        cfg.color
                                      )}
                                    >
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

                          {/* Net Time */}
                          <TableCell>
                            <span
                              className={cn(
                                'font-medium',
                                netMins < 0 ? 'text-red-500' : 'text-emerald-600'
                              )}
                            >
                              {computedDuration !== null
                                ? formatDuration(Math.max(0, netMins))
                                : '—'}
                            </span>
                          </TableCell>
                        </TableRow>

                        {/* Expanded break detail rows */}
                        {isExpanded && hasBreaks && (
                          <TableRow className="bg-violet-50/40 dark:bg-violet-900/5 hover:bg-violet-50/40">
                            <TableCell colSpan={7} className="py-0 px-6">
                              <div className="py-3">
                                <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">
                                  Break Details
                                </p>
                                <div className="rounded-lg border border-violet-100 dark:border-violet-900/30 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-violet-100/60 dark:bg-violet-900/20 text-left">
                                        <th className="px-3 py-2 font-medium text-violet-700 dark:text-violet-300">
                                          Type
                                        </th>
                                        <th className="px-3 py-2 font-medium text-violet-700 dark:text-violet-300">
                                          Start
                                        </th>
                                        <th className="px-3 py-2 font-medium text-violet-700 dark:text-violet-300">
                                          End
                                        </th>
                                        <th className="px-3 py-2 font-medium text-violet-700 dark:text-violet-300">
                                          Duration
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {log.break_logs.map((b, idx) => {
                                        const cfg = getBreakConfig(b.break_type);
                                        return (
                                          <tr
                                            key={b.id}
                                            className={cn(
                                              'border-t border-violet-100/60 dark:border-violet-900/20',
                                              idx % 2 === 0 ? 'bg-white' : 'bg-violet-50/30'
                                            )}
                                          >
                                            <td className="px-3 py-2">
                                              <span
                                                className={cn(
                                                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                                                  cfg.color
                                                )}
                                              >
                                                {cfg.icon}
                                                {cfg.label}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">
                                              {formatTime(b.break_start_time)}
                                            </td>
                                            <td className="px-3 py-2 text-gray-600">
                                              {formatTime(b.break_end_time)}
                                            </td>
                                            <td className="px-3 py-2 font-medium text-gray-700">
                                              {formatShortDuration(calcBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes))}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {/* Total row */}
                                      <tr className="border-t-2 border-violet-200 bg-violet-100/40 font-semibold">
                                        <td className="px-3 py-2 text-violet-700" colSpan={3}>
                                          Total Break Time
                                        </td>
                                        <td className="px-3 py-2 text-violet-700">
                                          {formatShortDuration(totalBreakMins)}
                                        </td>
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
                    <TableCell colSpan={7} className="h-24 text-center text-gray-400">
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DailyAttendanceReport;