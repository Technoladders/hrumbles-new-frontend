import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Activity,
  ArrowRightLeft,
  UserRoundPlus,
  Zap,
  Briefcase,
  Users,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface OrgTimelineEvent {
  id: string;
  event_type: string;
  new_state: { mainStatusName?: string; subStatusName?: string; color?: string };
  created_at: string;
  candidate_name: string;
  job_title: string | null;
  created_by_name: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch — org-wide: all candidates whose jobs belong to the org
// ─────────────────────────────────────────────────────────────────────────────
const BATCH_SIZE = 50;

const fetchOrgTimeline = async (organizationId: string): Promise<OrgTimelineEvent[]> => {
  if (!organizationId) return [];

  // 1. Get all jobs in the org
  const { data: jobs, error: jobsErr } = await supabase
    .from("hr_jobs")
    .select("id")
    .eq("organization_id", organizationId);

  if (jobsErr) throw jobsErr;
  if (!jobs || jobs.length === 0) return [];

  const jobIds = jobs.map((j) => j.id);

  // 2. Get all candidates for those jobs (with name, job title, recruiter id)
  const { data: candidates, error: candErr } = await supabase
    .from("hr_job_candidates")
    .select(
      "id, name, created_by, job_id, hr_jobs:hr_jobs!hr_job_candidates_job_id_fkey(title)"
    )
    .in("job_id", jobIds);

  if (candErr) throw candErr;
  if (!candidates || candidates.length === 0) return [];

  // 3. Get recruiter names in bulk
  const recruiterIds = [...new Set(candidates.map((c) => c.created_by).filter(Boolean))];
  let recruiterMap: Record<string, string> = {};
  if (recruiterIds.length > 0) {
    const { data: profiles } = await supabase
      .from("hr_employees")
      .select("id, name")
      .in("id", recruiterIds);
    (profiles || []).forEach((p) => {
      recruiterMap[p.id] = p.name;
    });
  }

  // 4. Fetch timeline events in chunks
  const candidateIds = candidates.map((c) => c.id);
  const chunks: string[][] = [];
  for (let i = 0; i < candidateIds.length; i += BATCH_SIZE) {
    chunks.push(candidateIds.slice(i, i + BATCH_SIZE));
  }

  const timelineQueries = chunks.map((chunk) =>
    supabase
      .from("hr_candidate_timeline")
      .select("id, candidate_id, event_type, new_state, created_at")
      .in("candidate_id", chunk)
      .order("created_at", { ascending: false })
      .limit(200)
  );

  const results = await Promise.all(timelineQueries);
  const allEvents = results.flatMap((r) => (r.data || []) as any[]);

  allEvents.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const topEvents = allEvents.slice(0, 200);

  return topEvents.map((event) => {
    const candidate = candidates.find((c) => c.id === event.candidate_id);
    return {
      ...event,
      candidate_name: candidate?.name || "Unknown",
      job_title: (candidate as any)?.hr_jobs?.title || null,
      created_by_name: recruiterMap[candidate?.created_by] || null,
    };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getEventMeta = (type: string) => {
  switch (type) {
    case "status_change":
      return {
        icon: <ArrowRightLeft className="h-3 w-3" />,
        verb: "moved to",
        iconBg: "#7c3aed",
        iconBgLight: "#f5f3ff",
      };
    case "candidate_added":
      return {
        icon: <UserRoundPlus className="h-3 w-3" />,
        verb: "added to pipeline",
        iconBg: "#059669",
        iconBgLight: "#ecfdf5",
      };
    default:
      return {
        icon: <Zap className="h-3 w-3" />,
        verb: "activity",
        iconBg: "#2563eb",
        iconBgLight: "#eff6ff",
      };
  }
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] || "")
    .join("")
    .toUpperCase();

const AVATAR_PALETTES = [
  { bg: "#ede9fe", text: "#6d28d9" },
  { bg: "#dbeafe", text: "#1d4ed8" },
  { bg: "#d1fae5", text: "#065f46" },
  { bg: "#fef3c7", text: "#92400e" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#cffafe", text: "#155e75" },
];

const getAvatarPalette = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
};

const getDateLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

// Group events by date label
const groupByDate = (events: OrgTimelineEvent[]) => {
  const groups: { label: string; events: OrgTimelineEvent[] }[] = [];
  const seen = new Map<string, number>();
  events.forEach((e) => {
    const label = getDateLabel(e.created_at);
    if (!seen.has(label)) {
      seen.set(label, groups.length);
      groups.push({ label, events: [] });
    }
    groups[seen.get(label)!].events.push(e);
  });
  return groups;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
interface OrgCandidateTimelineCardProps {
  organizationId: string;
  delay?: number;
}

const OrgCandidateTimelineCard: React.FC<OrgCandidateTimelineCardProps> = ({
  organizationId,
  delay = 0,
}) => {
  const {
    data: events = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["orgCandidateTimeline", organizationId],
    queryFn: () => fetchOrgTimeline(organizationId),
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (error) toast.error("Failed to load org timeline.");
  }, [error]);

  const grouped = groupByDate(events);
  const todayCount = grouped.find((g) => g.label === "Today")?.events.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className="flex flex-col rounded-2xl border border-gray-100 bg-white overflow-hidden"
      style={{
        height: "100%",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-50 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "#f5f3ff" }}
            >
              <Activity className="h-3.5 w-3.5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 leading-none">
                Pipeline Activity
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-none">
                All candidate status timeline
              </p>
            </div>
          </div>

          {/* Today badge */}
          {todayCount > 0 && (
            <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-semibold text-emerald-700">
                {todayCount} today
              </span>
            </div>
          )}
        </div>

        {/* Mini stats row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Users className="h-3 w-3" />
            <span>{events.length} recent events</span>
          </div>
          <span className="text-gray-200">·</span>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Briefcase className="h-3 w-3" />
            <span>{new Set(events.map((e) => e.job_title).filter(Boolean)).size} roles</span>
          </div>
        </div>
      </div>

      {/* ── Timeline body ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-3 p-2 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5 pt-1">
                  <div className="h-2.5 w-3/5 bg-gray-100 rounded-full" />
                  <div className="h-2 w-2/5 bg-gray-50 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && events.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 pb-6">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
              <Activity className="h-5 w-5 text-gray-200" />
            </div>
            <p className="text-xs text-gray-400 font-medium">No pipeline activity yet</p>
            <p className="text-[10px] text-gray-300">Events will appear here as candidates move through the pipeline</p>
          </div>
        )}

        {/* Grouped timeline */}
        {!isLoading && grouped.length > 0 && (
          <div className="space-y-1">
            {grouped.map(({ label, events: groupEvents }) => (
              <div key={label}>
                {/* Date divider */}
                <div className="flex items-center gap-2 py-1.5 sticky top-[-12px] bg-white z-10">
                  <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-gray-50" />
                  <span className="text-[9px] text-gray-300">{groupEvents.length}</span>
                </div>

                {/* Events in this group */}
                <ul className="space-y-0.5">
                  {groupEvents.map((event, idx) => {
                    const meta = getEventMeta(event.event_type);
                    const palette = getAvatarPalette(event.candidate_name);
                    const isLast = idx === groupEvents.length - 1;

                    return (
                      <li key={event.id} className="relative">
                        {/* Connector line */}
                        {!isLast && (
                          <div className="absolute left-[15px] top-[30px] w-px h-[calc(100%-6px)] bg-gray-100" />
                        )}

                        <div className="flex items-start gap-2.5 py-2 px-2 rounded-xl hover:bg-gray-50/80 transition-colors duration-150 group cursor-default">
                          {/* Avatar circle with event badge */}
                          <div className="relative shrink-0">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold"
                              style={{
                                background: palette.bg,
                                color: palette.text,
                              }}
                            >
                              {getInitials(event.candidate_name)}
                            </div>
                            {/* Event type badge */}
                            <div
                              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center text-white ring-[1.5px] ring-white"
                              style={{ background: meta.iconBg }}
                            >
                              <span style={{ transform: "scale(0.7)", display: "flex" }}>
                                {meta.icon}
                              </span>
                            </div>
                          </div>

                          {/* Text content */}
                          <div className="flex-1 min-w-0">
                            {/* Row 1: name + status pill */}
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-[10px] font-semibold text-gray-800 truncate max-w-[120px]">
                                {event.candidate_name}
                              </span>
                              <span className="text-[9px] text-gray-400">{meta.verb}</span>
                              {event.new_state?.subStatusName && (
                                <span
                                  className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full leading-none shrink-0"
                                  style={{
                                    color: event.new_state.color || meta.iconBg,
                                    background: `${event.new_state.color || meta.iconBg}15`,
                                  }}
                                >
                                  {event.new_state.subStatusName}
                                </span>
                              )}
                            </div>

                            {/* Row 2: job + recruiter + time */}
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {event.job_title && (
                                <span className="flex items-center gap-1 text-[9px] text-gray-400 truncate max-w-[110px]">
                                  <Briefcase className="h-2.5 w-2.5 shrink-0" />
                                  {event.job_title}
                                </span>
                              )}
                              {event.created_by_name && (
                                <>
                                  <span className="text-gray-200 text-[9px]">·</span>
                                  <span className="text-[8px] text-gray-400 truncate max-w-[80px]">
                                    {event.created_by_name}
                                  </span>
                                </>
                              )}
                              <span className="text-[9px] text-gray-300 ml-auto shrink-0">
                                {formatDistanceToNow(new Date(event.created_at), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {/* {!isLoading && events.length > 0 && (
        <div className="shrink-0 px-4 py-2.5 border-t border-gray-50">
          <button className="w-full flex items-center justify-center gap-1.5 text-[10px] font-medium text-gray-400 hover:text-violet-600 transition-colors duration-150">
            <span>View full activity log</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )} */}
    </motion.div>
  );
};

export default OrgCandidateTimelineCard;