// src/components/talent-intelligence/TISearchSidebar.tsx  — v3
// Matches RRSearchSidebar style: gradient, portal dropdowns, boolean skill builder

import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { Country, State, City } from "country-state-city";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, RotateCcw, MapPin, Briefcase, Building2, ChevronDown,
  Tag, Users, Filter, Mail, Phone, Eye, EyeOff, X, GraduationCap, Database,
} from "lucide-react";
import {
  TIFilters, OrgProfileStats, SkillChip, SkillMode,
  YEARS_EXP_OPTIONS, INDUSTRY_OPTIONS, DEGREE_OPTIONS,
} from "@/types/talentIntelligence";

// ── Gradient ──────────────────────────────────────────────────
const GradientDef = () => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    <defs>
      <linearGradient id="ti-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
);

// ── Portal dropdown ───────────────────────────────────────────
function PortalDropdown({ anchorRef, isOpen, maxH = 220, children }: {
  anchorRef: React.RefObject<HTMLDivElement>; isOpen: boolean; maxH?: number; children: React.ReactNode;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    let rid: number;
    const update = () => {
      rid = requestAnimationFrame(() => {
        if (!anchorRef.current) return;
        const r = anchorRef.current.getBoundingClientRect();
        const w = Math.max(r.width, 220);
        const l = Math.min(r.left, window.innerWidth - w - 8);
        const up = window.innerHeight - r.bottom < maxH && r.top > maxH;
        setStyle({ position:"fixed", left: Math.max(4,l), width: w, zIndex: 99999, maxHeight: maxH,
          ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(rid); window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [isOpen, anchorRef, maxH]);
  if (!isOpen) return null;
  return ReactDOM.createPortal(
    <div style={style} className="bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-y-auto ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
      {children}
    </div>, document.body
  );
}

// ── Section header ────────────────────────────────────────────
function SectionHeader({ label, icon: Icon, isOpen, onToggle, count }: {
  label: string; icon: React.ElementType; isOpen: boolean; onToggle: () => void; count?: number;
}) {
  const active = (count ?? 0) > 0;
  return (
    <button type="button" onClick={onToggle} className="w-full flex items-center justify-between py-2.5 group">
      <div className="flex items-center gap-2">
        <Icon size={11} className={cn("transition-colors", active ? "text-violet-500" : "text-slate-400 group-hover:text-slate-600")} />
        <span className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors",
          active ? "bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent" : "text-slate-500 group-hover:text-slate-700")}>
          {label}
        </span>
        {active && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-white">{count}</span>}
      </div>
      <ChevronDown size={10} className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
    </button>
  );
}

const Div = () => <div className="h-px bg-slate-100 my-0.5" />;
const SL = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{children}</p>
);

// ── Chip ──────────────────────────────────────────────────────
const Chip = ({ label, onRemove, color }: { label: string; onRemove: () => void; color?: string }) => (
  <span className={cn("inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium border",
    color ?? "bg-violet-50 text-violet-700 border-violet-200")}>
    {label}
    <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-400 transition-colors"><X size={8} /></button>
  </span>
);

// ── Searchable multi-select ───────────────────────────────────
function SearchableMultiSelect({ label, options, selected, onChange, icon: Icon, chipColor }: {
  label: string; options: string[]; selected: string[];
  onChange: (v: string[]) => void; icon: React.ElementType; chipColor?: string;
}) {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null); const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => options.filter(o => !selected.includes(o) && o.toLowerCase().includes(q.toLowerCase())).slice(0,40), [options, selected, q]);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn);
  }, []);
  return (
    <div ref={wrapRef} className="space-y-1.5">
      {selected.length > 0 && <div className="flex flex-wrap gap-1">{selected.map(v => <Chip key={v} label={v} onRemove={() => onChange(selected.filter(x => x !== v))} color={chipColor} />)}</div>}
      <div ref={anchorRef}>
        <div onClick={() => { setOpen(true); inputRef.current?.focus(); }}
          className="group rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 cursor-text transition-all hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-200">
          <Icon size={10} className="text-slate-400 flex-shrink-0 group-hover:text-violet-500 transition-colors" />
          <input ref={inputRef} type="text" value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
            placeholder={label} className="flex-1 bg-transparent text-[11px] text-slate-600 focus:outline-none placeholder:text-slate-400 placeholder:italic placeholder:text-[10px]" />
          <ChevronDown size={9} className={cn("text-slate-400 flex-shrink-0 transition-all group-hover:text-violet-500", open && "rotate-180")} />
        </div>
        <PortalDropdown anchorRef={anchorRef} isOpen={open && filtered.length > 0}>
          {filtered.map(opt => (
            <button key={opt} type="button" onMouseDown={e => { e.preventDefault(); onChange([...selected, opt]); setQ(""); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="group w-full flex items-center px-3 py-1.5 text-[11px] text-left hover:bg-violet-50 hover:pl-4 transition-all duration-150">{opt}</button>
          ))}
        </PortalDropdown>
      </div>
    </div>
  );
}

// ── Simple select ─────────────────────────────────────────────
function SimpleSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false); const anchorRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);
  return (
    <div className="relative" ref={anchorRef}>
      <div onClick={() => setOpen(v => !v)}
        className="group w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 flex items-center justify-between cursor-pointer transition-all hover:border-violet-300">
        <span className={cn("text-[11px]", value ? "text-slate-700" : "text-slate-400 italic")}>{selected?.label || placeholder || "Select"}</span>
        <ChevronDown size={9} className={cn("text-slate-400 transition-all group-hover:text-violet-500", open && "rotate-180")} />
      </div>
      <PortalDropdown anchorRef={anchorRef} isOpen={open}>
        {options.map(opt => (
          <button key={opt.value} type="button" onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
            className={cn("w-full text-left px-3 py-1.5 text-[11px] transition-all hover:bg-violet-50 hover:pl-4",
              value === opt.value && "bg-violet-50 text-violet-700 font-medium")}>{opt.label}</button>
        ))}
      </PortalDropdown>
    </div>
  );
}

// ── Tag input ─────────────────────────────────────────────────
function TagInput({ selected, onChange, placeholder, icon: Icon, chipColor }: {
  selected: string[]; onChange: (v: string[]) => void;
  placeholder: string; icon: React.ElementType; chipColor?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => { const s = input.trim(); if (s && !selected.includes(s)) onChange([...selected, s]); setInput(""); };
  return (
    <div className="space-y-1.5">
      {selected.length > 0 && <div className="flex flex-wrap gap-1">{selected.map(t => <Chip key={t} label={t} onRemove={() => onChange(selected.filter(x => x !== t))} color={chipColor} />)}</div>}
      <div className="group rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 transition-all hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-200">
        <Icon size={10} className="text-slate-400 flex-shrink-0 group-hover:text-violet-500 transition-colors" />
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter"||e.key===",") { e.preventDefault(); add(); } if (e.key==="Backspace"&&!input&&selected.length) onChange(selected.slice(0,-1)); }}
          placeholder={placeholder} className="flex-1 bg-transparent text-[11px] text-slate-600 focus:outline-none placeholder:text-slate-400 placeholder:italic placeholder:text-[10px]" />
        {input && <button type="button" onClick={() => setInput("")}><X size={9} className="text-slate-400 hover:text-red-400" /></button>}
      </div>
    </div>
  );
}

// ── Location select (country-state-city) ──────────────────────
type LocType = "country"|"state"|"city";
const LOC_STYLE: Record<LocType,string> = {
  country: "bg-blue-50 text-blue-700 border-blue-200",
  state:   "bg-orange-50 text-orange-700 border-orange-200",
  city:    "bg-violet-50 text-violet-700 border-violet-200",
};
const ALL_COUNTRIES = Country.getAllCountries().map(c => ({ value: c.name, label: `${c.flag??""} ${c.name}`.trim(), type: "country" as LocType }));
const ALL_STATES    = State.getAllStates().map(s => ({ value: s.name, label: s.name, type: "state" as LocType }));
const POPULAR = ["India","United States","United Kingdom","Canada","Australia","Germany","Singapore","UAE","France"];

function searchLocs(q: string, selected: string[]) {
  const lq = q.toLowerCase().trim();
  if (!lq) return ALL_COUNTRIES.filter(c => POPULAR.includes(c.value) && !selected.includes(c.value)).slice(0,10);
  const out: { value:string; label:string; type:LocType }[] = [];
  ALL_COUNTRIES.filter(c => c.value.toLowerCase().includes(lq) && !selected.includes(c.value)).slice(0,5).forEach(c => out.push(c));
  ALL_STATES.filter(s => s.value.toLowerCase().includes(lq) && !selected.includes(s.value)).slice(0,4).forEach(s => out.push({...s,type:"state"}));
  if (lq.length >= 3) City.getAllCities().filter(c => c.name.toLowerCase().includes(lq) && !selected.includes(c.name)).slice(0,5).forEach(c => out.push({value:c.name,label:c.name,type:"city"}));
  return out.slice(0,20);
}

function LocationSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null); const anchorRef = useRef<HTMLDivElement>(null); const inputRef = useRef<HTMLInputElement>(null);
  const opts = useMemo(() => searchLocs(q, value ? [value] : []), [q, value]);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn);
  }, []);
  const getType = (v: string): LocType => { if (ALL_COUNTRIES.some(c=>c.value===v)) return "country"; if (ALL_STATES.some(s=>s.value===v)) return "state"; return "city"; };
  return (
    <div ref={wrapRef} className="space-y-1.5">
      {value && (
        <span className={cn("inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[10px] font-medium border", LOC_STYLE[getType(value)])}>
          {value}
          <button type="button" onMouseDown={e => { e.preventDefault(); onChange(""); }} className="opacity-60 hover:opacity-100 hover:text-red-500 transition-all"><X size={8} /></button>
        </span>
      )}
      <div ref={anchorRef}>
        <div onClick={() => { setOpen(true); inputRef.current?.focus(); }}
          className="group rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 cursor-text transition-all hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-200">
          <MapPin size={10} className="text-slate-400 flex-shrink-0 group-hover:text-violet-500 transition-colors" />
          <input ref={inputRef} type="text" value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key==="Escape") setOpen(false); }}
            placeholder="Country, state or city…" className="flex-1 bg-transparent text-[11px] text-slate-600 focus:outline-none placeholder:text-slate-400 placeholder:italic placeholder:text-[10px]" />
          {q && <button type="button" onMouseDown={e => { e.preventDefault(); setQ(""); }}><X size={9} className="text-slate-400 hover:text-red-400" /></button>}
        </div>
        <PortalDropdown anchorRef={anchorRef} isOpen={open && opts.length > 0}>
          {opts.map(opt => (
            <button key={`${opt.type}-${opt.value}`} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(opt.value); setQ(""); setOpen(false); }}
              className="group w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-violet-50 hover:pl-4 transition-all duration-150">
              <span className={cn("text-[8px] px-1 py-0.5 rounded border font-bold uppercase", LOC_STYLE[opt.type])}>{opt.type[0]}</span>
              <span className="text-[11px] text-slate-700 truncate">{opt.label}</span>
            </button>
          ))}
        </PortalDropdown>
      </div>
    </div>
  );
}

// ── Boolean skill chip builder ────────────────────────────────
const SKILL_MODE_CFG: Record<SkillMode,{label:string;dot:string;chip:string}> = {
  must:    { label:"Must",    dot:"bg-violet-500", chip:"bg-violet-50 text-violet-700 border-violet-200" },
  nice:    { label:"Nice",    dot:"bg-blue-400",   chip:"bg-blue-50 text-blue-700 border-blue-200" },
  exclude: { label:"Exclude", dot:"bg-red-400",    chip:"bg-red-50 text-red-600 border-red-200" },
};

function SkillChipBuilder({ chips, onChange }: { chips: SkillChip[]; onChange: (c: SkillChip[]) => void }) {
  const [input, setInput]   = useState("");
  const [mode, setMode]     = useState<SkillMode>("must");
  const [boolShow, setBoolShow] = useState(false);
  const [boolIn, setBoolIn] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (raw: string, m: SkillMode) => {
    const labels = raw.split(",").map(s=>s.trim()).filter(Boolean);
    const existing = new Set(chips.map(c=>c.label.toLowerCase()));
    const next = labels.filter(l=>!existing.has(l.toLowerCase())).map(l=>({label:l,mode:m}));
    if (next.length) onChange([...chips,...next]);
  };
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key==="Enter"||e.key===",")&&input.trim()) { e.preventDefault(); add(input,mode); setInput(""); }
    else if (e.key==="Backspace"&&!input&&chips.length) onChange(chips.slice(0,-1));
  };
  const applyBool = () => {
    if (!boolIn.trim()) return;
    const raw = boolIn.replace(/\bAND\b/gi," ").replace(/\bOR\b/gi," ");
    const parts = raw.split(/\s+/).filter(Boolean);
    const must:string[]=[],nice:string[]=[],excl:string[]=[]; let skip=false;
    for (let i=0;i<parts.length;i++) {
      if(skip){skip=false;continue;}
      const cur=parts[i],next=parts[i+1];
      if(/^NOT$/i.test(cur)&&next){excl.push(next.replace(/^-/,""));skip=true;}
      else if(cur.startsWith("-")&&cur.length>1)excl.push(cur.slice(1));
      else if(!/^(AND|OR|NOT)$/i.test(cur))nice.push(cur);
    }
    const existing=new Set(chips.map(c=>c.label.toLowerCase()));
    onChange([...chips,
      ...must.filter(l=>!existing.has(l.toLowerCase())).map(l=>({label:l,mode:"must" as SkillMode})),
      ...nice.filter(l=>!existing.has(l.toLowerCase())).map(l=>({label:l,mode:"nice" as SkillMode})),
      ...excl.filter(l=>!existing.has(l.toLowerCase())).map(l=>({label:l,mode:"exclude" as SkillMode})),
    ]);
    setBoolIn(""); setBoolShow(false);
  };
  const cycle = (i:number) => {
    const order:SkillMode[]=["must","nice","exclude"];
    const next=order[(order.indexOf(chips[i].mode)+1)%order.length];
    onChange(chips.map((c,j)=>j===i?{...c,mode:next}:c));
  };
  const counts = { must:chips.filter(c=>c.mode==="must").length, nice:chips.filter(c=>c.mode==="nice").length, exclude:chips.filter(c=>c.mode==="exclude").length };

  return (
    <div className="space-y-1.5">
      {/* Mode selector */}
      <div className="flex items-center gap-1">
        {(["must","nice","exclude"] as SkillMode[]).map(m => {
          const cfg = SKILL_MODE_CFG[m];
          return (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={cn("group flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all",
                mode===m ? `${cfg.chip} border-current shadow-sm scale-[1.02]` : "text-slate-400 border-slate-200 bg-white hover:border-violet-300 hover:text-violet-500")}>
              <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />{cfg.label}
              {counts[m]>0 && <span className="opacity-70">({counts[m]})</span>}
            </button>
          );
        })}
        <button type="button" onClick={() => setBoolShow(v=>!v)}
          className={cn("ml-auto text-[9px] px-1.5 py-0.5 rounded border transition-all",
            boolShow ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent" : "text-slate-400 border-slate-200 bg-white hover:border-violet-300 hover:text-violet-500")}>
          Bool
        </button>
      </div>
      {/* Boolean input */}
      {boolShow && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-1.5 focus-within:border-violet-400 transition-all">
          <p className="text-[8px] text-slate-400">e.g. <span className="text-violet-500">Python AND React NOT PHP</span></p>
          <div className="flex gap-1">
            <input type="text" value={boolIn} onChange={e=>setBoolIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&applyBool()}
              placeholder="Python AND React NOT PHP" className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] focus:outline-none focus:border-violet-400" />
            <button type="button" onClick={applyBool} className="px-2 py-1 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold">Parse</button>
          </div>
        </div>
      )}
      {/* Chip input area */}
      <div onClick={() => inputRef.current?.focus()}
        className="group rounded-lg border border-slate-200 bg-white px-2 py-1.5 flex flex-wrap gap-1 min-h-[34px] cursor-text hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-200 transition-all">
        {chips.map((chip,i) => {
          const cfg = SKILL_MODE_CFG[chip.mode];
          return (
            <span key={i} onClick={()=>cycle(i)} className={cn("group inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium cursor-pointer hover:scale-[1.05] hover:shadow-sm transition-all", cfg.chip)}>
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
              {chip.label}
              <button type="button" onClick={e=>{e.stopPropagation();onChange(chips.filter((_,j)=>j!==i));}} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
            </span>
          );
        })}
        <input ref={inputRef} type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
          placeholder={chips.length===0?"Type skill, Enter…":""}
          className="flex-1 min-w-[60px] bg-transparent text-[11px] text-slate-700 focus:outline-none placeholder:text-[10px] placeholder:text-slate-400 placeholder:italic" />
      </div>
    </div>
  );
}

// ── Reveal status radio pills ─────────────────────────────────
function RevealStatus({ value, onChange, stats }: { value: string; onChange: (v: string) => void; stats: OrgProfileStats | null }) {
  const opts = [
    { value:"all",            label:"All",           count: stats?.total_profiles },
    { value:"email_revealed", label:"Email revealed", count: stats?.email_revealed },
    { value:"phone_revealed", label:"Phone revealed", count: stats?.phone_revealed },
    { value:"not_revealed",   label:"Not revealed",   count: stats?.not_revealed },
  ];
  return (
    <div className="grid grid-cols-2 gap-1">
      {opts.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={cn("flex flex-col items-start px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all",
            value===opt.value ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:bg-violet-50")}>
          <span className="leading-tight">{opt.label}</span>
          {opt.count !== undefined && (
            <span className={cn("text-[9px] font-bold mt-0.5", value===opt.value ? "text-violet-200" : "text-slate-400")}>
              {Number(opt.count).toLocaleString()}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────

interface TISearchSidebarProps {
  filters: TIFilters; onChange: (f: TIFilters) => void;
  onReset: () => void; stats: OrgProfileStats | null;
}

export function TISearchSidebar({ filters, onChange, onReset, stats }: TISearchSidebarProps) {
  const set = <K extends keyof TIFilters>(key: K, val: TIFilters[K]) => onChange({ ...filters, [key]: val });

  const [open, setOpen] = useState({ core:true, employer:false, company:false, education:false, contact:true });
  const tog = (k: keyof typeof open) => setOpen(p => ({ ...p, [k]: !p[k] }));

  const coreCnt    = (filters.query?1:0) + filters.skillChips.length + filters.titles.length + (filters.location?1:0) + (filters.yearsExperience?1:0) + (filters.openToWork?1:0);
  const empCnt     = filters.currentEmployer.length + filters.previousEmployer.length + filters.previousTitle.length;
  const companyCnt = filters.industry.length;
  const eduCnt     = filters.school.length + filters.degree.length + filters.major.length;
  const contactCnt = (filters.hasEmail?1:0) + (filters.hasPhone?1:0) + (filters.revealedStatus!=="all"?1:0);
  const hasAny     = !!(coreCnt+empCnt+companyCnt+eduCnt+contactCnt);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100">
      <GradientDef />

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2.5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database size={12} style={{ stroke:"url(#ti-grad)" }} />
            <span className="text-[11px] font-bold text-violet-700">Talent Intelligence</span>
          </div>
          {hasAny && (
            <button type="button" onClick={onReset} className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors">
              <RotateCcw size={9} /> Reset
            </button>
          )}
        </div>
        {stats && (
          <div className="px-2.5 py-1.5 rounded-lg bg-violet-50 border border-violet-100">
            <p className="text-[10px] text-violet-700 font-bold">{Number(stats.total_profiles).toLocaleString()} profiles in your database</p>
            <p className="text-[9px] text-violet-500">{Number(stats.open_to_work).toLocaleString()} open to work · {Number(stats.email_revealed).toLocaleString()} email revealed</p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4">

          {/* ── CORE FILTERS ─────────────────────────────────── */}
          <SectionHeader label="Core Filters" icon={Filter} isOpen={open.core} onToggle={() => tog("core")} count={coreCnt} />
          {open.core && (
            <div className="pb-3 space-y-3">
              {/* Keyword */}
              <div>
                <SL>Keyword</SL>
                <div className="rounded-lg p-[1px] bg-slate-200 focus-within:bg-gradient-to-r focus-within:from-purple-600 focus-within:to-pink-600 transition-all">
                  <div className="relative bg-white rounded-lg">
                    <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search by name, headline…" value={filters.query}
                      onChange={e => set("query", e.target.value)}
                      className="w-full h-8 pl-7 pr-3 rounded-lg text-[11px] text-slate-600 placeholder:text-[10px] placeholder:text-slate-400 placeholder:italic bg-transparent border-none outline-none" />
                    {filters.query && <button type="button" onClick={() => set("query","")} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={9} className="text-slate-400 hover:text-red-400" /></button>}
                  </div>
                </div>
              </div>
              {/* Skills */}
              <div>
                <SL>Skills</SL>
                <SkillChipBuilder chips={filters.skillChips} onChange={v => set("skillChips", v)} />
              </div>
              {/* Job Title */}
              <div>
                <SL>Job Title</SL>
                <TagInput selected={filters.titles} onChange={v => set("titles", v)}
                  placeholder="e.g. Software Engineer, Enter…" icon={Briefcase}
                  chipColor="bg-blue-50 text-blue-700 border-blue-200" />
              </div>
              {/* Location */}
              <div>
                <SL>Location</SL>
                <LocationSelect value={filters.location} onChange={v => set("location", v)} />
              </div>
              {/* Years of Experience */}
              <div>
                <SL>Years of Experience</SL>
                <SimpleSelect value={filters.yearsExperience} onChange={v => set("yearsExperience", v)} options={YEARS_EXP_OPTIONS} placeholder="Any experience" />
              </div>
              {/* Open to Work */}
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => set("openToWork", !filters.openToWork)}>
                <div className={cn("relative w-8 h-4 rounded-full transition-all flex-shrink-0", filters.openToWork ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-slate-200")}>
                  <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all" style={{ left: filters.openToWork ? "calc(100% - 14px)" : "2px" }} />
                </div>
                <span className={cn("text-[11px] font-medium", filters.openToWork ? "text-violet-700" : "text-slate-600")}>
                  Open to Work <span className="text-slate-400">({Number(stats?.open_to_work ?? 0).toLocaleString()})</span>
                </span>
              </label>
            </div>
          )}
          <Div />

          {/* ── EMPLOYER & ROLE ──────────────────────────────── */}
          <SectionHeader label="Employer & Role" icon={Building2} isOpen={open.employer} onToggle={() => tog("employer")} count={empCnt} />
          {open.employer && (
            <div className="pb-3 space-y-3">
              <div>
                <SL>Current Employer</SL>
                <TagInput selected={filters.currentEmployer} onChange={v => set("currentEmployer", v)}
                  placeholder="Add company, Enter…" icon={Building2} chipColor="bg-blue-50 text-blue-700 border-blue-200" />
              </div>
              <div>
                <SL>Previous Employer</SL>
                <TagInput selected={filters.previousEmployer} onChange={v => set("previousEmployer", v)}
                  placeholder="Past company, Enter…" icon={Building2} chipColor="bg-slate-100 text-slate-700 border-slate-200" />
              </div>
              <div>
                <SL>Previous Title</SL>
                <TagInput selected={filters.previousTitle} onChange={v => set("previousTitle", v)}
                  placeholder="Past title, Enter…" icon={Briefcase} chipColor="bg-slate-100 text-slate-700 border-slate-200" />
              </div>
            </div>
          )}
          <Div />

          {/* ── COMPANY ──────────────────────────────────────── */}
          <SectionHeader label="Company" icon={Building2} isOpen={open.company} onToggle={() => tog("company")} count={companyCnt} />
          {open.company && (
            <div className="pb-3">
              <SL>Industry</SL>
              <SearchableMultiSelect label="Search industries…" options={INDUSTRY_OPTIONS}
                selected={filters.industry} onChange={v => set("industry", v)}
                icon={Building2} chipColor="bg-teal-50 text-teal-700 border-teal-200" />
            </div>
          )}
          <Div />

          {/* ── EDUCATION ────────────────────────────────────── */}
          <SectionHeader label="Education" icon={GraduationCap} isOpen={open.education} onToggle={() => tog("education")} count={eduCnt} />
          {open.education && (
            <div className="pb-3 space-y-3">
              <div>
                <SL>School / University</SL>
                <TagInput selected={filters.school} onChange={v => set("school", v)}
                  placeholder="e.g. IIT Bombay, Enter…" icon={GraduationCap} chipColor="bg-green-50 text-green-700 border-green-200" />
              </div>
              <div>
                <SL>Degree</SL>
                <SearchableMultiSelect label="Search degrees…" options={DEGREE_OPTIONS}
                  selected={filters.degree} onChange={v => set("degree", v)}
                  icon={GraduationCap} chipColor="bg-green-50 text-green-700 border-green-200" />
              </div>
              <div>
                <SL>Major / Field</SL>
                <TagInput selected={filters.major} onChange={v => set("major", v)}
                  placeholder="e.g. Computer Science, Enter…" icon={GraduationCap} chipColor="bg-green-50 text-green-700 border-green-200" />
              </div>
            </div>
          )}
          <Div />

          {/* ── CONTACT STATUS ───────────────────────────────── */}
          <SectionHeader label="Contact Status" icon={Eye} isOpen={open.contact} onToggle={() => tog("contact")} count={contactCnt} />
          {open.contact && (
            <div className="pb-3 space-y-3">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer" onClick={() => set("hasEmail", !filters.hasEmail)}>
                  <div className={cn("relative w-8 h-4 rounded-full transition-all flex-shrink-0", filters.hasEmail ? "bg-violet-600" : "bg-slate-200")}>
                    <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all" style={{ left: filters.hasEmail ? "calc(100% - 14px)" : "2px" }} />
                  </div>
                  <span className="text-[11px] text-slate-600 flex items-center gap-1"><Mail size={10} className="text-violet-500" /> Has email ({Number(stats?.email_available??0).toLocaleString()})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer" onClick={() => set("hasPhone", !filters.hasPhone)}>
                  <div className={cn("relative w-8 h-4 rounded-full transition-all flex-shrink-0", filters.hasPhone ? "bg-violet-600" : "bg-slate-200")}>
                    <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all" style={{ left: filters.hasPhone ? "calc(100% - 14px)" : "2px" }} />
                  </div>
                  <span className="text-[11px] text-slate-600 flex items-center gap-1"><Phone size={10} className="text-violet-500" /> Has phone ({Number(stats?.phone_available??0).toLocaleString()})</span>
                </label>
              </div>
              <div>
                <SL>Reveal Status</SL>
                <RevealStatus value={filters.revealedStatus} onChange={v => set("revealedStatus", v as any)} stats={stats} />
              </div>
            </div>
          )}
          <div className="h-3" />
        </div>
      </ScrollArea>

      {/* Status bar */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full", hasAny ? "bg-violet-500 animate-pulse" : "bg-slate-300")} />
          <span className="text-[10px] text-slate-500">{hasAny ? "Filters active" : "Showing all profiles"}</span>
        </div>
      </div>
    </div>
  );
}