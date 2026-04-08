// src/components/RocketReachSearch/hooks/useRRSearch.ts
// Updated: accepts `provider` to call either rocketreach-search or contactout-search.
// ContactOut response is normalized to the same RRProfile shape.

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RRProfile, RRSearchState, RRSearchError, SkillChip } from "../types";

const RESULTS_PER_PAGE = 10;

type SearchProvider = "rocketreach" | "contactout";

interface UseRRSearchOptions {
  name:             string;
  titles:           string[];
  locations:        string[];
  currentEmployer:  string[];
  keyword:          string;
  skillChips:       SkillChip[];
  managementLevels: string[];
  department:       string;
  companyIndustry:  string;
  companySize:      string;
  orderBy:          "popularity" | "relevance";
  pageSize:         number;
  initialPage?:     number;
  provider?:        SearchProvider;
}

interface UseRRSearchReturn {
  state:        RRSearchState;
  profiles:     RRProfile[];
  totalEntries: number;
  currentPage:  number;
  error:        RRSearchError | null;
  search:       (page?: number) => Promise<void>;
  loadMore:     () => void;
  loadPrev:     () => void;
  reset:        () => void;
}

// ── ContactOut → RRProfile normalizer ────────────────────────────────────────
// ContactOut returns { "https://linkedin.com/in/xxx": { full_name, title, ... } }
// We normalize to the same RRProfile shape used by RocketReach

function normalizeContactOut(profilesObj: Record<string, any>): RRProfile[] {
  if (!profilesObj || typeof profilesObj !== "object" || Array.isArray(profilesObj)) return [];
 
  return Object.entries(profilesObj).map(([linkedinUrl, p]) => {
    // Stable integer ID from URL hash (deterministic)
    let idHash = 0;
    for (let i = 0; i < linkedinUrl.length; i++) {
      idHash = ((idHash << 5) - idHash) + linkedinUrl.charCodeAt(i);
      idHash = idHash & idHash; // force 32-bit
    }
 
    // ── Job history from detailed experience ───────────────────────────────
    const jobHistory = (p.experience ?? []).map((e: any) => {
      if (typeof e === "string") {
        const match = e.match(/^(.+?) at (.+?) in (.+)$/);
        return match
          ? { title: match[1], company_name: match[2], is_current: e.includes("Present"),
              start_date: match[3].split(" - ")[0], end_date: e.includes("Present") ? null : match[3].split(" - ")[1] }
          : { title: e, company_name: null, is_current: false };
      }
      const startYear  = e.start_date_year  ?? 0;
      const startMonth = e.start_date_month ?? 1;
      const endYear    = e.end_date_year    ?? 0;
      const endMonth   = e.end_date_month   ?? 1;
      return {
        title:                e.title ?? null,
        company_name:         e.company_name ?? null,
        company_linkedin_url: e.linkedin_url ?? null,
        logo_url:             e.logo_url ?? null,
        domain:               e.domain ?? null,
        description:          e.summary ?? null,
        is_current:           e.is_current ?? false,
        start_date:           startYear > 0 ? `${startYear}-${String(startMonth).padStart(2, "0")}` : null,
        end_date:             (!e.is_current && endYear > 0) ? `${endYear}-${String(endMonth).padStart(2, "0")}` : null,
        department:           null,
        locality:             e.locality ?? null,
      };
    });
 
    // ── Education ──────────────────────────────────────────────────────────
    const education = (p.education ?? []).map((e: any) => {
      if (typeof e === "string") {
        const match = e.match(/^(.+?) at (.+?) in (.+)$/);
        return match ? { degree: match[1], school: match[2], start: null, end: null, major: null } : { degree: e, school: null, start: null, end: null, major: null };
      }
      return {
        school: e.school_name ?? null,
        degree: e.degree ?? null,
        major:  e.field_of_study ?? null,
        start:  e.start_date_year ? parseInt(String(e.start_date_year)) : null,
        end:    e.end_date_year   ? parseInt(String(e.end_date_year))   : null,
      };
    });
 
    // ── Contact info ───────────────────────────────────────────────────────
    const contactInfo  = p.contact_info ?? {};
    const availability = p.contact_availability ?? {};
 
    // Build allEmails if reveal_info=true was used (contact_info populated)
    const allEmails = [
      ...(contactInfo.work_emails ?? []).map((email: string) => ({
        email, type: "professional", grade: null, smtp_valid: null,
        source: "contactout_search", is_primary: false,
      })),
      ...(contactInfo.personal_emails ?? []).map((email: string) => ({
        email, type: "personal", grade: null, smtp_valid: null,
        source: "contactout_search", is_primary: false,
      })),
    ];
    if (allEmails.length) allEmails[0].is_primary = true;
 
    const allPhones = (contactInfo.phones ?? []).map((num: string) => ({
      number: num, type: "unknown", validity: "unknown",
      recommended: true, premium: false, source: "contactout_search",
    }));
 
    const isRevealed = allEmails.length > 0 || allPhones.length > 0;
 
    // ── Teaser — built from contact_availability ───────────────────────────
    // ContactOut returns domains in emails (e.g. "gmail.com", "accenture.com")
    // These are in contact_info.emails ONLY if reveal_info=true was used
    // Otherwise we show availability flags as teaser
    const teaserProfEmails: string[] = availability.work_email
      ? (contactInfo.work_emails?.length ? contactInfo.work_emails : ["work email available"])
      : [];
    const teaserPersonalEmails: string[] = availability.personal_email
      ? (contactInfo.personal_emails?.length ? contactInfo.personal_emails : ["personal email available"])
      : [];
    const teaserPhones = availability.phone
      ? (contactInfo.phones?.length
          ? contactInfo.phones.map((n: string) => ({ number: n, is_premium: false }))
          : [{ number: "phone available", is_premium: false }])
      : [];
 
    // ── Extra CO data stored separately ───────────────────────────────────
    const coData = {
      seniority:       p.seniority        ?? null,
      jobFunction:     p.job_function     ?? null,
      workStatus:      p.work_status      ?? null,
      certifications:  p.certifications   ?? [],
      publications:    p.publications     ?? [],
      projects:        p.projects         ?? [],
      languages:       p.languages        ?? [],
      headline:        p.headline         ?? null,
      summary:         p.summary          ?? null,
      companyData:     p.company          ?? null,
      contactAvailability: availability,
      followers:       p.followers        ?? null,
      updatedAt:       p.updated_at       ?? null,
    };
 
    return {
      id:                Math.abs(idHash),
      name:              p.full_name              ?? null,
      status:            "complete" as const,
      profile_pic:       p.profile_picture_url    || undefined,
      linkedin_url:      linkedinUrl,
      current_title:     p.title                  ?? null,
      current_employer:  p.company?.name          ?? null,
      current_employer_domain:       p.company?.domain              ?? null,
      current_employer_website:      p.company?.website             ?? null,
      current_employer_linkedin_url: p.company?.url                 ?? null,
      current_employer_industry:     p.company?.industry ?? p.industry ?? null,
      location:   p.location ?? null,
      city:       null,
      region:     null,
      country:    p.country  ?? null,
      country_code: null,
      connections: typeof p.followers === "number" ? p.followers : null,
      skills:      p.skills  ?? null,
 
      teaser: {
        professional_emails: teaserProfEmails,
        personal_emails:     teaserPersonalEmails,
        emails:              [...teaserProfEmails, ...teaserPersonalEmails],
        phones:              teaserPhones,
        is_premium_phone_available: false,
      },
 
      // Pre-enriched only if contact_info was populated (reveal_info=true in search)
      _enriched:    isRevealed || undefined,
      _allEmails:   allEmails.length  ? allEmails  : undefined,
      _allPhones:   allPhones.length  ? allPhones  : undefined,
      _jobHistory:  jobHistory.length ? jobHistory : undefined,
      _education:   education.length  ? education  : undefined,
      _skills:      p.skills ?? undefined,
 
      // !! CRITICAL: marks this as ContactOut so reveal calls contactout-enrich
      _provider:   "contactout",
 
      // All extra ContactOut-specific data
      _coData:      coData,
    } as RRProfile;
  });
}

// ── Query builder ─────────────────────────────────────────────────────────────
function buildRRQuery(opts: UseRRSearchOptions): Record<string, unknown> {
  const q: Record<string, unknown> = {};
  if (opts.name?.trim())             q.name             = opts.name.trim().split(",").map(s => s.trim()).filter(Boolean);
  if (opts.titles.length)            q.current_title    = opts.titles;
  if (opts.locations.length)         q.location         = opts.locations;
  if (opts.currentEmployer.length)   q.current_employer = opts.currentEmployer;
  if (opts.keyword?.trim())          q.keyword          = opts.keyword.trim();
  if (opts.managementLevels.length)  q.management_levels = opts.managementLevels;
  if (opts.department?.trim())       q.department       = opts.department.trim().split(",").map(s => s.trim()).filter(Boolean);
  if (opts.companyIndustry?.trim())  q.company_industry = opts.companyIndustry.trim().split(",").map(s => s.trim()).filter(Boolean);
  if (opts.companySize?.trim())      q.company_size     = opts.companySize.trim().split(",").map(s => s.trim()).filter(Boolean);

  const mustChips    = opts.skillChips.filter(c => c.mode === "must").map(c => c.label);
  const niceChips    = opts.skillChips.filter(c => c.mode === "nice").map(c => c.label);
  const excludeChips = opts.skillChips.filter(c => c.mode === "exclude").map(c => `-${c.label}`);
  if (mustChips.length)  q.all_skills = mustChips;
  const skillArr = [...niceChips, ...excludeChips];
  if (skillArr.length)   q.skills = skillArr;

  return q;
}

function buildCOQuery(opts: UseRRSearchOptions): Record<string, unknown> {
  const q: Record<string, unknown> = {};
 
  if (opts.name?.trim())             q.name           = opts.name.trim();
  if (opts.titles.length)            q.job_title      = opts.titles;
  if (opts.locations.length)         q.location       = opts.locations;
  if (opts.currentEmployer.length)   q.company        = opts.currentEmployer;
  if (opts.keyword?.trim())          q.keyword        = opts.keyword.trim();
 
  // Seniority — ContactOut needs lowercase
  if (opts.managementLevels.length)  q.seniority      = opts.managementLevels.map(l => l.toLowerCase());
 
  if (opts.companyIndustry?.trim())
    q.industry = opts.companyIndustry.trim().split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
 
  if (opts.companySize?.trim())
    q.company_size = opts.companySize.trim().split(",").map(s => s.trim()).filter(Boolean);
 
  if (opts.department?.trim())
    q.job_function = [opts.department.trim().toLowerCase()];
 
  // ── Skills — ContactOut boolean format ────────────────────────────────────
  // ContactOut accepts: { "skills": ["(React AND Java) NOT MongoDB"] }
  // Rules:
  //   • Always wrap AND/OR groups in parentheses
  //   • NOT must be at the top level or parenthesized
  //   • Multiple skills of same type joined with AND (must) or OR (nice)
  //
  const skillChips = opts.skillChips;
  if (skillChips.length) {
    const must    = skillChips.filter(c => c.mode === "must").map(c => c.label);
    const nice    = skillChips.filter(c => c.mode === "nice").map(c => c.label);
    const exclude = skillChips.filter(c => c.mode === "exclude").map(c => c.label);
 
    // Build the boolean expression:
    // must skills → joined with AND → wrapped in ()
    // nice skills → joined with OR  → wrapped in ()
    // exclude     → prefixed with NOT → each wrapped in ()
    const parts: string[] = [];
 
    if (must.length === 1)
      parts.push(must[0]);
    else if (must.length > 1)
      parts.push(`(${must.join(" AND ")})`);
 
    if (nice.length === 1)
      parts.push(nice[0]);
    else if (nice.length > 1)
      parts.push(`(${nice.join(" OR ")})`);
 
    if (exclude.length) {
      // ContactOut NOT: "expr NOT (a OR b)"
      if (exclude.length === 1)
        parts.push(`NOT ${exclude[0]}`);
      else
        parts.push(`NOT (${exclude.join(" OR ")})`);
    }
 
    if (parts.length > 0) {
      // Combine: must AND nice NOT excludes
      let skillExpr = "";
      const positiveParts = parts.filter(p => !p.startsWith("NOT "));
      const negativeParts = parts.filter(p => p.startsWith("NOT "));
 
      if (positiveParts.length === 1)
        skillExpr = positiveParts[0];
      else if (positiveParts.length > 1)
        skillExpr = `(${positiveParts.join(" AND ")})`;
 
      if (negativeParts.length > 0) {
        skillExpr = skillExpr
          ? `(${skillExpr}) ${negativeParts.join(" ")}`
          : negativeParts.join(" ");
      }
 
      if (skillExpr.trim()) q.skills = [skillExpr.trim()];
    }
  }
 
  q.detailed_experience = true;
  q.detailed_education  = true;
  q.data_types          = ["personal_email", "work_email", "phone"];
 
  return q;
}

const classifyError = (statusCode: number, message: string): RRSearchError => {
  if (statusCode === 401 || statusCode === 403)
    return { type: "auth", message: "Invalid API key — check secrets in Supabase.", statusCode };
  if (statusCode === 429)
    return { type: "rateLimit", message: "Rate limit reached. Wait a few minutes.", statusCode };
  if (statusCode === 422)
    return { type: "invalid", message: "Invalid search parameters.", statusCode };
  return { type: "unknown", message: message || "Edge function error.", statusCode };
};

export function useRRSearch(opts: UseRRSearchOptions): UseRRSearchReturn {
  const [state,        setState]        = useState<RRSearchState>("idle");
  const [profiles,     setProfiles]     = useState<RRProfile[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [currentPage,  setCurrentPage]  = useState(opts.initialPage ?? 1);
  const [error,        setError]        = useState<RRSearchError | null>(null);

  const lastOpts = useRef(opts);
  const provider = opts.provider ?? "rocketreach";

  const search = useCallback(async (page = 1) => {
    if (page === 1) lastOpts.current = opts;
    const f = lastOpts.current;

    setState("loading");
    setError(null);

    try {
      let data: any;
      let fnError: any;

      if (provider === "contactout") {
        const query = buildCOQuery(f);
        ({ data, error: fnError } = await supabase.functions.invoke("contactout-search", {
          body: { query, page, page_size: f.pageSize },
        }));
      } else {
        const query = buildRRQuery(f);
        ({ data, error: fnError } = await supabase.functions.invoke("rocketreach-search", {
          body: { query, order_by: f.orderBy, page_size: f.pageSize, start: (page - 1) * f.pageSize + 1 },
        }));
      }

      if (fnError) {
        let statusCode = 500;
        let message = fnError.message || "Edge function error";
        try {
          const ctx = (fnError as any).context;
          if (ctx) {
            statusCode = ctx.status ?? 500;
            const body = await ctx.json().catch(() => ({}));
            message = body?.error || message;
          }
        } catch { /* ignore */ }
        setError(classifyError(statusCode, message));
        setState("error");
        return;
      }

      let resultProfiles: RRProfile[];
      let total: number;

      if (provider === "contactout") {
        // ContactOut returns object keyed by LinkedIn URL
        resultProfiles = normalizeContactOut(data?.profiles ?? {});
        total = data?.metadata?.total_results ?? resultProfiles.length;
      } else {
        resultProfiles = Array.isArray(data) ? data : data?.profiles ?? [];
        total = data?.pagination?.total ?? resultProfiles.length;
      }

      setProfiles(resultProfiles);
      setTotalEntries(total);
      setCurrentPage(page);
      setState(resultProfiles.length > 0 ? "results" : "empty");

    } catch (err) {
      setError({ type: "unknown", message: err instanceof Error ? err.message : "Unexpected error." });
      setState("error");
    }
  }, [
    opts.name, JSON.stringify(opts.titles), JSON.stringify(opts.locations),
    JSON.stringify(opts.currentEmployer), opts.keyword,
    JSON.stringify(opts.skillChips), JSON.stringify(opts.managementLevels),
    opts.department, opts.companyIndustry, opts.companySize,
    opts.orderBy, opts.pageSize, provider,
  ]);

  const loadMore = useCallback(() => search(currentPage + 1), [search, currentPage]);
  const loadPrev = useCallback(() => { if (currentPage > 1) search(currentPage - 1); }, [search, currentPage]);
  const reset    = useCallback(() => {
    setState("idle"); setProfiles([]); setTotalEntries(0); setCurrentPage(1); setError(null);
  }, []);

  return { state, profiles, totalEntries, currentPage, error, search, loadMore, loadPrev, reset };
}