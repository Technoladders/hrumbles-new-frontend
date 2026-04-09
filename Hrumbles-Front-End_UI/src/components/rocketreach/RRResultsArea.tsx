/**
 * RRResultsArea.tsx — v3
 *
 * Fixes:
 *   1. Hooks-in-IIFE bug — skills/certs/projects are now proper sub-components
 *   2. Skeleton loading — shows shimmer for skills/exp/edu while scraper runs
 *   3. Contact availability — 3 states: available (green) / unavailable (gray) / unknown
 *   4. Provider-aware reveal (contactout → contactout-enrich, rocketreach → rocketreach-lookup)
 */

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy, Check, Linkedin, MapPin, ChevronDown, ChevronUp, Mail, Phone, Award, Briefcase } from "lucide-react";
import type { RRProfile, RREmailEntry, RRPhoneEntry } from "./types";

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function resolveAuth(): Promise<{ organizationId: string; userId: string } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const userId = session.user.id;
  const orgFromMeta = session.user.user_metadata?.organization_id ?? session.user.user_metadata?.hr_organization_id ?? (session.user.app_metadata as any)?.organization_id ?? null;
  if (orgFromMeta) return { organizationId: orgFromMeta, userId };
  const { data: emp } = await supabase.from("hr_employees").select("organization_id").eq("user_id", userId).maybeSingle();
  if (!emp?.organization_id) return null;
  return { organizationId: emp.organization_id, userId };
}

async function revealProfile(profile: RRProfile, revealType: "email"|"phone", auth: { organizationId: string; userId: string }): Promise<any> {
  const provider = (profile as any)._provider ?? "rocketreach";
  if (provider === "contactout") {
    const { data, error } = await supabase.functions.invoke("contactout-enrich", {
      body: { linkedinUrl: profile.linkedin_url, organizationId: auth.organizationId, userId: auth.userId, revealType, snapshotName: profile.name, snapshotTitle: profile.current_title, snapshotCompany: profile.current_employer },
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

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }} className="flex-shrink-0 text-slate-300 hover:text-violet-500 transition-colors">
      {done ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
    </button>
  );
}

const GRADE_CLS: Record<string, string> = { "A": "bg-emerald-50 text-emerald-700 border-emerald-200", "A-": "bg-emerald-50 text-emerald-600 border-emerald-200", "B": "bg-blue-50 text-blue-700 border-blue-200", "C": "bg-amber-50 text-amber-700 border-amber-200", "F": "bg-red-50 text-red-600 border-red-200" };
function GradeBadge({ grade }: { grade: string|null }) {
  if (!grade) return null;
  return <span className={cn("text-[8px] font-bold px-1 py-0.5 rounded border flex-shrink-0", GRADE_CLS[grade] ?? "bg-slate-50 text-slate-500 border-slate-200")}>{grade}</span>;
}

function Avatar({ src, name, size = 36 }: { src?: string; name?: string|null; size?: number }) {
  const [err, setErr] = useState(false);
  const init = (name ?? "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  if (src && !err) return <img src={src} alt={name ?? ""} onError={() => setErr(true)} style={{ width: size, height: size }} className="rounded-full object-cover ring-1 ring-slate-200 flex-shrink-0" />;
  return <div style={{ width: size, height: size, fontSize: size * 0.32 }} className="rounded-full bg-gradient-to-br from-violet-100 to-purple-100 ring-1 ring-slate-200 flex items-center justify-center font-bold text-violet-600 flex-shrink-0">{init}</div>;
}

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────
const Shimmer: React.FC<{ w?: string; h?: string; className?: string }> = ({ w = "w-full", h = "h-3", className }) => (
  <div className={cn("rounded animate-pulse bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 bg-[length:200%_100%]", w, h, className)}
    style={{ animation: "shimmer 1.5s infinite", backgroundPosition: "-200% 0" }} />
);

// ─── Skills section (proper sub-component so useState is legal) ──────────────
const SkillsList: React.FC<{ skills: string[]; loading?: boolean }> = ({ skills, loading }) => {
  const [showAll, setShowAll] = useState(false);
  if (loading) return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {[60, 80, 50, 70, 55, 65].map((w, i) => <Shimmer key={i} w={`w-[${w}px]`} h="h-4" className="rounded-full" />)}
    </div>
  );
  if (!skills.length) return null;
  const MAX = 8;
  const visible = showAll ? skills : skills.slice(0, MAX);
  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap gap-1">
        {visible.map((s, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{s}</span>)}
      </div>
      {skills.length > MAX && (
        <button type="button" onClick={e => { e.stopPropagation(); setShowAll(v => !v); }} className="flex items-center gap-0.5 text-[10px] text-violet-600 hover:underline mt-1">
          {showAll ? <><ChevronUp size={9} /> Fewer skills</> : <><ChevronDown size={9} /> +{skills.length - MAX} skills</>}
        </button>
      )}
    </div>
  );
};

// ─── Job history section ──────────────────────────────────────────────────────
const JobsList: React.FC<{ jobs: any[]; loading?: boolean }> = ({ jobs, loading }) => {
  const [showAll, setShowAll] = useState(false);
  if (loading) return (
    <div className="mt-1.5 space-y-2">
      {[1, 2].map(i => (
        <div key={i} className="flex items-baseline gap-1">
          <Shimmer w="w-2.5" h="h-2.5" className="rounded flex-shrink-0 mt-0.5" />
          <Shimmer w="w-24" h="h-2.5" /><Shimmer w="w-4" h="h-2.5" /><Shimmer w="w-20" h="h-2.5" />
        </div>
      ))}
    </div>
  );
  if (!jobs.length) return null;
  const MAX = 2;
  const visible = showAll ? jobs : jobs.slice(0, MAX);
  return (
    <div className="mt-1">
      {visible.map((j: any, i: number) => (
        <div key={i} className="flex items-baseline gap-1 text-[11px] flex-wrap mb-0.5">
          <Briefcase size={9} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <span className="text-slate-700 font-medium">{j.title ?? j.company_name ?? "—"}</span>
          {(j.company_name ?? j.company) && <><span className="text-slate-400">at</span>
            {j.company_linkedin_url
              ? <a href={j.company_linkedin_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-violet-600 font-semibold hover:underline">{j.company_name ?? j.company}</a>
              : <span className="text-violet-600 font-semibold">{j.company_name ?? j.company}</span>}
          </>}
          {j.is_current && <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 rounded">Current</span>}
          {j.period && <span className="text-slate-400 text-[10px]">{j.period.replace("&nbsp;", "")}</span>}
          {(!j.period && j.start_date) && <span className="text-slate-400 text-[10px]">{j.start_date?.slice(0, 7)} – {j.is_current ? "Present" : (j.end_date?.slice(0, 7) ?? "?")}</span>}
        </div>
      ))}
      {jobs.length > MAX && (
        <button type="button" onClick={e => { e.stopPropagation(); setShowAll(v => !v); }} className="flex items-center gap-0.5 text-[10px] text-violet-600 hover:underline mt-0.5">
          {showAll ? <><ChevronUp size={9} /> Show less</> : <><ChevronDown size={9} /> +{jobs.length - MAX} more roles</>}
        </button>
      )}
    </div>
  );
};

// ─── Education section ────────────────────────────────────────────────────────
const EduList: React.FC<{ education: any[]; loading?: boolean }> = ({ education, loading }) => {
  const [showAll, setShowAll] = useState(false);
  if (loading) return (
    <div className="mt-1 flex items-baseline gap-1">
      <Shimmer w="w-2.5" h="h-2.5" className="rounded flex-shrink-0" />
      <Shimmer w="w-40" h="h-2.5" />
    </div>
  );
  if (!education.length) return null;
  const MAX = 1;
  const visible = showAll ? education : education.slice(0, MAX);
  return (
    <div className="mt-0.5">
      {visible.map((e: any, i: number) => (
        <div key={i} className="flex items-baseline gap-1 text-[10px] text-slate-500 mb-0.5">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          <span>{[e.degree, e.major ?? e.field].filter(Boolean).join(" · ")}{(e.school ?? e.institution) ? ` · ${e.school ?? e.institution}` : ""}</span>
          {(e.start || e.period) && <span className="text-slate-400">{e.period ?? `${e.start}–${e.end}`}</span>}
        </div>
      ))}
      {education.length > MAX && (
        <button type="button" onClick={e => { e.stopPropagation(); setShowAll(v => !v); }} className="flex items-center gap-0.5 text-[10px] text-violet-600 hover:underline">
          {showAll ? <><ChevronUp size={9} /> Less</> : <><ChevronDown size={9} /> +{education.length - MAX} more</>}
        </button>
      )}
    </div>
  );
};

// ─── Certifications section ───────────────────────────────────────────────────
const CertsList: React.FC<{ certs: any[] }> = ({ certs }) => {
  const [showAll, setShowAll] = useState(false);
  if (!certs.length) return null;
  const MAX = 2;
  const visible = showAll ? certs : certs.slice(0, MAX);
  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap gap-1">
        {visible.map((c: any, i: number) => (
          <span key={i} className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Award size={8} /> {c.name ?? c}
          </span>
        ))}
      </div>
      {certs.length > MAX && (
        <button type="button" onClick={e => { e.stopPropagation(); setShowAll(v => !v); }} className="flex items-center gap-0.5 text-[10px] text-violet-600 hover:underline mt-0.5">
          {showAll ? <><ChevronUp size={9} /> Less</> : <><ChevronDown size={9} /> +{certs.length - MAX} certs</>}
        </button>
      )}
    </div>
  );
};

// ─── Projects section ─────────────────────────────────────────────────────────
const ProjectsList: React.FC<{ projects: any[] }> = ({ projects }) => {
  const [showAll, setShowAll] = useState(false);
  if (!projects.length) return null;
  const MAX = 2;
  const visible = showAll ? projects : projects.slice(0, MAX);
  return (
    <div className="mt-1">
      {visible.map((proj: any, i: number) => (
        <div key={i} className="text-[10px] text-slate-500 flex items-baseline gap-1 mb-0.5">
          <span className="text-slate-400">▸</span>
          <span className="font-medium text-slate-600">{proj.title}</span>
          {proj.description && <span className="text-slate-400 line-clamp-1 flex-1 min-w-0 text-[9px]">{proj.description}</span>}
        </div>
      ))}
      {projects.length > MAX && (
        <button type="button" onClick={e => { e.stopPropagation(); setShowAll(v => !v); }} className="flex items-center gap-0.5 text-[10px] text-violet-600 hover:underline">
          {showAll ? <><ChevronUp size={9} /> Less</> : <><ChevronDown size={9} /> +{projects.length - MAX} projects</>}
        </button>
      )}
    </div>
  );
};

// ─── Contact availability indicator ──────────────────────────────────────────
// 3 states: available (green dot + domain), unavailable (gray dash), unknown (nothing)
function ContactAvailabilityDot({ available, domain }: { available: boolean|null; domain?: string }) {
  if (available === null || available === undefined) return null;
  if (!available) return <span className="text-[9px] text-slate-300 font-mono">—</span>;
  return (
    <div className="flex items-center gap-1">
      <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 flex-shrink-0" />
      {domain && <span className="text-[10px] text-slate-500 font-mono truncate max-w-[110px]">***@{domain}</span>}
    </div>
  );
}

// ─── Single result row ────────────────────────────────────────────────────────
export interface RRResultRowProps {
  profile:          RRProfile;
  revealed:         boolean;
  checked:          boolean;
  selected:         boolean;
  scrapeLoading:    boolean;   // ← NEW: skeleton while scraper runs
  onCheck:          (v: boolean) => void;
  onRowClick:       () => void;
  onRevealComplete: (id: number, data: any) => void;
}

export const RRResultRow: React.FC<RRResultRowProps> = ({
  profile: p, revealed, checked, selected, scrapeLoading, onCheck, onRowClick, onRevealComplete,
}) => {
  const [revealingEmail, setRevealingEmail] = useState(false);
  const [revealingPhone, setRevealingPhone] = useState(false);
  const [revealError,    setRevealError]    = useState<string|null>(null);

  const provider  = (p as any)._provider ?? "rocketreach";
  const enriched  = !!p._enriched || revealed;
  const coData    = (p as any)._coData;

  const jobHist   = p._jobHistory ?? [];
  const skills    = (p._skills ?? p.skills ?? []) as string[];
  const education = (p._education ?? []) as any[];
  const allEmails = p._allEmails ?? [];
  const allPhones = p._allPhones ?? [];
  const certs     = coData?.certifications ?? [];
  const projects  = coData?.projects ?? [];

  // Build teaser data for availability display
  const teaserEmails   = [...(p.teaser?.professional_emails ?? []), ...(p.teaser?.personal_emails ?? []), ...(p.teaser?.emails ?? [])].filter((v, i, a) => a.indexOf(v) === i);
  const teaserPhones   = p.teaser?.phones ?? [];
  const hasEmailTeaser = teaserEmails.length > 0;
  const hasPhoneTeaser = teaserPhones.length > 0;
  const emailAvailable  = hasEmailTeaser ? true  : (p.teaser ? false : null);
  const phoneAvailable  = hasPhoneTeaser ? true  : (p.teaser ? false : null);

const hasJobs = jobHist && jobHist.length > 0;

const displayJobs = hasJobs
  ? jobHist
  : p.current_title
    ? [{
        title: p.current_title,
        company_name: p.current_employer,
        company_linkedin_url: p.current_employer_linkedin_url,
        is_current: true,
      }]
    : [];

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
      className={cn("border-b border-slate-100 px-4 py-3.5 cursor-pointer transition-colors group", selected ? "bg-violet-50/60 border-l-2 border-l-violet-500" : "hover:bg-slate-50/50")}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="mt-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <Checkbox checked={checked} onCheckedChange={v => onCheck(!!v)} className="h-3.5 w-3.5" />
        </div>

        {/* Avatar */}
        <Avatar src={p.profile_pic} name={p.name} size={36} />

        {/* ── Main info ── */}
        <div className="flex-1 min-w-0">
          {/* Name + badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-semibold text-slate-800 leading-tight">{p.name ?? "—"}</span>
            {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-slate-400 hover:text-blue-600 transition-colors"><Linkedin size={11} /></a>}
            {provider === "contactout" && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">CO</span>}
            {enriched && provider === "rocketreach" && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">RR</span>}
            {coData?.workStatus === "open_to_work" && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Open to Work</span>}
            {coData?.seniority && <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 capitalize">{coData.seniority}</span>}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
            <MapPin size={9} className="flex-shrink-0" />
            <span>{p.location ?? p.city ?? "—"}</span>
            {p.connections && <span className="text-slate-400">· {p.connections.toLocaleString()} connections</span>}
          </div>

          {/* Jobs — skeleton while loading */}
          <JobsList jobs={displayJobs} loading={scrapeLoading && !displayJobs.length} />

          {/* Education — skeleton while loading */}
        {(education.length > 0 || scrapeLoading) && (
            <EduList education={education} loading={scrapeLoading && !education.length} />
          )}

          {/* Skills — skeleton while loading */}
          <SkillsList skills={skills} loading={scrapeLoading && !skills.length} />

          {/* Certs + projects (ContactOut only) */}
          <CertsList certs={certs} />
          <ProjectsList projects={projects} />

          {revealError && <p className="mt-1 text-[9px] text-red-500">{revealError}</p>}
        </div>

        {/* ── RIGHT: Contact reveal ── */}
        <div className="flex-shrink-0 flex flex-col gap-1.5 min-w-[175px] max-w-[200px]" onClick={e => e.stopPropagation()}>

          {/* EMAIL */}
          <div className="space-y-0.5">
            {enriched && allEmails.length > 0 ? (
              <>
                {allEmails.slice(0, 2).map((e, i) => (
                  <div key={i} className="flex items-center gap-1 justify-end">
                    <span className={cn("w-[5px] h-[5px] rounded-full flex-shrink-0", e.smtp_valid === "valid" ? "bg-emerald-500" : "bg-slate-300")} />
                    <span className="text-[10px] font-mono text-slate-700 truncate max-w-[120px]">{e.email}</span>
                    <GradeBadge grade={e.grade} />
                    <CopyBtn text={e.email} />
                  </div>
                ))}
                {allEmails.length > 2 && <p className="text-[9px] text-slate-400 text-right">+{allEmails.length - 2} more</p>}
                <button onClick={() => doReveal("email")} className="w-full mt-0.5 text-[10px] text-violet-600 border border-violet-300 rounded-md px-2 py-1 hover:bg-violet-50 transition-colors font-medium text-center">
                  ↻ Re-reveal
                </button>
              </>
            ) : (
              <>
                {/* Availability teaser */}
                {teaserEmails.slice(0, 2).map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 justify-end">
                    <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                      {e.includes("@") ? e : `***@${e}`}
                    </span>
                  </div>
                ))}
                {!teaserEmails.length && (
                  <div className="flex justify-end">
                    <ContactAvailabilityDot available={emailAvailable} />
                  </div>
                )}
                <button onClick={() => doReveal("email")} disabled={revealingEmail || emailAvailable === false}
                  className={cn("w-full text-[10px] font-semibold border rounded-md px-2 py-1 flex items-center justify-center gap-1 mt-0.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    emailAvailable === false
                      ? "text-slate-400 border-slate-200 cursor-not-allowed"
                      : "text-violet-600 border-violet-500 hover:bg-violet-50")}>
                  {revealingEmail ? <><Loader2 size={9} className="animate-spin" /> Revealing…</>
                    : emailAvailable === false ? <><Mail size={9} /> Not available</>
                    : <><Mail size={9} /> View email</>
                  }
                </button>
              </>
            )}
          </div>

          <div className="h-px bg-slate-100 mx-1" />

          {/* PHONE */}
          <div className="space-y-0.5">
            {enriched && allPhones.length > 0 ? (
              <>
                <div className="flex items-center gap-1 justify-end">
                  <span className="text-[10px] font-mono text-slate-700">{allPhones[0].number}</span>
                  <CopyBtn text={allPhones[0].number} />
                </div>
                {allPhones.length > 1 && <p className="text-[9px] text-slate-400 text-right">+{allPhones.length - 1} more</p>}
              </>
            ) : (
              <>
                {teaserPhones.slice(0, 1).map((ph, i) => (
                  <div key={i} className="flex items-center gap-1.5 justify-end text-[10px] text-slate-400 font-mono">
                    {typeof ph === "string" ? ph : (ph as any).number}
                    {(ph as any).is_premium && <span className="text-[8px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">PRO</span>}
                  </div>
                ))}
                {!teaserPhones.length && (
                  <div className="flex justify-end">
                    <ContactAvailabilityDot available={phoneAvailable} />
                  </div>
                )}
              </>
            )}
            <button onClick={() => doReveal("phone")} disabled={revealingPhone || phoneAvailable === false}
              className={cn("w-full text-[10px] font-medium border rounded-md px-2 py-1 flex items-center justify-center gap-1 mt-0.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                phoneAvailable === false
                  ? "text-slate-300 border-slate-200"
                  : "text-slate-500 border-slate-300 hover:border-violet-400 hover:text-violet-600")}>
              {revealingPhone ? <><Loader2 size={9} className="animate-spin" /> Looking up…</>
                : phoneAvailable === false ? <><Phone size={9} /> Not available</>
                : enriched && allPhones.length > 0 ? <><Phone size={9} /> Re-reveal</>
                : <><Phone size={9} /> Find phone</>
              }
            </button>
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
  selectedId:       number|null;
  checkedIds:       Set<number>;
  revealedIds:      Set<number>;
  scrapingIds:      Set<number>;   // ← NEW: IDs currently being scraped
  onSelectRow:      (p: RRProfile|null) => void;
  onCheckRow:       (id: number, v: boolean) => void;
  onCheckAll:       (v: boolean) => void;
  onPrev:           () => void;
  onNext:           () => void;
  onRevealComplete: (id: number, data: any) => void;
}

export const RRResultsArea: React.FC<RRResultsAreaProps> = ({
  profiles, loading, totalEntries, page, totalPages,
  selectedId, checkedIds, revealedIds, scrapingIds,
  onSelectRow, onCheckRow, onCheckAll, onPrev, onNext, onRevealComplete,
}) => {
  const allChecked = profiles.length > 0 && profiles.every(p => checkedIds.has(p.id));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-white flex items-center gap-3">
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
        {/* Scraping indicator */}
        {scrapingIds.size > 0 && (
          <span className="flex items-center gap-1 text-[9px] text-slate-400">
            <Loader2 size={8} className="animate-spin" />
            Loading profiles…
          </span>
        )}
        {totalPages > 1 && (
          <div className="flex items-center gap-1 ml-auto">
            <button disabled={page <= 1} onClick={onPrev} className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[11px]">‹</button>
            <button disabled={page >= totalPages} onClick={onNext} className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[11px]">›</button>
          </div>
        )}
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Shimmer w="w-32" h="h-3" /> <Shimmer w="w-48" h="h-2.5" /> <Shimmer w="w-56" h="h-2" />
                </div>
                <div className="w-40 space-y-2">
                  <Shimmer w="w-32" h="h-3" className="ml-auto" /> <Shimmer w="w-32" h="h-6" className="ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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
              scrapeLoading={scrapingIds.has(p.id)}
              onCheck={v => onCheckRow(p.id, v)}
              onRowClick={() => onSelectRow(selectedId === p.id ? null : p)}
              onRevealComplete={onRevealComplete}
            />
          ))
        )}
      </div>
    </div>
  );
};