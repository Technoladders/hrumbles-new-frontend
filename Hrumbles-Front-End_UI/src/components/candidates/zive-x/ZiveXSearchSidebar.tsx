// src/components/candidates/zive-x/ZiveXSearchSidebar.tsx  v5
//
// CHANGES vs v4:
//  • SkillBuilder rebuilt as SkillsPopoverBuilder — uses the SAME popover pattern
//    as title/company/etc, but with the Must/Nice/Exclude mode toggle integrated.
//  • Mode toggle lives next to each chip (click to cycle), with a clearly visible
//    "New as: [Must][Nice][Excl]" legend above the field.
//  • Suggestions in the popover show a small badge of the active mode so the
//    recruiter knows how the next-added skill will be tagged.
//  • Education normalization carried over.
//  • State + onSearch payload unchanged — must/nice still in `skills` SearchTag[],
//    exclude still in `excluded_skills: string[]`.

import {
  FC, useState, useEffect, useRef, KeyboardEvent, useMemo, useCallback,
  ReactNode,
} from 'react';
import {
  ChevronDown, ChevronUp, Search, RotateCcw, X, MapPin, Info, Plus,
} from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import { supabase } from '@/integrations/supabase/client';
import { SearchFilters, SearchTag } from '@/types/candidateSearch';
import { canonicalizeEdu, normalizeEduToken } from '@/utils/eduNormalize';

// ── Types ─────────────────────────────────────────────────────────────────────
type SkillMode = 'must' | 'nice' | 'exclude';
interface ZxSkillChip { label: string; mode: SkillMode; }

// ── Constants ─────────────────────────────────────────────────────────────────
const NOTICE_OPTIONS = ['Immediate', '15 Days', '30 Days', '45 Days', '60 Days', '90 Days'];
const CO_COUNT_OPTIONS = [
  { value: '', label: 'Any' }, { value: '1', label: '1 company' },
  { value: '2-3', label: '2–3 companies' }, { value: '4-5', label: '4–5 companies' },
  { value: '5+', label: '5+ companies' },
];
const EXP_OPTIONS = [
  { value: '', label: 'Any' },
  ...Array.from({ length: 21 }, (_, i) => ({ value: String(i), label: `${i}y` })),
];
const SKILL_MODE_STYLES: Record<SkillMode, React.CSSProperties> = {
  must:    { background: '#FEE2E2', color: '#991B1B', borderColor: '#FECACA' },
  nice:    { background: '#EDE9FE', color: '#5B21B6', borderColor: '#C4B5FD' },
  exclude: { background: '#F1F5F9', color: '#64748B', borderColor: '#E2E8F0', textDecoration: 'line-through' },
};
const SKILL_MODE_ICONS: Record<SkillMode, string> = { must: '✓', nice: '~', exclude: '✕' };
const SKILL_CYCLE: SkillMode[] = ['must', 'nice', 'exclude'];

function parseCoCount(v: string) {
  if (!v) return {};
  if (v === '1')   return { min: 1, max: 1 };
  if (v === '2-3') return { min: 2, max: 3 };
  if (v === '4-5') return { min: 4, max: 5 };
  if (v === '5+')  return { min: 5 };
  return {};
}

// ── DB autocomplete hook ──────────────────────────────────────────────────────
function useDBSuggestions(rpcName: string, orgId: string, query: string, minLen = 1) {
  const [suggs, setSuggs] = useState<string[]>([]);
  const cache = useRef<Map<string, string[]>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < minLen) { setSuggs([]); return; }
    const k = `${rpcName}:${query.toLowerCase()}`;
    if (cache.current.has(k)) { setSuggs(cache.current.get(k)!); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc(rpcName, {
          p_organization_id: orgId,
          p_search_term: query,
        });
        if (!error && Array.isArray(data)) {
          const res = data.map((item: any) =>
            typeof item === 'string' ? item :
              item.suggestion ?? item.skill ?? item.company ?? item.name ??
              item.institution ?? item.location ?? Object.values(item)[0] ?? ''
          ).filter(Boolean).slice(0, 30) as string[];
          cache.current.set(k, res);
          setSuggs(res);
        }
      } catch (_) { /* silent */ }
    }, 280);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, rpcName, orgId, minLen]);

  return suggs;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
const Tip: FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', cursor: 'help' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
    >
      <Info size={9} style={{ color: '#C4B5FD' }} />
      {show && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 5px)', left: '50%',
          transform: 'translateX(-50%)', background: '#1E293B', color: '#E2E8F0',
          padding: '6px 9px', borderRadius: 6, fontSize: 9, lineHeight: 1.55,
          zIndex: 300, width: 220, pointerEvents: 'none',
          boxShadow: '0 4px 14px rgba(0,0,0,.35)', whiteSpace: 'normal',
          textTransform: 'none', fontWeight: 400, letterSpacing: 0,
        }}>
          {text}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)', width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid #1E293B',
          }} />
        </div>
      )}
    </span>
  );
};

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader: FC<{ label: string; count?: number; open: boolean; onToggle: () => void }> = ({
  label, count, open, onToggle,
}) => (
  <button
    onClick={onToggle}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: open ? '#F5F3FF' : '#F8FAFC', border: 'none',
      borderTop: '1px solid #E2E8F0', padding: '7px 12px',
      cursor: 'pointer', userSelect: 'none',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.6px',
        textTransform: 'uppercase', color: open ? '#6D28D9' : '#64748B',
      }}>
        {label}
      </span>
      {(count ?? 0) > 0 && (
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
          background: '#6D28D9', color: 'white',
        }}>
          {count}
        </span>
      )}
    </div>
    {open
      ? <ChevronUp size={11} style={{ color: '#6D28D9' }} />
      : <ChevronDown size={11} style={{ color: '#94A3B8' }} />
    }
  </button>
);

// ── Field label row ───────────────────────────────────────────────────────────
const FL: FC<{ children: ReactNode; tip?: string }> = ({ children, tip }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.5px',
      textTransform: 'uppercase', color: '#94A3B8',
    }}>
      {children}
    </span>
    {tip && <Tip text={tip} />}
  </div>
);

// ── Chip style helpers ────────────────────────────────────────────────────────
function chipStyle(mandatory: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 3,
    padding: '2px 5px', borderRadius: 4, fontSize: 9, fontWeight: 600, border: '1px solid',
    ...(mandatory
      ? { background: '#FFF9C4', color: '#92400E', borderColor: '#FCD34D' }
      : { background: '#EDE9FE', color: '#5B21B6', borderColor: '#C4B5FD' }),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SearchableMultiPopover
// Reused for: titles, companies, prev titles/cos, qualifications, institutions
// ══════════════════════════════════════════════════════════════════════════════
interface SearchableMultiPopoverProps {
  tags:        SearchTag[];
  onChange:    (t: SearchTag[]) => void;
  placeholder: string;
  suggs:       string[];
  onQ:         (q: string) => void;
  allowM?:     boolean;
  filterSuggs?: (suggs: string[], q: string) => string[];
}

const SearchableMultiPopover: FC<SearchableMultiPopoverProps> = ({
  tags, onChange, placeholder, suggs, onQ, allowM = false, filterSuggs,
}) => {
  const [open,   setOpen]   = useState(false);
  const [q,      setQ]      = useState('');
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setQ(''); onQ('');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onQ]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const displaySuggs = useMemo(() => {
    const already = new Set(tags.map(t => t.value.toLowerCase()));
    const base = suggs.filter(s => !already.has(s.toLowerCase()));
    if (!q.trim()) return base.slice(0, 40);
    if (filterSuggs) return filterSuggs(base, q);
    return base.filter(s => s.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  }, [suggs, tags, q, filterSuggs]);

  const add = useCallback((v: string) => {
    const val = v.trim();
    if (!val || tags.some(t => t.value.toLowerCase() === val.toLowerCase())) return;
    onChange([...tags, { value: val, mandatory: false }]);
  }, [tags, onChange]);

  const addAndKeepOpen = (v: string) => {
    add(v); setQ(''); onQ('');
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const removeTag = (i: number) => onChange(tags.filter((_, idx) => idx !== i));
  const toggleM   = (i: number) => {
    if (!allowM) return;
    onChange(tags.map((t, idx) => idx === i ? { ...t, mandatory: !t.mandatory } : t));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); setQ(''); onQ(''); }
    if (e.key === 'Enter' && q.trim()) {
      e.preventDefault();
      if (displaySuggs.length > 0) addAndKeepOpen(displaySuggs[0]);
      else addAndKeepOpen(q.trim());
    }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 5 }}>
          {tags.map((t, i) => (
            <span key={i} style={chipStyle(t.mandatory)}>
              {allowM && (
                <button type="button" onClick={() => toggleM(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 9, color: t.mandatory ? '#D97706' : '#7C3AED', lineHeight: 1 }}>
                  {t.mandatory ? '★' : '☆'}
                </button>
              )}
              <span onClick={() => allowM && toggleM(i)} style={{ cursor: allowM ? 'pointer' : 'default' }}>{t.value}</span>
              <button type="button" onClick={e => { e.stopPropagation(); removeTag(i); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit', opacity: 0.55 }}>
                <X size={8} />
              </button>
            </span>
          ))}
        </div>
      )}

      <button type="button" onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 30, border: '1px solid #E2E8F0', borderRadius: 6,
          background: open ? '#F5F3FF' : '#FAFAFA', padding: '0 8px', cursor: 'pointer',
          fontSize: 10, color: tags.length ? '#6D28D9' : '#94A3B8', fontWeight: tags.length ? 600 : 400,
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Search size={10} style={{ color: '#C4B5FD', flexShrink: 0 }} />
          {tags.length > 0 ? `${tags.length} selected — click to add more` : placeholder}
        </span>
        <Plus size={10} style={{ color: '#C4B5FD' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)',
          background: 'white', border: '1px solid #C4B5FD',
          borderRadius: 10, boxShadow: '0 8px 28px rgba(109,28,217,0.12)',
          zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFE' }}>
            <Search size={11} style={{ color: '#A78BFA', flexShrink: 0 }} />
            <input ref={inputRef} value={q}
              onChange={e => { setQ(e.target.value); onQ(e.target.value); }}
              onKeyDown={onKey} placeholder="Search or type to add…"
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 11, color: '#0F172A' }} />
            {q && (
              <button type="button" onClick={() => { setQ(''); onQ(''); inputRef.current?.focus(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}>
                <X size={10} />
              </button>
            )}
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {displaySuggs.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>
                {q.length > 0
                  ? <span>No match — press <strong>Enter</strong> to add <em>"{q}"</em></span>
                  : 'Start typing to search…'}
              </div>
            )}
            {displaySuggs.map(s => {
              const already = tags.some(t => t.value.toLowerCase() === s.toLowerCase());
              return (
                <button key={s} type="button"
                  onMouseDown={e => { e.preventDefault(); if (!already) addAndKeepOpen(s); }}
                  disabled={already}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '6px 12px', border: 'none',
                    background: already ? '#F5F3FF' : 'none',
                    textAlign: 'left', cursor: already ? 'default' : 'pointer',
                    fontSize: 10, color: already ? '#7C3AED' : '#0F172A', lineHeight: 1.4,
                  }}
                  onMouseEnter={e => { if (!already) (e.currentTarget as HTMLElement).style.background = '#F5F3FF'; }}
                  onMouseLeave={e => { if (!already) (e.currentTarget as HTMLElement).style.background = 'none'; }}>
                  <span>{s}</span>
                  {already && <span style={{ fontSize: 8, color: '#7C3AED', fontWeight: 700 }}>✓</span>}
                </button>
              );
            })}
          </div>

          <div style={{ padding: '5px 12px', borderTop: '1px solid #F3F4F6', fontSize: 8, color: '#94A3B8', background: '#FAFAFE', display: 'flex', justifyContent: 'space-between' }}>
            <span>Click to select · Enter to add typed</span>
            <button type="button" onClick={() => { setOpen(false); setQ(''); onQ(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 8, color: '#6D28D9', fontWeight: 700, padding: 0 }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Multi-value tag input with suggestions and ★ (used for Keywords) ─────────
const TagIn: FC<{
  tags: SearchTag[];
  onChange: (t: SearchTag[]) => void;
  placeholder: string;
  allowM?: boolean;
  suggs?: string[];
  onQ?: (q: string) => void;
}> = ({ tags, onChange, placeholder, allowM = false }) => {
  const [inp, setInp] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (v: string) => {
    const val = v.trim();
    if (!val || tags.some(t => t.value.toLowerCase() === val.toLowerCase())) { setInp(''); return; }
    onChange([...tags, { value: val, mandatory: false }]);
    setInp('');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inp) { e.preventDefault(); add(inp); }
    if (e.key === 'Backspace' && !inp && tags.length) onChange(tags.slice(0, -1));
  };

  const toggleM = (i: number) => {
    if (!allowM) return;
    onChange(tags.map((t, idx) => idx === i ? { ...t, mandatory: !t.mandatory } : t));
  };

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 3, padding: '5px 8px',
      border: '1px solid #E2E8F0', borderRadius: 7, background: '#FAFAFA',
      minHeight: 32, cursor: 'text', alignItems: 'center',
    }}
      onClick={() => inputRef.current?.focus()}>
      {tags.map((t, i) => (
        <span key={i} style={chipStyle(t.mandatory)}>
          {allowM && (
            <button type="button" onClick={() => toggleM(i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 9, color: t.mandatory ? '#D97706' : '#7C3AED', lineHeight: 1 }}>
              {t.mandatory ? '★' : '☆'}
            </button>
          )}
          <span onClick={() => allowM && toggleM(i)} style={{ cursor: allowM ? 'pointer' : 'default' }}>{t.value}</span>
          <button type="button" onClick={e => { e.stopPropagation(); onChange(tags.filter((_, idx) => idx !== i)); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit', opacity: 0.55 }}>
            <X size={8} />
          </button>
        </span>
      ))}
      <input ref={inputRef} value={inp}
        onChange={e => setInp(e.target.value)} onKeyDown={onKey}
        placeholder={tags.length ? '' : placeholder}
        style={{ flex: 1, minWidth: 60, border: 'none', background: 'none', outline: 'none', fontSize: 10, color: '#0F172A', padding: 0 }} />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SkillsPopoverBuilder
//   Same popover pattern as SearchableMultiPopover, BUT with the must/nice/exclude
//   mode control integrated. Chips show their mode; clicking a chip cycles modes.
// ══════════════════════════════════════════════════════════════════════════════
const SkillsPopoverBuilder: FC<{
  chips:    ZxSkillChip[];
  onChange: (c: ZxSkillChip[]) => void;
  suggs:    string[];
  onQ:      (q: string) => void;
}> = ({ chips, onChange, suggs, onQ }) => {
  const [activeMode, setActiveMode] = useState<SkillMode>('must');
  const [open,       setOpen]       = useState(false);
  const [q,          setQ]          = useState('');
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setQ(''); onQ('');
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onQ]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const add = useCallback((v: string, m = activeMode) => {
    const val = v.trim();
    if (!val || chips.some(c => c.label.toLowerCase() === val.toLowerCase())) return;
    onChange([...chips, { label: val, mode: m }]);
    setQ(''); onQ('');
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [chips, onChange, onQ, activeMode]);

  const cycleMode = (i: number) => {
    const next = SKILL_CYCLE[(SKILL_CYCLE.indexOf(chips[i].mode) + 1) % 3];
    onChange(chips.map((c, idx) => idx === i ? { ...c, mode: next } : c));
  };

  const removeChip = (i: number) => onChange(chips.filter((_, idx) => idx !== i));

  const filtered = useMemo(() => {
    const already = new Set(chips.map(c => c.label.toLowerCase()));
    const base = suggs.filter(s => !already.has(s.toLowerCase()));
    if (!q.trim()) return base.slice(0, 40);
    return base.filter(s => s.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  }, [suggs, chips, q]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); setQ(''); onQ(''); }
    if (e.key === 'Enter' && q.trim()) {
      e.preventDefault();
      if (filtered.length > 0) add(filtered[0]);
      else add(q.trim());
    }
  };

  const counts = {
    must:    chips.filter(c => c.mode === 'must').length,
    nice:    chips.filter(c => c.mode === 'nice').length,
    exclude: chips.filter(c => c.mode === 'exclude').length,
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>

      {/* Mode legend — visible above the field */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 8, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Add as:</span>
        {SKILL_CYCLE.map(m => (
          <button key={m} type="button" onClick={() => setActiveMode(m)}
            title={`New chips will be added as "${m}"`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 600,
              border: '1.5px solid', cursor: 'pointer', transition: 'all 0.12s',
              outline: activeMode === m ? '2px solid' : 'none',
              outlineOffset: 2, outlineColor: 'currentColor',
              opacity: activeMode === m ? 1 : 0.45, ...SKILL_MODE_STYLES[m],
            }}>
            {SKILL_MODE_ICONS[m]} {m === 'must' ? 'Must' : m === 'nice' ? 'Nice' : 'Excl'}
          </button>
        ))}
      </div>

      {/* Chips row */}
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 5 }}>
          {chips.map((c, i) => (
            <span key={i}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600,
                border: '1px solid', cursor: 'pointer', userSelect: 'none', ...SKILL_MODE_STYLES[c.mode],
              }}
              onClick={() => cycleMode(i)}
              title={`${c.mode} — click to cycle`}>
              <span style={{ fontSize: 8 }}>{SKILL_MODE_ICONS[c.mode]}</span>
              <span>{c.label}</span>
              <button type="button"
                onClick={e => { e.stopPropagation(); removeChip(i); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit', opacity: 0.55 }}>
                <X size={8} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger */}
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 30, border: '1px solid #E2E8F0', borderRadius: 6,
          background: open ? '#F5F3FF' : '#FAFAFA', padding: '0 8px', cursor: 'pointer',
          fontSize: 10, color: chips.length ? '#6D28D9' : '#94A3B8', fontWeight: chips.length ? 600 : 400,
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Search size={10} style={{ color: '#C4B5FD', flexShrink: 0 }} />
          {chips.length > 0 ? `${chips.length} skills — click to add more` : 'Search skills…'}
        </span>
        <Plus size={10} style={{ color: '#C4B5FD' }} />
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)',
          background: 'white', border: '1px solid #C4B5FD',
          borderRadius: 10, boxShadow: '0 8px 28px rgba(109,28,217,0.12)',
          zIndex: 200, overflow: 'hidden',
        }}>
          {/* Search header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFE' }}>
            <Search size={11} style={{ color: '#A78BFA', flexShrink: 0 }} />
            <input ref={inputRef} value={q}
              onChange={e => { setQ(e.target.value); onQ(e.target.value); }}
              onKeyDown={onKey} placeholder="Search skills or type to add…"
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 11, color: '#0F172A' }} />

            {/* Active mode badge inside the search bar */}
            <span style={{
              fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
              border: '1px solid', flexShrink: 0, ...SKILL_MODE_STYLES[activeMode],
            }}>
              {SKILL_MODE_ICONS[activeMode]} {activeMode}
            </span>

            {q && (
              <button type="button" onClick={() => { setQ(''); onQ(''); inputRef.current?.focus(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}>
                <X size={10} />
              </button>
            )}
          </div>

          {/* Suggestion list */}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>
                {q.length > 0
                  ? <span>No match — press <strong>Enter</strong> to add <em>"{q}"</em> as <strong>{activeMode}</strong></span>
                  : 'Start typing to search…'}
              </div>
            )}
            {filtered.map(s => (
              <button key={s} type="button"
                onMouseDown={e => { e.preventDefault(); add(s); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '6px 12px', border: 'none',
                  background: 'none', textAlign: 'left', cursor: 'pointer',
                  fontSize: 10, color: '#0F172A', lineHeight: 1.4,
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#F5F3FF')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'none')}>
                <span>{s}</span>
                <span style={{
                  fontSize: 8, fontWeight: 700, padding: '1px 4px',
                  borderRadius: 3, border: '1px solid', ...SKILL_MODE_STYLES[activeMode],
                }}>
                  {SKILL_MODE_ICONS[activeMode]} {activeMode}
                </span>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: '5px 12px', borderTop: '1px solid #F3F4F6', fontSize: 8, color: '#94A3B8', background: '#FAFAFE', display: 'flex', justifyContent: 'space-between' }}>
            <span>Click chip to cycle mode · Enter to add typed</span>
            <button type="button" onClick={() => { setOpen(false); setQ(''); onQ(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 8, color: '#6D28D9', fontWeight: 700, padding: 0 }}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* Counts summary */}
      {chips.length > 0 && (
        <div style={{ marginTop: 5, fontSize: 9, color: '#94A3B8', display: 'flex', gap: 6 }}>
          {counts.must > 0 && <span style={{ color: '#991B1B', fontWeight: 600 }}>✓ {counts.must} must</span>}
          {counts.nice > 0 && <span style={{ color: '#5B21B6', fontWeight: 600 }}>~ {counts.nice} nice</span>}
          {counts.exclude > 0 && <span style={{ color: '#64748B', fontWeight: 600 }}>✕ {counts.exclude} excl</span>}
        </div>
      )}
    </div>
  );
};

// ── Location input ────────────────────────────────────────────────────────────
const LocIn: FC<{ tags: SearchTag[]; onChange: (t: SearchTag[]) => void }> = ({ tags, onChange }) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const sel = tags.map(t => t.value);
  const suggs = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return [];
    const res: { v: string; t: 'C' | 'S' | 'T' }[] = [];
    Country.getAllCountries().filter(c => c.name.toLowerCase().includes(ql) && !sel.includes(c.name)).slice(0, 3).forEach(c => res.push({ v: c.name, t: 'C' }));
    State.getAllStates().filter(s => s.name.toLowerCase().includes(ql) && !sel.includes(s.name)).slice(0, 3).forEach(s => res.push({ v: s.name, t: 'S' }));
    if (ql.length >= 3) City.getAllCities().filter(c => c.name.toLowerCase().includes(ql) && !sel.includes(c.name)).slice(0, 4).forEach(c => res.push({ v: c.name, t: 'T' }));
    return res.slice(0, 10);
  }, [q, sel.join(',')]);

  const add = (v: string) => {
    if (!sel.includes(v)) onChange([...tags, { value: v, mandatory: false }]);
    setQ(''); setOpen(false); setTimeout(() => inputRef.current?.focus(), 50);
  };
  const tM = (i: number) => { const n = [...tags]; n[i] = { ...n[i], mandatory: !n[i].mandatory }; onChange(n); };
  const rm = (i: number) => onChange(tags.filter((_, idx) => idx !== i));
  const TC = { C: '#1D4ED8', S: '#C2410C', T: '#6D28D9' };
  const TB = { C: '#EFF6FF', S: '#FFF7ED', T: '#F5F3FF' };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 4 }}>
          {tags.map((t, i) => (
            <span key={i} style={chipStyle(t.mandatory)}>
              <button type="button" onClick={() => tM(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 9, color: t.mandatory ? '#D97706' : '#7C3AED', lineHeight: 1 }}>
                {t.mandatory ? '★' : '☆'}
              </button>
              <span onClick={() => tM(i)} style={{ cursor: 'pointer' }}>{t.value}</span>
              <button type="button" onClick={e => { e.stopPropagation(); rm(i); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit', opacity: 0.55 }}>
                <X size={8} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', border: '1px solid #E2E8F0', borderRadius: 7, background: '#FAFAFA', minHeight: 32, cursor: 'text' }}>
        <MapPin size={10} style={{ color: '#94A3B8', flexShrink: 0 }} />
        <input ref={inputRef} value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter' && q.trim()) {
              e.preventDefault();
              suggs.length > 0 ? add(suggs[0].v) : add(q.trim());
            }
          }}
          placeholder="Country, state or city…"
          style={{ flex: 1, minWidth: 60, border: 'none', background: 'none', outline: 'none', fontSize: 10, color: '#0F172A', padding: 0 }} />
        {q && (
          <button type="button" onClick={() => setQ('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            <X size={9} style={{ color: '#94A3B8' }} />
          </button>
        )}
      </div>
      {open && suggs.length > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2,
          background: 'white', border: '1px solid #E2E8F0', borderRadius: 7,
          boxShadow: '0 4px 14px rgba(0,0,0,.09)', zIndex: 100, maxHeight: 180, overflowY: 'auto',
        }}>
          {suggs.map(s => (
            <button key={s.v} type="button" onMouseDown={e => { e.preventDefault(); add(s.v); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 10, textAlign: 'left' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#F5F3FF')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'none')}>
              <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3, color: TC[s.t], background: TB[s.t] }}>{s.t}</span>
              {s.v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Numeric selects ───────────────────────────────────────────────────────────
const ExpSel: FC<{ v: string; onChange: (v: string) => void; label: string }> = ({ v, onChange, label }) => (
  <div style={{ flex: 1 }}>
    <FL>{label}</FL>
    <select value={v} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', height: 28, border: '1px solid #E2E8F0', borderRadius: 6, background: '#FAFAFA', fontSize: 10, color: '#0F172A', padding: '0 8px', outline: 'none', cursor: 'pointer' }}>
      {EXP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const CtcIn: FC<{ v: string; onChange: (v: string) => void; label: string }> = ({ v, onChange, label }) => (
  <div style={{ flex: 1 }}>
    <FL>{label}</FL>
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#94A3B8' }}>₹</span>
      <input type="number" value={v} onChange={e => onChange(e.target.value)} placeholder="—"
        style={{ width: '100%', height: 28, border: '1px solid #E2E8F0', borderRadius: 6, background: '#FAFAFA', fontSize: 10, color: '#0F172A', paddingLeft: 18, paddingRight: 6, outline: 'none', boxSizing: 'border-box' }} />
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// Education normalization filter for popover suggestions
// ══════════════════════════════════════════════════════════════════════════════
function eduFilterSuggs(suggs: string[], q: string): string[] {
  if (!q.trim()) return suggs.slice(0, 40);
  const nQ = canonicalizeEdu(q);
  const pQ = normalizeEduToken(q);
  return suggs
    .filter(s => {
      const nS = canonicalizeEdu(s);
      const pS = normalizeEduToken(s);
      return (
        nS.includes(nQ) || nQ.includes(nS) ||
        pS.includes(pQ) || pQ.includes(pS) ||
        s.toLowerCase().includes(q.toLowerCase())
      );
    })
    .slice(0, 40);
}

interface ZiveXSearchSidebarProps {
  onSearch:       (filters: SearchFilters) => void;
  onReset?:       () => void;
  isSearching?:   boolean;
  initialFilters?: Partial<SearchFilters>;
  organizationId: string;
  /** When provided, the sidebar fires onSearch automatically on chip changes (live mode) */
  liveMode?:      boolean;
}

const ZiveXSearchSidebar: FC<ZiveXSearchSidebarProps> = ({
  onSearch, onReset, isSearching, initialFilters = {}, organizationId, liveMode = true,
}) => {
  const [open, setOpen] = useState<Record<string, boolean>>({
    core: true, skills: false, past: false, edu: false, avail: false,
  });
  const tog = (k: string) => setOpen(s => ({ ...s, [k]: !s[k] }));

  // ── Filter state ────────────────────────────────────────────────────────────
  const [keywords,      setKeywords]      = useState<SearchTag[]>([]);
  const [currTitles,    setCurrTitles]    = useState<SearchTag[]>([]);
  const [currCompanies, setCurrCompanies] = useState<SearchTag[]>([]);
  const [minExp,        setMinExp]        = useState('');
  const [maxExp,        setMaxExp]        = useState('');
  const [locations,     setLocations]     = useState<SearchTag[]>([]);
  const [skillChips,    setSkillChips]    = useState<ZxSkillChip[]>([]);
  const [prevTitles,    setPrevTitles]    = useState<SearchTag[]>([]);
  const [prevCos,       setPrevCos]       = useState<SearchTag[]>([]);
  const [coCount,       setCoCount]       = useState('');
  const [degrees,       setDegrees]       = useState<SearchTag[]>([]);
  const [institutions,  setInstitutions]  = useState<SearchTag[]>([]);
  const [noticePeriods, setNoticePeriods] = useState<string[]>([]);
  const [minCCTC,       setMinCCTC]       = useState('');
  const [maxCCTC,       setMaxCCTC]       = useState('');
  const [minECTC,       setMinECTC]       = useState('');
  const [maxECTC,       setMaxECTC]       = useState('');

  // Autocomplete queries
  const [titleQ,   setTitleQ]   = useState('');
  const [companyQ, setCompanyQ] = useState('');
  const [skillQ,   setSkillQ]   = useState('');
  const [prevTQ,   setPrevTQ]   = useState('');
  const [prevCoQ,  setPrevCoQ]  = useState('');
  const [degreeQ,  setDegreeQ]  = useState('');
  const [instQ,    setInstQ]    = useState('');

  const titleSugg   = useDBSuggestions('get_designation_suggestions',  organizationId, titleQ,   1);
  const companySugg = useDBSuggestions('get_company_suggestions',       organizationId, companyQ, 1);
  const skillSugg   = useDBSuggestions('get_org_skills_by_search',      organizationId, skillQ,   1);
  const prevTSugg   = useDBSuggestions('get_designation_suggestions',  organizationId, prevTQ,   1);
  const prevCoSugg  = useDBSuggestions('get_company_suggestions',       organizationId, prevCoQ,  1);
  const degreeSugg  = useDBSuggestions('get_qualification_suggestions', organizationId, degreeQ,  1);
  const instSugg    = useDBSuggestions('get_institution_suggestions',   organizationId, instQ,    1);

  // ── Initialise from prop ────────────────────────────────────────────────────
  useEffect(() => {
    const f = initialFilters;
    if (!f || !Object.keys(f).length) return;

    if (f.keywords?.length) setKeywords(f.keywords);

    if ((f as any).current_designations?.length) setCurrTitles((f as any).current_designations);
    else if (f.current_designation) setCurrTitles([{ value: f.current_designation, mandatory: false }]);

    if ((f as any).current_companies?.length) setCurrCompanies((f as any).current_companies);
    else if (f.current_company) setCurrCompanies([{ value: f.current_company, mandatory: false }]);

    if (f.min_exp != null) setMinExp(String(f.min_exp));
    if (f.max_exp != null) setMaxExp(String(f.max_exp));
    if (f.locations?.length) setLocations(f.locations);

    const must = (f.skills || []).filter(t =>  t.mandatory).map(t => ({ label: t.value, mode: 'must'  as SkillMode }));
    const nice = (f.skills || []).filter(t => !t.mandatory).map(t => ({ label: t.value, mode: 'nice'  as SkillMode }));
    const excl = (f.excluded_skills || []).map(v => ({ label: v, mode: 'exclude' as SkillMode }));
    if (must.length || nice.length || excl.length) {
      setSkillChips([...must, ...nice, ...excl]);
      setOpen(s => ({ ...s, skills: true }));
    }

    if (f.previous_titles?.length)    { setPrevTitles(f.previous_titles);    setOpen(s => ({ ...s, past: true })); }
    if (f.previous_companies?.length) { setPrevCos(f.previous_companies);    setOpen(s => ({ ...s, past: true })); }

    if (f.companies_count_min != null || f.companies_count_max != null) {
      const mn = f.companies_count_min, mx = f.companies_count_max;
      if (mn === 1 && mx === 1) setCoCount('1');
      else if (mn === 2 && mx === 3) setCoCount('2-3');
      else if (mn === 4 && mx === 5) setCoCount('4-5');
      else if (mn === 5) setCoCount('5+');
    }

    if ((f as any).degrees?.length)   { setDegrees((f as any).degrees); setOpen(s => ({ ...s, edu: true })); }
    else if (f.degree)                { setDegrees([{ value: f.degree, mandatory: false }]); setOpen(s => ({ ...s, edu: true })); }
    if (f.institutions?.length)        { setInstitutions(f.institutions); setOpen(s => ({ ...s, edu: true })); }

    if (f.notice_periods?.length)  { setNoticePeriods(f.notice_periods); setOpen(s => ({ ...s, avail: true })); }
    if (f.min_current_salary  != null) setMinCCTC(String(f.min_current_salary));
    if (f.max_current_salary  != null) setMaxCCTC(String(f.max_current_salary));
    if (f.min_expected_salary != null) setMinECTC(String(f.min_expected_salary));
    if (f.max_expected_salary != null) setMaxECTC(String(f.max_expected_salary));
  }, [JSON.stringify(initialFilters)]);

  // ── Counts ────────────────────────────────────────────────────────────────
  const coreCount  = (keywords.length ? 1 : 0) + (currTitles.length ? 1 : 0) + (currCompanies.length ? 1 : 0) + ((minExp || maxExp) ? 1 : 0) + (locations.length ? 1 : 0);
  const skillCount = skillChips.length;
  const pastCount  = (prevTitles.length ? 1 : 0) + (prevCos.length ? 1 : 0) + (coCount ? 1 : 0);
  const eduCount   = (degrees.length ? 1 : 0) + (institutions.length ? 1 : 0);
  const availCount = (noticePeriods.length ? 1 : 0) + ((minCCTC || maxCCTC) ? 1 : 0) + ((minECTC || maxECTC) ? 1 : 0);
  const totalActive = coreCount + skillCount + pastCount + eduCount + availCount;

  const resetAll = () => {
    setKeywords([]); setCurrTitles([]); setCurrCompanies([]);
    setMinExp(''); setMaxExp(''); setLocations([]);
    setSkillChips([]); setSkillQ('');
    setPrevTitles([]); setPrevCos([]); setCoCount('');
    setDegrees([]); setInstitutions([]);
    setNoticePeriods([]); setMinCCTC(''); setMaxCCTC(''); setMinECTC(''); setMaxECTC('');
    setOpen({ core: true, skills: false, past: false, edu: false, avail: false });
    onReset?.();
  };

  // ── Build filter payload ──────────────────────────────────────────────────
  const buildPayload = (): SearchFilters => {
    const mustS = skillChips.filter(c => c.mode === 'must').map(c => ({ value: c.label, mandatory: true  }));
    const niceS = skillChips.filter(c => c.mode === 'nice').map(c => ({ value: c.label, mandatory: false }));
    const exclS = skillChips.filter(c => c.mode === 'exclude').map(c => c.label);
    const { min: ccMin, max: ccMax } = parseCoCount(coCount);

    return {
      ...(keywords.length               && { keywords }),
      ...(currTitles.length             && { current_designations: currTitles, current_designation: currTitles[0]?.value }),
      ...(currCompanies.length          && { current_companies: currCompanies, current_company: currCompanies[0]?.value }),
      ...(minExp                        && { min_exp: Number(minExp) }),
      ...(maxExp                        && { max_exp: Number(maxExp) }),
      ...(locations.length              && { locations }),
      ...([...mustS, ...niceS].length   && { skills: [...mustS, ...niceS] }),
      ...(exclS.length                  && { excluded_skills: exclS }),
      ...(prevTitles.length             && { previous_titles: prevTitles }),
      ...(prevCos.length                && { previous_companies: prevCos }),
      ...(ccMin != null                 && { companies_count_min: ccMin }),
      ...(ccMax != null                 && { companies_count_max: ccMax }),
      ...(degrees.length                && { degrees, degree: degrees[0]?.value }),
      ...(institutions.length           && { institutions }),
      ...(noticePeriods.length          && { notice_periods: noticePeriods }),
      ...(minCCTC                       && { min_current_salary:  Number(minCCTC) }),
      ...(maxCCTC                       && { max_current_salary:  Number(maxCCTC) }),
      ...(minECTC                       && { min_expected_salary: Number(minECTC) }),
      ...(maxECTC                       && { max_expected_salary: Number(maxECTC) }),
    } as SearchFilters;
  };

  // ── LIVE MODE: re-fire onSearch whenever any chip changes ───────────────────
  // This is what makes chip removal trigger a real refetch.
  //
  // GUARDS:
  //  • isFirstRun ref skips the initial mount-effect (React 18 StrictMode
  //    runs effects twice in dev — the second pass would otherwise fire
  //    onSearch({}) and flip the parent's hasSearched=true before the user
  //    has done anything, hiding the hero section).
  //  • Empty-payload check: if no chip / range / option is set, don't fire.
  //    Belt and braces against the StrictMode double-effect re-firing after
  //    isFirstRun has flipped to false.
  //  • liveMode prop: parent passes false until the user has explicitly
  //    searched at least once.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; return; }
    if (!liveMode) return;
    const payload = buildPayload();
    if (Object.keys(payload).length === 0) return;  // ← never fire empty
    const t = setTimeout(() => onSearch(payload), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(keywords),
    JSON.stringify(currTitles), JSON.stringify(currCompanies),
    minExp, maxExp,
    JSON.stringify(locations),
    JSON.stringify(skillChips),
    JSON.stringify(prevTitles), JSON.stringify(prevCos), coCount,
    JSON.stringify(degrees), JSON.stringify(institutions),
    JSON.stringify(noticePeriods),
    minCCTC, maxCCTC, minECTC, maxECTC,
  ]);

  const handleSearchButton = () => onSearch(buildPayload());

  return (
    <div
      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSearchButton(); }}
      style={{ display: 'flex', flexDirection: 'column', width: 272, flexShrink: 0, background: 'white', borderRight: '1px solid #E2E8F0', height: '100%', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, padding: '11px 14px 9px', borderBottom: '1px solid #E2E8F0', background: 'linear-gradient(135deg,#1E1B4B,#312E81)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', color: 'white', textTransform: 'uppercase' }}>
            Zive-X Filters
            {totalActive > 0 && (
              <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 6px', borderRadius: 99, background: '#6D28D9', color: 'white' }}>
                {totalActive}
              </span>
            )}
          </span>
          {totalActive > 0 && (
            <button onClick={resetAll}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A78BFA', display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 600, padding: 0 }}>
              <RotateCcw size={10} /> Reset
            </button>
          )}
        </div>
        <button onClick={handleSearchButton} disabled={isSearching}
          style={{ width: '100%', height: 32, borderRadius: 7, border: 'none', background: isSearching ? '#4C1D95' : '#7C3AED', color: 'white', fontSize: 11, fontWeight: 700, cursor: isSearching ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Search size={12} />{isSearching ? 'Searching…' : 'Search Candidates'}
        </button>
        <div style={{ marginTop: 5, fontSize: 8, color: '#A78BFA', textAlign: 'center' }}>
          {liveMode ? 'Live · auto-search on change' : 'Ctrl+Enter to search'} · ★ required
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        <SectionHeader label="Core" count={coreCount} open={open.core} onToggle={() => tog('core')} />
        {open.core && (
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <FL tip="Full-text search across resume, title, skills. ★ = required.">Keywords</FL>
              <TagIn tags={keywords} onChange={setKeywords} placeholder="Type + Enter" allowM />
            </div>
            <div>
              <FL tip="Current job title — multiple titles OR'd unless starred.">Current Title</FL>
              <SearchableMultiPopover tags={currTitles} onChange={setCurrTitles}
                placeholder="Search titles…" suggs={titleSugg} onQ={setTitleQ} allowM />
            </div>
            <div>
              <FL tip="Current employer — multiple companies OR'd unless starred.">Current Company</FL>
              <SearchableMultiPopover tags={currCompanies} onChange={setCurrCompanies}
                placeholder="Search companies…" suggs={companySugg} onQ={setCompanyQ} allowM />
            </div>
            <div>
              <FL tip="Filter by total years of experience.">Experience</FL>
              <div style={{ display: 'flex', gap: 6 }}>
                <ExpSel v={minExp} onChange={setMinExp} label="Min" />
                <ExpSel v={maxExp} onChange={setMaxExp} label="Max" />
              </div>
            </div>
            <div>
              <FL tip="Filter by city, state or country. ★ = required.">Location</FL>
              <LocIn tags={locations} onChange={setLocations} />
            </div>
          </div>
        )}

        <SectionHeader label="Skills" count={skillCount} open={open.skills} onToggle={() => tog('skills')} />
        {open.skills && (
          <div style={{ padding: '10px 12px' }}>
            <FL tip="✓ Must = hard filter. ~ Nice = boosts score, OR-matched. ✕ Excl = hard remove. Click chip to cycle modes.">
              Skill Tags
            </FL>
            <SkillsPopoverBuilder chips={skillChips} onChange={setSkillChips} suggs={skillSugg} onQ={setSkillQ} />
          </div>
        )}

        <SectionHeader label="Past Experience" count={pastCount} open={open.past} onToggle={() => tog('past')} />
        {open.past && (
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <FL tip="Search all previous job titles. ★ = must have held.">Previous Titles</FL>
              <SearchableMultiPopover tags={prevTitles} onChange={setPrevTitles}
                placeholder="Search previous titles…" suggs={prevTSugg} onQ={setPrevTQ} allowM />
            </div>
            <div>
              <FL tip="Search previous employers. ★ = must have worked there.">Previous Companies</FL>
              <SearchableMultiPopover tags={prevCos} onChange={setPrevCos}
                placeholder="Search companies…" suggs={prevCoSugg} onQ={setPrevCoQ} allowM />
            </div>
            <div>
              <FL tip="Total number of distinct companies.">Companies Count</FL>
              <select value={coCount} onChange={e => setCoCount(e.target.value)}
                style={{ width: '100%', height: 28, border: '1px solid #E2E8F0', borderRadius: 6, background: '#FAFAFA', fontSize: 10, color: '#0F172A', padding: '0 8px', outline: 'none', cursor: 'pointer' }}>
                {CO_COUNT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        )}

        <SectionHeader label="Education" count={eduCount} open={open.edu} onToggle={() => tog('edu')} />
        {open.edu && (
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <FL tip="Normalised — 'MBA', 'M.B.A.', 'Master of Business Administration' all match. ★ = required.">
                Qualification / Degree
              </FL>
              <SearchableMultiPopover tags={degrees} onChange={setDegrees}
                placeholder="Search qualifications…" suggs={degreeSugg} onQ={setDegreeQ}
                filterSuggs={eduFilterSuggs} allowM />
            </div>
            <div>
              <FL tip="University or college.">Institution</FL>
              <SearchableMultiPopover tags={institutions} onChange={setInstitutions}
                placeholder="Search institutions…" suggs={instSugg} onQ={setInstQ} allowM />
            </div>
          </div>
        )}

        <SectionHeader label="Availability" count={availCount} open={open.avail} onToggle={() => tog('avail')} />
        {open.avail && (
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <FL tip="How soon can the candidate join?">Notice Period</FL>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {NOTICE_OPTIONS.map(np => {
                  const a = noticePeriods.includes(np);
                  return (
                    <button key={np} type="button"
                      onClick={() => setNoticePeriods(prev => a ? prev.filter(p => p !== np) : [...prev, np])}
                      style={{ padding: '3px 9px', borderRadius: 99, fontSize: 9, fontWeight: 600, border: '1px solid', cursor: 'pointer', ...(a ? { background: '#EDE9FE', color: '#5B21B6', borderColor: '#C4B5FD' } : { background: 'white', color: '#64748B', borderColor: '#E2E8F0' }) }}>
                      {np}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <FL tip="Current salary in lakhs.">Current CTC (₹L)</FL>
              <div style={{ display: 'flex', gap: 6 }}>
                <CtcIn v={minCCTC} onChange={setMinCCTC} label="Min" />
                <CtcIn v={maxCCTC} onChange={setMaxCCTC} label="Max" />
              </div>
            </div>
            <div>
              <FL tip="Expected salary in lakhs.">Expected CTC (₹L)</FL>
              <div style={{ display: 'flex', gap: 6 }}>
                <CtcIn v={minECTC} onChange={setMinECTC} label="Min" />
                <CtcIn v={maxECTC} onChange={setMaxECTC} label="Max" />
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>
    </div>
  );
};

export default ZiveXSearchSidebar;