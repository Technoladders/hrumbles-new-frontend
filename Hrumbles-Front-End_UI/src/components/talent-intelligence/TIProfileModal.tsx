// src/components/talent-intelligence/TIProfileModal.tsx  — v2
// Changes vs v1:
//   - RevealBlock: shows only personal emails; if revealed but only professional → "No personal email"
//   - RevealBlock button: only shows if emails.length === 0 (not yet revealed at all)
//   - Send Invite button: if multiple personal emails → inline picker first
//   - onInvite signature: (profile, email, phone) to be consistent with table

import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import {
  X, Linkedin, MapPin, Building2, Briefcase, Mail, Phone,
  GraduationCap, Award, Globe, Clock, Zap, Star,
  Eye, Loader2, Check, Copy, Send, ExternalLink, Users, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import { cn } from "@/lib/utils";
import { TIProfile, TIRevealedEmail, TIRevealedPhone } from "@/types/talentIntelligence";

// ── Personal email helper (same as in TIResultsTable) ─────────
const isPersonalEmail = (e: TIRevealedEmail): boolean =>
  e.type === "personal" || e.type === "direct" || e.type === "personal_email";

// ── Helpers ───────────────────────────────────────────────────
function fmt(year: number, month: number): string {
  if (!year) return "";
  if (!month) return String(year);
  return new Date(year, month - 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}
function expDuration(exp: any): string {
  const start = fmt(exp.start_date_year, exp.start_date_month);
  const end   = exp.is_current ? "Present" : fmt(exp.end_date_year, exp.end_date_month);
  return [start, end].filter(Boolean).join(" – ");
}
function sectionLabel(label: string) {
  return <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{label}</h4>;
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ profile, size = 20 }: { profile: TIProfile; size?: number }) {
  const [err, setErr] = useState(false);
  const ini = (profile.full_name ?? "?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
  const sz  = `w-${size} h-${size}`;
  if (profile.profile_picture_url && !err) {
    return <img src={profile.profile_picture_url} alt={profile.full_name ?? ""} className={`${sz} rounded-xl object-cover border-2 border-white shadow-md`} onError={() => setErr(true)} />;
  }
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br from-violet-500 to-violet-800 flex items-center justify-center text-white font-bold shadow-md`}
      style={{ fontSize: size < 14 ? 16 : 24 }}>
      {ini}
    </div>
  );
}

// ── RevealBlock — personal emails only ───────────────────────

interface RevealBlockProps {
  profile:      TIProfile;
  onRevealDone: (emails: TIRevealedEmail[], phones: TIRevealedPhone[]) => void;
}
 
function RevealBlock({ profile, onRevealDone }: RevealBlockProps) {
  const auth           = getAuthDataFromLocalStorage();
  const organizationId = auth?.organization_id ?? null;
  const userId         = auth?.userId ?? null;
 
  const [emails,       setEmails]       = useState<TIRevealedEmail[]>(profile.revealed_emails ?? []);
  const [phones,       setPhones]       = useState<TIRevealedPhone[]>(profile.revealed_phones ?? []);
  const [emailLoad,    setEmailLoad]    = useState(false);
  const [phoneLoad,    setPhoneLoad]    = useState(false);
  const [emailErr,     setEmailErr]     = useState<string|null>(null);
  const [phoneErr,     setPhoneErr]     = useState<string|null>(null);
  const [copied,       setCopied]       = useState<string|null>(null);
  const [phonePending, setPhonePending] = useState(false);
 
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
 
  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
 
  // Sync when profile prop updates
  useEffect(() => {
    setEmails(profile.revealed_emails ?? []);
    setPhones(profile.revealed_phones ?? []);
    setEmailErr(null); setPhoneErr(null);
  }, [profile.id]);
 
  useEffect(() => {
    if ((profile.revealed_emails?.length ?? 0) > emails.length) setEmails(profile.revealed_emails ?? []);
  }, [profile.revealed_emails?.length ?? 0]);
 
  useEffect(() => {
    const newPhones = profile.revealed_phones ?? [];
    if (newPhones.length > 0 && phonePending) {
      // Webhook delivered phone, polling resolved it
      setPhonePending(false);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setPhones(newPhones);
      onRevealDone(emails, newPhones);
    } else if (newPhones.length > phones.length) {
      setPhones(newPhones);
    }
  }, [profile.revealed_phones?.length ?? 0]);
 
  const copy = (text: string) => { navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(null), 2000); };
 
  // ── Poll for phone (same logic as RevealCell) ─────────────
  const startPhonePolling = (linkedinUrl: string) => {
    let count = 0;
    pollRef.current = setInterval(async () => {
      count++;
      if (count > 20) {
        clearInterval(pollRef.current!); pollRef.current = null;
        setPhonePending(false);
        setPhoneErr("Phone verification taking longer than expected — check back in a few minutes.");
        return;
      }
      try {
        const { data } = await supabase
          .from("master_contactout_profiles")
          .select("revealed_phones")
          .eq("linkedin_url", linkedinUrl)
          .maybeSingle();
        const newPhones: TIRevealedPhone[] = data?.revealed_phones ?? [];
        if (newPhones.length > 0) {
          clearInterval(pollRef.current!); pollRef.current = null;
          setPhonePending(false);
          setPhones(newPhones);
          onRevealDone(emails, newPhones);
        }
      } catch { /* non-fatal */ }
    }, 3000);
  };
 
  const reveal = async (revealType: "email"|"phone") => {
    if (!organizationId) return;
    const setLoad = revealType==="email" ? setEmailLoad : setPhoneLoad;
    const setErr  = revealType==="email" ? setEmailErr  : setPhoneErr;
    setLoad(true); setErr(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("ti-reveal-contact", {
        body: { linkedinUrl: profile.linkedin_url, revealType, organizationId, userId },
      });
      if (fnErr || (data?.error && !data?.phonePending)) {
        const msg = data?.message ?? data?.error ?? fnErr?.message ?? "Reveal failed";
        if (data?.code === "INSUFFICIENT_CREDITS") setErr(`Insufficient credits. ${msg}`);
        else setErr(msg);
        return;
      }
      // ── Phone pending via webhook ─────────────────────────
      if (data?.phonePending) {
        setPhonePending(true);
        startPhonePolling(profile.linkedin_url);
        return;
      }
      // ── Normal success ────────────────────────────────────
      const ne: TIRevealedEmail[] = data.allEmails ?? [];
      const np: TIRevealedPhone[] = data.allPhones ?? [];
      const mergedE = revealType==="email" ? ne : emails;
      const mergedP = revealType==="phone" ? np : phones;
      setEmails(mergedE); setPhones(mergedP);
      onRevealDone(mergedE, mergedP);
    } catch(err: any) { setErr(err?.message ?? "Reveal failed."); }
    finally { setLoad(false); }
  };
 
  const ca = profile.contact_availability;
  const canPersonalEmail = !!ca?.personal_email;
  const canPhone         = !!ca?.phone;
 
  const personalEmails   = emails.filter(isPersonalEmail);
  const emailWasRevealed = emails.length > 0;
  const hasPersonal      = personalEmails.length > 0;
 
  return (
    <div className="space-y-3">
      {/* ── Email ── */}
      {canPersonalEmail && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Mail size={13} className="text-violet-500" />
              <span className="text-xs font-semibold text-slate-700">Email</span>
              <span className="text-[9px] text-slate-400">(personal)</span>
            </div>
            {!emailWasRevealed && !emailLoad && (
              <button onClick={() => reveal("email")} disabled={emailLoad}
                className="flex items-center gap-1 px-3 py-1 bg-violet-600 text-white text-[11px] rounded-lg font-medium hover:bg-violet-700 disabled:opacity-60 transition-colors">
                <Eye size={10} /> Reveal
              </button>
            )}
            {emailLoad && <span className="flex items-center gap-1 text-[11px] text-violet-600"><Loader2 size={10} className="animate-spin" /> Revealing…</span>}
          </div>
          {emailErr && <p className="text-xs text-red-500 mb-1">{emailErr}</p>}
          {hasPersonal ? (
            <div className="space-y-1.5">
              {personalEmails.map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <a href={`mailto:${e.email}`} onClick={ev=>ev.stopPropagation()}
                      className="text-sm text-violet-700 font-medium hover:underline truncate block">{e.email}</a>
                    <span className="text-[10px] text-slate-400">personal{e.is_primary?" · primary":""}</span>
                  </div>
                  <button onClick={() => copy(e.email)} className="p-1 text-slate-400 hover:text-violet-600 flex-shrink-0 transition-colors">
                    {copied===e.email ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                </div>
              ))}
            </div>
          ) : emailWasRevealed ? (
            <p className="text-[11px] text-amber-600">No personal email found for this profile</p>
          ) : !emailLoad && (
            <p className="text-[11px] text-slate-400">Click Reveal to unlock personal email</p>
          )}
        </div>
      )}
 
      {/* ── Phone ── */}
      {canPhone && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Phone size={13} className="text-violet-500" />
              <span className="text-xs font-semibold text-slate-700">Phone</span>
            </div>
            {phones.length === 0 && !phonePending && (
              <button onClick={() => reveal("phone")} disabled={phoneLoad}
                className="flex items-center gap-1 px-3 py-1 border border-violet-300 text-violet-700 text-[11px] rounded-lg font-medium hover:bg-violet-50 disabled:opacity-60 transition-colors">
                {phoneLoad ? <Loader2 size={10} className="animate-spin" /> : <Eye size={10} />}
                {phoneLoad ? "Revealing…" : "Reveal"}
              </button>
            )}
          </div>
          {phoneErr && <p className="text-xs text-red-500 mb-1">{phoneErr}</p>}
          {phones.length > 0 ? (
            <div className="space-y-1.5">
              {phones.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <a href={`tel:${p.number}`} onClick={ev=>ev.stopPropagation()}
                      className="text-sm text-violet-700 font-medium hover:underline">{p.number}</a>
                    <div className="flex items-center gap-1 mt-0.5">
                      {p.recommended && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">recommended</span>}
                      {p.type && <span className="text-[10px] text-slate-400 capitalize">{p.type}</span>}
                    </div>
                  </div>
                  <button onClick={() => copy(p.number)} className="p-1 text-slate-400 hover:text-violet-600 flex-shrink-0 transition-colors">
                    {copied===p.number ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                </div>
              ))}
            </div>
          ) : phonePending ? (
            /* Webhook pending state */
            <div className="flex items-start gap-2.5 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
              <Loader2 size={14} className="animate-spin text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-semibold text-amber-700">Verifying phone number…</p>
                <p className="text-[10px] text-amber-600 mt-0.5 leading-snug">
                Locating this contact's number. It will appear here automatically within 1–2 minutes.
                </p>
              </div>
            </div>
          ) : !phoneLoad && (
            <p className="text-[11px] text-slate-400">Click Reveal to unlock phone</p>
          )}
        </div>
      )}
 
      {!canPersonalEmail && !canPhone && (
        <p className="text-xs text-slate-400 text-center py-2">No contact info available for this profile</p>
      )}
    </div>
  );
}

// ── Experience item ───────────────────────────────────────────
function ExpItem({ exp, isLast }: { exp: any; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full border-2 mt-1 flex-shrink-0 ${exp.is_current ? "border-violet-600 bg-violet-600" : "border-slate-300 bg-white"}`} />
        {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1" />}
      </div>
      <div className={`${isLast ? "pb-0" : "pb-4"} flex-1 min-w-0`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{exp.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {exp.logo_url && <img src={exp.logo_url} alt={exp.company_name} className="w-4 h-4 rounded object-contain" onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />}
              <p className="text-xs text-violet-700 font-medium">{exp.company_name}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-slate-400 whitespace-nowrap">{expDuration(exp)}</p>
            {exp.is_current && <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] rounded-full font-medium">Current</span>}
          </div>
        </div>
        {exp.locality && <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={9}/>{exp.locality}</p>}
        {exp.summary && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3">{exp.summary}</p>}
      </div>
    </div>
  );
}

// ── Inline email picker for Send Invite ───────────────────────
// Shown when modal's "Send Invite" is clicked with multiple personal emails

interface EmailPickerDropdownProps {
  personalEmails: TIRevealedEmail[];
  phones:         TIRevealedPhone[];
  onSelect:       (email: string|null, phone: string|null) => void;
  onClose:        () => void;
}

function EmailPickerDropdown({ personalEmails, phones, onSelect, onClose }: EmailPickerDropdownProps) {
  const [sel, setSel] = useState<{ kind:"email"|"phone"; value:string }|null>(
    personalEmails[0] ? { kind:"email", value:personalEmails[0].email }
    : phones[0]       ? { kind:"phone", value:phones[0].number }
    : null
  );

  return (
    <div className="absolute right-0 top-full mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-2xl z-[99999] p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150">
      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Choose invite contact</p>
      {personalEmails.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[8px] text-slate-400 font-bold uppercase mb-0.5">Personal Email</p>
          {personalEmails.map((e, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-50 rounded px-1">
              <input type="radio" name="modal-invite" checked={sel?.kind==="email"&&sel.value===e.email}
                onChange={() => setSel({kind:"email",value:e.email})} className="accent-violet-600 flex-shrink-0" />
              <span className="text-[10px] font-mono text-slate-700 truncate">{e.email}</span>
            </label>
          ))}
        </div>
      )}
      {phones.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[8px] text-slate-400 font-bold uppercase mb-0.5">Phone</p>
          {phones.slice(0,2).map((p, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-50 rounded px-1">
              <input type="radio" name="modal-invite" checked={sel?.kind==="phone"&&sel.value===p.number}
                onChange={() => setSel({kind:"phone",value:p.number})} className="accent-violet-600 flex-shrink-0" />
              <span className="text-[10px] font-mono text-slate-700">{p.number}</span>
              {p.recommended && <span className="text-[8px] px-1 bg-green-100 text-green-700 rounded ml-auto">✓</span>}
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="flex-1 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-500 hover:bg-slate-50">Cancel</button>
        <button disabled={!sel}
          onClick={() => sel && onSelect(sel.kind==="email"?sel.value:null, sel.kind==="phone"?sel.value:null)}
          className="flex-1 py-1.5 bg-violet-600 text-white rounded-lg text-[11px] font-semibold disabled:opacity-40 hover:bg-violet-700 transition-colors flex items-center justify-center gap-1">
          <Send size={10}/> Invite
        </button>
      </div>
    </div>
  );
}

// ── Modal content ─────────────────────────────────────────────

export interface TIProfileModalProps {
  profile:         TIProfile | null;
  onClose:         () => void;
  onInvite:        (p: TIProfile, email: string|null, phone: string|null) => void;  // ← updated signature
  onProfileUpdate: (id: string, patch: Partial<TIProfile>) => void;
}

function ModalContent({ profile, onClose, onInvite, onProfileUpdate }: TIProfileModalProps) {
  if (!profile) return null;

  const [showEmailPicker, setShowEmailPicker] = useState(false);

  const isOpenToWork = profile.work_status === "open_to_work";
  const currentExp   = (profile.experience ?? []).find(e => e.is_current);
  const allExp       = profile.experience ?? [];
  const allEdu       = profile.education  ?? [];
  const allCerts     = profile.certifications ?? [];
  const allLangs     = profile.languages ?? [];
  const skills       = profile.skills ?? [];

  const handleRevealDone = (emails: TIRevealedEmail[], phones: TIRevealedPhone[]) => {
    onProfileUpdate(profile.id, { revealed_emails: emails, revealed_phones: phones, revealed_at: new Date().toISOString() });
  };

  // ── Send Invite logic — personal email only ───────────────
  const revealedPersonalEmails = (profile.revealed_emails ?? []).filter(isPersonalEmail);
  const revealedPhones         = profile.revealed_phones ?? [];
  const hasContactForInvite    = revealedPersonalEmails.length > 0 || revealedPhones.length > 0;

  const handleSendInvite = () => {
    if (revealedPersonalEmails.length > 1 || (revealedPersonalEmails.length >= 1 && revealedPhones.length > 0)) {
      // Multiple options → show picker
      setShowEmailPicker(true);
    } else if (revealedPersonalEmails.length === 1) {
      // Single personal email → go directly
      onInvite(profile, revealedPersonalEmails[0].email, revealedPhones[0]?.number ?? null);
    } else if (revealedPhones.length > 0) {
      // Phone only
      onInvite(profile, null, revealedPhones[0].number);
    } else {
      // No reveal yet — still open with nulls so user can fill
      onInvite(profile, null, null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <span className="text-xs text-slate-400 truncate max-w-[300px]">
            {profile.full_name} · {profile.title ?? "No title"}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Send Invite button with picker */}
            <div className="relative">
              <button onClick={handleSendInvite}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg font-medium hover:bg-violet-700 transition-colors">
                <Send size={12} />
                Send Invite
                {/* Show dropdown chevron if multiple contact options */}
                {(revealedPersonalEmails.length > 1 || (revealedPersonalEmails.length >= 1 && revealedPhones.length > 0)) && (
                  <ChevronDown size={10} className="ml-0.5" />
                )}
              </button>
              {showEmailPicker && (
                <EmailPickerDropdown
                  personalEmails={revealedPersonalEmails}
                  phones={revealedPhones}
                  onSelect={(email, phone) => { setShowEmailPicker(false); onInvite(profile, email, phone); }}
                  onClose={() => setShowEmailPicker(false)}
                />
              )}
            </div>
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                className="flex items-center gap-1 px-3 py-1.5 border border-[#0A66C2] text-[#0A66C2] text-xs rounded-lg font-medium hover:bg-blue-50 transition-colors">
                <Linkedin size={12}/> LinkedIn <ExternalLink size={9}/>
              </a>
            )}
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* Body: two-column */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Left — contact, skills, education */}
          <div className="w-[280px] flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto p-5 space-y-5">
            {/* Avatar + name */}
            <div className="text-center">
              <div className="flex justify-center mb-3 relative">
                <Avatar profile={profile} size={20}/>
                {isOpenToWork && (
                  <div className="absolute bottom-0 right-[calc(50%-44px)] w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Zap size={9} className="text-white"/>
                  </div>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">{profile.full_name ?? "Unknown"}</h2>
              {profile.title && <p className="text-xs text-slate-500 mt-0.5">{profile.title}</p>}
              {(currentExp?.company_name ?? profile.company_name) && (
                <p className="text-xs text-violet-700 font-medium mt-0.5">@ {currentExp?.company_name ?? profile.company_name}</p>
              )}
              {profile.location && (
                <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1"><MapPin size={10}/>{profile.location}</p>
              )}
              {isOpenToWork && <span className="inline-block mt-2 px-2.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Open to Work</span>}
            </div>

            {/* Meta */}
            <div className="space-y-2">
              {profile.seniority && <div className="flex items-center gap-2 text-xs text-slate-600"><Star size={12} className="text-violet-400 flex-shrink-0"/><span>{profile.seniority}</span></div>}
              {profile.job_function && <div className="flex items-center gap-2 text-xs text-slate-600"><Briefcase size={12} className="text-violet-400 flex-shrink-0"/><span>{profile.job_function}</span></div>}
              {profile.company_industry && <div className="flex items-center gap-2 text-xs text-slate-600"><Building2 size={12} className="text-violet-400 flex-shrink-0"/><span className="truncate">{profile.company_industry}</span></div>}
              {profile.followers && <div className="flex items-center gap-2 text-xs text-slate-600"><Users size={12} className="text-violet-400 flex-shrink-0"/><span>{profile.followers.toLocaleString()} followers</span></div>}
              {profile.first_discovered_at && (
                <div className="flex items-center gap-2 text-xs text-slate-400"><Clock size={12} className="flex-shrink-0"/>
                  <span>Discovered {new Date(profile.first_discovered_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span>
                </div>
              )}
            </div>

            {/* Contact reveal */}
            <div>
              {sectionLabel("Contact Information")}
              <RevealBlock profile={profile} onRevealDone={handleRevealDone}/>
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div>
                {sectionLabel("Skills")}
                <div className="flex flex-wrap gap-1.5">
                  {skills.map(sk => <span key={sk} className="px-2 py-0.5 bg-violet-50 border border-violet-200 text-violet-700 text-[11px] rounded-full font-medium">{sk}</span>)}
                </div>
              </div>
            )}

            {/* Languages */}
            {allLangs.length > 0 && (
              <div>
                {sectionLabel("Languages")}
                <div className="flex flex-wrap gap-1.5">
                  {allLangs.map(l => <span key={l.name} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] rounded-full">{l.name}</span>)}
                </div>
              </div>
            )}

            {/* Education */}
            {allEdu.length > 0 && (
              <div>
                {sectionLabel("Education")}
                <div className="space-y-3">
                  {allEdu.map((e, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-7 h-7 rounded bg-blue-100 flex items-center justify-center flex-shrink-0"><GraduationCap size={13} className="text-blue-500"/></div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 leading-tight">{e.school_name}</p>
                        {e.degree && <p className="text-[11px] text-slate-500">{e.degree}</p>}
                        {e.field_of_study && <p className="text-[11px] text-slate-400">{e.field_of_study}</p>}
                        {(e.start_date_year||e.end_date_year) && <p className="text-[10px] text-slate-400">{e.start_date_year}{e.end_date_year?` – ${e.end_date_year}`:""}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {allCerts.length > 0 && (
              <div>
                {sectionLabel("Certifications")}
                <div className="space-y-2">
                  {allCerts.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-7 h-7 rounded bg-amber-100 flex items-center justify-center flex-shrink-0"><Award size={13} className="text-amber-500"/></div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-800 leading-tight">{c.name}</p>
                        {c.authority && <p className="text-[10px] text-slate-500">{c.authority}</p>}
                        {c.start_date_year && <p className="text-[10px] text-slate-400">{c.start_date_year}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — summary + experience */}
          <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6">
            {profile.summary && (
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                {sectionLabel("About")}
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{profile.summary}</p>
              </div>
            )}
            {allExp.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                {sectionLabel(`Experience (${allExp.length})`)}
                <div>{allExp.map((exp, i) => <ExpItem key={i} exp={exp} isLast={i===allExp.length-1}/>)}</div>
              </div>
            )}
            {allExp.length === 0 && !profile.summary && (
              <div className="flex items-center justify-center py-16 text-slate-400 text-sm">No additional profile data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Portal wrapper ────────────────────────────────────────────
export function TIProfileModal(props: TIProfileModalProps) {
  if (!props.profile) return null;
  return ReactDOM.createPortal(<ModalContent {...props}/>, document.body);
}