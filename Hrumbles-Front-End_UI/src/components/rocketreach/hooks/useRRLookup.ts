// Hrumbles-Front-End_UI/src/components/rocketreach/hooks/useRRLookup.ts
// Fixed: reads organizationId + userId from Supabase session directly.
// No Redux selector — avoids the undefined org issue.

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RREmailEntry {
  email:      string;
  type:       string;
  grade:      string | null;
  smtp_valid: string | null;
  source:     string;
  is_primary: boolean;
}

export interface RRPhoneEntry {
  number:      string;
  type:        string;
  validity:    string;
  recommended: boolean;
  premium:     boolean;
  source:      string;
}

export interface RRJobHistoryEntry {
  start_date?:           string | null;
  end_date?:             string | null;
  company?:              string | null;
  company_name?:         string;
  company_linkedin_url?: string;
  department?:           string;
  title?:                string;
  is_current?:           boolean;
  description?:          string;
}

export interface RREducationEntry {
  major?:  string | null;
  school?: string | null;
  degree?: string | null;
  start?:  number | null;
  end?:    number | null;
}

export interface RRLookupResult {
  success:            boolean;
  servedFromCache:    boolean;
  rrProfileId:        string;
  contactId:          string | null;
  candidateProfileId: string | null;
  pathTaken:          string;
  creditsCharged:     number;
  creditsRemaining:   number;
  name:               string | null;
  title:              string | null;
  company:            string | null;
  location:           string | null;
  linkedinUrl:        string | null;
  profilePic:         string | null;
  connections:        number | null;
  email:              string | null;
  emailStatus:        string | null;
  allEmails:          RREmailEntry[];
  phone:              string | null;
  allPhones:          RRPhoneEntry[];
  jobHistory:         RRJobHistoryEntry[];
  education:          RREducationEntry[];
  skills:             string[];
}

export type RRLookupState = "idle" | "loading" | "success" | "error";

export interface RRLookupError {
  type:        "auth" | "credits" | "rateLimit" | "notFound" | "unknown";
  message:     string;
  statusCode?: number;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useRRLookup(rrProfileId: string | number | null) {
  const [state,  setState]  = useState<RRLookupState>("idle");
  const [result, setResult] = useState<RRLookupResult | null>(null);
  const [error,  setError]  = useState<RRLookupError | null>(null);

  const queryClient = useQueryClient();

  const lookup = useCallback(async () => {
    if (!rrProfileId) return;

    setState("loading");
    setError(null);
    setResult(null);

    // ── Get auth from Supabase session (reliable, no Redux path guessing) ──
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setError({ type: "auth", message: "No active session. Please log in." });
      setState("error");
      return;
    }

    const userId = session.user.id;

    // organizationId lives in user metadata — check common locations
    const organizationId =
      session.user.user_metadata?.organization_id   ??   // common location 1
      session.user.user_metadata?.hr_organization_id ??  // common location 2
      (session.user.app_metadata as any)?.organization_id ?? // app metadata
      null;

    if (!organizationId) {
      // Last resort: fetch from hr_employees by user id
      const { data: empRow } = await supabase
        .from("hr_employees")
        .select("organization_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!empRow?.organization_id) {
        setError({ type: "auth", message: "Could not resolve organization. Check hr_employees table." });
        setState("error");
        return;
      }

      return _doLookup(String(rrProfileId), empRow.organization_id, userId);
    }

    return _doLookup(String(rrProfileId), organizationId, userId);

    async function _doLookup(rrIdStr: string, orgId: string, uid: string) {
      const { data, error: fnError } = await supabase.functions.invoke(
        "rocketreach-lookup",
        { body: { rrProfileId: rrIdStr, organizationId: orgId, userId: uid } }
      );

      if (fnError) {
        let msg  = fnError.message ?? "Lookup failed.";
        let type: RRLookupError["type"] = "unknown";
        let statusCode: number | undefined;

        try {
          const ctx = (fnError as any).context;
          if (ctx) {
            statusCode = ctx.status;
            const body = await ctx.json().catch(() => ({}));
            msg = body?.error ?? msg;
            if (statusCode === 401 || statusCode === 403) { type = "auth";      msg = "Invalid RocketReach API key."; }
            if (statusCode === 402)                        { type = "credits";   msg = "Insufficient credits for this lookup."; }
            if (statusCode === 429)                        { type = "rateLimit"; msg = "Rate limit reached. Try again shortly."; }
            if (statusCode === 404)                        { type = "notFound";  msg = "Profile not found in RocketReach."; }
          }
        } catch { /* ignore parse errors */ }

        setError({ type, message: msg, statusCode });
        setState("error");
        return;
      }

      setResult(data as RRLookupResult);
      setState("success");

      // Invalidate queries so UI refreshes immediately
      queryClient.invalidateQueries({ queryKey: ["rr-enrichment-data",    rrIdStr] });
      queryClient.invalidateQueries({ queryKey: ["rr-reveal-cache",       rrIdStr] });
      queryClient.invalidateQueries({ queryKey: ["saved-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["saved-candidates-count"] });
    }

  }, [rrProfileId, queryClient]);

  const reset = useCallback(() => {
    setState("idle");
    setResult(null);
    setError(null);
  }, []);

  return { state, result, error, lookup, reset };
}