// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/TeamLeaderboard.tsx
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, TrendingUp, Phone, Mail, Calendar } from 'lucide-react';
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
}

type SortKey = 'activities' | 'calls' | 'emails' | 'meetings';

export const TeamLeaderboard: React.FC<TeamLeaderboardProps> = ({ data }) => {
  const [sortBy, setSortBy] = useState<SortKey>('activities');
  
  const sortedData = [...data].sort((a, b) => b[sortBy] - a[sortBy]);
  const topPerformer = sortedData[0];

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy size={16} className="text-yellow-500" />;
      case 1:
        return <Medal size={16} className="text-gray-400" />;
      case 2:
        return <Award size={16} className="text-amber-600" />;
      default:
        return <span className="text-xs font-medium text-gray-400 w-4 text-center">{index + 1}</span>;
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  };

  const sortOptions = [
    { key: 'activities' as SortKey, label: 'All', icon: TrendingUp },
    { key: 'calls' as SortKey, label: 'Calls', icon: Phone },
    { key: 'emails' as SortKey, label: 'Emails', icon: Mail },
    { key: 'meetings' as SortKey, label: 'Meetings', icon: Calendar },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Team Leaderboard</h3>
          <p className="text-xs text-gray-500 mt-0.5">Top performers this period</p>
        </div>
      </div>

      {/* Sort Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 rounded-lg">
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
              sortBy === opt.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <opt.icon size={12} />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Top Performer Highlight */}
      {topPerformer && (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12 border-2 border-amber-200">
                <AvatarImage src={topPerformer.avatar} />
                <AvatarFallback className="bg-amber-100 text-amber-700 font-semibold">
                  {getInitials(topPerformer.name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                <Trophy size={10} className="text-yellow-900" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{topPerformer.name}</p>
              <p className="text-xs text-gray-500">Top Performer</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-600">{topPerformer[sortBy]}</p>
              <p className="text-xs text-gray-500 capitalize">{sortBy}</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedData.slice(1).map((member, index) => (
          <div 
            key={member.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-6 flex justify-center">
              {getRankIcon(index + 1)}
            </div>
            <Avatar className="h-8 w-8">
              <AvatarImage src={member.avatar} />
              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                  <Phone size={8} /> {member.calls}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                  <Mail size={8} /> {member.emails}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                  <Calendar size={8} /> {member.meetings}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{member[sortBy]}</p>
            </div>
          </div>
        ))}

        {sortedData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No team activity yet</p>
          </div>
        )}
      </div>
    </div>
  );
};