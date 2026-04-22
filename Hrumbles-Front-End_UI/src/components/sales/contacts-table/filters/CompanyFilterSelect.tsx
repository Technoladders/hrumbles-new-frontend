// src/components/sales/contacts-table/filters/CompanyFilterSelect.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Building2, Search, X, Check, Loader2, Globe, MinusCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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

interface Company { id: number; name: string; logo_url?: string | null; domain?: string | null; }

interface CompanyFilterSelectProps {
  selectedCompanyIds:  number[];
  onSelectionChange:   (ids: number[]) => void;
  excludeCompanyIds?:  number[];
  onExcludeChange?:    (ids: number[]) => void;
}

// ─── Portal dropdown ──────────────────────────────────────────────────────────

interface PortalDropdownProps { anchorRef: React.RefObject<HTMLDivElement>; isOpen: boolean; children: React.ReactNode; }

function PortalDropdown({ anchorRef, isOpen, children }: PortalDropdownProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    const update = () => {
      const r = anchorRef.current!.getBoundingClientRect();
      setStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, width: r.width, zIndex: 99999 });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [isOpen, anchorRef]);
  if (!isOpen) return null;
  return ReactDOM.createPortal(
    <div style={{ ...style, background: 'rgba(15,12,40,0.97)', backdropFilter: 'blur(16px)' }}
      className="border border-white/15 rounded-xl shadow-2xl overflow-hidden">
      {children}
    </div>,
    document.body,
  );
}

// ─── CompanyChip ──────────────────────────────────────────────────────────────

function CompanyChip({ company, onRemove, variant = 'include' }: {
  company: Company; onRemove: () => void; variant?: 'include' | 'exclude';
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 pl-1 pr-1 py-0.5 rounded-full text-[10px] font-medium border',
      variant === 'include'
        ? 'bg-violet-500/20 text-violet-200 border-violet-500/30'
        : 'bg-red-500/20 text-red-200 border-red-500/30',
    )}>
      {company.logo_url ? (
        <img src={company.logo_url} alt="" className="w-3.5 h-3.5 rounded object-cover" />
      ) : (
        <div className={cn('w-3.5 h-3.5 rounded flex items-center justify-center',
          variant === 'include' ? 'bg-violet-500/30' : 'bg-red-500/30')}>
          <Building2 size={8} className={variant === 'include' ? 'text-violet-300' : 'text-red-300'} />
        </div>
      )}
      <span className="truncate max-w-[90px]">{company.name}</span>
      <button onClick={onRemove} className="hover:opacity-60 transition-opacity rounded-full"><X size={9} /></button>
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const CompanyFilterSelect: React.FC<CompanyFilterSelectProps> = ({
  selectedCompanyIds = [],
  onSelectionChange,
  excludeCompanyIds  = [],
  onExcludeChange    = () => {},
}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [tab,    setTab]    = useState<'include' | 'exclude'>('include');
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const anchorRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) { setIsOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies-filter', organization_id, search],
    queryFn: async () => {
      let q = supabase.from('companies').select('id, name, logo_url, domain')
        .eq('organization_id', organization_id).order('name').limit(50);
      if (search.trim()) q = q.or(`name.ilike.%${search}%,domain.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as Company[];
    },
    enabled: !!organization_id,
    staleTime: 15_000,
  });

  const allSelectedIds = [...new Set([...selectedCompanyIds, ...excludeCompanyIds])];
  const { data: selectedDetails = [] } = useQuery({
    queryKey: ['companies-selected', allSelectedIds],
    queryFn: async () => {
      if (!allSelectedIds.length) return [];
      const { data, error } = await supabase.from('companies').select('id, name, logo_url, domain').in('id', allSelectedIds);
      if (error) throw error;
      return data as Company[];
    },
    enabled: allSelectedIds.length > 0,
  });

  const getCompany = (id: number) => selectedDetails.find(c => c.id === id);
  const toggleId = (id: number, list: number[], setList: (l: number[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };
  const activeIds = tab === 'include' ? selectedCompanyIds : excludeCompanyIds;
  const setActive = tab === 'include' ? onSelectionChange  : onExcludeChange;
  const hasIncludes = selectedCompanyIds.length > 0;
  const hasExcludes = excludeCompanyIds.length > 0;

  return (
    <div ref={wrapperRef} className="space-y-2.5 pt-1">

      {/* Tab toggle */}
      <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
        {(['include','exclude'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-1 text-[10px] font-semibold rounded-md transition-all capitalize flex items-center justify-center gap-1',
              tab === t
                ? t === 'include'
                  ? 'text-violet-200 shadow-sm'
                  : 'text-red-300 shadow-sm'
                : 'text-white/35 hover:text-white/60',
            )}
            style={tab === t ? { background: 'rgba(255,255,255,0.1)' } : undefined}>
            {t === 'exclude' && <MinusCircle size={10} />}
            {t === 'include' ? 'Include' : 'Exclude'}
            {t === 'include' && hasIncludes && (
              <span className="bg-violet-500/30 text-violet-200 text-[9px] rounded-full px-1.5">{selectedCompanyIds.length}</span>
            )}
            {t === 'exclude' && hasExcludes && (
              <span className="bg-red-500/30 text-red-200 text-[9px] rounded-full px-1.5">{excludeCompanyIds.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div ref={anchorRef} className="relative">
        <Search className="absolute left-2.5 top-2 text-white/40 pointer-events-none" size={11} />
        <input ref={inputRef}
          placeholder={tab === 'include' ? 'Search companies to include…' : 'Search companies to exclude…'}
          className={cn(DARK_INPUT, 'pl-7 pr-7')} style={DARK_INPUT_STYLE}
          value={search}
          onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)} />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-2 text-white/40 hover:text-white/70"><X size={11} /></button>
        )}

        <PortalDropdown anchorRef={anchorRef} isOpen={isOpen}>
          <ScrollArea className="max-h-[220px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-5 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                <span className="text-xs text-white/40">Searching…</span>
              </div>
            ) : companies.length === 0 ? (
              <div className="py-5 text-center">
                <Building2 className="h-7 w-7 text-white/20 mx-auto mb-1.5" />
                <p className="text-xs text-white/35">{search ? 'No companies found' : 'Type to search'}</p>
              </div>
            ) : (
              <div className="py-1">
                {companies.map(co => {
                  const isSelected = activeIds.includes(co.id);
                  return (
                    <button key={co.id}
                      onMouseDown={e => { e.preventDefault(); toggleId(co.id, activeIds, setActive); }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left',
                        isSelected
                          ? tab === 'include' ? 'bg-violet-500/15' : 'bg-red-500/15'
                          : 'hover:bg-white/5',
                      )}>
                      {co.logo_url ? (
                        <img src={co.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <Building2 size={12} className="text-white/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/75 truncate">{co.name}</p>
                        {co.domain && (
                          <p className="text-[10px] text-white/35 truncate flex items-center gap-0.5">
                            <Globe size={8} />{co.domain}
                          </p>
                        )}
                      </div>
                      <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        isSelected
                          ? tab === 'include' ? 'bg-violet-500 border-violet-500' : 'bg-red-500 border-red-500'
                          : 'border-white/20')}>
                        {isSelected && <Check size={9} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </PortalDropdown>
      </div>

      {/* Selected chips */}
      {(hasIncludes || hasExcludes) && (
        <div className="flex flex-wrap gap-1">
          {selectedCompanyIds.map(id => {
            const co = getCompany(id);
            if (!co) return null;
            return <CompanyChip key={`inc-${id}`} company={co} variant="include" onRemove={() => onSelectionChange(selectedCompanyIds.filter(x => x !== id))} />;
          })}
          {excludeCompanyIds.map(id => {
            const co = getCompany(id);
            if (!co) return null;
            return <CompanyChip key={`exc-${id}`} company={co} variant="exclude" onRemove={() => onExcludeChange(excludeCompanyIds.filter(x => x !== id))} />;
          })}
          {(selectedCompanyIds.length + excludeCompanyIds.length) > 1 && (
            <button onClick={() => { onSelectionChange([]); onExcludeChange([]); }}
              className="text-[10px] text-red-400 hover:text-red-300 font-medium px-1 self-center">Clear all</button>
          )}
        </div>
      )}
    </div>
  );
};