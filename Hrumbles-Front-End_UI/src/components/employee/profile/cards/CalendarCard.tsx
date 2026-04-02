/**
 * CalendarCard — Dashboard Calendar
 *
 * Left: calendar grid with dots for interviews, leave, holidays, exceptions.
 * Right: tab-free scrollable panel.
 *   • Day status pill always shown at top.
 *   • Leave section rendered only when there's leave on the selected date.
 *   • Interview section rendered only when there are interviews — visible to
 *     all roles but only populated for roles that have interview data.
 *   • "Nothing scheduled" placeholder when both are empty.
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  isSameMonth, isToday, addMonths, subMonths, getDay, parseISO,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, CalendarDays, Video,
  MapPin, Clock, UserCheck, Briefcase,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useOrgCalendarConfig, ClientDayStatus } from "@/hooks/TimeManagement/useOrgCalendarConfig";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Interview {
  name:               string;
  interview_date:     string;
  interview_time:     string;
  interview_location: string;
  interview_type:     string;
  round:              string;
  employee_name?:     string;
  candidate_id?:      string;
  job_id?:            string;
}

interface LeaveItem {
  id:            string;
  employee_id:   string;
  employee_name: string;
  leave_type:    string;
  leave_color:   string;
  start_date:    string;
  end_date:      string;
  status:        "pending" | "approved" | "rejected" | "cancelled";
  notes?:        string;
}

interface CalendarCardProps {
  employeeId:              string;
  isHumanResourceEmployee: boolean;
  role?:                   string;
  organizationId:          string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const isAdminRole = (role?: string) =>
  role === "organization_superadmin" || role === "admin";

function fmtTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const d = new Date();
  d.setHours(parseInt(h), parseInt(m));
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function dk(d: Date) {
  return format(d, "yyyy-MM-dd");
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CalendarCard: React.FC<CalendarCardProps> = ({
  employeeId,
  isHumanResourceEmployee,
  role,
  organizationId,
}) => {
  const [currentDate,  setCurrentDate]  = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const currentYear = currentDate.getFullYear();
  const isAdmin     = isAdminRole(role);

  const calendarConfig = useOrgCalendarConfig(currentYear);
  const { getDayStatus, getHolidayName } = calendarConfig;

  // ── Interviews ────────────────────────────────────────────────────
  const { data: interviewsRaw = [], isLoading: loadingInterviews } = useQuery({
    queryKey: ["calendarInterviews", organizationId, employeeId, role],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_upcoming_interviews", {
        p_organization_id: organizationId,
      });
      if (error) throw error;

      let list = (data ?? []) as Interview[];

      // Non-admin: filter to own interviews only
      if (!isAdmin) {
        const { data: emp } = await supabase
          .from("hr_employees")
          .select("first_name, last_name")
          .eq("id", employeeId)
          .single();

        list = emp
          ? list.filter((i) => i.employee_name === `${emp.first_name} ${emp.last_name}`)
          : [];
      }

      return list.sort((a, b) => {
        const dA = new Date(`${a.interview_date}T${a.interview_time || "00:00:00"}+05:30`);
        const dB = new Date(`${b.interview_date}T${b.interview_time || "00:00:00"}+05:30`);
        return dA.getTime() - dB.getTime();
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Leave requests ────────────────────────────────────────────────
  const { data: leaveItems = [], isLoading: loadingLeave } = useQuery({
    queryKey: ["calendarLeave", organizationId, employeeId, role, currentYear],
    queryFn: async () => {
      let q = supabase
        .from("leave_requests")
        .select(`
          id, employee_id, start_date, end_date, status, notes,
          leave_type:leave_type_id(name, color),
          employee:employee_id(first_name, last_name)
        `)
        .eq("organization_id", organizationId)
        .in("status", ["pending", "approved"])
        .gte("start_date", `${currentYear}-01-01`)
        .lte("start_date", `${currentYear}-12-31`);

      if (!isAdmin) q = q.eq("employee_id", employeeId);

      const { data, error } = await q.order("start_date", { ascending: true });
      if (error) throw error;

      return (data ?? []).map((row: any): LeaveItem => ({
        id:            row.id,
        employee_id:   row.employee_id,
        employee_name: row.employee
          ? `${row.employee.first_name ?? ""} ${row.employee.last_name ?? ""}`.trim()
          : "Unknown",
        leave_type:  row.leave_type?.name  ?? "Leave",
        leave_color: row.leave_type?.color ?? "#6366f1",
        start_date:  row.start_date,
        end_date:    row.end_date,
        status:      row.status,
        notes:       row.notes,
      }));
    },
    staleTime: 3 * 60 * 1000,
  });

  // ── Per-date lookup maps ──────────────────────────────────────────
  const interviewDateMap = useMemo(() => {
    const m = new Map<string, Interview[]>();
    interviewsRaw.forEach((i) => {
      const k = format(new Date(i.interview_date), "yyyy-MM-dd");
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(i);
    });
    return m;
  }, [interviewsRaw]);

  const leaveDateMap = useMemo(() => {
    const m = new Map<string, LeaveItem[]>();
    leaveItems.forEach((item) => {
      eachDayOfInterval({
        start: parseISO(item.start_date),
        end:   parseISO(item.end_date),
      }).forEach((d) => {
        const k = dk(d);
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(item);
      });
    });
    return m;
  }, [leaveItems]);

  // ── Calendar grid ─────────────────────────────────────────────────
  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad   = getDay(monthStart);
  const paddedDays = [...Array(startPad).fill(null), ...days];

  // ── Selected date ─────────────────────────────────────────────────
  const selKey         = dk(selectedDate);
  const selInterviews  = interviewDateMap.get(selKey) ?? [];
  const selLeave       = leaveDateMap.get(selKey) ?? [];
  const selStatus      = getDayStatus(selectedDate);
  const selHolidayName = getHolidayName(selectedDate);
  const isLoading      = loadingInterviews || loadingLeave;

  // ── Day cell ──────────────────────────────────────────────────────
  const renderDay = (day: Date | null, idx: number) => {
    if (!day) return <div key={`pad-${idx}`} />;

    const k         = dk(day);
    const hasIv     = (interviewDateMap.get(k)?.length ?? 0) > 0;
    const leave     = leaveDateMap.get(k) ?? [];
    const hasApr    = leave.some((l) => l.status === "approved");
    const hasPen    = leave.some((l) => l.status === "pending");
    const status    = getDayStatus(day);
    const hName     = getHolidayName(day);
    const isSel     = isSameDay(day, selectedDate);
    const isTodayD  = isToday(day);
    const isSun     = getDay(day) === 0;
    const isCurMon  = isSameMonth(day, currentDate);

    const tint = !isSel && !isTodayD
      ? status === "holiday"              ? "bg-orange-50 dark:bg-orange-950/20"
      : status === "exception_nonworking" ? "bg-rose-50 dark:bg-rose-950/20"
      : status === "exception_working"    ? "bg-teal-50 dark:bg-teal-950/20"
      : ""
      : "";

    return (
      <motion.button
        key={k}
        whileTap={{ scale: 0.85 }}
        onClick={() => setSelectedDate(day)}
        className={cn(
          "relative mx-auto w-7 h-7 flex flex-col items-center justify-start pt-1 text-[10px] rounded-lg transition-all duration-150 font-medium",
          !isCurMon && "opacity-25",
          tint,
          isSel    ? "text-white shadow-lg"
          : isTodayD ? "text-purple-700 bg-purple-50"
          : status === "weekend"
            ? isSun ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:bg-slate-50"
          : "text-gray-700 hover:bg-gray-100"
        )}
        style={isSel ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)" } : {}}
        title={hName ?? undefined}
      >
        <span>{format(day, "d")}</span>

        <div className="flex gap-[2px] mt-px">
          {hasIv && <span className="w-[5px] h-[5px] rounded-full bg-violet-500 shrink-0" />}
          {(hasApr || hasPen) && (
            <span className={cn(
              "w-[5px] h-[5px] rounded-full shrink-0",
              hasApr ? "bg-emerald-500" : "bg-amber-400"
            )} />
          )}
          {(status === "holiday" || status === "exception_nonworking") && !isSel && (
            <span className="w-[5px] h-[5px] rounded-full bg-orange-500 shrink-0" />
          )}
        </div>

        {isTodayD && !isSel && (
          <span className="absolute inset-0 rounded-lg ring-1 ring-purple-300" />
        )}
      </motion.button>
    );
  };

  return (
    <div className="h-[340px] flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(79,70,229,0.02))" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            <CalendarDays className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-800 block leading-tight">Calendar</span>
            <span className="text-[9px] text-purple-400 font-medium leading-none">
              Schedule · Leave · Holidays
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-semibold text-gray-700 min-w-[90px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 divide-x divide-gray-100">

        {/* LEFT — calendar grid */}
        <div className="flex-1 p-3 flex flex-col min-w-0">
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d, i) => (
              <div key={d + i} className={cn(
                "text-center text-[10px] font-semibold py-0.5",
                i === 0 ? "text-amber-500" : i === 6 ? "text-slate-400" : "text-gray-400"
              )}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5 flex-1">
            {paddedDays.map((day, idx) => renderDay(day, idx))}
          </div>

          <div className="flex items-center gap-2.5 mt-2 pt-2 border-t border-gray-50 flex-wrap">
            {[
              { dot: "bg-violet-500",  label: "Interview" },
              { dot: "bg-emerald-500", label: "Leave"     },
              { dot: "bg-amber-400",   label: "Pending"   },
              { dot: "bg-orange-500",  label: "Holiday"   },
            ].map(({ dot, label }) => (
              <div key={label} className="flex items-center gap-1">
                <span className={cn("w-1.5 h-1.5 rounded-full inline-block", dot)} />
                <span className="text-[9px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — tab-free detail panel */}
        <div className="w-56 xl:w-64 flex flex-col flex-shrink-0 min-h-0">

          {/* Date + status */}
          <div className="px-4 py-2.5 border-b border-gray-50 flex-shrink-0">
            <p className="text-[11px] font-semibold text-gray-800 leading-tight">
              {format(selectedDate, "EEE, MMM d, yyyy")}
            </p>
            <DayStatusPill status={selStatus} holidayName={selHolidayName} />
          </div>

          {/* Content — sections appear only when data exists */}
          <div
            className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2.5"
            style={{ scrollbarWidth: "none" }}
          >
            {isLoading ? (
              <LoadingSkeletons />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selKey}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-2.5"
                >
                  {/* Leave */}
                  {selLeave.length > 0 && (
                    <section className="space-y-1">
                      <p className="flex items-center gap-1 text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-0.5">
                        <Briefcase className="w-2.5 h-2.5" />
                        Leave
                      </p>
                      {selLeave.map((item) => (
                        <LeaveCard key={item.id} item={item} showEmployee={isAdmin} />
                      ))}
                    </section>
                  )}

                  {/* Interviews — only renders when data exists */}
                  {selInterviews.length > 0 && (
                    <section className="space-y-1">
                      <p className="flex items-center gap-1 text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-0.5">
                        <Video className="w-2.5 h-2.5" />
                        Interviews
                      </p>
                      {selInterviews.map((interview, idx) => (
                        interview.candidate_id && interview.job_id ? (
                          <Link
                            key={idx}
                            to={`/jobs/candidateprofile/${interview.candidate_id}/${interview.job_id}`}
                          >
                            <InterviewCard interview={interview} role={role} />
                          </Link>
                        ) : (
                          <InterviewCard key={idx} interview={interview} role={role} />
                        )
                      ))}
                    </section>
                  )}

                  {/* Empty state */}
                  {selLeave.length === 0 && selInterviews.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-28 gap-2 text-center">
                      <CalendarDays className="w-7 h-7 text-gray-100" />
                      <p className="text-[9px] text-gray-300 font-medium">Nothing scheduled</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

function DayStatusPill({
  status, holidayName,
}: { status: ClientDayStatus; holidayName: string | null }) {
  const cfg: Record<ClientDayStatus, { label: string; cls: string }> = {
    working:              { label: "Working day",            cls: "text-emerald-500" },
    weekend:              { label: "Weekend",                cls: "text-slate-400"   },
    holiday:              { label: holidayName ?? "Holiday", cls: "text-orange-500"  },
    exception_working:    { label: "Working (override)",     cls: "text-teal-500"    },
    exception_nonworking: { label: "Non-working",            cls: "text-rose-400"    },
  };
  const { label, cls } = cfg[status];
  return <p className={cn("text-[9px] font-semibold mt-0.5", cls)}>{label}</p>;
}

function LeaveCard({ item, showEmployee }: { item: LeaveItem; showEmployee: boolean }) {
  const sc = {
    pending:   { label: "Pending",   cls: "bg-amber-100 text-amber-700"    },
    approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700" },
    rejected:  { label: "Rejected",  cls: "bg-rose-100 text-rose-700"      },
    cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-500"      },
  }[item.status];

  return (
    <div className="rounded-xl p-2 border border-gray-100 hover:shadow-sm transition-all">
      {showEmployee && (
        <div className="flex items-center gap-1 mb-0.5">
          <UserCheck className="w-2.5 h-2.5 text-gray-400" />
          <p className="text-[9px] text-gray-600 font-medium truncate">{item.employee_name}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.leave_color }} />
          <p className="text-[10px] font-semibold text-gray-800 truncate">{item.leave_type}</p>
        </div>
        <span className={cn("text-[7px] font-bold px-1.5 py-0.5 rounded-full shrink-0", sc.cls)}>
          {sc.label}
        </span>
      </div>
      {item.notes && (
        <p className="text-[8px] text-gray-400 truncate mt-0.5">{item.notes}</p>
      )}
    </div>
  );
}

function InterviewCard({ interview, role }: { interview: Interview; role?: string }) {
  return (
    <div
      className="rounded-xl p-2 border transition-all hover:shadow-sm cursor-pointer group"
      style={{
        background:  "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(79,70,229,0.02))",
        borderColor: "rgba(124,58,237,0.12)",
      }}
    >
      <p className="text-[10px] font-semibold text-gray-800 truncate group-hover:text-purple-700 transition-colors leading-tight">
        {interview.name}
      </p>
      {role === "organization_superadmin" && interview.employee_name && (
        <p className="text-[8px] text-gray-400 truncate">{interview.employee_name}</p>
      )}
      <div className="space-y-0.5 mt-1">
        {interview.interview_time && (
          <div className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-purple-400" />
            <span className="text-[8px] text-gray-500">{fmtTime(interview.interview_time)}</span>
          </div>
        )}
        {interview.interview_location && (
          <div className="flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5 text-indigo-400" />
            <span className="text-[8px] text-gray-500 truncate">{interview.interview_location}</span>
          </div>
        )}
        <div className="flex gap-1 mt-0.5">
          <span
            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-semibold"
            style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}
          >
            <Video className="w-2 h-2" />
            {interview.interview_type || "Interview"}
          </span>
          {interview.round && (
            <span className="text-[7px] text-gray-400 px-1 py-0.5 rounded bg-gray-50 border border-gray-100">
              {interview.round}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeletons() {
  return (
    <div className="space-y-1.5 p-1">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-gray-50 animate-pulse" />
      ))}
    </div>
  );
}

export default CalendarCard;