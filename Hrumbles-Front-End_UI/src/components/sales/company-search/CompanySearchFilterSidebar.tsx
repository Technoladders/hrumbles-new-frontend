// src/components/sales/company-search/CompanySearchFilterSidebar.tsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Country, State, City } from 'country-state-city';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Building2, MapPin, Users, Factory, DollarSign, Search,
  Loader2, X, FilterX, Sparkles, TrendingUp,
  Code, Calendar, ListFilter, Check, ChevronsUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { type ApolloCompanySearchFilters } from '@/services/sales/apolloCompanySearch';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CompanySearchFilterSidebarProps {
  onSearch: (filters: ApolloCompanySearchFilters) => void;
  isSearching?: boolean;
  totalResults?: number;
  onClose?: () => void;
  initialFilters?: ApolloCompanySearchFilters;
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
  { id: '0,1000000',           label: '< $1M'          },
  { id: '1000000,10000000',    label: '$1M – $10M'     },
  { id: '10000000,50000000',   label: '$10M – $50M'    },
  { id: '50000000,100000000',  label: '$50M – $100M'   },
  { id: '100000000,500000000', label: '$100M – $500M'  },
  { id: '500000000,1000000000',label: '$500M – $1B'    },
  { id: '1000000000,',         label: '$1B+'           },
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

// ─── Location helpers (shared with DiscoverySidebar) ─────────────────────────

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
    badge: 'bg-violet-50  text-violet-700  border-violet-200',
    dot:   'bg-violet-400',
    tag:   'bg-violet-100 text-violet-800  border-violet-200',
    label: 'State',
  },
  city: {
    badge: 'bg-emerald-50  text-emerald-700  border-emerald-200',
    dot:   'bg-emerald-400',
    tag:   'bg-emerald-100 text-emerald-800  border-emerald-200',
    label: 'City',
  },
};

// Pre-load countries + states once (fast)
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

const POPULAR_COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'India',
  'Germany', 'France', 'Singapore', 'Netherlands', 'UAE',
];

function searchLocations(query: string, selected: string[]): LocationOption[] {
  const q = query.toLowerCase().trim();

  if (!q) {
    return ALL_COUNTRIES
      .filter(c => POPULAR_COUNTRIES.includes(c.value) && !selected.includes(c.value))
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

// ─── PortalDropdown ───────────────────────────────────────────────────────────
// Rendered at document.body — escapes all overflow:hidden / z-index stacking
// (ScrollArea, AccordionContent, Radix Popover, etc.)

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
      setPos({ position: 'fixed', top: r.bottom + 4, left: r.left, width: r.width, zIndex: 99999 });
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
    <div style={pos} className="bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden">
      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 border-b border-slate-100">
        {(Object.entries(LOC_STYLE) as [LocationType, typeof LOC_STYLE[LocationType]][]).map(([t, s]) => (
          <span key={t} className="flex items-center gap-1 text-[9px] text-slate-500 font-medium">
            <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
            {s.label}
          </span>
        ))}
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
                  onMouseDown={e => { e.preventDefault(); onSelect(opt); }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
                    <span className="text-[11px] text-slate-700 font-medium truncate">{opt.label}</span>
                  </span>
                  <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ml-2', s.badge)}>
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

  const wrapperRef = useRef<HTMLDivElement>(null); // outside-click detection
  const anchorRef  = useRef<HTMLDivElement>(null); // portal positioning
  const inputRef   = useRef<HTMLInputElement>(null);

  const options = useMemo(() => searchLocations(query, selected), [query, selected]);

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
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const remove = (value: string) => onChange(selected.filter(v => v !== value));

  return (
    <div ref={wrapperRef} className="space-y-1.5">
      <Label className="text-[10px] uppercase text-slate-500 font-semibold">{label}</Label>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-[64px] overflow-y-auto pb-0.5">
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

      {/* Input + portal anchor */}
      <div className="relative" ref={anchorRef}>
        <Search className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" size={12} />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          className="pl-7 h-8 text-xs pr-8"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => { setIsOpen(false); setQuery(''); }, 150)}
        />
        {selected.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-rose-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
            {selected.length}
          </span>
        )}
        <PortalDropdown
          anchorRef={anchorRef}
          isOpen={isOpen}
          options={options}
          query={query}
          onSelect={add}
        />
      </div>

      {!query && selected.length === 0 && (
        <p className="text-[9px] text-slate-400">Search any country, state / province or city</p>
      )}
    </div>
  );
}

// ─── FilterCheckbox ───────────────────────────────────────────────────────────

interface FilterCheckboxProps {
  id:       string;
  label:    string;
  checked:  boolean;
  onChange: () => void;
}

const FilterCheckbox: React.FC<FilterCheckboxProps> = ({ id, label, checked, onChange }) => (
  <div className="flex items-center space-x-2 py-1 px-1.5 hover:bg-slate-50 rounded transition-colors">
    <Checkbox id={id} checked={checked} onCheckedChange={onChange} className="h-3.5 w-3.5" />
    <label
      htmlFor={id}
      className={cn('text-xs cursor-pointer transition-colors flex-1', checked ? 'text-slate-900 font-medium' : 'text-slate-600')}
    >
      {label}
    </label>
  </div>
);

// ─── InlineSearchList (for Industry & Technology) ────────────────────────────
// Replaces the Radix Popover+Command combo — inline expandable list with search

interface InlineSearchListProps {
  label:       string;
  icon:        React.ReactNode;
  items:       string[];
  selected:    string[];
  onToggle:    (value: string) => void;
  placeholder: string;
  badgeClass:  string;
  tagClass:    string;
  allowCustom?: boolean;
}

function InlineSearchList({
  label, icon, items, selected, onToggle, placeholder,
  badgeClass, tagClass, allowCustom = false,
}: InlineSearchListProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() =>
    items.filter(i => i.toLowerCase().includes(query.toLowerCase())).slice(0, 12),
    [items, query],
  );

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(val => (
            <span
              key={val}
              className={cn('inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer', tagClass)}
              onClick={() => onToggle(val)}
            >
              {val.length > 18 ? val.slice(0, 18) + '…' : val}
              <X size={9} />
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" size={12} />
        <Input
          placeholder={placeholder}
          className="pl-7 h-8 text-xs"
          value={query}
          onChange={e => { setQuery(e.target.value); setExpanded(true); }}
          onFocus={() => setExpanded(true)}
          onBlur={() => setTimeout(() => setExpanded(false), 150)}
        />
        {selected.length > 0 && (
          <span className={cn('absolute right-2 top-1.5 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none', badgeClass.includes('emerald') ? 'bg-emerald-500' : 'bg-violet-500')}>
            {selected.length}
          </span>
        )}
      </div>

      {/* Inline dropdown list */}
      {expanded && (
        <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
          <div className="max-h-[180px] overflow-y-auto">
            {filtered.length === 0 ? (
              allowCustom && query.trim() ? (
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); onToggle(query.trim()); setQuery(''); }}
                  className="w-full px-3 py-2 text-xs text-purple-600 hover:bg-purple-50 text-left"
                >
                  Add "{query.trim()}"
                </button>
              ) : (
                <p className="px-3 py-2 text-xs text-slate-400 italic">No results</p>
              )
            ) : (
              filtered.map(item => (
                <button
                  key={item}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); onToggle(item); }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors text-left',
                    selected.includes(item) && 'bg-slate-50 font-medium',
                  )}
                >
                  <Check className={cn('h-3 w-3 flex-shrink-0', selected.includes(item) ? 'text-purple-600' : 'opacity-0')} />
                  <span className="truncate">{item}</span>
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

  // Sync initialFilters when they change (browser back/forward)
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
      return {
        ...prev,
        [field]: current.includes(value) ? current.filter(i => i !== value) : [...current, value],
      };
    });
  }, []);

  // ── Build Apollo payload ────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const apolloFilters: ApolloCompanySearchFilters = {};

    if (filters.companyName.trim())         apolloFilters.q_organization_name           = filters.companyName.trim();
    if (filters.keywords.length)            apolloFilters.q_organization_keyword_tags   = filters.keywords;
    if (filters.industries.length)          apolloFilters.organization_industries       = filters.industries;
    if (filters.locations.length)           apolloFilters.organization_locations        = filters.locations;
    if (filters.excludedLocations.length)   (apolloFilters as any).organization_not_locations = filters.excludedLocations;

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

    onSearch(apolloFilters);
  }, [filters, onSearch]);

  const handleReset = useCallback(() => {
    setFilters({
      companyName: '', keywords: [], industries: [], locations: [], excludedLocations: [],
      employeeRanges: [], revenueRanges: [], technologies: [], fundingStages: [],
      foundedYearMin: '', foundedYearMax: '',
    });
  }, []);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filters.companyName)         n++;
    n += filters.keywords.length + filters.industries.length + filters.locations.length
       + filters.excludedLocations.length + filters.employeeRanges.length
       + filters.revenueRanges.length + filters.technologies.length + filters.fundingStages.length;
    if (filters.foundedYearMin || filters.foundedYearMax) n++;
    return n;
  }, [filters]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50/80 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-700">Cloud Search</span>
            {activeFiltersCount > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-purple-600 text-white">{activeFiltersCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {activeFiltersCount > 0 && (
              <Button onClick={handleReset} variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50">
                <FilterX className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
            {onClose && (
              <Button onClick={onClose} variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-purple-900">{totalResults.toLocaleString()}</div>
              <div className="text-[9px] text-purple-600 uppercase font-semibold">Results</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-900">{activeFiltersCount}</div>
              <div className="text-[9px] text-purple-600 uppercase font-semibold">Filters Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable Filters ──────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={['company', 'location']} className="w-full px-3 py-2">

          {/* 1 ── COMPANY ──────────────────────────────────────────────────── */}
          <AccordionItem value="company" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-purple-500" /> Company
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1 space-y-3">
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-semibold">Company Name</Label>
                <Input
                  placeholder="Search by name..."
                  className="mt-1 h-8 text-xs"
                  value={filters.companyName}
                  onChange={e => setFilters(prev => ({ ...prev, companyName: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-slate-500 font-semibold">Keywords</Label>
                <Input
                  placeholder="e.g. AI, SaaS, Fintech (comma-separated)"
                  className="mt-1 h-8 text-xs"
                  value={filters.keywords.join(', ')}
                  onChange={e => setFilters(prev => ({
                    ...prev,
                    keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean),
                  }))}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2 ── LOCATION ─────────────────────────────────────────────────── */}
          <AccordionItem value="location" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-rose-500" /> Account Location
                </div>
                {(filters.locations.length + filters.excludedLocations.length) > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-rose-100 text-rose-700">
                    {filters.locations.length + filters.excludedLocations.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1 space-y-4">

              <LocationMultiSelect
                label="Include Locations"
                placeholder="Search country, state or city…"
                selected={filters.locations}
                onChange={vals => setFilters(prev => ({ ...prev, locations: vals }))}
              />

              <LocationMultiSelect
                label="Exclude Locations"
                placeholder="Search country, state or city…"
                selected={filters.excludedLocations}
                onChange={vals => setFilters(prev => ({ ...prev, excludedLocations: vals }))}
              />

            </AccordionContent>
          </AccordionItem>

          {/* 3 ── EMPLOYEES ────────────────────────────────────────────────── */}
          <AccordionItem value="employees" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-cyan-500" /> # Employees
                </div>
                {filters.employeeRanges.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-cyan-100 text-cyan-700">{filters.employeeRanges.length}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {EMPLOYEE_COUNT_RANGES.map(range => (
                  <FilterCheckbox
                    key={range.id}
                    id={`emp-${range.id}`}
                    label={range.label}
                    checked={filters.employeeRanges.includes(range.id)}
                    onChange={() => toggleArrayItem('employeeRanges', range.id)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 4 ── INDUSTRY ─────────────────────────────────────────────────── */}
          <AccordionItem value="industry" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Factory size={14} className="text-emerald-500" /> Industry
                </div>
                {filters.industries.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-emerald-100 text-emerald-700">{filters.industries.length}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <InlineSearchList
                label="Industry"
                icon={<Factory size={12} />}
                items={INDUSTRIES}
                selected={filters.industries}
                onToggle={v => toggleArrayItem('industries', v)}
                placeholder="Search industries…"
                badgeClass="bg-emerald-100 text-emerald-700 border-emerald-200"
                tagClass="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              />
            </AccordionContent>
          </AccordionItem>

          {/* 5 ── TECHNOLOGIES ─────────────────────────────────────────────── */}
          <AccordionItem value="technologies" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Code size={14} className="text-violet-500" /> Technologies
                </div>
                {filters.technologies.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-violet-100 text-violet-700">{filters.technologies.length}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <InlineSearchList
                label="Technology"
                icon={<Code size={12} />}
                items={TECHNOLOGY_KEYWORDS}
                selected={filters.technologies}
                onToggle={v => toggleArrayItem('technologies', v)}
                placeholder="Search technologies…"
                badgeClass="bg-violet-100 text-violet-700 border-violet-200"
                tagClass="bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
                allowCustom
              />
            </AccordionContent>
          </AccordionItem>

          {/* 6 ── REVENUE ──────────────────────────────────────────────────── */}
          <AccordionItem value="revenue" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-green-500" /> Revenue
                </div>
                {filters.revenueRanges.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-green-100 text-green-700">{filters.revenueRanges.length}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <div className="space-y-0.5">
                {REVENUE_RANGES.map(range => (
                  <FilterCheckbox
                    key={range.id}
                    id={`rev-${range.id}`}
                    label={range.label}
                    checked={filters.revenueRanges.includes(range.id)}
                    onChange={() => toggleArrayItem('revenueRanges', range.id)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 7 ── FUNDING ──────────────────────────────────────────────────── */}
          <AccordionItem value="funding" className="border-b border-slate-100">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-amber-500" /> Funding
                </div>
                {filters.fundingStages.length > 0 && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-amber-100 text-amber-700">{filters.fundingStages.length}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {FUNDING_STAGES.map(stage => (
                  <FilterCheckbox
                    key={stage}
                    id={`fund-${stage}`}
                    label={stage}
                    checked={filters.fundingStages.includes(stage)}
                    onChange={() => toggleArrayItem('fundingStages', stage)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 8 ── FOUNDED YEAR ─────────────────────────────────────────────── */}
          <AccordionItem value="founded" className="border-b-0">
            <AccordionTrigger className="px-2 py-2.5 text-xs font-semibold text-slate-700 hover:no-underline hover:bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-blue-500" /> Founded Year
                </div>
                {(filters.foundedYearMin || filters.foundedYearMax) && (
                  <Badge className="h-4 px-1.5 text-[9px] bg-blue-100 text-blue-700">1</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 pt-1">
              <div className="flex items-center gap-2">
                <Input
                  type="number" placeholder="From" className="h-8 text-xs"
                  value={filters.foundedYearMin}
                  onChange={e => setFilters(prev => ({ ...prev, foundedYearMin: e.target.value }))}
                  min={1900} max={new Date().getFullYear()}
                />
                <span className="text-slate-400 text-xs">–</span>
                <Input
                  type="number" placeholder="To" className="h-8 text-xs"
                  value={filters.foundedYearMax}
                  onChange={e => setFilters(prev => ({ ...prev, foundedYearMax: e.target.value }))}
                  min={1900} max={new Date().getFullYear()}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </ScrollArea>

      {/* ── Search Button ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 p-3 border-t border-slate-200 bg-slate-50">
        <Button
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full h-9 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md"
        >
          {isSearching ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Searching...</>
          ) : (
            <><Search className="h-4 w-4 mr-2" />Search Cloud</>
          )}
        </Button>
        <p className="text-[10px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3" />No credits consumed for search
        </p>
      </div>
    </div>
  );
};

export default CompanySearchFilterSidebar;