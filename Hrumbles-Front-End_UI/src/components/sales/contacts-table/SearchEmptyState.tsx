// src/components/sales/contacts-table/SearchEmptyState.tsx
import React from 'react';
import { Search, Clock, Users, TrendingUp, ArrowRight, X, Tag, Play, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContactFilters, buildFilterSummary } from '@/hooks/sales/useContactFilterParams';

export interface RecentSearch {
  id:          string;
  summary:     string;
  filters:     any;          // ContactFilters (CRM) OR DiscoverySidebar local state (Discovery)
  chips?:      string[];     // Pre-built chips for discovery searches
  resultCount: number;
  timestamp:   number;
}

interface SearchEmptyStateProps {
  recentSearches:       RecentSearch[];
  onApplySearch:        (search: RecentSearch) => void;  // pass whole object — caller decides
  onRemoveSearch:       (id: string) => void;
  isDiscoveryMode?:     boolean;
  pendingFilterChips?:  string[];
  pendingFilterCount?:  number;
  onRunSearch?:         () => void;
}

const CRM_TIPS = [
  { icon: Users,       text: 'Filter by job title or seniority level' },
  { icon: TrendingUp,  text: 'Use Pipeline Stage to find warm leads' },
  { icon: Tag,         text: 'Apply multiple filters for precise results' },
];

const DISCOVERY_TIPS = [
  { icon: Users,       text: 'Search 275M+ verified professionals globally' },
  { icon: Filter,      text: 'Filter by title, company size, location & more' },
  { icon: TrendingUp,  text: 'Find prospects actively hiring in your space' },
];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// CRM-style chips from ContactFilters shape
function getCRMChips(f: ContactFilters): { label: string; color: string }[] {
  const chips: { label: string; color: string }[] = [];
  const add = (items: string[], color: string) =>
    items.forEach(v => chips.push({ label: v, color }));

  if (f.search)               chips.push({ label: `"${f.search}"`,      color: 'bg-slate-100 text-slate-700' });
  add(f.stages,               'bg-purple-100 text-purple-700');
  add(f.jobTitles,            'bg-blue-100 text-blue-700');
  add(f.seniorities,          'bg-sky-100 text-sky-700');
  add(f.managementLevels,     'bg-sky-100 text-sky-700');
  add(f.industries,           'bg-emerald-100 text-emerald-700');
  add(f.sources,              'bg-orange-100 text-orange-700');
  add(f.countries,            'bg-rose-100 text-rose-700');
  add(f.cities,               'bg-pink-100 text-pink-700');
  add(f.departments,          'bg-indigo-100 text-indigo-700');
  add(f.employeeCounts,       'bg-cyan-100 text-cyan-700');
  if (f.hasEmail)   chips.push({ label: 'Has Email',  color: 'bg-indigo-100 text-indigo-700' });
  if (f.hasPhone)   chips.push({ label: 'Has Phone',  color: 'bg-indigo-100 text-indigo-700' });
  if (f.isEnriched) chips.push({ label: 'Enriched',   color: 'bg-indigo-100 text-indigo-700' });
  return chips;
}

// Discovery chips come pre-built as string[] — convert to same display shape
function getDiscoveryChips(chips: string[]): { label: string; color: string }[] {
  return chips.map(c => ({ label: c, color: 'bg-indigo-50 text-indigo-700' }));
}

export function SearchEmptyState({
  recentSearches, onApplySearch, onRemoveSearch, isDiscoveryMode = false,
  pendingFilterChips = [], pendingFilterCount = 0, onRunSearch,
}: SearchEmptyStateProps) {
  const tips     = isDiscoveryMode ? DISCOVERY_TIPS : CRM_TIPS;
  const hasPending = isDiscoveryMode && pendingFilterCount > 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center bg-slate-50/50">

      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-5">
        <Search className="h-6 w-6 text-slate-400" />
      </div>

      <h2 className="text-lg font-semibold text-slate-800 mb-1.5">
        {isDiscoveryMode ? 'Search 275M+ Professionals' : 'Search Your Contacts'}
      </h2>
      <p className="text-sm text-slate-500 max-w-xs mb-6 leading-relaxed">
        {isDiscoveryMode
          ? 'Use the filters on the left to find verified contacts from the global database.'
          : 'Apply at least one filter in the sidebar or use the search bar above.'}
      </p>

      {/* ── Pending discovery filters panel ────────────────────────────────── */}
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

      {/* Quick tips — hidden when pending filters panel is shown */}
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
              Recent {isDiscoveryMode ? 'Discovery ' : ''}Searches
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {recentSearches.map(s => {
              // Discovery searches have pre-built chips[]; CRM searches derive from filters
              const chips = s.chips
                ? getDiscoveryChips(s.chips)
                : getCRMChips(s.filters as ContactFilters);

              return (
                <div
                  key={s.id}
                  onClick={() => onApplySearch(s)}
                  className={cn(
                    'group bg-white border border-slate-100 rounded-xl px-4 py-3',
                    'hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer',
                    'transition-all shadow-sm text-left'
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