import React, { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  UserRoundPlus,
  Activity,
  Briefcase,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface TimelineEvent {
  id: string;
  event_type: string;
  new_state: { mainStatusName: string; subStatusName?: string; color?: string };
  created_at: string;
  candidate_name: string;
  job_title: string | null;
}

const BATCH_SIZE = 50;

const fetchTimelineEvents = async (employeeId: string) => {
  if (!employeeId) return [];

  const { data: candidates, error: candidatesError } = await supabase
    .from("hr_job_candidates")
    .select("id, name, job_id, hr_jobs:hr_jobs!hr_job_candidates_job_id_fkey(title)")
    .eq("created_by", employeeId);

  if (candidatesError) throw candidatesError;
  if (!candidates || candidates.length === 0) return [];

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
  const allEvents = results.flatMap((res) => (res.data || []) as any[]);

  allEvents.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const topEvents = allEvents.slice(0, 50);

  return topEvents.map((event) => {
    const candidate = candidates.find((c) => c.id === event.candidate_id);
    return {
      ...event,
      candidate_name: candidate?.name || "N/A",
      job_title: (candidate as any)?.hr_jobs?.title || null,
    };
  });
};

const getEventMeta = (type: string) => {
  switch (type) {
    case "status_change":
      return {
        icon: <ArrowRightLeft className="h-3 w-3" />,
        label: "Status updated",
        iconBg: "bg-violet-500",
      };
    case "candidate_added":
      return {
        icon: <UserRoundPlus className="h-3 w-3" />,
        label: "Added",
        iconBg: "bg-emerald-500",
      };
    default:
      return {
        icon: <Zap className="h-3 w-3" />,
        label: "Activity",
        iconBg: "bg-blue-500",
      };
  }
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export const CandidateTimelineCard: React.FC<{ employeeId: string }> = ({
  employeeId,
}) => {
  const {
    data: events = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["candidateTimeline", employeeId],
    queryFn: () => fetchTimelineEvents(employeeId),
    enabled: !!employeeId,
  });

  useEffect(() => {
    if (error) toast.error("Failed to load timeline.");
  }, [error]);

  return (
    <div
      className="flex flex-col rounded-2xl border border-gray-100 bg-white overflow-hidden"
      style={{
        height: "280px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-50">
            <Activity className="h-3.5 w-3.5 text-violet-500" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Candidate Timeline</span>
        </div>
        {events.length > 0 && (
          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {events.length} recent
          </span>
        )}
      </div>

      {/* ── Scrollable list ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-2 p-1">
            {[...Array(50)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-7 w-7 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 w-3/5 bg-gray-100 rounded-full" />
                  <div className="h-2 w-2/5 bg-gray-50 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && events.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center pb-4">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              <Activity className="h-4 w-4 text-gray-300" />
            </div>
            <p className="text-xs text-gray-400">No recent activity</p>
          </div>
        )}

        {/* Timeline items */}
        {!isLoading && events.length > 0 && (
          <ul className="space-y-1">
            {events.map((event, idx) => {
              const meta = getEventMeta(event.event_type);
              const avatarClass = getAvatarColor(event.candidate_name);
              const isLast = idx === events.length - 1;

              return (
                <li key={event.id} className="relative">
                  {/* connector line */}
                  {!isLast && (
                    <div className="absolute left-[13px] top-[28px] w-px h-[calc(100%-4px)] bg-gray-100" />
                  )}

                  <div className="flex items-start gap-2.5 py-1.5 px-1 rounded-xl hover:bg-gray-50 transition-colors duration-150 group">
                    {/* Avatar */}
                    <div
                      className={`relative shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold ${avatarClass}`}
                    >
                      {getInitials(event.candidate_name)}
                      {/* Event type badge */}
                      {/* <div
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full flex items-center justify-center text-white ring-1 ring-white ${meta.iconBg}`}
                      >
                        <span className="scale-75">{meta.icon}</span>
                      </div> */}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-gray-800 truncate max-w-[110px]">
                          {event.candidate_name}
                        </span>

                        {event.new_state?.subStatusName && (
                          <span
                            className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full leading-none shrink-0"
                            style={{
                              color: event.new_state.color || "#7c3aed",
                              backgroundColor: `${event.new_state.color || "#7c3aed"}15`,
                            }}
                          >
                            {event.new_state.subStatusName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        {event.job_title && (
                          <span className="flex items-center gap-1 text-[8px] text-gray-400 truncate max-w-[120px]">
                            <Briefcase className="h-2.5 w-2.5 shrink-0" />
                            {event.job_title}
                          </span>
                        )}
                        <span className="text-[8px] text-gray-300 shrink-0 ml-auto">
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
        )}
      </div>
    </div>
  );
};