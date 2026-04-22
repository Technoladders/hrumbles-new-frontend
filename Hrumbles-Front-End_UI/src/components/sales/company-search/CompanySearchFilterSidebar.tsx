// src/components/sales/company-search/CompanySearchFilterSidebar.tsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Country, State, City } from 'country-state-city';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Building2, MapPin, Users, Factory, DollarSign, Search,
  Loader2, X, FilterX, Sparkles, TrendingUp,
  Code, Calendar, ListFilter, Check, Globe, Play, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ApolloCompanySearchFilters } from '@/services/sales/apolloCompanySearch';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CompanySearchFilterSidebarProps {
  onSearch: (filters: ApolloCompanySearchFilters, summary: string) => void;
  isSearching?: boolean;
  totalResults?: number;
  onClose?: () => void;
  initialFilters?: ApolloCompanySearchFilters;
  onFiltersChange?: (chips: string[], count: number) => void;
}

// ─── Static filter options ────────────────────────────────────────────────────

const EMPLOYEE_COUNT_RANGES = [
  { id: '1,10',       label: '1 – 10'         },
  { id: '11,50',      label: '11 – 50'        },
  { id: '51,200',     label: '51 – 200'       },
  { id: '201,500',    label: '201 – 500'      },
  { id: '501,1000',   label: '501 – 1,000'    },
  { id: '1001,5000',  label: '1,001 – 5,000'  },
  { id: '5001,10000', label: '5,001 – 10,000' },
  { id: '10001,',     label: '10,000+'        },
];

const REVENUE_RANGES = [
  { id: '0,1000000',           label: '< $1M'         },
  { id: '1000000,10000000',    label: '$1M – $10M'    },
  { id: '10000000,50000000',   label: '$10M – $50M'   },
  { id: '50000000,100000000',  label: '$50M – $100M'  },
  { id: '100000000,500000000', label: '$100M – $500M' },
  { id: '500000000,1000000000',label: '$500M – $1B'   },
  { id: '1000000000,',         label: '$1B+'          },
];

const INDUSTRIES = [
  'Information Technology & Services', 'Computer Software', 'Financial Services',
  'Hospital & Health Care', 'Marketing & Advertising', 'Management Consulting',
  'Staffing & Recruiting', 'Human Resources', 'Real Estate', 'Retail',
  'Education Management', 'Accounting', 'Insurance', 'Banking', 'Telecommunications',
  'Construction', 'Manufacturing', 'Automotive', 'Food & Beverages', 'Hospitality',
  'Legal Services', 'Non-Profit', 'Government', 'Entertainment', 'Media Production',
];

const TECHNOLOGY_KEYWORDS = [
  'Salesforce', 'HubSpot', 'AWS', 'Google Cloud', 'Microsoft Azure',
  'Shopify', 'WordPress', 'React', 'Python', 'Java',
  'Kubernetes', 'Docker', 'Slack', 'Zoom', 'SAP',
  'Oracle', 'Zendesk', 'Intercom', 'Stripe', 'Twilio',
];

const FUNDING_STAGES = [
  'Seed', 'Series A', 'Series B', 'Series C', 'Series D',
  'Series E+', 'IPO', 'Private Equity', 'Debt Financing', 'Grant',
];

// ─── Dark theme shared styles ─────────────────────────────────────────────────

const DARK_INPUT = [
  'w-full h-8 text-xs rounded-lg',
  'border border-white/12',
  'placeholder:text-white/35 placeholder:italic placeholder:text-[10px]',
  'focus:outline-none focus:ring-1 focus:ring-indigo-400/50 focus:border-indigo-400/50',
  'transition-all',
].join(' ');

const DARK_INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.75)',
  WebkitTextFillColor: 'rgba(255,255,255,0.75)',
  caretColor: 'rgba(255,255,255,0.75)',
};

// ─── Location helpers ─────────────────────────────────────────────────────────

type LocationType = 'country' | 'state' | 'city';
interface LocationOption { value: string; label: string; type: LocationType; }

const LOC_STYLE: Record<LocationType, { dot: string; chip: string; dropBadge: string; label: string }> = {
  country: {
    dot: 'bg-indigo-400', chip: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30',
    dropBadge: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'Country',
  },
  state: {
    dot: 'bg-violet-400', chip: 'bg-violet-500/20 text-violet-200 border-violet-500/30',
    dropBadge: 'bg-violet-100 text-violet-700 border-violet-200', label: 'State',
  },
  city: {
    dot: 'bg-cyan-400', chip: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/30',
    dropBadge: 'bg-cyan-100 text-cyan-700 border-cyan-200', label: 'City',
  },
};

const ALL_COUNTRIES: LocationOption[] = Country.getAllCountries().map(c => ({
  value: c.name, label: `${c.flag ?? ''} ${c.name}`.trim(), type: 'country',
}));
const ALL_STATES: LocationOption[] = State.getAllStates().map(s => ({
  value: s.name, label: s.name, type: 'state',
}));
const POPULAR = ['United States','United Kingdom','Canada','Australia','India','Germany','France','Singapore','Netherlands','UAE'];

function searchLoc(q: string, selected: string[]): LocationOption[] {
  const lq = q.toLowerCase().trim();
  if (!lq) return ALL_COUNTRIES.filter(c => POPULAR.includes(c.value) && !selected.includes(c.value)).slice(0, 10);
  const out: LocationOption[] = [];
  ALL_COUNTRIES.filter(c => c.value.toLowerCase().includes(lq) && !selected.includes(c.value)).slice(0, 8).forEach(c => out.push(c));
  ALL_STATES.filter(s => s.value.toLowerCase().includes(lq) && !selected.includes(s.value)).slice(0, 8).forEach(s => out.push(s));
  if (lq.length >= 3) City.getAllCities().filter(c => c.name.toLowerCase().includes(lq) && !selected.includes(c.name)).slice(0, 14).forEach(c => out.push({ value: c.name, label: c.name, type: 'city' }));
  return out.slice(0, 30);
}

function getLocType(value: string): LocationType {
  if (ALL_COUNTRIES.some(c => c.value === value)) return 'country';
  if (ALL_STATES.some(s => s.value === value)) return 'state';
  return 'city';
}

// ─── Portal dropdown ──────────────────────────────────────────────────────────

interface PortalProps { anchorRef: React.RefObject<HTMLDivElement>; isOpen: boolean; maxH?: number; children: React.ReactNode; }

function AbovePortal({ anchorRef, isOpen, maxH = 240, children }: PortalProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    const update = () => {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      const w = Math.max(r.width, 220);
      const left = Math.min(r.left, window.innerWidth - w - 8);
      setStyle({ position: 'fixed', bottom: window.innerHeight - r.top + 4, left: Math.max(4, left), width: w, zIndex: 99999, maxHeight: maxH, overflow: 'hidden' });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
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

  const add = (opt: LocationOption) => { onChange([...selected, opt.value]); setQ(''); setOpen(true); inputRef.current?.focus(); };
  const remove = (v: string) => onChange(selected.filter(x => x !== v));

  return (
    <div ref={wrapRef} className="space-y-1.5">
      <p className="text-[9px] uppercase text-white/70 font-semibold tracking-wider">{label}</p>
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
        <Search className="absolute left-2.5 top-2 text-white/40 pointer-events-none" size={11} />
        <input ref={inputRef} placeholder={placeholder} className={cn(DARK_INPUT, 'pl-7 pr-7')} style={DARK_INPUT_STYLE}
          value={q} onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => { setOpen(false); setQ(''); }, 150)} />
        {selected.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-indigo-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">{selected.length}</span>
        )}
        <AbovePortal anchorRef={anchorRef} isOpen={open} maxH={220}>
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex-shrink-0">
            {(Object.entries(LOC_STYLE) as [LocationType, any][]).map(([t, s]) => (
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

// ─── FilterChip ───────────────────────────────────────────────────────────────

function FilterChip({ id, label, checked, onChange }: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className={cn(
      'flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer transition-colors select-none border',
      checked ? 'bg-indigo-500/20 border-indigo-400/35' : 'border-transparent hover:bg-white/5',
    )}>
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded" style={{ accentColor: '#818cf8' }} />
      <span className={cn('text-xs transition-colors', checked ? 'text-indigo-200 font-medium' : 'text-white/55')}>
        {label}
      </span>
    </label>
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

// ─── InlineSearchList ─────────────────────────────────────────────────────────

interface InlineSearchListProps {
  items: string[]; selected: string[]; onToggle: (v: string) => void;
  placeholder: string; chipClass: string; allowCustom?: boolean;
}

function InlineSearchList({ items, selected, onToggle, placeholder, chipClass, allowCustom = false }: InlineSearchListProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() =>
    items.filter(i => i.toLowerCase().includes(query.toLowerCase())).slice(0, 12),
    [items, query],
  );

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setExpanded(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={wrapRef} className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
          {selected.map(val => (
            <span key={val} className={cn('inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer', chipClass)}
              onClick={() => onToggle(val)}>
              <span className="truncate max-w-[90px]">{val.length > 18 ? val.slice(0, 18) + '…' : val}</span>
              <X size={9} />
            </span>
          ))}
        </div>
      )}
      <div ref={anchorRef} className="relative">
        <Search className="absolute left-2.5 top-2 text-white/40 pointer-events-none" size={11} />
        <input placeholder={placeholder} className={cn(DARK_INPUT, 'pl-7 pr-7')} style={DARK_INPUT_STYLE}
          value={query}
          onChange={e => { setQuery(e.target.value); setExpanded(true); }}
          onFocus={() => setExpanded(true)}
          onBlur={() => setTimeout(() => setExpanded(false), 150)} />
        {selected.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-indigo-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">{selected.length}</span>
        )}
      </div>
      {expanded && (
        <div className="border border-white/10 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="max-h-[180px] overflow-y-auto">
            {filtered.length === 0 ? (
              allowCustom && query.trim() ? (
                <button type="button" onMouseDown={e => { e.preventDefault(); onToggle(query.trim()); setQuery(''); }}
                  className="w-full px-3 py-2 text-xs text-indigo-300 hover:bg-white/5 text-left flex items-center gap-2">
                  <Sparkles size={10} className="text-indigo-400" />Add "{query.trim()}"
                </button>
              ) : (
                <p className="px-3 py-2 text-xs text-white/30 italic">No results</p>
              )
            ) : (
              filtered.map(item => (
                <button key={item} type="button" onMouseDown={e => { e.preventDefault(); onToggle(item); }}
                  className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5 transition-colors text-left', selected.includes(item) && 'bg-white/5')}>
                  <Check className={cn('h-3 w-3 flex-shrink-0', selected.includes(item) ? 'text-indigo-400' : 'opacity-0')} />
                  <span className={cn('truncate', selected.includes(item) ? 'text-indigo-200 font-medium' : 'text-white/60')}>{item}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const CompanySearchFilterSidebar: React.FC<CompanySearchFilterSidebarProps> = ({
  onSearch,
  isSearching = false,
  totalResults = 0,
  onClose,
  initialFilters = {},
  onFiltersChange,
}) => {
  const [filters, setFilters] = useState({
    companyName:      initialFilters.q_organization_name                           || '',
    keywords:         initialFilters.q_organization_keyword_tags                    || [] as string[],
    industries:       initialFilters.organization_industries                        || [] as string[],
    locations:        initialFilters.organization_locations                         || [] as string[],
    excludedLocations:(initialFilters as any).organization_not_locations            || [] as string[],
    employeeRanges:   initialFilters.organization_num_employees_ranges
                        ? (initialFilters.organization_num_employees_ranges as any[]).map((r: any) =>
                            typeof r === 'string' ? r : `${r.min ?? 1},${r.max ?? ''}`)
                        : [] as string[],
    revenueRanges:    [] as string[],
    technologies:     initialFilters.currently_using_any_of_technology_uids
                        ? initialFilters.currently_using_any_of_technology_uids.map(t => t.replace(/_/g, ' '))
                        : [] as string[],
    fundingStages:    (initialFilters as any).organization_latest_funding_stage_cd || [] as string[],
    foundedYearMin:   (initialFilters as any).organization_founded_year_range?.min?.toString() || '',
    foundedYearMax:   (initialFilters as any).organization_founded_year_range?.max?.toString() || '',
  });
  const [openSections, setOpen] = useState<string[]>(['company', 'location']);

  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      setFilters(prev => ({
        ...prev,
        companyName: initialFilters.q_organization_name      || prev.companyName,
        keywords:    initialFilters.q_organization_keyword_tags || prev.keywords,
        industries:  initialFilters.organization_industries   || prev.industries,
        locations:   initialFilters.organization_locations    || prev.locations,
      }));
    }
  }, [initialFilters]);

  const toggleArrayItem = useCallback(<K extends keyof typeof filters>(field: K, value: string) => {
    setFilters(prev => {
      const current = prev[field] as string[];
      return { ...prev, [field]: current.includes(value) ? current.filter(i => i !== value) : [...current, value] };
    });
  }, []);

  const onFiltersChangeRef = useRef(onFiltersChange);
  useEffect(() => { onFiltersChangeRef.current = onFiltersChange; }, [onFiltersChange]);

  useEffect(() => {
    const chips: string[] = [];
    if (filters.companyName)              chips.push(filters.companyName);
    filters.keywords.forEach(k           => chips.push(k));
    filters.industries.forEach(v         => chips.push(v));
    filters.locations.forEach(v          => chips.push(v));
    filters.excludedLocations.forEach(v  => chips.push(`⊘ ${v}`));
    filters.employeeRanges.forEach(v     => chips.push(v.replace(',', '–')));
    filters.revenueRanges.forEach(v      => chips.push(v));
    filters.technologies.forEach(v       => chips.push(v));
    filters.fundingStages.forEach(v      => chips.push(v));
    if (filters.foundedYearMin || filters.foundedYearMax)
      chips.push(`Founded: ${filters.foundedYearMin || '?'}–${filters.foundedYearMax || '?'}`);
    if (onFiltersChangeRef.current) onFiltersChangeRef.current(chips, chips.length);
  }, [filters]);

  const buildSearchSummary = useCallback((): string => {
    const parts: string[] = [];
    if (filters.companyName)           parts.push(`"${filters.companyName}"`);
    if (filters.industries.length)     parts.push(filters.industries.join(', '));
    if (filters.locations.length)      parts.push(filters.locations.join(', '));
    if (filters.employeeRanges.length) parts.push(`${filters.employeeRanges.length} size range(s)`);
    if (filters.technologies.length)   parts.push(filters.technologies.join(', '));
    if (filters.keywords.length)       parts.push(filters.keywords.join(', '));
    return parts.join(' · ') || 'Company search';
  }, [filters]);

  const handleSearch = useCallback(() => {
    const apolloFilters: ApolloCompanySearchFilters = {};
    if (filters.companyName.trim())       apolloFilters.q_organization_name           = filters.companyName.trim();
    if (filters.keywords.length)          apolloFilters.q_organization_keyword_tags   = filters.keywords;
    if (filters.industries.length)        apolloFilters.organization_industries       = filters.industries;
    if (filters.locations.length)         apolloFilters.organization_locations        = filters.locations;
    if (filters.excludedLocations.length) (apolloFilters as any).organization_not_locations = filters.excludedLocations;
    if (filters.employeeRanges.length) {
      apolloFilters.organization_num_employees_ranges = filters.employeeRanges.map(r => {
        const [min, max] = r.split(',');
        return { min: parseInt(min) || 1, max: max ? parseInt(max) : undefined };
      });
    }
    if (filters.revenueRanges.length) {
      apolloFilters.revenue_range = { min: null, max: null };
      filters.revenueRanges.forEach(r => {
        const [min, max] = r.split(',').map(v => v ? parseInt(v) : null);
        if (apolloFilters.revenue_range) {
          if (min !== null && (apolloFilters.revenue_range.min === null || min < (apolloFilters.revenue_range.min ?? Infinity)))
            apolloFilters.revenue_range.min = min;
          if (max !== null && (apolloFilters.revenue_range.max === null || max > (apolloFilters.revenue_range.max ?? -Infinity)))
            apolloFilters.revenue_range.max = max;
        }
      });
    }
    if (filters.technologies.length)
      apolloFilters.currently_using_any_of_technology_uids = filters.technologies.map(t => t.toLowerCase().replace(/\s+/g, '_'));
    if (filters.fundingStages.length)
      (apolloFilters as any).organization_latest_funding_stage_cd = filters.fundingStages;
    if (filters.foundedYearMin || filters.foundedYearMax)
      (apolloFilters as any).organization_founded_year_range = {
        min: filters.foundedYearMin ? parseInt(filters.foundedYearMin) : null,
        max: filters.foundedYearMax ? parseInt(filters.foundedYearMax) : null,
      };
    onSearch(apolloFilters, buildSearchSummary());
  }, [filters, onSearch, buildSearchSummary]);

  const handleReset = useCallback(() => {
    setFilters({
      companyName: '', keywords: [], industries: [], locations: [], excludedLocations: [],
      employeeRanges: [], revenueRanges: [], technologies: [], fundingStages: [],
      foundedYearMin: '', foundedYearMax: '',
    });
  }, []);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filters.companyName) n++;
    n += filters.keywords.length + filters.industries.length + filters.locations.length
       + filters.excludedLocations.length + filters.employeeRanges.length
       + filters.revenueRanges.length + filters.technologies.length + filters.fundingStages.length;
    if (filters.foundedYearMin || filters.foundedYearMax) n++;
    return n;
  }, [filters]);

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
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Cloud Search</span>
              {activeFiltersCount > 0 && (
                <span className="text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center bg-indigo-500">{activeFiltersCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {activeFiltersCount > 0 && (
                <button onClick={handleReset} className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                  <FilterX size={10} /> Clear
                </button>
              )}
              {onClose && (
                <button onClick={onClose} className="flex items-center text-white/40 hover:text-white/70 transition-colors p-1">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {[
              { val: totalResults.toLocaleString(), label: 'Results' },
              { val: activeFiltersCount, label: 'Filters Active' },
            ].map(({ val, label }) => (
              <div key={label} className="rounded-lg px-2 py-1.5 text-center" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <div className="text-base font-bold text-white leading-tight">{val}</div>
                <div className="text-[9px] text-indigo-300 uppercase font-semibold mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Company name input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-white/40 pointer-events-none" size={12} />
            <input type="text" placeholder="Company name…"
              className={cn(DARK_INPUT, 'pl-7 pr-3')} style={DARK_INPUT_STYLE}
              value={filters.companyName}
              onChange={e => setFilters(p => ({ ...p, companyName: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>

          {/* Run Search */}
          <button onClick={handleSearch} disabled={isSearching} data-run-search
            className="mt-2 w-full h-9 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #6d5cff 0%, #8b5cf6 50%, #2b18e0 100%)', boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}>
            {isSearching
              ? <><Loader2 size={12} className="animate-spin" />Searching…</>
              : <><Play size={10} className="fill-white" />Search Cloud{activeFiltersCount > 0 && <span className="text-[10px] text-white">· {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''}</span>}</>
            }
          </button>
        </div>

        {/* FILTERS */}
        <ScrollArea className="flex-1 min-h-0">
          <Accordion type="multiple" value={openSections} onValueChange={setOpen} className="w-full px-2 py-1">

            <Section value="location" icon={<MapPin size={12} className="text-pink-400" />} label="Account Location"
              count={filters.locations.length + filters.excludedLocations.length}>
              <div className="pt-1 space-y-3">
                <LocationMultiSelect label="Include Locations" placeholder="Country, state or city…"
                  selected={filters.locations} onChange={v => setFilters(p => ({ ...p, locations: v }))} />
                <LocationMultiSelect label="Exclude Locations" placeholder="Country, state or city…"
                  selected={filters.excludedLocations} onChange={v => setFilters(p => ({ ...p, excludedLocations: v }))} />
              </div>
            </Section>

            <Section value="employees" icon={<Users size={12} className="text-cyan-300" />} label="# Employees" count={filters.employeeRanges.length}>
              <div className="pt-1 grid grid-cols-2 gap-x-1 gap-y-0.5">
                {EMPLOYEE_COUNT_RANGES.map(r => (
                  <FilterChip key={r.id} id={`emp-${r.id}`} label={r.label}
                    checked={filters.employeeRanges.includes(r.id)}
                    onChange={() => toggleArrayItem('employeeRanges', r.id)} />
                ))}
              </div>
            </Section>

            <Section value="industry" icon={<Factory size={12} className="text-emerald-400" />} label="Industry" count={filters.industries.length}>
              <div className="pt-1">
                <InlineSearchList items={INDUSTRIES} selected={filters.industries}
                  onToggle={v => toggleArrayItem('industries', v)}
                  placeholder="Search industries…"
                  chipClass="bg-emerald-500/20 text-emerald-200 border-emerald-500/30" />
              </div>
            </Section>

            <Section value="technologies" icon={<Code size={12} className="text-violet-300" />} label="Technologies" count={filters.technologies.length}>
              <div className="pt-1">
                <InlineSearchList items={TECHNOLOGY_KEYWORDS} selected={filters.technologies}
                  onToggle={v => toggleArrayItem('technologies', v)}
                  placeholder="Search technologies…"
                  chipClass="bg-violet-500/20 text-violet-200 border-violet-500/30"
                  allowCustom />
              </div>
            </Section>

            <Section value="revenue" icon={<DollarSign size={12} className="text-green-400" />} label="Revenue" count={filters.revenueRanges.length}>
              <div className="pt-1 space-y-0.5">
                {REVENUE_RANGES.map(r => (
                  <FilterChip key={r.id} id={`rev-${r.id}`} label={r.label}
                    checked={filters.revenueRanges.includes(r.id)}
                    onChange={() => toggleArrayItem('revenueRanges', r.id)} />
                ))}
              </div>
            </Section>

            <Section value="funding" icon={<TrendingUp size={12} className="text-amber-400" />} label="Funding" count={filters.fundingStages.length}>
              <div className="pt-1 space-y-0.5">
                {FUNDING_STAGES.map(s => (
                  <FilterChip key={s} id={`fund-${s}`} label={s}
                    checked={filters.fundingStages.includes(s)}
                    onChange={() => toggleArrayItem('fundingStages', s)} />
                ))}
              </div>
            </Section>

            <Section value="founded" icon={<Calendar size={12} className="text-blue-300" />} label="Founded Year"
              count={(filters.foundedYearMin || filters.foundedYearMax) ? 1 : 0}>
              <div className="pt-1 flex items-center gap-2">
                <input type="number" placeholder="From" className={cn(DARK_INPUT, 'px-2')} style={DARK_INPUT_STYLE}
                  value={filters.foundedYearMin}
                  onChange={e => setFilters(p => ({ ...p, foundedYearMin: e.target.value }))}
                  min={1900} max={new Date().getFullYear()} />
                <span className="text-white/30 text-xs flex-shrink-0">–</span>
                <input type="number" placeholder="To" className={cn(DARK_INPUT, 'px-2')} style={DARK_INPUT_STYLE}
                  value={filters.foundedYearMax}
                  onChange={e => setFilters(p => ({ ...p, foundedYearMax: e.target.value }))}
                  min={1900} max={new Date().getFullYear()} />
              </div>
            </Section>

          </Accordion>
        </ScrollArea>

        {/* FOOTER */}
        <div className="flex-shrink-0 p-3 border-t border-white/10 bg-white/5 backdrop-blur-md">
          <button onClick={handleSearch} disabled={isSearching} data-run-search
            className="w-full h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{
              background: activeFiltersCount > 0
                ? 'linear-gradient(135deg, #6d5cff 0%, #8b5cf6 50%, #2b18e0 100%)'
                : 'rgba(255,255,255,0.08)',
              color: activeFiltersCount > 0 ? '#fff' : 'rgba(255,255,255,0.4)',
            }}>
            {isSearching
              ? <><Loader2 size={12} className="animate-spin" />Searching…</>
              : <><Play size={10} className={activeFiltersCount > 0 ? 'fill-white' : ''} />
                  {activeFiltersCount > 0 ? `Search · ${activeFiltersCount} filter${activeFiltersCount !== 1 ? 's' : ''}` : 'Run Search'}</>
            }
          </button>
          <p className="text-[10px] text-white/30 text-center mt-2 flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3" />No credits consumed for search
          </p>
        </div>

      </div>
    </div>
  );
};

export default CompanySearchFilterSidebar;