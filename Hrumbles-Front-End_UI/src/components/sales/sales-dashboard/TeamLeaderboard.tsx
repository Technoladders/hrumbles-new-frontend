// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/TeamLeaderboard.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  Zap,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  activities: number;
  calls: number;
  emails: number;
  meetings: number;
  tasks: number;
  notes: number;
}

interface TeamLeaderboardProps {
  data: TeamMember[];
  title?: string;
  delay?: number;
}

type SortKey = 'activities' | 'calls' | 'emails' | 'meetings';

export const TeamLeaderboard: React.FC<TeamLeaderboardProps> = ({
  data,
  title = 'Team Leaderboard',
  delay = 0.3,
}) => {
  const [sortBy, setSortBy] = useState<SortKey>('activities');

  const sortedData = [...data].sort((a, b) => b[sortBy] - a[sortBy]);
  const topPerformer = sortedData[0];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={18} className="text-yellow-500 drop-shadow-md" />;
    if (rank === 2) return <Medal size={18} className="text-gray-300 drop-shadow-md" />;
    if (rank === 3) return <Award size={18} className="text-amber-600 drop-shadow-md" />;
    return (
      <span className="text-xs font-bold text-gray-500 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100/80">
        {rank}
      </span>
    );
  };

  const getInitials = (name: string) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';

  const sortOptions = [
    { key: 'activities' as SortKey, label: 'All', icon: Zap },
    { key: 'calls' as SortKey, label: 'Calls', icon: Phone },
    { key: 'emails' as SortKey, label: 'Emails', icon: Mail },
    { key: 'meetings' as SortKey, label: 'Meetings', icon: Calendar },
  ];

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
      {/* Subtle indigo-purple mesh background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 90% 10%, rgba(129,140,248,0.08) 0%, transparent 60%), ' +
            'radial-gradient(ellipse at 10% 90%, rgba(99,102,241,0.06) 0%, transparent 55%)',
        }}
      />

      {/* Header */}
      <div className="relative z-10 px-5 pt-5 pb-3 border-b border-indigo-100/50 bg-gradient-to-r from-indigo-50/70 via-white to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">{title}</h3>
              <p className="text-xs text-indigo-600/90 mt-0.5">
                Top performers • {data.length} team members
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="relative z-10 px-5 pt-3 pb-2">
        <div className="inline-flex bg-indigo-50/60 p-1 rounded-xl border border-indigo-100/60">
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={cn(
                'px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5',
                sortBy === opt.key
                  ? 'bg-white shadow-sm text-indigo-700 border border-indigo-200'
                  : 'text-gray-600 hover:text-indigo-700 hover:bg-white/50'
              )}
            >
              <opt.icon size={14} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Performer Spotlight */}
      {topPerformer && (
        <div className="relative z-10 mx-5 mt-2 mb-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 to-purple-50/60 border border-indigo-200/60">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-14 w-14 ring-2 ring-indigo-200/70 ring-offset-2">
                <AvatarImage src={topPerformer.avatar} />
                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold text-xl">
                  {getInitials(topPerformer.name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                <Trophy size={14} className="text-yellow-900" />
              </div>
            </div>

            <div className="flex-1">
              <p className="text-base font-semibold text-gray-900">{topPerformer.name}</p>
              <p className="text-xs text-indigo-600 font-medium mt-0.5">Current Leader</p>
            </div>

            <div className="text-right">
              <p className="text-3xl font-bold text-indigo-700 tracking-tight">
                {topPerformer[sortBy]}
              </p>
              <p className="text-xs text-gray-500 capitalize mt-0.5">{sortBy}</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="relative z-10 flex-1 px-5 pb-5 overflow-hidden">
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
          {sortedData.slice(1).map((member, idx) => {
            const rank = idx + 2;
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                className={cn(
                  'group flex items-center gap-3.5 p-3 rounded-xl transition-all duration-200 hover:bg-indigo-50/40 hover:shadow-sm',
                  rank <= 5 ? 'border-l-4 border-indigo-400/40' : 'border-l border-gray-200/50'
                )}
              >
                <div className="w-7 flex justify-center flex-shrink-0">
                  {getRankIcon(rank)}
                </div>

                <Avatar className="h-10 w-10 ring-1 ring-gray-100">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className="bg-gray-100 text-gray-600 text-sm font-medium">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                    {member.name}
                  </p>
                  <div className="flex items-center gap-2.5 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Phone size={10} /> {member.calls}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail size={10} /> {member.emails}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> {member.meetings}
                    </span>
                  </div>
                </div>

                <div className="text-right min-w-[60px]">
                  <p className="text-base font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                    {member[sortBy]}
                  </p>
                </div>
              </motion.div>
            );
          })}

          {sortedData.length <= 1 && (
            <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-200">
                <Users size={24} className="opacity-50" />
              </div>
              <p className="text-sm font-medium text-gray-600">No team data yet</p>
              <p className="text-xs mt-2">Activity will appear here</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};