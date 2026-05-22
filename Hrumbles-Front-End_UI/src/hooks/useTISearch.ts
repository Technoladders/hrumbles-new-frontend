// src/hooks/useTISearch.ts  — v3

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import {
  TIProfile, TIFilters, DEFAULT_TI_FILTERS, TI_PAGE_SIZE,
  OrgProfileStats, TIRevealedStatus, SkillChip,
} from "@/types/talentIntelligence";

// ── URL encode / decode ───────────────────────────────────────

function enc(f: TIFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.query)             p.q   = f.query;
  if (f.location)          p.loc = f.location;
  if (f.yearsExperience)   p.ye  = f.yearsExperience;
  if (f.skillChips.length) p.sk  = JSON.stringify(f.skillChips);
  if (f.titles.length)     p.tt  = f.titles.join("|");
  if (f.currentEmployer.length)  p.ce  = f.currentEmployer.join("|");
  if (f.previousEmployer.length) p.pe  = f.previousEmployer.join("|");
  if (f.previousTitle.length)    p.ptt = f.previousTitle.join("|");
  if (f.industry.length)   p.ind = f.industry.join("|");
  if (f.school.length)     p.sc  = f.school.join("|");
  if (f.degree.length)     p.dg  = f.degree.join("|");
  if (f.major.length)      p.mj  = f.major.join("|");
  if (f.openToWork)        p.otw = "1";
  if (f.hasEmail)          p.em  = "1";
  if (f.hasPhone)          p.ph  = "1";
  if (f.revealedStatus !== "all") p.rs = f.revealedStatus;
  return p;
}

function dec(params: URLSearchParams): TIFilters {
  const sp = (k: string) => params.get(k) ? params.get(k)!.split("|") : [];
  let skillChips: SkillChip[] = [];
  try { skillChips = JSON.parse(params.get("sk") ?? "[]"); } catch { /**/ }
  return {
    query:           params.get("q")   ?? "",
    location:        params.get("loc") ?? "",
    yearsExperience: params.get("ye")  ?? "",
    skillChips,
    titles:          sp("tt"),
    currentEmployer: sp("ce"),
    previousEmployer: sp("pe"),
    previousTitle:   sp("ptt"),
    industry:        sp("ind"),
    school:          sp("sc"),
    degree:          sp("dg"),
    major:           sp("mj"),
    openToWork:      params.get("otw") === "1",
    hasEmail:        params.get("em")  === "1",
    hasPhone:        params.get("ph")  === "1",
    revealedStatus:  (params.get("rs") as TIRevealedStatus) || "all",
  };
}

// ── Hook ──────────────────────────────────────────────────────

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
  const authData        = getAuthDataFromLocalStorage();
  const organizationId  = authData?.organization_id ?? null;

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

  const hasFilters = !!(
    filters.query || filters.location || filters.yearsExperience ||
    filters.skillChips.length || filters.titles.length ||
    filters.currentEmployer.length || filters.previousEmployer.length ||
    filters.previousTitle.length || filters.industry.length ||
    filters.school.length || filters.degree.length || filters.major.length ||
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

    const mustSkills    = f.skillChips.filter(c => c.mode === 'must').map(c => c.label);
    const excludeSkills = f.skillChips.filter(c => c.mode === 'exclude').map(c => c.label);

    try {
      const { data, error: rpcErr } = await supabase.rpc("search_org_profiles", {
        p_org_id:            organizationId,
        p_query:             f.query        || null,
        p_location:          f.location     || null,
        p_seniority:         null,  // handled via job_function or sidebar
        p_job_function:      null,
        p_company:           null,
        p_industry:          f.industry.length     ? f.industry    : null,
        p_skills:            mustSkills.length      ? mustSkills    : null,
        p_open_to_work:      f.openToWork,
        p_has_email:         f.hasEmail,
        p_has_phone:         f.hasPhone,
        p_revealed_status:   f.revealedStatus,
        p_titles:            f.titles.length        ? f.titles        : null,
        p_current_employer:  f.currentEmployer.length ? f.currentEmployer : null,
        p_previous_employer: f.previousEmployer.length ? f.previousEmployer : null,
        p_previous_title:    f.previousTitle.length ? f.previousTitle : null,
        p_exclude_skills:    excludeSkills.length   ? excludeSkills  : null,
        p_school:            f.school.length        ? f.school       : null,
        p_degree:            f.degree.length        ? f.degree       : null,
        p_years_experience:  f.yearsExperience      || null,
        p_limit:             TI_PAGE_SIZE,
        p_offset:            (pg - 1) * TI_PAGE_SIZE,
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
    setFiltersState(f); setPageState(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { doSearch(f, 1); fetchStats(); }, 350);
  }, [doSearch, fetchStats]);

  const setPage = useCallback((pg: number) => {
    setPageState(pg); doSearch(filters, pg);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [filters, doSearch]);

  const resetFilters = useCallback(() => setFilters(DEFAULT_TI_FILTERS), [setFilters]);
  const refetch = useCallback(() => { doSearch(filters, page); fetchStats(); }, [filters, page, doSearch, fetchStats]);

  const patchProfile = useCallback((id: string, patch: Partial<TIProfile>) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  return {
    profiles, total, page, isLoading, isSearching, error, filters, hasFilters, stats,
    setFilters, setPage, resetFilters, refetch, patchProfile,
  };
}