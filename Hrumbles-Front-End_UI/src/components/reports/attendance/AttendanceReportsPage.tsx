import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  startOfMonth, endOfMonth, format,
  differenceInMinutes, parseISO, eachDayOfInterval,
} from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import DailyAttendanceReport from './DailyAttendanceReport';
import MonthlyAttendanceReport from './MonthlyAttendanceReport';
import MonthlyInOutReport from './MonthlyInOutReport';
import MonthlyBreakReport from './MonthlyBreakReport';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ─────────────────────────────────────────────────────────────────────────────
// Shared data types
// ─────────────────────────────────────────────────────────────────────────────

export interface BreakLog {
  id: string;
  time_log_id: string;
  break_start_time: string;
  break_end_time: string | null;
  duration_minutes: number | null;
  break_type: string;
}

export interface TimeLog {
  id: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  duration_minutes: number | null;
  employee_id: string;
  employee_name: string;
  is_billable: boolean;
  break_logs: BreakLog[];
}

export interface Employee {
  id: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar context — shared across all child reports
// ─────────────────────────────────────────────────────────────────────────────

export type OrgDayStatus =
  | 'working'
  | 'weekend'
  | 'holiday'
  | 'exception_working'
  | 'exception_nonworking';

/** Organisation-level metadata for one date */
export interface DayInfo {
  status:           OrgDayStatus;
  holidayName?:     string;   // present when status === 'holiday'
  exceptionReason?: string;   // present when status === 'exception_*'
}

/** Leave info for a specific employee on a specific date */
export interface EmployeeLeaveInfo {
  leaveTypeName:  string;
  leaveTypeColor: string;
}

/**
 * CalendarContext — fetched once in the page, passed down to every child.
 *
 * dayInfoMap       : "yyyy-MM-dd" → DayInfo           (org-level)
 * employeeLeaveMap : employeeId  → Map<"yyyy-MM-dd", EmployeeLeaveInfo>
 */
export interface CalendarContext {
  dayInfoMap:       Map<string, DayInfo>;
  employeeLeaveMap: Map<string, Map<string, EmployeeLeaveInfo>>;
}

export const EMPTY_CALENDAR_CTX: CalendarContext = {
  dayInfoMap:       new Map(),
  employeeLeaveMap: new Map(),
};

/** True when an employee worked on a day they should not have */
export function isWorkedAnomaly(
  date: string,
  employeeId: string,
  hasTimeLogged: boolean,
  ctx: CalendarContext,
): boolean {
  if (!hasTimeLogged) return false;
  const info  = ctx.dayInfoMap.get(date);
  const leave = ctx.employeeLeaveMap.get(employeeId)?.get(date);
  if (!info) return false;
  return (
    info.status === 'holiday' ||
    info.status === 'weekend' ||
    info.status === 'exception_nonworking' ||
    !!leave
  );
}

/** Short label for an anomaly (used in tooltips / badges) */
export function anomalyLabel(
  date: string,
  employeeId: string,
  ctx: CalendarContext,
): string {
  const info  = ctx.dayInfoMap.get(date);
  const leave = ctx.employeeLeaveMap.get(employeeId)?.get(date);
  if (leave)                               return `On leave (${leave.leaveTypeName})`;
  if (!info)                               return '';
  if (info.status === 'holiday')           return `Holiday${info.holidayName ? `: ${info.holidayName}` : ''}`;
  if (info.status === 'weekend')           return 'Worked on weekend';
  if (info.status === 'exception_nonworking')
    return `Non-working day${info.exceptionReason ? `: ${info.exceptionReason}` : ''}`;
  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const AttendanceReportsPage: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const [activeTab,   setActiveTab]   = useState('daily');
  const [timeLogs,    setTimeLogs]    = useState<TimeLog[]>([]);
  const [employees,   setEmployees]   = useState<Employee[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [calendarCtx, setCalendarCtx] = useState<CalendarContext>(EMPTY_CALENDAR_CTX);

  const [selectedDate,      setSelectedDate]      = useState(new Date());
  const [selectedMonth,     setSelectedMonth]     = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // ── Employee list ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from('hr_employees')
      .select('id, first_name, last_name')
      .eq('organization_id', organizationId)
      .order('first_name')
      .then(({ data, error }) => {
        if (error) { setError('Failed to fetch employee list.'); return; }
        setEmployees(
          (data ?? []).map((e: any) => ({ id: e.id, name: `${e.first_name} ${e.last_name}` }))
        );
      });
  }, [organizationId]);

  // ── Time logs + calendar context ─────────────────────────────────────────
  useEffect(() => {
    if (!organizationId) return;

    let startDate: Date, endDate: Date;
    if (activeTab === 'daily') {
      startDate = endDate = selectedDate;
    } else {
      const [year, month] = selectedMonth.split('-').map(Number);
      startDate = startOfMonth(new Date(year, month - 1));
      endDate   = endOfMonth(startDate);
    }

    const startKey = format(startDate, 'yyyy-MM-dd');
    const endKey   = format(endDate,   'yyyy-MM-dd');

    setIsLoading(true);
    setError(null);

    Promise.all([
      // 1. Time logs + breaks
      supabase
        .from('time_logs')
        .select(`
          *,
          hr_employees!time_logs_employee_id_fkey(first_name, last_name),
          break_logs(id, time_log_id, break_start_time, break_end_time, duration_minutes, break_type)
        `)
        .eq('organization_id', organizationId)
        .gte('date', startKey)
        .lte('date', endKey)
        .order('date', { ascending: false }),

      // 2. Org-aware day status for every date in range
      //    (weekend config patterns + official holidays + exceptions)
      supabase.rpc('get_day_status_batch', {
        p_org_id:     organizationId,
        p_start_date: startKey,
        p_end_date:   endKey,
      }),

      // 3. Holiday names for display
      supabase
        .from('official_holidays')
        .select('holiday_date, holiday_name')
        .eq('organization_id', organizationId)
        .gte('holiday_date', startKey)
        .lte('holiday_date', endKey),

      // 4. Exception reasons for display
      supabase
        .from('working_day_exceptions')
        .select('exception_date, reason')
        .eq('organization_id', organizationId)
        .gte('exception_date', startKey)
        .lte('exception_date', endKey),

      // 5. Approved leave requests overlapping range (all employees)
      supabase
        .from('leave_requests')
        .select('employee_id, start_date, end_date, leave_type:leave_type_id(name, color)')
        .eq('organization_id', organizationId)
        .eq('status', 'approved')
        .or(`start_date.lte.${endKey},end_date.gte.${startKey}`),
    ])
      .then(([logsRes, statusRes, holidaysRes, exceptionsRes, leaveRes]) => {
        if (logsRes.error) throw logsRes.error;

        // ── Format time logs ────────────────────────────────────────────────
        const formatted: TimeLog[] = (logsRes.data ?? []).map((log: any) => ({
          id:               log.id,
          date:             log.date,
          clock_in_time:    log.clock_in_time,
          clock_out_time:   log.clock_out_time,
          duration_minutes: log.duration_minutes,
          employee_id:      log.employee_id,
          employee_name:    log.hr_employees
            ? `${log.hr_employees.first_name} ${log.hr_employees.last_name}`
            : 'Unknown',
          is_billable: !!(
            log.project_time_data?.projects &&
            Array.isArray(log.project_time_data.projects) &&
            log.project_time_data.projects.length > 0
          ),
          break_logs: Array.isArray(log.break_logs) ? log.break_logs : [],
        }));
        setTimeLogs(formatted);

        // ── Build dayInfoMap ────────────────────────────────────────────────
        const holidayNameMap = new Map<string, string>();
        (holidaysRes.data ?? []).forEach((h: any) =>
          holidayNameMap.set(h.holiday_date, h.holiday_name)
        );

        const exceptionReasonMap = new Map<string, string>();
        (exceptionsRes.data ?? []).forEach((e: any) => {
          if (e.reason) exceptionReasonMap.set(e.exception_date, e.reason);
        });

        const dayInfoMap = new Map<string, DayInfo>();
        (statusRes.data ?? []).forEach((row: any) => {
          dayInfoMap.set(row.day, {
            status:          row.status as OrgDayStatus,
            holidayName:     holidayNameMap.get(row.day),
            exceptionReason: exceptionReasonMap.get(row.day),
          });
        });

        // ── Build employeeLeaveMap ──────────────────────────────────────────
        const employeeLeaveMap = new Map<string, Map<string, EmployeeLeaveInfo>>();
        (leaveRes.data ?? []).forEach((req: any) => {
          const empId = req.employee_id;
          eachDayOfInterval({
            start: parseISO(req.start_date),
            end:   parseISO(req.end_date),
          }).forEach((day) => {
            const dk = format(day, 'yyyy-MM-dd');
            if (dk < startKey || dk > endKey) return;
            if (!employeeLeaveMap.has(empId)) employeeLeaveMap.set(empId, new Map());
            employeeLeaveMap.get(empId)!.set(dk, {
              leaveTypeName:  req.leave_type?.name  ?? 'Leave',
              leaveTypeColor: req.leave_type?.color ?? '#6366f1',
            });
          });
        });

        setCalendarCtx({ dayInfoMap, employeeLeaveMap });
      })
      .catch((err: any) =>
        setError(err.message || 'An error occurred fetching attendance data.')
      )
      .finally(() => setIsLoading(false));

  }, [organizationId, activeTab, selectedDate, selectedMonth]);

  // ── Filter ───────────────────────────────────────────────────────────────
  const filteredLogs = useMemo(() =>
    selectedEmployees.length > 0
      ? timeLogs.filter((l) => selectedEmployees.includes(l.employee_id))
      : timeLogs,
    [timeLogs, selectedEmployees]
  );

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), i, 1);
    return {
      value: `${d.getFullYear()}-${String(i + 1).padStart(2, '0')}`,
      label: format(d, 'MMMM yyyy'),
    };
  });

  const resolvedMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }, [selectedMonth]);

  // ── Duration helpers ──────────────────────────────────────────────────────
  const computeDuration = (clockIn: string | null, clockOut: string | null) => {
    if (!clockIn || !clockOut) return null;
    try { const m = differenceInMinutes(parseISO(clockOut), parseISO(clockIn)); return m > 0 ? m : null; }
    catch { return null; }
  };
  const computeBreakDuration = (s: string | null, e: string | null, stored: number | null) => {
    if (s && e) { try { const m = differenceInMinutes(parseISO(e), parseISO(s)); if (m > 0) return m; } catch {} }
    return stored ?? 0;
  };

  // ── Exports ───────────────────────────────────────────────────────────────
  const exportToCSV = () => {
    const rows = filteredLogs.map((log) => {
      const work  = computeDuration(log.clock_in_time, log.clock_out_time);
      const brk   = log.break_logs.reduce(
        (s, b) => s + computeBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes), 0
      );
      const day   = calendarCtx.dayInfoMap.get(log.date);
      const leave = calendarCtx.employeeLeaveMap.get(log.employee_id)?.get(log.date);
      return {
        Date:                 format(new Date(log.date), 'yyyy-MM-dd'),
        Employee:             log.employee_name,
        'Day Type':           day?.holidayName ?? day?.status ?? 'working',
        'Leave':              leave?.leaveTypeName ?? '',
        'Anomaly':            isWorkedAnomaly(log.date, log.employee_id, !!work, calendarCtx)
                                ? anomalyLabel(log.date, log.employee_id, calendarCtx)
                                : '',
        'Clock In':           log.clock_in_time  || 'N/A',
        'Clock Out':          log.clock_out_time || 'N/A',
        'Working Time (min)': work  ?? 'N/A',
        'Break Time (min)':   brk,
        'Net Time (min)':     work !== null ? work - brk : 'N/A',
        Billable:             log.is_billable ? 'Yes' : 'No',
      };
    });
    const blob = new Blob([Papa.unparse(rows, { header: true })], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Attendance Report', 14, 20);
    (doc as any).autoTable({
      head: [['Date', 'Employee', 'Day Type', 'Clock In', 'Clock Out', 'Working (min)', 'Break (min)', 'Anomaly']],
      body: filteredLogs.map((log) => {
        const work = computeDuration(log.clock_in_time, log.clock_out_time);
        const brk  = log.break_logs.reduce(
          (s, b) => s + computeBreakDuration(b.break_start_time, b.break_end_time, b.duration_minutes), 0
        );
        const day  = calendarCtx.dayInfoMap.get(log.date);
        return [
          format(new Date(log.date), 'yyyy-MM-dd'),
          log.employee_name,
          day?.holidayName ?? day?.status ?? 'working',
          log.clock_in_time  || 'N/A',
          log.clock_out_time || 'N/A',
          work?.toString() ?? 'N/A',
          brk.toString(),
          isWorkedAnomaly(log.date, log.employee_id, !!work, calendarCtx)
            ? anomalyLabel(log.date, log.employee_id, calendarCtx)
            : '',
        ];
      }),
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [123, 67, 241] },
    });
    doc.save(`attendance_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const tabCls =
    'px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 ' +
    'data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all';

  return (
    <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl animate-scale-in">
      <CardHeader>
        <CardTitle>Attendance &amp; In-Out Reports</CardTitle>
        <CardDescription>
          Analyze daily and monthly attendance. Holidays, leave, and working-day overrides are
          highlighted — and anomalies (worked on holiday / leave / non-working day) are flagged.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">

            {/* Tab pills */}
            <div className="flex-shrink-0 order-1">
              <TabsList className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
                <TabsTrigger value="daily"         className={tabCls}>Daily Attendance</TabsTrigger>
                <TabsTrigger value="monthly"       className={tabCls}>Monthly Attendance</TabsTrigger>
                <TabsTrigger value="monthly-inout" className={tabCls}>Monthly In-Out</TabsTrigger>
                <TabsTrigger value="monthly-break" className={tabCls}>Break Report</TabsTrigger>
              </TabsList>
            </div>

            {/* Employee filter */}
            <div className="flex-shrink-0 order-2 w-full sm:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline"
                    className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm flex items-center gap-2 justify-start"
                  >
                    <UserIcon className="h-4 w-4" />
                    {selectedEmployees.length > 0 ? `${selectedEmployees.length} Users Selected` : 'All Users'}
                    {selectedEmployees.length > 0 && <Badge variant="secondary">{selectedEmployees.length}</Badge>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEmployees([])}>
                      Clear Selection
                    </Button>
                    {employees.map((e) => (
                      <Label key={e.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted font-normal">
                        <Checkbox
                          checked={selectedEmployees.includes(e.id)}
                          onCheckedChange={() =>
                            setSelectedEmployees((p) =>
                              p.includes(e.id) ? p.filter((id) => id !== e.id) : [...p, e.id]
                            )
                          }
                        />
                        {e.name}
                      </Label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date / month */}
            <div className="flex-shrink-0 order-3 w-full sm:w-[180px]">
              {activeTab === 'daily' ? (
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="h-10 w-full rounded-full border border-input bg-gray-100 dark:bg-gray-800 shadow-inner px-3 text-sm text-gray-600"
                />
              ) : (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Exports */}
            <div className="flex gap-2 flex-shrink-0 order-4">
              <Button variant="outline" size="sm" onClick={exportToCSV}
                className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
                <Download className="w-4 h-4 mr-2" />Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}
                className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm">
                <Download className="w-4 h-4 mr-2" />Export PDF
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size={60} className="border-[6px] animate-spin text-indigo-600" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <TabsContent value="daily" className="mt-4">
                <DailyAttendanceReport data={filteredLogs} calendarCtx={calendarCtx} />
              </TabsContent>
              <TabsContent value="monthly" className="mt-4">
                <MonthlyAttendanceReport
                  data={filteredLogs} employees={employees}
                  selectedMonth={resolvedMonth} calendarCtx={calendarCtx}
                />
              </TabsContent>
              <TabsContent value="monthly-inout" className="mt-4">
                <MonthlyInOutReport
                  data={filteredLogs} employees={employees}
                  selectedMonth={resolvedMonth} calendarCtx={calendarCtx}
                />
              </TabsContent>
              <TabsContent value="monthly-break" className="mt-4">
                <MonthlyBreakReport
                  data={filteredLogs} employees={employees}
                  selectedMonth={resolvedMonth} calendarCtx={calendarCtx}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AttendanceReportsPage;