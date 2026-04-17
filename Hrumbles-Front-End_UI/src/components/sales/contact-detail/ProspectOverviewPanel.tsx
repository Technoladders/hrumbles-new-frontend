// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ProspectOverviewPanel.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  User, MapPin, Clock, Briefcase, Globe, Linkedin, Mail, Phone,
  Building2, ChevronDown, ChevronUp, ExternalLink, CheckCircle2,
  Eye, Loader2, Tag, TrendingUp, Award, Languages, Sparkles,
  Lock, AlertCircle, Check, X, Pencil, RefreshCw, Info,
  Copy, Zap, Star, Flag, Plus, Trash2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { extractFromRaw, hasData } from "@/utils/dataExtractor";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PhoneInput, { parsePhoneNumber } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import { Country, State, City } from "country-state-city";
import ReactDOM from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useContactStages } from "@/hooks/sales/useContactStages";

interface Props {
  contact: any;
  onFieldSave: (field: string, value: any) => Promise<void>;
  onRequestPhone: () => void;
  onEnrich: () => void;
  isRequestingPhone: boolean;
  isEnriching: boolean;
  phonePending: boolean;
  isSaving: boolean;
}

// ── Gradient border wrapper ───────────────────────────────────────────────────
const GradCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]", className)}>
    {children}
  </div>
);

const SectionHeader: React.FC<{ title: string; icon: React.ElementType; aside?: React.ReactNode }> = ({ title, icon: Icon, aside }) => (
  <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Icon size={12} className="text-slate-400" />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>
    </div>
    {aside}
  </div>
);

// ── Inline editable field ─────────────────────────────────────────────────────
const EditableField: React.FC<{
  value: string;
  onSave: (v: string) => Promise<void>;
  isSaving?: boolean;
  placeholder?: string;
  label: string;
  icon: React.ElementType;
  type?: string;
  verified?: boolean;
}> = ({ value, onSave, isSaving, placeholder, label, icon: Icon, type = 'text', verified }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);

  const commit = async () => {
    if (draft.trim() !== value) {
      await onSave(draft.trim());
    }
    setEditing(false);
  };

  const cancel = () => { setDraft(value); setEditing(false); };

  const copy = () => {
    if (value) { navigator.clipboard.writeText(value); toast({ title: 'Copied!', description: `${label} copied` }); }
  };

  return (
    <div className="flex items-center gap-2.5 group py-1">
      <div className={cn("flex-shrink-0 p-1.5 rounded-lg", verified ? 'bg-green-50' : 'bg-slate-50')}>
        <Icon size={12} className={cn(verified ? 'text-green-500' : 'text-slate-400')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-400 leading-none mb-0.5">{label}</p>
        {editing ? (
          <div className="flex items-center gap-1">
            <div className="rounded-md p-[1px] bg-gradient-to-r from-purple-500 to-pink-500">
              <input
                ref={inputRef}
                type={type}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
                className="bg-white rounded-[5px] px-2 py-0.5 text-xs focus:outline-none w-48"
              />
            </div>
            <button
              onClick={commit}
              disabled={isSaving}
              className="p-1 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
            >
              {isSaving ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
            </button>
            <button onClick={cancel} className="p-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200">
              <X size={9} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <p className={cn("text-xs font-medium truncate", value ? "text-gray-800" : "text-gray-300 italic")}>
              {value || placeholder || '—'}
            </p>
            <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
              {value && (
                <button onClick={copy} className="p-0.5 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors">
                  <Copy size={9} />
                </button>
              )}
              <button onClick={() => setEditing(true)} className="p-0.5 rounded hover:bg-purple-50 text-gray-300 hover:text-purple-500 transition-colors">
                <Pencil size={9} />
              </button>
            </div>
            {verified && value && <CheckCircle2 size={11} className="text-green-500 flex-shrink-0" />}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Reveal button states ──────────────────────────────────────────────────────
const RevealButton: React.FC<{
  type: 'email' | 'phone';
  available: boolean;
  onClick: () => void;
  isLoading: boolean;
  isPending?: boolean;
}> = ({ type, available, onClick, isLoading, isPending }) => {
  if (!available) return null;

  if (isPending) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
        <Loader2 size={12} className="animate-spin text-amber-500" />
        <div>
          <p className="text-[10px] font-semibold text-amber-700">Phone lookup in progress</p>
          <p className="text-[9px] text-amber-500">Apollo is processing via waterfall. This usually takes 1–5 min.</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-left transition-all group",
        "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200",
        "hover:from-purple-100 hover:to-pink-100 hover:border-purple-300 hover:shadow-sm",
        isLoading && "opacity-60 pointer-events-none"
      )}
    >
      <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100">
        {type === 'email' ? <Mail size={12} className="text-purple-600" /> : <Phone size={12} className="text-purple-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-purple-700">
          {isLoading ? 'Revealing…' : `Reveal ${type === 'email' ? 'Email' : 'Phone'}`}
        </p>
        <p className="text-[9px] text-purple-400">
          {type === 'phone' ? 'delivery takes 1–5 min' : 'Instant via data enrichment'}
        </p>
      </div>
      {isLoading
        ? <Loader2 size={12} className="text-purple-400 animate-spin flex-shrink-0" />
        : <Zap size={12} className="text-purple-300 group-hover:text-purple-500 transition-colors flex-shrink-0" />
      }
    </button>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptySection: React.FC<{
  message: string;
  sub?: string;
  icon: React.ElementType;
  action?: React.ReactNode;
}> = ({ message, sub, icon: Icon, action }) => (
  <div className="flex flex-col items-center py-4 px-3 text-center">
    <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center mb-2">
      <Icon size={16} className="text-slate-300" />
    </div>
    <p className="text-xs font-medium text-slate-500 mb-0.5">{message}</p>
    {sub && <p className="text-[10px] text-slate-400 mb-3 max-w-[180px] leading-relaxed">{sub}</p>}
    {action}
  </div>
);

// ── Last enriched badge ───────────────────────────────────────────────────────
const LastEnriched: React.FC<{ at: string | null }> = ({ at }) => {
  if (!at) return null;
  return (
    <span className="text-[9px] text-slate-400 flex items-center gap-1">
      <RefreshCw size={8} />
      {format(new Date(at), 'MMM d, yyyy')}
    </span>
  );
};


// ── Location fields group with dropdowns ─────────────────────────────────────
const LocationFieldsGroup: React.FC<{
  city: string; state: string; country: string;
  onSave: (field: string, value: string) => Promise<void>;
  isSaving?: boolean;
  compact?: boolean;
}> = ({ city, state, country, onSave, isSaving, compact = false }) => {
  const [editField, setEditField] = React.useState<'city' | 'state' | 'country' | null>(null);
  const [draft, setDraft] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [dropOpen, setDropOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [dropStyle, setDropStyle] = React.useState<React.CSSProperties>({});
  const { toast } = useToast();

  const allCountries = React.useMemo(() => Country.getAllCountries(), []);
  const allStates    = React.useMemo(() => country ? State.getStatesOfCountry(
    allCountries.find(c => c.name === country)?.isoCode || ''
  ) : [], [country, allCountries]);
  const allCities = React.useMemo(() => {
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

  const openField = (field: 'city' | 'state' | 'country', current: string) => {
    setEditField(field);
    setDraft(current);
    setQuery('');
    setDropOpen(true);
    setTimeout(() => {
      if (anchorRef.current) {
        const r = anchorRef.current.getBoundingClientRect();
        setDropStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220), zIndex: 99999 });
      }
    }, 10);
  };

  const selectOption = async (name: string) => {
    if (editField) {
      await onSave(editField, name);
    }
    setDropOpen(false);
    setEditField(null);
    setQuery('');
  };

  const close = () => { setDropOpen(false); setEditField(null); setQuery(''); };

  React.useEffect(() => {
    const fn = (e: MouseEvent) => { if (!(e.target as Element).closest('[data-loc-drop]')) close(); };
    if (dropOpen) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [dropOpen]);

  const LocationRow: React.FC<{ field: 'city' | 'state' | 'country'; value: string; label: string }> = ({ field, value, label }) => (
    <div className="flex items-center gap-2.5 group py-1">
      <div className="flex-shrink-0 p-1.5 rounded-lg bg-slate-50">
        <MapPin size={12} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-400 leading-none mb-0.5">{label}</p>
        <button
          onClick={() => openField(field, value)}
          className="flex items-center gap-1 group/btn hover:opacity-75 transition-opacity"
        >
          <span className={cn('text-xs font-medium', value ? 'text-gray-800' : 'text-gray-300 italic')}>
            {value || 'Click to set'}
          </span>
          <Pencil size={9} className="opacity-0 group-hover/btn:opacity-40 transition-opacity text-gray-400" />
        </button>
      </div>
    </div>
  );

  // Single-line display string
  const locationDisplay = [city, state, country].filter(Boolean).join(', ');

  return (
    <div data-loc-drop ref={anchorRef}>
      {compact ? (
        /* Compact mode — three separate clickable segments */
        <div className="flex items-center gap-1.5 flex-wrap">
          <MapPin size={11} className="text-slate-400 flex-shrink-0" />
          {/* Country chip */}
          <button
            onClick={() => openField('country', country)}
            className="group/seg flex items-center gap-0.5 text-xs hover:text-purple-600 transition-colors"
          >
            <span className={cn(country ? 'text-gray-600' : 'text-gray-300 italic')}>
              {country || 'Country'}
            </span>
            <Pencil size={8} className="opacity-0 group-hover/seg:opacity-50 transition-opacity text-gray-400" />
          </button>
          {/* Separator + State chip */}
          <span className="text-gray-300 text-xs">·</span>
          <button
            onClick={() => openField('state', state)}
            className="group/seg flex items-center gap-0.5 text-xs hover:text-purple-600 transition-colors"
          >
            <span className={cn(state ? 'text-gray-600' : 'text-gray-300 italic')}>
              {state || 'State'}
            </span>
            <Pencil size={8} className="opacity-0 group-hover/seg:opacity-50 transition-opacity text-gray-400" />
          </button>
          {/* Separator + City chip */}
          <span className="text-gray-300 text-xs">·</span>
          <button
            onClick={() => openField('city', city)}
            className="group/seg flex items-center gap-0.5 text-xs hover:text-purple-600 transition-colors"
          >
            <span className={cn(city ? 'text-gray-600' : 'text-gray-300 italic')}>
              {city || 'City'}
            </span>
            <Pencil size={8} className="opacity-0 group-hover/seg:opacity-50 transition-opacity text-gray-400" />
          </button>
        </div>
      ) : (
        <>
          <LocationRow field="country" value={country} label="Country" />
          <LocationRow field="state"   value={state}   label="State / Region" />
          <LocationRow field="city"    value={city}    label="City" />
        </>
      )}

          {dropOpen && ReactDOM.createPortal(
        <div 
          style={dropStyle} 
          data-loc-drop 
          className="bg-white rounded-xl border border-slate-200 shadow-xl ring-1 ring-black/5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="p-2 border-b border-slate-100">
            <div className="rounded-lg p-[1px] bg-gradient-to-r from-purple-500 to-pink-500">
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${editField}…`}
                className="w-full bg-white rounded-[7px] px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {options.length === 0 ? (
              <div className="py-4 text-center text-[11px] text-slate-400">No results</div>
            ) : (
              options.map((opt: any) => (
                <button
                  key={opt.isoCode || opt.name}
                  onMouseDown={e => { e.preventDefault(); selectOption(opt.name); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-slate-700 hover:bg-violet-50 hover:text-purple-700 transition-all flex items-center gap-2"
                >
                  {opt.flag && <span className="text-sm">{opt.flag}</span>}
                  {opt.name}
                </button>
              ))
            )}
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


// ── Phone flag icon ───────────────────────────────────────────────────────────
const PhoneFlag: React.FC<{ number: string }> = ({ number }) => {
  if (!number) return <Globe size={10} className="text-slate-400" />;
  try {
    const parsed = parsePhoneNumber(number);
    if (parsed?.country) {
      const F = (flags as any)[parsed.country];
      return F ? <F title={parsed.country} className="w-4 h-3 rounded-[1px] object-cover" /> : <Globe size={10} />;
    }
  } catch {}
  return <Globe size={10} />;
};

// ── Flag phone input ──────────────────────────────────────────────────────────
const FlagPhoneInput: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-400/20 transition-all">
    <style>{`.rpi-detail .PhoneInput{display:flex;align-items:center;height:34px;padding:0 10px;gap:6px}.rpi-detail .PhoneInputCountrySelect{opacity:0;position:absolute;width:28px;height:28px;cursor:pointer}.rpi-detail .PhoneInputCountryIcon{width:20px;height:14px;border-radius:2px;overflow:hidden;flex-shrink:0}.rpi-detail .PhoneInputCountryIconImg{width:100%;height:100%;object-fit:cover}.rpi-detail .PhoneInputCountrySelectArrow{display:none}.rpi-detail .PhoneInputInput{flex:1;background:transparent;border:none;outline:none;font-size:12px;color:#1e293b}.rpi-detail .PhoneInputInput::placeholder{color:#94a3b8;font-style:italic;font-size:11px}`}</style>
    <div className="rpi-detail">
      <PhoneInput international defaultCountry="US" value={value} onChange={v => onChange(v || '')} placeholder="+1 (555) 000-0000" />
    </div>
  </div>
);

// ── Asset dialog (add / edit) ─────────────────────────────────────────────────
const AssetDialog: React.FC<{
  open: boolean; onOpenChange: (v: boolean) => void;
  type: 'email' | 'phone'; mode: 'add' | 'edit';
  initialValue?: string; initialType?: string; initialStatus?: string;
  onSave: (value: string, meta: { type: string; status: string }) => void;
}> = ({ open, onOpenChange, type, mode, initialValue = '', initialType, initialStatus, onSave }) => {
  const isEmail = type === 'email';
  const [val, setVal] = React.useState(initialValue);
  const [subtype, setSubtype] = React.useState(initialType || (isEmail ? 'work' : 'mobile'));
  const [status, setStatus] = React.useState(initialStatus || (isEmail ? 'unverified' : 'no_status'));

  React.useEffect(() => {
    if (open) { setVal(initialValue); setSubtype(initialType || (isEmail ? 'work' : 'mobile')); setStatus(initialStatus || (isEmail ? 'unverified' : 'no_status')); }
  }, [open, initialValue, initialType, initialStatus, isEmail]);

  const handleSave = () => {
    if (!val.trim()) return;
    onSave(val.trim(), { type: subtype, status });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[320px] p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
        <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-purple-600 to-pink-600">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-white/20 flex items-center justify-center">
              {isEmail ? <Mail size={14} className="text-white" /> : <Phone size={14} className="text-white" />}
            </div>
            <div>
              <p className="text-xs font-bold text-white">{mode === 'add' ? 'Add' : 'Edit'} {isEmail ? 'Email' : 'Phone'}</p>
              <p className="text-[9px] text-white/70">Enter contact details manually</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3 bg-white">
          <div>
            <Label className="text-[9px] uppercase tracking-widest text-slate-400 font-bold block mb-1">{isEmail ? 'Email Address' : 'Phone Number'}</Label>
            {isEmail ? (
              <Input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="name@company.com" className="h-8 text-xs border-slate-200 rounded-xl bg-slate-50 focus:border-purple-400" />
            ) : (
              <FlagPhoneInput value={val} onChange={setVal} />
            )}
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
            <button onClick={() => onOpenChange(false)} className="flex-1 h-8 text-xs rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleSave} className="flex-1 h-8 text-xs rounded-xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-opacity">
              {mode === 'add' ? 'Add' : 'Save'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Single asset row (email or phone) ─────────────────────────────────────────
const AssetRow: React.FC<{
  value: string; type: 'email' | 'phone'; label?: string;
  status?: string; isPrimary?: boolean; isManual?: boolean;
  onCopy: () => void; onEdit: () => void; onSetPrimary?: () => void; onDelete: () => void; onFlag: (s: string) => void;
  verified?: boolean;
}> = ({ value, type, label, status, isPrimary, isManual, onCopy, onEdit, onSetPrimary, onDelete, onFlag, verified }) => {
  const [hovered, setHovered] = React.useState(false);
  const isEmail = type === 'email';
  const isBad = status === 'incorrect' || status === 'invalid';

  const typeLabel = isEmail
    ? ({ work: 'Work', personal: 'Personal', other: 'Other' }[label as string] ?? label)
    : ({ mobile: 'Mobile', work_hq: 'Office', other: 'Other' }[label as string] ?? label);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all',
        isPrimary
          ? 'bg-gradient-to-r from-purple-50/60 to-pink-50/40 border border-purple-100'
          : 'hover:bg-slate-50 border border-transparent',
      )}
    >
      {/* Icon */}
      <div className={cn('flex h-6 w-6 items-center justify-center rounded-lg flex-shrink-0', isEmail ? (isPrimary ? 'bg-purple-50' : 'bg-slate-100') : 'bg-purple-50')}>
        {!isEmail ? <PhoneFlag number={value} /> : <Mail size={10} className={isPrimary ? 'text-purple-600' : 'text-slate-400'} />}
      </div>

      {/* Value + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-xs font-medium truncate', isBad ? 'line-through text-slate-400' : 'text-slate-800')}>{value}</span>
          {isEmail && status && (
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0',
              status === 'verified' ? 'bg-emerald-500' : status === 'unverified' ? 'bg-amber-400' : 'bg-red-400'
            )} />
          )}
          {!isEmail && status === 'valid_number' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-1 text-[9px] text-slate-400">
          {typeLabel && <span className="capitalize">{typeLabel}</span>}
          {isPrimary && <><span>·</span><span className="text-purple-600 font-semibold">Primary</span></>}
          {isManual && <><span>·</span><span className="text-blue-500">Manual</span></>}
        </div>
      </div>

      {/* Hover actions */}
      <div className={cn('flex items-center gap-0.5 transition-opacity flex-shrink-0', hovered ? 'opacity-100' : 'opacity-0')}>
        <button onClick={onCopy} title="Copy" className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Copy size={10} /></button>
        <button onClick={onEdit} title="Edit" className="p-1 rounded hover:bg-purple-50 text-slate-400 hover:text-purple-600 transition-colors"><Pencil size={10} /></button>
        {!isPrimary && onSetPrimary && <button onClick={onSetPrimary} title="Set Primary" className="p-1 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-500 transition-colors"><Star size={10} /></button>}
        <button onClick={() => onFlag(isBad ? (isEmail ? 'unverified' : 'no_status') : (isEmail ? 'incorrect' : 'invalid'))} title={isBad ? 'Unflag' : 'Flag as invalid'} className={cn('p-1 rounded transition-colors', isBad ? 'text-red-400 hover:text-red-500' : 'text-slate-400 hover:text-red-400')}>
          <Flag size={10} fill={isBad ? 'currentColor' : 'none'} />
        </button>
        <button onClick={onDelete} title="Delete" className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={10} /></button>
      </div>
    </div>
  );
};

// ── Hero card inline edit ─────────────────────────────────────────────────────
const HeroEditField: React.FC<{
  value: string; onSave: (v: string) => void; isSaving?: boolean;
  placeholder?: string; className?: string; inputClassName?: string;
}> = ({ value, onSave, isSaving, placeholder, className, inputClassName }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  React.useEffect(() => { setDraft(value); }, [value]);
  const commit = async () => { if (draft.trim() !== value) await onSave(draft.trim()); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };
  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={cn('group flex items-center gap-1 text-left hover:opacity-75 transition-opacity', className)}
      >
        <span className={value ? '' : 'text-gray-300 italic text-xs'}>{value || placeholder}</span>
        <Pencil size={9} className="opacity-0 group-hover:opacity-40 transition-opacity text-gray-400 flex-shrink-0" />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <div className="rounded-md p-[1px] bg-gradient-to-r from-purple-500 to-pink-500">
        <input ref={ref} value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
          className={cn('bg-white rounded-[5px] px-2 py-0.5 focus:outline-none', inputClassName)}
        />
      </div>
      <button onClick={commit} disabled={isSaving} className="p-1 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90">
        {isSaving ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
      </button>
      <button onClick={cancel} className="p-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200"><X size={9} /></button>
    </div>
  );
};

// ── Hook: fetch availability from apollo_people_search_masked ─────────────────
// Parses raw_data signals precisely:
//   has_email: false                    → no email available
//   has_email: true                     → email can be revealed
//   has_direct_phone: "Yes"             → phone confirmed, show Reveal Phone (green)
//   has_direct_phone: "Maybe: ..."      → uncertain, show Request Direct Dial (amber warning)
//   has_direct_phone: false / other     → no phone
//   No row in table                     → unknown (contact not from discovery) → show both reveal buttons
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

      // No row → contact wasn't in discovery search → unknown, show reveal buttons
      if (!data?.raw_data) {
        return {
          noRow:        true,
          hasEmail:     true,
          hasPhone:     true,
          phoneIsYes:   false, // unknown, don't show confirmed green
          phoneIsMaybe: true,  // treat as maybe so user knows it might not be available
        };
      }

      const raw = typeof data.raw_data === 'string' ? JSON.parse(data.raw_data) : data.raw_data;

      // Phone parsing
      const dp = raw.has_direct_phone;
      const phoneIsYes   = dp === true || (typeof dp === 'string' && dp.toLowerCase().trim() === 'yes');
      const phoneIsMaybe = typeof dp === 'string' && dp.toLowerCase().includes('maybe');
      const hasPhone     = phoneIsYes || phoneIsMaybe;

      return {
        noRow:        false,
        hasEmail:     !!raw.has_email,
        hasPhone,
        phoneIsYes,
        phoneIsMaybe,
      };
    },
    enabled: !!apolloPersonId,
    staleTime: 5 * 60 * 1000,
  });
};

// ── Asset section manager ─────────────────────────────────────────────────────
const AssetSectionManager: React.FC<{
  contact: any;
  type: 'email' | 'phone';
  onFieldSave: (field: string, value: any) => Promise<void>;
  onRequestPhone?: () => void;
  isRequestingPhone?: boolean;
  onEnrich?: () => void;
  isEnriching?: boolean;
  phonePending?: boolean;
  isSaving?: boolean;
}> = ({ contact, type, onFieldSave, onRequestPhone, isRequestingPhone, onEnrich, isEnriching, phonePending, isSaving }) => {
  const { toast } = useToast();
  const isEmail = type === 'email';
  const [addOpen, setAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<any>(null);

  // ── isEnriched: last_enriched_at OR apollo_person_id ─────────────────────
  const isEnriched = !!contact.last_enriched_at || !!contact.apollo_person_id;

  // ── Availability from apollo_people_search_masked ─────────────────────────
  // avail=null means no apolloPersonId or still loading → default to true (show reveal)
  const { data: avail, isLoading: availLoading } = useContactAvailability(contact.apollo_person_id);
  // When avail is null (no apollo_person_id) → hide reveal (can't reveal without ID)
  // When avail is defined but no row → show reveal (unknown = possible)
  // When avail has row data → use its signals
  const hasApolloId  = !!contact.apollo_person_id;
  const emailAvail   = hasApolloId ? (avail?.hasEmail   ?? true) : false;
  const phoneAvail   = hasApolloId ? (avail?.hasPhone   ?? true) : false;
  const phoneIsYes   = avail?.phoneIsYes   ?? false;
  const phoneIsMaybe = avail?.phoneIsMaybe ?? false;

  // ── Build unified list from contacts + enrichment tables ──────────────────
  const emails: any[] = React.useMemo(() => {
    const map = new Map<string, any>();
    if (contact.email) {
      map.set(contact.email.toLowerCase(), {
        value: contact.email, type: 'work', status: 'verified', isPrimary: true, source: 'CRM',
      });
    }
    for (const e of (contact.enrichment_contact_emails ?? [])) {
      const k = e.email?.toLowerCase();
      if (k && !map.has(k)) {
        map.set(k, { value: e.email, type: e.email_type ?? e.type, status: e.email_status ?? e.status, isPrimary: false, source: e.source });
      }
    }
    return [...map.values()];
  }, [contact]);

  const phones: any[] = React.useMemo(() => {
    const map = new Map<string, any>();
    if (contact.mobile) {
      map.set(contact.mobile, { value: contact.mobile, type: 'mobile', status: 'valid_number', isPrimary: true, source: 'CRM' });
    }
    for (const p of (contact.enrichment_contact_phones ?? [])) {
      const k = p.phone_number ?? p.raw_number;
      if (k && !map.has(k)) {
        map.set(k, { value: k, type: p.type ?? p.phone_type, status: p.status, isPrimary: false, source: p.source_name });
      }
    }
    return [...map.values()];
  }, [contact]);

  const items     = isEmail ? emails : phones;
  const hasItems  = items.length > 0;
  const hasAvail  = isEmail ? emailAvail : phoneAvail;

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast({ title: 'Copied!' }); };

  // ── Write to enrichment tables, not contacts.email/mobile ─────────────────
  const handleAdd = async (value: string, meta: any) => {
    try {
      if (isEmail) {
        const { error } = await supabase
          .from('enrichment_contact_emails')
          .upsert({
            contact_id:   contact.id,
            email:        value,
            email_status: meta.status || 'unverified',
            is_primary:   false,
            source:       'Manual',
          }, { onConflict: 'contact_id,email' });
        if (error) throw error;
        toast({ title: 'Email added' });
      } else {
        const { error } = await supabase
          .from('enrichment_contact_phones')
          .upsert({
            contact_id:  contact.id,
            phone_number: value,
            type:         meta.type || 'mobile',
            status:       meta.status || 'no_status',
            source_name:  'Manual',
            is_primary:   false,
          }, { onConflict: 'contact_id,phone_number' });
        if (error) throw error;
        toast({ title: 'Phone added' });
      }
      // Refresh contact data
      await onFieldSave('__refresh__', null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to add', description: err.message });
    }
  };

  const handleEdit = async (value: string, meta: any) => {
    if (!editItem) return;
    try {
      if (isEmail) {
        // Delete old row, insert new (email is part of unique key)
        if (editItem.value !== value) {
          await supabase.from('enrichment_contact_emails').delete()
            .eq('contact_id', contact.id).eq('email', editItem.value);
          await supabase.from('enrichment_contact_emails').upsert({
            contact_id: contact.id, email: value,
            email_status: meta.status || editItem.status || 'unverified',
            is_primary: editItem.isPrimary, source: editItem.source || 'Manual',
          }, { onConflict: 'contact_id,email' });
        } else {
          await supabase.from('enrichment_contact_emails')
            .update({ email_status: meta.status })
            .eq('contact_id', contact.id).eq('email', editItem.value);
        }
        // If it's the primary, update contacts.email too
        if (editItem.isPrimary) await onFieldSave('email', value);
      } else {
        if (editItem.value !== value) {
          await supabase.from('enrichment_contact_phones').delete()
            .eq('contact_id', contact.id).eq('phone_number', editItem.value);
          await supabase.from('enrichment_contact_phones').upsert({
            contact_id: contact.id, phone_number: value,
            type: meta.type || editItem.type || 'mobile',
            status: meta.status || editItem.status,
            source_name: editItem.source || 'Manual',
            is_primary: editItem.isPrimary,
          }, { onConflict: 'contact_id,phone_number' });
        } else {
          await supabase.from('enrichment_contact_phones')
            .update({ type: meta.type, status: meta.status })
            .eq('contact_id', contact.id).eq('phone_number', editItem.value);
        }
        if (editItem.isPrimary) await onFieldSave('mobile', value);
      }
      toast({ title: 'Saved' });
      await onFieldSave('__refresh__', null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to update', description: err.message });
    }
    setEditItem(null);
  };

  const handleDelete = async (item: any) => {
    try {
      if (isEmail) {
        await supabase.from('enrichment_contact_emails').delete()
          .eq('contact_id', contact.id).eq('email', item.value);
        // If deleting primary, clear contacts.email
        if (item.isPrimary) await onFieldSave('email', '');
      } else {
        await supabase.from('enrichment_contact_phones').delete()
          .eq('contact_id', contact.id).eq('phone_number', item.value);
        if (item.isPrimary) await onFieldSave('mobile', '');
      }
      toast({ title: 'Deleted' });
      await onFieldSave('__refresh__', null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to delete', description: err.message });
    }
  };

  const handleSetPrimary = async (item: any) => {
    try {
      if (isEmail) {
        // Clear old primary in enrichment table
        await supabase.from('enrichment_contact_emails')
          .update({ is_primary: false }).eq('contact_id', contact.id);
        await supabase.from('enrichment_contact_emails')
          .update({ is_primary: true }).eq('contact_id', contact.id).eq('email', item.value);
        // Set on contacts row
        await onFieldSave('email', item.value);
      } else {
        await supabase.from('enrichment_contact_phones')
          .update({ is_primary: false }).eq('contact_id', contact.id);
        await supabase.from('enrichment_contact_phones')
          .update({ is_primary: true }).eq('contact_id', contact.id).eq('phone_number', item.value);
        await onFieldSave('mobile', item.value);
      }
      toast({ title: 'Set as primary' });
      await onFieldSave('__refresh__', null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    }
  };

  const handleFlag = async (item: any, newStatus: string) => {
    try {
      if (isEmail) {
        await supabase.from('enrichment_contact_emails')
          .update({ email_status: newStatus })
          .eq('contact_id', contact.id).eq('email', item.value);
      } else {
        await supabase.from('enrichment_contact_phones')
          .update({ status: newStatus })
          .eq('contact_id', contact.id).eq('phone_number', item.value);
      }
      toast({ title: newStatus === 'incorrect' || newStatus === 'invalid' ? 'Flagged as invalid' : 'Flag removed' });
      await onFieldSave('__refresh__', null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to flag', description: err.message });
    }
  };

  // ── State machine ─────────────────────────────────────────────────────────
  // Case 1: Not enriched, no manual data — tell user to enrich
  if (!isEnriched && !hasItems) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
          <AlertCircle size={11} className="text-slate-300 flex-shrink-0" />
          <p className="text-[10px] text-slate-400">
            {isEmail ? 'No email found. Enrich to reveal.' : 'No phone found. Enrich to reveal.'}
          </p>
        </div>
        <button onClick={() => setAddOpen(true)} className="flex items-center gap-1 text-[10px] text-purple-500 hover:text-purple-700 font-medium transition-colors">
          <Plus size={10} />Add manually
        </button>
        <AssetDialog open={addOpen} onOpenChange={setAddOpen} type={type} mode="add" onSave={handleAdd} />
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {/* Existing items */}
      {hasItems && (
        <div className="space-y-0.5">
          {items.map((item, i) => (
            <AssetRow
              key={i}
              value={item.value}
              type={type}
              label={item.type}
              status={item.status}
              isPrimary={item.isPrimary}
              isManual={item.source === 'CRM' || !!item.source?.toLowerCase().includes('manual')}
              onCopy={() => copy(item.value)}
              onEdit={() => { setEditItem(item); setEditOpen(true); }}
              onSetPrimary={!item.isPrimary ? () => handleSetPrimary(item) : undefined}
              onDelete={() => handleDelete(item)}
              onFlag={(s) => handleFlag(item, s)}
            />
          ))}
        </div>
      )}

      {/* Reveal button — phone waterfall pending */}
      {!isEmail && phonePending && !hasItems && (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <Loader2 size={11} className="animate-spin text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-amber-700">Lookup in progress</p>
            <p className="text-[9px] text-amber-500">Usually delivers in 1–5 min</p>
          </div>
        </div>
      )}

      {/* Reveal — email available */}
      {isEmail && !hasItems && !phonePending && emailAvail && (
        <button
          onClick={() => onEnrich?.()}
          disabled={!!isEnriching}
          className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg border text-left transition-all group bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:from-purple-100 hover:to-pink-100 hover:border-purple-300 hover:shadow-sm disabled:opacity-60"
        >
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex-shrink-0">
            <Mail size={11} className="text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-purple-700">{isEnriching ? 'Revealing…' : 'Reveal Email'}</p>
            <p className="text-[9px] text-purple-400">Instant via data enrichment</p>
          </div>
          {isEnriching
            ? <Loader2 size={11} className="text-purple-400 animate-spin flex-shrink-0" />
            : <Zap size={11} className="text-purple-300 group-hover:text-purple-500 flex-shrink-0 transition-colors" />
          }
        </button>
      )}

      {/* Reveal — phone confirmed available (has_direct_phone: "Yes") */}
      {!isEmail && !hasItems && !phonePending && phoneAvail && phoneIsYes && (
        <button
          onClick={() => onRequestPhone?.()}
          disabled={!!isRequestingPhone}
          className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg border text-left transition-all group bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 hover:from-emerald-100 hover:to-teal-100 hover:border-emerald-300 hover:shadow-sm disabled:opacity-60"
        >
          <div className="p-1.5 rounded-lg bg-emerald-100 flex-shrink-0">
            <Phone size={11} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-emerald-700">{isRequestingPhone ? 'Requesting…' : 'Reveal Phone'}</p>
            <p className="text-[9px] text-emerald-500">Phone number confirmed available</p>
          </div>
          {isRequestingPhone
            ? <Loader2 size={11} className="text-emerald-400 animate-spin flex-shrink-0" />
            : <Zap size={11} className="text-emerald-300 group-hover:text-emerald-500 flex-shrink-0 transition-colors" />
          }
        </button>
      )}

      {/* Reveal — phone maybe available (has_direct_phone: "Maybe: ...") */}
      {!isEmail && !hasItems && !phonePending && phoneAvail && phoneIsMaybe && (
        <button
          onClick={() => onRequestPhone?.()}
          disabled={!!isRequestingPhone}
          className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg border text-left transition-all group bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm disabled:opacity-60"
        >
          <div className="p-1.5 rounded-lg bg-amber-100 flex-shrink-0">
            <Phone size={11} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-amber-700">{isRequestingPhone ? 'Requesting…' : 'Request Direct Dial'}</p>
            <p className="text-[9px] text-amber-500 flex items-center gap-1">
              <AlertCircle size={8} className="flex-shrink-0" />
              May or may not be available
            </p>
          </div>
          {isRequestingPhone
            ? <Loader2 size={11} className="text-amber-400 animate-spin flex-shrink-0" />
            : <Zap size={11} className="text-amber-300 group-hover:text-amber-500 flex-shrink-0 transition-colors" />
          }
        </button>
      )}

      {/* Not available — row exists, explicitly false */}
      {!hasItems && !phonePending && !hasAvail && isEnriched && (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
          <AlertCircle size={11} className="text-slate-300 flex-shrink-0" />
          <p className="text-[10px] text-slate-400">
            No {isEmail ? 'email' : 'phone number'} found in data
          </p>
        </div>
      )}
      {isEmail && !hasItems && !emailAvail && isEnriched && (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
          <AlertCircle size={11} className="text-slate-300 flex-shrink-0" />
          <p className="text-[10px] text-slate-400">No email found in data</p>
        </div>
      )}

      {/* Add manually link */}
      <button
        onClick={() => setAddOpen(true)}
        className="mt-1 flex items-center gap-1 text-[10px] text-purple-500 hover:text-purple-700 font-medium transition-colors"
      >
        <Plus size={10} />
        Add {isEmail ? 'email' : 'phone'} manually
      </button>

      <AssetDialog open={addOpen} onOpenChange={setAddOpen} type={type} mode="add" onSave={handleAdd} />
      {editItem && (
        <AssetDialog
          open={editOpen} onOpenChange={setEditOpen}
          type={type} mode="edit"
          initialValue={editItem.value} initialType={editItem.type} initialStatus={editItem.status}
          onSave={handleEdit}
        />
      )}
    </div>
  );
};

// ── Reveal email + phone buttons (for not-yet-enriched state) ────────────────
// Uses apollo_people_search_masked for availability signals
const RevealEmailPhoneButtons: React.FC<{
  contact: any;
  onEnrich: () => void;
  onRequestPhone: () => void;
  isEnriching: boolean;
  isRequestingPhone: boolean;
  phonePending: boolean;
}> = ({ contact, onEnrich, onRequestPhone, isEnriching, isRequestingPhone, phonePending }) => {
  const { data: avail } = useContactAvailability(contact.apollo_person_id);

  // If no apollo_person_id at all — contact was never in a search, show sync prompt
  if (!contact.apollo_person_id) {
    return (
      <button
        onClick={onEnrich}
        disabled={isEnriching}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-left transition-all bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:from-purple-100 hover:to-pink-100 hover:border-purple-300 hover:shadow-sm disabled:opacity-60"
      >
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex-shrink-0">
          <Sparkles size={11} className="text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-purple-700">
            {isEnriching ? 'Syncing…' : 'Sync Contact Data'}
          </p>
          <p className="text-[9px] text-purple-400">Find and reveal emails & phone numbers</p>
        </div>
        {isEnriching
          ? <Loader2 size={11} className="text-purple-400 animate-spin flex-shrink-0" />
          : <Zap size={11} className="text-purple-300 flex-shrink-0" />
        }
      </button>
    );
  }

  // Has apollo_person_id — show individual reveal buttons based on availability
  // Default to true (show reveal) when avail is null/loading or no row exists
  const emailAvail   = avail?.hasEmail   ?? true;
  const phoneAvail   = avail?.hasPhone   ?? true;
  const phoneIsYes   = avail?.phoneIsYes   ?? false;
  const phoneIsMaybe = avail?.phoneIsMaybe ?? true; // unknown = treat as maybe

  return (
    <div className="space-y-2">
      {/* Email reveal */}
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
          <Mail size={9} />Emails
        </p>
        {emailAvail ? (
          <button
            onClick={onEnrich}
            disabled={isEnriching}
            className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg border text-left transition-all bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:from-purple-100 hover:to-pink-100 hover:border-purple-300 hover:shadow-sm disabled:opacity-60 group"
          >
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex-shrink-0">
              <Mail size={11} className="text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-purple-700">{isEnriching ? 'Revealing…' : 'Reveal Email'}</p>
              <p className="text-[9px] text-purple-400">Instant via data enrichment</p>
            </div>
            {isEnriching
              ? <Loader2 size={11} className="text-purple-400 animate-spin flex-shrink-0" />
              : <Zap size={11} className="text-purple-300 group-hover:text-purple-500 flex-shrink-0 transition-colors" />
            }
          </button>
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
            <AlertCircle size={10} className="text-slate-300 flex-shrink-0" />
            <p className="text-[10px] text-slate-400">No email found in data</p>
          </div>
        )}
      </div>

      {/* Phone reveal */}
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
          <Phone size={9} />Phone Numbers
        </p>
        {phonePending ? (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-200">
            <Loader2 size={11} className="animate-spin text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-amber-700">Lookup in progress</p>
              <p className="text-[9px] text-amber-500">Usually delivers in 1–5 min</p>
            </div>
          </div>
        ) : phoneAvail && phoneIsYes ? (
          /* Confirmed available — has_direct_phone: "Yes" */
          <button
            onClick={onRequestPhone}
            disabled={isRequestingPhone}
            className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg border text-left transition-all bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 hover:from-emerald-100 hover:to-teal-100 hover:border-emerald-300 hover:shadow-sm disabled:opacity-60 group"
          >
            <div className="p-1.5 rounded-lg bg-emerald-100 flex-shrink-0">
              <Phone size={11} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-emerald-700">
                {isRequestingPhone ? 'Requesting…' : 'Reveal Phone'}
              </p>
              <p className="text-[9px] text-emerald-500">Phone number confirmed available</p>
            </div>
            {isRequestingPhone
              ? <Loader2 size={11} className="text-emerald-400 animate-spin flex-shrink-0" />
              : <Zap size={11} className="text-emerald-300 group-hover:text-emerald-500 flex-shrink-0 transition-colors" />
            }
          </button>
        ) : phoneAvail && phoneIsMaybe ? (
          /* Maybe available — has_direct_phone: "Maybe: ..." or unknown */
          <button
            onClick={onRequestPhone}
            disabled={isRequestingPhone}
            className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg border text-left transition-all bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm disabled:opacity-60 group"
          >
            <div className="p-1.5 rounded-lg bg-amber-100 flex-shrink-0">
              <Phone size={11} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-amber-700">
                {isRequestingPhone ? 'Requesting…' : 'Request Direct Dial'}
              </p>
              <p className="text-[9px] text-amber-500 flex items-center gap-1">
                <AlertCircle size={8} className="flex-shrink-0" />
                May or may not be available
              </p>
            </div>
            {isRequestingPhone
              ? <Loader2 size={11} className="text-amber-400 animate-spin flex-shrink-0" />
              : <Zap size={11} className="text-amber-300 group-hover:text-amber-500 flex-shrink-0 transition-colors" />
            }
          </button>
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
            <AlertCircle size={10} className="text-slate-300 flex-shrink-0" />
            <p className="text-[10px] text-slate-400">No phone found in data</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const ProspectOverviewPanel: React.FC<Props> = ({
  contact, onFieldSave, onRequestPhone, onEnrich,
  isRequestingPhone, isEnriching, phonePending, isSaving
}) => {
  const data = extractFromRaw(contact);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAllHistory, setShowAllHistory] = useState(false);

  // ── LinkedIn inline edit state ────────────────────────────────────────────
  const [editingLinkedIn, setEditingLinkedIn] = useState(false);
  const [draftLinkedIn, setDraftLinkedIn] = useState(contact.linkedin_url || '');
  const linkedinRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingLinkedIn) linkedinRef.current?.focus(); }, [editingLinkedIn]);
  useEffect(() => { setDraftLinkedIn(contact.linkedin_url || ''); }, [contact.linkedin_url]);

  const saveLinkedIn = async () => {
    if (draftLinkedIn.trim() !== (contact.linkedin_url || '')) {
      await onFieldSave('linkedin_url', draftLinkedIn.trim());
    }
    setEditingLinkedIn(false);
  };
  const cancelLinkedIn = () => { setDraftLinkedIn(contact.linkedin_url || ''); setEditingLinkedIn(false); };
  const copyLinkedIn = () => {
    if (contact.linkedin_url) {
      navigator.clipboard.writeText(contact.linkedin_url);
      toast({ title: 'Copied!', description: 'LinkedIn URL copied' });
    }
  };

  // ── isEnriched: last_enriched_at is the primary signal; apollo_person_id is fallback
  // Both mean the contact has been through the enrichment pipeline
  const isEnriched = !!contact.last_enriched_at || !!contact.apollo_person_id;
  const lastEnrichedAt = contact.last_enriched_at ?? null;

  const enrichmentPerson = contact.enrichment_people?.[0];
  const employmentHistory = data.employmentHistory || enrichmentPerson?.enrichment_employment_history || [];
  const visibleHistory = showAllHistory ? employmentHistory : employmentHistory.slice(0, 3);

  // Similar contacts
  const titleKeywords = contact.job_title?.split(' ')?.[0] || '';
  const { data: peers = [], isLoading: peersLoading } = useQuery({
    queryKey: ['similar-people', contact.organization_id, contact.job_title],
    queryFn: async () => {
      if (!contact.organization_id) return [];
      const { data: d } = await supabase
        .from('contacts')
        .select('id, name, job_title, photo_url, contact_stage, city, enrichment_people(photo_url, seniority)')
        .eq('organization_id', contact.organization_id)
        .neq('id', contact.id)
        .ilike('job_title', `%${titleKeywords}%`)
        .limit(6);
      return d || [];
    },
    enabled: !!contact.organization_id && !!titleKeywords,
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${label} copied to clipboard` });
  };

  return (
    <div className="space-y-3">

      {/* ── Hero Card ──────────────────────────────────────────────── */}
      <GradCard>
        <div className="h-1 bg-gradient-to-r from-purple-600 via-violet-500 to-pink-600" />
        <div className="p-3.5">
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14 border-2 border-white shadow-md ring-2 ring-purple-100 flex-shrink-0">
              <AvatarImage src={contact.photo_url || data.photoUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700 text-lg font-bold">
                {contact.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <HeroEditField
                    value={contact.name || ''}
                    onSave={v => onFieldSave('name', v)}
                    isSaving={isSaving}
                    placeholder="Contact name"
                    className="text-base font-bold text-gray-900"
                    inputClassName="text-base font-bold w-44"
                  />
                  <HeroEditField
                    value={contact.job_title || ''}
                    onSave={v => onFieldSave('job_title', v)}
                    isSaving={isSaving}
                    placeholder="Add job title"
                    className="text-xs text-gray-500 mt-0.5"
                    inputClassName="text-xs w-44"
                  />
                </div>
                {isEnriched ? (
                  <span className="flex-shrink-0 text-[9px] font-bold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Enriched
                  </span>
                ) : (
                  <button
                    onClick={onEnrich}
                    disabled={isEnriching}
                    className="flex-shrink-0 text-[9px] font-bold bg-gradient-to-r from-purple-50 to-pink-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1 hover:from-purple-100 hover:to-pink-100 transition-all"
                  >
                    {isEnriching ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />}
                    Enrich Now
                  </button>
                )}
              </div>

              {/* Summary / headline */}
              {data.headline && data.headline !== contact.job_title && (
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed line-clamp-2">{data.headline}</p>
              )}

              {/* Location, LinkedIn, meta — compact inline */}
              <div className="mt-2 space-y-1">
                {/* Location — compact single-line with dropdown */}
                <LocationFieldsGroup
                  city={contact.city || ''}
                  state={contact.state || ''}
                  country={contact.country || ''}
                  onSave={onFieldSave}
                  isSaving={isSaving}
                  compact
                />

                {/* LinkedIn — inline editable */}
                <div className="flex items-center gap-1.5 group">
                  <Linkedin size={11} className="text-[#0A66C2] flex-shrink-0" />
                  {editingLinkedIn ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <div className="rounded-md p-[1px] bg-gradient-to-r from-purple-500 to-pink-500 flex-1 min-w-0">
                        <input
                          ref={linkedinRef}
                          type="url"
                          value={draftLinkedIn}
                          onChange={e => setDraftLinkedIn(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveLinkedIn(); if (e.key === 'Escape') cancelLinkedIn(); }}
                          placeholder="https://linkedin.com/in/username"
                          className="bg-white rounded-[5px] px-2 py-0.5 text-xs focus:outline-none w-full"
                        />
                      </div>
                      <button onClick={saveLinkedIn} disabled={isSaving} className="p-1 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 flex-shrink-0">
                        {isSaving ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
                      </button>
                      <button onClick={cancelLinkedIn} className="p-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 flex-shrink-0">
                        <X size={9} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {contact.linkedin_url ? (
                        <a href={contact.linkedin_url} target="_blank" rel="noreferrer"
                          className="text-[#0A66C2] hover:underline text-xs truncate flex-1">
                          {contact.linkedin_url.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, '') || contact.linkedin_url}
                        </a>
                      ) : (
                        <span className="text-gray-300 italic text-xs flex-1">Add LinkedIn profile</span>
                      )}
                      <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
                        {contact.linkedin_url && (
                          <button onClick={copyLinkedIn} className="p-0.5 rounded hover:bg-gray-100 text-slate-400 hover:text-slate-600 transition-colors">
                            <Copy size={9} />
                          </button>
                        )}
                        <button onClick={() => setEditingLinkedIn(true)} className="p-0.5 rounded hover:bg-purple-50 text-slate-400 hover:text-purple-500 transition-colors">
                          <Pencil size={9} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Seniority + timezone + medium chips */}
                {(data.seniority || data.timezone || contact.timezone || contact.medium) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
                    {data.seniority && (
                      <span className="flex items-center gap-1 capitalize">
                        <Award size={9} className="text-slate-400" />{data.seniority}
                      </span>
                    )}
                    {(data.timezone || contact.timezone) && (
                      <span className="flex items-center gap-1">
                        <Clock size={9} className="text-slate-400" />{(data.timezone || contact.timezone)?.replace('_', ' ')}
                      </span>
                    )}
                    {contact.medium && (
                      <span className="bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full font-medium border border-violet-100">
                        via {contact.medium}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dept tags */}
          {(hasData(data.departments) || hasData(data.functions) || hasData(data.subdepartments)) && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap gap-1.5">
                {[...data.departments, ...data.functions, ...data.subdepartments]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((tag: string, i: number) => (
                    <span key={i} className="text-[10px] bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full capitalize font-medium">
                      {tag.replace(/_/g, ' ')}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </GradCard>

      {/* ── Editable Contact Fields ─────────────────────────────────── */}
      {/* <GradCard>
        <SectionHeader
          title="Contact Details"
          icon={User}
          aside={<LastEnriched at={lastEnrichedAt} />}
        />
        <div className="p-3 space-y-0 divide-y divide-gray-50">
          <EditableField
            icon={Mail}
            label="Primary Email"
            value={contact.email || ''}
            onSave={v => onFieldSave('email', v)}
            isSaving={isSaving}
            placeholder="Add email"
            type="email"
            verified
          />
          <EditableField
            icon={Phone}
            label="Mobile"
            value={contact.mobile || ''}
            onSave={v => onFieldSave('mobile', v)}
            isSaving={isSaving}
            placeholder="Add phone"
            type="tel"
          />
          <EditableField
            icon={Linkedin}
            label="LinkedIn URL"
            value={contact.linkedin_url || ''}
            onSave={v => onFieldSave('linkedin_url', v)}
            isSaving={isSaving}
            placeholder="https://linkedin.com/in/..."
          />
          <LocationFieldsGroup
            city={contact.city || ''}
            state={contact.state || ''}
            country={contact.country || ''}
            onSave={onFieldSave}
            isSaving={isSaving}
          />
        </div>
      </GradCard> */}

      {/* ── Enriched Contact Info ───────────────────────────────────── */}
      <GradCard>
        <SectionHeader
          title="Contact Info"
          icon={Sparkles}
          aside={
            <div className="flex items-center gap-2">
              <LastEnriched at={lastEnrichedAt} />
              {isEnriched && (
                <span className="text-[9px] font-semibold text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full">
                  Enriched
                </span>
              )}
            </div>
          }
        />

        {!isEnriched ? (
          /* Not yet enriched — show reveal buttons using availability from masked data */
          <div className="p-3 space-y-2">
            <RevealEmailPhoneButtons
              contact={contact}
              onEnrich={onEnrich}
              onRequestPhone={onRequestPhone}
              isEnriching={isEnriching}
              isRequestingPhone={isRequestingPhone}
              phonePending={phonePending}
            />
          </div>
        ) : (
          <div className="p-3 space-y-2.5">
            {/* Emails section */}
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Mail size={9} />
                Emails
              </p>
              <AssetSectionManager
                contact={contact} type="email"
                onFieldSave={onFieldSave}
                onEnrich={onEnrich}
                isEnriching={isEnriching}
                isSaving={isSaving}
              />
            </div>

            {/* Phones section */}
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Phone size={9} />
                Phone Numbers
              </p>
              <AssetSectionManager
                contact={contact} type="phone"
                onFieldSave={onFieldSave}
                onRequestPhone={onRequestPhone}
                isRequestingPhone={isRequestingPhone}
                phonePending={phonePending}
                isSaving={isSaving}
              />
            </div>
          </div>
        )}
      </GradCard>

      {/* ── Career Timeline ─────────────────────────────────────────── */}
      <GradCard>
        <SectionHeader title="Career Timeline" icon={Briefcase} />
        {employmentHistory.length === 0 ? (
          !isEnriched ? (
            <EmptySection
              icon={Briefcase}
              message="No career data"
              sub="Sync this contact to pull employment history"
            />
          ) : (
            <EmptySection
              icon={Briefcase}
              message="No employment history found"
              sub="No career history found in enrichment data"
            />
          )
        ) : (
          <div className="p-3">
            <div className="relative pl-3 border-l-2 border-purple-100 space-y-3">
              {visibleHistory.map((job: any, idx: number) => (
                <CareerEntry key={job.id || idx} job={job} isFirst={idx === 0} />
              ))}
            </div>
            {employmentHistory.length > 3 && (
              <button
                onClick={() => setShowAllHistory(v => !v)}
                className="mt-3 text-xs font-semibold text-purple-500 hover:text-purple-700 flex items-center gap-1 transition-colors"
              >
                {showAllHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showAllHistory ? 'Show less' : `Show ${employmentHistory.length - 3} more`}
              </button>
            )}
          </div>
        )}
      </GradCard>

      {/* ── Profile Details (metadata) ──────────────────────────────── */}
      {/* {data.rawPerson && <MetadataCard rawPerson={data.rawPerson} isEnriched={isEnriched} />} */}

      {/* ── Similar Prospects ───────────────────────────────────────── */}
      {(peers.length > 0 || peersLoading) && (
        <GradCard>
          <SectionHeader
            title="Similar Prospects"
            icon={User}
            aside={!peersLoading && <span className="text-[10px] text-gray-400">{peers.length} found</span>}
          />
          {peersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {peers.map((peer: any) => (
                <div key={peer.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-violet-50/30 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/contacts/${peer.id}`)}
                >
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={peer.photo_url || peer.enrichment_people?.[0]?.photo_url} />
                    <AvatarFallback className="bg-purple-50 text-purple-500 text-[10px] font-semibold">
                      {peer.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{peer.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{peer.job_title}</p>
                  </div>
                  {peer.contact_stage && <StagePill stage={peer.contact_stage} />}
                  <Eye size={12} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </GradCard>
      )}
    </div>
  );
};

// ── Email / Phone row ─────────────────────────────────────────────────────────
const EmailPhoneRow: React.FC<{
  icon: React.ElementType;
  value: string;
  label: string;
  verified?: boolean;
  onCopy: () => void;
}> = ({ icon: Icon, value, label, verified, onCopy }) => (
  <div className="flex items-center gap-2 group px-3 py-2 rounded-lg bg-slate-50 hover:bg-violet-50/40 border border-transparent hover:border-violet-100 transition-all">
    <Icon size={12} className={cn("flex-shrink-0", verified ? "text-green-500" : "text-slate-400")} />
    <div className="flex-1 min-w-0">
      <p className="text-[9px] text-slate-400 capitalize">{label}</p>
      <p className="text-xs font-medium text-slate-700 truncate">{value}</p>
    </div>
    {verified && <CheckCircle2 size={11} className="text-green-500 flex-shrink-0" />}
    <button
      onClick={onCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white text-slate-400 hover:text-purple-500"
    >
      <Copy size={10} />
    </button>
  </div>
);

// ── Career entry ──────────────────────────────────────────────────────────────
const CareerEntry: React.FC<{ job: any; isFirst: boolean }> = ({ job, isFirst }) => {
  const isCurrent = job.current || job.is_current;
  const startYear = job.start_date ? new Date(job.start_date).getFullYear() : null;
  const endYear = job.end_date ? new Date(job.end_date).getFullYear() : null;

  return (
    <div className="relative">
      <div className={cn(
        "absolute -left-[17px] mt-1 w-3 h-3 rounded-full border-2 border-white shadow-sm",
        isCurrent ? "bg-gradient-to-br from-purple-500 to-pink-500" : "bg-gray-300"
      )} />
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-800">{job.title}</p>
            <p className="text-xs text-gray-500">{job.organization_name}</p>
          </div>
          <div className="text-right flex-shrink-0">
            {isCurrent && (
              <span className="text-[9px] font-bold bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-1.5 py-0.5 rounded-full block mb-0.5">
                Current
              </span>
            )}
            <p className="text-[10px] text-gray-400">
              {startYear}{startYear && (endYear || isCurrent) ? ' – ' : ''}{isCurrent ? 'Present' : endYear}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Metadata card ─────────────────────────────────────────────────────────────
const MetadataCard: React.FC<{ rawPerson: any; isEnriched: boolean }> = ({ rawPerson, isEnriched }) => {
  const fields = [
    rawPerson.languages?.length > 0 && { label: 'Languages', value: rawPerson.languages.join(', '), icon: Languages },
    rawPerson.departments?.length > 0 && { label: 'Departments', value: rawPerson.departments.map((d: string) => d.replace(/_/g, ' ')).join(', '), icon: Briefcase },
    rawPerson.seniority && { label: 'Seniority Level', value: rawPerson.seniority, icon: TrendingUp },
    rawPerson.intent_strength && { label: 'Intent Strength', value: rawPerson.intent_strength, icon: Tag },
    rawPerson.time_zone && { label: 'Timezone', value: rawPerson.time_zone.replace(/_/g, ' '), icon: Clock },
  ].filter(Boolean) as Array<{ label: string; value: string; icon: any }>;

  if (!isEnriched) {
    return (
      <GradCard>
        <SectionHeader title="Profile Details" icon={Info} />
        <EmptySection
          icon={Lock}
          message="Not enriched yet"
          sub="Sync data to pull seniority, departments, languages and signals"
        />
      </GradCard>
    );
  }

  if (fields.length === 0) {
    return (
      <GradCard>
        <SectionHeader title="Profile Details" icon={Info} />
        <EmptySection
          icon={Info}
          message="No additional profile data found"
          sub="No additional profile data found in enrichment"
        />
      </GradCard>
    );
  }

  return (
    <GradCard>
      <SectionHeader title="Profile Details" icon={Info} />
      <div className="p-3 grid grid-cols-2 gap-2">
        {fields.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-start gap-2">
            <div className="p-1.5 bg-violet-50 border border-violet-100 rounded-lg flex-shrink-0 mt-0.5">
              <Icon size={10} className="text-violet-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-gray-400 mb-0.5">{label}</p>
              <p className="text-xs font-medium text-gray-700 capitalize truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </GradCard>
  );
};

// ── Stage pill ────────────────────────────────────────────────────────────────
const StagePill: React.FC<{ stage: string }> = ({ stage }) => {
  const { data: stages = [] } = useContactStages();
  const stageInfo = stages.find((s: any) => s.name === stage);
  const color = stageInfo?.color || '#94a3b8';
  return (
    <span
      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0"
      style={{ backgroundColor: color + '18', color, borderColor: color + '40' }}
    >
      {stage}
    </span>
  );
};

// ── Inline empty section helper ───────────────────────────────────────────────
const EmptySectionInline: React.FC<{ message: string; sub?: string; icon: React.ElementType; action?: React.ReactNode }> = EmptySection;

export default ProspectOverviewPanel;