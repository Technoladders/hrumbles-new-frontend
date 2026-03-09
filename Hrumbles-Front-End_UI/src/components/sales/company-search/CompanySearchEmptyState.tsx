// src/components/sales/company-search/CompanySearchEmptyState.tsx
// Exact mirror of contacts SearchEmptyState — same card layout, same recent-search chips.
// isCloudMode flag switches copy + icon (Building2 / Cloud).

import React from 'react';
import { Building2, Cloud, History, ArrowRight, Trash2, Clock, Zap, Database, Sparkles, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface CompanyRecentSearch {
  id:          string;
  summary:     string;
  filters:     any;
  resultCount: number;
  timestamp:   number;
}

interface Props {
  recentSearches:     CompanyRecentSearch[];
  onApplySearch:      (s: CompanyRecentSearch) => void;
  onRemoveSearch:     (id: string) => void;
  isCloudMode:        boolean;
  pendingFilterChips?: string[];
  pendingFilterCount?: number;
  onRunSearch?:       () => void;
}

export const CompanySearchEmptyState: React.FC<Props> = ({
  recentSearches,
  onApplySearch,
  onRemoveSearch,
  isCloudMode,
  pendingFilterChips = [],
  pendingFilterCount = 0,
  onRunSearch,
}) => (
  <div className="flex flex-col items-center justify-center h-full w-full px-8 py-16 text-center select-none">

    {/* Hero icon */}
    <div className={cn(
      'w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-inner',
      isCloudMode ? 'bg-indigo-100' : 'bg-slate-100'
    )}>
      {isCloudMode
        ? <Cloud className="h-7 w-7 text-indigo-500" />
        : <Building2 className="h-7 w-7 text-slate-400" />}
    </div>

    <h2 className="text-base font-semibold text-slate-800 mb-1">
      {isCloudMode ? 'Search from Cloud' : 'Find Companies'}
    </h2>
    <p className="text-xs text-slate-400 max-w-sm mb-6">
      {isCloudMode
        ? 'Use the filters on the left to discover companies. Results are automatically saved to your CRM.'
        : 'Use the filters on the left to search your CRM database.'}
    </p>

    {/* Pending cloud filter pills + run button */}
    {isCloudMode && pendingFilterCount > 0 && (
      <div className="mb-6 w-full max-w-xs">
        <div className="flex flex-wrap gap-1.5 justify-center mb-3">
          {pendingFilterChips.slice(0,4).map((chip,i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-semibold">{chip}</span>
          ))}
          {pendingFilterCount > 4 && (
            <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-semibold">+{pendingFilterCount - 4} more</span>
          )}
        </div>
        {onRunSearch && (
          <button data-run-search onClick={onRunSearch}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm">
            <Search size={12} /> Run Search ({pendingFilterCount} filter{pendingFilterCount !== 1 ? 's' : ''})
          </button>
        )}
      </div>
    )}

    {/* Feature pills (cloud, no pending filters) */}
    {isCloudMode && pendingFilterCount === 0 && (
      <div className="flex gap-3 mb-8 text-xs flex-wrap justify-center">
        <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-[10px] font-semibold"><Zap className="h-3 w-3"/>Instant Discovery</span>
        <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-[10px] font-semibold"><Database className="h-3 w-3"/>Auto-saved to CRM</span>
        <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-[10px] font-semibold"><Sparkles className="h-3 w-3"/>AI Enriched</span>
      </div>
    )}

    {/* Recent searches — exact same card design as contacts */}
    {recentSearches.length > 0 && (
      <div className="w-full max-w-sm text-left">
        <p className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          <History size={11} /> Recent Searches
        </p>
        <div className="space-y-1.5">
          {recentSearches.map(s => (
            <div
              key={s.id}
              className="flex items-center gap-2.5 px-3 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/40 transition-all cursor-pointer group"
              onClick={() => onApplySearch(s)}
            >
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                isCloudMode ? 'bg-indigo-100 group-hover:bg-indigo-200' : 'bg-slate-100 group-hover:bg-slate-200'
              )}>
                {isCloudMode
                  ? <Cloud size={13} className="text-indigo-500" />
                  : <Building2 size={13} className="text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-800 truncate">{s.summary}</p>
                <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock size={9} />{formatDistanceToNow(s.timestamp, { addSuffix: true })}
                  {s.resultCount > 0 && (
                    <><span className="mx-1 opacity-40">·</span><span className="text-slate-500">{s.resultCount.toLocaleString()} results</span></>
                  )}
                </p>
              </div>
              <ArrowRight size={12} className="text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
              <button
                onClick={e => { e.stopPropagation(); onRemoveSearch(s.id); }}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all flex-shrink-0 p-0.5 rounded"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);