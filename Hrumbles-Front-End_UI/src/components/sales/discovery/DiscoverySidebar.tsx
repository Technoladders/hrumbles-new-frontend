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
import { supabase } from '@/integrations/supabase/client';
import { Country, State, City } from 'country-state-city';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Search, MapPin, Briefcase, Building2, Globe, Users,
  Cpu, FilterX, Play, X, ChevronRight, Loader2, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DS_LS_KEY = 'contacts_recent_discovery_searches_v1';

export interface DiscoveryRecentSearch {
  id: string; summary: string;
  filters: ReturnType<typeof buildInitialState>;
  chips: string[]; resultCount: number; timestamp: number;
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
  { id: '1,10',       label: '1–10'    },
  { id: '11,50',      label: '11–50'   },
  { id: '51,200',     label: '51–200'  },
  { id: '201,500',    label: '201–500' },
  { id: '501,1000',   label: '501–1k'  },
  { id: '1001,5000',  label: '1k–5k'   },
  { id: '5001,10000', label: '5k–10k'  },
  { id: '10001',      label: '10k+'    },
];

const EMAIL_STATUSES = [
  { id: 'verified',         label: 'Verified'         },
  { id: 'likely to engage', label: 'Likely to Engage' },
  { id: 'unverified',       label: 'Unverified'       },
  { id: 'unavailable',      label: 'Unavailable'      },
];

const DK_KEYS = {
  q: 'dk_q', titles: 'dk_titles', sen: 'dk_sen', ploc: 'dk_ploc',
  oloc: 'dk_oloc', co: 'dk_co', emp: 'dk_emp', revMin: 'dk_revMin',
  revMax: 'dk_revMax', tech: 'dk_tech', orgTitles: 'dk_orgTitles',
  jobloc: 'dk_jobloc', email: 'dk_email', simTitles: 'dk_simTitles',
};

function parseArr(params: URLSearchParams, key: string): string[] {
  const v = params.get(key);
  return v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
}

function buildInitialState(params: URLSearchParams) {
  return {
    q_keywords:                        params.get(DK_KEYS.q)        || '',
    person_titles:                     parseArr(params, DK_KEYS.titles),
    person_locations:                  parseArr(params, DK_KEYS.ploc),
    person_seniorities:                parseArr(params, DK_KEYS.sen),
    company_name_tags:                 parseArr(params, DK_KEYS.co),
    organization_locations:            parseArr(params, DK_KEYS.oloc),
    organization_num_employees_ranges: parseArr(params, DK_KEYS.emp),
    revenue_min:                       params.get(DK_KEYS.revMin)    || '',
    revenue_max:                       params.get(DK_KEYS.revMax)    || '',
    technologies:                      parseArr(params, DK_KEYS.tech),
    contact_email_status:              parseArr(params, DK_KEYS.email),
    include_similar_titles:            params.get(DK_KEYS.simTitles) !== '0',
    q_organization_job_titles:         parseArr(params, DK_KEYS.orgTitles),
    job_posting_locations:             parseArr(params, DK_KEYS.jobloc),
  };
}

// ─── Location data ────────────────────────────────────────────────────────────

type LocType = 'country' | 'state' | 'city';
interface LocOpt { value: string; label: string; type: LocType; }

// Dark-theme translucent location chip colours
const LOC_STYLE: Record<LocType, { dot: string; chip: string; dropBadge: string; label: string }> = {
  country: {
    dot:       'bg-indigo-400',
    chip:      'bg-indigo-500/20 text-indigo-200 border-indigo-500/30',
    dropBadge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    label:     'Country',
  },
  state: {
    dot:       'bg-violet-400',
    chip:      'bg-violet-500/20 text-violet-200 border-violet-500/30',
    dropBadge: 'bg-violet-100 text-violet-700 border-violet-200',
    label:     'State',
  },
  city: {
    dot:       'bg-cyan-400',
    chip:      'bg-cyan-500/20 text-cyan-200 border-cyan-500/30',
    dropBadge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    label:     'City',
  },
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

// ─── Shared dark input style ──────────────────────────────────────────────────
// Tailwind alone can't reliably override browser-default white bg + black text
// on <input>. We use inline style for background/color and Tailwind for the rest.
const DARK_INPUT = [
  'w-full h-8 text-xs rounded-lg',
  // border only via Tailwind — bg + color forced by DARK_INPUT_STYLE below
  'border border-white/12',
  // placeholder
  'placeholder:text-white/35 placeholder:italic placeholder:text-[10px]',
  // focus ring
  'focus:outline-none focus:ring-1 focus:ring-indigo-400/50 focus:border-indigo-400/50',
  'transition-all',
  // autocomplete yellow-fill killer
  '[&:-webkit-autofill]:!bg-[rgba(255,255,255,0.06)] [&:-webkit-autofill]:!text-white',
].join(' ');

// Inline style applied to every dark input to guarantee visibility
const DARK_INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.4)',

  // 👇 IMPORTANT: must match color or autofill overrides it
  WebkitTextFillColor: 'rgba(255,255,255,0.4)',
  caretColor: 'rgba(255,255,255,0.4)',
};

// ─── Portal dropdown (light panel floating above dark sidebar) ────────────────

interface PortalProps { anchorRef: React.RefObject<HTMLDivElement>; isOpen: boolean; maxH?: number; children: React.ReactNode; }

function AbovePortal({ anchorRef, isOpen, maxH = 240, children }: PortalProps) {
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
        setStyle({ position: 'fixed', bottom: window.innerHeight - r.top + 4, left: Math.max(4, left), width: w, zIndex: 99999, maxHeight: maxH, overflow: 'hidden' });
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [isOpen, anchorRef, maxH]);

  if (!isOpen) return null;
  return ReactDOM.createPortal(
    <div style={style} className="bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden">{children}</div>,
    document.body,
  );
}

// ─── LocationMultiSelect ──────────────────────────────────────────────────────

function LocationMultiSelect({ label, placeholder, selected, onChange }: {
  label: string; placeholder: string; selected: string[]; onChange: (v: string[]) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
      <p className="text-[9px] uppercase text-white font-semibold tracking-wider">{label}</p>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
          {selected.map(val => {
            const s = LOC_STYLE[getLocType(val)];
            return (
              <span key={val} className={cn('inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[10px] font-semibold border', s.chip)}>
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
                <span className="truncate max-w-[80px]">{val}</span>
                <button type="button" onMouseDown={e => { e.preventDefault(); remove(val); }} className="ml-0.5 hover:opacity-70"><X size={9} /></button>
              </span>
            );
          })}
        </div>
      )}
      <div ref={anchorRef} className="relative">
        <Search className="absolute left-2.5 top-2 text-white pointer-events-none" size={11} />
        <input ref={inputRef} placeholder={placeholder} className={cn(DARK_INPUT, 'pl-7 pr-7')} style={DARK_INPUT_STYLE}
          value={q} onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => { setOpen(false); setQ(''); }, 150)} />
        {selected.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-indigo-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">{selected.length}</span>
        )}
        <AbovePortal anchorRef={anchorRef} isOpen={open} maxH={220}>
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex-shrink-0">
            {(Object.entries(LOC_STYLE) as [LocType, any][]).map(([t, s]) => (
              <span key={t} className="flex items-center gap-1 text-[9px] text-slate-400 font-medium">
                <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />{s.label}
              </span>
            ))}
          </div>
          <div className="overflow-y-auto flex-1">
            {options.length === 0
              ? <p className="px-3 py-3 text-[11px] text-slate-400 italic text-center">{q.length > 0 && q.length < 3 ? 'Type 3+ chars for cities' : 'No matches'}</p>
              : <div className="py-1">{options.map((opt, i) => {
                  const s = LOC_STYLE[opt.type];
                  return (
                    <button key={`${opt.type}-${i}`} type="button" onMouseDown={e => { e.preventDefault(); add(opt); }}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-indigo-50/60 text-left transition-colors">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
                        <span className="text-[11px] text-slate-700 font-medium truncate">{opt.label}</span>
                      </span>
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ml-2', s.dropBadge)}>{s.label}</span>
                    </button>
                  );
                })}</div>
            }
          </div>
          {!q && <p className="px-3 py-1.5 text-[9px] text-slate-400 border-t border-slate-100 bg-slate-50 flex-shrink-0">Popular countries · type to search all</p>}
        </AbovePortal>
      </div>
    </div>
  );
}

// ─── JobTitleSelect ───────────────────────────────────────────────────────────

function JobTitleSelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['discovery-job-titles-global', q],
    queryFn: async () => {
      if (!q.trim()) return [];
      const { data } = await supabase.from('contacts').select('job_title')
        .not('job_title', 'is', null).ilike('job_title', `%${q}%`).limit(300);
      const unique = [...new Set((data || []).map((r: any) => r.job_title?.trim()).filter(Boolean))];
      return unique.sort().slice(0, 50) as string[];
    },
    enabled: q.trim().length > 0,
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
  const showManual = q.trim() && !selected.includes(q.trim()) && !suggestions.includes(q.trim());
  const filtered = suggestions.filter(s => !selected.includes(s));

  return (
    <div ref={wrapRef} className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
          {selected.map(t => (
            <span key={t} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
              <span className="truncate max-w-[100px]">{t}</span>
              <button onClick={() => remove(t)} className="ml-0.5 hover:opacity-60"><X size={9} /></button>
            </span>
          ))}
        </div>
      )}
      <div ref={anchorRef} className="relative">
        <Briefcase className="absolute left-2.5 top-2 text-white pointer-events-none" size={11} />
        <input ref={inputRef} placeholder="e.g. CEO, Marketing Director…" className={cn(DARK_INPUT, 'pl-7 pr-7')} style={DARK_INPUT_STYLE}
          value={q}
          onChange={e => { setQ(e.target.value); if (e.target.value.trim()) setOpen(true); else setOpen(false); }}
          onFocus={() => { if (q.trim()) setOpen(true); }}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) addValue(q); if (e.key === 'Backspace' && !q && selected.length) onChange(selected.slice(0, -1)); }}
          onBlur={() => setTimeout(() => { setOpen(false); setQ(''); }, 150)} />
        {selected.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-indigo-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">{selected.length}</span>
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
      <p className="text-[9px] text-white italic">Enter or click to add · from your CRM + manual</p>
    </div>
  );
}

// ─── CompanyTagInput ──────────────────────────────────────────────────────────

function CompanyTagInput({ tags, onChange }: { tags: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: companies = [] } = useQuery({
    queryKey: ['discovery-companies-global', q],
    queryFn: async () => {
      if (!q.trim()) return [];
      const { data } = await supabase.from('companies').select('id, name, logo_url')
        .ilike('name', `%${q}%`).order('name').limit(60);
      const seen = new Set<string>();
      return (data || []).filter((c: any) => { if (seen.has(c.name)) return false; seen.add(c.name); return true; }) as { id: number; name: string; logo_url?: string | null }[];
    },
    enabled: q.trim().length > 0,
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
            <span key={t} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/80 border border-white/15">
              <Building2 size={9} className="text-white" />
              <span className="truncate max-w-[90px]">{t}</span>
              <button onClick={() => remove(t)} className="ml-0.5 hover:opacity-60"><X size={9} /></button>
            </span>
          ))}
        </div>
      )}
      <div ref={anchorRef} className="relative">
        <Building2 className="absolute left-2.5 top-2 text-white pointer-events-none" size={11} />
        <input ref={inputRef} placeholder="Company name…" className={cn(DARK_INPUT, 'pl-7 pr-7')} style={DARK_INPUT_STYLE}
          value={q}
          onChange={e => { setQ(e.target.value); if (e.target.value.trim()) setOpen(true); else setOpen(false); }}
          onFocus={() => { if (q.trim()) setOpen(true); }}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) addTag(q); if (e.key === 'Backspace' && !q && tags.length) onChange(tags.slice(0, -1)); }}
          onBlur={() => setTimeout(() => { setOpen(false); setQ(''); }, 150)} />
        {tags.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-white/20 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">{tags.length}</span>
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
      <p className="text-[9px] text-white italic">From your CRM · Enter to add manually</p>
    </div>
  );
}

// ─── TechnologySelect ─────────────────────────────────────────────────────────

function TechnologySelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: techOptions = [], isLoading } = useQuery({
    queryKey: ['discovery-technologies', q],
    queryFn: async () => {
      let query = supabase.from('enrichment_org_technologies').select('uid, name, category');
      if (q.trim()) query = query.or(`name.ilike.%${q}%,uid.ilike.%${q}%`);
      const { data } = await query.limit(300);
      const seen = new Set<string>();
      const unique: { uid: string; name: string; category: string }[] = [];
      for (const row of (data || [])) {
        if (row.uid && !seen.has(row.uid)) { seen.add(row.uid); unique.push({ uid: row.uid, name: row.name || row.uid, category: row.category || 'Other' }); }
      }
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
  const filtered = techOptions.filter(t => !selected.includes(t.uid));
  const showManual = q.trim() && !selected.includes(q.trim()) && !techOptions.some(t => t.uid === q.trim());
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
            <span key={uid} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
              <Cpu size={9} />
              <span className="truncate max-w-[90px]">{uid}</span>
              <button onClick={() => remove(uid)} className="ml-0.5 hover:opacity-60"><X size={9} /></button>
            </span>
          ))}
        </div>
      )}
      <div ref={anchorRef} className="relative">
        <Cpu className="absolute left-2.5 top-2 text-white pointer-events-none" size={11} />
        <input ref={inputRef} placeholder="e.g. salesforce, hubspot, aws…" className={cn(DARK_INPUT, 'pl-7 pr-7')} style={DARK_INPUT_STYLE}
          value={q}
          onChange={e => { setQ(e.target.value); if (e.target.value.trim()) setOpen(true); else setOpen(false); }}
          onFocus={() => { if (q.trim()) setOpen(true); }}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) addTech(q); if (e.key === 'Backspace' && !q && selected.length) onChange(selected.slice(0, -1)); }}
          onBlur={() => setTimeout(() => { setOpen(false); setQ(''); }, 150)} />
        {selected.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-cyan-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">{selected.length}</span>
        )}
        <AbovePortal anchorRef={anchorRef} isOpen={open && q.trim().length > 0} maxH={240}>
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-5 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
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

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ value, icon, label, count, children }: {
  value: string; icon: React.ReactNode; label: string; count?: number; children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="border-b border-white/5 last:border-0">
      <AccordionTrigger className="px-2 py-2 rounded-lg transition-all group hover:bg-white/5 data-[state=open]:bg-white/5 [&>svg]:hidden">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="opacity-70 group-hover:opacity-100 transition">{icon}</div>
            <span className="text-xs font-medium text-white group-hover:text-white/90 transition">{label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {!!count && count > 0 && (
              <span className="h-4 px-1.5 text-[9px] bg-indigo-500/25 text-indigo-300 rounded-full font-semibold flex items-center">{count}</span>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-white transition-transform group-data-[state=open]:rotate-90" />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-2 pb-3">{children}</AccordionContent>
    </AccordionItem>
  );
}

// ─── FilterChip — dark themed ─────────────────────────────────────────────────

function FilterChip({ id, label, checked, onChange }: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className={cn(
      'flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer transition-colors select-none border',
      checked
        ? 'bg-indigo-500/20 border-indigo-400/35'
        : 'border-transparent hover:bg-white/5',
    )}>
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded" style={{ accentColor: '#818cf8' }} />
      <span className={cn('text-xs transition-colors', checked ? 'text-indigo-200 font-medium' : 'text-white/55')}>
        {label}
      </span>
    </label>
  );
}

// ─── localToChips ─────────────────────────────────────────────────────────────

function localToChips(local: ReturnType<typeof buildInitialState>, SEN: Record<string,string>, EMP: Record<string,string>): string[] {
  const chips: string[] = [];
  if (local.q_keywords) chips.push(local.q_keywords);
  local.person_titles.forEach(t => chips.push(t));
  local.person_seniorities.forEach(s => chips.push(SEN[s] || s));
  local.person_locations.forEach(l => chips.push(l));
  local.organization_locations.forEach(l => chips.push(`HQ: ${l}`));
  local.company_name_tags.forEach(c => chips.push(c));
  local.organization_num_employees_ranges.forEach(r => chips.push(EMP[r] || r));
  local.technologies.forEach(t => chips.push(t));
  local.contact_email_status.forEach(e => chips.push(e));
  local.q_organization_job_titles.forEach(t => chips.push(`Hiring: ${t}`));
  local.job_posting_locations.forEach(l => chips.push(`Job: ${l}`));
  if (local.revenue_min || local.revenue_max) chips.push(`Revenue: ${local.revenue_min || '0'}–${local.revenue_max || '∞'}`);
  return chips;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DiscoverySidebarProps {
  onFiltersChange?: (chips: string[], count: number) => void;
}

export function DiscoverySidebar({ onFiltersChange }: DiscoverySidebarProps) {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [local, setLocal]       = useState(() => buildInitialState(searchParams));
  const [openSections, setOpen] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<DiscoveryRecentSearch[]>(loadDiscoverySearches);

  const toggleArr = (field: string, value: string) =>
    setLocal(prev => {
      const cur = (prev as any)[field] || [];
      return { ...prev, [field]: cur.includes(value) ? cur.filter((i: string) => i !== value) : [...cur, value] };
    });

  const SEN_MAP: Record<string,string> = { owner:'Owner', founder:'Founder', c_suite:'C-Suite', partner:'Partner', vp:'VP', head:'Head', director:'Director', manager:'Manager', senior:'Senior', entry:'Entry', intern:'Intern' };
  const EMP_MAP: Record<string,string> = { '1,10':'1–10','11,50':'11–50','51,200':'51–200','201,500':'201–500','501,1000':'501–1k','1001,5000':'1k–5k','5001,10000':'5k–10k','10001':'10k+' };

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

  useEffect(() => {
    if (!onFiltersChange) return;
    const t = setTimeout(() => onFiltersChange(localToChips(local, SEN_MAP, EMP_MAP), activeCount), 200);
    return () => clearTimeout(t);
  }, [local, activeCount, onFiltersChange]);

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
    if (activeCount > 0) {
      const chips = localToChips(local, SEN_MAP, EMP_MAP);
      const entry: DiscoveryRecentSearch = {
        id: Date.now().toString(), summary: buildDiscoverySummary(local),
        filters: { ...local }, chips, resultCount: 0, timestamp: Date.now(),
      };
      const existing = loadDiscoverySearches();
      const deduped = [entry, ...existing.filter(s => s.summary !== entry.summary)].slice(0, 10);
      localStorage.setItem(DS_LS_KEY, JSON.stringify(deduped));
      setRecentSearches(deduped);
    }
    const kw = [local.q_keywords, ...local.company_name_tags].filter(Boolean).join(' ').trim();
    dispatch(setFilters({
      q_keywords: kw, person_titles: local.person_titles, person_locations: local.person_locations,
      person_seniorities: local.person_seniorities, organization_locations: local.organization_locations,
      organization_num_employees_ranges: local.organization_num_employees_ranges,
      q_organization_domains_list: [], contact_email_status: local.contact_email_status,
      include_similar_titles: local.include_similar_titles,
      revenue_range: { min: local.revenue_min ? parseInt(local.revenue_min, 10) : undefined, max: local.revenue_max ? parseInt(local.revenue_max, 10) : undefined },
      currently_using_any_of_technology_uids: local.technologies,
      q_organization_job_titles: local.q_organization_job_titles, organization_job_locations: local.job_posting_locations,
    }));
  }, [local, dispatch]);

  const handleReset = () => {
    dispatch(resetFilters());
    setSearchParams(prev => { Object.values(DK_KEYS).forEach(k => prev.delete(k)); return prev; });
    setLocal({ q_keywords: '', person_titles: [], person_locations: [], person_seniorities: [], company_name_tags: [], organization_locations: [], organization_num_employees_ranges: [], revenue_min: '', revenue_max: '', technologies: [], contact_email_status: [], include_similar_titles: true, q_organization_job_titles: [], job_posting_locations: [] });
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden text-white">

      {/* ── ANIMATED BACKGROUND ── */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.25),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.25),transparent_40%),linear-gradient(135deg,#0b0b1f,#1a1040,#2b18e0)]" />
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute w-[600px] h-[600px] bg-purple-500/20 blur-[120px] rounded-full top-[-100px] left-[-100px] animate-pulse" />
        <div className="absolute w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full bottom-[-100px] right-[-100px] animate-pulse" />
      </div>

      {/* ── CONTENT ── */}
      <div className="relative z-10 flex flex-col h-full">

        {/* HEADER */}
        <div className="flex-shrink-0 px-3 pt-3 pb-2.5 border-b"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-indigo-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Search People</span>
              {activeCount > 0 && (
                <span className="text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center bg-indigo-500">{activeCount}</span>
              )}
            </div>
            {activeCount > 0 && (
              <button onClick={handleReset} className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                <FilterX size={10} /> Clear
              </button>
            )}
          </div>

          {/* Keyword input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-white pointer-events-none" size={12} />
            <input
              type="text"
              placeholder="Keywords, name…"
              className={cn(DARK_INPUT, 'pl-7 pr-3')} style={DARK_INPUT_STYLE}
              value={local.q_keywords}
              onChange={e => setLocal(p => ({ ...p, q_keywords: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleRunSearch()}
            />
          </div>

          {/* Run Search */}
          <button onClick={handleRunSearch} data-run-search
            className="mt-2 w-full h-9 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
            style={{ background: 'linear-gradient(135deg, #6d5cff 0%, #8b5cf6 50%, #2b18e0 100%)', boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}>
            <Play size={10} className="fill-white" /> Run Search
            {activeCount > 0 && <span className="text-[10px] text-white">· {activeCount} filter{activeCount !== 1 ? 's' : ''}</span>}
          </button>
        </div>

        {/* FILTERS */}
        <ScrollArea className="flex-1 min-h-0">
          <Accordion type="multiple" value={openSections} onValueChange={setOpen} className="w-full px-2 py-1">

            <Section value="professional" icon={<Briefcase size={12} className="text-indigo-300" />} label="Professional Info"
              count={local.person_titles.length + local.person_seniorities.length}>
              <div className="pt-1 space-y-3">
                <div>
                  <p className="text-[9px] uppercase text-white font-semibold tracking-wider mb-1.5">Job Titles</p>
                  <JobTitleSelect selected={local.person_titles} onChange={v => setLocal(p => ({ ...p, person_titles: v }))} />
                  <div className="flex items-center gap-2 mt-1.5">
                    <input type="checkbox" id="simtitles" checked={local.include_similar_titles}
                      onChange={e => setLocal(p => ({ ...p, include_similar_titles: e.target.checked }))}
                      className="h-3 w-3 rounded" style={{ accentColor: '#818cf8' }} />
                    <label htmlFor="simtitles" className="text-[10px] text-white/55 cursor-pointer select-none">Include similar titles</label>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-white font-semibold tracking-wider mb-1">Seniority</p>
                  <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                    {SENIORITIES.map(s => (
                      <FilterChip key={s.id} id={`sen-${s.id}`} label={s.label}
                        checked={local.person_seniorities.includes(s.id)}
                        onChange={() => toggleArr('person_seniorities', s.id)} />
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <Section value="location" icon={<MapPin size={12} className="text-pink-400" />} label="Location"
              count={local.person_locations.length + local.organization_locations.length}>
              <div className="pt-1 space-y-3">
                <LocationMultiSelect label="Person Location" placeholder="Country, state or city…"
                  selected={local.person_locations} onChange={v => setLocal(p => ({ ...p, person_locations: v }))} />
                <LocationMultiSelect label="Company HQ Location" placeholder="Country, state or city…"
                  selected={local.organization_locations} onChange={v => setLocal(p => ({ ...p, organization_locations: v }))} />
              </div>
            </Section>

            <Section value="company" icon={<Building2 size={12} className="text-purple-300" />} label="Company Info"
              count={local.company_name_tags.length + local.organization_num_employees_ranges.length}>
              <div className="pt-1 space-y-3">
                <div>
                  <p className="text-[9px] uppercase text-white font-semibold tracking-wider mb-1.5">Company Names</p>
                  <CompanyTagInput tags={local.company_name_tags} onChange={v => setLocal(p => ({ ...p, company_name_tags: v }))} />
                </div>
                <div>
                  <p className="text-[9px] uppercase text-white font-semibold tracking-wider mb-1">Employee Count</p>
                  <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                    {EMP_RANGES.map(r => (
                      <FilterChip key={r.id} id={`emp-${r.id}`} label={r.label}
                        checked={local.organization_num_employees_ranges.includes(r.id)}
                        onChange={() => toggleArr('organization_num_employees_ranges', r.id)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-white font-semibold tracking-wider mb-1">Revenue Range</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-white">Min</label>
                      <input type="number" placeholder="0" className={cn(DARK_INPUT, 'mt-0.5 px-2')} style={DARK_INPUT_STYLE}
                        value={local.revenue_min} onChange={e => setLocal(p => ({ ...p, revenue_min: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-white">Max</label>
                      <input type="number" placeholder="∞" className={cn(DARK_INPUT, 'mt-0.5 px-2')} style={DARK_INPUT_STYLE}
                        value={local.revenue_max} onChange={e => setLocal(p => ({ ...p, revenue_max: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section value="tech" icon={<Cpu size={12} className="text-cyan-300" />} label="Technologies" count={local.technologies.length}>
              <div className="pt-1">
                <TechnologySelect selected={local.technologies} onChange={v => setLocal(p => ({ ...p, technologies: v }))} />
              </div>
            </Section>

            <Section value="hiring" icon={<Briefcase size={12} className="text-amber-400" />} label="Hiring Intent"
              count={local.q_organization_job_titles.length + local.job_posting_locations.length}>
              <div className="pt-1 space-y-3">
                <div>
                  <p className="text-[9px] uppercase text-white font-semibold tracking-wider mb-1.5">Active Job Titles Posted</p>
                  <JobTitleSelect selected={local.q_organization_job_titles} onChange={v => setLocal(p => ({ ...p, q_organization_job_titles: v }))} />
                </div>
                <LocationMultiSelect label="Job Location" placeholder="Country, state or city…"
                  selected={local.job_posting_locations} onChange={v => setLocal(p => ({ ...p, job_posting_locations: v }))} />
              </div>
            </Section>

            <Section value="email" icon={<Users size={12} className="text-slate-400" />} label="Email Status" count={local.contact_email_status.length}>
              <div className="space-y-0.5 pt-1">
                {EMAIL_STATUSES.map(es => (
                  <FilterChip key={es.id} id={`es-${es.id}`} label={es.label}
                    checked={local.contact_email_status.includes(es.id)}
                    onChange={() => toggleArr('contact_email_status', es.id)} />
                ))}
              </div>
            </Section>

          </Accordion>
        </ScrollArea>

        {/* FOOTER */}
        <div className="flex-shrink-0 p-3 border-t border-white/10 bg-white/5 backdrop-blur-md">
          <button onClick={handleRunSearch} data-run-search
            className="w-full h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: activeCount > 0
                ? 'linear-gradient(135deg, #6d5cff 0%, #8b5cf6 50%, #2b18e0 100%)'
                : 'rgba(255,255,255,0.08)',
              color: activeCount > 0 ? '#fff' : 'rgba(255,255,255,0.4)',
            }}>
            <Play size={10} className={activeCount > 0 ? 'fill-white' : ''} />
            {activeCount > 0 ? `Search · ${activeCount} filter${activeCount !== 1 ? 's' : ''}` : 'Run Search'}
          </button>
        </div>

      </div>
    </div>
  );
}