import React, { useState, useMemo } from 'react';
import {
  PhoneCall, Mail, StickyNote, Calendar, CheckSquare, Linkedin,
  Clock, CheckCircle2, Circle, AlertCircle, ArrowUpRight, ArrowDownLeft,
  MoreHorizontal, Pencil, Trash2
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
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
  call:         { icon: PhoneCall,   color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Call' },
  email:        { icon: Mail,        color: 'text-blue-600',    bg: 'bg-blue-50',    label: 'Email' },
  linkedin:     { icon: Linkedin,    color: 'text-sky-600',     bg: 'bg-sky-50',     label: 'LinkedIn' },
  note:         { icon: StickyNote,  color: 'text-purple-600',  bg: 'bg-purple-50',  label: 'Note' },
  task:         { icon: CheckSquare, color: 'text-green-600',   bg: 'bg-green-50',   label: 'Task' },
  meeting:      { icon: Calendar,    color: 'text-indigo-600',  bg: 'bg-indigo-50',  label: 'Meeting' },
  stage_change: { icon: ArrowUpRight,color: 'text-gray-500',    bg: 'bg-gray-100',   label: 'Stage' },
};

const QUICK_ACTIONS =[
  { type: 'call' as const,     icon: PhoneCall,   label: 'Call',     color: 'text-amber-600',  hoverBg: 'hover:bg-amber-50 hover:border-amber-200' },
  { type: 'email' as const,    icon: Mail,        label: 'Email',    color: 'text-blue-600',   hoverBg: 'hover:bg-blue-50 hover:border-blue-200' },
  { type: 'linkedin' as const, icon: Linkedin,    label: 'LinkedIn', color: 'text-sky-600',    hoverBg: 'hover:bg-sky-50 hover:border-sky-200' },
  { type: 'note' as const,     icon: StickyNote,  label: 'Note',     color: 'text-purple-600', hoverBg: 'hover:bg-purple-50 hover:border-purple-200' },
  { type: 'task' as const,     icon: CheckSquare, label: 'Task',     color: 'text-green-600',  hoverBg: 'hover:bg-green-50 hover:border-green-200' },
  { type: 'meeting' as const,  icon: Calendar,    label: 'Meeting',  color: 'text-indigo-600', hoverBg: 'hover:bg-indigo-50 hover:border-indigo-200' },
];

export const CompanyActivityPanel: React.FC<Props> = ({
  company, onOpenModal, onEditActivity, onCompleteTask, onDeleteActivity
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const[expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const allActivities: any[] = company.company_activities || [];
  const sortedActivities = useMemo(() =>
    [...allActivities].sort((a, b) =>
      new Date(b.activity_date || b.created_at).getTime() -
      new Date(a.activity_date || a.created_at).getTime()
    ),[allActivities]);

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
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Quick Log Actions */}
      <div className="px-4 py-3 border-b border-[#F0EDE8] flex-shrink-0">
        <p className="text-[10px] font-semibold text-[#9C9189] uppercase tracking-wider mb-2.5 px-1">Log Activity</p>
        <div className="grid grid-cols-6 gap-1.5">
          {QUICK_ACTIONS.map(({ type, icon: Icon, label, color, hoverBg }) => (
            <button
              key={type}
              onClick={() => onOpenModal(type)}
              className={cn('flex flex-col items-center gap-1.5 py-2.5 rounded-xl border border-transparent transition-all duration-150', hoverBg)}
            >
              <Icon size={16} className={color} />
              <span className="text-[9px] font-medium text-[#6A6057] leading-none">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pending Tasks Banner */}
      {pendingTasks.length > 0 && (
        <div className={cn(
          'mx-4 mt-3 rounded-xl border px-3 py-2.5 flex items-center gap-2.5 flex-shrink-0',
          overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        )}>
          {overdueCount > 0 ? <AlertCircle size={14} className="text-red-500 flex-shrink-0" /> : <CheckSquare size={14} className="text-amber-600 flex-shrink-0" />}
          <p className={cn('text-xs font-semibold', overdueCount > 0 ? 'text-red-700' : 'text-amber-700')}>
            {overdueCount > 0 ? `${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} · ${pendingTasks.length} pending` : `${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''}`}
          </p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="px-4 pt-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'call', 'email', 'linkedin', 'note', 'task', 'meeting'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-[600] whitespace-nowrap transition-all',
                filterType === type ? 'bg-[#5B4FE8] text-white' : 'bg-[#F0EDE8] text-[#6A6057] hover:bg-[#E5E0D8]'
              )}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              {activityCounts[type] > 0 && (
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded-md min-w-[16px] text-center leading-none', filterType === type ? 'bg-white/20 text-white' : 'bg-white text-[#9C9189]')}>
                  {activityCounts[type]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 mt-3 space-y-4">
        {filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 bg-[#F0EDE8] rounded-2xl flex items-center justify-center mb-3">
              <Clock size={20} className="text-[#9C9189]" />
            </div>
            <p className="text-[13px] font-semibold text-[#1C1916] mb-1">No activities yet</p>
            <p className="text-[11px] text-[#9C9189] max-w-[200px]">Start tracking your outreach with this company.</p>
          </div>
        ) : (
          Object.entries(groupedActivities).map(([dateLabel, activities]) => (
            <div key={dateLabel} className="space-y-2">
              <div className="sticky top-0 z-10 py-1.5 bg-white/90 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-[#9C9189] uppercase tracking-wider">{dateLabel}</span>
              </div>
              <div className="space-y-2">
                {activities.map((activity: any) => (
                  <ActivityCard key={activity.id} activity={activity} isExpanded={expandedItems.has(activity.id)} onToggleExpand={() => toggleExpanded(activity.id)} onComplete={onCompleteTask} onDelete={onDeleteActivity} onEdit={onEditActivity} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ── Activity Card Subcomponent ──
const ActivityCard: React.FC<{ activity: any, isExpanded: boolean, onToggleExpand: () => void, onComplete: (id: string) => void, onDelete: (id: string) => void, onEdit: (activity: any) => void }> = ({ activity, isExpanded, onToggleExpand, onComplete, onDelete, onEdit }) => {
  const cfg = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.note;
  const Icon = cfg.icon;
  const isTask = activity.type === 'task';
  const isCompleted = activity.is_completed;
  
  const htmlContent = activity.description_html || activity.description || '';
  const needsExpansion = htmlContent.length > 140;

  return (
    <div className={cn('rounded-2xl border border-[#E5E0D8] bg-white p-3.5 group transition-shadow hover:shadow-sm hover:border-[#D5CFC5]', isCompleted && 'opacity-60 bg-[#FAFAF9]')}>
      <div className="flex items-start gap-3">
        {isTask ? (
          <button className="mt-0.5 flex-shrink-0" onClick={() => !isCompleted && onComplete(activity.id)}>
            {isCompleted ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} className="text-[#C4BDB5] hover:text-green-500 transition-colors" />}
          </button>
        ) : (
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
            <Icon size={13} className={cfg.color} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn('text-[13px] font-semibold text-[#1C1916] leading-snug', isCompleted && 'line-through text-[#9C9189]')}>
              {activity.title}
            </h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-[#F0EDE8]"><MoreHorizontal size={14} className="text-[#9C9189]" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 text-xs rounded-xl">
                <DropdownMenuItem onClick={() => onEdit(activity)}><Pencil size={12} className="mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(activity.id)} className="text-red-600 focus:bg-red-50 focus:text-red-700"><Trash2 size={12} className="mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md', cfg.bg, cfg.color)}>{cfg.label}</span>
            {activity.outcome && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-[#F0EDE8] text-[#6A6057] uppercase tracking-wide">{activity.outcome.replace(/_/g, ' ')}</span>}
            {isTask && activity.due_date && (
              <span className="text-[10px] font-medium text-[#9C9189] flex items-center gap-1">
                <Calendar size={10} /> {format(parseISO(activity.due_date), 'MMM d')}
              </span>
            )}
          </div>

          {htmlContent && (
            <div className="mt-2.5">
              <div className={cn('text-[12px] text-[#6A6057] leading-[1.6]', !isExpanded && 'line-clamp-2')} dangerouslySetInnerHTML={{ __html: htmlContent }} />
              {needsExpansion && (
                <button onClick={onToggleExpand} className="text-[10px] text-[#5B4FE8] font-bold mt-1 uppercase tracking-wide hover:underline">
                  {isExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#F0EDE8]">
            <div className="flex items-center gap-1.5">
              {activity.creator && (
                <>
                  <Avatar className="h-4 w-4"><AvatarImage src={activity.creator.profile_picture_url} /><AvatarFallback className="text-[8px] bg-[#F0EDE8]">{activity.creator.first_name?.[0]}</AvatarFallback></Avatar>
                  <span className="text-[10px] font-medium text-[#9C9189]">{activity.creator.first_name} {activity.creator.last_name}</span>
                </>
              )}
            </div>
            <span className="text-[10px] font-medium text-[#D5CFC5]">
              {formatDistanceToNow(new Date(activity.activity_date || activity.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};