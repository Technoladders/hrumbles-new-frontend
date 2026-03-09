// src/components/sales/contacts-v2/filters/LocationFilter.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Search, X } from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import { cn } from '@/lib/utils';

type LocType = 'country' | 'state' | 'city';

interface LocOption {
  value: string;
  label: string;
  type: LocType;
}

const STYLE: Record<LocType, { dot: string; tag: string }> = {
  country: { dot: 'bg-sky-400', tag: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  state: { dot: 'bg-violet-400', tag: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  city: { dot: 'bg-emerald-400', tag: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
};

const POPULAR = ['United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Germany', 'Singapore'];

const ALL_COUNTRIES: LocOption[] = Country.getAllCountries().map(c => ({
  value: c.name,
  label: `${c.flag ?? ''} ${c.name}`.trim(),
  type: 'country',
}));

const ALL_STATES: LocOption[] = State.getAllStates().map(s => ({
  value: s.name, label: s.name, type: 'state',
}));

function search(q: string, selected: string[]): LocOption[] {
  const lower = q.toLowerCase().trim();
  if (!lower) {
    return ALL_COUNTRIES
      .filter(c => POPULAR.includes(c.value) && !selected.includes(c.value))
      .slice(0, 8);
  }
  const out: LocOption[] = [];
  ALL_COUNTRIES.filter(c => c.value.toLowerCase().includes(lower) && !selected.includes(c.value)).slice(0, 6).forEach(c => out.push(c));
  ALL_STATES.filter(s => s.value.toLowerCase().includes(lower) && !selected.includes(s.value)).slice(0, 6).forEach(s => out.push(s));
  if (lower.length >= 3) {
    City.getAllCities()
      .filter(c => c.name.toLowerCase().includes(lower) && !selected.includes(c.name))
      .slice(0, 10)
      .forEach(c => out.push({ value: c.name, label: c.name, type: 'city' }));
  }
  return out.slice(0, 25);
}

function getType(v: string): LocType {
  if (ALL_COUNTRIES.some(c => c.value === v)) return 'country';
  if (ALL_STATES.some(s => s.value === v)) return 'state';
  return 'city';
}

// ─── Portal Dropdown ──────────────────────────────────────────────────────────

function PortalDropdown({
  anchorRef, isOpen, options, query, onSelect,
}: {
  anchorRef: React.RefObject<HTMLDivElement>;
  isOpen: boolean;
  options: LocOption[];
  query: string;
  onSelect: (opt: LocOption) => void;
}) {
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
    <div
      style={pos}
      className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden"
    >
      <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-800/60 border-b border-slate-700/50">
        {(['country', 'state', 'city'] as LocType[]).map(t => (
          <span key={t} className="flex items-center gap-1 text-[9px] text-slate-400 font-medium">
            <span className={cn('w-1.5 h-1.5 rounded-full', STYLE[t].dot)} />
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </span>
        ))}
      </div>
      <div className="max-h-[200px] overflow-y-auto overscroll-contain">
        {options.length === 0 ? (
          <p className="px-3 py-3 text-[11px] text-slate-500 italic text-center">
            {query.length > 0 && query.length < 3 ? 'Type 3+ chars to search cities' : 'No matches'}
          </p>
        ) : (
          <div className="py-1">
            {options.map((opt, i) => (
              <button
                key={`${opt.type}-${opt.value}-${i}`}
                type="button"
                onMouseDown={e => { e.preventDefault(); onSelect(opt); }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 transition-colors text-left"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STYLE[opt.type].dot)} />
                  <span className="text-[11px] text-slate-300 truncate">{opt.label}</span>
                </span>
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border flex-shrink-0 ml-2', STYLE[opt.type].tag)}>
                  {opt.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ─── Main LocationFilter component ───────────────────────────────────────────

interface LocationFilterProps {
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function LocationFilter({
  selected,
  onChange,
  placeholder = 'Search country, state, city…',
}: LocationFilterProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => search(query, selected), [query, selected]);

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

  const add = (opt: LocOption) => {
    onChange([...selected, opt.value]);
    setQuery('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const remove = (v: string) => onChange(selected.filter(s => s !== v));

  return (
    <div ref={wrapperRef} className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(val => {
            const t = getType(val);
            return (
              <span key={val} className={cn('inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium border', STYLE[t].tag)}>
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STYLE[t].dot)} />
                {val}
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); remove(val); }}
                  className="ml-0.5 hover:opacity-60 transition-opacity"
                >
                  <X size={8} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="relative" ref={anchorRef}>
        <Search className="absolute left-2.5 top-2 text-slate-500 pointer-events-none" size={12} />
        <input
          ref={inputRef}
          placeholder={placeholder}
          className="w-full pl-7 pr-3 h-8 text-xs bg-slate-800/60 border border-slate-700 rounded-md text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => { setTimeout(() => { setIsOpen(false); setQuery(''); }, 150); }}
        />
        <PortalDropdown
          anchorRef={anchorRef}
          isOpen={isOpen}
          options={options}
          query={query}
          onSelect={add}
        />
      </div>
    </div>
  );
}