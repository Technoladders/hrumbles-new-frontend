/**
 * useSavedCandidates.ts
 *
 * Queries saved_candidates for this org with filtering, sorting, pagination.
 * Used by SavedCandidatesPage.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SAVED_CANDIDATES_QUERY_KEY } from "./useUpsertSavedCandidate";

export type SaveTypeFilter = "all" | "enriched" | "manual_edit" | "shortlisted" | "invited";
export type StatusFilter   = "all" | "saved" | "contacted" | "in_progress" | "archived";
export type SortOption     = "newest" | "oldest" | "name_az";

export interface SavedCandidate {
  id:                   string;
  organization_id:      string;
  saved_by:             string;
  apollo_person_id:     string;
  snapshot_name:        string | null;
  snapshot_title:       string | null;
  snapshot_company:     string | null;
  snapshot_location:    string | null;
  snapshot_refreshed_at:string | null;
  email:                string | null;
  email_source:         string | null;
  phone:                string | null;
  phone_source:         string | null;
  save_type:            string;
  notes:                string | null;
  tags:                 string[];
  linked_job_id:        string | null;
  invite_id:            string | null;
  status:               string;
  created_at:           string;
  updated_at:           string;
  // Joined
  hr_jobs?:             { id: string; title: string; job_id: string } | null;
  hr_employees?:        { first_name: string; last_name: string } | null;
}

export interface UseSavedCandidatesOptions {
  organizationId:   string | null | undefined;
  saveType?:        SaveTypeFilter;
  status?:          StatusFilter;
  jobId?:           string;
  folderId?:        string;           // filter to a specific folder
  search?:          string;
  tags?:            string[];
  sort?:            SortOption;
  page?:            number;
  perPage?:         number;
}

export interface UseSavedCandidatesReturn {
  candidates:   SavedCandidate[];
  totalCount:   number;
  isLoading:    boolean;
  error:        Error | null;
  refetch:      () => void;
}

export function useSavedCandidates({
  organizationId,
  saveType  = "all",
  status    = "all",
  jobId,
  folderId,
  search    = "",
  tags      = [],
  sort      = "newest",
  page      = 1,
  perPage   = 20,
}: UseSavedCandidatesOptions): UseSavedCandidatesReturn {

  const qk = [
    SAVED_CANDIDATES_QUERY_KEY, organizationId,
    saveType, status, jobId, folderId, search, tags.join(","), sort, page, perPage,
  ];

  const query = useQuery({
    queryKey: qk,
    queryFn:  async () => {
      if (!organizationId) return { data: [], count: 0 };

      let q = supabase
        .from("saved_candidates")
        .select(
          `*,
           hr_jobs(id, title, job_id),
           hr_employees!saved_candidates_saved_by_fkey(first_name, last_name)`,
          { count: "exact" }
        )
        .eq("organization_id", organizationId);

      // Folder filter — join through candidate_folder_members
      if (folderId) {
        // Get saved_candidate ids in this folder first, then filter
        const { data: members } = await supabase
          .from("candidate_folder_members")
          .select("saved_candidate_id")
          .eq("folder_id", folderId);
        const memberIds = (members || []).map((m: any) => m.saved_candidate_id);
        if (memberIds.length === 0) return { data: [], count: 0 };
        q = q.in("id", memberIds);
      }

      // Filters
      if (saveType !== "all")    q = q.eq("save_type", saveType);
      if (status   !== "all")    q = q.eq("status",    status);
      else                       q = q.neq("status",   "archived"); // default: hide archived
      if (jobId)                 q = q.eq("linked_job_id", jobId);
      if (search.trim()) {
        q = q.or(
          `snapshot_name.ilike.%${search}%,snapshot_title.ilike.%${search}%,snapshot_company.ilike.%${search}%,email.ilike.%${search}%`
        );
      }
      if (tags.length) {
        q = q.overlaps("tags", tags);
      }

      // Sort
      if (sort === "newest")  q = q.order("created_at", { ascending: false });
      if (sort === "oldest")  q = q.order("created_at", { ascending: true  });
      if (sort === "name_az") q = q.order("snapshot_name", { ascending: true, nullsFirst: false });

      // Pagination
      const from = (page - 1) * perPage;
      const to   = from + perPage - 1;
      q = q.range(from, to);

      const { data, error, count } = await q;

      // PGRST200 = relationship not found — FK migration (004b) not run yet.
      // Fall back to the same query WITHOUT the hr_employees join so the page
      // still works. The "Saved by" column will simply be empty.
      if (error?.code === "PGRST200") {
        console.warn(
          "[useSavedCandidates] hr_employees FK missing — run migration 004b. " +
          "Falling back to query without employee join."
        );
        let fallback = supabase
          .from("saved_candidates")
          .select(`*, hr_jobs(id, title, job_id)`, { count: "exact" })
          .eq("organization_id", organizationId);

        if (saveType !== "all")    fallback = fallback.eq("save_type", saveType);
        if (status   !== "all")    fallback = fallback.eq("status", status);
        else                       fallback = fallback.neq("status", "archived");
        if (jobId)                 fallback = fallback.eq("linked_job_id", jobId);
        if (search.trim())         fallback = fallback.or(
          `snapshot_name.ilike.%${search}%,snapshot_title.ilike.%${search}%,snapshot_company.ilike.%${search}%,email.ilike.%${search}%`
        );
        if (tags.length)           fallback = fallback.overlaps("tags", tags);
        if (sort === "newest")     fallback = fallback.order("created_at", { ascending: false });
        if (sort === "oldest")     fallback = fallback.order("created_at", { ascending: true  });
        if (sort === "name_az")    fallback = fallback.order("snapshot_name", { ascending: true, nullsFirst: false });
        fallback = fallback.range(from, to);

        const fb = await fallback;
        if (fb.error) throw fb.error;
        return { data: (fb.data || []) as SavedCandidate[], count: fb.count ?? 0 };
      }

      if (error) throw error;
      return { data: (data || []) as SavedCandidate[], count: count ?? 0 };
    },
    enabled:   !!organizationId,
    staleTime: 60 * 1000,
  });

  return {
    candidates: query.data?.data    ?? [],
    totalCount: query.data?.count   ?? 0,
    isLoading:  query.isLoading,
    error:      query.error as Error | null,
    refetch:    query.refetch,
  };
}

// ── Count hook for topbar badge ───────────────────────────────────────────────
export function useSavedCandidatesCount(
  organizationId: string | null | undefined
): { count: number; isLoading: boolean } {
  const q = useQuery({
    queryKey:  ["saved-candidates-count", organizationId],
    queryFn:   async () => {
      if (!organizationId) return 0;
      const { data, error } = await supabase.rpc(
        "get_saved_candidate_count", { p_org_id: organizationId }
      );
      if (error) throw error;
      return (data as number) ?? 0;
    },
    enabled:   !!organizationId,
    staleTime: 30 * 1000,
  });
  return { count: q.data ?? 0, isLoading: q.isLoading };
}