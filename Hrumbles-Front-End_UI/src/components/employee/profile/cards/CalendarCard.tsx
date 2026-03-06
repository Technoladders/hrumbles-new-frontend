import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, Video, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface Interview {
  name: string;
  interview_date: string;
  interview_time: string;
  interview_location: string;
  interview_type: string;
  round: string;
  employee_name?: string;
  candidate_id?: string;
  job_id?: string;
}

interface CalendarCardProps {
  employeeId: string;
  isHumanResourceEmployee: boolean;
  role?: string;
  organizationId: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const CalendarCard: React.FC<CalendarCardProps> = ({
  employeeId,
  isHumanResourceEmployee,
  role,
  organizationId,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch interviews
  useEffect(() => {
    const fetchInterviews = async () => {
      setIsLoading(true);
      try {
        const { data: allInterviews, error } = await supabase.rpc("get_upcoming_interviews", {
          p_organization_id: organizationId,
        });
        if (error) throw error;
        if (!allInterviews) { setInterviews([]); return; }

        let list = allInterviews as Interview[];
        if (role !== "organization_superadmin") {
          const { data: emp } = await supabase
            .from("hr_employees")
            .select("first_name, last_name")
            .eq("id", employeeId)
            .single();
          if (emp) {
            const fullName = `${emp.first_name} ${emp.last_name}`;
            list = list.filter((i) => i.employee_name === fullName);
          } else {
            list = [];
          }
        }

        list.sort((a, b) => {
          const dA = new Date(`${a.interview_date}T${a.interview_time || "00:00:00"}+05:30`);
          const dB = new Date(`${b.interview_date}T${b.interview_time || "00:00:00"}+05:30`);
          return dA.getTime() - dB.getTime();
        });

        setInterviews(list);
      } catch (err) {
        console.error("Error fetching interviews:", err);
        toast.error("Failed to load interviews");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInterviews();
  }, [employeeId, role, organizationId]);

  // Build calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 0=Sun
  const paddedDays = [...Array(startPad).fill(null), ...days];

  // Interview date set for fast lookup
  const interviewDates = new Set(
    interviews.map((i) => format(new Date(i.interview_date), "yyyy-MM-dd"))
  );

  // Selected day's interviews
  const selectedInterviews = interviews.filter((i) =>
    isSameDay(new Date(i.interview_date), selectedDate)
  );

  const formatTime = (time: string) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m));
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  return (
    <div className="h-[320px] flex flex-col bg-white rounded-2xl overflow-hidden">
      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.04) 0%, rgba(79,70,229,0.02) 100%)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            <CalendarDays className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-800 block">Calendar</span>
            <span className="text-[9px] text-purple-400 font-medium">Schedule & Interviews</span>
          </div>
        </div>

        {/* Month nav */}
        <div className="flex items-center gap-2">
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

      {/* ── Body: calendar + interview list side by side ── */}
      <div className="flex flex-1 min-h-0 divide-x divide-gray-100">

        {/* LEFT — calendar grid */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((d, i) => (
              <div
                key={d + i}
                className={cn(
                  "text-center text-[10px] font-semibold py-1",
                  i === 0 ? "text-amber-500" : "text-gray-400"
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1 flex-1">
            {paddedDays.map((day, idx) => {
              if (!day) return <div key={`pad-${idx}`} />;

              const dateKey = format(day, "yyyy-MM-dd");
              const hasInterview = interviewDates.has(dateKey);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDay = isToday(day);
              const isSun = getDay(day) === 0;
              const isCurrentMon = isSameMonth(day, currentDate);

              return (
                <motion.button
                  key={dateKey}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative mx-auto w-7 h-7 flex items-center justify-center text-[11px] rounded-full transition-all duration-150 font-medium",
                    !isCurrentMon && "opacity-30",
                    isSelected
                      ? "text-white shadow-md"
                      : isTodayDay
                      ? "text-purple-700 bg-purple-50"
                      : hasInterview
                      ? "text-purple-600 bg-purple-100"
                      : isSun
                      ? "text-amber-500 hover:bg-amber-50"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                  style={
                    isSelected
                      ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }
                      : {}
                  }
                >
                  {format(day, "d")}

                  {/* Interview dot */}
                  {hasInterview && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-500" />
                  )}
                  {/* Today ring */}
                  {isTodayDay && !isSelected && (
                    <span className="absolute inset-0 rounded-full ring-1 ring-purple-300" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              <span className="text-[9px] text-gray-400">Interview</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full ring-1 ring-purple-300 inline-block" />
              <span className="text-[9px] text-gray-400">Today</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }} />
              <span className="text-[9px] text-gray-400">Selected</span>
            </div>
          </div>
        </div>

        {/* RIGHT — interview list for selected date */}
        <div className="w-56 xl:w-64 flex flex-col flex-shrink-0 min-h-0">
          <div className="px-4 py-3 border-b border-gray-50 flex-shrink-0">
            <p className="text-[10px] font-semibold text-gray-700">
              {format(selectedDate, "EEE, MMM d")}
            </p>
            <p className="text-[9px] text-purple-400 font-medium">
              {selectedInterviews.length} interview{selectedInterviews.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none" style={{ scrollbarWidth: "none" }}>
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse" />
                  ))}
                </div>
              ) : selectedInterviews.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-32 text-center"
                >
                  <CalendarDays className="w-8 h-8 text-gray-100 mb-2" />
                  <p className="text-[10px] text-gray-300 font-medium">No interviews</p>
                  <p className="text-[9px] text-gray-200">for this date</p>
                </motion.div>
              ) : (
                selectedInterviews.map((interview, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    {interview.candidate_id && interview.job_id ? (
                      <Link
                        to={`/jobs/candidateprofile/${interview.candidate_id}/${interview.job_id}`}
                        className="block"
                      >
                        <InterviewCard interview={interview} role={role} formatTime={formatTime} />
                      </Link>
                    ) : (
                      <InterviewCard interview={interview} role={role} formatTime={formatTime} />
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-component: single interview card ──
const InterviewCard: React.FC<{
  interview: Interview;
  role?: string;
  formatTime: (t: string) => string;
}> = ({ interview, role, formatTime }) => (
  <div
    className="rounded-xl p-2.5 border transition-all duration-150 hover:shadow-sm cursor-pointer group"
    style={{
      background: "linear-gradient(135deg, rgba(124,58,237,0.04), rgba(79,70,229,0.02))",
      borderColor: "rgba(124,58,237,0.12)",
    }}
  >
    {/* Candidate name */}
    <p className="text-[11px] font-semibold text-gray-800 truncate group-hover:text-purple-700 transition-colors">
      {interview.name}
    </p>

    {/* Employee (superadmin only) */}
    {role === "organization_superadmin" && interview.employee_name && (
      <p className="text-[9px] text-gray-400 truncate mb-1">{interview.employee_name}</p>
    )}

    <div className="space-y-0.5 mt-1">
      {/* Time */}
      {interview.interview_time && (
        <div className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5 text-purple-400 flex-shrink-0" />
          <span className="text-[9px] text-gray-500">{formatTime(interview.interview_time)}</span>
        </div>
      )}

      {/* Location */}
      {interview.interview_location && (
        <div className="flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5 text-indigo-400 flex-shrink-0" />
          <span className="text-[9px] text-gray-500 truncate">{interview.interview_location}</span>
        </div>
      )}

      {/* Type + round */}
      <div className="flex items-center gap-1 mt-1">
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-semibold"
          style={{
            background: "rgba(124,58,237,0.08)",
            color: "#7c3aed",
          }}
        >
          <Video className="w-2 h-2" />
          {interview.interview_type || "Interview"}
        </span>
        {interview.round && (
          <span className="text-[8px] text-gray-400 px-1 py-0.5 rounded bg-gray-50 border border-gray-100">
            {interview.round}
          </span>
        )}
      </div>
    </div>
  </div>
);

export default CalendarCard;