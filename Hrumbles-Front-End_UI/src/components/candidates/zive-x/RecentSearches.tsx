// src/components/candidates/zive-x/RecentSearches.tsx

import { FC, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SearchHistory } from '@/types/candidateSearch';
import { Clock, Search, Sparkles, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface RecentSearchesProps {
  onSelectSearch: (history: SearchHistory) => void;
  isModal?: boolean;
}

const RecentSearches: FC<RecentSearchesProps> = ({ onSelectSearch, isModal = false }) => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: recentSearches = [], isLoading } = useQuery({
    queryKey: ['recentCandidateSearches', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recent_candidate_searches', {
        p_organization_id: organizationId,
        p_limit: isModal ? 20 : 5
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

  // Filter searches based on query
  const filteredSearches = recentSearches.filter(search => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const jobTitle = (search.job_title || '').toLowerCase();
    const keywords = search.generated_keywords.map(k => k.toLowerCase()).join(' ');
    
    return jobTitle.includes(query) || keywords.includes(query);
  });

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-center",
        isModal ? "py-12" : "bg-white rounded-xl shadow-sm p-6"
      )}>
        <div className="flex items-center gap-2 text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#7731E8]"></div>
          <span>Loading searches...</span>
        </div>
      </div>
    );
  }

  // Modal style (Google-like)
  if (isModal) {
    return (
      <div className="space-y-4">
        {/* Google-style search input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your recent searches..."
            className="pl-12 pr-10 h-14 text-base border-2 border-gray-300 focus:border-[#7731E8] rounded-full shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search results count */}
        {searchQuery && (
          <div className="text-sm text-gray-500 px-2">
            About {filteredSearches.length} result{filteredSearches.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Search results */}
        <div className="space-y-2">
          {filteredSearches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium mb-1">
                {searchQuery ? 'No searches found' : 'No recent searches yet'}
              </p>
              <p className="text-sm">
                {searchQuery ? 'Try a different search term' : 'Your search history will appear here'}
              </p>
            </div>
          ) : (
            filteredSearches.map((history) => (
              <button
                key={history.id}
                onClick={() => handleClick(history)}
                className="w-full text-left p-4 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200 group"
              >
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {history.is_boolean_mode && (
                        <Sparkles className="w-4 h-4 text-[#7731E8] flex-shrink-0" />
                      )}
                      <span className="font-semibold text-gray-900 group-hover:text-[#7731E8] transition-colors">
                        {getDisplayTitle(history)}            
                      </span>
                      <span className="text-xs text-gray-500 ml-auto flex-shrink-0">
                        {formatDate(history.last_used_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span>{history.use_count} {history.use_count === 1 ? 'use' : 'uses'}</span>
                    </div>
                    
                    {history.generated_keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {history.generated_keywords.slice(0, 5).map((keyword, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2.5 py-1 text-xs font-medium bg-purple-50 text-[#7731E8] rounded-full border border-purple-100"
                          >
                            {keyword}
                          </span>
                        ))}
                        {history.generated_keywords.length > 5 && (
                          <span className="inline-block px-2.5 py-1 text-xs font-medium text-gray-500">
                            +{history.generated_keywords.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Card style (original sidebar view)
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