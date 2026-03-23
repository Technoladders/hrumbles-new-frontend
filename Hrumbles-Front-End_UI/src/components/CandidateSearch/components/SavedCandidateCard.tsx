/**
 * SavedCandidateCard.tsx
 *
 * Card displayed in the SavedCandidatesPage grid.
 * Uses snapshot_ columns — no live Apollo calls.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail, Phone, Building2, MapPin, Briefcase,
  Send, Archive, Pencil, ExternalLink, Check,
  Tag, Clock, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SavedCandidate } from "../hooks/useSavedCandidates";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { SAVED_CANDIDATES_QUERY_KEY } from "../hooks/useUpsertSavedCandidate";

// ─── Save type config ─────────────────────────────────────────────────────────
const SAVE_TYPE_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  enriched:    { label: "Enriched",    bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE" },
  manual_edit: { label: "Manual",      bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  shortlisted: { label: "Shortlisted", bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" },
  invited:     { label: "Invited",     bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  saved:       { label: "Saved",       dot: "bg-slate-400"   },
  contacted:   { label: "Contacted",   dot: "bg-blue-500"    },
  in_progress: { label: "In Progress", dot: "bg-amber-500"   },
  archived:    { label: "Archived",    dot: "bg-slate-200"   },
};

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
];
const avatarGradient = (id: string) =>
  AVATAR_COLORS[parseInt(id.replace(/\D/g, "").slice(-2) || "0") % AVATAR_COLORS.length];

const initials = (name: string | null) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
};

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000)   return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return ""; }
};

// ─── CopyChip ─────────────────────────────────────────────────────────────────
const CopyChip: React.FC<{ value: string; label: string; icon: React.ElementType }> = ({
  value, label, icon: Icon,
}) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-200 group">
      <Icon size={11} className="text-violet-400 flex-shrink-0" />
      <span className="text-[11px] text-slate-700 font-medium truncate max-w-[160px]">{value}</span>
      <button onClick={copy} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
        {copied
          ? <Check size={10} className="text-emerald-500" />
          : <Copy size={10} className="text-slate-400 hover:text-violet-500" />
        }
      </button>
    </div>
  );
};

// ─── StatusDropdown ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["saved", "contacted", "in_progress", "archived"] as const;

const StatusDropdown: React.FC<{
  current:  string;
  onChange: (s: string) => void;
  saving:   boolean;
}> = ({ current, onChange, saving }) => {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[current] ?? STATUS_CONFIG.saved;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold bg-white border border-slate-200 hover:border-violet-300 transition-colors"
      >
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
        {saving ? "Saving…" : cfg.label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-7 z-20 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1 overflow-hidden">
            {STATUS_OPTIONS.map(s => {
              const c = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => { onChange(s); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:bg-violet-50 transition-colors",
                    s === current ? "bg-violet-50 text-violet-700" : "text-slate-600"
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main card ────────────────────────────────────────────────────────────────
interface SavedCandidateCardProps {
  candidate: SavedCandidate;
  onInvite:  (c: SavedCandidate) => void;
  onRefetch: () => void;
}

export const SavedCandidateCard: React.FC<SavedCandidateCardProps> = ({
  candidate: c, onInvite, onRefetch,
}) => {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const [statusSaving, setStatusSaving] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal,     setNotesVal]     = useState(c.notes ?? "");

  const typeConf   = SAVE_TYPE_CONFIG[c.save_type]  ?? SAVE_TYPE_CONFIG.enriched;
  const statusConf = STATUS_CONFIG[c.status]        ?? STATUS_CONFIG.saved;
  const grad       = avatarGradient(c.id);
  const init       = initials(c.snapshot_name);
  const jobTitle   = c.hr_jobs?.title ?? null;

  const updateField = async (updates: Record<string, any>) => {
    const { error } = await supabase
      .from("saved_candidates")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: [SAVED_CANDIDATES_QUERY_KEY] });
      onRefetch();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusSaving(true);
    await updateField({ status: newStatus });
    setStatusSaving(false);
  };

  const handleSaveNotes = async () => {
    await updateField({ notes: notesVal.trim() || null });
    setEditingNotes(false);
  };

  const handleArchive = async () => {
    await updateField({ status: "archived" });
  };

  const handleViewInSearch = () => {
    navigate(`/search/candidates/beta?kw=${encodeURIComponent(c.snapshot_name ?? "")}`);
  };

  return (
    <div className={cn(
      "bg-white rounded-xl border flex flex-col",
      "transition-shadow hover:shadow-md",
      c.status === "archived" ? "border-slate-200 opacity-60" : "border-slate-200 shadow-sm",
    )}>
      {/* HEADER */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0",
            `bg-gradient-to-br ${grad}`
          )}>
            {init}
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[13px] font-bold text-slate-800 leading-tight truncate">
                {c.snapshot_name ?? "Unknown"}
              </p>
              {/* Save type badge */}
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap"
                style={{ background: typeConf.bg, color: typeConf.color, borderColor: typeConf.border }}
              >
                {typeConf.label}
              </span>
            </div>
            {c.snapshot_title && (
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-1">
                {c.snapshot_title}
              </p>
            )}
            {c.snapshot_company && (
              <div className="flex items-center gap-1 mt-0.5">
                <Building2 size={9} className="text-slate-400 flex-shrink-0" />
                <span className="text-[10px] text-slate-500 truncate">{c.snapshot_company}</span>
              </div>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {c.snapshot_location && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <MapPin size={9} /> {c.snapshot_location}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-slate-400 ml-auto">
            <Clock size={9} /> {fmtDate(c.created_at)}
          </span>
        </div>
      </div>

      {/* DIVIDER */}
      <div className="h-px bg-slate-100 mx-4" />

      {/* CONTACT DATA */}
      <div className="px-4 py-3 space-y-1.5">
        {c.email
          ? <CopyChip value={c.email} label="Email" icon={Mail} />
          : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-dashed border-slate-200">
              <Mail size={11} className="text-slate-300" />
              <span className="text-[11px] text-slate-400 italic">Email not revealed</span>
            </div>
          )
        }
        {c.phone
          ? <CopyChip value={c.phone} label="Phone" icon={Phone} />
          : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-dashed border-slate-200">
              <Phone size={11} className="text-slate-300" />
              <span className="text-[11px] text-slate-400 italic">Phone not revealed</span>
            </div>
          )
        }
      </div>

      {/* TAGS */}
      {c.tags && c.tags.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {c.tags.map(tag => (
            <span key={tag} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-[9px] font-semibold text-violet-600">
              <Tag size={8} /> {tag}
            </span>
          ))}
        </div>
      )}

      {/* LINKED JOB */}
      {jobTitle && (
        <div className="px-4 pb-2">
          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-700 font-medium w-fit">
            <Briefcase size={9} /> {jobTitle}
          </span>
        </div>
      )}

      {/* NOTES */}
      <div className="px-4 pb-3">
        {editingNotes ? (
          <div className="space-y-1.5">
            <textarea
              autoFocus
              value={notesVal}
              onChange={e => setNotesVal(e.target.value)}
              rows={3}
              placeholder="Add a note…"
              className="w-full text-[11px] px-2 py-1.5 rounded-md border border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none text-slate-700"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleSaveNotes}
                className="flex items-center gap-1 px-2 py-1 rounded bg-violet-600 text-white text-[10px] font-semibold hover:bg-violet-700"
              >
                <Check size={9} /> Save
              </button>
              <button
                onClick={() => { setEditingNotes(false); setNotesVal(c.notes ?? ""); }}
                className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingNotes(true)}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded-md border text-[11px] transition-colors",
              c.notes
                ? "border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-300"
                : "border-dashed border-slate-200 text-slate-400 italic hover:border-violet-300 hover:text-violet-500"
            )}
          >
            {c.notes || "Add notes…"}
          </button>
        )}
      </div>

      {/* DIVIDER */}
      <div className="h-px bg-slate-100 mx-4" />

      {/* FOOTER ACTIONS */}
      <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap">
        {/* Status */}
        <StatusDropdown
          current={c.status}
          onChange={handleStatusChange}
          saving={statusSaving}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* View in search */}
        <button
          onClick={handleViewInSearch}
          title="Search for similar profiles"
          className="p-1.5 rounded-md text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition-colors"
        >
          <ExternalLink size={12} />
        </button>

        {/* Archive */}
        {c.status !== "archived" && (
          <button
            onClick={handleArchive}
            title="Archive"
            className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Archive size={12} />
          </button>
        )}

        {/* Invite */}
        <button
          onClick={() => onInvite(c)}
          disabled={!c.email && !c.phone}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all",
            c.email || c.phone
              ? "bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          <Send size={10} /> Invite
        </button>
      </div>
    </div>
  );
};