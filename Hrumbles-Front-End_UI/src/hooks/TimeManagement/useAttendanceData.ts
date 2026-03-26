/**
 * useAttendanceData v4
 *
 * Key changes from v3:
 *  - Accepts organizationId parameter
 *  - Replaces hardcoded buildWeekendSet + DOW check with a single
 *    get_day_status_batch(org_id, start, end) RPC call that returns
 *    the correct status per date including:
 *      • alternate-Saturday / 2nd-4th patterns from weekend_config
 *      • official holidays (org-scoped)
 *      • working_day_exceptions (force-on / force-off)
 *  - dayStatus type expanded with 'exception_working' | 'exception_nonworking'
 *  - Removed manual holiday and weekend_config fetches — RPC handles them
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import {
  format, parseISO, eachDayOfInterval,
  isAfter, isToday, startOfMonth, endOfMonth,
} from 'date-fns';
import { toast } from 'sonner';

// ── Public types ──────────────────────────────────────────────────────────────

export interface DateRange {
  startDate: Date | null;
  endDate:   Date | null;
}

export interface BreakLogRecord {
  id:               string;
  time_log_id:      string;
  break_start_time: string;
  break_end_time:   string | null;
  duration_minutes: number | null;
  break_type:       string;
}

export type DayStatus =
  | 'present'
  | 'late'
  | 'on_leave'
  | 'absent'
  | 'weekend'
  | 'holiday'
  | 'exception_working'     // ← NEW: forced working day (overrides holiday/weekend)
  | 'exception_nonworking'  // ← NEW: forced non-working (overrides weekday)
  | 'future';

export interface AttendanceRecord {
  id:               string;
  date:             string;
  clock_in_time:    string | null;
  clock_out_time:   string | null;
  duration_minutes: number | null;
  status:           string;
  break_logs:       BreakLogRecord[];
  dayStatus:        DayStatus;
  leaveTypeName?:   string;
  leaveTypeColor?:  string;
  holidayName?:     string;
  exceptionNote?:   string;  // ← NEW: reason from working_day_exceptions
}

export interface AttendanceData {
  present:          number;
  absent:           number;
  late:             number;
  onLeave:          number;
  records:          AttendanceRecord[];
  totalHours:       number;
  totalWorkingDays: number;
  attendanceRate:   number;
  dailyHours:       Array<{ date: string; hours: number; fullDate: string }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const dsFmt = (d: Date) => format(d, 'yyyy-MM-dd');

export const resolveRange = (range: DateRange | null): { start: Date; end: Date } => {
  const now   = new Date();
  const start = range?.startDate ?? startOfMonth(now);
  const end   = range?.endDate   ?? endOfMonth(now);
  return start <= end ? { start, end } : { start: end, end: start };
};

// Which statuses count as "working" for attendance stats
const IS_WORKING_STATUS = new Set<string>([
  'working', 'exception_working',
]);

// Which DB statuses map to non-working attendance (not counted in totalWorkingDays)
const IS_NONWORKING_STATUS = new Set<string>([
  'weekend', 'holiday', 'exception_nonworking',
]);

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAttendanceData = (
  dateRange:      DateRange | null,
  employeeId:     string,
  organizationId: string,       // ← NEW param
) => {
  const { start, end } = resolveRange(dateRange);
  const startKey = dsFmt(start);
  const endKey   = dsFmt(end);

  const { data, isLoading, error, refetch } = useQuery<AttendanceData>({
    queryKey: ['attendance_data_v4', employeeId, organizationId, startKey, endKey],
    queryFn: async () => {
      if (!employeeId || !organizationId) return emptyData();

      const now = new Date();

      // ── 3 parallel fetches ─────────────────────────────────────────────────
      const [timeLogsRes, leavesRes, dayStatusRes] = await Promise.all([

        // 1. Time logs + break logs
        supabase
          .from('time_logs')
          .select(
            '*, break_logs(id, time_log_id, break_start_time, break_end_time, duration_minutes, break_type)'
          )
          .eq('employee_id', employeeId)
          .gte('date', startKey)
          .lte('date', endKey)
          .order('date', { ascending: false }),

        // 2. Approved leave requests overlapping the range
        supabase
          .from('leave_requests')
          .select('*, leave_type:leave_type_id(id, name, color)')
          .eq('employee_id', employeeId)
          .eq('status', 'approved')
          .or(`start_date.lte.${endKey},end_date.gte.${startKey}`),

        // 3. Org-aware day status for every date in range
        //    Returns: [ { day: "yyyy-MM-dd", status: "working"|"weekend"|"holiday"|... } ]
        //    Uses: weekend_config patterns + official_holidays + working_day_exceptions
        supabase.rpc('get_day_status_batch', {
          p_org_id:     organizationId,
          p_start_date: startKey,
          p_end_date:   endKey,
        }),
      ]);

      if (timeLogsRes.error) {
        toast.error('Failed to load attendance data');
        throw timeLogsRes.error;
      }

      const timeLogs    = timeLogsRes.data  ?? [];
      const leaveRows   = leavesRes.data    ?? [];
      const dayStatuses = dayStatusRes.data ?? [];

      // ── Build day-status map from RPC result ─────────────────────────────
      // { "2026-01-14": "holiday", "2026-01-11": "weekend", ... }
      const dayStatusMap = new Map<string, string>();
      (dayStatuses as Array<{ day: string; status: string }>).forEach((row) => {
        dayStatusMap.set(row.day, row.status);
      });

      // Also build holiday name and exception reason maps from the batch
      // The RPC only returns the status code. For names we still need the raw tables.
      // But we can do that in a single additional query for just holidays in range.
      const [holidayNamesRes, exceptionsRes] = await Promise.all([
        supabase
          .from('official_holidays')
          .select('holiday_date, holiday_name')
          .eq('organization_id', organizationId)
          .gte('holiday_date', startKey)
          .lte('holiday_date', endKey),

        supabase
          .from('working_day_exceptions')
          .select('exception_date, reason')
          .eq('organization_id', organizationId)
          .gte('exception_date', startKey)
          .lte('exception_date', endKey),
      ]);

      const holidayNameMap = new Map<string, string>();
      (holidayNamesRes.data ?? []).forEach((h: any) => {
        holidayNameMap.set(h.holiday_date, h.holiday_name);
      });

      const exceptionReasonMap = new Map<string, string>();
      (exceptionsRes.data ?? []).forEach((e: any) => {
        if (e.reason) exceptionReasonMap.set(e.exception_date, e.reason);
      });

      // ── Leave day map ─────────────────────────────────────────────────────
      const leaveDayMap = new Map<string, { name: string; color: string }>();
      leaveRows.forEach((req: any) => {
        let cur = parseISO(req.start_date);
        const reqEnd = parseISO(req.end_date);
        while (!isAfter(cur, reqEnd)) {
          const k = dsFmt(cur);
          if (k >= startKey && k <= endKey) {
            leaveDayMap.set(k, {
              name:  req.leave_type?.name  ?? 'Leave',
              color: req.leave_type?.color ?? '#6366f1',
            });
          }
          cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
        }
      });

      // ── Time-log dedup map (latest log per date) ──────────────────────────
      const logMap = new Map<string, any>();
      timeLogs.forEach((log: any) => {
        if (!logMap.has(log.date)) logMap.set(log.date, log);
      });

      // ── Walk every day in range ───────────────────────────────────────────
      const allDays = eachDayOfInterval({ start, end });

      let present = 0, absent = 0, late = 0, onLeave = 0,
          totalWorkingDays = 0, totalHours = 0;

      const dailyHours: AttendanceData['dailyHours'] = [];
      const records: AttendanceRecord[] = [];

      allDays.forEach((day) => {
        const key       = dsFmt(day);
        const orgStatus = dayStatusMap.get(key) ?? 'working'; // fallback: working
        const log       = logMap.get(key);
        const isFuture  = isAfter(day, now) && !isToday(day);

        // ── Resolve dayStatus ──────────────────────────────────────────────
        let dayStatus: DayStatus;

        if (isFuture) {
          dayStatus = 'future';
        } else if (orgStatus === 'exception_nonworking') {
          dayStatus = 'exception_nonworking';
        } else if (orgStatus === 'holiday') {
          dayStatus = 'holiday';
        } else if (orgStatus === 'weekend') {
          dayStatus = 'weekend';
        } else if (orgStatus === 'exception_working') {
          // Forced working day — still check if employee actually clocked in
          if (log) {
            dayStatus = log.status === 'grace_period' ? 'late' : 'present';
          } else if (leaveDayMap.has(key)) {
            dayStatus = 'on_leave';
          } else {
            dayStatus = 'absent';
          }
        } else {
          // Regular working day
          if (log) {
            dayStatus = log.status === 'grace_period' ? 'late' : 'present';
          } else if (leaveDayMap.has(key)) {
            dayStatus = 'on_leave';
          } else {
            dayStatus = 'absent';
          }
        }

        // ── Stats counters ─────────────────────────────────────────────────
        // Count stats only for elapsed working days
        // (working + exception_working; not weekend/holiday/exception_nonworking/future)
        const isCountableWorkingDay =
          !isFuture &&
          (orgStatus === 'working' || orgStatus === 'exception_working');

        if (isCountableWorkingDay) {
          totalWorkingDays++;
          if      (dayStatus === 'present')  { present++; }
          else if (dayStatus === 'late')     { present++; late++; }
          else if (dayStatus === 'on_leave') { onLeave++; }
          else if (dayStatus === 'absent')   { absent++; }
        }

        // ── Hours tracking ─────────────────────────────────────────────────
        if (log?.duration_minutes) {
          const hrs = log.duration_minutes / 60;
          totalHours += hrs;
          dailyHours.push({
            date:     format(day, 'dd MMM'),
            fullDate: key,
            hours:    Math.round(hrs * 10) / 10,
          });
        }

        records.push({
          id:               log?.id ?? key,
          date:             key,
          clock_in_time:    log?.clock_in_time    ?? null,
          clock_out_time:   log?.clock_out_time   ?? null,
          duration_minutes: log?.duration_minutes ?? null,
          status:           log?.status ?? '',
          break_logs:       Array.isArray(log?.break_logs) ? log.break_logs : [],
          dayStatus,
          leaveTypeName:  leaveDayMap.get(key)?.name,
          leaveTypeColor: leaveDayMap.get(key)?.color,
          holidayName:    holidayNameMap.get(key),
          exceptionNote:  exceptionReasonMap.get(key),
        });
      });

      records.sort((a, b) => b.date.localeCompare(a.date));

      return {
        present,
        absent,
        late,
        onLeave,
        records,
        totalHours:       Math.round(totalHours * 10) / 10,
        totalWorkingDays,
        attendanceRate:   totalWorkingDays > 0
          ? Math.round((present / totalWorkingDays) * 100)
          : 0,
        dailyHours,
      };
    },
    enabled:              !!employeeId && !!organizationId,
    staleTime:            5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    attendanceData: data ?? emptyData(),
    isLoading,
    error:   error ? (error as any).message : null,
    refetch,
  };
};

function emptyData(): AttendanceData {
  return {
    present: 0, absent: 0, late: 0, onLeave: 0,
    records: [], totalHours: 0, totalWorkingDays: 0,
    attendanceRate: 0, dailyHours: [],
  };
}