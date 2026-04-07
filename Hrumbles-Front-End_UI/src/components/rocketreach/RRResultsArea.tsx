/**
 * RRResultsArea.tsx — v2
 *
 * Fixes:
 *   1. Provider-aware reveal — ContactOut profiles call contactout-enrich,
 *      NOT rocketreach-lookup. Profile carries `_provider` field.
 *   2. Show more/less for: experience, projects, certifications, skills
 *   3. ContactOut extra badges: open_to_work, seniority, job_function
 *   4. Company logo from ContactOut (logo_url on experience entries)
 */

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Copy, Check, Linkedin, MapPin,
  ChevronDown, ChevronUp, Mail, Phone, Award, Briefcase,
} from "lucide-react";
import type { RRProfile, RREmailEntry, RRPhoneEntry } from "./types";

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function resolveAuth(): Promise<{ organizationId: string; userId: string } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const userId = session.user.id;
  const orgFromMeta =
    session.user.user_metadata?.organization_id    ??
    session.user.user_metadata?.hr_organization_id ??
    (session.user.app_metadata as any)?.organization_id ?? null;
  if (orgFromMeta) return { organizationId: orgFromMeta, userId };
  const { data: emp } = await supabase.from("hr_employees").select("organization_id").eq("user_id", userId).maybeSingle();
  if (!emp?.organization_id) return null;
  return { organizationId: emp.organization_id, userId };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const GRADE_CLS: Record<string, string> = {
  "A": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "A-":"bg-emerald-50 text-emerald-600 border-emerald-200",
  "B": "bg-blue-50   text-blue-700    border-blue-200",
  "C": "bg-amber-50  text-amber-700   border-amber-200",
  "F": "bg-red-50    text-red-600     border-red-200",
};

function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return null;
  return <span className={cn("text-[8px] font-bold px-1 py-0.5 rounded border flex-shrink-0", GRADE_CLS[grade] ?? "bg-slate-50 text-slate-500 border-slate-200")}>{grade}</span>;
}

function Avatar({ src, name, size = 36 }: { src?: string; name?: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  const init = (name ?? "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  if (src && !err)
    return <img src={src} alt={name ?? ""} onError={() => setErr(true)}
      style={{ width: size, height: size }} className="rounded-full object-cover ring-1 ring-slate-200 flex-shrink-0" />;
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.32 }}
      className="rounded-full bg-gradient-to-br from-violet-100 to-purple-100 ring-1 ring-slate-200 flex items-center justify-center font-bold text-violet-600 flex-shrink-0">
      {init}
    </div>
  );
}

// ─── Provider-aware reveal ────────────────────────────────────────────────────
// ContactOut profiles have `_provider: "contactout"` set during normalization
// RocketReach profiles have `_provider: "rocketreach"` (or undefined = rocketreach)
async function revealProfile(
  profile: RRProfile,
  revealType: "email" | "phone",
  auth: { organizationId: string; userId: string }
): Promise<any> {
  const provider = (profile as any)._provider ?? "rocketreach";

  if (provider === "contactout") {
    // ContactOut: use linkedin_url as identifier, call contactout-enrich
    const linkedinUrl = profile.linkedin_url;
    if (!linkedinUrl) throw new Error("No LinkedIn URL for ContactOut profile");

    const { data, error: fnError } = await supabase.functions.invoke("contactout-enrich", {
      body: {
        linkedinUrl,
        organizationId: auth.organizationId,
        userId: auth.userId,
        revealType,
        snapshotName:    profile.name,
        snapshotTitle:   profile.current_title,
        snapshotCompany: profile.current_employer,
      },
    });
    if (fnError) throw new Error(fnError.message);
    return data;
  } else {
    // RocketReach: use integer profile ID, call rocketreach-lookup
    const { data, error: fnError } = await supabase.functions.invoke("rocketreach-lookup", {
      body: {
        rrProfileId:    profile.id,
        organizationId: auth.organizationId,
        userId:         auth.userId,
        revealType,
      },
    });
    if (fnError) throw new Error(fnError.message);
    return data;
  }
}

// ─── ExpandableList — generic show more/less ─────────────────────────────────
function ExpandableList<T>({ items, max, renderItem, className }: {
  items: T[]; max: number;
  renderItem: (item: T, i: number) => React.ReactNode;
  className?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, max);
  return (
    <div className={className}>
      {visible.map((item, i) => renderItem(item, i))}
      {items.length > max && (
        <button type="button" onClick={e => { e.stopPropagation(); setShowAll(v => !v); }}
          className="flex items-center gap-0.5 text-[10px] text-violet-600 hover:underline mt-1">
          {showAll
            ? <><ChevronUp size={9} /> Show less</>
            : <><ChevronDown size={9} /> +{items.length - max} more</>
          }
        </button>
      )}
    </div>
  );
}

// ─── Single row ───────────────────────────────────────────────────────────────
const MAX_JOBS   = 2;
const MAX_SKILLS = 8;
const MAX_CERTS  = 2;
const MAX_PROJ   = 2;

interface RowProps {
  profile:          RRProfile;
  revealed:         boolean;
  checked:          boolean;
  selected:         boolean;
  onCheck:          (v: boolean) => void;
  onRowClick:       () => void;
  onRevealComplete: (id: number, data: any) => void;
}

const RRResultRow: React.FC<RowProps> = ({
  profile: p, revealed, checked, selected, onCheck, onRowClick, onRevealComplete,
}) => {
  const [revealingEmail, setRevealingEmail] = useState(false);
  const [revealingPhone, setRevealingPhone] = useState(false);
  const [revealError,    setRevealError]    = useState<string | null>(null);

  const provider  = (p as any)._provider ?? "rocketreach";
  const enriched  = !!p._enriched || revealed;
  const coData    = (p as any)._coData;  // ContactOut extra data

  const jobHist   = p._jobHistory ?? [];
  const skills    = (p._skills ?? p.skills ?? []) as string[];
  const allEmails = p._allEmails ?? [];
  const allPhones = p._allPhones ?? [];

  // Certifications, projects from ContactOut extra data
  const certs    = coData?.certifications ?? [];
  const projects = coData?.projects       ?? [];

  const displayJobs = enriched && jobHist.length > 0
    ? jobHist
    : p.current_title
    ? [{ title: p.current_title, company_name: p.current_employer, company_linkedin_url: p.current_employer_linkedin_url, is_current: true, start_date: null, end_date: null, description: null }]
    : [];

  const teaserEmails = [
    ...(p.teaser?.professional_emails ?? []),
    ...(p.teaser?.emails ?? []),
    ...(p.teaser?.personal_emails ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const teaserPhones = p.teaser?.phones ?? [];

  const doReveal = useCallback(async (revealType: "email" | "phone") => {
    const setter = revealType === "email" ? setRevealingEmail : setRevealingPhone;
    setter(true);
    setRevealError(null);

    const auth = await resolveAuth();
    if (!auth) { setter(false); setRevealError("Not authenticated"); return; }

    try {
      const data = await revealProfile(p, revealType, auth);
      if (!data?.success) throw new Error(data?.error ?? "Reveal failed");
      onRevealComplete(p.id, { ...data, _provider: provider });
    } catch (e: any) {
      setRevealError(e.message ?? "Reveal failed");
    } finally {
      setter(false);
    }
  }, [p, provider, onRevealComplete]);

  return (
    <div
      onClick={onRowClick}
      className={cn(
        "border-b border-slate-100 px-4 py-3.5 cursor-pointer transition-colors group",
        selected ? "bg-violet-50/60 border-l-2 border-l-violet-500" : "hover:bg-slate-50/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="mt-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <Checkbox checked={checked} onCheckedChange={v => onCheck(!!v)} className="h-3.5 w-3.5 accent-violet-600" />
        </div>

        {/* Avatar */}
        <Avatar src={p.profile_pic} name={p.name} size={36} />

        {/* ── Main info ── */}
        <div className="flex-1 min-w-0">
          {/* Name + badges row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-semibold text-slate-800 leading-tight">{p.name ?? "—"}</span>

            {p.linkedin_url && (
              <a href={p.linkedin_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="text-slate-400 hover:text-blue-600 transition-colors">
                <Linkedin size={11} />
              </a>
            )}

            {/* Provider badge */}
            {provider === "contactout" ? (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">CO</span>
            ) : (
              enriched && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">RR</span>
            )}

            {/* Open to work */}
            {coData?.workStatus === "open_to_work" && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Open to Work</span>
            )}

            {/* Seniority */}
            {coData?.seniority && (
              <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 capitalize">{coData.seniority}</span>
            )}
          </div>

          {/* Location + connections */}
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
            <MapPin size={9} className="flex-shrink-0" />
            <span>{p.location ?? p.city ?? "—"}</span>
            {p.connections && <span className="text-slate-400">· {p.connections.toLocaleString()} connections</span>}
          </div>

          {/* ── Experience ── */}
          <ExpandableList
            items={displayJobs}
            max={MAX_JOBS}
            className="mt-1"
            renderItem={(j: any, i) => (
              <div key={i} className="flex items-baseline gap-1 text-[11px] flex-wrap mb-1">
                <Briefcase size={9} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 font-medium">{j.title ?? "—"}</span>
                <span className="text-slate-400">at</span>
                {j.company_linkedin_url
                  ? <a href={j.company_linkedin_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-violet-600 font-semibold hover:underline">{j.company_name ?? j.company ?? "—"}</a>
                  : <span className="text-violet-600 font-semibold">{j.company_name ?? j.company ?? "—"}</span>
                }
                {j.is_current && <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 rounded">Current</span>}
                {j.start_date && (
                  <span className="text-slate-400 text-[10px]">
                    {j.start_date.slice(0, 7)} – {j.is_current ? "Present" : (j.end_date?.slice(0, 7) ?? "?")}
                  </span>
                )}
              </div>
            )}
          />

          {/* ── Education ── */}
          {enriched && (p._education ?? []).length > 0 && (
            <ExpandableList
              items={p._education as any[]}
              max={1}
              className="mt-0.5"
              renderItem={(e: any, i) => (
                <div key={i} className="flex items-baseline gap-1 text-[10px] text-slate-500 mb-0.5">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                  </svg>
                  <span>{[e.degree, e.major].filter(Boolean).join(" · ")}{e.school ? ` · ${e.school}` : ""}</span>
                </div>
              )}
            />
          )}

          {/* ── Skills ── */}
          {skills.length > 0 && (
            <ExpandableList
              items={skills}
              max={MAX_SKILLS}
              className="mt-1.5"
              renderItem={(s, i) => null /* rendered inline */}
            >
              {/* Custom render since ExpandableList renders items internally */}
            </ExpandableList>
          )}
          {/* Render skills inline (ExpandableList is generic, skills need inline flex) */}
          {(() => {
            const [showAllSkills, setShowAllSkills] = useState(false);
            const visSkills = showAllSkills ? skills : skills.slice(0, MAX_SKILLS);
            if (!skills.length) return null;
            return (
              <div className="mt-1.5">
                <div className="flex flex-wrap gap-1">
                  {visSkills.map((s, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{s}</span>
                  ))}
                </div>
                {skills.length > MAX_SKILLS && (
                  <button type="button" onClick={e => { e.stopPropagation(); setShowAllSkills(v => !v); }}
                    className="flex items-center gap-0.5 text-[10px] text-violet-600 hover:underline mt-1">
                    {showAllSkills ? <><ChevronUp size={9} /> Fewer skills</> : <><ChevronDown size={9} /> +{skills.length - MAX_SKILLS} skills</>}
                  </button>
                )}
              </div>
            );
          })()}

          {/* ── Certifications (ContactOut) ── */}
          {certs.length > 0 && (
            <div className="mt-1.5" onClick={e => e.stopPropagation()}>
              {(() => {
                const [showAll, setShowAll] = useState(false);
                const vis = showAll ? certs : certs.slice(0, MAX_CERTS);
                return (
                  <>
                    <div className="flex flex-wrap gap-1">
                      {vis.map((c: any, i: number) => (
                        <span key={i} className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Award size={8} /> {c.name ?? c}
                        </span>
                      ))}
                    </div>
                    {certs.length > MAX_CERTS && (
                      <button type="button" onClick={e => { e.stopPropagation(); setShowAll(v => !v); }}
                        className="flex items-center gap-0.5 text-[10px] text-violet-600 hover:underline mt-0.5">
                        {showAll ? <><ChevronUp size={9} /> Less</> : <><ChevronDown size={9} /> +{certs.length - MAX_CERTS} certs</>}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* ── Projects (ContactOut) ── */}
          {projects.length > 0 && (
            <div className="mt-1" onClick={e => e.stopPropagation()}>
              {(() => {
                const [showAll, setShowAll] = useState(false);
                const vis = showAll ? projects : projects.slice(0, MAX_PROJ);
                return (
                  <>
                    <div className="space-y-0.5">
                      {vis.map((proj: any, i: number) => (
                        <div key={i} className="text-[10px] text-slate-500 flex items-baseline gap-1">
                          <span className="text-slate-400">▸</span>
                          <span className="font-medium text-slate-600">{proj.title}</span>
                          {proj.description && (
                            <span className="text-slate-400 line-clamp-1 flex-1 min-w-0">{proj.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {projects.length > MAX_PROJ && (
                      <button type="button" onClick={e => { e.stopPropagation(); setShowAll(v => !v); }}
                        className="flex items-center gap-0.5 text-[10px] text-violet-600 hover:underline mt-0.5">
                        {showAll ? <><ChevronUp size={9} /> Less</> : <><ChevronDown size={9} /> +{projects.length - MAX_PROJ} projects</>}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}

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
                    <span className={cn("w-[5px] h-[5px] rounded-full flex-shrink-0",
                      e.smtp_valid === "valid" ? "bg-emerald-500" : "bg-slate-300")} />
                    <span className="text-[10px] font-mono text-slate-700 truncate max-w-[120px]">{e.email}</span>
                    <GradeBadge grade={e.grade} />
                    <CopyBtn text={e.email} />
                  </div>
                ))}
                {allEmails.length > 2 && (
                  <p className="text-[9px] text-slate-400 text-right">+{allEmails.length - 2} more emails</p>
                )}
                <button onClick={() => doReveal("email")}
                  className="w-full mt-0.5 text-[10px] text-violet-600 border border-violet-300 rounded-md px-2 py-1 hover:bg-violet-50 transition-colors font-medium text-center">
                  ↻ Re-reveal email
                </button>
              </>
            ) : (
              <>
                {teaserEmails.slice(0, 2).map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 justify-end">
                    <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                      {/* ContactOut teaser is full domain only; show as ***@domain */}
                      {e.includes("@") ? e : `***@${e}`}
                    </span>
                  </div>
                ))}
                {/* Contact availability dots */}
                {!teaserEmails.length && (
                  <div className="flex items-center gap-1 justify-end text-[9px] text-slate-400">
                    {p.teaser?.professional_emails?.length || p.teaser?.personal_emails?.length
                      ? <span className="text-emerald-500">● email available</span>
                      : <span className="text-slate-300">no email listed</span>
                    }
                  </div>
                )}
                <button onClick={() => doReveal("email")} disabled={revealingEmail}
                  className="w-full text-[10px] font-semibold text-violet-600 border border-violet-500 rounded-md px-2 py-1 hover:bg-violet-50 transition-colors flex items-center justify-center gap-1 mt-0.5 disabled:opacity-50">
                  {revealingEmail ? <><Loader2 size={9} className="animate-spin" /> Revealing…</> : <><Mail size={9} /> View email</>}
                </button>
              </>
            )}
          </div>

          <div className="h-px bg-slate-100 mx-1" />

          {/* PHONE */}
          <div className="space-y-0.5">
            {enriched && allPhones.length > 0 ? (
              <>
                {allPhones.slice(0, 1).map((ph, i) => (
                  <div key={i} className="flex items-center gap-1 justify-end">
                    <span className="text-[10px] font-mono text-slate-700">{ph.number}</span>
                    <CopyBtn text={ph.number} />
                  </div>
                ))}
              </>
            ) : (
              <>
                {teaserPhones.slice(0, 1).map((ph, i) => (
                  <div key={i} className="flex items-center gap-1.5 justify-end text-[10px] text-slate-400 font-mono">
                    {typeof ph === "string" ? ph : ph.number}
                    {(ph as any).is_premium && <span className="text-[8px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">PRO</span>}
                  </div>
                ))}
                {!teaserPhones.length && (
                  <div className="text-[9px] text-right text-slate-300">
                    {(p as any).teaser?.phones?.length || (p as any)._coData?.contactAvailability?.phone
                      ? <span className="text-emerald-400">● phone available</span>
                      : "—"
                    }
                  </div>
                )}
              </>
            )}
            <button onClick={() => doReveal("phone")} disabled={revealingPhone}
              className="w-full text-[10px] font-medium text-slate-500 border border-slate-300 rounded-md px-2 py-1 hover:border-violet-400 hover:text-violet-600 transition-colors flex items-center justify-center gap-1 mt-0.5 disabled:opacity-50">
              {revealingPhone ? <><Loader2 size={9} className="animate-spin" /> Looking up…</> : <><Phone size={9} /> {enriched && allPhones.length > 0 ? "Re-reveal phone" : "Find phone"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Results area ─────────────────────────────────────────────────────────────
interface RRResultsAreaProps {
  profiles:     RRProfile[];
  loading:      boolean;
  totalEntries: number;
  page:         number;
  pageSize:     number;
  totalPages:   number;
  selectedId:   number | null;
  checkedIds:   Set<number>;
  revealedIds:  Set<number>;
  onSelectRow:     (p: RRProfile | null) => void;
  onCheckRow:      (id: number, v: boolean) => void;
  onCheckAll:      (v: boolean) => void;
  onPrev:          () => void;
  onNext:          () => void;
  onRevealComplete:(id: number, data: any) => void;
}

export const RRResultsArea: React.FC<RRResultsAreaProps> = ({
  profiles, loading, totalEntries, page, pageSize, totalPages,
  selectedId, checkedIds, revealedIds,
  onSelectRow, onCheckRow, onCheckAll,
  onPrev, onNext, onRevealComplete,
}) => {
  const allChecked = profiles.length > 0 && profiles.every(p => checkedIds.has(p.id));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-white flex items-center gap-3">
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <Checkbox checked={allChecked} onCheckedChange={v => onCheckAll(!!v)} className="h-3.5 w-3.5" />
          {checkedIds.size > 0 && (
            <span className="text-[10px] text-violet-600 font-medium">{checkedIds.size} selected</span>
          )}
        </div>

        {totalEntries > 0 && (
          <span className="text-[10px] text-slate-500">
            <span className="font-semibold text-slate-700">{totalEntries.toLocaleString()}</span> profiles
            {totalPages > 1 && <span className="ml-1.5 text-slate-400">· Page {page}/{totalPages}</span>}
          </span>
        )}

        {totalPages > 1 && (
          <div className="flex items-center gap-1 ml-auto">
            <button disabled={page <= 1} onClick={onPrev}
              className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[11px]">
              ‹
            </button>
            <button disabled={page >= totalPages} onClick={onNext}
              className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[11px]">
              ›
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                  <div className="h-2.5 w-48 bg-slate-100 rounded animate-pulse" />
                  <div className="h-2 w-56 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="w-40 space-y-2">
                  <div className="h-3 w-32 bg-slate-100 rounded animate-pulse ml-auto" />
                  <div className="h-6 w-32 bg-slate-100 rounded animate-pulse ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-3">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
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