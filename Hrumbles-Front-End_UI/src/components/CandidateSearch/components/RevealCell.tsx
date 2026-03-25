/**
 * RevealCell.tsx
 *
 * Shared reveal cell used in:
 *  - SavedCandidatesPage table rows
 *  - SavedCandidateDetailPanel
 *  - DetailPanelV2 (via ContactField wrapper — to be wired)
 *
 * Handles:
 *  - Immediate email reveal (synchronous)
 *  - Async phone reveal (Apollo webhooks in ~1-5 mins)
 *    → Shows "Verifying..." with spinner
 *    → Polls candidate_reveal_cache every 8s for up to 8 mins
 *    → Shows phone once webhook delivers it
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mail, Phone, Eye, Loader2, Check, Copy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { SAVED_CANDIDATES_QUERY_KEY } from "../hooks/useUpsertSavedCandidate";

export interface RevealCellProps {
  type:           "email" | "phone";
  apolloPersonId: string;
  organizationId: string;
  userId:         string;
  savedValue:     string | null;
  onRevealed:     (type: "email" | "phone", value: string) => void;
  // Optional: compact mode for table rows, full for panel
  compact?:       boolean;
}

const CREDIT_COST = { email: 1, phone: 3 };
const POLL_INTERVAL_MS = 8_000;    // 8 seconds
const POLL_MAX_ATTEMPTS = 60;      // 8s × 60 = 8 minutes max

// ─── Copy button ──────────────────────────────────────────────────────────────
const CopyBtn: React.FC<{ text: string }> = ({ text }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="ml-1 text-slate-300 hover:text-violet-500 transition-colors flex-shrink-0"
    >
      {done ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
    </button>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const RevealCell: React.FC<RevealCellProps> = ({
  type, apolloPersonId, organizationId, userId, savedValue, onRevealed, compact = true,
}) => {
  type Status = "idle" | "loading" | "pending" | "done" | "error";

  const [status,  setStatus]  = useState<Status>("idle");
  const [current, setCurrent] = useState<string | null>(savedValue);
  const queryClient           = useQueryClient();
  const pollRef               = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount             = useRef(0);

  // If parent passes an updated savedValue (e.g. from revealedOverrides), sync it
  useEffect(() => {
    if (savedValue && savedValue !== current) {
      setCurrent(savedValue);
      setStatus("done");
      stopPolling();
    }
  }, [savedValue]); // eslint-disable-line

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    pollCount.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  // Poll candidate_reveal_cache for phone until it arrives
  const startPhonePolling = useCallback(() => {
    pollCount.current = 0;
    pollRef.current = setInterval(async () => {
      pollCount.current += 1;
      console.log(`[RevealCell] polling phone for ${apolloPersonId} (attempt ${pollCount.current})`);

      try {
        const { data } = await supabase
          .from("candidate_reveal_cache")
          .select("phone, phone_pending_at")
          .eq("apollo_person_id", apolloPersonId)
          .maybeSingle();

        if (data?.phone && !data.phone_pending_at) {
          // Webhook delivered the phone
          setCurrent(data.phone);
          setStatus("done");
          onRevealed("phone", data.phone);
          queryClient.invalidateQueries({ queryKey: [SAVED_CANDIDATES_QUERY_KEY] });
          queryClient.invalidateQueries({ queryKey: ["enrichment-data", apolloPersonId] });
          stopPolling();
          console.log(`[RevealCell] phone received: ${data.phone}`);
        } else if (pollCount.current >= POLL_MAX_ATTEMPTS) {
          // Timed out — allow retry
          setStatus("error");
          stopPolling();
          console.warn(`[RevealCell] phone poll timed out for ${apolloPersonId}`);
        }
      } catch (e) {
        console.warn("[RevealCell] poll error:", e);
      }
    }, POLL_INTERVAL_MS);
  }, [apolloPersonId, onRevealed, queryClient, stopPolling]);

  const reveal = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus("loading");

    try {
      const { data, error } = await supabase.functions.invoke("reveal-candidate-contact", {
        body: { apolloPersonId, revealType: type, organizationId, userId },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error ?? "Reveal failed");

      // Handle response
      if (type === "email") {
        const val: string | null = data.email;
        if (val) {
          setCurrent(val); setStatus("done");
          onRevealed("email", val);
          queryClient.invalidateQueries({ queryKey: [SAVED_CANDIDATES_QUERY_KEY] });
          queryClient.invalidateQueries({ queryKey: ["enrichment-data", apolloPersonId] });
          queryClient.invalidateQueries({ queryKey: ["reveal-cache-row", apolloPersonId] });
        } else {
          setStatus("error");
        }
      } else {
        // Phone
        if (data.phone) {
          // Got it synchronously (rare but possible on some Apollo plans)
          setCurrent(data.phone); setStatus("done");
          onRevealed("phone", data.phone);
          queryClient.invalidateQueries({ queryKey: [SAVED_CANDIDATES_QUERY_KEY] });
          queryClient.invalidateQueries({ queryKey: ["enrichment-data", apolloPersonId] });
        } else if (data.phonePending) {
          // Normal async flow — Apollo webhook will deliver it
          setStatus("pending");
          startPhonePolling();
        } else {
          setStatus("error");
        }
      }
    } catch {
      setStatus("error");
    }
  }, [apolloPersonId, organizationId, userId, type, onRevealed, queryClient, startPhonePolling]);

  const Icon = type === "email" ? Mail : Phone;

  // ── Already have value ─────────────────────────────────────────────────────
  if (current) {
    return (
      <div className="flex items-center gap-1 min-w-0">
        <Icon size={10} className="text-violet-400 flex-shrink-0" />
        <span className={cn(
          "text-slate-700 font-medium truncate",
          compact ? "text-[11px] max-w-[155px]" : "text-[12px] max-w-[200px]"
        )}>
          {current}
        </span>
        <CopyBtn text={current} />
      </div>
    );
  }

  // ── Phone pending (async — polling) ───────────────────────────────────────
  if (status === "pending") {
    return (
      <div className={cn(
        "flex items-center gap-1.5 text-violet-500",
        compact ? "text-[10px]" : "text-[11px]"
      )}>
        <Loader2 size={compact ? 9 : 11} className="animate-spin flex-shrink-0" />
        <span className="font-medium">Verifying phone…</span>
        <Clock size={compact ? 8 : 9} className="text-violet-300 flex-shrink-0" />
        <span className="text-[9px] text-violet-300">~2 min</span>
      </div>
    );
  }

  // ── Reveal button ─────────────────────────────────────────────────────────
  return (
    <button
      onClick={reveal}
      disabled={status === "loading"}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md font-semibold border transition-all whitespace-nowrap",
        compact ? "text-[10px]" : "text-[11px]",
        status === "error"
          ? "border-red-200 bg-red-50 text-red-600"
          : status === "loading"
          ? "border-violet-200 bg-violet-50 text-violet-400 cursor-not-allowed"
          : "border-violet-200 bg-white text-violet-600 hover:bg-violet-50 hover:border-violet-400"
      )}
    >
      {status === "loading"
        ? <Loader2 size={compact ? 9 : 10} className="animate-spin" />
        : <Eye size={compact ? 9 : 10} />
      }
      {status === "loading"
        ? "Revealing…"
        : status === "error"
        ? "Retry"
        : `Reveal · ${CREDIT_COST[type]}cr`
      }
    </button>
  );
};