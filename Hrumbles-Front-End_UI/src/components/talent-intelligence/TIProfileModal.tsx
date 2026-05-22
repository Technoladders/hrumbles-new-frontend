// src/components/talent-intelligence/TIProfileModal.tsx
// Resume-style profile modal — rendered via ReactDOM.createPortal above MainLayout

import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  X, Linkedin, MapPin, Building2, Briefcase, Mail, Phone,
  GraduationCap, Award, Globe, Clock, Zap, Star,
  Eye, Loader2, Check, Copy, Send, ExternalLink, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import {
  TIProfile, TIRevealedEmail, TIRevealedPhone,
} from "@/types/talentIntelligence";

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
  return (
    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{label}</h4>
  );
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

// ── Reveal section ────────────────────────────────────────────

interface RevealBlockProps {
  profile:        TIProfile;
  onRevealDone:   (emails: TIRevealedEmail[], phones: TIRevealedPhone[]) => void;
}

function RevealBlock({ profile, onRevealDone }: RevealBlockProps) {
  const authData       = getAuthDataFromLocalStorage();
  const organizationId = authData?.organization_id ?? null;
  const userId         = authData?.userId ?? null;

  const [emails,      setEmails]      = useState<TIRevealedEmail[]>(profile.revealed_emails ?? []);
  const [phones,      setPhones]      = useState<TIRevealedPhone[]>(profile.revealed_phones ?? []);
  const [emailLoad,   setEmailLoad]   = useState(false);
  const [phoneLoad,   setPhoneLoad]   = useState(false);
  const [emailErr,    setEmailErr]    = useState<string|null>(null);
  const [phoneErr,    setPhoneErr]    = useState<string|null>(null);
  const [copied,      setCopied]      = useState<string|null>(null);

  useEffect(() => {
    setEmails(profile.revealed_emails ?? []);
    setPhones(profile.revealed_phones ?? []);
    setEmailErr(null); setPhoneErr(null);
  }, [profile.id]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const reveal = async (revealType: "email" | "phone") => {
    if (!organizationId) return;
    const setLoad = revealType === "email" ? setEmailLoad : setPhoneLoad;
    const setErr  = revealType === "email" ? setEmailErr  : setPhoneErr;
    setLoad(true); setErr(null);
    try {
   const { data, error: fnErr } = await supabase.functions.invoke("ti-reveal-contact", {
     body: { linkedinUrl: profile.linkedin_url, revealType, organizationId, userId },
   });
      if (fnErr || data?.error) { setErr(data?.message ?? fnErr?.message ?? "Reveal failed"); return; }

      const newEmails: TIRevealedEmail[] = data.allEmails ?? [];
      const newPhones: TIRevealedPhone[] = data.allPhones ?? [];
      const merged = {
        emails: revealType === "email" ? newEmails : emails,
        phones: revealType === "phone" ? newPhones : phones,
      };
      setEmails(merged.emails); setPhones(merged.phones);
      onRevealDone(merged.emails, merged.phones);

      const updates: Record<string,any> = { revealed_at: new Date().toISOString() };
      if (merged.emails.length) updates.revealed_emails = merged.emails;
      if (merged.phones.length) updates.revealed_phones = merged.phones;
      supabase.from("master_contactout_profiles").update(updates).eq("id", profile.id).then(() => {});
    } catch (err: any) {
      setErr(err?.message ?? "Failed");
    } finally { setLoad(false); }
  };

  const ca = profile.contact_availability;
  const canEmail = ca?.personal_email || ca?.work_email;
  const canPhone = ca?.phone;

  return (
    <div className="space-y-3">
      {/* Email */}
      {canEmail && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Mail size={13} className="text-violet-500" />
              <span className="text-xs font-semibold text-slate-700">Email</span>
            </div>
            {emails.length === 0 && (
              <button onClick={() => reveal("email")} disabled={emailLoad}
                className="flex items-center gap-1 px-3 py-1 bg-violet-600 text-white text-[11px] rounded-lg font-medium hover:bg-violet-700 disabled:opacity-60 transition-colors">
                {emailLoad ? <Loader2 size={10} className="animate-spin" /> : <Eye size={10} />}
                {emailLoad ? "Revealing…" : "Reveal"}
              </button>
            )}
          </div>
          {emailErr && <p className="text-xs text-red-500 mb-1">{emailErr}</p>}
          {emails.length > 0 ? (
            <div className="space-y-1.5">
              {emails.map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <a href={`mailto:${e.email}`} onClick={ev => ev.stopPropagation()}
                      className="text-sm text-violet-700 font-medium hover:underline truncate block">{e.email}</a>
                    <span className="text-[10px] text-slate-400 capitalize">{e.type ?? (e.is_primary ? "primary" : "other")}</span>
                  </div>
                  <button onClick={() => copy(e.email)}
                    className="p-1 text-slate-400 hover:text-violet-600 flex-shrink-0 transition-colors">
                    {copied === e.email ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                </div>
              ))}
            </div>
          ) : !emailLoad && (
            <p className="text-[11px] text-slate-400">Click Reveal to unlock email</p>
          )}
        </div>
      )}

      {/* Phone */}
      {canPhone && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Phone size={13} className="text-violet-500" />
              <span className="text-xs font-semibold text-slate-700">Phone</span>
            </div>
            {phones.length === 0 && (
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
                    <a href={`tel:${p.number}`} onClick={ev => ev.stopPropagation()}
                      className="text-sm text-violet-700 font-medium hover:underline">{p.number}</a>
                    <div className="flex items-center gap-1 mt-0.5">
                      {p.recommended && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">recommended</span>}
                      {p.type && <span className="text-[10px] text-slate-400 capitalize">{p.type}</span>}
                      {p.validity && <span className="text-[10px] text-slate-400">· {p.validity}</span>}
                    </div>
                  </div>
                  <button onClick={() => copy(p.number)}
                    className="p-1 text-slate-400 hover:text-violet-600 flex-shrink-0 transition-colors">
                    {copied === p.number ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                </div>
              ))}
            </div>
          ) : !phoneLoad && (
            <p className="text-[11px] text-slate-400">Click Reveal to unlock phone</p>
          )}
        </div>
      )}

      {!canEmail && !canPhone && (
        <p className="text-xs text-slate-400 text-center py-2">No contact info available for this profile</p>
      )}
    </div>
  );
}

// ── Experience item ───────────────────────────────────────────

function ExpItem({ exp, isLast }: { exp: any; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full border-2 mt-1 flex-shrink-0 ${exp.is_current ? "border-violet-600 bg-violet-600" : "border-slate-300 bg-white"}`} />
        {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1" />}
      </div>
      {/* Content */}
      <div className={`${isLast ? "pb-0" : "pb-4"} flex-1 min-w-0`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{exp.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {exp.logo_url && (
                <img src={exp.logo_url} alt={exp.company_name} className="w-4 h-4 rounded object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <p className="text-xs text-violet-700 font-medium">{exp.company_name}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-slate-400 whitespace-nowrap">{expDuration(exp)}</p>
            {exp.is_current && (
              <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] rounded-full font-medium">Current</span>
            )}
          </div>
        </div>
        {exp.locality && <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={9} />{exp.locality}</p>}
        {exp.summary && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3">{exp.summary}</p>}
      </div>
    </div>
  );
}

// ── Modal content ─────────────────────────────────────────────

interface TIProfileModalProps {
  profile:         TIProfile | null;
  onClose:         () => void;
  onInvite:        (p: TIProfile) => void;
  onProfileUpdate: (id: string, patch: Partial<TIProfile>) => void;
}

function ModalContent({ profile, onClose, onInvite, onProfileUpdate }: TIProfileModalProps) {
  if (!profile) return null;

  const isOpenToWork = profile.work_status === "open_to_work";
  const currentExp   = (profile.experience ?? []).find(e => e.is_current);
  const allExp       = (profile.experience ?? []);
  const allEdu       = (profile.education ?? []);
  const allCerts     = (profile.certifications ?? []);
  const allLangs     = (profile.languages ?? []);
  const skills       = (profile.skills ?? []);

  const handleRevealDone = (emails: TIRevealedEmail[], phones: TIRevealedPhone[]) => {
    onProfileUpdate(profile.id, {
      revealed_emails: emails,
      revealed_phones: phones,
      revealed_at:     new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-slate-400 truncate max-w-[300px]">
              {profile.full_name} · {profile.title ?? "No title"}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => onInvite(profile)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg font-medium hover:bg-violet-700 transition-colors">
              <Send size={12} /> Send Invite
            </button>
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 px-3 py-1.5 border border-[#0A66C2] text-[#0A66C2] text-xs rounded-lg font-medium hover:bg-blue-50 transition-colors">
                <Linkedin size={12} /> LinkedIn <ExternalLink size={9} />
              </a>
            )}
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body: two-column resume layout ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Left column — contact, meta, skills, education */}
          <div className="w-[280px] flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto p-5 space-y-5">

            {/* Avatar + Name */}
            <div className="text-center">
              <div className="flex justify-center mb-3 relative">
                <Avatar profile={profile} size={20} />
                {isOpenToWork && (
                  <div className="absolute bottom-0 right-[calc(50%-44px)] w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Zap size={9} className="text-white" />
                  </div>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">{profile.full_name ?? "Unknown"}</h2>
              {profile.title && <p className="text-xs text-slate-500 mt-0.5">{profile.title}</p>}
              {(currentExp?.company_name ?? profile.company_name) && (
                <p className="text-xs text-violet-700 font-medium mt-0.5">@ {currentExp?.company_name ?? profile.company_name}</p>
              )}
              {profile.location && (
                <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                  <MapPin size={10} />{profile.location}
                </p>
              )}
              {isOpenToWork && (
                <span className="inline-block mt-2 px-2.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  Open to Work
                </span>
              )}
            </div>

            {/* Meta */}
            <div className="space-y-2">
              {profile.seniority && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Star size={12} className="text-violet-400 flex-shrink-0" />
                  <span>{profile.seniority}</span>
                </div>
              )}
              {profile.job_function && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Briefcase size={12} className="text-violet-400 flex-shrink-0" />
                  <span>{profile.job_function}</span>
                </div>
              )}
              {profile.company_industry && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Building2 size={12} className="text-violet-400 flex-shrink-0" />
                  <span className="truncate">{profile.company_industry}</span>
                </div>
              )}
              {profile.followers && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Users size={12} className="text-violet-400 flex-shrink-0" />
                  <span>{profile.followers.toLocaleString()} followers</span>
                </div>
              )}
              {profile.first_discovered_at && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock size={12} className="flex-shrink-0" />
                  <span>Discovered {new Date(profile.first_discovered_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</span>
                </div>
              )}
            </div>

            {/* Contact reveal */}
            <div>
              {sectionLabel("Contact Information")}
              <RevealBlock profile={profile} onRevealDone={handleRevealDone} />
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div>
                {sectionLabel("Skills")}
                <div className="flex flex-wrap gap-1.5">
                  {skills.map(sk => (
                    <span key={sk} className="px-2 py-0.5 bg-violet-50 border border-violet-200 text-violet-700 text-[11px] rounded-full font-medium">{sk}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {allLangs.length > 0 && (
              <div>
                {sectionLabel("Languages")}
                <div className="flex flex-wrap gap-1.5">
                  {allLangs.map(l => (
                    <span key={l.name} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] rounded-full">
                      {l.name}
                    </span>
                  ))}
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
                      <div className="w-7 h-7 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <GraduationCap size={13} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 leading-tight">{e.school_name}</p>
                        {e.degree && <p className="text-[11px] text-slate-500">{e.degree}</p>}
                        {e.field_of_study && <p className="text-[11px] text-slate-400">{e.field_of_study}</p>}
                        {(e.start_date_year || e.end_date_year) && (
                          <p className="text-[10px] text-slate-400">{e.start_date_year}{e.end_date_year ? ` – ${e.end_date_year}` : ""}</p>
                        )}
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
                      <div className="w-7 h-7 rounded bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Award size={13} className="text-amber-500" />
                      </div>
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

          {/* Right column — summary + experience */}
          <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6">

            {/* About */}
            {profile.summary && (
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                {sectionLabel("About")}
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {profile.summary}
                </p>
              </div>
            )}

            {/* Experience */}
            {allExp.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                {sectionLabel(`Experience (${allExp.length})`)}
                <div>
                  {allExp.map((exp, i) => (
                    <ExpItem key={i} exp={exp} isLast={i === allExp.length - 1} />
                  ))}
                </div>
              </div>
            )}

            {allExp.length === 0 && !profile.summary && (
              <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
                No additional profile data available
              </div>
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
  return ReactDOM.createPortal(
    <ModalContent {...props} />,
    document.body
  );
}