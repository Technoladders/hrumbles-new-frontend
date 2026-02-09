// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/RecentActivities.tsx
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  Mail, 
  Calendar, 
  CheckSquare, 
  StickyNote,
  ChevronRight,
  Clock,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Activity {
  id: string;
  type: string;
  title: string;
  outcome?: string;
  direction?: string;
  created_at: string;
  contact?: {
    id: string;
    name: string;
    email: string;
    photo_url?: string;
    companies?: {
      name: string;
    };
  };
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  };
}

interface RecentActivitiesProps {
  activities: Activity[];
}

const activityConfig: Record<string, { icon: any; color: string; bg: string }> = {
  call: { icon: Phone, color: 'text-amber-600', bg: 'bg-amber-100' },
  email: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100' },
  meeting: { icon: Calendar, color: 'text-green-600', bg: 'bg-green-100' },
  task: { icon: CheckSquare, color: 'text-violet-600', bg: 'bg-violet-100' },
  note: { icon: StickyNote, color: 'text-pink-600', bg: 'bg-pink-100' }
};

const outcomeStyles: Record<string, string> = {
  connected: 'bg-green-50 text-green-700',
  no_answer: 'bg-gray-100 text-gray-600',
  busy: 'bg-amber-50 text-amber-700',
  left_voicemail: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  scheduled: 'bg-indigo-50 text-indigo-700',
};

export const RecentActivities: React.FC<RecentActivitiesProps> = ({ activities }) => {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  };

  const formatOutcome = (outcome: string) => {
    return outcome?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Clock size={18} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-xs text-gray-500">Latest updates</p>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" className="text-xs text-blue-600">
          View All <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {activities.map((activity, index) => {
          const config = activityConfig[activity.type] || activityConfig.note;
          const Icon = config.icon;
          
          return (
            <div 
              key={activity.id}
              className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => activity.contact?.id && navigate(`/contacts/${activity.contact.id}`)}
            >
              {/* Timeline Connector */}
              <div className="flex flex-col items-center">
                <div className={cn("p-1.5 rounded-lg", config.bg)}>
                  <Icon size={14} className={config.color} />
                </div>
                {index < activities.length - 1 && (
                  <div className="w-px h-full bg-gray-200 my-1 flex-1 min-h-[20px]" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {activity.title}
                    </p>
                    
                    {/* Contact Info */}
                    {activity.contact && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={activity.contact.photo_url} />
                          <AvatarFallback className="text-[7px] bg-gray-200">
                            {getInitials(activity.contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-500 truncate">
                          {activity.contact.name}
                        </span>
                        {activity.contact.companies?.name && (
                          <>
                            <span className="text-xs text-gray-300">•</span>
                            <span className="text-xs text-gray-400 truncate">
                              {activity.contact.companies.name}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 mt-1.5">
                  {/* Direction */}
                  {activity.direction && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
                      {activity.direction === 'inbound' ? (
                        <ArrowDownLeft size={10} className="text-green-500" />
                      ) : (
                        <ArrowUpRight size={10} className="text-blue-500" />
                      )}
                      <span className="capitalize">{activity.direction}</span>
                    </span>
                  )}
                  
                  {/* Outcome */}
                  {activity.outcome && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        outcomeStyles[activity.outcome] || 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {formatOutcome(activity.outcome)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {activities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Clock size={20} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">No recent activity</p>
            <p className="text-xs text-gray-400 mt-1">Activities will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};