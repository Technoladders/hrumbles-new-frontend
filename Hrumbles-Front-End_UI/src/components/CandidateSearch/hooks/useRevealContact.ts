/**
 * useRevealContact.ts
 *
 * Manages the state for revealing email or phone for a single candidate.
 * Handles loading, success, error states and credit feedback.
 *
 * Used by ContactRevealSection inside DetailPanelV2.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export type RevealType   = "email" | "phone";
export type RevealStatus = "idle" | "loading" | "revealed" | "error" | "insufficient_credits";

export interface RevealEmailEntry {
  email:        string;
  email_status: string | null;
  source:       string | null;  // "work" | "personal" | "direct" | "apollo" | null
  is_primary:   boolean;
}

export interface RevealResult {
  revealType:       RevealType;
  email:            string | null;
  emailStatus:      string | null;
  allEmails:        RevealEmailEntry[];   // all emails returned by Apollo
  phone:            string | null;
  phoneStatus:      string | null;
  servedFromCache:  boolean;
  creditsCharged:   number;
  creditsRemaining: number | null;
  contactId:        string | null;
  snapshotName:     string | null;       // full unmasked name from Apollo
}

export interface UseRevealContactReturn {
  status:           RevealStatus;
  result:           RevealResult | null;
  errorMessage:     string | null;
  requiredCredits:  number | null;
  currentBalance:   number | null;
  reveal:           (type: RevealType) => Promise<void>;
  reset:            () => void;
}

interface RevealContactParams {
  apolloPersonId:  string;
  organizationId:  string;
  userId:          string;
  // Context — stored in cache for future enrichment
  firstName?:      string;
  lastName?:       string;
  title?:          string;
  currentCompany?: string;
}

export function useRevealContact(params: RevealContactParams): UseRevealContactReturn {
  const [status,          setStatus]          = useState<RevealStatus>("idle");
  const [result,          setResult]          = useState<RevealResult | null>(null);
  const [errorMessage,    setErrorMessage]    = useState<string | null>(null);
  const [requiredCredits, setRequiredCredits] = useState<number | null>(null);
  const [currentBalance,  setCurrentBalance]  = useState<number | null>(null);

  const queryClient = useQueryClient();

  const reveal = useCallback(async (type: RevealType) => {
    if (!params.apolloPersonId || !params.organizationId || !params.userId) {
      setErrorMessage("Missing required parameters");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    setRequiredCredits(null);
    setCurrentBalance(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "reveal-candidate-contact",
        {
          body: {
            apolloPersonId: params.apolloPersonId,
            revealType:     type,
            organizationId: params.organizationId,
            userId:         params.userId,
            firstName:      params.firstName,
            lastName:       params.lastName,
            title:          params.title,
            currentCompany: params.currentCompany,
          },
        }
      );

      if (error) {
        // Try to parse the error context for credit issues
        try {
          const ctx = (error as any).context;
          if (ctx?.status === 402) {
            const body = await ctx.json().catch(() => ({}));
            setRequiredCredits(body.required ?? null);
            setCurrentBalance(body.balance  ?? null);
            setStatus("insufficient_credits");
            setErrorMessage(body.message || "Insufficient credits");
            return;
          }
        } catch { /* ignore parse errors */ }
        throw new Error(error.message || "Reveal failed");
      }

      if (data?.error === "insufficient_credits") {
        setRequiredCredits(data.required ?? null);
        setCurrentBalance(data.balance   ?? null);
        setStatus("insufficient_credits");
        setErrorMessage(data.message || "Insufficient credits");
        return;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Unknown error from reveal function");
      }

      const revealResult: RevealResult = {
        revealType:       type,
        email:            data.email           ?? null,
        emailStatus:      data.emailStatus     ?? null,
        allEmails:        Array.isArray(data.allEmails) ? data.allEmails : [],
        phone:            data.phone           ?? null,
        phoneStatus:      data.phoneStatus     ?? null,
        servedFromCache:  data.servedFromCache ?? false,
        creditsCharged:   data.creditsCharged  ?? 0,
        creditsRemaining: data.creditsRemaining ?? null,
        contactId:        data.contactId       ?? null,
        snapshotName:     data.snapshotName    ?? null,
      };

      setResult(revealResult);
      setStatus("revealed");

      // Invalidate all queries that depend on this person's data
      queryClient.invalidateQueries({ queryKey: ["reveal-history"] });
      queryClient.invalidateQueries({ queryKey: ["apollo-cross-check"] });
      // Invalidate enrichment data so profile sections reload with new data
      queryClient.invalidateQueries({ queryKey: ["enrichment-data", params.apolloPersonId] });
      // Invalidate reveal cache row (DetailPanelV2 loads this on mount)
      queryClient.invalidateQueries({ queryKey: ["reveal-cache-row", params.apolloPersonId] });
      // Invalidate saved candidates (email/phone may have updated)
      queryClient.invalidateQueries({ queryKey: ["saved-candidates"] });

    } catch (err: any) {
      setErrorMessage(err.message || "Reveal failed. Please try again.");
      setStatus("error");
    }
  }, [params, queryClient]);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
    setRequiredCredits(null);
    setCurrentBalance(null);
  }, []);

  return {
    status,
    result,
    errorMessage,
    requiredCredits,
    currentBalance,
    reveal,
    reset,
  };
}