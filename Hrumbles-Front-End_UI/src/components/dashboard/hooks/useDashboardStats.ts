import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FunnelStage {
  stage: string;
  count: number;
  color: string;
}

export interface TopRecruiter {
  id: string;
  name: string;
  avatar_url: string | null;
  hires_count: number;
  submissions_count: number;
  acceptance_rate: number;
}

export interface TopJob {
  job_id: string;
  title: string;
  client_name: string;
  candidate_count: number;
  status: string;
}

export interface WeeklyActivity {
  day: string;
  submissions: number;
  interviews: number;
  offers: number;
  joins: number;
}

const stageColors: Record<string, string> = {
  Sourced: "#6366f1",
  Screened: "#8b5cf6",
  Submitted: "#a78bfa",
  Interview: "#f59e0b",
  Offered: "#10b981",
  Joined: "#06b6d4",
};

// ─────────────────────────────────────────────────────────────────────────────
// Hiring funnel — param: org_id (from hint)
// ─────────────────────────────────────────────────────────────────────────────
// Hrumbles-Front-End_UI\src\components\dashboard\hooks\useDashboardStats.ts

export function useFunnelData(organizationId: string) {
  return useQuery({
    queryKey: ["funnel-data", organizationId],
    queryFn: async () => {
      console.log("[useFunnelData] org_id:", organizationId);

      const { data, error } = await supabase.rpc("get_hiring_funnel_counts", {
        org_id: organizationId,
      });

      if (error) {
        console.error("[useFunnelData] error:", error);
        throw error;
      }

      console.log("[useFunnelData] raw response:", data);

      return ((data as any[]) || []).map((item: any) => ({
        stage: item.stage_name || "Unknown",
        count: Number(item.candidate_count || 0),
        color: item.stage_color || "#94a3b8",
      })) as FunnelStage[];
    },
    enabled: !!organizationId,
    retry: 1,
    staleTime: 60_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Top recruiters — param: org_id (from hint)
// ─────────────────────────────────────────────────────────────────────────────
export function useTopRecruiters(organizationId: string) {
  return useQuery({
    queryKey: ["top-recruiters", organizationId],
    queryFn: async () => {
      console.log("[useTopRecruiters] org_id:", organizationId);
      const { data, error } = await supabase.rpc("get_top_recruiter_of_month", {
        org_id: organizationId,
      });
      if (error) {
        console.error("[useTopRecruiters] error:", error);
        throw error;
      }
      console.log("[useTopRecruiters] response:", data);
      return ((data as any[]) || []).map((r: any) => ({
        id: r.id || r.user_id || r.employee_id || "",
        name: r.name || r.full_name || r.employee_name || "Unknown",
        avatar_url: r.avatar_url || r.profile_image || null,
        hires_count: Number(r.hires_count || r.hires || r.joined_count || 0),
        submissions_count: Number(r.submissions_count || r.submissions || 0),
        acceptance_rate: Number(r.acceptance_rate || 0),
      })) as TopRecruiter[];
    },
    enabled: !!organizationId,
    retry: 1,
    staleTime: 60_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Top jobs — param: org_id
// ─────────────────────────────────────────────────────────────────────────────
export function useTopJobs(organizationId: string) {
  return useQuery({
    queryKey: ["top-jobs", organizationId],
    queryFn: async () => {
      console.log("[useTopJobs] org_id:", organizationId);
      const { data, error } = await supabase.rpc("get_top_jobs_by_candidates", {
        org_id: organizationId,
      });
      if (error) {
        console.error("[useTopJobs] RPC error:", error);
        // Fallback: direct table query
        console.log("[useTopJobs] Trying direct table fallback...");
        const { data: fallback, error: fbErr } = await supabase
          .from("hr_jobs")
          .select("id, title, client:hr_clients(company_name), status")
          .eq("organization_id", organizationId)
          .in("status", ["active", "open", "published"])
          .limit(10);
        if (fbErr) {
          console.error("[useTopJobs] Fallback failed:", fbErr);
          return [];
        }
        return (fallback || []).map((j: any) => ({
          job_id: j.id,
          title: j.title || "Untitled",
          client_name: j.client?.company_name || "",
          candidate_count: 0,
          status: j.status || "active",
        }));
      }
      console.log("[useTopJobs] response:", data);
      return ((data as any[]) || []).map((j: any) => ({
        job_id: j.job_id || j.id || "",
        title: j.title || j.job_title || "Untitled",
        client_name: j.client_name || j.company_name || "",
        candidate_count: Number(j.candidate_count || j.candidates || j.count || 0),
        status: j.status || j.job_status || "active",
      })) as TopJob[];
    },
    enabled: !!organizationId,
    retry: 1,
    staleTime: 60_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly activity — param: org_id (from hint)
// ─────────────────────────────────────────────────────────────────────────────
export function useWeeklyActivity(organizationId: string) {
  return useQuery({
    queryKey: ["weekly-activity", organizationId],
    queryFn: async () => {
      console.log("[useWeeklyActivity] org_id:", organizationId);
      const { data, error } = await supabase.rpc("get_weekly_activity_summary", {
        org_id: organizationId,
      });
      if (error) {
        console.error("[useWeeklyActivity] error:", error);
        throw error;
      }
      console.log("[useWeeklyActivity] response:", data);
      return ((data as any[]) || []).map((d: any) => ({
        day: d.day || d.date || d.day_name || "",
        submissions: Number(d.submissions || 0),
        interviews: Number(d.interviews || 0),
        offers: Number(d.offers || 0),
        joins: Number(d.joins || d.joined || 0),
      })) as WeeklyActivity[];
    },
    enabled: !!organizationId,
    retry: 1,
    staleTime: 60_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hiring metrics — param: org_id (from hints)
// ─────────────────────────────────────────────────────────────────────────────
export function useHiringMetrics(organizationId: string) {
  const avgTimeQuery = useQuery({
    queryKey: ["avg-time-hire", organizationId],
    queryFn: async () => {
      console.log("[avgTimeToHire] org_id:", organizationId);
      const { data, error } = await supabase.rpc("get_avg_time_to_hire", {
        org_id: organizationId,
      });
      if (error) {
        console.error("[avgTimeToHire] error:", error);
        throw error;
      }
      console.log("[avgTimeToHire] response:", data);
      if (typeof data === "number") return data;
      if (Array.isArray(data) && data.length > 0) {
        return Number(data[0]?.avg_days ?? data[0]?.avg_time ?? data[0]?.days ?? 0);
      }
      if (data && typeof data === "object") {
        return Number((data as any).avg_days ?? (data as any).avg_time ?? 0);
      }
      return 0;
    },
    enabled: !!organizationId,
    retry: 1,
  });

  const offerRateQuery = useQuery({
    queryKey: ["offer-acceptance", organizationId],
    queryFn: async () => {
      console.log("[offerAcceptanceRate] org_id:", organizationId);
      const { data, error } = await supabase.rpc("get_offer_acceptance_rate", {
        org_id: organizationId,
      });
      if (error) {
        console.error("[offerAcceptanceRate] error:", error);
        throw error;
      }
      console.log("[offerAcceptanceRate] response:", data);
      if (typeof data === "number") return data;
      if (Array.isArray(data) && data.length > 0) {
        return Number(data[0]?.rate ?? data[0]?.acceptance_rate ?? 0);
      }
      if (data && typeof data === "object") {
        return Number((data as any).rate ?? (data as any).acceptance_rate ?? 0);
      }
      return 0;
    },
    enabled: !!organizationId,
    retry: 1,
  });

  return {
    avgTimeToHire: avgTimeQuery.data ?? 0,
    offerAcceptanceRate: offerRateQuery.data ?? 0,
    isLoading: avgTimeQuery.isLoading || offerRateQuery.isLoading,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini AI usage — direct table query
// ─────────────────────────────────────────────────────────────────────────────
export function useGeminiUsage(organizationId: string) {
  return useQuery({
    queryKey: ["gemini-usage", organizationId],
    queryFn: async () => {
      console.log("[useGeminiUsage] Fetching hr_gemini_usage_log");
      const { data, error } = await supabase
        .from("hr_gemini_usage_log")
        .select("input_tokens, output_tokens, usage_type")
        .eq("organization_id", organizationId);

      if (error) {
        console.error("[useGeminiUsage] error:", error);
        throw error;
      }
      console.log("[useGeminiUsage] rows:", data?.length);

      return (data || []).reduce(
        (acc: any, row: any) => ({
          total_input: acc.total_input + (Number(row.input_tokens) || 0),
          total_output: acc.total_output + (Number(row.output_tokens) || 0),
          total_calls: acc.total_calls + 1,
          by_type: {
            ...acc.by_type,
            [row.usage_type || "unknown"]:
              (acc.by_type[row.usage_type || "unknown"] || 0) + 1,
          },
        }),
        { total_input: 0, total_output: 0, total_calls: 0, by_type: {} }
      );
    },
    enabled: !!organizationId,
    retry: 1,
    staleTime: 60_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Active jobs count — direct table query
// ─────────────────────────────────────────────────────────────────────────────
export function useActiveJobsCount(organizationId: string) {
  return useQuery({
    queryKey: ["active-jobs-count", organizationId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("hr_jobs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("status", ["active", "open", "published"]);
      if (error) {
        console.error("[useActiveJobsCount] error:", error);
        throw error;
      }
      console.log("[useActiveJobsCount] count:", count);
      return count || 0;
    },
    enabled: !!organizationId,
    retry: 1,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline count — direct table query
// ─────────────────────────────────────────────────────────────────────────────
export function usePipelineCount(organizationId: string) {
  return useQuery({
    queryKey: ["pipeline-count", organizationId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("hr_job_candidates")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId);
      if (error) {
        console.error("[usePipelineCount] error:", error);
        throw error;
      }
      console.log("[usePipelineCount] count:", count);
      return count || 0;
    },
    enabled: !!organizationId,
    retry: 1,
  });
}