// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ContactHeroPanel.tsx
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Mail, Phone, Linkedin, Globe, Twitter, Facebook,
  MapPin, Clock, Award, Sparkles, Loader2, Check, X,
  Pencil, Copy, Plus, ChevronDown, RefreshCw, ChevronLeft,
  PhoneCall, StickyNote, Calendar, CheckSquare, ListPlus,
  Zap, AlertCircle, Star, Flag, Trash2, ExternalLink,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { extractFromRaw } from '@/utils/dataExtractor';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useContactStages } from '@/hooks/sales/useContactStages';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parsePhoneNumber } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import { Country, State, City } from 'country-state-city';

// Re-exported types
type ActivityModalType = 'call' | 'note' | 'email' | 'task' | 'meeting' | 'linkedin' | null;

interface Props {
  contact: any;
  onFieldSave: (field: string, value: any) => Promise<void>;
  onEnrich: () => void;
  onRequestPhone: () => void;
  onOpenModal: (type: ActivityModalType) => void;
  onAddToList: () => void;
  onBack: () => void;
  isEnriching: boolean;
  isRequestingPhone: boolean;
  phonePending: boolean;
  isSaving: boolean;
}

// ── Inline editable field ─────────────────────────────────────────────────────
const InlineEdit: React.FC<{
  value: string;
  onSave: (v: string) => void;
  isSaving?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}> = ({ value, onSave, isSaving, placeholder, className, inputClassName }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = async () => { if (draft.trim() !== value) await onSave(draft.trim()); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className={cn('group flex items-center gap-1 text-left hover:opacity-75 transition-opacity', className)}>
        <span className={value ? '' : 'text-slate-300 italic text-xs'}>{value || placeholder}</span>
        <Pencil size={8} className="opacity-0 group-hover:opacity-40 transition-opacity text-slate-400 flex-shrink-0" />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <div className="rounded-md p-[1px] bg-gradient-to-r from-purple-500 to-indigo-500">
        <input ref={ref} value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
          className={cn('bg-white rounded-[5px] px-2 py-0.5 focus:outline-none text-xs', inputClassName)}
        />
      </div>
      <button onClick={commit} disabled={isSaving} className="p-0.5 rounded bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        {isSaving ? <Loader2 size={8} className="animate-spin" /> : <Check size={8} />}
      </button>
      <button onClick={cancel} className="p-0.5 rounded bg-gray-100 text-gray-500"><X size={8} /></button>
    </div>
  );
};

// ── Stage dropdown (portal) ───────────────────────────────────────────────────
const StageDropdown: React.FC<{ current: string | null; onSelect: (s: string) => void; isSaving: boolean }> = ({ current, onSelect, isSaving }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const { data: stages = [] } = useContactStages();

  useEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, zIndex: 99999, minWidth: Math.max(r.width, 180) });
  }, [open]);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!(e.target as Element).closest('[data-stage-dd]')) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const currentStage = stages.find(s => s.name === current);
  const dotColor = currentStage?.color || '#94a3b8';

  return (
    <div data-stage-dd>
      <button ref={ref} onClick={() => setOpen(v => !v)}
        className="
  flex items-center justify-center w-full
  gap-1 text-[10px] font-semibold px-2 py-1
  rounded-full border transition-all hover:opacity-80
"
        style={currentStage ? { backgroundColor: dotColor + '18', color: dotColor, borderColor: dotColor + '40' } : { backgroundColor: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' }}
      >
        {isSaving ? <Loader2 size={8} className="animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />}
        {current || 'Set Stage'}
        <ChevronDown size={8} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && ReactDOM.createPortal(
        <div style={style} className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden py-1 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
          {stages.map(s => (
            <button key={s.id} onMouseDown={e => { e.preventDefault(); onSelect(s.name); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-left hover:bg-slate-50">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || '#94a3b8' }} />
              <span style={{ color: current === s.name ? (s.color || '#7c3aed') : '#374151' }}>{s.name}</span>
              {current === s.name && <Check size={9} className="ml-auto" style={{ color: s.color || '#7c3aed' }} />}
            </button>
          ))}
          {stages.length === 0 && <div className="px-3 py-2 text-[10px] text-slate-400">No stages configured</div>}
        </div>,
        document.body
      )}
    </div>
  );
};

// ── Phone flag ────────────────────────────────────────────────────────────────
const PhoneFlag: React.FC<{ number: string }> = ({ number }) => {
  if (!number) return <Globe size={10} className="text-slate-400" />;
  try {
    const parsed = parsePhoneNumber(number);
    if (parsed?.country) {
      const F = (flags as any)[parsed.country];
      return F ? <F title={parsed.country} className="w-4 h-3 rounded-[1px]" /> : <Globe size={10} />;
    }
  } catch {}
  return <Globe size={10} />;
};

// ── Social icon button — click opens URL, no edit inline ──────────────────────
const SocialIconBtn: React.FC<{
  url: string | null;
  icon: React.ElementType;
  label: string;
  iconColor?: string;
  bgColor?: string;
  onEdit: () => void;
}> = ({ url, icon: Icon, label, iconColor = 'text-slate-500', bgColor = 'bg-slate-100', onEdit }) => {
  const { toast } = useToast();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative group">
            <button
              onClick={() => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); else onEdit(); }}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-md transition-all',
                url
                  ? cn(bgColor, 'hover:opacity-80 cursor-pointer')
                  : 'bg-slate-50 border border-dashed border-slate-200 text-slate-300 hover:border-slate-400 cursor-pointer'
              )}
            >
              <Icon size={11} className={url ? iconColor : 'text-slate-300'} />
            </button>
            {/* Edit pencil on hover */}
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-white border border-slate-200 rounded-full items-center justify-center hidden group-hover:flex shadow-sm"
            >
              <Pencil size={7} className="text-slate-500" />
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{url ? `Open ${label}` : `Add ${label}`}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ── Social edit modal ────────────────────────────────────────────────────────
const SocialEditModal: React.FC<{
  open: boolean;
  onClose: () => void;
  label: string;
  value: string;
  onSave: (v: string) => void;
  isSaving?: boolean;
  placeholder?: string;
}> = ({ open, onClose, label, value, onSave, isSaving, placeholder }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);
  if (!open) return null;
  const commit = () => { onSave(draft.trim()); onClose(); };
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/30"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl border-0 w-[320px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center gap-2">
          <Pencil size={13} className="text-white/80" />
          <p className="text-xs font-bold text-white">Edit {label}</p>
        </div>
        <div className="p-4 space-y-3">
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onClose(); }}
            placeholder={placeholder || `Enter ${label} URL`}
            className="w-full h-8 px-3 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20"
          />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-8 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={commit} disabled={isSaving} className="flex-1 h-8 text-xs rounded-lg text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90">
              {isSaving ? <Loader2 size={10} className="animate-spin mx-auto" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Location compact chips (reused from existing LocationFieldsGroup) ─────────
const LocationChips: React.FC<{
  city: string; state: string; country: string;
  onSave: (field: string, value: string) => Promise<void>;
  isSaving?: boolean;
}> = ({ city, state, country, onSave, isSaving }) => {
  const [editField, setEditField] = useState<'city' | 'state' | 'country' | null>(null);
  const [query, setQuery] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});

  const allCountries = React.useMemo(() => Country.getAllCountries(), []);
  const allStates    = React.useMemo(() => country ? State.getStatesOfCountry(allCountries.find(c => c.name === country)?.isoCode || '') : [], [country, allCountries]);
  const allCities    = React.useMemo(() => {
    if (!state || !country) return [];
    const cc = allCountries.find(c => c.name === country)?.isoCode || '';
    const sc = allStates.find(s => s.name === state)?.isoCode || '';
    return City.getCitiesOfState(cc, sc);
  }, [state, country, allCountries, allStates]);

  const options = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    if (editField === 'country') return allCountries.filter(c => c.name.toLowerCase().includes(q)).slice(0, 30);
    if (editField === 'state')   return allStates.filter(s => s.name.toLowerCase().includes(q)).slice(0, 30);
    if (editField === 'city')    return allCities.filter(c => c.name.toLowerCase().includes(q)).slice(0, 30);
    return [];
  }, [editField, query, allCountries, allStates, allCities]);

  const openField = (field: 'city' | 'state' | 'country') => {
    setEditField(field); setQuery(''); setDropOpen(true);
    setTimeout(() => {
      if (anchorRef.current) {
        const r = anchorRef.current.getBoundingClientRect();
        setDropStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, width: Math.max(r.width, 200), zIndex: 99999 });
      }
    }, 10);
  };
  const selectOption = async (name: string) => {
    if (editField) await onSave(editField, name);
    setDropOpen(false); setEditField(null); setQuery('');
  };
  const close = () => { setDropOpen(false); setEditField(null); setQuery(''); };

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!(e.target as Element).closest('[data-loc-hero]')) close(); };
    if (dropOpen) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [dropOpen]);

  const parts = [country, state, city].filter(Boolean);

  return (
    <div data-loc-hero ref={anchorRef} className="flex items-center gap-1 flex-wrap">
      <MapPin size={10} className="text-slate-400 flex-shrink-0" />
      {parts.length === 0 ? (
        <button onClick={() => openField('country')} className="text-[10px] text-slate-300 italic hover:text-purple-500 transition-colors">Add location</button>
      ) : (
        <div className="flex items-center gap-0.5 flex-wrap">
          {[
            { field: 'country' as const, val: country },
            country && { field: 'state' as const, val: state },
            state && { field: 'city' as const, val: city },
          ].filter(Boolean).map((item: any, i) => (
            <React.Fragment key={item.field}>
              {i > 0 && <span className="text-slate-300 text-[10px]">·</span>}
              <button onClick={() => openField(item.field)}
                className="group/seg flex items-center gap-0.5 text-[10px] text-slate-600 hover:text-purple-600 transition-colors">
                {item.val || <span className="italic text-slate-300">{item.field}</span>}
                <Pencil size={7} className="opacity-0 group-hover/seg:opacity-40 transition-opacity text-slate-400" />
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {dropOpen && ReactDOM.createPortal(
        <div style={dropStyle} data-loc-hero className="bg-white rounded-xl border border-slate-200 shadow-xl ring-1 ring-black/5 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="rounded-lg p-[1px] bg-gradient-to-r from-purple-500 to-indigo-500">
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${editField}…`}
                className="w-full bg-white rounded-[7px] px-2 py-1 text-xs focus:outline-none" />
            </div>
          </div>
          <div className="max-h-[180px] overflow-y-auto">
            {options.length === 0
              ? <div className="py-3 text-center text-[11px] text-slate-400">No results</div>
              : options.map((opt: any) => (
                <button key={opt.isoCode || opt.name} onMouseDown={e => { e.preventDefault(); selectOption(opt.name); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-slate-700 hover:bg-violet-50 flex items-center gap-2">
                  {opt.flag && <span className="text-sm">{opt.flag}</span>}
                  {opt.name}
                </button>
              ))
            }
          </div>
          <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/80">
            <button onClick={close} className="text-[10px] text-slate-400 hover:text-slate-600 w-full text-center">Cancel</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ── useContactAvailability ────────────────────────────────────────────────────
const useContactAvailability = (apolloPersonId: string | null | undefined) => {
  return useQuery({
    queryKey: ['contact-masked-availability', apolloPersonId],
    queryFn: async () => {
      if (!apolloPersonId) return null;
      const { data } = await supabase
        .from('apollo_people_search_masked')
        .select('raw_data')
        .eq('apollo_person_id', apolloPersonId)
        .limit(1)
        .maybeSingle();
      if (!data?.raw_data) return { noRow: true, hasEmail: true, hasPhone: true, phoneIsYes: false, phoneIsMaybe: true };
      const raw = typeof data.raw_data === 'string' ? JSON.parse(data.raw_data) : data.raw_data;
      const dp = raw.has_direct_phone;
      const phoneIsYes   = dp === true || (typeof dp === 'string' && dp.toLowerCase().trim() === 'yes');
      const phoneIsMaybe = typeof dp === 'string' && dp.toLowerCase().includes('maybe');
      return { noRow: false, hasEmail: !!raw.has_email, hasPhone: phoneIsYes || phoneIsMaybe, phoneIsYes, phoneIsMaybe };
    },
    enabled: !!apolloPersonId,
    staleTime: 5 * 60 * 1000,
  });
};

// ── Main Component ────────────────────────────────────────────────────────────
export const ContactHeroPanel: React.FC<Props> = ({
  contact, onFieldSave, onEnrich, onRequestPhone, onOpenModal, onAddToList, onBack,
  isEnriching, isRequestingPhone, phonePending, isSaving,
}) => {
  const { toast }     = useToast();
  const data          = extractFromRaw(contact);
  const isEnriched    = !!contact.last_enriched_at || !!contact.apollo_person_id;
  const enrichedAt    = contact.last_enriched_at || contact.enrichment_people?.[0]?.updated_at;
  const timezone      = data?.timezone || contact?.timezone;
  const [localTime, setLocalTime] = useState('');
  const hasApolloId   = !!contact.apollo_person_id;
  const { data: avail } = useContactAvailability(contact.apollo_person_id);

  // Social edit modal state
  const [socialEdit, setSocialEdit] = useState<{ field: string; label: string; value: string; placeholder: string } | null>(null);

  // Manual add dialog state
  const [addEmailOpen,  setAddEmailOpen]  = useState(false);
  const [addPhoneOpen,  setAddPhoneOpen]  = useState(false);
  const [editEmailItem, setEditEmailItem] = useState<any>(null);
  const [editPhoneItem, setEditPhoneItem] = useState<any>(null);

  // Local time clock
  useEffect(() => {
    if (!timezone) return;
    const tick = () => {
      try {
        const t = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date());
        setLocalTime(t);
      } catch { setLocalTime(''); }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [timezone]);

  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    toast({ title: 'Copied!', description: `${label} copied` });
  };

  // ── Build unified email + phone lists ─────────────────────────────────────
  const emails: any[] = React.useMemo(() => {
    const map = new Map<string, any>();
    if (contact.email) map.set(contact.email.toLowerCase(), { value: contact.email, type: 'work', status: contact.email_status || 'unverified', isPrimary: true, source: 'CRM' });
    for (const e of (contact.enrichment_contact_emails ?? [])) {
      const k = e.email?.toLowerCase();
      if (k && !map.has(k)) map.set(k, { value: e.email, type: e.email_type ?? e.type ?? 'work', status: e.email_status ?? e.status ?? 'unverified', isPrimary: !!e.is_primary, source: e.source });
    }
    return [...map.values()];
  }, [contact]);

  const phones: any[] = React.useMemo(() => {
    const map = new Map<string, any>();
    if (contact.mobile) map.set(contact.mobile, { value: contact.mobile, type: 'mobile', status: 'valid_number', isPrimary: true, source: 'CRM' });
    for (const p of (contact.enrichment_contact_phones ?? [])) {
      const k = p.phone_number ?? p.raw_number;
      if (k && !map.has(k)) map.set(k, { value: k, type: p.type ?? 'mobile', status: p.status ?? 'no_status', isPrimary: !!p.is_primary, source: p.source_name });
    }
    return [...map.values()];
  }, [contact]);

  const hasEmails = emails.length > 0;
  const hasPhones = phones.length > 0;
  const emailAvail   = avail?.hasEmail   ?? true;
  const phoneAvail   = avail?.hasPhone   ?? true;
  const phoneIsYes   = avail?.phoneIsYes   ?? false;
  const phoneIsMaybe = avail?.phoneIsMaybe ?? true;
  const noPhoneFound = contact.phone_enrichment_status === 'no_phone_found';

  // ── Asset CRUD handlers ──────────────────────────────────────────────────
  const handleAddEmail = async (value: string, meta: any) => {
    try {
      const { error } = await supabase.from('enrichment_contact_emails').upsert({ contact_id: contact.id, email: value, email_status: meta.status || 'unverified', is_primary: false, source: 'Manual' }, { onConflict: 'contact_id,email' });
      if (error) throw error;
      toast({ title: 'Email added' });
      await onFieldSave('__refresh__', null);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Failed', description: err.message }); }
  };
  const handleAddPhone = async (value: string, meta: any) => {
    try {
      const { error } = await supabase.from('enrichment_contact_phones').upsert({ contact_id: contact.id, phone_number: value, type: meta.type || 'mobile', status: meta.status || 'no_status', source_name: 'Manual', is_primary: false }, { onConflict: 'contact_id,phone_number' });
      if (error) throw error;
      toast({ title: 'Phone added' });
      await onFieldSave('__refresh__', null);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Failed', description: err.message }); }
  };
  const handleDeleteEmail = async (item: any) => {
    try {
      await supabase.from('enrichment_contact_emails').delete().eq('contact_id', contact.id).eq('email', item.value);
      if (item.isPrimary) await onFieldSave('email', '');
      else await onFieldSave('__refresh__', null);
      toast({ title: 'Deleted' });
    } catch (err: any) { toast({ variant: 'destructive', title: 'Failed', description: err.message }); }
  };
  const handleDeletePhone = async (item: any) => {
    try {
      await supabase.from('enrichment_contact_phones').delete().eq('contact_id', contact.id).eq('phone_number', item.value);
      if (item.isPrimary) await onFieldSave('mobile', '');
      else await onFieldSave('__refresh__', null);
      toast({ title: 'Deleted' });
    } catch (err: any) { toast({ variant: 'destructive', title: 'Failed', description: err.message }); }
  };
  const handleSetPrimaryEmail = async (item: any) => {
    try {
      await supabase.from('enrichment_contact_emails').update({ is_primary: false }).eq('contact_id', contact.id);
      await supabase.from('enrichment_contact_emails').update({ is_primary: true }).eq('contact_id', contact.id).eq('email', item.value);
      await onFieldSave('email', item.value);
      toast({ title: 'Set as primary' });
    } catch (err: any) { toast({ variant: 'destructive', title: 'Failed', description: err.message }); }
  };
  const handleSetPrimaryPhone = async (item: any) => {
    try {
      await supabase.from('enrichment_contact_phones').update({ is_primary: false }).eq('contact_id', contact.id);
      await supabase.from('enrichment_contact_phones').update({ is_primary: true }).eq('contact_id', contact.id).eq('phone_number', item.value);
      await onFieldSave('mobile', item.value);
      toast({ title: 'Set as primary' });
    } catch (err: any) { toast({ variant: 'destructive', title: 'Failed', description: err.message }); }
  };
  const handleFlagEmail = async (item: any, newStatus: string) => {
    try {
      await supabase.from('enrichment_contact_emails').update({ email_status: newStatus }).eq('contact_id', contact.id).eq('email', item.value);
      await onFieldSave('__refresh__', null);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Failed', description: err.message }); }
  };
  const handleFlagPhone = async (item: any, newStatus: string) => {
    try {
      await supabase.from('enrichment_contact_phones').update({ status: newStatus }).eq('contact_id', contact.id).eq('phone_number', item.value);
      await onFieldSave('__refresh__', null);
    } catch (err: any) { toast({ variant: 'destructive', title: 'Failed', description: err.message }); }
  };

  const quickActions = [
    { type: 'call' as const,     icon: PhoneCall,   label: 'Call',    color: 'text-amber-600', bg: 'hover:bg-amber-50' },
    { type: 'email' as const,    icon: Mail,        label: 'Email',   color: 'text-blue-600',  bg: 'hover:bg-blue-50' },
    { type: 'note' as const,     icon: StickyNote,  label: 'Note',    color: 'text-purple-600',bg: 'hover:bg-purple-50' },
    { type: 'task' as const,     icon: CheckSquare, label: 'Task',    color: 'text-green-600', bg: 'hover:bg-green-50' },
    { type: 'meeting' as const,  icon: Calendar,    label: 'Meeting', color: 'text-indigo-600',bg: 'hover:bg-indigo-50' },
  ];

  return (
    <>
      <div className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="h-[2px] bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-600" />
        {/* Back button row */}
        <div className="px-4 py-1.5 border-b border-slate-50 flex items-center gap-2">
          <button onClick={onBack} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-purple-600 transition-colors">
            <ChevronLeft size={13} />
            <span>People</span>
          </button>
          <span className="text-slate-200 text-xs">/</span>
          <span className="text-[11px] text-slate-600 font-medium truncate max-w-[200px]">{contact.name}</span>
        </div>
        <div className="px-4 py-2.5 grid grid-cols-3 gap-4">

          {/* ── COL 1: Identity ────────────────────────────────────────── */}
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="h-[110px] w-[100px] border-2 border-white shadow-sm ring-2 ring-purple-100 flex-shrink-0 rounded-xl">
              <AvatarImage src={contact.photo_url || data.photoUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 text-lg font-bold rounded-xl">
                {contact.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <InlineEdit
                  value={contact.name || ''} onSave={v => onFieldSave('name', v)} isSaving={isSaving}
                  placeholder="Contact name" className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600" inputClassName="w-36 text-sm font-bold"
                />
                {isEnriched && (
                  <span className="text-[9px] font-bold bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                    <span className="w-1 h-1 bg-green-500 rounded-full" />Enriched
                  </span>
                )}
              </div>
              {/* Title at Company */}
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                <InlineEdit
                  value={contact.job_title || ''} onSave={v => onFieldSave('job_title', v)} isSaving={isSaving}
                  placeholder="Add title" className="text-[11px] text-slate-500" inputClassName="w-28 text-xs"
                />
                {contact.company_name && (
                  <>
                    <span className="text-slate-300 text-[11px]">at</span>
                    <InlineEdit
                      value={contact.company_name || ''} onSave={v => onFieldSave('company_name', v)} isSaving={isSaving}
                      placeholder="Company" className="text-[11px] text-slate-500 font-medium" inputClassName="w-24 text-xs"
                    />
                  </>
                )}
              </div>
              {/* Location + timezone + seniority */}
              <div className="mt-1.5 space-y-0.5">
                <LocationChips
                  city={contact.city || ''} state={contact.state || ''} country={contact.country || ''}
                  onSave={onFieldSave} isSaving={isSaving}
                />
                {(localTime || data.seniority) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {localTime && timezone && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Clock size={9} className="text-slate-400" />{localTime} local
                      </span>
                    )}
                    {data.seniority && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 capitalize">
                        <Award size={9} className="text-slate-400" />{data.seniority}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {/* Social icons */}
              <div className="flex items-center gap-1 mt-1.5">
                <SocialIconBtn
                  url={contact.linkedin_url} icon={Linkedin}
                  label="LinkedIn" iconColor="text-[#0A66C2]" bgColor="bg-[#0A66C2]/10"
                  onEdit={() => setSocialEdit({ field: 'linkedin_url', label: 'LinkedIn', value: contact.linkedin_url || '', placeholder: 'https://linkedin.com/in/username' })}
                />
                <SocialIconBtn
                  url={contact.twitter_url || contact.enrichment_people?.[0]?.twitter_url} icon={() => (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.259 5.63z"/></svg>
                  )}
                  label="Twitter" iconColor="text-slate-700" bgColor="bg-slate-100"
                  onEdit={() => setSocialEdit({ field: 'twitter_url', label: 'Twitter/X', value: contact.twitter_url || '', placeholder: 'https://twitter.com/username' })}
                />
                {contact.companies?.website && (
                  <SocialIconBtn
                    url={contact.companies.website} icon={Globe}
                    label="Website" iconColor="text-slate-600" bgColor="bg-slate-100"
                    onEdit={() => {}}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── COL 2: Contact Info — full asset management ─────────────── */}
          <div className="border-x border-slate-100 px-3 overflow-y-auto max-h-[160px]">
            {/* ─ EMAILS ─ */}
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 sticky top-0 bg-white">Emails</p>

            {/* Revealed emails list */}
            {emails.map((item, i) => {
              const isBad = item.status === 'incorrect' || item.status === 'invalid';
              return (
                <div key={i} className={cn('flex items-center gap-1.5 px-1.5 py-1 rounded-md mb-0.5 group transition-all', item.isPrimary ? 'bg-purple-50/60 border border-purple-100' : 'hover:bg-slate-50')}>
                  <div className="flex h-5 w-5 items-center justify-center rounded flex-shrink-0 bg-purple-50">
                    <Mail size={9} className={item.isPrimary ? 'text-purple-600' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn('text-[10px] font-medium truncate block', isBad ? 'line-through text-slate-400' : 'text-slate-800')}>{item.value}</span>
                    <div className="flex items-center gap-1 text-[8px] text-slate-400">
                      <span className="capitalize">{item.type}</span>
                      {item.isPrimary && <><span>·</span><span className="text-purple-600 font-semibold">Primary</span></>}
                    </div>
                  </div>
                  <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => copy(item.value, 'Email')} className="p-0.5 rounded hover:bg-slate-200"><Copy size={8} className="text-slate-400" /></button>
                    <button onClick={() => setEditEmailItem(item)} className="p-0.5 rounded hover:bg-purple-50"><Pencil size={8} className="text-slate-400" /></button>
                    {!item.isPrimary && <button onClick={() => handleSetPrimaryEmail(item)} title="Set Primary" className="p-0.5 rounded hover:bg-amber-50"><Star size={8} className="text-slate-400" /></button>}
                    <button onClick={() => handleFlagEmail(item, isBad ? 'unverified' : 'incorrect')} className="p-0.5 rounded hover:bg-red-50"><Flag size={8} className={isBad ? 'text-red-400' : 'text-slate-400'} fill={isBad ? 'currentColor' : 'none'} /></button>
                    <button onClick={() => handleDeleteEmail(item)} className="p-0.5 rounded hover:bg-red-50"><Trash2 size={8} className="text-slate-400 hover:text-red-500" /></button>
                  </div>
                </div>
              );
            })}

            {/* Access email button — pre-reveal */}
            {!hasEmails && emailAvail && (
              <button onClick={onEnrich} disabled={isEnriching}
                className="flex items-center justify-between w-full px-2 py-1 mb-0.5 rounded-md bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors disabled:opacity-50">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 flex items-center justify-center rounded bg-purple-100"><Mail size={9} className="text-purple-600" /></div>
                  <span className="text-[10px] font-mono text-purple-400">****@****.com</span>
                </div>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-purple-700">
                  {isEnriching ? <Loader2 size={8} className="animate-spin" /> : <Zap size={8} />}
                  Access Email
                </span>
              </button>
            )}
            {!hasEmails && !emailAvail && !isEnriched && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5 rounded-md bg-slate-50 border border-slate-200 opacity-50 cursor-not-allowed">
                      <div className="h-5 w-5 flex items-center justify-center rounded bg-slate-100"><Mail size={9} className="text-slate-400" /></div>
                      <span className="text-[10px] text-slate-400 italic">No email available</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">No contact available — enrich first</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {!hasEmails && !emailAvail && isEnriched && (
              <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5 rounded-md bg-slate-50 border border-slate-100">
                <Mail size={9} className="text-slate-300" />
                <span className="text-[10px] text-slate-400 italic">No email found in data</span>
              </div>
            )}

            {/* Add email manually */}
            <button onClick={() => setAddEmailOpen(true)} className="flex items-center gap-1 text-[9px] text-purple-500 hover:text-purple-700 mb-2">
              <Plus size={8} />Add email manually
            </button>

            {/* ─ PHONES ─ */}
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 sticky top-0 bg-white">Phone Numbers</p>

            {/* Revealed phones list */}
            {phones.map((item, i) => (
              <div key={i} className={cn('flex items-center gap-1.5 px-1.5 py-1 rounded-md mb-0.5 group transition-all', item.isPrimary ? 'bg-purple-50/60 border border-purple-100' : 'hover:bg-slate-50')}>
                <div className="flex h-5 w-5 items-center justify-center rounded flex-shrink-0 bg-purple-50">
                  <PhoneFlag number={item.value} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-medium text-slate-800 truncate block font-mono">{item.value}</span>
                  <div className="flex items-center gap-1 text-[8px] text-slate-400">
                    <span className="capitalize">{item.type}</span>
                    {item.isPrimary && <><span>·</span><span className="text-purple-600 font-semibold">Primary</span></>}
                  </div>
                </div>
                <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => copy(item.value, 'Phone')} className="p-0.5 rounded hover:bg-slate-200"><Copy size={8} className="text-slate-400" /></button>
                  <button onClick={() => setEditPhoneItem(item)} className="p-0.5 rounded hover:bg-purple-50"><Pencil size={8} className="text-slate-400" /></button>
                  {!item.isPrimary && <button onClick={() => handleSetPrimaryPhone(item)} title="Set Primary" className="p-0.5 rounded hover:bg-amber-50"><Star size={8} className="text-slate-400" /></button>}
                  <button onClick={() => handleFlagPhone(item, item.status === 'invalid' ? 'no_status' : 'invalid')} className="p-0.5 rounded hover:bg-red-50"><Flag size={8} className={item.status === 'invalid' ? 'text-red-400' : 'text-slate-400'} fill={item.status === 'invalid' ? 'currentColor' : 'none'} /></button>
                  <button onClick={() => handleDeletePhone(item)} className="p-0.5 rounded hover:bg-red-50"><Trash2 size={8} className="text-slate-400 hover:text-red-500" /></button>
                </div>
              </div>
            ))}

            {/* Phone access/pending/no_phone states */}
            {!hasPhones && phonePending && (
              <div className="flex items-center justify-between px-2 py-1 mb-0.5 rounded-md bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 flex items-center justify-center rounded bg-amber-100"><Phone size={9} className="text-amber-600" /></div>
                  <span className="text-[10px] font-mono text-amber-500">(***) ***-****</span>
                </div>
                <div className="flex items-center gap-1">
                  <Loader2 size={8} className="animate-spin text-amber-500" />
                  <span className="text-[9px] font-semibold text-amber-700">1–5 min</span>
                </div>
              </div>
            )}
            {!hasPhones && !phonePending && contact.phone_enrichment_status === 'no_phone_found' && (
              <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5 rounded-md bg-slate-50 border border-slate-100">
                <Phone size={9} className="text-slate-300" />
                <span className="text-[10px] text-slate-400 italic">No direct dial available</span>
              </div>
            )}
            {!hasPhones && !phonePending && contact.phone_enrichment_status !== 'no_phone_found' && phoneIsYes && (
              <button onClick={onRequestPhone} disabled={isRequestingPhone}
                className="flex items-center justify-between w-full px-2 py-1 mb-0.5 rounded-md bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors disabled:opacity-50">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 flex items-center justify-center rounded bg-purple-100"><Phone size={9} className="text-purple-600" /></div>
                  <span className="text-[10px] font-mono text-slate-400">(***) ***-****</span>
                </div>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-purple-700">
                  {isRequestingPhone ? <Loader2 size={8} className="animate-spin" /> : <Zap size={8} />}
                  Access Phone
                </span>
              </button>
            )}
            {!hasPhones && !phonePending && contact.phone_enrichment_status !== 'no_phone_found' && !phoneIsYes && phoneAvail && (
              <button onClick={onRequestPhone} disabled={isRequestingPhone}
                className="flex items-center justify-between w-full px-2 py-1 mb-0.5 rounded-md bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 flex items-center justify-center rounded bg-amber-100"><Phone size={9} className="text-amber-600" /></div>
                  <span className="text-[10px] font-mono text-slate-400">(***) ***-****</span>
                </div>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-amber-700">
                  {isRequestingPhone ? <Loader2 size={8} className="animate-spin" /> : <Zap size={8} />}
                  Access Phone
                </span>
              </button>
            )}
            {!hasPhones && !phonePending && !phoneAvail && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5 rounded-md bg-slate-50 border border-slate-200 opacity-50 cursor-not-allowed">
                      <div className="h-5 w-5 flex items-center justify-center rounded bg-slate-100"><Phone size={9} className="text-slate-400" /></div>
                      <span className="text-[10px] text-slate-400 italic">No phone available</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">No contact available</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Add phone manually */}
            <button onClick={() => setAddPhoneOpen(true)} className="flex items-center gap-1 text-[9px] text-purple-500 hover:text-purple-700">
              <Plus size={8} />Add phone manually
            </button>
          </div>

          {/* ── COL 3: Actions ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            {/* Stage */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-10 flex-shrink-0">Stage</span>
              <div className="flex-1">
              <StageDropdown current={contact.contact_stage} onSelect={s => onFieldSave('contact_stage', s)} isSaving={isSaving} />
           </div>
            </div>

            <div className="space-y-1 mt-1">
                <div className="grid grid-cols-2 gap-1 flex items-center gap-1.5">
              {/* Enrich */}
 <button
  onClick={onEnrich}
  disabled={isEnriching}
  className="
    w-full flex items-center justify-center gap-1.5
    h-7 text-[11px] font-semibold text-white
    rounded-lg transition-all
    disabled:opacity-60

    bg-[linear-gradient(135deg,var(--crm-primary),var(--crm-secondary),var(--crm-accent))]
    hover:bg-[linear-gradient(135deg,var(--crm-accent),var(--crm-secondary),var(--crm-primary))]
    shadow-[0_0_20px_rgba(99,102,241,0.35)]
    hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]
  "
>
  <Sparkles size={10} className={cn(isEnriching && 'animate-spin')} />
  {isEnriching ? 'Enriching…' : 'Enrich Contact'}
</button>

              {/* Add to list */}
              <button onClick={onAddToList}
                className="w-full flex items-center justify-center gap-1.5 h-7 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 hover:border-purple-300 hover:text-purple-600 rounded-lg transition-all">
                <ListPlus size={10} />Add to List
              </button>
              </div>

              {/* Quick log row */}
              <div className="flex gap-1 pt-0.5">
                {quickActions.map(({ type, icon: Icon, label, color, bg }) => (
                  <TooltipProvider key={type}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => onOpenModal(type)}
                          className={cn('flex-1 flex items-center justify-center h-6 rounded-md border border-slate-100 bg-slate-50 transition-colors', bg)}>
                          <Icon size={11} className={color} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">{label}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>

            {/* Last enriched */}
            {enrichedAt && (
              <div className="flex items-center gap-1 mt-1">
                <RefreshCw size={8} className="text-slate-400" />
                <span className="text-[9px] text-slate-400">
                  Enriched {formatDistanceToNow(parseISO(enrichedAt), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Email Dialog ──────────────────────────────────────────── */}
      <Dialog open={addEmailOpen} onOpenChange={setAddEmailOpen}>
        <DialogContent className="sm:max-w-[300px] p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
          <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center"><Mail size={12} className="text-white" /></div>
            <p className="text-xs font-bold text-white">Add Email</p>
          </div>
          <AddContactForm type="email" onSave={handleAddEmail} onClose={() => setAddEmailOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* ── Add Phone Dialog ──────────────────────────────────────────── */}
      <Dialog open={addPhoneOpen} onOpenChange={setAddPhoneOpen}>
        <DialogContent className="sm:max-w-[300px] p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
          <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center"><Phone size={12} className="text-white" /></div>
            <p className="text-xs font-bold text-white">Add Phone</p>
          </div>
          <AddContactForm type="phone" onSave={handleAddPhone} onClose={() => setAddPhoneOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* ── Edit Email Dialog ─────────────────────────────────────────── */}
      {editEmailItem && (
        <Dialog open={!!editEmailItem} onOpenChange={() => setEditEmailItem(null)}>
          <DialogContent className="sm:max-w-[300px] p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
            <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center"><Pencil size={12} className="text-white" /></div>
              <p className="text-xs font-bold text-white">Edit Email</p>
            </div>
            <AddContactForm type="email" initialValue={editEmailItem.value} initialType={editEmailItem.type} initialStatus={editEmailItem.status}
              onSave={async (val, meta) => {
                try {
                  if (editEmailItem.value !== val) {
                    await supabase.from('enrichment_contact_emails').delete().eq('contact_id', contact.id).eq('email', editEmailItem.value);
                    await supabase.from('enrichment_contact_emails').upsert({ contact_id: contact.id, email: val, email_status: meta.status, is_primary: editEmailItem.isPrimary, source: editEmailItem.source || 'Manual' }, { onConflict: 'contact_id,email' });
                    if (editEmailItem.isPrimary) await onFieldSave('email', val);
                  } else {
                    await supabase.from('enrichment_contact_emails').update({ email_status: meta.status }).eq('contact_id', contact.id).eq('email', val);
                  }
                  toast({ title: 'Saved' }); await onFieldSave('__refresh__', null);
                } catch (err: any) { toast({ variant: 'destructive', title: 'Failed', description: err.message }); }
                setEditEmailItem(null);
              }}
              onClose={() => setEditEmailItem(null)} />
          </DialogContent>
        </Dialog>
      )}

      {/* ── Edit Phone Dialog ─────────────────────────────────────────── */}
      {editPhoneItem && (
        <Dialog open={!!editPhoneItem} onOpenChange={() => setEditPhoneItem(null)}>
          <DialogContent className="sm:max-w-[300px] p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
            <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center"><Pencil size={12} className="text-white" /></div>
              <p className="text-xs font-bold text-white">Edit Phone</p>
            </div>
            <AddContactForm type="phone" initialValue={editPhoneItem.value} initialType={editPhoneItem.type} initialStatus={editPhoneItem.status}
              onSave={async (val, meta) => {
                try {
                  if (editPhoneItem.value !== val) {
                    await supabase.from('enrichment_contact_phones').delete().eq('contact_id', contact.id).eq('phone_number', editPhoneItem.value);
                    await supabase.from('enrichment_contact_phones').upsert({ contact_id: contact.id, phone_number: val, type: meta.type, status: meta.status, source_name: editPhoneItem.source || 'Manual', is_primary: editPhoneItem.isPrimary }, { onConflict: 'contact_id,phone_number' });
                    if (editPhoneItem.isPrimary) await onFieldSave('mobile', val);
                  } else {
                    await supabase.from('enrichment_contact_phones').update({ type: meta.type, status: meta.status }).eq('contact_id', contact.id).eq('phone_number', val);
                  }
                  toast({ title: 'Saved' }); await onFieldSave('__refresh__', null);
                } catch (err: any) { toast({ variant: 'destructive', title: 'Failed', description: err.message }); }
                setEditPhoneItem(null);
              }}
              onClose={() => setEditPhoneItem(null)} />
          </DialogContent>
        </Dialog>
      )}

      {/* Social edit modal */}
      {socialEdit && (
        <SocialEditModal
          open={!!socialEdit}
          onClose={() => setSocialEdit(null)}
          label={socialEdit.label}
          value={socialEdit.value}
          placeholder={socialEdit.placeholder}
          isSaving={isSaving}
          onSave={v => { onFieldSave(socialEdit.field, v); setSocialEdit(null); }}
        />
      )}
    </>
  );
};

// ── Add/Edit form component ───────────────────────────────────────────────────
const AddContactForm: React.FC<{
  type: 'email' | 'phone';
  initialValue?: string; initialType?: string; initialStatus?: string;
  onSave: (value: string, meta: { type: string; status: string }) => void;
  onClose: () => void;
}> = ({ type, initialValue = '', initialType, initialStatus, onSave, onClose }) => {
  const isEmail = type === 'email';
  const [val, setVal] = useState(initialValue);
  const [subtype, setSubtype] = useState(initialType || (isEmail ? 'work' : 'mobile'));
  const [status, setStatus] = useState(initialStatus || (isEmail ? 'unverified' : 'no_status'));
  const handleSave = () => { if (!val.trim()) return; onSave(val.trim(), { type: subtype, status }); onClose(); };
  return (
    <div className="p-4 space-y-3 bg-white">
      <div>
        <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold block mb-1">{isEmail ? 'Email Address' : 'Phone Number'}</Label>
        {isEmail
          ? <Input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} placeholder="name@company.com" className="h-8 text-xs border-slate-200 rounded-xl bg-slate-50 focus:border-purple-400" />
          : <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:border-purple-400">
              <PhoneInput international defaultCountry="US" value={val} onChange={v => setVal(v || '')} placeholder="+1 (555) 000-0000" className="h-8 px-3 text-xs bg-transparent w-full" />
            </div>
        }
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold block mb-1">Type</Label>
          <Select value={subtype} onValueChange={setSubtype}>
            <SelectTrigger className="h-8 text-xs border-slate-200 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(isEmail ? [['work','Work'],['personal','Personal'],['other','Other']] : [['mobile','Mobile'],['work_hq','Office/HQ'],['other','Other']]).map(([v,l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold block mb-1">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs border-slate-200 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(isEmail ? [['verified','✓ Verified'],['unverified','Unverified'],['incorrect','✗ Invalid']] : [['valid_number','✓ Valid'],['no_status','Unknown'],['invalid','✗ Invalid']]).map(([v,l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 h-8 text-xs rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
        <button onClick={handleSave} className={cn('flex-1 h-8 text-xs rounded-xl text-white', isEmail ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600')}>
          Save
        </button>
      </div>
    </div>
  );
};

export default ContactHeroPanel;