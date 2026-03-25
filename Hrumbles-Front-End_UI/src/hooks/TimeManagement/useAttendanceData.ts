import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import {
  format, parseISO, eachDayOfInterval,
  isAfter, isToday, startOfMonth, endOfMonth,
} from 'date-fns';
import { toast } from 'sonner';

// ── Matches the real EnhancedDateRangeSelector interface exactly ─────────────
export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface BreakLogRecord {
  id: string;
  time_log_id: string;
  break_start_time: string;
  break_end_time: string | null;
  duration_minutes: number | null;
  break_type: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  duration_minutes: number | null;
  status: string;
  break_logs: BreakLogRecord[];
  dayStatus: 'present' | 'late' | 'on_leave' | 'absent' | 'weekend' | 'holiday' | 'future';
  leaveTypeName?: string;
  leaveTypeColor?: string;
  holidayName?: string;
}

export interface AttendanceData {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  records: AttendanceRecord[];
  totalHours: number;
  totalWorkingDays: number;
  attendanceRate: number;
  dailyHours: Array<{ date: string; hours: number; fullDate: string }>;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const buildWeekendSet = (cfg: any[]): Set<number> => {
  const s = new Set<number>();
  cfg.forEach(c => { if (c.is_weekend) s.add(c.day_of_week); });
  if (s.size === 0) { s.add(0); s.add(6); }
  return s;
};

const dsFmt = (d: Date) => format(d, 'yyyy-MM-dd');

/** Resolve effective start/end: fall back to current month if range is null/incomplete */
export const resolveRange = (range: DateRange | null): { start: Date; end: Date } => {
  const now = new Date();
  const start = range?.startDate ?? startOfMonth(now);
  const end   = range?.endDate   ?? endOfMonth(now);
  // Swap if inverted (shouldn't happen with the picker, but safety net)
  return start <= end ? { start, end } : { start: end, end: start };
};

// ── hook ─────────────────────────────────────────────────────────────────────

export const useAttendanceData = (dateRange: DateRange | null, employeeId: string) => {
  const { start, end } = resolveRange(dateRange);
  const startKey = dsFmt(start);
  const endKey   = dsFmt(end);

  const { data, isLoading, error, refetch } = useQuery<AttendanceData>({
    queryKey: ['attendance_data_v3', employeeId, startKey, endKey],
    queryFn: async () => {
      if (!employeeId) return emptyData();

      const now = new Date();

      const [timeLogsRes, leavesRes, holidaysRes, weekendRes] = await Promise.all([
        supabase
          .from('time_logs')
          .select('*, break_logs(id, time_log_id, break_start_time, break_end_time, duration_minutes, break_type)')
          .eq('employee_id', employeeId)
          .gte('date', startKey)
          .lte('date', endKey)
          .order('date', { ascending: false }),

        supabase
          .from('leave_requests')
          .select('*, leave_type:leave_type_id(id, name, color)')
          .eq('employee_id', employeeId)
          .eq('status', 'approved')
          .or(`start_date.lte.${endKey},end_date.gte.${startKey}`),

        supabase
          .from('official_holidays')
          .select('holiday_date, holiday_name')
          .gte('holiday_date', startKey)
          .lte('holiday_date', endKey),

        supabase
          .from('weekend_config')
          .select('day_of_week, is_weekend'),
      ]);

      if (timeLogsRes.error) {
        toast.error('Failed to load attendance data');
        throw timeLogsRes.error;
      }

      const timeLogs    = timeLogsRes.data ?? [];
      const leaveRows   = leavesRes.data   ?? [];
      const holidayRows = holidaysRes.data ?? [];
      const weekendRows = weekendRes.data  ?? [];

      // ── lookups ────────────────────────────────────────────────────────────
      const weekendDows = buildWeekendSet(weekendRows);

      const holidayMap = new Map<string, string>();
      holidayRows.forEach(h => holidayMap.set(h.holiday_date, h.holiday_name));

      const leaveDayMap = new Map<string, { name: string; color: string }>();
      leaveRows.forEach(req => {
        let cur = parseISO(req.start_date);
        const reqEnd = parseISO(req.end_date);
        while (!isAfter(cur, reqEnd)) {
          const key = dsFmt(cur);
          if (key >= startKey && key <= endKey) {
            leaveDayMap.set(key, {
              name:  req.leave_type?.name  ?? 'Leave',
              color: req.leave_type?.color ?? '#6366f1',
            });
          }
          cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
        }
      });

      // Deduplicated log map — timeLogs ordered desc → first = latest
      const logMap = new Map<string, any>();
      timeLogs.forEach(log => { if (!logMap.has(log.date)) logMap.set(log.date, log); });

      // ── walk every day ─────────────────────────────────────────────────────
      const allDays = eachDayOfInterval({ start, end });

      let present = 0, absent = 0, late = 0, onLeave = 0,
          totalWorkingDays = 0, totalHours = 0;
      const dailyHours: AttendanceData['dailyHours'] = [];
      const records: AttendanceRecord[] = [];

      allDays.forEach(day => {
        const key      = dsFmt(day);
        const isWknd   = weekendDows.has(day.getDay());
        const isHol    = holidayMap.has(key);
        const isLeave  = leaveDayMap.has(key);
        const isFuture = isAfter(day, now) && !isToday(day);
        const log      = logMap.get(key);

        let dayStatus: AttendanceRecord['dayStatus'];
        if      (isWknd)    dayStatus = 'weekend';
        else if (isHol)     dayStatus = 'holiday';
        else if (isFuture)  dayStatus = 'future';
        else if (log)       dayStatus = log.status === 'grace_period' ? 'late' : 'present';
        else if (isLeave)   dayStatus = 'on_leave';
        else                dayStatus = 'absent';

        // Stats — only elapsed non-weekend non-holiday working days
        if (!isWknd && !isHol && !isFuture) {
          totalWorkingDays++;
          if      (dayStatus === 'present')  { present++; }
          else if (dayStatus === 'late')     { present++; late++; }
          else if (dayStatus === 'on_leave') { onLeave++; }
          else if (dayStatus === 'absent')   { absent++; }
        }

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
          holidayName:    holidayMap.get(key),
        });
      });

      records.sort((a, b) => b.date.localeCompare(a.date));

      return {
        present, absent, late, onLeave, records,
        totalHours:      Math.round(totalHours * 10) / 10,
        totalWorkingDays,
        attendanceRate:  totalWorkingDays > 0
          ? Math.round((present / totalWorkingDays) * 100) : 0,
        dailyHours,
      };
    },
    enabled:              !!employeeId,
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