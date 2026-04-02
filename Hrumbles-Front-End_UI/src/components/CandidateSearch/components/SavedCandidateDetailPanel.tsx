/**
 * SavedCandidateDetailPanel.tsx
 *
 * Detail panel for SavedCandidatesPage — fully aligned with DetailPanelV2 UI.
 *  - useRevealContact hook (same as DetailPanelV2, replaces RevealCell)
 *  - MultiEmailDisplay with per-email invite + status badge
 *  - PhoneField with country flag
 *  - Manual add always visible for both email and phone
 *  - Shortlist / Talent Pool / Folder actions (same as DetailPanelV2)
 *  - Name unmasking from snapshot_name after reveal
 *  - all_emails persist across sessions via candidate_reveal_cache
 */

import React, { useState, useCallback } from "react";
import { createPortal }  from "react-dom";
import { useNavigate }   from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase }      from "@/integrations/supabase/client";
import {
  X, Building2, MapPin, Mail, Phone, Calendar,
  Check, ExternalLink, Loader2,
  Send, Pencil, Copy, Bookmark, BookmarkCheck, Star,
  Eye, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { SavedCandidate }    from "../hooks/useSavedCandidates";
import { useEnrichmentData } from "../hooks/useEnrichmentData";
import { useRevealContact }  from "../hooks/useRevealContact";
import { useManualContactSave } from "../hooks/useManualContactSave";
import { useSaveToTalentPool }  from "../hooks/useSaveToTalentPool";
import { useUpsertSavedCandidate, SAVED_CANDIDATES_QUERY_KEY } from "../hooks/useUpsertSavedCandidate";
import { useFolders }        from "../hooks/useFolders";
import { useAddToFolder }    from "../hooks/useAddToFolder";
import { EnrichedProfileSection } from "./EnrichedProfileSection";
import { CandidateInviteGate }   from "./CandidateInviteGate";
import { FolderPickerModal }     from "./FolderPickerModal";

// ─── Types ────────────────────────────────────────────────────────────────────
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
const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
};

const SHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-2">{children}</p>
);

// ─── Email status badge ───────────────────────────────────────────────────────
const EMAIL_STATUS_CFG: Record<string, { label: string; color: string }> = {
  verified:     { label: "✓ Verified", color: "#166534" },
  extrapolated: { label: "~ Guessed",  color: "#854D0E" },
  guessed:      { label: "~ Guessed",  color: "#854D0E" },
};
const EmailStatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
  const s = status ? EMAIL_STATUS_CFG[status.toLowerCase()] ?? null : null;
  if (!s) return null;
  return <span className="text-[9px] font-semibold flex-shrink-0" style={{ color: s.color }}>{s.label}</span>;
};

// ─── Country flag ─────────────────────────────────────────────────────────────
function phoneFlag(phone: string | null): string {
  if (!phone) return "";
  const map: Record<string, string> = {
    "+971":"🇦🇪","+880":"🇧🇩","+234":"🇳🇬","+977":"🇳🇵","+94":"🇱🇰",
    "+92":"🇵🇰","+91":"🇮🇳","+86":"🇨🇳","+84":"🇻🇳","+81":"🇯🇵",
    "+66":"🇹🇭","+65":"🇸🇬","+63":"🇵🇭","+62":"🇮🇩","+61":"🇦🇺",
    "+60":"🇲🇾","+55":"🇧🇷","+52":"🇲🇽","+49":"🇩🇪","+44":"🇬🇧",
    "+33":"🇫🇷","+27":"🇿🇦","+1":"🇺🇸",
  };
  for (const p of Object.keys(map).sort((a,b)=>b.length-a.length)) {
    if (phone.startsWith(p)) return map[p];
  }
  return "";
}

// ─── CopyButton ───────────────────────────────────────────────────────────────
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),1500); }}
      className="ml-0.5 text-violet-400 hover:text-violet-600 transition-colors" title="Copy">
      {copied ? <Check size={10} strokeWidth={3}/> : <Copy size={10}/>}
    </button>
  );
};

// ─── InlineEditInput ──────────────────────────────────────────────────────────
const InlineEditInput: React.FC<{
  value:string; placeholder:string; onSave:(v:string)=>void; onCancel:()=>void; isSaving:boolean;
}> = ({value,placeholder,onSave,onCancel,isSaving}) => {
  const [val,setVal] = useState(value);
  return (
    <div className="flex items-center gap-1 mt-1">
      <input autoFocus type="text" value={val} placeholder={placeholder}
        onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter")onSave(val);if(e.key==="Escape")onCancel();}}
        className="flex-1 text-[11px] px-2 py-1 rounded-md border border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white text-slate-700"/>
      <button onClick={()=>onSave(val)} disabled={isSaving||!val.trim()}
        className="p-1 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors">
        {isSaving?<Loader2 size={10} className="animate-spin"/>:<Check size={10}/>}
      </button>
      <button onClick={onCancel} className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
        <X size={10}/>
      </button>
    </div>
  );
};

// ─── RevealButton ─────────────────────────────────────────────────────────────
const REVEAL_CREDITS = { email: 1, phone: 5 } as const;
const RevealButton: React.FC<{ type:"email"|"phone"; onClick:()=>void; isLoading:boolean }> = ({type,onClick,isLoading}) => {
  const credits = REVEAL_CREDITS[type];
  const tooltip  = type==="email"
    ? `Reveal Email · ${credits} credit will be charged`
    : `Reveal Phone · ${credits} credits will be charged`;
  return (
    <button onClick={onClick} disabled={isLoading} title={tooltip}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all",
        isLoading ? "bg-violet-50 border-violet-200 text-violet-400 cursor-not-allowed"
                  : "bg-white border-violet-300 text-violet-600 hover:bg-violet-50 hover:border-violet-500"
      )}>
      {isLoading ? <Loader2 size={11} className="animate-spin"/> : <Eye size={11}/>}
      {isLoading ? "Revealing…" : `Reveal ${type==="email"?"Email":"Phone"}`}
    </button>
  );
};

// ─── MultiEmailDisplay ────────────────────────────────────────────────────────
const MultiEmailDisplay: React.FC<{
  emails: EmailEntry[]; manualEmail: string|null;
  onManualSave:(v:string)=>void; isSavingManual:boolean;
  revealStatus:"idle"|"loading"|"revealed"|"error"|"insufficient_credits";
  onReveal:()=>void; onInvite?:(email:string)=>void;
}> = ({emails,manualEmail,onManualSave,isSavingManual,revealStatus,onReveal,onInvite}) => {
  const [editingManual,setEditingManual] = useState(false);
  const hasEmails = emails.length>0 || !!manualEmail;
  return (
    <div className="py-2 border-b border-violet-50 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Mail size={11} className={hasEmails?"text-violet-500":"text-slate-300"}/>
          <span className="text-[11px] text-slate-500">Email address</span>
        </div>
        <div className="flex items-center gap-1.5">
          {!hasEmails && revealStatus==="idle"    && <RevealButton type="email" onClick={onReveal} isLoading={false}/>}
          {!hasEmails && revealStatus==="loading" && <RevealButton type="email" onClick={()=>{}} isLoading={true}/>}
          {!editingManual && (
            <button onClick={()=>setEditingManual(true)}
              className="p-1 rounded hover:bg-violet-50 text-slate-400 hover:text-violet-500 transition-colors" title="Add email manually">
              <Pencil size={10}/>
            </button>
          )}
        </div>
      </div>
      {emails.map((entry,i)=>(
        <div key={i} className={cn("flex items-center justify-between gap-2 px-2 py-1 rounded-md mb-1",
          entry.is_primary?"bg-violet-50/60":"bg-slate-50/60")}>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {entry.is_primary && <span className="text-[8px] font-bold text-violet-400 uppercase tracking-wide flex-shrink-0">Primary</span>}
            <span className="text-[11px] font-medium text-slate-700 truncate">{entry.email}</span>
            <CopyButton text={entry.email}/>
            <EmailStatusBadge status={entry.email_status}/>
          </div>
          {onInvite && (
            <button onClick={()=>onInvite(entry.email)} title={`Invite using ${entry.email}`}
              className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border border-violet-200 bg-white text-violet-600 hover:bg-violet-50 transition-colors">
              <Send size={8}/> Invite
            </button>
          )}
        </div>
      ))}
      {manualEmail && !emails.some(e=>e.email===manualEmail) && (
        <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-md mb-1 bg-amber-50/60">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wide flex-shrink-0">Manual</span>
            <span className="text-[11px] font-medium text-slate-700 truncate">{manualEmail}</span>
            <CopyButton text={manualEmail}/>
          </div>
          <span className="text-[9px] text-amber-500 flex-shrink-0">entered</span>
        </div>
      )}
      {revealStatus==="insufficient_credits" && (
        <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
          <AlertCircle size={10} className="text-amber-500 flex-shrink-0"/>
          <span className="text-[10px] text-amber-700">Insufficient credits. Top up to reveal.</span>
        </div>
      )}
      {revealStatus==="error" && (
        <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 border border-red-200">
          <AlertCircle size={10} className="text-red-500 flex-shrink-0"/>
          <span className="text-[10px] text-red-700">Reveal failed. Try again.</span>
        </div>
      )}
      {editingManual && (
        <InlineEditInput value={manualEmail||""} placeholder="Enter email address"
          onSave={v=>{onManualSave(v);setEditingManual(false);}}
          onCancel={()=>setEditingManual(false)} isSaving={isSavingManual}/>
      )}
    </div>
  );
};

// ─── PhoneField ───────────────────────────────────────────────────────────────
const PhoneField: React.FC<{
  apolloValue:string|null; manualValue:string|null;
  revealStatus:"idle"|"loading"|"revealed"|"error"|"insufficient_credits";
  onReveal:()=>void; onManualSave:(v:string)=>void; isSavingManual:boolean;
}> = ({apolloValue,manualValue,revealStatus,onReveal,onManualSave,isSavingManual}) => {
  const [editingManual,setEditingManual] = useState(false);
  const displayValue = apolloValue || manualValue;
  const isRevealed   = !!apolloValue;
  const isManualOnly = !isRevealed && !!manualValue;
  return (
    <div className="py-2 border-b border-violet-50 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Phone size={11} className={isRevealed?"text-violet-500":isManualOnly?"text-amber-500":"text-slate-300"}/>
          <span className="text-[11px] text-slate-500">Direct phone</span>
        </div>
        <div className="flex items-center gap-1.5">
          {displayValue && (
            <span className={cn("text-[11px] font-medium flex items-center gap-1",isManualOnly?"text-amber-700":"text-slate-700")}>
              {phoneFlag(displayValue) && <span className="text-[13px] leading-none">{phoneFlag(displayValue)}</span>}
              {displayValue}
              <CopyButton text={displayValue}/>
              {isManualOnly && <span className="text-[9px] text-amber-500">(manual)</span>}
            </span>
          )}
          {!isRevealed && revealStatus==="idle"    && <RevealButton type="phone" onClick={onReveal} isLoading={false}/>}
          {!isRevealed && revealStatus==="loading" && <RevealButton type="phone" onClick={()=>{}} isLoading={true}/>}
          {!editingManual && (
            <button onClick={()=>setEditingManual(true)}
              className="p-1 rounded hover:bg-violet-50 text-slate-400 hover:text-violet-500 transition-colors"
              title={`${displayValue?"Edit":"Add"} phone manually`}>
              <Pencil size={10}/>
            </button>
          )}
        </div>
      </div>
      {revealStatus==="loading" && !displayValue && (
        <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-violet-50 border border-violet-200">
          <Loader2 size={10} className="text-violet-500 animate-spin flex-shrink-0"/>
          <span className="text-[10px] text-violet-700">Verifying phone… ~2 min</span>
        </div>
      )}
      {revealStatus==="insufficient_credits" && (
        <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
          <AlertCircle size={10} className="text-amber-500 flex-shrink-0"/>
          <span className="text-[10px] text-amber-700">Insufficient credits. Top up to reveal.</span>
        </div>
      )}
      {revealStatus==="error" && (
        <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 border border-red-200">
          <AlertCircle size={10} className="text-red-500 flex-shrink-0"/>
          <span className="text-[10px] text-red-700">Reveal failed. Try again.</span>
        </div>
      )}
      {editingManual && (
        <InlineEditInput value={manualValue||""} placeholder="Enter phone number"
          onSave={v=>{onManualSave(v);setEditingManual(false);}}
          onCancel={()=>setEditingManual(false)} isSaving={isSavingManual}/>
      )}
    </div>
  );
};

// ─── Save type config ─────────────────────────────────────────────────────────
const SAVE_TYPE_CFG: Record<string,{label:string;bg:string;color:string}> = {
  enriched:    {label:"Enriched",    bg:"#F5F3FF",color:"#7C3AED"},
  manual_edit: {label:"Manual",      bg:"#FFFBEB",color:"#92400E"},
  shortlisted: {label:"Shortlisted", bg:"#ECFDF5",color:"#065F46"},
  invited:     {label:"Invited",     bg:"#EFF6FF",color:"#1D4ED8"},
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface SavedCandidateDetailPanelProps {
  candidate:      SavedCandidate;
  organizationId: string;
  userId:         string;
  onClose:        () => void;
  onRevealDone:   (id: string, type: "email"|"phone", value: string) => void;
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export const SavedCandidateDetailPanel: React.FC<SavedCandidateDetailPanelProps> = ({
  candidate:c, organizationId, userId, onClose, onRevealDone,
}) => {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [inviteOpen,       setInviteOpen]       = useState(false);
  const [inviteEmail,      setInviteEmail]       = useState<string|undefined>(undefined);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [editingNote,      setEditingNote]      = useState(false);
  const [noteVal,          setNoteVal]          = useState(c.notes??"");

  const typeCfg = SAVE_TYPE_CFG[c.save_type] ?? SAVE_TYPE_CFG.enriched;

  // ── Reveal cache ──────────────────────────────────────────────────────────
  const cacheKey = ["reveal-cache-row", c.apollo_person_id];
  const { data: cacheRow, refetch: refetchCache } = useQuery<RevealCacheRow|null>({
    queryKey: cacheKey,
    queryFn: async () => {
      const { data } = await supabase
        .from("candidate_reveal_cache")
        .select("email,email_status,all_emails,phone,phone_status,manually_entered_email,manually_entered_phone,manually_entered_by_org,snapshot_name")
        .eq("apollo_person_id", c.apollo_person_id)
        .maybeSingle();
      return (data as RevealCacheRow|null) ?? null;
    },
    staleTime: 30_000,
  });

  const manualEmail = cacheRow?.manually_entered_by_org===organizationId ? (cacheRow?.manually_entered_email??null) : null;
  const manualPhone = cacheRow?.manually_entered_by_org===organizationId ? (cacheRow?.manually_entered_phone??null) : null;

  // ── Reveal hooks ──────────────────────────────────────────────────────────
  const emailReveal = useRevealContact({
    apolloPersonId: c.apollo_person_id, organizationId, userId,
    firstName: c.snapshot_name?.split(" ")[0] ?? undefined,
    lastName:  c.snapshot_name?.split(" ").slice(1).join(" ") ?? undefined,
    title:     c.snapshot_title ?? undefined,
    currentCompany: c.snapshot_company ?? undefined,
  });

  const phoneReveal = useRevealContact({
    apolloPersonId: c.apollo_person_id, organizationId, userId,
    firstName: c.snapshot_name?.split(" ")[0] ?? undefined,
    lastName:  c.snapshot_name?.split(" ").slice(1).join(" ") ?? undefined,
    title:     c.snapshot_title ?? undefined,
    currentCompany: c.snapshot_company ?? undefined,
  });

  const manualSave = useManualContactSave({ apolloPersonId: c.apollo_person_id, organizationId, userId });

  // ── Action hooks ──────────────────────────────────────────────────────────
  const { upsert: upsertSaved, upsertStatus: shortlistStatus } = useUpsertSavedCandidate();
  const talentPool = useSaveToTalentPool({ apolloPersonId: c.apollo_person_id, organizationId, userId });
  const { folders, createFolder } = useFolders(organizationId, userId);
  const { addToFolder } = useAddToFolder();

  // ── Enrichment ────────────────────────────────────────────────────────────
  const { data: enrichment, isLoading: enrichLoading } = useEnrichmentData(c.apollo_person_id);

  // ── Derived contact values ────────────────────────────────────────────────
  const emailValue = emailReveal.result?.email ?? cacheRow?.email ?? c.email ?? null;
  const phoneValue = phoneReveal.result?.phone ?? cacheRow?.phone ?? c.phone ?? null;
  const hasAnyContact = !!(emailValue||phoneValue||manualEmail||manualPhone);

  // ── All emails — persists across sessions via cache ───────────────────────
  const revealedAllEmails: EmailEntry[] =
    emailReveal.result?.allEmails?.length
      ? emailReveal.result.allEmails
      : Array.isArray(cacheRow?.all_emails) ? (cacheRow!.all_emails as EmailEntry[]) : [];

  const emailsToShow: EmailEntry[] =
    revealedAllEmails.length > 0
      ? revealedAllEmails
      : emailValue
        ? [{email:emailValue, email_status:cacheRow?.email_status??null, source:"apollo", is_primary:true}]
        : [];

  // ── Reveal status ─────────────────────────────────────────────────────────
  const emailStatus: "idle"|"loading"|"revealed"|"error"|"insufficient_credits" =
    emailReveal.status==="loading"              ? "loading"              :
    emailReveal.status==="error"                ? "error"                :
    emailReveal.status==="insufficient_credits" ? "insufficient_credits" :
    !!emailValue                                ? "revealed"             : "idle";

  const phoneStatus: "idle"|"loading"|"revealed"|"error"|"insufficient_credits" =
    phoneReveal.status==="loading"              ? "loading"              :
    phoneReveal.status==="error"                ? "error"                :
    phoneReveal.status==="insufficient_credits" ? "insufficient_credits" :
    !!phoneValue                                ? "revealed"             : "idle";

  // ── Name (unmasked after reveal) ──────────────────────────────────────────
  const revealedName = emailReveal.result?.snapshotName || phoneReveal.result?.snapshotName || cacheRow?.snapshot_name || null;
  const displayName  = revealedName || enrichment?.fullName || c.snapshot_name || "Unknown";
  const initials     = displayName[0]?.toUpperCase() ?? "?";

  const displayTitle   = enrichment?.employmentHistory.find(e=>e.isCurrent)?.title || c.snapshot_title;
  const displayCompany = enrichment?.orgName || c.snapshot_company || null;
  const displayLoc     = enrichment?.city
    ? [enrichment.city, enrichment.state, enrichment.country].filter(Boolean).join(", ")
    : c.snapshot_location;

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleRevealComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: cacheKey });
    queryClient.invalidateQueries({ queryKey: ["enrichment-data", c.apollo_person_id] });
    queryClient.invalidateQueries({ queryKey: [SAVED_CANDIDATES_QUERY_KEY] });
    refetchCache();
  }, [queryClient, c.apollo_person_id]);

  const handleEmailReveal = useCallback(async () => {
    await emailReveal.reveal("email");
    handleRevealComplete();
  }, [emailReveal, handleRevealComplete]);

  const handlePhoneReveal = useCallback(async () => {
    await phoneReveal.reveal("phone");
    handleRevealComplete();
    if (phoneReveal.result?.phone) onRevealDone(c.id, "phone", phoneReveal.result.phone);
  }, [phoneReveal, handleRevealComplete]);

  const handleManualEmailSave = useCallback(async (v:string) => {
    await manualSave.saveEmail(v);
    queryClient.invalidateQueries({ queryKey: cacheKey });
  }, [manualSave, queryClient, cacheKey]);

  const handleManualPhoneSave = useCallback(async (v:string) => {
    await manualSave.savePhone(v);
    queryClient.invalidateQueries({ queryKey: cacheKey });
  }, [manualSave, queryClient, cacheKey]);

  const handleShortlist = async (folderId?: string|null) => {
    const savedId = await upsertSaved({
      apolloPersonId: c.apollo_person_id, organizationId, savedBy: userId,
      saveType: "shortlisted", candidate: c as any, folderId: folderId??undefined,
    });
    if (savedId && folderId) await addToFolder(folderId, savedId, userId);
  };

  const saveNote = async () => {
    await supabase.from("saved_candidates")
      .update({ notes: noteVal.trim()||null, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    queryClient.invalidateQueries({ queryKey: [SAVED_CANDIDATES_QUERY_KEY] });
    setEditingNote(false);
  };

  return createPortal(
    <>
      <style>{`@keyframes panelSlide{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}`}</style>

      <div className="fixed inset-0 z-[998]" onClick={onClose}/>

      <div className="fixed top-0 right-0 bottom-0 w-[380px] bg-white z-[999] flex flex-col"
        style={{animation:"panelSlide 0.18s cubic-bezier(0.4,0,0.2,1) both",boxShadow:"-4px 0 32px rgba(109,40,217,0.12)"}}
        onClick={e=>e.stopPropagation()}>

        {/* HEADER */}
        <div className="flex-shrink-0 px-4 pt-4 pb-5"
          style={{background:"linear-gradient(160deg, #4c1d95 0%, #5b21b6 60%, #6d28d9 100%)"}}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-violet-300/70">Saved Candidate</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white/20 text-white/70"
                style={{background:typeCfg.bg+"30"}}>{typeCfg.label}</span>
            </div>
            <button onClick={onClose} className="h-6 w-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X size={12} className="text-white/70"/>
            </button>
          </div>

          <div className="flex items-start gap-3">
            {enrichment?.photoUrl ? (
              <img src={enrichment.photoUrl} alt={displayName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border-2 border-white/20"/>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-violet-200 text-violet-800 flex items-center justify-center text-[14px] font-bold flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className="text-[14px] font-bold text-white leading-tight">{displayName}</h2>
              {displayTitle && <p className="text-[11px] text-violet-200/80 mt-0.5 leading-snug line-clamp-2">{displayTitle}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {displayCompany && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-violet-100 border border-white/10">
                <Building2 size={9} className="text-violet-300"/> {displayCompany}
              </span>
            )}
            {displayLoc && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-violet-100 border border-white/10">
                <MapPin size={9} className="text-violet-300"/> {displayLoc}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-violet-100 border border-white/10">
              <Calendar size={9} className="text-violet-300"/> Saved {fmtDate(c.created_at)}
            </span>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto">

          {/* CONTACT */}
          <div className="px-4 py-3 border-b border-violet-100">
            <SHead>Contact</SHead>
            <MultiEmailDisplay
              emails={emailsToShow}
              manualEmail={manualEmail}
              revealStatus={emailStatus}
              onReveal={handleEmailReveal}
              onManualSave={handleManualEmailSave}
              isSavingManual={manualSave.status==="saving"}
              onInvite={email=>{ setInviteEmail(email); setInviteOpen(true); }}
            />
            <PhoneField
              apolloValue={phoneValue}
              manualValue={manualPhone}
              revealStatus={phoneStatus}
              onReveal={handlePhoneReveal}
              onManualSave={handleManualPhoneSave}
              isSavingManual={manualSave.status==="saving"}
            />
          </div>

          {/* QUICK ACTIONS */}
          <div className="px-4 py-3 border-b border-violet-100 bg-violet-50/40">
            <SHead>Quick Actions</SHead>
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>setInviteOpen(true)} disabled={!hasAnyContact}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all",
                  hasAnyContact?"opacity-100 hover:opacity-90":"opacity-40 cursor-not-allowed")}
                style={{background:"linear-gradient(135deg, #5b21b6, #7c3aed)"}}>
                <Send size={10}/> Invite to Job
              </button>
              <button onClick={()=>talentPool.save(c as any)}
                disabled={talentPool.status==="saving"||talentPool.status==="saved"}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all",
                  talentPool.status==="saved"
                    ?"bg-emerald-50 border-emerald-300 text-emerald-700"
                    :"bg-white border-violet-300 text-violet-600 hover:bg-violet-50")}>
                {talentPool.status==="saving"?<Loader2 size={10} className="animate-spin"/>:talentPool.status==="saved"?<BookmarkCheck size={10}/>:<Bookmark size={10}/>}
                {talentPool.status==="saved"?"Saved ✓":"Talent Pool"}
              </button>
              <button onClick={()=>setFolderPickerOpen(true)}
                disabled={shortlistStatus==="saving"||shortlistStatus==="saved"}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all",
                  shortlistStatus==="saved"
                    ?"bg-emerald-50 border-emerald-300 text-emerald-700"
                    :"bg-white border-violet-300 text-violet-600 hover:bg-violet-50")}>
                {shortlistStatus==="saving"?<Loader2 size={10} className="animate-spin"/>:shortlistStatus==="saved"?<Check size={10}/>:<Star size={10}/>}
                {shortlistStatus==="saved"?"Shortlisted ✓":"Shortlist"}
              </button>
              <button onClick={()=>navigate(`/search/candidates/beta?kw=${encodeURIComponent(c.snapshot_name??"")}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-white border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-all">
                <ExternalLink size={10}/> Search Similar
              </button>
            </div>
          </div>

          {/* NOTES */}
          <div className="px-4 py-3 border-b border-violet-100">
            <div className="flex items-center justify-between mb-2">
              <SHead>Notes</SHead>
              {!editingNote && (
                <button onClick={()=>setEditingNote(true)}
                  className="p-1 rounded text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition-colors">
                  <Pencil size={10}/>
                </button>
              )}
            </div>
            {editingNote ? (
              <div className="space-y-1.5">
                <textarea autoFocus value={noteVal} onChange={e=>setNoteVal(e.target.value)} rows={3}
                  placeholder="Add a note about this candidate…"
                  className="w-full text-[11px] px-2 py-1.5 border border-violet-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none text-slate-700"/>
                <div className="flex gap-1.5">
                  <button onClick={saveNote} className="flex items-center gap-1 px-2.5 py-1 rounded bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700">
                    <Check size={9}/> Save
                  </button>
                  <button onClick={()=>{setEditingNote(false);setNoteVal(c.notes??"");}}
                    className="px-2.5 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold hover:bg-slate-200">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={()=>setEditingNote(true)}
                className={cn("w-full text-left px-2 py-1.5 rounded-md border text-[11px] transition-colors",
                  c.notes?"border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-300"
                         :"border-dashed border-slate-200 text-slate-400 italic hover:border-violet-300 hover:text-violet-500")}>
                {c.notes||"Add notes…"}
              </button>
            )}
          </div>

          {/* ENRICHMENT */}
          {enrichLoading ? (
            <div className="px-4 py-5 flex items-center gap-2 text-[11px] text-slate-400 border-b border-violet-100">
              <Loader2 size={12} className="animate-spin text-violet-400"/> Loading profile…
            </div>
          ) : enrichment ? (
            <EnrichedProfileSection data={enrichment}/>
          ) : (
            <div className="px-4 py-3 border-b border-violet-100">
              <SHead>Profile</SHead>
              <div className="p-3 rounded-xl border border-violet-100 bg-violet-50/40 text-center">
                <p className="text-[11px] text-violet-700 font-semibold mb-0.5">No enrichment data yet</p>
                <p className="text-[10px] text-violet-400/80">Reveal email or phone to load full profile — career history, social links, org details.</p>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
              <div><span className="font-semibold text-slate-500">Saved:</span> {fmtDate(c.created_at)}</div>
              <div><span className="font-semibold text-slate-500">Type:</span> {typeCfg.label}</div>
              {c.hr_jobs && <div className="col-span-2"><span className="font-semibold text-slate-500">Job:</span> {c.hr_jobs.title}</div>}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex-shrink-0 px-4 py-2 border-t border-violet-100" style={{background:"rgba(109,40,217,0.03)"}}>
          <p className="text-[9px] text-violet-400/70 text-center">
            Reveal costs: Email 1 cr · Phone 5 cr · Data from Apollo
          </p>
        </div>
      </div>

      {inviteOpen && (
        <CandidateInviteGate
          candidateName={displayName}
          candidateEmail={inviteEmail??emailValue??manualEmail??undefined}
          candidatePhone={phoneValue??manualPhone??undefined}
          apolloPersonId={c.apollo_person_id}
          organizationId={organizationId}
          userId={userId}
          onClose={()=>{setInviteOpen(false);setInviteEmail(undefined);}}
          onInviteSent={()=>{setInviteOpen(false);setInviteEmail(undefined);}}
        />
      )}

      {folderPickerOpen && (
        <FolderPickerModal
          folders={folders}
          onSelect={async fId=>{setFolderPickerOpen(false);await handleShortlist(fId);}}
          onCreate={async name=>{const id=await createFolder(name);if(id){setFolderPickerOpen(false);await handleShortlist(id);}}}
          onSkip={async()=>{setFolderPickerOpen(false);await handleShortlist(null);}}
          onClose={()=>setFolderPickerOpen(false)}
          title="Shortlist Candidate" showSkip={true}
        />
      )}
    </>,
    document.body
  );
};