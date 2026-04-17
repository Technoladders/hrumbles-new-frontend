// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ContactDetailHeader.tsx
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  ChevronLeft, Sparkles, PhoneCall, Mail, StickyNote,
  Calendar, CheckSquare, MoreHorizontal, ExternalLink,
  Building2, ListPlus, Linkedin, Trash2, Check, X,
  Pencil, Loader2, ChevronDown, Clock, RefreshCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { extractFromRaw } from '@/utils/dataExtractor';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useContactStages } from '@/hooks/sales/useContactStages';

type ActivityModalType = 'call' | 'note' | 'email' | 'task' | 'meeting' | 'linkedin' | null;

interface Props {
  contact: any;
  onBack: () => void;
  onEnrich: () => void;
  isEnriching: boolean;
  onOpenModal: (type: ActivityModalType) => void;
  refetch: () => void;
  onAddToList: () => void;
  onFieldSave: (field: string, value: any) => Promise<void>;
  isSaving: boolean;
}

// Local time badge — ticks every minute
const LocalTimeBadge: React.FC<{ timezone?: string }> = ({ timezone }) => {
  const [time, setTime] = useState('');
  useEffect(() => {
    if (!timezone) return;
    const tick = () => {
      try {
        setTime(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date()));
      } catch { setTime(''); }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [timezone]);

  if (!timezone || !time) return null;
  let abbr = '';
  try { abbr = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || ''; } catch {}

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 cursor-default">
            <Clock size={10} className="text-slate-400" />
            <span className="text-[10px] font-medium text-slate-600">{time}</span>
            {abbr && <span className="text-[9px] text-slate-400">{abbr}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{timezone.replace(/_/g, ' ')} — local time</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Last synced/enriched badge
const SyncedBadge: React.FC<{ at?: string }> = ({ at }) => {
  if (!at) return null;
  let label = '';
  try { label = formatDistanceToNow(parseISO(at), { addSuffix: true }); } catch { return null; }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 border border-green-100 cursor-default">
            <RefreshCw size={9} className="text-green-500" />
            <span className="text-[9px] font-medium text-green-600">Enriched {label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Last data sync: {format(parseISO(at), 'MMM d, yyyy HH:mm')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Inline editable field
const InlineEditField: React.FC<{
  value: string; onSave: (v: string) => void; isSaving?: boolean;
  placeholder?: string; className?: string; inputClassName?: string;
}> = ({ value, onSave, isSaving, placeholder = 'Click to edit', className, inputClassName }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = async () => { if (draft.trim() !== value) await onSave(draft.trim()); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className={cn('group flex items-center gap-1 hover:opacity-75 transition-opacity text-left', className)}>
        <span>{value || <span className="text-gray-400 italic text-xs">{placeholder}</span>}</span>
        <Pencil size={9} className="opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0" />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <div className="rounded-md p-[1px] bg-gradient-to-r from-purple-500 to-pink-500">
        <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
          className={cn('bg-white rounded-[5px] px-2 py-0.5 focus:outline-none', inputClassName)} />
      </div>
      <button onClick={commit} disabled={isSaving} className="p-1 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90">
        {isSaving ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
      </button>
      <button onClick={cancel} className="p-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200"><X size={9} /></button>
    </div>
  );
};

// Stage dropdown (portal) — reads from contact_stages table
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
      <button
        ref={ref}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all hover:opacity-80"
        style={currentStage
          ? { backgroundColor: dotColor + '18', color: dotColor, borderColor: dotColor + '40' }
          : { backgroundColor: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' }
        }
      >
        {isSaving
          ? <Loader2 size={9} className="animate-spin" />
          : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
        }
        {current || 'Set Stage'}
        <ChevronDown size={9} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && ReactDOM.createPortal(
        <div style={style} className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden py-1 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
          {stages.map(s => (
            <button
              key={s.id}
              onMouseDown={e => { e.preventDefault(); onSelect(s.name); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-left transition-all hover:bg-slate-50 hover:pl-4"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || '#94a3b8' }} />
              <span style={{ color: current === s.name ? (s.color || '#7c3aed') : '#374151' }}>{s.name}</span>
              {current === s.name && <Check size={10} className="ml-auto" style={{ color: s.color || '#7c3aed' }} />}
            </button>
          ))}
          {stages.length === 0 && <div className="px-3 py-2 text-[10px] text-slate-400">No stages configured</div>}
        </div>,
        document.body
      )}
    </div>
  );
};

export const ContactDetailHeader: React.FC<Props> = ({ contact, onBack, onEnrich, isEnriching, onOpenModal, onAddToList, onFieldSave, isSaving }) => {
  const data = extractFromRaw(contact);
  const companyWebsite = contact?.companies?.website || null;
  // Use last_enriched_at from contacts table (set by enrich-contact edge function)
  const enrichedAt = contact?.last_enriched_at
    || contact?.enrichment_people?.[0]?.updated_at
    || null;
  const timezone = data?.timezone || contact?.timezone
    || contact?.enrichment_people?.[0]?.enrichment_person_metadata?.[0]?.time_zone
    || null;

  const quickActions = [
    { type: 'call' as const, icon: PhoneCall, tooltip: 'Log Call' },
    { type: 'email' as const, icon: Mail, tooltip: 'Log Email' },
    { type: 'linkedin' as const, icon: Linkedin, tooltip: 'Log LinkedIn' },
    { type: 'note' as const, icon: StickyNote, tooltip: 'Create Note' },
    { type: 'task' as const, icon: CheckSquare, tooltip: 'Create Task' },
    { type: 'meeting' as const, icon: Calendar, tooltip: 'Log Meeting' },
  ];

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
      <div className="h-[2px] bg-gradient-to-r from-purple-600 via-violet-500 to-pink-600" />
      <div className="h-[61px] px-4 flex items-center justify-between gap-3">

        {/* Left */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button onClick={onBack} className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-purple-600 transition-colors flex-shrink-0">
            <ChevronLeft size={14} /><span className="hidden sm:inline">People</span>
          </button>
          <span className="text-gray-200 hidden sm:inline text-xs">/</span>
          <Avatar className="h-7 w-7 border-2 border-white shadow-sm flex-shrink-0 ring-1 ring-purple-100">
            <AvatarImage src={contact.photo_url || data.photoUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700 text-[10px] font-bold">
              {contact.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <InlineEditField value={contact.name || ''} onSave={v => onFieldSave('name', v)} isSaving={isSaving} placeholder="Name" className="text-sm font-semibold text-gray-900" inputClassName="text-sm font-semibold w-36" />
              <StageDropdown current={contact.contact_stage} onSelect={s => onFieldSave('contact_stage', s)} isSaving={isSaving} />
              {(contact.last_enriched_at || contact.apollo_person_id) && (
                <span className="hidden md:inline-flex items-center gap-1 text-[9px] font-semibold bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">
                  <span className="w-1 h-1 rounded-full bg-green-500" />Enriched
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <InlineEditField value={contact.job_title || ''} onSave={v => onFieldSave('job_title', v)} isSaving={isSaving} placeholder="Title" className="text-[11px] text-gray-400" inputClassName="text-xs w-28" />
              {contact.company_name && (
                <>
                  <span className="text-gray-200 text-xs">·</span>
                  {companyWebsite ? (
                    <a href={companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`} target="_blank" rel="noreferrer" className="text-[11px] text-purple-500 hover:text-purple-700 inline-flex items-center gap-0.5 transition-colors">
                      <InlineEditField value={contact.company_name || ''} onSave={v => onFieldSave('company_name', v)} isSaving={isSaving} placeholder="Company" className="text-[11px] text-purple-500" inputClassName="text-xs w-24" />
                      <ExternalLink size={8} className="opacity-50" />
                    </a>
                  ) : (
                    <InlineEditField value={contact.company_name || ''} onSave={v => onFieldSave('company_name', v)} isSaving={isSaving} placeholder="Company" className="text-[11px] text-gray-400" inputClassName="text-xs w-24" />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <LocalTimeBadge timezone={timezone} />
          <SyncedBadge at={enrichedAt} />

          <div className="hidden lg:flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-lg p-0.5 mr-1">
            {quickActions.map(({ type, icon: Icon, tooltip }) => (
              <TooltipProvider key={type}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-all" onClick={() => onOpenModal(type)}>
                      <Icon size={13} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs" sideOffset={8}>{tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={onAddToList} className="h-7 px-2.5 text-xs font-medium text-gray-600 border-gray-200 hidden sm:flex items-center gap-1 hover:border-purple-300 hover:text-purple-600 transition-all">
            <ListPlus size={12} />Add to list
          </Button>

          <Button size="sm" onClick={onEnrich} disabled={isEnriching} className="h-7 px-3 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg shadow-sm border-0 transition-all">
            <Sparkles size={11} className={cn('mr-1', isEnriching && 'animate-spin')} />
            {isEnriching ? 'Enriching…' : 'Enrich Contact'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                <MoreHorizontal size={15} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {quickActions.map(({ type, icon: Icon, tooltip }) => (
                <DropdownMenuItem key={type} onClick={() => onOpenModal(type)} className="lg:hidden text-xs">
                  <Icon size={12} className="mr-2" />{tooltip}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="lg:hidden" />
              <DropdownMenuItem className="text-xs"><Building2 size={12} className="mr-2" />View Company</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-red-600"><Trash2 size={12} className="mr-2" />Delete Contact</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};