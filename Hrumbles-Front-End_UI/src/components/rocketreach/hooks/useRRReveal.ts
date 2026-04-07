// src/components/RocketReachSearch/hooks/useRRReveal.ts
// Manages reveal state for a single RR profile.
// Auth resolved from Supabase session (no Redux path guessing).
// Mirrors useRevealContact.ts pattern.

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RRLookupResult, RRLookupState, RRLookupError } from "../types";

export type { RRLookupResult, RRLookupState, RRLookupError };

export interface UseRRRevealReturn {
  state:   RRLookupState;
  result:  RRLookupResult | null;
  error:   RRLookupError | null;
  reveal:  () => Promise<RRLookupResult | null>;
  reset:   () => void;
}

// Resolves org + user from Supabase session — no Redux needed
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

export function useRRReveal(rrProfileId: string | number | null): UseRRRevealReturn {
  const [state,  setState]  = useState<RRLookupState>("idle");
  const [result, setResult] = useState<RRLookupResult | null>(null);
  const [error,  setError]  = useState<RRLookupError | null>(null);
  const queryClient = useQueryClient();

  const reveal = useCallback(async (): Promise<RRLookupResult | null> => {
    if (!rrProfileId) return null;
    setState("loading");
    setError(null);
    setResult(null);

    const auth = await resolveAuth();
    if (!auth) {
      setError({ type: "auth", message: "No active session. Please log in." });
      setState("error");
      return null;
    }

    const { data, error: fnError } = await supabase.functions.invoke("rocketreach-lookup", {
      body: { rrProfileId: String(rrProfileId), organizationId: auth.organizationId, userId: auth.userId },
    });

    if (fnError) {
      let msg = fnError.message ?? "Lookup failed.";
      let type: RRLookupError["type"] = "unknown";
      let statusCode: number | undefined;
      try {
        const ctx = (fnError as any).context;
        if (ctx) {
          statusCode = ctx.status;
          const body = await ctx.json().catch(() => ({}));
          msg = body?.error ?? msg;
          if (statusCode === 401 || statusCode === 403) { type = "auth";      msg = "Invalid RocketReach API key."; }
          if (statusCode === 402)                        { type = "credits";   msg = "Insufficient credits."; }
          if (statusCode === 429)                        { type = "rateLimit"; msg = "Rate limit reached."; }
          if (statusCode === 404)                        { type = "notFound";  msg = "Profile not found in RocketReach."; }
        }
      } catch { /* ignore */ }
      setError({ type, message: msg, statusCode });
      setState("error");
      return null;
    }

    const lookupResult = data as RRLookupResult;
    setResult(lookupResult);
    setState("success");

    // Invalidate queries that depend on this profile's data
    queryClient.invalidateQueries({ queryKey: ["rr-enrichment-data",   String(rrProfileId)] });
    queryClient.invalidateQueries({ queryKey: ["rr-reveal-cache",      String(rrProfileId)] });
    queryClient.invalidateQueries({ queryKey: ["saved-candidates"] });
    queryClient.invalidateQueries({ queryKey: ["saved-candidates-count"] });

    return lookupResult;
  }, [rrProfileId, queryClient]);

  const reset = useCallback(() => {
    setState("idle"); setResult(null); setError(null);
  }, []);

  return { state, result, error, reveal, reset };
}