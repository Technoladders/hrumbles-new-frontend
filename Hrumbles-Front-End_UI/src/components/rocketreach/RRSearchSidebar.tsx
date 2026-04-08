// src/components/RocketReachSearch/components/RRSearchSidebar.tsx
// Mirrors SearchSidebar.tsx design exactly:
//   - Same gradient header, same font, same section labels
//   - SKILLS at the top (Boolean chip builder)
//   - Job Title, Seniority (management_levels), Location, Company below
//   - Auto-triggers search debounced 600ms on change
//   - PortalDropdown for location (prevents ScrollArea clipping)

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Country, State, City } from "country-state-city";
import {
  Search, UserSearch, RotateCcw, Loader2, X, Plus, Check,
  MapPin, Briefcase, Building2, ChevronDown, Code2,
} from "lucide-react";
import type { SkillChip, SkillMode } from "./types";

// ─── Gradient SVG def ────────────────────────────────────────────────────────
const GradientDef = () => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    <defs>
      <linearGradient id="rr-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#9333ea" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
  </svg>
);

// ─── Section label ────────────────────────────────────────────────────────────
const SLabel: React.FC<{ children: React.ReactNode; count?: number }> = ({ children, count }) => (
  <div className="flex items-center justify-between mb-2">
    <span className="text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
      {children}
    </span>
    {!!count && (
      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        {count}
      </span>
    )}
  </div>
);

// ─── Portal dropdown ──────────────────────────────────────────────────────────
function PortalDropdown({ anchorRef, isOpen, maxH = 260, children }: {
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
        const w = Math.max(r.width, 220);
        const left = Math.min(r.left, window.innerWidth - w - 8);
        const goUp = window.innerHeight - r.bottom < maxH && r.top > maxH;
        setStyle({
          position: "fixed", left: Math.max(4, left), width: w, zIndex: 99999, maxHeight: maxH,
          ...(goUp ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
        });
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [isOpen, anchorRef, maxH]);
  if (!isOpen) return null;
  return ReactDOM.createPortal(
    <div style={style} className="bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
      {children}
    </div>,
    document.body
  );
}

// ─── Chip tag ─────────────────────────────────────────────────────────────────
const ChipTag: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[10px] font-medium bg-white border-[1px] text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 [border-image:linear-gradient(to_right,#9333ea,#ec4899)_1]">
    {label}
    <button type="button" onClick={onRemove}
      className="flex items-center text-slate-400 hover:text-red-400 transition-colors">
      <X size={8} />
    </button>
  </span>
);

// ─── Skill chip builder (at the top) ─────────────────────────────────────────
const SKILL_MODE_CONFIG: Record<SkillMode, { label: string; dot: string; chip: string }> = {
  must:    { label: "Must",    dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700 border-violet-200" },
  nice:    { label: "Nice",    dot: "bg-blue-400",   chip: "bg-blue-50 text-blue-700 border-blue-200" },
  exclude: { label: "Exclude", dot: "bg-red-400",    chip: "bg-red-50 text-red-600 border-red-200" },
};

const SkillChipBuilder: React.FC<{ chips: SkillChip[]; onChange: (c: SkillChip[]) => void }> = ({ chips, onChange }) => {
  const [input,    setInput]    = useState("");
  const [mode,     setMode]     = useState<SkillMode>("must");
  const [showBool, setShowBool] = useState(false);
  const [boolIn,   setBoolIn]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addChips = (raw: string, m: SkillMode) => {
    const labels = raw.split(",").map(s => s.trim()).filter(Boolean);
    const existing = new Set(chips.map(c => c.label.toLowerCase()));
    const next = labels.filter(l => !existing.has(l.toLowerCase())).map(l => ({ label: l, mode: m }));
    if (next.length) onChange([...chips, ...next]);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault(); addChips(input, mode); setInput("");
    }
    if (e.key === "Backspace" && !input && chips.length) onChange(chips.slice(0, -1));
  };

  const applyBoolean = () => {
    if (!boolIn.trim()) return;
    const raw = boolIn.replace(/\bAND\b/gi, " ").replace(/\bOR\b/gi, " ");
    const parts = raw.split(/\s+/).filter(Boolean);
    const must: string[] = [], nice: string[] = [], exclude: string[] = [];
    let skipNext = false;
    for (let i = 0; i < parts.length; i++) {
      if (skipNext) { skipNext = false; continue; }
      const cur = parts[i], next = parts[i + 1];
      if (/^NOT$/i.test(cur) && next) { exclude.push(next.replace(/^-/, "")); skipNext = true; }
      else if (cur.startsWith("-") && cur.length > 1) exclude.push(cur.slice(1));
      else if (/^MUST:/i.test(cur)) must.push(cur.slice(5));
      else if (!/^(AND|OR|NOT)$/i.test(cur)) nice.push(cur);
    }
    const existing = new Set(chips.map(c => c.label.toLowerCase()));
    onChange([...chips,
      ...must.filter(l => !existing.has(l.toLowerCase())).map(l => ({ label: l, mode: "must" as SkillMode })),
      ...nice.filter(l => !existing.has(l.toLowerCase())).map(l => ({ label: l, mode: "nice" as SkillMode })),
      ...exclude.filter(l => !existing.has(l.toLowerCase())).map(l => ({ label: l, mode: "exclude" as SkillMode })),
    ]);
    setBoolIn(""); setShowBool(false);
  };

  const cycleMode = (idx: number) => {
    const order: SkillMode[] = ["must", "nice", "exclude"];
    const next = order[(order.indexOf(chips[idx].mode) + 1) % order.length];
    onChange(chips.map((c, i) => i === idx ? { ...c, mode: next } : c));
  };

  const counts = {
    must:    chips.filter(c => c.mode === "must").length,
    nice:    chips.filter(c => c.mode === "nice").length,
    exclude: chips.filter(c => c.mode === "exclude").length,
  };

  return (
    <div className="space-y-1.5">
      {/* Mode selector + AND/NOT */}
      <div className="flex items-center gap-1">
        {(["must", "nice", "exclude"] as SkillMode[]).map(m => {
          const cfg = SKILL_MODE_CONFIG[m];
          return (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all",
                mode === m ? `${cfg.chip} border-current` : "text-slate-400 border-slate-200 bg-white hover:border-slate-300")}>
              <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
              {cfg.label}
              {counts[m] > 0 && <span className="opacity-70">({counts[m]})</span>}
            </button>
          );
        })}
        <button type="button" onClick={() => setShowBool(v => !v)}
          className={cn("ml-auto text-[9px] px-1.5 py-0.5 rounded border transition-colors",
            showBool ? "bg-slate-700 text-white border-slate-700" : "text-slate-400 border-slate-200 bg-white")}>
          AND/NOT
        </button>
      </div>

      {/* Boolean input */}
      {showBool && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-1.5">
          <p className="text-[8px] text-slate-400">
            e.g. <span className="text-violet-500">Python AND React NOT PHP</span> · <span className="text-violet-500">MUST:Python</span>
          </p>
          <div className="flex gap-1">
            <input type="text" value={boolIn} onChange={e => setBoolIn(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applyBoolean()} placeholder="Python AND React NOT PHP"
              className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] focus:outline-none focus:border-violet-400" />
            <button type="button" onClick={applyBoolean}
              className="px-2 py-1 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold">
              Parse
            </button>
          </div>
        </div>
      )}

      {/* Chip input box */}
      <div onClick={() => inputRef.current?.focus()}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 flex flex-wrap gap-1 min-h-[34px] cursor-text focus-within:border-violet-400 transition-colors">
        {chips.map((chip, i) => {
          const cfg = SKILL_MODE_CONFIG[chip.mode];
          return (
            <span key={i} onClick={() => cycleMode(i)}
              className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium cursor-pointer", cfg.chip)}
              title={`Click to cycle mode`}>
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
              {chip.label}
              <button type="button" onClick={e => { e.stopPropagation(); onChange(chips.filter((_, j) => j !== i)); }}
                className="ml-0.5 opacity-60 hover:opacity-100">×</button>
            </span>
          );
        })}
        <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey} placeholder={chips.length === 0 ? "Type skill, Enter…" : ""}
          className="flex-1 min-w-[60px] bg-transparent text-[11px] text-slate-700 placeholder-slate-300 focus:outline-none" />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-[8px] text-slate-400">
        {(["must","nice","exclude"] as SkillMode[]).map(m => (
          <span key={m} className="flex items-center gap-0.5">
            <span className={cn("w-1.5 h-1.5 rounded-full", SKILL_MODE_CONFIG[m].dot)} />
            {m === "must" ? "strict" : m === "nice" ? "boost" : "exclude"}
          </span>
        ))}
        <span className="ml-auto">click chip to cycle</span>
      </div>
    </div>
  );
};

// ─── Location multi-select ────────────────────────────────────────────────────
type LocType = "country" | "state" | "city";
interface LocOpt { value: string; label: string; type: LocType; }
const LOC_STYLE: Record<LocType, string> = {
  country: "bg-blue-50 text-blue-700 border-blue-200",
  state:   "bg-orange-50 text-orange-700 border-orange-200",
  city:    "bg-purple-50 text-purple-700 border-purple-200",
};
const ALL_COUNTRIES: LocOpt[] = Country.getAllCountries().map(c => ({ value: c.name, label: `${c.flag ?? ""} ${c.name}`.trim(), type: "country" }));
const ALL_STATES: LocOpt[] = State.getAllStates().map(s => ({ value: s.name, label: s.name, type: "state" }));
const POPULAR_COUNTRIES = ["India","United States","United Kingdom","Canada","Australia","Germany","Singapore","UAE","France","Netherlands"];
function searchLocs(q: string, selected: string[]): LocOpt[] {
  const lq = q.toLowerCase().trim();
  if (!lq) return ALL_COUNTRIES.filter(c => POPULAR_COUNTRIES.includes(c.value) && !selected.includes(c.value)).slice(0, 10);
  const out: LocOpt[] = [];
  ALL_COUNTRIES.filter(c => c.value.toLowerCase().includes(lq) && !selected.includes(c.value)).slice(0, 6).forEach(c => out.push(c));
  ALL_STATES.filter(s => s.value.toLowerCase().includes(lq) && !selected.includes(s.value)).slice(0, 5).forEach(s => out.push(s));
  if (lq.length >= 3) City.getAllCities().filter(c => c.name.toLowerCase().includes(lq) && !selected.includes(c.name)).slice(0, 8).forEach(c => out.push({ value: c.name, label: c.name, type: "city" }));
  return out.slice(0, 20);
}
function getLocType(val: string): LocType {
  if (ALL_COUNTRIES.some(c => c.value === val)) return "country";
  if (ALL_STATES.some(s => s.value === val)) return "state";
  return "city";
}

function LocationSelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const options = useMemo(() => searchLocs(q, selected), [q, selected]);
 
  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
 
  const handleOptionMouseDown = (opt: LocOpt, e: React.MouseEvent) => {
    // Prevent the document mousedown handler from firing and closing the dropdown
    e.preventDefault();
    e.stopPropagation();
    onChange([...selected, opt.value]);
    setQ("");
    // Keep dropdown open so user can add more
    setTimeout(() => inputRef.current?.focus(), 50);
  };
 
  return (
    <div ref={wrapRef} className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(val => {
            const t = getLocType(val);
            return (
              <span key={val} className={cn("inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[10px] font-medium border", LOC_STYLE[t])}>
                {val}
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onChange(selected.filter(x => x !== val)); }}
                >
                  <X size={8} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div ref={anchorRef}>
        <div
          className="rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8"
          onMouseDown={e => { e.stopPropagation(); }}
          onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        >
          <MapPin size={10} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Country, state or city…"
            className="flex-1 bg-transparent text-[11px] text-slate-600 placeholder-slate-400 focus:outline-none"
          />
          {q && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setQ(""); }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={9} />
            </button>
          )}
        </div>
 
        <PortalDropdown anchorRef={anchorRef} isOpen={open && options.length > 0}>
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                // Use onMouseDown instead of onClick to fire BEFORE document mousedown
                onMouseDown={e => handleOptionMouseDown(opt, e)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-violet-50 text-left transition-colors"
              >
                <span className={cn("text-[8px] px-1 py-0.5 rounded border font-semibold", LOC_STYLE[opt.type])}>
                  {opt.type[0].toUpperCase()}
                </span>
                <span className="text-[11px] text-slate-700 truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </PortalDropdown>
      </div>
    </div>
  );
}

// ─── Title multi-select (free text + Enter) ───────────────────────────────────
function TitleSelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (!selected.includes(input.trim())) onChange([...selected, input.trim()]);
      setInput("");
    }
    if (e.key === "Backspace" && !input && selected.length) onChange(selected.slice(0, -1));
  };
  return (
    <div className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(t => <ChipTag key={t} label={t} onRemove={() => onChange(selected.filter(x => x !== t))} />)}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8">
        <Briefcase size={10} className="text-slate-400 flex-shrink-0" />
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Type title, Enter to add…"
          className="flex-1 bg-transparent text-[11px] text-slate-600 placeholder-slate-400 focus:outline-none" />
      </div>
    </div>
  );
}

// ─── Company select ───────────────────────────────────────────────────────────
function CompanySelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (!selected.includes(input.trim())) onChange([...selected, input.trim()]);
      setInput("");
    }
    if (e.key === "Backspace" && !input && selected.length) onChange(selected.slice(0, -1));
  };
  return (
    <div className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(c => <ChipTag key={c} label={c} onRemove={() => onChange(selected.filter(x => x !== c))} />)}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8">
        <Building2 size={10} className="text-slate-400 flex-shrink-0" />
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Type company, Enter to add…"
          className="flex-1 bg-transparent text-[11px] text-slate-600 placeholder-slate-400 focus:outline-none" />
      </div>
    </div>
  );
}

// ─── Management level pills ───────────────────────────────────────────────────
const MGMT_LEVELS = ["Entry", "Senior", "Manager", "Director", "VP", "C-Suite", "Owner"];
function MgmtLevelSelect({ selected, onChange }: { selected: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {MGMT_LEVELS.map(l => {
        const active = selected.includes(l);
        return (
          <button key={l} type="button" onClick={() => onChange(l)}
            className={cn(
              "px-2 py-0.5 rounded-full text-[9px] font-semibold border transition-all",
              active
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent"
                : "bg-white text-slate-500 border-slate-200 hover:border-violet-300"
            )}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

// ─── Advanced section ─────────────────────────────────────────────────────────
function SimpleTextInput({ value, onChange, placeholder, icon: Icon }: {
  value: string; onChange: (v: string) => void; placeholder: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8">
      <Icon size={10} className="text-slate-400 flex-shrink-0" />
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 bg-transparent text-[11px] text-slate-600 placeholder-slate-400 focus:outline-none" />
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
interface RRSearchSidebarProps {
  // Filter state
  name:             string;
  titles:           string[];
  locations:        string[];
  currentEmployer:  string[];
  keyword:          string;
  skillChips:       SkillChip[];
  managementLevels: string[];
  department:       string;
  companyIndustry:  string;
  companySize:      string;
  orderBy:          "popularity" | "relevance";
  pageSize:         number;
  // Setters
  onSetName:            (v: string) => void;
  onSetTitles:          (v: string[]) => void;
  onSetLocations:       (v: string[]) => void;
  onSetCurrentEmployer: (v: string[]) => void;
  onSetKeyword:         (v: string) => void;
  onSetSkillChips:      (v: SkillChip[]) => void;
  onToggleMgmtLevel:    (v: string) => void;
  onSetDepartment:      (v: string) => void;
  onSetCompanyIndustry: (v: string) => void;
  onSetCompanySize:     (v: string) => void;
  onSetOrderBy:         (v: "popularity" | "relevance") => void;
  onSetPageSize:        (v: number) => void;
  onClearAll:           () => void;
  // Status
  isLoading:    boolean;
  totalEntries: number;
  filterCount:  number;
  hasFilters:   boolean;
}

export const RRSearchSidebar: React.FC<RRSearchSidebarProps> = ({
  name, titles, locations, currentEmployer, keyword, skillChips,
  managementLevels, department, companyIndustry, companySize, orderBy, pageSize,
  onSetName, onSetTitles, onSetLocations, onSetCurrentEmployer, onSetKeyword,
  onSetSkillChips, onToggleMgmtLevel, onSetDepartment, onSetCompanyIndustry,
  onSetCompanySize, onSetOrderBy, onSetPageSize, onClearAll,
  isLoading, totalEntries, filterCount, hasFilters,
}) => {
  const [showAdv, setShowAdv] = useState(false);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-150">
      <GradientDef />

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserSearch size={12} style={{ stroke: "url(#rr-gradient)" }} />
            <span className="text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Search Profiles
            </span>
            {isLoading && <Loader2 size={11} className="animate-spin text-slate-400" />}
          </div>
          {hasFilters && (
            <button type="button" onClick={onClearAll}
              className="flex items-center gap-1 text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              <RotateCcw size={9} /> Reset
            </button>
          )}
        </div>

        {/* Result count */}
        {totalEntries > 0 && (
          <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
            <span className="text-[10px] bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-medium">Profiles found</span>
            <span className="text-[10px] font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{totalEntries.toLocaleString()}</span>
          </div>
        )}

        {/* Keyword search */}
        <div className="rounded-lg p-[1px] bg-slate-200 focus-within:bg-gradient-to-r focus-within:from-purple-600 focus-within:to-pink-600 transition-all">
          <div className="relative bg-white rounded-lg">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Keyword, name…" value={keyword} onChange={e => onSetKeyword(e.target.value)}
              className="w-full h-8 pl-7 pr-3 rounded-lg text-[11px] text-slate-600 placeholder:text-[10px] placeholder:text-slate-400 placeholder:italic bg-transparent border-none outline-none" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-3 space-y-4">

          {/* ── SKILLS (at the top) ── */}
          <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Code2 size={11} style={{ stroke: "url(#rr-gradient)" }} />
              <SLabel count={skillChips.length}>Skills</SLabel>
            </div>
            <SkillChipBuilder chips={skillChips} onChange={onSetSkillChips} />
          </div>

          <div className="h-px bg-slate-100" />

          {/* ── Name ── */}
          <div>
            <SLabel>Name</SLabel>
            <div className="rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8">
              <Search size={10} className="text-slate-400 flex-shrink-0" />
              <input type="text" value={name} onChange={e => onSetName(e.target.value)} placeholder="e.g. Marc Benioff"
                className="flex-1 bg-transparent text-[11px] text-slate-600 placeholder-slate-400 focus:outline-none" />
              {name && <button type="button" onClick={() => onSetName("")}><X size={9} className="text-slate-400 hover:text-red-400" /></button>}
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* ── Job Title ── */}
          <div>
            <SLabel count={titles.length}>Job Title</SLabel>
            <TitleSelect selected={titles} onChange={onSetTitles} />
          </div>

          <div className="h-px bg-slate-100" />

          {/* ── Management Level ── */}
          <div>
            <SLabel count={managementLevels.length}>Management Level</SLabel>
            <MgmtLevelSelect selected={managementLevels} onChange={onToggleMgmtLevel} />
          </div>

          <div className="h-px bg-slate-100" />

          {/* ── Location ── */}
          <div>
            <SLabel count={locations.length}>Location</SLabel>
            <LocationSelect selected={locations} onChange={onSetLocations} />
          </div>

          <div className="h-px bg-slate-100" />

          {/* ── Company ── */}
          <div>
            <SLabel count={currentEmployer.length}>Current Company</SLabel>
            <CompanySelect selected={currentEmployer} onChange={onSetCurrentEmployer} />
          </div>

          <div className="h-px bg-slate-100" />

          {/* ── Advanced toggle ── */}
          <button type="button" onClick={() => setShowAdv(v => !v)}
            className="flex items-center gap-1.5 text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            <ChevronDown size={10} className={cn("transition-transform text-violet-500", showAdv && "rotate-180")} />
            {showAdv ? "Hide" : "More"} filters
          </button>

          {showAdv && (
            <>
              <div>
                <SLabel>Industry</SLabel>
                <SimpleTextInput value={companyIndustry} onChange={onSetCompanyIndustry}
                  placeholder="e.g. Software Engineering" icon={Building2} />
              </div>
              <div>
                <SLabel>Company Size</SLabel>
                <SimpleTextInput value={companySize} onChange={onSetCompanySize}
                  placeholder="e.g. 51-200" icon={Building2} />
              </div>
              <div>
                <SLabel>Department</SLabel>
                <SimpleTextInput value={department} onChange={onSetDepartment}
                  placeholder="e.g. Engineering" icon={Briefcase} />
              </div>

              <div className="h-px bg-slate-100" />

              {/* Order + Page size */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <SLabel>Order By</SLabel>
                  <select value={orderBy} onChange={e => onSetOrderBy(e.target.value as any)}
                    className="w-full h-7 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-600 px-2 focus:outline-none focus:border-violet-400">
                    <option value="popularity">Popularity</option>
                    <option value="relevance">Relevance</option>
                  </select>
                </div>
                <div>
                  <SLabel>Per Page</SLabel>
                  <select value={pageSize} onChange={e => onSetPageSize(Number(e.target.value))}
                    className="w-full h-7 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-600 px-2 focus:outline-none focus:border-violet-400">
                    {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Status bar */}
      <div className="flex-shrink-0 px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full", isLoading ? "bg-amber-400 animate-pulse" : hasFilters ? "bg-emerald-400" : "bg-slate-300")} />
            <span className="text-[10px] text-slate-500">
              {isLoading ? "Searching…" : hasFilters ? `${filterCount} filter${filterCount !== 1 ? "s" : ""} active` : "Add filters to search"}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-mono">700M+ profiles</span>
        </div>
      </div>
    </div>
  );
};