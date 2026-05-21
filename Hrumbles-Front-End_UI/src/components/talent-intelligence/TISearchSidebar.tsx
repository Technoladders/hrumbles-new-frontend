// src/components/talent-intelligence/TISearchSidebar.tsx  — v2
// Mirrors RRSearchSidebar patterns: PortalDropdown, LocationSelect, SearchableMultiSelect
// Added: revealed-status section using OrgProfileStats counts

import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { Country, State, City } from "country-state-city";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, RotateCcw, MapPin, Briefcase, Building2,
  ChevronDown, Tag, Users, SlidersHorizontal, Mail,
  Phone, Zap, Eye, EyeOff, X,
} from "lucide-react";
import {
  TIFilters, OrgProfileStats,
  SENIORITY_OPTIONS, JOB_FUNCTION_OPTIONS, INDUSTRY_OPTIONS,
} from "@/types/talentIntelligence";

// ── Gradient SVG def ──────────────────────────────────────────

const GradientDef = () => (
  <svg width="0" height="0" style={{ position: "absolute" }}>
    <defs>
      <linearGradient id="ti-sidebar-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
);

// ── Portal dropdown ───────────────────────────────────────────

function PortalDropdown({ anchorRef, isOpen, maxH = 220, children }: {
  anchorRef: React.RefObject<HTMLDivElement>;
  isOpen: boolean;
  maxH?: number;
  children: React.ReactNode;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    let rafId: number;
    const update = () => {
      rafId = requestAnimationFrame(() => {
        if (!anchorRef.current) return;
        const r    = anchorRef.current.getBoundingClientRect();
        const w    = Math.max(r.width, 220);
        const left = Math.min(r.left, window.innerWidth - w - 8);
        const goUp = window.innerHeight - r.bottom < maxH && r.top > maxH;
        setStyle({
          position: "fixed", left: Math.max(4, left), width: w,
          zIndex: 99999, maxHeight: maxH,
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
    <div style={style} className="bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-y-auto ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
      {children}
    </div>,
    document.body
  );
}

// ── Section header ────────────────────────────────────────────

function SectionHeader({ label, icon: Icon, isOpen, onToggle, count }: {
  label: string; icon: React.ElementType;
  isOpen: boolean; onToggle: () => void; count?: number;
}) {
  const active = (count ?? 0) > 0;
  return (
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 group">
      <div className="flex items-center gap-2">
        <Icon size={11} className={cn("transition-colors", active ? "text-violet-500" : "text-slate-400 group-hover:text-slate-600")} />
        <span className={cn("text-[10px] font-bold uppercase tracking-wider",
          active ? "text-violet-600" : "text-slate-500 group-hover:text-slate-700")}>
          {label}
        </span>
        {active && (
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
            {count}
          </span>
        )}
      </div>
      <ChevronDown size={10} className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
    </button>
  );
}

// ── Chip tag ──────────────────────────────────────────────────

const Chip = ({ label, onRemove, color }: { label: string; onRemove: () => void; color?: string }) => (
  <span className={cn(
    "inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium border",
    color ?? "bg-violet-50 text-violet-700 border-violet-200"
  )}>
    {label}
    <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-400 transition-colors">
      <X size={8} />
    </button>
  </span>
);

// ── Searchable multi-select ───────────────────────────────────

function SearchableMultiSelect({ label, options, selected, onChange, icon: Icon, chipColor }: {
  label: string; options: string[]; selected: string[];
  onChange: (v: string[]) => void; icon: React.ElementType; chipColor?: string;
}) {
  const [q, setQ]       = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef         = useRef<HTMLDivElement>(null);
  const anchorRef       = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() =>
    options.filter(o => !selected.includes(o) && o.toLowerCase().includes(q.toLowerCase())).slice(0, 40),
  [options, selected, q]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQ(""); }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={wrapRef} className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(v => <Chip key={v} label={v} onRemove={() => onChange(selected.filter(x => x !== v))} color={chipColor} />)}
        </div>
      )}
      <div ref={anchorRef}>
        <div onClick={() => { setOpen(true); inputRef.current?.focus(); }}
          className="group rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 cursor-text transition-all hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-200">
          <Icon size={10} className="text-slate-400 flex-shrink-0 group-hover:text-violet-500 transition-colors" />
          <input ref={inputRef} type="text" value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
            placeholder={label}
            className="flex-1 bg-transparent text-[11px] text-slate-600 focus:outline-none placeholder:text-slate-400 placeholder:italic placeholder:text-[10px]" />
          <ChevronDown size={9} className={cn("text-slate-400 flex-shrink-0 transition-all", open && "rotate-180 text-violet-600")} />
        </div>
        <PortalDropdown anchorRef={anchorRef} isOpen={open && filtered.length > 0}>
          {filtered.map(opt => (
            <button key={opt} type="button"
              onMouseDown={e => { e.preventDefault(); onChange([...selected, opt]); setQ(""); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="w-full flex items-center px-3 py-1.5 text-[11px] text-left hover:bg-violet-50 hover:pl-4 transition-all duration-150">
              {opt}
            </button>
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
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const selected  = options.find(o => o.value === value);

  return (
    <div className="relative" ref={anchorRef}>
      <div onClick={() => setOpen(v => !v)}
        className="group w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 flex items-center justify-between cursor-pointer transition-all hover:border-violet-300 focus-within:border-violet-500">
        <span className={cn("text-[11px]", value ? "text-slate-700" : "text-slate-400 italic")}>
          {selected?.label || placeholder || "Select"}
        </span>
        <ChevronDown size={9} className={cn("text-slate-400 transition-all group-hover:text-violet-500", open && "rotate-180")} />
      </div>
      <PortalDropdown anchorRef={anchorRef} isOpen={open}>
        {options.map(opt => (
          <button key={opt.value} type="button"
            onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
            className={cn("w-full text-left px-3 py-1.5 text-[11px] transition-all hover:bg-violet-50 hover:pl-4",
              value === opt.value && "bg-violet-50 text-violet-700 font-medium")}>
            {opt.label}
          </button>
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
  const add = () => {
    const s = input.trim();
    if (s && !selected.includes(s)) onChange([...selected, s]);
    setInput("");
  };
  return (
    <div className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(t => <Chip key={t} label={t} onRemove={() => onChange(selected.filter(x => x !== t))} color={chipColor} />)}
        </div>
      )}
      <div className="group rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 transition-all hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-200">
        <Icon size={10} className="text-slate-400 flex-shrink-0 group-hover:text-violet-500 transition-colors" />
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } if (e.key === "Backspace" && !input && selected.length) onChange(selected.slice(0, -1)); }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[11px] text-slate-600 focus:outline-none placeholder:text-slate-400 placeholder:italic placeholder:text-[10px]" />
        {input && <button type="button" onClick={() => setInput("")}><X size={9} className="text-slate-400 hover:text-red-400" /></button>}
      </div>
    </div>
  );
}

// ── Seniority pills ───────────────────────────────────────────

function SeniorityPills({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void; }) {
  return (
    <div className="flex flex-wrap gap-1">
      {SENIORITY_OPTIONS.map(o => {
        const active = selected.includes(o.value);
        return (
          <button key={o.value} type="button"
            onClick={() => onChange(active ? selected.filter(x => x !== o.value) : [...selected, o.value])}
            className={cn("px-2 py-0.5 rounded-full text-[9px] font-semibold border transition-all",
              active ? "bg-violet-600 text-white border-transparent" : "bg-white text-slate-500 border-slate-200 hover:border-violet-300")}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Location select (country-state-city) ──────────────────────

type LocType = "country" | "state" | "city";
const LOC_STYLE: Record<LocType, string> = {
  country: "bg-blue-50 text-blue-700 border-blue-200",
  state:   "bg-orange-50 text-orange-700 border-orange-200",
  city:    "bg-violet-50 text-violet-700 border-violet-200",
};

const ALL_COUNTRIES = Country.getAllCountries().map(c => ({
  value: c.name, label: `${c.flag ?? ""} ${c.name}`.trim(), type: "country" as LocType,
}));
const ALL_STATES = State.getAllStates().map(s => ({
  value: s.name, label: s.name, type: "state" as LocType,
}));
const POPULAR = ["India","United States","United Kingdom","Canada","Australia","Germany","Singapore","UAE","France","Netherlands"];

function searchLocs(q: string, selected: string[]) {
  const lq = q.toLowerCase().trim();
  if (!lq) return ALL_COUNTRIES.filter(c => POPULAR.includes(c.value) && !selected.includes(c.value)).slice(0, 10);
  const out: { value: string; label: string; type: LocType }[] = [];
  ALL_COUNTRIES.filter(c => c.value.toLowerCase().includes(lq) && !selected.includes(c.value)).slice(0, 5).forEach(c => out.push(c));
  ALL_STATES.filter(s => s.value.toLowerCase().includes(lq) && !selected.includes(s.value)).slice(0, 4).forEach(s => out.push({ ...s, type: "state" }));
  if (lq.length >= 3) {
    City.getAllCities().filter(c => c.name.toLowerCase().includes(lq) && !selected.includes(c.name)).slice(0, 5).forEach(c => out.push({ value: c.name, label: c.name, type: "city" }));
  }
  return out.slice(0, 20);
}

function getLocType(val: string): LocType {
  if (ALL_COUNTRIES.some(c => c.value === val)) return "country";
  if (ALL_STATES.some(s => s.value === val)) return "state";
  return "city";
}

function LocationSelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void; }) {
  const [q, setQ]       = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef         = useRef<HTMLDivElement>(null);
  const anchorRef       = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  const options         = useMemo(() => searchLocs(q, selected), [q, selected]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQ(""); }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={wrapRef} className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(val => {
            const t = getLocType(val);
            return (
              <span key={val} className={cn("inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[10px] font-medium border transition-all hover:scale-[1.03]", LOC_STYLE[t])}>
                {val}
                <button type="button" onMouseDown={e => { e.preventDefault(); onChange(selected.filter(x => x !== val)); }} className="opacity-60 hover:opacity-100 hover:text-red-500 transition-all">
                  <X size={8} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div ref={anchorRef}>
        <div onClick={() => { setOpen(true); inputRef.current?.focus(); }}
          className="group rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 cursor-text transition-all hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-200">
          <MapPin size={10} className="text-slate-400 flex-shrink-0 group-hover:text-violet-500 transition-colors" />
          <input ref={inputRef} type="text" value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
            placeholder="Country, state or city…"
            className="flex-1 bg-transparent text-[11px] text-slate-600 focus:outline-none placeholder:text-slate-400 placeholder:italic placeholder:text-[10px]" />
          {q && <button type="button" onMouseDown={e => { e.preventDefault(); setQ(""); }} className="text-slate-400 hover:text-red-400"><X size={9} /></button>}
        </div>
        <PortalDropdown anchorRef={anchorRef} isOpen={open && options.length > 0}>
          {options.map(opt => (
            <button key={`${opt.type}-${opt.value}`} type="button"
              onMouseDown={e => { e.preventDefault(); onChange([...selected, opt.value]); setQ(""); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="group w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-violet-50 hover:pl-4 transition-all duration-150">
              <span className={cn("text-[8px] px-1 py-0.5 rounded border font-bold uppercase transition-all group-hover:scale-105", LOC_STYLE[opt.type])}>
                {opt.type[0]}
              </span>
              <span className="text-[11px] text-slate-700 truncate">{opt.label}</span>
            </button>
          ))}
        </PortalDropdown>
      </div>
    </div>
  );
}

// ── Revealed status pills ─────────────────────────────────────

interface RevealedFilterProps {
  value: string;
  onChange: (v: string) => void;
  stats: OrgProfileStats | null;
}

function RevealedFilter({ value, onChange, stats }: RevealedFilterProps) {
  const opts = [
    { value: "all",            label: "All",             icon: <Users size={9} />,   count: stats?.total_profiles },
    { value: "email_revealed", label: "Email revealed",  icon: <Mail size={9} />,    count: stats?.email_revealed },
    { value: "phone_revealed", label: "Phone revealed",  icon: <Phone size={9} />,   count: stats?.phone_revealed },
    { value: "not_revealed",   label: "Not revealed",    icon: <EyeOff size={9} />,  count: stats?.not_revealed },
  ];

  return (
    <div className="space-y-1.5">
      {opts.map(opt => (
        <button key={opt.value} type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all",
            value === opt.value
              ? "bg-violet-600 text-white border-violet-600"
              : "bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:bg-violet-50"
          )}>
          <span className="flex items-center gap-1.5">{opt.icon}{opt.label}</span>
          {opt.count !== undefined && (
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              value === opt.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
              {Number(opt.count).toLocaleString()}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────

const SL = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 mb-1.5">{children}</p>
);
const Divider = () => <div className="h-px bg-slate-100 my-0.5" />;

// ── Main sidebar ──────────────────────────────────────────────

interface TISearchSidebarProps {
  filters:  TIFilters;
  onChange: (f: TIFilters) => void;
  onReset:  () => void;
  stats:    OrgProfileStats | null;
}

export function TISearchSidebar({ filters, onChange, onReset, stats }: TISearchSidebarProps) {
  const set = <K extends keyof TIFilters>(key: K, val: TIFilters[K]) =>
    onChange({ ...filters, [key]: val });

  const [open, setOpen] = useState({
    search:   true,
    location: true,
    role:     true,
    company:  false,
    skills:   false,
    revealed: true,
  });
  const toggle = (k: keyof typeof open) => setOpen(p => ({ ...p, [k]: !p[k] }));

  const hasAny = !!(
    filters.query || filters.location || filters.company ||
    filters.seniority.length || filters.jobFunction.length ||
    filters.industry.length  || filters.skills.length ||
    filters.openToWork || filters.hasEmail || filters.hasPhone ||
    filters.revealedStatus !== "all"
  );

  // Active counts per section
  const roleCnt    = filters.seniority.length + filters.jobFunction.length + (filters.openToWork?1:0);
  const companyCnt = (filters.company?1:0) + filters.industry.length + (filters.hasEmail?1:0) + (filters.hasPhone?1:0);
  const skillsCnt  = filters.skills.length;
  const revealCnt  = filters.revealedStatus !== "all" ? 1 : 0;

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100">
      <GradientDef />

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2.5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={12} className="text-violet-600" />
            <span className="text-[11px] font-bold text-violet-700">Filters</span>
          </div>
          {hasAny && (
            <button type="button" onClick={onReset}
              className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors">
              <RotateCcw size={9} /> Clear all
            </button>
          )}
        </div>
        {stats && (
          <div className="px-2.5 py-1.5 rounded-lg bg-violet-50 border border-violet-100">
            <p className="text-[10px] text-violet-700 font-semibold">
              {Number(stats.total_profiles).toLocaleString()} profiles in database
            </p>
            <p className="text-[9px] text-violet-500 mt-0.5">
              {Number(stats.email_revealed).toLocaleString()} email · {Number(stats.phone_revealed).toLocaleString()} phone revealed
            </p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 pb-4">

          {/* Search */}
          <SectionHeader label="Search" icon={Search} isOpen={open.search} onToggle={() => toggle("search")} count={filters.query ? 1 : 0} />
          {open.search && (
            <div className="pb-3">
              <div className="group rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 transition-all hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-200">
                <Search size={10} className="text-slate-400 flex-shrink-0 group-hover:text-violet-500 transition-colors" />
                <input type="text" value={filters.query}
                  onChange={e => set("query", e.target.value)}
                  placeholder="Name, title, headline…"
                  className="flex-1 bg-transparent text-[11px] text-slate-600 focus:outline-none placeholder:text-slate-400 placeholder:italic placeholder:text-[10px]" />
                {filters.query && <button onClick={() => set("query", "")}><X size={9} className="text-slate-400 hover:text-red-400" /></button>}
              </div>
            </div>
          )}
          <Divider />

          {/* Location */}
          <SectionHeader label="Location" icon={MapPin} isOpen={open.location} onToggle={() => toggle("location")} count={filters.location ? 1 : 0} />
          {open.location && (
            <div className="pb-3">
              <LocationSelect selected={filters.location ? [filters.location] : []}
                onChange={v => set("location", v[v.length - 1] ?? "")} />
              {filters.location && (
                <div className="mt-1.5">
                  <Chip label={filters.location} onRemove={() => set("location", "")} color="bg-blue-50 text-blue-700 border-blue-200" />
                </div>
              )}
            </div>
          )}
          <Divider />

          {/* Role */}
          <SectionHeader label="Role & Seniority" icon={Briefcase} isOpen={open.role} onToggle={() => toggle("role")} count={roleCnt} />
          {open.role && (
            <div className="pb-3 space-y-3">
              <div>
                <SL>Seniority</SL>
                <SeniorityPills selected={filters.seniority} onChange={v => set("seniority", v)} />
              </div>
              <div>
                <SL>Job Function</SL>
                <SearchableMultiSelect label="Search functions…" options={JOB_FUNCTION_OPTIONS.map(o => o.value)}
                  selected={filters.jobFunction} onChange={v => set("jobFunction", v)}
                  icon={Briefcase} chipColor="bg-amber-50 text-amber-700 border-amber-200" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer" onClick={() => set("openToWork", !filters.openToWork)}>
                <div className={cn("relative w-8 h-4 rounded-full transition-all flex-shrink-0",
                  filters.openToWork ? "bg-violet-600" : "bg-slate-200")}>
                  <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
                    style={{ left: filters.openToWork ? "calc(100% - 14px)" : "2px" }} />
                </div>
                <span className={cn("text-[11px] font-medium", filters.openToWork ? "text-violet-700" : "text-slate-600")}>
                  Open to Work <span className="text-violet-400">({Number(stats?.open_to_work ?? 0).toLocaleString()})</span>
                </span>
              </label>
            </div>
          )}
          <Divider />

          {/* Company */}
          <SectionHeader label="Company & Industry" icon={Building2} isOpen={open.company} onToggle={() => toggle("company")} count={companyCnt} />
          {open.company && (
            <div className="pb-3 space-y-3">
              <div>
                <SL>Company Name</SL>
                <TagInput selected={filters.company ? [filters.company] : []}
                  onChange={v => set("company", v[v.length - 1] ?? "")}
                  placeholder="Company name…" icon={Building2}
                  chipColor="bg-blue-50 text-blue-700 border-blue-200" />
              </div>
              <div>
                <SL>Industry</SL>
                <SearchableMultiSelect label="Search industries…" options={INDUSTRY_OPTIONS}
                  selected={filters.industry} onChange={v => set("industry", v)}
                  icon={Building2} chipColor="bg-teal-50 text-teal-700 border-teal-200" />
              </div>
              <div className="space-y-2">
                <SL>Contact Available</SL>
                <label className="flex items-center gap-2 cursor-pointer" onClick={() => set("hasEmail", !filters.hasEmail)}>
                  <div className={cn("relative w-8 h-4 rounded-full transition-all flex-shrink-0",
                    filters.hasEmail ? "bg-violet-600" : "bg-slate-200")}>
                    <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
                      style={{ left: filters.hasEmail ? "calc(100% - 14px)" : "2px" }} />
                  </div>
                  <span className="text-[11px] text-slate-600 flex items-center gap-1">
                    <Mail size={10} className="text-violet-500" /> Has email
                    <span className="text-slate-400">({Number(stats?.email_available ?? 0).toLocaleString()})</span>
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer" onClick={() => set("hasPhone", !filters.hasPhone)}>
                  <div className={cn("relative w-8 h-4 rounded-full transition-all flex-shrink-0",
                    filters.hasPhone ? "bg-violet-600" : "bg-slate-200")}>
                    <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
                      style={{ left: filters.hasPhone ? "calc(100% - 14px)" : "2px" }} />
                  </div>
                  <span className="text-[11px] text-slate-600 flex items-center gap-1">
                    <Phone size={10} className="text-violet-500" /> Has phone
                    <span className="text-slate-400">({Number(stats?.phone_available ?? 0).toLocaleString()})</span>
                  </span>
                </label>
              </div>
            </div>
          )}
          <Divider />

          {/* Skills */}
          <SectionHeader label="Skills" icon={Tag} isOpen={open.skills} onToggle={() => toggle("skills")} count={skillsCnt} />
          {open.skills && (
            <div className="pb-3">
              <TagInput selected={filters.skills} onChange={v => set("skills", v)}
                placeholder="Type skill + Enter…" icon={Tag}
                chipColor="bg-violet-50 text-violet-700 border-violet-200" />
              <p className="mt-1.5 text-[10px] text-slate-400">Must have ALL listed skills</p>
            </div>
          )}
          <Divider />

          {/* Reveal status */}
          <SectionHeader label="Contact Reveal Status" icon={Eye} isOpen={open.revealed} onToggle={() => toggle("revealed")} count={revealCnt} />
          {open.revealed && (
            <div className="pb-3">
              <RevealedFilter value={filters.revealedStatus} onChange={v => set("revealedStatus", v as any)} stats={stats} />
            </div>
          )}

          <div className="h-2" />
        </div>
      </ScrollArea>

      {/* Status bar */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full", hasAny ? "bg-violet-500" : "bg-slate-300")} />
          <span className="text-[10px] text-slate-500">
            {hasAny ? "Filters active" : "Showing all profiles"}
          </span>
        </div>
      </div>
    </div>
  );
}