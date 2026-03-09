// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/RecentActivities.tsx
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Phone, 
  Mail, 
  Calendar, 
  CheckSquare, 
  StickyNote,
  ChevronRight,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Linkedin
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
  metadata?: any;
}

interface RecentActivitiesProps {
  activities: Activity[];
}

const activityConfig: Record<string, { icon: any; color: string; bg: string }> = {
  call: { icon: Phone, color: 'text-amber-600', bg: 'bg-amber-100' },
  email: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100' },
  meeting: { icon: Calendar, color: 'text-green-600', bg: 'bg-green-100' },
  task: { icon: CheckSquare, color: 'text-violet-600', bg: 'bg-violet-100' },
  note: { icon: StickyNote, color: 'text-pink-600', bg: 'bg-pink-100' },
  linkedin: { icon: Linkedin, color: 'text-[#0A66C2]', bg: 'bg-[#0A66C2]/10' }
};

const outcomeStyles: Record<string, string> = {
  connected: 'bg-green-50 text-green-700',
  no_answer: 'bg-gray-100 text-gray-600',
  busy: 'bg-amber-50 text-amber-700',
  left_voicemail: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  scheduled: 'bg-indigo-50 text-indigo-700',
  // LinkedIn outcomes
  pending: 'bg-yellow-50 text-yellow-700',
  accepted: 'bg-green-50 text-green-700',
  replied: 'bg-blue-50 text-blue-700',
  no_response: 'bg-gray-100 text-gray-600',
  declined: 'bg-red-50 text-red-700',
  engaged: 'bg-purple-50 text-purple-700',
};

// LinkedIn activity type labels
const linkedinActivityLabels: Record<string, string> = {
  connection_request: 'Connection Request',
  connection_accepted: 'Connection Accepted',
  message_sent: 'Message Sent',
  message_received: 'Message Received',
  inmail_sent: 'InMail Sent',
  inmail_received: 'InMail Received',
  profile_viewed: 'Profile Viewed',
  post_engagement: 'Post Engagement',
  comment: 'Comment',
  endorsement: 'Endorsement',
};

export const RecentActivities: React.FC<RecentActivitiesProps> = ({ activities }) => {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  };

  const formatOutcome = (outcome: string) => {
    return outcome?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getLinkedInSubtype = (metadata: any) => {
    if (metadata?.linkedinActivityType) {
      return linkedinActivityLabels[metadata.linkedinActivityType] || metadata.linkedinActivityType;
    }
    return null;
  };

  return (
<div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden h-[460px] flex flex-col">
  {/* Header */}
  <div className="px-5 pt-5 pb-3 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-white">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-100 rounded-xl shadow-sm">
          <Clock className="h-5 w-5 text-blue-700" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Recent Activity</h3>
          <p className="text-xs text-gray-500 mt-0.5">Last actions across team</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
        View timeline <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    </div>
  </div>

  <ScrollArea className="flex-1 px-5 py-3">
    <div className="space-y-1">
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-200">
            <Clock className="h-8 w-8 text-gray-400 opacity-60" />
          </div>
          <p className="text-base font-medium text-gray-600">Quiet for now</p>
          <p className="text-sm text-gray-500 mt-1.5">Recent activities will appear here</p>
        </div>
      ) : (
        activities.map((activity, idx) => {
          const config = activityConfig[activity.type] || activityConfig.note;
          const Icon = config.icon;

          return (
            <div
              key={activity.id}
              className="group relative pl-10 py-2.5 hover:bg-indigo-50/30 rounded-lg transition-colors cursor-pointer"
              onClick={() => activity.contact?.id && navigate(`/contacts/${activity.contact.id}`)}
            >
              {/* Vertical timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 group-hover:bg-indigo-200 transition-colors" />
              
              {/* Dot + icon */}
              <div className="absolute left-0 top-3 w-8 h-8 rounded-full bg-white border-2 border-indigo-100 flex items-center justify-center shadow-sm group-hover:border-indigo-300">
                <Icon className={cn("h-4 w-4", config.color)} />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-700 transition-colors line-clamp-1">
                    {activity.title}
                  </p>

                  {activity.contact && (
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-600">
                      <Avatar className="h-5 w-5 ring-1 ring-gray-100">
                        <AvatarImage src={activity.contact.photo_url} />
                        <AvatarFallback className="text-[9px] bg-gray-100">
                          {getInitials(activity.contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium truncate max-w-[140px]">
                        {activity.contact.name}
                      </span>
                      {activity.contact.companies?.name && (
                        <span className="text-gray-400">• {activity.contact.companies.name}</span>
                      )}
                    </div>
                  )}

                  {/* Outcome / subtype */}
                  {(activity.outcome || activity.metadata?.linkedinActivityType) && (
                    <div className="mt-1.5">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-[10px] px-2.5 py-0.5",
                          outcomeStyles[activity.outcome] || 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {activity.outcome ? formatOutcome(activity.outcome) : getLinkedInSubtype(activity.metadata)}
                      </Badge>
                    </div>
                  )}
                </div>

                <span className="text-xs text-gray-400 whitespace-nowrap pt-1">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  </ScrollArea>
</div>
  );
};

export default RecentActivities;