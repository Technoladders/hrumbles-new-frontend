/**
 * useApolloIdCrossCheck.ts
 *
 * Given a list of Apollo person IDs from the current search page,
 * batch-checks the contacts table (NO org filter — entire platform)
 * to see if any contact already has that apollo_person_id.
 *
 * Also checks candidate_reveal_log to see if THIS org has already
 * revealed email/phone for any of these people.
 *
 * Returns:
 *   crossCheckMap: Map<apollo_person_id, CrossCheckResult>
 *   revealHistoryMap: Map<apollo_person_id, RevealHistory>
 *   isLoading: boolean
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CrossCheckResult {
  contactId:      string;
  organizationId: string;
  name:           string | null;
  hasEmail:       boolean;
  hasPhone:       boolean;
  email:          string | null;
  // We don't return the actual phone here — it's in the contacts table
  // and we don't want to expose other orgs' phone numbers
}

export interface RevealHistory {
  emailRevealed:  boolean;
  phoneRevealed:  boolean;
  revealedEmail:  string | null;
  revealedPhone:  string | null;
}

interface UseApolloIdCrossCheckReturn {
  crossCheckMap:    Map<string, CrossCheckResult>;
  revealHistoryMap: Map<string, RevealHistory>;
  isLoading:        boolean;
  refetch:          () => void;
}

export function useApolloIdCrossCheck(
  apolloPersonIds: string[],
  organizationId:  string | null | undefined
): UseApolloIdCrossCheckReturn {

  const ids = apolloPersonIds.filter(Boolean);

  // ── 1. Cross-check contacts table (whole platform) ───────────────────────
  const crossCheckQuery = useQuery({
    queryKey:  ["apollo-cross-check", ids.join(",")],
    queryFn:   async () => {
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, organization_id, name, email, mobile, apollo_person_id")
        .in("apollo_person_id", ids);
      if (error) throw error;
      return data || [];
    },
    enabled:   ids.length > 0,
    staleTime: 5 * 60 * 1000,   // 5 minutes — contacts don't change often
    gcTime:    10 * 60 * 1000,
  });

  // ── 2. Reveal history for this org ────────────────────────────────────────
  const revealHistoryQuery = useQuery({
    queryKey:  ["reveal-history", organizationId, ids.join(",")],
    queryFn:   async () => {
      if (!ids.length || !organizationId) return [];
      const { data, error } = await supabase.rpc(
        "get_reveal_history_for_org",
        { p_org_id: organizationId, p_apollo_ids: ids }
      );
      if (error) throw error;
      return data || [];
    },
    enabled:   ids.length > 0 && !!organizationId,
    staleTime: 60 * 1000,        // 1 minute — reveal history changes more often
    gcTime:    5 * 60 * 1000,
  });

  // ── Build maps ─────────────────────────────────────────────────────────────

  const crossCheckMap = new Map<string, CrossCheckResult>();
  for (const row of crossCheckQuery.data || []) {
    if (row.apollo_person_id) {
      crossCheckMap.set(row.apollo_person_id, {
        contactId:      row.id,
        organizationId: row.organization_id,
        name:           row.name,
        hasEmail:       !!row.email,
        hasPhone:       !!row.mobile,
        email:          row.email,
      });
    }
  }

  const revealHistoryMap = new Map<string, RevealHistory>();
  for (const row of revealHistoryQuery.data || []) {
    revealHistoryMap.set(row.apollo_person_id, {
      emailRevealed: row.email_revealed,
      phoneRevealed: row.phone_revealed,
      revealedEmail: row.revealed_email,
      revealedPhone: row.revealed_phone,
    });
  }

  const refetch = () => {
    crossCheckQuery.refetch();
    revealHistoryQuery.refetch();
  };

  return {
    crossCheckMap,
    revealHistoryMap,
    isLoading: crossCheckQuery.isLoading || revealHistoryQuery.isLoading,
    refetch,
  };
}