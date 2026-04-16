/**
 * RRResultsArea.tsx — v7
 *
 * Changes from v6:
 *   1. enrichProgress bar in top bar (replaces scrapingIds spinner)
 *   2. ContactOut-specific display: 
 *      - "Open to Work" badge
 *      - Seniority badge from _coData
 *      - Certifications row
 *      - Work email shown in right card for CO (CO returns emails at search time)
 *      - Email/Phone reveal shows different label for CO ("View" not "Email")
 *   3. Per-row skeleton via isEnriching (p._needs_rescrape && !p._is_cached && !p._enriched)
 *      already in v6 — kept
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Copy, Check, MapPin, ChevronDown, ChevronUp,
  Mail, Phone, Award, Send, Bookmark, BookmarkCheck, X,
} from "lucide-react";
import type { RRProfile, RREmailEntry, RRPhoneEntry, SkillChip } from "./types";
import { useRRUpsertSaved } from "./hooks/useRRUpsertSaved";

const ROW_LABEL_CLASS = "w-[85px] text-slate-400 font-semibold flex-shrink-0";

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function resolveAuth(): Promise<{ organizationId: string; userId: string } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const userId = session.user.id;
  const org =
    session.user.user_metadata?.organization_id    ??
    session.user.user_metadata?.hr_organization_id ??
    (session.user.app_metadata as any)?.organization_id ?? null;
  if (org) return { organizationId: org, userId };
  const { data: emp } = await supabase.from("hr_employees").select("organization_id").eq("user_id", userId).maybeSingle();
  return emp?.organization_id ? { organizationId: emp.organization_id, userId } : null;
}

async function revealProfile(
  profile: RRProfile,
  revealType: "email" | "phone",
  auth: { organizationId: string; userId: string }
): Promise<any> {
  const provider = (profile as any)._provider ?? "rocketreach";
  if (provider === "contactout") {
    const { data, error } = await supabase.functions.invoke("contactout-enrich", {
      body: {
        linkedinUrl: profile.linkedin_url,
        organizationId: auth.organizationId,
        userId: auth.userId,
        revealType,
        snapshotName:    profile.name,
        snapshotTitle:   profile.current_title,
        snapshotCompany: profile.current_employer,
      },
    });
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await supabase.functions.invoke("rocketreach-lookup", {
    body: { rrProfileId: profile.id, organizationId: auth.organizationId, userId: auth.userId, revealType },
  });
  if (error) throw new Error(error.message);
  return data;
}

// ─── Education normalizer ─────────────────────────────────────────────────────
function normalizeEdu(e: any): { school: string; degree: string; major: string; startYear: string; endYear: string } {
  const school = e.school ?? e.institution ?? "";
  const degree = e.degree ?? "";
  const major  = e.major ?? e.field ?? "";
  let startYear = String(e.start ?? "");
  let endYear   = String(e.end ?? "");
  if (!startYear && e.period) {
    const parts = e.period.replace(/&nbsp;/g, "").split(/\s*[-–]\s*/);
    startYear = parts[0]?.trim() ?? "";
    endYear   = parts[1]?.trim().replace(/now/i, "Present") ?? "";
  }
  return { school, degree, major, startYear, endYear };
}

const EDU_RANK: [string, number][] = [
  ["phd",6],["doctor",6],["ph.d",6],["master",5],["mba",5],["msc",5],["m.sc",5],["m.tech",5],
  ["bachelor",4],["b.tech",4],["b.e.",4],["b.sc",4],["be ",4],["btech",4],["b.a",4],
  ["diploma",3],["associate",2],["high school",1],
];
function degreeRank(d: string): number {
  return EDU_RANK.find(([k]) => d.toLowerCase().includes(k))?.[1] ?? 0;
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button"
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="flex-shrink-0 text-slate-300 hover:text-violet-500 transition-colors">
      {done ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
    </button>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 52 }: { src?: string; name?: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  const init = (name ?? "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  if (src && !err)
    return <img src={src} alt={name ?? ""} onError={() => setErr(true)} style={{ width: size, height: size }} className="rounded-full object-cover ring-2 ring-slate-100 shadow-sm flex-shrink-0" />;
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.32 }}
      className="rounded-full bg-gradient-to-br from-violet-100 to-purple-200 ring-2 ring-slate-100 flex items-center justify-center font-bold text-violet-700 shadow-sm flex-shrink-0">
      {init}
    </div>
  );
}

// ─── Shimmer ──────────────────────────────────────────────────────────────────
const Shimmer: React.FC<{ w?: string; h?: string; className?: string }> = ({ w = "w-full", h = "h-5", className }) => (
  <div className={cn("relative overflow-hidden rounded bg-slate-200", w, h, className)}>
    <div className="absolute inset-0" style={{
      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
      animation: "shimmer 1.2s infinite",
    }} />
    <style>{`@keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
  </div>
);

// ─── Jobs section ─────────────────────────────────────────────────────────────
const JobsSection: React.FC<{ jobs: any[]; loading: boolean }> = ({ jobs, loading }) => {
  if (loading && !jobs.length) {
    return (
      <div className="mt-2 space-y-1">
        <div className="flex gap-2"><Shimmer w="w-[72px]" h="h-2.5" className="flex-shrink-0" /><Shimmer w="w-40" h="h-2.5" /></div>
        <div className="flex gap-2"><Shimmer w="w-[72px]" h="h-2.5" className="flex-shrink-0" /><Shimmer w="w-32" h="h-2.5" /></div>
      </div>
    );
  }
  if (!jobs.length) return null;

  const parsePeriod = (period?: string) => {
    if (!period) return { start: 0, end: 0, isCurrent: false };
    const cl = period.toLowerCase().replace(/&nbsp;/g, "").trim();
    const [ss, es] = cl.split(/\s*-\s*/);
    const start = parseInt(ss) || 0;
    let end = 0, isCurrent = false;
    if (!es || /now|present/.test(es)) { isCurrent = true; end = new Date().getFullYear(); }
    else { end = parseInt(es) || 0; }
    return { start, end, isCurrent };
  };

  const norm = jobs.map(j => { const { start, end, isCurrent } = parsePeriod(j.period); return { ...j, company_name: j.company_name ?? j.company, start, end, isCurrent }; });
  const current  = norm.filter(j => j.isCurrent  || j.is_current).sort((a,b) => b.start - a.start)[0];
  const previous = norm.filter(j => !j.isCurrent && !j.is_current).sort((a,b) => b.end - a.end)[0];
  const fmt = (j: any) => {
    if (j.period) return j.period.replace(/&nbsp;/g, "");
    if (j.start_date) { const s = j.start_date?.slice(0,4); const e = (j.is_current||j.isCurrent) ? "Present" : j.end_date?.slice(0,4); return `${s}–${e}`; }
    return "";
  };

  return (
    <div className="mt-2 space-y-1 text-[10px]">
      {current && (
        <div className="flex items-start">
          <span className={ROW_LABEL_CLASS}>Current</span>
          <span className="text-slate-700 flex-1 leading-tight">
            {current.title}{current.company_name ? ` at ${current.company_name}` : ""}
            {fmt(current) ? <span className="text-slate-400 ml-1">({fmt(current)})</span> : null}
          </span>
        </div>
      )}
      {previous && (
        <div className="flex items-start">
          <span className={ROW_LABEL_CLASS}>Previous</span>
          <span className="text-slate-600 flex-1 leading-tight">
            {previous.title}{previous.company_name ? ` at ${previous.company_name}` : ""}
            {fmt(previous) ? <span className="text-slate-400 ml-1">({fmt(previous)})</span> : null}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Education section ────────────────────────────────────────────────────────
const EduSection: React.FC<{ education: any[]; loading: boolean }> = ({ education, loading }) => {
  if (loading && !education.length) {
    return <div className="mt-2 flex gap-2"><Shimmer w="w-[72px]" h="h-2.5" className="flex-shrink-0" /><Shimmer w="w-44" h="h-2.5" /></div>;
  }
  if (!education.length) return null;
  const normalized = education.map(normalizeEdu);
  const highest    = [...normalized].sort((a, b) => degreeRank(b.degree) - degreeRank(a.degree))[0];
  const years = (highest.startYear || highest.endYear)
    ? ` (${highest.startYear}${highest.endYear && highest.endYear !== highest.startYear ? `–${highest.endYear}` : ""})`
    : "";
  return (
    <div className="mt-2 text-[10px]">
      <div className="flex items-start">
        <span className={ROW_LABEL_CLASS}>Education</span>
        <span className="text-slate-600 flex-1 leading-tight">
          {[highest.degree, highest.major].filter(Boolean).join(", ")}
          {highest.school ? <span className="text-slate-400"> · {highest.school}</span> : null}
          {years ? <span className="text-slate-400">{years}</span> : null}
        </span>
      </div>
    </div>
  );
};

// ─── Skills row ───────────────────────────────────────────────────────────────
const SkillsRow: React.FC<{ skills: string[]; loading: boolean; activeLabels?: Set<string> }> = ({ skills, loading, activeLabels }) => {
  const [showAll, setShowAll] = useState(false);
  if (loading && !skills.length) {
    return (
      <div className="mt-2 flex gap-2">
        <Shimmer w="w-[72px]" h="h-2.5" className="flex-shrink-0" />
        <div className="flex gap-1 flex-wrap">
          {[55,70,48,62].map((w,i) => <Shimmer key={i} w={`w-[${w}px]`} h="h-4" className="rounded-full" />)}
        </div>
      </div>
    );
  }
  if (!skills.length) return null;
  const MAX = 6;
  const sorted = activeLabels?.size
    ? [...skills].sort((a,b) => (activeLabels.has(b.toLowerCase())?1:0)-(activeLabels.has(a.toLowerCase())?1:0))
    : skills;
  const visible = showAll ? sorted : sorted.slice(0, MAX);
  return (
    <div className="mt-2 text-[10px]">
      <div className="flex items-start">
        <span className={ROW_LABEL_CLASS}>Key Skills</span>
        <div className="flex-1 flex flex-wrap gap-1">
          {visible.map((s, i) => {
            const isMatch = activeLabels?.has(s.toLowerCase());
            return (
              <span key={i} className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-medium",
                isMatch ? "bg-violet-100 text-violet-700 border-violet-300 ring-1 ring-violet-400" : "bg-slate-100 text-slate-600 border-slate-200")}>
                {s}
              </span>
            );
          })}
          {sorted.length > MAX && (
            <button type="button" onClick={e => { e.stopPropagation(); setShowAll(v => !v); }}
              className="text-[9px] text-violet-500 hover:underline whitespace-nowrap">
              {showAll ? <><ChevronUp size={8} className="inline" /> less</> : <>+{sorted.length - MAX} more</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Teaser popover ───────────────────────────────────────────────────────────
const TeaserPopover: React.FC<{ items: string[]; type: "email"|"phone"; onClose: () => void }> = ({ items, type, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
      document.addEventListener("mousedown", fn);
      return () => document.removeEventListener("mousedown", fn);
    }, 100);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute bottom-full left-0 mb-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2 space-y-1 min-w-[160px]">
      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">{type === "email" ? "Available emails" : "Available phones"}</p>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          {type === "email" ? `***@${item}` : item}
        </div>
      ))}
    </div>
  );
};

// ─── Right action card ────────────────────────────────────────────────────────
interface RightCardProps {
  profile:        RRProfile;
  enriched:       boolean;
  allEmailsRaw:   RREmailEntry[];
  allPhones:      RRPhoneEntry[];
  teaserEmails:   string[];
  teaserPhones:   { number: string; is_premium: boolean }[];
  emailAvailable: boolean | null;
  phoneAvailable: boolean | null;
  revealingEmail: boolean;
  revealingPhone: boolean;
  onRevealEmail:  () => void;
  onRevealPhone:  () => void;
  onInvite?:      () => void;
  canInvite:      boolean;
  provider:       string;
}

const RightCard: React.FC<RightCardProps> = ({
  profile, enriched, allEmailsRaw, allPhones,
  teaserEmails, teaserPhones, emailAvailable, phoneAvailable,
  revealingEmail, revealingPhone, onRevealEmail, onRevealPhone,
  onInvite, canInvite, provider,
}) => {
  const [showEmailTeaser, setShowEmailTeaser] = useState(false);
  const [showPhoneTeaser, setShowPhoneTeaser] = useState(false);
  const { status: saveStatus, upsert: doSave } = useRRUpsertSaved();

  const isContactOut = provider === "contactout";

  // Personal emails first, then any email
  const personalEmails = allEmailsRaw.filter(e => e.type === "personal");
  const workEmails     = allEmailsRaw.filter(e => e.type !== "personal");
  const displayEmail   = personalEmails[0] ?? allEmailsRaw[0] ?? null;
  const displayPhone   = allPhones[0] ?? null;

  // ContactOut provides emails at search time — show them pre-reveal too
  const hasEmailsFromCO = isContactOut && allEmailsRaw.length > 0;

  const personalTeaserDomains = profile.teaser?.personal_emails ?? teaserEmails.slice(0, 2);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saveStatus === "saving" || saveStatus === "saved") return;
    const auth = await resolveAuth();
    if (!auth) return;
    await doSave({
      rrProfileId:      String(profile.id),
      saveType:         "shortlisted",
      snapshotName:     profile.name,
      snapshotTitle:    profile.current_title,
      snapshotCompany:  profile.current_employer,
      snapshotLocation: profile.location,
      email:            displayEmail?.email ?? null,
      phone:            displayPhone?.number ?? null,
      candidateProfileId: (profile as any)._candidateProfileId ?? null,
    });
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-2.5 space-y-2">
      {/* Photo */}
      <div className="flex justify-center py-1">
        <Avatar src={profile.profile_pic} name={profile.name} size={70} />
      </div>

      {/* ContactOut: show email at search time (no reveal needed) */}
      {hasEmailsFromCO && !enriched && (
        <div className="space-y-1">
          {allEmailsRaw.slice(0, 2).map((em, i) => (
            <div key={i} className="flex items-center gap-1 bg-blue-50/60 rounded-md px-2 py-1">
              <span className="w-[4px] h-[4px] rounded-full flex-shrink-0 bg-blue-400" />
              <span className="text-[10px] font-mono text-slate-700 truncate flex-1 min-w-0">{em.email}</span>
              <CopyBtn text={em.email} />
            </div>
          ))}
        </div>
      )}

      {/* Revealed email */}
      {enriched && displayEmail && (
        <div className="flex items-center gap-1 bg-emerald-50/60 rounded-md px-2 py-1">
          <span className={cn("w-[4px] h-[4px] rounded-full flex-shrink-0",
            displayEmail.smtp_valid === "valid" ? "bg-emerald-500" : "bg-slate-300")} />
          <span className="text-[10px] font-mono text-slate-700 truncate flex-1 min-w-0">{displayEmail.email}</span>
          <CopyBtn text={displayEmail.email} />
        </div>
      )}
      {/* Revealed phone */}
      {enriched && displayPhone && (
        <div className="flex items-center gap-1 bg-slate-50 rounded-md px-2 py-1">
          <Phone size={9} className="text-violet-400 flex-shrink-0" />
          <span className="text-[10px] font-mono text-slate-700 truncate flex-1 min-w-0">{displayPhone.number}</span>
          <CopyBtn text={displayPhone.number} />
        </div>
      )}

      {/* Email + Phone buttons */}
      {!hasEmailsFromCO && (
        <div className="grid grid-cols-2 gap-1.5">
          {/* Email */}
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); onRevealEmail(); }}
              onMouseEnter={() => { if (!enriched && personalTeaserDomains.length > 0) setShowEmailTeaser(true); }}
              onMouseLeave={() => setShowEmailTeaser(false)}
              disabled={revealingEmail || emailAvailable === false}
              className={cn("w-full text-[10px] font-semibold border rounded-md px-1.5 py-1.5 flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                enriched && displayEmail ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                : emailAvailable === false ? "text-slate-400 border-slate-200 bg-slate-50"
                : "text-violet-600 border-violet-300 bg-white hover:bg-violet-50")}>
              {revealingEmail ? <Loader2 size={9} className="animate-spin" />
                : enriched && displayEmail ? <Check size={9} /> : <Mail size={9} />}
              <span className="truncate">
                {revealingEmail ? "…" : enriched && displayEmail ? "Email ✓" : emailAvailable === false ? "No email" : "Email"}
              </span>
            </button>
            {showEmailTeaser && personalTeaserDomains.length > 0 && (
              <TeaserPopover items={personalTeaserDomains} type="email" onClose={() => setShowEmailTeaser(false)} />
            )}
          </div>

          {/* Phone */}
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); onRevealPhone(); }}
              onMouseEnter={() => { if (!enriched && teaserPhones.length > 0) setShowPhoneTeaser(true); }}
              onMouseLeave={() => setShowPhoneTeaser(false)}
              disabled={revealingPhone || phoneAvailable === false}
              className={cn("w-full text-[10px] font-semibold border rounded-md px-1.5 py-1.5 flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                enriched && displayPhone ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                : phoneAvailable === false ? "text-slate-400 border-slate-200 bg-slate-50"
                : "text-slate-600 border-slate-200 bg-white hover:border-violet-400 hover:text-violet-600")}>
              {revealingPhone ? <Loader2 size={9} className="animate-spin" />
                : enriched && displayPhone ? <Check size={9} /> : <Phone size={9} />}
              <span className="truncate">
                {revealingPhone ? "…" : enriched && displayPhone ? "Phone ✓" : phoneAvailable === false ? "No phone" : "Phone"}
              </span>
            </button>
            {showPhoneTeaser && teaserPhones.length > 0 && (
              <TeaserPopover items={teaserPhones.map(ph => ph.number)} type="phone" onClose={() => setShowPhoneTeaser(false)} />
            )}
          </div>
        </div>
      )}

      {/* ContactOut: just phone reveal (email already shown) */}
      {hasEmailsFromCO && !enriched && (
        <div className="relative">
          <button onClick={e => { e.stopPropagation(); onRevealPhone(); }}
            disabled={revealingPhone || phoneAvailable === false}
            className={cn("w-full text-[10px] font-semibold border rounded-md px-1.5 py-1.5 flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              phoneAvailable === false ? "text-slate-400 border-slate-200 bg-slate-50"
              : "text-slate-600 border-slate-200 bg-white hover:border-violet-400 hover:text-violet-600")}>
            {revealingPhone ? <Loader2 size={9} className="animate-spin" /> : <Phone size={9} />}
            <span>{revealingPhone ? "…" : phoneAvailable === false ? "No phone" : "Get Phone"}</span>
          </button>
        </div>
      )}

      {/* Invite + Save */}
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={e => { e.stopPropagation(); onInvite?.(); }}
          disabled={!canInvite}
          title={canInvite ? "Invite candidate" : "Reveal contact first"}
          className={cn("text-[10px] font-semibold border rounded-md px-1.5 py-1.5 flex items-center justify-center gap-1 transition-colors",
            canInvite ? "text-violet-600 border-violet-400 bg-white hover:bg-violet-50"
            : "text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed")}>
          <Send size={9} /><span>Invite</span>
        </button>
        <button onClick={handleSave} disabled={saveStatus === "saving"}
          className={cn("text-[10px] font-semibold border rounded-md px-1.5 py-1.5 flex items-center justify-center gap-1 transition-colors",
            saveStatus === "saved" ? "text-emerald-600 border-emerald-200 bg-emerald-50"
            : "text-slate-500 border-slate-200 bg-white hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50")}>
          {saveStatus === "saving" ? <Loader2 size={9} className="animate-spin" />
            : saveStatus === "saved" ? <BookmarkCheck size={9} /> : <Bookmark size={9} />}
          <span>{saveStatus === "saved" ? "Saved" : "Save"}</span>
        </button>
      </div>
    </div>
  );
};

// ─── Invite picker ────────────────────────────────────────────────────────────
interface InvitePickerProps {
  emails: RREmailEntry[]; phones: RRPhoneEntry[];
  onConfirm: (email: string|null, phone: string|null) => void; onClose: () => void;
}
const InvitePicker: React.FC<InvitePickerProps> = ({ emails, phones, onConfirm, onClose }) => {
  const personalEmails = emails.filter(e => e.type === "personal");
  const inviteEmails   = personalEmails.length > 0 ? personalEmails : emails.slice(0, 1);
  const [sel, setSel]  = useState<{ kind: "email"|"phone"; value: string } | null>(
    inviteEmails[0] ? { kind: "email", value: inviteEmails[0].email }
    : phones[0]     ? { kind: "phone", value: phones[0].number }
    : null
  );
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 bottom-full mb-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Invite via</p>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-500"><X size={10} /></button>
      </div>
      {inviteEmails.length === 0 && phones.length === 0 && <p className="text-[11px] text-slate-400 text-center py-1">Reveal contact first</p>}
      {inviteEmails.length > 0 && (
        <div className="space-y-1">
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Email</p>
          {inviteEmails.map((e, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-50 rounded px-1">
              <input type="radio" name="invite-sel" checked={sel?.kind==="email" && sel.value===e.email} onChange={() => setSel({ kind:"email", value:e.email })} className="accent-violet-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-slate-700 truncate block">{e.email}</span>
                <span className="text-[8px] text-blue-400">personal</span>
              </div>
            </label>
          ))}
        </div>
      )}
      {phones.length > 0 && (
        <div className="space-y-1">
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Phone</p>
          {phones.slice(0,3).map((ph, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-50 rounded px-1">
              <input type="radio" name="invite-sel" checked={sel?.kind==="phone" && sel.value===ph.number} onChange={() => setSel({ kind:"phone", value:ph.number })} className="accent-violet-600 flex-shrink-0" />
              <span className="text-[10px] font-mono text-slate-700">{ph.number}</span>
            </label>
          ))}
        </div>
      )}
      {(inviteEmails.length > 0 || phones.length > 0) && (
        <button disabled={!sel} onClick={() => { if (sel) onConfirm(sel.kind==="email"?sel.value:null, sel.kind==="phone"?sel.value:null); }}
          className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 transition-colors">
          <Send size={10} className="inline mr-1" />Send Invite
        </button>
      )}
    </div>
  );
};

// ─── Single result row ────────────────────────────────────────────────────────
export interface RRResultRowProps {
  profile:           RRProfile;
  revealed:          boolean;
  checked:           boolean;
  selected:          boolean;
  scrapeLoading:     boolean;
  activeSkillChips?: SkillChip[];
  onCheck:           (v: boolean) => void;
  onRowClick:        () => void;
  onRevealComplete:  (id: number, data: any) => void;
  onInvite?:         (profile: RRProfile, email: string|null, phone: string|null) => void;
}

export const RRResultRow: React.FC<RRResultRowProps> = ({
  profile: p, revealed, checked, selected, activeSkillChips,
  onCheck, onRowClick, onRevealComplete, onInvite,
}) => {
  const [revealingEmail, setRevealingEmail] = useState(false);
  const [revealingPhone, setRevealingPhone] = useState(false);
  const [revealError,    setRevealError]    = useState<string|null>(null);
  const [showInvitePick, setShowInvitePick] = useState(false);

  const provider    = (p as any)._provider ?? "rocketreach";
  const isContactOut = provider === "contactout";
  const enriched    = !!p._enriched || revealed;
  const coData      = (p as any)._coData;

  // Per-row skeleton: show while enrichment is in-flight for this profile
  const isEnriching = p._needs_rescrape && !p._is_cached && !p._enriched;

  const allEmailsRaw = p._allEmails ?? [];
  const allPhones    = p._allPhones ?? [];
  const jobHist      = p._jobHistory ?? [];
  const eduRaw       = p._education ?? [];
  const skills       = (p._skills ?? (p as any).skills ?? []) as string[];
  const certs        = coData?.certifications ?? [];

  const teaserPersonal     = p.teaser?.personal_emails     ?? [];
  const teaserProfessional = p.teaser?.professional_emails ?? [];
  const teaserAll          = [...teaserPersonal, ...teaserProfessional, ...(p.teaser?.emails ?? [])].filter((v,i,a) => a.indexOf(v) === i);
  const teaserPhones       = p.teaser?.phones ?? [];

  // ContactOut emails come at search time
  const coEmails        = isContactOut ? allEmailsRaw : [];
  const hasEmailsFromCO = isContactOut && coEmails.length > 0;

  const emailAvailable = teaserAll.length > 0 ? true  : (p.teaser ? false : null);
  const phoneAvailable = teaserPhones.length > 0 ? true : (p.teaser ? false : null);

  const displayJobs = React.useMemo(() => {
    if (jobHist.length > 0) return jobHist;
    if (p.current_title) return [{ title: p.current_title, company_name: p.current_employer, is_current: true }];
    return [];
  }, [jobHist, p]);

  const activeLabels = new Set((activeSkillChips ?? []).filter(c => c.mode !== "exclude").map(c => c.label.toLowerCase()));

  // Invite: for CO, can invite if emails from search time; for RR, need reveal
  const canInvite = isContactOut
    ? (hasEmailsFromCO || enriched && (allEmailsRaw.length > 0 || allPhones.length > 0))
    : (enriched && (allEmailsRaw.length > 0 || allPhones.length > 0));

  const doReveal = useCallback(async (revealType: "email"|"phone") => {
    const setter = revealType === "email" ? setRevealingEmail : setRevealingPhone;
    setter(true); setRevealError(null);
    const auth = await resolveAuth();
    if (!auth) { setter(false); setRevealError("Not authenticated"); return; }
    try {
      const data = await revealProfile(p, revealType, auth);
      if (!data?.success) throw new Error(data?.error ?? "Reveal failed");
      onRevealComplete(p.id, { ...data, _provider: provider });
    } catch (e: any) {
      setRevealError(e.message ?? "Reveal failed");
    } finally { setter(false); }
  }, [p, provider, onRevealComplete]);

  return (
    <div onClick={onRowClick}
      className={cn("border-b border-slate-100 px-3 py-3 cursor-pointer transition-colors",
        selected ? "bg-violet-50/60 border-l-2 border-l-violet-500" : "hover:bg-slate-50/40")}>
      <div className="flex items-start gap-2.5">
        {/* Checkbox */}
        <div className="mt-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <Checkbox checked={checked} onCheckedChange={v => onCheck(!!v)} className="h-3.5 w-3.5" />
        </div>

        {/* Left */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-semibold text-slate-800 leading-tight">{p.name ?? "—"}</span>
            {p.linkedin_url && (
              <a href={p.linkedin_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="text-slate-400 hover:text-blue-600 transition-colors">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
            )}
            {enriched && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">✓</span>}
            {/* ContactOut badges */}
            {isContactOut && coData?.workStatus === "open_to_work" && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Open to Work</span>
            )}
            {isContactOut && coData?.seniority && (
              <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 capitalize">{coData.seniority}</span>
            )}
            {/* Provider badge */}
            {/* {isContactOut && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-500 border border-violet-100">CO</span>
            )} */}
            {/* Enriching indicator */}
            {isEnriching && !enriched && (
              <span className="flex items-center gap-1 text-[8px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                Loading…
              </span>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
            <MapPin size={9} className="flex-shrink-0 text-slate-300" />
            <span>{p.location ?? (p as any).city ?? "—"}</span>
            {p.connections && <span className="ml-1">· {p.connections.toLocaleString()} connections</span>}
          </div>

          {/* Jobs */}
          <JobsSection jobs={displayJobs} loading={isEnriching && !displayJobs.length} />

          {/* Education */}
          <EduSection education={eduRaw} loading={isEnriching && !eduRaw.length} />

          {/* Skills */}
          <SkillsRow skills={skills} loading={isEnriching && !skills.length} activeLabels={activeLabels.size > 0 ? activeLabels : undefined} />

          {/* ContactOut certifications */}
          {certs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {certs.slice(0, 3).map((c: any, i: number) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <Award size={8} />{c.name ?? c}
                </span>
              ))}
              {certs.length > 3 && <span className="text-[9px] text-slate-400">+{certs.length - 3} certs</span>}
            </div>
          )}

          {revealError && <p className="mt-1 text-[9px] text-red-500">{revealError}</p>}
        </div>

        {/* Right card */}
        <div className="flex-shrink-0 w-[175px]" onClick={e => e.stopPropagation()}>
          <div className="relative">
            <RightCard
              profile={p}
              enriched={enriched}
              allEmailsRaw={allEmailsRaw}
              allPhones={allPhones}
              teaserEmails={teaserPersonal.length > 0 ? teaserPersonal : teaserAll.slice(0, 2)}
              teaserPhones={teaserPhones as any}
              emailAvailable={emailAvailable}
              phoneAvailable={phoneAvailable}
              revealingEmail={revealingEmail}
              revealingPhone={revealingPhone}
              onRevealEmail={() => doReveal("email")}
              onRevealPhone={() => doReveal("phone")}
              onInvite={canInvite ? () => setShowInvitePick(v => !v) : undefined}
              canInvite={canInvite}
              provider={provider}
            />
            {showInvitePick && onInvite && (
              <div className="absolute bottom-0 right-0 z-50">
                <InvitePicker
                  emails={allEmailsRaw}
                  phones={allPhones}
                  onConfirm={(email, phone) => { setShowInvitePick(false); onInvite(p, email, phone); }}
                  onClose={() => setShowInvitePick(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Results area ─────────────────────────────────────────────────────────────
interface RRResultsAreaProps {
  profiles:         RRProfile[];
  loading:          boolean;
  totalEntries:     number;
  page:             number;
  pageSize:         number;
  totalPages:       number;
  selectedId:       number | null;
  checkedIds:       Set<number>;
  revealedIds:      Set<number>;
  scrapingIds?:     Set<number>;
  activeSkillChips?: SkillChip[];
  enrichProgress?: { total: number; done: number; active: boolean };
  onSelectRow:      (p: RRProfile | null) => void;
  onCheckRow:       (id: number, v: boolean) => void;
  onCheckAll:       (v: boolean) => void;
  onPrev:           () => void;
  onNext:           () => void;
  onRevealComplete: (id: number, data: any) => void;
  onInvite?:        (profile: RRProfile, email: string|null, phone: string|null) => void;
}

export const RRResultsArea: React.FC<RRResultsAreaProps> = ({
  profiles, loading, totalEntries, page, totalPages,
  selectedId, checkedIds, revealedIds, activeSkillChips, enrichProgress,
  onSelectRow, onCheckRow, onCheckAll, onPrev, onNext, onRevealComplete, onInvite,
}) => {
  const allChecked = profiles.length > 0 && profiles.every(p => checkedIds.has(p.id));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-slate-100 bg-white flex items-center gap-3">
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <Checkbox checked={allChecked} onCheckedChange={v => onCheckAll(!!v)} className="h-3.5 w-3.5" />
          {checkedIds.size > 0 && <span className="text-[10px] text-violet-600 font-medium">{checkedIds.size} selected</span>}
        </div>

        {totalEntries > 0 && (
          <span className="text-[10px] text-slate-500">
            <span className="font-semibold text-slate-700">{totalEntries.toLocaleString()}</span> profiles
            {totalPages > 1 && <span className="ml-1.5 text-slate-400">· Page {page}/{totalPages}</span>}
          </span>
        )}

        {/* ── Enrichment progress bar ── */}
        {enrichProgress?.active && (
          <div className="flex items-center gap-2 ml-1">
            <div className="flex items-center gap-1">
              <Loader2 size={9} className="animate-spin text-violet-500 flex-shrink-0" />
              <span className="text-[10px] font-medium text-violet-600">
                Enriching {enrichProgress.done}/{enrichProgress.total}
              </span>
            </div>
            <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${Math.round((enrichProgress.done / Math.max(enrichProgress.total, 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {(activeSkillChips ?? []).filter(c => c.mode !== "exclude").length > 0 && (
          <span className="flex items-center gap-1 text-[9px] text-violet-500">
            <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
            {(activeSkillChips ?? []).filter(c => c.mode !== "exclude").length} skills highlighted
          </span>
        )}

        {totalPages > 1 && (
          <div className="flex items-center gap-1 ml-auto">
            <button disabled={page <= 1} onClick={onPrev} className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[11px]">‹</button>
            <button disabled={page >= totalPages} onClick={onNext} className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[11px]">›</button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-2.5 p-3 border-b border-slate-100">
                <Shimmer w="w-3.5" h="h-3.5" className="rounded mt-1 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Shimmer w="w-36" h="h-3.5" />
                  <Shimmer w="w-24" h="h-2.5" />
                  <div className="space-y-1 mt-1">
                    <div className="flex gap-2"><Shimmer w="w-16" h="h-2.5" /><Shimmer w="w-44" h="h-2.5" /></div>
                    <div className="flex gap-2"><Shimmer w="w-16" h="h-2.5" /><Shimmer w="w-36" h="h-2.5" /></div>
                    <div className="flex gap-1 mt-1">{[52,68,44,60].map((w,j)=><Shimmer key={j} w={`w-[${w}px]`} h="h-4" className="rounded-full" />)}</div>
                  </div>
                </div>
                <div className="w-[175px] flex-shrink-0">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 space-y-2">
                    <Shimmer w="w-[52px]" h="h-[52px]" className="rounded-full mx-auto" />
                    <div className="grid grid-cols-2 gap-1.5"><Shimmer h="h-7" className="rounded-md" /><Shimmer h="h-7" className="rounded-md" /></div>
                    <div className="grid grid-cols-2 gap-1.5"><Shimmer h="h-7" className="rounded-md" /><Shimmer h="h-7" className="rounded-md" /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-3">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p className="text-slate-400 text-sm">Set filters and search</p>
          </div>
        ) : (
          profiles.map(p => (
            <RRResultRow
              key={p.id}
              profile={p}
              revealed={revealedIds.has(p.id)}
              checked={checkedIds.has(p.id)}
              selected={selectedId === p.id}
              scrapeLoading={false}
              activeSkillChips={activeSkillChips}
              onCheck={v => onCheckRow(p.id, v)}
              onRowClick={() => onSelectRow(selectedId === p.id ? null : p)}
              onRevealComplete={onRevealComplete}
              onInvite={onInvite}
            />
          ))
        )}
      </div>
    </div>
  );
};