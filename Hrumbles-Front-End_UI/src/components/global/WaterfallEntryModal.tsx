// src/components/global/WaterfallEntryModal.tsx — v3
// Changes from v2:
//   - Multiple email inputs (add/remove rows) instead of single email field
//   - Multiple phone inputs (add/remove rows) instead of single phone field
//   - Sends foundEmails[] / foundPhones[] arrays to send-waterfall-resolved
//   - Updates master_contactout_profiles with all emails/phones as arrays
//   - First email is marked is_primary; first phone is marked recommended

import React, { useState } from "react";
import {
  X, Mail, Phone, Check, Loader2, Linkedin, User,
  Building2, Clock, Plus, Trash2,
} from "lucide-react";
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
  reveal_type:         "email" | "phone";   // NEW — which contact was requested
  org_name?:           string;
}

interface WaterfallEntryModalProps {
  entry:   WaterfallEntry;
  onClose: () => void;
  onSaved: () => void;
}

// ── Small row: text input with remove button ─────────────────────────────────
function InputRow({
  value, onChange, onRemove, placeholder, type = "text", canRemove,
}: {
  value:       string;
  onChange:    (v: string) => void;
  onRemove:    () => void;
  placeholder: string;
  type?:       string;
  canRemove:   boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[12px] text-slate-700 placeholder-slate-300
          focus:outline-none border border-slate-200 rounded-lg px-3 h-8
          focus:border-violet-400 transition-colors"
      />
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg
            text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}

export function WaterfallEntryModal({ entry, onClose, onSaved }: WaterfallEntryModalProps) {
  // Resolution status — default to "not_found" for missing contacts, "found" when data ready
  const [status, setStatus] = useState<"found" | "not_found">("found");

  // Inputs scoped to reveal_type — email request shows only email fields, phone shows only phone
  const isEmailRequest = entry.reveal_type === "email";
  const isPhoneRequest = entry.reveal_type === "phone";

  // Multi-email state (only used when reveal_type === "email")
  const [emails, setEmails] = useState<string[]>(
    entry.found_email ? [entry.found_email] : [""]
  );
  // Multi-phone state (only used when reveal_type === "phone")
  const [phones, setPhones] = useState<string[]>(
    entry.found_phone ? [entry.found_phone] : [""]
  );

  const [notes,  setNotes]  = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const isAlreadyResolved = entry.status === "found" || entry.status === "not_found";
  const pastSLA           = new Date(entry.expires_at) < new Date();

  // ── Email row helpers ──────────────────────────────────────────────────────
  const updateEmail  = (i: number, v: string) => setEmails(prev => prev.map((e, idx) => idx === i ? v : e));
  const removeEmail  = (i: number)             => setEmails(prev => prev.filter((_, idx) => idx !== i));
  const addEmail     = ()                       => setEmails(prev => [...prev, ""]);

  // ── Phone row helpers ──────────────────────────────────────────────────────
  const updatePhone  = (i: number, v: string) => setPhones(prev => prev.map((p, idx) => idx === i ? v : p));
  const removePhone  = (i: number)             => setPhones(prev => prev.filter((_, idx) => idx !== i));
  const addPhone     = ()                       => setPhones(prev => [...prev, ""]);

  const handleSubmit = async () => {
    const cleanEmails = isEmailRequest ? emails.map(e => e.trim()).filter(Boolean) : [];
    const cleanPhones = isPhoneRequest ? phones.map(p => p.trim()).filter(Boolean) : [];

    if (status === "found" && cleanEmails.length === 0 && cleanPhones.length === 0) {
      setError(
        isEmailRequest
          ? "Enter at least one email address when marking as found."
          : "Enter at least one phone number when marking as found."
      );
      return;
    }

    setSaving(true); setError(null);
    try {
      const now = new Date().toISOString();

      // 1. Update candidate_waterfall
      //    Store first email/phone in legacy columns for compatibility
      const { error: wfErr } = await supabase
        .from("candidate_waterfall")
        .update({
          status:           status,
          found_email:      cleanEmails[0] ?? null,
          found_phone:      cleanPhones[0] ?? null,
          found_by:         "global_superadmin",
          found_at:         now,
          resolution_notes: notes.trim() || null,
          updated_at:       now,
        })
        .eq("id", entry.id);

      if (wfErr) throw new Error(wfErr.message);

      // 2. Update master_contactout_profiles with ALL emails/phones
      if (status === "found" && (cleanEmails.length > 0 || cleanPhones.length > 0)) {
        const patch: Record<string, any> = { revealed_at: now };

        if (cleanEmails.length > 0) {
          patch.revealed_emails = cleanEmails.map((email, i) => ({
            email,
            type:       "personal",
            is_primary: i === 0,
            source:     "waterfall",
          }));
        }

        if (cleanPhones.length > 0) {
          patch.revealed_phones = cleanPhones.map((number, i) => ({
            number,
            type:        "unknown",
            recommended: i === 0,
            source:      "waterfall",
          }));
        }

        // Fire-and-forget — non-blocking
        supabase
          .from("master_contactout_profiles")
          .update(patch)
          .eq("linkedin_url", entry.linkedin_url)
          .then(() => {})
          .catch(() => {});
      }

      // 3. Fire-and-forget: send email + in-app notification to recruiter
      //    Pass arrays so the edge function can include all contacts in the email
      supabase.functions
        .invoke("send-waterfall-resolved", {
          body: {
            waterfallId:  entry.id,
            status,
            foundEmails:  cleanEmails,
            foundPhones:  cleanPhones,
            action:       "resolved",
          },
        })
        .then(() => {})
        .catch((e: any) =>
          console.warn("[WaterfallEntryModal] notification error (non-blocking):", e?.message)
        );

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

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4
        overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex-shrink-0 flex items-start justify-between px-5 pt-5 pb-4
          border-b border-slate-100">
          <div>
            <h2 className="text-[14px] font-bold text-slate-800">Resolve Waterfall</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Enter the contact details you found for this candidate.
            </p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg
              text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Profile context */}
        <div className="flex-shrink-0 px-5 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {entry.profile_picture_url ? (
              <img src={entry.profile_picture_url} alt=""
                className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center
                justify-center flex-shrink-0">
                <User size={16} className="text-violet-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-800 truncate">
                {entry.full_name ?? "Unknown"}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {[entry.title, entry.company_name].filter(Boolean).join(" · ") || "—"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {entry.org_name && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100
                    text-violet-700 font-medium flex items-center gap-1">
                    <Building2 size={7} /> {entry.org_name}
                  </span>
                )}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                  entry.reveal_type === "email"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-teal-100 text-teal-700"
                }`}>
                  {entry.reveal_type === "email" ? "✉ Email Request" : "📞 Phone Request"}
                </span>
                {pastSLA && entry.status === "pending" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100
                    text-red-600 font-medium">SLA Breached</span>
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

        {/* Form — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {isAlreadyResolved && (
            <div className={cn("text-[11px] px-3 py-2 rounded-lg border font-medium",
              entry.status === "found"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-slate-50 border-slate-200 text-slate-500")}>
              Already resolved as <strong>{entry.status}</strong>. You can update below.
            </div>
          )}

          {/* Status picker */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider
              block mb-1.5">Resolution</label>
            <div className="flex gap-2">
              {(["found", "not_found"] as const).map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[11px] font-semibold border transition-all",
                    status === s
                      ? s === "found"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-600 text-white border-slate-600"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                  )}>
                  {s === "found" ? "✓ Found" : "✕ Not Found"}
                </button>
              ))}
            </div>
          </div>

          {/* ── Email inputs (only for email reveal_type requests) ────── */}
          {status === "found" && isEmailRequest && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider
                  flex items-center gap-1">
                  <Mail size={9} /> Personal Email(s)
                  <span className="text-slate-400 font-normal normal-case ml-1">
                    {emails.filter(e => e.trim()).length > 0
                      ? `(${emails.filter(e => e.trim()).length} added)`
                      : "(at least one required)"}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={addEmail}
                  className="flex items-center gap-1 text-[10px] text-violet-600
                    hover:text-violet-800 font-medium transition-colors">
                  <Plus size={10} /> Add
                </button>
              </div>

              <div className="space-y-1.5">
                {emails.map((email, i) => (
                  <InputRow
                    key={i}
                    value={email}
                    onChange={v => updateEmail(i, v)}
                    onRemove={() => removeEmail(i)}
                    placeholder={i === 0 ? "primary@email.com" : "alternate@email.com"}
                    type="email"
                    canRemove={emails.length > 1}
                  />
                ))}
              </div>

              {emails.length > 1 && (
                <p className="text-[9px] text-slate-400 mt-1">First email will be set as primary.</p>
              )}
            </div>
          )}

          {/* ── Phone inputs (only for phone reveal_type requests) ─────── */}
          {status === "found" && isPhoneRequest && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider
                  flex items-center gap-1">
                  <Phone size={9} /> Phone Number(s)
                  <span className="text-slate-400 font-normal normal-case ml-1">
                    {phones.filter(p => p.trim()).length > 0
                      ? `(${phones.filter(p => p.trim()).length} added)`
                      : "(at least one required)"}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={addPhone}
                  className="flex items-center gap-1 text-[10px] text-violet-600
                    hover:text-violet-800 font-medium transition-colors">
                  <Plus size={10} /> Add
                </button>
              </div>

              <div className="space-y-1.5">
                {phones.map((phone, i) => (
                  <InputRow
                    key={i}
                    value={phone}
                    onChange={v => updatePhone(i, v)}
                    onRemove={() => removePhone(i)}
                    placeholder={i === 0 ? "+91 98765 43210" : "alternate number"}
                    type="tel"
                    canRemove={phones.length > 1}
                  />
                ))}
              </div>

              {phones.length > 1 && (
                <p className="text-[9px] text-slate-400 mt-1">First phone will be set as recommended.</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider
              block mb-1.5">
              Notes
              <span className="text-slate-400 font-normal normal-case ml-1">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Source used, confidence level, any context…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px]
                text-slate-700 placeholder-slate-300 focus:outline-none
                focus:border-violet-400 resize-none transition-colors"
            />
          </div>

          {/* Notification note */}
          <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <Clock size={9} />
            The recruiter will be notified via email and in-app notification.
          </p>

          {error && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-200
              rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 pb-5 flex items-center gap-3 border-t
          border-slate-100 pt-4">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-xl text-[12px] font-semibold border
              border-slate-200 text-slate-600 hover:border-slate-400 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className={cn(
              "flex-1 py-2 rounded-xl text-[12px] font-bold text-white",
              "flex items-center justify-center gap-2 transition-all",
              status === "found" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-600 hover:bg-slate-700",
              saving && "opacity-60 cursor-not-allowed"
            )}>
            {saving
              ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
              : <><Check size={13} /> {status === "found" ? "Mark as Found" : "Mark as Not Found"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}