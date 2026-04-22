// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ContactLeftPanel.tsx
import React, { useState, useMemo } from 'react';
import {
  Briefcase, ChevronDown, ChevronUp, PhoneCall, Mail, StickyNote,
  Calendar, CheckSquare, Linkedin, Clock, Copy, CheckCircle2, Circle,
  AlertCircle, ArrowUpRight, ArrowDownLeft, MoreHorizontal, Pencil,
  Trash2, CheckCheck, Loader2, Phone, FileText,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { extractFromRaw } from '@/utils/dataExtractor';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO, isPast } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type ActivityModalType = 'call' | 'note' | 'email' | 'task' | 'meeting' | 'linkedin' | null;

interface Props {
  contact: any;
  onFieldSave: (field: string, value: any) => Promise<void>;
  onOpenModal: (type: ActivityModalType) => void;
  onEditActivity: (activity: any) => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteActivity: (activityId: string) => void;
  onRequestPhone: () => void;
  isRequestingPhone: boolean;
  phonePending: boolean;
}

// ── Activity config ───────────────────────────────────────────────────────────
const ACTIVITY_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  call:         { icon: PhoneCall,   color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Call' },
  email:        { icon: Mail,        color: 'text-blue-600',    bg: 'bg-blue-50',    label: 'Email' },
  linkedin:     { icon: Linkedin,    color: 'text-sky-600',     bg: 'bg-sky-50',     label: 'LinkedIn' },
  note:         { icon: StickyNote,  color: 'text-purple-600',  bg: 'bg-purple-50',  label: 'Note' },
  task:         { icon: CheckSquare, color: 'text-green-600',   bg: 'bg-green-50',   label: 'Task' },
  meeting:      { icon: Calendar,    color: 'text-indigo-600',  bg: 'bg-indigo-50',  label: 'Meeting' },
  stage_change: { icon: ArrowUpRight,color: 'text-gray-500',    bg: 'bg-gray-100',   label: 'Stage' },
};

const QUICK_ACTIONS = [
  { type: 'call' as const,     icon: PhoneCall,   label: 'Call',    color: 'text-amber-600',  hover: 'hover:bg-amber-50 hover:border-amber-200' },
  { type: 'email' as const,    icon: Mail,        label: 'Email',   color: 'text-blue-600',   hover: 'hover:bg-blue-50 hover:border-blue-200' },
  { type: 'linkedin' as const, icon: Linkedin,    label: 'LinkedIn',color: 'text-sky-600',    hover: 'hover:bg-sky-50 hover:border-sky-200' },
  { type: 'note' as const,     icon: StickyNote,  label: 'Note',    color: 'text-purple-600', hover: 'hover:bg-purple-50 hover:border-purple-200' },
  { type: 'task' as const,     icon: CheckSquare, label: 'Task',    color: 'text-green-600',  hover: 'hover:bg-green-50 hover:border-green-200' },
  { type: 'meeting' as const,  icon: Calendar,    label: 'Meeting', color: 'text-indigo-600', hover: 'hover:bg-indigo-50 hover:border-indigo-200' },
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

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; icon: React.ElementType; count?: number }> = ({ title, icon: Icon, count }) => (
  <div className="flex items-center gap-2 px-3 py-2 crmtheme-section-header">
    <Icon size={12} className="text-white" />

    <span className="text-[10px] font-bold text-white uppercase tracking-widest">
      {title}
    </span>

    {count !== undefined && (
      <span className="ml-auto text-[10px] font-semibold text-white">
        {count}
      </span>
    )}
  </div>
);

// ── Activity Card ─────────────────────────────────────────────────────────────
const ActivityCard: React.FC<{
  activity: any;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (activity: any) => void;
}> = ({ activity, onComplete, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.note;
  const Icon = cfg.icon;
  const isTask = activity.type === 'task';
  const isCompleted = activity.is_completed;
  const isStageChange = activity.type === 'stage_change';
  const outcome = activity.outcome || activity.metadata?.outcome;
  const direction = activity.direction || activity.metadata?.direction;
  const dueDate = activity.due_date;
  const isOverdue = isTask && dueDate && !isCompleted && isPast(parseISO(dueDate));
  const htmlContent = activity.description_html || activity.description || '';
  const needsExpand = htmlContent.length > 100;

  if (isStageChange) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] text-slate-400 italic">
        <div className="w-1.5 h-1.5 rounded-full bg-purple-300 flex-shrink-0" />
        <span>{activity.description || activity.title}</span>
        <span className="ml-auto text-[9px]">{formatDistanceToNow(new Date(activity.activity_date || activity.created_at), { addSuffix: true })}</span>
      </div>
    );
  }

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
              <DropdownMenuContent align="end" className="w-28 text-xs">
                <DropdownMenuItem onClick={() => onEdit(activity)} className="text-xs"><Pencil size={10} className="mr-2" />Edit</DropdownMenuItem>
                {isTask && !isCompleted && <DropdownMenuItem onClick={() => onComplete(activity.id)} className="text-xs"><CheckCheck size={10} className="mr-2" />Complete</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(activity.id)} className="text-xs text-red-600"><Trash2 size={10} className="mr-2" />Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {direction && (
              <span className="flex items-center gap-0.5 text-[9px] text-slate-400">
                {direction === 'inbound' ? <ArrowDownLeft size={8} className="text-green-500" /> : <ArrowUpRight size={8} className="text-blue-400" />}
                {direction}
              </span>
            )}
            {outcome && (
              <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded capitalize', OUTCOME_STYLES[outcome] || 'bg-slate-50 text-slate-500')}>
                {outcome.replace(/_/g, ' ')}
              </span>
            )}
            {activity.duration_minutes && (
              <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Clock size={8} />{activity.duration_minutes}m</span>
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
                ? <div className={cn('text-[10px] text-slate-500 leading-relaxed prose prose-xs max-w-none [&>*]:text-[10px]', !expanded && 'line-clamp-2')} dangerouslySetInnerHTML={{ __html: htmlContent }} />
                : <p className={cn('text-[10px] text-slate-500 leading-relaxed', !expanded && 'line-clamp-2')}>{htmlContent}</p>
              }
              {needsExpand && <button onClick={() => setExpanded(v => !v)} className="text-[9px] text-violet-500 mt-0.5">{expanded ? 'Show less' : 'Show more'}</button>}
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
            <span className="text-[9px] text-slate-300">{formatDistanceToNow(new Date(activity.activity_date || activity.created_at), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const ContactLeftPanel: React.FC<Props> = ({
  contact, onFieldSave, onOpenModal, onEditActivity,
  onCompleteTask, onDeleteActivity, onRequestPhone, isRequestingPhone, phonePending,
}) => {
  const data = extractFromRaw(contact);
  const { toast } = useToast();
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  const enrichmentPerson = contact.enrichment_people?.[0];
  const employmentHistory = data.employmentHistory || enrichmentPerson?.enrichment_employment_history || [];
  const visibleHistory = showAllHistory ? employmentHistory : employmentHistory.slice(0, 3);
  const isEnriched = !!contact.last_enriched_at || !!contact.apollo_person_id;

  // Summary / headline
  const headline = data.headline || enrichmentPerson?.headline || null;

  // Activity processing
  const allActivities: any[] = contact.contact_activities || [];
  const sortedActivities = useMemo(() =>
    [...allActivities].sort((a, b) => new Date(b.activity_date || b.created_at).getTime() - new Date(a.activity_date || a.created_at).getTime()),
    [allActivities]
  );
  const filteredActivities = useMemo(() =>
    filterType === 'all' ? sortedActivities : sortedActivities.filter(a => a.type === filterType),
    [sortedActivities, filterType]
  );
  const groupedActivities = useMemo(() => {
    return filteredActivities.reduce((acc: Record<string, any[]>, activity) => {
      const d = new Date(activity.activity_date || activity.created_at);
      const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMM d, yyyy');
      if (!acc[key]) acc[key] = [];
      acc[key].push(activity);
      return acc;
    }, {});
  }, [filteredActivities]);

  const activityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allActivities.length };
    ['call', 'email', 'linkedin', 'note', 'task', 'meeting'].forEach(t => {
      counts[t] = allActivities.filter(a => a.type === t).length;
    });
    return counts;
  }, [allActivities]);

  const overdueTasks = sortedActivities.filter(a => a.type === 'task' && !a.is_completed && a.due_date && isPast(parseISO(a.due_date)) && !isToday(parseISO(a.due_date)));
  const todayTasks   = sortedActivities.filter(a => a.type === 'task' && !a.is_completed && a.due_date && isToday(parseISO(a.due_date)));

  return (
    <div className="flex flex-col divide-y divide-slate-100">

      {/* ── Phone pending banner ──────────────────────────────────────── */}
      {(phonePending || isRequestingPhone) && (
        <div className="mx-2 mt-2 mb-0 flex items-center gap-2 px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <Loader2 size={11} className="animate-spin text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-amber-800 leading-tight">Phone lookup in progress</p>
            <p className="text-[9px] text-amber-600">Usually delivers in 1–5 min</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
        </div>
      )}

      {/* ── Prospect Summary ──────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Prospect Summary" icon={FileText} />
        <div className="p-3">
          {headline && headline !== contact.job_title ? (
            <p className="text-[11px] text-slate-600 leading-relaxed">{headline}</p>
          ) : (
            <p className="text-[11px] text-slate-400 italic">No summary available</p>
          )}
          {/* Dept/function tags */}
          {(data.departments?.length > 0 || data.functions?.length > 0) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {[...data.departments, ...data.functions]
                .filter((v, i, a) => a.indexOf(v) === i)
                .slice(0, 5)
                .map((tag: string, i: number) => (
                  <span key={i} className="text-[9px] bg-gradient-to-r from-purple-600 to-indigo-600 text-transparent bg-clip-text border border-purple-100 px-1.5 py-0.5 rounded-full capitalize font-medium">
                    {tag.replace(/_/g, ' ')}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Career Timeline ───────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Career Timeline" icon={Briefcase} count={employmentHistory.length} />
        {employmentHistory.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-[11px] text-slate-400 italic">{isEnriched ? 'No employment history found' : 'Enrich to pull career data'}</p>
          </div>
        ) : (
          <div className="p-3">
            <div className="relative pl-3 border-l-2 border-purple-100 space-y-2.5">
              {visibleHistory.map((job: any, idx: number) => {
                const isCurrent = job.current || job.is_current;
                const startYear = job.start_date ? new Date(job.start_date).getFullYear() : null;
                const endYear   = job.end_date   ? new Date(job.end_date).getFullYear()   : null;
                return (
                  <div key={job.id || idx} className="relative">
                    <div className={cn('absolute -left-[17px] mt-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm', isCurrent ? 'bg-gradient-to-br from-purple-500 to-indigo-500' : 'bg-slate-300')} />
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-800 leading-tight">{job.title}</p>
                        <p className="text-[10px] text-slate-500">{job.organization_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {isCurrent && (
                          <span className="text-[8px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full block mb-0.5">Current</span>
                        )}
                        <p className="text-[9px] text-slate-400">
                          {startYear}{startYear && (endYear || isCurrent) ? '–' : ''}{isCurrent ? 'Present' : endYear}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {employmentHistory.length > 3 && (
              <button onClick={() => setShowAllHistory(v => !v)}
                className="mt-2 text-[10px] font-semibold text-purple-500 hover:text-purple-700 flex items-center gap-1">
                {showAllHistory ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                {showAllHistory ? 'Show less' : `${employmentHistory.length - 3} more`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Activity Log ─────────────────────────────────────────────── */}
      <div>
        <SectionHeader title="Activity" icon={Clock} count={allActivities.length} />

        {/* Quick log buttons */}
        <div className="px-2 py-2 border-b border-slate-100">
          <div className="grid grid-cols-6 gap-1">
            {QUICK_ACTIONS.map(({ type, icon: Icon, label, color, hover }) => (
              <button key={type} onClick={() => onOpenModal(type)}
                className={cn('flex flex-col items-center gap-0.5 py-1.5 rounded-md border border-transparent text-center transition-all', hover)}>
                <Icon size={13} className={color} />
                <span className="text-[8px] font-medium text-slate-500 leading-none">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Task summary */}
        {(overdueTasks.length > 0 || todayTasks.length > 0) && (
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-3">
            {overdueTasks.length > 0 && <span className="text-[9px] text-red-600 font-medium flex items-center gap-0.5"><AlertCircle size={9} />{overdueTasks.length} overdue</span>}
            {todayTasks.length > 0 && <span className="text-[9px] text-amber-600 font-medium flex items-center gap-0.5"><CheckSquare size={9} />{todayTasks.length} today</span>}
          </div>
        )}

        {/* Filter pills */}
        <div className="px-2 py-1.5 border-b border-slate-100">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {(['all', 'call', 'email', 'note', 'task', 'meeting'] as const).map(type => (
              <button key={type} onClick={() => setFilterType(type)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all',
                  filterType === type
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                )}>
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                {activityCounts[type] > 0 && (
                  <span className={cn('text-[8px] px-1 py-0.5 rounded-full min-w-[13px] text-center', filterType === type ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-500')}>
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

export default ContactLeftPanel;