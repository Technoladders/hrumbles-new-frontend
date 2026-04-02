import React, { useMemo } from "react";
import {
  format, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, eachMonthOfInterval,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/hooks/TimeManagement/useAttendanceData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AttendanceCalendarViewProps {
  records:   AttendanceRecord[];
  startDate: Date;
  endDate:   Date;
}

const STATUS_STYLES = {
  present:              { cell: 'bg-emerald-500 text-white hover:bg-emerald-600',                                     dot: 'bg-emerald-500', label: 'Present'           },
  late:                 { cell: 'bg-amber-400  text-white hover:bg-amber-500',                                        dot: 'bg-amber-400',   label: 'Late'              },
  on_leave:             { cell: 'bg-indigo-400 text-white hover:bg-indigo-500',                                       dot: 'bg-indigo-400',  label: 'On Leave'          },
  absent:               { cell: 'bg-red-400    text-white hover:bg-red-500',                                          dot: 'bg-red-400',     label: 'Absent'            },
  weekend:              { cell: 'bg-gray-100 dark:bg-gray-800 text-gray-400',                                         dot: 'bg-gray-300',    label: 'Weekend'           },
  holiday:              { cell: 'bg-orange-400 text-white hover:bg-orange-500',                                       dot: 'bg-orange-400',  label: 'Holiday'           },
  exception_working:    { cell: 'bg-teal-400   text-white hover:bg-teal-500',                                         dot: 'bg-teal-400',    label: 'Working (override)'},
  exception_nonworking: { cell: 'bg-rose-300   text-white hover:bg-rose-400 dark:bg-rose-900/60 dark:text-rose-300', dot: 'bg-rose-400',    label: 'Non-working'       },
  future:               { cell: 'bg-gray-50 dark:bg-gray-900 text-gray-300 border border-gray-100 dark:border-gray-800', dot: 'bg-gray-200', label: 'Upcoming'         },
} as const;

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const fmtTime = (t: string | null): string | null => {
  if (!t) return null;
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : format(d, 'hh:mm a');
};

// ── Single-month grid ─────────────────────────────────────────────────────────
interface MonthGridProps {
  monthStart: Date;
  recordMap:  Map<string, AttendanceRecord>;
  rangeStart: string;
  rangeEnd:   string;
}

const MonthGrid: React.FC<MonthGridProps> = ({ monthStart, recordMap, rangeStart, rangeEnd }) => {
  const monthEnd      = endOfMonth(monthStart);
  const allDays       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = getDay(monthStart);

  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
        {format(monthStart, 'MMMM yyyy')}
      </p>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 py-0.5">
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }, (_, i) => <div key={`b${i}`} />)}

        {allDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');

          if (key < rangeStart || key > rangeEnd) {
            return (
              <div
                key={key}
                className="aspect-square rounded-md flex items-center justify-center text-[11px] font-medium text-gray-200 dark:text-gray-700 bg-gray-50 dark:bg-gray-900/30"
              >
                {format(day, 'd')}
              </div>
            );
          }

          const rec    = recordMap.get(key);
          const status = rec?.dayStatus ?? 'future';
          const style  = STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.future;

          const clockIn    = fmtTime(rec?.clock_in_time  ?? null);
          const clockOut   = fmtTime(rec?.clock_out_time ?? null);
          const breakTotal = rec?.break_logs?.reduce((s, b) => s + (b.duration_minutes ?? 0), 0) ?? 0;

          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "aspect-square rounded-md flex items-center justify-center text-[11px] font-semibold cursor-default select-none transition-all",
                    style.cell
                  )}
                >
                  {format(day, 'd')}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-3 text-xs min-w-[160px]"
              >
                <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1.5">
                  {format(day, 'EEE, dd MMM')}
                </p>

                {/* Status badge */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={cn("h-2 w-2 rounded-full", style.dot)} />
                  <span className="text-gray-600 dark:text-gray-300">
                    {status === 'on_leave'             && rec?.leaveTypeName  ? rec.leaveTypeName  :
                     status === 'holiday'               && rec?.holidayName   ? rec.holidayName    :
                     status === 'exception_nonworking'  && rec?.exceptionNote ? rec.exceptionNote  :
                     status === 'exception_working'     && rec?.exceptionNote ? `Working: ${rec.exceptionNote}` :
                     style.label}
                  </span>
                </div>

                {/* Clock in/out */}
                {clockIn && (
                  <div className="space-y-0.5 text-gray-500 dark:text-gray-400">
                    <div className="flex justify-between gap-4">
                      <span>In</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">{clockIn}</span>
                    </div>
                    {clockOut && (
                      <div className="flex justify-between gap-4">
                        <span>Out</span>
                        <span className="font-medium text-gray-700 dark:text-gray-200">{clockOut}</span>
                      </div>
                    )}
                    {rec?.duration_minutes && (
                      <div className="flex justify-between gap-4">
                        <span>Work</span>
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          {Math.floor(rec.duration_minutes / 60)}h {rec.duration_minutes % 60}m
                        </span>
                      </div>
                    )}
                    {breakTotal > 0 && (
                      <div className="flex justify-between gap-4">
                        <span>Break</span>
                        <span className="font-medium text-amber-600">
                          {breakTotal >= 60
                            ? `${Math.floor(breakTotal / 60)}h ${breakTotal % 60}m`
                            : `${breakTotal}m`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const AttendanceCalendarView: React.FC<AttendanceCalendarViewProps> = ({
  records, startDate, endDate,
}) => {
  const recordMap = useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    records.forEach((r) => m.set(r.date, r));
    return m;
  }, [records]);

  const months = useMemo(
    () => eachMonthOfInterval({ start: startOfMonth(startDate), end: endOfMonth(endDate) }),
    [startDate, endDate]
  );

  const rangeStart = format(startDate, 'yyyy-MM-dd');
  const rangeEnd   = format(endDate,   'yyyy-MM-dd');

  const counts = useMemo(() => {
    const c: Partial<Record<string, number>> = {};
    records.forEach((r) => { c[r.dayStatus] = (c[r.dayStatus] ?? 0) + 1; });
    return c;
  }, [records]);

  // Legend items — skip 'future' and zero-count exception statuses
  const legendItems = (
    Object.entries(STATUS_STYLES) as [keyof typeof STATUS_STYLES, typeof STATUS_STYLES[keyof typeof STATUS_STYLES]][]
  ).filter(([k]) => {
    if (k === 'future') return false;
    // Only show exception statuses if they actually appear
    if (k === 'exception_working'    && !counts[k]) return false;
    if (k === 'exception_nonworking' && !counts[k]) return false;
    return true;
  });

  return (
    <TooltipProvider delayDuration={100}>
      <Card className="shadow-sm border-gray-100 dark:border-gray-800">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Calendar View
              </CardTitle>
              <CardDescription className="text-xs">Hover any day for details</CardDescription>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
              {legendItems.map(([key, s]) => (
                <span key={key} className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <span className={cn("h-2.5 w-2.5 rounded-sm flex-shrink-0", s.dot)} />
                  {s.label}
                  {counts[key] !== undefined && (
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{counts[key]}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className={cn(
            "gap-8",
            months.length === 1 ? "block" : "grid sm:grid-cols-2 lg:grid-cols-3"
          )}>
            {months.map((ms) => (
              <MonthGrid
                key={format(ms, 'yyyy-MM')}
                monthStart={ms}
                recordMap={recordMap}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};