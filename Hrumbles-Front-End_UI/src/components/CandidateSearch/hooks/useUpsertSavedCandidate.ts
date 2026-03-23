/**
 * useUpsertSavedCandidate.ts
 *
 * Mutation hook that calls the upsert-saved-candidate edge function.
 * Used by:
 *   - DetailPanelV2 (Shortlist button)
 *   - useManualContactSave (after manual entry)
 *   - CandidateInviteGate (after invite sent)
 *
 * Returns a stable `upsert` function + loading/error state.
 * On success, invalidates the saved candidates query so the count badge
 * and saved page both update immediately.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ApolloCandidate } from "../types";

export type SaveType = "enriched" | "manual_edit" | "shortlisted" | "invited";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface UpsertSavedCandidateParams {
  apolloPersonId:     string;
  organizationId:     string;
  savedBy:            string;
  saveType:           SaveType;
  // Snapshot — from search result, passed to populate the card
  candidate?:         ApolloCandidate;
  // Contact
  email?:             string;
  emailSource?:       "apollo_reveal" | "manual" | "crm";
  phone?:             string;
  phoneSource?:       "apollo_reveal" | "manual";
  // Context
  notes?:             string;
  tags?:              string[];
  linkedJobId?:       string;
  inviteId?:          string;
  status?:            "saved" | "contacted" | "in_progress" | "archived";
}

export interface UseUpsertSavedCandidateReturn {
  upsertStatus:   SaveStatus;
  savedId:        string | null;
  errorMessage:   string | null;
  upsert:         (params: UpsertSavedCandidateParams) => Promise<string | null>;
  resetUpsert:    () => void;
}

export const SAVED_CANDIDATES_QUERY_KEY = "saved-candidates";

export function useUpsertSavedCandidate(): UseUpsertSavedCandidateReturn {
  const [upsertStatus, setStatus]   = useState<SaveStatus>("idle");
  const [savedId,      setSavedId]  = useState<string | null>(null);
  const [errorMessage, setError]    = useState<string | null>(null);
  const queryClient = useQueryClient();

  const upsert = useCallback(async (params: UpsertSavedCandidateParams): Promise<string | null> => {
    setStatus("saving");
    setError(null);

    const c = params.candidate;
    const body: Record<string, any> = {
      apolloPersonId:     params.apolloPersonId,
      organizationId:     params.organizationId,
      savedBy:            params.savedBy,
      saveType:           params.saveType,
      email:              params.email,
      emailSource:        params.emailSource,
      phone:              params.phone,
      phoneSource:        params.phoneSource,
      notes:              params.notes,
      tags:               params.tags,
      linkedJobId:        params.linkedJobId,
      inviteId:           params.inviteId,
      status:             params.status,
    };

    // Attach snapshot from candidate if provided
    if (c) {
      body.snapshotName        = `${c.first_name} ${c.last_name_obfuscated}`.trim();
      body.snapshotTitle       = c.title ?? undefined;
      body.snapshotCompany     = c.organization?.name ?? undefined;
      body.snapshotRefreshedAt = c.last_refreshed_at ?? undefined;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "upsert-saved-candidate",
        { body }
      );

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error ?? "Upsert failed");

      setSavedId(data.savedId);
      setStatus("saved");

      // Invalidate saved candidates list + count badge
      queryClient.invalidateQueries({ queryKey: [SAVED_CANDIDATES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["saved-candidates-count"] });

      return data.savedId as string;
    } catch (e: any) {
      setError(e.message ?? "Failed to save candidate");
      setStatus("error");
      return null;
    }
  }, [queryClient]);

  const resetUpsert = useCallback(() => {
    setStatus("idle"); setSavedId(null); setError(null);
  }, []);

  return { upsertStatus, savedId, errorMessage, upsert, resetUpsert };
}