/**
 * DetailPanelV2.tsx
 *
 * New candidate detail panel with:
 * - Reveal email / phone (credit-gated)
 * - Manual email / phone entry (free)
 * - In-CRM badge
 * - Post-reveal invite (job invite or profile completion)
 * - Save to talent pool
 *
 * Portal-rendered — escapes layout z-index stacking.
 * Completely independent of the original DetailPanel.tsx.
 */

import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  X, Building2, MapPin, Calendar, Mail, Phone,
  Check, ExternalLink,
  Pencil, Loader2, AlertCircle,
  Send, UserCheck, Copy, Bookmark, BookmarkCheck, Star, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ApolloCandidate } from "../types";
import { CrossCheckResult, RevealHistory } from "../hooks/useApolloIdCrossCheck";
import { useRevealContact } from "../hooks/useRevealContact";
import { useManualContactSave } from "../hooks/useManualContactSave";
import { CandidateInviteGate } from "./CandidateInviteGate";
import { useSelector } from "react-redux";
import { useSaveToTalentPool } from "../hooks/useSaveToTalentPool";
import { useUpsertSavedCandidate } from "../hooks/useUpsertSavedCandidate";
import { useFolders } from "../hooks/useFolders";
import { useAddToFolder } from "../hooks/useAddToFolder";
import { useEnrichmentData } from "../hooks/useEnrichmentData";
import { FolderPickerModal } from "./FolderPickerModal";
import { EnrichedProfileSection } from "./EnrichedProfileSection";

// ─── Cache row shape ──────────────────────────────────────────────────────────
interface RevealCacheRow {
  email:                   string | null;
  email_status:            string | null;
  phone:                   string | null;
  phone_status:            string | null;
  manually_entered_email:  string | null;
  manually_entered_phone:  string | null;
  manually_entered_by_org: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-violet-200 text-violet-800", "bg-purple-200 text-purple-800",
  "bg-indigo-200 text-indigo-800", "bg-fuchsia-200 text-fuchsia-800",
  "bg-violet-300 text-violet-900", "bg-purple-100 text-purple-700",
];
const avatarColor = (id: string) =>
  AVATAR_COLORS[parseInt(id.replace(/\D/g, "").slice(-2) || "0") % AVATAR_COLORS.length];
const initials = (fn: string, ln: string) =>
  ((fn?.[0] || "") + (ln?.[0] || "")).toUpperCase();
const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
};

// ─── Section header ───────────────────────────────────────────────────────────
const SHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-2">{children}</p>
);

// ─── CopyButton ───────────────────────────────────────────────────────────────
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="ml-1 text-violet-400 hover:text-violet-600 transition-colors" title="Copy">
      {copied ? <Check size={10} strokeWidth={3} /> : <Copy size={10} />}
    </button>
  );
};

// ─── InlineEditInput — small inline edit field ────────────────────────────────
const InlineEditInput: React.FC<{
  value:       string;
  placeholder: string;
  onSave:      (v: string) => void;
  onCancel:    () => void;
  isSaving:    boolean;
}> = ({ value, placeholder, onSave, onCancel, isSaving }) => {
  const [val, setVal] = useState(value);
  return (
    <div className="flex items-center gap-1 mt-1">
      <input
        autoFocus
        type="text"
        value={val}
        placeholder={placeholder}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter")  onSave(val);
          if (e.key === "Escape") onCancel();
        }}
        className="flex-1 text-[11px] px-2 py-1 rounded-md border border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white text-slate-700"
      />
      <button
        onClick={() => onSave(val)}
        disabled={isSaving || !val.trim()}
        className="p-1 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
      >
        {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
      </button>
      <button
        onClick={onCancel}
        className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
      >
        <X size={10} />
      </button>
    </div>
  );
};

// ─── RevealButton — credit-gated reveal ──────────────────────────────────────
const RevealButton: React.FC<{
  type:      "email" | "phone";
  creditCost: number;
  onClick:   () => void;
  isLoading: boolean;
}> = ({ type, creditCost, onClick, isLoading }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold",
      "border transition-all",
      isLoading
        ? "bg-violet-50 border-violet-200 text-violet-400 cursor-not-allowed"
        : "bg-white border-violet-300 text-violet-600 hover:bg-violet-50 hover:border-violet-500",
    )}
  >
    {isLoading ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />}
    {isLoading ? "Revealing…" : `Reveal ${type === "email" ? "Email" : "Phone"}`}
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">
      {creditCost} cr
    </span>
  </button>
);

// ─── ContactField — single contact row with reveal / manual / display ────────
const ContactField: React.FC<{
  type:          "email" | "phone";
  icon:          React.ElementType;
  label:         string;
  creditCost:    number;
  // What we know
  apolloValue:   string | null;   // from Apollo reveal
  manualValue:   string | null;   // from manual entry (org-specific)
  existingValue: string | null;   // from contacts table (CRM)
  // Reveal state
  revealStatus:  "idle" | "loading" | "revealed" | "error" | "insufficient_credits";
  onReveal:      () => void;
  // Manual edit state
  onManualSave:  (v: string) => void;
  isSavingManual: boolean;
}> = ({
  type, icon: Icon, label, creditCost,
  apolloValue, manualValue, existingValue,
  revealStatus, onReveal,
  onManualSave, isSavingManual,
}) => {
  const [editingManual, setEditingManual] = useState(false);

  // Display priority: Apollo-revealed > CRM existing > manually-entered
  const displayValue = apolloValue || existingValue || manualValue;
  const isRevealed   = !!(apolloValue || existingValue);
  const isManualOnly = !isRevealed && !!manualValue;

  return (
    <div className="py-2 border-b border-violet-50 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon size={11} className={cn(
            isRevealed   ? "text-violet-500" :
            isManualOnly ? "text-amber-500"  : "text-slate-300"
          )} />
          <span className="text-[11px] text-slate-500">{label}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Show value if available */}
          {displayValue && (
            <span className={cn(
              "text-[11px] font-medium",
              isManualOnly && !isRevealed ? "text-amber-700" : "text-slate-700"
            )}>
              {displayValue}
              <CopyButton text={displayValue} />
              {isManualOnly && !isRevealed && (
                <span className="ml-1 text-[9px] text-amber-500">(manual)</span>
              )}
            </span>
          )}

          {/* Reveal button — show if not yet revealed from Apollo/CRM */}
          {!isRevealed && revealStatus === "idle" && (
            <RevealButton
              type={type}
              creditCost={creditCost}
              onClick={onReveal}
              isLoading={false}
            />
          )}
          {!isRevealed && revealStatus === "loading" && (
            <RevealButton type={type} creditCost={creditCost} onClick={() => {}} isLoading={true} />
          )}

          {/* Manual edit pencil — always available */}
          {!editingManual && revealStatus !== "loading" && (
            <button
              onClick={() => setEditingManual(true)}
              className="p-1 rounded hover:bg-violet-50 text-slate-400 hover:text-violet-500 transition-colors"
              title={`Manually enter ${label.toLowerCase()}`}
            >
              <Pencil size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Insufficient credits warning */}
      {revealStatus === "insufficient_credits" && (
        <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
          <AlertCircle size={10} className="text-amber-500 flex-shrink-0" />
          <span className="text-[10px] text-amber-700">Insufficient credits. Top up to reveal.</span>
        </div>
      )}

      {/* Error */}
      {revealStatus === "error" && (
        <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 border border-red-200">
          <AlertCircle size={10} className="text-red-500 flex-shrink-0" />
          <span className="text-[10px] text-red-700">Reveal failed. Try again.</span>
        </div>
      )}

      {/* Manual edit input */}
      {editingManual && (
        <InlineEditInput
          value={manualValue || ""}
          placeholder={type === "email" ? "Enter email address" : "Enter phone number"}
          onSave={(v) => { onManualSave(v); setEditingManual(false); }}
          onCancel={() => setEditingManual(false)}
          isSaving={isSavingManual}
        />
      )}
    </div>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface DetailPanelV2Props {
  candidate:        ApolloCandidate;
  crossCheckResult: CrossCheckResult | undefined;
  revealHistory:    RevealHistory    | undefined;
  organizationId:   string;
  onClose:          () => void;
  onRevealComplete?: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────
export const DetailPanelV2: React.FC<DetailPanelV2Props> = ({
  candidate: c,
  crossCheckResult,
  revealHistory,
  organizationId,
  onClose,
  onRevealComplete,
}) => {
  const userId     = useSelector((s: any) => s.auth.user?.id);
  const navigate   = useNavigate();
  const avCls      = avatarColor(c.id);
  const init       = initials(c.first_name, c.last_name_obfuscated);
  const org        = c.organization?.name || null;
  const hasLoc     = c.has_city || c.has_state || c.has_country;
  const hasPhone   = c.has_direct_phone === "Yes";

  const locDesc = [
    c.has_city    && "City",
    c.has_state   && "State",
    c.has_country && "Country",
  ].filter(Boolean).join(", ") || null;
  

  // ── State ──────────────────────────────────────────────────────────────────
  const [inviteOpen,       setInviteOpen]       = useState(false);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const queryClient = useQueryClient();

  // ── Shortlist / save hooks ─────────────────────────────────────────────────
  const { upsert: upsertSaved, upsertStatus: shortlistStatus } = useUpsertSavedCandidate();
  const { folders, createFolder }  = useFolders(organizationId, userId);
  const { addToFolder }            = useAddToFolder();

  const handleShortlist = async (folderId?: string | null) => {
    const savedId = await upsertSaved({
      apolloPersonId: c.id,
      organizationId,
      savedBy:        userId,
      saveType:       "shortlisted",
      candidate:      c,
      folderId:       folderId ?? undefined,
    });
    // If folderId provided, also insert folder member directly
    if (savedId && folderId) {
      await addToFolder(folderId, savedId, userId);
    }
  };

  // ── Load reveal cache on mount (gets manually-entered data for this org) ───
  // Also surfaces any Apollo-revealed data that pre-dates this session.
  const cacheKey = ["reveal-cache-row", c.id];
  const { data: cacheRow } = useQuery<RevealCacheRow | null>({
    queryKey: cacheKey,
    queryFn:  async () => {
      const { data } = await supabase
        .from("candidate_reveal_cache")
        .select(
          "email, email_status, phone, phone_status, " +
          "manually_entered_email, manually_entered_phone, manually_entered_by_org"
        )
        .eq("apollo_person_id", c.id)
        .maybeSingle();
      return (data as RevealCacheRow | null) ?? null;
    },
    staleTime: 60 * 1000,
  });

  // Manual values are org-specific — only show if entered by this org
  const manualEmail = (cacheRow?.manually_entered_by_org === organizationId)
    ? (cacheRow?.manually_entered_email ?? null)
    : null;
  const manualPhone = (cacheRow?.manually_entered_by_org === organizationId)
    ? (cacheRow?.manually_entered_phone ?? null)
    : null;

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const emailReveal = useRevealContact({
    apolloPersonId: c.id,
    organizationId,
    userId,
    firstName:      c.first_name,
    lastName:       c.last_name_obfuscated,
    title:          c.title ?? undefined,
    currentCompany: org ?? undefined,
  });

  const phoneReveal = useRevealContact({
    apolloPersonId: c.id,
    organizationId,
    userId,
    firstName:      c.first_name,
    lastName:       c.last_name_obfuscated,
    title:          c.title ?? undefined,
    currentCompany: org ?? undefined,
  });

  const manualSave = useManualContactSave({
    apolloPersonId: c.id,
    organizationId,
    userId,
  });

  const talentPool = useSaveToTalentPool({ apolloPersonId: c.id, organizationId, userId });

  // Load enrichment data — from reveal cache raw response or enrichment tables
  const { data: enrichment, isLoading: enrichLoading } = useEnrichmentData(c.id);

  // ── Derived contact values ─────────────────────────────────────────────────
  // Priority: just-revealed (Apollo) > history > CRM > cache row > manual entry
  const emailValue = (
    emailReveal.result?.email       ||
    revealHistory?.revealedEmail    ||
    crossCheckResult?.email         ||
    cacheRow?.email                 ||
    null
  );
  const phoneValue = (
    phoneReveal.result?.phone       ||
    revealHistory?.revealedPhone    ||
    cacheRow?.phone                 ||
    null
  );

  // Has anything we can invite with (revealed or manually entered)
  const hasAnyReveal = !!(emailValue || phoneValue || manualEmail || manualPhone);

  // The best email/phone to pre-fill in invite modal
  const inviteEmail = emailValue || manualEmail || undefined;
  const invitePhone = phoneValue || manualPhone || undefined;

  // Figure out reveal status for each field
  const emailStatus: "idle" | "loading" | "revealed" | "error" | "insufficient_credits" = (
    emailReveal.status === "loading"              ? "loading"              :
    emailReveal.status === "error"                ? "error"                :
    emailReveal.status === "insufficient_credits" ? "insufficient_credits" :
    !!(emailValue || revealHistory?.emailRevealed) ? "revealed"            : "idle"
  );

  const phoneStatus_: "idle" | "loading" | "revealed" | "error" | "insufficient_credits" = (
    phoneReveal.status === "loading"              ? "loading"              :
    phoneReveal.status === "error"                ? "error"                :
    phoneReveal.status === "insufficient_credits" ? "insufficient_credits" :
    !!(phoneValue || revealHistory?.phoneRevealed) ? "revealed"            : "idle"
  );

  // After reveal, refresh the cache row so it reflects the new data immediately
  const handleRevealComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: cacheKey });
    // Reload enrichment profile — reveal-candidate-contact populates enrichment tables
    queryClient.invalidateQueries({ queryKey: ["enrichment-data", c.id] });
    onRevealComplete?.();
  }, [queryClient, cacheKey, c.id, onRevealComplete]);

  // After manual save, refresh the cache row
  const handleManualEmailSave = useCallback(async (v: string) => {
    await manualSave.saveEmail(v);
    queryClient.invalidateQueries({ queryKey: cacheKey });
  }, [manualSave, queryClient, cacheKey]);

  const handleManualPhoneSave = useCallback(async (v: string) => {
    await manualSave.savePhone(v);
    queryClient.invalidateQueries({ queryKey: cacheKey });
  }, [manualSave, queryClient, cacheKey]);

  const handleEmailReveal = useCallback(async () => {
    await emailReveal.reveal("email");
    handleRevealComplete();
  }, [emailReveal, handleRevealComplete]);

  const handlePhoneReveal = useCallback(async () => {
    await phoneReveal.reveal("phone");
    handleRevealComplete();
  }, [phoneReveal, handleRevealComplete]);

  return createPortal(
    <>
      <style>{`
        @keyframes panelSlide {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-[998]" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[360px] bg-white z-[999] flex flex-col"
        style={{
          animation:  "panelSlide 0.18s cubic-bezier(0.4,0,0.2,1) both",
          boxShadow:  "-4px 0 32px rgba(109,40,217,0.12), -1px 0 0 rgba(139,92,246,0.15)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* DARK VIOLET HEADER */}
        <div
          className="flex-shrink-0 px-4 pt-4 pb-5"
          style={{ background: "linear-gradient(160deg, #4c1d95 0%, #5b21b6 60%, #6d28d9 100%)" }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-violet-300/70">Candidate</span>
              {crossCheckResult && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[9px] font-bold text-emerald-300">
                  <UserCheck size={9} /> In CRM
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="h-6 w-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={12} className="text-white/70" />
            </button>
          </div>

          {/* Avatar + name */}
          <div className="flex items-start gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold flex-shrink-0", avCls)}>
              {init}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className="text-[14px] font-bold text-white leading-tight">
                {c.first_name} {c.last_name_obfuscated}
              </h2>
              {c.title && (
                <p className="text-[11px] text-violet-200/80 mt-0.5 leading-snug line-clamp-2">{c.title}</p>
              )}
            </div>
          </div>

          {/* Quick meta pills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {org && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-violet-100 border border-white/10">
                <Building2 size={9} className="text-violet-300" /> {org}
              </span>
            )}
            {locDesc && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-violet-100 border border-white/10">
                <MapPin size={9} className="text-violet-300" /> {locDesc}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-violet-100 border border-white/10">
              <Calendar size={9} className="text-violet-300" /> {fmtDate(c.last_refreshed_at)}
            </span>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto">

          {/* CONTACT REVEAL */}
          <div className="px-4 py-3 border-b border-violet-100">
            <SHead>Contact</SHead>
            <ContactField
              type="email"
              icon={Mail}
              label="Email address"
              creditCost={1}
              apolloValue={emailReveal.result?.email ?? cacheRow?.email ?? null}
              manualValue={manualEmail}
              existingValue={revealHistory?.emailRevealed ? revealHistory.revealedEmail : (crossCheckResult?.email || null)}
              revealStatus={emailStatus}
              onReveal={handleEmailReveal}
              onManualSave={handleManualEmailSave}
              isSavingManual={manualSave.status === "saving"}
            />
            <ContactField
              type="phone"
              icon={Phone}
              label="Direct phone"
              creditCost={3}
              apolloValue={phoneReveal.result?.phone ?? cacheRow?.phone ?? null}
              manualValue={manualPhone}
              existingValue={revealHistory?.phoneRevealed ? revealHistory.revealedPhone : null}
              revealStatus={phoneStatus_}
              onReveal={handlePhoneReveal}
              onManualSave={handleManualPhoneSave}
              isSavingManual={manualSave.status === "saving"}
            />
          </div>

          {/* POST-REVEAL INVITE BAR — visible once any contact known */}
          {hasAnyReveal && (
            <div className="px-4 py-3 border-b border-violet-100 bg-violet-50/40">
              <SHead>Quick Actions</SHead>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setInviteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #5b21b6, #7c3aed)" }}
                >
                  <Send size={10} /> Invite to Job
                </button>
                <button
                  onClick={() => talentPool.save(c)}
                  disabled={talentPool.status === "saving" || talentPool.status === "saved"}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all",
                    talentPool.status === "saved"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-white border-violet-300 text-violet-600 hover:bg-violet-50"
                  )}
                >
                  {talentPool.status === "saving" ? <Loader2 size={10} className="animate-spin" /> :
                   talentPool.status === "saved"  ? <BookmarkCheck size={10} /> : <Bookmark size={10} />}
                  {talentPool.status === "saved" ? "Saved ✓" : "Talent Pool"}
                </button>
                {/* View in My Candidates */}
                <button
                  onClick={() => navigate("/search/candidates/saved")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-white border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-all"
                >
                  <ExternalLink size={10} /> My Candidates
                </button>
              </div>
            </div>
          )}

          {/* SHORTLIST — always visible (no reveal needed) */}
          {!hasAnyReveal && (
            <div className="px-4 py-3 border-b border-violet-100">
              <SHead>Quick Actions</SHead>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFolderPickerOpen(true)}
                  disabled={shortlistStatus === "saving" || shortlistStatus === "saved"}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all",
                    shortlistStatus === "saved"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-white border-violet-300 text-violet-600 hover:bg-violet-50"
                  )}
                >
                  {shortlistStatus === "saving" ? <Loader2 size={10} className="animate-spin" /> :
                   shortlistStatus === "saved"  ? <Check size={10} /> : <Star size={10} />}
                  {shortlistStatus === "saved" ? "Shortlisted ✓" : "Shortlist"}
                </button>
                <button
                  onClick={() => navigate("/search/candidates/saved")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-white border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-all"
                >
                  <ExternalLink size={10} /> My Candidates
                </button>
              </div>
            </div>
          )}

          {/* ORGANISATION */}
          {org && (
            <div className="px-4 py-3 border-b border-violet-100">
              <SHead>Organisation</SHead>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-violet-50 border border-violet-100">
                <div className="w-8 h-8 rounded-lg bg-white border border-violet-200 flex items-center justify-center text-[11px] font-bold text-violet-600 flex-shrink-0 shadow-sm">
                  {org[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-slate-800 leading-tight truncate">{org}</p>
                  {c.organization?.has_industry && (
                    <p className="text-[10px] text-violet-500 mt-0.5">Industry data available</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ENRICHED PROFILE DATA */}
          {/* Shows after reveal: social links, seniority, career history, org details */}
          {enrichLoading ? (
            <div className="px-4 py-5 flex items-center gap-2 text-[11px] text-slate-400 border-b border-violet-100">
              <Loader2 size={12} className="animate-spin text-violet-400" />
              Loading profile…
            </div>
          ) : enrichment ? (
            <EnrichedProfileSection data={enrichment} />
          ) : (
            /* No enrichment yet — show the data availability snapshot */
            <div className="px-4 py-3 border-b border-violet-100">
              <SHead>Data available</SHead>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Email",     ok: c.has_email                          },
                  { label: "Phone",     ok: c.has_direct_phone === "Yes"         },
                  { label: "Location",  ok: c.has_city || c.has_state || c.has_country },
                  { label: "Company",   ok: !!org                                },
                  { label: "Industry",  ok: !!c.organization?.has_industry       },
                  { label: "Headcount", ok: !!c.organization?.has_employee_count },
                ].map(({ label, ok }) => (
                  <div key={label} className={cn(
                    "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium border",
                    ok ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-slate-50 text-slate-400 border-slate-100"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", ok ? "bg-violet-500" : "bg-slate-300")} />
                    {label}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Reveal email or phone to load full profile — career history, social links, org details.
              </p>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div
          className="flex-shrink-0 px-4 py-2 border-t border-violet-100"
          style={{ background: "rgba(109,40,217,0.03)" }}
        >
          <p className="text-[9px] text-violet-400/70 text-center">
            Reveal costs: Email 1 cr · Phone 3 cr · All data from Apollo
          </p>
        </div>
      </div>

      {/* Invite gate — renders its own modals */}
      {inviteOpen && (
        <CandidateInviteGate
          candidateName={`${c.first_name} ${c.last_name_obfuscated}`}
          candidateEmail={inviteEmail}
          candidatePhone={invitePhone}
          candidate={c}
          apolloPersonId={c.id}
          organizationId={organizationId}
          userId={userId}
          onClose={() => setInviteOpen(false)}
          onInviteSent={() => setInviteOpen(false)}
        />
      )}

      {/* Folder picker — opens when Shortlist clicked */}
      {folderPickerOpen && (
        <FolderPickerModal
          folders={folders}
          onSelect={async (folderId) => {
            setFolderPickerOpen(false);
            await handleShortlist(folderId);
          }}
          onCreate={async (name) => {
            const id = await createFolder(name);
            if (id) {
              setFolderPickerOpen(false);
              await handleShortlist(id);
            }
          }}
          onSkip={async () => {
            setFolderPickerOpen(false);
            await handleShortlist(null);
          }}
          onClose={() => setFolderPickerOpen(false)}
          title="Shortlist Candidate"
          showSkip={true}
        />
      )}
    </>,
    document.body
  );
};