// src/components/candidates/zive-x/RecentSearches.tsx

import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Clock, Sparkles } from 'lucide-react';
import { SearchHistory } from '@/types/candidateSearch';

interface RecentSearchesProps {
  onSelectSearch: (history: SearchHistory) => void;
}

const RecentSearches: FC<RecentSearchesProps> = ({ onSelectSearch }) => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const { data: recentSearches = [], isLoading } = useQuery({
    queryKey: ['recentCandidateSearches', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recent_candidate_searches', {
        p_organization_id: organizationId,
        p_limit: 5
      });
      
      if (error) throw error;
      return data as SearchHistory[];
    },
    enabled: !!organizationId,
  });

  const handleClick = async (history: SearchHistory) => {
    // Update usage stats
    await supabase.rpc('update_search_history_usage', {
      p_search_id: history.id
    });
    
    onSelectSearch(history);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getDisplayTitle = (history: SearchHistory) => {
    if (history.job_title) return history.job_title;
    
    // Extract first 3 keywords as title
    const keywords = history.generated_keywords.slice(0, 3).join(', ');
    return keywords || 'Untitled Search';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#7731E8]" />
          Recent Searches
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-gray-100 h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (recentSearches.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#7731E8]" />
          Recent Searches
        </h2>
        <p className="text-sm text-gray-500">No recent searches yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-[#7731E8]" />
        Recent Searches
      </h2>
      <div className="space-y-3">
        {recentSearches.map((history) => (
          <button
            key={history.id}
            onClick={() => handleClick(history)}
            className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-[#7731E8] hover:bg-purple-50 transition-all group"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-medium text-gray-900 text-sm line-clamp-1 group-hover:text-[#7731E8]">
                {getDisplayTitle(history)}
              </h3>
              {history.is_boolean_mode && (
                <Sparkles className="w-4 h-4 text-[#7731E8] flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{formatDate(history.last_used_at)}</span>
              <span>{history.use_count} {history.use_count === 1 ? 'use' : 'uses'}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {history.generated_keywords.slice(0, 3).map((keyword, idx) => (
                <span 
                  key={idx}
                  className="text-xs bg-purple-100 text-[#7731E8] px-2 py-0.5 rounded-full"
                >
                  {keyword}
                </span>
              ))}
              {history.generated_keywords.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{history.generated_keywords.length - 3} more
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentSearches;