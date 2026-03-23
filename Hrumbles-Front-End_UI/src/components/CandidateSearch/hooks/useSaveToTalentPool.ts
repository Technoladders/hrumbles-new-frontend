/**
 * useSaveToTalentPool.ts
 *
 * Saves a revealed candidate to the org's hr_talent_pool via the
 * save-candidate-to-talent-pool edge function.
 * No credits charged — they already paid for the reveal.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ApolloCandidate } from "../types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseSaveToTalentPoolParams {
  apolloPersonId: string;
  organizationId: string;
  userId:         string;
}

export interface UseSaveToTalentPoolReturn {
  status:       SaveStatus;
  talentPoolId: string | null;
  errorMessage: string | null;
  save:         (candidate: ApolloCandidate) => Promise<void>;
}

export function useSaveToTalentPool(
  params: UseSaveToTalentPoolParams
): UseSaveToTalentPoolReturn {
  const [status,       setStatus]       = useState<SaveStatus>("idle");
  const [talentPoolId, setTalentPoolId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const save = useCallback(async (candidate: ApolloCandidate) => {
    if (!params.apolloPersonId || !params.organizationId) return;

    setStatus("saving");
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "save-candidate-to-talent-pool",
        {
          body: {
            apolloPersonId: params.apolloPersonId,
            organizationId: params.organizationId,
            userId:         params.userId,
            // Pass candidate context so function doesn't need to re-fetch
            candidateContext: {
              firstName:    candidate.first_name,
              lastName:     candidate.last_name_obfuscated,
              title:        candidate.title,
              companyName:  candidate.organization?.name,
              city:         candidate.has_city    ? "on_file" : null,
              state:        candidate.has_state   ? "on_file" : null,
              country:      candidate.has_country ? "on_file" : null,
            },
          },
        }
      );

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Save failed");

      setTalentPoolId(data.talentPoolId);
      setStatus("saved");

    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save to talent pool");
      setStatus("error");
    }
  }, [params]);

  return { status, talentPoolId, errorMessage, save };
}