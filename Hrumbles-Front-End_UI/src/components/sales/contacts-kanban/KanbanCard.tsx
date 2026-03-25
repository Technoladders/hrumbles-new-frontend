// src/components/sales/contacts-kanban/KanbanCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useDrag } from 'react-dnd';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Eye, ListPlus, Zap, GripVertical,
  Mail, Phone, MapPin, Building2, Linkedin,
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { KanbanContact, KanbanBoardType } from '@/hooks/sales/useKanbanContacts';

// ── Drag type ────────────────────────────────────────────────────────────────

export const DRAG_TYPE = 'KANBAN_CARD' as const;

export interface DragItem {
  type:      typeof DRAG_TYPE;
  contactId: string;
  contact:   KanbanContact;
  sourceKey: string;
}

// ── Availability icon ─────────────────────────────────────────────────────────

const AvailIcon = ({
  state, icon: Icon, tip,
}: {
  state: 'yes' | 'maybe' | 'no';
  icon: React.ElementType;
  tip: string;
}) => {
  const cls = {
    yes:   'bg-emerald-50 text-emerald-600',
    maybe: 'bg-amber-50   text-amber-500',
    no:    'bg-slate-100  text-slate-400',
  }[state];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center justify-center h-5 w-5 rounded-md transition-colors', cls)}>
            <Icon className="h-2.5 w-2.5" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs capitalize">
          {tip}: {state === 'yes' ? 'Available' : state === 'maybe' ? 'Possible' : 'Not found'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ── Quick-action button ───────────────────────────────────────────────────────

const QuickBtn = ({
  tip, hoverCls, onClick, children,
}: {
  tip: string;
  hoverCls?: string;
  onClick?: React.MouseEventHandler;
  children: React.ReactNode;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={e => { e.stopPropagation(); onClick?.(e); }}
          className={cn(
            'p-1 rounded-md text-slate-400 transition-colors',
            hoverCls ?? 'hover:text-indigo-600 hover:bg-indigo-50',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent className="text-xs">{tip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface KanbanCardProps {
  contact:         KanbanContact;
  sourceKey:       string;
  stageColor?:     string;
  boardType:       KanbanBoardType;
  showStageBadge?: boolean;
  onEnrich?:       (contactId: string, apolloId: string | null, type: 'email' | 'phone') => void;
  onAddToList?:    (contact: KanbanContact) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const KanbanCard: React.FC<KanbanCardProps> = ({
  contact, sourceKey, stageColor, boardType,
  showStageBadge = false, onEnrich, onAddToList,
}) => {
  // Whole card is the drag handle for maximum drop-area
  const [{ isDragging }, dragRef] = useDrag<
    DragItem, unknown, { isDragging: boolean }
  >({
    type: DRAG_TYPE,
    item: () => ({ type: DRAG_TYPE, contactId: contact.id, contact, sourceKey }),
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  });

  const location = [contact.city, contact.country].filter(Boolean).join(', ');

  return (
    <div
      ref={dragRef}
      className={cn(
        'group relative bg-white rounded-xl border shadow-sm p-3 select-none',
        'transition-all duration-150',
        isDragging
          // Ghost stays in place; drag preview follows cursor
          ? 'opacity-30 border-dashed border-indigo-300 cursor-grabbing scale-[0.97]'
          : 'border-slate-200 hover:border-indigo-200 hover:shadow-md cursor-grab active:cursor-grabbing',
      )}
    >
      {/* ── Top row: avatar + name + grip ─────────────────────────────── */}
      <div className="flex items-start gap-2 mb-2.5">
        <Avatar className="h-8 w-8 rounded-lg flex-shrink-0 border border-slate-100">
          <AvatarImage src={contact.photo_url ?? undefined} />
          <AvatarFallback className="text-[10px] font-bold rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700">
            {contact.name?.[0]?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <Link
            to={`/contacts/${contact.id}`}
            className="block text-[11.5px] font-semibold text-slate-800 hover:text-indigo-600 truncate leading-snug transition-colors"
            onClick={e => e.stopPropagation()}
          >
            {contact.name}
          </Link>
          {contact.job_title && (
            <p className="text-[9.5px] text-slate-500 truncate leading-snug mt-0.5">
              {contact.job_title}
            </p>
          )}
        </div>

        {/* Grip — cosmetic hint, whole card drags */}
        <GripVertical className="h-3.5 w-3.5 text-slate-300 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* ── Company ──────────────────────────────────────────────────── */}
      {contact.company_name && (
        <div className="flex items-center gap-1.5 mb-1.5">
          {contact.company_logo ? (
            <img
              src={contact.company_logo}
              alt={contact.company_name}
              className="h-3.5 w-3.5 rounded object-contain border border-slate-100 flex-shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Building2 className="h-3 w-3 text-slate-400 flex-shrink-0" />
          )}
          <span className="text-[10px] text-slate-600 font-medium truncate">
            {contact.company_name}
          </span>
        </div>
      )}

      {/* ── Location ─────────────────────────────────────────────────── */}
      {location && (
        <div className="flex items-center gap-1 mb-1.5">
          <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
          <span className="text-[9.5px] text-slate-500 truncate">{location}</span>
        </div>
      )}

      {/* ── Stage badge (list-board mode only) ───────────────────────── */}
      {showStageBadge && contact.contact_stage && contact.contact_stage !== 'Unassigned' && (
        <div className="mb-2">
          <Badge
            className="h-4 px-1.5 text-[8.5px] font-bold border"
            style={{
              backgroundColor: (stageColor ?? '#94a3b8') + '18',
              color:           stageColor ?? '#64748b',
              borderColor:     (stageColor ?? '#94a3b8') + '40',
            }}
          >
            {contact.contact_stage}
          </Badge>
        </div>
      )}

      {/* ── Footer: availability signals + quick actions ──────────────── */}
      <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-slate-100">
        {/* Signals */}
        <div className="flex items-center gap-1">
          <AvailIcon state={contact.email_avail ?? 'no'}        icon={Mail}      tip="Email"    />
          <AvailIcon state={contact.phone_avail ?? 'no'}        icon={Phone}     tip="Phone"    />
          <AvailIcon state={location ? 'yes' : 'no'}            icon={MapPin}    tip="Location" />
          <AvailIcon state={contact.company_name ? 'yes' : 'no'} icon={Building2} tip="Company" />
        </div>

        {/* Quick actions — show on hover */}
        <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {contact.linkedin_url && (
            <QuickBtn tip="LinkedIn" hoverCls="hover:text-[#0A66C2] hover:bg-blue-50">
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
              >
                <Linkedin size={11} />
              </a>
            </QuickBtn>
          )}

          <QuickBtn tip="View" hoverCls="hover:text-indigo-600 hover:bg-indigo-50">
            <Link to={`/contacts/${contact.id}`} onClick={e => e.stopPropagation()}>
              <Eye size={11} />
            </Link>
          </QuickBtn>

          {contact.apollo_person_id && (
            <QuickBtn
              tip="Enrich"
              hoverCls="hover:text-emerald-600 hover:bg-emerald-50"
              onClick={() => onEnrich?.(contact.id, contact.apollo_person_id ?? null, 'email')}
            >
              <Zap size={11} />
            </QuickBtn>
          )}

          <QuickBtn
            tip="Add to list"
            hoverCls="hover:text-violet-600 hover:bg-violet-50"
            onClick={() => onAddToList?.(contact)}
          >
            <ListPlus size={11} />
          </QuickBtn>
        </div>
      </div>
    </div>
  );
};