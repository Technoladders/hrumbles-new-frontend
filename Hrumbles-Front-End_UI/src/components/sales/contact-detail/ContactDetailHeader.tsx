// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ContactDetailHeader.tsx
import React from 'react';
import { 
  ChevronLeft, Sparkles, PhoneCall, Mail, 
  StickyNote, Calendar, CheckSquare, MoreHorizontal,
  ExternalLink, ShieldCheck, Building2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  onOpenModal: (type: 'call' | 'note' | 'email' | 'task' | 'meeting') => void;
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
  const hasEnrichment = !!person;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-9xl mx-auto">
        <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* LEFT: Back + Identity */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack} 
              className="h-9 w-9 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <ChevronLeft size={20} />
            </Button>
            
            <div className="h-8 w-px bg-slate-200" />
            
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 rounded-xl border-2 border-white shadow-md ring-2 ring-slate-100">
                <AvatarImage src={contact.photo_url || person?.photo_url} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm">
                  {contact.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-900 leading-tight">
                    {contact.name}
                  </h1>
                  {hasEnrichment && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <ShieldCheck size={16} className="text-blue-500 fill-blue-100" />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs font-medium">
                          Verified Professional Identity
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0 h-5",
                      contact.contact_stage === 'Lead' && "bg-blue-50 text-blue-700 border-blue-200",
                      contact.contact_stage === 'Prospect' && "bg-purple-50 text-purple-700 border-purple-200",
                      contact.contact_stage === 'Customer' && "bg-green-50 text-green-700 border-green-200",
                    )}
                  >
                    {contact.contact_stage}
                  </Badge>
                </div>
                
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span className="font-medium">{contact.job_title}</span>
                  {contact.company_name && (
                    <>
                      <span className="text-slate-300">at</span>
                      <span className="font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer inline-flex items-center gap-0.5">
                        {contact.company_name}
                        <ExternalLink size={12} className="opacity-50" />
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-2">
            
            {/* Quick Action Buttons */}
            <div className="flex justify-center">
                      <div className="flex items-center space-x-1 rounded-full bg-slate-100 p-1 shadow-md border border-slate-200">
              <ActionButton 
                icon={<PhoneCall size={16} />}
                tooltip="Log Call"
                onClick={() => onOpenModal('call')}
              />
              <ActionButton 
                icon={<Mail size={16} />}
                tooltip="Log Email"
                onClick={() => onOpenModal('email')}
              />
              <ActionButton 
                icon={<StickyNote size={16} />}
                tooltip="Create Note"
                onClick={() => onOpenModal('note')}
              />
              <ActionButton 
                icon={<CheckSquare size={16} />}
                tooltip="Create Task"
                onClick={() => onOpenModal('task')}
              />
              <ActionButton 
                icon={<Calendar size={16} />}
                tooltip="Log Meeting"
                onClick={() => onOpenModal('meeting')}
              />
            </div>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Enrich Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEnrich} 
              disabled={isEnriching} 
              className="h-10 px-6 font-semibold text-white whitespace-nowrap bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full shadow-lg transform hover:scale-105 transition-transform duration-200 flex items-center gap-2"
            >
              <Sparkles size={14} className={cn("mr-2", isEnriching && "animate-spin")} /> 
              Enrich Data
            </Button>

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400">
                  <MoreHorizontal size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onOpenModal('call')} className="sm:hidden">
                  <PhoneCall size={14} className="mr-2" /> Log Call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenModal('email')} className="sm:hidden">
                  <Mail size={14} className="mr-2" /> Log Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenModal('note')} className="sm:hidden">
                  <StickyNote size={14} className="mr-2" /> Create Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenModal('task')} className="sm:hidden">
                  <CheckSquare size={14} className="mr-2" /> Create Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenModal('meeting')} className="sm:hidden">
                  <Calendar size={14} className="mr-2" /> Log Meeting
                </DropdownMenuItem>
                <DropdownMenuSeparator className="sm:hidden" />
                <DropdownMenuItem onClick={onEnrich} className="md:hidden">
                  <Sparkles size={14} className="mr-2" /> Enrich Data
                </DropdownMenuItem>
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuItem>
                  <Building2 size={14} className="mr-2" /> View Company
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  Delete Contact
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

// Action Button Component
const ActionButton = ({ 
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
          className="h-8 w-8 text-slate-500 hover:bg-purple hover:text-white hover:shadow-sm rounded-lg transition-all" 
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-xs font-medium bg-slate-900 text-white border-none px-3 py-1.5">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);