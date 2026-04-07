// src/components/RocketReachSearch/hooks/useRRUpsertSaved.ts
// Mirrors useUpsertSavedCandidate but for RocketReach source.
// Auth resolved from Supabase session.

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RRSaveType   = "enriched" | "manual_edit" | "shortlisted" | "invited";
export type RRSaveStatus = "idle" | "saving" | "saved" | "error";

export interface RRUpsertParams {
  rrProfileId:          string;
  saveType:             RRSaveType;
  snapshotName?:        string | null;
  snapshotTitle?:       string | null;
  snapshotCompany?:     string | null;
  snapshotLocation?:    string | null;
  email?:               string | null;
  emailSource?:         string;
  phone?:               string | null;
  phoneSource?:         string;
  notes?:               string;
  tags?:                string[];
  linkedJobId?:         string;
  inviteId?:            string;
  folderId?:            string;
  status?:              "saved" | "contacted" | "in_progress" | "archived";
  contactId?:           string | null;
  candidateProfileId?:  string | null;
}

async function resolveAuth(): Promise<{ organizationId: string; userId: string } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const userId = session.user.id;
  const orgFromMeta =
    session.user.user_metadata?.organization_id    ??
    session.user.user_metadata?.hr_organization_id ??
    (session.user.app_metadata as any)?.organization_id ?? null;
  if (orgFromMeta) return { organizationId: orgFromMeta, userId };
  const { data: emp } = await supabase
    .from("hr_employees").select("organization_id").eq("user_id", userId).maybeSingle();
  if (!emp?.organization_id) return null;
  return { organizationId: emp.organization_id, userId };
}

export function useRRUpsertSaved() {
  const [status,  setStatus]  = useState<RRSaveStatus>("idle");
  const [savedId, setSavedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const upsert = useCallback(async (params: RRUpsertParams): Promise<string | null> => {
    setStatus("saving");
    setSavedId(null);

    const auth = await resolveAuth();
    if (!auth) { setStatus("error"); return null; }

    const { data, error: fnError } = await supabase.functions.invoke("upsert-saved-candidate", {
      body: {
        rrProfileId:          params.rrProfileId,
        searchSource:         "rocketreach",
        candidateProfileId:   params.candidateProfileId ?? null,
        organizationId:       auth.organizationId,
        savedBy:              auth.userId,
        saveType:             params.saveType,
        snapshotName:         params.snapshotName,
        snapshotTitle:        params.snapshotTitle,
        snapshotCompany:      params.snapshotCompany,
        snapshotLocation:     params.snapshotLocation,
        email:                params.email ?? null,
        emailSource:          params.emailSource ?? null,
        phone:                params.phone ?? null,
        phoneSource:          params.phoneSource ?? null,
        notes:                params.notes,
        tags:                 params.tags,
        linkedJobId:          params.linkedJobId,
        inviteId:             params.inviteId,
        folderId:             params.folderId,
        status:               params.status,
        contactId:            params.contactId ?? null,
      },
    });

    if (fnError) { setStatus("error"); return null; }

    setSavedId(data?.savedId ?? null);
    setStatus("saved");

    queryClient.invalidateQueries({ queryKey: ["saved-candidates"] });
    queryClient.invalidateQueries({ queryKey: ["saved-candidates-count"] });

    return data?.savedId ?? null;
  }, [queryClient]);

  const reset = useCallback(() => { setStatus("idle"); setSavedId(null); }, []);
  return { status, savedId, upsert, reset };
}