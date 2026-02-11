// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/ActivityHeatmap.tsx
import React, { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, subDays, parseISO, startOfDay, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  created_at: string;
  created_by: string;
  type: string;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture_url?: string;
}

interface ActivityHeatmapProps {
  activities: Activity[];
  teamMembers: TeamMember[];
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activities, teamMembers }) => {


console.log('teamMembers', teamMembers);
console.log('activities', activities);

  // Generate last 14 days
  const dates = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      return {
        date,
        label: format(date, 'EEE'),
        day: format(date, 'd'),
        full: format(date, 'yyyy-MM-dd')
      };
    });
  }, []);

  // Build heatmap data
  const heatmapData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    
    teamMembers.forEach(member => {
      data[member.id] = {};
      dates.forEach(d => {
        data[member.id][d.full] = 0;
      });
    });

    activities.forEach(activity => {
      const userId = activity.created_by;
      const activityDate = format(parseISO(activity.created_at), 'yyyy-MM-dd');
      
      if (data[userId] && data[userId][activityDate] !== undefined) {
        data[userId][activityDate]++;
      }
    });

    return data;
  }, [activities, teamMembers, dates]);

  // Get color intensity based on count
  const getHeatColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count <= 2) return 'bg-blue-100';
    if (count <= 5) return 'bg-blue-200';
    if (count <= 10) return 'bg-blue-400';
    if (count <= 15) return 'bg-blue-500';
    return 'bg-blue-600';
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  // Get top performer for each day
  const dailyTopPerformers = useMemo(() => {
    return dates.reduce((acc, d) => {
      let maxCount = 0;
      let topId = '';
      
      teamMembers.forEach(member => {
        const count = heatmapData[member.id]?.[d.full] || 0;
        if (count > maxCount) {
          maxCount = count;
          topId = member.id;
        }
      });
      
      acc[d.full] = { id: topId, count: maxCount };
      return acc;
    }, {} as Record<string, { id: string; count: number }>);
  }, [dates, teamMembers, heatmapData]);

  if (teamMembers.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Team Activity Heatmap</h3>
          <p className="text-xs text-gray-500 mt-0.5">Activity intensity over the last 14 days</p>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Less</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 bg-gray-100 rounded-sm" />
            <div className="w-3 h-3 bg-blue-100 rounded-sm" />
            <div className="w-3 h-3 bg-blue-200 rounded-sm" />
            <div className="w-3 h-3 bg-blue-400 rounded-sm" />
            <div className="w-3 h-3 bg-blue-500 rounded-sm" />
            <div className="w-3 h-3 bg-blue-600 rounded-sm" />
          </div>
          <span className="text-xs text-gray-500">More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left pb-3 pr-4 w-40">
                <span className="text-xs font-medium text-gray-500">Team Member</span>
              </th>
              {dates.map((d) => (
                <th key={d.full} className="text-center pb-3 px-1 min-w-[32px]">
                  <div className="text-[10px] text-gray-400">{d.label}</div>
                  <div className="text-xs font-medium text-gray-600">{d.day}</div>
                </th>
              ))}
              <th className="text-center pb-3 pl-4 w-20">
                <span className="text-xs font-medium text-gray-500">Total</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member) => {
              const memberTotal = dates.reduce((sum, d) => sum + (heatmapData[member.id]?.[d.full] || 0), 0);
              
              return (
                <tr key={member.id} className="group">
                  <td className="py-1.5 pr-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={member.profile_picture_url} />
                        <AvatarFallback className="text-[10px] bg-gray-100">
                          {getInitials(member.first_name, member.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.first_name} {member.last_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  {dates.map((d) => {
                    const count = heatmapData[member.id]?.[d.full] || 0;
                    const isTopPerformer = dailyTopPerformers[d.full]?.id === member.id && count > 0;
                    
                    return (
                      <td key={d.full} className="py-1.5 px-1">
                        <div 
                          className={cn(
                            "w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-medium transition-all cursor-default",
                            getHeatColor(count),
                            count > 5 && "text-white",
                            count <= 5 && count > 0 && "text-blue-700",
                            count === 0 && "text-gray-300",
                            isTopPerformer && "ring-2 ring-amber-400 ring-offset-1"
                          )}
                          title={`${member.first_name} ${member.last_name}: ${count} activities on ${format(parseISO(d.full), 'MMM d, yyyy')}`}
                        >
                          {count > 0 ? count : '—'}
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-1.5 pl-4 text-center">
                    <span className="text-sm font-semibold text-gray-900">{memberTotal}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Daily Summary Row */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-gray-500 w-40">Daily Total</span>
          <div className="flex gap-1">
            {dates.map((d) => {
              const dayTotal = teamMembers.reduce((sum, m) => sum + (heatmapData[m.id]?.[d.full] || 0), 0);
              return (
                <div 
                  key={d.full}
                  className="w-8 text-center text-xs font-medium text-gray-600"
                >
                  {dayTotal}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};