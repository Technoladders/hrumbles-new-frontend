// Hrumbles-Front-End_UI/src/components/rocketreach/PeopleSearchUI.tsx
// Updated: Boolean skill filter with chip UI
//   - "Must Have" → all_skills (strict AND filter)
//   - "Nice to Have" → skills (boost relevance)
//   - "Exclude" → skills: ["-X"] (exclusion)
//   - Also supports free-text Boolean: "Python AND React NOT PHP"

import { useState, useCallback, useRef, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

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
}

// Skill chip type
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

// ─── Boolean parser ───────────────────────────────────────────────────────────
// Parses:  "Python AND React NOT PHP OR Node"
//   → must:    [] (AND terms treated as "nice" unless prefixed with MUST:)
//   → nice:    ["Python", "React", "Node"]
//   → exclude: ["PHP"]
// For MUST: prefix use "MUST:Python AND React NOT PHP"

function parseBooleanSkills(input: string): { must: string[]; nice: string[]; exclude: string[] } {
  const must: string[] = [];
  const nice: string[] = [];
  const exclude: string[] = [];

  if (!input.trim()) return { must, nice, exclude };

  // Remove AND/OR — treat remaining as include; NOT/- as exclude
  const tokens = input
    .replace(/\bAND\b/gi, " ")
    .replace(/\bOR\b/gi, " ")
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    if (/^NOT$/i.test(token)) continue; // skip bare NOT keyword
    if (token.startsWith("-") && token.length > 1) {
      exclude.push(token.slice(1));
    } else if (/^NOT:/i.test(token)) {
      exclude.push(token.slice(4));
    } else if (/^MUST:/i.test(token)) {
      must.push(token.slice(5));
    } else {
      // Check if previous token was NOT
      nice.push(token);
    }
  }

  // Re-parse: handle "NOT Python" (two separate tokens)
  const raw = input.replace(/\bAND\b/gi, " ").replace(/\bOR\b/gi, " ");
  const parts = raw.split(/\s+/).filter(Boolean);
  const mustFixed: string[] = [];
  const niceFixed: string[] = [];
  const excludeFixed: string[] = [];
  let skipNext = false;

  for (let i = 0; i < parts.length; i++) {
    if (skipNext) { skipNext = false; continue; }
    const cur = parts[i];
    const next = parts[i + 1];

    if (/^NOT$/i.test(cur) && next) {
      excludeFixed.push(next.replace(/^-/, ""));
      skipNext = true;
    } else if (cur.startsWith("-") && cur.length > 1) {
      excludeFixed.push(cur.slice(1));
    } else if (/^MUST:/i.test(cur)) {
      mustFixed.push(cur.slice(5));
    } else if (!/^(AND|OR|NOT)$/i.test(cur)) {
      niceFixed.push(cur);
    }
  }

  return { must: mustFixed, nice: niceFixed, exclude: excludeFixed };
}

// ─── Query builder ────────────────────────────────────────────────────────────

function csv(v: string): string[] {
  return v.split(",").map(s => s.trim()).filter(Boolean);
}

function buildQuery(
  f: FilterForm,
  chips: SkillChip[],
): Record<string, unknown> {
  const q: Record<string, unknown> = {};

  const arrKeys = [
    "name", "current_title", "current_employer", "location",
    "company_industry", "company_size",
    "management_levels", "department", "school", "degree",
  ] as const;

  for (const k of arrKeys) {
    const v = f[k];
    if (v?.trim()) q[k] = csv(v);
  }
  if (f.keyword?.trim()) q.keyword = f.keyword.trim();

  // ── Skills from chips ──────────────────────────────────────────────────────
  const mustChips    = chips.filter(c => c.mode === "must").map(c => c.label);
  const niceChips    = chips.filter(c => c.mode === "nice").map(c => c.label);
  const excludeChips = chips.filter(c => c.mode === "exclude").map(c => `-${c.label}`);

  if (mustChips.length)    q.all_skills = mustChips;          // strict AND
  const skillArr = [...niceChips, ...excludeChips];
  if (skillArr.length)     q.skills     = skillArr;           // boost / exclude

  return q;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = "md" }: { src?: string; name?: string | null; size?: "sm" | "md" }) {
  const [err, setErr] = useState(false);
  const initials = name ? name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() : "?";
  const cls = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  if (src && !err)
    return <img src={src} alt={name ?? ""} onError={() => setErr(true)} className={`${cls} rounded-full object-cover ring-2 ring-slate-100 flex-shrink-0`} />;
  return (
    <div className={`${cls} rounded-full bg-violet-100 ring-2 ring-violet-100 flex items-center justify-center font-semibold text-violet-600 flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    complete:    "bg-emerald-50 text-emerald-700 ring-emerald-200",
    progress:    "bg-amber-50  text-amber-700  ring-amber-200",
    searching:   "bg-blue-50   text-blue-700   ring-blue-200",
    "not queued":"bg-slate-100 text-slate-500  ring-slate-200",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${map[status] ?? map["not queued"]}`}>{status}</span>;
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="ml-1 text-slate-300 hover:text-violet-500 transition-colors">
      {done ? <span className="text-[9px] text-emerald-500 font-bold">✓</span>
        : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
    </button>
  );
}

// ─── Boolean Skill Builder ────────────────────────────────────────────────────

const MODE_CONFIG: Record<SkillMode, { label: string; chipCls: string; dotCls: string; btnCls: string }> = {
  must:    { label: "Must",    chipCls: "bg-violet-50  text-violet-700  ring-violet-200",  dotCls: "bg-violet-500", btnCls: "hover:bg-violet-100 text-violet-400" },
  nice:    { label: "Nice",    chipCls: "bg-blue-50    text-blue-700    ring-blue-200",    dotCls: "bg-blue-400",   btnCls: "hover:bg-blue-100   text-blue-400"   },
  exclude: { label: "Exclude", chipCls: "bg-red-50     text-red-600     ring-red-200",     dotCls: "bg-red-400",    btnCls: "hover:bg-red-100    text-red-400"    },
};

function SkillBuilder({ chips, onChange }: {
  chips: SkillChip[];
  onChange: (chips: SkillChip[]) => void;
}) {
  const [input,      setInput]      = useState("");
  const [activeMode, setActiveMode] = useState<SkillMode>("must");
  const [showBool,   setShowBool]   = useState(false);
  const [boolInput,  setBoolInput]  = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Add chips from single input
  const addChip = (raw: string, mode: SkillMode) => {
    const labels = raw.split(",").map(s => s.trim()).filter(Boolean);
    const existing = new Set(chips.map(c => c.label.toLowerCase()));
    const next = labels
      .filter(l => !existing.has(l.toLowerCase()))
      .map(l => ({ label: l, mode }));
    if (next.length) onChange([...chips, ...next]);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      addChip(input, activeMode);
      setInput("");
    }
    if (e.key === "Backspace" && !input && chips.length) {
      onChange(chips.slice(0, -1));
    }
  };

  // Toggle chip mode on click
  const cycleMode = (idx: number) => {
    const order: SkillMode[] = ["must", "nice", "exclude"];
    const next = order[(order.indexOf(chips[idx].mode) + 1) % order.length];
    onChange(chips.map((c, i) => i === idx ? { ...c, mode: next } : c));
  };

  const removeChip = (idx: number) => onChange(chips.filter((_, i) => i !== idx));

  // Boolean parse
  const applyBoolean = () => {
    if (!boolInput.trim()) return;
    const { must, nice, exclude } = parseBooleanSkills(boolInput);
    const existing = new Set(chips.map(c => c.label.toLowerCase()));
    const next: SkillChip[] = [
      ...must.filter(l => !existing.has(l.toLowerCase())).map(l => ({ label: l, mode: "must" as SkillMode })),
      ...nice.filter(l => !existing.has(l.toLowerCase())).map(l => ({ label: l, mode: "nice" as SkillMode })),
      ...exclude.filter(l => !existing.has(l.toLowerCase())).map(l => ({ label: l, mode: "exclude" as SkillMode })),
    ];
    onChange([...chips, ...next]);
    setBoolInput("");
    setShowBool(false);
  };

  const mustCount    = chips.filter(c => c.mode === "must").length;
  const niceCount    = chips.filter(c => c.mode === "nice").length;
  const excludeCount = chips.filter(c => c.mode === "exclude").length;

  return (
    <div className="space-y-2">
      {/* Mode selector */}
      <div className="flex items-center gap-1">
        {(["must", "nice", "exclude"] as SkillMode[]).map(m => {
          const cfg = MODE_CONFIG[m];
          const count = m === "must" ? mustCount : m === "nice" ? niceCount : excludeCount;
          return (
            <button
              key={m}
              onClick={() => setActiveMode(m)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ring-1 ${
                activeMode === m ? `${cfg.chipCls} ring-current` : "text-slate-400 ring-slate-200 hover:ring-slate-300 bg-white"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCls}`} />
              {cfg.label}
              {count > 0 && <span className="ml-0.5 opacity-70">({count})</span>}
            </button>
          );
        })}
        {/* Boolean toggle */}
        <button
          onClick={() => setShowBool(v => !v)}
          className={`ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold ring-1 transition-colors ${
            showBool ? "bg-slate-700 text-white ring-slate-700" : "text-slate-400 ring-slate-200 hover:ring-slate-300 bg-white"
          }`}
          title="Boolean search — Python AND React NOT PHP"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h10M4 18h7"/>
          </svg>
          AND/NOT
        </button>
      </div>

      {/* Boolean input */}
      {showBool && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-2">
          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">
            Boolean — e.g. <span className="text-violet-500">Python AND React NOT PHP</span> · prefix <span className="text-violet-500">MUST:Python</span> for strict
          </p>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={boolInput}
              onChange={e => setBoolInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applyBoolean()}
              placeholder="Python AND React NOT PHP"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:border-violet-400"
            />
            <button
              onClick={applyBoolean}
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
            >
              Parse
            </button>
          </div>
          <div className="text-[9px] text-slate-400 space-y-0.5">
            <p><span className="font-semibold text-violet-600">AND/OR</span> → Nice to have</p>
            <p><span className="font-semibold text-violet-600">NOT / -X</span> → Exclude</p>
            <p><span className="font-semibold text-violet-600">MUST:X</span> → Must have (strict)</p>
          </div>
        </div>
      )}

      {/* Chip input box */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="min-h-[60px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 flex flex-wrap gap-1.5 cursor-text focus-within:border-violet-400 focus-within:bg-white transition-colors"
      >
        {chips.map((chip, i) => {
          const cfg = MODE_CONFIG[chip.mode];
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ring-1 cursor-pointer select-none ${cfg.chipCls}`}
              title={`Click to cycle mode (${chip.mode})`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotCls}`} onClick={() => cycleMode(i)} />
              <span onClick={() => cycleMode(i)}>{chip.label}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeChip(i); }}
                className={`ml-0.5 rounded-sm p-0.5 transition-colors ${cfg.btnCls}`}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={chips.length === 0 ? "Type a skill, press Enter…" : ""}
          className="flex-1 min-w-[80px] bg-transparent text-xs text-slate-700 placeholder-slate-300 focus:outline-none"
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[9px] text-slate-400">
        {(["must", "nice", "exclude"] as SkillMode[]).map(m => (
          <span key={m} className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${MODE_CONFIG[m].dotCls}`} />
            <span className="font-semibold">{MODE_CONFIG[m].label}</span>
            {m === "must" && "= all_skills (strict)"}
            {m === "nice" && "= skills (boost)"}
            {m === "exclude" && "= -X (exclude)"}
          </span>
        ))}
        <span className="ml-auto">· click chip to cycle</span>
      </div>

      {/* Live API preview */}
      {chips.length > 0 && (
        <ApiPreview chips={chips} />
      )}
    </div>
  );
}

// ─── API payload preview ──────────────────────────────────────────────────────

function ApiPreview({ chips }: { chips: SkillChip[] }) {
  const [open, setOpen] = useState(false);
  const must    = chips.filter(c => c.mode === "must").map(c => c.label);
  const nice    = chips.filter(c => c.mode === "nice").map(c => c.label);
  const exclude = chips.filter(c => c.mode === "exclude").map(c => `-${c.label}`);
  const preview: Record<string, unknown> = {};
  if (must.length)    preview.all_skills = must;
  if (nice.length || exclude.length) preview.skills = [...nice, ...exclude];

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">API Payload Preview</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <pre className="px-3 py-2.5 text-[10px] font-mono text-slate-500 bg-white overflow-auto leading-relaxed">
          {JSON.stringify(preview, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Profile Side Panel ───────────────────────────────────────────────────────

function ProfilePanel({ profile, onClose }: { profile: RRProfile; onClose: () => void }) {
  const allEmails = [
    ...(profile.teaser?.professional_emails ?? []),
    ...(profile.teaser?.emails ?? []),
    ...(profile.teaser?.personal_emails ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);
  const phones = profile.teaser?.phones ?? [];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="flex-1 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        className="w-full max-w-[400px] bg-white border-l border-slate-200 flex flex-col shadow-2xl"
        style={{ animation: "rrPanelIn .2s cubic-bezier(.22,1,.36,1) both" }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-slate-100 bg-slate-50/60">
          <Avatar src={profile.profile_pic} name={profile.name} />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-800 leading-snug truncate" style={{ fontFamily: "Syne, sans-serif" }}>
              {profile.name ?? "—"}
            </h2>
            <p className="text-violet-600 text-sm truncate">{profile.current_title ?? "—"}</p>
            <p className="text-slate-400 text-xs truncate mt-0.5">{profile.current_employer ?? ""}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {/* Overview */}
          <PanelSection title="Overview">
            <PRow label="ID"><span className="font-mono text-slate-500 text-xs">#{profile.id}</span></PRow>
            <PRow label="Status"><StatusBadge status={profile.status} /></PRow>
            {profile.location    && <PRow label="Location">{profile.location}</PRow>}
            {profile.country     && <PRow label="Country">{profile.country}</PRow>}
            {profile.connections != null && <PRow label="Connections">{profile.connections.toLocaleString()}</PRow>}
            {profile.update_time && <PRow label="Updated">{new Date(profile.update_time).toLocaleDateString()}</PRow>}
          </PanelSection>

          {/* Employer */}
          {(profile.current_employer || profile.current_employer_domain) && (
            <PanelSection title="Employer">
              {profile.current_employer       && <PRow label="Company">{profile.current_employer}</PRow>}
              {profile.current_employer_domain && (
                <PRow label="Domain">
                  <a href={`https://${profile.current_employer_domain}`} target="_blank" rel="noreferrer" className="text-violet-600 hover:underline">
                    {profile.current_employer_domain}
                  </a>
                </PRow>
              )}
              {profile.current_employer_website && (
                <PRow label="Website">
                  <a href={profile.current_employer_website} target="_blank" rel="noreferrer" className="text-violet-600 hover:underline truncate block">
                    {profile.current_employer_website}
                  </a>
                </PRow>
              )}
            </PanelSection>
          )}

          {/* Contact */}
          {(allEmails.length > 0 || phones.length > 0) && (
            <PanelSection title="Contact Preview">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                {allEmails.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">Email</p>
                    {allEmails.map((e, i) => (
                      <div key={i} className="flex items-center font-mono text-xs text-slate-600">
                        <span className="truncate">{e}</span><CopyBtn text={e} />
                      </div>
                    ))}
                  </div>
                )}
                {phones.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">Phone</p>
                    {phones.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
                        <span>{p.number}</span>
                        {p.is_premium && <span className="text-[9px] text-amber-600 ring-1 ring-amber-300 rounded px-1 bg-amber-50">PRO</span>}
                        <CopyBtn text={p.number} />
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-slate-400 italic">Full contact info needs a separate lookup call.</p>
              </div>
            </PanelSection>
          )}

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <PanelSection title="Skills">
              <div className="flex flex-wrap gap-1.5">
                {(profile.skills as string[]).map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 ring-1 ring-violet-200 text-[11px] font-medium">{s}</span>
                ))}
              </div>
            </PanelSection>
          )}

          {/* LinkedIn */}
          {profile.linkedin_url && (
            <PanelSection title="Social">
              <a href={profile.linkedin_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-violet-600 hover:text-violet-700 text-sm transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                View LinkedIn ↗
              </a>
            </PanelSection>
          )}

          {/* Raw JSON */}
          <RawJSON data={profile} />
        </div>
      </aside>
      <style>{`
        @keyframes rrPanelIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mb-3">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-slate-400 w-20 flex-shrink-0 text-[11px] pt-0.5">{label}</dt>
      <dd className="text-slate-700 text-xs flex-1 min-w-0">{children}</dd>
    </div>
  );
}

function RawJSON({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-5 py-4">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-slate-400 font-semibold hover:text-slate-600 transition-colors">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`transition-transform ${open ? "rotate-90" : ""}`}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        Raw JSON
      </button>
      {open && (
        <pre className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px] text-slate-500 overflow-auto max-h-60 font-mono leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Filter sidebar ───────────────────────────────────────────────────────────

const FIELDS: { key: keyof FilterForm; label: string; placeholder: string }[] = [
  { key: "name",             label: "Name",        placeholder: "e.g. Marc Benioff" },
  { key: "current_title",    label: "Title",        placeholder: "e.g. VP Sales, CTO" },
  { key: "current_employer", label: "Company",      placeholder: "e.g. Salesforce" },
  { key: "location",         label: "Location",     placeholder: '"San Francisco"::~50mi' },
  { key: "keyword",          label: "Keyword",      placeholder: "e.g. data enrichment" },
];

const ADV_FIELDS: { key: keyof FilterForm; label: string; placeholder: string }[] = [
  { key: "company_industry",  label: "Industry",   placeholder: "Software Engineering" },
  { key: "company_size",      label: "Co. Size",   placeholder: "51-200" },
  { key: "management_levels", label: "Mgmt Level", placeholder: "Director" },
  { key: "department",        label: "Department", placeholder: "Product Management" },
  { key: "school",            label: "School",     placeholder: "Stanford University" },
  { key: "degree",            label: "Degree",     placeholder: "Bachelors" },
];

function FilterSidebar({
  form, onChange, chips, onChipsChange,
  orderBy, onOrderBy, pageSize, onPageSize,
  onSearch, onReset, loading, showAdv, onToggleAdv, activeCount,
}: {
  form: FilterForm;
  onChange: (k: keyof FilterForm, v: string) => void;
  chips: SkillChip[];
  onChipsChange: (c: SkillChip[]) => void;
  orderBy: string;
  onOrderBy: (v: string) => void;
  pageSize: number;
  onPageSize: (v: number) => void;
  onSearch: () => void;
  onReset: () => void;
  loading: boolean;
  showAdv: boolean;
  onToggleAdv: () => void;
  activeCount: number;
}) {
  return (
    <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-500">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          <span className="text-xs font-semibold text-slate-700" style={{ fontFamily: "Syne, sans-serif" }}>Filters</span>
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        <button onClick={onReset} className="text-[10px] text-slate-400 hover:text-violet-600 transition-colors">
          Clear all
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">{label}</label>
            <input
              type="text"
              value={form[key] ?? ""}
              onChange={e => onChange(key, e.target.value)}
              placeholder={placeholder}
              onKeyDown={e => e.key === "Enter" && onSearch()}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors"
            />
          </div>
        ))}

        {/* ── Skills section ── */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">
            Skills
          </label>
          <SkillBuilder chips={chips} onChange={onChipsChange} />
        </div>

        {/* Advanced toggle */}
        <button
          onClick={onToggleAdv}
          className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-violet-600 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform ${showAdv ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          {showAdv ? "Hide" : "Show"} more filters
        </button>

        {showAdv && ADV_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">{label}</label>
            <input
              type="text"
              value={form[key] ?? ""}
              onChange={e => onChange(key, e.target.value)}
              placeholder={placeholder}
              onKeyDown={e => e.key === "Enter" && onSearch()}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors"
            />
          </div>
        ))}

        {/* Order + page size */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">Order By</label>
            <select value={orderBy} onChange={e => onOrderBy(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-violet-400">
              <option value="popularity">Popularity</option>
              <option value="relevance">Relevance</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">Per Page</label>
            <select value={pageSize} onChange={e => onPageSize(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-violet-400">
              {[5, 10, 25, 50, 100].map(n => <option key={n} value={n}>{n} results</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Search button */}
      <div className="px-4 py-3.5 border-t border-slate-100">
        <button
          onClick={onSearch}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors shadow-sm shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              Searching…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Search
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

// ─── Results table ────────────────────────────────────────────────────────────

function ResultsTable({ results, total, loading, error, pageSize, startIdx, onPrev, onNext, selected, onSelect }: {
  results: RRProfile[]; total: number | null; loading: boolean; error: string | null;
  pageSize: number; startIdx: number; onPrev: () => void; onNext: () => void;
  selected: RRProfile | null; onSelect: (p: RRProfile) => void;
}) {
  const totalPages  = total ? Math.ceil(total / pageSize) : 0;
  const currentPage = Math.ceil(startIdx / pageSize);

  if (error) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-sm w-full rounded-xl border border-red-200 bg-red-50 p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-red-700 mb-1">Search failed</p>
        <p className="text-xs text-red-500">{error}</p>
      </div>
    </div>
  );

  if (!loading && results.length === 0) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center text-slate-300">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p className="text-slate-400 text-sm font-medium">Set filters and search</p>
        <p className="text-slate-300 text-xs mt-1">Results appear here</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {results.length > 0 && (
        <div className="px-5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{results.length}</span>
            {total != null && total !== results.length && <> of <span className="font-semibold text-slate-700">{total.toLocaleString()}</span></>} results
            {totalPages > 1 && <span className="ml-2 text-slate-400">· Page {currentPage}/{totalPages}</span>}
          </p>
          <p className="text-[10px] text-slate-400">Click a row to see full profile →</p>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
              <tr>
                {["Candidate", "Title", "Company", "Location", "Contact Preview", "Status"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[9px] uppercase tracking-widest text-slate-400 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((p, i) => {
                const emailPrev = p.teaser?.professional_emails?.[0] ?? p.teaser?.emails?.[0] ?? p.teaser?.personal_emails?.[0];
                const phonePrev = p.teaser?.phones?.[0]?.number;
                const active = selected?.id === p.id;
                return (
                  <tr key={p.id ?? i} onClick={() => onSelect(p)}
                    className={`border-b border-slate-50 cursor-pointer transition-colors group ${active ? "bg-violet-50 border-l-2 border-l-violet-500" : "hover:bg-slate-50/70"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={p.profile_pic} name={p.name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-700 group-hover:text-slate-900 transition-colors truncate max-w-[140px] text-xs">{p.name ?? "—"}</p>
                          <p className="text-[9px] text-slate-400 font-mono">#{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[150px]"><span className="truncate block">{p.current_title ?? "—"}</span></td>
                    <td className="px-4 py-3 max-w-[140px]">
                      <p className="text-slate-500 text-xs truncate">{p.current_employer ?? "—"}</p>
                      {p.current_employer_domain && <p className="text-[9px] text-slate-400 truncate">{p.current_employer_domain}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-[120px]"><span className="truncate block">{p.location ?? p.city ?? "—"}</span></td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {emailPrev && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 7 12 13 2 7"/></svg>
                            <span className="truncate max-w-[130px]">{emailPrev}</span>
                          </div>
                        )}
                        {phonePrev && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1 19.79 19.79 0 0 1 1.62 4.44 2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            <span>{phonePrev}</span>
                          </div>
                        )}
                        {!emailPrev && !phonePrev && <span className="text-[10px] text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between">
          <span className="text-xs text-slate-400">Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={startIdx <= 1} onClick={onPrev}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              ← Prev
            </button>
            <button disabled={currentPage >= totalPages} onClick={onNext}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
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

  const activeCount = Object.values(form).filter(v => v?.trim()).length + (chips.length > 0 ? 1 : 0);

  const doSearch = useCallback(async (pageStart = 1) => {
    setLoading(true);
    setError(null);
    setStartIdx(pageStart);

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
          if (ctx.status === 401) msg = "Invalid RocketReach API key — check ROCKETREACH_API_KEY in Supabase secrets.";
          if (ctx.status === 429) msg = "RocketReach rate limit hit — slow down requests.";
        }
      } catch { /* ignore */ }
      setError(msg);
      setLoading(false);
      return;
    }

    const profiles: RRProfile[] = Array.isArray(data) ? data : data?.profiles ?? [];
    setResults(profiles);
    setTotal(data?.pagination?.total ?? profiles.length);
    setLoading(false);
  }, [form, chips, orderBy, pageSize]);

  const reset = () => {
    setForm({});
    setChips([]);
    setResults([]);
    setTotal(null);
    setError(null);
    setStartIdx(1);
  };

  return (
    <div className="flex h-full overflow-hidden bg-white">
      <FilterSidebar
        form={form}
        onChange={(k, v) => setForm(f => ({ ...f, [k]: v }))}
        chips={chips}
        onChipsChange={setChips}
        orderBy={orderBy}
        onOrderBy={setOrderBy}
        pageSize={pageSize}
        onPageSize={setPageSize}
        onSearch={() => doSearch(1)}
        onReset={reset}
        loading={loading}
        showAdv={showAdv}
        onToggleAdv={() => setShowAdv(v => !v)}
        activeCount={activeCount}
      />

      <ResultsTable
        results={results}
        total={total}
        loading={loading}
        error={error}
        pageSize={pageSize}
        startIdx={startIdx}
        onPrev={() => doSearch(Math.max(1, startIdx - pageSize))}
        onNext={() => doSearch(startIdx + pageSize)}
        selected={selected}
        onSelect={setSelected}
      />

      {selected && <ProfilePanel profile={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}