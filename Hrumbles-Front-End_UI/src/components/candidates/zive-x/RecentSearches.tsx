// src/components/candidates/zive-x/RecentSearches.tsx
// UI REFRESH: Modern compact recent searches — all logic preserved

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
    await supabase.rpc('update_search_history_usage', { p_search_id: history.id });
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
    const keywords = history.generated_keywords.slice(0, 3).join(', ');
    return keywords || 'Untitled Search';
  };

  const filteredSearches = recentSearches.filter(search => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const jobTitle = (search.job_title || '').toLowerCase();
    const keywords = search.generated_keywords.map(k => k.toLowerCase()).join(' ');
    return jobTitle.includes(query) || keywords.includes(query);
  });

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center", isModal ? "py-10" : "p-5")}>
        <style>{`.rs-spin { width:20px;height:20px;border-radius:50%;border:2px solid #EDE9FE;border-top-color:#6C2BD9;animation:rs-spin 0.7s linear infinite; } @keyframes rs-spin{to{transform:rotate(360deg);}}`}</style>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="rs-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (isModal) {
    return (
      <div>
        <style>{`
          .rs-root {
            --brand: #6C2BD9;
            --brand-light: #EDE9FE;
            --brand-mid: #DDD6FE;
            --border: #E5E7EB;
            --text-primary: #111827;
            --text-secondary: #6B7280;
            font-family: 'Inter', system-ui, sans-serif;
          }

          /* Search bar */
          .rs-search-wrap {
            position: relative;
            margin-bottom: 14px;
          }
          .rs-search-icon {
            position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
            color: #9CA3AF; width: 15px; height: 15px; pointer-events: none;
          }
          .rs-search-input {
            width: 100%;
            height: 40px;
            padding: 0 36px 0 36px;
            border: 1.5px solid var(--border);
            border-radius: 10px;
            font-size: 13px;
            color: var(--text-primary);
            background: #F9FAFB;
            transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          }
          .rs-search-input:focus {
            outline: none;
            border-color: var(--brand);
            box-shadow: 0 0 0 3px rgba(108,43,217,0.1);
            background: white;
          }
          .rs-search-clear {
            position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
            color: #9CA3AF; cursor: pointer; transition: color 0.15s;
            background: none; border: none; padding: 2px;
          }
          .rs-search-clear:hover { color: #374151; }

          /* Count */
          .rs-count { font-size: 11px; color: var(--text-secondary); padding: 0 2px; margin-bottom: 8px; }

          /* List */
          .rs-list { display: flex; flex-direction: column; gap: 2px; }

          /* Item */
          .rs-item {
            width: 100%;
            text-align: left;
            padding: 10px 12px;
            border-radius: 10px;
            border: 1.5px solid transparent;
            background: white;
            cursor: pointer;
            transition: all 0.15s;
          }
          .rs-item:hover {
            background: #FAFAFA;
            border-color: var(--border);
          }
          .rs-item:active { background: var(--brand-light); border-color: var(--brand-mid); }

          .rs-item-top {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
          }
          .rs-item-icon { color: #D1D5DB; flex-shrink: 0; }
          .rs-item-icon-sparkle { color: var(--brand); flex-shrink: 0; }
          .rs-item-title {
            font-size: 13.5px;
            font-weight: 600;
            color: var(--text-primary);
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            transition: color 0.15s;
          }
          .rs-item:hover .rs-item-title { color: var(--brand); }
          .rs-item-time { font-size: 11px; color: #9CA3AF; flex-shrink: 0; }

          .rs-item-meta {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
            padding-left: 24px;
          }
          .rs-item-uses {
            font-size: 11px;
            color: #9CA3AF;
            background: #F3F4F6;
            padding: 1px 7px;
            border-radius: 99px;
          }

          /* Tags */
          .rs-tags { display: flex; flex-wrap: wrap; gap: 4px; padding-left: 24px; }
          .rs-tag {
            font-size: 11px;
            font-weight: 500;
            background: var(--brand-light);
            color: var(--brand);
            border: 1px solid var(--brand-mid);
            padding: 2px 8px;
            border-radius: 99px;
          }
          .rs-tag-more { font-size: 11px; color: #9CA3AF; padding: 2px 4px; }

          /* Empty */
          .rs-empty {
            text-align: center;
            padding: 40px 16px;
            color: var(--text-secondary);
          }
          .rs-empty-icon { width: 40px; height: 40px; color: #D1D5DB; margin: 0 auto 10px; }
          .rs-empty-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #374151; }
          .rs-empty-sub { font-size: 12px; }
        `}</style>

        <div className="rs-root">
          <div className="rs-search-wrap">
            <Search className="rs-search-icon" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recent searches..."
              className="rs-search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="rs-search-clear">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="rs-count">{filteredSearches.length} result{filteredSearches.length !== 1 ? 's' : ''}</div>
          )}

          <div className="rs-list">
            {filteredSearches.length === 0 ? (
              <div className="rs-empty">
                <Clock className="rs-empty-icon" />
                <div className="rs-empty-title">{searchQuery ? 'No matches' : 'No recent searches'}</div>
                <div className="rs-empty-sub">{searchQuery ? 'Try a different term' : 'Your history will appear here'}</div>
              </div>
            ) : (
              filteredSearches.map((history) => (
                <button key={history.id} onClick={() => handleClick(history)} className="rs-item">
                  <div className="rs-item-top">
                    <Clock className="rs-item-icon w-4 h-4" />
                    {history.is_boolean_mode && <Sparkles className="rs-item-icon-sparkle w-3.5 h-3.5" />}
                    <span className="rs-item-title">{getDisplayTitle(history)}</span>
                    <span className="rs-item-time">{formatDate(history.last_used_at)}</span>
                  </div>
                  <div className="rs-item-meta">
                    <span className="rs-item-uses">{history.use_count} {history.use_count === 1 ? 'use' : 'uses'}</span>
                  </div>
                  {history.generated_keywords.length > 0 && (
                    <div className="rs-tags">
                      {history.generated_keywords.slice(0, 5).map((keyword, idx) => (
                        <span key={idx} className="rs-tag">{keyword}</span>
                      ))}
                      {history.generated_keywords.length > 5 && (
                        <span className="rs-tag-more">+{history.generated_keywords.length - 5}</span>
                      )}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Card/sidebar style (non-modal) ──
  if (recentSearches.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#6C2BD9]" />
          Recent Searches
        </h2>
        <p className="text-xs text-gray-400">No recent searches yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <style>{`
        .rs-card-item {
          width: 100%; text-align: left; padding: 8px 10px;
          border-radius: 8px; border: 1.5px solid transparent;
          background: white; cursor: pointer; transition: all 0.15s; display: block;
        }
        .rs-card-item:hover { background: #F5F0FF; border-color: #DDD6FE; }
        .rs-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 3px; }
        .rs-card-title { font-size: 12.5px; font-weight: 600; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        .rs-card-item:hover .rs-card-title { color: #6C2BD9; }
        .rs-card-meta { display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; color: #9CA3AF; margin-bottom: 4px; }
        .rs-card-tags { display: flex; flex-wrap: wrap; gap: 3px; }
        .rs-card-tag { font-size: 10px; background: #EDE9FE; color: #6C2BD9; padding: 1px 7px; border-radius: 99px; }
        .rs-card-more { font-size: 10px; color: #9CA3AF; }
      `}</style>
      <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#6C2BD9]" />
        Recent Searches
      </h2>
      <div className="flex flex-col gap-1">
        {recentSearches.map((history) => (
          <button key={history.id} onClick={() => handleClick(history)} className="rs-card-item">
            <div className="rs-card-head">
              <h3 className="rs-card-title">{getDisplayTitle(history)}</h3>
              {history.is_boolean_mode && <Sparkles className="w-3 h-3 text-[#6C2BD9] flex-shrink-0" />}
            </div>
            <div className="rs-card-meta">
              <span>{formatDate(history.last_used_at)}</span>
              <span>{history.use_count} use{history.use_count !== 1 ? 's' : ''}</span>
            </div>
            <div className="rs-card-tags">
              {history.generated_keywords.slice(0, 3).map((keyword, idx) => (
                <span key={idx} className="rs-card-tag">{keyword}</span>
              ))}
              {history.generated_keywords.length > 3 && (
                <span className="rs-card-more">+{history.generated_keywords.length - 3}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentSearches;