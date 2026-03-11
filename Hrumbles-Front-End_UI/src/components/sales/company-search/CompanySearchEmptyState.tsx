// src/components/sales/company-search/CompanySearchEmptyState.tsx
import React from 'react';
import { Search, Clock, Building2, TrendingUp, ArrowRight, X, Tag, Play, Filter, Globe, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanyDBFilters, buildDBFilterChips } from '@/hooks/sales/useCompanyFilterParams';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompanyRecentSearch {
  id:          string;
  summary:     string;
  filters:     any;      // ApolloCompanySearchFilters (Cloud) | CompanyDBFilters (CRM)
  chips?:      string[]; // Pre-built chips for cloud searches
  resultCount: number;
  timestamp:   number;
}

interface CompanySearchEmptyStateProps {
  recentSearches:      CompanyRecentSearch[];
  onApplySearch:       (search: CompanyRecentSearch) => void;
  onRemoveSearch:      (id: string) => void;
  isCloudMode?:        boolean;
  pendingFilterChips?: string[];
  pendingFilterCount?: number;
  onRunSearch?:        () => void;
}

// ── Tips ─────────────────────────────────────────────────────────────────────

const CLOUD_TIPS = [
  { icon: Globe,      text: 'Search 70M+ companies worldwide' },
  { icon: Filter,     text: 'Filter by industry, size, location & tech stack' },
  { icon: TrendingUp, text: 'All results auto-saved to your database' },
];

const CRM_TIPS = [
  { icon: Building2,  text: 'Search and filter your saved companies' },
  { icon: Tag,        text: 'Use Stage filters to find active pipeline companies' },
  { icon: TrendingUp, text: 'Filter by revenue, headcount & industry' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** CRM DB filter chips */
function getCRMChips(f: CompanyDBFilters): { label: string; color: string }[] {
  return buildDBFilterChips(f).map(label => ({ label, color: 'bg-slate-100 text-slate-700' }));
}

/** Cloud chips are pre-built as string[] */
function getCloudChips(chips: string[]): { label: string; color: string }[] {
  return chips.map(c => ({ label: c, color: 'bg-indigo-50 text-indigo-700' }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CompanySearchEmptyState({
  recentSearches,
  onApplySearch,
  onRemoveSearch,
  isCloudMode = true,
  pendingFilterChips = [],
  pendingFilterCount = 0,
  onRunSearch,
}: CompanySearchEmptyStateProps) {
  const tips       = isCloudMode ? CLOUD_TIPS : CRM_TIPS;
  const hasPending = isCloudMode && pendingFilterCount > 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center bg-slate-50/50">

      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-5">
        {isCloudMode
          ? <Sparkles className="h-6 w-6 text-indigo-400" />
          : <Search    className="h-6 w-6 text-slate-400" />}
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-1.5">
        {isCloudMode ? 'Search 70M+ Companies' : 'Search Your Companies'}
      </h2>
      <p className="text-sm text-slate-500 max-w-xs mb-6 leading-relaxed">
        {isCloudMode
          ? 'Use the filters on the left to find companies from the global database. Results are auto-saved.'
          : 'Apply at least one filter in the sidebar or use the search bar above.'}
      </p>

      {/* ── Pending cloud filters panel ──────────────────────────────────────── */}
      {hasPending && (
        <div className="w-full max-w-sm mb-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-left shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
                {pendingFilterCount} filter{pendingFilterCount !== 1 ? 's' : ''} selected
              </span>
            </div>
            <span className="text-[9px] text-indigo-400 font-medium">ready to search</span>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {pendingFilterChips.slice(0, 10).map((chip, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-indigo-700 border border-indigo-200">
                {chip}
              </span>
            ))}
            {pendingFilterChips.length > 10 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-indigo-500 border border-indigo-200">
                +{pendingFilterChips.length - 10} more
              </span>
            )}
          </div>

          {onRunSearch && (
            <button
              onClick={onRunSearch}
              className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Play size={10} className="fill-white" />
              Run Search · {pendingFilterCount} filter{pendingFilterCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Quick tips — hidden when pending panel visible */}
      {!hasPending && (
        <div className="flex flex-col gap-1.5 mb-8 w-full max-w-[280px]">
          {tips.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 bg-white border border-slate-100 rounded-lg px-3.5 py-2 text-left shadow-sm">
              <Icon className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
              <span className="text-[11px] text-slate-600">{text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-2 mb-3 justify-center">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
              Recent {isCloudMode ? 'Cloud ' : ''}Searches
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {recentSearches.map(s => {
              const chips = s.chips
                ? getCloudChips(s.chips)
                : getCRMChips(s.filters as CompanyDBFilters);

              return (
                <div
                  key={s.id}
                  onClick={() => onApplySearch(s)}
                  className={cn(
                    'group bg-white border border-slate-100 rounded-xl px-4 py-3',
                    'hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer',
                    'transition-all shadow-sm text-left',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Search className="h-3 w-3 text-slate-400 flex-shrink-0" />
                      <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[220px]">
                        {s.summary}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {s.resultCount > 0 && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 font-semibold">
                          {s.resultCount.toLocaleString()} results
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 group-hover:hidden">{timeAgo(s.timestamp)}</span>
                      <div className="hidden group-hover:flex items-center gap-1">
                        <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5">
                          Apply <ArrowRight className="h-3 w-3" />
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); onRemoveSearch(s.id); }}
                          className="p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {chips.slice(0, 8).map((chip, i) => (
                        <span key={i} className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium', chip.color)}>
                          {chip.label}
                        </span>
                      ))}
                      {chips.length > 8 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-100 text-slate-500">
                          +{chips.length - 8} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}