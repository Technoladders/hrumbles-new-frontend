// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ActivityTimelineTab.tsx
import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  PhoneCall, Mail, StickyNote, Calendar, CheckSquare, Clock,
  Plus, Filter, ChevronDown, MoreHorizontal, CheckCircle2, Circle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { getRelativeTime, formatDate } from '@/utils/dataExtractor';

interface ActivityTimelineTabProps {
  contact: any;
  onOpenModal: (type: 'call' | 'note' | 'email' | 'task' | 'meeting') => void;
}

export const ActivityTimelineTab: React.FC<ActivityTimelineTabProps> = ({ 
  contact, 
  onOpenModal 
}) => {
  const [filter, setFilter] = useState<string>('all');
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
    const date = new Date(activity.created_at).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(activity);
    return groups;
  }, {});

  const activityTypes = [
    { value: 'all', label: 'All Activities' },
    { value: 'call', label: 'Calls' },
    { value: 'email', label: 'Emails' },
    { value: 'note', label: 'Notes' },
    { value: 'task', label: 'Tasks' },
    { value: 'meeting', label: 'Meetings' },
  ];

  const quickActions = [
    { type: 'call' as const, icon: PhoneCall, label: 'Log Call', color: 'text-amber-600' },
    { type: 'email' as const, icon: Mail, label: 'Log Email', color: 'text-blue-600' },
    { type: 'note' as const, icon: StickyNote, label: 'Create Note', color: 'text-purple-600' },
    { type: 'task' as const, icon: CheckSquare, label: 'Create Task', color: 'text-green-600' },
    { type: 'meeting' as const, icon: Calendar, label: 'Log Meeting', color: 'text-indigo-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Log Activity</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.type}
              variant="outline"
              size="sm"
              onClick={() => onOpenModal(action.type)}
              className="h-9 px-3 text-sm font-medium border-gray-200 hover:bg-gray-50"
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
            <Badge variant="secondary" className="text-xs">
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
            <DropdownMenuContent align="end">
              {activityTypes.map((type) => (
                <DropdownMenuItem 
                  key={type.value}
                  onClick={() => setFilter(type.value)}
                  className={cn(filter === type.value && "bg-gray-100")}
                >
                  {type.label}
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
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-500">{date}</span>
                </div>
                
                {/* Activities for this date */}
                {dateActivities.map((activity: any) => (
                  <ActivityItem key={activity.id} activity={activity} />
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
const ActivityItem = ({ activity }: { activity: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
    call: { icon: PhoneCall, color: 'text-amber-600', bg: 'bg-amber-50' },
    email: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
    note: { icon: StickyNote, color: 'text-purple-600', bg: 'bg-purple-50' },
    task: { icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-50' },
    meeting: { icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  };
  
  const config = typeConfig[activity.type] || typeConfig.note;
  const Icon = config.icon;
  const isTask = activity.type === 'task';
  const isCompleted = activity.status === 'completed' || activity.metadata?.status === 'completed';

  return (
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors group">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn("p-2 rounded-lg", config.bg)}>
          <Icon size={16} className={config.color} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Title Row */}
              <div className="flex items-center gap-2">
                {isTask && (
                  <button className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 size={16} className="text-green-500" />
                    ) : (
                      <Circle size={16} className="text-gray-300 hover:text-gray-400" />
                    )}
                  </button>
                )}
                <h4 className={cn(
                  "text-sm font-medium text-gray-900",
                  isTask && isCompleted && "line-through text-gray-500"
                )}>
                  {activity.title}
                </h4>
                <Badge 
                  variant="secondary" 
                  className="text-[10px] font-medium capitalize bg-gray-100 text-gray-600"
                >
                  {activity.type}
                </Badge>
              </div>
              
              {/* Description Preview */}
              {activity.description && (
                <p className={cn(
                  "text-sm text-gray-600 mt-1",
                  !isExpanded && "line-clamp-2"
                )}>
                  {activity.description}
                </p>
              )}
              
              {/* Metadata */}
              {activity.metadata && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {activity.metadata.outcome && (
                    <MetadataBadge label="Outcome" value={activity.metadata.outcome} />
                  )}
                  {activity.metadata.direction && (
                    <MetadataBadge label="Direction" value={activity.metadata.direction} />
                  )}
                  {activity.metadata.duration && (
                    <MetadataBadge label="Duration" value={`${activity.metadata.duration} min`} />
                  )}
                  {activity.metadata.priority && activity.metadata.priority !== 'none' && (
                    <MetadataBadge label="Priority" value={activity.metadata.priority} />
                  )}
                  {activity.metadata.dueDate && (
                    <MetadataBadge 
                      label="Due" 
                      value={new Date(activity.metadata.dueDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })} 
                    />
                  )}
                </div>
              )}
              
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
                  {getRelativeTime(activity.created_at)}
                </span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {activity.description && activity.description.length > 100 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs text-gray-500"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Less' : 'More'}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400">
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Metadata Badge Component
const MetadataBadge = ({ label, value }: { label: string; value: string }) => (
  <span className="inline-flex items-center gap-1 text-xs">
    <span className="text-gray-400">{label}:</span>
    <span className="text-gray-600 font-medium capitalize">{value}</span>
  </span>
);

// Empty State Component
const EmptyState = ({ onOpenModal }: { onOpenModal: (type: any) => void }) => (
  <div className="py-12 text-center">
    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
      <Clock size={20} className="text-gray-400" />
    </div>
    <p className="text-sm font-medium text-gray-900 mb-1">No activities yet</p>
    <p className="text-xs text-gray-500 mb-4">
      Start tracking your interactions with this contact
    </p>
    <div className="flex items-center justify-center gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onOpenModal('note')}
        className="text-xs"
      >
        <StickyNote size={12} className="mr-1.5" />
        Add Note
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onOpenModal('call')}
        className="text-xs"
      >
        <PhoneCall size={12} className="mr-1.5" />
        Log Call
      </Button>
    </div>
  </div>
);