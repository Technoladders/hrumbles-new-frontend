// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ContactActivityPanel.tsx
// Updated: phone pending badge, purple/pink gradient theme accents, same all logic intact
import React, { useState, useMemo } from 'react';
import {
  PhoneCall, Mail, StickyNote, Calendar, CheckSquare, Linkedin,
  Clock, Copy, CheckCircle2, Circle, AlertCircle, ArrowUpRight, ArrowDownLeft,
  MoreHorizontal, Pencil, Trash2, ChevronDown, ChevronUp,
  Globe, ExternalLink, Phone, CheckCheck, Loader2, Zap, Sparkles
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  phonePending: boolean;
  refetch: () => void;
}

// ── Activity config ──────────────────────────────────────────────────────────
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
  { type: 'call' as const,     icon: PhoneCall,   label: 'Call',     color: 'text-amber-600',  hoverBg: 'hover:bg-amber-50 hover:border-amber-200' },
  { type: 'email' as const,    icon: Mail,        label: 'Email',    color: 'text-blue-600',   hoverBg: 'hover:bg-blue-50 hover:border-blue-200' },
  { type: 'linkedin' as const, icon: Linkedin,    label: 'LinkedIn', color: 'text-sky-600',    hoverBg: 'hover:bg-sky-50 hover:border-sky-200' },
  { type: 'note' as const,     icon: StickyNote,  label: 'Note',     color: 'text-purple-600', hoverBg: 'hover:bg-purple-50 hover:border-purple-200' },
  { type: 'task' as const,     icon: CheckSquare, label: 'Task',     color: 'text-green-600',  hoverBg: 'hover:bg-green-50 hover:border-green-200' },
  { type: 'meeting' as const,  icon: Calendar,    label: 'Meeting',  color: 'text-indigo-600', hoverBg: 'hover:bg-indigo-50 hover:border-indigo-200' },
];

const OUTCOME_STYLES: Record<string, string> = {
  connected:       'bg-green-50 text-green-600',
  pending:         'bg-yellow-50 text-yellow-600',
  replied:         'bg-green-50 text-green-600',
  no_answer:       'bg-gray-100 text-gray-500',
  left_voicemail:  'bg-blue-50 text-blue-500',
  busy:            'bg-orange-50 text-orange-500',
  completed:       'bg-green-50 text-green-600',
  no_show:         'bg-red-50 text-red-500',
  bounced:         'bg-red-50 text-red-500',
  inmail_sent:     'bg-sky-50 text-sky-600',
  message_sent:    'bg-sky-50 text-sky-600',
  connection_sent: 'bg-indigo-50 text-indigo-500',
};

// ── Main Component ────────────────────────────────────────────────────────────
export const ContactActivityPanel: React.FC<Props> = ({
  contact, onOpenModal, onEditActivity, onCompleteTask, onDeleteActivity,
  onRequestPhone, isRequestingPhone, phonePending, refetch,
}) => {
  const { toast } = useToast();
  const data = extractFromRaw(contact);
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const allActivities: any[] = contact.contact_activities || [];
  const sortedActivities = useMemo(() =>
    [...allActivities].sort((a, b) =>
      new Date(b.activity_date || b.created_at).getTime() - new Date(a.activity_date || a.created_at).getTime()
    ), [allActivities]);

  const filteredActivities = useMemo(() =>
    filterType === 'all' ? sortedActivities : sortedActivities.filter(a => a.type === filterType),
    [sortedActivities, filterType]);

  const groupedActivities = useMemo(() => {
    return filteredActivities.reduce((acc: Record<string, any[]>, activity) => {
      const d = new Date(activity.activity_date || activity.created_at);
      const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy');
      if (!acc[key]) acc[key] = [];
      acc[key].push(activity);
      return acc;
    }, {});
  }, [filteredActivities]);

  // Task counts
  const tasks = sortedActivities.filter(a => a.type === 'task' && !a.is_completed && a.due_date);
  const now = new Date();
  const overdueTasks = tasks.filter(a => isPast(parseISO(a.due_date)) && !isToday(parseISO(a.due_date)));
  const todayTasks = tasks.filter(a => isToday(parseISO(a.due_date)));
  const upcomingTasks = tasks.filter(a => !isPast(parseISO(a.due_date)) && !isToday(parseISO(a.due_date)));

  const activityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allActivities.length };
    ['call', 'email', 'linkedin', 'note', 'task', 'meeting'].forEach(t => {
      counts[t] = allActivities.filter(a => a.type === t).length;
    });
    return counts;
  }, [allActivities]);

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedItems);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedItems(next);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Phone pending banner ─────────────────────────────────────── */}
      {(phonePending || isRequestingPhone) && (
        <div className="flex-shrink-0 mx-3 mt-2.5 mb-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          <div className="relative flex-shrink-0">
            <Loader2 size={14} className="animate-spin text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-amber-800">Phone lookup in progress</p>
            <p className="text-[9px] text-amber-600 leading-relaxed">
              Apollo waterfall is processing. Usually delivers in 1–5 min.
            </p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
        </div>
      )}

      {/* ── Quick Log Actions ────────────────────────────────────────── */}
      <div className="px-3 py-2.5 border-b border-gray-100 bg-white flex-shrink-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Log Activity</p>
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

      {/* ── Task summary banner ──────────────────────────────────────── */}
      {(overdueTasks.length > 0 || todayTasks.length > 0 || upcomingTasks.length > 0) && (
        <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {overdueTasks.length > 0 && (
              <span className="text-[10px] text-red-600 font-medium flex items-center gap-1">
                <AlertCircle size={10} /> {overdueTasks.length} overdue
              </span>
            )}
            {todayTasks.length > 0 && (
              <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                <CheckSquare size={10} /> {todayTasks.length} today
              </span>
            )}
            {upcomingTasks.length > 0 && (
              <span className="text-[10px] text-violet-600 font-medium flex items-center gap-1">
                <Clock size={10} /> {upcomingTasks.length} upcoming
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Filter tabs ──────────────────────────────────────────────── */}
      <div className="px-3 pt-2.5 flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'call', 'email', 'linkedin', 'note', 'task', 'meeting'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all',
                filterType === type
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              {activityCounts[type] > 0 && (
                <span className={cn(
                  'text-[9px] px-1 py-0.5 rounded-full min-w-[14px] text-center leading-none',
                  filterType === type ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-500'
                )}>
                  {activityCounts[type]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Activity timeline ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 mt-2">
        {filteredActivities.length === 0 ? (
          <EmptyActivities onOpenModal={onOpenModal} />
        ) : (
          Object.entries(groupedActivities).map(([dateLabel, activities]) => (
            <div key={dateLabel} className="mb-1">
              <div className="sticky top-0 z-10 py-1.5 bg-white/90 backdrop-blur-sm mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {dateLabel}
                </span>
              </div>
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

// ── Activity Card ─────────────────────────────────────────────────────────────
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

  if (isStageChange) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 italic">
        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-300 to-pink-300 flex-shrink-0 ml-1" />
        <span>{activity.description || activity.title}</span>
        <span className="ml-auto text-[10px]">
          {formatDistanceToNow(new Date(activity.activity_date || activity.created_at), { addSuffix: true })}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-xl border bg-white p-3 group transition-all hover:shadow-sm',
      isOverdue && 'border-red-200 bg-red-50/30',
      isCompleted && 'opacity-55',
      !isOverdue && !isCompleted && 'hover:border-violet-200/60'
    )}>
      <div className="flex items-start gap-2.5">
        {/* Type icon */}
        {isTask ? (
          <button className="mt-0.5 flex-shrink-0" onClick={() => !isCompleted && onComplete(activity.id)}>
            {isCompleted
              ? <CheckCircle2 size={16} className="text-green-500" />
              : <Circle size={16} className={cn('transition-colors', isOverdue ? 'text-red-400 hover:text-red-500' : 'text-gray-300 hover:text-violet-400')} />
            }
          </button>
        ) : (
          <div className={cn('p-1.5 rounded-lg flex-shrink-0 mt-0.5', cfg.bg)}>
            <Icon size={12} className={cfg.color} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h4 className={cn('text-xs font-medium text-gray-800 leading-snug', isCompleted && 'line-through text-gray-400')}>
              {activity.title}
            </h4>
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

          {/* Meta badges */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded', cfg.bg, cfg.color)}>
              {cfg.label}
            </span>
            {direction && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                {direction === 'inbound'
                  ? <ArrowDownLeft size={9} className="text-green-500" />
                  : <ArrowUpRight size={9} className="text-blue-400" />
                }{direction}
              </span>
            )}
            {outcome && <OutcomePill outcome={outcome} />}
            {duration && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Clock size={9} />{duration}m
              </span>
            )}
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
            {isTask && dueDate && (
              <span className={cn('text-[10px] flex items-center gap-0.5', isOverdue ? 'text-red-600 font-medium' : 'text-gray-400')}>
                {isOverdue && <AlertCircle size={9} />}
                <Calendar size={9} />{format(parseISO(dueDate), 'MMM d')}
              </span>
            )}
          </div>

          {/* Description */}
          {htmlContent && (
            <div className="mt-1.5">
              {htmlContent.includes('<') ? (
                <div
                  className={cn('text-[11px] text-gray-500 leading-relaxed prose prose-xs max-w-none [&>*]:text-[11px] [&>*]:text-gray-500', !isExpanded && 'line-clamp-2')}
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              ) : (
                <p className={cn('text-[11px] text-gray-500 leading-relaxed', !isExpanded && 'line-clamp-2')}>
                  {htmlContent}
                </p>
              )}
              {needsExpansion && (
                <button onClick={onToggleExpand} className="text-[10px] text-violet-500 hover:text-violet-700 font-medium mt-0.5 transition-colors">
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-50">
            <div className="flex items-center gap-1.5">
              {activity.creator && (
                <>
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={activity.creator.profile_picture_url} />
                    <AvatarFallback className="text-[7px] bg-violet-100 text-violet-600">
                      {activity.creator.first_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] text-gray-400">{activity.creator.first_name} {activity.creator.last_name}</span>
                </>
              )}
              {isTask && activity.assignee && (
                <span className="text-[10px] text-gray-400">→ {activity.assignee.first_name}</span>
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

// ── Small helpers ─────────────────────────────────────────────────────────────
const OutcomePill: React.FC<{ outcome: string }> = ({ outcome }) => (
  <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded capitalize', OUTCOME_STYLES[outcome] || 'bg-gray-50 text-gray-500')}>
    {outcome.replace(/_/g, ' ')}
  </span>
);

const EmptyActivities: React.FC<{ onOpenModal: (type: ActivityModalType) => void }> = ({ onOpenModal }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-12 h-12 bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-100 rounded-full flex items-center justify-center mb-3">
      <Clock size={20} className="text-violet-200" />
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
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:opacity-80', cfg.bg, cfg.color, cfg.border)}
          >
            <Icon size={12} />{cfg.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default ContactActivityPanel;