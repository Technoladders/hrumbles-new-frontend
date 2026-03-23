/**
 * CandidateSearchPage.tsx — v3
 *
 * Changes from v2:
 * - Pagination persisted in URL as ?pg=N — refresh stays on same page
 * - Enriched-only toggle persisted as ?enriched=1 — filters results to
 *   candidates this org has already revealed or manually edited
 * - serializeToParams now accepts { page, enriched } options
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Database, ChevronLeft, ChevronRight, Download, X, Sparkles, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

import { useFilterState }              from "./hooks/useFilterState";
import { useCandidateSearch }          from "./hooks/useCandidateSearch";
import { useApolloIdCrossCheck }       from "./hooks/useApolloIdCrossCheck";
import { useEnrichedCandidateIds }     from "./hooks/useEnrichedCandidateIds";
import { useSavedCandidatesCount }     from "./hooks/useSavedCandidates";
import { SearchSidebar }               from "./components/SearchSidebar";
import { CandidateTable }              from "./components/CandidateTable";
import { DetailPanelV2 }               from "./components/DetailPanelV2";
import { IdleState }                   from "./components/states/IdleState";
import { EmptyState }                  from "./components/states/EmptyState";
import { ErrorState }                  from "./components/states/ErrorState";
import {
  deserializeFiltersFromParams,
  pageFromParams,
  hasFiltersInParams,
} from "./utils/filterSerializer";
import { ApolloCandidate, RecentSearch } from "./types";
import { useSelector } from "react-redux";

const RESULTS_PER_PAGE = 25;
const DEBOUNCE_MS      = 650;

// ── Filter chip bar ──────────────────────────────────────────────────────────
const FilterBar: React.FC<{
  keywords:           string;
  titles:             string[];
  locations:          string[];
  seniorities:        string[];
  companyNames:       string[];
  availabilityIntent: string[];
  onClearKeywords:    () => void;
  onRemoveTitle:      (t: string) => void;
  onRemoveLocation:   (l: string) => void;
  onRemoveSeniority:  (s: string) => void;
  onRemoveCompany:    (c: string) => void;
  onRemoveAvailability:(v: string) => void;
}> = ({
  keywords, titles, locations, seniorities, companyNames, availabilityIntent,
  onClearKeywords, onRemoveTitle, onRemoveLocation,
  onRemoveSeniority, onRemoveCompany, onRemoveAvailability,
}) => {
  const total =
    (keywords.trim() ? 1 : 0) +
    titles.length + locations.length + seniorities.length +
    companyNames.length + availabilityIntent.length;
  if (!total) return null;

  const Chip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
    <span className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-[10px] font-medium bg-white border border-[1px] text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 [border-image:linear-gradient(to_right,#9333ea,#ec4899)_1]">
      {label}
      <button type="button" onClick={onRemove} className="text-red-500 hover:opacity-60 ml-0.5">
        <X size={9} />
      </button>
    </span>
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 bg-white border-b border-slate-100 min-h-[38px]">
      <span className="text-[9px] uppercase font-semibold tracking-wider text-slate-400 mr-0.5">Filters:</span>
      {keywords.trim() && <Chip label={`"${keywords.trim()}"`} onRemove={onClearKeywords} />}
      {titles.map(t  => <Chip key={t} label={t}                    onRemove={() => onRemoveTitle(t)} />)}
      {locations.map(l => <Chip key={l} label={l}                  onRemove={() => onRemoveLocation(l)} />)}
      {seniorities.map(s => <Chip key={s} label={s}                onRemove={() => onRemoveSeniority(s)} />)}
      {companyNames.map(c => <Chip key={c} label={c}               onRemove={() => onRemoveCompany(c)} />)}
      {availabilityIntent.map(a => (
        <Chip key={a} label={a.replace(/_/g, " ")}                 onRemove={() => onRemoveAvailability(a)} />
      ))}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const CandidateSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate       = useNavigate();
  const organizationId = useSelector((s: any) => s.auth.organization_id);

  const [selected,   setSelected]   = useState<ApolloCandidate | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // ── Deserialize ALL state from URL on mount (runs once) ───────────────────
  const initialFilters  = useMemo(() => deserializeFiltersFromParams(searchParams), []); // eslint-disable-line
  const initialPage     = useMemo(() => pageFromParams(searchParams),                []); // eslint-disable-line

  const filters = useFilterState(initialFilters);

  const {
    state, people, totalEntries, currentPage, error,
    search, loadPage, reset,
  } = useCandidateSearch({
    keywords:           filters.keywords,
    titles:             filters.titles,
    locations:          filters.locations,
    seniorities:        filters.seniorities,
    companyNames:       filters.companyNames,
    availabilityIntent: filters.availabilityIntent,
    initialPage,
  });

  // ── Saved candidates count (for "My Candidates" topbar badge) ────────────
  const { count: savedCount } = useSavedCandidatesCount(organizationId);

  // ── Apollo ID cross-check ─────────────────────────────────────────────────
  const apolloIds = useMemo(() => people.map(p => p.id).filter(Boolean), [people]);
  const { crossCheckMap, revealHistoryMap } = useApolloIdCrossCheck(apolloIds, organizationId);

  // ── Enriched count (for topbar badge only — clicking navigates to saved page) ──
  const { totalCount: enrichedCount } = useEnrichedCandidateIds(organizationId);

  // displayPeople is always the full search page — no client-side filter.
  // The "Enriched" button navigates to /search/candidates/saved?tab=enriched.
  const displayPeople = people;

  // ── URL sync helper ───────────────────────────────────────────────────────
  const syncUrl = useCallback((opts: { page?: number } = {}) => {
    const newParams = filters.serializeToParams({
      page: opts.page ?? (currentPage > 1 ? currentPage : undefined),
    });
    setSearchParams(newParams, { replace: true });
  }, [filters, currentPage, setSearchParams]);

  // ── URL sync on filter changes ────────────────────────────────────────────
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (hasFiltersInParams(searchParams)) {
        search(initialPage);
      }
      return;
    }

    // ── IMPORTANT: clear pg= from URL IMMEDIATELY on filter change ──────────
    // This ensures the URL never shows pg=5 while results are from a different
    // filter set. URL clear is synchronous; search is debounced separately.
    const paramsWithoutPage = filters.serializeToParams();
    // pg intentionally omitted — filter change always resets to page 1
    setSearchParams(paramsWithoutPage, { replace: true });

    if (!filters.hasFilters) { reset(); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      filters.saveRecentSearch(filters.buildChips());
      search(1); // always page 1 on filter change
    }, DEBOUNCE_MS);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.keywords,
    filters.titles.join(","),
    filters.locations.join(","),
    filters.seniorities.join(","),
    filters.companyNames.join(","),
    filters.availabilityIntent.join(","),
  ]);

  // ── Sync page number to URL whenever page changes ─────────────────────────
  useEffect(() => {
    if (isFirstMount.current) return;
    syncUrl({ page: currentPage });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => { setSelected(null); setCheckedIds(new Set()); }, [state]);

  const handleClearAll = useCallback(() => {
    filters.clearAll();
    reset();
    setSelected(null);
    setCheckedIds(new Set());
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [filters, reset, setSearchParams]);

  const handleApplyRecent = useCallback((r: RecentSearch) => {
    filters.applyFromRecent(r.filters);
    setTimeout(() => search(1), 80);
  }, [filters, search]);

  const handleQuickSearch = useCallback((skills: string[]) => {
    filters.setSkillsFromQuickSearch(skills);
  }, [filters]);

  const handleCheckRow = useCallback((id: string, v: boolean) => {
    setCheckedIds(prev => { const n = new Set(prev); v ? n.add(id) : n.delete(id); return n; });
  }, []);
  const handleCheckAll = useCallback((v: boolean) => {
    setCheckedIds(v ? new Set(displayPeople.map(p => p.id)) : new Set());
  }, [displayPeople]);

  const handlePrev = useCallback(() => {
    if (currentPage > 1) loadPage(currentPage - 1);
  }, [currentPage, loadPage]);

  const handleNext = useCallback(() => {
    if (displayPeople.length >= RESULTS_PER_PAGE) loadPage(currentPage + 1);
  }, [displayPeople.length, currentPage, loadPage]);

  const totalPages = Math.ceil(totalEntries / RESULTS_PER_PAGE);

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden bg-slate-50">

      {/* TOP BAR */}
      <div className="flex-shrink-0 h-[50px] bg-white border-b border-slate-200 flex items-center justify-between px-5 z-10">
        <div className="flex items-center gap-3">
          <Database size={14} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Candidate Search</span>
          <div className="h-3.5 w-px bg-slate-200" />
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 font-semibold text-amber-600">Beta</span>
        </div>
        <div className="flex items-center gap-3">

          {/* My Candidates button — navigates to saved view */}
          <button
            onClick={() => navigate("/search/candidates/saved")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all bg-white border-slate-200 text-slate-600 hover:border-violet-400 hover:text-violet-600"
            title="View all saved, enriched and shortlisted candidates"
          >
            <Bookmark size={11} />
            My Candidates
            {savedCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">
                {savedCount}
              </span>
            )}
          </button>

          <div className="h-3 w-px bg-slate-200" />

          {/* Enriched — navigates to saved candidates page filtered to enriched */}
          <button
            onClick={() => navigate("/search/candidates/saved?tab=enriched")}
            title={`View your ${enrichedCount} enriched candidates`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all bg-white border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600"
          >
            <Sparkles size={11} />
            Enriched
            {enrichedCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">
                {enrichedCount}
              </span>
            )}
          </button>

          {state === "results" && (
            <span className="text-xs text-slate-400">
              ~{totalEntries.toLocaleString("en-IN")} results
            </span>
          )}
          {checkedIds.size > 0 && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-600 font-medium">{checkedIds.size} selected</span>
              <button className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <Download size={11} /> Export
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block" />
            <span className="text-[11px] text-slate-400">275M+ profiles</span>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Sidebar */}
        <div className="w-[272px] flex-shrink-0 h-full overflow-hidden">
          <SearchSidebar
            keywords={filters.keywords}
            titles={filters.titles}
            locations={filters.locations}
            seniorities={filters.seniorities}
            companyNames={filters.companyNames}
            availabilityIntent={filters.availabilityIntent}
            isLoading={state === "loading"}
            totalEntries={totalEntries}
            hasFilters={filters.hasFilters}
            filterCount={filters.filterCount}
            onSetKeywords={filters.setKeywords}
            onAddTitle={filters.addTitle}
            onRemoveTitle={filters.removeTitle}
            onAddLocation={filters.addLocation}
            onRemoveLocation={filters.removeLocation}
            onToggleSeniority={filters.toggleSeniority}
            onAddCompany={filters.addCompany}
            onRemoveCompany={filters.removeCompany}
            onToggleAvailability={filters.toggleAvailability}
            onClearAll={handleClearAll}
          />
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <FilterBar
            keywords={filters.keywords}
            titles={filters.titles}
            locations={filters.locations}
            seniorities={filters.seniorities}
            companyNames={filters.companyNames}
            availabilityIntent={filters.availabilityIntent}
            onClearKeywords={() => filters.setKeywords("")}
            onRemoveTitle={filters.removeTitle}
            onRemoveLocation={filters.removeLocation}
            onRemoveSeniority={filters.toggleSeniority}
            onRemoveCompany={filters.removeCompany}
            onRemoveAvailability={filters.toggleAvailability}
          />

          <div className="flex-1 overflow-y-auto">
            {state === "idle" && (
              <IdleState
                recentSearches={filters.recentSearches}
                onApplyRecent={handleApplyRecent}
                onRemoveRecent={filters.removeRecentSearch}
                onQuickSearch={handleQuickSearch}
              />
            )}
            {state === "empty" && <EmptyState onClearAll={handleClearAll} />}
            {state === "error" && (
              <ErrorState error={error!} onRetry={() => search(currentPage)} onClearAll={handleClearAll} />
            )}

            {(state === "loading" || state === "results") && (
              <div className="bg-white min-h-full">
                {state === "results" && (
                  <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100">
                    <span className="text-xs text-slate-500">
                      Page <span className="font-semibold text-slate-700">{currentPage}</span>
                      {" "}·{" "}
                      <span className="font-medium text-slate-700">{people.length}</span>
                      {" "}of {totalEntries.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <CandidateTable
                  people={displayPeople}
                  loading={state === "loading"}
                  selectedId={selected?.id || null}
                  checkedIds={checkedIds}
                  crossCheckMap={crossCheckMap}
                  revealHistoryMap={revealHistoryMap}
                  onSelectRow={setSelected}
                  onCheckRow={handleCheckRow}
                  onCheckAll={handleCheckAll}
                />
                {state === "results" && (
                  <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-100 bg-white sticky bottom-0">
                    <button
                      onClick={handlePrev}
                      disabled={currentPage <= 1}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors",
                        currentPage > 1
                          ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                          : "border-slate-100 text-slate-300 cursor-not-allowed",
                      )}
                    >
                      <ChevronLeft size={12} /> Previous
                    </button>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {currentPage} / {totalPages > 0 ? totalPages : "—"}
                    </span>
                    <button
                      onClick={handleNext}
                      disabled={people.length < RESULTS_PER_PAGE}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors",
                        people.length >= RESULTS_PER_PAGE
                          ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                          : "border-slate-100 text-slate-300 cursor-not-allowed",
                      )}
                    >
                      Next <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail panel v2 */}
      {selected && (
        <DetailPanelV2
          candidate={selected}
          crossCheckResult={crossCheckMap.get(selected.id)}
          revealHistory={revealHistoryMap.get(selected.id)}
          organizationId={organizationId}
          onClose={() => setSelected(null)}
          onRevealComplete={() => {/* queries auto-refetch via invalidation */}}
        />
      )}
    </div>
  );
};

export default CandidateSearchPage;