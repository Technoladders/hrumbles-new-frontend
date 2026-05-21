// src/hooks/useTISearch.ts  — v2
import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import {
  TIProfile, TIFilters, DEFAULT_TI_FILTERS, TI_PAGE_SIZE,
  OrgProfileStats, TIRevealedStatus,
} from "@/types/talentIntelligence";

// ── URL serialisation ─────────────────────────────────────────

function filtersToParams(f: TIFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.query)               p.q   = f.query;
  if (f.location)            p.loc = f.location;
  if (f.company)             p.co  = f.company;
  if (f.seniority.length)    p.sen = f.seniority.join(",");
  if (f.jobFunction.length)  p.jf  = f.jobFunction.join(",");
  if (f.industry.length)     p.ind = f.industry.join("|");
  if (f.skills.length)       p.sk  = f.skills.join(",");
  if (f.openToWork)          p.otw = "1";
  if (f.hasEmail)            p.em  = "1";
  if (f.hasPhone)            p.ph  = "1";
  if (f.revealedStatus !== "all") p.rs = f.revealedStatus;
  return p;
}

function paramsToFilters(params: URLSearchParams): TIFilters {
  return {
    query:          params.get("q")   ?? "",
    location:       params.get("loc") ?? "",
    company:        params.get("co")  ?? "",
    seniority:      params.get("sen") ? params.get("sen")!.split(",") : [],
    jobFunction:    params.get("jf")  ? params.get("jf")!.split(",")  : [],
    industry:       params.get("ind") ? params.get("ind")!.split("|") : [],
    skills:         params.get("sk")  ? params.get("sk")!.split(",")  : [],
    openToWork:     params.get("otw") === "1",
    hasEmail:       params.get("em")  === "1",
    hasPhone:       params.get("ph")  === "1",
    revealedStatus: (params.get("rs") as TIRevealedStatus) || "all",
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
  /** Patch a single profile in local list (after reveal) */
  patchProfile: (id: string, patch: Partial<TIProfile>) => void;
}

export function useTISearch(): UseTISearchReturn {
  const authData      = getAuthDataFromLocalStorage();
  const organizationId = authData?.organization_id ?? null;

  const [searchParams, setSearchParams] = useSearchParams();
  const [page,         setPageState]    = useState<number>(
    parseInt(searchParams.get("pg") ?? "1", 10) || 1
  );
  const [filters,      setFiltersState] = useState<TIFilters>(
    () => paramsToFilters(searchParams)
  );
  const [profiles,    setProfiles]    = useState<TIProfile[]>([]);
  const [total,       setTotal]       = useState<number>(0);
  const [isLoading,   setIsLoading]   = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error,       setError]       = useState<string | null>(null);
  const [stats,       setStats]       = useState<OrgProfileStats | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFilters = !!(
    filters.query || filters.location || filters.company ||
    filters.seniority.length || filters.jobFunction.length ||
    filters.industry.length  || filters.skills.length ||
    filters.openToWork || filters.hasEmail || filters.hasPhone ||
    filters.revealedStatus !== "all"
  );

  // Sync → URL
  useEffect(() => {
    const params = filtersToParams(filters);
    if (page > 1) params.pg = String(page);
    setSearchParams(params, { replace: true });
  }, [filters, page]);

  // Fetch stats (sidebar counts)
  const fetchStats = useCallback(async () => {
    if (!organizationId) return;
    const { data } = await supabase
      .rpc("get_org_profile_stats", { p_org_id: organizationId })
      .single();
    if (data) setStats(data as OrgProfileStats);
  }, [organizationId]);

  const doSearch = useCallback(
    async (f: TIFilters, p: number, initial = false) => {
      if (!organizationId) return;
      initial ? setIsLoading(true) : setIsSearching(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc("search_org_profiles", {
          p_org_id:          organizationId,
          p_query:           f.query        || null,
          p_location:        f.location     || null,
          p_seniority:       f.seniority.length   ? f.seniority   : null,
          p_job_function:    f.jobFunction.length  ? f.jobFunction : null,
          p_company:         f.company      || null,
          p_industry:        f.industry.length     ? f.industry    : null,
          p_skills:          f.skills.length       ? f.skills      : null,
          p_open_to_work:    f.openToWork,
          p_has_email:       f.hasEmail,
          p_has_phone:       f.hasPhone,
          p_revealed_status: f.revealedStatus,
          p_limit:           TI_PAGE_SIZE,
          p_offset:          (p - 1) * TI_PAGE_SIZE,
        });
        if (rpcError) throw rpcError;
        const rows = (data ?? []) as TIProfile[];
        setProfiles(rows);
        setTotal(rows[0]?.total_count ? Number(rows[0].total_count) : 0);
      } catch (err: any) {
        setError(err?.message ?? "Search failed.");
        setProfiles([]); setTotal(0);
      } finally {
        setIsLoading(false); setIsSearching(false);
      }
    },
    [organizationId]
  );

  useEffect(() => {
    doSearch(filters, page, true);
    fetchStats();
  }, [organizationId]);

  const setFilters = useCallback((newFilters: TIFilters) => {
    setFiltersState(newFilters);
    setPageState(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(newFilters, 1);
      fetchStats();
    }, 350);
  }, [doSearch, fetchStats]);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
    doSearch(filters, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [filters, doSearch]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_TI_FILTERS);
  }, [setFilters]);

  const refetch = useCallback(() => {
    doSearch(filters, page);
    fetchStats();
  }, [filters, page, doSearch, fetchStats]);

  /** Optimistic patch — updates revealed data in local list after reveal */
  const patchProfile = useCallback((id: string, patch: Partial<TIProfile>) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  return {
    profiles, total, page, isLoading, isSearching,
    error, filters, hasFilters, stats,
    setFilters, setPage, resetFilters, refetch, patchProfile,
  };
}