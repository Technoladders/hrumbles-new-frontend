/**
 * RocketReachSearchPage.tsx — v3 (FINAL)
 *
 * Complete search page:
 *   - Provider toggle: RocketReach ↔ ContactOut (same UI, different API)
 *   - Link to Saved Candidates page in top bar
 *   - ContactOut-style result rows (RRResultsArea) — not table
 *   - Sidebar: RRSearchSidebar with Skills at top
 *   - Detail panel: RRDetailPanel (4 tabs, separate email/phone reveal)
 *   - Folder modal for shortlisting
 *   - URL state serialization (bookmarkable)
 *   - Debounced auto-search (600ms)
 *
 * Routes:
 *   /search/rocketreach              ← RocketReach provider
 *   /search/rocketreach?p=contactout ← ContactOut provider (same page, toggle)
 *   /search/rocketreach/saved        ← SavedRRCandidatesPage
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useSelector }    from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { cn }             from "@/lib/utils";
import { supabase }       from "@/integrations/supabase/client";
import {
  ChevronLeft, ChevronRight, Bookmark, Loader2,
  Settings, ChevronDown,
} from "lucide-react";

import { RRSearchSidebar }  from "./RRSearchSidebar";
import { RRResultsArea }    from "./RRResultsArea";
import { RRDetailPanel }    from "./RRDetailPanel";
import { FolderPickerModal } from "@/components/CandidateSearch/components/FolderPickerModal";
import { IdleState }         from "@/components/CandidateSearch/components/states/IdleState";
import { EmptyState }        from "@/components/CandidateSearch/components/states/EmptyState";  
import { ErrorState }        from "@/components/CandidateSearch/components/states/ErrorState";
import { useFolders }        from "@/components/CandidateSearch/hooks/useFolders";

import { useRRSearch }       from "./hooks/useRRSearch";
import { useRRRevealedIds }  from "./hooks/useRRRevealedIds";
import { useSavedCandidatesCount } from "@/components/CandidateSearch/hooks/useSavedCandidates";
import { CandidateInviteGate } from "@/components/CandidateSearch/components/CandidateInviteGate";

import type { RRProfile, SkillChip } from "./types";

// ─── Provider types ───────────────────────────────────────────────────────────
type SearchProvider = "rocketreach" | "contactout";

interface ProviderConfig {
  id:          SearchProvider;
  label:       string;
  shortLabel:  string;
  color:       string;
  bgClass:     string;
  badgeCls:    string;
  totalLabel:  string;
  note:        string;
}

const PROVIDERS: Record<SearchProvider, ProviderConfig> = {
  rocketreach: {
    id:         "rocketreach",
    label:      "Search",
    shortLabel: "",
    color:      "#f97316",
    bgClass:    "bg-orange-500",
    badgeCls:   "bg-orange-50 text-orange-700 border-orange-200",
    totalLabel: "700M+ profiles",
    note:       "Reveal email/phone separately after search",
  },
  contactout: {
    id:         "contactout",
    label:      "ContactOut",
    shortLabel: "CO",
    color:      "#7c3aed",
    bgClass:    "bg-violet-600",
    badgeCls:   "bg-violet-50 text-violet-700 border-violet-200",
    totalLabel: "300M+ profiles",
    note:       "Richer metadata · contact info at search time",
  },
};

// ─── Filter state ─────────────────────────────────────────────────────────────
interface FilterState {
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
  page:             number;
  provider:         SearchProvider;
}

const DEFAULT_FILTERS: FilterState = {
  name: "", titles: [], locations: [], currentEmployer: [],
  keyword: "", skillChips: [], managementLevels:[],
  department: "", companyIndustry: "", companySize: "",
  orderBy: "popularity", pageSize: 25, page: 1,
  provider: "rocketreach",
};

function encodeFilters(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.name.trim())            p.set("name",    f.name.trim());
  if (f.titles.length)          p.set("titles",  f.titles.join("|"));
  if (f.locations.length)       p.set("locs",    f.locations.join("|"));
  if (f.currentEmployer.length) p.set("cos",     f.currentEmployer.join("|"));
  if (f.keyword.trim())         p.set("kw",      f.keyword.trim());
  if (f.skillChips.length)      p.set("skills",  JSON.stringify(f.skillChips));
  if (f.managementLevels.length) p.set("mgmt",   f.managementLevels.join("|"));
  if (f.department.trim())      p.set("dept",    f.department.trim());
  if (f.companyIndustry.trim()) p.set("ind",     f.companyIndustry.trim());
  if (f.companySize.trim())     p.set("size",    f.companySize.trim());
  if (f.orderBy !== "popularity") p.set("order", f.orderBy);
  if (f.pageSize !== 25)        p.set("per",     String(f.pageSize));
  if (f.page > 1)               p.set("pg",      String(f.page));
  if (f.provider !== "rocketreach") p.set("p",   f.provider);
  return p;
}

function decodeFilters(p: URLSearchParams): FilterState {
  let skillChips: SkillChip[] =[];
  try { skillChips = JSON.parse(p.get("skills") ?? "[]"); } catch { /* ignore */ }
  const provider = (p.get("p") as SearchProvider | null) ?? "rocketreach";
  return {
    name:             p.get("name")   ?? "",
    titles:           p.get("titles") ? p.get("titles")!.split("|") :[],
    locations:        p.get("locs")   ? p.get("locs")!.split("|")   :[],
    currentEmployer:  p.get("cos")    ? p.get("cos")!.split("|")    :[],
    keyword:          p.get("kw")     ?? "",
    skillChips,
    managementLevels: p.get("mgmt")   ? p.get("mgmt")!.split("|")   :[],
    department:       p.get("dept")   ?? "",
    companyIndustry:  p.get("ind")    ?? "",
    companySize:      p.get("size")   ?? "",
    orderBy:          (p.get("order") as any) ?? "popularity",
    pageSize:         parseInt(p.get("per") ?? "25", 10),
    page:             parseInt(p.get("pg")  ?? "1",  10),
    provider:         (["rocketreach", "contactout"] as SearchProvider[]).includes(provider)
                        ? provider : "rocketreach",
  };
}

// ─── Provider toggle button ────────────────────────────────────────────────────
const ProviderToggle: React.FC<{
  current:  SearchProvider;
  onChange: (p: SearchProvider) => void;
}> = ({ current, onChange }) => {
  const[open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  },[]);

  const cfg = PROVIDERS[current];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all",
          current === "rocketreach"
            ? "bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400"
            : "bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-400"
        )}
      >
        {/* Provider dot */}
        <span className={cn("w-4 h-4 rounded-md flex items-center justify-center text-[7px] text-white font-black flex-shrink-0", cfg.bgClass)}>
          {cfg.shortLabel}
        </span>
        {cfg.label}
        <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
          {(Object.values(PROVIDERS) as ProviderConfig[]).map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p.id); setOpen(false); }}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left",
                p.id === current && "bg-slate-50"
              )}
            >
              <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[9px] text-white font-black flex-shrink-0 mt-0.5", p.bgClass)}>
                {p.shortLabel}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-bold text-slate-800">{p.label}</p>
                  {p.id === current && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">Active</span>}
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">{p.totalLabel}</p>
                <p className="text-[9px] text-slate-400">{p.note}</p>
              </div>
            </button>
          ))}

          {/* Coming soon notice for contactout */}
          <div className="mx-3 mb-2 mt-1 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-[9px] text-slate-500 leading-relaxed">
              <span className="font-semibold text-violet-600">ContactOut</span> uses the same search UI.
              Configure <span className="font-mono font-semibold">CONTACTOUT_API_TOKEN</span> in Supabase secrets to activate.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Saved candidates badge ───────────────────────────────────────────────────
const SavedBadge: React.FC<{ orgId: string | null }> = ({ orgId }) => {
  const { count, isLoading } = useSavedCandidatesCount(orgId);
  return (
    <Link
      to="/search/global/saved"
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all",
        "bg-white text-slate-600 border-slate-200 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50"
      )}
    >
      <Bookmark size={11} />
      Saved Candidates
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
  const navigate   = useNavigate();
  const queryClient = useQueryClient();

  // Auth
  const orgId  = useSelector((s: any) =>
    s.auth?.organization_id ?? s.auth?.user?.organization_id ?? null
  );
  const userId = useSelector((s: any) =>
    s.auth?.user?.id ?? s.auth?.id ?? null
  );

  // ── Filters from URL ────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>(
    () => decodeFilters(searchParams)
  );
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const setFilter = useCallback(<K extends keyof FilterState>(k: K, v: FilterState[K]) => {
    setFilters(prev => {
      const next = { ...prev, [k]: v, ...(k !== "page" && { page: 1 }) };
      setSearchParams(encodeFilters(next), { replace: true });
      return next;
    });
  },[setSearchParams]);

  const clearAll = useCallback(() => {
    const cleared = { ...DEFAULT_FILTERS, provider: filters.provider };
    setFilters(cleared);
    setSearchParams(encodeFilters(cleared), { replace: true });
  }, [filters.provider, setSearchParams]);

  // Provider shortcut
  const provider     = filters.provider;
  const providerCfg  = PROVIDERS[provider];
  const setProvider  = useCallback((p: SearchProvider) => setFilter("provider", p), [setFilter]);

  // ── Search ──────────────────────────────────────────────────────────────
  // Both providers use the same hook — edge function name differs
  const { state, profiles, totalEntries, error, search } = useRRSearch({
    name:             filters.name,
    titles:           filters.titles,
    locations:        filters.locations,
    currentEmployer:  filters.currentEmployer,
    keyword:          filters.keyword,
    skillChips:       filters.skillChips,
    managementLevels: filters.managementLevels,
    department:       filters.department,
    companyIndustry:  filters.companyIndustry,
    companySize:      filters.companySize,
    orderBy:          filters.orderBy,
    pageSize:         filters.pageSize,
    // Pass provider so useRRSearch can call the right edge function
    provider,
    organizationId:   orgId,
  });

  // ── Enriched / revealed IDs ─────────────────────────────────────────────
  const { revealedIds } = useRRRevealedIds(orgId);

  // ── Selection ───────────────────────────────────────────────────────────
  const [selectedProfile, setSelectedProfile] = useState<RRProfile | null>(null);
  const [checkedIds,      setCheckedIds]       = useState<Set<number>>(new Set());

  // ── In-place enrichment merge ────────────────────────────────────────────
  const [enrichedProfiles, setEnrichedProfiles] = useState<RRProfile[]>([]);

 
// ── Replace the profiles useEffect ───────────────────────────────────────────
useEffect(() => {
  // Map search results into local state — no scraping here anymore
  setEnrichedProfiles(profiles);
  setSelectedProfile(null);
  setCheckedIds(new Set());
}, [profiles]);

useEffect(() => {
  const channel = supabase
    .channel("scrape-results")
    .on("broadcast", { event: "profile-scraped" }, ({ payload }) => {
      if (!payload?.profileId) return;
 
      // Normalize profileId — could be number or string depending on broadcast
      const targetId = typeof payload.profileId === "string"
        ? parseInt(payload.profileId, 10)
        : payload.profileId;
 
      console.log("[search] Realtime: received profile-scraped for", targetId,
        "jobs:", payload.jobHistory?.length ?? 0,
        "skills:", payload.skills?.length ?? 0);
 
      const merge = (p: RRProfile): RRProfile => {
        if (p.id !== targetId) return p;
        return {
          ...p,
          // Only fill gaps — if profile already has data from a previous reveal, keep it
          _jobHistory:     payload.jobHistory?.length  ? payload.jobHistory  : p._jobHistory,
          _education:      payload.education?.length   ? payload.education   : p._education,
          _skills:         payload.skills?.length      ? payload.skills      : p._skills,
          profile_pic:     payload.profilePic  || p.profile_pic  || undefined,
          linkedin_url:    payload.linkedinUrl || p.linkedin_url || null,
          _is_cached:      true,
          _needs_rescrape: false,
        };
      };
 
      setEnrichedProfiles(prev => prev.map(merge));
      setSelectedProfile(prev => prev ? merge(prev) : null);
    })
    .subscribe((status, err) => {
      console.log("[search] Realtime status:", status, err ?? "");
    });
 
  return () => { supabase.removeChannel(channel); };
}, []);  // empty deps: subscribe once on mount

  const handleRevealComplete = useCallback((rrProfileId: number, data: any) => {
    const update = (p: RRProfile): RRProfile =>
      p.id !== rrProfileId ? p : {
        ...p,
        _enriched:          true,
        _allEmails:         data.allEmails    ?? [],
        _allPhones:         data.allPhones    ??[],
        _jobHistory:        data.jobHistory   ?? [],
        _education:         data.education    ??[],
        _skills:            data.skills       ??[],
        _contactId:         data.contactId    ?? null,
        _candidateProfileId:data.candidateProfileId ?? null,
        name:               data.name         ?? p.name,
        current_title:      data.title        ?? p.current_title,
        current_employer:   data.company      ?? p.current_employer,
        profile_pic:        data.profilePic   ?? p.profile_pic,
        linkedin_url:       data.linkedinUrl  ?? p.linkedin_url,
      };

    setEnrichedProfiles(prev => prev.map(update));
    setSelectedProfile(prev => prev ? update(prev) : null);
    queryClient.invalidateQueries({ queryKey: ["rr-revealed-ids"] });
  }, [queryClient]);

  // ── Folder modal ─────────────────────────────────────────────────────────

  const [rrInviteTarget, setRrInviteTarget] = useState<{
  profile: RRProfile;
  email: string | null;
  phone: string | null;
} | null>(null);

  const { folders, createFolder } = useFolders(orgId, userId);



  // ── Auto-search debounced 600ms ──────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    const hasFilters =
      filters.name.trim() || filters.titles.length || filters.locations.length ||
      filters.currentEmployer.length || filters.keyword.trim() ||
      filters.skillChips.length || filters.managementLevels.length ||
      filters.department.trim() || filters.companyIndustry.trim() || filters.companySize.trim();

    if (!hasFilters) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { search(filters.page); }, 600);
    return () => clearTimeout(timerRef.current);
  },[
    filters.name, JSON.stringify(filters.titles), JSON.stringify(filters.locations),
    JSON.stringify(filters.currentEmployer), filters.keyword,
    JSON.stringify(filters.skillChips), JSON.stringify(filters.managementLevels),
    filters.department, filters.companyIndustry, filters.companySize,
    filters.orderBy, filters.pageSize, filters.provider,
  ]);

  const filterCount = useMemo(() =>[filters.name, filters.keyword, filters.department, filters.companyIndustry, filters.companySize]
      .filter(v => v.trim()).length
    + filters.titles.length + filters.locations.length + filters.currentEmployer.length
    + filters.managementLevels.length + filters.skillChips.length,
  [filters]);

  const hasFilters   = filterCount > 0;
  const isLoading    = state === "loading";
  const totalPages   = Math.ceil(totalEntries / filters.pageSize) || 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-screen overflow-hidden bg-white"
      style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}
    >
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <div className="w-[242px] flex-shrink-0 h-full overflow-hidden">
        <RRSearchSidebar
          // Filter values
          name={filters.name}
          titles={filters.titles}
          locations={filters.locations}
          currentEmployer={filters.currentEmployer}
          keyword={filters.keyword}
          skillChips={filters.skillChips}
          managementLevels={filters.managementLevels}
          department={filters.department}
          companyIndustry={filters.companyIndustry}
          companySize={filters.companySize}
          orderBy={filters.orderBy}
          pageSize={filters.pageSize}
          // Setters
          onSetName={v             => setFilter("name", v)}
          onSetTitles={v           => setFilter("titles", v)}
          onSetLocations={v        => setFilter("locations", v)}
          onSetCurrentEmployer={v  => setFilter("currentEmployer", v)}
          onSetKeyword={v          => setFilter("keyword", v)}
          onSetSkillChips={v       => setFilter("skillChips", v)}
          onToggleMgmtLevel={v     => setFilter("managementLevels",
            filters.managementLevels.includes(v)
              ? filters.managementLevels.filter(x => x !== v)
              :[...filters.managementLevels, v]
          )}
          onSetDepartment={v       => setFilter("department", v)}
          onSetCompanyIndustry={v  => setFilter("companyIndustry", v)}
          onSetCompanySize={v      => setFilter("companySize", v)}
          onSetOrderBy={v          => setFilter("orderBy", v)}
          onSetPageSize={v         => setFilter("pageSize", v)}
          onClearAll={clearAll}
          // Status
          isLoading={isLoading}
          totalEntries={totalEntries}
          filterCount={filterCount}
          hasFilters={hasFilters}
          // Provider-aware labels
          providerLabel={providerCfg.label}
        />
      </div>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Top bar ── */}
        <div className="flex-shrink-0 h-11 px-4 flex items-center justify-between border-b border-slate-100 bg-white gap-3">
          {/* Left: Provider identity */}
          <div className="flex items-center gap-2.5">
            {/* Provider badge */}
            <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[8px] text-white font-black flex-shrink-0", providerCfg.bgClass)}>
              {providerCfg.shortLabel}
            </span>

            <div className="hidden sm:block">
              <p className="text-[11px] font-bold text-slate-700 leading-tight">
                {providerCfg.label} People
              </p>
              <p className="text-[9px] text-slate-400">{providerCfg.totalLabel}</p>
            </div>

            {isLoading && <Loader2 size={12} className="animate-spin text-slate-400" />}
          </div>

          {/* Center: count + pagination */}
          <div className="flex items-center gap-2">
            {totalEntries > 0 && !isLoading && (
              <span className="text-[10px] text-slate-500">
                <span className="font-semibold text-slate-700">{totalEntries.toLocaleString()}</span> profiles
                {totalPages > 1 && (
                  <span className="ml-1.5 text-slate-400">· Page {filters.page}/{totalPages}</span>
                )}
              </span>
            )}

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={filters.page <= 1}
                     onClick={() => {
     const newPage = filters.page - 1;
     setFilter("page", newPage);
     search(newPage);
   }}
                  className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={11} />
                </button>
                <button
                  disabled={filters.page >= totalPages}
                     onClick={() => {
     const newPage = filters.page + 1;
     setFilter("page", newPage);
     search(newPage);
   }}
                  className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={11} />
                </button>
              </div>
            )}
          </div>

          {/* Right: Actions */}
 <div className="flex items-center gap-2">
     {/* Per-page selector — compact */}
     <div className="flex items-center gap-1">
       <span className="text-[10px] text-slate-400 whitespace-nowrap">Per page</span>
       <select
         value={filters.pageSize}
         onChange={e => {
           setFilter("pageSize", Number(e.target.value));
           // Re-search with new page size, reset to page 1
           setTimeout(() => search(1), 0);
         }}
         className="h-6 px-1 rounded border border-slate-200 text-[11px] text-slate-600 bg-white focus:outline-none focus:border-violet-400"
       >
         <option value={10}>10</option>
         <option value={25}>25</option>
         <option value={50}>50</option>
       </select>
     </div>

     {/* Divider */}
     <div className="h-4 w-px bg-slate-200" />

     {/* Provider toggle */}
     <ProviderToggle current={provider} onChange={setProvider} />

     {/* Divider */}
     <div className="h-4 w-px bg-slate-200" />

     {/* Saved candidates link */}
     <SavedBadge orgId={orgId} />
   </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {state === "idle" && (
            <div className="flex-1 overflow-y-auto">
              <IdleState
                recentSearches={[]}
                onApplyRecent={() => {}}
                onRemoveRecent={() => {}}
                onQuickSearch={skills => setFilter("titles", skills)}
              />
            </div>
          )}

          {state === "empty" && (
            <div className="flex-1 overflow-y-auto">
              <EmptyState onClearAll={clearAll} />
            </div>
          )}

          {state === "error" && error && (
            <div className="flex-1 overflow-y-auto">
              <ErrorState
                error={error as any}
                onRetry={() => search(filters.page)}
                onClearAll={clearAll}
              />
            </div>
          )}

          {(state === "loading" || state === "results") && (
<RRResultsArea
  profiles={enrichedProfiles}
  loading={isLoading}
  totalEntries={totalEntries}
  page={filters.page}
  pageSize={filters.pageSize}
  totalPages={totalPages}
  selectedId={selectedProfile?.id ?? null}
  checkedIds={checkedIds}
  revealedIds={revealedIds}
  scrapingIds={new Set()}
  activeSkillChips={filters.skillChips}           // ← NEW
  onSelectRow={p => setSelectedProfile(prev => prev?.id === p?.id ? null : p)}
  onCheckRow={(id, v) => setCheckedIds(prev => { const s = new Set(prev); v ? s.add(id) : s.delete(id); return s; })}
  onCheckAll={v => setCheckedIds(v ? new Set(enrichedProfiles.map(p => p.id)) : new Set())}
   onPrev={() => {
     const newPage = Math.max(1, filters.page - 1);
     setFilter("page", newPage);
     search(newPage);
   }}
   onNext={() => {
     const newPage = filters.page + 1;
     setFilter("page", newPage);
     search(newPage);
   }}
  onRevealComplete={handleRevealComplete}
  onInvite={(profile, email, phone) => setRrInviteTarget({ profile, email, phone })}   // ← NEW
/>
          )}
        </div>
      </div>

      {/* ── Detail panel ─────────────────────────────────────────────────── */}
{selectedProfile && (
  <RRDetailPanel
    profile={selectedProfile}
    onClose={() => setSelectedProfile(null)}
    onRevealComplete={handleRevealComplete}
    // onShortlist removed — now handled inside RRDetailPanel v3
    onInvite={(rrProfileId, email, phone) => {
      const p = enrichedProfiles.find(x => String(x.id) === rrProfileId);
      if (p) setRrInviteTarget({ profile: p, email, phone });
    }}
  />
)}

           {/* Invite Gate */}
      {rrInviteTarget && (
        <CandidateInviteGate
          candidateName={rrInviteTarget.profile.name ?? ""}
          candidateEmail={rrInviteTarget.email ?? undefined}
          candidatePhone={rrInviteTarget.phone ?? undefined}
          apolloPersonId={`rr_${rrInviteTarget.profile.id}`}
          organizationId={orgId}
          userId={userId}
          onClose={() => setRrInviteTarget(null)}
          onInviteSent={() => {
            setRrInviteTarget(null);
            queryClient.invalidateQueries({ queryKey: ["saved-candidates"] });
          }}
        />
      )}

    </div>
  );
};

export default RocketReachSearchPage;