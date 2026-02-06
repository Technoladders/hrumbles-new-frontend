// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/ActivityFeed.tsx
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Phone, 
  Mail, 
  MessageSquare,
  Calendar,
  CheckSquare,
  ArrowRight,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  activity_type: string;
  title: string;
  description?: string;
  created_at: string;
  contacts?: {
    id: number;
    name: string;
    photo_url?: string;
  };
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading: boolean;
}

const ACTIVITY_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  call: { icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50' },
  email: { icon: Mail, color: 'text-green-600', bg: 'bg-green-50' },
  note: { icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
  meeting: { icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
  task: { icon: CheckSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  default: { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-50' },
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, isLoading }) => {
  const getActivityConfig = (type: string) => {
    return ACTIVITY_ICONS[type.toLowerCase()] || ACTIVITY_ICONS.default;
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
          <p className="text-xs text-gray-500 mt-0.5">Your latest interactions</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          View all
          <ArrowRight size={12} className="ml-1" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => {
              const config = getActivityConfig(activity.activity_type);
              const Icon = config.icon;

              return (
                <div key={activity.id} className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      config.bg
                    )}>
                      <Icon size={14} className={config.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 line-clamp-1">
                        {activity.title}
                      </p>
                      {activity.contacts?.name && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={activity.contacts.photo_url || undefined} />
                            <AvatarFallback className="text-[8px] bg-gray-100">
                              {getInitials(activity.contacts.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{activity.contacts.name}</span>
                        </p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                        <Clock size={10} />
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Activity size={16} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">No activity yet</p>
              <p className="text-xs text-gray-500 mt-1">Activities will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};