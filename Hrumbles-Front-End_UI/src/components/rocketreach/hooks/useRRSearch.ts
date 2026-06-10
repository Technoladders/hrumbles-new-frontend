// hooks/useRRSearch.ts — v7
//
// Changes from v6:
//   CO path only — RocketReach path is UNCHANGED.
//   1. Calls `contactout-search-v1` instead of `contactout-search`.
//   2. previousEmployer fix: CO has no `past_company` param.
//      Maps to `company` + `company_filter: "past"` instead.
//   3. previousTitle fix: CO has no `past_job_title` param.
//      Merges into `job_title` and forces `current_titles_only: false`.
//   4. New params forwarded to CO API:
//      matchExperience, currentTitlesOnly, includeRelatedJobTitles,
//      companyFilter (tab), excludeJobTitles, excludeCompanies,
//      excludeCompaniesFilter, domain, locationRadius, currentWorkLocation,
//      pastWorkLocation, languages.
//   5. match_experience conflict: when set, current_titles_only and
//      company_filter are OMITTED (CO API returns error otherwise).

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RRFilters } from "../RRSearchSidebar";
import type { RRProfile } from "../types";

// ─── Credit error type ────────────────────────────────────────────────────────
export interface CreditError {
  code:      "INSUFFICIENT_CREDITS";
  message:   string;
  required:  number;
  available: number;
}

// ─── ContactOut accepted seniority values ─────────────────────────────────────
const SENIORITY_MAP: Record<string, string> = {
  "Owner / Founder":        "Owner / Founder",
  "Founder/Owner":          "Owner / Founder",
  "CXO":                    "CXO",
  "C-Level":                "CXO",
  "Partner":                "Partner",
  "VP":                     "VP",
  "Vice President":         "VP",
  "Head":                   "Head",
  "Director":               "Director",
  "Manager":                "Manager",
  "Senior":                 "Senior",
  "Entry":                  "Entry",
  "Individual Contributor": "Entry",
  "Intern":                 "Intern",
};

const JOB_FUNCTION_MAP: Record<string, string> = {
  "Software Development":    "engineering",
  "Web Development":         "engineering",
  "Data Science":            "data science",
  "Product Management":      "product management",
  "Information Technology":  "information technology",
  "DevOps":                  "engineering",
  "Information Security":    "information technology",
  "Quality Assurance":       "engineering",
  "Artificial Intelligence / Machine Learning": "data science",
  "Digital Transformation":  "information technology",
  "Project Engineering":     "engineering",
  "Network Operations":      "information technology",
  "Systems Administration":  "information technology",
  "Mechanical Engineering":  "engineering",
  "Electrical Engineering":  "engineering",
  "Graphic Design":          "design",
  "Product Design":          "design",
  "Web Design":              "design",
  "Business Development":    "business development",
  "Customer Success":        "customer success",
  "Account Management":      "sales",
  "Inside Sales":            "sales",
  "Channel Sales":           "sales",
  "Sales Operations":        "sales",
  "Sales Enablement":        "sales",
  "Digital Marketing":       "marketing",
  "Content Marketing":       "marketing",
  "Product Marketing":       "marketing",
  "Brand Management":        "marketing",
  "Public Relations (PR)":   "marketing",
  "Event Marketing":         "marketing",
  "Advertising":             "marketing",
  "Customer Experience":     "customer success",
  "Demand Generation":       "marketing",
  "Search Engine Optimization (SEO)": "marketing",
  "Social Media Marketing":  "marketing",
  "Accounting":              "finance",
  "Tax":                     "finance",
  "Investment Management":   "finance",
  "Financial Planning & Analysis": "finance",
  "Risk":                    "finance",
  "Financial Reporting":     "finance",
  "Investor Relations":      "finance",
  "Financial Strategy":      "finance",
  "Internal Audit & Control": "finance",
  "Recruiting":              "human resources",
  "Compensation & Benefits": "human resources",
  "Learning & Development":  "human resources",
  "Diversity & Inclusion":   "human resources",
  "Employee & Labor Relations": "human resources",
  "Talent Management":       "human resources",
  "Logistics":               "operations",
  "Project Management":      "operations",
  "Customer Service / Support": "customer success",
  "Call Center":             "customer success",
  "Corporate Strategy":      "operations",
  "Facilities Management":   "operations",
  "Quality Management":      "operations",
  "Supply Chain":            "operations",
  "Manufacturing":           "operations",
  "Legal Counsel":           "legal",
  "Compliance":              "legal",
  "Contracts":               "legal",
  "Corporate Secretary":     "legal",
  "Litigation":              "legal",
  "Doctor":                  "medical",
  "Nursing":                 "medical",
  "Therapy":                 "medical",
  "Dental":                  "medical",
  "Administration":          "education",
  "Professor":               "education",
  "Teacher":                 "education",
  "Researcher":              "research",
};

function toYearsArray(val: string): string[] {
  if (!val) return [];
  return [val];
}

function stableIdFromUrl(url: string): number {
  let h = 5381;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) + h) ^ url.charCodeAt(i);
    h = h >>> 0;
  }
  return (h % 500_000_000) + 1_000_000_000;
}

function normalizeCOProfile(linkedinUrl: string, p: any): RRProfile {
  const exp: any[]       = Array.isArray(p.experience)     ? p.experience     : [];
  const edu: any[]       = Array.isArray(p.education)      ? p.education      : [];
  const skills: string[] = Array.isArray(p.skills)         ? p.skills.filter(Boolean) : [];
  const certs: any[]     = Array.isArray(p.certifications) ? p.certifications : [];

  const jobHistory = exp.map((e: any) => ({
    title:        e.title        ?? "",
    company_name: e.company_name ?? "",
    company:      e.company_name ?? "",
    is_current:   !!e.is_current,
    start_date:   e.start_date_year
      ? `${e.start_date_year}-${String(e.start_date_month ?? 1).padStart(2, "0")}-01`
      : undefined,
    end_date: (!e.is_current && e.end_date_year)
      ? `${e.end_date_year}-${String(e.end_date_month ?? 12).padStart(2, "0")}-01`
      : undefined,
    linkedin_url: e.linkedin_url ?? null,
    logo_url:     e.logo_url    ?? null,
    domain:       e.domain      ?? null,
    period: e.is_current
      ? `${e.start_date_year ?? ""} - now`
      : `${e.start_date_year ?? ""} - ${e.end_date_year ?? ""}`,
  }));

  const education = edu.map((e: any) => ({
    institution: e.school_name    ?? "",
    school:      e.school_name    ?? "",
    degree:      e.degree         ?? "",
    field:       e.field_of_study ?? "",
    major:       e.field_of_study ?? "",
    period: (e.start_date_year || e.end_date_year)
      ? `${e.start_date_year ?? ""} - ${e.end_date_year ?? ""}`
      : "",
  }));

  const currentExp  = exp.find(e => e.is_current) ?? exp[0] ?? null;
  const companyInfo = p.company ?? {};
  const ca = p.contact_availability ?? {};
  const ci = p.contact_info         ?? {};

  const allEmails = [
    ...(ci.personal_emails ?? []).map((e: string) => ({ email: e, type: "personal", smtp_valid: "valid" })),
    ...(ci.work_emails     ?? []).map((e: string) => ({ email: e, type: "work",     smtp_valid: "valid" })),
    ...(ci.emails          ?? []).map((e: string) => ({ email: e, type: "unknown",  smtp_valid: "valid" })),
  ].filter(e => e.email?.includes("@"));

  const allPhones = (ci.phones ?? []).map((ph: any) => ({
    number:      typeof ph === "string" ? ph : ph?.number ?? "",
    recommended: true,
  })).filter((ph: any) => ph.number);

  return {
    id:                      stableIdFromUrl(linkedinUrl),
    status:                  "complete",
    name:                    p.full_name ?? "",
    current_title:           p.title ?? p.headline ?? currentExp?.title ?? "",
    current_employer:        currentExp?.company_name ?? companyInfo.name ?? "",
    current_employer_domain: companyInfo.domain   ?? null,
    current_employer_website:companyInfo.website  ?? null,
    location:                p.location ?? "",
    country_code:            p.country  ?? "",
    linkedin_url:            linkedinUrl ?? null,
    profile_pic:             p.profile_picture_url ?? null,
    connections:             p.followers ?? null,
    update_time:             p.updated_at ?? null,
    teaser: {
      emails:              ca.work_email || ca.personal_email ? ["available"] : [],
      personal_emails:     ca.personal_email ? ["available"] : [],
      professional_emails: ca.work_email    ? ["available"] : [],
      phones:              ca.phone ? [{ number: "available", is_premium: false }] : [],
      is_premium_phone_available: ca.phone ?? false,
    },
    _jobHistory:     jobHistory,
    _education:      education,
    _skills:         skills,
    _allEmails:      allEmails,
    _allPhones:      allPhones,
    _enriched:       allEmails.length > 0 || allPhones.length > 0,
    _is_cached:      true,
    _needs_rescrape: false,
    _provider:       "contactout",
    _coData: {
      seniority:           p.seniority    ?? null,
      jobFunction:         p.job_function ?? null,
      workStatus:          p.work_status  ?? null,
      certifications:      certs,
      summary:             p.summary  ?? null,
      headline:            p.headline ?? null,
      followers:           p.followers ?? null,
      contactAvailability: ca,
    },
  } as unknown as RRProfile;
}

function isValidLinkedInUrl(url?: string): boolean {
  if (!url?.trim()) return false;
  return /linkedin\.com\/in\//i.test(url.trim());
}

// ─── Hook types ───────────────────────────────────────────────────────────────
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
  creditError:  CreditError | null;
  search:       (page?: number) => Promise<void>;
  reset:        () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useRRSearch(opts: UseRRSearchOpts): UseRRSearchReturn {
  const [state,        setState]        = useState<UseRRSearchReturn["state"]>("idle");
  const [profiles,     setProfiles]     = useState<RRProfile[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [error,        setError]        = useState<string | null>(null);
  const [creditError,  setCreditError]  = useState<CreditError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (page = 1) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState("loading");
    setError(null);
    setCreditError(null);

    const pageSize = opts.pageSize ?? 10;
    const provider = opts.provider ?? "contactout";

    let userId: string | undefined;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    } catch { /* silent */ }

    // ══════════════════════════════════════════════════════════════════════════
    //  ContactOut path
    // ══════════════════════════════════════════════════════════════════════════
    if (provider === "contactout") {

      // ── LinkedIn URL enrich branch (unchanged from v6) ─────────────────────
      if (isValidLinkedInUrl(opts.linkedinUrl)) {
        try {
          const { data, error: fnErr } = await supabase.functions.invoke(
            "contactout-enrich-profile",
            { body: { linkedinUrl: opts.linkedinUrl!.trim(), organizationId: opts.organizationId ?? undefined, userId } }
          );
          if (fnErr) {
            const errBody = (fnErr as any)?.context ?? {};
            if (errBody?.code === "INSUFFICIENT_CREDITS" || fnErr.message?.includes("402")) {
              const ce: CreditError = { code: "INSUFFICIENT_CREDITS", message: errBody.message ?? "Insufficient credits.", required: errBody.required ?? 1, available: errBody.available ?? 0 };
              setCreditError(ce); setError(ce.message); setState("error"); return;
            }
            throw new Error(fnErr.message);
          }
          if (data?.code === "INSUFFICIENT_CREDITS") {
            const ce: CreditError = { code: "INSUFFICIENT_CREDITS", message: data.message ?? "Insufficient credits.", required: data.required ?? 1, available: data.available ?? 0 };
            setCreditError(ce); setError(ce.message); setState("error"); return;
          }
          if (!data) throw new Error("No response from enrich");
          const profilesObj: Record<string, any> = data.profiles ?? {};
          const entries = Object.entries(profilesObj);
          if (!entries.length) { setState("empty"); setProfiles([]); setTotalEntries(0); return; }
          setState("results");
          setProfiles(entries.map(([url, p]) => normalizeCOProfile(url, p)));
          setTotalEntries(1);
        } catch (e: any) {
          if (e.name === "AbortError") return;
          console.error("[contactout-enrich-profile] error:", e);
          setError(e.message ?? "Enrich failed");
          setState("error");
        }
        return;
      }

      // ── Normal contactout-search-v1 branch ────────────────────────────────
      const query: Record<string, any> = {};
      const matchExpSet = !!opts.matchExperience;

      // ── TITLE ──────────────────────────────────────────────────────────────
      // Fix: CO has no past_job_title. Merge previousTitle into job_title
      // and force current_titles_only=false so past titles are searched too.
      const allTitles = [
        ...(opts.titles        ?? []),
        ...(opts.previousTitle ?? []),  // merged here to fix previous title search
      ];
      if (allTitles.length) {
        query.job_title = allTitles.length === 1
          ? [allTitles[0]]
          : [`(${allTitles.join(" OR ")})`];
      }

      if (opts.excludeJobTitles?.length) {
        query.exclude_job_titles = opts.excludeJobTitles;
      }
      if (opts.includeRelatedJobTitles) {
        query.include_related_job_titles = true;
      }

      // CO API: if match_experience is set → MUST NOT include current_titles_only or company_filter
      if (matchExpSet) {
        query.match_experience = opts.matchExperience;
      } else {
        // Force false when previous titles are present (they need past search)
        const hasPastTitles = !!(opts.previousTitle?.length);
        const ctOnly = hasPastTitles ? false : (opts.currentTitlesOnly ?? true);
        if (!ctOnly) query.current_titles_only = false;
      }

      // ── COMPANY ────────────────────────────────────────────────────────────
      // Fix: CO has no past_company param. Use company + company_filter: "past".
      // companyFilter = the UI tab: "current" | "past" | "both"
      // previousEmployer (Role Details) also contributes as past companies.
      const companyMode = opts.companyFilter ?? "current";
      const hasCurrent  = !!(opts.currentEmployer?.length);
      const hasPastEmp  = !!(opts.previousEmployer?.length);

      if (hasCurrent && hasPastEmp) {
        // Both T&C company AND Role Details previousEmployer → merge, use "both"
        query.company = [...opts.currentEmployer!, ...opts.previousEmployer!];
        if (!matchExpSet) query.company_filter = "both";
      } else if (hasCurrent) {
        query.company = opts.currentEmployer;
        if (!matchExpSet) query.company_filter = companyMode;
      } else if (hasPastEmp) {
        // Only Role Details previous employer → map as past
        query.company = opts.previousEmployer;
        if (!matchExpSet) query.company_filter = "past"; // Fix: was past_company (invalid CO param)
      }

      if (opts.excludeCompanies?.length) {
        query.exclude_companies        = opts.excludeCompanies;
        query.exclude_companies_filter = opts.excludeCompaniesFilter ?? "both";
      }
      if (opts.domain?.length) {
        query.domain = opts.domain;
      }

      // ── SKILLS (CO path) ───────────────────────────────────────────────────
      // CO API boolean expression in query.skills:
      //   must → AND block (ALL required)
      //   nice → OR block  (AT LEAST ONE required; more matches rank higher)
      //   excl → NOT block
      // e.g. node(must)+react(nice)+python(nice) → ["node AND (react OR python)"]
      if (opts.skillChips?.length) {
        const must    = opts.skillChips.filter(c => c.mode === "must").map(c => c.label);
        const nice    = opts.skillChips.filter(c => c.mode === "nice").map(c => c.label);
        const exclude = opts.skillChips.filter(c => c.mode === "exclude").map(c => c.label);
        const parts: string[] = [];
        if (must.length === 1)   parts.push(must[0]);
        else if (must.length > 1) parts.push(`(${must.join(" AND ")})`);
        if (nice.length === 1)   parts.push(nice[0]);
        else if (nice.length > 1) parts.push(`(${nice.join(" OR ")})`);
        let expr = parts.join(" AND ");
        if (exclude.length === 1)  expr = (expr ? `${expr} NOT ` : "NOT ") + exclude[0];
        else if (exclude.length > 1) expr = (expr ? `${expr} NOT ` : "NOT ") + `(${exclude.join(" OR ")})`;
        if (expr) query.skills = [expr];
      }

      // ── SENIORITY / JOB FUNCTION ───────────────────────────────────────────
      if (opts.managementLevels?.length) {
        const seniorityParam = [...new Set(
          opts.managementLevels.map(s => SENIORITY_MAP[s] ?? null).filter(Boolean) as string[]
        )];
        if (seniorityParam.length) query.seniority = seniorityParam;
      }
      if (opts.department?.length) {
        const jobFunctionParam = [...new Set(
          opts.department.map(d => JOB_FUNCTION_MAP[d] ?? d.toLowerCase()).filter(Boolean)
        )];
        if (jobFunctionParam.length) query.job_function = jobFunctionParam;
      }

      // ── LOCATION ───────────────────────────────────────────────────────────
      if (opts.name?.trim())                query.name                  = opts.name.trim();
      if (opts.locations?.length)           query.location              = opts.locations;
      if (opts.locationRadius)              query.location_radius       = Number(opts.locationRadius);
      if (opts.currentWorkLocation?.length) query.current_work_location = opts.currentWorkLocation;
      if (opts.pastWorkLocation?.length)    query.past_work_location    = opts.pastWorkLocation;

      // ── EXPERIENCE / FILTERS ───────────────────────────────────────────────
      if (opts.yearsExperience)             query.years_of_experience   = toYearsArray(opts.yearsExperience);
      if (opts.yearsInCurrentRole)          query.years_in_current_role = toYearsArray(opts.yearsInCurrentRole);
      if (opts.companySize?.length)         query.company_size          = opts.companySize;
      if (opts.companyIndustry?.length)     query.industry              = opts.companyIndustry;
      if (opts.openToWork)                  query.keyword               = query.keyword ? `${query.keyword} open to work` : "open to work";
      if (opts.keyword?.trim())             query.keyword               = opts.keyword.trim();

      // Education
      if (opts.school?.length)  query.education = opts.school;
      if (opts.degree?.length)  query.education = [...(query.education ?? []), ...opts.degree];

      // Contact method → data_types
      if (opts.contactMethod?.length) {
        const dataTypes: string[] = [];
        opts.contactMethod.forEach(m => {
          if (m === "work email" || m === "personal email") dataTypes.push(m.replace(" ", "_"));
          if (m === "phone" || m === "mobile") dataTypes.push("phone");
        });
        if (dataTypes.length) query.data_types = [...new Set(dataTypes)];
      }

      // ── LANGUAGES (new in v7) ──────────────────────────────────────────────
      if (opts.languages?.length) {
        const validLangs = opts.languages.filter(l => l.language.trim());
        if (validLangs.length) {
          query.languages = validLangs.map(l => ({
            language: l.language.toLowerCase().trim(),
            ...(l.proficiency.length ? { proficiency: l.proficiency } : {}),
          }));
        }
      }

      const body = {
        query,
        page,
        page_size:      pageSize,
        organizationId: opts.organizationId ?? undefined,
        userId,
      };

      console.log("[co-search-v1] query:", JSON.stringify(query, null, 2));

      try {
        const { data, error: fnErr } = await supabase.functions.invoke("contactout-search-v1", { body });

        if (fnErr) {
          const errBody = (fnErr as any)?.context ?? {};
          if (errBody?.code === "INSUFFICIENT_CREDITS" || fnErr.message?.includes("402")) {
            const ce: CreditError = { code: "INSUFFICIENT_CREDITS", message: errBody.message ?? "Insufficient credits to perform this search.", required: errBody.required ?? 0, available: errBody.available ?? 0 };
            setCreditError(ce); setError(ce.message); setState("error"); return;
          }
          throw new Error(fnErr.message);
        }
        if (data?.code === "INSUFFICIENT_CREDITS") {
          const ce: CreditError = { code: "INSUFFICIENT_CREDITS", message: data.message ?? "Insufficient credits.", required: data.required ?? 0, available: data.available ?? 0 };
          setCreditError(ce); setError(ce.message); setState("error"); return;
        }
        if (!data) throw new Error("No response from search");

        const profilesObj: Record<string, any> = data.profiles ?? {};
        const total = data.metadata?.total_results ?? data.pagination?.total ?? data.total ?? 0;

        let rawProfiles: RRProfile[];
        if (Array.isArray(profilesObj)) {
          rawProfiles = [];
        } else {
          rawProfiles = Object.entries(profilesObj).map(
            ([linkedinUrl, p]: [string, any]) => normalizeCOProfile(linkedinUrl, p)
          );
        }

        if (!rawProfiles.length) { setState("empty"); setProfiles([]); setTotalEntries(0); return; }

        // Client-side skill exclude filter (safety net)
        const excluded = new Set(
          (opts.skillChips ?? []).filter(c => c.mode === "exclude").map(c => c.label.toLowerCase())
        );
        const filtered = excluded.size
          ? rawProfiles.filter(p => {
              const ps = new Set((p._skills ?? []).map((s: string) => s.toLowerCase()));
              return ![...excluded].some(ex => ps.has(ex));
            })
          : rawProfiles;

        setState("results"); setProfiles(filtered); setTotalEntries(total);
      } catch (e: any) {
        if (e.name === "AbortError") return;
        console.error("[co-search-v1] error:", e);
        setError(e.message ?? "Search failed");
        setState("error");
      }
      return;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  RocketReach path — UNCHANGED from v6
    // ══════════════════════════════════════════════════════════════════════════
    const start = (page - 1) * pageSize + 1;
    const query: Record<string, any> = {};

    if (opts.titles?.length)           query.current_title          = opts.titles;
    if (opts.locations?.length)        query.location               = opts.locations;
    if (opts.managementLevels?.length) query.management_levels      = opts.managementLevels;
    if (opts.name?.trim())             query.name                   = [opts.name.trim()];
    if (opts.skillChips?.length) {
      // RR path: skills as plain array (RR API uses AND logic natively)
      // must chips → required skills; nice → optional (sent as desired_skills if present)
      const must = opts.skillChips.filter(c => c.mode === "must").map(c => c.label);
      const nice = opts.skillChips.filter(c => c.mode === "nice").map(c => c.label);
      if (must.length)        query.current_title_skills  = must;   // RR required skills
      if (nice.length)        query.desired_skills        = nice;   // RR optional skills
    }
    if (opts.currentEmployer?.length)   query.current_employer           = opts.currentEmployer;
    if (opts.companySize?.length)       query.company_size               = opts.companySize;
    if (opts.companyIndustry?.length)   query.company_industry           = opts.companyIndustry;
    if (opts.companyRevenue)            query.company_revenue            = [opts.companyRevenue];
    if (opts.companyPubliclyTraded)     query.company_publicly_traded    = ["true"];
    if (opts.companyFundingMin)         query.company_funding_min        = [opts.companyFundingMin];
    if (opts.companyFundingMax)         query.company_funding_max        = [opts.companyFundingMax];
    if (opts.companyTags?.length)       query.company_tag                = opts.companyTags;
    if (opts.department?.length)        query.department                 = opts.department;
    if (opts.yearsExperience)           query.years_experience           = [opts.yearsExperience];
    if (opts.previousEmployer?.length)  query.previous_employer          = opts.previousEmployer;
    if (opts.previousTitle?.length)     query.previous_title             = opts.previousTitle;
    if (opts.school?.length)            query.school                     = opts.school;
    if (opts.degree?.length)            query.degree                     = opts.degree;
    if (opts.major?.length)             query.major                      = opts.major;
    if (opts.contactMethod?.length)     query.contact_method             = opts.contactMethod;
    if (opts.emailGrade)                query.email_grade                = opts.emailGrade;
    if (opts.jobChangeSignal)           query.job_change_signal          = [opts.jobChangeSignal];
    if (opts.newsSignal)                query.news_signal                = [opts.newsSignal];
    if (opts.jobPostingSignal)          query.company_job_posting_signal = [opts.jobPostingSignal];
    if (opts.keyword?.trim())           query.keyword                    = opts.keyword.trim();

    const body: Record<string, any> = {
      query, order_by: opts.orderBy ?? "popularity",
      page_size: pageSize, start,
      organizationId: opts.organizationId ?? undefined,
    };

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("rocketreach-search", { body });
      if (fnErr) throw new Error(fnErr.message);
      if (!data)  throw new Error("No response from search");

      const rawProfiles: RRProfile[] = data.profiles ?? [];
      const total                    = data.pagination?.total ?? 0;

      if (!rawProfiles.length) { setState("empty"); setProfiles([]); setTotalEntries(0); return; }

      const excludedSkills = new Set(
        (opts.skillChips ?? []).filter(c => c.mode === "exclude").map(c => c.label.toLowerCase())
      );
      const filtered = excludedSkills.size
        ? rawProfiles.filter(p => {
            const profileSkills = new Set((p._skills ?? []).map((s: string) => s.toLowerCase()));
            return ![...excludedSkills].some(ex => profileSkills.has(ex));
          })
        : rawProfiles;

      setState("results"); setProfiles(filtered); setTotalEntries(total);
    } catch (e: any) {
      if (e.name === "AbortError") return;
      console.error("[rocketreach-search] error:", e);
      setError(e.message ?? "Search failed");
      setState("error");
    }
  }, [
    // CO new deps
    opts.linkedinUrl, opts.matchExperience, opts.currentTitlesOnly,
    opts.includeRelatedJobTitles, opts.companyFilter,
    opts.excludeJobTitles, opts.excludeCompanies, opts.excludeCompaniesFilter,
    opts.domain, opts.locationRadius, opts.currentWorkLocation, opts.pastWorkLocation,
    opts.languages,
    // existing deps
    opts.titles, opts.locations, opts.managementLevels, opts.name,
    opts.skillChips, opts.currentEmployer, opts.companySize, opts.companyIndustry,
    opts.companyRevenue, opts.companyPubliclyTraded, opts.companyFundingMin, opts.companyFundingMax,
    opts.companyTags, opts.department, opts.yearsExperience, opts.previousEmployer, opts.previousTitle,
    opts.school, opts.degree, opts.major, opts.contactMethod, opts.emailGrade,
    opts.jobChangeSignal, opts.newsSignal, opts.jobPostingSignal, opts.keyword,
    opts.orderBy, opts.pageSize, opts.provider, opts.organizationId,
    opts.openToWork, opts.yearsInCurrentRole, opts.recentlyChangedJobs,
  ]);


  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState("idle");
    setProfiles([]);
    setTotalEntries(0);
    setError(null);
    setCreditError(null);
  }, []);

  return { state, profiles, totalEntries, error, creditError, search, reset };
}