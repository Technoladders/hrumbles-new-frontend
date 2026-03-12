// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ContactDetailHeader.tsx
import React from 'react';
import {
  ChevronLeft, Sparkles, PhoneCall, Mail, StickyNote,
  Calendar, CheckSquare, MoreHorizontal, ExternalLink,
  Building2, ListPlus, Linkedin, Pencil, Trash2
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

type ActivityModalType = 'call' | 'note' | 'email' | 'task' | 'meeting' | 'linkedin' | null;

interface Props {
  contact: any;
  onBack: () => void;
  onEnrich: () => void;
  isEnriching: boolean;
  onOpenModal: (type: ActivityModalType) => void;
  refetch: () => void;
  onAddToList: () => void; // <--- Added prop
}

export const ContactDetailHeader: React.FC<Props> = ({
  contact, onBack, onEnrich, isEnriching, onOpenModal, onAddToList
}) => {
  const data = extractFromRaw(contact);
  const companyWebsite = contact?.companies?.website || null;

  // Stage badge
  const stageBadgeClass = {
    Lead:       'bg-blue-50 text-blue-700 border-blue-200',
    Prospect:   'bg-purple-50 text-purple-700 border-purple-200',
    Customer:   'bg-green-50 text-green-700 border-green-200',
    Contacted:  'bg-orange-50 text-orange-700 border-orange-200',
    Identified: 'bg-gray-100 text-gray-600 border-gray-200',
    Cold:       'bg-slate-100 text-slate-600 border-slate-200',
  }[contact.contact_stage || ''] || 'bg-gray-100 text-gray-600 border-gray-200';

  const quickActions =[
    { type: 'call' as const,     icon: PhoneCall,   tooltip: 'Log Call' },
    { type: 'email' as const,    icon: Mail,        tooltip: 'Log Email' },
    { type: 'linkedin' as const, icon: Linkedin,    tooltip: 'Log LinkedIn' },
    { type: 'note' as const,     icon: StickyNote,  tooltip: 'Create Note' },
    { type: 'task' as const,     icon: CheckSquare, tooltip: 'Create Task' },
    { type: 'meeting' as const,  icon: Calendar,    tooltip: 'Log Meeting' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="h-[65px] px-4 flex items-center justify-between gap-4">

        {/* ── Left: Nav + Identity ───────────────────────────────── */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline text-xs">People</span>
          </button>

          <span className="text-gray-200 hidden sm:inline text-xs">/</span>

          {/* Avatar + name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-8 w-8 border border-gray-200 flex-shrink-0">
              <AvatarImage src={contact.photo_url || data.photoUrl || undefined} />
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                {contact.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-semibold text-gray-900 truncate">{contact.name}</h1>
                {contact.contact_stage && (
                  <span className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 hidden sm:inline-block',
                    stageBadgeClass
                  )}>
                    {contact.contact_stage}
                  </span>
                )}
                {contact.apollo_person_id && (
                  <span className="text-[9px] bg-green-50 text-green-700 border border-green-200 px-1 py-0.5 rounded hidden md:inline-block">
                    Verified
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                {contact.job_title}
                {contact.company_name && (
                  <>
                    <span className="text-gray-200">·</span>
                    {companyWebsite ? (
                      <a
                        href={companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`}
                        target="_blank" rel="noreferrer"
                        className="text-indigo-500 hover:text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        {contact.company_name}
                        <ExternalLink size={9} className="opacity-60" />
                      </a>
                    ) : (
                      <span>{contact.company_name}</span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: Actions ────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* Quick action icons (desktop) */}
          <div className="hidden lg:flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-lg p-1 mr-1">
            {quickActions.map(({ type, icon: Icon, tooltip }) => (
              <TooltipProvider key={type}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-500 hover:text-gray-800 hover:bg-white rounded-md transition-all"
                      onClick={() => onOpenModal(type)}
                    >
                      <Icon size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs" sideOffset={8}>{tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>

          {/* Add to list */}
          <Button
            variant="outline"
            size="sm"
            onClick={onAddToList} // <--- Added onClick handler
            className="h-8 px-3 text-xs font-medium text-gray-700 border-gray-200 hidden sm:flex items-center gap-1.5"
          >
            <ListPlus size={13} />
            Add to list
          </Button>

          {/* Enrich */}
          <Button
            size="sm"
            onClick={onEnrich}
            disabled={isEnriching}
            className="h-8 px-4 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg shadow-sm border-0"
          >
            <Sparkles size={12} className={cn('mr-1.5', isEnriching && 'animate-spin')} />
            {isEnriching ? 'Enriching...' : 'Enrich'}
          </Button>

          {/* More */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {/* Mobile: show all log options */}
              {quickActions.map(({ type, icon: Icon, tooltip }) => (
                <DropdownMenuItem key={type} onClick={() => onOpenModal(type)} className="lg:hidden text-xs">
                  <Icon size={12} className="mr-2" /> {tooltip}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="lg:hidden" />
              <DropdownMenuItem className="text-xs">
                <Building2 size={12} className="mr-2" /> View Company
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs">
                <Sparkles size={12} className="mr-2" /> Enrich Data
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-red-600">
                <Trash2 size={12} className="mr-2" /> Delete Contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};