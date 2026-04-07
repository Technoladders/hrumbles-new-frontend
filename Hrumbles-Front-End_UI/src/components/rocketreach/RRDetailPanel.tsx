/**
 * RRDetailPanel.tsx — v2
 *
 * Full professional detail panel.
 * Separate "Reveal Email" and "Reveal Phone" buttons.
 * Show less / Show more for: skills, job history, education.
 * Career timeline + company details matching recruiter tool aesthetics.
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ScrollArea }   from "@/components/ui/scroll-area";
import { cn }           from "@/lib/utils";
import {
  X, Mail, Phone, Linkedin, MapPin, Globe, Building2,
  ChevronDown, ChevronUp, Loader2, Copy, Check,
  Bookmark, BookmarkCheck, Search as SearchIcon,
  Calendar, GraduationCap, Award, Star,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRRUpsertSaved } from "./hooks/useRRUpsertSaved";
import type { FolderItem } from "@/components/CandidateSearch/hooks/useFolders";
import type { RRProfile, RREmailEntry, RRPhoneEntry, RRJobHistoryEntry } from "./types";

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

// ─── Small helpers ────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 44 }: { src?: string; name?: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  const init = (name ?? "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  if (src && !err)
    return <img src={src} alt={name ?? ""} onError={() => setErr(true)}
      style={{ width: size, height: size }} className="rounded-full object-cover ring-2 ring-white/30 flex-shrink-0" />;
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.33 }}
      className="rounded-full bg-white/20 ring-2 ring-white/30 flex items-center justify-center font-bold text-white flex-shrink-0">
      {init}
    </div>
  );
}

function CopyBtn({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className={cn("flex-shrink-0 transition-colors", className)}
    >
      {done ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
    </button>
  );
}

const GRADE_CLS: Record<string, string> = {
  "A":  "bg-emerald-100 text-emerald-700 border-emerald-300",
  "A-": "bg-emerald-50  text-emerald-600 border-emerald-200",
  "B":  "bg-blue-50     text-blue-700    border-blue-200",
  "C":  "bg-amber-50    text-amber-700   border-amber-200",
  "F":  "bg-red-50      text-red-600     border-red-200",
};

function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return null;
  return <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0", GRADE_CLS[grade] ?? "bg-slate-100 text-slate-500 border-slate-200")}>{grade}</span>;
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-2.5">{children}</p>;
}

function Divider() { return <div className="h-px bg-violet-100 my-1" />; }

// ─── Reveal button ─────────────────────────────────────────────────────────────
type RevealType = "email" | "phone" | "full";

interface RevealBtnProps {
  type:      "email" | "phone";
  loading:   boolean;
  done:      boolean;
  onClick:   () => void;
}
const RevealBtn: React.FC<RevealBtnProps> = ({ type, loading, done, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className={cn(
      "flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-[11px] font-bold border transition-all",
      done
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : type === "email"
        ? "bg-violet-600 hover:bg-violet-700 text-white border-transparent shadow-sm"
        : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-violet-400 hover:text-violet-700",
      loading && "opacity-60 cursor-not-allowed"
    )}
  >
    {loading ? <Loader2 size={11} className="animate-spin" /> :
     done    ? <Check size={11} /> :
     type === "email" ? <Mail size={11} /> : <Phone size={11} />
    }
    {loading ? "Looking up…" :
     done    ? (type === "email" ? "Email revealed" : "Phone revealed") :
     type === "email" ? "Reveal Email" : "Find Phone"
    }
  </button>
);

// ─── Email section ─────────────────────────────────────────────────────────────
function EmailSection({ emails, teaserEmails, loading }: {
  emails: RREmailEntry[]; teaserEmails: string[]; loading: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? emails : emails.slice(0, 3);

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

  return (
    <div className="space-y-2">
      {visible.map((e, i) => (
        <div key={i} className="flex items-center gap-1.5 flex-wrap">
          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
            e.smtp_valid === "valid" ? "bg-emerald-500" : "bg-slate-300")} />
          <span className="font-mono text-[11px] text-slate-700 truncate max-w-[180px]">{e.email}</span>
          <CopyBtn text={e.email} className="text-slate-300 hover:text-violet-500" />
          <GradeBadge grade={e.grade} />
          {e.type && e.type !== "unknown" && <span className="text-[9px] text-slate-400 capitalize">{e.type}</span>}
          {e.is_primary && <span className="text-[8px] text-violet-500 font-bold bg-violet-50 px-1 rounded">Primary</span>}
        </div>
      ))}
      {emails.length > 3 && (
        <button type="button" onClick={() => setShowAll(v => !v)}
          className="flex items-center gap-1 text-[10px] text-violet-500 hover:text-violet-700 font-medium mt-1">
          {showAll ? <><ChevronUp size={10} /> Show less</> : <><ChevronDown size={10} /> +{emails.length-3} more emails</>}
        </button>
      )}
    </div>
  );
}

// ─── Phone section ─────────────────────────────────────────────────────────────
function PhoneSection({ phones, teaserPhones, loading }: {
  phones: RRPhoneEntry[]; teaserPhones: { number: string; is_premium: boolean }[]; loading: boolean;
}) {
  if (loading) return <div className="h-6 rounded bg-slate-100 animate-pulse" />;

  if (!phones.length && teaserPhones.length) {
    return (
      <div className="space-y-1">
        {teaserPhones.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Phone size={9} className="text-slate-300 flex-shrink-0" />
            {p.number}
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
          {p.type && p.type !== "unknown" && <span className="text-[9px] text-slate-400 capitalize">{p.type}</span>}
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
              <div className={cn("w-2.5 h-2.5 rounded-full border-2 flex-shrink-0",
                j.is_current ? "bg-violet-500 border-violet-400" : "bg-white border-slate-300")} />
              {i < visible.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1.5 min-h-[16px]" />}
            </div>
            <div className="pb-4 min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1">
                <p className={cn("text-[11px] font-bold leading-tight",
                  j.is_current ? "text-slate-800" : "text-slate-600")}>
                  {j.title ?? "—"}
                  {j.is_current && <span className="ml-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">Current</span>}
                </p>
                {j.highest_level && (
                  <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-500 capitalize flex-shrink-0">{j.highest_level}</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{j.company_name ?? j.company ?? "—"}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[9px] text-slate-400">
                {(j.start_date || j.end_date) && (
                  <span className="flex items-center gap-0.5">
                    <Calendar size={8} />
                    {j.start_date ? j.start_date.slice(0,7) : "?"} → {j.is_current ? "Present" : (j.end_date?.slice(0,7) ?? "?")}
                  </span>
                )}
                {j.department && <span>· {j.department}{j.sub_department ? ` / ${j.sub_department}` : ""}</span>}
                {(j.company_city || j.company_region) && (
                  <span className="flex items-center gap-0.5">
                    <MapPin size={8} />
                    {[j.company_city, j.company_region, j.company_country_code].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
              {j.description && (
                <p className="text-[9px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{j.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {jobs.length > 3 && (
        <button type="button" onClick={() => setShowAll(v => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold text-violet-500 hover:text-violet-700 mt-1 transition-colors">
          {showAll ? <><ChevronUp size={10}/> Show less</> : <><ChevronDown size={10}/> +{jobs.length-3} more roles</>}
        </button>
      )}
    </>
  );
}

// ─── Skills section ─────────────────────────────────────────────────────────────
function SkillsSection({ skills }: { skills: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const MAX = 12;
  const visible = showAll ? skills : skills.slice(0, MAX);
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((s, i) => (
          <span key={i} className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 ring-1 ring-violet-200 text-[9px] font-semibold">
            {s}
          </span>
        ))}
      </div>
      {skills.length > MAX && (
        <button type="button" onClick={() => setShowAll(v => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold text-violet-500 hover:text-violet-700 mt-1.5 transition-colors">
          {showAll ? <><ChevronUp size={10}/> Show less</> : <><ChevronDown size={10}/> +{skills.length-MAX} more skills</>}
        </button>
      )}
    </>
  );
}

// ─── Education section ──────────────────────────────────────────────────────────
function EducationSection({ education }: { education: any[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? education : education.slice(0, 2);
  return (
    <>
      <div className="space-y-2.5">
        {visible.map((e, i) => (
          <div key={i} className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={12} className="text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-700">{e.school ?? "—"}</p>
              <p className="text-[10px] text-slate-500">{[e.degree, e.major].filter(Boolean).join(" · ")}</p>
              {(e.start || e.end) && <p className="text-[9px] text-slate-400">{e.start} – {e.end}</p>}
            </div>
          </div>
        ))}
      </div>
      {education.length > 2 && (
        <button type="button" onClick={() => setShowAll(v => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold text-violet-500 hover:text-violet-700 mt-1.5 transition-colors">
          {showAll ? <><ChevronUp size={10}/> Show less</> : <><ChevronDown size={10}/> +{education.length-2} more</>}
        </button>
      )}
    </>
  );
}

// ─── Main panel ─────────────────────────────────────────────────────────────────

type PanelTab = "overview" | "contact" | "career" | "raw";

interface RRDetailPanelProps {
  profile:           RRProfile;
  onClose:           () => void;
  onRevealComplete?: (id: number, data: any) => void;
  onShortlist?:      (rrProfileId: string, savedId: string | undefined, snapshot: any) => void;
  folders?:          FolderItem[];
  onCreateFolder?:   (name: string) => Promise<string | null>;
}

export const RRDetailPanel: React.FC<RRDetailPanelProps> = ({
  profile, onClose, onRevealComplete, onShortlist,
}) => {
  const [tab, setTab] = useState<PanelTab>("overview");

  // Per-type reveal state
  const [revealingEmail, setRevealingEmail] = useState(false);
  const [revealingPhone, setRevealingPhone] = useState(false);
  const [revealErrors,   setRevealErrors]   = useState<{ email?: string; phone?: string }>({});

  // Local enriched state (starts from profile._enriched props, updated after reveal)
  const [emailRevealed, setEmailRevealed] = useState(!!profile._allEmails?.length);
  const [phoneRevealed, setPhoneRevealed] = useState(!!profile._allPhones?.length);
  const [allEmails,     setAllEmails]     = useState<RREmailEntry[]>(profile._allEmails ?? []);
  const [allPhones,     setAllPhones]     = useState<RRPhoneEntry[]>(profile._allPhones ?? []);
  const [jobHistory,    setJobHistory]    = useState(profile._jobHistory ?? []);
  const [education,     setEducation]     = useState<any[]>(profile._education ?? []);
  const [skills,        setSkills]        = useState<string[]>(
    (profile._skills ?? profile.skills ?? []) as string[]
  );

  // Sync when profile changes (e.g. parent updates enriched data)
  useEffect(() => {
    if (profile._allEmails?.length) { setAllEmails(profile._allEmails); setEmailRevealed(true); }
    if (profile._allPhones?.length) { setAllPhones(profile._allPhones); setPhoneRevealed(true); }
    if (profile._jobHistory?.length)  setJobHistory(profile._jobHistory);
    if (profile._education?.length)   setEducation(profile._education);
    if (profile._skills?.length)      setSkills(profile._skills);
  }, [profile._allEmails, profile._allPhones, profile._jobHistory, profile._education, profile._skills]);

  // ── Save / Shortlist ──────────────────────────────────────────────────────
  const { status: saveStatus, savedId, upsert: doSave } = useRRUpsertSaved();
  const queryClient = useQueryClient();

  const handleShortlist = async () => {
    const auth = await resolveAuth();
    if (!auth) return;
    const id = await doSave({
      rrProfileId:        String(profile.id),
      saveType:           "shortlisted",
      snapshotName:       profile.name,
      snapshotTitle:      profile.current_title,
      snapshotCompany:    profile.current_employer,
      snapshotLocation:   profile.location,
      email:              allEmails[0]?.email ?? null,
      phone:              allPhones[0]?.number ?? null,
      contactId:          profile._contactId ?? null,
      candidateProfileId: profile._candidateProfileId ?? null,
    });
    onShortlist?.(String(profile.id), id ?? undefined, {
      name: profile.name, title: profile.current_title, company: profile.current_employer,
    });
  };

  // ── Reveal ────────────────────────────────────────────────────────────────
  const doReveal = async (revealType: "email" | "phone") => {
    const setter = revealType === "email" ? setRevealingEmail : setRevealingPhone;
    setter(true);
    setRevealErrors(prev => ({ ...prev, [revealType]: undefined }));

    const auth = await resolveAuth();
    if (!auth) { setter(false); setRevealErrors(prev => ({ ...prev, [revealType]: "Auth failed" })); return; }

    const { data, error: fnError } = await supabase.functions.invoke("rocketreach-lookup", {
      body: { rrProfileId: profile.id, organizationId: auth.organizationId, userId: auth.userId, revealType },
    });

    setter(false);

    if (fnError || !data?.success) {
      setRevealErrors(prev => ({ ...prev, [revealType]: data?.error ?? fnError?.message ?? "Reveal failed" }));
      return;
    }

    // Merge results
    if (revealType === "email" && data.allEmails?.length) {
      setAllEmails(data.allEmails);
      setEmailRevealed(true);
    }
    if (revealType === "phone" && data.allPhones?.length) {
      setAllPhones(data.allPhones);
      setPhoneRevealed(true);
    }
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
  const photoUrl     = profile.profile_pic;

  const teaserEmails = [
    ...(profile.teaser?.professional_emails ?? []),
    ...(profile.teaser?.emails ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const teaserPhones = profile.teaser?.phones ?? [];

  const TABS: { key: PanelTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "contact",  label: `Contact${emailRevealed ? " ✓" : ""}` },
    { key: "career",   label: "Career" },
    { key: "raw",      label: "Raw" },
  ];

  const panel = (
    <div className="fixed inset-0 z-50 flex" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="flex-1 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />

      <aside
        className="w-full max-w-[460px] bg-white border-l border-slate-200 flex flex-col shadow-2xl overflow-hidden"
        style={{ animation: "rrPanelIn .2s cubic-bezier(.22,1,.36,1) both" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header gradient ── */}
        <div
          className="flex-shrink-0 px-5 pt-4 pb-3"
          style={{ background: "linear-gradient(135deg,#4c1d95 0%,#7c3aed 60%,#6d28d9 100%)" }}
        >
          <div className="flex items-start gap-3 mb-3">
            <Avatar src={photoUrl} name={displayName} size={44} />

            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-bold text-white leading-tight truncate" style={{ fontFamily: "Syne, sans-serif" }}>
                {displayName}
              </h2>
              <p className="text-[11px] text-white/80 truncate mt-0.5">{displayTitle}</p>
              <p className="text-[10px] text-white/60 truncate">{displayCo}</p>
            </div>

            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <button onClick={onClose}
                className="w-6 h-6 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X size={12} className="text-white/80" />
              </button>
              <button
                onClick={handleShortlist}
                disabled={saveStatus === "saving"}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border",
                  saveStatus === "saved"
                    ? "bg-emerald-400/20 text-emerald-200 border-emerald-400/30"
                    : "bg-white/15 hover:bg-white/25 text-white border-white/20"
                )}
              >
                {saveStatus === "saving" ? <Loader2 size={9} className="animate-spin" /> :
                 saveStatus === "saved"  ? <BookmarkCheck size={9} /> : <Bookmark size={9} />}
                {saveStatus === "saved" ? "Saved" : "Shortlist"}
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-3 flex-wrap text-[9px] text-white/60">
            {(profile.location ?? profile.city) && (
              <span className="flex items-center gap-1"><MapPin size={9} />{profile.location ?? profile.city}</span>
            )}
            {profile.connections && (
              <span>🔗 {profile.connections.toLocaleString()} connections</span>
            )}
            {profile.current_employer_industry && (
              <span className="flex items-center gap-1"><Building2 size={9} />{profile.current_employer_industry}</span>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex-shrink-0 flex border-b border-slate-100">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 py-2.5 text-[11px] font-semibold transition-colors",
                tab === t.key
                  ? "text-violet-600 border-b-2 border-violet-500 bg-violet-50/40"
                  : "text-slate-400 hover:text-slate-600"
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Scrollable content ── */}
        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5">

            {/* ════ OVERVIEW TAB ════ */}
            {tab === "overview" && (
              <>
                {/* Current position card */}
                {(displayTitle !== "—" || displayCo !== "—") && (
                  <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-3.5">
                    <SectionHead>Current Position</SectionHead>
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg border border-violet-200 bg-white flex items-center justify-center text-[11px] font-bold text-violet-600 flex-shrink-0 shadow-sm">
                        {(displayCo[0] ?? "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-slate-800">{displayTitle}</p>
                        <p className="text-[11px] text-violet-600 font-semibold">{displayCo}</p>
                        {profile.current_employer_domain && (
                          <a href={`https://${profile.current_employer_domain}`} target="_blank" rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-[9px] text-slate-400 hover:text-violet-600 hover:underline flex items-center gap-1 mt-0.5">
                            <Globe size={8} />{profile.current_employer_domain}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick reveal buttons */}
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

                {/* Top skills preview */}
                {skills.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <SectionHead>Top Skills ({skills.length})</SectionHead>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.slice(0, 10).map((s, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 ring-1 ring-violet-200 text-[9px] font-semibold">{s}</span>
                        ))}
                        {skills.length > 10 && (
                          <button type="button" onClick={() => setTab("career")}
                            className="px-2 py-0.5 text-[9px] text-violet-500 hover:underline">
                            +{skills.length-10} more →
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Top job history preview */}
                {jobHistory.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <SectionHead>Recent Experience</SectionHead>
                      <CareerTimeline jobs={jobHistory.slice(0, 2)} />
                      {jobHistory.length > 2 && (
                        <button type="button" onClick={() => setTab("career")}
                          className="text-[10px] text-violet-500 hover:underline mt-1">
                          View full career →
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* LinkedIn link */}
                {profile.linkedin_url && (
                  <>
                    <Divider />
                    <a href={profile.linkedin_url} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-2 text-[11px] text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                      <Linkedin size={12} /> View LinkedIn Profile ↗
                    </a>
                  </>
                )}
              </>
            )}

            {/* ════ CONTACT TAB ════ */}
            {tab === "contact" && (
              <>
                {/* Email */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <SectionHead>Email</SectionHead>
                    {!emailRevealed && !revealingEmail && (
                      <button type="button" onClick={() => doReveal("email")}
                        className="text-[10px] font-bold text-violet-600 hover:text-violet-700 bg-violet-50 border border-violet-200 rounded px-2 py-0.5">
                        Reveal →
                      </button>
                    )}
                    {revealingEmail && <Loader2 size={10} className="animate-spin text-violet-500" />}
                  </div>
                  <EmailSection emails={allEmails} teaserEmails={teaserEmails} loading={revealingEmail} />
                  {revealErrors.email && <p className="mt-1 text-[9px] text-red-500">{revealErrors.email}</p>}
                </div>

                <Divider />

                {/* Phone */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <SectionHead>Phone</SectionHead>
                    {!phoneRevealed && !revealingPhone && (
                      <button type="button" onClick={() => doReveal("phone")}
                        className="text-[10px] font-bold text-slate-600 hover:text-violet-600 border border-slate-200 hover:border-violet-300 rounded px-2 py-0.5">
                        Find →
                      </button>
                    )}
                    {revealingPhone && <Loader2 size={10} className="animate-spin text-slate-400" />}
                  </div>
                  <PhoneSection phones={allPhones} teaserPhones={teaserPhones} loading={revealingPhone} />
                  {revealErrors.phone && <p className="mt-1 text-[9px] text-red-500">{revealErrors.phone}</p>}
                </div>

                {/* CRM write status */}
                {(emailRevealed || phoneRevealed) && (
                  <>
                    <Divider />
                    <p className="text-[9px] text-slate-400">
                      ✓ Contact data saved to CRM
                      {profile._contactId && (
                        <span className="ml-2 font-mono text-slate-300">· {profile._contactId.slice(0,8)}…</span>
                      )}
                    </p>
                  </>
                )}
              </>
            )}

            {/* ════ CAREER TAB ════ */}
            {tab === "career" && (
              <>
                {/* Skills */}
                {skills.length > 0 && (
                  <div>
                    <SectionHead>Skills ({skills.length})</SectionHead>
                    <SkillsSection skills={skills} />
                  </div>
                )}

                {/* Career history */}
                {jobHistory.length > 0 && (
                  <>
                    {skills.length > 0 && <Divider />}
                    <div>
                      <SectionHead>Career History ({jobHistory.length} roles)</SectionHead>
                      <CareerTimeline jobs={jobHistory} />
                    </div>
                  </>
                )}

                {/* Education */}
                {education.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <SectionHead>Education</SectionHead>
                      <EducationSection education={education} />
                    </div>
                  </>
                )}

                {/* Company info */}
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
                              <a href={profile.current_employer_website} target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1 text-[9px] text-violet-600 hover:underline">
                                <Globe size={8} /> Website
                              </a>
                            )}
                            {profile.current_employer_linkedin_url && (
                              <a href={profile.current_employer_linkedin_url} target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1 text-[9px] text-blue-600 hover:underline">
                                <Linkedin size={8} /> LinkedIn
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Prompt to reveal if no career data */}
                {!skills.length && !jobHistory.length && !education.length && (
                  <div className="py-8 text-center">
                    <Award size={28} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-[12px] text-slate-400 mb-2">Full career data available after reveal</p>
                    <button type="button" onClick={() => { setTab("contact"); doReveal("email"); }}
                      className="text-[11px] text-violet-600 hover:underline">
                      Reveal profile →
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ════ RAW TAB ════ */}
            {tab === "raw" && (
              <pre className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[9px] text-slate-500 overflow-auto font-mono leading-relaxed whitespace-pre-wrap break-words max-h-[500px]">
                {JSON.stringify(profile, null, 2)}
              </pre>
            )}

          </div>
        </ScrollArea>
      </aside>

      <style>{`
        @keyframes rrPanelIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );

  return createPortal(panel, document.body);
};

export default RRDetailPanel;