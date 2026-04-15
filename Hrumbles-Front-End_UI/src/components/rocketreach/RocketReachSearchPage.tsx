/**
 * RocketReachSearchPage.tsx — v5 FINAL
 *
 * Merges:
 *   - v4 enrichment logic (enrich-batch, Realtime, 45s fallback, progress)
 *   - New RRFilters interface from RRSearchSidebar v3 (collapsible sections, full API coverage)
 *
 * Key differences from v4:
 *   - FilterState replaced by RRFilters (single object, 30+ fields)
 *   - Sidebar props: onChange(patch) instead of 15 individual setters
 *   - filterCount uses new countFilters() helper
 *   - URL encoding uses compact keys for all new fields
 *   - useRRSearch now receives full RRFilters spread
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useSelector }    from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { cn }             from "@/lib/utils";
import { supabase }       from "@/integrations/supabase/client";
import {
  ChevronLeft, ChevronRight, Bookmark, Loader2, ChevronDown,
} from "lucide-react";

// ── New sidebar v3 — exports RRFilters type and DEFAULT_RR_FILTERS
import { RRSearchSidebar, RRFilters, DEFAULT_RR_FILTERS } from "./RRSearchSidebar";
import { RRResultsArea }    from "./RRResultsArea";
import { RRDetailPanel }    from "./RRDetailPanel";
import { IdleState }        from "@/components/CandidateSearch/components/states/IdleState";
import { EmptyState }       from "@/components/CandidateSearch/components/states/EmptyState";
import { ErrorState }       from "@/components/CandidateSearch/components/states/ErrorState";
import { useFolders }       from "@/components/CandidateSearch/hooks/useFolders";
import { useRRSearch }      from "./hooks/useRRSearch";
import { useRRRevealedIds } from "./hooks/useRRRevealedIds";
import { useSavedCandidatesCount } from "@/components/CandidateSearch/hooks/useSavedCandidates";
import { CandidateInviteGate }     from "@/components/CandidateSearch/components/CandidateInviteGate";
import type { RRProfile } from "./types";

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
  if (s.pageSize !== 10)             p.set("per",  String(s.pageSize));
  if (s.page > 1)                    p.set("pg",   String(s.page));
  if (s.provider !== "rocketreach")  p.set("pv",   s.provider);
  return p;
}

function decodeState(p: URLSearchParams): PageState {
  let skillChips = [];
  try { skillChips = JSON.parse(p.get("sk") ?? "[]"); } catch { /**/ }
  const sp = (key: string) => p.get(key) ? p.get(key)!.split("|") : [];
  return {
    filters: {
      keyword:              p.get("kw")  ?? "",
      name:                 p.get("nm")  ?? "",
      titles:               sp("tt"),
      locations:            sp("loc"),
      managementLevels:     sp("ml"),
      skillChips,
      currentEmployer:      sp("co"),
      companySize:          sp("cs"),
      companyIndustry:      sp("ci"),
      companyRevenue:       p.get("cr")  ?? "",
      companyPubliclyTraded: p.get("pt") === "1",
      companyFundingMin:    p.get("fmn") ?? "",
      companyFundingMax:    p.get("fmx") ?? "",
      companyTags:          sp("ct"),
      department:           sp("dp"),
      yearsExperience:      p.get("ye")  ?? "",
      previousEmployer:     sp("pe"),
      previousTitle:        sp("ptt"),
      school:               sp("sc"),
      degree:               sp("dg"),
      major:                sp("mj"),
      contactMethod:        sp("cm"),
      emailGrade:           p.get("eg")  ?? "",
      jobChangeSignal:      p.get("jcs") ?? "",
      newsSignal:           p.get("ns")  ?? "",
      jobPostingSignal:     p.get("jps") ?? "",
      orderBy:              (p.get("ob") as any) ?? "popularity",
    },
    pageSize: parseInt(p.get("per") ?? "10", 10),
    page:     parseInt(p.get("pg")  ?? "1",  10),
    provider: (p.get("pv") as SearchProvider) ?? "rocketreach",
  };
}

function countFilters(f: RRFilters): number {
  return [f.keyword, f.name, f.companyRevenue, f.yearsExperience,
          f.emailGrade, f.jobChangeSignal, f.newsSignal, f.jobPostingSignal]
           .filter(v => v?.trim()).length
    + f.titles.length + f.locations.length + f.managementLevels.length + f.skillChips.length
    + f.currentEmployer.length + f.companySize.length + f.companyIndustry.length
    + f.companyTags.length + f.department.length + f.previousEmployer.length
    + f.previousTitle.length + f.school.length + f.degree.length + f.major.length
    + f.contactMethod.length
    + (f.companyPubliclyTraded ? 1 : 0)
    + (f.companyFundingMin ? 1 : 0)
    + (f.companyFundingMax ? 1 : 0);
}

// ─── Provider config ──────────────────────────────────────────────────────────
const PROVIDER_CFG = {
  rocketreach: { label: "Search",     shortLabel: "RR", bgClass: "bg-orange-500", totalLabel: "700M+ profiles", note: "Reveal contact after search" },
  contactout:  { label: "ContactOut", shortLabel: "CO", bgClass: "bg-violet-600", totalLabel: "300M+ profiles", note: "Contact info at search time" },
} as const;

const ProviderToggle: React.FC<{ current: SearchProvider; onChange: (p: SearchProvider) => void }> = ({ current, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  const cfg = PROVIDER_CFG[current];
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={cn("flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all",
          current === "rocketreach"
            ? "bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400"
            : "bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-400")}>
        <span className={cn("w-4 h-4 rounded-md flex items-center justify-center text-[7px] text-white font-black flex-shrink-0", cfg.bgClass)}>
          {cfg.shortLabel}
        </span>
        {cfg.label}
        <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">
          {(["rocketreach","contactout"] as SearchProvider[]).map(id => {
            const c = PROVIDER_CFG[id];
            return (
              <button key={id} type="button" onClick={() => { onChange(id); setOpen(false); }}
                className={cn("w-full flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left", id === current && "bg-slate-50")}>
                <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[9px] text-white font-black flex-shrink-0 mt-0.5", c.bgClass)}>{c.shortLabel}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-bold text-slate-800">{c.label}</p>
                    {id === current && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">Active</span>}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5">{c.totalLabel}</p>
                  <p className="text-[9px] text-slate-400">{c.note}</p>
                </div>
              </button>
            );
          })}
          <div className="mx-3 mb-2 mt-1 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-[9px] text-slate-500 leading-relaxed">
              <span className="font-semibold text-violet-600">ContactOut</span> uses the same UI.
              Set <span className="font-mono font-semibold">CONTACTOUT_API_TOKEN</span> in Supabase secrets.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

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

  const orgId  = useSelector((s: any) => s.auth?.organization_id ?? s.auth?.user?.organization_id ?? null);
  const userId = useSelector((s: any) => s.auth?.user?.id ?? s.auth?.id ?? null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>(() => decodeState(searchParams));

  const updateState = useCallback((patch: Partial<PageState>) => {
    setPageState(prev => {
      const next = { ...prev, ...patch };
      setSearchParams(encodeState(next), { replace: true });
      return next;
    });
  }, [setSearchParams]);

  // Filters change always resets page to 1
  const updateFilters = useCallback((patch: Partial<RRFilters>) => {
    setPageState(prev => {
      const next = { ...prev, filters: { ...prev.filters, ...patch }, page: 1 };
      setSearchParams(encodeState(next), { replace: true });
      return next;
    });
  }, [setSearchParams]);

  const clearAll = useCallback(() => {
    const next: PageState = { ...{ ...pageState, filters: DEFAULT_RR_FILTERS, page: 1 } };
    setPageState(next);
    setSearchParams(encodeState(next), { replace: true });
  }, [pageState, setSearchParams]);

  const { filters, pageSize, page, provider } = pageState;
  const providerCfg = PROVIDER_CFG[provider];

  // ── Search ────────────────────────────────────────────────────────────────
  const { state, profiles, totalEntries, error, search } = useRRSearch({
    ...filters,
    pageSize,
    provider,
    organizationId: orgId,
  });

  const { revealedIds } = useRRRevealedIds(orgId);
  const [selectedProfile,  setSelectedProfile]  = useState<RRProfile | null>(null);
  const [checkedIds,       setCheckedIds]        = useState<Set<number>>(new Set());
  const [enrichedProfiles, setEnrichedProfiles]  = useState<RRProfile[]>([]);
  const [enrichProgress,   setEnrichProgress]    = useState<EnrichProgress>({ total: 0, done: 0, active: false });

  const pendingIds    = useRef<Set<number>>(new Set());
  const fallbackTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── When search results arrive ────────────────────────────────────────────
  useEffect(() => {
    setEnrichedProfiles(profiles);
    setSelectedProfile(null);
    setCheckedIds(new Set());
    setEnrichProgress({ total: 0, done: 0, active: false });
    clearTimeout(fallbackTimer.current);
    pendingIds.current = new Set();

    if (!profiles.length) return;

    const toEnrich = profiles.filter(p => p._needs_rescrape);
    if (!toEnrich.length) return;

    setEnrichProgress({ total: toEnrich.length, done: 0, active: true });
    pendingIds.current = new Set(toEnrich.map(p => p.id));

    supabase.functions.invoke("rocketreach-enrich-batch", {
      body: { profiles: toEnrich.map(p => ({ id: p.id, name: p.name ?? "" })), organizationId: orgId },
    }).then(({ data, error: e }) => {
      if (e) console.error("[enrich-batch] error:", e);
      else   console.log("[enrich-batch] started:", data);
    });

    // 45s fallback poll
    fallbackTimer.current = setTimeout(async () => {
      const stillMissing = [...pendingIds.current];
      if (!stillMissing.length) return;
      console.log(`[enrich-batch] fallback poll ${stillMissing.length} profiles`);
      const { data: cacheRows } = await supabase
        .from("rr_profile_cache")
        .select("rocketreach_id, profile_data")
        .in("rocketreach_id", stillMissing);
      if (cacheRows?.length) {
        const m = new Map(cacheRows.map((r: any) => [r.rocketreach_id, r.profile_data]));
        setEnrichedProfiles(prev => prev.map(p => {
          const scraped = m.get(p.id);
          if (!scraped) return p;
          return {
            ...p,
            _jobHistory:     scraped.work_history?.length ? scraped.work_history : p._jobHistory,
            _education:      scraped.education?.length    ? scraped.education    : p._education,
            _skills:         scraped.skills?.length       ? scraped.skills       : p._skills,
            profile_pic:     scraped.profile_pic || p.profile_pic,
            _is_cached:      true,
            _needs_rescrape: false,
          };
        }));
        console.log(`[enrich-batch] fallback filled ${cacheRows.length} profiles`);
      }
      setEnrichProgress(prev => ({ ...prev, active: false }));
    }, 45_000);
  }, [profiles, orgId]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("scrape-results")
      .on("broadcast", { event: "profile-scraped" }, ({ payload }) => {
        if (!payload?.profileId) return;
        const id = typeof payload.profileId === "string"
          ? parseInt(payload.profileId, 10)
          : payload.profileId;

        console.log("[search] Realtime profile-scraped", id,
          "jobs:", payload.jobHistory?.length ?? 0, "skills:", payload.skills?.length ?? 0);

        pendingIds.current.delete(id);
        setEnrichProgress(prev => {
          if (!prev.active) return prev;
          const done = prev.done + 1;
          return { ...prev, done, active: done < prev.total };
        });
        if (pendingIds.current.size === 0) clearTimeout(fallbackTimer.current);

        const merge = (p: RRProfile): RRProfile => {
          if (p.id !== id) return p;
          return {
            ...p,
            _jobHistory:     payload.jobHistory?.length ? payload.jobHistory : p._jobHistory,
            _education:      payload.education?.length  ? payload.education  : p._education,
            _skills:         payload.skills?.length     ? payload.skills     : p._skills,
            profile_pic:     payload.profilePic  || p.profile_pic,
            linkedin_url:    payload.linkedinUrl || p.linkedin_url,
            _is_cached:      true,
            _needs_rescrape: false,
          };
        };
        setEnrichedProfiles(prev => prev.map(merge));
        setSelectedProfile(prev => prev ? merge(prev) : null);
      })
      .subscribe((status, err) => console.log("[search] Realtime:", status, err ?? ""));

    return () => { supabase.removeChannel(channel); clearTimeout(fallbackTimer.current); };
  }, []);

  // ── Manual search ─────────────────────────────────────────────────────────
  const handleRunSearch = useCallback(() => {
    search(1);
    updateState({ page: 1 });
  }, [search, updateState]);

  const goPage = useCallback((p: number) => {
    updateState({ page: p });
    search(p);
  }, [updateState, search]);

  // ── Reveal complete ───────────────────────────────────────────────────────
  const handleRevealComplete = useCallback((rrProfileId: number, data: any) => {
    const upd = (p: RRProfile): RRProfile =>
      p.id !== rrProfileId ? p : {
        ...p,
        _enriched:           true,
        _allEmails:          data.allEmails          ?? [],
        _allPhones:          data.allPhones           ?? [],
        _jobHistory:         data.jobHistory          ?? [],
        _education:          data.education           ?? [],
        _skills:             data.skills              ?? [],
        _contactId:          data.contactId           ?? null,
        _candidateProfileId: data.candidateProfileId  ?? null,
        name:                data.name                ?? p.name,
        current_title:       data.title               ?? p.current_title,
        current_employer:    data.company             ?? p.current_employer,
        profile_pic:         data.profilePic          ?? p.profile_pic,
        linkedin_url:        data.linkedinUrl         ?? p.linkedin_url,
      };
    setEnrichedProfiles(prev => prev.map(upd));
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
  const totalPages  = Math.ceil(totalEntries / pageSize) || 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-white">

      {/* Sidebar */}
      <div className="w-[260px] flex-shrink-0 h-full overflow-hidden">
        <RRSearchSidebar
          filters={filters}
          onChange={updateFilters}
          onClearAll={clearAll}
          onSearch={handleRunSearch}
          isLoading={isLoading}
          totalEntries={totalEntries}
          filterCount={filterCount}
          hasFilters={hasFilters}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <div className="flex-shrink-0 h-11 px-4 flex items-center justify-between border-b border-slate-100 bg-white gap-3">

          {/* Left */}
          <div className="flex items-center gap-2.5">
            <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[8px] text-white font-black flex-shrink-0", providerCfg.bgClass)}>
              {providerCfg.shortLabel}
            </span>
            <div className="hidden sm:block">
              <p className="text-[11px] font-bold text-slate-700 leading-tight">{providerCfg.label} People</p>
              <p className="text-[9px] text-slate-400">{providerCfg.totalLabel}</p>
            </div>
            {isLoading && <Loader2 size={12} className="animate-spin text-slate-400" />}
          </div>

          {/* Center: count + pagination */}
          <div className="flex items-center gap-2">
            {totalEntries > 0 && !isLoading && (
              <span className="text-[10px] text-slate-500">
                <span className="font-semibold text-slate-700">{totalEntries.toLocaleString()}</span> profiles
                {totalPages > 1 && <span className="ml-1.5 text-slate-400">· Page {page}/{totalPages}</span>}
              </span>
            )}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => goPage(page - 1)}
                  className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={11} />
                </button>
                <button disabled={page >= totalPages} onClick={() => goPage(page + 1)}
                  className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:border-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={11} />
                </button>
              </div>
            )}
          </div>

          {/* Right: per-page + provider toggle + saved */}
          <div className="flex items-center gap-2">
            {hasFilters && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 hidden sm:block">Per page</span>
                <select value={pageSize}
                  onChange={e => { updateState({ pageSize: Number(e.target.value), page: 1 }); setTimeout(() => search(1), 0); }}
                  className="h-6 px-1.5 rounded border border-slate-200 text-[11px] text-slate-600 bg-white focus:outline-none focus:border-violet-400 cursor-pointer">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            )}
            <div className="h-4 w-px bg-slate-200" />
            <ProviderToggle current={provider} onChange={p => updateState({ provider: p, page: 1 })} />
            <div className="h-4 w-px bg-slate-200" />
            <SavedBadge orgId={orgId} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {state === "idle" && (
            <div className="flex-1 overflow-y-auto">
              <IdleState recentSearches={[]} onApplyRecent={() => {}} onRemoveRecent={() => {}}
                onQuickSearch={titles => { updateFilters({ titles }); setTimeout(handleRunSearch, 0); }} />
            </div>
          )}
          {state === "empty" && (
            <div className="flex-1 overflow-y-auto"><EmptyState onClearAll={clearAll} /></div>
          )}
          {state === "error" && error && (
            <div className="flex-1 overflow-y-auto">
              <ErrorState error={error as any} onRetry={handleRunSearch} onClearAll={clearAll} />
            </div>
          )}
          {(state === "loading" || state === "results") && (
            <RRResultsArea
              profiles={enrichedProfiles}
              loading={isLoading}
              totalEntries={totalEntries}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              selectedId={selectedProfile?.id ?? null}
              checkedIds={checkedIds}
              revealedIds={revealedIds}
              scrapingIds={new Set()}
              activeSkillChips={filters.skillChips}
              enrichProgress={enrichProgress}
              onSelectRow={p => setSelectedProfile(prev => prev?.id === p?.id ? null : p)}
              onCheckRow={(id, v) => setCheckedIds(prev => { const s = new Set(prev); v ? s.add(id) : s.delete(id); return s; })}
              onCheckAll={v => setCheckedIds(v ? new Set(enrichedProfiles.map(p => p.id)) : new Set())}
              onPrev={() => goPage(Math.max(1, page - 1))}
              onNext={() => goPage(page + 1)}
              onRevealComplete={handleRevealComplete}
              onInvite={(profile, email, phone) => setRrInviteTarget({ profile, email, phone })}
            />
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedProfile && (
        <RRDetailPanel
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onRevealComplete={handleRevealComplete}
          onInvite={(rrProfileId, email, phone) => {
            const p = enrichedProfiles.find(x => String(x.id) === rrProfileId);
            if (p) setRrInviteTarget({ profile: p, email, phone });
          }}
        />
      )}

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