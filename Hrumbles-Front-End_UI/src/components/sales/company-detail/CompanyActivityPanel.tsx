// Hrumbles-Front-End_UI/src/components/sales/company-detail/CompanyActivityPanel.tsx
import React, { useState, useMemo } from 'react';
import {
  PhoneCall, Mail, StickyNote, Calendar, CheckSquare, Linkedin,
  Clock, CheckCircle2, Circle, AlertCircle, ArrowUpRight, ArrowDownLeft,
  MoreHorizontal, Pencil, Trash2, FileText,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO, isPast } from 'date-fns';

type ActivityModalType = 'call' | 'note' | 'email' | 'task' | 'meeting' | 'linkedin' | null;

interface Props {
  company: any;
  onOpenModal: (type: ActivityModalType) => void;
  onEditActivity: (activity: any) => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteActivity: (activityId: string) => void;
}

const ACTIVITY_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  call:         { icon: PhoneCall,    color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Call' },
  email:        { icon: Mail,         color: 'text-blue-600',    bg: 'bg-blue-50',    label: 'Email' },
  linkedin:     { icon: Linkedin,     color: 'text-sky-600',     bg: 'bg-sky-50',     label: 'LinkedIn' },
  note:         { icon: StickyNote,   color: 'text-purple-600',  bg: 'bg-purple-50',  label: 'Note' },
  task:         { icon: CheckSquare,  color: 'text-green-600',   bg: 'bg-green-50',   label: 'Task' },
  meeting:      { icon: Calendar,     color: 'text-indigo-600',  bg: 'bg-indigo-50',  label: 'Meeting' },
  stage_change: { icon: ArrowUpRight, color: 'text-slate-500',   bg: 'bg-slate-100',  label: 'Stage' },
};

const QUICK_ACTIONS = [
  { type: 'call' as const,     icon: PhoneCall,   label: 'Call',     color: 'text-amber-600',  hover: 'hover:bg-amber-50 hover:border-amber-200' },
  { type: 'email' as const,    icon: Mail,        label: 'Email',    color: 'text-blue-600',   hover: 'hover:bg-blue-50 hover:border-blue-200' },
  { type: 'linkedin' as const, icon: Linkedin,    label: 'LinkedIn', color: 'text-sky-600',    hover: 'hover:bg-sky-50 hover:border-sky-200' },
  { type: 'note' as const,     icon: StickyNote,  label: 'Note',     color: 'text-purple-600', hover: 'hover:bg-purple-50 hover:border-purple-200' },
  { type: 'task' as const,     icon: CheckSquare, label: 'Task',     color: 'text-green-600',  hover: 'hover:bg-green-50 hover:border-green-200' },
  { type: 'meeting' as const,  icon: Calendar,    label: 'Meeting',  color: 'text-indigo-600', hover: 'hover:bg-indigo-50 hover:border-indigo-200' },
];

const OUTCOME_STYLES: Record<string, string> = {
  connected:       'bg-green-50 text-green-600',
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

// ── Section header matching ContactLeftPanel ──────────────────────────────────
const SectionHeader: React.FC<{ title: string; icon: React.ElementType; count?: number }> = ({ title, icon: Icon, count }) => (
  <div className="flex items-center gap-2 px-3 py-2 crmtheme-section-header">
    <Icon size={12} className="text-white" />
    <span className="text-[10px] font-bold text-white uppercase tracking-widest">{title}</span>
    {count !== undefined && <span className="ml-auto text-[10px] font-semibold text-white">{count}</span>}
  </div>
);

export const CompanyActivityPanel: React.FC<Props> = ({
  company, onOpenModal, onEditActivity, onCompleteTask, onDeleteActivity
}) => {
  const [filterType,      setFilterType]      = useState<string>('all');
  const [expandedItems,   setExpandedItems]   = useState<Set<string>>(new Set());

  const allActivities: any[] = company.company_activities || [];
  const sortedActivities = useMemo(() =>
    [...allActivities].sort((a, b) => new Date(b.activity_date || b.created_at).getTime() - new Date(a.activity_date || a.created_at).getTime()),
    [allActivities]);

  const filteredActivities = useMemo(() =>
    filterType === 'all' ? sortedActivities : sortedActivities.filter(a => a.type === filterType),
    [sortedActivities, filterType]);

  const groupedActivities = useMemo(() => {
    return filteredActivities.reduce((acc: Record<string, any[]>, activity) => {
      const d = new Date(activity.activity_date || activity.created_at);
      const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMM d, yyyy');
      if (!acc[key]) acc[key] = [];
      acc[key].push(activity);
      return acc;
    }, {});
  }, [filteredActivities]);

  const pendingTasks = sortedActivities.filter(a => a.type === 'task' && !a.is_completed);
  const overdueCount = pendingTasks.filter(a => a.due_date && isPast(parseISO(a.due_date))).length;

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

  return (
    <div className="flex flex-col divide-y divide-slate-100">

      {/* ── Quick Log ─────────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Log Activity" icon={FileText} />
        <div className="px-3 py-2.5">
          <div className="grid grid-cols-6 gap-1">
            {QUICK_ACTIONS.map(({ type, icon: Icon, label, color, hover }) => (
              <button key={type} onClick={() => onOpenModal(type)}
                className={cn('flex flex-col items-center gap-0.5 py-2 rounded-md border border-transparent text-center transition-all', hover)}>
                <Icon size={14} className={color} />
                <span className="text-[8px] font-medium text-slate-500 leading-none">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pending task banner ──────────────────────────────────────── */}
      {pendingTasks.length > 0 && (
        <div className={cn('mx-3 mt-2 mb-0 flex items-center gap-2 px-2.5 py-2 rounded-lg',
          overdueCount > 0 ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200')}>
          {overdueCount > 0
            ? <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            : <CheckSquare size={13} className="text-amber-600 flex-shrink-0" />
          }
          <p className={cn('text-xs font-semibold', overdueCount > 0 ? 'text-red-700' : 'text-amber-700')}>
            {overdueCount > 0
              ? `${overdueCount} overdue · ${pendingTasks.length} pending`
              : `${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''}`}
          </p>
        </div>
      )}

      {/* ── Activity section ─────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Activity" icon={Clock} count={allActivities.length} />

        {/* Filter pills — matching ContactLeftPanel style */}
        <div className="px-2 py-1.5 border-b border-slate-100">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {(['all', 'call', 'email', 'linkedin', 'note', 'task', 'meeting'] as const).map(type => (
              <button key={type} onClick={() => setFilterType(type)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all',
                  filterType === type
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                )}>
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                {activityCounts[type] > 0 && (
                  <span className={cn('text-[8px] px-1 py-0.5 rounded-full min-w-[13px] text-center',
                    filterType === type ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-500')}>
                    {activityCounts[type]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="pb-4">
          {filteredActivities.length === 0 ? (
            <div className="py-8 text-center">
              <Clock size={18} className="text-slate-200 mx-auto mb-2" />
              <p className="text-[11px] text-slate-400">No activities yet</p>
              <p className="text-[10px] text-slate-300 mt-0.5">Start tracking outreach with this company</p>
            </div>
          ) : (
            Object.entries(groupedActivities).map(([dateLabel, activities]) => (
              <div key={dateLabel}>
                <div className="sticky top-0 z-10 px-3 py-1 bg-white/90 backdrop-blur-sm">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{dateLabel}</span>
                </div>
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ── Activity Card ─────────────────────────────────────────────────────────────
const ActivityCard: React.FC<{
  activity: any; isExpanded: boolean;
  onToggleExpand: () => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (activity: any) => void;
}> = ({ activity, isExpanded, onToggleExpand, onComplete, onDelete, onEdit }) => {
  const cfg         = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.note;
  const Icon        = cfg.icon;
  const isTask      = activity.type === 'task';
  const isCompleted = activity.is_completed;
  const outcome     = activity.outcome || activity.metadata?.outcome;
  const dueDate     = activity.due_date;
  const isOverdue   = isTask && dueDate && !isCompleted && isPast(parseISO(dueDate));
  const htmlContent = activity.description_html || activity.description || '';
  const needsExpand = htmlContent.length > 100;

  return (
    <div className={cn(
      'mx-2 mb-1.5 rounded-lg border bg-white p-2.5 group transition-all',
      isOverdue ? 'border-red-200 bg-red-50/20' : isCompleted ? 'opacity-60' : 'hover:border-violet-200/60 hover:shadow-sm',
    )}>
      <div className="flex items-start gap-2">
        {isTask ? (
          <button className="mt-0.5 flex-shrink-0" onClick={() => !isCompleted && onComplete(activity.id)}>
            {isCompleted
              ? <CheckCircle2 size={13} className="text-green-500" />
              : <Circle size={13} className={cn('transition-colors', isOverdue ? 'text-red-400' : 'text-slate-300 hover:text-violet-400')} />
            }
          </button>
        ) : (
          <div className={cn('p-1 rounded-md flex-shrink-0 mt-0.5', cfg.bg)}>
            <Icon size={10} className={cfg.color} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className={cn('text-[11px] font-medium text-slate-800 leading-tight', isCompleted && 'line-through text-slate-400')}>
              {activity.title}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded hover:bg-slate-100">
                  <MoreHorizontal size={11} className="text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-28 text-xs rounded-xl">
                <DropdownMenuItem onClick={() => onEdit(activity)} className="text-xs"><Pencil size={10} className="mr-2" />Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(activity.id)} className="text-xs text-red-600"><Trash2 size={10} className="mr-2" />Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {outcome && (
              <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded capitalize', OUTCOME_STYLES[outcome] || 'bg-slate-50 text-slate-500')}>
                {outcome.replace(/_/g, ' ')}
              </span>
            )}
            {isTask && dueDate && (
              <span className={cn('text-[9px] flex items-center gap-0.5', isOverdue ? 'text-red-600 font-medium' : 'text-slate-400')}>
                {isOverdue && <AlertCircle size={8} />}
                <Calendar size={8} />{format(parseISO(dueDate), 'MMM d')}
              </span>
            )}
          </div>

          {htmlContent && (
            <div className="mt-1">
              {htmlContent.includes('<')
                ? <div className={cn('text-[10px] text-slate-500 leading-relaxed prose prose-xs max-w-none [&>*]:text-[10px]', !isExpanded && 'line-clamp-2')} dangerouslySetInnerHTML={{ __html: htmlContent }} />
                : <p className={cn('text-[10px] text-slate-500 leading-relaxed', !isExpanded && 'line-clamp-2')}>{htmlContent}</p>
              }
              {needsExpand && (
                <button onClick={onToggleExpand} className="text-[9px] text-violet-500 mt-0.5">
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-50">
            <div className="flex items-center gap-1">
              {activity.creator && (
                <>
                  <Avatar className="h-3.5 w-3.5">
                    <AvatarImage src={activity.creator.profile_picture_url} />
                    <AvatarFallback className="text-[6px] bg-violet-100 text-violet-600">{activity.creator.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-[9px] text-slate-400">{activity.creator.first_name}</span>
                </>
              )}
            </div>
            <span className="text-[9px] text-slate-300">
              {formatDistanceToNow(new Date(activity.activity_date || activity.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};