/**
 * useEnrichedCandidateIds.ts
 *
 * Returns two Sets of apollo_person_ids that this org has already touched:
 *
 *   revealedIds  — paid reveals (from candidate_reveal_log)
 *   manualIds    — manually entered email/phone (from candidate_reveal_cache
 *                  where manually_entered_by_org = orgId)
 *   allIds       — union of both (used for enriched-only filter)
 *
 * Used by:
 *   - CandidateSearchPage: when enriched toggle is on, filter results to allIds
 *   - Sidebar: show count badge on the Enriched toggle button
 *
 * Fetches ALL touched ids (not just current page) — small query, no pagination.
 * Cached for 2 minutes — reveal actions invalidate it via queryClient.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ENRICHED_IDS_QUERY_KEY = (orgId: string) =>
  ["enriched-candidate-ids", orgId] as const;

export interface UseEnrichedCandidateIdsReturn {
  revealedIds: Set<string>;
  manualIds:   Set<string>;
  allIds:      Set<string>;
  totalCount:  number;
  isLoading:   boolean;
  refetch:     () => void;
}

export function useEnrichedCandidateIds(
  organizationId: string | null | undefined
): UseEnrichedCandidateIdsReturn {

  // 1. Revealed ids from candidate_reveal_log (distinct per org)
  const revealedQuery = useQuery({
    queryKey: [...ENRICHED_IDS_QUERY_KEY(organizationId ?? ""), "revealed"],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("candidate_reveal_log")
        .select("apollo_person_id")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return (data || []).map((r: any) => r.apollo_person_id as string);
    },
    enabled:   !!organizationId,
    staleTime: 2 * 60 * 1000,
    gcTime:    5 * 60 * 1000,
  });

  // 2. Manually entered ids from candidate_reveal_cache (org-scoped)
  const manualQuery = useQuery({
    queryKey: [...ENRICHED_IDS_QUERY_KEY(organizationId ?? ""), "manual"],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from("candidate_reveal_cache")
        .select("apollo_person_id")
        .eq("manually_entered_by_org", organizationId!)
        // only rows where this org actually entered something
        .or("manually_entered_email.not.is.null,manually_entered_phone.not.is.null");
      if (error) throw error;
      return (data || []).map((r: any) => r.apollo_person_id as string);
    },
    enabled:   !!organizationId,
    staleTime: 2 * 60 * 1000,
    gcTime:    5 * 60 * 1000,
  });

  const revealedIds = new Set<string>(revealedQuery.data || []);
  const manualIds   = new Set<string>(manualQuery.data   || []);

  // Union both sets
  const allIds = new Set<string>([...revealedIds, ...manualIds]);

  return {
    revealedIds,
    manualIds,
    allIds,
    totalCount: allIds.size,
    isLoading:  revealedQuery.isLoading || manualQuery.isLoading,
    refetch:    () => { revealedQuery.refetch(); manualQuery.refetch(); },
  };
}