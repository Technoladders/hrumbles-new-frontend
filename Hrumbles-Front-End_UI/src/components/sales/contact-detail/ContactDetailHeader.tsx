// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ContactDetailHeader.tsx
import React from 'react';
import { 
  ChevronLeft, Sparkles, PhoneCall, Mail, 
  StickyNote, Calendar, CheckSquare, MoreHorizontal,
  ExternalLink, Building2, ListPlus, Download, Linkedin
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

interface ContactDetailHeaderProps {
  contact: any;
  onBack: () => void;
  onEnrich: () => void;
  isEnriching: boolean;
  onOpenModal: (type: 'call' | 'note' | 'email' | 'linkedin' | 'task' | 'meeting') => void;
  refetch: () => void;
}

export const ContactDetailHeader: React.FC<ContactDetailHeaderProps> = ({
  contact,
  onBack,
  onEnrich,
  isEnriching,
  onOpenModal,
}) => {
  const person = contact?.enrichment_people?.[0];
const companyWebsite =
  contact?.companies?.website ||
  contact?.companies?.website_url ||
  null;

  console.log('contact', contact);
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="h-16 px-4 flex items-center justify-between">
        
        {/* LEFT: Breadcrumb + Identity */}
        <div className="flex items-center gap-3">
          {/* Back / Breadcrumb */}
          <button 
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">People</span>
          </button>
          
          <span className="text-gray-300 hidden sm:inline">›</span>
          
          {/* Contact Identity */}
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-gray-200">
              <AvatarImage src={contact.photo_url || person?.photo_url} />
              <AvatarFallback className="bg-gray-100 text-gray-600 text-sm font-medium">
                {contact.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col">
              <h1 className="text-base font-semibold text-gray-900 leading-tight flex items-center gap-2">
                {contact.name}
                {contact.apollo_person_id && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                          Identified
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        Verified
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </h1>
              
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
  <span>{contact.job_title}</span>

  {contact.company_name && companyWebsite && (
    <>
      <span className="text-gray-400">at</span>

      <a
        href={companyWebsite.startsWith("http")
          ? companyWebsite
          : `https://${companyWebsite}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5"
      >
        {contact.company_name}
        <ExternalLink size={11} className="opacity-60" />
      </a>
    </>
  )}
</p>

            </div>
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2">
          
          {/* Quick Action Icons - Apollo Style */}
          <div className="hidden md:flex items-center gap-1 mr-2">
            <ActionIconButton 
              icon={<PhoneCall size={16} />}
              tooltip="Log Call"
              onClick={() => onOpenModal('call')}
            />
            <ActionIconButton 
              icon={<Mail size={16} />}
              tooltip="Log Email"
              onClick={() => onOpenModal('email')}
            />
            <ActionIconButton 
              icon={<Linkedin size={16} />}
              tooltip="Log LinkedIn"
              onClick={() => onOpenModal('linkedin')}
            />

            <ActionIconButton 
              icon={<StickyNote size={16} />}
              tooltip="Create Note"
              onClick={() => onOpenModal('note')}
            />
            <ActionIconButton 
              icon={<CheckSquare size={16} />}
              tooltip="Create Task"
              onClick={() => onOpenModal('task')}
            />
            <ActionIconButton 
              icon={<Calendar size={16} />}
              tooltip="Log Meeting"
              onClick={() => onOpenModal('meeting')}
            />
          </div>

          {/* Add to list button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 px-3 text-sm font-medium text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            <ListPlus size={15} className="mr-1.5" />
            Add to list
          </Button>

          {/* Enrich Button - Apollo Yellow Style */}
          <Button 
            variant="default"
            size="sm" 
            onClick={onEnrich} 
            disabled={isEnriching} 
            className="h-10 px-6 font-semibold text-white whitespace-nowrap bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full shadow-lg transform hover:scale-105 transition-transform duration-200 flex items-center gap-2"
          >
            {isEnriching ? (
              <>
                <Sparkles size={14} className="mr-1.5 animate-spin" />
                Enriching...
              </>
            ) : (
              <>
                <Sparkles size={14} className="mr-1.5" />
                Enrich Data
              </>
            )}
          </Button>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-gray-700">
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onOpenModal('call')} className="md:hidden">
                <PhoneCall size={14} className="mr-2" /> Log Call
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenModal('email')} className="md:hidden">
                <Mail size={14} className="mr-2" /> Log Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenModal('linkedin')} className="md:hidden">
                <Linkedin size={14} className="mr-2" /> LinkedIn Log
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenModal('note')} className="md:hidden">
                <StickyNote size={14} className="mr-2" /> Create Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenModal('task')} className="md:hidden">
                <CheckSquare size={14} className="mr-2" /> Create Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenModal('meeting')} className="md:hidden">
                <Calendar size={14} className="mr-2" /> Log Meeting
              </DropdownMenuItem>
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem>
                <Building2 size={14} className="mr-2" /> View Company
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Sparkles size={14} className="mr-2" /> Enrich Data
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Delete Contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

// Action Icon Button Component - Apollo Style
const ActionIconButton = ({ 
  icon, 
  onClick, 
  tooltip 
}: { 
  icon: React.ReactNode; 
  onClick?: () => void; 
  tooltip: string;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors" 
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent 
        className="text-xs font-medium bg-gray-900 text-white border-none px-2.5 py-1.5 rounded"
        sideOffset={8}
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
// 