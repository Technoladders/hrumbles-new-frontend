// Hrumbles-Front-End_UI/src/components/rocketreach/hooks/useRRUpsertSavedCandidate.ts
// Standalone upsert hook for RocketReach candidates.
// Does NOT use or modify the existing useUpsertSavedCandidate (Apollo).
// Reads organizationId from Supabase session — no Redux selector needed.

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RRUpsertPayload {
  rrProfileId:           string;
  saveType:              "enriched" | "shortlisted" | "invited" | "manual_edit";
  snapshotName?:         string | null;
  snapshotTitle?:        string | null;
  snapshotCompany?:      string | null;
  snapshotLocation?:     string | null;
  email?:                string | null;
  emailSource?:          string;
  phone?:                string | null;
  phoneSource?:          string;
  notes?:                string;
  tags?:                 string[];
  linkedJobId?:          string;
  inviteId?:             string;
  folderId?:             string;
  contactId?:            string | null;
  candidateProfileId?:   string | null;
}

export type RRUpsertStatus = "idle" | "loading" | "success" | "error";

// ── Helper: resolve org + user from Supabase session ──────────────────────────

async function resolveAuth(): Promise<{ organizationId: string; userId: string } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const userId = session.user.id;

  // Try metadata locations in order
  const orgFromMeta =
    session.user.user_metadata?.organization_id    ??
    session.user.user_metadata?.hr_organization_id ??
    (session.user.app_metadata as any)?.organization_id ??
    null;

  if (orgFromMeta) return { organizationId: orgFromMeta, userId };

  // Fallback: look up hr_employees
  const { data: emp } = await supabase
    .from("hr_employees")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!emp?.organization_id) return null;
  return { organizationId: emp.organization_id, userId };
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useRRUpsertSavedCandidate() {
  const [status,  setStatus]  = useState<RRUpsertStatus>("idle");
  const [savedId, setSavedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const upsert = useCallback(async (payload: RRUpsertPayload) => {
    setStatus("loading");
    setSavedId(null);

    const auth = await resolveAuth();
    if (!auth) {
      console.error("[useRRUpsertSavedCandidate] Could not resolve auth.");
      setStatus("error");
      return null;
    }

    const { organizationId, userId } = auth;

    const body = {
      // Provider identity
      rrProfileId:          payload.rrProfileId,
      searchSource:         "rocketreach",
      candidateProfileId:   payload.candidateProfileId ?? null,
      // Auth
      organizationId,
      savedBy:              userId,
      // Save intent
      saveType:             payload.saveType,
      // Snapshot
      snapshotName:         payload.snapshotName,
      snapshotTitle:        payload.snapshotTitle,
      snapshotCompany:      payload.snapshotCompany,
      snapshotLocation:     payload.snapshotLocation,
      // Contact data
      email:                payload.email    ?? null,
      emailSource:          payload.emailSource ?? null,
      phone:                payload.phone    ?? null,
      phoneSource:          payload.phoneSource ?? null,
      // Optional
      notes:                payload.notes,
      tags:                 payload.tags,
      linkedJobId:          payload.linkedJobId,
      inviteId:             payload.inviteId,
      folderId:             payload.folderId,
      contactId:            payload.contactId ?? null,
    };

    const { data, error: fnError } = await supabase.functions.invoke(
      "upsert-saved-candidate",
      { body }
    );

    if (fnError) {
      console.error("[useRRUpsertSavedCandidate] Edge function error:", fnError);
      setStatus("error");
      return null;
    }

    setSavedId(data?.savedId ?? null);
    setStatus("success");

    // Refresh saved candidates list + badge
    queryClient.invalidateQueries({ queryKey: ["saved-candidates"] });
    queryClient.invalidateQueries({ queryKey: ["saved-candidates-count"] });

    return data?.savedId ?? null;
  }, [queryClient]);

  const reset = useCallback(() => {
    setStatus("idle");
    setSavedId(null);
  }, []);

  return { status, savedId, upsert, reset };
}