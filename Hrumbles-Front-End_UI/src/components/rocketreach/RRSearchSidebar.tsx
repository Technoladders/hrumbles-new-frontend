// src/components/RocketReachSearch/components/RRSearchSidebar.tsx
// v7 — merged Core Filters section, portal tooltips, range slider for radius
//
// Changes from v6:
//   • InfoTooltip now uses ReactDOM.createPortal + getBoundingClientRect so
//     tooltips render above the sidebar overflow and are always fully visible.
//   • Location radius changed from number input → range slider (0–500 mi, step 5).
//     Always visible for CO inside the Location section; label shows current value.
//   • Section reorganisation:
//       - "Title & Company" removed.
//       - "Core Filters" is now the single top section (open by default) that
//         contains: Job Title + toggles + excludes, Match Experience, Company +
//         tab + excludes + domain, Industry, Skills, OTW, Years of Experience,
//         Years in Current Role.
//       - "Location" section stays below Core; radius slider now inside it.
//       - Role Details, Education, Languages unchanged.
//   • Signals / managementLevels / sort intentionally not added.

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Country, State, City } from "country-state-city";
import {
  Search, UserSearch, RotateCcw, Loader2, X, MapPin, Briefcase,
  Building2, ChevronDown, Play, GraduationCap,
  Filter, Link2, Lock, Zap, Info, Plus, Minus, Globe2, AlertCircle, Star,
} from "lucide-react";
import { ImLinkedin } from "react-icons/im";
import type { SkillChip, SkillMode } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RRFilters {
  linkedinUrl:             string;
  keyword:                 string;
  name:                    string;
  titles:                  string[];
  locations:               string[];
  managementLevels:        string[];
  skillChips:              SkillChip[];
  currentEmployer:         string[];
  companySize:             string[];
  companyIndustry:         string[];
  companyRevenue:          string;
  companyPubliclyTraded:   boolean;
  companyFundingMin:       string;
  companyFundingMax:       string;
  companyTags:             string[];
  department:              string[];
  yearsExperience:         string;
  previousEmployer:        string[];
  previousTitle:           string[];
  school:                  string[];
  degree:                  string[];
  major:                   string[];
  contactMethod:           string[];
  jobChangeSignal:         string;
  newsSignal:              string;
  jobPostingSignal:        string;
  emailGrade:              string;
  orderBy:                 "popularity" | "relevance";
  openToWork:              boolean;
  yearsInCurrentRole:      string;
  recentlyChangedJobs:     boolean;
  // v6 new
  excludeJobTitles:        string[];
  currentTitlesOnly:       boolean;
  includeRelatedJobTitles: boolean;
  matchExperience:         "" | "current" | "past" | "both";
  companyFilter:           "current" | "past" | "both";
  excludeCompanies:        string[];
  excludeCompaniesFilter:  "current" | "past" | "both";
  domain:                  string[];
  locationRadius:          number | "";
  currentWorkLocation:     string[];
  pastWorkLocation:        string[];
  languages:               Array<{ language: string; proficiency: string[] }>;
}

export const DEFAULT_RR_FILTERS: RRFilters = {
  linkedinUrl: "", keyword: "", name: "",
  titles: [], locations: [], managementLevels: [], skillChips: [],
  currentEmployer: [], companySize: [], companyIndustry: [], companyRevenue: "",
  companyPubliclyTraded: false, companyFundingMin: "", companyFundingMax: "",
  companyTags: [], department: [], yearsExperience: "",
  previousEmployer: [], previousTitle: [],
  school: [], degree: [], major: [],
  contactMethod: [], jobChangeSignal: "", newsSignal: "", jobPostingSignal: "", emailGrade: "",
  orderBy: "popularity", openToWork: false, yearsInCurrentRole: "", recentlyChangedJobs: false,
  excludeJobTitles: [], currentTitlesOnly: true, includeRelatedJobTitles: false,
  matchExperience: "", companyFilter: "current",
  excludeCompanies: [], excludeCompaniesFilter: "both",
  domain: [], locationRadius: "", currentWorkLocation: [], pastWorkLocation: [],
  languages: [],
};

// ─── Constants ────────────────────────────────────────────────────────────────
const CO_INDUSTRIES = [
  "Defense & Space","Computer Hardware","Computer Software","Computer Networking",
  "Internet","Semiconductors","Telecommunications","Law Practice","Legal Services",
  "Management Consulting","Biotechnology","Medical Practice","Hospital & Health Care",
  "Pharmaceuticals","Veterinary","Medical Device","Cosmetics","Apparel & Fashion",
  "Sporting Goods","Tobacco","Supermarkets","Food Production","Consumer Electronics",
  "Consumer Goods","Furniture","Retail","Entertainment","Gambling & Casinos",
  "Leisure, Travel & Tourism","Hospitality","Restaurants","Sports","Food & Beverages",
  "Motion Pictures & Film","Broadcast Media","Museums & Institutions","Fine Art",
  "Performing Arts","Recreational Facilities & Services","Banking","Insurance",
  "Financial Services","Real Estate","Investment Banking","Investment Management",
  "Accounting","Construction","Building Materials","Architecture & Planning",
  "Civil Engineering","Aviation & Aerospace","Automotive","Chemicals","Machinery",
  "Mining & Metals","Oil & Energy","Shipbuilding","Utilities","Textiles",
  "Paper & Forest Products","Railroad Manufacture","Farming","Ranching","Dairy",
  "Fishery","Primary/Secondary Education","Higher Education","Education Management",
  "Research","Military","Legislative Office","Judiciary","International Affairs",
  "Government Administration","Executive Office","Law Enforcement","Public Safety",
  "Public Policy","Marketing & Advertising","Nonprofit Organization Management",
  "Fund-Raising","Program Development","Writing & Editing","Staffing & Recruiting",
  "Professional Training & Coaching","Market Research",
  "Public Relations & Communications","Design","Luxury Goods & Jewelry",
  "Renewables & Environment","Glass, Ceramics & Concrete","Packaging & Containers",
  "Industrial Automation","Government Relations","Music","Think Tanks","Philanthropy",
  "E-learning","Nanotechnology","Computer Games","Venture Capital & Private Equity",
  "Wireless","Alternative Medicine","Media Production","Animation",
  "Commercial Real Estate","Capital Markets","Airlines/Aviation","Maritime",
  "Information Services","Social Media","Photography","Import & Export",
  "Alternative Dispute Resolution","Facilities Services","Outsourcing/Offshoring",
  "Health, Wellness & Fitness","Translation & Localization",
  "Computer & Network Security","Graphic Design","Online Media",
  "Environmental Services","Publishing","Printing","Human Resources",
  "Transportation/Trucking/Railroad","Logistics & Supply Chain",
  "Business Supplies & Equipment","Events Services","Arts & Crafts",
  "Electrical & Electronic Manufacturing","Mechanical or Industrial Engineering",
  "Wine & Spirits","Warehousing","Plastics","Security & Investigations",
  "Individual & Family Services","Religious Institutions",
  "Civic & Social Organization","Consumer Services","Libraries",
  "Medical Devices","Wholesale","International Trade & Development",
];

const YEARS_EXP_OPTIONS = [
  { label: "Any experience", value: "" }, { label: "< 1 year", value: "0_1" },
  { label: "1–2 years", value: "1_2" },   { label: "3–5 years", value: "3_5" },
  { label: "6–10 years", value: "6_10" }, { label: "10+ years", value: "10" },
];

const YEARS_ROLE_OPTIONS = [
  { label: "Any duration", value: "" }, { label: "< 2 years", value: "0_2" },
  { label: "2–4 years", value: "2_4" }, { label: "4–6 years", value: "4_6" },
  { label: "6–8 years", value: "6_8" }, { label: "8–10 years", value: "8_10" },
  { label: "10+ years", value: "10" },
];

const LANGUAGE_PROFICIENCIES = [
  { value: "elementary",          label: "Elementary" },
  { value: "limited_working",     label: "Limited Working" },
  { value: "professional_working", label: "Prof. Working" },
  { value: "full_professional",   label: "Full Professional" },
  { value: "native_or_bilingual", label: "Native/Bilingual" },
];

// ─── Gradient def ─────────────────────────────────────────────────────────────
const GradientDef = () => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    <defs>
      <linearGradient id="rr-sidebar-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#9333ea" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
  </svg>
);

// ─── InfoTooltip — portal-based, never clipped by sidebar overflow ─────────────
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [vis, setVis] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleEnter = useCallback(() => {
    if (!iconRef.current) return;
    const r = iconRef.current.getBoundingClientRect();
    const W = 216; // tooltip width
    // Default: appear to the right of the icon
    let left = r.right + 8;
    let top  = r.top - 2;
    // If it would overflow the right viewport edge, flip left
    if (left + W > window.innerWidth - 8) left = r.left - W - 8;
    // If it would go below viewport, push up
    if (top + 80 > window.innerHeight - 8) top = window.innerHeight - 90;
    if (top < 4) top = 4;
    setPos({ top, left });
    setVis(true);
  }, []);

  return (
    <span ref={iconRef} className="inline-flex items-center flex-shrink-0 cursor-help"
      onMouseEnter={handleEnter} onMouseLeave={() => setVis(false)}>
      <Info size={9} className="text-slate-300 hover:text-violet-400 transition-colors" />
      {vis && typeof document !== "undefined" && ReactDOM.createPortal(
        <div
          className="rounded-lg shadow-xl bg-slate-800 text-white text-[9px] leading-relaxed p-2.5 border border-slate-700 pointer-events-none whitespace-normal"
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 99999, width: 216, maxWidth: "calc(100vw - 16px)" }}>
          {text}
        </div>,
        document.body
      )}
    </span>
  );
};

// ─── SL — sub-label with optional info ────────────────────────────────────────
const SL: React.FC<{ children: React.ReactNode; info?: string }> = ({ children, info }) => (
  <div className="flex items-center gap-1 mb-1">
    <p className="text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-purple-600">
      {children}
    </p>
    {info && <InfoTooltip text={info} />}
  </div>
);

// ─── SectionHeader ────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{
  label: string; icon: React.ElementType; isOpen: boolean; onToggle: () => void;
  count?: number; hasActive?: boolean; locked?: boolean; info?: string;
}> = ({ label, icon: Icon, isOpen, onToggle, count, hasActive, locked, info }) => (
  <button type="button" onClick={locked ? undefined : onToggle}
    className={cn("w-full flex items-center justify-between py-2 group", locked && "cursor-default")}>
    <div className="flex items-center gap-2">
      <Icon size={11} className={cn("transition-colors",
        locked ? "text-slate-300" : hasActive ? "text-violet-500" : "text-slate-400 group-hover:text-slate-600")} />
      <span className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors",
        locked ? "text-slate-300"
        : hasActive ? "bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
        : "text-slate-500 group-hover:text-slate-700")}>
        {label}
      </span>
      {!locked && (count ?? 0) > 0 && (
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          {count}
        </span>
      )}
      {locked && <Lock size={9} className="text-slate-300" />}
      {!locked && info && <InfoTooltip text={info} />}
    </div>
    {!locked && (
      <ChevronDown size={10} className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
    )}
  </button>
);

// ─── PortalDropdown ───────────────────────────────────────────────────────────
function PortalDropdown({ anchorRef, isOpen, maxH = 220, children }: {
  anchorRef: React.RefObject<HTMLDivElement>; isOpen: boolean; maxH?: number; children: React.ReactNode;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    let rafId: number;
    const update = () => {
      rafId = requestAnimationFrame(() => {
        if (!anchorRef.current) return;
        const r = anchorRef.current.getBoundingClientRect();
        const w = Math.max(r.width, 200);
        const left = Math.min(r.left, window.innerWidth - w - 8);
        const goUp = window.innerHeight - r.bottom < maxH && r.top > maxH;
        setStyle({ position: "fixed", left: Math.max(4, left), width: w, zIndex: 99999, maxHeight: maxH,
          ...(goUp ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
      });
    };
    update();
    window.addEventListener("scroll", update, true); window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [isOpen, anchorRef, maxH]);
  if (!isOpen) return null;
  return ReactDOM.createPortal(
    <div style={style} className="bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col overflow-hidden overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5">
      {children}
    </div>, document.body);
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
const Chip: React.FC<{ label: string; onRemove: () => void; color?: string }> = ({ label, onRemove, color }) => (
  <span className={cn("inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium border",
    color ?? "bg-violet-50 text-violet-700 border-violet-200")}>
    {label}
    <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-400 transition-colors ml-0.5"><X size={8} /></button>
  </span>
);

// ─── ExcludeInput ─────────────────────────────────────────────────────────────
function ExcludeInput({ selected, onChange, placeholder }: {
  selected: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [input, setInput] = useState("");
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (!selected.includes(input.trim())) onChange([...selected, input.trim()]);
      setInput("");
    } else if (e.key === "Backspace" && !input && selected.length) onChange(selected.slice(0, -1));
  };
  return (
    <div className="space-y-1">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(t => <Chip key={t} label={t} onRemove={() => onChange(selected.filter(x => x !== t))} color="bg-red-50 text-red-600 border-red-200" />)}
        </div>
      )}
      <div className="rounded-lg border border-red-200 bg-white flex items-center gap-2 px-2 h-7 focus-within:border-red-400 focus-within:ring-1 focus-within:ring-red-100 transition-all">
        <Minus size={9} className="text-red-400 flex-shrink-0" />
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[11px] text-slate-600 placeholder:text-red-300 placeholder:text-[9px] placeholder:italic focus:outline-none" />
        {input && <button type="button" onClick={() => setInput("")}><X size={8} className="text-slate-400" /></button>}
      </div>
    </div>
  );
}

// ─── LanguageBuilder ─────────────────────────────────────────────────────────
function LanguageBuilder({ entries, onChange }: {
  entries: Array<{ language: string; proficiency: string[] }>;
  onChange: (v: typeof entries) => void;
}) {
  const add    = () => onChange([...entries, { language: "", proficiency: [] }]);
  const remove = (i: number) => onChange(entries.filter((_, j) => j !== i));
  const upLang = (i: number, lang: string) => onChange(entries.map((e, j) => j === i ? { ...e, language: lang } : e));
  const toggleProf = (i: number, prof: string) =>
    onChange(entries.map((e, j) => {
      if (j !== i) return e;
      const has = e.proficiency.includes(prof);
      return { ...e, proficiency: has ? e.proficiency.filter(p => p !== prof) : [...e.proficiency, prof] };
    }));
  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div key={i} className="rounded-lg border border-slate-200 p-2 space-y-1.5 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <input type="text" value={entry.language} onChange={e => upLang(i, e.target.value)}
              placeholder="Language (e.g. English)"
              className="flex-1 h-7 px-2 rounded border border-slate-200 bg-white text-[11px] text-slate-700
                focus:outline-none focus:border-violet-400 placeholder:text-[9px] placeholder:text-slate-400 placeholder:italic" />
            <button type="button" onClick={() => remove(i)} className="text-slate-400 hover:text-red-400 transition-colors"><X size={12} /></button>
          </div>
          <div className="flex flex-wrap gap-1">
            {LANGUAGE_PROFICIENCIES.map(p => {
              const active = entry.proficiency.includes(p.value);
              return (
                <button key={p.value} type="button" onClick={() => toggleProf(i, p.value)}
                  className={cn("px-1.5 py-0.5 rounded-full text-[8px] font-semibold border transition-all",
                    active ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent"
                           : "bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600")}>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button type="button" onClick={add}
        className="w-full h-7 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 text-[10px] text-slate-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50/50 transition-all">
        <Plus size={10} /> Add Language
      </button>
    </div>
  );
}

// ─── TagInput ─────────────────────────────────────────────────────────────────
function TagInput({ selected, onChange, onSearch, placeholder, icon: Icon, chipColor }: {
  selected: string[]; onChange: (v: string[]) => void; onSearch: () => void;
  placeholder: string; icon: React.ElementType; chipColor?: string;
}) {
  const [input, setInput] = useState("");
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) { e.preventDefault(); if (!selected.includes(input.trim())) onChange([...selected, input.trim()]); setInput(""); }
    else if (e.key === "Enter" && !input.trim()) { e.preventDefault(); onSearch(); }
    else if (e.key === "Backspace" && !input && selected.length) onChange(selected.slice(0, -1));
  };
  return (
    <div className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(t => <Chip key={t} label={t} onRemove={() => onChange(selected.filter(x => x !== t))} color={chipColor} />)}
        </div>
      )}
      <div className="group rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 transition-all hover:border-purple-400 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-200">
        <Icon size={10} className="flex-shrink-0 text-slate-400 group-hover:text-purple-500 group-focus-within:text-purple-600 transition-colors" />
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder={placeholder}
          className="flex-1 bg-transparent text-[11px] text-slate-600 placeholder:text-[10px] placeholder:text-slate-600 placeholder:italic focus:outline-none" />
      </div>
    </div>
  );
}

// ─── SearchableMultiSelect ────────────────────────────────────────────────────
function SearchableMultiSelect({ label, options, selected, onChange, onSearch, icon: Icon, chipColor }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
  onSearch: () => void; icon: React.ElementType; chipColor?: string;
}) {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null); const anchorRef = useRef<HTMLDivElement>(null); const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => options.filter(o => !selected.includes(o) && o.toLowerCase().includes(q.toLowerCase())).slice(0, 30), [options, selected, q]);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn);
  }, []);
  return (
    <div ref={wrapRef} className="space-y-1.5">
      {selected.length > 0 && <div className="flex flex-wrap gap-1">{selected.map(v => <Chip key={v} label={v} onRemove={() => onChange(selected.filter(x => x !== v))} color={chipColor} />)}</div>}
      <div ref={anchorRef}>
        <div onClick={() => { setOpen(true); inputRef.current?.focus(); }}
          className="group rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 cursor-text transition-all hover:border-purple-300 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-200">
          <Icon size={10} className="text-slate-400 flex-shrink-0 group-hover:text-purple-500 transition-colors" />
          <input ref={inputRef} type="text" value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key === "Escape") setOpen(false); if (e.key === "Enter" && !q.trim()) { setOpen(false); onSearch(); } }}
            placeholder={label} className="flex-1 bg-transparent text-[11px] text-slate-600 focus:outline-none placeholder:text-slate-600 placeholder:italic placeholder:text-[10px]" />
          <ChevronDown size={9} className={cn("text-slate-400 flex-shrink-0 transition-all group-hover:text-purple-500", open && "rotate-180 text-purple-600")} />
        </div>
        <PortalDropdown anchorRef={anchorRef} isOpen={open && filtered.length > 0}>
          {filtered.map(opt => (
            <button key={opt} type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onChange([...selected, opt]); setQ(""); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="group w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left transition-all hover:bg-violet-50 hover:pl-4">{opt}
            </button>
          ))}
        </PortalDropdown>
      </div>
    </div>
  );
}

// ─── SimpleSelect ─────────────────────────────────────────────────────────────
function SimpleSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: { label: string; value: string }[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false); const anchorRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);
  return (
    <div className="relative">
      <div ref={anchorRef} onClick={() => setOpen(v => !v)}
        className="group w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 flex items-center justify-between cursor-pointer transition-all hover:border-purple-300">
        <span className={cn("text-[10px]", value ? "text-slate-700" : "text-slate-600 italic")}>{selected?.label || placeholder || "Select"}</span>
        <svg className={cn("w-3 h-3 text-slate-400 transition-all group-hover:text-purple-500", open && "rotate-180 text-purple-600")} viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.25 7.5L10 12.25L14.75 7.5" />
        </svg>
      </div>
      <PortalDropdown anchorRef={anchorRef} isOpen={open}>
        {options.map(opt => (
          <button key={opt.value} type="button" onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
            className={cn("w-full text-left px-3 py-1.5 text-[11px] transition-all hover:bg-violet-50 hover:pl-4", value === opt.value && "bg-purple-50 text-purple-600 font-medium")}>
            {opt.label}
          </button>
        ))}
      </PortalDropdown>
    </div>
  );
}

// ─── parseBooleanExpression ──────────────────────────────────────────────────
// Parses a boolean expression into SkillChips.
//   "Python AND Django"  → [must, must]
//   "React OR Vue"       → [nice, nice]
//   "NOT Java"           → [exclude]
//   Mixed: "A AND B OR C NOT D" → must/nice/exclude by first operator precedence
function parseBooleanExpression(raw: string): Array<{ label: string; mode: SkillMode }> {
  const out: Array<{ label: string; mode: SkillMode }> = [];

  // NOT at the start
  const notMatch = raw.match(/^NOT\s+(.+)$/i);
  if (notMatch) {
    const label = notMatch[1].replace(/^["']|["']$/g, "").trim();
    if (label) out.push({ label, mode: "exclude" });
    return out;
  }

  // AND → must for all tokens
  if (/\bAND\b/i.test(raw)) {
    raw.split(/\bAND\b/i).forEach(part => {
      const label = part.replace(/^["']|["']$/g, "").trim();
      if (label) out.push({ label, mode: "must" });
    });
    return out;
  }

  // OR → nice for all tokens
  if (/\bOR\b/i.test(raw)) {
    raw.split(/\bOR\b/i).forEach(part => {
      const label = part.replace(/^["']|["']$/g, "").trim();
      if (label) out.push({ label, mode: "nice" });
    });
    return out;
  }

  // Plain text → nice
  const label = raw.replace(/^["']|["']$/g, "").trim();
  if (label) out.push({ label, mode: "nice" });
  return out;
}

// ─── SkillChipBuilder (v3 — hollow/filled star + tooltip + boolean) ──────────
// Interaction:
//   • Type + Enter (or comma)  → adds chip as "nice"  (hollow ☆ star, always violet)
//   • Click chip               → toggles nice ↔ must  (★ star fills yellow; bg stays violet)
//   • Hover chip               → tooltip with chip name + action hint (portal, black bg)
//   • Exclude section          → separate red-bordered input below
//   • Boolean search           → collapsible fx section, parses AND / OR / NOT
const SkillChipBuilder: React.FC<{ chips: SkillChip[]; onChange: (c: SkillChip[]) => void; onSearch: () => void }> = ({ chips, onChange, onSearch }) => {
  const [input,        setInput]        = useState("");
  const [excludeInput, setExcludeInput] = useState("");
  const [boolInput,    setBoolInput]    = useState("");
  const [showExclude,  setShowExclude]  = useState(false);
  const [showBoolean,  setShowBoolean]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const excRef   = useRef<HTMLInputElement>(null);
  const boolRef  = useRef<HTMLInputElement>(null);

  // Portal chip-tooltip state
  const [tooltip, setTooltip] = useState<{
    label: string; isMust: boolean; top: number; left: number;
  } | null>(null);

  const mainChips    = chips.filter(c => c.mode !== "exclude");
  const excludeChips = chips.filter(c => c.mode === "exclude");
  const mustCount    = mainChips.filter(c => c.mode === "must").length;
  const niceCount    = mainChips.filter(c => c.mode === "nice").length;

  // Auto-collapse exclude when chips cleared (e.g. after reset)
  useEffect(() => {
    if (excludeChips.length === 0 && !excludeInput) setShowExclude(false);
  }, [excludeChips.length, excludeInput]);

  const addChip = (label: string, mode: SkillMode) => {
    const t = label.trim();
    if (!t) return;
    const exists = chips.some(c => c.label.toLowerCase() === t.toLowerCase());
    if (!exists) onChange([...chips, { label: t, mode }]);
  };

  const removeChip = (label: string) => onChange(chips.filter(c => c.label !== label));

  const toggleMust = (chip: SkillChip) => {
    const next: SkillMode = chip.mode === "must" ? "nice" : "must";
    onChange(chips.map(c => c.label === chip.label ? { ...c, mode: next } : c));
  };

  const handleKey = (
    e: React.KeyboardEvent<HTMLInputElement>,
    mode: SkillMode,
    val: string,
    setVal: (v: string) => void,
  ) => {
    if ((e.key === "Enter" || e.key === ",") && val.trim()) {
      e.preventDefault(); addChip(val, mode); setVal("");
    } else if (e.key === "Enter" && !val.trim() && mode !== "exclude") {
      e.preventDefault(); onSearch();
    } else if (e.key === "Backspace" && !val) {
      const target = mode === "exclude" ? excludeChips : mainChips;
      if (target.length) removeChip(target[target.length - 1].label);
    }
  };

  const handleBoolKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && boolInput.trim()) {
      e.preventDefault();
      const newChips = parseBooleanExpression(boolInput);
      const existing = new Set(chips.map(c => c.label.toLowerCase()));
      const toAdd    = newChips.filter(nc => !existing.has(nc.label.toLowerCase()));
      if (toAdd.length) onChange([...chips, ...toAdd]);
      setBoolInput("");
    }
  };

  // Portal tooltip handlers
  const showTip = (e: React.MouseEvent<HTMLSpanElement>, chip: SkillChip) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      label:  chip.label,
      isMust: chip.mode === "must",
      top:    rect.top - 4,          // just above the chip
      left:   rect.left + rect.width / 2,
    });
  };
  const hideTip = () => setTooltip(null);

  return (
    <div className="space-y-2">

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      {mainChips.length > 0 && (
        <div className="flex items-center gap-2.5 px-0.5">
          {niceCount > 0 && (
            <span className="flex items-center gap-1 text-[8px] text-violet-500">
              <Star size={8} className="text-violet-300 flex-shrink-0" />
              {niceCount} nice-to-have
            </span>
          )}
          {mustCount > 0 && (
            <span className="flex items-center gap-1 text-[8px] text-amber-600 font-semibold">
              <Star size={8} fill="currentColor" className="text-yellow-400 flex-shrink-0" />
              {mustCount} mandatory
            </span>
          )}
          <span className="text-[8px] text-slate-400 ml-auto">click tag to toggle ★</span>
        </div>
      )}

      {/* ── Main chip area ─────────────────────────────────────────────── */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="group rounded-lg border border-slate-200 bg-white px-2 py-1.5 flex flex-wrap gap-1.5 min-h-[38px] cursor-text transition-all hover:border-purple-300 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-200"
      >
        {mainChips.map(chip => {
          const isMust = chip.mode === "must";
          return (
            <span
              key={chip.label}
              onMouseEnter={e => showTip(e, chip)}
              onMouseLeave={hideTip}
              onClick={e => { e.stopPropagation(); hideTip(); toggleMust(chip); }}
              className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[10px] font-medium border cursor-pointer select-none transition-all duration-150 hover:scale-[1.04] active:scale-[0.97] bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-400"
            >
              {isMust
                ? <Star size={9} fill="currentColor" className="text-yellow-400 flex-shrink-0" />
                : <Star size={9} className="text-violet-300 flex-shrink-0" />
              }
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); hideTip(); removeChip(chip.label); }}
                className="text-slate-400 hover:text-red-400 transition-colors ml-0.5 flex-shrink-0"
              >
                <X size={8} />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => handleKey(e, "nice", input, setInput)}
          placeholder={mainChips.length === 0 ? "Add skill, Enter… · click tag ★ to mark mandatory" : ""}
          className="flex-1 min-w-[60px] bg-transparent text-[11px] text-slate-700 focus:outline-none placeholder:text-[9px] placeholder:text-slate-600 placeholder:italic"
        />
      </div>

      {/* ── Portal tooltip ─────────────────────────────────────────────── */}
      {tooltip && ReactDOM.createPortal(
        <div
          style={{
            position: "fixed",
            top:       tooltip.top - 42,
            left:      tooltip.left,
            transform: "translateX(-50%)",
            zIndex:    9999,
            pointerEvents: "none",
          }}
          className="flex flex-col items-center"
        >
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white shadow-lg flex flex-col gap-0.5 whitespace-nowrap">
            <span className="text-[10px] font-semibold leading-tight">{tooltip.label}</span>
            <span className="text-[8px] text-slate-400 leading-tight">
              {tooltip.isMust ? "Click to remove mandatory" : "Click to mark as mandatory ★"}
            </span>
          </div>
          {/* Caret */}
          <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-900" />
        </div>,
        document.body,
      )}

      {/* ── Exclude section ────────────────────────────────────────────── */}
      {(showExclude || excludeChips.length > 0) ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-semibold text-red-500 uppercase tracking-wide flex items-center gap-1">
              <Minus size={8} /> Exclude Skills
            </span>
            <InfoTooltip text="Profiles with any of these skills are removed from results." />
            {excludeChips.length === 0 && (
              <button type="button" onClick={() => setShowExclude(false)} className="ml-auto text-[8px] text-slate-400 hover:text-slate-600">Hide</button>
            )}
          </div>
          <div
            onClick={() => excRef.current?.focus()}
            className="rounded-lg border border-red-200 bg-white px-2 py-1.5 flex flex-wrap gap-1.5 min-h-[32px] cursor-text focus-within:border-red-400 focus-within:ring-1 focus-within:ring-red-100 transition-all"
          >
            {excludeChips.map(chip => (
              <span key={chip.label} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium border bg-red-50 text-red-600 border-red-200">
                {chip.label}
                <button type="button" onClick={() => removeChip(chip.label)} className="text-slate-400 hover:text-red-500 ml-0.5"><X size={8} /></button>
              </span>
            ))}
            <input
              ref={excRef}
              type="text"
              value={excludeInput}
              onChange={e => setExcludeInput(e.target.value)}
              onKeyDown={e => handleKey(e, "exclude", excludeInput, setExcludeInput)}
              placeholder={excludeChips.length === 0 ? "Skill to block, Enter…" : ""}
              className="flex-1 min-w-[60px] bg-transparent text-[11px] text-slate-600 focus:outline-none placeholder:text-[9px] placeholder:text-red-300 placeholder:italic"
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setShowExclude(true); setTimeout(() => excRef.current?.focus(), 50); }}
          className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-red-500 transition-colors"
        >
          <Minus size={9} className="text-red-400 flex-shrink-0" /> Exclude skills
        </button>
      )}

      {/* ── Boolean search section ─────────────────────────────────────── */}
      {(showBoolean) ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-semibold text-violet-500 uppercase tracking-wide flex items-center gap-1">
              <Zap size={8} /> Boolean Search
            </span>
            <InfoTooltip text={"AND → must-have chips\nOR → nice-to-have chips\nNOT → exclude chip\nExample: Python AND Django"} />
            <button type="button" onClick={() => { setShowBoolean(false); setBoolInput(""); }} className="ml-auto text-[8px] text-slate-400 hover:text-slate-600">Hide</button>
          </div>
          <div
            onClick={() => boolRef.current?.focus()}
            className="rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 flex items-center gap-1.5 focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-100 transition-all cursor-text"
          >
            <Zap size={9} className="text-violet-400 flex-shrink-0" />
            <input
              ref={boolRef}
              type="text"
              value={boolInput}
              onChange={e => setBoolInput(e.target.value)}
              onKeyDown={handleBoolKey}
              placeholder='e.g. Python AND Django · React OR Vue · NOT Java'
              className="flex-1 bg-transparent text-[11px] text-slate-700 focus:outline-none placeholder:text-[9px] placeholder:text-slate-400 placeholder:italic"
            />
          </div>
          <div className="flex items-center gap-2 px-0.5">
            <span className="text-[8px] text-slate-400">
              <span className="font-semibold text-violet-600">AND</span> = must-have&nbsp;·&nbsp;
              <span className="font-semibold text-violet-500">OR</span> = nice&nbsp;·&nbsp;
              <span className="font-semibold text-red-400">NOT</span> = exclude
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setShowBoolean(true); setTimeout(() => boolRef.current?.focus(), 50); }}
          className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-violet-500 transition-colors"
        >
          <Zap size={9} className="text-violet-400 flex-shrink-0" /> Boolean search
        </button>
      )}
    </div>
  );
};

// ─── LocationSelect ───────────────────────────────────────────────────────────
type LocType = "country" | "state" | "city";
const LOC_STYLE: Record<LocType, string> = {
  country: "bg-blue-50 text-blue-700 border-blue-200",
  state:   "bg-orange-50 text-orange-700 border-orange-200",
  city:    "bg-purple-50 text-purple-700 border-purple-200",
};
const ALL_COUNTRIES = Country.getAllCountries().map(c => ({ value: c.name, label: `${c.flag ?? ""} ${c.name}`.trim(), type: "country" as LocType }));
const ALL_STATES    = State.getAllStates().map(s => ({ value: s.name, label: s.name, type: "state" as LocType }));
const POPULAR       = ["India","United States","United Kingdom","Canada","Australia","Germany","Singapore","UAE","France","Netherlands"];
function searchLocs(q: string, selected: string[]) {
  const lq = q.toLowerCase().trim();
  if (!lq) return ALL_COUNTRIES.filter(c => POPULAR.includes(c.value) && !selected.includes(c.value)).slice(0, 10);
  const out: typeof ALL_COUNTRIES = [];
  ALL_COUNTRIES.filter(c => c.value.toLowerCase().includes(lq) && !selected.includes(c.value)).slice(0, 5).forEach(c => out.push(c));
  ALL_STATES.filter(s => s.value.toLowerCase().includes(lq) && !selected.includes(s.value)).slice(0, 4).forEach(s => out.push({ ...s, type: "state" }));
  if (lq.length >= 3) City.getAllCities().filter(c => c.name.toLowerCase().includes(lq) && !selected.includes(c.name)).slice(0, 6).forEach(c => out.push({ value: c.name, label: c.name, type: "city" }));
  return out.slice(0, 20);
}
function getLocType(val: string): LocType {
  if (ALL_COUNTRIES.some(c => c.value === val)) return "country";
  if (ALL_STATES.some(s => s.value === val)) return "state";
  return "city";
}
function LocationSelect({ selected, onChange, onSearch }: { selected: string[]; onChange: (v: string[]) => void; onSearch: () => void }) {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null); const anchorRef = useRef<HTMLDivElement>(null); const inputRef = useRef<HTMLInputElement>(null);
  const options = useMemo(() => searchLocs(q, selected), [q, selected]);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn);
  }, []);
  return (
    <div ref={wrapRef} className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(val => {
            const t = getLocType(val);
            return (
              <span key={val} className={cn("group inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[10px] font-medium border transition-all", LOC_STYLE[t])}>
                {val}
                <button type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onChange(selected.filter(x => x !== val)); }} className="opacity-60 hover:opacity-100 hover:text-red-500 transition-colors"><X size={8} /></button>
              </span>
            );
          })}
        </div>
      )}
      <div ref={anchorRef}>
        <div onClick={() => { setOpen(true); inputRef.current?.focus(); }}
          className="group rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 cursor-text transition-all hover:border-purple-300 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-200" onMouseDown={e => e.stopPropagation()}>
          <MapPin size={10} className="flex-shrink-0 text-slate-400 group-hover:text-purple-500 transition-colors" />
          <input ref={inputRef} type="text" value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key === "Enter" && !q.trim()) { setOpen(false); onSearch(); } }}
            placeholder="Country, state or city…" className="flex-1 bg-transparent text-[11px] text-slate-600 focus:outline-none placeholder:text-[10px] placeholder:text-slate-400 placeholder:italic" />
          {q && <button type="button" onMouseDown={e => { e.preventDefault(); setQ(""); }} className="text-slate-400 hover:text-red-500 transition-colors"><X size={9} /></button>}
        </div>
        <PortalDropdown anchorRef={anchorRef} isOpen={open && options.length > 0}>
          {options.map(opt => (
            <button key={opt.value} type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onChange([...selected, opt.value]); setQ(""); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="group w-full flex items-center gap-2 px-3 py-1.5 text-left transition-all hover:bg-violet-50 hover:pl-4">
              <span className={cn("text-[8px] px-1 py-0.5 rounded border font-semibold", LOC_STYLE[opt.type])}>{opt.type[0].toUpperCase()}</span>
              <span className="text-[11px] text-slate-700 truncate">{opt.label}</span>
            </button>
          ))}
        </PortalDropdown>
      </div>
    </div>
  );
}

// ─── Toggle helper ────────────────────────────────────────────────────────────
const Div = () => <div className="h-px bg-slate-100 my-1" />;

function Toggle({ on, onToggle, label, info }: { on: boolean; onToggle: () => void; label: string; info?: string }) {
  return (
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-1.5 cursor-pointer select-none" onClick={onToggle}>
        <div className={cn("relative w-7 h-3.5 rounded-full transition-all flex-shrink-0", on ? "bg-violet-500" : "bg-slate-200")}>
          <span className={cn("absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all", on ? "left-[14px]" : "left-0.5")} />
        </div>
        <span className={cn("text-[10px] font-medium", on ? "text-violet-700" : "text-slate-500")}>{label}</span>
      </label>
      {info && <InfoTooltip text={info} />}
    </div>
  );
}

// ─── LocationRadiusSlider ─────────────────────────────────────────────────────
function LocationRadiusSlider({ value, onChange }: {
  value: number | ""; onChange: (v: number | "") => void;
}) {
  const numVal = value === "" ? 0 : Number(value);
  const pct = (numVal / 500) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-violet-600">
          {numVal > 0 ? `${numVal} miles` : "Off"}
        </span>
        {numVal > 0 && (
          <button type="button" onClick={() => onChange("")}
            className="text-[9px] text-slate-400 hover:text-red-400 transition-colors flex items-center gap-0.5">
            <X size={8} /> Clear
          </button>
        )}
      </div>
      <input
        type="range" min={0} max={500} step={5} value={numVal}
        onChange={e => { const v = Number(e.target.value); onChange(v === 0 ? "" : v); }}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-violet-600 [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-white
          [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-violet-600
          [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
          [&::-moz-range-thumb]:cursor-pointer"
        style={{ background: `linear-gradient(to right, #7c3aed ${pct}%, #e2e8f0 ${pct}%)` }}
      />
      <div className="flex justify-between text-[8px] text-slate-400 px-0.5">
        <span>Off</span>
        <span>100</span>
        <span>250</span>
        <span>500 mi</span>
      </div>
      {numVal > 0 && (
        <p className="text-[8px] text-amber-600 flex items-center gap-1">
          <AlertCircle size={8} className="flex-shrink-0" />
          Radius only works when a city-level location is selected above
        </p>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
function isValidLinkedInUrl(url: string): boolean { return /linkedin\.com\/in\//i.test(url.trim()); }
type SearchProvider = "rocketreach" | "contactout";
interface RRSearchSidebarProps {
  filters: RRFilters; provider?: SearchProvider; onChange: (patch: Partial<RRFilters>) => void;
  onClearAll: () => void; onSearch: () => void; isLoading: boolean;
  totalEntries: number; filterCount: number; hasFilters: boolean;
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────
export const RRSearchSidebar: React.FC<RRSearchSidebarProps> = ({
  filters, provider = "rocketreach", onChange, onClearAll, onSearch,
  isLoading, totalEntries, filterCount, hasFilters,
}) => {
  // Core Filters is now first and open by default
  const [open, setOpen] = useState({ core: true, location: false, role: false, education: false, languages: false });
  const toggle = (k: keyof typeof open) => setOpen(prev => ({ ...prev, [k]: !prev[k] }));

  const [showExcludeTitles,    setShowExcludeTitles]    = useState(false);
  const [showExcludeCompanies, setShowExcludeCompanies] = useState(false);

  useEffect(() => { if (filters.excludeJobTitles.length > 0) setShowExcludeTitles(true); },    [filters.excludeJobTitles.length]);
  useEffect(() => { if (filters.excludeCompanies.length  > 0) setShowExcludeCompanies(true); }, [filters.excludeCompanies.length]);

  const s   = filters;
  const set = (patch: Partial<RRFilters>) => onChange(patch);
  const isCO = provider === "contactout";

  const enrichMode  = isCO && isValidLinkedInUrl(s.linkedinUrl ?? "");
  const matchExpSet = !!s.matchExperience;
  const urlValue    = s.linkedinUrl ?? "";

  const companyLabel = isCO && s.companyFilter === "past" ? "Previous Employer"
    : isCO && s.companyFilter === "both" ? "Any Employer" : "Current Employer";
  const companyPlaceholder = isCO && s.companyFilter === "past" ? "Past company, Enter…"
    : isCO && s.companyFilter === "both" ? "Any company, Enter…" : "Add company, Enter…";

  // All counts merged into core
  const coreCnt =
    s.titles.length + s.excludeJobTitles.length +
    (!s.currentTitlesOnly ? 1 : 0) + (s.includeRelatedJobTitles ? 1 : 0) +
    (s.matchExperience ? 1 : 0) +
    s.currentEmployer.length + s.excludeCompanies.length +
    s.domain.length + s.companyIndustry.length +
    (s.companyFilter !== "current" ? 1 : 0) +
    s.skillChips.length + (s.openToWork ? 1 : 0) +
    (s.yearsExperience ? 1 : 0) + (s.yearsInCurrentRole ? 1 : 0) +
    (s.recentlyChangedJobs ? 1 : 0);

  const locationCnt = s.locations.length + (s.locationRadius ? 1 : 0) +
    s.currentWorkLocation.length + s.pastWorkLocation.length;
  const roleCnt  = s.previousEmployer.length + s.previousTitle.length;
  const eduCnt   = s.school.length + s.degree.length + s.major.length;
  const langCnt  = s.languages.length;

  const canRun = enrichMode ? !isLoading : (hasFilters && !isLoading);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100">
      <GradientDef />

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserSearch size={12} className="text-purple-600" />
            <span className="text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-purple-600">People Search</span>
            {enrichMode && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-gradient-to-r from-violet-600 to-pink-500 text-white">
                <Zap size={7} className="fill-white" /> Enrich Mode
              </span>
            )}
            {isLoading && <Loader2 size={11} className="animate-spin text-slate-400" />}
          </div>
          {(hasFilters || urlValue) && (
            <button type="button" onClick={() => { onClearAll(); setShowExcludeTitles(false); setShowExcludeCompanies(false); }}
              className="flex items-center gap-1 text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              <RotateCcw size={9} /> Reset
            </button>
          )}
        </div>

        {/* LinkedIn URL — CO only */}
        {isCO && (
          <div className="mb-3">
            <div className={cn("rounded-lg p-[1px] transition-all",
              enrichMode ? "bg-gradient-to-r from-violet-600 to-pink-500"
              : urlValue && !enrichMode ? "bg-red-300"
              : "bg-slate-200 focus-within:bg-gradient-to-r focus-within:from-purple-600 focus-within:to-pink-600")}>
              <div className="relative bg-white rounded-lg flex items-center">
                <ImLinkedin size={16} className={cn("absolute left-2.5 top-1/2 -translate-y-1/2", "text-blue-600")} />
                <input type="text" placeholder="Paste LinkedIn URL...." value={urlValue}
                  onChange={e => set({ linkedinUrl: e.target.value })}
                  onKeyDown={e => { if (e.key === "Enter" && enrichMode) { e.preventDefault(); onSearch(); } }}
                  className="w-full h-8 pl-9 pr-7 rounded-lg text-[11px] text-slate-700 placeholder:text-[10px] placeholder:text-slate-600 placeholder:italic placeholder:pl-1 bg-transparent border-none outline-none" />
                {urlValue && <button type="button" onClick={() => set({ linkedinUrl: "" })} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400"><X size={10} /></button>}
              </div>
            </div>
            {urlValue && !enrichMode && <p className="text-[9px] text-red-400 mt-1 px-1">Enter a valid linkedin.com/in/… URL</p>}
            {enrichMode && <p className="text-[9px] text-violet-500 mt-1 px-1 flex items-center gap-1"><Zap size={8} className="fill-violet-500" />Filters disabled — searching by URL only</p>}
          </div>
        )}

        {/* Keyword */}
        {!enrichMode && (
          <div className="rounded-lg p-[1px] bg-slate-200 focus-within:bg-gradient-to-r focus-within:from-purple-600 focus-within:to-pink-600 transition-all mb-3">
            <div className="relative bg-white rounded-lg">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Keyword search…" value={s.keyword}
                onChange={e => set({ keyword: e.target.value })}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onSearch(); } }}
                className="w-full h-8 pl-7 pr-3 rounded-lg text-[11px] text-slate-600 placeholder:text-[10px] placeholder:text-slate-600 placeholder:italic placeholder:pl-1 bg-transparent border-none outline-none" />
            </div>
          </div>
        )}

        <button type="button" onClick={onSearch} disabled={!canRun}
          className={cn("w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold transition-all",
            canRun ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 shadow-sm"
                   : "bg-slate-100 text-slate-400 cursor-not-allowed")}>
          {isLoading
            ? <><Loader2 size={12} className="animate-spin" />{enrichMode ? "Enriching…" : "Searching…"}</>
            : enrichMode
              ? <><Zap size={11} className="fill-current" />Enrich Profile</>
              : <><Play size={11} className="fill-current" />Run Search</>}
        </button>
      </div>

      {/* Filter sections */}
      <ScrollArea className="flex-1 min-h-0">
        <div className={cn("px-4", enrichMode && "opacity-40 pointer-events-none select-none")}>
          {enrichMode && <div className="flex items-center gap-2 py-2.5 text-[10px] text-slate-400"><Lock size={10} />Filters not used in URL lookup</div>}

          {/* ══════════════════════════════════════════════════════════════
              CORE FILTERS — at top, merged (title + company + skills + years)
          ══════════════════════════════════════════════════════════════ */}
          <SectionHeader label="Core Filters" icon={Filter} isOpen={open.core}
            onToggle={() => toggle("core")} count={coreCnt} hasActive={coreCnt > 0}
            locked={enrichMode} info="Job title, company, skills, and core filters." />

          {open.core && !enrichMode && (
            <div className="pb-3 space-y-3">


              {/* ── SKILLS ── */}
              <div>
                <SL info="Must = required. Nice = score booster. Exclude = remove from results. Click a chip to cycle modes.">Skills</SL>
                <SkillChipBuilder chips={s.skillChips} onChange={v => set({ skillChips: v })} onSearch={onSearch} />
              </div>

              {/* ── OTW — CO only ── */}
              {isCO && (
                <Toggle on={s.openToWork} onToggle={() => set({ openToWork: !s.openToWork })} label="Open to Work"
                  info="Shows only profiles with the 'Open to Work' status set on LinkedIn." />
              )}

              {/* ── YEARS OF EXP ── */}
              <div>
                <SL info="Filter by total career experience, calculated from the earliest start date across all experience entries.">Years of Experience</SL>
                <SimpleSelect value={s.yearsExperience} onChange={v => set({ yearsExperience: v })} options={YEARS_EXP_OPTIONS} placeholder="Any experience" />
              </div>

              {/* ── YEARS IN CURRENT ROLE — CO only ── */}
              {isCO && (
                <div>
                  <SL info="Filter by how long the person has been in their current role.">Years in Current Role</SL>
                  <SimpleSelect value={s.yearsInCurrentRole} onChange={v => set({ yearsInCurrentRole: v })} options={YEARS_ROLE_OPTIONS} placeholder="Any duration" />
                </div>
              )}

              <Div />

              {/* ── MATCH EXPERIENCE — CO only ── */}
              {isCO && (
                <div>
                  <SL info="Ensures job title and company match in the same experience entry. When set, the API disables 'Current titles only' and the company filter tab.">Match Experience</SL>
                  <SimpleSelect value={s.matchExperience} onChange={v => set({ matchExperience: v as any })}
                    options={[
                      { label: "Not set (default)", value: "" },
                      { label: "Current experience", value: "current" },
                      { label: "Past experience", value: "past" },
                      { label: "Current & past (both)", value: "both" },
                    ]} placeholder="Not set" />
                  {matchExpSet && (
                    <p className="text-[8px] text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={8} className="flex-shrink-0" />
                      "Current titles only" and "Company filter" disabled when Match Experience is set
                    </p>
                  )}
                </div>
              )}

              {/* ── JOB TITLE ── */}
              <div>
                <SL info="Filter by current job title. Partial match — 'Engineer' matches 'Software Engineer'.">Job Title</SL>
                <TagInput selected={s.titles} onChange={v => set({ titles: v })} onSearch={onSearch}
                  placeholder="e.g. Software Engineer, Enter…" icon={Briefcase} />

                {isCO && !matchExpSet && (
                  <div className="mt-2 space-y-1.5">
                    <Toggle on={s.currentTitlesOnly} onToggle={() => set({ currentTitlesOnly: !s.currentTitlesOnly })}
                      label="Current titles only"
                      info="ON = match only current job title. OFF = also search past titles (merges with Previous Title in Role Details)." />
                    <Toggle on={s.includeRelatedJobTitles} onToggle={() => set({ includeRelatedJobTitles: !s.includeRelatedJobTitles })}
                      label="Include related titles"
                      info="Also returns profiles with related job titles. e.g. 'Software Engineer' may also return 'Senior Software Engineer'." />
                  </div>
                )}

                <div className="mt-2">
                  {(showExcludeTitles || s.excludeJobTitles.length > 0) ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-semibold text-red-500 uppercase tracking-wide flex items-center gap-1"><Minus size={8} />Exclude Titles</span>
                        <InfoTooltip text="Profiles with any of these job titles are removed from results." />
                        {s.excludeJobTitles.length === 0 && <button type="button" onClick={() => setShowExcludeTitles(false)} className="ml-auto text-[8px] text-slate-400 hover:text-slate-600">Hide</button>}
                      </div>
                      <ExcludeInput selected={s.excludeJobTitles} onChange={v => set({ excludeJobTitles: v })} placeholder="Exclude title, Enter…" />
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowExcludeTitles(true)}
                      className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-red-500 transition-colors mt-1">
                      <Minus size={9} className="text-red-400" /> Add title exclusions
                    </button>
                  )}
                </div>
              </div>

              <Div />

              {/* ── COMPANY ── */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-purple-600 whitespace-nowrap">{companyLabel}</p>
                    <InfoTooltip text={
                      s.companyFilter === "past" ? "Searches past experience entries for this company name."
                      : s.companyFilter === "both" ? "Matches if company appears in current employer OR any past experience (OR logic)."
                      : "Matches the profile's current employer name."} />
                  </div>
                  {/* Company filter tab [Current | Prev | Both] — CO only */}
                  {isCO && !matchExpSet && (
                    <div className="flex text-[8px] font-semibold flex-shrink-0 gap-0.5">
                      {(["current","past","both"] as const).map(mode => (
                        <button key={mode} type="button" onClick={() => set({ companyFilter: mode })}
                          title={mode === "current" ? "Current employer only" : mode === "past" ? "Previous employer only" : "Current or any past employer (OR)"}
                          className={cn("px-2 py-1 capitalize transition-all rounded-xl",
                            s.companyFilter === mode ? "bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 text-white" : "bg-white text-slate-500 hover:bg-violet-50 hover:text-violet-600")}>
                          {mode === "past" ? "Prev" : mode}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <TagInput selected={s.currentEmployer} onChange={v => set({ currentEmployer: v })} onSearch={onSearch}
                  placeholder={companyPlaceholder} icon={Building2} chipColor="bg-blue-50 text-blue-700 border-blue-200" />

                <div className="mt-2">
                  {(showExcludeCompanies || s.excludeCompanies.length > 0) ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-semibold text-red-500 uppercase tracking-wide flex items-center gap-1"><Minus size={8} />Exclude Companies</span>
                        <InfoTooltip text="Profiles from these companies are removed. Scope is controlled by 'Exclude scope' below." />
                        {s.excludeCompanies.length === 0 && <button type="button" onClick={() => setShowExcludeCompanies(false)} className="ml-auto text-[8px] text-slate-400">Hide</button>}
                      </div>
                      <ExcludeInput selected={s.excludeCompanies} onChange={v => set({ excludeCompanies: v })} placeholder="Exclude company, Enter…" />
                      {s.excludeCompanies.length > 0 && isCO && (
                        <div className="mt-1">
                          <SL info="Controls which experience entries are checked. 'Both' excludes if company appears in any experience.">Exclude scope</SL>
                          <SimpleSelect value={s.excludeCompaniesFilter} onChange={v => set({ excludeCompaniesFilter: v as any })}
                            options={[{ label: "Current or past (both)", value: "both" }, { label: "Current only", value: "current" }, { label: "Past only", value: "past" }]} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowExcludeCompanies(true)}
                      className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-red-500 transition-colors mt-1">
                      <Minus size={9} className="text-red-400" /> Add company exclusions
                    </button>
                  )}
                </div>
              </div>

              {/* ── DOMAIN — CO only ── */}
              {isCO && (
                <div>
                  <SL info="Filter by the company's website domain (e.g. google.com). Exact match against the company_domain field.">Domain</SL>
                  <TagInput selected={s.domain} onChange={v => set({ domain: v })} onSearch={onSearch}
                    placeholder="e.g. google.com, Enter…" icon={Globe2} chipColor="bg-teal-50 text-teal-700 border-teal-200" />
                </div>
              )}

              {/* ── INDUSTRY ── */}
              <div>
                <SL info="Filter by the company's industry. Uses ContactOut's industry classification.">Industry</SL>
                <SearchableMultiSelect label="Search industries…" options={CO_INDUSTRIES} selected={s.companyIndustry}
                  onChange={v => set({ companyIndustry: v })} onSearch={onSearch} icon={Building2}
                  chipColor="bg-indigo-50 text-indigo-700 border-indigo-200" />
              </div>
            </div>
          )}

          <Div />

          {/* ══════════════════════════════════════════════════════════════
              LOCATION — radius slider always visible for CO
          ══════════════════════════════════════════════════════════════ */}
          <SectionHeader label="Location" icon={MapPin} isOpen={open.location}
            onToggle={() => toggle("location")} count={locationCnt} hasActive={locationCnt > 0}
            locked={enrichMode} info="Filter by current location, work location, or search radius." />

          {open.location && !enrichMode && (
            <div className="pb-3 space-y-3">
              <div>
                <SL info="Filter by country, state, or city. Searches the profile's stated location.">Location</SL>
                <LocationSelect selected={s.locations} onChange={v => set({ locations: v })} onSearch={onSearch} />
              </div>

              {/* Radius slider — CO only, always shown */}
              {isCO && (
                <div>
                  <SL info="Search radius around a city. Drag to set miles (0 = off). Only active when a city-level location is selected above.">
                    Search Radius
                  </SL>
                  <LocationRadiusSlider
                    value={s.locationRadius}
                    onChange={v => set({ locationRadius: v })} />
                </div>
              )}

              {isCO && (
                <div>
                  <SL info="Filter by where the person currently works. Useful when their office location differs from home. Uses country/state/city library.">Current Work Location</SL>
                  <LocationSelect selected={s.currentWorkLocation} onChange={v => set({ currentWorkLocation: v })} onSearch={onSearch} />
                </div>
              )}

              {isCO && (
                <div>
                  <SL info="Filter by locations where the person worked in the past. Searches non-current experience entries. Uses country/state/city library.">Past Work Location</SL>
                  <LocationSelect selected={s.pastWorkLocation} onChange={v => set({ pastWorkLocation: v })} onSearch={onSearch} />
                </div>
              )}
            </div>
          )}

          <Div />

          {/* ══════════════════════════════════════════════════════════════
              ROLE DETAILS — unchanged
          ══════════════════════════════════════════════════════════════ */}
          <SectionHeader label="Role Details" icon={Briefcase} isOpen={open.role}
            onToggle={() => toggle("role")} count={roleCnt} hasActive={roleCnt > 0}
            locked={enrichMode} info="Previous employer and previous job title. For ContactOut, these are merged into the main search with past-mode filtering." />

          {open.role && !enrichMode && (
            <div className="pb-3 space-y-3">
              <div>
                <SL info="For ContactOut: mapped to company search with 'past' mode. For RocketReach: uses the previous_employer API param.">Previous Employer</SL>
                <TagInput selected={s.previousEmployer} onChange={v => set({ previousEmployer: v })} onSearch={onSearch}
                  placeholder="Past company, Enter…" icon={Building2} chipColor="bg-slate-100 text-slate-700 border-slate-200" />
              </div>
              <div>
                <SL info="For ContactOut: merged into job_title search with current_titles_only=false. For RocketReach: uses previous_title param.">Previous Title</SL>
                <TagInput selected={s.previousTitle} onChange={v => set({ previousTitle: v })} onSearch={onSearch}
                  placeholder="Past title, Enter…" icon={Briefcase} chipColor="bg-slate-100 text-slate-700 border-slate-200" />
              </div>
            </div>
          )}

          <Div />

          {/* ══════════════════════════════════════════════════════════════
              EDUCATION — unchanged
          ══════════════════════════════════════════════════════════════ */}
          <SectionHeader label="Education" icon={GraduationCap} isOpen={open.education}
            onToggle={() => toggle("education")} count={eduCnt} hasActive={eduCnt > 0}
            locked={enrichMode} info="Filter by school, degree type, or field of study." />

          {open.education && !enrichMode && (
            <div className="pb-3 space-y-3">
              <div>
                <SL info="Filter by university or school name. Partial match — 'MIT' matches 'Massachusetts Institute of Technology'.">School / University</SL>
                <TagInput selected={s.school} onChange={v => set({ school: v })} onSearch={onSearch}
                  placeholder="e.g. IIT Bombay, Enter…" icon={GraduationCap} chipColor="bg-green-50 text-green-700 border-green-200" />
              </div>
              <div>
                <SL info="Filter by degree type.">Degree</SL>
                <SearchableMultiSelect label="Search degrees…"
                  options={["Bachelor's","Master's","MBA","PhD","Associate's","JD","MD","B.Tech","M.Tech","BCA","MCA"]}
                  selected={s.degree} onChange={v => set({ degree: v })} onSearch={onSearch}
                  icon={GraduationCap} chipColor="bg-green-50 text-green-700 border-green-200" />
              </div>
              <div>
                <SL info="Filter by field of study or major.">Major / Field</SL>
                <TagInput selected={s.major} onChange={v => set({ major: v })} onSearch={onSearch}
                  placeholder="e.g. Computer Science, Enter…" icon={GraduationCap} chipColor="bg-green-50 text-green-700 border-green-200" />
              </div>
            </div>
          )}

          <Div />

          {/* ══════════════════════════════════════════════════════════════
              LANGUAGES — new
          ══════════════════════════════════════════════════════════════ */}
          <SectionHeader label="Languages" icon={Globe2} isOpen={open.languages}
            onToggle={() => toggle("languages")} count={langCnt} hasActive={langCnt > 0}
            locked={enrichMode} info="Filter by spoken language and optionally proficiency level." />

          {open.languages && !enrichMode && (
            <div className="pb-3">
              <p className="text-[9px] text-slate-400 mb-2 leading-relaxed">Multiple languages = AND match (profile must know all).</p>
              <LanguageBuilder entries={s.languages} onChange={v => set({ languages: v })} />
            </div>
          )}

          <div className="h-4" />
        </div>
      </ScrollArea>

      {/* Status bar */}
      <div className="flex-shrink-0 px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full",
            isLoading ? "bg-amber-400 animate-pulse" : enrichMode ? "bg-violet-500 animate-pulse"
            : hasFilters ? "bg-emerald-400" : "bg-slate-300")} />
          <span className="text-[10px] text-slate-500">
            {isLoading ? (enrichMode ? "Enriching profile…" : "Searching…")
             : enrichMode ? "URL enrich mode active"
             : hasFilters ? `${filterCount} filter${filterCount !== 1 ? "s" : ""} active`
             : "Set filters to search"}
          </span>
        </div>
      </div>
    </div>
  );
};