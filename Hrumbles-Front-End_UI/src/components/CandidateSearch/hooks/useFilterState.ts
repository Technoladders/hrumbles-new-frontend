/**
 * useFilterState.ts — v2
 *
 * Changes from v1:
 * - Accepts optional `initialFilters` param (deserialized from URL on mount)
 * - Returns `serializeToParams()` helper so CandidateSearchPage can push to URL
 * - Everything else unchanged
 */

import { useState, useCallback, useMemo } from "react";
import { FilterState, RecentSearch } from "../types";
import { serializeFilters, SerializeOptions } from "../utils/filterSerializer";

const RECENT_KEY = "talent_search_recent_v3";

const loadRecent = (): RecentSearch[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
  catch { return []; }
};

export interface UseFilterStateReturn extends FilterState {
  setKeywords:            (v: string) => void;
  addTitle:               (t: string) => void;
  removeTitle:            (t: string) => void;
  addLocation:            (l: string) => void;
  removeLocation:         (l: string) => void;
  toggleSeniority:        (s: string) => void;
  addCompany:             (c: string) => void;
  removeCompany:          (c: string) => void;
  toggleAvailability:     (v: string) => void;
  clearAll:               () => void;
  applyFromRecent:        (f: FilterState) => void;
  setSkillsFromQuickSearch:(skills: string[]) => void;
  filterCount:            number;
  hasFilters:             boolean;
  recentSearches:         RecentSearch[];
  saveRecentSearch:       (chips: string[]) => void;
  removeRecentSearch:     (id: string) => void;
  buildSummary:           () => string;
  buildChips:             () => string[];
  // Returns URLSearchParams snapshot — pass opts to include page/enriched
  serializeToParams:      (opts?: SerializeOptions) => URLSearchParams;
}

export const useFilterState = (
  initialFilters?: Partial<FilterState>
): UseFilterStateReturn => {

  const [keywords,           setKw]          = useState(initialFilters?.keywords           || "");
  const [titles,             setTitles]       = useState<string[]>(initialFilters?.titles   || []);
  const [locations,          setLocations]    = useState<string[]>(initialFilters?.locations || []);
  const [seniorities,        setSeniorities]  = useState<string[]>(initialFilters?.seniorities || []);
  const [companyNames,       setCompanyNames] = useState<string[]>(initialFilters?.companyNames || []);
  const [availabilityIntent, setAvailability] = useState<string[]>(initialFilters?.availabilityIntent || []);
  const [recentSearches,     setRecent]       = useState<RecentSearch[]>(loadRecent);

  // Kept for backward compat with RecentSearch shapes
  const skills        = [] as string[];
  const emailStatuses = [] as string[];

  // ── Setters ───────────────────────────────────────────────────────────────

  const setKeywords     = useCallback((v: string) => setKw(v), []);
  const addTitle        = useCallback((t: string) => setTitles(p  => p.includes(t) ? p : [...p, t]), []);
  const removeTitle     = useCallback((t: string) => setTitles(p  => p.filter(x => x !== t)), []);
  const addLocation     = useCallback((l: string) => setLocations(p => p.includes(l) ? p : [...p, l]), []);
  const removeLocation  = useCallback((l: string) => setLocations(p => p.filter(x => x !== l)), []);
  const toggleSeniority = useCallback((s: string) =>
    setSeniorities(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]), []);
  const addCompany      = useCallback((c: string) => setCompanyNames(p => p.includes(c) ? p : [...p, c]), []);
  const removeCompany   = useCallback((c: string) => setCompanyNames(p => p.filter(x => x !== c)), []);
  const toggleAvailability = useCallback((v: string) =>
    setAvailability(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]), []);

  const clearAll = useCallback(() => {
    setKw(""); setTitles([]); setLocations([]);
    setSeniorities([]); setCompanyNames([]); setAvailability([]);
  }, []);

  const applyFromRecent = useCallback((f: FilterState) => {
    setKw(f.keywords           || "");
    setTitles(f.titles         || []);
    setLocations(f.locations   || []);
    setSeniorities(f.seniorities   || []);
    setCompanyNames(f.companyNames || []);
    setAvailability(f.availabilityIntent || []);
  }, []);

  const setSkillsFromQuickSearch = useCallback((s: string[]) => {
    setTitles(s);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const filterCount = useMemo(() => {
    let n = 0;
    if (keywords.trim())          n++;
    if (titles.length)            n++;
    if (locations.length)         n++;
    if (seniorities.length)       n++;
    if (companyNames.length)      n++;
    if (availabilityIntent.length) n++;
    return n;
  }, [keywords, titles, locations, seniorities, companyNames, availabilityIntent]);

  const buildChips = useCallback((): string[] => {
    const chips: string[] = [];
    if (keywords.trim()) chips.push(`"${keywords.trim()}"`);
    titles.forEach(t       => chips.push(t));
    locations.forEach(l    => chips.push(l));
    seniorities.forEach(s  => chips.push(s));
    companyNames.forEach(c => chips.push(c));
    availabilityIntent.forEach(a => chips.push(a.replace(/_/g, " ")));
    return chips;
  }, [keywords, titles, locations, seniorities, companyNames, availabilityIntent]);

  const buildSummary = useCallback((): string => {
    const parts: string[] = [];
    if (keywords.trim())    parts.push(`"${keywords.trim()}"`);
    if (titles.length)      parts.push(titles[0]);
    if (locations.length)   parts.push(locations[0]);
    if (seniorities.length) parts.push(seniorities[0]);
    if (companyNames.length) parts.push(companyNames[0]);
    return parts.join(" · ") || "Search";
  }, [keywords, titles, locations, seniorities, companyNames]);

  const saveRecentSearch = useCallback((chips: string[]) => {
    const summary = buildSummary();
    const entry: RecentSearch = {
      id:        Date.now().toString(),
      summary,
      chips,
      filters:   { keywords, titles, locations, seniorities, companyNames, availabilityIntent, skills: [], emailStatuses: [] },
      timestamp: Date.now(),
    };
    const existing = loadRecent();
    const deduped  = [entry, ...existing.filter(s => s.summary !== summary)].slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(deduped));
    setRecent(deduped);
  }, [keywords, titles, locations, seniorities, companyNames, availabilityIntent, buildSummary]);

  const removeRecentSearch = useCallback((id: string) => {
    const updated = recentSearches.filter(s => s.id !== id);
    setRecent(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  }, [recentSearches]);

  // Snapshot current filter state as URLSearchParams
  // Pass opts to include page number and enriched toggle in the URL
  const serializeToParams = useCallback((opts: SerializeOptions = {}): URLSearchParams => {
    return serializeFilters(
      {
        keywords, titles, locations, seniorities,
        companyNames, availabilityIntent,
        skills:       [],
        emailStatuses:[],
      },
      opts
    );
  }, [keywords, titles, locations, seniorities, companyNames, availabilityIntent]);

  return {
    keywords, titles, locations, seniorities, companyNames,
    availabilityIntent, skills, emailStatuses,
    setKeywords, addTitle, removeTitle,
    addLocation, removeLocation, toggleSeniority,
    addCompany, removeCompany, toggleAvailability,
    clearAll, applyFromRecent, setSkillsFromQuickSearch,
    filterCount, hasFilters: filterCount > 0,
    recentSearches, saveRecentSearch, removeRecentSearch,
    buildSummary, buildChips,
    serializeToParams,
  };
};