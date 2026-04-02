import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Briefcase,
  FileSearch,
  Clock,
  UserPlus,
  Send,
  Eye,
  Inbox,
  TrendingUp,
  XCircle,
  CalendarCheck,
  Award,
  ArrowRightCircle,
  CheckCircle2,
  Loader2,
  GitBranch,
  User,
  Banknote,
  Building2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventKind =
  | "added_to_pool"
  | "added_to_job"
  | "status_change"
  | "invited"
  | "invite_opened"
  | "invite_applied"
  | "analysed"
  | "interview_scheduled"
  | "interview_cleared"
  | "interview_rejected"
  | "offer_issued"
  | "joined"
  | "rejected";

interface TimelineEvent {
  id: string;
  kind: EventKind;
  date: string;
  jobId?: string;
  jobTitle?: string;
  label: string;
  sublabel?: string;
  byName?: string;
  score?: number;
}

interface JobGroup {
  jobId: string;
  jobTitle: string;
  events: TimelineEvent[];
  firstDate: string;
}

// ─── Event visual config ──────────────────────────────────────────────────────

const EV: Record<
  EventKind,
  { icon: React.ElementType; color: string; bg: string; ring: string }
> = {
  added_to_pool:       { icon: UserPlus,        color: "text-emerald-600", bg: "bg-emerald-50",  ring: "ring-emerald-200" },
  added_to_job:        { icon: Building2,        color: "text-violet-600",  bg: "bg-violet-50",   ring: "ring-violet-200"  },
  status_change:       { icon: ArrowRightCircle, color: "text-blue-600",    bg: "bg-blue-50",     ring: "ring-blue-200"    },
  invited:             { icon: Send,             color: "text-indigo-600",  bg: "bg-indigo-50",   ring: "ring-indigo-200"  },
  invite_opened:       { icon: Eye,              color: "text-cyan-600",    bg: "bg-cyan-50",     ring: "ring-cyan-200"    },
  invite_applied:      { icon: Inbox,            color: "text-teal-600",    bg: "bg-teal-50",     ring: "ring-teal-200"    },
  analysed:            { icon: FileSearch,       color: "text-amber-600",   bg: "bg-amber-50",    ring: "ring-amber-200"   },
  interview_scheduled: { icon: CalendarCheck,    color: "text-purple-600",  bg: "bg-purple-50",   ring: "ring-purple-200"  },
  interview_cleared:   { icon: CheckCircle2,     color: "text-emerald-600", bg: "bg-emerald-50",  ring: "ring-emerald-200" },
  interview_rejected:  { icon: XCircle,          color: "text-red-500",     bg: "bg-red-50",      ring: "ring-red-200"     },
  offer_issued:        { icon: Banknote,         color: "text-green-600",   bg: "bg-green-50",    ring: "ring-green-200"   },
  joined:              { icon: Award,            color: "text-emerald-700", bg: "bg-emerald-100", ring: "ring-emerald-300" },
  rejected:            { icon: XCircle,          color: "text-red-500",     bg: "bg-red-50",      ring: "ring-red-200"     },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely coerce DB value (JSONB string or object) into a plain object */
const safeJson = (v: unknown): Record<string, any> => {
  if (!v) return {};
  if (typeof v === "object" && !Array.isArray(v)) return v as Record<string, any>;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return {}; }
  }
  return {};
};

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

const fmtDateTime = (d: string) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "";

const employeeName = (emp: any): string | undefined => {
  if (!emp) return undefined;
  const name = `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim();
  return name || undefined;
};

/** Deduplicate an array of objects by a key field */
const dedupeById = <T extends { id: string }>(arr: T[]): T[] => {
  const seen = new Set<string>();
  return arr.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

/** Build job title string from a joined hr_jobs object */
const buildJobTitle = (jobRow: any): { jobId: string; jobTitle: string } => {
  const jobId    = jobRow?.id    ?? "";
  const rawTitle = jobRow?.title ?? "Unknown Job";
  const jobCode  = jobRow?.job_id; // job_id is the display code column on hr_jobs
  return {
    jobId,
    jobTitle: jobCode ? `${rawTitle} (${jobCode})` : rawTitle,
  };
};

// ─── Map hr_candidate_timeline row → TimelineEvent ───────────────────────────

const parseTimelineRow = (
  row: any,
  jcInfo: { jobId: string; jobTitle: string }
): TimelineEvent | null => {
  const eventData = safeJson(row.event_data);
  const newState  = safeJson(row.new_state);
  const prevState = safeJson(row.previous_state);

  const action        = (eventData.action ?? "").toLowerCase();
  const round: string = eventData.round ?? "";
  const result        = (eventData.interview_result ?? "").toLowerCase();
  const mainStatus    = (newState.mainStatusName ?? "").toLowerCase();
  const subStatus     = (newState.subStatusName  ?? "").toLowerCase();

  const prevLabel = prevState.subStatusName ?? prevState.mainStatusName ?? "";
  const newLabel  = newState.subStatusName  ?? newState.mainStatusName  ?? "";
  const actor     = employeeName(row.hr_employees);

  // ── Candidate created / added to pipeline ────────────────────────────────
  if (action === "candidate created") {
    return {
      id: `tl-${row.id}`,
      kind: "added_to_job",
      date: row.created_at,
      ...jcInfo,
      label: "Added to Job",
      sublabel: newLabel || undefined,
      byName: actor,
    };
  }

  // ── Interview scheduled (has date, no result yet) ─────────────────────────
  if (round && eventData.interview_date && !result) {
    const parts = [
      eventData.interview_type      || undefined,
      eventData.interview_location  || undefined,
      eventData.interview_date
        ? `${eventData.interview_date}${eventData.interview_time ? " · " + eventData.interview_time : ""}`
        : undefined,
      eventData.interviewer_name    || undefined,
    ].filter(Boolean);

    return {
      id: `tl-${row.id}`,
      kind: "interview_scheduled",
      date: row.created_at,
      ...jcInfo,
      label: `${round} Interview Scheduled`,
      sublabel: parts.join("  ·  ") || undefined,
      byName: actor,
    };
  }

  // ── Interview result ──────────────────────────────────────────────────────
  if (round && result) {
    const cleared = result === "selected";
    return {
      id: `tl-${row.id}`,
      kind: cleared ? "interview_cleared" : "interview_rejected",
      date: row.created_at,
      ...jcInfo,
      label: `${round} ${cleared ? "Cleared ✓" : "Not Selected"}`,
      sublabel: eventData.interview_feedback || undefined,
      byName: actor,
    };
  }

  // ── Joined ───────────────────────────────────────────────────────────────
  if (mainStatus.includes("joined") || subStatus.includes("joined")) {
    const parts = [
      eventData.ctc        ? `CTC: ${eventData.ctc}` : undefined,
      eventData.joining_date ? `Joining: ${fmtDate(eventData.joining_date)}` : undefined,
    ].filter(Boolean);
    return {
      id: `tl-${row.id}`,
      kind: "joined",
      date: row.created_at,
      ...jcInfo,
      label: "Joined 🎉",
      sublabel: parts.join("  ·  ") || undefined,
      byName: actor,
    };
  }

  // ── Offer issued ─────────────────────────────────────────────────────────
  if (mainStatus.includes("offer") || subStatus.includes("offer")) {
    const parts = [
      eventData.ctc          ? `CTC: ${eventData.ctc}` : undefined,
      eventData.joining_date ? `Joining: ${fmtDate(eventData.joining_date)}` : undefined,
    ].filter(Boolean);
    return {
      id: `tl-${row.id}`,
      kind: "offer_issued",
      date: row.created_at,
      ...jcInfo,
      label: "Offer Issued",
      sublabel: parts.join("  ·  ") || undefined,
      byName: actor,
    };
  }

  // ── Rejected / declined ──────────────────────────────────────────────────
  if (
    mainStatus.includes("reject") || subStatus.includes("reject") ||
    mainStatus.includes("declined") || subStatus.includes("declined")
  ) {
    return {
      id: `tl-${row.id}`,
      kind: "rejected",
      date: row.created_at,
      ...jcInfo,
      label: "Rejected",
      sublabel:
        prevLabel && newLabel && prevLabel !== newLabel
          ? `${prevLabel} → ${newLabel}`
          : newLabel || undefined,
      byName: actor,
    };
  }

  // ── Generic status change ────────────────────────────────────────────────
  const extraParts = [
    eventData.client_budget   ? `Budget: ${eventData.client_budget}` : undefined,
    eventData.submission_date ? `Submitted: ${fmtDate(eventData.submission_date)}` : undefined,
  ].filter(Boolean);

  return {
    id: `tl-${row.id}`,
    kind: "status_change",
    date: row.created_at,
    ...jcInfo,
    label: newLabel || "Status Updated",
    sublabel: [
      prevLabel && newLabel && prevLabel !== newLabel
        ? `${prevLabel} → ${newLabel}`
        : undefined,
      ...extraParts,
    ].filter(Boolean).join("  ·  ") || undefined,
    byName: actor,
  };
};

// ─── Data hook ────────────────────────────────────────────────────────────────

const useFullTimeline = (
  candidateId: string,
  candidateEmail: string,
  talentPoolCreatedAt?: string
) =>
  useQuery<TimelineEvent[]>({
    queryKey: ["fullTimeline", candidateId, candidateEmail],
    enabled: !!candidateId,
    queryFn: async () => {
      const events: TimelineEvent[] = [];

      // ── STEP 1: Talent pool entry event ──────────────────────────────────
      if (talentPoolCreatedAt) {
        events.push({
          id: `pool-${candidateId}`,
          kind: "added_to_pool",
          date: talentPoolCreatedAt,
          label: "Added to Talent Pool",
        });
      }

      // ── STEP 2: Find all hr_job_candidates rows for this person ──────────
      //
      // We do TWO separate queries then merge+deduplicate.
      // Reason: A single .or("talent_id.eq.X,email.ilike.Y") can silently fail
      // when the email contains special chars, or when talent_id is null on some rows.
      //
      const JC_SELECT = "id, email, talent_id, hr_jobs!job_id(id, title, job_id)";

      // 2a. By talent_id (most reliable — direct FK link)
      const { data: byTalentId, error: errA } = await supabase
        .from("hr_job_candidates")
        .select(JC_SELECT)
        .eq("talent_id", candidateId);

      if (errA) console.error("[Timeline] hr_job_candidates by talent_id:", errA);

      // 2b. By email (fallback — catches candidates added before talent_id was set)
      let byEmail: any[] = [];
      if (candidateEmail) {
        const { data: emailRows, error: errB } = await supabase
          .from("hr_job_candidates")
          .select(JC_SELECT)
          .ilike("email", candidateEmail); // ilike for case-insensitive exact match

        if (errB) console.error("[Timeline] hr_job_candidates by email:", errB);
        byEmail = emailRows ?? [];
      }

      // 2c. Merge & deduplicate
      const allJobCandidates = dedupeById([
        ...(byTalentId ?? []),
        ...byEmail,
      ]);

      console.log("[Timeline] job candidates found:", allJobCandidates.length, allJobCandidates);

      if (allJobCandidates.length === 0) {
        // No job activity — just return the pool event (if any)
        return events;
      }

      // 2d. Build id → job info lookup  +  plain id list
      const jcJobMap = new Map<string, { jobId: string; jobTitle: string }>();
      const jobCandidateIds: string[] = [];

      for (const jc of allJobCandidates) {
        const jcInfo = buildJobTitle(jc.hr_jobs);
        jcJobMap.set(jc.id, jcInfo);
        jobCandidateIds.push(jc.id);
      }

      // ── STEP 3: hr_candidate_timeline ────────────────────────────────────
      //
      // FK: hr_candidate_timeline.candidate_id → hr_job_candidates.id
      // We join hr_employees via the created_by FK to get the actor's name.
      //
      const { data: timelineRows, error: errTL } = await supabase
        .from("hr_candidate_timeline")
        .select(
          `id,
           candidate_id,
           event_type,
           event_data,
           previous_state,
           new_state,
           created_at,
           hr_employees:created_by (first_name, last_name)`
        )
        .in("candidate_id", jobCandidateIds)
        .order("created_at", { ascending: true });

      if (errTL) console.error("[Timeline] hr_candidate_timeline:", errTL);
      console.log("[Timeline] timeline rows:", timelineRows?.length ?? 0, timelineRows);

      for (const row of timelineRows ?? []) {
        const jcInfo = jcJobMap.get(row.candidate_id);
        if (!jcInfo) {
          console.warn("[Timeline] no jcInfo for candidate_id:", row.candidate_id);
          continue;
        }
        const ev = parseTimelineRow(row, jcInfo);
        if (ev) events.push(ev);
      }

      // ── STEP 4: Resume analyses ───────────────────────────────────────────
      //
      // Two tables may hold analysis data depending on which flow was used:
      //   a) candidate_resume_analysis → candidate_id = hr_job_candidates.id
      //   b) resume_analysis           → candidate_id may also = hr_job_candidates.id
      //      (no FK constraint shown, but same ID space in practice)
      //

      // 4a. candidate_resume_analysis (primary table)
      const { data: analysisRows, error: errCA } = await supabase
        .from("candidate_resume_analysis")
        .select("candidate_id, job_id, updated_at, overall_score, hr_jobs!job_id(id, title, job_id)")
        .in("candidate_id", jobCandidateIds);

      if (errCA) console.error("[Timeline] candidate_resume_analysis:", errCA);
      console.log("[Timeline] candidate_resume_analysis rows:", analysisRows?.length ?? 0);

      const analysisEventIds = new Set<string>(); // track to avoid duplicates from table b

      for (const an of analysisRows ?? []) {
        const jcInfo = buildJobTitle(an.hr_jobs);
        const evId = `analysis-cra-${an.candidate_id}-${an.job_id}`;
        analysisEventIds.add(`${an.candidate_id}-${an.job_id}`);
        events.push({
          id: evId,
          kind: "analysed",
          date: an.updated_at,
          jobId:    jcInfo.jobId    || an.job_id,
          jobTitle: jcInfo.jobTitle,
          label: "Resume Analysed",
          score: an.overall_score ?? undefined,
        });
      }

      // 4b. resume_analysis (older / alternate flow)
      const { data: raRows, error: errRA } = await supabase
        .from("resume_analysis")
        .select("candidate_id, job_id, updated_at, overall_score, hr_jobs!job_id(id, title, job_id)")
        .in("candidate_id", jobCandidateIds);

      if (errRA) console.error("[Timeline] resume_analysis:", errRA);
      console.log("[Timeline] resume_analysis rows:", raRows?.length ?? 0);

      for (const an of raRows ?? []) {
        const dedupKey = `${an.candidate_id}-${an.job_id}`;
        if (analysisEventIds.has(dedupKey)) continue; // already have this from table a
        const jcInfo = buildJobTitle(an.hr_jobs);
        events.push({
          id: `analysis-ra-${an.candidate_id}-${an.job_id}`,
          kind: "analysed",
          date: an.updated_at,
          jobId:    jcInfo.jobId    || an.job_id,
          jobTitle: jcInfo.jobTitle,
          label: "Resume Analysed",
          score: an.overall_score ?? undefined,
        });
      }

      // ── STEP 5: Invites ───────────────────────────────────────────────────
      //
      // candidate_invites.candidate_id → hr_job_candidates.id
      // Also match by email in case the invite was sent before the candidate was linked.
      //

      // Build invite filters — must pass at least one
      const inviteOrParts: string[] = [];
      if (jobCandidateIds.length > 0)
        inviteOrParts.push(`candidate_id.in.(${jobCandidateIds.join(",")})`);
      if (candidateEmail)
        inviteOrParts.push(`candidate_email.ilike.${candidateEmail}`);

      if (inviteOrParts.length > 0) {
        const { data: invites, error: errInv } = await supabase
          .from("candidate_invites")
          .select("id, sent_at, opened_at, status, channel, hr_jobs!job_id(id, title, job_id)")
          .or(inviteOrParts.join(","));

        if (errInv) console.error("[Timeline] candidate_invites:", errInv);
        console.log("[Timeline] invites found:", invites?.length ?? 0);

        for (const inv of invites ?? []) {
          const jcInfo = buildJobTitle(inv.hr_jobs);

          if (inv.sent_at) {
            events.push({
              id: `inv-sent-${inv.id}`,
              kind: "invited",
              date: inv.sent_at,
              ...jcInfo,
              label: "Invite Sent",
              sublabel: inv.channel ? `via ${inv.channel}` : undefined,
            });
          }

          if (inv.opened_at) {
            events.push({
              id: `inv-opened-${inv.id}`,
              kind: "invite_opened",
              date: inv.opened_at,
              ...jcInfo,
              label: "Invite Opened",
            });
          }

          if (inv.status === "applied") {
            events.push({
              id: `inv-applied-${inv.id}`,
              kind: "invite_applied",
              date: inv.opened_at ?? inv.sent_at,
              ...jcInfo,
              label: "Applied via Invite",
            });
          }
        }
      }

      // ── STEP 6: Chronological sort ────────────────────────────────────────
      const sorted = events.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      console.log("[Timeline] total events assembled:", sorted.length);
      return sorted;
    },
  });

// ─── Score badge ──────────────────────────────────────────────────────────────

const ScorePip = ({ score }: { score: number }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white
      ${score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"}`}
  >
    <TrendingUp className="h-2.5 w-2.5" />
    {score}%
  </span>
);

// ─── Single event node ────────────────────────────────────────────────────────

const EventNode = ({
  event,
  isLast,
  nested = false,
}: {
  event: TimelineEvent;
  isLast: boolean;
  nested?: boolean;
}) => {
  const cfg    = EV[event.kind];
  const Icon   = cfg.icon;
  const sz     = nested ? "h-7 w-7" : "h-8 w-8";
  const iconSz = nested ? "h-3.5 w-3.5" : "h-4 w-4";
  const connLeft = nested ? "left-[13px]" : "left-[15px]";

  return (
    <div className="relative flex gap-3">
      {!isLast && (
        <div
          className={`absolute ${connLeft} top-7 bottom-0 w-px bg-gradient-to-b from-slate-200 to-transparent`}
        />
      )}

      {/* Icon bubble */}
      <div
        className={`relative z-10 mt-0.5 flex-shrink-0 grid place-items-center rounded-full
          ${sz} ${cfg.bg} ring-2 ${cfg.ring} shadow-sm`}
      >
        <Icon className={`${iconSz} ${cfg.color}`} />
      </div>

      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-semibold text-slate-800 ${nested ? "text-xs" : "text-sm"}`}>
            {event.label}
          </span>
          {event.score !== undefined && <ScorePip score={event.score} />}
        </div>

        {event.sublabel && (
          <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">{event.sublabel}</p>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {fmtDateTime(event.date)}
          </span>
          {event.byName && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <User className="h-2.5 w-2.5" />
              {event.byName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Job branch (collapsible) ─────────────────────────────────────────────────

const JobBranch = ({ group, isLast }: { group: JobGroup; isLast: boolean }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="relative flex gap-3">
      {/* Vertical connector to next branch */}
      {!isLast && (
        <div
          className={`absolute left-[15px] top-8 w-px bg-gradient-to-b from-violet-200 to-slate-100 transition-all duration-300 ${
            open ? "bottom-0" : "h-6"
          }`}
        />
      )}

      {/* Branch root icon */}
      <div className="relative z-10 mt-0.5 flex-shrink-0 grid h-8 w-8 place-items-center rounded-full bg-violet-600 shadow-md ring-2 ring-violet-300">
        <Briefcase className="h-4 w-4 text-white" />
      </div>

      {/* Branch content */}
      <div className="flex-1 min-w-0 pb-2">
        {/* Clickable header row */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2 mb-2 group text-left"
        >
          <span className="text-sm font-bold text-violet-700 leading-snug flex-1 truncate group-hover:text-violet-900 transition-colors">
            {group.jobTitle}
          </span>
          <Badge
            variant="secondary"
            className="text-[9px] h-4 px-1.5 bg-violet-100 text-violet-600 font-semibold shrink-0"
          >
            {group.events.length} event{group.events.length !== 1 ? "s" : ""}
          </Badge>
          <span className="shrink-0 text-violet-400 group-hover:text-violet-600 transition-colors">
            {open
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />
            }
          </span>
        </button>

        {/* Collapsible nested events */}
        {open && (
          <div className="ml-1 border-l-2 border-dashed border-violet-100 pl-4 space-y-0">
            {group.events.map((ev, idx) => (
              <EventNode
                key={ev.id}
                event={ev}
                isLast={idx === group.events.length - 1}
                nested
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface CandidateFullTimelineProps {
  candidateId: string;
  candidateEmail?: string;
  candidateName?: string;
  talentPoolCreatedAt?: string;
}

const CandidateFullTimeline = ({
  candidateId,
  candidateEmail = "",
  talentPoolCreatedAt,
}: CandidateFullTimelineProps) => {
  const { data: events = [], isLoading, error } = useFullTimeline(
    candidateId,
    candidateEmail,
    talentPoolCreatedAt
  );

  // Pool-level events (no job association)
  const poolEvents = useMemo(
    () => events.filter((e) => !e.jobId),
    [events]
  );

  // Group job-level events by jobId, sorted chronologically
  const jobGroups = useMemo<JobGroup[]>(() => {
    const map = new Map<string, JobGroup>();

    for (const ev of events) {
      if (!ev.jobId) continue;
      if (!map.has(ev.jobId)) {
        map.set(ev.jobId, {
          jobId: ev.jobId,
          jobTitle: ev.jobTitle ?? "Unknown Job",
          events: [],
          firstDate: ev.date,
        });
      }
      const g = map.get(ev.jobId)!;
      g.events.push(ev);
      if (new Date(ev.date) < new Date(g.firstDate)) g.firstDate = ev.date;
    }

    // Sort events inside each group
    for (const g of map.values()) {
      g.events.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }

    // Sort groups by their earliest event
    return [...map.values()].sort(
      (a, b) => new Date(a.firstDate).getTime() - new Date(b.firstDate).getTime()
    );
  }, [events]);

  const total = events.length;

  return (
    <Card className="border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
        <CardTitle className="text-lg font-bold text-slate-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2">
              <GitBranch className="h-5 w-5 text-violet-600" />
            </div>
            Candidate Timeline
          </div>
          {!isLoading && total > 0 && (
            <Badge
              variant="secondary"
              className="bg-violet-100 text-violet-700 text-xs font-bold h-6 px-2"
            >
              {total} events
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-y-auto max-h-[520px] p-5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            <p className="text-xs">Building timeline…</p>
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Clock className="h-8 w-8 text-slate-200" />
            <p className="text-sm font-medium text-slate-500">No activity yet</p>
            <p className="text-xs text-slate-400">
              Events will appear here as they occur
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Pool-level events (e.g. "Added to Talent Pool") */}
            {poolEvents.map((ev, idx) => (
              <EventNode
                key={ev.id}
                event={ev}
                isLast={idx === poolEvents.length - 1 && jobGroups.length === 0}
              />
            ))}

            {/* Divider between pool events and job branches */}
            {poolEvents.length > 0 && jobGroups.length > 0 && (
              <div className="flex gap-3 mb-1">
                <div className="ml-[15px] mr-[11px] flex-shrink-0">
                  <div className="h-4 w-px bg-slate-200 mx-auto" />
                </div>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 pb-1 self-end">
                  Job Activity
                </span>
              </div>
            )}

            {/* Per-job branches */}
            {jobGroups.map((group, idx) => (
              <JobBranch
                key={group.jobId}
                group={group}
                isLast={idx === jobGroups.length - 1}
              />
            ))}
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CandidateFullTimeline;
// full ui change