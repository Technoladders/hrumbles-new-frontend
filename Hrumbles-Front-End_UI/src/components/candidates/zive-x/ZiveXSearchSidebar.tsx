// src/components/candidates/zive-x/ZiveXSearchSidebar.tsx  v3
// All fields have DB-backed autocomplete + ★ mandatory + tooltips
// NEW: AutocompleteTextInput for single-value, SkillChipBuilder active-mode legend
// NEW RPCs: get_designation_suggestions, get_qualification_suggestions, get_institution_suggestions

import {
  FC, useState, useEffect, useRef, KeyboardEvent, useMemo, useCallback,
} from 'react';
import { ChevronDown, ChevronUp, Search, RotateCcw, X, MapPin, Info } from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import { supabase } from '@/integrations/supabase/client';
import { SearchFilters, SearchTag } from '@/types/candidateSearch';

type SkillMode   = 'must' | 'nice' | 'exclude';
interface ZxSkillChip { label: string; mode: SkillMode; }

const NOTICE_OPTIONS   = ['Immediate', '15 Days', '30 Days', '45 Days', '60 Days', '90 Days'];
const CO_COUNT_OPTIONS = [
  { value: '', label: 'Any' }, { value: '1', label: '1 company' },
  { value: '2-3', label: '2–3 companies' }, { value: '4-5', label: '4–5 companies' }, { value: '5+', label: '5+ companies' },
];
const EXP_OPTIONS = [{ value: '', label: 'Any' }, ...Array.from({ length: 21 }, (_, i) => ({ value: String(i), label: `${i}y` }))];
const CHIP_STYLES: Record<SkillMode, React.CSSProperties> = {
  must:    { background: '#FEE2E2', color: '#991B1B', borderColor: '#FECACA' },
  nice:    { background: '#EDE9FE', color: '#5B21B6', borderColor: '#C4B5FD' },
  exclude: { background: '#F1F5F9', color: '#64748B', borderColor: '#E2E8F0', textDecoration: 'line-through' },
};
const CHIP_ICONS: Record<SkillMode, string> = { must: '✓', nice: '~', exclude: '✕' };
const SKILL_CYCLE: SkillMode[] = ['must', 'nice', 'exclude'];

function parseCoCount(v: string) {
  if (!v) return {};
  if (v === '1') return { min: 1, max: 1 }; if (v === '2-3') return { min: 2, max: 3 };
  if (v === '4-5') return { min: 4, max: 5 }; if (v === '5+') return { min: 5 }; return {};
}

// ── DB autocomplete hook — debounced, cached ──────────────────────────────────
function useDBSuggestions(rpcName: string, orgId: string, query: string, minLen = 2) {
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
        const { data, error } = await supabase.rpc(rpcName, { p_organization_id: orgId, p_search_term: query });
        if (!error && Array.isArray(data)) {
          const res = data.map((item: any) => typeof item === 'string' ? item :
            item.suggestion ?? item.skill ?? item.company ?? item.name ?? item.institution
            ?? item.location ?? Object.values(item)[0] ?? '').filter(Boolean).slice(0, 10) as string[];
          cache.current.set(k, res); setSuggs(res);
        }
      } catch (_) { /* silent */ }
    }, 280);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, rpcName, orgId]);
  return suggs;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
const Tip: FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', cursor: 'help' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info size={9} style={{ color: '#C4B5FD' }} />
      {show && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 5px)', left: '50%', transform: 'translateX(-50%)', background: '#1E293B', color: '#E2E8F0', padding: '6px 9px', borderRadius: 6, fontSize: 9, lineHeight: 1.55, zIndex: 300, width: 195, pointerEvents: 'none', boxShadow: '0 4px 14px rgba(0,0,0,.35)', whiteSpace: 'normal', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>
          {text}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1E293B' }} />
        </div>
      )}
    </span>
  );
};

const SectionHeader: FC<{ label: string; count?: number; open: boolean; onToggle: () => void }> = ({ label, count, open, onToggle }) => (
  <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: open ? '#F5F3FF' : '#F8FAFC', border: 'none', borderTop: '1px solid #E2E8F0', padding: '7px 12px', cursor: 'pointer', userSelect: 'none' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: open ? '#6D28D9' : '#64748B' }}>{label}</span>
      {(count ?? 0) > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: '#6D28D9', color: 'white' }}>{count}</span>}
    </div>
    {open ? <ChevronUp size={11} style={{ color: '#6D28D9' }} /> : <ChevronDown size={11} style={{ color: '#94A3B8' }} />}
  </button>
);

const FL: FC<{ children: React.ReactNode; tip?: string }> = ({ children, tip }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#94A3B8' }}>{children}</span>
    {tip && <Tip text={tip} />}
  </div>
);

function chipStyle(mandatory: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 5px', borderRadius: 4, fontSize: 9, fontWeight: 600, border: '1px solid', ...(mandatory ? { background: '#FFF9C4', color: '#92400E', borderColor: '#FCD34D' } : { background: '#EDE9FE', color: '#5B21B6', borderColor: '#C4B5FD' }) };
}

const DropList: FC<{ items: string[]; onPick: (s: string) => void }> = ({ items, onPick }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2, background: 'white', border: '1px solid #E2E8F0', borderRadius: 7, boxShadow: '0 4px 14px rgba(0,0,0,.09)', zIndex: 100, maxHeight: 160, overflowY: 'auto' }}>
    {items.map(s => (
      <button key={s} type="button" onMouseDown={e => { e.preventDefault(); onPick(s); }}
        style={{ display: 'block', width: '100%', padding: '5px 10px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 10, color: '#0F172A', lineHeight: 1.4 }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
        {s}
      </button>
    ))}
  </div>
);

// ── Single-value autocomplete text input ──────────────────────────────────────
const AcText: FC<{ value: string; onChange: (v: string) => void; placeholder: string; suggs: string[]; onQ: (q: string) => void }> = ({ value, onChange, placeholder, suggs, onQ }) => {
  const [show, setShow] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShow(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = suggs.filter(s => s.toLowerCase() !== value.toLowerCase());
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 30, border: '1px solid #E2E8F0', borderRadius: 6, background: '#FAFAFA', padding: '0 8px' }}>
        <input ref={inputRef} value={value}
          onChange={e => { onChange(e.target.value); onQ(e.target.value); setShow(true); }}
          onFocus={() => { if (value.length >= 1) setShow(true); }}
          onKeyDown={e => { if (e.key === 'Escape') setShow(false); if (e.key === 'Enter' && filtered.length > 0) { onChange(filtered[0]); onQ(''); setShow(false); } }}
          placeholder={placeholder}
          style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 10, color: '#0F172A', padding: 0 }}
        />
        {value && <button type="button" onClick={() => { onChange(''); onQ(''); setShow(false); inputRef.current?.focus(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#94A3B8' }}><X size={10} /></button>}
      </div>
      {show && filtered.length > 0 && <DropList items={filtered} onPick={s => { onChange(s); onQ(''); setShow(false); }} />}
    </div>
  );
};

// ── Multi-value tag input with suggestions and ★ ─────────────────────────────
const TagIn: FC<{ tags: SearchTag[]; onChange: (t: SearchTag[]) => void; placeholder: string; allowM?: boolean; suggs?: string[]; onQ?: (q: string) => void }> = ({ tags, onChange, placeholder, allowM = false, suggs = [], onQ }) => {
  const [inp, setInp] = useState('');
  const [show, setShow] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShow(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const add = useCallback((v: string) => {
    const val = v.trim();
    if (!val || tags.some(t => t.value.toLowerCase() === val.toLowerCase())) { setInp(''); onQ?.(''); setShow(false); return; }
    onChange([...tags, { value: val, mandatory: false }]); setInp(''); onQ?.(''); setShow(false);
  }, [tags, onChange, onQ]);
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inp) { e.preventDefault(); add(inp); }
    if (e.key === 'Backspace' && !inp && tags.length) onChange(tags.slice(0, -1));
    if (e.key === 'Escape') setShow(false);
  };
  const toggleM = (i: number) => { if (!allowM) return; onChange(tags.map((t, idx) => idx === i ? { ...t, mandatory: !t.mandatory } : t)); };
  const filtered = suggs.filter(s => !tags.some(t => t.value.toLowerCase() === s.toLowerCase()));
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '5px 8px', border: '1px solid #E2E8F0', borderRadius: 7, background: '#FAFAFA', minHeight: 32, cursor: 'text', alignItems: 'center' }}
        onClick={() => inputRef.current?.focus()}>
        {tags.map((t, i) => (
          <span key={i} style={chipStyle(t.mandatory)}>
            {allowM && <button type="button" onClick={() => toggleM(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 9, color: t.mandatory ? '#D97706' : '#7C3AED', lineHeight: 1 }}>{t.mandatory ? '★' : '☆'}</button>}
            <span onClick={() => allowM && toggleM(i)} style={{ cursor: allowM ? 'pointer' : 'default' }}>{t.value}</span>
            <button type="button" onClick={e => { e.stopPropagation(); onChange(tags.filter((_, idx) => idx !== i)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit', opacity: 0.55 }}><X size={8} /></button>
          </span>
        ))}
        <input ref={inputRef} value={inp}
          onChange={e => { setInp(e.target.value); onQ?.(e.target.value); setShow(true); }}
          onKeyDown={onKey} onFocus={() => { if (filtered.length > 0) setShow(true); }}
          placeholder={tags.length ? '' : placeholder}
          style={{ flex: 1, minWidth: 60, border: 'none', background: 'none', outline: 'none', fontSize: 10, color: '#0F172A', padding: 0 }}
        />
      </div>
      {show && filtered.length > 0 && <DropList items={filtered} onPick={add} />}
    </div>
  );
};

// ── SkillChipBuilder — active-mode legend sets mode for new chips ─────────────
const SkillBuilder: FC<{ chips: ZxSkillChip[]; onChange: (c: ZxSkillChip[]) => void; suggs: string[]; onQ: (q: string) => void }> = ({ chips, onChange, suggs, onQ }) => {
  const [activeMode, setActiveMode] = useState<SkillMode>('must');
  const [inp, setInp] = useState('');
  const [show, setShow] = useState(false);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShow(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const add = useCallback((v: string, m = activeMode) => {
    const val = v.trim();
    if (!val || chips.some(c => c.label.toLowerCase() === val.toLowerCase())) { setInp(''); onQ(''); setShow(false); return; }
    onChange([...chips, { label: val, mode: m }]); setInp(''); onQ(''); setShow(false);
  }, [chips, onChange, onQ, activeMode]);
  const cycleMode = (i: number) => { const next = SKILL_CYCLE[(SKILL_CYCLE.indexOf(chips[i].mode) + 1) % 3]; onChange(chips.map((c, idx) => idx === i ? { ...c, mode: next } : c)); };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inp) { e.preventDefault(); add(inp); }
    if (e.key === 'Backspace' && !inp && chips.length) onChange(chips.slice(0, -1));
    if (e.key === 'Escape') setShow(false);
  };
  const filtered = suggs.filter(s => !chips.some(c => c.label.toLowerCase() === s.toLowerCase()));
  const counts = { must: chips.filter(c => c.mode === 'must').length, nice: chips.filter(c => c.mode === 'nice').length, exclude: chips.filter(c => c.mode === 'exclude').length };
  return (
    <div>
      {/* Legend — click to set active mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 8, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>New as:</span>
        {SKILL_CYCLE.map(m => (
          <button key={m} type="button" onClick={() => setActiveMode(m)}
            title={`New chips will be added as "${m}"`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 600, border: `1.5px solid`, cursor: 'pointer', transition: 'all 0.12s', outline: activeMode === m ? '2px solid' : 'none', outlineOffset: 2, outlineColor: 'currentColor', opacity: activeMode === m ? 1 : 0.45, ...CHIP_STYLES[m] }}>
            {CHIP_ICONS[m]} {m === 'must' ? 'Must' : m === 'nice' ? 'Nice' : 'Excl'}
            {activeMode === m && <span style={{ fontSize: 7 }}>◀</span>}
          </button>
        ))}
      </div>
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '5px 8px', border: '1px solid #E2E8F0', borderRadius: 7, background: '#FAFAFA', minHeight: 32, cursor: 'text', alignItems: 'center' }}
          onClick={() => { inputRef.current?.focus(); setShow(true); }}>
          {chips.map((c, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, border: '1px solid', cursor: 'pointer', userSelect: 'none', ...CHIP_STYLES[c.mode] }}
              onClick={() => cycleMode(i)} title={`${c.mode} — click to cycle`}>
              <span style={{ fontSize: 8 }}>{CHIP_ICONS[c.mode]}</span>
              <span>{c.label}</span>
              <button type="button" onClick={e => { e.stopPropagation(); onChange(chips.filter((_, idx) => idx !== i)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit', opacity: 0.55 }}><X size={8} /></button>
            </span>
          ))}
          <input ref={inputRef} value={inp}
            onChange={e => { setInp(e.target.value); onQ(e.target.value); setShow(true); }}
            onKeyDown={onKey} onFocus={() => setShow(true)}
            placeholder={chips.length ? '' : 'Type skill + Enter  (click legend to set mode)'}
            style={{ flex: 1, minWidth: 80, border: 'none', background: 'none', outline: 'none', fontSize: 10, color: '#0F172A', padding: 0 }}
          />
        </div>
        {show && filtered.length > 0 && <DropList items={filtered} onPick={s => add(s, activeMode)} />}
      </div>
      {chips.length > 0 && (
        <div style={{ marginTop: 4, fontSize: 9, color: '#94A3B8' }}>
          {counts.must > 0 && <span style={{ color: '#991B1B' }}>{counts.must} must</span>}
          {counts.must > 0 && counts.nice > 0 && <span>  ·  </span>}
          {counts.nice > 0 && <span style={{ color: '#5B21B6' }}>{counts.nice} nice</span>}
          {counts.nice > 0 && counts.exclude > 0 && <span>  ·  </span>}
          {counts.exclude > 0 && <span style={{ color: '#64748B' }}>{counts.exclude} excluded</span>}
        </div>
      )}
    </div>
  );
};

// ── Location with country-state-city library ──────────────────────────────────
const LocIn: FC<{ tags: SearchTag[]; onChange: (t: SearchTag[]) => void }> = ({ tags, onChange }) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const sel = tags.map(t => t.value);
  const suggs = useMemo(() => {
    const ql = q.trim().toLowerCase(); if (!ql) return [];
    const res: { v: string; t: 'C' | 'S' | 'T' }[] = [];
    Country.getAllCountries().filter(c => c.name.toLowerCase().includes(ql) && !sel.includes(c.name)).slice(0, 3).forEach(c => res.push({ v: c.name, t: 'C' }));
    State.getAllStates().filter(s => s.name.toLowerCase().includes(ql) && !sel.includes(s.name)).slice(0, 3).forEach(s => res.push({ v: s.name, t: 'S' }));
    if (ql.length >= 3) City.getAllCities().filter(c => c.name.toLowerCase().includes(ql) && !sel.includes(c.name)).slice(0, 4).forEach(c => res.push({ v: c.name, t: 'T' }));
    return res.slice(0, 10);
  }, [q, sel.join(',')]);
  const add = (v: string) => { if (!sel.includes(v)) onChange([...tags, { value: v, mandatory: false }]); setQ(''); setOpen(false); setTimeout(() => inputRef.current?.focus(), 50); };
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
              <button type="button" onClick={() => tM(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 9, color: t.mandatory ? '#D97706' : '#7C3AED', lineHeight: 1 }}>{t.mandatory ? '★' : '☆'}</button>
              <span onClick={() => tM(i)} style={{ cursor: 'pointer' }}>{t.value}</span>
              <button type="button" onClick={e => { e.stopPropagation(); rm(i); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'inherit', opacity: 0.55 }}><X size={8} /></button>
            </span>
          ))}
        </div>
      )}
      <div onClick={() => { setOpen(true); inputRef.current?.focus(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', border: '1px solid #E2E8F0', borderRadius: 7, background: '#FAFAFA', minHeight: 32, cursor: 'text' }}>
        <MapPin size={10} style={{ color: '#94A3B8', flexShrink: 0 }} />
        <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false); if (e.key === 'Enter' && q.trim()) { e.preventDefault(); suggs.length > 0 ? add(suggs[0].v) : add(q.trim()); } }}
          placeholder="Country, state or city…" style={{ flex: 1, minWidth: 60, border: 'none', background: 'none', outline: 'none', fontSize: 10, color: '#0F172A', padding: 0 }}
        />
        {q && <button type="button" onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}><X size={9} style={{ color: '#94A3B8' }} /></button>}
      </div>
      {open && suggs.length > 0 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2, background: 'white', border: '1px solid #E2E8F0', borderRadius: 7, boxShadow: '0 4px 14px rgba(0,0,0,.09)', zIndex: 100, maxHeight: 180, overflowY: 'auto' }}>
          {suggs.map(s => (
            <button key={s.v} type="button" onMouseDown={e => { e.preventDefault(); add(s.v); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 10, textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3, color: TC[s.t], background: TB[s.t] }}>{s.t}</span>
              {s.v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ExpSel: FC<{ v: string; onChange: (v: string) => void; label: string }> = ({ v, onChange, label }) => (
  <div style={{ flex: 1 }}>
    <FL>{label}</FL>
    <select value={v} onChange={e => onChange(e.target.value)} style={{ width: '100%', height: 28, border: '1px solid #E2E8F0', borderRadius: 6, background: '#FAFAFA', fontSize: 10, color: '#0F172A', padding: '0 8px', outline: 'none', cursor: 'pointer' }}>
      {EXP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const CtcIn: FC<{ v: string; onChange: (v: string) => void; label: string }> = ({ v, onChange, label }) => (
  <div style={{ flex: 1 }}>
    <FL>{label}</FL>
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#94A3B8' }}>₹</span>
      <input type="number" value={v} onChange={e => onChange(e.target.value)} placeholder="—" style={{ width: '100%', height: 28, border: '1px solid #E2E8F0', borderRadius: 6, background: '#FAFAFA', fontSize: 10, color: '#0F172A', paddingLeft: 18, paddingRight: 6, outline: 'none', boxSizing: 'border-box' }} />
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
interface ZiveXSearchSidebarProps {
  onSearch: (filters: SearchFilters) => void; onReset?: () => void;
  isSearching?: boolean; initialFilters?: Partial<SearchFilters>; organizationId: string;
}

const ZiveXSearchSidebar: FC<ZiveXSearchSidebarProps> = ({ onSearch, onReset, isSearching, initialFilters = {}, organizationId }) => {
  const [open, setOpen] = useState<Record<string, boolean>>({ core: true, skills: false, past: false, edu: false, avail: false });
  const tog = (k: string) => setOpen(s => ({ ...s, [k]: !s[k] }));

  const [keywords,     setKeywords]     = useState<SearchTag[]>([]);
  const [currTitle,    setCurrTitle]     = useState('');
  const [currCompany,  setCurrCompany]   = useState('');
  const [minExp,       setMinExp]        = useState('');
  const [maxExp,       setMaxExp]        = useState('');
  const [locations,    setLocations]     = useState<SearchTag[]>([]);
  const [skillChips,   setSkillChips]    = useState<ZxSkillChip[]>([]);
  const [prevTitles,   setPrevTitles]    = useState<SearchTag[]>([]);
  const [prevCos,      setPrevCos]       = useState<SearchTag[]>([]);
  const [coCount,      setCoCount]       = useState('');
  const [degree,       setDegree]        = useState('');
  const [institutions, setInstitutions]  = useState<SearchTag[]>([]);
  const [noticePeriods,setNoticePeriods] = useState<string[]>([]);
  const [minCCTC,      setMinCCTC]       = useState('');
  const [maxCCTC,      setMaxCCTC]       = useState('');
  const [minECTC,      setMinECTC]       = useState('');
  const [maxECTC,      setMaxECTC]       = useState('');

  const [titleQ,      setTitleQ]      = useState('');
  const [companyQ,    setCompanyQ]    = useState('');
  const [skillQ,      setSkillQ]      = useState('');
  const [prevTitleQ,  setPrevTitleQ]  = useState('');
  const [prevCoQ,     setPrevCoQ]     = useState('');
  const [degreeQ,     setDegreeQ]     = useState('');
  const [instQ,       setInstQ]       = useState('');

  const titleSugg     = useDBSuggestions('get_designation_suggestions',   organizationId, titleQ);
  const companySugg   = useDBSuggestions('get_company_suggestions',        organizationId, companyQ);
  const skillSugg     = useDBSuggestions('get_org_skills_by_search',       organizationId, skillQ);
  const prevTitleSugg = useDBSuggestions('get_designation_suggestions',   organizationId, prevTitleQ);
  const prevCoSugg    = useDBSuggestions('get_company_suggestions',        organizationId, prevCoQ);
  const degreeSugg    = useDBSuggestions('get_qualification_suggestions',  organizationId, degreeQ);
  const instSugg      = useDBSuggestions('get_institution_suggestions',    organizationId, instQ);

  useEffect(() => {
    const f = initialFilters; if (!f || !Object.keys(f).length) return;
    if (f.keywords?.length) setKeywords(f.keywords);
    if (f.current_designation) setCurrTitle(f.current_designation);
    if (f.current_company) setCurrCompany(f.current_company);
    if (f.min_exp != null) setMinExp(String(f.min_exp));
    if (f.max_exp != null) setMaxExp(String(f.max_exp));
    if (f.locations?.length) setLocations(f.locations);
    const must = (f.skills||[]).filter(t => t.mandatory).map(t => ({ label: t.value, mode: 'must' as SkillMode }));
    const nice = (f.skills||[]).filter(t => !t.mandatory).map(t => ({ label: t.value, mode: 'nice' as SkillMode }));
    const excl = (f.excluded_skills||[]).map(v => ({ label: v, mode: 'exclude' as SkillMode }));
    if (must.length||nice.length||excl.length) { setSkillChips([...must,...nice,...excl]); setOpen(s => ({...s, skills: true})); }
    if (f.previous_titles?.length) { setPrevTitles(f.previous_titles); setOpen(s => ({...s, past: true})); }
    if (f.previous_companies?.length) { setPrevCos(f.previous_companies); setOpen(s => ({...s, past: true})); }
    if (f.companies_count_min != null || f.companies_count_max != null) {
      const mn = f.companies_count_min, mx = f.companies_count_max;
      if (mn===1&&mx===1) setCoCount('1'); else if (mn===2&&mx===3) setCoCount('2-3'); else if (mn===4&&mx===5) setCoCount('4-5'); else if (mn===5) setCoCount('5+');
    }
    if (f.degree) { setDegree(f.degree); setOpen(s => ({...s, edu: true})); }
    if (f.institutions?.length) { setInstitutions(f.institutions); setOpen(s => ({...s, edu: true})); }
    if (f.notice_periods?.length) { setNoticePeriods(f.notice_periods); setOpen(s => ({...s, avail: true})); }
    if (f.min_current_salary != null) setMinCCTC(String(f.min_current_salary));
    if (f.max_current_salary != null) setMaxCCTC(String(f.max_current_salary));
    if (f.min_expected_salary != null) setMinECTC(String(f.min_expected_salary));
    if (f.max_expected_salary != null) setMaxECTC(String(f.max_expected_salary));
  }, [JSON.stringify(initialFilters)]);

  const coreCount   = (keywords.length?1:0)+(currTitle?1:0)+(currCompany?1:0)+((minExp||maxExp)?1:0)+(locations.length?1:0);
  const skillCount  = skillChips.length;
  const pastCount   = (prevTitles.length?1:0)+(prevCos.length?1:0)+(coCount?1:0);
  const eduCount    = (degree?1:0)+(institutions.length?1:0);
  const availCount  = (noticePeriods.length?1:0)+((minCCTC||maxCCTC)?1:0)+((minECTC||maxECTC)?1:0);
  const totalActive = coreCount+skillCount+pastCount+eduCount+availCount;

  const resetAll = () => {
    setKeywords([]); setCurrTitle(''); setCurrCompany(''); setMinExp(''); setMaxExp(''); setLocations([]);
    setSkillChips([]); setSkillQ(''); setPrevTitles([]); setPrevCos([]); setCoCount('');
    setDegree(''); setInstitutions([]); setNoticePeriods([]); setMinCCTC(''); setMaxCCTC(''); setMinECTC(''); setMaxECTC('');
    setOpen({ core: true, skills: false, past: false, edu: false, avail: false }); onReset?.();
  };

  const handleSearch = () => {
    const mustS = skillChips.filter(c => c.mode==='must').map(c => ({ value: c.label, mandatory: true }));
    const niceS = skillChips.filter(c => c.mode==='nice').map(c => ({ value: c.label, mandatory: false }));
    const exclS = skillChips.filter(c => c.mode==='exclude').map(c => c.label);
    const { min: ccMin, max: ccMax } = parseCoCount(coCount);
    onSearch({
      ...(keywords.length             && { keywords }),
      ...(currTitle.trim()            && { current_designation: currTitle.trim() }),
      ...(currCompany.trim()          && { current_company: currCompany.trim() }),
      ...(minExp                      && { min_exp: Number(minExp) }),
      ...(maxExp                      && { max_exp: Number(maxExp) }),
      ...(locations.length            && { locations }),
      ...([...mustS,...niceS].length  && { skills: [...mustS,...niceS] }),
      ...(exclS.length                && { excluded_skills: exclS }),
      ...(prevTitles.length           && { previous_titles: prevTitles }),
      ...(prevCos.length              && { previous_companies: prevCos }),
      ...(ccMin != null               && { companies_count_min: ccMin }),
      ...(ccMax != null               && { companies_count_max: ccMax }),
      ...(degree                      && { degree }),
      ...(institutions.length         && { institutions }),
      ...(noticePeriods.length        && { notice_periods: noticePeriods }),
      ...(minCCTC                     && { min_current_salary:  Number(minCCTC) }),
      ...(maxCCTC                     && { max_current_salary:  Number(maxCCTC) }),
      ...(minECTC                     && { min_expected_salary: Number(minECTC) }),
      ...(maxECTC                     && { max_expected_salary: Number(maxECTC) }),
    });
  };

  return (
    <div onKeyDown={e => { if (e.key==='Enter'&&e.ctrlKey) handleSearch(); }}
      style={{ display: 'flex', flexDirection: 'column', width: 272, flexShrink: 0, background: 'white', borderRight: '1px solid #E2E8F0', height: '100%', overflow: 'hidden' }}>

      <div style={{ flexShrink: 0, padding: '11px 14px 9px', borderBottom: '1px solid #E2E8F0', background: 'linear-gradient(135deg,#1E1B4B,#312E81)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', color: 'white', textTransform: 'uppercase' }}>
            Zive-X Filters
            {totalActive > 0 && <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 6px', borderRadius: 99, background: '#6D28D9', color: 'white' }}>{totalActive}</span>}
          </span>
          {totalActive > 0 && <button onClick={resetAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A78BFA', display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 600, padding: 0 }}><RotateCcw size={10} /> Reset</button>}
        </div>
        <button onClick={handleSearch} disabled={isSearching}
          style={{ width: '100%', height: 32, borderRadius: 7, border: 'none', background: isSearching ? '#4C1D95' : '#7C3AED', color: 'white', fontSize: 11, fontWeight: 700, cursor: isSearching ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Search size={12} />{isSearching ? 'Searching…' : 'Search Candidates'}
        </button>
        <div style={{ marginTop: 5, fontSize: 8, color: '#A78BFA', textAlign: 'center' }}>Ctrl+Enter  ·  ★ required  ·  ☆ optional</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        <SectionHeader label="Core" count={coreCount} open={open.core} onToggle={() => tog('core')} />
        {open.core && (
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><FL tip="Full-text search across resume, title, skills. ★ = required in all results.">Keywords</FL><TagIn tags={keywords} onChange={setKeywords} placeholder="Type + Enter" allowM /></div>
            <div><FL tip="Current designation from talent pool — suggestions as you type.">Current Title</FL><AcText value={currTitle} onChange={setCurrTitle} placeholder="e.g. Senior Developer" suggs={titleSugg} onQ={setTitleQ} /></div>
            <div><FL tip="Current employer — suggestions from your org's talent pool.">Current Company</FL><AcText value={currCompany} onChange={setCurrCompany} placeholder="e.g. Infosys, TCS" suggs={companySugg} onQ={setCompanyQ} /></div>
            <div><FL tip="Filter by total years of experience.">Experience</FL><div style={{ display: 'flex', gap: 6 }}><ExpSel v={minExp} onChange={setMinExp} label="Min" /><ExpSel v={maxExp} onChange={setMaxExp} label="Max" /></div></div>
            <div><FL tip="Filter by city, state or country. ★ = required.">Location</FL><LocIn tags={locations} onChange={setLocations} /></div>
          </div>
        )}

        <SectionHeader label="Skills" count={skillCount} open={open.skills} onToggle={() => tog('skills')} />
        {open.skills && (
          <div style={{ padding: '10px 12px' }}>
            <FL tip="Click legend to set mode for new chips. Click existing chip to cycle mode. ✓ hard filter · ~ boosts score · ✕ removes from results.">Skill Tags</FL>
            <SkillBuilder chips={skillChips} onChange={setSkillChips} suggs={skillSugg} onQ={setSkillQ} />
          </div>
        )}

        <SectionHeader label="Past Experience" count={pastCount} open={open.past} onToggle={() => tog('past')} />
        {open.past && (
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><FL tip="Search all previous job titles. ★ = must have held this title.">Previous Titles</FL><TagIn tags={prevTitles} onChange={setPrevTitles} placeholder="Type + Enter" allowM suggs={prevTitleSugg} onQ={setPrevTitleQ} /></div>
            <div><FL tip="Search previous employers. ★ = must have worked there.">Previous Companies</FL><TagIn tags={prevCos} onChange={setPrevCos} placeholder="Type + Enter" allowM suggs={prevCoSugg} onQ={setPrevCoQ} /></div>
            <div>
              <FL tip="Filter by total number of distinct companies.">Companies Count</FL>
              <select value={coCount} onChange={e => setCoCount(e.target.value)} style={{ width: '100%', height: 28, border: '1px solid #E2E8F0', borderRadius: 6, background: '#FAFAFA', fontSize: 10, color: '#0F172A', padding: '0 8px', outline: 'none', cursor: 'pointer' }}>
                {CO_COUNT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        )}

        <SectionHeader label="Education" count={eduCount} open={open.edu} onToggle={() => tog('edu')} />
        {open.edu && (
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><FL tip="Type to search degree names from your talent pool. Select for exact match filter.">Qualification / Degree</FL><AcText value={degree} onChange={setDegree} placeholder="e.g. B.Tech, MBA…" suggs={degreeSugg} onQ={setDegreeQ} /></div>
            <div><FL tip="University or college — suggestions from talent pool. Multiple with Enter.">Institution</FL><TagIn tags={institutions} onChange={setInstitutions} placeholder="Type + Enter" suggs={instSugg} onQ={setInstQ} /></div>
          </div>
        )}

        <SectionHeader label="Availability" count={availCount} open={open.avail} onToggle={() => tog('avail')} />
        {open.avail && (
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <FL tip="How soon can the candidate join?">Notice Period</FL>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {NOTICE_OPTIONS.map(np => { const a = noticePeriods.includes(np); return (
                  <button key={np} type="button" onClick={() => setNoticePeriods(prev => a ? prev.filter(p => p !== np) : [...prev, np])}
                    style={{ padding: '3px 9px', borderRadius: 99, fontSize: 9, fontWeight: 600, border: '1px solid', cursor: 'pointer', ...(a ? { background: '#EDE9FE', color: '#5B21B6', borderColor: '#C4B5FD' } : { background: 'white', color: '#64748B', borderColor: '#E2E8F0' }) }}>
                    {np}
                  </button>
                ); })}
              </div>
            </div>
            <div><FL tip="Current salary in lakhs. 5 = ₹5L per annum.">Current CTC (₹L)</FL><div style={{ display: 'flex', gap: 6 }}><CtcIn v={minCCTC} onChange={setMinCCTC} label="Min" /><CtcIn v={maxCCTC} onChange={setMaxCCTC} label="Max" /></div></div>
            <div><FL tip="Expected salary in lakhs.">Expected CTC (₹L)</FL><div style={{ display: 'flex', gap: 6 }}><CtcIn v={minECTC} onChange={setMinECTC} label="Min" /><CtcIn v={maxECTC} onChange={setMaxECTC} label="Max" /></div></div>
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
};

export default ZiveXSearchSidebar;