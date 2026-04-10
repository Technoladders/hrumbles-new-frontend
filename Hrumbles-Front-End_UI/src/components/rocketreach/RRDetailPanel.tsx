/**
 * RRDetailPanel.tsx — v3
 *
 * Changes from v2:
 *   1. Shortlist = save ONLY — no folder modal (onShortlist prop removed)
 *      Shows a ✓ toast inline after save
 *   2. Email display: personal emails prominently, professional in "Show more"
 *   3. Two-step invite: picks email/phone, then fires onInvite
 *   4. Education section uses normalizeEdu for scraped format compatibility
 *   5. No "RocketReach" brand text
 */

import React, { useState, useEffect, useRef } from "react";
import { createPortal }  from "react-dom";
import { ScrollArea }    from "@/components/ui/scroll-area";
import { cn }            from "@/lib/utils";
import {
  X, Mail, Phone, Linkedin, MapPin, Globe, Building2,
  ChevronDown, ChevronUp, Loader2, Copy, Check,
  Bookmark, BookmarkCheck, Calendar, GraduationCap, Award, Send,
} from "lucide-react";

import { supabase }        from "@/integrations/supabase/client";
import { useQueryClient }  from "@tanstack/react-query";
import { useRRUpsertSaved } from "./hooks/useRRUpsertSaved";
import type { FolderItem } from "@/components/CandidateSearch/hooks/useFolders";
import type { RRProfile, RREmailEntry, RRPhoneEntry, RRJobHistoryEntry } from "./types";

// ─── Auth ──────────────────────────────────────────────────────────────────────
async function resolveAuth(): Promise<{ organizationId: string; userId: string } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const userId = session.user.id;
  const org = session.user.user_metadata?.organization_id ?? session.user.user_metadata?.hr_organization_id ?? (session.user.app_metadata as any)?.organization_id ?? null;
  if (org) return { organizationId: org, userId };
  const { data: emp } = await supabase.from("hr_employees").select("organization_id").eq("user_id", userId).maybeSingle();
  return emp?.organization_id ? { organizationId: emp.organization_id, userId } : null;
}

// ─── Education normalizer (same as RRResultsArea) ─────────────────────────────
function normalizeEdu(e: any): { school: string; degree: string; major: string; start: string; end: string } {
  const school = e.school ?? e.institution ?? "";
  const degree = e.degree ?? "";
  const major  = e.major ?? e.field ?? "";
  let   start  = String(e.start ?? "");
  let   end    = String(e.end ?? "");
  if (!start && e.period) {
    const parts = e.period.replace(/&nbsp;/g, "").split(/\s*[-–]\s*/);
    start = parts[0]?.trim() ?? "";
    end   = parts[1]?.trim().replace("now", "Present") ?? "";
  }
  return { school, degree, major, start, end };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 44 }: { src?: string; name?: string|null; size?: number }) {
  const [err, setErr] = useState(false);
  const init = (name ?? "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  if (src && !err)
    return <img src={src} alt={name ?? ""} onError={() => setErr(true)} style={{ width: size, height: size }} className="rounded-full object-cover ring-2 ring-white/30 flex-shrink-0" />;
  return <div style={{ width: size, height: size, fontSize: size * 0.33 }} className="rounded-full bg-white/20 ring-2 ring-white/30 flex items-center justify-center font-bold text-white flex-shrink-0">{init}</div>;
}

function CopyBtn({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }} className={cn("flex-shrink-0 transition-colors", className)}>
      {done ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
    </button>
  );
}

const GRADE_CLS: Record<string, string> = { "A": "bg-emerald-100 text-emerald-700 border-emerald-300", "A-": "bg-emerald-50 text-emerald-600 border-emerald-200", "B": "bg-blue-50 text-blue-700 border-blue-200", "C": "bg-amber-50 text-amber-700 border-amber-200", "F": "bg-red-50 text-red-600 border-red-200" };
function GradeBadge({ grade }: { grade: string|null }) {
  if (!grade) return null;
  return <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0", GRADE_CLS[grade] ?? "bg-slate-100 text-slate-500 border-slate-200")}>{grade}</span>;
}
function SectionHead({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-2.5">{children}</p>;
}
function Divider() { return <div className="h-px bg-violet-100 my-1" />; }

// ─── Reveal button ─────────────────────────────────────────────────────────────
const RevealBtn: React.FC<{ type: "email"|"phone"; loading: boolean; done: boolean; onClick: () => void }> = ({ type, loading, done, onClick }) => (
  <button type="button" onClick={onClick} disabled={loading}
    className={cn("flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-[11px] font-bold border transition-all",
      done ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : type === "email" ? "bg-violet-600 hover:bg-violet-700 text-white border-transparent shadow-sm"
        : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-violet-400 hover:text-violet-700",
      loading && "opacity-60 cursor-not-allowed")}>
    {loading ? <Loader2 size={11} className="animate-spin" /> : done ? <Check size={11} /> : type === "email" ? <Mail size={11} /> : <Phone size={11} />}
    {loading ? "Looking up…" : done ? (type === "email" ? "Email revealed" : "Phone revealed") : type === "email" ? "Reveal Email" : "Find Phone"}
  </button>
);

// ─── Email section (personal first, professional collapsed) ────────────────────
function EmailSection({ emails, teaserEmails, loading }: { emails: RREmailEntry[]; teaserEmails: string[]; loading: boolean }) {
  const [showProfessional, setShowProfessional] = useState(false);
  const [showAllPersonal,  setShowAllPersonal]  = useState(false);

  if (loading) return <div className="space-y-2">{Array.from({length:2}).map((_,i)=><div key={i} className="h-6 rounded bg-slate-100 animate-pulse" />)}</div>;

  if (!emails.length && teaserEmails.length) {
    return (
      <div className="space-y-1">
        {teaserEmails.map((e, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            ***@{e}
          </div>
        ))}
      </div>
    );
  }
  if (!emails.length) return <p className="text-[11px] text-slate-400">No emails found</p>;

  const personal     = emails.filter(e => e.type === "personal");
  const professional = emails.filter(e => e.type !== "personal");
  const visiblePersonal = showAllPersonal ? personal : personal.slice(0, 2);

  const EmailRow = ({ e }: { e: RREmailEntry }) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", e.smtp_valid === "valid" ? "bg-emerald-500" : "bg-slate-300")} />
      <span className="font-mono text-[11px] text-slate-700 truncate max-w-[170px]">{e.email}</span>
      <CopyBtn text={e.email} className="text-slate-300 hover:text-violet-500" />
      <GradeBadge grade={e.grade} />
      {e.is_primary && <span className="text-[8px] text-violet-500 font-bold bg-violet-50 px-1 rounded">Primary</span>}
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Personal emails — shown prominently */}
      {personal.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-semibold text-blue-500 uppercase tracking-wider">Personal</p>
          {visiblePersonal.map((e, i) => <EmailRow key={i} e={e} />)}
          {personal.length > 2 && (
            <button type="button" onClick={() => setShowAllPersonal(v => !v)} className="flex items-center gap-1 text-[10px] text-violet-500 hover:underline">
              {showAllPersonal ? <><ChevronUp size={9}/> Less</> : <><ChevronDown size={9}/> +{personal.length - 2} more personal</>}
            </button>
          )}
        </div>
      )}

      {/* Professional emails — collapsed by default */}
      {professional.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowProfessional(v => !v)}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 mb-1">
            {showProfessional ? <ChevronUp size={9}/> : <ChevronDown size={9}/>}
            {professional.length} professional email{professional.length > 1 ? "s" : ""}
          </button>
          {showProfessional && (
            <div className="space-y-1.5 pl-2 border-l-2 border-slate-100">
              {professional.map((e, i) => <EmailRow key={i} e={e} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Phone section ─────────────────────────────────────────────────────────────
function PhoneSection({ phones, teaserPhones, loading }: { phones: RRPhoneEntry[]; teaserPhones: { number: string; is_premium: boolean }[]; loading: boolean }) {
  if (loading) return <div className="h-6 rounded bg-slate-100 animate-pulse" />;
  if (!phones.length && teaserPhones.length) {
    return (
      <div className="space-y-1">
        {teaserPhones.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Phone size={9} className="text-slate-300 flex-shrink-0" />{p.number}
            {p.is_premium && <span className="text-[8px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">PRO</span>}
          </div>
        ))}
      </div>
    );
  }
  if (!phones.length) return <p className="text-[11px] text-slate-400">No phones found</p>;
  return (
    <div className="space-y-1.5">
      {phones.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Phone size={9} className="text-violet-400 flex-shrink-0" />
          <span className="font-mono text-[11px] text-slate-700">{p.number}</span>
          <CopyBtn text={p.number} className="text-slate-300 hover:text-violet-500" />
          {p.recommended && <span className="text-[8px] text-violet-500 font-bold bg-violet-50 px-1 rounded">Recommended</span>}
          {p.premium && <span className="text-[8px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-200">PRO</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Career timeline ────────────────────────────────────────────────────────────
function CareerTimeline({ jobs }: { jobs: RRJobHistoryEntry[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? jobs : jobs.slice(0, 3);
  return (
    <>
      <div className="space-y-0">
        {visible.map((j, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0 pt-1">
              <div className={cn("w-2.5 h-2.5 rounded-full border-2 flex-shrink-0", j.is_current ? "bg-violet-500 border-violet-400" : "bg-white border-slate-300")} />
              {i < visible.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1.5 min-h-[16px]" />}
            </div>
            <div className="pb-4 min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1">
                <p className={cn("text-[11px] font-bold leading-tight", j.is_current ? "text-slate-800" : "text-slate-600")}>
                  {j.title ?? "—"}
                  {j.is_current && <span className="ml-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">Current</span>}
                </p>
                {j.highest_level && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-500 capitalize flex-shrink-0">{j.highest_level}</span>}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{j.company_name ?? (j as any).company ?? "—"}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[9px] text-slate-400">
                {(j.start_date || j.end_date) && (
                  <span className="flex items-center gap-0.5"><Calendar size={8} />
                    {j.start_date ? j.start_date.slice(0,7) : "?"} → {j.is_current ? "Present" : (j.end_date?.slice(0,7) ?? "?")}
                  </span>
                )}
                {j.department && <span>· {j.department}{j.sub_department ? ` / ${j.sub_department}` : ""}</span>}
              </div>
              {j.description && <p className="text-[9px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{j.description}</p>}
            </div>
          </div>
        ))}
      </div>
      {jobs.length > 3 && (
        <button type="button" onClick={() => setShowAll(v => !v)} className="flex items-center gap-1 text-[10px] font-semibold text-violet-500 hover:text-violet-700 mt-1 transition-colors">
          {showAll ? <><ChevronUp size={10}/> Show less</> : <><ChevronDown size={10}/> +{jobs.length-3} more roles</>}
        </button>
      )}
    </>
  );
}

function SkillsSection({ skills }: { skills: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const MAX = 12;
  const visible = showAll ? skills : skills.slice(0, MAX);
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((s, i) => <span key={i} className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 ring-1 ring-violet-200 text-[9px] font-semibold">{s}</span>)}
      </div>
      {skills.length > MAX && (
        <button type="button" onClick={() => setShowAll(v => !v)} className="flex items-center gap-1 text-[10px] font-semibold text-violet-500 hover:text-violet-700 mt-1.5 transition-colors">
          {showAll ? <><ChevronUp size={10}/> Show less</> : <><ChevronDown size={10}/> +{skills.length-MAX} more skills</>}
        </button>
      )}
    </>
  );
}

function EducationSection({ education }: { education: any[] }) {
  const [showAll, setShowAll] = useState(false);
  const normalized = education.map(normalizeEdu);
  const sorted = [...normalized].sort((a, b) => {
    const rank = (d: string) => { const EDU_RANK: [string,number][] = [["phd",6],["doctor",6],["master",5],["mba",5],["bachelor",4],["b.tech",4],["be ",4],["diploma",3]]; return EDU_RANK.find(([k]) => d.toLowerCase().includes(k))?.[1] ?? 0; };
    return rank(b.degree) - rank(a.degree);
  });
  const visible = showAll ? sorted : sorted.slice(0, 2);
  return (
    <>
      <div className="space-y-2.5">
        {visible.map((e, i) => (
          <div key={i} className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={12} className="text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-700">{e.school || "—"}</p>
              <p className="text-[10px] text-slate-500">{[e.degree, e.major].filter(Boolean).join(" · ")}</p>
              {(e.start || e.end) && <p className="text-[9px] text-slate-400">{e.start}{e.end && e.end !== e.start ? ` – ${e.end}` : ""}</p>}
            </div>
          </div>
        ))}
      </div>
      {sorted.length > 2 && (
        <button type="button" onClick={() => setShowAll(v => !v)} className="flex items-center gap-1 text-[10px] font-semibold text-violet-500 hover:text-violet-700 mt-1.5 transition-colors">
          {showAll ? <><ChevronUp size={10}/> Show less</> : <><ChevronDown size={10}/> +{sorted.length-2} more</>}
        </button>
      )}
    </>
  );
}

// ─── Inline invite picker (used in panel) ─────────────────────────────────────
const PanelInvitePicker: React.FC<{
  emails:  RREmailEntry[];
  phones:  RRPhoneEntry[];
  onConfirm: (email: string|null, phone: string|null) => void;
  onClose:   () => void;
}> = ({ emails, phones, onConfirm, onClose }) => {
  const personal     = emails.filter(e => e.type === "personal");
  const professional = emails.filter(e => e.type !== "personal");
  const allEmails    = [...personal, ...professional];
  const [sel, setSel] = useState<{ kind: "email"|"phone"; value: string } | null>(
    allEmails[0] ? { kind: "email", value: allEmails[0].email } : phones[0] ? { kind: "phone", value: phones[0].number } : null
  );
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Choose contact</p>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-500"><X size={10} /></button>
      </div>
      {allEmails.length > 0 && (
        <div>
          <p className="text-[9px] text-slate-400 font-semibold uppercase mb-1">Email</p>
          <div className="space-y-1">
            {allEmails.map((e, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-50 rounded px-1">
                <input type="radio" name="panel-invite" checked={sel?.kind === "email" && sel.value === e.email} onChange={() => setSel({ kind: "email", value: e.email })} className="accent-violet-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-mono text-slate-700 truncate block">{e.email}</span>
                  <span className={cn("text-[8px]", e.type === "personal" ? "text-blue-500" : "text-slate-400")}>{e.type}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
      {phones.length > 0 && (
        <div>
          <p className="text-[9px] text-slate-400 font-semibold uppercase mb-1">Phone</p>
          {phones.slice(0, 3).map((ph, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-50 rounded px-1">
              <input type="radio" name="panel-invite" checked={sel?.kind === "phone" && sel.value === ph.number} onChange={() => setSel({ kind: "phone", value: ph.number })} className="accent-violet-600 flex-shrink-0" />
              <span className="text-[10px] font-mono text-slate-700">{ph.number}</span>
            </label>
          ))}
        </div>
      )}
      <button disabled={!sel} onClick={() => { if (sel) onConfirm(sel.kind === "email" ? sel.value : null, sel.kind === "phone" ? sel.value : null); }}
        className="w-full py-1.5 rounded-lg text-[11px] font-bold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 transition-colors">
        <Send size={10} className="inline mr-1" />Invite
      </button>
    </div>
  );
};

// ─── Main panel ─────────────────────────────────────────────────────────────────
type PanelTab = "overview" | "contact" | "career" | "raw";

interface RRDetailPanelProps {
  profile:           RRProfile;
  onClose:           () => void;
  onRevealComplete?: (id: number, data: any) => void;
  // FIX: onShortlist removed — shortlist is now self-contained (no folder modal)
  onInvite?:         (rrProfileId: string, email: string|null, phone: string|null) => void;
  folders?:          FolderItem[];
  onCreateFolder?:   (name: string) => Promise<string|null>;
}

export const RRDetailPanel: React.FC<RRDetailPanelProps> = ({
  profile, onClose, onRevealComplete, onInvite,
}) => {
  const [tab,            setTab]           = useState<PanelTab>("overview");
  const [revealingEmail, setRevealingEmail] = useState(false);
  const [revealingPhone, setRevealingPhone] = useState(false);
  const [revealErrors,   setRevealErrors]   = useState<{ email?: string; phone?: string }>({});
  const [showInvitePick, setShowInvitePick] = useState(false);

  const [emailRevealed, setEmailRevealed] = useState(!!profile._allEmails?.length);
  const [phoneRevealed, setPhoneRevealed] = useState(!!profile._allPhones?.length);
  const [allEmails,     setAllEmails]     = useState<RREmailEntry[]>(profile._allEmails ?? []);
  const [allPhones,     setAllPhones]     = useState<RRPhoneEntry[]>(profile._allPhones ?? []);
  const [jobHistory,    setJobHistory]    = useState(profile._jobHistory ?? []);
  const [education,     setEducation]     = useState<any[]>(profile._education ?? []);
  const [skills,        setSkills]        = useState<string[]>((profile._skills ?? profile.skills ?? []) as string[]);

  useEffect(() => {
    if (profile._allEmails?.length) { setAllEmails(profile._allEmails); setEmailRevealed(true); }
    if (profile._allPhones?.length) { setAllPhones(profile._allPhones); setPhoneRevealed(true); }
    if (profile._jobHistory?.length) setJobHistory(profile._jobHistory);
    if (profile._education?.length)  setEducation(profile._education);
    if (profile._skills?.length)     setSkills(profile._skills);
  }, [profile._allEmails, profile._allPhones, profile._jobHistory, profile._education, profile._skills]);

  // ── Shortlist (self-contained, no folder modal) ──────────────────────────
  const { status: saveStatus, upsert: doSave } = useRRUpsertSaved();
  const queryClient = useQueryClient();

  const handleShortlist = async () => {
    const auth = await resolveAuth();
    if (!auth || saveStatus === "saving" || saveStatus === "saved") return;
    await doSave({
      rrProfileId:        String(profile.id),
      saveType:           "shortlisted",
      snapshotName:       profile.name,
      snapshotTitle:      profile.current_title,
      snapshotCompany:    profile.current_employer,
      snapshotLocation:   profile.location,
      email:              allEmails[0]?.email ?? null,
      phone:              allPhones[0]?.number ?? null,
      candidateProfileId: (profile as any)._candidateProfileId ?? null,
    });
    queryClient.invalidateQueries({ queryKey: ["saved-candidates"] });
    queryClient.invalidateQueries({ queryKey: ["saved-candidates-count"] });
    // No folder modal — just show ✓ in button
  };

  // ── Reveal ────────────────────────────────────────────────────────────────
  const doReveal = async (revealType: "email"|"phone") => {
    const setter = revealType === "email" ? setRevealingEmail : setRevealingPhone;
    setter(true); setRevealErrors(prev => ({ ...prev, [revealType]: undefined }));
    const auth = await resolveAuth();
    if (!auth) { setter(false); setRevealErrors(prev => ({ ...prev, [revealType]: "Auth failed" })); return; }
    const { data, error: fnError } = await supabase.functions.invoke("rocketreach-lookup", {
      body: { rrProfileId: profile.id, organizationId: auth.organizationId, userId: auth.userId, revealType },
    });
    setter(false);
    if (fnError || !data?.success) { setRevealErrors(prev => ({ ...prev, [revealType]: data?.error ?? fnError?.message ?? "Reveal failed" })); return; }
    if (revealType === "email" && data.allEmails?.length) { setAllEmails(data.allEmails); setEmailRevealed(true); }
    if (revealType === "phone" && data.allPhones?.length) { setAllPhones(data.allPhones); setPhoneRevealed(true); }
    if (data.jobHistory?.length) setJobHistory(data.jobHistory);
    if (data.education?.length)  setEducation(data.education);
    if (data.skills?.length)     setSkills(data.skills);
    onRevealComplete?.(profile.id, data);
    queryClient.invalidateQueries({ queryKey: ["saved-candidates"] });
    queryClient.invalidateQueries({ queryKey: ["rr-revealed-ids"] });
  };

  const displayName  = profile.name            ?? "—";
  const displayTitle = profile.current_title   ?? "—";
  const displayCo    = profile.current_employer ?? "—";

  const teaserEmails = [...(profile.teaser?.personal_emails ?? []), ...(profile.teaser?.professional_emails ?? []), ...(profile.teaser?.emails ?? [])].filter((v, i, a) => a.indexOf(v) === i);
  const teaserPhones = profile.teaser?.phones ?? [];

  const TABS: { key: PanelTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "contact",  label: `Contact${emailRevealed ? " ✓" : ""}` },
    { key: "career",   label: "Career"  },
    { key: "raw",      label: "Raw"     },
  ];

  const panel = (
    <div className="fixed inset-0 z-50 flex" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="flex-1 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="w-full max-w-[460px] bg-white border-l border-slate-200 flex flex-col shadow-2xl overflow-hidden"
        style={{ animation: "rrPanelIn .2s cubic-bezier(.22,1,.36,1) both" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3" style={{ background: "linear-gradient(135deg,#4c1d95 0%,#7c3aed 60%,#6d28d9 100%)" }}>
          <div className="flex items-start gap-3 mb-3">
            <Avatar src={profile.profile_pic} name={displayName} size={44} />
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-bold text-white leading-tight truncate">{displayName}</h2>
              <p className="text-[11px] text-white/80 truncate mt-0.5">{displayTitle}</p>
              <p className="text-[10px] text-white/60 truncate">{displayCo}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <button onClick={onClose} className="w-6 h-6 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center"><X size={12} className="text-white/80" /></button>

              {/* Shortlist — no folder modal */}
              <button onClick={handleShortlist} disabled={saveStatus === "saving"}
                className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border",
                  saveStatus === "saved" ? "bg-emerald-400/20 text-emerald-200 border-emerald-400/30" : "bg-white/15 hover:bg-white/25 text-white border-white/20")}>
                {saveStatus === "saving" ? <Loader2 size={9} className="animate-spin" /> : saveStatus === "saved" ? <BookmarkCheck size={9} /> : <Bookmark size={9} />}
                {saveStatus === "saved" ? "Saved ✓" : "Save"}
              </button>

              {/* Invite — two-step picker */}
              {onInvite && (
                <div className="relative">
                  <button onClick={() => setShowInvitePick(v => !v)}
                    disabled={!emailRevealed && !phoneRevealed}
                    title={emailRevealed || phoneRevealed ? "Invite candidate" : "Reveal email or phone first"}
                    className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                      emailRevealed || phoneRevealed ? "bg-violet-400/30 hover:bg-violet-400/40 text-white border-violet-300/40" : "bg-white/10 text-white/30 border-white/10 cursor-not-allowed")}>
                    <Send size={9} /> Invite
                  </button>
                  {showInvitePick && (
                    <PanelInvitePicker
                      emails={allEmails}
                      phones={allPhones}
                      onConfirm={(email, phone) => { setShowInvitePick(false); onInvite(String(profile.id), email, phone); }}
                      onClose={() => setShowInvitePick(false)}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap text-[9px] text-white/60">
            {(profile.location ?? profile.city) && <span className="flex items-center gap-1"><MapPin size={9} />{profile.location ?? profile.city}</span>}
            {profile.connections && <span>🔗 {profile.connections.toLocaleString()} connections</span>}
            {profile.current_employer_industry && <span className="flex items-center gap-1"><Building2 size={9} />{profile.current_employer_industry}</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-slate-100">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex-1 py-2.5 text-[11px] font-semibold transition-colors",
                tab === t.key ? "text-violet-600 border-b-2 border-violet-500 bg-violet-50/40" : "text-slate-400 hover:text-slate-600")}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5">

            {/* OVERVIEW */}
            {tab === "overview" && (
              <>
                {(displayTitle !== "—" || displayCo !== "—") && (
                  <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-3.5">
                    <SectionHead>Current Position</SectionHead>
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg border border-violet-200 bg-white flex items-center justify-center text-[11px] font-bold text-violet-600 flex-shrink-0 shadow-sm">{(displayCo[0] ?? "?").toUpperCase()}</div>
                      <div>
                        <p className="text-[12px] font-bold text-slate-800">{displayTitle}</p>
                        <p className="text-[11px] text-violet-600 font-semibold">{displayCo}</p>
                        {profile.current_employer_domain && (
                          <a href={`https://${profile.current_employer_domain}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[9px] text-slate-400 hover:text-violet-600 hover:underline flex items-center gap-1 mt-0.5">
                            <Globe size={8} />{profile.current_employer_domain}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <RevealBtn type="email" loading={revealingEmail} done={emailRevealed} onClick={() => doReveal("email")} />
                    {revealErrors.email && <p className="text-[9px] text-red-500">{revealErrors.email}</p>}
                  </div>
                  <div className="space-y-1">
                    <RevealBtn type="phone" loading={revealingPhone} done={phoneRevealed} onClick={() => doReveal("phone")} />
                    {revealErrors.phone && <p className="text-[9px] text-red-500">{revealErrors.phone}</p>}
                  </div>
                </div>

                {skills.length > 0 && (<><Divider /><div><SectionHead>Top Skills ({skills.length})</SectionHead><div className="flex flex-wrap gap-1.5">{skills.slice(0,10).map((s,i) => <span key={i} className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 ring-1 ring-violet-200 text-[9px] font-semibold">{s}</span>)}{skills.length > 10 && <button type="button" onClick={() => setTab("career")} className="px-2 py-0.5 text-[9px] text-violet-500 hover:underline">+{skills.length-10} more →</button>}</div></div></>)}
                {jobHistory.length > 0 && (<><Divider /><div><SectionHead>Recent Experience</SectionHead><CareerTimeline jobs={jobHistory.slice(0,2)} />{jobHistory.length > 2 && <button type="button" onClick={() => setTab("career")} className="text-[10px] text-violet-500 hover:underline mt-1">View full career →</button>}</div></>)}
                {profile.linkedin_url && (<><Divider /><a href={profile.linkedin_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-[11px] text-blue-600 hover:text-blue-700 font-semibold transition-colors"><Linkedin size={12} /> View LinkedIn Profile ↗</a></>)}
              </>
            )}

            {/* CONTACT */}
            {tab === "contact" && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <SectionHead>Email</SectionHead>
                    {!emailRevealed && !revealingEmail && (
                      <button type="button" onClick={() => doReveal("email")} className="text-[10px] font-bold text-violet-600 hover:text-violet-700 bg-violet-50 border border-violet-200 rounded px-2 py-0.5">Reveal →</button>
                    )}
                    {revealingEmail && <Loader2 size={10} className="animate-spin text-violet-500" />}
                  </div>
                  <EmailSection emails={allEmails} teaserEmails={teaserEmails} loading={revealingEmail} />
                  {revealErrors.email && <p className="mt-1 text-[9px] text-red-500">{revealErrors.email}</p>}
                </div>

                <Divider />

                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <SectionHead>Phone</SectionHead>
                    {!phoneRevealed && !revealingPhone && (
                      <button type="button" onClick={() => doReveal("phone")} className="text-[10px] font-bold text-slate-600 hover:text-violet-600 border border-slate-200 hover:border-violet-300 rounded px-2 py-0.5">Find →</button>
                    )}
                    {revealingPhone && <Loader2 size={10} className="animate-spin text-slate-400" />}
                  </div>
                  <PhoneSection phones={allPhones} teaserPhones={teaserPhones} loading={revealingPhone} />
                  {revealErrors.phone && <p className="mt-1 text-[9px] text-red-500">{revealErrors.phone}</p>}
                </div>

                {(emailRevealed || phoneRevealed) && (<><Divider /><p className="text-[9px] text-slate-400">✓ Contact saved to CRM</p></>)}
              </>
            )}

{/* CAREER */}
{tab === "career" && (
  <>
    {skills.length > 0 && (
      <div>
        <SectionHead>Skills ({skills.length})</SectionHead>
        <SkillsSection skills={skills} />
      </div>
    )}

    {jobHistory.length > 0 && (
      <>
        {skills.length > 0 && <Divider />}
        <div>
          <SectionHead>Career History ({jobHistory.length} roles)</SectionHead>
          <CareerTimeline jobs={jobHistory} />
        </div>
      </>
    )}

    {education.length > 0 && (
      <>
        <Divider />
        <div>
          <SectionHead>Education</SectionHead>
          <EducationSection education={education} />
        </div>
      </>
    )}

    {profile.current_employer && (
      <>
        <Divider />
        <div>
          <SectionHead>Current Company</SectionHead>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-[12px] font-bold text-slate-600 flex-shrink-0 shadow-sm">
              {profile.current_employer[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-slate-800">{profile.current_employer}</p>
              {profile.current_employer_industry && (
                <p className="text-[10px] text-slate-500 capitalize">{profile.current_employer_industry}</p>
              )}
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {profile.current_employer_website && (
                  <a 
                    href={profile.current_employer_website} 
                    target="_blank" 
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()} 
                    className="flex items-center gap-1 text-[9px] text-violet-600 hover:underline"
                  >
                    <Globe size={8} /> Website
                  </a>
                )}
                {profile.current_employer_linkedin_url && (
                  <a 
                    href={profile.current_employer_linkedin_url} 
                    target="_blank" 
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()} 
                    className="flex items-center gap-1 text-[9px] text-blue-600 hover:underline"
                  >
                    <Linkedin size={8} /> LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    )}

    {!skills.length && !jobHistory.length && !education.length && (
      <div className="py-8 text-center">
        <Award size={28} className="text-slate-200 mx-auto mb-2" />
        <p className="text-[12px] text-slate-400 mb-2">Reveal profile to see career data</p>
        <button 
          type="button" 
          onClick={() => { setTab("contact"); doReveal("email"); }} 
          className="text-[11px] text-violet-600 hover:underline"
        >
          Reveal →
        </button>
      </div>
    )}
  </>
)}

            {/* RAW */}
            {tab === "raw" && (
              <pre className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[9px] text-slate-500 overflow-auto font-mono leading-relaxed whitespace-pre-wrap break-words max-h-[500px]">
                {JSON.stringify(profile, null, 2)}
              </pre>
            )}
          </div>
        </ScrollArea>
      </aside>
      <style>{`@keyframes rrPanelIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
  return createPortal(panel, document.body);
};

export default RRDetailPanel;