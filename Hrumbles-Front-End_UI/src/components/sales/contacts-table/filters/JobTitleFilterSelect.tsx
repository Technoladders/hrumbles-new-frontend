// src/components/sales/contacts-table/filters/JobTitleFilterSelect.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Briefcase, Search, X, MinusCircle, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ── Above-opening portal (avoids sidebar bottom clip) ────────────────────────
interface AbovePortalProps {
  anchorRef: React.RefObject<HTMLDivElement>;
  isOpen:    boolean;
  children:  React.ReactNode;
  maxH?:     number;
}
function AbovePortal({ anchorRef, isOpen, children, maxH = 220 }: AbovePortalProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    let rafId: number;
    const update = () => {
      rafId = requestAnimationFrame(() => {
        if (!anchorRef.current) return;
        const r = anchorRef.current.getBoundingClientRect();
        const desiredWidth = Math.max(r.width, 200);
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

// ── Tag chip ─────────────────────────────────────────────────────────────────
function TitleTag({ label, variant, onRemove }: {
  label: string; variant: 'include' | 'exclude'; onRemove: () => void;
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium border',
      variant === 'include'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-red-50 text-red-700 border-red-200',
    )}>
      <Briefcase size={8} className={variant === 'include' ? 'text-blue-400' : 'text-red-400'} />
      <span className="truncate max-w-[100px]">{label}</span>
      <button onMouseDown={e => { e.preventDefault(); onRemove(); }} className="hover:opacity-60">
        <X size={9} />
      </button>
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface JobTitleFilterSelectProps {
  selectedTitles:      string[];
  onSelectionChange:   (v: string[]) => void;
  excludeTitles?:      string[];
  onExcludeChange?:    (v: string[]) => void;
  // legacy props kept for compat (unused in new design)
  selectedManagementLevels?: string[];
  onManagementLevelsChange?: (v: string[]) => void;
  selectedDepartments?:      string[];
  onDepartmentsChange?:      (v: string[]) => void;
  selectedFunctions?:        string[];
  onFunctionsChange?:        (v: string[]) => void;
  fileId?: string | null;
}

export const JobTitleFilterSelect: React.FC<JobTitleFilterSelectProps> = ({
  selectedTitles,
  onSelectionChange,
  excludeTitles    = [],
  onExcludeChange  = () => {},
}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [tab,     setTab]     = useState<'include' | 'exclude'>('include');
  const [q,       setQ]       = useState('');
  const [open,    setOpen]    = useState(false);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Suggestions from org's contacts — only fetch when typing
  const { data: suggestions = [] } = useQuery({
    queryKey: ['job-title-suggestions-crm', organization_id, q],
    queryFn: async () => {
      if (!q.trim()) return [];
      const { data } = await supabase
        .from('contacts')
        .select('job_title')
        .eq('organization_id', organization_id)
        .not('job_title', 'is', null)
        .ilike('job_title', `%${q}%`)
        .limit(200);
      const unique = [...new Set((data || []).map((r: any) => r.job_title?.trim()).filter(Boolean))];
      return unique.sort().slice(0, 40) as string[];
    },
    enabled: !!organization_id && q.trim().length > 0,
    staleTime: 60_000,
  });

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setQ('');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const activeList    = tab === 'include' ? selectedTitles : excludeTitles;
  const setActiveList = tab === 'include' ? onSelectionChange : onExcludeChange;

  const addTitle = useCallback((val: string) => {
    const t = val.trim();
    if (!t || activeList.includes(t)) return;
    setActiveList([...activeList, t]);
    setQ('');
    inputRef.current?.focus();
  }, [activeList, setActiveList]);

  const removeTitle = (val: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter(x => x !== val));
  };

  const filtered    = suggestions.filter(s => !activeList.includes(s));
  const showManual  = q.trim() && !activeList.includes(q.trim());
  const hasIncludes = selectedTitles.length > 0;
  const hasExcludes = excludeTitles.length > 0;

  return (
    <div ref={wrapRef} className="space-y-2 pt-1">

      {/* Include / Exclude tab toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
        {(['include', 'exclude'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-1 text-[10px] font-semibold rounded-md transition-all flex items-center justify-center gap-1',
              tab === t
                ? t === 'include'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'bg-white text-red-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t === 'exclude' && <MinusCircle size={10} />}
            {t === 'include' ? 'Include' : 'Exclude'}
            {t === 'include' && hasIncludes && (
              <span className="bg-blue-100 text-blue-700 text-[9px] rounded-full px-1.5">{selectedTitles.length}</span>
            )}
            {t === 'exclude' && hasExcludes && (
              <span className="bg-red-100 text-red-700 text-[9px] rounded-full px-1.5">{excludeTitles.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search input + above portal */}
      <div ref={anchorRef} className="relative">
        <Briefcase className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" size={11} />
        <Input
          ref={inputRef}
          placeholder={tab === 'include' ? 'Type to search titles…' : 'Type titles to exclude…'}
          className={cn(
            'pl-7 h-8 text-xs border-slate-200',
            tab === 'exclude' && 'border-red-200 focus:border-red-400',
          )}
          value={q}
          onChange={e => { setQ(e.target.value); if (e.target.value.trim()) setOpen(true); else setOpen(false); }}
          onFocus={() => { if (q.trim()) setOpen(true); }}
          onKeyDown={e => {
            if (e.key === 'Enter' && q.trim()) { addTitle(q); setOpen(false); }
            if (e.key === 'Backspace' && !q) {
              if (tab === 'include' && selectedTitles.length) onSelectionChange(selectedTitles.slice(0, -1));
              if (tab === 'exclude' && excludeTitles.length)  onExcludeChange(excludeTitles.slice(0, -1));
            }
          }}
          onBlur={() => setTimeout(() => { setOpen(false); setQ(''); }, 150)}
        />

        <AbovePortal anchorRef={anchorRef} isOpen={open && q.trim().length > 0 && (filtered.length > 0 || !!showManual)} maxH={220}>
          <div className="overflow-y-auto flex-1">
            {showManual && (
              <button type="button" onMouseDown={e => { e.preventDefault(); addTitle(q); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 border-b border-slate-100 text-left',
                  tab === 'include' ? 'hover:bg-blue-50' : 'hover:bg-red-50',
                )}>
                <Sparkles size={10} className={tab === 'include' ? 'text-blue-500' : 'text-red-500'} />
                <span className={cn('text-[11px] font-medium', tab === 'include' ? 'text-blue-700' : 'text-red-700')}>
                  {tab === 'include' ? 'Add' : 'Exclude'} "<b>{q.trim()}</b>"
                </span>
              </button>
            )}
            {filtered.map(title => (
              <button key={title} type="button" onMouseDown={e => { e.preventDefault(); addTitle(title); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-left',
                  tab === 'include' ? 'hover:bg-blue-50' : 'hover:bg-red-50',
                )}>
                <Briefcase size={10} className="text-slate-400 flex-shrink-0" />
                <span className="text-[11px] text-slate-700 truncate">{title}</span>
              </button>
            ))}
          </div>
        </AbovePortal>
      </div>

      {/* Selected tags */}
      {(hasIncludes || hasExcludes) && (
        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
          {selectedTitles.map(t => (
            <TitleTag key={`inc-${t}`} label={t} variant="include"
              onRemove={() => removeTitle(t, selectedTitles, onSelectionChange)} />
          ))}
          {excludeTitles.map(t => (
            <TitleTag key={`exc-${t}`} label={t} variant="exclude"
              onRemove={() => removeTitle(t, excludeTitles, onExcludeChange)} />
          ))}
          {(selectedTitles.length + excludeTitles.length) > 1 && (
            <button
              onMouseDown={e => { e.preventDefault(); onSelectionChange([]); onExcludeChange([]); }}
              className="text-[10px] text-red-500 hover:text-red-700 font-medium px-1 self-center"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <p className="text-[9px] text-slate-400">From your CRM · Enter to add any title</p>
    </div>
  );
};