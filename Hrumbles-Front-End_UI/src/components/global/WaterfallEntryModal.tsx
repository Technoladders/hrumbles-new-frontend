// src/components/global/WaterfallEntryModal.tsx
// Global superadmin modal — enter found email/phone for a waterfall candidate
// and mark it as resolved. Updates both candidate_waterfall and
// master_contactout_profiles so the requesting org's UI auto-updates via realtime.

import React, { useState } from "react";
import { X, Mail, Phone, Check, Loader2, ExternalLink, User, Building2, Linkedin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface WaterfallEntry {
  id:                  string;
  organization_id:     string;
  linkedin_url:        string;
  full_name:           string | null;
  title:               string | null;
  company_name:        string | null;
  profile_picture_url: string | null;
  status:              string;
  found_email:         string | null;
  found_phone:         string | null;
  created_at:          string;
  expires_at:          string;
  sla_hours:           number;
  // org info joined
  org_name?:           string;
}

interface WaterfallEntryModalProps {
  entry:    WaterfallEntry;
  onClose:  () => void;
  onSaved:  () => void;  // called after successful resolve
}

export function WaterfallEntryModal({ entry, onClose, onSaved }: WaterfallEntryModalProps) {
  const [foundEmail,  setFoundEmail]  = useState(entry.found_email ?? "");
  const [foundPhone,  setFoundPhone]  = useState(entry.found_phone ?? "");
  const [notes,       setNotes]       = useState("");
  const [status,      setStatus]      = useState<"found" | "not_found">("found");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const isAlreadyResolved = entry.status === "found" || entry.status === "not_found";
  const pastSLA           = new Date(entry.expires_at) < new Date();

  const handleSubmit = async () => {
    if (status === "found" && !foundEmail.trim() && !foundPhone.trim()) {
      setError("Enter at least an email or phone number when marking as found.");
      return;
    }
    setSaving(true); setError(null);
    try {
      const now = new Date().toISOString();

      // 1. Update candidate_waterfall
      const { error: wfErr } = await supabase
        .from("candidate_waterfall")
        .update({
          status:           status,
          found_email:      foundEmail.trim() || null,
          found_phone:      foundPhone.trim() || null,
          found_by:         "global_superadmin",
          found_at:         now,
          resolution_notes: notes.trim() || null,
          updated_at:       now,
        })
        .eq("id", entry.id);
      if (wfErr) throw new Error(wfErr.message);

      // 2. Update master_contactout_profiles so the profile's revealed data is persisted
      if (status === "found" && (foundEmail.trim() || foundPhone.trim())) {
        const patch: Record<string, any> = { revealed_at: now };
        if (foundEmail.trim()) {
          patch.revealed_emails = [{ email: foundEmail.trim(), type: "personal", is_primary: true, source: "waterfall" }];
        }
        if (foundPhone.trim()) {
          patch.revealed_phones = [{ number: foundPhone.trim(), type: "unknown", recommended: true, source: "waterfall" }];
        }
        // Fire-and-forget — not all profiles exist in master table
        supabase.from("master_contactout_profiles")
          .update(patch)
          .eq("linkedin_url", entry.linkedin_url)
          .then(() => {}).catch(() => {});
      }

      onSaved();
    } catch (e: any) {
      setError(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-[14px] font-bold text-slate-800">Resolve Waterfall</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Enter the contact details you found for this candidate.
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Profile context */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {entry.profile_picture_url ? (
              <img src={entry.profile_picture_url} alt="" className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-violet-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-800 truncate">{entry.full_name ?? "Unknown"}</p>
              <p className="text-[10px] text-slate-500 truncate">{[entry.title, entry.company_name].filter(Boolean).join(" · ") || "—"}</p>
              <div className="flex items-center gap-2 mt-1">
                {entry.org_name && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium flex items-center gap-1">
                    <Building2 size={7} /> {entry.org_name}
                  </span>
                )}
                {pastSLA && entry.status === "pending" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">SLA Breached</span>
                )}
              </div>
            </div>
            {entry.linkedin_url && (
              <a href={entry.linkedin_url} target="_blank" rel="noreferrer"
                className="flex-shrink-0 text-blue-600 hover:text-blue-700 transition-colors">
                <Linkedin size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">

          {isAlreadyResolved && (
            <div className={cn("text-[11px] px-3 py-2 rounded-lg border font-medium",
              entry.status === "found"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-slate-50 border-slate-200 text-slate-500")}>
              Already resolved as <strong>{entry.status}</strong>. You can update below.
            </div>
          )}

          {/* Status */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Resolution</label>
            <div className="flex gap-2">
              {(["found", "not_found"] as const).map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={cn("flex-1 py-2 rounded-lg text-[11px] font-semibold border transition-all",
                    status === s
                      ? s === "found"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-600 text-white border-slate-600"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400")}>
                  {s === "found" ? "✓ Found" : "✕ Not Found"}
                </button>
              ))}
            </div>
          </div>

          {status === "found" && (
            <>
              {/* Email */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Personal Email *
                </label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 h-9 focus-within:border-violet-400 transition-colors">
                  <Mail size={11} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="email"
                    value={foundEmail}
                    onChange={e => setFoundEmail(e.target.value)}
                    placeholder="personal@email.com"
                    className="flex-1 bg-transparent text-[12px] text-slate-700 placeholder-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Phone <span className="text-slate-400 font-normal normal-case">(optional)</span>
                </label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 h-9 focus-within:border-violet-400 transition-colors">
                  <Phone size={11} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="tel"
                    value={foundPhone}
                    onChange={e => setFoundPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="flex-1 bg-transparent text-[12px] text-slate-700 placeholder-slate-300 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Notes <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Source used, confidence level, any context…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] text-slate-700 placeholder-slate-300 focus:outline-none focus:border-violet-400 resize-none transition-colors"
            />
          </div>

          {error && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-[12px] font-semibold border border-slate-200 text-slate-600 hover:border-slate-400 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className={cn("flex-1 py-2 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-2 transition-all",
              status === "found"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-slate-600 hover:bg-slate-700",
              saving && "opacity-60 cursor-not-allowed")}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {saving ? "Saving…" : status === "found" ? "Mark as Found" : "Mark as Not Found"}
          </button>
        </div>
      </div>
    </div>
  );
}