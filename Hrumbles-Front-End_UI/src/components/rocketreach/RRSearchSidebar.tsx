// src/components/RocketReachSearch/components/RRSearchSidebar.tsx
// v4 — Correct ContactOut accepted values from API CSV
//
// Key fixes:
//   - Industries use EXACT ContactOut accepted values (from CSV)
//   - Job Functions use EXACT ContactOut accepted values (from CSV)
//   - Seniority uses EXACT ContactOut accepted values (from CSV)
//   - Company size labels match CSV values
//   - Years of experience / in current role use CSV range values
//   - Department filter now maps to ContactOut job_function values directly

import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Country, State, City } from "country-state-city";
import {
  Search, UserSearch, RotateCcw, Loader2, X, MapPin, Briefcase,
  Building2, ChevronDown, Code2, Play, GraduationCap, Bell,
  Phone, DollarSign, Users, Filter,
} from "lucide-react";
import type { SkillChip, SkillMode } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RRFilters {
  // Core
  keyword:          string;
  name:             string;
  titles:           string[];
  locations:        string[];
  managementLevels: string[];
  skillChips:       SkillChip[];
  // Company
  currentEmployer:  string[];
  companySize:      string[];
  companyIndustry:  string[];
  companyRevenue:   string;
  companyPubliclyTraded: boolean;
  companyFundingMin: string;
  companyFundingMax: string;
  companyTags:      string[];
  // Role
  department:       string[];
  yearsExperience:  string;
  previousEmployer: string[];
  previousTitle:    string[];
  // Education
  school:           string[];
  degree:           string[];
  major:            string[];
  // Signals
  contactMethod:    string[];
  jobChangeSignal:  string;
  newsSignal:       string;
  jobPostingSignal: string;
  emailGrade:       string;
  // Sort
  orderBy:          "popularity" | "relevance";
  // ContactOut-specific
  openToWork:          boolean;
  yearsInCurrentRole:  string;
  recentlyChangedJobs: boolean;
}

export const DEFAULT_RR_FILTERS: RRFilters = {
  keyword: "", name: "", titles: [], locations: [], managementLevels: [], skillChips: [],
  currentEmployer: [], companySize: [], companyIndustry: [], companyRevenue: "",
  companyPubliclyTraded: false, companyFundingMin: "", companyFundingMax: "", companyTags: [],
  department: [], yearsExperience: "", previousEmployer: [], previousTitle: [],
  school: [], degree: [], major: [],
  contactMethod: [], jobChangeSignal: "", newsSignal: "", jobPostingSignal: "", emailGrade: "",
  orderBy: "popularity",
  openToWork: false, yearsInCurrentRole: "", recentlyChangedJobs: false,
};

// ─── EXACT ContactOut accepted values (from API CSV) ─────────────────────────

// Seniority — exact values from CSV
const MANAGEMENT_LEVELS = [
  "Owner / Founder",
  "CXO",
  "Partner",
  "VP",
  "Head",
  "Director",
  "Manager",
  "Senior",
  "Entry",
  "Intern",
];

// Job Functions — exact values from CSV
const JOB_FUNCTIONS = [
  "Operations",
  "Business Development",
  "Sales",
  "Education",
  "Engineering",
  "Healthcare Services",
  "Information Technology",
  "Administrative",
  "Arts and Design",
  "Customer Success and Support",
  "Finance",
  "Community and Social Services",
  "Media and Communication",
  "Accounting",
  "Marketing",
  "Human Resources",
  "Research",
  "Program and Project Management",
  "Legal",
  "Military and Protective Services",
  "Consulting",
  "Entrepreneurship",
  "Real Estate",
  "Quality Assurance",
  "Purchasing",
  "Product Management",
  "Leadership",
];

// Industries — exact values from CSV
const CO_INDUSTRIES = [
  "Defense & Space",
  "Computer Hardware",
  "Computer Software",
  "Computer Networking",
  "Internet",
  "Semiconductors",
  "Telecommunications",
  "Law Practice",
  "Legal Services",
  "Management Consulting",
  "Biotechnology",
  "Medical Practice",
  "Hospital & Health Care",
  "Pharmaceuticals",
  "Veterinary",
  "Medical Device",
  "Cosmetics",
  "Apparel & Fashion",
  "Sporting Goods",
  "Tobacco",
  "Supermarkets",
  "Food Production",
  "Consumer Electronics",
  "Consumer Goods",
  "Furniture",
  "Retail",
  "Entertainment",
  "Gambling & Casinos",
  "Leisure, Travel & Tourism",
  "Hospitality",
  "Restaurants",
  "Sports",
  "Food & Beverages",
  "Motion Pictures & Film",
  "Broadcast Media",
  "Museums & Institutions",
  "Fine Art",
  "Performing Arts",
  "Recreational Facilities & Services",
  "Banking",
  "Insurance",
  "Financial Services",
  "Real Estate",
  "Investment Banking",
  "Investment Management",
  "Accounting",
  "Construction",
  "Building Materials",
  "Architecture & Planning",
  "Civil Engineering",
  "Aviation & Aerospace",
  "Automotive",
  "Chemicals",
  "Machinery",
  "Mining & Metals",
  "Oil & Energy",
  "Shipbuilding",
  "Utilities",
  "Textiles",
  "Paper & Forest Products",
  "Railroad Manufacture",
  "Farming",
  "Ranching",
  "Dairy",
  "Fishery",
  "Primary/Secondary Education",
  "Higher Education",
  "Education Management",
  "Research",
  "Military",
  "Legislative Office",
  "Judiciary",
  "International Affairs",
  "Government Administration",
  "Executive Office",
  "Law Enforcement",
  "Public Safety",
  "Public Policy",
  "Marketing & Advertising",
  "Nonprofit Organization Management",
  "Fund-Raising",
  "Program Development",
  "Writing & Editing",
  "Staffing & Recruiting",
  "Professional Training & Coaching",
  "Market Research",
  "Public Relations & Communications",
  "Design",
  "Luxury Goods & Jewelry",
  "Renewables & Environment",
  "Glass, Ceramics & Concrete",
  "Packaging & Containers",
  "Industrial Automation",
  "Government Relations",
  "Music",
  "Think Tanks",
  "Philanthropy",
  "E-learning",
  "Nanotechnology",
  "Computer Games",
  "Venture Capital & Private Equity",
  "Wireless",
  "Alternative Medicine",
  "Media Production",
  "Animation",
  "Commercial Real Estate",
  "Capital Markets",
  "Airlines/Aviation",
  "Maritime",
  "Information Services",
  "Social Media",
  "Photography",
  "Import & Export",
  "Alternative Dispute Resolution",
  "Facilities Services",
  "Outsourcing/Offshoring",
  "Health, Wellness & Fitness",
  "Translation & Localization",
  "Computer & Network Security",
  "Graphic Design",
  "Online Media",
  "Environmental Services",
  "Publishing",
  "Printing",
  "Human Resources",
  "Transportation/Trucking/Railroad",
  "Logistics & Supply Chain",
  "Business Supplies & Equipment",
  "Events Services",
  "Arts & Crafts",
  "Electrical & Electronic Manufacturing",
  "Mechanical or Industrial Engineering",
  "Wine & Spirits",
  "Warehousing",
  "Plastics",
  "Computer & Network Security",
  "Security & Investigations",
  "Individual & Family Services",
  "Religious Institutions",
  "Civic & Social Organization",
  "Consumer Services",
  "Libraries",
  "Medical Devices",
  "Wholesale",
  "International Trade & Development",
  "Furniture",
  "Banking",
];

// Company size — exact CSV values with labels
const COMPANY_SIZES = [
  { value: "1_10",       label: "1–10" },
  { value: "11_50",      label: "11–50" },
  { value: "51_200",     label: "51–200" },
  { value: "201_500",    label: "201–500" },
  { value: "501_1000",   label: "501–1000" },
  { value: "1001_5000",  label: "1001–5000" },
  { value: "5001_10000", label: "5001–10000" },
  { value: "10001",      label: "10001+" },
];

// Revenue — exact CSV values (thresholds in dollars)
const REVENUE_OPTIONS = [
  { label: "Any",           value: "" },
  { label: "< $1M",         value: "1000000" },
  { label: "≤ $5M",         value: "5000000" },
  { label: "≤ $10M",        value: "10000000" },
  { label: "≤ $50M",        value: "50000000" },
  { label: "≤ $100M",       value: "100000000" },
  { label: "≤ $250M",       value: "250000000" },
  { label: "≤ $500M",       value: "500000000" },
  { label: "> $1B",         value: "1000000000" },
];

// Years of experience — exact CSV values
const YEARS_EXP_OPTIONS = [
  { label: "Any",            value: "" },
  { label: "< 1 year",       value: "0_1" },
  { label: "1–2 years",      value: "1_2" },
  { label: "3–5 years",      value: "3_5" },
  { label: "6–10 years",     value: "6_10" },
  { label: "10+ years",      value: "10" },
];

// Years in current role — exact CSV values
const YEARS_ROLE_OPTIONS = [
  { label: "Any",            value: "" },
  { label: "< 2 years",      value: "0_2" },
  { label: "2–4 years",      value: "2_4" },
  { label: "4–6 years",      value: "4_6" },
  { label: "6–8 years",      value: "6_8" },
  { label: "8–10 years",     value: "8_10" },
  { label: "10+ years",      value: "10" },
];

const CONTACT_METHODS  = ["phone", "personal email", "work email"];
const COMPANY_TAGS     = ["unicorn", "fortune500", "startup", "nonprofit", "public", "private"];
const DEGREES          = ["Bachelor's", "Master's", "MBA", "PhD", "Associate's", "JD", "MD"];

const JOB_CHANGE_SIGNALS = [
  { label: "Any",                          value: "" },
  { label: "Company Change – 1 month",     value: "Company Change::one_month" },
  { label: "Company Change – 3 months",    value: "Company Change::three_months" },
  { label: "Promotion – 1 month",          value: "Promotion::one_month" },
  { label: "Promotion – 3 months",         value: "Promotion::three_months" },
];

const NEWS_SIGNALS = [
  { label: "Any",                    value: "" },
  { label: "Funding – 1 month",      value: "Funding::one_month" },
  { label: "Funding – 3 months",     value: "Funding::three_months" },
  { label: "Executive Hire – 1 month", value: "Executive Hire::one_month" },
  { label: "IPO – 1 month",           value: "IPO::one_month" },
  { label: "M&A – 1 month",           value: "Mergers & Acquisitions::one_month" },
  { label: "Increases Headcount",     value: "Increases Headcount::one_month" },
  { label: "Launches Product",        value: "Launches Product::one_month" },
  { label: "Partnership – 1 month",   value: "Partnership::one_month" },
  { label: "New Customer",            value: "New Customer::one_month" },
];

const JOB_POSTING_SIGNALS = [
  { label: "Any",                   value: "" },
  { label: "Engineering Roles",     value: "Engineering Roles::one_month" },
  { label: "Sales Roles",           value: "Sales Roles::one_month" },
  { label: "Marketing Roles",       value: "Marketing Roles::one_month" },
  { label: "HR Roles",              value: "Human Resources Roles::one_month" },
  { label: "Finance Roles",         value: "Finance Roles::one_month" },
  { label: "ML / AI Roles",         value: "Machine Learning Roles::one_month" },
  { label: "Operations Roles",      value: "Operations Roles::one_month" },
  { label: "IT Roles",              value: "Information Technology Roles::one_month" },
  { label: "Recruiting Roles",      value: "Recruiting Roles::one_month" },
  { label: "Legal Roles",           value: "Legal Roles::one_month" },
  { label: "Accounting Roles",      value: "Accounting Roles::one_month" },
  { label: "R&D Roles",             value: "Research and Development Roles::one_month" },
];

const EMAIL_GRADES = [
  { label: "Any",                      value: "" },
  { label: "A (highest)",              value: "A" },
  { label: "A- (high)",                value: "A-" },
  { label: "B (medium)",               value: "B" },
  { label: "A+ professional only",     value: "A::professional only" },
  { label: "A+ personal only",         value: "A::personal only" },
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

// ─── Collapsible section header ───────────────────────────────────────────────
const SectionHeader: React.FC<{
  label:      string;
  icon:       React.ElementType;
  isOpen:     boolean;
  onToggle:   () => void;
  count?:     number;
  hasActive?: boolean;
}> = ({ label, icon: Icon, isOpen, onToggle, count, hasActive }) => (
  <button type="button" onClick={onToggle} className="w-full flex items-center justify-between py-2 group">
    <div className="flex items-center gap-2">
      <Icon size={11} className={cn("transition-colors", hasActive ? "text-violet-500" : "text-slate-400 group-hover:text-slate-600")} />
      <span className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors",
        hasActive
          ? "bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
          : "text-slate-500 group-hover:text-slate-700")}>
        {label}
      </span>
      {(count ?? 0) > 0 && (
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          {count}
        </span>
      )}
    </div>
    <ChevronDown size={10} className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
  </button>
);

// ─── Portal dropdown ──────────────────────────────────────────────────────────
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
        const r    = anchorRef.current.getBoundingClientRect();
        const w    = Math.max(r.width, 200);
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
    <div style={style} className="bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden overflow-y-auto">
      {children}
    </div>,
    document.body
  );
}

// ─── Chip tag ─────────────────────────────────────────────────────────────────
const Chip: React.FC<{ label: string; onRemove: () => void; color?: string }> = ({ label, onRemove, color }) => (
  <span className={cn(
    "inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium border",
    color ?? "bg-violet-50 text-violet-700 border-violet-200"
  )}>
    {label}
    <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-400 transition-colors ml-0.5">
      <X size={8} />
    </button>
  </span>
);

// ─── Generic tag input ────────────────────────────────────────────────────────
function TagInput({ selected, onChange, onSearch, placeholder, icon: Icon, chipColor }: {
  selected: string[]; onChange: (v: string[]) => void; onSearch: () => void;
  placeholder: string; icon: React.ElementType; chipColor?: string;
}) {
  const [input, setInput] = useState("");
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (!selected.includes(input.trim())) onChange([...selected, input.trim()]);
      setInput("");
    } else if (e.key === "Enter" && !input.trim()) {
      e.preventDefault(); onSearch();
    } else if (e.key === "Backspace" && !input && selected.length) {
      onChange(selected.slice(0, -1));
    }
  };
  return (
    <div className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(t => <Chip key={t} label={t} onRemove={() => onChange(selected.filter(x => x !== t))} color={chipColor} />)}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 focus-within:border-violet-400 transition-colors">
        <Icon size={10} className="text-slate-400 flex-shrink-0" />
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[11px] text-slate-600 placeholder-slate-400 focus:outline-none" />
      </div>
    </div>
  );
}

// ─── Searchable multi-select dropdown ────────────────────────────────────────
function SearchableMultiSelect({ label, options, selected, onChange, onSearch, icon: Icon, chipColor }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
  onSearch: () => void; icon: React.ElementType; chipColor?: string;
}) {
  const [q, setQ]       = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef         = useRef<HTMLDivElement>(null);
  const anchorRef       = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() =>
    options.filter(o => !selected.includes(o) && o.toLowerCase().includes(q.toLowerCase())).slice(0, 30),
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
          className="rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 focus-within:border-violet-400 transition-colors cursor-text">
          <Icon size={10} className="text-slate-400 flex-shrink-0" />
          <input ref={inputRef} type="text" value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key === "Escape") setOpen(false); if (e.key === "Enter" && !q.trim()) { setOpen(false); onSearch(); } }}
            placeholder={label}
            className="flex-1 bg-transparent text-[11px] text-slate-600 placeholder-slate-400 focus:outline-none" />
          <ChevronDown size={9} className={cn("text-slate-400 flex-shrink-0 transition-transform", open && "rotate-180")} />
        </div>
        <PortalDropdown anchorRef={anchorRef} isOpen={open && filtered.length > 0}>
          {filtered.map(opt => (
            <button key={opt} type="button"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onChange([...selected, opt]); setQ(""); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="w-full px-3 py-1.5 text-[11px] text-slate-700 hover:bg-violet-50 text-left transition-colors">
              {opt}
            </button>
          ))}
        </PortalDropdown>
      </div>
    </div>
  );
}

// ─── Simple select ─────────────────────────────────────────────────────────────
function SimpleSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[]; placeholder?: string;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-8 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-600 px-2.5 focus:outline-none focus:border-violet-400 cursor-pointer">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── Text input ───────────────────────────────────────────────────────────────
function TextInput({ value, onChange, onSearch, placeholder, icon: Icon }: {
  value: string; onChange: (v: string) => void; onSearch: () => void;
  placeholder: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 focus-within:border-violet-400 transition-colors">
      <Icon size={10} className="text-slate-400 flex-shrink-0" />
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onSearch(); } }}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[11px] text-slate-600 placeholder-slate-400 focus:outline-none" />
      {value && <button type="button" onClick={() => onChange("")}><X size={9} className="text-slate-400 hover:text-red-400" /></button>}
    </div>
  );
}

// ─── Checkbox pills ────────────────────────────────────────────────────────────
function CheckboxPills({ options, selected, onChange }: {
  options: { value: string; label: string }[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(o => {
        const active = selected.includes(o.value);
        return (
          <button key={o.value} type="button"
            onClick={() => onChange(active ? selected.filter(x => x !== o.value) : [...selected, o.value])}
            className={cn(
              "px-2 py-0.5 rounded-full text-[9px] font-semibold border transition-all",
              active
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent"
                : "bg-white text-slate-500 border-slate-200 hover:border-violet-300"
            )}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// String-array pill variant (for seniority, tags, contact methods)
function StringPills({ options, selected, onChange }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  return (
    <CheckboxPills
      options={options.map(o => ({ value: o, label: o }))}
      selected={selected}
      onChange={onChange}
    />
  );
}

// ─── Skills chip builder ──────────────────────────────────────────────────────
const SKILL_MODE_CONFIG: Record<SkillMode, { label: string; dot: string; chip: string }> = {
  must:    { label: "Must",    dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700 border-violet-200" },
  nice:    { label: "Nice",    dot: "bg-blue-400",   chip: "bg-blue-50 text-blue-700 border-blue-200" },
  exclude: { label: "Exclude", dot: "bg-red-400",    chip: "bg-red-50 text-red-600 border-red-200" },
};

const SkillChipBuilder: React.FC<{
  chips: SkillChip[]; onChange: (c: SkillChip[]) => void; onSearch: () => void;
}> = ({ chips, onChange, onSearch }) => {
  const [input, setInput]       = useState("");
  const [mode, setMode]         = useState<SkillMode>("must");
  const [showBool, setShowBool] = useState(false);
  const [boolIn, setBoolIn]     = useState("");
  const inputRef                = useRef<HTMLInputElement>(null);

  const addChips = (raw: string, m: SkillMode) => {
    const labels   = raw.split(",").map(s => s.trim()).filter(Boolean);
    const existing = new Set(chips.map(c => c.label.toLowerCase()));
    const next     = labels.filter(l => !existing.has(l.toLowerCase())).map(l => ({ label: l, mode: m }));
    if (next.length) onChange([...chips, ...next]);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault(); addChips(input, mode); setInput("");
    } else if (e.key === "Enter" && !input.trim()) {
      e.preventDefault(); onSearch();
    } else if (e.key === "Backspace" && !input && chips.length) {
      onChange(chips.slice(0, -1));
    }
  };

  const applyBoolean = () => {
    if (!boolIn.trim()) return;
    const raw   = boolIn.replace(/\bAND\b/gi, " ").replace(/\bOR\b/gi, " ");
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
      <div className="flex items-center gap-1">
        {(["must","nice","exclude"] as SkillMode[]).map(m => {
          const cfg = SKILL_MODE_CONFIG[m];
          return (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all",
                mode === m ? `${cfg.chip} border-current` : "text-slate-400 border-slate-200 bg-white")}>
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

      {showBool && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-1.5">
          <p className="text-[8px] text-slate-400">e.g. <span className="text-violet-500">Python AND React NOT PHP</span></p>
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

      <div onClick={() => inputRef.current?.focus()}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 flex flex-wrap gap-1 min-h-[34px] cursor-text focus-within:border-violet-400 transition-colors">
        {chips.map((chip, i) => {
          const cfg = SKILL_MODE_CONFIG[chip.mode];
          return (
            <span key={i} onClick={() => cycleMode(i)}
              className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium cursor-pointer", cfg.chip)}>
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
              {chip.label}
              <button type="button" onClick={e => { e.stopPropagation(); onChange(chips.filter((_, j) => j !== i)); }} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
            </span>
          );
        })}
        <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder={chips.length === 0 ? "Type skill, Enter…" : ""}
          className="flex-1 min-w-[60px] bg-transparent text-[11px] text-slate-700 placeholder-slate-300 focus:outline-none" />
      </div>

      <div className="flex items-center gap-2 text-[8px] text-slate-400">
        {(["must","nice","exclude"] as SkillMode[]).map(m => (
          <span key={m} className="flex items-center gap-0.5">
            <span className={cn("w-1.5 h-1.5 rounded-full", SKILL_MODE_CONFIG[m].dot)} />
            {m === "must" ? "strict" : m === "nice" ? "boost" : "exclude"}
          </span>
        ))}
        <span className="ml-auto">click to cycle</span>
      </div>
    </div>
  );
};

// ─── Location select ──────────────────────────────────────────────────────────
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

function LocationSelect({ selected, onChange, onSearch }: {
  selected: string[]; onChange: (v: string[]) => void; onSearch: () => void;
}) {
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
              <span key={val} className={cn("inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[10px] font-medium border", LOC_STYLE[t])}>
                {val}
                <button type="button" onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onChange(selected.filter(x => x !== val)); }}><X size={8} /></button>
              </span>
            );
          })}
        </div>
      )}
      <div ref={anchorRef}>
        <div onClick={() => { setOpen(true); inputRef.current?.focus(); }}
          className="rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 focus-within:border-violet-400 transition-colors cursor-text"
          onMouseDown={e => e.stopPropagation()}>
          <MapPin size={10} className="text-slate-400 flex-shrink-0" />
          <input ref={inputRef} type="text" value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key === "Enter" && !q.trim()) { setOpen(false); onSearch(); } }}
            placeholder="Country, state or city…"
            className="flex-1 bg-transparent text-[11px] text-slate-600 placeholder-slate-400 focus:outline-none" />
          {q && <button type="button" onMouseDown={e => { e.preventDefault(); setQ(""); }} className="text-slate-400 hover:text-slate-600"><X size={9} /></button>}
        </div>
        <PortalDropdown anchorRef={anchorRef} isOpen={open && options.length > 0}>
          {options.map(opt => (
            <button key={opt.value} type="button"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onChange([...selected, opt.value]); setQ(""); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-violet-50 text-left transition-colors">
              <span className={cn("text-[8px] px-1 py-0.5 rounded border font-semibold", LOC_STYLE[opt.type])}>{opt.type[0].toUpperCase()}</span>
              <span className="text-[11px] text-slate-700 truncate">{opt.label}</span>
            </button>
          ))}
        </PortalDropdown>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Div = () => <div className="h-px bg-slate-100" />;
const SL: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{children}</p>
);

// ─── Props ────────────────────────────────────────────────────────────────────
type SearchProvider = "rocketreach" | "contactout";

interface RRSearchSidebarProps {
  filters:      RRFilters;
  provider?:    SearchProvider;
  onChange:     (patch: Partial<RRFilters>) => void;
  onClearAll:   () => void;
  onSearch:     () => void;
  isLoading:    boolean;
  totalEntries: number;
  filterCount:  number;
  hasFilters:   boolean;
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────
export const RRSearchSidebar: React.FC<RRSearchSidebarProps> = ({
  filters, provider = "contactout", onChange, onClearAll, onSearch,
  isLoading, totalEntries, filterCount, hasFilters,
}) => {
  const [open, setOpen] = useState({
    core:      true,
    company:   false,
    role:      false,
    education: false,
    signals:   false,
    sort:      false,
  });

  const toggle = (k: keyof typeof open) => setOpen(prev => ({ ...prev, [k]: !prev[k] }));
  const s   = filters;
  const set = (patch: Partial<RRFilters>) => onChange(patch);

  // Active counts per section
  const coreCnt    = s.titles.length + s.locations.length + s.managementLevels.length + s.skillChips.length
    + (s.yearsExperience ? 1 : 0) + (s.openToWork ? 1 : 0)
    + (s.recentlyChangedJobs ? 1 : 0) + (s.yearsInCurrentRole ? 1 : 0);
  const companyCnt = s.currentEmployer.length + s.companySize.length + s.companyIndustry.length
    + (s.companyRevenue ? 1 : 0) + (s.companyPubliclyTraded ? 1 : 0)
    + (s.companyFundingMin ? 1 : 0) + (s.companyFundingMax ? 1 : 0) + s.companyTags.length;
  const roleCnt    = s.department.length + s.previousEmployer.length + s.previousTitle.length;
  const eduCnt     = s.school.length + s.degree.length + s.major.length;
  const sigCnt     = s.contactMethod.length + (s.jobChangeSignal ? 1 : 0)
    + (s.newsSignal ? 1 : 0) + (s.jobPostingSignal ? 1 : 0) + (s.emailGrade ? 1 : 0);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100">
      <GradientDef />

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserSearch size={12} style={{ stroke: "url(#rr-sidebar-gradient)" }} />
            <span className="text-[10px] font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              People Search
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

        {totalEntries > 0 && (
          <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
            <span className="text-[10px] bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-medium">Found</span>
            <span className="text-[10px] font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{totalEntries.toLocaleString()}</span>
          </div>
        )}

        {/* Keyword */}
        <div className="rounded-lg p-[1px] bg-slate-200 focus-within:bg-gradient-to-r focus-within:from-purple-600 focus-within:to-pink-600 transition-all mb-3">
          <div className="relative bg-white rounded-lg">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Keyword search…" value={s.keyword}
              onChange={e => set({ keyword: e.target.value })}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onSearch(); } }}
              className="w-full h-8 pl-7 pr-3 rounded-lg text-[11px] text-slate-600 placeholder:text-[10px] placeholder:text-slate-400 placeholder:italic bg-transparent border-none outline-none" />
          </div>
        </div>

        {/* Run Search */}
        <button type="button" onClick={onSearch} disabled={isLoading || !hasFilters}
          className={cn("w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold transition-all",
            hasFilters && !isLoading
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 shadow-sm"
              : "bg-slate-100 text-slate-400 cursor-not-allowed")}>
          {isLoading
            ? <><Loader2 size={12} className="animate-spin" /> Searching…</>
            : <><Play size={11} className="fill-current" /> Run Search</>}
        </button>
      </div>

      {/* ── Filter sections ── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4">

          {/* ── CORE ── */}
          <SectionHeader label="Core Filters" icon={Filter} isOpen={open.core} onToggle={() => toggle("core")} count={coreCnt} hasActive={coreCnt > 0} />
          {open.core && (
            <div className="pb-3 space-y-3">
              {/* Job Title */}
              <div>
                <SL>Job Title</SL>
                <TagInput selected={s.titles} onChange={v => set({ titles: v })} onSearch={onSearch}
                  placeholder="e.g. Software Engineer, Enter…" icon={Briefcase} />
              </div>

              {/* Open to Work */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer" onClick={() => set({ openToWork: !s.openToWork })}>
                  <div className={cn("relative w-8 h-4 rounded-full transition-all cursor-pointer flex-shrink-0",
                    s.openToWork ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-slate-200")}>
                    <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
                      style={{ left: s.openToWork ? "calc(100% - 14px)" : "2px" }} />
                  </div>
                  <span className={cn("text-[11px] font-medium", s.openToWork ? "text-violet-700" : "text-slate-600")}>
                    Open to Work
                  </span>
                </label>
                {s.openToWork && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Active</span>
                )}
              </div>

              {/* Seniority — exact CO values */}
              <div>
                <SL>Seniority Level</SL>
                <StringPills options={MANAGEMENT_LEVELS} selected={s.managementLevels}
                  onChange={v => set({ managementLevels: v })} />
              </div>

              {/* Skills */}
              <div>
                <SL>Skills</SL>
                <SkillChipBuilder chips={s.skillChips} onChange={v => set({ skillChips: v })} onSearch={onSearch} />
              </div>

              {/* Location */}
              <div>
                <SL>Location</SL>
                <LocationSelect selected={s.locations} onChange={v => set({ locations: v })} onSearch={onSearch} />
              </div>

              {/* Years of experience */}
              <div>
                <SL>Years of Experience</SL>
                <SimpleSelect value={s.yearsExperience} onChange={v => set({ yearsExperience: v })}
                  options={YEARS_EXP_OPTIONS} placeholder="Any experience" />
              </div>

              {/* Years in current role — CO only */}
              {provider === "contactout" && (
                <div>
                  <SL>Years in Current Role</SL>
                  <SimpleSelect value={s.yearsInCurrentRole} onChange={v => set({ yearsInCurrentRole: v })}
                    options={YEARS_ROLE_OPTIONS} placeholder="Any duration" />
                </div>
              )}
            </div>
          )}

          <Div />

          {/* ── COMPANY ── */}
          <SectionHeader label="Company" icon={Building2} isOpen={open.company} onToggle={() => toggle("company")} count={companyCnt} hasActive={companyCnt > 0} />
          {open.company && (
            <div className="pb-3 space-y-3">
              <div>
                <SL>Current Employer</SL>
                <TagInput selected={s.currentEmployer} onChange={v => set({ currentEmployer: v })} onSearch={onSearch}
                  placeholder="Add company, Enter…" icon={Building2} chipColor="bg-blue-50 text-blue-700 border-blue-200" />
              </div>

              <div>
                <SL>Company Size</SL>
                <CheckboxPills options={COMPANY_SIZES} selected={s.companySize}
                  onChange={v => set({ companySize: v })} />
              </div>

              {/* Industry — exact CO accepted values */}
              <div>
                <SL>Industry</SL>
                <SearchableMultiSelect label="Search industries…" options={CO_INDUSTRIES}
                  selected={s.companyIndustry} onChange={v => set({ companyIndustry: v })}
                  onSearch={onSearch} icon={Building2}
                  chipColor="bg-teal-50 text-teal-700 border-teal-200" />
              </div>

              <div>
                <SL>Revenue</SL>
                <SimpleSelect value={s.companyRevenue} onChange={v => set({ companyRevenue: v })}
                  options={REVENUE_OPTIONS} placeholder="Any revenue" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="pub-traded" checked={s.companyPubliclyTraded}
                  onChange={e => set({ companyPubliclyTraded: e.target.checked })}
                  className="accent-violet-600 cursor-pointer" />
                <label htmlFor="pub-traded" className="text-[11px] text-slate-600 cursor-pointer">Publicly Traded only</label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <SL>Funding Min ($)</SL>
                  <input type="number" value={s.companyFundingMin}
                    onChange={e => set({ companyFundingMin: e.target.value })}
                    onKeyDown={e => { if (e.key === "Enter") onSearch(); }}
                    placeholder="e.g. 1000000"
                    className="w-full h-8 rounded-lg border border-slate-200 px-2.5 text-[11px] text-slate-600 focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <SL>Funding Max ($)</SL>
                  <input type="number" value={s.companyFundingMax}
                    onChange={e => set({ companyFundingMax: e.target.value })}
                    onKeyDown={e => { if (e.key === "Enter") onSearch(); }}
                    placeholder="e.g. 50000000"
                    className="w-full h-8 rounded-lg border border-slate-200 px-2.5 text-[11px] text-slate-600 focus:outline-none focus:border-violet-400" />
                </div>
              </div>

              <div>
                <SL>Company Tags</SL>
                <StringPills options={COMPANY_TAGS} selected={s.companyTags}
                  onChange={v => set({ companyTags: v })} />
              </div>
            </div>
          )}

          <Div />

          {/* ── ROLE ── */}
          <SectionHeader label="Role Details" icon={Briefcase} isOpen={open.role} onToggle={() => toggle("role")} count={roleCnt} hasActive={roleCnt > 0} />
          {open.role && (
            <div className="pb-3 space-y-3">
              {/* Job Function — exact CO accepted values */}
              <div>
                <SL>Job Function</SL>
                <SearchableMultiSelect label="Search functions…" options={JOB_FUNCTIONS}
                  selected={s.department} onChange={v => set({ department: v })}
                  onSearch={onSearch} icon={Briefcase}
                  chipColor="bg-amber-50 text-amber-700 border-amber-200" />
              </div>

              <div>
                <SL>Previous Employer</SL>
                <TagInput selected={s.previousEmployer} onChange={v => set({ previousEmployer: v })}
                  onSearch={onSearch} placeholder="Past company, Enter…" icon={Building2}
                  chipColor="bg-slate-100 text-slate-700 border-slate-200" />
              </div>

              <div>
                <SL>Previous Title</SL>
                <TagInput selected={s.previousTitle} onChange={v => set({ previousTitle: v })}
                  onSearch={onSearch} placeholder="Past title, Enter…" icon={Briefcase}
                  chipColor="bg-slate-100 text-slate-700 border-slate-200" />
              </div>
            </div>
          )}

          <Div />

          {/* ── EDUCATION ── */}
          <SectionHeader label="Education" icon={GraduationCap} isOpen={open.education} onToggle={() => toggle("education")} count={eduCnt} hasActive={eduCnt > 0} />
          {open.education && (
            <div className="pb-3 space-y-3">
              <div>
                <SL>School / University</SL>
                <TagInput selected={s.school} onChange={v => set({ school: v })}
                  onSearch={onSearch} placeholder="e.g. IIT Bombay, Enter…" icon={GraduationCap}
                  chipColor="bg-green-50 text-green-700 border-green-200" />
              </div>
              <div>
                <SL>Degree</SL>
                <SearchableMultiSelect label="Search degrees…" options={DEGREES}
                  selected={s.degree} onChange={v => set({ degree: v })}
                  onSearch={onSearch} icon={GraduationCap}
                  chipColor="bg-green-50 text-green-700 border-green-200" />
              </div>
              <div>
                <SL>Major / Field</SL>
                <TagInput selected={s.major} onChange={v => set({ major: v })}
                  onSearch={onSearch} placeholder="e.g. Computer Science, Enter…" icon={GraduationCap}
                  chipColor="bg-green-50 text-green-700 border-green-200" />
              </div>
            </div>
          )}

          <Div />

          {/* ── CONTACT & SIGNALS ── */}
          <SectionHeader label="Contact & Signals" icon={Bell} isOpen={open.signals} onToggle={() => toggle("signals")} count={sigCnt} hasActive={sigCnt > 0} />
          {open.signals && (
            <div className="pb-3 space-y-3">
              <div>
                <SL>Contact Method</SL>
                <StringPills options={CONTACT_METHODS} selected={s.contactMethod}
                  onChange={v => set({ contactMethod: v })} />
              </div>
              <div>
                <SL>Email Grade</SL>
                <SimpleSelect value={s.emailGrade} onChange={v => set({ emailGrade: v })}
                  options={EMAIL_GRADES} placeholder="Any grade" />
              </div>
              <div>
                <SL>Job Change Signal</SL>
                <SimpleSelect value={s.jobChangeSignal} onChange={v => set({ jobChangeSignal: v })}
                  options={JOB_CHANGE_SIGNALS} placeholder="Any job change" />
              </div>
              <div>
                <SL>Company News</SL>
                <SimpleSelect value={s.newsSignal} onChange={v => set({ newsSignal: v })}
                  options={NEWS_SIGNALS} placeholder="Any news" />
              </div>
              <div>
                <SL>Hiring Signal</SL>
                <SimpleSelect value={s.jobPostingSignal} onChange={v => set({ jobPostingSignal: v })}
                  options={JOB_POSTING_SIGNALS} placeholder="Any posting" />
              </div>
            </div>
          )}

          <Div />

          {/* ── SORT ── */}
          <SectionHeader label="Sort & Display" icon={Search} isOpen={open.sort} onToggle={() => toggle("sort")} />
          {open.sort && (
            <div className="pb-3 space-y-3">
              <div>
                <SL>Name Search</SL>
                <TextInput value={s.name} onChange={v => set({ name: v })} onSearch={onSearch}
                  placeholder="e.g. Rahul Gupta" icon={Users} />
              </div>
              <div>
                <SL>Order By</SL>
                <SimpleSelect value={s.orderBy} onChange={v => set({ orderBy: v as any })}
                  options={[
                    { label: "Popularity", value: "popularity" },
                    { label: "Relevance",  value: "relevance" },
                  ]} />
              </div>
            </div>
          )}

          <div className="h-3" />
        </div>
      </ScrollArea>

      {/* ── Status bar ── */}
      <div className="flex-shrink-0 px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full",
            isLoading   ? "bg-amber-400 animate-pulse"
            : hasFilters ? "bg-emerald-400"
            : "bg-slate-300")} />
          <span className="text-[10px] text-slate-500">
            {isLoading     ? "Searching…"
             : hasFilters  ? `${filterCount} filter${filterCount !== 1 ? "s" : ""} active`
             : "Set filters to search"}
          </span>
        </div>
      </div>
    </div>
  );
};