// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ActivityTimelineTab.tsx
import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  PhoneCall, Mail, StickyNote, Calendar, CheckSquare, Clock,
  Plus, Filter, ChevronDown, MoreHorizontal, CheckCircle2, Circle,
  ArrowUpRight, ArrowDownLeft, AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO, isPast } from 'date-fns';

interface ActivityTimelineTabProps {
  contact: any;
  onOpenModal: (type: 'call' | 'note' | 'email' | 'task' | 'meeting') => void;
  onCompleteTask?: (taskId: string) => void;
  onDeleteActivity?: (activityId: string) => void;
}

export const ActivityTimelineTab: React.FC<ActivityTimelineTabProps> = ({ 
  contact, 
  onOpenModal,
  onCompleteTask,
  onDeleteActivity
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const activities = contact.contact_activities || [];
  
  // Filter activities
  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter((a: any) => a.type === filter);
  
  // Sort by date (newest first)
  const sortedActivities = [...filteredActivities].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Group activities by date
  const groupedActivities = sortedActivities.reduce((groups: any, activity: any) => {
    const activityDate = new Date(activity.activity_date || activity.created_at);
    let dateKey: string;
    
    if (isToday(activityDate)) {
      dateKey = 'Today';
    } else if (isYesterday(activityDate)) {
      dateKey = 'Yesterday';
    } else {
      dateKey = format(activityDate, 'MMMM d, yyyy');
    }
    
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(activity);
    return groups;
  }, {});

  const activityTypes = [
    { value: 'all', label: 'All Activities', count: activities.length },
    { value: 'call', label: 'Calls', count: activities.filter((a: any) => a.type === 'call').length },
    { value: 'email', label: 'Emails', count: activities.filter((a: any) => a.type === 'email').length },
    { value: 'note', label: 'Notes', count: activities.filter((a: any) => a.type === 'note').length },
    { value: 'task', label: 'Tasks', count: activities.filter((a: any) => a.type === 'task').length },
    { value: 'meeting', label: 'Meetings', count: activities.filter((a: any) => a.type === 'meeting').length },
  ];

  const quickActions = [
    { type: 'call' as const, icon: PhoneCall, label: 'Log Call', color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200' },
    { type: 'email' as const, icon: Mail, label: 'Log Email', color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
    { type: 'note' as const, icon: StickyNote, label: 'Create Note', color: 'text-purple-600', bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
    { type: 'task' as const, icon: CheckSquare, label: 'Create Task', color: 'text-green-600', bg: 'bg-green-50 hover:bg-green-100 border-green-200' },
    { type: 'meeting' as const, icon: Calendar, label: 'Log Meeting', color: 'text-indigo-600', bg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200' },
  ];

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Log Activity</h3>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {quickActions.map((action) => (
            <Button
              key={action.type}
              variant="outline"
              size="sm"
              onClick={() => onOpenModal(action.type)}
              className={cn("h-9 px-3 text-sm font-medium border", action.bg)}
            >
              <action.icon size={14} className={cn("mr-1.5", action.color)} />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Filter Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">Activity Timeline</span>
            <Badge variant="secondary" className="text-xs bg-gray-100">
              {sortedActivities.length}
            </Badge>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                <Filter size={12} className="mr-1.5" />
                {activityTypes.find(t => t.value === filter)?.label}
                <ChevronDown size={12} className="ml-1.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {activityTypes.map((type) => (
                <DropdownMenuItem 
                  key={type.value}
                  onClick={() => setFilter(type.value)}
                  className={cn(
                    "flex items-center justify-between",
                    filter === type.value && "bg-gray-100"
                  )}
                >
                  <span>{type.label}</span>
                  <span className="text-xs text-gray-400">{type.count}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Timeline Content */}
        <div className="divide-y divide-gray-100">
          {sortedActivities.length === 0 ? (
            <EmptyState onOpenModal={onOpenModal} />
          ) : (
            Object.entries(groupedActivities).map(([date, dateActivities]: [string, any]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <span className="text-xs font-medium text-gray-500">{date}</span>
                </div>
                
                {/* Activities for this date */}
                {dateActivities.map((activity: any) => (
                  <ActivityItem 
                    key={activity.id} 
                    activity={activity}
                    isExpanded={expandedItems.has(activity.id)}
                    onToggleExpand={() => toggleExpanded(activity.id)}
                    onCompleteTask={onCompleteTask}
                    onDeleteActivity={onDeleteActivity}
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

// Activity Item Component
interface ActivityItemProps {
  activity: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCompleteTask?: (taskId: string) => void;
  onDeleteActivity?: (activityId: string) => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ 
  activity, 
  isExpanded,
  onToggleExpand,
  onCompleteTask,
  onDeleteActivity
}) => {
  const typeConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    call: { icon: PhoneCall, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Call' },
    email: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Email' },
    note: { icon: StickyNote, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Note' },
    task: { icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-50', label: 'Task' },
    meeting: { icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Meeting' },
  };
  
  const config = typeConfig[activity.type] || typeConfig.note;
  const Icon = config.icon;
  const isTask = activity.type === 'task';
  const isCompleted = activity.is_completed;
  
  // Get metadata from either metadata JSON or direct columns
  const outcome = activity.outcome || activity.metadata?.outcome;
  const direction = activity.direction || activity.metadata?.direction;
  const duration = activity.duration_minutes || activity.metadata?.duration;
  const dueDate = activity.due_date || activity.metadata?.dueDate;
  const priority = activity.priority || activity.metadata?.priority;
  
  // Check if task is overdue
  const isOverdue = isTask && dueDate && !isCompleted && isPast(parseISO(dueDate));

  // Render rich text content or plain text
  const renderContent = () => {
    const htmlContent = activity.description_html || activity.description;
    
    if (!htmlContent) return null;
    
    // Check if it's HTML content
    if (htmlContent.includes('<') && htmlContent.includes('>')) {
      return (
        <div 
          className={cn(
            "text-sm text-gray-600 mt-1 prose prose-sm max-w-none",
            !isExpanded && "line-clamp-2"
          )}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      );
    }
    
    // Plain text
    return (
      <p className={cn(
        "text-sm text-gray-600 mt-1",
        !isExpanded && "line-clamp-2"
      )}>
        {htmlContent}
      </p>
    );
  };

  // Check if content needs expansion
  const contentLength = (activity.description_html || activity.description || '').length;
  const needsExpansion = contentLength > 150;

  return (
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors group">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn("p-2 rounded-lg flex-shrink-0", config.bg)}>
          <Icon size={16} className={config.color} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Title Row */}
              <div className="flex items-center gap-2 flex-wrap">
                {isTask && (
                  <button 
                    className="flex-shrink-0"
                    onClick={() => onCompleteTask?.(activity.id)}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={18} className="text-green-500" />
                    ) : (
                      <Circle size={18} className="text-gray-300 hover:text-green-400 transition-colors" />
                    )}
                  </button>
                )}
                <h4 className={cn(
                  "text-sm font-medium text-gray-900",
                  isTask && isCompleted && "line-through text-gray-400"
                )}>
                  {activity.title}
                </h4>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] font-medium capitalize",
                    config.bg,
                    config.color.replace('text-', 'text-')
                  )}
                >
                  {config.label}
                </Badge>
              </div>
              
              {/* Rich Text Content */}
              {renderContent()}
              
              {/* Expand/Collapse Button */}
              {needsExpansion && (
                <button
                  onClick={onToggleExpand}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1 font-medium"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
              
              {/* Metadata Tags */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {/* Call Direction */}
                {direction && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    {direction === 'inbound' ? (
                      <ArrowDownLeft size={12} className="text-green-500" />
                    ) : (
                      <ArrowUpRight size={12} className="text-blue-500" />
                    )}
                    <span className="capitalize">{direction}</span>
                  </span>
                )}
                
                {/* Call Outcome */}
                {outcome && (
                  <OutcomeBadge outcome={outcome} />
                )}
                
                {/* Duration */}
                {duration && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={12} />
                    {duration} min
                  </span>
                )}
                
                {/* Priority */}
                {priority && priority !== 'none' && (
                  <PriorityBadge priority={priority} />
                )}
                
                {/* Due Date for Tasks */}
                {isTask && dueDate && (
                  <span className={cn(
                    "inline-flex items-center gap-1 text-xs",
                    isOverdue ? "text-red-600" : "text-gray-500"
                  )}>
                    {isOverdue && <AlertCircle size={12} />}
                    <Calendar size={12} />
                    Due {format(parseISO(dueDate), 'MMM d')}
                  </span>
                )}
                
                {/* Parent Activity Link */}
                {activity.parent_activity_id && (
                  <span className="text-xs text-gray-400 italic">
                    Follow-up task
                  </span>
                )}
              </div>
              
              {/* Footer: Creator & Time */}
              <div className="flex items-center gap-3 mt-2">
                {activity.creator && (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={activity.creator.profile_picture_url} />
                      <AvatarFallback className="bg-gray-200 text-gray-600 text-[10px]">
                        {activity.creator.first_name?.[0]}{activity.creator.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-500">
                      {activity.creator.first_name} {activity.creator.last_name}
                    </span>
                  </div>
                )}
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={10} />
                  {formatDistanceToNow(new Date(activity.activity_date || activity.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600">
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  {isTask && !isCompleted && (
                    <DropdownMenuItem onClick={() => onCompleteTask?.(activity.id)}>
                      Mark Complete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => onDeleteActivity?.(activity.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Outcome Badge Component
const OutcomeBadge: React.FC<{ outcome: string }> = ({ outcome }) => {
  const outcomeStyles: Record<string, string> = {
    connected: 'bg-green-50 text-green-700 border-green-200',
    busy: 'bg-amber-50 text-amber-700 border-amber-200',
    no_answer: 'bg-gray-100 text-gray-600 border-gray-200',
    left_voicemail: 'bg-blue-50 text-blue-700 border-blue-200',
    left_message: 'bg-blue-50 text-blue-700 border-blue-200',
    wrong_number: 'bg-red-50 text-red-700 border-red-200',
    scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    rescheduled: 'bg-amber-50 text-amber-700 border-amber-200',
    no_show: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const formatOutcome = (o: string) => o.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-[10px] font-medium border",
        outcomeStyles[outcome] || 'bg-gray-50 text-gray-600 border-gray-200'
      )}
    >
      {formatOutcome(outcome)}
    </Badge>
  );
};

// Priority Badge Component
const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const priorityStyles: Record<string, string> = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-green-50 text-green-700 border-green-200',
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-[10px] font-medium border capitalize",
        priorityStyles[priority] || 'bg-gray-50 text-gray-600 border-gray-200'
      )}
    >
      {priority} priority
    </Badge>
  );
};

// Empty State Component
const EmptyState: React.FC<{ onOpenModal: (type: any) => void }> = ({ onOpenModal }) => (
  <div className="py-16 text-center">
    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Clock size={24} className="text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-900 mb-1">No activities yet</p>
    <p className="text-xs text-gray-500 mb-6 max-w-xs mx-auto">
      Start tracking your interactions with this contact to build a complete history
    </p>
    <div className="flex items-center justify-center gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onOpenModal('call')}
        className="text-xs bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
      >
        <PhoneCall size={12} className="mr-1.5" />
        Log Call
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onOpenModal('note')}
        className="text-xs bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
      >
        <StickyNote size={12} className="mr-1.5" />
        Add Note
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onOpenModal('task')}
        className="text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
      >
        <CheckSquare size={12} className="mr-1.5" />
        Create Task
      </Button>
    </div>
  </div>
);

export default ActivityTimelineTab;