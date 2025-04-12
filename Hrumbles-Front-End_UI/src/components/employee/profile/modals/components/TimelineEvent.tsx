
import React from 'react';
import { BadgeCheck, Briefcase, Building2, Clock } from 'lucide-react';

interface TimelineEventProps {
  title: string;
  date: string;
  description: string;
  type: 'promotion' | 'join' | 'role-change';
  isLast?: boolean;
}

export const TimelineEvent: React.FC<TimelineEventProps> = ({
  title,
  date,
  description,
  type,
  isLast = false
}) => {
  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'promotion':
        return <BadgeCheck className="w-3 h-3 text-green-500" />;
      case 'join':
        return <Briefcase className="w-3 h-3 text-blue-500" />;
      case 'role-change':
        return <Building2 className="w-3 h-3 text-purple-500" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className="relative">
      {!isLast && (
        <div className="absolute left-[11px] top-[20px] w-0.5 h-[calc(100%+4px)] bg-gradient-to-b from-purple-500 to-purple-100" />
      )}
      <div className="flex gap-2">
        <div className="relative z-10 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
          {getTimelineIcon(type)}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-[11px] font-medium text-gray-900">{title}</h4>
              <p className="text-[10px] text-gray-600">{description}</p>
            </div>
            <span className="text-[10px] text-gray-500">{date}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
