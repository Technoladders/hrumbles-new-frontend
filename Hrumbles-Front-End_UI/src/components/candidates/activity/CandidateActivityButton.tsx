import { useState } from 'react';
import {
  Phone, Mail, StickyNote, Linkedin, MessageSquare,
  ChevronDown, ClipboardList
} from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useCandidateActivity, ActivityType } from './hooks/useCandidateActivity';
import { LogCallDialog } from './dialogs/LogCallDialog';
import { LogEmailDialog } from './dialogs/LogEmailDialog';
import { LogWhatsAppDialog } from './dialogs/LogWhatsAppDialog';
import { LogLinkedInDialog } from './dialogs/LogLinkedInDialog';
import { CreateNoteDialog } from './dialogs/CreateNoteDialog';

// ─── Action items ─────────────────────────────────────────────────────────────
const ACTIONS: {
  type: ActivityType;
  label: string;
  icon: React.ReactNode;
  color: string;
  hoverBg: string;
}[] = [
  {
    type: 'call',
    label: 'Log Call',
    icon: <Phone className="h-3.5 w-3.5" />,
    color: 'text-emerald-600',
    hoverBg: 'hover:bg-emerald-50',
  },
  {
    type: 'email',
    label: 'Log Email',
    icon: <Mail className="h-3.5 w-3.5" />,
    color: 'text-blue-600',
    hoverBg: 'hover:bg-blue-50',
  },
  {
    type: 'whatsapp',
    label: 'WhatsApp',
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    color: 'text-green-600',
    hoverBg: 'hover:bg-green-50',
  },
  {
    type: 'linkedin',
    label: 'LinkedIn',
    icon: <Linkedin className="h-3.5 w-3.5" />,
    color: 'text-sky-600',
    hoverBg: 'hover:bg-sky-50',
  },
  {
    type: 'note',
    label: 'Add Note',
    icon: <StickyNote className="h-3.5 w-3.5" />,
    color: 'text-violet-600',
    hoverBg: 'hover:bg-violet-50',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  candidateId: string;
  candidateName: string;
}

export const CandidateActivityButton = ({ candidateId, candidateName }: Props) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActivityType | null>(null);

  const { activities, logActivity, isLogging } = useCandidateActivity(candidateId);

  const openModal = (type: ActivityType) => {
    setPopoverOpen(false);
    // small delay so popover closes before dialog opens
    setTimeout(() => setActiveModal(type), 80);
  };

  const handleSubmit = async (payload: any) => {
    await logActivity(payload);
  };

  const activityCount = activities.length;

  return (
    <TooltipProvider delayDuration={100}>
      <>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-7 w-7 rounded-full hover:bg-purple-50 transition-colors"
                >
                  <ClipboardList className="h-4 w-4 text-purple-500" />
                  {activityCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[9px] font-bold text-white">
                      {activityCount > 9 ? '9+' : activityCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Log Activity</p>
            </TooltipContent>
          </Tooltip>

          <PopoverContent
            align="end"
            className="w-48 p-2 rounded-xl shadow-xl border border-slate-100 bg-white"
          >
            {/* Header */}
            <div className="px-2 pb-2 mb-1 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-700 truncate">{candidateName}</p>
              <p className="text-[10px] text-slate-400">
                {activityCount} {activityCount === 1 ? 'activity' : 'activities'} logged
              </p>
            </div>

            {/* Action list */}
            <div className="space-y-0.5">
              {ACTIONS.map((action) => (
                <button
                  key={action.type}
                  onClick={() => openModal(action.type)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors ${action.color} ${action.hoverBg}`}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Dialogs */}
        <LogCallDialog
          open={activeModal === 'call'}
          onOpenChange={(o) => !o && setActiveModal(null)}
          candidateName={candidateName}
          onSubmit={handleSubmit}
          isSubmitting={isLogging}
        />
        <LogEmailDialog
          open={activeModal === 'email'}
          onOpenChange={(o) => !o && setActiveModal(null)}
          candidateName={candidateName}
          onSubmit={handleSubmit}
          isSubmitting={isLogging}
        />
        <LogWhatsAppDialog
          open={activeModal === 'whatsapp'}
          onOpenChange={(o) => !o && setActiveModal(null)}
          candidateName={candidateName}
          onSubmit={handleSubmit}
          isSubmitting={isLogging}
        />
        <LogLinkedInDialog
          open={activeModal === 'linkedin'}
          onOpenChange={(o) => !o && setActiveModal(null)}
          candidateName={candidateName}
          onSubmit={handleSubmit}
          isSubmitting={isLogging}
        />
        <CreateNoteDialog
          open={activeModal === 'note'}
          onOpenChange={(o) => !o && setActiveModal(null)}
          candidateName={candidateName}
          onSubmit={handleSubmit}
          isSubmitting={isLogging}
        />
      </>
    </TooltipProvider>
  );
};