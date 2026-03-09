// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/ActivityHeatmap.tsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, subDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Zap, Users } from 'lucide-react';

interface Activity {
  id: string;
  created_at: string;
  created_by: string;
  activity_date: string;
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
  delay?: number;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  activities,
  teamMembers,
  delay = 0.35,
}) => {
  // Last 14 days
  const dates = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      return {
        date,
        label: format(date, 'EEE'),
        day: format(date, 'd'),
        full: format(date, 'yyyy-MM-dd'),
      };
    });
  }, []);

  // Heatmap data structure
  const heatmapData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    teamMembers.forEach((member) => {
      data[member.id] = {};
      dates.forEach((d) => {
        data[member.id][d.full] = 0;
      });
    });

    activities.forEach((activity) => {
      const userId = activity.created_by;
      const activityDate = format(parseISO(activity.activity_date), 'yyyy-MM-dd');
      if (data[userId] && data[userId][activityDate] !== undefined) {
        data[userId][activityDate]++;
      }
    });

    return data;
  }, [activities, teamMembers, dates]);

  // Color scale (now using indigo-purple theme)
  const getHeatColor = (count: number) => {
    if (count === 0) return 'bg-gray-50 border border-gray-200 text-gray-300';
    if (count <= 2) return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
    if (count <= 5) return 'bg-indigo-200 text-indigo-800 border border-indigo-300';
    if (count <= 10) return 'bg-indigo-400 text-white border border-indigo-500';
    if (count <= 15) return 'bg-indigo-500 text-white border border-indigo-600';
    return 'bg-indigo-600 text-white border border-indigo-700';
  };

  const getInitials = (first: string, last: string) =>
    `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();

  // Daily top performer
  const dailyTopPerformers = useMemo(() => {
    return dates.reduce((acc, d) => {
      let max = 0;
      let topId = '';
      teamMembers.forEach((m) => {
        const cnt = heatmapData[m.id]?.[d.full] || 0;
        if (cnt > max) {
          max = cnt;
          topId = m.id;
        }
      });
      acc[d.full] = { id: topId, count: max };
      return acc;
    }, {} as Record<string, { id: string; count: number }>);
  }, [dates, teamMembers, heatmapData]);

  if (teamMembers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden relative flex flex-col h-full"
      style={{
        boxShadow: '0 1px 3px rgba(79,70,229,0.06), 0 4px 20px rgba(79,70,229,0.04)',
      }}
    >
      {/* Mesh background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 90% 10%, rgba(129,140,248,0.07) 0%, transparent 60%), ' +
            'radial-gradient(ellipse at 10% 85%, rgba(99,102,241,0.05) 0%, transparent 55%)',
        }}
      />

      {/* Header */}
      <div className="relative z-10 px-5 pt-5 pb-3 border-b border-indigo-100/50 bg-gradient-to-r from-indigo-50/70 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Team Activity Heatmap</h3>
              <p className="text-xs text-indigo-600/90 mt-0.5">
                Last 14 days • {activities.length} activities
              </p>
            </div>
          </div>

          {/* Legend – compact pill style */}
          <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-xl border border-indigo-100/60 shadow-sm">
            <span className="text-xs text-gray-600 font-medium">Intensity:</span>
            <div className="flex gap-1">
              {['gray-100', 'indigo-100', 'indigo-300', 'indigo-500', 'indigo-700'].map((c, i) => (
                <div
                  key={i}
                  className={cn('w-3.5 h-3.5 rounded-sm border border-indigo-200/40', `bg-${c}`)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 px-5 pt-4 pb-5 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-separate border-spacing-y-1.5">
            <thead>
              <tr>
                <th className="text-left pb-4 pr-5 w-48">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Team Member</span>
                </th>
                {dates.map((d) => (
                  <th key={d.full} className="text-center pb-4 px-1 min-w-[38px]">
                    <div className="text-[10px] text-gray-500 font-medium">{d.label}</div>
                    <div className="text-sm font-semibold text-gray-700 mt-0.5">{d.day}</div>
                  </th>
                ))}
                <th className="text-center pb-4 pl-4 w-20">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {teamMembers.map((member) => {
                const memberTotal = dates.reduce((sum, d) => sum + (heatmapData[member.id]?.[d.full] || 0), 0);

                return (
                  <tr key={member.id} className="group">
                    <td className="py-2 pr-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 ring-1 ring-gray-100">
                          <AvatarImage src={member.profile_picture_url} />
                          <AvatarFallback className="bg-indigo-50 text-indigo-700 text-xs font-medium">
                            {getInitials(member.first_name, member.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {member.first_name} {member.last_name}
                        </span>
                      </div>
                    </td>

                    {dates.map((d) => {
                      const count = heatmapData[member.id]?.[d.full] || 0;
                      const isTop = dailyTopPerformers[d.full]?.id === member.id && count > 0;

                      return (
                        <td key={d.full} className="py-2 px-1 text-center">
                          <div
                            className={cn(
                              'w-9 h-9 mx-auto rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-200 shadow-sm',
                              getHeatColor(count),
                              isTop && 'ring-2 ring-yellow-400 ring-offset-2 scale-110',
                              'group-hover:scale-105'
                            )}
                            title={`${member.first_name} ${member.last_name}: ${count} on ${format(parseISO(d.full), 'MMM d, yyyy')}`}
                          >
                            {count || '—'}
                          </div>
                        </td>
                      );
                    })}

                    <td className="py-2 pl-4 text-center">
                      <span className="text-base font-bold text-indigo-700">{memberTotal}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Daily Total Row – now perfectly aligned */}
        {/* Daily Total Row – aligned version */}
<div className="mt-4 pt-4 border-t border-indigo-100/60">
  <div className="flex items-center">
    {/* Name column spacer – same width as member name column */}
    <div className="w-48 pr-5 flex-shrink-0">
      <span className="text-sm font-semibold text-indigo-700">Daily Total</span>
    </div>

    {/* Date columns – exact same width & spacing as above */}
    <div className="flex flex-1">
      {dates.map((d) => {
        const dayTotal = teamMembers.reduce(
          (sum, m) => sum + (heatmapData[m.id]?.[d.full] || 0),
          0
        );
        return (
          <div
            key={d.full}
            className="text-center w-[60px] px-1"   // ← same width + padding as header/date cells
          >
            <span className="text-sm font-semibold text-gray-800">
              {dayTotal || '0'}
            </span>
          </div>
        );
      })}
    </div>

    {/* Total column spacer – matches the TOTAL header width */}
    <div className="w-20 flex-shrink-0" />
  </div>
</div>
      </div>
    </motion.div>
  );
};