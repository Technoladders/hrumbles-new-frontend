// Hrumbles-Front-End_UI/src/components/rocketreach/PeopleSearchUI.tsx
// ContactOut-style layout matching the reference design:
//   - Left sidebar: filters
//   - Right: top bar (tabs, count, actions) + result rows
//   - Each row: checkbox, avatar, name+social icons, location+connections,
//               job history (expandable), education, skills (expandable)
//               RIGHT SIDE: email list with grade badges, view/find buttons

import { useState, useCallback, useRef, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RRDetailPanel } from "./RRDetailPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RRProfile {
  id: number;
  name: string | null;
  status: "complete" | "progress" | "searching" | "not queued";
  profile_pic?: string;
  linkedin_url?: string | null;
  current_title?: string | null;
  current_employer?: string | null;
  current_employer_domain?: string | null;
  current_employer_website?: string | null;
  current_employer_linkedin_url?: string | null;
  location?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string;
  country_code?: string | null;
  connections?: number;
  skills?: string[] | null;
  birth_year?: number;
  update_time?: string;
  links?: Record<string, string>;
  suppressed?: string;
  current_employer_id?: number;
  npi_data?: Record<string, string>;
  teaser?: {
    emails?: string[];
    personal_emails?: string[];
    professional_emails?: string[];
    phones?: { number: string; is_premium: boolean }[];
    office_phones?: string[];
    is_premium_phone_available?: boolean;
  } | null;
  // Enriched after lookup:
  _enriched?: boolean;
  _allEmails?: { email: string; type: string; grade: string | null; smtp_valid: string | null; is_primary: boolean }[];
  _allPhones?: { number: string; type: string; validity: string; recommended: boolean; premium: boolean }[];
  _jobHistory?: any[];
  _education?: any[];
  _skills?: string[];
}

type SkillMode = "must" | "nice" | "exclude";
interface SkillChip { label: string; mode: SkillMode; }

type FilterForm = Partial<{
  name: string;
  current_title: string;
  current_employer: string;
  location: string;
  keyword: string;
  company_industry: string;
  company_size: string;
  management_levels: string;
  department: string;
  school: string;
  degree: string;
}>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function csv(v: string): string[] {
  return v.split(",").map(s => s.trim()).filter(Boolean);
}

function buildQuery(f: FilterForm, chips: SkillChip[]): Record<string, unknown> {
  const q: Record<string, unknown> = {};
  const arrKeys = [
    "name", "current_title", "current_employer", "location",
    "company_industry", "company_size", "management_levels",
    "department", "school", "degree",
  ] as const;
  for (const k of arrKeys) {
    const v = f[k];
    if (v?.trim()) q[k] = csv(v);
  }
  if (f.keyword?.trim()) q.keyword = f.keyword.trim();
  const mustChips    = chips.filter(c => c.mode === "must").map(c => c.label);
  const niceChips    = chips.filter(c => c.mode === "nice").map(c => c.label);
  const excludeChips = chips.filter(c => c.mode === "exclude").map(c => `-${c.label}`);
  if (mustChips.length) q.all_skills = mustChips;
  const skillArr = [...niceChips, ...excludeChips];
  if (skillArr.length) q.skills = skillArr;
  return q;
}

function parseBooleanSkills(input: string): { must: string[]; nice: string[]; exclude: string[] } {
  if (!input.trim()) return { must: [], nice: [], exclude: [] };
  const raw   = input.replace(/\bAND\b/gi, " ").replace(/\bOR\b/gi, " ");
  const parts = raw.split(/\s+/).filter(Boolean);
  const mustFixed: string[] = []; const niceFixed: string[] = []; const excludeFixed: string[] = [];
  let skipNext = false;
  for (let i = 0; i < parts.length; i++) {
    if (skipNext) { skipNext = false; continue; }
    const cur = parts[i]; const next = parts[i + 1];
    if (/^NOT$/i.test(cur) && next) { excludeFixed.push(next.replace(/^-/, "")); skipNext = true; }
    else if (cur.startsWith("-") && cur.length > 1) excludeFixed.push(cur.slice(1));
    else if (/^MUST:/i.test(cur)) mustFixed.push(cur.slice(5));
    else if (!/^(AND|OR|NOT)$/i.test(cur)) niceFixed.push(cur);
  }
  return { must: mustFixed, nice: niceFixed, exclude: excludeFixed };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 30 }: { src?: string; name?: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  const initials = name ? name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() : "?";
  const cls = `rounded-full flex-shrink-0 ring-1 ring-slate-200 object-cover`;
  if (src && !err)
    return <img src={src} alt={name ?? ""} onError={() => setErr(true)}
      className={cls} style={{ width: size, height: size }} />;
  return (
    <div className={`${cls} bg-violet-100 flex items-center justify-center font-medium text-violet-700`}
      style={{ width: size, height: size, fontSize: size * 0.33 }}>
      {initials}
    </div>
  );
}

// ─── Grade badge ──────────────────────────────────────────────────────────────

function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return null;
  const cls = grade === "A" || grade === "A-"
    ? "bg-emerald-50 text-emerald-700"
    : grade === "B"
    ? "bg-blue-50 text-blue-700"
    : "bg-red-50 text-red-600";
  return <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${cls} flex-shrink-0`}>{grade}</span>;
}

// ─── Social icons ─────────────────────────────────────────────────────────────

function SocialIcons({ profile }: { profile: RRProfile }) {
  const icons = [
    profile.linkedin_url && { url: profile.linkedin_url, icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    )},
  ].filter(Boolean) as { url: string; icon: React.ReactNode }[];

  return (
    <div className="flex items-center gap-1">
      {icons.map((ic, i) => (
        <a key={i} href={ic.url} target="_blank" rel="noreferrer"
          className="text-slate-400 hover:text-violet-600 transition-colors">
          {ic.icon}
        </a>
      ))}
    </div>
  );
}

// ─── Skill Builder ────────────────────────────────────────────────────────────

const MODE_CONFIG: Record<SkillMode, { chipCls: string; dotCls: string }> = {
  must:    { chipCls: "bg-violet-100 text-violet-700 border-violet-200", dotCls: "bg-violet-500" },
  nice:    { chipCls: "bg-blue-50 text-blue-700 border-blue-200",        dotCls: "bg-blue-400"   },
  exclude: { chipCls: "bg-red-50 text-red-600 border-red-200",           dotCls: "bg-red-400"    },
};

function SkillBuilder({ chips, onChange }: { chips: SkillChip[]; onChange: (c: SkillChip[]) => void }) {
  const [input, setInput] = useState("");
  const [mode, setMode]   = useState<SkillMode>("must");
  const [showBool, setShowBool] = useState(false);
  const [boolInput, setBoolInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addChip = (raw: string, m: SkillMode) => {
    const labels   = raw.split(",").map(s => s.trim()).filter(Boolean);
    const existing = new Set(chips.map(c => c.label.toLowerCase()));
    const next     = labels.filter(l => !existing.has(l.toLowerCase())).map(l => ({ label: l, mode: m }));
    if (next.length) onChange([...chips, ...next]);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault(); addChip(input, mode); setInput("");
    }
    if (e.key === "Backspace" && !input && chips.length) onChange(chips.slice(0, -1));
  };

  const applyBoolean = () => {
    if (!boolInput.trim()) return;
    const { must, nice, exclude } = parseBooleanSkills(boolInput);
    const existing = new Set(chips.map(c => c.label.toLowerCase()));
    onChange([...chips,
      ...must.filter(l => !existing.has(l.toLowerCase())).map(l => ({ label: l, mode: "must" as SkillMode })),
      ...nice.filter(l => !existing.has(l.toLowerCase())).map(l => ({ label: l, mode: "nice" as SkillMode })),
      ...exclude.filter(l => !existing.has(l.toLowerCase())).map(l => ({ label: l, mode: "exclude" as SkillMode })),
    ]);
    setBoolInput(""); setShowBool(false);
  };

  return (
    <div className="space-y-1.5">
      {/* Mode tabs */}
      <div className="flex gap-1 items-center">
        {(["must","nice","exclude"] as SkillMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all ${
              mode === m ? MODE_CONFIG[m].chipCls + " border-current" : "text-slate-400 border-slate-200 bg-white hover:border-slate-300"
            }`}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
        <button onClick={() => setShowBool(v => !v)}
          className={`ml-auto text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
            showBool ? "bg-slate-700 text-white border-slate-700" : "text-slate-400 border-slate-200 bg-white"
          }`}>
          AND/NOT
        </button>
      </div>

      {showBool && (
        <div className="rounded border border-slate-200 bg-slate-50 p-2 space-y-1.5">
          <p className="text-[9px] text-slate-400">e.g. <span className="text-violet-500">Python AND React NOT PHP</span> · <span className="text-violet-500">MUST:Python</span></p>
          <div className="flex gap-1">
            <input type="text" value={boolInput} onChange={e => setBoolInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applyBoolean()} placeholder="Python AND React NOT PHP"
              className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 placeholder-slate-300 focus:outline-none focus:border-violet-400" />
            <button onClick={applyBoolean} className="px-2 py-1 rounded bg-violet-600 text-white text-[10px] font-semibold">OK</button>
          </div>
        </div>
      )}

      {/* Chip box */}
      <div onClick={() => inputRef.current?.focus()}
        className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 flex flex-wrap gap-1 min-h-[32px] cursor-text focus-within:border-violet-400 focus-within:bg-white transition-colors">
        {chips.map((chip, i) => {
          const cfg = MODE_CONFIG[chip.mode];
          return (
            <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${cfg.chipCls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCls}`} />
              {chip.label}
              <button onClick={e => { e.stopPropagation(); onChange(chips.filter((_, j) => j !== i)); }}
                className="ml-0.5 text-current opacity-60 hover:opacity-100">×</button>
            </span>
          );
        })}
        <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey} placeholder={chips.length === 0 ? "Type skill, Enter…" : ""}
          className="flex-1 min-w-[60px] bg-transparent text-[11px] text-slate-700 placeholder-slate-300 focus:outline-none" />
      </div>
    </div>
  );
}

// ─── Result Row ───────────────────────────────────────────────────────────────

const MAX_JOBS = 2;
const MAX_SKILLS = 6;

function ResultRow({ profile, onReveal, onSelect, selected }: {
  profile:   RRProfile;
  onReveal:  (p: RRProfile) => void;
  onSelect:  (p: RRProfile) => void;
  selected:  boolean;
}) {
  const [expanded,    setExpanded]    = useState(false);
  const [skillsOpen,  setSkillsOpen]  = useState(false);
  const [copying,     setCopying]     = useState<string | null>(null);

  const enriched  = !!profile._enriched;
  const jobHist   = profile._jobHistory ?? [];
  const skills    = (profile._skills ?? profile.skills ?? []) as string[];
  const allEmails = profile._allEmails ?? [];
  const allPhones = profile._allPhones ?? [];

  // Build display jobs from jobHistory (enriched) or just show title/company from search result
  const displayJobs: { title: string; co: string; coUrl?: string; range: string; current: boolean }[] =
    enriched && jobHist.length > 0
      ? jobHist.map(j => ({
          title:   j.title   ?? "",
          co:      j.company_name ?? j.company ?? "",
          coUrl:   j.company_linkedin_url ? `https://linkedin.com/company/${j.company_linkedin_url.split("/company/")[1]}` : undefined,
          range:   [j.start_date?.slice(0, 7), j.is_current ? "Present" : j.end_date?.slice(0, 7)].filter(Boolean).join(" – "),
          current: j.is_current ?? false,
        }))
      : profile.current_title
      ? [{ title: profile.current_title, co: profile.current_employer ?? "", coUrl: profile.current_employer_website, range: "Present", current: true }]
      : [];

  const visibleJobs   = expanded ? displayJobs : displayJobs.slice(0, MAX_JOBS);
  const visibleSkills = skillsOpen ? skills : skills.slice(0, MAX_SKILLS);
  const hasMoreJobs   = displayJobs.length > MAX_JOBS;
  const hasMoreSkills = skills.length > MAX_SKILLS;

  // Teaser emails (from search, before reveal)
  const teaserEmails = [
    ...(profile.teaser?.professional_emails ?? []),
    ...(profile.teaser?.emails ?? []),
    ...(profile.teaser?.personal_emails ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 2);

  const teaserPhones = profile.teaser?.phones?.slice(0, 1) ?? [];

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopying(email);
    setTimeout(() => setCopying(null), 1500);
  };

  return (
    <div className={`border-b border-slate-100 px-4 py-3 hover:bg-slate-50/60 transition-colors ${selected ? "bg-violet-50/40 border-l-2 border-l-violet-500" : ""}`}>
      <div className="flex items-start gap-2.5">
        {/* Checkbox */}
        <input type="checkbox" className="mt-1 flex-shrink-0 accent-violet-600 cursor-pointer" style={{ width: 13, height: 13 }} />

        {/* Avatar */}
        <Avatar src={profile.profile_pic} name={profile.name} size={32} />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => onSelect(profile)}
              className="text-[12px] font-medium text-slate-800 hover:text-violet-700 transition-colors leading-tight">
              {profile.name ?? "—"}
            </button>
            <SocialIcons profile={profile} />
            {enriched && (
              <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 font-semibold">Enriched</span>
            )}
          </div>

          {/* Location + connections */}
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {profile.location ?? profile.city ?? "—"}
            {profile.connections != null && (
              <span className="ml-1.5 text-slate-400">· {profile.connections.toLocaleString()} connections</span>
            )}
          </div>

          {/* Jobs */}
          {visibleJobs.map((j, i) => (
            <div key={i} className="text-[11px] text-slate-600 mt-1.5 flex items-baseline gap-1 flex-wrap">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              <span className="text-slate-700">{j.title}</span>
              <span className="text-slate-500">at</span>
              {j.coUrl
                ? <a href={j.coUrl} target="_blank" rel="noreferrer" className="text-violet-600 font-medium hover:underline">{j.co}</a>
                : <span className="text-violet-600 font-medium">{j.co}</span>
              }
              {j.range && <span className="text-slate-400 text-[10px]">{j.range}</span>}
            </div>
          ))}

          {/* Education — enriched only */}
          {enriched && (profile._education ?? []).map((e: any, i: number) => (
            <div key={i} className="text-[10px] text-slate-500 mt-1 flex items-baseline gap-1">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
              <span>{[e.degree, e.major].filter(Boolean).join(" · ")}{e.school ? ` · ${e.school}` : ""}</span>
              {(e.start || e.end) && <span className="text-slate-400">· {e.start}–{e.end}</span>}
            </div>
          ))}

          {/* Skills */}
          {visibleSkills.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {visibleSkills.map((s, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Expand / collapse */}
          {(hasMoreJobs || hasMoreSkills) && (
            <button
              onClick={() => {
                if (!expanded && hasMoreJobs) setExpanded(true);
                else if (expanded) { setExpanded(false); setSkillsOpen(false); }
                else if (!skillsOpen && hasMoreSkills) setSkillsOpen(true);
                else setSkillsOpen(false);
              }}
              className="mt-1.5 text-[10px] text-violet-600 hover:underline flex items-center gap-0.5"
            >
              {expanded || skillsOpen
                ? <><span>Show less</span><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg></>
                : <><span>...more</span><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></>
              }
            </button>
          )}
        </div>

        {/* Right: contact actions */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5 min-w-[168px]">
          {/* Emails */}
          {enriched ? (
            <div className="space-y-0.5 w-full">
              {allEmails.slice(0, 2).map((e, i) => (
                <div key={i} className="flex items-center gap-1 justify-end">
                  <span className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${e.smtp_valid === "valid" ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className="text-[10px] text-slate-600 font-mono truncate max-w-[120px]">{e.email}</span>
                  <GradeBadge grade={e.grade} />
                  <button onClick={() => copyEmail(e.email)} className="text-slate-400 hover:text-violet-600 transition-colors flex-shrink-0">
                    {copying === e.email
                      ? <span className="text-[9px] text-emerald-500 font-bold">✓</span>
                      : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    }
                  </button>
                </div>
              ))}
              {allEmails.length > 2 && (
                <p className="text-[9px] text-slate-400 text-right">+{allEmails.length - 2} more</p>
              )}
            </div>
          ) : (
            <div className="space-y-0.5 w-full">
              {teaserEmails.slice(0, 2).map((e, i) => (
                <div key={i} className="flex items-center gap-1 justify-end">
                  <span className="w-[5px] h-[5px] rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-[10px] text-slate-500 font-mono">***@{e}</span>
                </div>
              ))}
            </div>
          )}

          {/* View / Copy email button */}
          <button
            onClick={() => enriched ? onSelect(profile) : onReveal(profile)}
            className="text-[10px] text-violet-600 border border-violet-500 rounded px-2 py-0.5 hover:bg-violet-50 transition-colors whitespace-nowrap"
          >
            {enriched ? "Copy email" : "View email"}
          </button>

          {/* Phones */}
          {enriched ? (
            <div className="space-y-0.5 w-full">
              {allPhones.slice(0, 1).map((p, i) => (
                <div key={i} className="flex items-center gap-1 justify-end text-[10px] text-slate-600">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1 19.79 19.79 0 0 1 1.62 4.44 2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span className="font-mono">{p.number}</span>
                </div>
              ))}
              {allPhones.length === 0 && (
                <div className="text-[10px] text-slate-300 text-right">—</div>
              )}
            </div>
          ) : (
            <div className="space-y-0.5 w-full">
              {teaserPhones.slice(0, 1).map((p, i) => (
                <div key={i} className="flex items-center gap-1 justify-end text-[10px] text-slate-500 font-mono">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1 19.79 19.79 0 0 1 1.62 4.44 2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  {p.number}
                </div>
              ))}
              {teaserPhones.length === 0 && <div className="text-[10px] text-slate-300 text-right">—</div>}
            </div>
          )}

          {/* Find phone button */}
          <button
            onClick={() => onReveal(profile)}
            className="text-[10px] text-slate-500 border border-slate-300 rounded px-2 py-0.5 hover:border-slate-400 transition-colors whitespace-nowrap"
          >
            {enriched ? "All contacts" : "Find phone"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter sidebar ───────────────────────────────────────────────────────────

const FIELDS: { key: keyof FilterForm; label: string; placeholder: string }[] = [
  { key: "name",             label: "Name",     placeholder: "e.g. John Smith" },
  { key: "current_title",    label: "Job title",placeholder: "e.g. VP Sales, CTO" },
  { key: "current_employer", label: "Company",  placeholder: "e.g. Salesforce" },
  { key: "location",         label: "Location", placeholder: "e.g. Sydney, Australia" },
];

const ADV_FIELDS: { key: keyof FilterForm; label: string; placeholder: string }[] = [
  { key: "keyword",           label: "Keyword",    placeholder: "e.g. fintech" },
  { key: "company_industry",  label: "Industry",   placeholder: "Software Engineering" },
  { key: "company_size",      label: "Co. Size",   placeholder: "51-200" },
  { key: "management_levels", label: "Mgmt Level", placeholder: "Director" },
  { key: "department",        label: "Department", placeholder: "Product Management" },
  { key: "school",            label: "School",     placeholder: "Stanford University" },
  { key: "degree",            label: "Degree",     placeholder: "Bachelors" },
];

function FilterSidebar({ form, onChange, chips, onChipsChange, onSearch, onReset, loading, showAdv, onToggleAdv }: {
  form: FilterForm; onChange: (k: keyof FilterForm, v: string) => void;
  chips: SkillChip[]; onChipsChange: (c: SkillChip[]) => void;
  onSearch: () => void; onReset: () => void; loading: boolean;
  showAdv: boolean; onToggleAdv: () => void;
}) {
  return (
    <aside className="w-[200px] flex-shrink-0 border-r border-slate-200 flex flex-col bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-2 space-y-2.5">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-[9px] uppercase tracking-[0.08em] text-slate-500 font-medium mb-1">{label}</label>
            <input type="text" value={form[key] ?? ""} onChange={e => onChange(key, e.target.value)}
              placeholder={placeholder} onKeyDown={e => e.key === "Enter" && onSearch()}
              className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-[11px] bg-slate-50 text-slate-700 placeholder-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors" />
          </div>
        ))}

        {/* Skills */}
        <div>
          <label className="block text-[9px] uppercase tracking-[0.08em] text-slate-500 font-medium mb-1">Skills</label>
          <SkillBuilder chips={chips} onChange={onChipsChange} />
        </div>

        {/* Advanced toggle */}
        <button onClick={onToggleAdv}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-violet-600 transition-colors pt-1">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform ${showAdv ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          {showAdv ? "Fewer filters" : "More filters"}
        </button>

        {showAdv && ADV_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-[9px] uppercase tracking-[0.08em] text-slate-500 font-medium mb-1">{label}</label>
            <input type="text" value={form[key] ?? ""} onChange={e => onChange(key, e.target.value)}
              placeholder={placeholder} onKeyDown={e => e.key === "Enter" && onSearch()}
              className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-[11px] bg-slate-50 text-slate-700 placeholder-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors" />
          </div>
        ))}
      </div>

      {/* Search button */}
      <div className="px-3 pb-3 pt-1 border-t border-slate-100">
        <button onClick={onSearch} disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2">
          {loading ? (
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          )}
          {loading ? "Searching…" : "Search"}
        </button>
      </div>
    </aside>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function PeopleSearchUI() {
  const [form,     setForm]     = useState<FilterForm>({});
  const [chips,    setChips]    = useState<SkillChip[]>([]);
  const [orderBy,  setOrderBy]  = useState("popularity");
  const [pageSize, setPageSize] = useState(10);
  const [startIdx, setStartIdx] = useState(1);
  const [results,  setResults]  = useState<RRProfile[]>([]);
  const [total,    setTotal]    = useState<number | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [selected, setSelected] = useState<RRProfile | null>(null);
  const [showAdv,  setShowAdv]  = useState(false);

  const totalPages  = total ? Math.ceil(total / pageSize) : 0;
  const currentPage = Math.ceil(startIdx / pageSize) || 1;

  const doSearch = useCallback(async (pageStart = 1) => {
    setLoading(true); setError(null); setStartIdx(pageStart);
    const query = buildQuery(form, chips);
    const { data, error: fnError } = await supabase.functions.invoke(
      "rocketreach-search",
      { body: { query, order_by: orderBy, page_size: pageSize, start: pageStart } }
    );
    if (fnError) {
      let msg = fnError.message ?? "Edge function error.";
      try {
        const ctx = (fnError as any).context;
        if (ctx) {
          const body = await ctx.json().catch(() => ({}));
          msg = body?.error ?? msg;
          if (ctx.status === 401) msg = "Invalid RocketReach API key.";
          if (ctx.status === 429) msg = "Rate limit hit — slow down.";
        }
      } catch { /* ignore */ }
      setError(msg); setLoading(false); return;
    }
    const profiles: RRProfile[] = Array.isArray(data) ? data : data?.profiles ?? [];
    setResults(profiles);
    setTotal(data?.pagination?.total ?? profiles.length);
    setLoading(false);
  }, [form, chips, orderBy, pageSize]);

  const reset = () => {
    setForm({}); setChips([]); setResults([]); setTotal(null);
    setError(null); setStartIdx(1); setSelected(null);
  };

  // When reveal completes, merge enriched data back into the row
  const handleRevealComplete = (rrProfileId: number, enrichedData: any) => {
    setResults(prev => prev.map(p => p.id === rrProfileId ? {
      ...p,
      _enriched:    true,
      _allEmails:   enrichedData.allEmails ?? [],
      _allPhones:   enrichedData.allPhones ?? [],
      _jobHistory:  enrichedData.jobHistory ?? [],
      _education:   enrichedData.education  ?? [],
      _skills:      enrichedData.skills     ?? p.skills ?? [],
      name:         enrichedData.name       ?? p.name,
      current_title: enrichedData.title     ?? p.current_title,
      current_employer: enrichedData.company ?? p.current_employer,
      profile_pic:  enrichedData.profilePic ?? p.profile_pic,
      linkedin_url: enrichedData.linkedinUrl ?? p.linkedin_url,
    } : p));
  };

  return (
    <div className="flex h-full overflow-hidden bg-white" style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>
      <FilterSidebar
        form={form} onChange={(k, v) => setForm(f => ({ ...f, [k]: v }))}
        chips={chips} onChipsChange={setChips}
        onSearch={() => doSearch(1)} onReset={reset}
        loading={loading} showAdv={showAdv} onToggleAdv={() => setShowAdv(v => !v)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex-shrink-0 px-4 py-2 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 rounded-full text-[11px] font-medium bg-violet-600 text-white border border-violet-600">
              People
            </button>
            <button className="px-3 py-1 rounded-full text-[11px] text-slate-500 border border-transparent hover:border-slate-200 transition-colors">
              Companies
            </button>
            {(Object.values(form).some(v => v?.trim()) || chips.length > 0) && (
              <button onClick={reset} className="text-[10px] text-slate-400 hover:text-violet-600 transition-colors ml-1">
                Clear all
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {total != null && (
              <span className="text-[11px] text-slate-500">
                {startIdx}–{Math.min(startIdx + results.length - 1, total)} of{" "}
                <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> profiles
              </span>
            )}
            {/* Page nav */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={startIdx <= 1} onClick={() => doSearch(Math.max(1, startIdx - pageSize))}
                  className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[11px]">
                  ‹
                </button>
                <span className="text-[11px] text-slate-500 px-1">{currentPage}</span>
                <button disabled={currentPage >= totalPages} onClick={() => doSearch(startIdx + pageSize)}
                  className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[11px]">
                  ›
                </button>
              </div>
            )}
            {/* Order */}
            <select value={orderBy} onChange={e => setOrderBy(e.target.value)}
              className="text-[11px] border border-slate-200 rounded px-2 py-1 bg-white text-slate-600 focus:outline-none focus:border-violet-400">
              <option value="popularity">Popularity</option>
              <option value="relevance">Relevance</option>
            </select>
            <button className="text-[11px] border border-slate-200 rounded px-2.5 py-1 bg-white text-slate-600 hover:border-slate-300 transition-colors">
              ↑ Export
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              <p className="font-semibold">Search failed</p>
              <p className="text-xs text-red-500 mt-0.5">{error}</p>
            </div>
          )}

          {loading && (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-slate-100 animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
              ))}
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 py-16">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-3">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <p className="text-slate-400 text-sm">Set filters and search</p>
            </div>
          )}

          {!loading && results.map(p => (
            <ResultRow
              key={p.id}
              profile={p}
              onReveal={(profile) => setSelected(profile)}
              onSelect={(profile) => setSelected(profile)}
              selected={selected?.id === p.id}
            />
          ))}
        </div>
      </div>

      {/* Detail panel with reveal callback */}
      {selected && (
        <RRDetailPanel
          profile={selected}
          onClose={() => setSelected(null)}
          onRevealComplete={handleRevealComplete}
        />
      )}
    </div>
  );
}