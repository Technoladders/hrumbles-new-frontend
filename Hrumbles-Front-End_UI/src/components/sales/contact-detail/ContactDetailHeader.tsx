import React from 'react';
import { 
  ChevronLeft, Sparkles, PhoneCall, Mail, 
  StickyNote, Calendar, Send, ShieldCheck, 
  Building2, MoreHorizontal 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface ContactDetailHeaderProps {
  contact: any;
  onBack: () => void;
  onEnrich: () => void;
  isEnriching: boolean;
  onOpenModal: (type: 'call' | 'note') => void;
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

  return (
    <header className="h-14 bg-white border-b px-4 flex items-center justify-between sticky top-0 z-40 shadow-sm flex-shrink-0">
      {/* LEFT: Identity & Back */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack} 
          className="h-8 w-8 p-0 hover:bg-slate-100 text-slate-500"
        >
          <ChevronLeft size={20} />
        </Button>
        
        <div className="flex items-center gap-3 border-l pl-4 py-1">
          <Avatar className="h-9 w-9 rounded-lg border shadow-sm ring-2 ring-white">
            <AvatarImage src={contact.photo_url || person?.photo_url} />
            <AvatarFallback className="bg-indigo-600 text-white font-black">
              {contact.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-slate-900 leading-none flex items-center gap-2">
              {contact.name} 
              {person && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <ShieldCheck size={14} className="text-blue-500 fill-blue-50" />
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold">Verified Professional Identity</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </h1>
            <p className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
              {contact.job_title} <span className="text-slate-300">@</span> 
              <span className="text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5">
                {contact.company_name} <ExternalIcon />
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-2">
        {/* Quick Action Icons */}
        <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100 mr-2">
          <ActionIconButton 
            icon={<PhoneCall size={16}/>} 
            onClick={() => onOpenModal('call')} 
            tooltip="Log Interaction" 
          />
          <ActionIconButton 
            icon={<Mail size={16}/>} 
            tooltip="Send Direct Message" 
          />
          <ActionIconButton 
            icon={<StickyNote size={16}/>} 
            onClick={() => onOpenModal('note')} 
            tooltip="Add Internal Note" 
          />
          {/* <ActionIconButton 
            icon={<Calendar size={16}/>} 
            tooltip="Schedule Meeting" 
          /> */}
        </div>

        <div className="w-[1px] h-6 bg-slate-200 mx-1" />

        {/* Enrichment & Sequence Buttons */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onEnrich} 
          disabled={isEnriching} 
          className="h-9 text-[11px] font-black border-indigo-100 text-indigo-700 bg-indigo-50/30 hover:bg-indigo-50 shadow-sm"
        >
          <Sparkles size={14} className={cn("mr-2 text-indigo-500", isEnriching && "animate-spin")} /> 
          Enrich Prospect Data
        </Button>

        {/* <Button 
          size="sm" 
          className="h-9 text-[11px] font-black bg-yellow-400 hover:bg-yellow-500 text-slate-900 border-none px-5 shadow-sm transition-all active:scale-95"
        >
          <Send size={14} className="mr-2" /> ADD TO SEQUENCE
        </Button> */}

        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400">
           <MoreHorizontal size={18} />
        </Button>
      </div>
    </header>
  );
};

/* --- MINI INTERNAL HELPERS --- */

const ActionIconButton = ({ icon, onClick, tooltip }: { icon: React.ReactNode, onClick?: () => void, tooltip: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-lg transition-all" 
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-[10px] font-black bg-slate-900 text-white border-none px-3 py-1.5 shadow-xl">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const ExternalIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 ml-0.5">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);