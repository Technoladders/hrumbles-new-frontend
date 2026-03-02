// src/components/sales/company-search/filters/CompanyLocationFilterSelect.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Country, State, City } from 'country-state-city';
import { Search, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
    badge: 'bg-violet-50  text-violet-700  border-violet-200',
    dot:   'bg-violet-400',
    tag:   'bg-violet-100 text-violet-800  border-violet-200',
    label: 'State',
  },
  city: {
    badge: 'bg-rose-50   text-rose-700   border-rose-200',
    dot:   'bg-rose-400',
    tag:   'bg-rose-100  text-rose-800   border-rose-200',
    label: 'City',
  },
};

// ─── Pre-load countries + states once (fast) ─────────────────────────────────

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

  // Cities are expensive — only scan with 3+ chars
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
// Rendered at document.body — escapes ScrollArea / AccordionContent overflow

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

// ─── Main Component ───────────────────────────────────────────────────────────

interface CompanyLocationFilterSelectProps {
  selectedLocations: string[];
  onSelectionChange: (locations: string[]) => void;
  /** kept for API compatibility but no longer affects behaviour */
  type?: 'country' | 'city' | 'location';
  fileId?: string | null;
}

export const CompanyLocationFilterSelect: React.FC<CompanyLocationFilterSelectProps> = ({
  selectedLocations,
  onSelectionChange,
}) => {
  const [query,  setQuery]  = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null); // outside-click detection
  const anchorRef  = useRef<HTMLDivElement>(null); // portal positioning
  const inputRef   = useRef<HTMLInputElement>(null);

  const options = useMemo(() => searchLocations(query, selectedLocations), [query, selectedLocations]);

  // Close on outside click
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
    onSelectionChange([...selectedLocations, opt.value]);
    setQuery('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const remove = (value: string) =>
    onSelectionChange(selectedLocations.filter(v => v !== value));

  const clearAll = () => {
    onSelectionChange([]);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="space-y-2">

      {/* Selected tags */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-[68px] overflow-y-auto pb-0.5">
          {selectedLocations.map(val => {
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
                <span className="truncate max-w-[90px]">{val}</span>
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
          {selectedLocations.length > 1 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] text-red-500 hover:text-red-700 font-medium self-center ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Input + portal anchor */}
      <div className="relative" ref={anchorRef}>
        <Search className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" size={12} />
        <Input
          ref={inputRef}
          placeholder="Search country, state or city…"
          className="pl-7 h-8 text-xs border-slate-200 pr-8"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => { setIsOpen(false); setQuery(''); }, 150)}
        />
        {selectedLocations.length > 0 && (
          <span className="absolute right-2 top-1.5 bg-rose-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
            {selectedLocations.length}
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

      {!query && selectedLocations.length === 0 && (
        <p className="text-[9px] text-slate-400">Search any country, state / province or city</p>
      )}
    </div>
  );
};

export default CompanyLocationFilterSelect;