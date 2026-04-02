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
  Send, UserCheck, Copy, Bookmark, BookmarkCheck, Star, Eye,
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
interface EmailEntry {
  email:        string;
  email_status: string | null;
  source:       string | null;
  is_primary:   boolean;
}

interface RevealCacheRow {
  email:                   string | null;
  email_status:            string | null;
  all_emails:              EmailEntry[] | null;
  phone:                   string | null;
  phone_status:            string | null;
  manually_entered_email:  string | null;
  manually_entered_phone:  string | null;
  manually_entered_by_org: string | null;
  snapshot_name:           string | null;
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

// ─── EmailSourceBadge ─────────────────────────────────────────────────────────
const EMAIL_SOURCE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  work:         { label: "Work",     bg: "#EFF6FF", color: "#1D4ED8" },
  personal:     { label: "Personal", bg: "#F0FDF4", color: "#166534" },
  direct:       { label: "Direct",   bg: "#EDE9FE", color: "#6D28D9" },
  extrapolated: { label: "Guessed",  bg: "#FEF9C3", color: "#854D0E" },
  apollo:       { label: "Apollo",   bg: "#F3F4F6", color: "#374151" },
};
const EMAIL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  verified:     { label: "✓ Verified",    color: "#166534" },
  extrapolated: { label: "~ Guessed",     color: "#854D0E" },
  guessed:      { label: "~ Guessed",     color: "#854D0E" },
};

// EmailSourceBadge — shows only verification status (not source type)
const EmailSourceBadge: React.FC<{ source: string | null; status: string | null }> = ({ source: _source, status }) => {
  const sts = status ? EMAIL_STATUS_CONFIG[status.toLowerCase()] || null : null;
  if (!sts) return null;
  return (
    <span className="text-[9px] font-semibold flex-shrink-0" style={{ color: sts.color }}>
      {sts.label}
    </span>
  );
};

// ─── MultiEmailDisplay — shows all revealed emails with source badges ─────────
const MultiEmailDisplay: React.FC<{
  emails:         { email: string; email_status: string | null; source: string | null; is_primary: boolean }[];
  manualEmail:    string | null;
  onManualSave:   (v: string) => void;
  isSavingManual: boolean;
  revealStatus:   "idle" | "loading" | "revealed" | "error" | "insufficient_credits";
  onReveal:       () => void;
  onInvite?:      (email: string) => void;
}> = ({ emails, manualEmail, onManualSave, isSavingManual, revealStatus, onReveal, onInvite }) => {
  const [editingManual, setEditingManual] = useState(false);
  const hasEmails = emails.length > 0 || !!manualEmail;

  return (
    <div className="py-2 border-b border-violet-50 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Mail size={11} className={cn(
            hasEmails ? "text-violet-500" : "text-slate-300"
          )} />
          <span className="text-[11px] text-slate-500">Email address</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!hasEmails && revealStatus === "idle" && (
            <RevealButton type="email" onClick={onReveal} isLoading={false} />
          )}
          {!hasEmails && revealStatus === "loading" && (
            <RevealButton type="email" onClick={() => {}} isLoading={true} />
          )}
          {!editingManual && (
            <button onClick={() => setEditingManual(true)}
              className="p-1 rounded hover:bg-violet-50 text-slate-400 hover:text-violet-500 transition-colors"
              title="Add email manually">
              <Pencil size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Multiple email rows */}
      {emails.map((entry, i) => (
        <div key={i} className={cn(
          "flex items-center justify-between gap-2 px-2 py-1 rounded-md mb-1",
          entry.is_primary ? "bg-violet-50/60" : "bg-slate-50/60"
        )}>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {entry.is_primary && (
              <span className="text-[8px] font-bold text-violet-400 uppercase tracking-wide flex-shrink-0">Primary</span>
            )}
            <span className="text-[11px] font-medium text-slate-700 truncate">{entry.email}</span>
            <CopyButton text={entry.email} />
            <EmailSourceBadge source={entry.source} status={entry.email_status} />
          </div>
          {onInvite && (
            <button
              onClick={() => onInvite(entry.email)}
              title={`Invite using ${entry.email}`}
              className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border border-violet-200 bg-white text-violet-600 hover:bg-violet-50 transition-colors">
              <Send size={8} /> Invite
            </button>
          )}
        </div>
      ))}

      {/* Manual email if present and not already in the list */}
      {manualEmail && !emails.some(e => e.email === manualEmail) && (
        <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-md mb-1 bg-amber-50/60">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wide flex-shrink-0">Manual</span>
            <span className="text-[11px] font-medium text-slate-700 truncate">{manualEmail}</span>
            <CopyButton text={manualEmail} />
          </div>
          <span className="text-[9px] text-amber-500 flex-shrink-0">entered</span>
        </div>
      )}

      {/* Reveal errors */}
      {revealStatus === "insufficient_credits" && (
        <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
          <AlertCircle size={10} className="text-amber-500 flex-shrink-0" />
          <span className="text-[10px] text-amber-700">Insufficient credits. Top up to reveal.</span>
        </div>
      )}
      {revealStatus === "error" && (
        <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 border border-red-200">
          <AlertCircle size={10} className="text-red-500 flex-shrink-0" />
          <span className="text-[10px] text-red-700">Reveal failed. Try again.</span>
        </div>
      )}

      {/* Manual edit input */}
      {editingManual && (
        <InlineEditInput
          value={manualEmail || ""}
          placeholder="Enter email address"
          onSave={(v) => { onManualSave(v); setEditingManual(false); }}
          onCancel={() => setEditingManual(false)}
          isSaving={isSavingManual}
        />
      )}
    </div>
  );
};

// ─── RevealButton — credit-gated, tooltip shows credit cost on hover ────────
const REVEAL_CREDITS = { email: 1, phone: 5 } as const;
const RevealButton: React.FC<{
  type:      "email" | "phone";
  onClick:   () => void;
  isLoading: boolean;
}> = ({ type, onClick, isLoading }) => {
  const credits = REVEAL_CREDITS[type];
  const tooltip = type === "email"
    ? `Reveal Email · ${credits} credit will be charged`
    : `Reveal Phone · ${credits} credits will be charged`;
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      title={tooltip}
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
    </button>
  );
};

// ─── ContactField — single contact row with reveal / manual / display ────────
// ── Flag helper — derive country flag emoji from E.164 phone number ──────────
function phoneFlag(phone: string | null): string {
  if (!phone) return "";
  const country_prefixes: Record<string, string> = {
    "+91": "🇮🇳", "+1": "🇺🇸", "+44": "🇬🇧", "+61": "🇦🇺", "+65": "🇸🇬",
    "+971": "🇦🇪", "+49": "🇩🇪", "+33": "🇫🇷", "+81": "🇯🇵", "+86": "🇨🇳",
    "+55": "🇧🇷", "+52": "🇲🇽", "+27": "🇿🇦", "+234": "🇳🇬", "+60": "🇲🇾",
    "+62": "🇮🇩", "+63": "🇵🇭", "+66": "🇹🇭", "+84": "🇻🇳", "+880": "🇧🇩",
    "+92": "🇵🇰", "+94": "🇱🇰", "+977": "🇳🇵",
  };
  // Try longest prefix first
  for (const prefix of ["+971","+880","+234","+977","+92","+94","+91","+86","+81","+66","+65","+63","+62","+61","+60","+55","+52","+49","+44","+33","+27","+1"]) {
    if (phone.startsWith(prefix)) return country_prefixes[prefix] ?? "";
  }
  return "";
}

const ContactField: React.FC<{
  type:          "email" | "phone";
  icon:          React.ElementType;
  label:         string;
  // What we know
  apolloValue:   string | null;
  manualValue:   string | null;
  existingValue: string | null;
  // Reveal state
  revealStatus:  "idle" | "loading" | "revealed" | "error" | "insufficient_credits";
  onReveal:      () => void;
  // Manual edit
  onManualSave:  (v: string) => void;
  isSavingManual: boolean;
}> = ({
  type, icon: Icon, label,
  apolloValue, manualValue, existingValue,
  revealStatus, onReveal,
  onManualSave, isSavingManual,
}) => {
  const [editingManual, setEditingManual] = useState(false);

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
              "text-[11px] font-medium flex items-center gap-1",
              isManualOnly && !isRevealed ? "text-amber-700" : "text-slate-700"
            )}>
              {/* Country flag for phone numbers */}
              {type === "phone" && phoneFlag(displayValue) && (
                <span className="text-[13px] leading-none">{phoneFlag(displayValue)}</span>
              )}
              {displayValue}
              <CopyButton text={displayValue} />
              {isManualOnly && !isRevealed && (
                <span className="ml-1 text-[9px] text-amber-500">(manual)</span>
              )}
            </span>
          )}

          {/* Reveal button — show if not yet revealed */}
          {!isRevealed && revealStatus === "idle" && (
            <RevealButton type={type} onClick={onReveal} isLoading={false} />
          )}
          {!isRevealed && revealStatus === "loading" && (
            <RevealButton type={type} onClick={() => {}} isLoading={true} />
          )}

          {/* Manual add pencil — always visible (even after reveal) */}
          {!editingManual && (
            <button
              onClick={() => setEditingManual(true)}
              className="p-1 rounded hover:bg-violet-50 text-slate-400 hover:text-violet-500 transition-colors"
              title={`${displayValue ? "Edit" : "Add"} ${label.toLowerCase()} manually`}
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
          "email, email_status, all_emails, phone, phone_status, " +
          "manually_entered_email, manually_entered_phone, manually_entered_by_org, " +
          "snapshot_name"
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

   // Full name: prefer snapshotName from reveal (unmasked) over Apollo search result
  const revealedSnapshotName = emailReveal.result?.snapshotName
    || phoneReveal.result?.snapshotName
    || cacheRow?.snapshot_name
    || null;
  const displayFirstName = revealedSnapshotName
    ? revealedSnapshotName.split(' ')[0]
    : c.first_name;
  const displayLastName = revealedSnapshotName
    ? revealedSnapshotName.split(' ').slice(1).join(' ')
    : c.last_name_obfuscated;

  // All emails: merge allEmails from reveal + cache + manual (deduplicated)
  const revealedAllEmails: EmailEntry[] =
    emailReveal.result?.allEmails?.length
      ? emailReveal.result.allEmails
      : (Array.isArray(cacheRow?.all_emails) ? (cacheRow!.all_emails as EmailEntry[]) : []);
  // If no allEmails array but we have a primary email, build a single-entry list
  const primaryEmail =
    emailReveal.result?.email ??
    crossCheckResult?.email ??
    cacheRow?.email ??
    manualEmail ?? null;
  const emailsToShow: EmailEntry[] =
    revealedAllEmails.length > 0
      ? revealedAllEmails
      : primaryEmail
        ? [{ email: primaryEmail, email_status: cacheRow?.email_status ?? null, source: 'apollo', is_primary: true }]
        : [];

  const init       = initials(displayFirstName, displayLastName);


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
                {displayFirstName} {displayLastName}
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
            <MultiEmailDisplay
              emails={emailsToShow}
              manualEmail={manualEmail}
              revealStatus={emailStatus}
              onReveal={handleEmailReveal}
              onManualSave={handleManualEmailSave}
              isSavingManual={manualSave.status === "saving"}
              onInvite={() => setInviteOpen(true)}
            />
            <ContactField
              type="phone"
              icon={Phone}
              label="Direct phone"
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
            Reveal costs: Email 1 cr · Phone 5 cr · All data from Apollo
          </p>
        </div>
      </div>

      {/* Invite gate — renders its own modals */}
      {inviteOpen && (
        <CandidateInviteGate
          candidateName={`${displayFirstName} ${displayLastName}`}
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