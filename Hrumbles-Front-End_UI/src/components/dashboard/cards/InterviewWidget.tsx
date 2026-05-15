// src/components/dashboard/cards/InterviewWidget.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Tabbed interview widget: Today | Upcoming | Completed
// Schema: hr_candidate_interviews
//   interview_date (date), interview_time (text "18:00"), interview_type (text),
//   interview_round (text), interviewers (jsonb [{name:"..."}]),
//   location (text), status (text), created_by, organization_id
// Joins: hr_job_candidates(name) → hr_jobs(title)
// HR employee filter: created_by = employeeId
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  CalendarDays,
  Loader2,
  Calendar,
  User,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────
interface RawInterview {
  id: string;
  interview_date: string;
  interview_time: string | null;
  interview_type: string;
  interview_round: string | null;
  location: string | null;
  status: string;
  interviewers: any;
  created_by: string | null;
  hr_job_candidates: {
    name: string | null;
    hr_jobs: { title: string | null } | null;
  } | null;
}

interface Interview {
  id: string;
  interview_date: string;
  interview_time: string;
  interview_type: string;
  interview_round: string;
  location: string;
  status: string;
  interviewerNames: string[];
  candidateName: string;
  jobTitle: string;
}

export interface InterviewWidgetProps {
  organizationId: string;
  employeeId?: string;
  filterByEmployee?: boolean;
  delay?: number;
}

type TabKey = "today" | "upcoming" | "completed";

// ── Helpers ────────────────────────────────────────────────────────────────
function parseInterviewers(raw: any): string[] {
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
    return arr.map((i: any) => i?.name?.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h)) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return format(d, "dd MMM");
  } catch {
    return dateStr;
  }
}

const TYPE_PALETTE: Record<string, { bg: string; text: string }> = {
  Technical:      { bg: "#eef2ff", text: "#4338ca" },
  HR:             { bg: "#d1fae5", text: "#065f46" },
  Panel:          { bg: "#ede9fe", text: "#5b21b6" },
  Managerial:     { bg: "#fef3c7", text: "#92400e" },
  "Cultural Fit": { bg: "#cffafe", text: "#155e75" },
  Final:          { bg: "#fee2e2", text: "#991b1b" },
};
function typeStyle(type: string) {
  return TYPE_PALETTE[type] ?? { bg: "#f3f4f6", text: "#374151" };
}

// ── Tab config ─────────────────────────────────────────────────────────────
const TABS: {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
}[] = [
  {
    key: "today",
    label: "Today",
    icon: <Clock className="w-3 h-3" />,
    activeColor: "#d97706",
    activeBg: "#fffbeb",
    activeBorder: "#f59e0b",
  },
  {
    key: "upcoming",
    label: "Upcoming",
    icon: <CalendarDays className="w-3 h-3" />,
    activeColor: "#4f46e5",
    activeBg: "#eef2ff",
    activeBorder: "#6366f1",
  },
  {
    key: "completed",
    label: "Completed",
    icon: <CheckCircle2 className="w-3 h-3" />,
    activeColor: "#059669",
    activeBg: "#ecfdf5",
    activeBorder: "#10b981",
  },
];

// ── Interview Row ──────────────────────────────────────────────────────────
const InterviewRow: React.FC<{ interview: Interview; isCompleted?: boolean }> = ({
  interview,
  isCompleted,
}) => {
  const ts = typeStyle(interview.interview_type);
  const interviewerLabel = interview.interviewerNames.join(", ") || null;
  const timeStr = formatTime(interview.interview_time);
  const dateStr = formatDate(interview.interview_date);

  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors border border-transparent ${
        isCompleted
          ? "opacity-55 bg-gray-50/60"
          : "hover:bg-gray-50 hover:border-gray-100"
      }`}
    >
      {/* Left: date stamp */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center w-9 h-9 rounded-lg bg-gray-50 border border-gray-100">
        <span className="text-[9px] font-bold text-gray-500 leading-none uppercase">
          {dateStr.split(" ")[1]}
        </span>
        <span className="text-[14px] font-extrabold text-gray-700 leading-none">
          {dateStr.split(" ")[0]}
        </span>
      </div>

      {/* Middle: info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-[9px] font-bold px-1.5 py-[2px] rounded-md leading-none"
            style={{ backgroundColor: ts.bg, color: ts.text }}
          >
            {interview.interview_type}
          </span>
          {interview.interview_round && (
            <span className="text-[9px] font-semibold text-gray-400">
              {interview.interview_round}
            </span>
          )}
        </div>

        <p
          className={`text-[11.5px] font-semibold leading-tight truncate ${
            isCompleted ? "line-through text-gray-400" : "text-gray-800"
          }`}
        >
          {interview.candidateName || "Candidate"}
        </p>

        {interview.jobTitle && (
          <p
            className={`text-[10px] leading-tight mt-0.5 truncate ${
              isCompleted ? "line-through text-gray-300" : "text-gray-400"
            }`}
          >
            {interview.jobTitle}
          </p>
        )}

        {!isCompleted && (
          <div className="flex items-center gap-2.5 mt-1">
            {interview.location && (
              <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate max-w-[70px]">{interview.location}</span>
              </span>
            )}
            {interviewerLabel && (
              <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
                <User className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate max-w-[80px]">{interviewerLabel}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: time / done */}
      <div className="flex-shrink-0 flex flex-col items-end justify-between h-full pt-0.5">
        {isCompleted ? (
          <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Done
          </span>
        ) : timeStr ? (
          <span className="text-[10px] font-bold text-gray-600 tabular-nums bg-gray-50 px-1.5 py-0.5 rounded-md">
            {timeStr}
          </span>
        ) : (
          <span className="text-[9px] text-gray-300">—</span>
        )}
      </div>
    </div>
  );
};

// ── Empty state ────────────────────────────────────────────────────────────
const EmptyTab: React.FC<{ tab: TabKey }> = ({ tab }) => {
  const msgs: Record<TabKey, { icon: React.ReactNode; text: string }> = {
    today:     { icon: <Clock className="w-7 h-7 text-amber-200" />,   text: "No interviews today" },
    upcoming:  { icon: <CalendarDays className="w-7 h-7 text-indigo-200" />, text: "No upcoming interviews" },
    completed: { icon: <CheckCircle2 className="w-7 h-7 text-emerald-200" />, text: "None completed yet" },
  };
  const { icon, text } = msgs[tab];
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 py-10">
      {icon}
      <span className="text-[11px] text-gray-400">{text}</span>
    </div>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────
const InterviewWidget: React.FC<InterviewWidgetProps> = ({
  organizationId,
  employeeId,
  filterByEmployee = false,
  delay = 0,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>("today");

  const { data: interviews = [], isLoading } = useQuery<Interview[]>({
    queryKey: [
      "dashboard-interviews-v3",
      organizationId,
      filterByEmployee ? (employeeId ?? "none") : "all",
    ],
    queryFn: async (): Promise<Interview[]> => {
      let query = supabase
        .from("hr_candidate_interviews")
        .select(`
          id,
          interview_date,
          interview_time,
          interview_type,
          interview_round,
          location,
          status,
          interviewers,
          created_by,
          hr_job_candidates!hr_candidate_interviews_candidate_id_fkey(
            name,
            hr_jobs!hr_job_candidates_job_id_fkey(title)
          )
        `)
        .eq("organization_id", organizationId)
        .order("interview_date", { ascending: true })
        .order("interview_time", { ascending: true, nullsFirst: false });

      if (filterByEmployee && employeeId) {
        query = query.eq("created_by", employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data ?? []) as unknown as RawInterview[]).map((raw) => ({
        id: raw.id,
        interview_date: raw.interview_date,
        interview_time: raw.interview_time ?? "",
        interview_type: raw.interview_type ?? "Interview",
        interview_round: raw.interview_round ?? "",
        location: raw.location ?? "",
        status: raw.status ?? "scheduled",
        interviewerNames: parseInterviewers(raw.interviewers),
        candidateName: raw.hr_job_candidates?.name ?? "—",
        jobTitle: raw.hr_job_candidates?.hr_jobs?.title ?? "",
      }));
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  // ── Partition ────────────────────────────────────────────────────────────
  const { todayList, upcomingList, completedList } = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const today: Interview[] = [];
    const upcoming: Interview[] = [];
    const completed: Interview[] = [];

    for (const iv of interviews) {
      const isDone =
        iv.status === "completed" ||
        iv.status === "cancelled" ||
        iv.status === "no_show";

      if (isDone) {
        completed.push(iv);
      } else if (iv.interview_date === todayStr) {
        today.push(iv);
      } else if (iv.interview_date > todayStr) {
        upcoming.push(iv);
      } else {
        // past + still "scheduled" → overdue, bucket into completed
        completed.push(iv);
      }
    }

    return {
      todayList: today,
      upcomingList: upcoming,
      completedList: [...completed].reverse(), // newest first
    };
  }, [interviews]);

  const counts: Record<TabKey, number> = {
    today: todayList.length,
    upcoming: upcomingList.length,
    completed: completedList.length,
  };

  const activeList =
    activeTab === "today"
      ? todayList
      : activeTab === "upcoming"
      ? upcomingList
      : completedList;

  const activeTabConfig = TABS.find((t) => t.key === activeTab)!;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white rounded-2xl border border-gray-100 flex flex-col h-full"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-indigo-50">
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-[12px] font-bold text-gray-800 leading-tight">
              Interviews
            </h3>
            <p className="text-[9px] text-gray-400 leading-tight mt-0.5">
              {filterByEmployee ? "Your schedule" : "All org interviews"}
            </p>
          </div>
        </div>

        {/* Total active count */}
        {(counts.today + counts.upcoming) > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full tabular-nums">
            {counts.today + counts.upcoming} active
          </span>
        )}
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 pb-2.5 flex-shrink-0">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg
                text-[10px] font-semibold transition-all duration-200 relative
                ${isActive ? "shadow-sm" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}
              `}
              style={
                isActive
                  ? {
                      backgroundColor: tab.activeBg,
                      color: tab.activeColor,
                      border: `1px solid ${tab.activeBorder}22`,
                    }
                  : { border: "1px solid transparent" }
              }
            >
              <span className="flex-shrink-0" style={isActive ? { color: tab.activeColor } : {}}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {/* Count badge */}
              {counts[tab.key] > 0 && (
                <span
                  className="text-[9px] font-bold px-1 py-[1px] rounded-full leading-none tabular-nums"
                  style={
                    isActive
                      ? { backgroundColor: tab.activeColor, color: "#fff" }
                      : { backgroundColor: "#e5e7eb", color: "#6b7280" }
                  }
                >
                  {counts[tab.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <div className="h-px bg-gray-50 mx-4 flex-shrink-0" />

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2.5 min-h-0"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-10">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            <span className="text-[11px] text-gray-400">Loading…</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeList.length === 0 ? (
                <EmptyTab tab={activeTab} />
              ) : (
                <div className="space-y-1.5">
                  {activeList.map((iv) => (
                    <InterviewRow
                      key={iv.id}
                      interview={iv}
                      isCompleted={activeTab === "completed"}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};

export default InterviewWidget;