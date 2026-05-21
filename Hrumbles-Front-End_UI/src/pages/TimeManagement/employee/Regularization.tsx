import { useState, useEffect, useMemo } from "react";
import { useSelector } from 'react-redux';
import { useLocation } from "react-router-dom";
import {
  format, subDays, isToday, isYesterday, parseISO, parse,
} from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  Clock, CheckCircle2, XCircle, Send, X, CalendarDays,
  ArrowRight, Loader2, Info, AlarmClock, AlertTriangle, Ban,
} from "lucide-react";

import { Button }     from "@/components/ui/button";
import { Textarea }   from "@/components/ui/textarea";
import { Badge }      from "@/components/ui/badge";
import { Label }      from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton }   from "@/components/ui/skeleton";
import { Separator }  from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

import { useRegularizationForm }  from "@/hooks/TimeManagement/regularization/useRegularizationForm";
import { useTimesheetCheck }      from "@/hooks/TimeManagement/regularization/useTimesheetCheck";
import { fetchRegularizationRequests, cancelRegularizationRequest } from "@/api/regularization";
import { RegularizationRequest }  from "@/types/time-tracker-types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract and format time from "yyyy-MM-ddTHH:mm:ss[+Z...]" → "09:00 AM" */
const fmtTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const t = iso.split('T')[1];
  if (!t) return '—';
  const clean = t.split('+')[0].split('Z')[0];
  const [h, m] = clean.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '—';
  const d = new Date(); d.setHours(h, m, 0, 0);
  return format(d, 'hh:mm a');
};

const fmtDuration = (mins: number | null | undefined) => {
  if (!mins) return '';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const DOT_COLOR: Record<string, string> = {
  pending:       'bg-amber-400',
  approved:      'bg-emerald-500',
  rejected:      'bg-red-500',
  cancelled:     'bg-gray-400',
  has_timesheet: 'bg-violet-400',
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const EmployeeRegularization = () => {
  const location      = useLocation();
  const queryClient   = useQueryClient();
  const user          = useSelector((state: any) => state.auth.user);
  const orgId         = useSelector((state: any) => state.auth.organization_id);
  const employeeId: string = user?.id ?? '';

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Last 10 days, oldest → today
  const last10Days  = useMemo(() => Array.from({ length: 10 }, (_, i) => subDays(new Date(), 9 - i)), []);
  const dateStrings = useMemo(() => last10Days.map(d => format(d, 'yyyy-MM-dd')), [last10Days]);

  // ── Form hook ──────────────────────────────────────────────────────────────
  const form = useRegularizationForm({
    employeeId,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-regs', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['reg-dates', employeeId] });
      queryClient.invalidateQueries({
        queryKey: ['timesheet-check', employeeId, format(selectedDate, 'yyyy-MM-dd')],
      });
    },
  });

  // Sync form date with chip
  useEffect(() => { form.setDate(selectedDate); }, [selectedDate]); // eslint-disable-line

  // Prefill from time-tracker "Regularize" button
  useEffect(() => {
    if (!location.state) return;
    const { timeLogId, date: tsDate, clockIn, clockOut } = location.state as any;
    if (tsDate)    setSelectedDate(new Date(tsDate));
    if (timeLogId) form.setTimeLogId(timeLogId);
    if (clockIn) {
      form.setOriginalClockIn(clockIn);
      try { form.setRequestedClockIn(format(new Date(clockIn), 'HH:mm')); } catch { /* ignore */ }
    }
    if (clockOut) {
      form.setOriginalClockOut(clockOut);
      try { form.setRequestedClockOut(format(new Date(clockOut), 'HH:mm')); } catch { /* ignore */ }
    }
  }, []); // eslint-disable-line

  // ── Timesheet for selected date ───────────────────────────────────────────
  const { data: existingLog, isLoading: checkingLog } = useTimesheetCheck(employeeId, selectedDate);

  // ── Date chip data ────────────────────────────────────────────────────────
  const { data: logDates = [] } = useQuery<string[]>({
    queryKey: ['timelogs-dates', employeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('time_logs').select('date')
        .eq('employee_id', employeeId).in('date', dateStrings);
      return (data || []).map(r => r.date as string);
    },
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: regDateMap = {} } = useQuery<Record<string, string>>({
    queryKey: ['reg-dates', employeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('timesheet_regularization').select('date, status')
        .eq('employee_id', employeeId).in('date', dateStrings);
      const m: Record<string, string> = {};
      (data || []).forEach(r => { m[r.date] = r.status; });
      return m;
    },
    enabled: !!employeeId,
    staleTime: 30 * 1000,
  });

  // ── History ───────────────────────────────────────────────────────────────
  const { data: myRequests = [], isLoading: reqLoading } = useQuery({
    queryKey: ['my-regs', employeeId, orgId],
    queryFn: () => fetchRegularizationRequests(orgId, employeeId),
    enabled: !!employeeId && !!orgId,
    staleTime: 30 * 1000,
  });

  const selectedDateStr  = format(selectedDate, 'yyyy-MM-dd');
  const hasPendingForDate = regDateMap[selectedDateStr] === 'pending';

  const chipStatus = (ds: string) => {
    if (regDateMap[ds]) return regDateMap[ds];
    if (logDates.includes(ds)) return 'has_timesheet';
    return 'none';
  };

  const handleCancel = async (id: string) => {
    const ok = await cancelRegularizationRequest(id);
    if (ok) {
      queryClient.invalidateQueries({ queryKey: ['my-regs', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['reg-dates', employeeId] });
    }
  };

  if (!employeeId) return (
    <div className="content-area flex items-center justify-center h-64">
      <p className="text-muted-foreground">Please log in to access regularization.</p>
    </div>
  );

  return (
    <div className="content-area space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timesheet Regularization</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Request corrections for missed or incorrect clock-in/out entries · limited to last 10 days
        </p>
      </div>

      {/* ── Date Chip Strip ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Select Date
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {last10Days.map(d => {
            const ds        = format(d, 'yyyy-MM-dd');
            const status    = chipStatus(ds);
            const isActive  = ds === selectedDateStr;
            return (
              <TooltipProvider key={ds}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSelectedDate(d)}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[60px] h-[68px]",
                        "rounded-xl border-2 transition-all duration-150 shrink-0 relative",
                        isActive
                          ? "border-violet-600 bg-violet-50 shadow-md"
                          : "border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/40",
                        isToday(d) && !isActive && "border-violet-300",
                      )}
                    >
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wide",
                        isActive ? "text-violet-700" : "text-muted-foreground",
                      )}>
                        {isToday(d) ? 'Today' : isYesterday(d) ? 'Yest' : format(d, 'EEE')}
                      </span>
                      <span className={cn(
                        "text-xl font-extrabold leading-tight",
                        isActive ? "text-violet-800" : "text-gray-800",
                      )}>
                        {format(d, 'd')}
                      </span>
                      {status !== 'none' && (
                        <span className={cn(
                          "absolute top-1.5 right-1.5 w-2 h-2 rounded-full",
                          DOT_COLOR[status] ?? 'bg-gray-300',
                        )} />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs space-y-0.5">
                    <p className="font-medium">{format(d, 'MMMM d, yyyy')}</p>
                    {status === 'pending'       && <p className="text-amber-600">Pending regularization</p>}
                    {status === 'approved'      && <p className="text-emerald-600">Regularization approved</p>}
                    {status === 'rejected'      && <p className="text-red-600">Regularization rejected</p>}
                    {status === 'has_timesheet' && <p className="text-violet-600">Has timesheet entry</p>}
                    {status === 'none'          && <p className="text-gray-400">No entry</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex gap-4 mt-2 flex-wrap">
          {[
            ['Has Timesheet', 'bg-violet-400'],
            ['Pending',       'bg-amber-400'],
            ['Approved',      'bg-emerald-500'],
            ['Rejected',      'bg-red-500'],
          ].map(([label, cls]) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("w-2 h-2 rounded-full", cls)} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── Two-Column Layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left: Request Form */}
        <div className="lg:col-span-3 space-y-4">

          {/* Existing timesheet card */}
          {checkingLog ? (
            <div className="rounded-xl border p-4 space-y-2">
              <Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-32" />
            </div>
          ) : existingLog ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlarmClock className="h-4 w-4 text-violet-600" />
                <p className="text-sm font-semibold text-violet-800">
                  Existing Entry — {format(selectedDate, 'MMMM d, yyyy')}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Clock In</p>
                  <p className="font-semibold">{fmtTime(existingLog.clock_in_time)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clock Out</p>
                  <p className="font-semibold">
                    {existingLog.clock_out_time ? fmtTime(existingLog.clock_out_time)
                      : <span className="text-muted-foreground text-xs">Not clocked out</span>}
                  </p>
                </div>
                {existingLog.duration_minutes ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="font-semibold">{fmtDuration(existingLog.duration_minutes)}</p>
                  </div>
                ) : null}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {existingLog.is_submitted ? '✓ Submitted' : 'Not submitted'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  · approval will update this entry
                </span>
              </div>
            </div>
          ) : (
            <Alert className="border-blue-200 bg-blue-50/60">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 text-sm">
                No timesheet entry for <strong>{format(selectedDate, 'MMMM d')}</strong>.
                If approved, a new entry will be created.
              </AlertDescription>
            </Alert>
          )}

          {/* Duplicate warning */}
          {hasPendingForDate && (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                A <strong>pending</strong> request already exists for this date.
                You can submit a new one, but the existing request must be resolved first.
              </AlertDescription>
            </Alert>
          )}

          {/* Form card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-violet-100 flex items-center justify-center">
                <Send className="h-3.5 w-3.5 text-violet-700" />
              </div>
              <div>
                <p className="font-semibold text-sm">New Regularization Request</p>
                <p className="text-xs text-muted-foreground">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <form onSubmit={form.handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <TimeInput
                  label="Requested Clock In"
                  value={form.requestedClockIn}
                  onChange={form.setRequestedClockIn}
                />
                <TimeInput
                  label="Requested Clock Out"
                  value={form.requestedClockOut}
                  onChange={form.setRequestedClockOut}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Reason</Label>
                  <span className="text-xs text-muted-foreground">
                    {form.reason.length}/300
                  </span>
                </div>
                <Textarea
                  value={form.reason}
                  onChange={e => form.setReason(e.target.value.slice(0, 300))}
                  placeholder="Describe why you need this correction…"
                  className="min-h-[88px] resize-none text-sm"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
                disabled={
                  form.isSubmitting ||
                  !form.requestedClockIn ||
                  !form.requestedClockOut ||
                  !form.reason.trim()
                }
              >
                {form.isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                  : <><Send className="h-4 w-4" /> Submit Request</>}
              </Button>
            </form>
          </div>
        </div>

        {/* Right: My Requests Timeline */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <p className="font-semibold text-sm">My Requests</p>
              <Badge variant="outline" className="text-xs font-medium">
                {myRequests.length}
              </Badge>
            </div>
            <div className="divide-y overflow-y-auto max-h-[580px]">
              {reqLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
                </div>
              ) : myRequests.length === 0 ? (
                <div className="py-14 text-center">
                  <CalendarDays className="h-9 w-9 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm text-muted-foreground">No requests yet</p>
                </div>
              ) : (
                myRequests.map(req => (
                  <RequestCard key={req.id} request={req} onCancel={handleCancel} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── TimeInput ─────────────────────────────────────────────────────────────────

const TimeInput = ({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) => {
  let display = '';
  if (value) {
    try { display = format(parse(value, 'HH:mm', new Date()), 'hh:mm a'); } catch { /* skip */ }
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <input
          type="time"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background",
            "px-3 py-2 pl-9 text-sm ring-offset-background",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>
      {display && <p className="text-xs text-muted-foreground">{display}</p>}
    </div>
  );
};

// ── Request Card ──────────────────────────────────────────────────────────────

const CARD_STYLE: Record<string, { bar: string; badge: React.ReactNode; icon: React.ReactNode }> = {
  pending: {
    bar:   'border-l-4 border-l-amber-400',
    badge: <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0">Pending</Badge>,
    icon:  <Clock className="h-3 w-3 text-amber-500" />,
  },
  approved: {
    bar:   'border-l-4 border-l-emerald-500',
    badge: <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] px-1.5 py-0">Approved</Badge>,
    icon:  <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
  },
  rejected: {
    bar:   'border-l-4 border-l-red-500',
    badge: <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] px-1.5 py-0">Rejected</Badge>,
    icon:  <XCircle className="h-3 w-3 text-red-500" />,
  },
  cancelled: {
    bar:   'border-l-4 border-l-gray-300',
    badge: <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-500">Cancelled</Badge>,
    icon:  <Ban className="h-3 w-3 text-gray-400" />,
  },
};

const RequestCard = ({
  request, onCancel,
}: { request: RegularizationRequest; onCancel: (id: string) => void }) => {
  const [cancelling, setCancelling] = useState(false);
  const s = CARD_STYLE[request.status] ?? CARD_STYLE.pending;

  const handleCancel = async () => {
    setCancelling(true);
    await onCancel(request.id);
    setCancelling(false);
  };

  return (
    <div className={cn("p-3.5 hover:bg-gray-50/60 transition-colors", s.bar)}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {s.icon}
          <span className="text-xs font-semibold text-gray-700">
            {format(parseISO(request.date), 'MMM d, yyyy · EEE')}
          </span>
        </div>
        {s.badge}
      </div>

      <div className="flex items-center gap-1 text-sm font-medium text-gray-800 mb-1">
        <span>{fmtTime(request.requested_clock_in)}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span>{fmtTime(request.requested_clock_out)}</span>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{request.reason}</p>

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          Submitted {format(parseISO(request.created_at), 'MMM d')}
        </p>
        {request.status === 'pending' && (
          <Button
            variant="ghost" size="sm"
            className="h-6 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleCancel} disabled={cancelling}
          >
            {cancelling
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <><X className="h-3 w-3 mr-0.5" />Cancel</>}
          </Button>
        )}
      </div>

      {request.approver_notes && request.status !== 'pending' && (
        <div className={cn(
          "mt-2 rounded-md p-2 text-xs leading-snug",
          request.status === 'approved'
            ? "bg-emerald-50 text-emerald-700"
            : "bg-red-50 text-red-700",
        )}>
          <span className="font-semibold">Note: </span>{request.approver_notes}
        </div>
      )}
    </div>
  );
};


export default EmployeeRegularization;