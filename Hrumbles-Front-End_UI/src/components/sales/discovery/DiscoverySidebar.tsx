// src/components/sales/discovery/DiscoverySidebar.tsx
"use client";

import React, {
  useState, useEffect, useRef, useMemo, useCallback,
} from 'react';
import ReactDOM from 'react-dom';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { resetFilters, setFilters } from '@/Redux/intelligenceSearchSlice';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { Country, State, City } from 'country-state-city';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Input }    from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search, MapPin, Briefcase, Building2, Globe, Users,
  DollarSign, Cpu, FilterX, Play, X, ChevronRight,
  Loader2, Check, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgoShort(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60_000);
  if (m < 1)  return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Discovery Recent Searches ───────────────────────────────────────────────

const DS_LS_KEY = 'contacts_recent_discovery_searches_v1';

export interface DiscoveryRecentSearch {
  id:          string;
  summary:     string;
  filters:     ReturnType<typeof buildInitialState>;
  chips:       string[];
  resultCount: number;
  timestamp:   number;
}

function loadDiscoverySearches(): DiscoveryRecentSearch[] {
  try { return JSON.parse(localStorage.getItem(DS_LS_KEY) || '[]'); }
  catch { return []; }
}

function buildDiscoverySummary(local: ReturnType<typeof buildInitialState>): string {
  const parts: string[] = [];
  if (local.q_keywords)                               parts.push(`"${local.q_keywords}"`);
  if (local.person_titles.length)                     parts.push(local.person_titles.slice(0,2).join(', '));
  if (local.company_name_tags.length)                 parts.push(local.company_name_tags.slice(0,2).join(', '));
  if (local.person_locations.length)                  parts.push(local.person_locations.slice(0,2).join(', '));
  if (local.person_seniorities.length)                parts.push(local.person_seniorities.slice(0,2).join(', '));
  if (local.technologies.length)                      parts.push(`Tech: ${local.technologies.slice(0,2).join(', ')}`);
  if (local.organization_num_employees_ranges.length) parts.push(`Size filter`);
  return parts.join(' · ') || 'Discovery Search';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SENIORITIES = [
  { id: 'owner',    label: 'Owner'    },
  { id: 'founder',  label: 'Founder'  },
  { id: 'c_suite',  label: 'C-Suite'  },
  { id: 'partner',  label: 'Partner'  },
  { id: 'vp',       label: 'VP'       },
  { id: 'head',     label: 'Head'     },
  { id: 'director', label: 'Director' },
  { id: 'manager',  label: 'Manager'  },
  { id: 'senior',   label: 'Senior'   },
  { id: 'entry',    label: 'Entry'    },
  { id: 'intern',   label: 'Intern'   },
];

const EMP_RANGES = [
  { id: '1,10',       label: '1–10'   },
  { id: '11,50',      label: '11–50'  },
  { id: '51,200',     label: '51–200' },
  { id: '201,500',    label: '201–500'},
  { id: '501,1000',   label: '501–1k' },
  { id: '1001,5000',  label: '1k–5k'  },
  { id: '5001,10000', label: '5k–10k' },
  { id: '10001',      label: '10k+'   },
];

const EMAIL_STATUSES = [
  { id: 'verified',         label: 'Verified'         },
  { id: 'likely to engage', label: 'Likely to Engage' },
  { id: 'unverified',       label: 'Unverified'       },
  { id: 'unavailable',      label: 'Unavailable'      },
];

// ─── URL param keys (prefixed dk_ to avoid CRM filter collisions) ────────────
const DK_KEYS = {
  q:         'dk_q',
  titles:    'dk_titles',
  sen:       'dk_sen',
  ploc:      'dk_ploc',
  oloc:      'dk_oloc',
  co:        'dk_co',
  emp:       'dk_emp',
  revMin:    'dk_revMin',
  revMax:    'dk_revMax',
  tech:      'dk_tech',
  orgTitles: 'dk_orgTitles',
  jobloc:    'dk_jobloc',
  email:     'dk_email',
  simTitles: 'dk_simTitles',
};

function parseArr(params: URLSearchParams, key: string): string[] {
  const v = params.get(key);
  return v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
}

function buildInitialState(params: URLSearchParams) {
  return {
    q_keywords:                       params.get(DK_KEYS.q)         || '',
    person_titles:                    parseArr(params, DK_KEYS.titles),
    person_locations:                 parseArr(params, DK_KEYS.ploc),
    person_seniorities:               parseArr(params, DK_KEYS.sen),
    company_name_tags:                parseArr(params, DK_KEYS.co),
    organization_locations:           parseArr(params, DK_KEYS.oloc),
    organization_num_employees_ranges:parseArr(params, DK_KEYS.emp),
    revenue_min:                      params.get(DK_KEYS.revMin)     || '',
    revenue_max:                      params.get(DK_KEYS.revMax)     || '',
    technologies:                     parseArr(params, DK_KEYS.tech),
    contact_email_status:             parseArr(params, DK_KEYS.email),
    include_similar_titles:           params.get(DK_KEYS.simTitles) !== '0',
    q_organization_job_titles:        parseArr(params, DK_KEYS.orgTitles),
    job_posting_locations:            parseArr(params, DK_KEYS.jobloc),
  };
}

// ─── Location data ────────────────────────────────────────────────────────────

type LocType = 'country' | 'state' | 'city';
interface LocOpt { value: string; label: string; type: LocType; }

const LOC_STYLE: Record<LocType, { dot: string; badge: string; tag: string; label: string }> = {
  country: { dot: 'bg-blue-400', badge: 'bg-blue-50 text-blue-700 border-blue-200', tag: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Country' },
  state:   { dot: 'bg-violet-400', badge: 'bg-violet-50 text-violet-700 border-violet-200', tag: 'bg-violet-100 text-violet-800 border-violet-200', label: 'State' },
  city:    { dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', tag: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'City' },
};

const ALL_COUNTRIES: LocOpt[] = Country.getAllCountries().map(c => ({ value: c.name, label: `${c.flag ?? ''} ${c.name}`.trim(), type: 'country' }));
const ALL_STATES: LocOpt[]    = State.getAllStates().map(s => ({ value: s.name, label: s.name, type: 'state' }));
const POPULAR = ['United States','United Kingdom','Canada','Australia','India','Germany','France','Singapore','Netherlands','UAE'];

function searchLoc(q: string, selected: string[]): LocOpt[] {
  const lq = q.toLowerCase().trim();
  if (!lq) return ALL_COUNTRIES.filter(c => POPULAR.includes(c.value) && !selected.includes(c.value)).slice(0, 10);
  const out: LocOpt[] = [];
  ALL_COUNTRIES.filter(c => c.value.toLowerCase().includes(lq) && !selected.includes(c.value)).slice(0, 8).forEach(c => out.push(c));
  ALL_STATES.filter(s => s.value.toLowerCase().includes(lq) && !selected.includes(s.value)).slice(0, 8).forEach(s => out.push(s));
  if (lq.length >= 3) City.getAllCities().filter(c => c.name.toLowerCase().includes(lq) && !selected.includes(c.name)).slice(0, 14).forEach(c => out.push({ value: c.name, label: c.name, type: 'city' }));
  return out.slice(0, 30);
}

function getLocType(value: string): LocType {
  if (ALL_COUNTRIES.some(c => c.value === value)) return 'country';
  if (ALL_STATES.some(s => s.value === value))    return 'state';
  return 'city';
}

// ─── AbovePortalDropdown — ALWAYS opens ABOVE the anchor ─────────────────────

interface PortalProps {
  anchorRef: React.RefObject<HTMLDivElement>;
  isOpen:    boolean;
  maxH?:     number;
  children:  React.ReactNode;
}

function AbovePortal({ anchorRef, isOpen, maxH = 240, children }: PortalProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    let rafId: number;
    const update = () => {
      rafId = requestAnimationFrame(() => {
        if (!anchorRef.current) return;
        const r = anchorRef.current.getBoundingClientRect();
        const desiredWidth = Math.max(r.width, 220);
        const left = Math.min(r.left, window.innerWidth - desiredWidth - 8);
        setStyle({
          position:  'fixed',
          bottom:    window.innerHeight - r.top + 4,
          left:      Math.max(4, left),
          width:     desiredWidth,
          zIndex:    99999,
          maxHeight: maxH,
          overflow:  'hidden',
        });
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, anchorRef, maxH]);

  if (!isOpen) return null;
  return ReactDOM.createPortal(
    <div style={style} className="bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {children}
    </div>,
    document.body,
  );
}

// ─── LocationMultiSelect ──────────────────────────────────────────────────────

function LocationMultiSelect({ label, placeholder, selected, onChange }: {
  label: string; placeholder: string; selected: string[]; onChange: (v: string[]) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const options = useMemo(() => searchLoc(q, selected), [q, selected]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQ(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const add = (opt: LocOpt) => { onChange([...selected, opt.value]); setQ(''); setOpen(true); inputRef.current?.focus(); };
  const remove = (v: string) => onChange(selected.filter(x => x !== v));

  return (
    <div ref={wrapRef} className="space-y-1.5">
      <p className="text-[9px] uppercase text-slate-400 font-semibold">{label}</p>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
          {selected.map(val => {
            const s = LOC_STYLE[getLocType(val)];
            return (
              <span key={val} className={cn('inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[10px] font-semibold border', s.tag)}>
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
                <span className="truncate max-w-[80px]">{val}</span>
                <button type="button" onMouseDown={e => { e.preventDefault(); remove(val); }} className="hover:opacity-70"><X size={9} /></button>
              </span>
            );
          })}
        </div>
      )}
      <div ref={anchorRef} className="relative">
        <Search className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" size={11} />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          className="pl-7 h-8 text-xs border-slate-200"
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => { setOpen(false); setQ(''); }, 150)}
        />
        {selected.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-indigo-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
            {selected.length}
          </span>
        )}
        <AbovePortal anchorRef={anchorRef} isOpen={open} maxH={220}>
          {/* Legend */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex-shrink-0">
            {(Object.entries(LOC_STYLE) as [LocType, any][]).map(([t, s]) => (
              <span key={t} className="flex items-center gap-1 text-[9px] text-slate-400 font-medium">
                <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />{s.label}
              </span>
            ))}
          </div>
          <div className="overflow-y-auto flex-1">
            {options.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-slate-400 italic text-center">
                {q.length > 0 && q.length < 3 ? 'Type 3+ chars for cities' : 'No matches'}
              </p>
            ) : (
              <div className="py-1">
                {options.map((opt, i) => {
                  const s = LOC_STYLE[opt.type];
                  return (
                    <button key={`${opt.type}-${i}`} type="button"
                      onMouseDown={e => { e.preventDefault(); add(opt); }}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 text-left"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
                        <span className="text-[11px] text-slate-700 font-medium truncate">{opt.label}</span>
                      </span>
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ml-2', s.badge)}>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {!q && (
            <p className="px-3 py-1.5 text-[9px] text-slate-400 border-t border-slate-100 bg-slate-50 flex-shrink-0">Popular countries · type to search all</p>
          )}
        </AbovePortal>
      </div>
    </div>
  );
}

// ─── JobTitleSelect — DB-backed + free text ───────────────────────────────────

function JobTitleSelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ]       = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['discovery-job-titles-global', q],
    queryFn: async () => {
      if (!q.trim()) return [];  // never fetch until user types
      const { data } = await supabase.from('contacts').select('job_title')
        .not('job_title', 'is', null).ilike('job_title', `%${q}%`).limit(300);
      const unique = [...new Set((data || []).map((r: any) => r.job_title?.trim()).filter(Boolean))];
      return unique.sort().slice(0, 50) as string[];
    },
    enabled: q.trim().length > 0,  // only fetch when typing
    staleTime: 60_000,
  });

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQ(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const addValue = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !selected.includes(trimmed)) onChange([...selected, trimmed]);
    setQ(''); setOpen(true); inputRef.current?.focus();
  };

  const remove = (v: string) => onChange(selected.filter(x => x !== v));

  // Filtered list — always include manual entry if typed
  const showManual = q.trim() && !selected.includes(q.trim()) && !suggestions.includes(q.trim());
  const filtered   = suggestions.filter(s => !selected.includes(s));

  return (
    <div ref={wrapRef} className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
          {selected.map(t => (
            <span key={t} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <span className="truncate max-w-[100px]">{t}</span>
              <button onClick={() => remove(t)} className="hover:opacity-60"><X size={9} /></button>
            </span>
          ))}
        </div>
      )}
      <div ref={anchorRef} className="relative">
        <Briefcase className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" size={11} />
        <Input
          ref={inputRef}
          placeholder="e.g. CEO, Marketing Director…"
          className="pl-7 h-8 text-xs border-slate-200"
          value={q}
          onChange={e => { setQ(e.target.value); if (e.target.value.trim()) setOpen(true); else setOpen(false); }}
          onFocus={() => { if (q.trim()) setOpen(true); }}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) { addValue(q); } if (e.key === 'Backspace' && !q && selected.length) onChange(selected.slice(0, -1)); }}
          onBlur={() => setTimeout(() => { setOpen(false); setQ(''); }, 150)}
        />
        {selected.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-blue-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
            {selected.length}
          </span>
        )}
        <AbovePortal anchorRef={anchorRef} isOpen={open && q.trim().length > 0 && (filtered.length > 0 || !!showManual)} maxH={200}>
          <div className="overflow-y-auto flex-1">
            {showManual && (
              <button type="button" onMouseDown={e => { e.preventDefault(); addValue(q); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 text-left border-b border-slate-100">
                <Sparkles size={10} className="text-indigo-500 flex-shrink-0" />
                <span className="text-[11px] text-indigo-700 font-medium">Add "<span className="font-bold">{q.trim()}</span>"</span>
              </button>
            )}
            {filtered.map(title => (
              <button key={title} type="button" onMouseDown={e => { e.preventDefault(); addValue(title); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left">
                <Briefcase size={10} className="text-slate-400 flex-shrink-0" />
                <span className="text-[11px] text-slate-700 truncate">{title}</span>
              </button>
            ))}
          </div>
        </AbovePortal>
      </div>
      <p className="text-[9px] text-slate-400">Enter or click to add · from your CRM + manual</p>
    </div>
  );
}

// ─── CompanyTagInput — DB suggestions + free text ────────────────────────────

function CompanyTagInput({ tags, onChange }: { tags: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ]       = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ['discovery-companies-global', q],
    queryFn: async () => {
      if (!q.trim()) return [];  // never fetch until user types
      const { data } = await supabase.from('companies').select('id, name, logo_url')
        .ilike('name', `%${q}%`).order('name').limit(60);
      const seen = new Set<string>();
      return (data || []).filter((c: any) => { if (seen.has(c.name)) return false; seen.add(c.name); return true; }) as { id: number; name: string; logo_url?: string | null }[];
    },
    enabled: q.trim().length > 0,  // only fetch when typing
    staleTime: 60_000,
  });

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQ(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const addTag = (val: string) => {
    const t = val.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setQ(''); setOpen(true); inputRef.current?.focus();
  };
  const remove = (t: string) => onChange(tags.filter(x => x !== t));
  const showManual = q.trim() && !tags.includes(q.trim()) && !companies.some(c => c.name === q.trim());
  const filtered = companies.filter(c => !tags.includes(c.name));

  return (
    <div ref={wrapRef} className="space-y-1.5">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <Building2 size={9} className="text-slate-400" />
              <span className="truncate max-w-[90px]">{t}</span>
              <button onClick={() => remove(t)} className="hover:opacity-60"><X size={9} /></button>
            </span>
          ))}
        </div>
      )}
      <div ref={anchorRef} className="relative">
        <Building2 className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" size={11} />
        <Input
          ref={inputRef}
          placeholder="Company name…"
          className="pl-7 h-8 text-xs border-slate-200"
          value={q}
          onChange={e => { setQ(e.target.value); if (e.target.value.trim()) setOpen(true); else setOpen(false); }}
          onFocus={() => { if (q.trim()) setOpen(true); }}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) addTag(q); if (e.key === 'Backspace' && !q && tags.length) onChange(tags.slice(0, -1)); }}
          onBlur={() => setTimeout(() => { setOpen(false); setQ(''); }, 150)}
        />
        {tags.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-slate-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
            {tags.length}
          </span>
        )}
        <AbovePortal anchorRef={anchorRef} isOpen={open && q.trim().length > 0 && (filtered.length > 0 || !!showManual)} maxH={200}>
          <div className="overflow-y-auto flex-1">
            {showManual && (
              <button type="button" onMouseDown={e => { e.preventDefault(); addTag(q); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 border-b border-slate-100 text-left">
                <Sparkles size={10} className="text-indigo-500" />
                <span className="text-[11px] text-indigo-700 font-medium">Add "<b>{q.trim()}</b>"</span>
              </button>
            )}
            {filtered.map(co => (
              <button key={co.id} type="button" onMouseDown={e => { e.preventDefault(); addTag(co.name); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-left">
                {co.logo_url
                  ? <img src={co.logo_url} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                  : <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center flex-shrink-0"><Building2 size={10} className="text-slate-500" /></div>
                }
                <span className="text-[11px] text-slate-700 truncate">{co.name}</span>
              </button>
            ))}
          </div>
        </AbovePortal>
      </div>
      <p className="text-[9px] text-slate-400">From your CRM · Enter to add manually</p>
    </div>
  );
}

// ─── TechnologySelect — enrichment_org_technologies + free text ───────────────

function TechnologySelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ]       = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Fetch distinct tech from DB
  const { data: techOptions = [], isLoading } = useQuery({
    queryKey: ['discovery-technologies', q],
    queryFn: async () => {
      let query = supabase.from('enrichment_org_technologies')
        .select('uid, name, category');
      if (q.trim()) {
        query = query.or(`name.ilike.%${q}%,uid.ilike.%${q}%`);
      }
      const { data } = await query.limit(300);
      // Deduplicate by uid
      const seen = new Set<string>();
      const unique: { uid: string; name: string; category: string }[] = [];
      for (const row of (data || [])) {
        if (row.uid && !seen.has(row.uid)) { seen.add(row.uid); unique.push({ uid: row.uid, name: row.name || row.uid, category: row.category || 'Other' }); }
      }
      // Sort by name
      return unique.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 50);
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setQ(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const addTech = (uid: string) => {
    const val = uid.trim();
    if (val && !selected.includes(val)) onChange([...selected, val]);
    setQ(''); setOpen(true); inputRef.current?.focus();
  };
  const remove = (v: string) => onChange(selected.filter(x => x !== v));

  const filtered   = techOptions.filter(t => !selected.includes(t.uid));
  const showManual = q.trim() && !selected.includes(q.trim()) && !techOptions.some(t => t.uid === q.trim());

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof techOptions>();
    filtered.forEach(t => { if (!map.has(t.category)) map.set(t.category, []); map.get(t.category)!.push(t); });
    return map;
  }, [filtered]);

  return (
    <div ref={wrapRef} className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
          {selected.map(uid => (
            <span key={uid} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
              <Cpu size={9} />
              <span className="truncate max-w-[90px]">{uid}</span>
              <button onClick={() => remove(uid)} className="hover:opacity-60"><X size={9} /></button>
            </span>
          ))}
        </div>
      )}
      <div ref={anchorRef} className="relative">
        <Cpu className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" size={11} />
        <Input
          ref={inputRef}
          placeholder="e.g. salesforce, hubspot, aws…"
          className="pl-7 h-8 text-xs border-slate-200"
          value={q}
          onChange={e => { setQ(e.target.value); if (e.target.value.trim()) setOpen(true); else setOpen(false); }}
          onFocus={() => { if (q.trim()) setOpen(true); }}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) addTech(q); if (e.key === 'Backspace' && !q && selected.length) onChange(selected.slice(0, -1)); }}
          onBlur={() => setTimeout(() => { setOpen(false); setQ(''); }, 150)}
        />
        {selected.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-cyan-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
            {selected.length}
          </span>
        )}
        <AbovePortal anchorRef={anchorRef} isOpen={open && q.trim().length > 0} maxH={240}>
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-5 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                <span className="text-xs text-slate-500">Searching…</span>
              </div>
            ) : (
              <>
                {showManual && (
                  <button type="button" onMouseDown={e => { e.preventDefault(); addTech(q); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 border-b border-slate-100 text-left">
                    <Sparkles size={10} className="text-indigo-500" />
                    <span className="text-[11px] text-indigo-700 font-medium">Add "<b>{q.trim()}</b>"</span>
                  </button>
                )}
                {Array.from(grouped.entries()).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="px-3 py-1 text-[9px] uppercase font-semibold text-slate-400 bg-slate-50 border-y border-slate-100">{cat}</p>
                    {items.map(t => (
                      <button key={t.uid} type="button" onMouseDown={e => { e.preventDefault(); addTech(t.uid); }}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 text-left">
                        <span className="text-[11px] text-slate-700 truncate">{t.name}</span>
                        <span className="text-[9px] text-slate-400 flex-shrink-0 ml-2">{t.uid}</span>
                      </button>
                    ))}
                  </div>
                ))}
                {grouped.size === 0 && !showManual && (
                  <p className="text-[11px] text-slate-400 text-center py-4 italic">No matches · type to search or add manually</p>
                )}
              </>
            )}
          </div>
          <p className="px-3 py-1 text-[9px] text-slate-400 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            {selected.length > 0 ? `${selected.length} selected` : 'Type uid (underscores for spaces)'} · Enter to add manually
          </p>
        </AbovePortal>
      </div>
    </div>
  );
}

// ─── Section component ────────────────────────────────────────────────────────

function Section({ value, icon, label, count, children }: {
  value: string; icon: React.ReactNode; label: string; count?: number; children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="border-b border-slate-50 last:border-0">
      <AccordionTrigger className="px-2 py-2 hover:no-underline hover:bg-slate-50/80 rounded-lg group [&>svg]:hidden">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs font-medium text-slate-700">{label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {!!count && count > 0 && (
              <span className="h-4 px-1.5 text-[9px] bg-indigo-100 text-indigo-700 rounded-full font-semibold flex items-center">{count}</span>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-data-[state=open]:rotate-90" />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-2 pb-3">{children}</AccordionContent>
    </AccordionItem>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip({ id, label, checked, onChange }: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className={cn(
      'flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer transition-colors',
      checked ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50',
    )}>
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} className="h-3.5 w-3.5 rounded accent-indigo-600" />
      <span className={cn('text-xs transition-colors', checked ? 'text-indigo-800 font-medium' : 'text-slate-600')}>{label}</span>
    </label>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

// Chip labels derived from local filter state for SearchEmptyState display
function localToChips(local: ReturnType<typeof buildInitialState>, SENIORITIES_MAP: Record<string,string>, EMP_MAP: Record<string,string>): string[] {
  const chips: string[] = [];
  if (local.q_keywords) chips.push(local.q_keywords);
  local.person_titles.forEach(t => chips.push(t));
  local.person_seniorities.forEach(s => chips.push(SENIORITIES_MAP[s] || s));
  local.person_locations.forEach(l => chips.push(l));
  local.organization_locations.forEach(l => chips.push(`HQ: ${l}`));
  local.company_name_tags.forEach(c => chips.push(c));
  local.organization_num_employees_ranges.forEach(r => chips.push(EMP_MAP[r] || r));
  local.technologies.forEach(t => chips.push(t));
  local.contact_email_status.forEach(e => chips.push(e));
  local.q_organization_job_titles.forEach(t => chips.push(`Hiring: ${t}`));
  local.job_posting_locations.forEach(l => chips.push(`Job: ${l}`));
  if (local.revenue_min || local.revenue_max) chips.push(`Revenue: ${local.revenue_min || '0'}–${local.revenue_max || '∞'}`);
  return chips;
}

interface DiscoverySidebarProps {
  onFiltersChange?: (chips: string[], count: number) => void;
}

export function DiscoverySidebar({ onFiltersChange }: DiscoverySidebarProps) {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const [local, setLocal]         = useState(() => buildInitialState(searchParams));
  const [openSections, setOpen]   = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<DiscoveryRecentSearch[]>(loadDiscoverySearches);

  const toggleArr = (field: string, value: string) =>
    setLocal(prev => {
      const cur = (prev as any)[field] || [];
      return { ...prev, [field]: cur.includes(value) ? cur.filter((i: string) => i !== value) : [...cur, value] };
    });

  const toArray = (v: string | string[]): string[] =>
    Array.isArray(v) ? v : (v ? v.split(',').map(s => s.trim()).filter(Boolean) : []);

  const activeCount = useMemo(() => {
    let n = 0;
    if (local.q_keywords)                               n++;
    if (local.person_titles.length)                     n++;
    if (local.person_locations.length)                  n++;
    if (local.person_seniorities.length)                n++;
    if (local.company_name_tags.length)                 n++;
    if (local.organization_locations.length)            n++;
    if (local.organization_num_employees_ranges.length) n++;
    if (local.revenue_min || local.revenue_max)         n++;
    if (local.technologies.length)                      n++;
    if (local.contact_email_status.length)              n++;
    if (local.q_organization_job_titles.length)         n++;
    if (local.job_posting_locations.length)             n++;
    return n;
  }, [local]);

  // Emit filter changes to parent (debounced 200ms — avoids excess re-renders)
  useEffect(() => {
    if (!onFiltersChange) return;
    const SEN_MAP: Record<string,string> = { owner:'Owner', founder:'Founder', c_suite:'C-Suite', partner:'Partner', vp:'VP', head:'Head', director:'Director', manager:'Manager', senior:'Senior', entry:'Entry', intern:'Intern' };
    const EMP_MAP: Record<string,string> = { '1,10':'1–10','11,50':'11–50','51,200':'51–200','201,500':'201–500','501,1000':'501–1k','1001,5000':'1k–5k','5001,10000':'5k–10k','10001':'10k+' };
    const t = setTimeout(() => onFiltersChange(localToChips(local, SEN_MAP, EMP_MAP), activeCount), 200);
    return () => clearTimeout(t);
  }, [local, activeCount, onFiltersChange]);

  // Write URL params on every change (debounced for text fields)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParams(prev => {
        Object.values(DK_KEYS).forEach(k => prev.delete(k));
        if (local.q_keywords)                               prev.set(DK_KEYS.q,         local.q_keywords);
        if (local.person_titles.length)                     prev.set(DK_KEYS.titles,    local.person_titles.join(','));
        if (local.person_seniorities.length)                prev.set(DK_KEYS.sen,       local.person_seniorities.join(','));
        if (local.person_locations.length)                  prev.set(DK_KEYS.ploc,      local.person_locations.join(','));
        if (local.organization_locations.length)            prev.set(DK_KEYS.oloc,      local.organization_locations.join(','));
        if (local.company_name_tags.length)                 prev.set(DK_KEYS.co,        local.company_name_tags.join(','));
        if (local.organization_num_employees_ranges.length) prev.set(DK_KEYS.emp,       local.organization_num_employees_ranges.join(','));
        if (local.revenue_min)                              prev.set(DK_KEYS.revMin,    local.revenue_min);
        if (local.revenue_max)                              prev.set(DK_KEYS.revMax,    local.revenue_max);
        if (local.technologies.length)                      prev.set(DK_KEYS.tech,      local.technologies.join(','));
        if (local.q_organization_job_titles.length)         prev.set(DK_KEYS.orgTitles, local.q_organization_job_titles.join(','));
        if (local.job_posting_locations.length)             prev.set(DK_KEYS.jobloc,    local.job_posting_locations.join(','));
        if (local.contact_email_status.length)              prev.set(DK_KEYS.email,     local.contact_email_status.join(','));
        if (!local.include_similar_titles)                  prev.set(DK_KEYS.simTitles, '0');
        return prev;
      });
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const handleRunSearch = useCallback(() => {
    // Save to recent searches
    const SEN_MAP: Record<string,string> = { owner:'Owner', founder:'Founder', c_suite:'C-Suite', partner:'Partner', vp:'VP', head:'Head', director:'Director', manager:'Manager', senior:'Senior', entry:'Entry', intern:'Intern' };
    const EMP_MAP: Record<string,string> = { '1,10':'1–10','11,50':'11–50','51,200':'51–200','201,500':'201–500','501,1000':'501–1k','1001,5000':'1k–5k','5001,10000':'5k–10k','10001':'10k+' };
    if (activeCount > 0) {
      const chips = localToChips(local, SEN_MAP, EMP_MAP);
      const entry: DiscoveryRecentSearch = {
        id: Date.now().toString(),
        summary: buildDiscoverySummary(local),
        filters: { ...local },
        chips,
        resultCount: 0,
        timestamp: Date.now(),
      };
      const existing = loadDiscoverySearches();
      const deduped = [entry, ...existing.filter(s => s.summary !== entry.summary)].slice(0, 10);
      localStorage.setItem(DS_LS_KEY, JSON.stringify(deduped));
      setRecentSearches(deduped);
    }

    const kw = [local.q_keywords, ...local.company_name_tags].filter(Boolean).join(' ').trim();
    dispatch(setFilters({
      q_keywords:                           kw,
      person_titles:                         local.person_titles,
      person_locations:                      local.person_locations,
      person_seniorities:                    local.person_seniorities,
      organization_locations:                local.organization_locations,
      organization_num_employees_ranges:     local.organization_num_employees_ranges,
      q_organization_domains_list:           [],
      contact_email_status:                  local.contact_email_status,
      include_similar_titles:                local.include_similar_titles,
      revenue_range: {
        min: local.revenue_min ? parseInt(local.revenue_min, 10) : undefined,
        max: local.revenue_max ? parseInt(local.revenue_max, 10) : undefined,
      },
      currently_using_any_of_technology_uids: local.technologies,
      q_organization_job_titles:             local.q_organization_job_titles,
      organization_job_locations:            local.job_posting_locations,
    }));
  }, [local, dispatch]);

  const handleApplyRecentSearch = useCallback((saved: DiscoveryRecentSearch) => {
    setLocal({ ...saved.filters });
    // Dispatch filters immediately
    const kw = [saved.filters.q_keywords, ...saved.filters.company_name_tags].filter(Boolean).join(' ').trim();
    dispatch(setFilters({
      q_keywords:                           kw,
      person_titles:                         saved.filters.person_titles,
      person_locations:                      saved.filters.person_locations,
      person_seniorities:                    saved.filters.person_seniorities,
      organization_locations:                saved.filters.organization_locations,
      organization_num_employees_ranges:     saved.filters.organization_num_employees_ranges,
      q_organization_domains_list:           [],
      contact_email_status:                  saved.filters.contact_email_status,
      include_similar_titles:                saved.filters.include_similar_titles,
      revenue_range: {
        min: saved.filters.revenue_min ? parseInt(saved.filters.revenue_min, 10) : undefined,
        max: saved.filters.revenue_max ? parseInt(saved.filters.revenue_max, 10) : undefined,
      },
      currently_using_any_of_technology_uids: saved.filters.technologies,
      q_organization_job_titles:             saved.filters.q_organization_job_titles,
      organization_job_locations:            saved.filters.job_posting_locations,
    }));
  }, [dispatch]);

  const handleRemoveRecentSearch = useCallback((id: string) => {
    const updated = recentSearches.filter(s => s.id !== id);
    setRecentSearches(updated);
    localStorage.setItem(DS_LS_KEY, JSON.stringify(updated));
  }, [recentSearches]);

  const handleReset = () => {
    dispatch(resetFilters());
    setSearchParams(prev => { Object.values(DK_KEYS).forEach(k => prev.delete(k)); return prev; });
    setLocal({
      q_keywords: '', person_titles: [], person_locations: [], person_seniorities: [],
      company_name_tags: [], organization_locations: [], organization_num_employees_ranges: [],
      revenue_min: '', revenue_max: '', technologies: [], contact_email_status: [],
      include_similar_titles: true, q_organization_job_titles: [], job_posting_locations: [],
    });
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden" style={{ width: '100%', maxWidth: '100%' }}>

      {/* HEADER */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2.5 border-b border-slate-100 bg-gradient-to-b from-indigo-50/60 to-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">Search People</span>
            {activeCount > 0 && (
              <span className="bg-indigo-600 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{activeCount}</span>
            )}
          </div>
          {activeCount > 0 && (
            <button onClick={handleReset} className="flex items-center gap-1 text-[10px] font-medium text-red-500 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors">
              <FilterX size={10} /> Clear
            </button>
          )}
        </div>

        {/* Keyword search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" size={12} />
          <input
            type="text"
            placeholder="Keywords, name…"
            className="w-full pl-7 pr-3 h-8 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
            value={local.q_keywords}
            onChange={e => setLocal(p => ({ ...p, q_keywords: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleRunSearch()}
          />
        </div>

        {/* Run search button */}
        <button
          onClick={handleRunSearch}
          data-run-search
          className="mt-2 w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <Play size={10} className="fill-white" /> Run Search
          {activeCount > 0 && <span className="text-indigo-200 text-[10px]">· {activeCount} filter{activeCount !== 1 ? 's' : ''}</span>}
        </button>
      </div>

      {/* ACCORDION FILTERS */}
      <ScrollArea className="flex-1 min-h-0">
        <Accordion type="multiple" value={openSections} onValueChange={setOpen} className="w-full px-2 py-1">

          {/* PROFESSIONAL INFO */}
          <Section value="professional" icon={<Briefcase size={12} className="text-blue-500" />} label="Professional Info"
            count={local.person_titles.length + local.person_seniorities.length}>
            <div className="pt-1 space-y-3">
              <div>
                <p className="text-[9px] uppercase text-slate-400 font-semibold mb-1.5">Job Titles</p>
                <JobTitleSelect
                  selected={local.person_titles}
                  onChange={v => setLocal(p => ({ ...p, person_titles: v }))}
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <input type="checkbox" id="simtitles" checked={local.include_similar_titles}
                    onChange={e => setLocal(p => ({ ...p, include_similar_titles: e.target.checked }))}
                    className="h-3 w-3 rounded accent-indigo-600"
                  />
                  <label htmlFor="simtitles" className="text-[10px] text-slate-500 cursor-pointer">Include similar titles</label>
                </div>
              </div>

              <div>
                <p className="text-[9px] uppercase text-slate-400 font-semibold mb-1">Seniority</p>
                <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                  {SENIORITIES.map(s => (
                    <FilterChip key={s.id} id={`sen-${s.id}`} label={s.label}
                      checked={local.person_seniorities.includes(s.id)}
                      onChange={() => toggleArr('person_seniorities', s.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* LOCATIONS */}
          <Section value="location" icon={<MapPin size={12} className="text-rose-500" />} label="Location"
            count={local.person_locations.length + local.organization_locations.length}>
            <div className="pt-1 space-y-3">
              <LocationMultiSelect label="Person Location" placeholder="Country, state or city…"
                selected={local.person_locations}
                onChange={v => setLocal(p => ({ ...p, person_locations: v }))}
              />
              <LocationMultiSelect label="Company HQ Location" placeholder="Country, state or city…"
                selected={local.organization_locations}
                onChange={v => setLocal(p => ({ ...p, organization_locations: v }))}
              />
            </div>
          </Section>

          {/* COMPANY */}
          <Section value="company" icon={<Building2 size={12} className="text-violet-500" />} label="Company Info"
            count={local.company_name_tags.length + local.organization_num_employees_ranges.length}>
            <div className="pt-1 space-y-3 overflow-hidden">
              <div>
                <p className="text-[9px] uppercase text-slate-400 font-semibold mb-1.5">Company Names</p>
                <CompanyTagInput tags={local.company_name_tags} onChange={v => setLocal(p => ({ ...p, company_name_tags: v }))} />
              </div>

              <div>
                <p className="text-[9px] uppercase text-slate-400 font-semibold mb-1">Employee Count</p>
                <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                  {EMP_RANGES.map(r => (
                    <FilterChip key={r.id} id={`emp-${r.id}`} label={r.label}
                      checked={local.organization_num_employees_ranges.includes(r.id)}
                      onChange={() => toggleArr('organization_num_employees_ranges', r.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
  <div>
    <label className="text-[10px] text-slate-500">Min</label>
    <input
      type="number"
      placeholder="0"
      className="mt-0.5 w-full h-8 text-xs border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      value={local.revenue_min}
      onChange={e => setLocal(p => ({ ...p, revenue_min: e.target.value }))}
    />
  </div>
  <div>
    <label className="text-[10px] text-slate-500">Max</label>
    <input
      type="number"
      placeholder="∞"
      className="mt-0.5 w-full h-8 text-xs border border-slate-200 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      value={local.revenue_max}
      onChange={e => setLocal(p => ({ ...p, revenue_max: e.target.value }))}
    />
  </div>
</div>
            </div>
          </Section>

          {/* TECHNOLOGIES */}
          <Section value="tech" icon={<Cpu size={12} className="text-cyan-500" />} label="Technologies"
            count={local.technologies.length}>
            <div className="pt-1">
              <TechnologySelect selected={local.technologies} onChange={v => setLocal(p => ({ ...p, technologies: v }))} />
            </div>
          </Section>

          {/* HIRING INTENT */}
          <Section value="hiring" icon={<Briefcase size={12} className="text-amber-500" />} label="Hiring Intent"
            count={local.q_organization_job_titles.length + local.job_posting_locations.length}>
            <div className="pt-1 space-y-3">
              <div>
                <p className="text-[9px] uppercase text-slate-400 font-semibold mb-1.5">Active Job Titles Posted</p>
                <JobTitleSelect
                  selected={local.q_organization_job_titles}
                  onChange={v => setLocal(p => ({ ...p, q_organization_job_titles: v }))}
                />
              </div>
              <LocationMultiSelect label="Job Location" placeholder="Country, state or city…"
                selected={local.job_posting_locations}
                onChange={v => setLocal(p => ({ ...p, job_posting_locations: v }))}
              />
            </div>
          </Section>

          {/* CONTACT INFO */}
          <Section value="email" icon={<Users size={12} className="text-slate-500" />} label="Email Status"
            count={local.contact_email_status.length}>
            <div className="space-y-0.5 pt-1">
              {EMAIL_STATUSES.map(es => (
                <FilterChip key={es.id} id={`es-${es.id}`} label={es.label}
                  checked={local.contact_email_status.includes(es.id)}
                  onChange={() => toggleArr('contact_email_status', es.id)}
                />
              ))}
            </div>
          </Section>

        </Accordion>
      </ScrollArea>

      {/* FOOTER Run Search */}
      <div className="flex-shrink-0 p-3 border-t border-slate-100 bg-white">
        <button
          onClick={handleRunSearch}
          data-run-search
          className={cn(
            'w-full h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all',
            activeCount > 0
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600',
          )}
        >
          <Play size={10} className={activeCount > 0 ? 'fill-white' : ''} />
          {activeCount > 0 ? `Search · ${activeCount} filter${activeCount !== 1 ? 's' : ''}` : 'Run Search'}
        </button>
      </div>
    </div>
  );
}