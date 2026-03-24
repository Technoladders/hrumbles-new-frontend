// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ContactActivityPanel.tsx
import React, { useState, useMemo } from 'react';
import {
  PhoneCall, Mail, StickyNote, Calendar, CheckSquare, Linkedin,
  Clock, Copy, CheckCircle2, Circle, AlertCircle, ArrowUpRight, ArrowDownLeft,
  MoreHorizontal, Pencil, Trash2, ChevronDown, ChevronUp, MapPin,
  Globe, ExternalLink, Phone, CheckCheck, Filter
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { extractFromRaw } from '@/utils/dataExtractor';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO, isPast } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type ActivityModalType = 'call' | 'note' | 'email' | 'task' | 'meeting' | 'linkedin' | null;

interface Props {
  contact: any;
  onOpenModal: (type: ActivityModalType) => void;
  onEditActivity: (activity: any) => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteActivity: (activityId: string) => void;
  onRequestPhone: () => void;
  isRequestingPhone: boolean;
  refetch: () => void;
}

// ─── Activity type config ──────────────────────────────────────────────────

const ACTIVITY_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string; border: string }> = {
  call:         { icon: PhoneCall,   color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100', label: 'Call' },
  email:        { icon: Mail,        color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100',  label: 'Email' },
  linkedin:     { icon: Linkedin,    color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-100',   label: 'LinkedIn' },
  note:         { icon: StickyNote,  color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-100',label: 'Note' },
  task:         { icon: CheckSquare, color: 'text-green-600',   bg: 'bg-green-50',   border: 'border-green-100', label: 'Task' },
  meeting:      { icon: Calendar,    color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-100',label: 'Meeting' },
  stage_change: { icon: ArrowUpRight,color: 'text-gray-500',    bg: 'bg-gray-100',   border: 'border-gray-100',  label: 'Stage' },
};

const QUICK_ACTIONS = [
  { type: 'call' as const,     icon: PhoneCall,   label: 'Call',     color: 'text-amber-600',  hoverBg: 'hover:bg-amber-50 hover:border-amber-200',  activeBg: 'bg-amber-50 border-amber-200' },
  { type: 'email' as const,    icon: Mail,        label: 'Email',    color: 'text-blue-600',   hoverBg: 'hover:bg-blue-50 hover:border-blue-200',    activeBg: 'bg-blue-50 border-blue-200' },
  { type: 'linkedin' as const, icon: Linkedin,    label: 'LinkedIn', color: 'text-sky-600',    hoverBg: 'hover:bg-sky-50 hover:border-sky-200',      activeBg: 'bg-sky-50 border-sky-200' },
  { type: 'note' as const,     icon: StickyNote,  label: 'Note',     color: 'text-purple-600', hoverBg: 'hover:bg-purple-50 hover:border-purple-200', activeBg: 'bg-purple-50 border-purple-200' },
  { type: 'task' as const,     icon: CheckSquare, label: 'Task',     color: 'text-green-600',  hoverBg: 'hover:bg-green-50 hover:border-green-200',  activeBg: 'bg-green-50 border-green-200' },
  { type: 'meeting' as const,  icon: Calendar,    label: 'Meeting',  color: 'text-indigo-600', hoverBg: 'hover:bg-indigo-50 hover:border-indigo-200', activeBg: 'bg-indigo-50 border-indigo-200' },
];

// ─── Main Component ────────────────────────────────────────────────────────

export const ContactActivityPanel: React.FC<Props> = ({
  contact,
  onOpenModal,
  onEditActivity,
  onCompleteTask,
  onDeleteActivity,
  onRequestPhone,
  isRequestingPhone,
  refetch,
}) => {
  const { toast } = useToast();
  const data = extractFromRaw(contact);
  const [filterType, setFilterType] = useState<string>('all');
  const [contactInfoOpen, setContactInfoOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // All activities sorted newest first, filter out internal stage_change for display count
  const allActivities: any[] = contact.contact_activities || [];
  const sortedActivities = useMemo(() =>
    [...allActivities].sort((a, b) =>
      new Date(b.activity_date || b.created_at).getTime() -
      new Date(a.activity_date || a.created_at).getTime()
    ), [allActivities]);

  const filteredActivities = useMemo(() =>
    filterType === 'all'
      ? sortedActivities
      : sortedActivities.filter(a => a.type === filterType),
    [sortedActivities, filterType]);

  // Group by date label
  const groupedActivities = useMemo(() => {
    return filteredActivities.reduce((acc: Record<string, any[]>, activity) => {
      const d = new Date(activity.activity_date || activity.created_at);
      const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy');
      if (!acc[key]) acc[key] = [];
      acc[key].push(activity);
      return acc;
    }, {});
  }, [filteredActivities]);

  // Pending tasks
const tasks = sortedActivities.filter(
  a => a.type === 'task' && !a.is_completed && a.due_date
);

const now = new Date();

const overdueTasks = tasks.filter(a =>
  isPast(parseISO(a.due_date)) && !isToday(parseISO(a.due_date))
);

const todayTasks = tasks.filter(a =>
  isToday(parseISO(a.due_date))
);

const upcomingTasks = tasks.filter(a =>
  !isPast(parseISO(a.due_date)) && !isToday(parseISO(a.due_date))
);

const overdueCount = overdueTasks.length;
const pendingCount = todayTasks.length;
const upcomingCount = upcomingTasks.length;

  const activityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allActivities.length };
    ['call','email','linkedin','note','task','meeting'].forEach(t => {
      counts[t] = allActivities.filter(a => a.type === t).length;
    });
    return counts;
  }, [allActivities]);

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedItems);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedItems(next);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${label} copied to clipboard` });
  };

  // Determine the stage badge color
  const stageBadgeClass = {
    Lead:       'bg-blue-50 text-blue-700 border-blue-200',
    Prospect:   'bg-purple-50 text-purple-700 border-purple-200',
    Customer:   'bg-green-50 text-green-700 border-green-200',
    Contacted:  'bg-orange-50 text-orange-700 border-orange-200',
    Identified: 'bg-gray-100 text-gray-600 border-gray-200',
    Cold:       'bg-slate-100 text-slate-600 border-slate-200',
  }[contact.contact_stage || ''] || 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Contact Mini Header ──────────────────────────────────────── */}
      {/* <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white flex-shrink-0">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 border-2 border-white shadow-sm flex-shrink-0">
            <AvatarImage src={contact.photo_url || data.photoUrl || undefined} />
            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-semibold">
              {contact.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-gray-900 truncate">{contact.name}</h2>
              {contact.contact_stage && (
                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', stageBadgeClass)}>
                  {contact.contact_stage}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {contact.job_title}
              {contact.company_name ? ` · ${contact.company_name}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
              {(data.city || contact.city) && (
                <span className="flex items-center gap-0.5">
                  <MapPin size={10} />
                  {[data.city || contact.city, data.country || contact.country].filter(Boolean).join(', ')}
                </span>
              )}
              {contact.medium && (
                <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">
                  via {contact.medium}
                </span>
              )}
            </div>
          </div>
        </div>

       
        <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-gray-100">
        
          {contact.email ? (
            <ContactInfoChip
              icon={<Mail size={11} />}
              label={contact.email}
              onClick={() => copyToClipboard(contact.email, 'Email')}
              verified
            />
          ) : data.allEmails?.[0]?.email ? (
            <ContactInfoChip
              icon={<Mail size={11} />}
              label={data.allEmails[0].email}
              onClick={() => copyToClipboard(data.allEmails[0].email, 'Email')}
              verified={['verified', 'valid'].includes(data.allEmails[0].status?.toLowerCase())}
            />
          ) : null}

         
          {contact.mobile ? (
            <ContactInfoChip
              icon={<Phone size={11} />}
              label={contact.mobile}
              onClick={() => copyToClipboard(contact.mobile, 'Phone')}
            />
          ) : data.phoneNumbers?.[0] ? (
            <ContactInfoChip
              icon={<Phone size={11} />}
              label={data.phoneNumbers[0].phone_number || data.phoneNumbers[0].raw_number}
              onClick={() => copyToClipboard(data.phoneNumbers[0].phone_number || data.phoneNumbers[0].raw_number, 'Phone')}
            />
          ) : null}

          
          {(data.linkedinUrl || contact.linkedin_url) && (
            <a
              href={data.linkedinUrl || contact.linkedin_url}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 px-2 py-1 bg-[#0A66C2] text-white text-[10px] font-medium rounded hover:opacity-90 transition-opacity"
            >
              <Linkedin size={10} />
              LinkedIn
            </a>
          )}
        </div>
      </div> */}

      {/* ── Quick Log Actions ────────────────────────────────────────── */}
      <div className="px-3 py-2.5 border-b border-gray-100 bg-white flex-shrink-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Log Activity</p>
        <div className="grid grid-cols-6 gap-1">
          {QUICK_ACTIONS.map(({ type, icon: Icon, label, color, hoverBg }) => (
            <button
              key={type}
              onClick={() => onOpenModal(type)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 rounded-lg border border-transparent text-center transition-all duration-150',
                hoverBg
              )}
            >
              <Icon size={15} className={color} />
              <span className="text-[9px] font-medium text-gray-500 leading-none">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Pending Tasks Banner ─────────────────────────────────────── */}
<p className="text-xs font-medium text-gray-700 flex items-center gap-6 justify-center flex-wrap">
  {overdueCount > 0 && (
    <span className="text-red-600 flex items-center gap-1">
      <AlertCircle size={12} /> {overdueCount} overdue task
    </span>
  )}

  {pendingCount > 0 && (
    <span className="text-amber-600 flex items-center gap-1">
      <CheckSquare size={12} /> {pendingCount} today task
    </span>
  )}

  {upcomingCount > 0 && (
    <span className="text-blue-600 flex items-center gap-1">
      <Clock size={12} /> {upcomingCount} upcoming task
    </span>
  )}
</p>

      {/* ── Filter Tabs ──────────────────────────────────────────────── */}
      <div className="px-3 pt-2.5 flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'call', 'email', 'linkedin', 'note', 'task', 'meeting'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all',
                filterType === type
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              {activityCounts[type] > 0 && (
                <span className={cn(
                  'text-[9px] px-1 py-0.5 rounded-full min-w-[14px] text-center leading-none',
                  filterType === type ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
                )}>
                  {activityCounts[type]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Activity Timeline ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 mt-2">
        {filteredActivities.length === 0 ? (
          <EmptyActivities onOpenModal={onOpenModal} />
        ) : (
          Object.entries(groupedActivities).map(([dateLabel, activities]) => (
            <div key={dateLabel} className="mb-1">
              {/* Date label */}
              <div className="sticky top-0 z-10 py-1.5 bg-white/90 backdrop-blur-sm mb-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {dateLabel}
                </span>
              </div>

              {/* Activity items */}
              <div className="space-y-1.5">
                {activities.map((activity: any) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    isExpanded={expandedItems.has(activity.id)}
                    onToggleExpand={() => toggleExpanded(activity.id)}
                    onComplete={onCompleteTask}
                    onDelete={onDeleteActivity}
                    onEdit={onEditActivity}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── Activity Card ─────────────────────────────────────────────────────────

interface ActivityCardProps {
  activity: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (activity: any) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  activity, isExpanded, onToggleExpand, onComplete, onDelete, onEdit
}) => {
  const cfg = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.note;
  const Icon = cfg.icon;
  const isTask = activity.type === 'task';
  const isCompleted = activity.is_completed;
  const isStageChange = activity.type === 'stage_change';

  const outcome = activity.outcome || activity.metadata?.outcome;
  const direction = activity.direction || activity.metadata?.direction;
  const duration = activity.duration_minutes;
  const dueDate = activity.due_date;
  const priority = activity.priority;
  const isOverdue = isTask && dueDate && !isCompleted && isPast(parseISO(dueDate));

  const htmlContent = activity.description_html || activity.description || '';
  const needsExpansion = htmlContent.length > 140;

  // Lightweight stage change item
  if (isStageChange) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 italic">
        <div className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0 ml-1" />
        <span>{activity.description || activity.title}</span>
        <span className="ml-auto text-[10px]">
          {formatDistanceToNow(new Date(activity.activity_date || activity.created_at), { addSuffix: true })}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-xl border bg-white p-3 group transition-shadow hover:shadow-sm',
      isOverdue && 'border-red-200 bg-red-50/30',
      isCompleted && 'opacity-60'
    )}>
      {/* Card header */}
      <div className="flex items-start gap-2.5">
        {/* Type icon */}
        {isTask ? (
          <button
            className="mt-0.5 flex-shrink-0"
            onClick={() => !isCompleted && onComplete(activity.id)}
          >
            {isCompleted
              ? <CheckCircle2 size={16} className="text-green-500" />
              : <Circle size={16} className={cn('transition-colors', isOverdue ? 'text-red-400 hover:text-red-500' : 'text-gray-300 hover:text-green-400')} />
            }
          </button>
        ) : (
          <div className={cn('p-1.5 rounded-lg flex-shrink-0 mt-0.5', cfg.bg)}>
            <Icon size={12} className={cfg.color} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h4 className={cn(
              'text-xs font-medium text-gray-800 leading-snug',
              isCompleted && 'line-through text-gray-400'
            )}>
              {activity.title}
            </h4>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-0.5 rounded hover:bg-gray-100">
                  <MoreHorizontal size={12} className="text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 text-xs">
                <DropdownMenuItem onClick={() => onEdit(activity)} className="text-xs">
                  <Pencil size={11} className="mr-2" /> Edit
                </DropdownMenuItem>
                {isTask && !isCompleted && (
                  <DropdownMenuItem onClick={() => onComplete(activity.id)} className="text-xs">
                    <CheckCheck size={11} className="mr-2" /> Complete
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(activity.id)} className="text-xs text-red-600">
                  <Trash2 size={11} className="mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Meta badges row */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {/* Activity type badge */}
            <span className={cn('text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded', cfg.bg, cfg.color)}>
              {cfg.label}
            </span>

            {/* Direction */}
            {direction && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                {direction === 'inbound'
                  ? <ArrowDownLeft size={9} className="text-green-500" />
                  : <ArrowUpRight size={9} className="text-blue-400" />}
                {direction}
              </span>
            )}

            {/* Outcome */}
            {outcome && <OutcomePill outcome={outcome} />}

            {/* Duration */}
            {duration && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Clock size={9} /> {duration}m
              </span>
            )}

            {/* Priority */}
            {priority && priority !== 'none' && (
              <span className={cn(
                'text-[9px] font-medium px-1.5 py-0.5 rounded capitalize',
                priority === 'high' && 'bg-red-50 text-red-600',
                priority === 'medium' && 'bg-amber-50 text-amber-600',
                priority === 'low' && 'bg-green-50 text-green-600',
              )}>
                {priority}
              </span>
            )}

            {/* Due date */}
            {isTask && dueDate && (
              <span className={cn(
                'text-[10px] flex items-center gap-0.5',
                isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'
              )}>
                {isOverdue && <AlertCircle size={9} />}
                <Calendar size={9} />
                {format(parseISO(dueDate), 'MMM d')}
              </span>
            )}
          </div>

          {/* Description preview */}
          {htmlContent && (
            <div className="mt-1.5">
              {htmlContent.includes('<') ? (
                <div
                  className={cn(
                    'text-[11px] text-gray-500 leading-relaxed prose prose-xs max-w-none [&>*]:text-[11px] [&>*]:text-gray-500',
                    !isExpanded && 'line-clamp-2'
                  )}
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              ) : (
                <p className={cn('text-[11px] text-gray-500 leading-relaxed', !isExpanded && 'line-clamp-2')}>
                  {htmlContent}
                </p>
              )}
              {needsExpansion && (
                <button
                  onClick={onToggleExpand}
                  className="text-[10px] text-indigo-500 hover:text-indigo-600 font-medium mt-0.5"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Footer: creator + time */}
          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-50">
            <div className="flex items-center gap-1.5">
              {activity.creator && (
                <>
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={activity.creator.profile_picture_url} />
                    <AvatarFallback className="text-[7px] bg-gray-200">
                      {activity.creator.first_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] text-gray-400">
                    {activity.creator.first_name} {activity.creator.last_name}
                  </span>
                </>
              )}
              {/* Assignee for tasks */}
              {isTask && activity.assignee && (
                <span className="text-[10px] text-gray-400">
                  → {activity.assignee.first_name}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-300">
              {formatDistanceToNow(new Date(activity.activity_date || activity.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Small helpers ─────────────────────────────────────────────────────────

const OUTCOME_STYLES: Record<string, string> = {
  connected:      'bg-green-50 text-green-600',
  pending:        'bg-yellow-50 text-yellow-600',
  replied:        'bg-green-50 text-green-600',
  no_answer:      'bg-gray-100 text-gray-500',
  left_voicemail: 'bg-blue-50 text-blue-500',
  busy:           'bg-orange-50 text-orange-500',
  completed:      'bg-green-50 text-green-600',
  no_show:        'bg-red-50 text-red-500',
  bounced:        'bg-red-50 text-red-500',
  inmail_sent:    'bg-sky-50 text-sky-600',
  message_sent:   'bg-sky-50 text-sky-600',
  connection_sent:'bg-indigo-50 text-indigo-500',
};

const OutcomePill: React.FC<{ outcome: string }> = ({ outcome }) => (
  <span className={cn(
    'text-[9px] font-medium px-1.5 py-0.5 rounded capitalize',
    OUTCOME_STYLES[outcome] || 'bg-gray-50 text-gray-500'
  )}>
    {outcome.replace(/_/g, ' ')}
  </span>
);

const ContactInfoChip: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  verified?: boolean;
}> = ({ icon, label, onClick, verified }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-[10px] text-gray-600 hover:bg-gray-100 transition-colors max-w-[120px] overflow-hidden"
        >
          <span className={cn(verified ? 'text-green-500' : 'text-gray-400')}>{icon}</span>
          <span className="truncate">{label}</span>
          {verified && <CheckCircle2 size={9} className="text-green-500 flex-shrink-0" />}
        </button>
      </TooltipTrigger>
      <TooltipContent className="text-xs max-w-xs break-all">{label} (click to copy)</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const EmptyActivities: React.FC<{ onOpenModal: (type: ActivityModalType) => void }> = ({ onOpenModal }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
      <Clock size={20} className="text-gray-300" />
    </div>
    <p className="text-sm font-medium text-gray-600 mb-1">No activities yet</p>
    <p className="text-xs text-gray-400 mb-4 max-w-[200px]">Start tracking your outreach to build a complete history</p>
    <div className="flex gap-2 flex-wrap justify-center">
      {['call', 'email', 'note'].map(type => {
        const cfg = ACTIVITY_CONFIG[type];
        const Icon = cfg.icon;
        return (
          <button
            key={type}
            onClick={() => onOpenModal(type as ActivityModalType)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all', cfg.bg, cfg.color, cfg.border, 'hover:opacity-80')}
          >
            <Icon size={12} />
            {cfg.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default ContactActivityPanel;
// 2