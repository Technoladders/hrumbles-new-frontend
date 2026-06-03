/**
 * RRResultsArea.tsx — v9
 *
 * Changes from v8:
 *   CHANGE 1 — ContactOut profiles no longer show the "Reveal contact to see full profile"
 *              blur/lock overlay. Only RocketReach profiles get that restriction.
 *              Condition: {(enriched || isContactOut) ? fullProfile : blurredPlaceholder}
 *
 *   CHANGE 2 — revealProfile() now calls the new unified `ti-reveal` edge function instead
 *              of routing between `contactout-enrich` / `rocketreach-lookup` by p._provider.
 *              The reveal API is now driven by the org's `ti_reveal_provider` setting.
 *              New prop `tiRevealProvider: string` flows through RRResultsArea → RRResultRow.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Copy, Check, MapPin, ChevronDown, ChevronUp,
  Mail, Phone, Award, Send, Bookmark, BookmarkCheck, X, Clock,
} from "lucide-react";
import type { RRProfile, RREmailEntry, RRPhoneEntry, SkillChip } from "./types";
import { useRRUpsertSaved } from "./hooks/useRRUpsertSaved";
import { MasterProfileCV } from "./MasterProfileCV";

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

// ─── CHANGE 2: revealProfile now calls unified ti-reveal edge function ─────────
// The provider routing (CO vs RR) is determined server-side by tiRevealProvider
// (from org's ti_reveal_provider column), not by the search profile's _provider field.
async function revealProfile(
  profile:          RRProfile,
  revealType:       "email" | "phone",
  auth:             { organizationId: string; userId: string },
  tiRevealProvider: string
): Promise<any> {
  const { data, error } = await supabase.functions.invoke("ti-reveal-v1", {
    body: {
      linkedinUrl:      profile.linkedin_url ?? null,
      rrProfileId:      String(profile.id),
      organizationId:   auth.organizationId,
      userId:           auth.userId,
      revealType,
      tiRevealProvider,
      snapshotName:     profile.name,
      snapshotTitle:    profile.current_title,
      snapshotCompany:  profile.current_employer,
    },
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

// ─── Certifications Row ───────────────────────────────────────────────────────
const CertificationsRow: React.FC<{ certifications: any[]; loading: boolean }> = ({ certifications, loading }) => {
  const [showAll, setShowAll] = useState(false);
  if (loading && !certifications.length) {
    return (
      <div className="mt-2 flex gap-2">
        <Shimmer w="w-[85px]" h="h-2.5" className="flex-shrink-0" />
        <div className="flex gap-1 flex-wrap">
          {[80, 65, 90].map((w, i) => <Shimmer key={i} w={`w-[${w}px]`} h="h-4" className="rounded-full" />)}
        </div>
      </div>
    );
  }
  if (!certifications.length) return null;
  const MAX = 3;
  const visible = showAll ? certifications : certifications.slice(0, MAX);
  return (
    <div className="mt-2 text-[10px]">
      <div className="flex items-start">
        <span className={ROW_LABEL_CLASS}>Certifications</span>
        <div className="flex-1 flex flex-wrap gap-1">
          {visible.map((cert: any, i: number) => (
            <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
              <Award size={8} />{cert.name ?? cert}
            </span>
          ))}
          {certifications.length > MAX && (
            <button type="button" onClick={e => { e.stopPropagation(); setShowAll(v => !v); }}
              className="text-[9px] text-violet-500 hover:underline whitespace-nowrap flex items-center gap-0.5">
              {showAll ? <><ChevronUp size={8} className="inline" /> less</> : <>+{certifications.length - MAX} more</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Right action card ────────────────────────────────────────────────────────
// ─── Right action card ────────────────────────────────────────────────────────
interface RightCardProps {
  profile:          RRProfile;
  enriched:         boolean;
  allEmailsRaw:     RREmailEntry[];
  allPhones:        RRPhoneEntry[];
  teaserEmails:     string[];
  teaserPhones:     { number: string; is_premium: boolean }[];
  emailAvailable:   boolean | null;
  phoneAvailable:   boolean | null;
  revealingEmail:   boolean;
  revealingPhone:   boolean;
  phoneIsPending:   boolean;
  emailNotFound:    boolean; 
  phoneNotFound:    boolean; 
  waterfallEnabled?: boolean;
  waterfallChecking?: boolean; 
  waterfallInQueue?: boolean;
  waterfallDone?:    boolean;
  onRevealEmail:  () => void;
  onRevealPhone:  () => void;
  onAddToWaterfall?: () => void;
  onInvite?:      () => void;
  canInvite:      boolean;
  provider:       string;
  onViewCV?:      (linkedinUrl: string) => void;
}

const RightCard: React.FC<RightCardProps> = ({
  profile, enriched, allEmailsRaw, allPhones,
  teaserEmails, teaserPhones, emailAvailable, phoneAvailable,
  revealingEmail, revealingPhone, phoneIsPending,
  emailNotFound, phoneNotFound,
  waterfallEnabled, waterfallChecking, waterfallInQueue, waterfallDone,
  onRevealEmail, onRevealPhone, onAddToWaterfall,
  onInvite, canInvite, provider, onViewCV,
}) => {
  const [showEmailTeaser, setShowEmailTeaser] = useState(false);
  const [showPhoneTeaser, setShowPhoneTeaser] = useState(false);
  const { status: saveStatus, upsert: doSave } = useRRUpsertSaved();

  const isContactOut = provider === "contactout";

  const personalEmails = allEmailsRaw.filter(e => e.type === "personal");
  const displayEmail   = personalEmails[0] ?? null;   
  const displayPhone   = allPhones[0] ?? null;

  const hasEmailsFromCO = isContactOut && personalEmails.length > 0;
  const personalTeaserDomains = profile.teaser?.personal_emails ?? teaserEmails.slice(0, 2);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saveStatus === "saving" || saveStatus === "saved") return;
    const auth = await resolveAuth();
    if (!auth) return;
    await doSave({
      rrProfileId:        String(profile.id),
      saveType:           "shortlisted",
      snapshotName:       profile.name,
      snapshotTitle:      profile.current_title,
      snapshotCompany:    profile.current_employer,
      snapshotLocation:   profile.location,
      email:              displayEmail?.email ?? null,
      phone:              displayPhone?.number ?? null,
      candidateProfileId: (profile as any)._candidateProfileId ?? null,
    });
  };

  const emailDone     = !!(enriched && displayEmail) || hasEmailsFromCO;
  // Always show — reveal provider may surface what search provider didn't
  const emailDisabled = revealingEmail || emailNotFound;
  const emailClass = emailDone
    ? "text-emerald-600 border-emerald-200 bg-emerald-50"
    : emailNotFound
      ? "text-slate-400 border-slate-200 bg-slate-50"
      : "text-violet-600 border-violet-300 bg-white hover:bg-violet-50";
 
  const phoneDone     = !!(enriched && displayPhone);
  // Always show — reveal provider may surface what search provider didn't
  const phoneDisabled = revealingPhone || phoneIsPending || phoneNotFound;
  const phoneClass = phoneDone
    ? "text-emerald-600 border-emerald-200 bg-emerald-50"
    : phoneIsPending
      ? "text-amber-600 border-amber-200 bg-amber-50"
      : phoneNotFound
        ? "text-slate-400 border-slate-200 bg-slate-50"
        : "text-violet-600 border-violet-300 bg-white hover:bg-violet-50";

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-2.5 space-y-2">
      <div className="flex justify-center py-1">
        <Avatar src={profile.profile_pic} name={profile.name} size={70} />
      </div>

      {hasEmailsFromCO && (
        <div className="space-y-1">
          {personalEmails.slice(0, 2).map((em, i) => (
            <div key={i} className="flex items-center gap-1 bg-emerald-50/60 rounded-md px-2 py-1">
              <span className="w-[4px] h-[4px] rounded-full flex-shrink-0 bg-emerald-400" />
              <span className="text-[10px] font-mono text-slate-700 truncate flex-1 min-w-0">{em.email}</span>
              <CopyBtn text={em.email} />
            </div>
          ))}
        </div>
      )}

      {enriched && displayEmail && !hasEmailsFromCO && (
        <div className="flex items-center gap-1 bg-emerald-50/60 rounded-md px-2 py-1">
          <span className={cn("w-[4px] h-[4px] rounded-full flex-shrink-0",
            displayEmail.smtp_valid === "valid" ? "bg-emerald-500" : "bg-slate-300")} />
          <span className="text-[10px] font-mono text-slate-700 truncate flex-1 min-w-0">{displayEmail.email}</span>
          <CopyBtn text={displayEmail.email} />
        </div>
      )}

      {enriched && displayPhone && (
        <div className="flex items-center gap-1 bg-emerald-50/60 rounded-md px-2 py-1">
          <Phone size={9} className="text-emerald-500 flex-shrink-0" />
          <span className="text-[10px] font-mono text-slate-700 truncate flex-1 min-w-0">{displayPhone.number}</span>
          <CopyBtn text={displayPhone.number} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); if (!emailDone) onRevealEmail(); }}
            onMouseEnter={() => { if (!emailDone && personalTeaserDomains.length > 0) setShowEmailTeaser(true); }}
            onMouseLeave={() => setShowEmailTeaser(false)}
            disabled={emailDisabled || (emailDone && !hasEmailsFromCO)}
            className={cn(
              "w-full text-[10px] font-semibold border rounded-md px-1.5 py-1.5 flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              emailClass
            )}>
            {revealingEmail ? <Loader2 size={9} className="animate-spin" /> : emailDone ? <Check size={9} /> : <Mail size={9} />}
            <span className="truncate">
              {revealingEmail ? "…" : emailDone ? "Email ✓" : (emailAvailable === false || emailNotFound) ? "No email" : "Email"}
            </span>
          </button>
          {showEmailTeaser && personalTeaserDomains.length > 0 && (
            <TeaserPopover items={personalTeaserDomains} type="email" onClose={() => setShowEmailTeaser(false)} />
          )}
        </div>

        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); if (!phoneDone && !phoneIsPending) onRevealPhone(); }}
            onMouseEnter={() => { if (!phoneDone && !phoneIsPending && teaserPhones.length > 0) setShowPhoneTeaser(true); }}
            onMouseLeave={() => setShowPhoneTeaser(false)}
            disabled={phoneDisabled || phoneDone}
            className={cn(
              "w-full text-[10px] font-semibold border rounded-md px-1.5 py-1.5 flex items-center justify-center gap-1 transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
              phoneClass
            )}>
            {revealingPhone
              ? <Loader2 size={9} className="animate-spin" />
              : phoneIsPending
                ? <Loader2 size={9} className="animate-spin" />
                : phoneDone
                  ? <Check size={9} />
                  : <Phone size={9} />}
            <span className="truncate">
              {revealingPhone ? "…"
                : phoneIsPending ? "Verifying…"
                : phoneDone ? "Phone ✓"
                : (phoneAvailable === false || phoneNotFound) ? "No phone"
                : isContactOut ? "Get Phone"
                : "Phone"}
            </span>
          </button>
          {phoneIsPending && (
            <div className="absolute bottom-full left-0 mb-1 w-full bg-white border border-amber-200 rounded-lg shadow-lg z-50 p-2 min-w-[160px]">
              <p className="text-[9px] font-semibold text-amber-700">Phone pending</p>
              <p className="text-[8px] text-slate-500 mt-0.5 leading-snug">Will appear automatically within 1–2 minutes.</p>
            </div>
          )}
          {showPhoneTeaser && !phoneIsPending && teaserPhones.length > 0 && (
            <TeaserPopover items={teaserPhones.map(ph => ph.number)} type="phone" onClose={() => setShowPhoneTeaser(false)} />
          )}
        </div>
      </div>

      {/* CHANGE: Added verification conditions to ensure display persistence across renders */}
{waterfallEnabled && (emailNotFound || waterfallInQueue || waterfallDone) && (
  waterfallChecking ? (
    <div className="flex items-center justify-center gap-1 text-[9px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 cursor-default">
      <Loader2 size={8} className="animate-spin flex-shrink-0" />
      <span className="truncate">Checking queue...</span>
    </div>
  ) : waterfallDone ? (
    <div className="flex items-center gap-1 text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1.5">
      <Check size={8} /> Email found — check above
    </div>
  ) : waterfallInQueue ? (
    <div
      className="flex items-center gap-1 text-[9px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 cursor-default"
      title="Our team is sourcing this email. Check back in 30–180 minutes."
    >
      <Loader2 size={8} className="animate-spin flex-shrink-0" />
      <span className="truncate">In Queue (30–180 min)</span>
    </div>
  ) : (
    <div className="flex items-center gap-1 text-[9px] text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 cursor-default">
      <Loader2 size={8} className="animate-spin flex-shrink-0" />
      <span className="truncate">Adding to Queue…</span>
    </div>
  )
)}

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

      {onViewCV && (
        <button
          onClick={e => { e.stopPropagation(); e.preventDefault(); onViewCV(profile.linkedin_url ?? ""); }}
          className="w-full text-[10px] font-semibold border border-violet-300 text-violet-600 hover:bg-violet-50 rounded-md py-1.5 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>View Full CV</span>
          <span className="text-xs">↗</span>
        </button>
      )}
    </div>
  );
};

// ─── Single result row ────────────────────────────────────────────────────────
export const RRResultRow: React.FC<RRResultRowProps> = ({
  profile: p, revealed, checked, selected, activeSkillChips,
  tiRevealProvider,  
  waterfallEnabled, organizationId,
  onCheck, onRowClick, onRevealComplete, onInvite,
}) => {
  const [revealingEmail, setRevealingEmail] = useState(false);
  const [revealingPhone, setRevealingPhone] = useState(false);
  const [revealError,    setRevealError]    = useState<string|null>(null);
  const [showInvitePick, setShowInvitePick] = useState(false);
  const [showCV,         setShowCV]         = useState(false);
  const [cvUrl,          setCvUrl]          = useState<string>("");
  const [phonePendingState, setPhonePendingState] = useState(false);
  
  const phonePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (phonePollRef.current) clearInterval(phonePollRef.current); }, []);

  const [emailNotFound,  setEmailNotFound]  = useState(false);
  const [phoneNotFound,  setPhoneNotFound]  = useState(false);
  
  // Waterfall states
  const [waterfallInQueue, setWaterfallInQueue] = useState(false);
  const [waterfallDone,    setWaterfallDone]    = useState(false);
  const [waterfallChecking, setWaterfallChecking] = useState(!!waterfallEnabled); 
  const waterfallChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const provider     = (p as any)._provider ?? "rocketreach";
  const isContactOut = provider === "contactout";
  const enriched     = !!p._enriched || revealed;

  // ─── MOUNT STATE RESTORATION & UNCONDITIONAL REALTIME CHANNELS ─────────
  useEffect(() => {
    if (!waterfallEnabled || !p.linkedin_url) {
      setWaterfallChecking(false);
      return;
    }

    let isMounted = true;

    const checkWaterfallStatus = async () => {
      try {
        const auth = await resolveAuth();
        const orgId = organizationId ?? auth?.organizationId;
        if (!orgId) return;

        const { data, error } = await supabase
          .from("candidate_waterfall")
          .select("status, found_email, found_phone")
          .eq("linkedin_url", p.linkedin_url)
          .eq("organization_id", orgId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error; 

        if (isMounted && data) {
          // CHANGE: Set emailNotFound to true so layout block displays on render
          setEmailNotFound(true);
          if (data.status === "pending") setWaterfallInQueue(true);
          if (data.status === "found") {
            setWaterfallDone(true);
            if (data.found_email) {
              onRevealComplete(p.id, {
                success: true,
                allEmails: [{ email: data.found_email, type: "personal", is_primary: true, smtp_valid: null, grade: null }],
                allPhones: data.found_phone ? [{ number: data.found_phone, type: "unknown", validity: "unknown", recommended: true }] : [],
                _provider: provider,
              });
            }
          }
        }
      } catch (err) {
        console.error("[waterfall] initial fetch status failed:", err);
      } finally {
        if (isMounted) setWaterfallChecking(false);
      }
    };

    checkWaterfallStatus();

    // Setup streaming listener unconditionally on mount
    const safeUrl = p.linkedin_url.replace(/[^a-z0-9]/gi, "").slice(0, 20);
    const channelName = `wf-${p.id}-${safeUrl}`;
    
    if (waterfallChannelRef.current) supabase.removeChannel(waterfallChannelRef.current);

    waterfallChannelRef.current = supabase
      .channel(channelName)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "candidate_waterfall",
        filter: `linkedin_url=eq.${p.linkedin_url}`,
      }, (payload: any) => {
        // CHANGE: Keep container open by setting emailNotFound upon state sync events
        setEmailNotFound(true);
        if (payload.new?.status === "found") {
          setWaterfallDone(true);
          setWaterfallInQueue(false);
          if (payload.new.found_email) {
            onRevealComplete(p.id, {
              success:   true,
              allEmails: [{ email: payload.new.found_email, type: "personal", is_primary: true, smtp_valid: null, grade: null }],
              allPhones: payload.new.found_phone ? [{ number: payload.new.found_phone, type: "unknown", validity: "unknown", recommended: true }] : [],
              _provider: provider,
            });
          }
        } else if (payload.new?.status === "pending") {
           setWaterfallInQueue(true);
           setWaterfallDone(false);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      if (waterfallChannelRef.current) supabase.removeChannel(waterfallChannelRef.current);
    };
  }, [p.linkedin_url, waterfallEnabled, organizationId, p.id, provider, onRevealComplete]);

  const allEmailsRaw = p._allEmails ?? [];
  const allPhones    = p._allPhones ?? [];
  const jobHist      = p._jobHistory ?? [];
  const eduRaw       = p._education ?? [];
  const skills       = (p._skills ?? (p as any).skills ?? []) as string[];
  const certs        = (p as any)._coData?.certifications ?? [];

  const teaserPersonal     = p.teaser?.personal_emails     ?? [];
  const teaserProfessional = p.teaser?.professional_emails ?? [];
  const teaserAll          = [...teaserPersonal, ...teaserProfessional, ...(p.teaser?.emails ?? [])].filter((v,i,a) => a.indexOf(v) === i);
  const teaserPhones       = p.teaser?.phones ?? [];

  const emailAvailable = teaserAll.length > 0 ? true : (p.teaser ? false : null);
  const phoneAvailable = teaserPhones.length > 0 ? true : (p.teaser ? false : null);

  const displayJobs = React.useMemo(() => {
    if (jobHist.length > 0) return jobHist;
    if (p.current_title) return [{ title: p.current_title, company_name: p.current_employer, is_current: true }];
    return [];
  }, [jobHist, p]);

  const activeLabels = new Set((activeSkillChips ?? []).filter(c => c.mode !== "exclude").map(c => c.label.toLowerCase()));

  const canInvite = isContactOut
    ? (allEmailsRaw.length > 0 || (enriched && (allEmailsRaw.length > 0 || allPhones.length > 0)))
    : (enriched && (allEmailsRaw.length > 0 || allPhones.length > 0));

  const startPollingForPhone = useCallback((linkedinUrl: string) => {
    let count = 0;
    phonePollRef.current = setInterval(async () => {
      if (++count > 20) {
        clearInterval(phonePollRef.current!); phonePollRef.current = null;
        setPhonePendingState(false);
        setRevealError("Phone not returned yet — please try again later.");
        return;
      }
      try {
        const { data } = await supabase
          .from("ti_profile_reveals")
          .select("phones")
          .eq("linkedin_url", linkedinUrl)
          .maybeSingle();
        const phones: any[] = data?.phones ?? [];
        if (phones.length > 0) {
          clearInterval(phonePollRef.current!); phonePollRef.current = null;
          setPhonePendingState(false);
          onRevealComplete(p.id, { success: true, allPhones: phones, allEmails: [], _provider: provider });
        }
      } catch { /* retry */ }
    }, 3000);
  }, [p.id, provider, onRevealComplete]);

const doReveal = useCallback(async (revealType: "email" | "phone") => {
  const setter = revealType === "email" ? setRevealingEmail : setRevealingPhone;

  setter(true);
  setRevealError(null);

  const auth = await resolveAuth();

  if (!auth) {
    setter(false);
    setRevealError("Not authenticated");
    return;
  }

  try {
    const data = await revealProfile(p, revealType, auth, tiRevealProvider);

    if (data?.phonePending) {
      setter(false);
      setPhonePendingState(true);

      if (p.linkedin_url) {
        startPollingForPhone(p.linkedin_url);
      }

      return;
    }

    if (data?.addedToWaterfall || data?.waterfallPending) {
      setter(false);
      setEmailNotFound(false);
      setWaterfallInQueue(true);

      onRevealComplete(p.id, {
        success: true,
        addedToWaterfall: true,
        allEmails: [],
        allPhones: [],
        _provider: provider,
      });

      return;
    }

    if (!data?.success) {
      if (data?.code === "INSUFFICIENT_CREDITS") {
        setRevealError(
          `Insufficient credits. Need ${data.required}, have ${data.available?.toFixed(2)}.`
        );
        return;
      }

      if (revealType === "email") {
        setEmailNotFound(true);
      } else {
        setPhoneNotFound(true);
      }

      return;
    }

    onRevealComplete(p.id, { ...data, _provider: provider });

    if (revealType === "email") {
      const hasPersonal = (data.allEmails ?? []).some(
        (e: any) =>
          e.type === "personal" ||
          e.type === "direct" ||
          e.type === "personal_email"
      );

      if (!hasPersonal) {
        if (data?.addedToWaterfall) {
          setWaterfallInQueue(true);
        } else {
          setEmailNotFound(true);
        }
      }
    }

    if (revealType === "phone" && (data.allPhones ?? []).length === 0) {
      setPhoneNotFound(true);
    }
  } catch (e: any) {
    setRevealError(e.message ?? "Reveal failed");
  } finally {
    setter(false);
  }
}, [
  p,
  provider,
  tiRevealProvider,
  onRevealComplete,
  startPollingForPhone,
  waterfallEnabled,
]);

  const handleAddToWaterfall = useCallback(async () => {
    const auth = await resolveAuth();
    if (!auth || !p.linkedin_url) return;
    try {
      setWaterfallInQueue(true); 
      await supabase.from("candidate_waterfall").upsert({
        organization_id:     organizationId ?? auth.organizationId,
        requested_by:        auth.userId,
        linkedin_url:        p.linkedin_url,
        full_name:           p.name,
        title:               p.current_title,
        company_name:        p.current_employer,
        profile_picture_url: p.profile_pic,
        profile_snapshot:    { id: p.id, name: p.name, title: p.current_title, company: p.current_employer, location: p.location },
        status:              "pending",
      }, { onConflict: "linkedin_url,organization_id", ignoreDuplicates: true });
    } catch (e: any) {
      console.error("[waterfall] add failed:", e?.message);
      setWaterfallInQueue(false); 
    }
  }, [p, organizationId]);

  const handleRowClick = useCallback(() => {
    if (showCV) return;
    onRowClick();
  }, [showCV, onRowClick]);

  return (
    <div
      onClick={handleRowClick}
      className={cn("border-b border-slate-100 px-3 py-3 cursor-pointer transition-colors",
        selected ? "bg-violet-50/60 border-l-2 border-l-violet-500" : "hover:bg-slate-50/40")}>
      <div className="flex items-start gap-2.5">
        <div className="mt-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <Checkbox checked={checked} onCheckedChange={v => onCheck(!!v)} className="h-3.5 w-3.5" />
        </div>

        <div className="flex-1 min-w-0">
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
            {isContactOut && (p as any)._coData?.workStatus === "open_to_work" && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Open to Work</span>
            )}
            {isContactOut && (p as any)._coData?.seniority && (
              <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 capitalize">{(p as any)._coData.seniority}</span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
            <MapPin size={9} className="flex-shrink-0 text-slate-300" />
            <span>{p.location ?? (p as any).city ?? "—"}</span>
            {p.connections && <span className="ml-1">· {p.connections.toLocaleString()} connections</span>}
          </div>

          {(enriched || isContactOut) ? (
            <>
              <JobsSection jobs={displayJobs} loading={false} />
              <EduSection education={eduRaw} loading={false} />
              <SkillsRow skills={skills} loading={false} activeLabels={activeLabels.size > 0 ? activeLabels : undefined} />
              {certs.length > 0 && <CertificationsRow certifications={certs} loading={false} />}
            </>
          ) : (
            <div className="relative mt-2">
              {p.current_title && (
                <div className="flex items-start text-sm">
                  <span className={ROW_LABEL_CLASS}>Current</span>
                  <span className="text-slate-700 flex-1 leading-tight">
                    {p.current_title}{p.current_employer ? ` at ${p.current_employer}` : ""}
                  </span>
                </div>
              )}

              <div className="space-y-2 select-none pointer-events-none opacity-50 blur-[3px]">
                {jobHist.length === 0 && (
                  <div className="flex items-start">
                    <span className={ROW_LABEL_CLASS}>Previous</span>
                    <span className="text-slate-400 flex-1 leading-tight">Software Engineer at Example Corp (2021–2024)</span>
                  </div>
                )}
                <div className="flex items-start">
                  <span className={ROW_LABEL_CLASS}>Education</span>
                  <span className="text-slate-400 flex-1 leading-tight">Bachelor's, Computer Science · University Name (2017–2021)</span>
                </div>
                <div className="flex items-start">
                  <span className={ROW_LABEL_CLASS}>Key Skills</span>
                  <div className="flex-1 flex flex-wrap gap-1">
                    {["Project Management", "Agile", "Data Analysis", "Python", "Cloud"].map((s, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full border font-medium bg-slate-100 text-slate-400 border-slate-200">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-violet-200 shadow-sm">
                  <span className="text-[10px] font-medium text-violet-600 flex items-center gap-1.5">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Reveal contact to see full profile
                  </span>
                </div>
              </div>
            </div>
          )}

          {revealError && <p className="mt-1 text-[9px] text-red-500">{revealError}</p>}
        </div>

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
              phoneIsPending={phonePendingState}
              emailNotFound={emailNotFound}
              phoneNotFound={phoneNotFound}
              waterfallEnabled={waterfallEnabled}
              waterfallChecking={waterfallChecking}
              waterfallInQueue={waterfallInQueue}
              waterfallDone={waterfallDone}
              onRevealEmail={() => doReveal("email")}
              onRevealPhone={() => doReveal("phone")}
              onAddToWaterfall={handleAddToWaterfall}
              onInvite={canInvite ? () => setShowInvitePick(v => !v) : undefined}
              canInvite={canInvite}
              provider={provider}
              onViewCV={isContactOut && p.linkedin_url ? (url) => { setCvUrl(url); setShowCV(true); } : undefined}
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

      {showCV && (
        <div onClick={e => e.stopPropagation()}>
          <MasterProfileCV linkedinUrl={cvUrl} onClose={() => setShowCV(false)} />
        </div>
      )}
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
  // CHANGE 2: tiRevealProvider drives which API the reveal hits server-side
  tiRevealProvider:  string;
  waterfallEnabled?: boolean;  // org config — show waterfall CTA when no email found
  organizationId?:   string;   // needed for waterfall insert
  onCheck:           (v: boolean) => void;
  onRowClick:        () => void;
  onRevealComplete:  (id: number, data: any) => void;
  onInvite?:         (profile: RRProfile, email: string|null, phone: string|null) => void;
}



// ─── Results area ─────────────────────────────────────────────────────────────
interface RRResultsAreaProps {
  profiles:          RRProfile[];
  loading:           boolean;
  totalEntries:      number;
  page:              number;
  pageSize:          number;
  totalPages:        number;
  selectedId:        number | null;
  checkedIds:        Set<number>;
  revealedIds:       Set<number>;
  scrapingIds?:      Set<number>;
  activeSkillChips?: SkillChip[];
  enrichProgress?:   { total: number; done: number; active: boolean };
  // CHANGE 2: org's ti_reveal_provider, passed through to each row
  tiRevealProvider:  string;
  waterfallEnabled?: boolean;  // org config — show waterfall CTA when no email found
  organizationId?:   string;   // needed for waterfall table insert
  onSelectRow:       (p: RRProfile | null) => void;
  onCheckRow:        (id: number, v: boolean) => void;
  onCheckAll:        (v: boolean) => void;
  onPrev:            () => void;
  onNext:            () => void;
  onRevealComplete:  (id: number, data: any) => void;
  onInvite?:         (profile: RRProfile, email: string|null, phone: string|null) => void;
}

export const RRResultsArea: React.FC<RRResultsAreaProps> = ({
  profiles, loading, totalEntries, page, totalPages,
  selectedId, checkedIds, revealedIds, activeSkillChips, enrichProgress,
  tiRevealProvider, waterfallEnabled, organizationId,
  onSelectRow, onCheckRow, onCheckAll, onPrev, onNext, onRevealComplete, onInvite,
}) => {
  const allChecked = profiles.length > 0 && profiles.every(p => checkedIds.has(p.id));

  console.log("profiles", profiles);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 border-b border-slate-100 bg-white flex items-center gap-3">
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <Checkbox checked={allChecked} onCheckedChange={v => onCheckAll(!!v)} className="h-3.5 w-3.5" />
          {checkedIds.size > 0 && <span className="text-[10px] text-violet-600 font-medium">{checkedIds.size} selected</span>}
        </div>

        {totalEntries > 0 && (
          <span className="text-[10px] text-slate-500">
            {totalPages > 1 && <span className="ml-1.5 text-slate-400">· Page {page}/{totalPages}</span>}
          </span>
        )}

        {enrichProgress?.active && (
          <div className="flex items-center gap-2 ml-1">
            <div className="flex items-center gap-1">
              <Loader2 size={9} className="animate-spin text-violet-500 flex-shrink-0" />
              <span className="text-[10px] font-medium text-violet-600">
                Enriching {enrichProgress.done}/{enrichProgress.total}
              </span>
            </div>
            <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
              <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${Math.round((enrichProgress.done / Math.max(enrichProgress.total, 1)) * 100)}%` }} />
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
              tiRevealProvider={tiRevealProvider}
              waterfallEnabled={waterfallEnabled}
              organizationId={organizationId}
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