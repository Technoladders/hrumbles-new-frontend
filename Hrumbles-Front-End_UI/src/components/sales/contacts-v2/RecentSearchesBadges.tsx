// src/components/sales/contacts-v2/RecentSearchesBadges.tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { applyRecentSearch, removeRecentSearch } from '@/Redux/contactsV2Slice';
import { Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RecentSearchesBadges() {
  const dispatch = useDispatch();
  const recentSearches = useSelector((state: any) => state.contactsV2.recentSearches);
  const appliedFilters = useSelector((state: any) => state.contactsV2.appliedFilters);

  if (!recentSearches || recentSearches.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-slate-500 flex-shrink-0">
        <Clock size={11} />
        <span className="text-[10px] font-semibold uppercase tracking-wider">Recent</span>
      </div>
      {recentSearches.map((entry: any) => {
        const isActive =
          appliedFilters && JSON.stringify(appliedFilters) === JSON.stringify(entry.filters);

        return (
          <div
            key={entry.id}
            className={cn(
              'group inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full border text-[10px] font-medium cursor-pointer transition-all',
              isActive
                ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
            )}
            onClick={() => dispatch(applyRecentSearch(entry))}
            title={`Applied: ${entry.label}`}
          >
            <span className="max-w-[180px] truncate">{entry.label}</span>
            <button
              type="button"
              className="ml-0.5 p-0.5 rounded-full hover:bg-slate-600/60 transition-colors opacity-0 group-hover:opacity-100"
              onClick={e => {
                e.stopPropagation();
                dispatch(removeRecentSearch(entry.id));
              }}
            >
              <X size={9} />
            </button>
          </div>
        );
      })}
    </div>
  );
}