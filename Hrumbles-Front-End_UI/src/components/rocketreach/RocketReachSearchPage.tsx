/**
 * RocketReachSearchPage.tsx — v5.3
 *
 * Changes from v5.2:
 *   • URL encodeState/decodeState extended for 12 new RRFilters fields.
 *   • countFilters updated to include all new fields.
 *   • runDemoSearch (demo org DB mode) now calls `search_org_profiles_v1`
 *     instead of `search_org_profiles`, passing the new params.
 *     Company tab (companyFilter) maps to p_current_employer / p_previous_employer
 *     depending on mode — no RPC schema change needed on the calling side.
 *   • tiRevealProvider and waterfallEnabled logic unchanged (CHANGE 2 from v5.2).
 *   • Demo org DB toggle unchanged (CHANGE 3 from v5.2).
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useSelector }    from "react-redux";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { cn }             from "@/lib/utils";
import { supabase }       from "@/integrations/supabase/client";
import {
  ChevronLeft, ChevronRight, Bookmark, Loader2, AlertCircle, Coins, X, Database,
} from "lucide-react";

import { RRSearchSidebar, RRFilters, DEFAULT_RR_FILTERS } from "./RRSearchSidebar";
import { RRResultsArea }    from "./RRResultsArea";
import { RRDetailPanel }    from "./RRDetailPanel";
import { IdleState, RecentSearchEntry } from "@/components/CandidateSearch/components/states/IdleState";
import { EmptyState }       from "@/components/CandidateSearch/components/states/EmptyState";
import { ErrorState }       from "@/components/CandidateSearch/components/states/ErrorState";
import { useFolders }       from "@/components/CandidateSearch/hooks/useFolders";
import { useRRSearch, CreditError }      from "./hooks/useRRSearch";
import { useRRRevealedIds } from "./hooks/useRRRevealedIds";
import { useSavedCandidatesCount } from "@/components/CandidateSearch/hooks/useSavedCandidates";
import { CandidateInviteGate }     from "@/components/CandidateSearch/components/CandidateInviteGate";
import { ManageVerificationPricingModal } from "@/components/global/OrganizationManagement/ManageVerificationPricingModal";

import type { RRProfile } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
const DEMO_ORG_ID      = "53989f03-bdc9-439a-901c-45b274eff506";
const SPLIT_PAGES      = true;
const CO_API_PAGE_SIZE = 25;
const CO_UI_PAGE_SIZE  = 13;

// ─── Types ────────────────────────────────────────────────────────────────────
type SearchProvider = "rocketreach" | "contactout";

interface PageState {
  filters:  RRFilters;
  pageSize: number;
  page:     number;
  provider: SearchProvider;
}

interface EnrichProgress {
  total:  number;
  done:   number;
  active: boolean;
}

interface InsufficientCreditsBannerProps {
  creditError:          CreditError;
  onOpenPricingModal?:  () => void;
  onDismiss:            () => void;
}

export const InsufficientCreditsBanner: React.FC<InsufficientCreditsBannerProps> = ({
  creditError, onOpenPricingModal, onDismiss,
}) => (
  <div className="mx-4 mt-3 flex items-start gap-3 p-3.5 rounded-xl border border-red-200 bg-red-50">
    <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-red-700">Insufficient Credits</p>
      <p className="text-xs text-red-600 mt-0.5">
        This search requires <strong>{creditError.required} credit(s)</strong>.
        Your current balance is <strong>{creditError.available.toFixed(2)}</strong>.
      </p>
      {onOpenPricingModal && (
        <button onClick={onOpenPricingModal}
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors">
          <Coins size={11} /> Top Up Credits
        </button>
      )}
    </div>
    <button onClick={onDismiss} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={14} /></button>
  </div>
);

// ─── URL encode / decode ──────────────────────────────────────────────────────
function encodeState(s: PageState): URLSearchParams {
  const p = new URLSearchParams();
  const f = s.filters;
  if (f.keyword.trim())              p.set("kw",   f.keyword.trim());
  if (f.name.trim())                 p.set("nm",   f.name.trim());
  if (f.titles.length)               p.set("tt",   f.titles.join("|"));
  if (f.locations.length)            p.set("loc",  f.locations.join("|"));
  if (f.managementLevels.length)     p.set("ml",   f.managementLevels.join("|"));
  if (f.skillChips.length)           p.set("sk",   JSON.stringify(f.skillChips));
  if (f.currentEmployer.length)      p.set("co",   f.currentEmployer.join("|"));
  if (f.companySize.length)          p.set("cs",   f.companySize.join("|"));
  if (f.companyIndustry.length)      p.set("ci",   f.companyIndustry.join("|"));
  if (f.companyRevenue)              p.set("cr",   f.companyRevenue);
  if (f.companyPubliclyTraded)       p.set("pt",   "1");
  if (f.companyFundingMin)           p.set("fmn",  f.companyFundingMin);
  if (f.companyFundingMax)           p.set("fmx",  f.companyFundingMax);
  if (f.companyTags.length)          p.set("ct",   f.companyTags.join("|"));
  if (f.department.length)           p.set("dp",   f.department.join("|"));
  if (f.yearsExperience)             p.set("ye",   f.yearsExperience);
  if (f.previousEmployer.length)     p.set("pe",   f.previousEmployer.join("|"));
  if (f.previousTitle.length)        p.set("ptt",  f.previousTitle.join("|"));
  if (f.school.length)               p.set("sc",   f.school.join("|"));
  if (f.degree.length)               p.set("dg",   f.degree.join("|"));
  if (f.major.length)                p.set("mj",   f.major.join("|"));
  if (f.contactMethod.length)        p.set("cm",   f.contactMethod.join("|"));
  if (f.emailGrade)                  p.set("eg",   f.emailGrade);
  if (f.jobChangeSignal)             p.set("jcs",  f.jobChangeSignal);
  if (f.newsSignal)                  p.set("ns",   f.newsSignal);
  if (f.jobPostingSignal)            p.set("jps",  f.jobPostingSignal);
  if (f.orderBy !== "popularity")    p.set("ob",   f.orderBy);
  if (f.openToWork)                  p.set("otw",  "1");
  if (f.yearsInCurrentRole)          p.set("yr",   f.yearsInCurrentRole);
  if (f.recentlyChangedJobs)         p.set("rcj",  "1");
  if (s.pageSize !== 10)             p.set("per",  String(s.pageSize));
  if (s.page > 1)                    p.set("pg",   String(s.page));
  if (s.provider !== "contactout")   p.set("pv",   s.provider);
  // ── v5.3 new fields ──
  if (f.excludeJobTitles.length)               p.set("ejt",  f.excludeJobTitles.join("|"));
  if (!f.currentTitlesOnly)                    p.set("cto",  "0");          // store only when false
  if (f.includeRelatedJobTitles)               p.set("irjt", "1");
  if (f.matchExperience)                       p.set("me",   f.matchExperience);
  if (f.companyFilter !== "current")           p.set("cf",   f.companyFilter);
  if (f.excludeCompanies.length)               p.set("exc",  f.excludeCompanies.join("|"));
  if (f.excludeCompaniesFilter !== "both")     p.set("ecf",  f.excludeCompaniesFilter);
  if (f.domain.length)                         p.set("dom",  f.domain.join("|"));
  if (f.locationRadius !== "")                 p.set("lr",   String(f.locationRadius));
  if (f.currentWorkLocation.length)            p.set("cwl",  f.currentWorkLocation.join("|"));
  if (f.pastWorkLocation.length)               p.set("pwl",  f.pastWorkLocation.join("|"));
  if (f.languages.length)                      p.set("lng",  JSON.stringify(f.languages));
  return p;
}

function decodeState(p: URLSearchParams): PageState {
  let skillChips = []; let languages = [];
  try { skillChips = JSON.parse(p.get("sk") ?? "[]"); } catch { /**/ }
  try { languages  = JSON.parse(p.get("lng") ?? "[]"); } catch { /**/ }
  const sp = (key: string) => p.get(key) ? p.get(key)!.split("|") : [];
  return {
    filters: {
      keyword:               p.get("kw")  ?? "",
      name:                  p.get("nm")  ?? "",
      titles:                sp("tt"),
      locations:             sp("loc"),
      managementLevels:      sp("ml"),
      skillChips,
      currentEmployer:       sp("co"),
      companySize:           sp("cs"),
      companyIndustry:       sp("ci"),
      companyRevenue:        p.get("cr")  ?? "",
      companyPubliclyTraded: p.get("pt") === "1",
      companyFundingMin:     p.get("fmn") ?? "",
      companyFundingMax:     p.get("fmx") ?? "",
      companyTags:           sp("ct"),
      department:            sp("dp"),
      yearsExperience:       p.get("ye")  ?? "",
      previousEmployer:      sp("pe"),
      previousTitle:         sp("ptt"),
      school:                sp("sc"),
      degree:                sp("dg"),
      major:                 sp("mj"),
      contactMethod:         sp("cm"),
      emailGrade:            p.get("eg")  ?? "",
      jobChangeSignal:       p.get("jcs") ?? "",
      newsSignal:            p.get("ns")  ?? "",
      jobPostingSignal:      p.get("jps") ?? "",
      orderBy:               (p.get("ob") as any) ?? "popularity",
      openToWork:            p.get("otw") === "1",
      yearsInCurrentRole:    p.get("yr")  ?? "",
      recentlyChangedJobs:   p.get("rcj") === "1",
      linkedinUrl:           "",
      // ── v5.3 new fields ──
      excludeJobTitles:        sp("ejt"),
      currentTitlesOnly:       p.get("cto") !== "0",                                       // default true
      includeRelatedJobTitles: p.get("irjt") === "1",
      matchExperience:         (p.get("me") as any) ?? "",
      companyFilter:           (p.get("cf") as "current" | "past" | "both") ?? "current",
      excludeCompanies:        sp("exc"),
      excludeCompaniesFilter:  (p.get("ecf") as "current" | "past" | "both") ?? "both",
      domain:                  sp("dom"),
      locationRadius:          p.get("lr") ? Number(p.get("lr")) : "",
      currentWorkLocation:     sp("cwl"),
      pastWorkLocation:        sp("pwl"),
      languages,
    },
    pageSize: parseInt(p.get("per") ?? (p.get("pv") === "contactout" ? "25" : "10"), 10),
    page:     parseInt(p.get("pg")  ?? "1", 10),
    provider: (p.get("pv") as SearchProvider) ?? "rocketreach",
  };
}

function countFilters(f: RRFilters): number {
  return [
    f.linkedinUrl, f.keyword, f.name, f.companyRevenue, f.yearsExperience,
    f.emailGrade, f.jobChangeSignal, f.newsSignal, f.jobPostingSignal, f.yearsInCurrentRole,
  ].filter(v => v?.trim()).length
    + f.titles.length + f.locations.length + f.managementLevels.length
    + f.skillChips.length + f.currentEmployer.length + f.companySize.length
    + f.companyIndustry.length + f.companyTags.length + f.department.length
    + f.previousEmployer.length + f.previousTitle.length
    + f.school.length + f.degree.length + f.major.length + f.contactMethod.length
    + (f.companyPubliclyTraded  ? 1 : 0)
    + (f.companyFundingMin      ? 1 : 0)
    + (f.companyFundingMax      ? 1 : 0)
    + (f.openToWork             ? 1 : 0)
    + (f.recentlyChangedJobs    ? 1 : 0)
    // v5.3 new
    + f.excludeJobTitles.length
    + f.excludeCompanies.length
    + f.domain.length
    + f.currentWorkLocation.length
    + f.pastWorkLocation.length
    + f.languages.length
    + (!f.currentTitlesOnly       ? 1 : 0)
    + (f.includeRelatedJobTitles  ? 1 : 0)
    + (f.matchExperience          ? 1 : 0)
    + (f.companyFilter !== "current" ? 1 : 0)
    + (f.locationRadius !== ""    ? 1 : 0);
}

// ─── normalizeTIToRR (unchanged from v5.2) ────────────────────────────────────
function normalizeTIToRR(row: any, idx: number): RRProfile {
  const revealedEmails: any[] = (Array.isArray(row.revealed_emails) ? row.revealed_emails : [])
    .map((e: any, i: number) => ({
      email: typeof e === "string" ? e : (e.email ?? ""),
      type: e.type ?? "personal", smtp_valid: e.smtp_valid ?? null,
      grade: e.grade ?? null, is_primary: i === 0,
    })).filter((e: any) => e.email);
  const revealedPhones: any[] = (Array.isArray(row.revealed_phones) ? row.revealed_phones : [])
    .map((p: any, i: number) => ({
      number: typeof p === "string" ? p : (p.number ?? p.phone ?? ""),
      type: p.type ?? "unknown", validity: p.validity ?? "unknown",
      recommended: i === 0, is_primary: i === 0,
    })).filter((p: any) => p.number);
  const avail = row.contact_availability ?? {};
  const hasEmail = !!(avail.personal_email || avail.work_email);
  const hasPhone = !!avail.phone;
  const skills: string[] = Array.isArray(row.skills)
    ? row.skills.map((s: any) => (typeof s === "string" ? s : s?.name ?? "")).filter(Boolean)
    : [];
  return {
    id: 9_000_000 + idx, name: row.full_name ?? null,
    current_title: row.title ?? null, current_employer: row.company_name ?? null,
    location: row.location ?? null, profile_pic: row.profile_picture_url ?? null,
    linkedin_url: row.linkedin_url ?? null, connections: row.followers ?? null,
    teaser: {
      personal_emails: hasEmail ? ["available"] : [],
      professional_emails: [], emails: [],
      phones: hasPhone ? [{ number: "available", is_premium: false }] : [],
    },
    _provider: "contactout", _enriched: revealedEmails.length > 0,
    _allEmails: revealedEmails, _allPhones: revealedPhones,
    _jobHistory: Array.isArray(row.experience) ? row.experience : [],
    _education:  Array.isArray(row.education)  ? row.education  : [],
    _skills: skills, _is_cached: false, _needs_rescrape: false,
  } as any;
}

const PROVIDER_CFG = {
  rocketreach: { totalLabel: "700M+ profiles" },
  contactout:  { totalLabel: "300M+ profiles" },
} as const;

const SavedBadge: React.FC<{ orgId: string | null }> = ({ orgId }) => {
  const { count, isLoading } = useSavedCandidatesCount(orgId);
  return (
    <Link to="/search/global/saved"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all bg-white text-slate-600 border-slate-200 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50">
      <Bookmark size={11} />
      Saved
      {!isLoading && count > 0 && (
        <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export const RocketReachSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const orgId          = useSelector((s: any) => s.auth?.organization_id ?? s.auth?.user?.organization_id ?? null);
  const userId         = useSelector((s: any) => s.auth?.user?.id ?? s.auth?.id ?? null);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const { data: orgConfig } = useQuery({
    queryKey: ["organization-config", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data } = await supabase
        .from("hr_organizations")
        .select("people_search_provider, ti_reveal_provider, waterfall_enabled")
        .eq("id", organizationId).single();
      return data as { people_search_provider: string; ti_reveal_provider: string; waterfall_enabled: boolean } | null;
    },
    enabled: !!organizationId,
  });

  const orgProvider      = (orgConfig?.people_search_provider ?? "rocketreach") as SearchProvider;
  const tiRevealProvider = orgConfig?.ti_reveal_provider ?? "contactout";
  const waterfallEnabled = orgConfig?.waterfall_enabled ?? false;
  const orgPageSize      = CO_UI_PAGE_SIZE;

  const [pageState, setPageState] = useState<PageState>(() => decodeState(searchParams));
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const SIDEBAR_W = 260;

  // ── Recent searches (localStorage per org) ─────────────────────────────────
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>(() => {
    try {
      const key = `xrilic_ps_recent_${orgId ?? "anon"}`;
      return JSON.parse(localStorage.getItem(key) ?? "[]");
    } catch { return []; }
  });

  const [demoMode,    setDemoMode]    = useState(false);
  const [demoProfiles, setDemoProfiles] = useState<RRProfile[]>([]);
  const [demoTotal,    setDemoTotal]    = useState(0);
  const [demoLoading,  setDemoLoading]  = useState(false);
  const [uiPage, setUiPage] = useState(1);

  useEffect(() => { setDemoMode(orgId === DEMO_ORG_ID); }, [orgId]);

  const updateState = useCallback((patch: Partial<PageState>) => {
    setPageState(prev => { const next = { ...prev, ...patch }; setSearchParams(encodeState(next), { replace: true }); return next; });
  }, [setSearchParams]);

  const updateFilters = useCallback((patch: Partial<RRFilters>) => {
    setPageState(prev => { const next = { ...prev, filters: { ...prev.filters, ...patch }, page: 1 }; setSearchParams(encodeState(next), { replace: true }); return next; });
  }, [setSearchParams]);

    useEffect(() => {
    if (orgConfig?.people_search_provider && !searchParams.get("pv")) {
      setPageState(prev => {
        const newProvider = orgConfig.people_search_provider as SearchProvider;
        if (prev.provider === newProvider) return prev;
        const next = { ...prev, provider: newProvider };
        setSearchParams(encodeState(next), { replace: true }); return next;
      });
    }
  }, [orgConfig]);

  const { filters, pageSize, page, provider } = pageState;
  const effectivePageSize = provider === "contactout" ? CO_API_PAGE_SIZE : pageSize;

  const { state, profiles, totalEntries, error, creditError, search, reset } = useRRSearch({
    ...filters, pageSize, provider, organizationId: orgId,
  });

  const clearAll = useCallback(() => {
    const next: PageState = { ...pageState, filters: DEFAULT_RR_FILTERS, page: 1 };
    setPageState(next); setSearchParams(encodeState(next), { replace: true });
    reset();
  }, [pageState, setSearchParams, reset]);

  const { revealedIds } = useRRRevealedIds(orgId);
  const [selectedProfile,  setSelectedProfile]  = useState<RRProfile | null>(null);
  const [checkedIds,       setCheckedIds]        = useState<Set<number>>(new Set());
  const [enrichedProfiles, setEnrichedProfiles]  = useState<RRProfile[]>([]);
  const [enrichProgress,   setEnrichProgress]    = useState<EnrichProgress>({ total: 0, done: 0, active: false });

  const pendingIds    = useRef<Set<number>>(new Set());
  const fallbackTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setEnrichedProfiles(profiles); setSelectedProfile(null);
    setCheckedIds(new Set()); setEnrichProgress({ total: 0, done: 0, active: false });
    clearTimeout(fallbackTimer.current); pendingIds.current = new Set();
  }, [profiles, orgId]);

  useEffect(() => {
    const channel = supabase.channel("scrape-results")
      .on("broadcast", { event: "profile-scraped" }, ({ payload }) => {
        if (!payload?.profileId) return;
        const id = typeof payload.profileId === "string" ? parseInt(payload.profileId, 10) : payload.profileId;
        pendingIds.current.delete(id);
        setEnrichProgress(prev => { if (!prev.active) return prev; const done = prev.done + 1; return { ...prev, done, active: done < prev.total }; });
        if (pendingIds.current.size === 0) clearTimeout(fallbackTimer.current);
        const merge = (p: RRProfile): RRProfile => {
          if (p.id !== id) return p;
          return { ...p, _jobHistory: payload.jobHistory?.length ? payload.jobHistory : p._jobHistory, _education: payload.education?.length ? payload.education : p._education, _skills: payload.skills?.length ? payload.skills : p._skills, profile_pic: payload.profilePic || p.profile_pic, linkedin_url: payload.linkedinUrl || p.linkedin_url, _is_cached: true, _needs_rescrape: false };
        };
        setEnrichedProfiles(prev => prev.map(merge));
        setSelectedProfile(prev => prev ? merge(prev) : null);
      })
      .subscribe((status, err) => console.log("[search] Realtime:", status, err ?? ""));
    return () => { supabase.removeChannel(channel); clearTimeout(fallbackTimer.current); };
  }, []);

  // ── Demo search via search_org_profiles_v1 (v5.3: updated RPC call) ────────
  const runDemoSearch = useCallback(async (pg: number) => {
    if (!orgId) return;
    setDemoLoading(true); setDemoProfiles([]);

    const mustSkills    = filters.skillChips.filter(c => c.mode === "must").map(c => c.label);
    const niceSkills    = filters.skillChips.filter(c => c.mode === "nice").map(c => c.label);
    const excludeSkills = filters.skillChips.filter(c => c.mode === "exclude").map(c => c.label);
    // must → p_skills (AND: all required)
    // nice → p_nice_skills (OR: at least one required; more matches = higher rank)

    // Map company filter tab → RPC params
    // "current" → p_current_employer  (AND: must be current company)
    // "past"    → p_previous_employer (AND: must appear in past experience)
    // "both"    → p_any_employer      (OR:  current OR any experience — avoids false AND)
    const companyMode = filters.companyFilter;
    const companies   = filters.currentEmployer;
    const hasCo       = companies.length > 0;
    let p_curr: string[] | null = null;
    let p_prev: string[] | null = null;
    let p_any:  string[] | null = null;
    if (hasCo) {
      if      (companyMode === "current") p_curr = companies;
      else if (companyMode === "past")    p_prev = companies;
      else                                p_any  = companies; // "both" → OR logic
    }
    // Role Details previousEmployer (always past; merged with p_any if "both" already set)
    if (filters.previousEmployer.length) {
      if (!hasCo) {
        p_prev = filters.previousEmployer;
      } else if (p_any) {
        p_any = [...p_any, ...filters.previousEmployer]; // add to any-employer OR pool
      }
    }

    // Extract language names for RPC (RPC does a name ilike filter)
    const langNames = filters.languages
      .map(l => l.language.trim()).filter(Boolean);

    try {
      const { data, error: rpcErr } = await supabase.rpc("search_org_profiles_v1", {
        p_org_id:               DEMO_ORG_ID,
        p_query:                filters.keyword || filters.name || null,
        p_location:             filters.locations[0] || null,
        p_seniority:            filters.managementLevels.length ? filters.managementLevels : null,
        p_job_function:         filters.department.length       ? filters.department       : null,
        p_company:              null,
        p_industry:             filters.companyIndustry.length  ? filters.companyIndustry  : null,
        p_skills:               mustSkills.length  ? mustSkills  : null,
        p_nice_skills:          niceSkills.length  ? niceSkills  : null,
        p_open_to_work:         filters.openToWork,
        p_has_email:            filters.contactMethod.includes("personal email") || filters.contactMethod.includes("work email"),
        p_has_phone:            filters.contactMethod.includes("phone"),
        p_revealed_status:      "all",
        p_titles:               filters.titles.length           ? filters.titles           : null,
        p_current_employer:     p_curr,
        p_previous_employer:    p_prev,
        p_any_employer:         p_any,
        p_previous_title:       filters.previousTitle.length    ? filters.previousTitle    : null,
        p_exclude_skills:       excludeSkills.length  ? excludeSkills  : null,
        p_school:               filters.school.length ? filters.school : null,
        p_degree:               filters.degree.length ? filters.degree : null,
        p_years_experience:     filters.yearsExperience || null,
        p_limit:                effectivePageSize,
        p_offset:               (pg - 1) * effectivePageSize,
        // ── v5.3 new params ──
        p_exclude_titles:        filters.excludeJobTitles.length ? filters.excludeJobTitles : null,
        p_exclude_companies:     filters.excludeCompanies.length ? filters.excludeCompanies : null,
        p_current_work_location: filters.currentWorkLocation.length ? filters.currentWorkLocation : null,
        p_past_work_location:    filters.pastWorkLocation.length    ? filters.pastWorkLocation    : null,
        p_languages:             langNames.length ? langNames : null,
        p_domain:                filters.domain.length ? filters.domain : null,
      });
      if (rpcErr) throw rpcErr;
      const rows = (data ?? []) as any[];
      setDemoProfiles(rows.map(normalizeTIToRR));
      setDemoTotal(rows[0]?.total_count ? Number(rows[0].total_count) : 0);
    } catch (e: any) {
      console.error("[demo-search-v1] RPC error:", e);
      setDemoProfiles([]); setDemoTotal(0);
    } finally {
      setDemoLoading(false);
    }
  }, [filters, orgId, effectivePageSize]);

  // ── Recent search helpers ──────────────────────────────────────────────────
  const saveRecentSearch = useCallback(async (f: RRFilters) => {
    if (!orgId || !userId || !f) return;
    const chips: string[] = [
      ...f.titles.slice(0, 2),
      ...f.locations.slice(0, 2).map(l => `📍 ${l}`),
      ...f.currentEmployer.slice(0, 1).map(co => `@${co}`),
      ...f.skillChips.filter(c => c.mode === "must").slice(0, 2).map(c => `⭐ ${c.label}`),
      ...f.skillChips.filter(c => c.mode === "nice").slice(0, 2).map(c => c.label),
      ...f.degree.slice(0, 1).map(d => `🎓 ${d}`),
      ...(f.openToWork          ? ["Open to Work"]                  : []),
      ...(f.yearsExperience     ? [`${f.yearsExperience} yrs`]      : []),
      ...(f.keyword.trim()      ? [`"${f.keyword}"`]                : []),
    ].filter(Boolean).slice(0, 8);
    const mustSkillLabel = f.skillChips.filter(c => c.mode === "must")[0]?.label ?? "";
    const parts = [
      f.titles.slice(0, 2).join(" / "),
      f.currentEmployer[0] ? `@${f.currentEmployer[0]}` : "",
      f.locations[0] ?? "",
      mustSkillLabel ? `⭐${mustSkillLabel}` : "",
    ].filter(Boolean);
    const summary = parts.slice(0, 3).join(" · ") || "Search";
    const entry: RecentSearchEntry = {
      id: `${Date.now()}`, timestamp: Date.now(),
      summary, chips, filters: f as any, provider: provider,
    };
    // ── localStorage (immediate UI update) ──
    const lsKey = `xrilic_ps_recent_${orgId}`;
    const lsExisting: RecentSearchEntry[] = JSON.parse(localStorage.getItem(lsKey) ?? "[]");
    const lsUpdated = [entry, ...lsExisting.filter(e => e.summary !== summary)].slice(0, 10);
    localStorage.setItem(lsKey, JSON.stringify(lsUpdated));
    setRecentSearches(lsUpdated);
    // ── Supabase (cross-device persistence via hr_employees.search_history) ──
    try {
      const { data: emp } = await supabase.from("hr_employees")
        .select("search_history").eq("id", userId).single();
      const dbExisting: RecentSearchEntry[] = Array.isArray((emp as any)?.search_history) ? (emp as any).search_history : [];
      const dbUpdated = [entry, ...dbExisting.filter((e: any) => e.summary !== summary)].slice(0, 20);
      await supabase.from("hr_employees").update({ search_history: dbUpdated }).eq("id", userId);
    } catch { /* silently fail; localStorage remains the fallback */ }
  }, [orgId, userId, provider]);

  // Fills sidebar filters only — user must click Run Search manually
  const handleApplyRecent = useCallback((entry: RecentSearchEntry) => {
    setPageState(prev => {
      const next = { ...prev, filters: { ...DEFAULT_RR_FILTERS, ...(entry.filters as RRFilters) }, provider: entry.provider as SearchProvider, page: 1 };
      setSearchParams(encodeState(next), { replace: true });
      return next;
    });
    // intentionally no auto-search — sidebar gets filled, user clicks Run Search
  }, [setSearchParams]);

  const handleRemoveRecent = useCallback((id: string) => {
    if (!orgId) return;
    const key = `xrilic_ps_recent_${orgId}`;
    setRecentSearches(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  }, [orgId]);

  const handleRunSearch = useCallback(() => {
    setUiPage(1);
    const fc = countFilters(filters);
    if (fc > 0) saveRecentSearch(filters);
    if (demoMode) { runDemoSearch(1); updateState({ page: 1 }); }
    else          { search(1);        updateState({ page: 1 }); }
  }, [demoMode, runDemoSearch, search, updateState, filters, saveRecentSearch]);

  const goPage = useCallback((p: number) => {
    updateState({ page: p });
    if (demoMode) runDemoSearch(p); else search(p);
  }, [demoMode, updateState, runDemoSearch, search]);

  const goUiPage = useCallback((newUiPage: number) => {
    const curApiPage = pageState.page;
    const newApiPage = Math.ceil(newUiPage / 2);
    setUiPage(newUiPage);
    if (newApiPage !== curApiPage) goPage(newApiPage);
  }, [pageState.page, goPage]);

  const handleRevealComplete = useCallback((rrProfileId: number, data: any) => {
    const upd = (p: RRProfile): RRProfile => {
      if (p.id !== rrProfileId) return p;
      const incomingEmails: any[] = data.allEmails ?? [];
      const incomingPhones: any[] = data.allPhones ?? [];
      return {
        ...p, _enriched: true,
        _allEmails: incomingEmails.length > 0 ? incomingEmails : (p._allEmails ?? []),
        _allPhones: incomingPhones.length > 0 ? incomingPhones : (p._allPhones ?? []),
        _jobHistory: data.jobHistory?.length ? data.jobHistory : (p._jobHistory ?? []),
        _education:  data.education?.length  ? data.education  : (p._education  ?? []),
        _skills:     data.skills?.length     ? data.skills     : (p._skills     ?? []),
        _contactId:  data.contactId ?? (p as any)._contactId ?? null,
        _candidateProfileId: data.candidateProfileId ?? (p as any)._candidateProfileId ?? null,
        name: data.name ?? p.name, current_title: data.title ?? p.current_title,
        current_employer: data.company ?? p.current_employer,
        profile_pic: data.profilePic ?? p.profile_pic,
        linkedin_url: data.linkedinUrl ?? p.linkedin_url,
      };
    };
    setEnrichedProfiles(prev => prev.map(upd));
    setDemoProfiles(prev => prev.map(upd));
    setSelectedProfile(prev => prev ? upd(prev) : null);
    queryClient.invalidateQueries({ queryKey: ["rr-revealed-ids"] });
  }, [queryClient]);

  const [rrInviteTarget, setRrInviteTarget] = useState<{
    profile: RRProfile; email: string | null; phone: string | null;
  } | null>(null);

  const { folders, createFolder } = useFolders(orgId, userId);
  const filterCount = useMemo(() => countFilters(filters), [filters]);
  const hasFilters  = filterCount > 0;
  const isLoading   = state === "loading";

  const useSplit = SPLIT_PAGES && provider === "contactout" && !demoMode;
  const baseProfiles      = demoMode ? demoProfiles : enrichedProfiles;
  const splitStart = useSplit ? (uiPage % 2 === 1 ? 0 : CO_UI_PAGE_SIZE) : 0;
  const splitEnd   = useSplit ? (uiPage % 2 === 1 ? CO_UI_PAGE_SIZE : CO_API_PAGE_SIZE) : baseProfiles.length;
  const displayProfiles   = useSplit ? baseProfiles.slice(splitStart, splitEnd) : baseProfiles;
  const displayTotal      = demoMode ? demoTotal : totalEntries;
  const displayLoading    = demoMode ? demoLoading : isLoading;
  const displayTotalPages = useSplit
    ? Math.ceil(displayTotal / orgPageSize) || 0
    : Math.ceil(displayTotal / (provider === "contactout" ? CO_API_PAGE_SIZE : pageSize)) || 0;
  const displayPage  = useSplit ? uiPage : page;
  const displayState = demoMode
    ? (demoLoading ? "loading" : demoProfiles.length > 0 ? "results" : hasFilters ? "empty" : "idle")
    : state;

  return (
    <div className="flex h-screen overflow-hidden bg-white relative">
      {/* Sidebar - profile-hub collapse pattern */}
      <div className="flex-shrink-0 border-r border-slate-100 overflow-hidden transition-all duration-300 ease-in-out bg-white"
        style={{ width: sidebarOpen ? SIDEBAR_W : 0 }}>
        <div style={{ width: SIDEBAR_W, height: "100%" }}>
        <RRSearchSidebar
          filters={filters} provider={provider} onChange={updateFilters}
          onClearAll={clearAll} onSearch={handleRunSearch} isLoading={displayLoading}
          totalEntries={displayTotal} filterCount={filterCount} hasFilters={hasFilters} />
        </div>
      </div>

      {/* Floating sidebar toggle — profile-hub pattern */}
      <button
        onClick={() => setSidebarOpen(v => !v)}
        title={sidebarOpen ? "Collapse filters" : "Expand filters"}
        className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-4 h-10 bg-white border border-slate-200 shadow-md transition-all duration-300 hover:border-violet-400 hover:text-violet-600 hover:shadow-violet-100 text-slate-400 rounded-r-full"
        style={{ left: sidebarOpen ? SIDEBAR_W - 1 : -1, borderLeft: "none" }}>
        {sidebarOpen ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
      </button>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="flex-shrink-0 h-11 px-4 flex items-center justify-between border-b border-slate-100 bg-white gap-3">
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block">
              <p className="text-[11px] font-bold text-slate-700 leading-tight">People Search</p>
              <p className="text-[9px] text-slate-400">{PROVIDER_CFG[provider].totalLabel}</p>
            </div>
            {displayLoading && <Loader2 size={12} className="animate-spin text-slate-400" />}
          </div>

          <div className="flex items-center gap-2">
            {displayTotal > 0 && !displayLoading && displayTotalPages > 1 && (
              <span className="text-[10px] text-slate-400">Page {displayPage}/{displayTotalPages}</span>
            )}
            {displayTotalPages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={displayPage <= 1} onClick={() => goUiPage(displayPage - 1)}
                  className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={11} />
                </button>
                <button disabled={displayPage >= displayTotalPages} onClick={() => goUiPage(displayPage + 1)}
                  className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={11} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasFilters && useSplit && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200 font-medium">~{orgPageSize}/pg</span>
            )}

            {/* Demo org toggle */}
            {orgId === DEMO_ORG_ID && (
              <button
                onClick={() => { const next = !demoMode; setDemoMode(next); if (next && hasFilters) runDemoSearch(page); }}
                className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all",
                  demoMode ? "bg-amber-100 text-amber-700 border-amber-300 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-amber-300 hover:text-amber-600")}
                title={demoMode ? "Searching DB — click to switch to live API" : "Click to search from local DB instead of live API"}>
                <Database size={10} />
                {demoMode ? "Demo: DB" : "Demo: Live"}
              </button>
            )}

            <div className="h-4 w-px bg-slate-200" />
            <SavedBadge orgId={orgId} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {creditError && !demoMode && (
            <InsufficientCreditsBanner creditError={creditError} onDismiss={clearAll}
              onOpenPricingModal={() => setShowPricingModal(true)} />
          )}
          {showPricingModal && (
            <ManageVerificationPricingModal organizationId={orgId ?? ""} isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
          )}
          {displayState === "idle" && (
            <div className="flex-1 overflow-y-auto">
              <IdleState
                orgId={orgId}
                userId={userId}
                waterfallEnabled={waterfallEnabled}
                recentSearches={recentSearches}
                onApplyRecent={handleApplyRecent}
                onRemoveRecent={handleRemoveRecent}
                onQuickSearch={titles => { updateFilters({ titles }); setTimeout(handleRunSearch, 0); }} />
            </div>
          )}
          {displayState === "empty" && <div className="flex-1 overflow-y-auto"><EmptyState onClearAll={clearAll} /></div>}
          {displayState === "error" && error && !demoMode && (
            <div className="flex-1 overflow-y-auto"><ErrorState error={error as any} onRetry={handleRunSearch} onClearAll={clearAll} /></div>
          )}
          {(displayState === "loading" || displayState === "results") && (
            <RRResultsArea
              profiles={displayProfiles} loading={displayLoading} totalEntries={displayTotal}
              page={displayPage} pageSize={useSplit ? orgPageSize : effectivePageSize}
              totalPages={displayTotalPages} selectedId={selectedProfile?.id ?? null}
              checkedIds={checkedIds} revealedIds={revealedIds} scrapingIds={new Set()}
              activeSkillChips={filters.skillChips} enrichProgress={enrichProgress}
              tiRevealProvider={tiRevealProvider} waterfallEnabled={waterfallEnabled}
              organizationId={orgId ?? undefined}
              onSelectRow={p => setSelectedProfile(prev => prev?.id === p?.id ? null : p)}
              onCheckRow={(id, v) => setCheckedIds(prev => { const s = new Set(prev); v ? s.add(id) : s.delete(id); return s; })}
              onCheckAll={v => setCheckedIds(v ? new Set(displayProfiles.map(p => p.id)) : new Set())}
              onPrev={() => goUiPage(Math.max(1, displayPage - 1))}
              onNext={() => goUiPage(displayPage + 1)}
              onRevealComplete={handleRevealComplete}
              onInvite={(profile, email, phone) => setRrInviteTarget({ profile, email, phone })} />
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedProfile && (
        <RRDetailPanel profile={selectedProfile} onClose={() => setSelectedProfile(null)}
          onRevealComplete={handleRevealComplete} tiRevealProvider={tiRevealProvider}
          waterfallEnabled={waterfallEnabled} organizationId={orgId ?? undefined}
          onInvite={(rrProfileId, email, phone) => {
            const p = displayProfiles.find(x => String(x.id) === rrProfileId);
            if (p) setRrInviteTarget({ profile: p, email, phone });
          }} />
      )}

      {rrInviteTarget && (
        <CandidateInviteGate
          candidateName={rrInviteTarget.profile.name ?? ""}
          candidateEmail={rrInviteTarget.email ?? undefined}
          candidatePhone={rrInviteTarget.phone ?? undefined}
          apolloPersonId={`rr_${rrInviteTarget.profile.id}`}
          organizationId={orgId} userId={userId}
          onClose={() => setRrInviteTarget(null)}
          onInviteSent={() => { setRrInviteTarget(null); queryClient.invalidateQueries({ queryKey: ["saved-candidates"] }); }} />
      )}
    </div>
  );
};

export default RocketReachSearchPage;