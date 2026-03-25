/**
 * useManualContactSave.ts
 *
 * Allows recruiters to manually enter email/phone they found elsewhere
 * (e.g. LinkedIn) without paying for an Apollo reveal.
 *
 * Data is stored in candidate_reveal_cache with:
 *   manually_entered_email / manually_entered_phone
 *   manually_entered_by_org = organizationId (org-specific)
 *
 * Manual data is NEVER mixed with Apollo-revealed data.
 * Each is stored in separate columns and displayed separately.
 * No credit deduction — this is free input.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ApolloCandidate } from "../types";

export type ManualSaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseManualContactSaveReturn {
  status:       ManualSaveStatus;
  errorMessage: string | null;
  saveEmail:    (email: string) => Promise<void>;
  savePhone:    (phone: string) => Promise<void>;
  reset:        () => void;
}

interface ManualContactSaveParams {
  apolloPersonId: string;
  organizationId: string;
  userId:         string;
  candidate?:     ApolloCandidate;   // for snapshot fields in saved_candidates
}

export function useManualContactSave(
  params: ManualContactSaveParams
): UseManualContactSaveReturn {
  const [status,       setStatus]       = useState<ManualSaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const save = useCallback(
    async (field: "manually_entered_email" | "manually_entered_phone", value: string) => {
      if (!params.apolloPersonId || !params.organizationId) return;
      const trimmed = value.trim();
      if (!trimmed) return;

      setStatus("saving");
      setErrorMessage(null);

      try {
        // 1. Save to reveal cache (existing behaviour)
        const { data: existing } = await supabase
          .from("candidate_reveal_cache")
          .select("id")
          .eq("apollo_person_id", params.apolloPersonId)
          .maybeSingle();

        const cachePayload: Record<string, any> = {
          apollo_person_id:        params.apolloPersonId,
          [field]:                 trimmed,
          manually_entered_by_org: params.organizationId,
          manually_entered_at:     new Date().toISOString(),
          updated_at:              new Date().toISOString(),
        };

        if (existing) {
          const { error } = await supabase
            .from("candidate_reveal_cache")
            .update(cachePayload)
            .eq("apollo_person_id", params.apolloPersonId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("candidate_reveal_cache")
            .insert(cachePayload);
          if (error) throw error;
        }

        // 2. Upsert saved_candidates (fire-and-forget — non-fatal)
        const isEmail = field === "manually_entered_email";
        const c = params.candidate;
        supabase.functions.invoke("upsert-saved-candidate", {
          body: {
            apolloPersonId:     params.apolloPersonId,
            organizationId:     params.organizationId,
            savedBy:            params.userId,
            saveType:           "manual_edit",
            email:              isEmail  ? trimmed : undefined,
            emailSource:        isEmail  ? "manual" : undefined,
            phone:              !isEmail ? trimmed : undefined,
            phoneSource:        !isEmail ? "manual" : undefined,
            snapshotName:       c ? `${c.first_name} ${c.last_name_obfuscated}`.trim() : undefined,
            snapshotTitle:      c?.title       ?? undefined,
            snapshotCompany:    c?.organization?.name ?? undefined,
            snapshotRefreshedAt: c?.last_refreshed_at ?? undefined,
          },
        }).catch((e: any) => console.warn("[useManualContactSave] saved_candidates non-fatal:", e.message));

        setStatus("saved");

        // Refresh related queries
        queryClient.invalidateQueries({ queryKey: ["apollo-cross-check"] });
        queryClient.invalidateQueries({ queryKey: ["saved-candidates-count"] });
        queryClient.invalidateQueries({ queryKey: ["saved-candidates"] });

        setTimeout(() => setStatus("idle"), 2000);

      } catch (e: any) {
        setErrorMessage(e.message || "Save failed");
        setStatus("error");
      }
    },
    [params, queryClient]
  );

  const saveEmail = useCallback((email: string) => save("manually_entered_email", email), [save]);
  const savePhone = useCallback((phone: string) => save("manually_entered_phone", phone), [save]);
  const reset     = useCallback(() => { setStatus("idle"); setErrorMessage(null); }, []);

  return { status, errorMessage, saveEmail, savePhone, reset };
}