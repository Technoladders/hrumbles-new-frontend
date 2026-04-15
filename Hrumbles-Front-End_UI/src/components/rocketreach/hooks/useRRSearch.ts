/**
 * hooks/useRRSearch.ts — v4
 *
 * FIXES:
 *   1. Skills sent as array (ContactOut accepts boolean equations in array element)
 *      e.g. skills: ["(React AND TypeScript) NOT PHP"]
 *   2. Seniority uses EXACT ContactOut accepted values (case-sensitive)
 *   3. Location sent as array (not single string)
 *   4. job_title sent as array (not joined string); supports boolean in single element
 *   5. job_function uses correct ContactOut accepted values list
 *   6. company, location — arrays (max 50)
 *   7. years_of_experience / years_in_current_role use correct range array format
 */

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RRFilters } from "../RRSearchSidebar";
import type { RRProfile } from "../types";

// ─── ContactOut accepted seniority values (EXACT, case-sensitive) ─────────────
// From API docs: "Owner / Founder", "CXO", "Partner", "VP", "Head",
//                "Director", "Manager", "Senior", "Entry", "Intern"
const SENIORITY_MAP: Record<string, string> = {
  // Sidebar label → ContactOut exact value
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

// ─── ContactOut accepted job_function values ───────────────────────────────────
// From API docs accepted values list (lowercase)
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
  "Real Estate":             "real estate",
  "Office Operations":       "operations",
  "Legal Counsel":           "legal",
  "Compliance":              "legal",
  "Contracts":               "legal",
  "Corporate Secretary":     "legal",
  "Litigation":              "legal",
  "Privacy":                 "legal",
  "Doctor":                  "medical",
  "Nursing":                 "medical",
  "Therapy":                 "medical",
  "Dental":                  "medical",
  "Fitness":                 "wellness",
  "Wellness":                "wellness",
  "Medical Administration":  "medical",
  "Medical Education & Training": "medical",
  "Medical Research":        "medical",
  "Clinical Operations":     "medical",
  "Administration":          "education",
  "Professor":               "education",
  "Teacher":                 "education",
  "Researcher":              "research",
};

// ─── ContactOut years_of_experience accepted range format ─────────────────────
// API accepts: ["6_10", "10"] meaning 6-10 years OR 10+ years
// Our sidebar sends single value like "6_10" — wrap in array
function toYearsArray(val: string): string[] {
  if (!val) return [];
  return [val];
}

// ─── ContactOut → RRProfile normalizer ────────────────────────────────────────
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
  const ca          = p.contact_availability ?? {};
  const ci          = p.contact_info         ?? {};

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
    current_title:           p.title ?? currentExp?.title ?? "",
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

// ─── Hook ─────────────────────────────────────────────────────────────────────
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
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState("loading");
    setError(null);

    const pageSize = opts.pageSize ?? 10;
    const provider = opts.provider ?? "contactout";

    // ── ContactOut ─────────────────────────────────────────────────────────────
    if (provider === "contactout") {

      // ── Skills boolean equation → array with one element ────────────────────
      // ContactOut: skills accepts boolean equations inside array elements
      // e.g. skills: ["(React AND TypeScript) NOT PHP"]
      let skillsParam: string[] | undefined;
      if (opts.skillChips?.length) {
        const must    = opts.skillChips.filter(c => c.mode === "must").map(c => c.label);
        const nice    = opts.skillChips.filter(c => c.mode === "nice").map(c => c.label);
        const exclude = opts.skillChips.filter(c => c.mode === "exclude").map(c => c.label);

        // Prefer must > nice for the positive clause
        const positive = must.length ? must : nice;

        let eq = "";
        if (positive.length === 1) {
          eq = positive[0];
        } else if (positive.length > 1) {
          // Wrap in parens so ContactOut parses correctly
          eq = `(${positive.join(" AND ")})`;
        }

        if (exclude.length > 0) {
          const excClause = exclude.length === 1
            ? exclude[0]
            : `(${exclude.join(" OR ")})`;
          eq = eq ? `${eq} NOT ${excClause}` : `NOT ${excClause}`;
        }

        if (eq) skillsParam = [eq]; // single-element array with boolean equation
      }

      // ── Job titles → array (boolean supported in single element) ────────────
      // e.g. job_title: ["Software Engineer OR Frontend Developer"]
      let jobTitleParam: string[] | undefined;
      if (opts.titles?.length) {
        if (opts.titles.length === 1) {
          jobTitleParam = [opts.titles[0]];
        } else {
          // Multiple titles → OR them in a single element, wrapped in parens
          jobTitleParam = [`(${opts.titles.join(" OR ")})`];
        }
      }

      // ── Seniority → exact ContactOut values ──────────────────────────────────
      const seniorityParam = opts.managementLevels?.length
        ? [...new Set(
            opts.managementLevels
              .map(s => SENIORITY_MAP[s] ?? null)
              .filter(Boolean) as string[]
          )]
        : undefined;

      // ── Job function → ContactOut accepted values (deduplicated) ─────────────
      const jobFunctionParam = opts.department?.length
        ? [...new Set(
            opts.department
              .map(d => JOB_FUNCTION_MAP[d] ?? d.toLowerCase())
              .filter(Boolean)
          )]
        : undefined;

      // ── Location → array (ContactOut accepts array, max 50) ──────────────────
      const locationParam = opts.locations?.length ? opts.locations : undefined;

      // ── Company → array ───────────────────────────────────────────────────────
      const companyParam = opts.currentEmployer?.length ? opts.currentEmployer : undefined;

      // ── Years of experience → array of range strings ──────────────────────────
      const yearsExpParam    = opts.yearsExperience    ? toYearsArray(opts.yearsExperience)    : undefined;
      const yearsRoleParam   = opts.yearsInCurrentRole ? toYearsArray(opts.yearsInCurrentRole) : undefined;

      // ── Build query object ────────────────────────────────────────────────────
      const query: Record<string, any> = {};

      if (opts.name?.trim())   query.name         = opts.name.trim();
      if (jobTitleParam)       query.job_title     = jobTitleParam;
      if (seniorityParam)      query.seniority     = seniorityParam;
      if (jobFunctionParam)    query.job_function  = jobFunctionParam;
      if (locationParam)       query.location      = locationParam;
      if (companyParam)        query.company       = companyParam;
      if (skillsParam)         query.skills        = skillsParam;
      if (yearsExpParam)       query.years_of_experience  = yearsExpParam;
      if (yearsRoleParam)      query.years_in_current_role = yearsRoleParam;

      // Company filters
      if (opts.companySize?.length)     query.company_size     = opts.companySize;
      if (opts.companyIndustry?.length) query.industry         = opts.companyIndustry;

      // Education
      if (opts.school?.length)  query.education = opts.school;
      if (opts.degree?.length)  query.education = [...(query.education ?? []), ...opts.degree];

      // Contact availability / open to work
      if (opts.openToWork) {
  query.keyword = query.keyword
    ? `${query.keyword} open to work`
    : "open to work";
}
      if (opts.contactMethod?.length) {
        // Map sidebar labels to ContactOut data_types
        const dataTypes: string[] = [];
        opts.contactMethod.forEach(m => {
          if (m === "work email" || m === "personal email") dataTypes.push(m.replace(" ", "_"));
          if (m === "phone" || m === "mobile") dataTypes.push("phone");
        });
        if (dataTypes.length) query.data_types = [...new Set(dataTypes)];
      }

      // Keyword
      if (opts.keyword?.trim()) query.keyword = opts.keyword.trim();

      // Past employer / title
      if (opts.previousEmployer?.length) query.past_company = opts.previousEmployer;
      if (opts.previousTitle?.length)    query.past_job_title = [`(${opts.previousTitle.join(" OR ")})`];

      const body = {
        query,
        page,
        page_size: pageSize,
        organizationId: opts.organizationId ?? undefined,
      };

      console.log("[contactout-search] query:", JSON.stringify(query, null, 2));

      try {
        const { data, error: fnErr } = await supabase.functions.invoke("contactout-search", { body });
        if (fnErr) throw new Error(fnErr.message);
        if (!data)  throw new Error("No response from search");

        const profilesObj: Record<string, any> = data.profiles ?? {};
        const total = data.metadata?.total_results ?? data.pagination?.total ?? data.total ?? 0;

        // Handle both array (empty case) and object (normal case)
        let rawProfiles: RRProfile[];
        if (Array.isArray(profilesObj)) {
          rawProfiles = [];
        } else {
          rawProfiles = Object.entries(profilesObj).map(
            ([linkedinUrl, p]: [string, any]) => normalizeCOProfile(linkedinUrl, p)
          );
        }

        if (!rawProfiles.length) {
          setState("empty");
          setProfiles([]);
          setTotalEntries(0);
          return;
        }

        // Client-side exclude-skill filter (belt-and-suspenders)
        const excluded = new Set(
          (opts.skillChips ?? [])
            .filter(c => c.mode === "exclude")
            .map(c => c.label.toLowerCase())
        );
        const filtered = excluded.size
          ? rawProfiles.filter(p => {
              const ps = new Set((p._skills ?? []).map((s: string) => s.toLowerCase()));
              return ![...excluded].some(ex => ps.has(ex));
            })
          : rawProfiles;

        setState("results");
        setProfiles(filtered);
        setTotalEntries(total);
      } catch (e: any) {
        if (e.name === "AbortError") return;
        console.error("[contactout-search] error:", e);
        setError(e.message ?? "Search failed");
        setState("error");
      }
      return;
    }

    // ── RocketReach ────────────────────────────────────────────────────────────
    const start = (page - 1) * pageSize + 1;
    const query: Record<string, any> = {};

    if (opts.titles?.length)          query.current_title     = opts.titles;
    if (opts.locations?.length)        query.location          = opts.locations;
    if (opts.managementLevels?.length) query.management_levels = opts.managementLevels;
    if (opts.name?.trim())             query.name              = [opts.name.trim()];

    if (opts.skillChips?.length) {
      const must    = opts.skillChips.filter(c => c.mode === "must").map(c => c.label);
      const nice    = opts.skillChips.filter(c => c.mode === "nice").map(c => c.label);
      if (must.length) query.all_skills = must;
      if (nice.length) query.skills     = nice;
    }

    if (opts.currentEmployer?.length)   query.current_employer       = opts.currentEmployer;
    if (opts.companySize?.length)       query.company_size           = opts.companySize;
    if (opts.companyIndustry?.length)   query.company_industry       = opts.companyIndustry;
    if (opts.companyRevenue)            query.company_revenue        = [opts.companyRevenue];
    if (opts.companyPubliclyTraded)     query.company_publicly_traded = ["true"];
    if (opts.companyFundingMin)         query.company_funding_min    = [opts.companyFundingMin];
    if (opts.companyFundingMax)         query.company_funding_max    = [opts.companyFundingMax];
    if (opts.companyTags?.length)       query.company_tag            = opts.companyTags;
    if (opts.department?.length)        query.department             = opts.department;
    if (opts.yearsExperience)           query.years_experience       = [opts.yearsExperience];
    if (opts.previousEmployer?.length)  query.previous_employer      = opts.previousEmployer;
    if (opts.previousTitle?.length)     query.previous_title         = opts.previousTitle;
    if (opts.school?.length)            query.school                 = opts.school;
    if (opts.degree?.length)            query.degree                 = opts.degree;
    if (opts.major?.length)             query.major                  = opts.major;
    if (opts.contactMethod?.length)     query.contact_method         = opts.contactMethod;
    if (opts.emailGrade)                query.email_grade            = opts.emailGrade;
    if (opts.jobChangeSignal)           query.job_change_signal      = [opts.jobChangeSignal];
    if (opts.newsSignal)                query.news_signal            = [opts.newsSignal];
    if (opts.jobPostingSignal)          query.company_job_posting_signal = [opts.jobPostingSignal];
    if (opts.keyword?.trim())           query.keyword                = opts.keyword.trim();

    const body: Record<string, any> = {
      query,
      order_by:       opts.orderBy ?? "popularity",
      page_size:      pageSize,
      start,
      organizationId: opts.organizationId ?? undefined,
    };

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("rocketreach-search", { body });
      if (fnErr) throw new Error(fnErr.message);
      if (!data)  throw new Error("No response from search");

      const rawProfiles: RRProfile[] = data.profiles ?? [];
      const total                    = data.pagination?.total ?? 0;

      if (!rawProfiles.length) {
        setState("empty");
        setProfiles([]);
        setTotalEntries(0);
        return;
      }

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
      console.error("[rocketreach-search] error:", e);
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
    opts.openToWork, opts.yearsInCurrentRole, opts.recentlyChangedJobs,
  ]);

  return { state, profiles, totalEntries, error, search };
}