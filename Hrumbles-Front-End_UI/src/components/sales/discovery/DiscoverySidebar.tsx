// Hrumbles-Front-End_UI\src\components\sales\discovery\DiscoverySidebar.tsx
"use client";

import React, {
  useState, useEffect, useRef, useMemo, useCallback,
} from 'react';
import ReactDOM from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { resetFilters, setFilters } from '@/Redux/intelligenceSearchSlice';
import { Country, State, City } from 'country-state-city';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Input }    from '@/components/ui/input';
import { Button }   from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label }    from '@/components/ui/label';
import { Badge }    from '@/components/ui/badge';
import {
  Search, MapPin, Briefcase, Building2, Globe, Users,
  DollarSign, Laptop, FilterX, Play, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

// ─── Location types & styles ──────────────────────────────────────────────────

type LocationType = 'country' | 'state' | 'city';

interface LocationOption {
  value: string;
  label: string;
  type:  LocationType;
}

const LOC_STYLE: Record<LocationType, { badge: string; dot: string; tag: string; label: string }> = {
  country: {
    badge: 'bg-blue-50   text-blue-700   border-blue-200',
    dot:   'bg-blue-400',
    tag:   'bg-blue-100  text-blue-800   border-blue-200',
    label: 'Country',
  },
  state: {
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    dot:   'bg-violet-400',
    tag:   'bg-violet-100 text-violet-800 border-violet-200',
    label: 'State',
  },
  city: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot:   'bg-emerald-400',
    tag:   'bg-emerald-100 text-emerald-800 border-emerald-200',
    label: 'City',
  },
};

// ─── Pre-load countries + states (small, fast) ───────────────────────────────

const ALL_COUNTRIES: LocationOption[] = Country.getAllCountries().map(c => ({
  value: c.name,
  label: `${c.flag ?? ''} ${c.name}`.trim(),
  type:  'country' as LocationType,
}));

const ALL_STATES: LocationOption[] = State.getAllStates().map(s => ({
  value: s.name,
  label: s.name,
  type:  'state' as LocationType,
}));

const POPULAR = [
  'United States','United Kingdom','Canada','Australia','India',
  'Germany','France','Singapore','Netherlands','UAE',
];

function searchLocations(query: string, selected: string[]): LocationOption[] {
  const q = query.toLowerCase().trim();

  // Empty query → popular countries as default suggestions
  if (!q) {
    return ALL_COUNTRIES
      .filter(c => POPULAR.includes(c.value) && !selected.includes(c.value))
      .slice(0, 10);
  }

  const out: LocationOption[] = [];

  ALL_COUNTRIES
    .filter(c => c.value.toLowerCase().includes(q) && !selected.includes(c.value))
    .slice(0, 8)
    .forEach(c => out.push(c));

  ALL_STATES
    .filter(s => s.value.toLowerCase().includes(q) && !selected.includes(s.value))
    .slice(0, 8)
    .forEach(s => out.push(s));

  // City search is expensive (~150 k rows) — only run with 3+ chars
  if (q.length >= 3) {
    City.getAllCities()
      .filter(c => c.name.toLowerCase().includes(q) && !selected.includes(c.name))
      .slice(0, 14)
      .forEach(c => out.push({ value: c.name, label: c.name, type: 'city' }));
  }

  return out.slice(0, 30);
}

function getLocationType(value: string): LocationType {
  if (ALL_COUNTRIES.some(c => c.value === value)) return 'country';
  if (ALL_STATES.some(s => s.value === value))    return 'state';
  return 'city';
}

// ─── Portal Dropdown ──────────────────────────────────────────────────────────
// Rendered directly into document.body so it is NEVER clipped by:
//   • ScrollArea overflow:hidden
//   • AccordionContent overflow:hidden
//   • Any parent z-index stacking context
//
// Position is calculated from the anchor element's getBoundingClientRect()
// and updated on scroll / resize.

interface PortalDropdownProps {
  anchorRef: React.RefObject<HTMLDivElement>;
  isOpen:    boolean;
  options:   LocationOption[];
  query:     string;
  onSelect:  (opt: LocationOption) => void;
}

function PortalDropdown({ anchorRef, isOpen, options, query, onSelect }: PortalDropdownProps) {
  const [pos, setPos] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const update = () => {
      const r = anchorRef.current!.getBoundingClientRect();
      setPos({
        position: 'fixed',
        top:      r.bottom + 4,
        left:     r.left,
        width:    r.width,
        zIndex:   99999,
      });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, anchorRef]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      style={pos}
      className="bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden"
    >
      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 border-b border-slate-100">
        {(Object.entries(LOC_STYLE) as [LocationType, typeof LOC_STYLE[LocationType]][]).map(
          ([t, s]) => (
            <span key={t} className="flex items-center gap-1 text-[9px] text-slate-500 font-medium">
              <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
              {s.label}
            </span>
          ),
        )}
      </div>

      <div className="max-h-[220px] overflow-y-auto overscroll-contain">
        {options.length === 0 ? (
          <p className="px-3 py-3 text-[11px] text-slate-400 italic text-center">
            {query.length > 0 && query.length < 3
              ? 'Type 3+ characters to include cities'
              : 'No matches found'}
          </p>
        ) : (
          <div className="py-1">
            {options.map((opt, i) => {
              const s = LOC_STYLE[opt.type];
              return (
                <button
                  key={`${opt.type}-${opt.value}-${i}`}
                  type="button"
                  // onMouseDown + preventDefault keeps input focused when clicking an option
                  onMouseDown={e => { e.preventDefault(); onSelect(opt); }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
                    <span className="text-[11px] text-slate-700 font-medium truncate">
                      {opt.label}
                    </span>
                  </span>
                  <span className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ml-2',
                    s.badge,
                  )}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!query && (
        <p className="px-3 py-1.5 text-[9px] text-slate-400 border-t border-slate-100 bg-slate-50">
          Showing popular countries · type to search all
        </p>
      )}
    </div>,
    document.body,
  );
}

// ─── LocationMultiSelect ──────────────────────────────────────────────────────

interface LocationMultiSelectProps {
  label:       string;
  placeholder: string;
  selected:    string[];
  onChange:    (values: string[]) => void;
}

function LocationMultiSelect({ label, placeholder, selected, onChange }: LocationMultiSelectProps) {
  const [query,  setQuery]  = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // TWO separate refs — one for outside-click detection, one for portal positioning
  const wrapperRef  = useRef<HTMLDivElement>(null);  // entire component
  const anchorRef   = useRef<HTMLDivElement>(null);  // input row only (portal aligns to this)
  const inputRef    = useRef<HTMLInputElement>(null);

  const options = useMemo(() => searchLocations(query, selected), [query, selected]);

  // Close when clicking outside the ENTIRE component
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const add = (opt: LocationOption) => {
    onChange([...selected, opt.value]);
    setQuery('');
    setIsOpen(true);          // keep open so user can add more
    inputRef.current?.focus();
  };

  const remove = (value: string) => onChange(selected.filter(v => v !== value));

  return (
    <div className="space-y-1.5" ref={wrapperRef}>
      <Label className="text-[10px] uppercase text-slate-500 font-bold">{label}</Label>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-[68px] overflow-y-auto pb-0.5">
          {selected.map(val => {
            const type  = getLocationType(val);
            const style = LOC_STYLE[type];
            return (
              <span
                key={val}
                className={cn(
                  'inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full',
                  'text-[10px] font-semibold border',
                  style.tag,
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', style.dot)} />
                {val}
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); remove(val); }}
                  className="ml-0.5 rounded-full hover:opacity-70 transition-opacity"
                >
                  <X size={9} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Input row — anchorRef lives here so PortalDropdown aligns to it */}
      <div className="relative" ref={anchorRef}>
        <Search className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" size={12} />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          className="pl-7 h-8 text-xs pr-8"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Short delay so onMouseDown in portal fires before blur closes it
            setTimeout(() => { setIsOpen(false); setQuery(''); }, 150);
          }}
        />
        {selected.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-purple-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
            {selected.length}
          </span>
        )}

        {/* Portal — rendered at document.body, positioned via anchorRef rect */}
        <PortalDropdown
          anchorRef={anchorRef}
          isOpen={isOpen}
          options={options}
          query={query}
          onSelect={add}
        />
      </div>

      {!query && selected.length === 0 && (
        <p className="text-[9px] text-slate-400">
          Search any country, state / province or city
        </p>
      )}
    </div>
  );
}

// ─── TagInput — for Company Names ─────────────────────────────────────────────
// Type a name → press Enter or comma to add it as a removable tag.
// Each tag is sent as a separate keyword to Apollo's q_keywords.

interface TagInputProps {
  label:       string;
  placeholder: string;
  tags:        string[];
  onChange:    (tags: string[]) => void;
  hint?:       string;
}

function TagInput({ label, placeholder, tags, onChange, hint }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const val = draft.trim();
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setDraft('');
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Backspace' && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const remove = (tag: string) => onChange(tags.filter(t => t !== tag));

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase text-slate-500 font-bold">{label}</Label>

      {/* Tags row */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-[64px] overflow-y-auto pb-0.5">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                className="ml-0.5 rounded-full hover:opacity-60 transition-opacity"
              >
                <X size={9} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          placeholder={placeholder}
          className="h-8 text-xs pr-8"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
        />
        {tags.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-slate-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
            {tags.length}
          </span>
        )}
      </div>

      <p className="text-[9px] text-slate-400 leading-relaxed">
        {hint ?? 'Press Enter or comma to add · Backspace to remove last'}
      </p>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function DiscoverySidebar() {
  const dispatch     = useDispatch();
  const reduxFilters = useSelector((state: any) => state.intelligenceSearch.filters || {});

  const [local, setLocal] = useState<any>({
    q_keywords:                       '',
    person_titles:                    '',
    person_locations:                 [],   // string[]
    person_seniorities:               [],
    // Apollo has NO organization_names[] API param.
    // Company names are searched via q_keywords (Apollo matches against company name, title, etc.)
    // We use TagInput so users can add multiple company names as discrete tags.
    company_name_tags:                [],   // UI only → merged into q_keywords on submit
    organization_locations:           [],   // string[]
    organization_num_employees_ranges:[],
    revenue_min:                      '',
    revenue_max:                      '',
    technologies:                     '',
    contact_email_status:             [],
    include_similar_titles:           true,
    q_organization_job_titles:        '',
    job_posting_locations:            [],   // string[]
  });

  // Sync Redux → local when filters change externally (e.g. reset)
  useEffect(() => {
    setLocal((prev: any) => ({
      ...prev,
      q_keywords:                       reduxFilters.q_keywords                        || '',
      person_seniorities:               reduxFilters.person_seniorities                || [],
      person_locations:                 reduxFilters.person_locations                  || [],
      organization_locations:           reduxFilters.organization_locations            || [],
      organization_num_employees_ranges:reduxFilters.organization_num_employees_ranges || [],
      contact_email_status:             reduxFilters.contact_email_status              || [],
      job_posting_locations:            reduxFilters.organization_job_locations        || [],
    }));
  }, [reduxFilters]);

  const toArray = (str: string) =>
    str ? str.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

  const toggleArrayItem = (field: string, value: string) =>
    setLocal((prev: any) => {
      const cur = prev[field] || [];
      return {
        ...prev,
        [field]: cur.includes(value)
          ? cur.filter((i: string) => i !== value)
          : [...cur, value],
      };
    });

  // Header badge count
  const activeCount = useMemo(() => {
    let n = 0;
    if (local.q_keywords)                              n++;
    if (local.person_titles)                           n++;
    if (local.person_locations.length)                 n++;
    if (local.person_seniorities.length)               n++;
    if (local.company_name_tags.length)                n++;
    if (local.organization_locations.length)           n++;
    if (local.organization_num_employees_ranges.length)n++;
    if (local.revenue_min || local.revenue_max)        n++;
    if (local.technologies)                            n++;
    if (local.contact_email_status.length)             n++;
    if (local.q_organization_job_titles)               n++;
    if (local.job_posting_locations.length)            n++;
    return n;
  }, [local]);

  // ── Build payload & dispatch ───────────────────────────────────────────────
  const handleRunSearch = () => {
    // Merge free-text keyword + company name tags into a single q_keywords string.
    // Apollo searches q_keywords against name, title, company, bio, etc.
    const keywordParts = [
      local.q_keywords,
      ...local.company_name_tags,          // each company name becomes a keyword term
    ].filter(Boolean);
    const mergedKeywords = keywordParts.join(' ').trim();

    const payload: Record<string, any> = {
      q_keywords:                            mergedKeywords,
      person_titles:                          toArray(local.person_titles),
      person_locations:                       local.person_locations,
      person_seniorities:                     local.person_seniorities,
      organization_locations:                 local.organization_locations,
      organization_num_employees_ranges:      local.organization_num_employees_ranges,
      q_organization_domains_list:            [],
      contact_email_status:                   local.contact_email_status,
      include_similar_titles:                 local.include_similar_titles,
      revenue_range: {
        min: local.revenue_min ? parseInt(local.revenue_min, 10) : undefined,
        max: local.revenue_max ? parseInt(local.revenue_max, 10) : undefined,
      },
      currently_using_any_of_technology_uids: toArray(local.technologies),
      q_organization_job_titles:              toArray(local.q_organization_job_titles),
      organization_job_locations:             local.job_posting_locations,
    };

    dispatch(setFilters(payload));
  };

  const handleReset = () => {
    dispatch(resetFilters());
    setLocal({
      q_keywords: '', person_titles: '', person_locations: [], person_seniorities: [],
      company_name_tags: [], organization_locations: [],
      organization_num_employees_ranges: [],
      revenue_min: '', revenue_max: '', technologies: '',
      contact_email_status: [], include_similar_titles: true,
      q_organization_job_titles: '', job_posting_locations: [],
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 shadow-xl z-30 w-full">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-100 to-white flex flex-col gap-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-black uppercase tracking-widest text-purple-900">
              Search People
            </span>
            {activeCount > 0 && (
              <span className="bg-purple-600 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </div>
          <Button
            variant="ghost" size="sm" onClick={handleReset}
            className="h-6 text-[10px] text-red-500 font-bold hover:bg-red-50"
          >
            <FilterX className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 text-purple-400" size={14} />
          <Input
            placeholder="Search Name or Keywords..."
            className="pl-8 h-9 text-xs border-purple-200 bg-white focus-visible:ring-purple-500"
            value={local.q_keywords}
            onChange={e => setLocal({ ...local, q_keywords: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleRunSearch()}
          />
        </div>

        <Button
          onClick={handleRunSearch} size="sm"
          className="w-full bg-purple-600 hover:bg-purple-700 text-xs font-bold shadow-sm"
        >
          <Play size={10} className="mr-2 fill-current" /> Run Search
        </Button>
      </div>

      {/* ── Accordion Filters ──────────────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        <Accordion
          type="multiple"
          defaultValue={['person', 'location', 'company']}
          className="w-full px-2 py-2"
        >

          {/* 1 ── PROFESSIONAL INFO ──────────────────────────────────────────── */}
          <AccordionItem value="person" className="border-b border-slate-100">
            <AccordionTrigger className="px-3 py-2 text-xs font-bold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Briefcase size={14} className="text-slate-400" /> Professional Info
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 space-y-4 pt-2">

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-slate-500 font-bold">Job Titles</Label>
                <Input
                  placeholder="e.g. CEO, Marketing Manager"
                  className="h-8 text-xs"
                  value={local.person_titles}
                  onChange={e => setLocal({ ...local, person_titles: e.target.value })}
                />
                <p className="text-[9px] text-slate-400">Comma-separated</p>
                <div className="flex items-center space-x-2 pt-0.5">
                  <Checkbox
                    id="similar_titles"
                    checked={local.include_similar_titles}
                    onCheckedChange={c => setLocal({ ...local, include_similar_titles: !!c })}
                  />
                  <label htmlFor="similar_titles" className="text-[10px] text-slate-500">
                    Include similar titles
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase text-slate-500 font-bold">Seniority</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SENIORITIES.map(s => (
                    <div key={s.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sen-${s.id}`}
                        checked={local.person_seniorities.includes(s.id)}
                        onCheckedChange={() => toggleArrayItem('person_seniorities', s.id)}
                      />
                      <label htmlFor={`sen-${s.id}`} className="text-[10px] text-slate-600">
                        {s.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

            </AccordionContent>
          </AccordionItem>

          {/* 2 ── LOCATIONS ──────────────────────────────────────────────────── */}
          <AccordionItem value="location" className="border-b border-slate-100">
            <AccordionTrigger className="px-3 py-2 text-xs font-bold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" />
                Locations
                {(local.person_locations.length + local.organization_locations.length) > 0 && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-purple-100 text-purple-700">
                    {local.person_locations.length + local.organization_locations.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 space-y-5 pt-2">

              <LocationMultiSelect
                label="Person Location"
                placeholder="Search country, state or city…"
                selected={local.person_locations}
                onChange={vals => setLocal({ ...local, person_locations: vals })}
              />

              <LocationMultiSelect
                label="Company HQ Location"
                placeholder="Search country, state or city…"
                selected={local.organization_locations}
                onChange={vals => setLocal({ ...local, organization_locations: vals })}
              />

            </AccordionContent>
          </AccordionItem>

          {/* 3 ── COMPANY INFO ────────────────────────────────────────────────── */}
          <AccordionItem value="company" className="border-b border-slate-100">
            <AccordionTrigger className="px-3 py-2 text-xs font-bold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-slate-400" />
                Company Info
                {local.company_name_tags.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-purple-100 text-purple-700">
                    {local.company_name_tags.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 space-y-4 pt-2">

              {/*
                Apollo's API has NO organization_names[] param.
                Company name is searched via Apollo's q_keywords which searches
                across person name, job title, company name and bio.
                TagInput lets users add multiple company names as discrete search terms.
              */}
              <TagInput
                label="Company Names"
                placeholder="Type a company name & press Enter"
                tags={local.company_name_tags}
                onChange={tags => setLocal({ ...local, company_name_tags: tags })}
                hint="Each name is added as a search keyword · Enter or comma to confirm"
              />

              <div className="space-y-2">
                <Label className="text-[10px] uppercase text-slate-500 font-bold">Employee Count</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {EMP_RANGES.map(r => (
                    <div key={r.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`emp-${r.id}`}
                        checked={local.organization_num_employees_ranges.includes(r.id)}
                        onCheckedChange={() => toggleArrayItem('organization_num_employees_ranges', r.id)}
                      />
                      <label htmlFor={`emp-${r.id}`} className="text-[10px] text-slate-600">
                        {r.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1">
                  <DollarSign size={10} /> Revenue (USD)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Min" type="number" className="h-7 text-xs"
                    value={local.revenue_min}
                    onChange={e => setLocal({ ...local, revenue_min: e.target.value })}
                  />
                  <span className="text-slate-400 text-xs">–</span>
                  <Input
                    placeholder="Max" type="number" className="h-7 text-xs"
                    value={local.revenue_max}
                    onChange={e => setLocal({ ...local, revenue_max: e.target.value })}
                  />
                </div>
              </div>

            </AccordionContent>
          </AccordionItem>

          {/* 4 ── TECHNOLOGIES ────────────────────────────────────────────────── */}
          <AccordionItem value="tech" className="border-b border-slate-100">
            <AccordionTrigger className="px-3 py-2 text-xs font-bold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Laptop size={14} className="text-slate-400" /> Technologies
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-slate-500 font-bold">Using Tech (Any)</Label>
                <Input
                  placeholder="e.g. salesforce, hubspot, aws"
                  className="h-8 text-xs"
                  value={local.technologies}
                  onChange={e => setLocal({ ...local, technologies: e.target.value })}
                />
                <p className="text-[9px] text-slate-400">
                  Comma-separated · use underscores for spaces (e.g. google_analytics)
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 5 ── HIRING INTENT ───────────────────────────────────────────────── */}
          <AccordionItem value="jobs" className="border-b border-slate-100">
            <AccordionTrigger className="px-3 py-2 text-xs font-bold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Briefcase size={14} className="text-slate-400" />
                Hiring Intent
                {local.job_posting_locations.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-purple-100 text-purple-700">
                    {local.job_posting_locations.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 space-y-3 pt-2">

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase text-slate-500 font-bold">Active Job Titles</Label>
                <Input
                  placeholder="e.g. Account Executive"
                  className="h-8 text-xs"
                  value={local.q_organization_job_titles}
                  onChange={e => setLocal({ ...local, q_organization_job_titles: e.target.value })}
                />
                <p className="text-[9px] text-slate-400">Comma-separated</p>
              </div>

              <LocationMultiSelect
                label="Job Location"
                placeholder="Search country, state or city…"
                selected={local.job_posting_locations}
                onChange={vals => setLocal({ ...local, job_posting_locations: vals })}
              />

            </AccordionContent>
          </AccordionItem>

          {/* 6 ── CONTACT INFO ────────────────────────────────────────────────── */}
          <AccordionItem value="email" className="border-b border-slate-100">
            <AccordionTrigger className="px-3 py-2 text-xs font-bold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-slate-400" /> Contact Info
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 space-y-2 pt-2">
              {EMAIL_STATUSES.map(status => (
                <div key={status.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`es-${status.id}`}
                    checked={local.contact_email_status.includes(status.id)}
                    onCheckedChange={() => toggleArrayItem('contact_email_status', status.id)}
                  />
                  <label htmlFor={`es-${status.id}`} className="text-[10px] text-slate-600">
                    {status.label}
                  </label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </ScrollArea>
    </div>
  );
}