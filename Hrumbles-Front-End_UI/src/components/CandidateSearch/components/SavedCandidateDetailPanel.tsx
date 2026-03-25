/**
 * SavedCandidateDetailPanel.tsx
 *
 * Detail panel for SavedCandidatesPage.
 * Accepts a SavedCandidate (from the saved_candidates table) and shows:
 *  - Name, title, company from snapshot_* columns
 *  - Contact (email + phone) with inline reveal cells
 *  - Full enrichment data from useEnrichmentData (social, career, org)
 *  - Quick actions: Invite, Edit notes, View in search
 *
 * Portal-rendered, same visual style as DetailPanelV2.
 */

import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  X, Building2, MapPin, Mail, Phone,
  Check, ExternalLink, Loader2,
  Send, Pencil, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SavedCandidate } from "../hooks/useSavedCandidates";
import { useEnrichmentData } from "../hooks/useEnrichmentData";
import { EnrichedProfileSection } from "./EnrichedProfileSection";
import { CandidateInviteGate } from "./CandidateInviteGate";
import { RevealCell } from "./RevealCell";
import { SAVED_CANDIDATES_QUERY_KEY } from "../hooks/useUpsertSavedCandidate";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-2">{children}</p>
);

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
};

const SAVE_TYPE_CFG: Record<string, { label: string; bg: string; color: string }> = {
  enriched:    { label: "Enriched",    bg: "#F5F3FF", color: "#7C3AED" },
  manual_edit: { label: "Manual",      bg: "#FFFBEB", color: "#92400E" },
  shortlisted: { label: "Shortlisted", bg: "#ECFDF5", color: "#065F46" },
  invited:     { label: "Invited",     bg: "#EFF6FF", color: "#1D4ED8" },
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
  candidate: c, organizationId, userId, onClose, onRevealDone,
}) => {
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const [inviteOpen,  setInviteOpen]  = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal,     setNoteVal]     = useState(c.notes ?? "");
  const [localEmail,  setLocalEmail]  = useState<string | null>(c.email);
  const [localPhone,  setLocalPhone]  = useState<string | null>(c.phone);

  const typeCfg = SAVE_TYPE_CFG[c.save_type] ?? SAVE_TYPE_CFG.enriched;
  const initials = (c.snapshot_name ?? "?")[0]?.toUpperCase() ?? "?";

  // Load enrichment data
  const { data: enrichment, isLoading: enrichLoading } = useEnrichmentData(c.apollo_person_id);

  // Authoritative display name: enrichment > snapshot
  const displayName    = enrichment?.fullName    || c.snapshot_name    || "Unknown";
  const displayTitle   = enrichment?.fullName ? (enrichment?.employmentHistory.find(e => e.isCurrent)?.title || c.snapshot_title) : c.snapshot_title;
  const displayCompany = enrichment?.orgName  || c.snapshot_company   || null;
  const displayLoc     = enrichment?.city
    ? [enrichment.city, enrichment.state, enrichment.country].filter(Boolean).join(", ")
    : c.snapshot_location;

  const saveNote = async () => {
    await supabase.from("saved_candidates")
      .update({ notes: noteVal.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    queryClient.invalidateQueries({ queryKey: [SAVED_CANDIDATES_QUERY_KEY] });
    setEditingNote(false);
  };

  const handleRevealDone = (type: "email"|"phone", value: string) => {
    if (type === "email") setLocalEmail(value);
    if (type === "phone") setLocalPhone(value);
    onRevealDone(c.id, type, value);
    queryClient.invalidateQueries({ queryKey: ["enrichment-data", c.apollo_person_id] });
  };

  return createPortal(
    <>
      <style>{`@keyframes panelSlide{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}`}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-[998]" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 w-[380px] bg-white z-[999] flex flex-col"
        style={{ animation: "panelSlide 0.18s cubic-bezier(0.4,0,0.2,1) both", boxShadow: "-4px 0 32px rgba(109,40,217,0.12)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex-shrink-0 px-4 pt-4 pb-5"
          style={{ background: "linear-gradient(160deg, #4c1d95 0%, #5b21b6 60%, #6d28d9 100%)" }}>

          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-violet-300/70">Saved Candidate</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white/20 text-white/70"
                style={{ background: typeCfg.bg + "30" }}>
                {typeCfg.label}
              </span>
            </div>
            <button onClick={onClose}
              className="h-6 w-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X size={12} className="text-white/70" />
            </button>
          </div>

          {/* Avatar + name */}
          <div className="flex items-start gap-3">
            {enrichment?.photoUrl ? (
              <img src={enrichment.photoUrl} alt={displayName}
                className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border-2 border-white/20" />
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

          {/* Meta pills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {displayCompany && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-violet-100 border border-white/10">
                <Building2 size={9} className="text-violet-300" /> {displayCompany}
              </span>
            )}
            {displayLoc && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-violet-100 border border-white/10">
                <MapPin size={9} className="text-violet-300" /> {displayLoc}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-violet-100 border border-white/10">
              <Calendar size={9} className="text-violet-300" /> Saved {fmtDate(c.created_at)}
            </span>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto">

          {/* CONTACT */}
          <div className="px-4 py-3 border-b border-violet-100">
            <SHead>Contact</SHead>
            <RevealCell type="email" apolloPersonId={c.apollo_person_id} organizationId={organizationId}
              userId={userId} savedValue={localEmail} onRevealed={handleRevealDone} compact={false} />
            <RevealCell type="phone" apolloPersonId={c.apollo_person_id} organizationId={organizationId}
              userId={userId} savedValue={localPhone} onRevealed={handleRevealDone} compact={false} />
          </div>

          {/* QUICK ACTIONS */}
          <div className="px-4 py-3 border-b border-violet-100 bg-violet-50/40">
            <SHead>Quick Actions</SHead>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setInviteOpen(true)}
                disabled={!localEmail && !localPhone}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all",
                  localEmail || localPhone ? "opacity-100 hover:opacity-90" : "opacity-40 cursor-not-allowed"
                )}
                style={{ background: "linear-gradient(135deg, #5b21b6, #7c3aed)" }}>
                <Send size={10} /> Invite to Job
              </button>
              <button
                onClick={() => navigate(`/search/candidates/beta?kw=${encodeURIComponent(c.snapshot_name ?? "")}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-white border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-all">
                <ExternalLink size={10} /> Search Similar
              </button>
            </div>
          </div>

          {/* NOTES */}
          <div className="px-4 py-3 border-b border-violet-100">
            <div className="flex items-center justify-between mb-2">
              <SHead>Notes</SHead>
              {!editingNote && (
                <button onClick={() => setEditingNote(true)}
                  className="p-1 rounded text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition-colors">
                  <Pencil size={10} />
                </button>
              )}
            </div>
            {editingNote ? (
              <div className="space-y-1.5">
                <textarea autoFocus value={noteVal} onChange={e => setNoteVal(e.target.value)} rows={3}
                  placeholder="Add a note about this candidate…"
                  className="w-full text-[11px] px-2 py-1.5 border border-violet-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none text-slate-700" />
                <div className="flex gap-1.5">
                  <button onClick={saveNote}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700">
                    <Check size={9} /> Save
                  </button>
                  <button onClick={() => { setEditingNote(false); setNoteVal(c.notes ?? ""); }}
                    className="px-2.5 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold hover:bg-slate-200">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditingNote(true)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-md border text-[11px] transition-colors",
                  c.notes ? "border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-300" :
                            "border-dashed border-slate-200 text-slate-400 italic hover:border-violet-300 hover:text-violet-500"
                )}>
                {c.notes || "Add notes…"}
              </button>
            )}
          </div>

          {/* ENRICHMENT DATA */}
          {enrichLoading ? (
            <div className="px-4 py-6 flex items-center gap-2 text-[11px] text-slate-400">
              <Loader2 size={13} className="animate-spin text-violet-400" />
              Loading profile data…
            </div>
          ) : enrichment ? (
            <EnrichedProfileSection data={enrichment} />
          ) : (
            <div className="px-4 py-4 border-b border-violet-100">
              <SHead>Profile</SHead>
              <div className="p-3 rounded-xl border border-violet-100 bg-violet-50/40 text-center">
                <p className="text-[11px] text-violet-700 font-semibold mb-0.5">No enrichment data yet</p>
                <p className="text-[10px] text-violet-400/80">
                  Reveal email or phone to load full profile including career history, social links and org details.
                </p>
              </div>
            </div>
          )}

          {/* Saved meta footer */}
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
              <div><span className="font-semibold text-slate-500">Saved:</span> {fmtDate(c.created_at)}</div>
              <div><span className="font-semibold text-slate-500">Type:</span> {typeCfg.label}</div>
              {c.hr_jobs && <div className="col-span-2"><span className="font-semibold text-slate-500">Job:</span> {c.hr_jobs.title}</div>}
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="flex-shrink-0 px-4 py-2 border-t border-violet-100"
          style={{ background: "rgba(109,40,217,0.03)" }}>
          <p className="text-[9px] text-violet-400/70 text-center">
            Reveal costs: Email 1 cr · Phone 3 cr · Data from Apollo
          </p>
        </div>
      </div>

      {/* Invite gate */}
      {inviteOpen && (
        <CandidateInviteGate
          candidateName={displayName}
          candidateEmail={localEmail ?? undefined}
          candidatePhone={localPhone ?? undefined}
          apolloPersonId={c.apollo_person_id}
          organizationId={organizationId}
          userId={userId}
          onClose={() => setInviteOpen(false)}
          onInviteSent={() => { setInviteOpen(false); }}
        />
      )}
    </>,
    document.body
  );
};