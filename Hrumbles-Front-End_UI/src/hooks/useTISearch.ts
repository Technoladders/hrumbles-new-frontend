// src/hooks/useTISearch.ts  — v4
// Changes from v3:
//   • Uses search_org_profiles_v1 (not search_org_profiles) → run sql/search_org_profiles_v3.sql
//   • skillChips: must→p_skills (AND, case-insensitive), nice→p_nice_skills (OR+ranking), excl→p_exclude_skills
//   • companyFilter tab: "current"|"past"|"both" maps currentEmployer to correct RPC param
//   • titleFilter:  "current" → p_titles only
//                   "past"    → p_previous_title only (titles go there)
//                   "both"    → p_any_title (current OR any experience, OR logic in SQL)
//   • p_major:   education field_of_study ilike search (was missing)
//   • p_any_title: new RPC param (SQL v3) — searches current title OR any experience title with OR
//   • hasFilters: all .length checks use ?. to prevent crash when old DEFAULT_TI_FILTERS used

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import {
  TIProfile, TIFilters, DEFAULT_TI_FILTERS, TI_PAGE_SIZE,
  OrgProfileStats, TIRevealedStatus, SkillChip,
} from "@/types/talentIntelligence";

// ── URL encode / decode ───────────────────────────────────────────────────────

function enc(f: TIFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.query)                          p.q   = f.query;
  if (f.location)                       p.loc = f.location;
  if (f.yearsExperience)                p.ye  = f.yearsExperience;
  if (f.skillChips?.length)             p.sk  = JSON.stringify(f.skillChips);
  if (f.titles?.length)                 p.tt  = f.titles.join("|");
  if (f.titleFilter && f.titleFilter !== "current") p.tf = f.titleFilter;
  if (f.excludeJobTitles?.length)       p.ejt = f.excludeJobTitles.join("|");
  if (f.currentEmployer?.length)        p.ce  = f.currentEmployer.join("|");
  if (f.companyFilter && f.companyFilter !== "current") p.cf = f.companyFilter;
  if (f.excludeCompanies?.length)       p.exc = f.excludeCompanies.join("|");
  if (f.previousEmployer?.length)       p.pe  = f.previousEmployer.join("|");
  if (f.previousTitle?.length)          p.ptt = f.previousTitle.join("|");
  if (f.industry?.length)               p.ind = f.industry.join("|");
  if (f.domain?.length)                 p.dom = f.domain.join("|");
  if (f.currentWorkLocation?.length)    p.cwl = f.currentWorkLocation.join("|");
  if (f.pastWorkLocation?.length)       p.pwl = f.pastWorkLocation.join("|");
  if (f.languages?.length)              p.lng = JSON.stringify(f.languages);
  if (f.school?.length)                 p.sc  = f.school.join("|");
  if (f.degree?.length)                 p.dg  = f.degree.join("|");
  if (f.major?.length)                  p.mj  = f.major.join("|");
  if (f.openToWork)                     p.otw = "1";
  if (f.hasEmail)                       p.em  = "1";
  if (f.hasPhone)                       p.ph  = "1";
  if (f.revealedStatus !== "all")       p.rs  = f.revealedStatus;
  return p;
}

function dec(params: URLSearchParams): TIFilters {
  const sp  = (k: string): string[] => params.get(k) ? params.get(k)!.split("|").filter(Boolean) : [];
  let skillChips: SkillChip[] = [];
  let languages: TIFilters["languages"] = [];
  try { skillChips = JSON.parse(params.get("sk") ?? "[]"); } catch { /**/ }
  try { languages  = JSON.parse(params.get("lng") ?? "[]"); } catch { /**/ }
  return {
    ...DEFAULT_TI_FILTERS,          // ← spread defaults first so all new fields always defined
    query:                  params.get("q")   ?? "",
    location:               params.get("loc") ?? "",
    yearsExperience:        params.get("ye")  ?? "",
    skillChips,
    titles:                 sp("tt"),
    titleFilter:            (params.get("tf") as "current"|"past"|"both") ?? "current",
    excludeJobTitles:       sp("ejt"),
    currentEmployer:        sp("ce"),
    companyFilter:          (params.get("cf") as "current"|"past"|"both") ?? "current",
    excludeCompanies:       sp("exc"),
    previousEmployer:       sp("pe"),
    previousTitle:          sp("ptt"),
    industry:               sp("ind"),
    domain:                 sp("dom"),
    currentWorkLocation:    sp("cwl"),
    pastWorkLocation:       sp("pwl"),
    languages,
    school:                 sp("sc"),
    degree:                 sp("dg"),
    major:                  sp("mj"),
    openToWork:             params.get("otw") === "1",
    hasEmail:               params.get("em")  === "1",
    hasPhone:               params.get("ph")  === "1",
    revealedStatus:         (params.get("rs") as TIRevealedStatus) || "all",
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseTISearchReturn {
  profiles:     TIProfile[];
  total:        number;
  page:         number;
  isLoading:    boolean;
  isSearching:  boolean;
  error:        string | null;
  filters:      TIFilters;
  hasFilters:   boolean;
  stats:        OrgProfileStats | null;
  setFilters:   (f: TIFilters) => void;
  setPage:      (p: number) => void;
  resetFilters: () => void;
  refetch:      () => void;
  patchProfile: (id: string, patch: Partial<TIProfile>) => void;
}

export function useTISearch(): UseTISearchReturn {
  const authData       = getAuthDataFromLocalStorage();
  const organizationId = authData?.organization_id ?? null;

  const [searchParams, setSearchParams] = useSearchParams();
  const [page,    setPageState]    = useState(() => parseInt(searchParams.get("pg") ?? "1") || 1);
  const [filters, setFiltersState] = useState<TIFilters>(() => dec(searchParams));
  const [profiles,    setProfiles]    = useState<TIProfile[]>([]);
  const [total,       setTotal]       = useState(0);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [stats,       setStats]       = useState<OrgProfileStats | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Defensive ?. on every .length — prevents crash when old DEFAULT_TI_FILTERS
  //    is used (new fields would be undefined if talentIntelligence.ts not updated).
  const hasFilters = !!(
    filters.query || filters.location || filters.yearsExperience ||
    (filters.skillChips?.length)        ||
    (filters.titles?.length)            ||
    (filters.excludeJobTitles?.length)  ||
    (filters.currentEmployer?.length)   ||
    (filters.previousEmployer?.length)  ||
    (filters.previousTitle?.length)     ||
    (filters.industry?.length)          ||
    (filters.domain?.length)            ||
    (filters.currentWorkLocation?.length) ||
    (filters.pastWorkLocation?.length)  ||
    (filters.languages?.length)         ||
    (filters.excludeCompanies?.length)  ||
    (filters.school?.length)            ||
    (filters.degree?.length)            ||
    (filters.major?.length)             ||
    filters.openToWork || filters.hasEmail || filters.hasPhone ||
    filters.revealedStatus !== "all"
  );

  useEffect(() => {
    const p = enc(filters);
    if (page > 1) p.pg = String(page);
    setSearchParams(p, { replace: true });
  }, [filters, page]);

  const fetchStats = useCallback(async () => {
    if (!organizationId) return;
    const { data } = await supabase.rpc("get_org_profile_stats", { p_org_id: organizationId }).single();
    if (data) setStats(data as OrgProfileStats);
  }, [organizationId]);

  const doSearch = useCallback(async (f: TIFilters, pg: number, initial = false) => {
    if (!organizationId) return;
    initial ? setIsLoading(true) : setIsSearching(true);
    setError(null);

    // ── Skills (case-insensitive in SQL via lower(trim())) ──────────────────────
    const mustSkills    = (f.skillChips ?? []).filter(c => c.mode === "must").map(c => c.label);
    const niceSkills    = (f.skillChips ?? []).filter(c => c.mode === "nice").map(c => c.label);
    const excludeSkills = (f.skillChips ?? []).filter(c => c.mode === "exclude").map(c => c.label);

    // ── Title filter: current | past | both ────────────────────────────────────
    //   "current" → p_titles (searches m.title only)
    //   "past"    → p_previous_title (non-current experience titles)
    //   "both"    → p_any_title  (SQL: current title OR any exp title, OR logic)
    const titleMode      = f.titleFilter ?? "current";
    const titles         = f.titles ?? [];
    const rolePastTitles = f.previousTitle ?? []; // always-past, from Role section

    let p_titles_param:         string[] | null = null;
    let p_any_title_param:      string[] | null = null;
    let p_prev_title_param:     string[] | null = null;

    if (titleMode === "current") {
      p_titles_param    = titles.length    ? titles          : null;
      p_prev_title_param = rolePastTitles.length ? rolePastTitles : null;
    } else if (titleMode === "past") {
      // merge searched titles into previous_title pool
      const merged = [...titles, ...rolePastTitles].filter(Boolean);
      p_prev_title_param = merged.length ? merged : null;
      p_titles_param     = null;
    } else {
      // "both" — p_any_title does OR across current+experience in SQL
      p_any_title_param  = titles.length          ? titles          : null;
      p_prev_title_param = rolePastTitles.length  ? rolePastTitles  : null;
    }

    // ── Company filter: current | past | both ──────────────────────────────────
    const companies   = f.currentEmployer ?? [];
    const companyMode = f.companyFilter   ?? "current";
    let p_curr: string[] | null = null;
    let p_prev: string[] | null = null;
    let p_any:  string[] | null = null;
    if (companies.length > 0) {
      if      (companyMode === "current") p_curr = companies;
      else if (companyMode === "past")    p_prev = companies;
      else                                p_any  = companies;
    }
    // previousEmployer (role history section) always past
    const prevEmp = f.previousEmployer ?? [];
    if (prevEmp.length > 0) {
      if      (!companies.length) p_prev = prevEmp;
      else if (p_any)             p_any  = [...p_any, ...prevEmp];
      else                        p_prev = [...(p_prev ?? []), ...prevEmp];
    }

    // ── Language names for RPC ─────────────────────────────────────────────────
    const langNames = (f.languages ?? []).map(l => l.language.trim()).filter(Boolean);

    try {
      const { data, error: rpcErr } = await supabase.rpc("search_org_profiles_v1", {
        p_org_id:                organizationId,
        p_query:                 f.query     || null,
        p_location:              f.location  || null,
        p_seniority:             null,
        p_job_function:          null,
        p_company:               null,
        p_industry:              (f.industry?.length)          ? f.industry          : null,
        // Skills — case-insensitive + trimmed (SQL v3)
        p_skills:                mustSkills.length             ? mustSkills           : null,
        p_nice_skills:           niceSkills.length             ? niceSkills           : null,
        p_exclude_skills:        excludeSkills.length          ? excludeSkills        : null,
        // Contact
        p_open_to_work:          f.openToWork  ?? false,
        p_has_email:             f.hasEmail    ?? false,
        p_has_phone:             f.hasPhone    ?? false,
        p_revealed_status:       f.revealedStatus ?? "all",
        // Titles
        p_titles:                p_titles_param,
        p_any_title:             p_any_title_param,
        p_exclude_titles:        (f.excludeJobTitles?.length)  ? f.excludeJobTitles  : null,
        // Employers
        p_current_employer:      p_curr,
        p_previous_employer:     p_prev,
        p_any_employer:          p_any,
        p_exclude_companies:     (f.excludeCompanies?.length)  ? f.excludeCompanies  : null,
        // Role history title (always-past, from sidebar Role section)
        p_previous_title:        p_prev_title_param,
        // Education
        p_school:                (f.school?.length)            ? f.school            : null,
        p_degree:                (f.degree?.length)            ? f.degree            : null,
        p_major:                 (f.major?.length)             ? f.major             : null,
        p_years_experience:      f.yearsExperience             || null,
        // Location extras
        p_current_work_location: (f.currentWorkLocation?.length) ? f.currentWorkLocation : null,
        p_past_work_location:    (f.pastWorkLocation?.length)    ? f.pastWorkLocation    : null,
        // Languages + domain
        p_languages:             langNames.length              ? langNames            : null,
        p_domain:                (f.domain?.length)            ? f.domain             : null,
        // Pagination
        p_limit:   TI_PAGE_SIZE,
        p_offset:  (pg - 1) * TI_PAGE_SIZE,
      });
      if (rpcErr) throw rpcErr;
      const rows = (data ?? []) as TIProfile[];
      setProfiles(rows);
      setTotal(rows[0]?.total_count ? Number(rows[0].total_count) : 0);
    } catch (err: any) {
      setError(err?.message ?? "Search failed.");
      setProfiles([]); setTotal(0);
    } finally {
      setIsLoading(false); setIsSearching(false);
    }
  }, [organizationId]);

  useEffect(() => {
    doSearch(filters, page, true);
    fetchStats();
  }, [organizationId]);

  const setFilters = useCallback((f: TIFilters) => {
    // Ensure new fields from DEFAULT_TI_FILTERS are always present (merge with defaults)
    const safe: TIFilters = { ...DEFAULT_TI_FILTERS, ...f };
    setFiltersState(safe); setPageState(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { doSearch(safe, 1); fetchStats(); }, 350);
  }, [doSearch, fetchStats]);

  const setPage = useCallback((pg: number) => {
    setPageState(pg); doSearch(filters, pg);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [filters, doSearch]);

  const resetFilters = useCallback(() => setFilters({ ...DEFAULT_TI_FILTERS }), [setFilters]);
  const refetch = useCallback(() => { doSearch(filters, page); fetchStats(); }, [filters, page, doSearch, fetchStats]);

  const patchProfile = useCallback((id: string, patch: Partial<TIProfile>) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  return {
    profiles, total, page, isLoading, isSearching, error, filters, hasFilters, stats,
    setFilters, setPage, resetFilters, refetch, patchProfile,
  };
}