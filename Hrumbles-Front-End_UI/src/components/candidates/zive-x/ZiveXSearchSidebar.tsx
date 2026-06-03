// src/components/candidates/zive-x/ZiveXSearchSidebar.tsx
// TISearchSidebar-style compact sidebar for Zive-X
// Accordion sections, MandatoryTagSelector for keywords/skills,
// LocationSelect (country-state-city), Search button at bottom.

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Country, State, City } from 'country-state-city';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, RotateCcw, MapPin, Briefcase, Building2, ChevronDown,
  Filter, X, GraduationCap, Database, Sparkles, Loader2, Info,
} from 'lucide-react';
import { SearchFilters, SearchTag } from '@/types/candidateSearch';
import { MandatoryTagSelector } from '@/components/candidates/zive-x/MandatoryTagSelector';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// ── Gradient def ──────────────────────────────────────────────
const GradientDef = () => (
  <svg width="0" height="0" style={{ position:'absolute' }}>
    <defs>
      <linearGradient id="zx-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
);

// ── Portal dropdown ───────────────────────────────────────────
function PortalDropdown({ anchorRef, isOpen, maxH=220, children }: {
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
        const w = Math.max(r.width, 200);
        const l = Math.min(r.left, window.innerWidth - w - 8);
        const up = window.innerHeight - r.bottom < maxH && r.top > maxH;
        setStyle({ position:'fixed', left:Math.max(4,l), width:w, zIndex:99999, maxHeight:maxH,
          ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(rid); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [isOpen, anchorRef, maxH]);
  if (!isOpen) return null;
  return ReactDOM.createPortal(
    <div style={style} className="bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-y-auto ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
      {children}
    </div>, document.body
  );
}

// ── Section header ────────────────────────────────────────────
function SectionHeader({ label, icon:Icon, isOpen, onToggle, count }: {
  label:string; icon:React.ElementType; isOpen:boolean; onToggle:()=>void; count?:number;
}) {
  const active = (count ?? 0) > 0;
  return (
    <button type="button" onClick={onToggle} className="w-full flex items-center justify-between py-2.5 group">
      <div className="flex items-center gap-2">
        <Icon size={11} className={cn('transition-colors', active ? 'text-violet-500' : 'text-slate-400 group-hover:text-slate-600')} />
        <span className={cn('text-[10px] font-bold uppercase tracking-wider transition-colors',
          active ? 'bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent' : 'text-slate-500 group-hover:text-slate-700')}>
          {label}
        </span>
        {active && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-white">{count}</span>}
      </div>
      <ChevronDown size={10} className={cn('text-slate-400 transition-transform duration-200', isOpen && 'rotate-180')} />
    </button>
  );
}

const Divider = () => <div className="h-px bg-slate-100 my-0.5" />;
const SL = ({ children }: { children:React.ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{children}</p>
);

// ── Chip ──────────────────────────────────────────────────────
const Chip = ({ label, onRemove, color }: { label:string; onRemove:()=>void; color?:string }) => (
  <span className={cn('inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium border',
    color ?? 'bg-violet-50 text-violet-700 border-violet-200')}>
    {label}
    <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-400 transition-colors"><X size={8} /></button>
  </span>
);

// ── Plain text input ──────────────────────────────────────────
function TextInput({ value, onChange, placeholder, icon:Icon }: {
  value:string; onChange:(v:string)=>void; placeholder:string; icon:React.ElementType;
}) {
  return (
    <div className="group rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 transition-all hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-200">
      <Icon size={10} className="text-slate-400 flex-shrink-0 group-hover:text-violet-500 transition-colors" />
      <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 bg-transparent text-[11px] text-slate-600 focus:outline-none placeholder:text-slate-400 placeholder:italic placeholder:text-[10px]" />
      {value && <button type="button" onClick={()=>onChange('')}><X size={9} className="text-slate-400 hover:text-red-400" /></button>}
    </div>
  );
}

// ── Exp range selects ─────────────────────────────────────────
function ExpRange({ min, max, onMin, onMax }: {
  min:string; max:string; onMin:(v:string)=>void; onMax:(v:string)=>void;
}) {
  const [openMin, setOpenMin] = useState(false);
  const [openMax, setOpenMax] = useState(false);
  const refMin = useRef<HTMLDivElement>(null);
  const refMax = useRef<HTMLDivElement>(null);
  const opts = Array.from({length:31},(_,i)=>i.toString());

  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label:'Min yrs', value:min, set:onMin, open:openMin, setOpen:setOpenMin, ref:refMin },
        { label:'Max yrs', value:max, set:onMax, open:openMax, setOpen:setOpenMax, ref:refMax },
      ].map(({ label, value, set, open, setOpen, ref }) => (
        <div key={label} ref={ref} className="relative">
          <div onClick={()=>setOpen(v=>!v)}
            className="group w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 flex items-center justify-between cursor-pointer hover:border-violet-300 transition-all">
            <span className={cn('text-[11px]', value ? 'text-slate-700' : 'text-slate-400 italic')}>{value ? `${value} yr` : label}</span>
            <ChevronDown size={9} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
          </div>
          <PortalDropdown anchorRef={ref} isOpen={open} maxH={180}>
            {opts.map(o => (
              <button key={o} type="button" onMouseDown={e=>{e.preventDefault();set(o);setOpen(false);}}
                className={cn('w-full text-left px-3 py-1.5 text-[11px] hover:bg-violet-50 transition-all', value===o && 'bg-violet-50 text-violet-700 font-medium')}>
                {o === '0' ? 'Any' : `${o} yr`}
              </button>
            ))}
          </PortalDropdown>
        </div>
      ))}
    </div>
  );
}

// ── Notice period chips ───────────────────────────────────────
const NOTICE_OPTIONS = ['Immediate', '15 Days', '1 Month', '2 Months', '3 Months+'];
function NoticePeriodChips({ value, onChange }: { value:string[]; onChange:(v:string[])=>void }) {
  const toggle = (p:string) => onChange(value.includes(p) ? value.filter(x=>x!==p) : [...value, p]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {NOTICE_OPTIONS.map(p => (
        <button key={p} type="button" onClick={()=>toggle(p)}
          className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all',
            value.includes(p)
              ? 'bg-violet-50 border-violet-500 text-violet-700 font-semibold'
              : 'border-slate-200 text-slate-500 bg-white hover:border-violet-300 hover:text-violet-600')}>
          {p}
        </button>
      ))}
    </div>
  );
}

// ── CTC range inputs ──────────────────────────────────────────
function CTCRange({ minLabel, maxLabel, min, max, onMin, onMax }: {
  minLabel:string; maxLabel:string; min:string; max:string; onMin:(v:string)=>void; onMax:(v:string)=>void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <input type="number" placeholder={minLabel} value={min} onChange={e=>onMin(e.target.value)}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 placeholder:text-slate-400 placeholder:text-[10px] placeholder:italic transition-all" />
      <input type="number" placeholder={maxLabel} value={max} onChange={e=>onMax(e.target.value)}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 placeholder:text-slate-400 placeholder:text-[10px] placeholder:italic transition-all" />
    </div>
  );
}

// ── LocationSelect (country-state-city) ───────────────────────
type LocType = 'country'|'state'|'city';
const LOC_STYLE: Record<LocType,string> = {
  country: 'bg-blue-50 text-blue-700 border-blue-200',
  state:   'bg-orange-50 text-orange-700 border-orange-200',
  city:    'bg-violet-50 text-violet-700 border-violet-200',
};
const ALL_COUNTRIES = Country.getAllCountries().map(c => ({ value:c.name, label:`${c.flag??''} ${c.name}`.trim(), type:'country' as LocType }));
const ALL_STATES    = State.getAllStates().map(s => ({ value:s.name, label:s.name, type:'state' as LocType }));
const POPULAR = ['India','United States','United Kingdom','Canada','Australia','Germany','Singapore','UAE','France'];

function searchLocs(q:string, selectedVals:string[]) {
  const lq = q.toLowerCase().trim();
  if (!lq) return ALL_COUNTRIES.filter(c=>POPULAR.includes(c.value)&&!selectedVals.includes(c.value)).slice(0,10);
  const out: {value:string;label:string;type:LocType}[] = [];
  ALL_COUNTRIES.filter(c=>c.value.toLowerCase().includes(lq)&&!selectedVals.includes(c.value)).slice(0,4).forEach(c=>out.push(c));
  ALL_STATES.filter(s=>s.value.toLowerCase().includes(lq)&&!selectedVals.includes(s.value)).slice(0,3).forEach(s=>out.push({...s,type:'state'}));
  if (lq.length>=3) City.getAllCities().filter(c=>c.name.toLowerCase().includes(lq)&&!selectedVals.includes(c.name)).slice(0,5).forEach(c=>out.push({value:c.name,label:c.name,type:'city'}));
  return out.slice(0,15);
}

function getLocType(v:string): LocType {
  if (ALL_COUNTRIES.some(c=>c.value===v)) return 'country';
  if (ALL_STATES.some(s=>s.value===v)) return 'state';
  return 'city';
}

function LocationTagInput({ selected, onChange }: { selected:SearchTag[]; onChange:(v:SearchTag[])=>void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const selectedVals = selected.map(t=>t.value);
  const opts = useMemo(()=>searchLocs(q, selectedVals),[q, selectedVals.join(',')]);

  useEffect(()=>{
    const fn=(e:MouseEvent)=>{if(wrapRef.current&&!wrapRef.current.contains(e.target as Node)){setOpen(false);setQ('');}};
    document.addEventListener('mousedown',fn); return ()=>document.removeEventListener('mousedown',fn);
  },[]);

  const add = (val:string, mandatory:boolean=false) => {
    if (!selectedVals.includes(val)) onChange([...selected,{value:val,mandatory}]);
    setQ(''); setTimeout(()=>inputRef.current?.focus(),50);
  };

  const toggleMandatory = (i:number) => {
    const next=[...selected]; next[i]={...next[i],mandatory:!next[i].mandatory}; onChange(next);
  };

  return (
    <div ref={wrapRef} className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((t,i)=>{
            const lt = getLocType(t.value);
            return (
              <span key={t.value} onClick={()=>toggleMandatory(i)}
                className={cn('inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[10px] font-medium border cursor-pointer transition-all',
                  t.mandatory
                    ? 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-200'
                    : LOC_STYLE[lt])}>
                {t.mandatory && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"/>}
                {t.value}
                <button type="button" onMouseDown={e=>{e.preventDefault();e.stopPropagation();onChange(selected.filter((_,j)=>j!==i));}}
                  className="opacity-60 hover:opacity-100 hover:text-red-500 transition-all"><X size={8}/></button>
              </span>
            );
          })}
        </div>
      )}
      <div ref={anchorRef}>
        <div onClick={()=>{setOpen(true);inputRef.current?.focus();}}
          className="group rounded-lg border border-slate-200 bg-white flex items-center gap-2 px-2 h-8 cursor-text transition-all hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-200">
          <MapPin size={10} className="text-slate-400 flex-shrink-0 group-hover:text-violet-500 transition-colors"/>
          <input ref={inputRef} type="text" value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)}
            onKeyDown={e=>{if(e.key==='Escape')setOpen(false); if(e.key==='Enter'&&q.trim()&&!open){add(q.trim());} }}
            placeholder="Country, state or city…"
            className="flex-1 bg-transparent text-[11px] text-slate-600 focus:outline-none placeholder:text-slate-400 placeholder:italic placeholder:text-[10px]" />
          {q && <button type="button" onMouseDown={e=>{e.preventDefault();setQ('');}}><X size={9} className="text-slate-400 hover:text-red-400"/></button>}
        </div>
        <PortalDropdown anchorRef={anchorRef} isOpen={open&&opts.length>0}>
          {opts.map(opt=>(
            <button key={`${opt.type}-${opt.value}`} type="button"
              onMouseDown={e=>{e.preventDefault();add(opt.value);setOpen(false);}}
              className="group w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-violet-50 hover:pl-4 transition-all duration-150">
              <span className={cn('text-[8px] px-1 py-0.5 rounded border font-bold uppercase',LOC_STYLE[opt.type])}>{opt.type[0]}</span>
              <span className="text-[11px] text-slate-700 truncate">{opt.label}</span>
            </button>
          ))}
        </PortalDropdown>
      </div>
      <p className="text-[9px] text-slate-400 italic">Click a tag to toggle mandatory (red)</p>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────
interface ZiveXSearchSidebarProps {
  onSearch:      (filters: SearchFilters) => void;
  isSearching:   boolean;
  initialFilters?: Partial<SearchFilters>;
  organizationId:  string;
}

// ── Main sidebar ──────────────────────────────────────────────
const ZiveXSearchSidebar: React.FC<ZiveXSearchSidebarProps> = ({
  onSearch, isSearching, initialFilters={}, organizationId,
}) => {
  // ── State ──────────────────────────────────────────────────
  const [keywords,     setKeywords]     = useState<SearchTag[]>(initialFilters.keywords     || []);
  const [skills,       setSkills]       = useState<SearchTag[]>(initialFilters.skills       || []);
  const [locations,    setLocations]    = useState<SearchTag[]>(initialFilters.locations    || []);
  const [companies,    setCompanies]    = useState<SearchTag[]>(initialFilters.companies    || []);
  const [educations,   setEducations]   = useState<SearchTag[]>(initialFilters.educations   || []);
  const [currentCompany,    setCurrentCompany]    = useState(initialFilters.current_company    || '');
  const [currentDesignation,setCurrentDesignation]= useState(initialFilters.current_designation|| '');
  const [minExp,       setMinExp]       = useState(initialFilters.min_exp?.toString()        || '');
  const [maxExp,       setMaxExp]       = useState(initialFilters.max_exp?.toString()        || '');
  const [noticePeriod, setNoticePeriod] = useState<string[]>(initialFilters.notice_periods  || []);
  const [minCurrCTC,   setMinCurrCTC]   = useState(initialFilters.min_current_salary?.toString()  || '');
  const [maxCurrCTC,   setMaxCurrCTC]   = useState(initialFilters.max_current_salary?.toString()  || '');
  const [minExpCTC,    setMinExpCTC]    = useState(initialFilters.min_expected_salary?.toString() || '');
  const [maxExpCTC,    setMaxExpCTC]    = useState(initialFilters.max_expected_salary?.toString() || '');

  // Re-populate when initialFilters changes (history select from parent)
  useEffect(() => {
    setKeywords(initialFilters.keywords     || []);
    setSkills(  initialFilters.skills       || []);
    setLocations(initialFilters.locations   || []);
    setCompanies(initialFilters.companies   || []);
    setEducations(initialFilters.educations || []);
    setCurrentCompany(    initialFilters.current_company     || '');
    setCurrentDesignation(initialFilters.current_designation || '');
    setMinExp(initialFilters.min_exp?.toString() || '');
    setMaxExp(initialFilters.max_exp?.toString() || '');
    setNoticePeriod(initialFilters.notice_periods || []);
    setMinCurrCTC(initialFilters.min_current_salary?.toString()  || '');
    setMaxCurrCTC(initialFilters.max_current_salary?.toString()  || '');
    setMinExpCTC( initialFilters.min_expected_salary?.toString() || '');
    setMaxExpCTC( initialFilters.max_expected_salary?.toString() || '');
  }, [initialFilters]);

  // Accordion state
  const [open, setOpen] = useState({ core:true, employment:false, education:false, compensation:false });
  const tog = (k: keyof typeof open) => setOpen(p=>({...p,[k]:!p[k]}));

  // Section counts (for badge)
  const coreCnt = keywords.length + locations.length + (minExp?1:0) + (maxExp?1:0);
  const empCnt  = skills.length + (currentCompany?1:0) + (currentDesignation?1:0) + companies.length + noticePeriod.length;
  const eduCnt  = educations.length;
  const ctcCnt  = (minCurrCTC||maxCurrCTC?1:0) + (minExpCTC||maxExpCTC?1:0);
  const hasAny  = !!(coreCnt+empCnt+eduCnt+ctcCnt);

  // Autocomplete suggestion fetchers
  const fetchGeneric = useCallback((rpc:string) => async (q:string) => {
    if (q.length < 2) return [];
    const { data, error } = await supabase.rpc(rpc, { p_organization_id: organizationId, p_search_term: q });
    if (error) return [];
    return (data||[]).map((item:any) => item.suggestion || item.skill || item.location || '').filter(Boolean);
  }, [organizationId]);

  const fetchSkillSuggestions   = fetchGeneric('get_org_skills_by_search');
  const fetchCompanySuggestions = fetchGeneric('get_company_suggestions');
  const fetchEduSuggestions     = fetchGeneric('get_education_suggestions');

  const reset = () => {
    setKeywords([]); setSkills([]); setLocations([]); setCompanies([]); setEducations([]);
    setCurrentCompany(''); setCurrentDesignation(''); setMinExp(''); setMaxExp('');
    setNoticePeriod([]); setMinCurrCTC(''); setMaxCurrCTC(''); setMinExpCTC(''); setMaxExpCTC('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      keywords, skills, locations, companies, educations,
      current_company:     currentCompany,
      current_designation: currentDesignation,
      min_exp:  minExp  ? parseInt(minExp)  : null,
      max_exp:  maxExp  ? parseInt(maxExp)  : null,
      notice_periods: noticePeriod,
      min_current_salary:  minCurrCTC ? parseFloat(minCurrCTC) : null,
      max_current_salary:  maxCurrCTC ? parseFloat(maxCurrCTC) : null,
      min_expected_salary: minExpCTC  ? parseFloat(minExpCTC)  : null,
      max_expected_salary: maxExpCTC  ? parseFloat(maxExpCTC)  : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white">
      <GradientDef />

      {/* ── HEADER ── */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2.5 border-b border-slate-100" style={{ position:'relative' }}>
        {/* Animated gradient top strip */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,#7c3aed,#a855f7,#7c3aed)', backgroundSize:'200% 100%', animation:'zxsb-shim 3s linear infinite' }} />
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Database size={12} style={{ stroke:'url(#zx-grad)' }} />
            <span className="text-[11px] font-bold text-violet-700">Zive-X Filters</span>
          </div>
          {hasAny && (
            <button type="button" onClick={reset} className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full', hasAny ? 'bg-violet-500 animate-pulse' : 'bg-slate-300')} />
          <span className="text-[9px] text-slate-500">{hasAny ? `${coreCnt+empCnt+eduCnt+ctcCnt} filter${coreCnt+empCnt+eduCnt+ctcCnt!==1?'s':''} active` : 'No filters — showing all'}</span>
        </div>
      </div>

      {/* ── SCROLL AREA ── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4">

          {/* ── CORE FILTERS ── */}
          <SectionHeader label="Core Filters" icon={Filter} isOpen={open.core} onToggle={()=>tog('core')} count={coreCnt} />
          {open.core && (
            <div className="pb-3 space-y-3">
              <div>
                <SL>Keywords</SL>
                <div className="rounded-lg border border-slate-200 focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-200 transition-all overflow-visible">
                  <MandatoryTagSelector value={keywords} onChange={setKeywords} placeholder="Skills, role, company…" disableSuggestions={true} />
                </div>
                <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1.5 rounded bg-violet-50 border border-violet-100">
                  <Info size={9} className="text-violet-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[9px] text-violet-700 leading-snug">Red tag = must match. Yellow = rank boost.</p>
                </div>
              </div>
              <div>
                <SL>Experience</SL>
                <ExpRange min={minExp} max={maxExp} onMin={setMinExp} onMax={setMaxExp} />
              </div>
              <div>
                <SL>Location</SL>
                <LocationTagInput selected={locations} onChange={setLocations} />
              </div>
            </div>
          )}
          <Divider />

          {/* ── EMPLOYMENT ── */}
          <SectionHeader label="Employment" icon={Briefcase} isOpen={open.employment} onToggle={()=>tog('employment')} count={empCnt} />
          {open.employment && (
            <div className="pb-3 space-y-3">
              <div>
                <SL>Skills</SL>
                <div className="rounded-lg border border-slate-200 focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-200 transition-all overflow-visible">
                  <MandatoryTagSelector value={skills} onChange={setSkills} placeholder="Filter by skills…" fetchSuggestions={fetchSkillSuggestions} queryKey="zxSkills" />
                </div>
              </div>
              <div>
                <SL>Current Company</SL>
                <TextInput value={currentCompany} onChange={setCurrentCompany} placeholder="e.g. Infosys, TCS…" icon={Building2} />
              </div>
              <div>
                <SL>Current Designation</SL>
                <TextInput value={currentDesignation} onChange={setCurrentDesignation} placeholder="e.g. Senior Engineer…" icon={Briefcase} />
              </div>
              <div>
                <SL>Past Companies</SL>
                <div className="rounded-lg border border-slate-200 focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-200 transition-all overflow-visible">
                  <MandatoryTagSelector value={companies} onChange={setCompanies} placeholder="e.g. Google, TCS…" fetchSuggestions={fetchCompanySuggestions} queryKey="zxCompanies" />
                </div>
              </div>
              <div>
                <SL>Notice Period</SL>
                <NoticePeriodChips value={noticePeriod} onChange={setNoticePeriod} />
              </div>
            </div>
          )}
          <Divider />

          {/* ── EDUCATION ── */}
          <SectionHeader label="Education" icon={GraduationCap} isOpen={open.education} onToggle={()=>tog('education')} count={eduCnt} />
          {open.education && (
            <div className="pb-3">
              <SL>Qualification</SL>
              <div className="rounded-lg border border-slate-200 focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-200 transition-all overflow-visible">
                <MandatoryTagSelector value={educations} onChange={setEducations} placeholder="Degree, institution…" fetchSuggestions={fetchEduSuggestions} queryKey="zxEdu" />
              </div>
            </div>
          )}
          <Divider />

          {/* ── COMPENSATION ── */}
          <SectionHeader label="Compensation" icon={Database} isOpen={open.compensation} onToggle={()=>tog('compensation')} count={ctcCnt} />
          {open.compensation && (
            <div className="pb-3 space-y-3">
              <div>
                <SL>Current CTC (Lacs)</SL>
                <CTCRange minLabel="Min" maxLabel="Max" min={minCurrCTC} max={maxCurrCTC} onMin={setMinCurrCTC} onMax={setMaxCurrCTC} />
              </div>
              <div>
                <SL>Expected CTC (Lacs)</SL>
                <CTCRange minLabel="Min" maxLabel="Max" min={minExpCTC} max={maxExpCTC} onMin={setMinExpCTC} onMax={setMaxExpCTC} />
              </div>
            </div>
          )}

          <div className="h-3" />
        </div>
      </ScrollArea>

      {/* ── SEARCH BUTTON ── */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-slate-100 bg-white">
        <button type="submit" disabled={isSearching}
          className="w-full h-9 rounded-lg flex items-center justify-center gap-2 text-[12.5px] font-600 text-white transition-all"
          style={{ background:'linear-gradient(135deg,#6C2BD9,#7C3AED)', boxShadow:'0 2px 8px rgba(108,43,217,0.3)', fontWeight:600, opacity:isSearching?0.7:1, cursor:isSearching?'not-allowed':'pointer' }}
          onMouseEnter={e=>{ if(!isSearching)(e.currentTarget as HTMLElement).style.boxShadow='0 4px 14px rgba(108,43,217,0.45)'; }}
          onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.boxShadow='0 2px 8px rgba(108,43,217,0.3)'; }}>
          {isSearching
            ? <><Loader2 size={13} style={{ animation:'spin 0.8s linear infinite' }} /> Searching…</>
            : <><Sparkles size={13} /> Search Candidates</>
          }
        </button>
      </div>

      <style>{`
        @keyframes zxsb-shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </form>
  );
};

export default ZiveXSearchSidebar;
// 