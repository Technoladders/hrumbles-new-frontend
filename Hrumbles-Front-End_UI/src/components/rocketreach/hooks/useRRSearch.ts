/**
 * hooks/useRRSearch.ts — v2
 *
 * Maps the full RRFilters object to the RocketReach People Search API.
 * All new filter fields from RRSearchSidebar v3 are forwarded correctly.
 */

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RRFilters } from "../RRSearchSidebar";
import type { RRProfile } from "../types";

interface UseRRSearchOpts extends Partial<RRFilters> {
  pageSize?:       number;
  provider?:       string;
  organizationId?: string | null;
}

interface UseRRSearchReturn {
  state:        "idle" | "loading" | "results" | "empty" | "error";
  profiles:     RRProfile[];
  totalEntries: number;
  error:        string | null;
  search:       (page?: number) => Promise<void>;
}

export function useRRSearch(opts: UseRRSearchOpts): UseRRSearchReturn {
  const [state,        setState]        = useState<UseRRSearchReturn["state"]>("idle");
  const [profiles,     setProfiles]     = useState<RRProfile[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [error,        setError]        = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (page = 1) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState("loading");
    setError(null);

    const pageSize = opts.pageSize ?? 10;
    const start    = (page - 1) * pageSize + 1;

    // ── Build RocketReach query object ────────────────────────────────────────
    const query: Record<string, any> = {};

    // Core
    if (opts.titles?.length)           query.current_title      = opts.titles;
    if (opts.locations?.length)         query.location           = opts.locations;
    if (opts.managementLevels?.length)  query.management_levels  = opts.managementLevels;
    if (opts.name?.trim())              query.name               = [opts.name.trim()];

    // Skills
    if (opts.skillChips?.length) {
      const must    = opts.skillChips.filter(c => c.mode === "must").map(c => c.label);
      const nice    = opts.skillChips.filter(c => c.mode === "nice").map(c => c.label);
      const exclude = opts.skillChips.filter(c => c.mode === "exclude").map(c => c.label);
      if (must.length)    query.all_skills = must;       // require ALL
      if (nice.length)    query.skills     = nice;       // any of these
      // exclude is handled client-side for now (RR API doesn't support NOT skills)
    }

    // Company
    if (opts.currentEmployer?.length)  query.current_employer   = opts.currentEmployer;
    if (opts.companySize?.length)      query.company_size        = opts.companySize;
    if (opts.companyIndustry?.length)  query.company_industry    = opts.companyIndustry;
    if (opts.companyRevenue)           query.company_revenue      = [opts.companyRevenue];
    if (opts.companyPubliclyTraded)    query.company_publicly_traded = ["true"];
    if (opts.companyFundingMin)        query.company_funding_min  = [opts.companyFundingMin];
    if (opts.companyFundingMax)        query.company_funding_max  = [opts.companyFundingMax];
    if (opts.companyTags?.length)      query.company_tag          = opts.companyTags;

    // Role
    if (opts.department?.length)       query.department          = opts.department;
    if (opts.yearsExperience)          query.years_experience     = [opts.yearsExperience];
    if (opts.previousEmployer?.length) query.previous_employer    = opts.previousEmployer;
    if (opts.previousTitle?.length)    query.previous_title       = opts.previousTitle;

    // Education
    if (opts.school?.length)           query.school              = opts.school;
    if (opts.degree?.length)           query.degree              = opts.degree;
    if (opts.major?.length)            query.major               = opts.major;

    // Contact & Signals
    if (opts.contactMethod?.length)    query.contact_method      = opts.contactMethod;
    if (opts.emailGrade)               query.email_grade         = opts.emailGrade;
    if (opts.jobChangeSignal)          query.job_change_signal   = [opts.jobChangeSignal];
    if (opts.newsSignal)               query.news_signal         = [opts.newsSignal];
    if (opts.jobPostingSignal)         query.company_job_posting_signal = [opts.jobPostingSignal];

    // Keyword
    if (opts.keyword?.trim())          query.keyword             = opts.keyword.trim();

    const body: Record<string, any> = {
      query,
      order_by:       opts.orderBy ?? "popularity",
      page_size:      pageSize,
      start,
      organizationId: opts.organizationId ?? undefined,
    };

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("rocketreach-search", {
        body,
      });

      if (fnErr) throw new Error(fnErr.message);
      if (!data)  throw new Error("No response from search");

      const rawProfiles: RRProfile[] = data.profiles ?? [];
      const total                    = data.pagination?.total ?? 0;

      if (rawProfiles.length === 0) {
        setState("empty");
        setProfiles([]);
        setTotalEntries(0);
        return;
      }

      // Client-side filter: exclude skills
      const excludedSkills = new Set(
        (opts.skillChips ?? []).filter(c => c.mode === "exclude").map(c => c.label.toLowerCase())
      );
      const filtered = excludedSkills.size
        ? rawProfiles.filter(p => {
            const profileSkills = new Set((p._skills ?? []).map((s: string) => s.toLowerCase()));
            return ![...excludedSkills].some(ex => profileSkills.has(ex));
          })
        : rawProfiles;

      setState("results");
      setProfiles(filtered);
      setTotalEntries(total);
    } catch (e: any) {
      if (e.name === "AbortError") return;
      setError(e.message ?? "Search failed");
      setState("error");
    }
  }, [
    opts.titles, opts.locations, opts.managementLevels, opts.name,
    opts.skillChips, opts.currentEmployer, opts.companySize, opts.companyIndustry,
    opts.companyRevenue, opts.companyPubliclyTraded, opts.companyFundingMin, opts.companyFundingMax,
    opts.companyTags, opts.department, opts.yearsExperience, opts.previousEmployer, opts.previousTitle,
    opts.school, opts.degree, opts.major, opts.contactMethod, opts.emailGrade,
    opts.jobChangeSignal, opts.newsSignal, opts.jobPostingSignal, opts.keyword,
    opts.orderBy, opts.pageSize, opts.provider, opts.organizationId,
  ]);

  return { state, profiles, totalEntries, error, search };
}