// src/components/RocketReachSearch/hooks/useRRRevealedIds.ts
// Mirrors useEnrichedCandidateIds — returns Set of rr_profile_ids this org has revealed.
// Used for "revealed" badge on table rows.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRRRevealedIds(organizationId: string | null | undefined) {
  const query = useQuery({
    queryKey: ["rr-revealed-ids", organizationId],
    queryFn: async () => {
      if (!organizationId) return [] as string[];
      const { data, error } = await supabase
        .from("candidate_reveal_log")
        .select("rr_profile_id")
        .eq("organization_id", organizationId)
        .not("rr_profile_id", "is", null);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.rr_profile_id as string).filter(Boolean);
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const revealedIds = new Set<number>(
    (query.data ?? []).map(id => parseInt(id, 10)).filter(n => !isNaN(n))
  );

  return {
    revealedIds,
    totalCount: revealedIds.size,
    isLoading:  query.isLoading,
    refetch:    query.refetch,
  };
}