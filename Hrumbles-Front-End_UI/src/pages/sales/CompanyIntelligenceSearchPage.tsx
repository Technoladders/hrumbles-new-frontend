// src/pages/sales/CompanyIntelligenceSearchPage.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Link as RouterLink, useSearchParams, useParams, useNavigate,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from "react-redux";
import {
  Building2, Search, Globe, Linkedin, Users, MapPin,
  TrendingUp, DollarSign, Eye, ChevronLeft, ChevronRight,
  X, Loader2, RefreshCw, MoreHorizontal,
  Sparkles, CheckCircle2, ExternalLink,
  ListPlus, Zap, Database,
  ChevronDown, Star, Phone, Copy, Check,
  Facebook, Twitter, Clock, ArrowLeft,
  PanelLeftClose, PanelLeftOpen, Cloud,
  FolderOpen, List, DatabaseZap, Folder, BookmarkPlus, BookmarkCheck
} from "lucide-react";
import { Input }    from "@/components/ui/input";
import { Badge }    from "@/components/ui/badge";
import { Button }   from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast }  from "@/hooks/use-toast";
import { cn }        from "@/lib/utils";

import { CompanySearchFilterSidebar } from "@/components/sales/company-search/CompanySearchFilterSidebar";
import { DatabaseFilterSidebar }      from "@/components/sales/company-search/DatabaseFilterSidebar";
import { AddToCompanyListModal }       from "@/components/sales/company-search/AddToCompanyListModal";
import { CompanySearchEmptyState, type CompanyRecentSearch }
  from "@/components/sales/company-search/CompanySearchEmptyState";

import {
  searchCompaniesInApolloV2,
  enrichOrganization,
  getCompleteOrganizationInfo,
  promoteToActiveCRM,
  type ApolloOrganization,
  type ApolloCompanySearchFilters,
} from "@/services/sales/apolloCompanySearch";

import {
  useCompanyFilterParams,
  countActiveDBFilters,
  buildDBFilterSummary,
  buildDBFilterChips,
  EMPTY_DB_FILTERS,
  type CompanyDBFilters,
} from "@/hooks/sales/useCompanyFilterParams";

import { Skeleton } from "@/components/ui/skeleton";
import PhoneInput, { parsePhoneNumber, isValidPhoneNumber } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import { lookupViaCity, findFromCityStateProvince } from "city-timezones";

// ============================================================================
// Constants
// ============================================================================

const STAGES =[
  "Identified", "Targeting", "In Outreach", "Warm", "Qualified Company",
  "Proposal Sent / In Discussion", "Negotiation", "Closed - Won",
  "Closed - Lost", "Re-engage Later",
];

const stageColors: Record<string, string> = {
  "Identified":                         "bg-blue-100 text-blue-800",
  "Targeting":                          "bg-indigo-100 text-indigo-800",
  "In Outreach":                        "bg-teal-100 text-teal-800",
  "Warm":                               "bg-yellow-100 text-yellow-800",
  "Qualified Company":                  "bg-green-100 text-green-800",
  "Proposal Sent / In Discussion":      "bg-purple-100 text-purple-800",
  "Negotiation":                        "bg-orange-100 text-orange-800",
  "Closed - Won":                       "bg-emerald-100 text-emerald-800",
  "Closed - Lost":                      "bg-red-100 text-red-800",
  "Re-engage Later":                    "bg-gray-100 text-gray-800",
  "Intelligence":                       "bg-slate-100 text-slate-600",
  "Active":                             "bg-green-100 text-green-700",
  "default":                            "bg-gray-100 text-gray-800",
};

const LS_KEY_CLOUD = "companies_recent_cloud_searches_v1";
const LS_KEY_CRM   = "companies_recent_crm_searches_v1";

// ============================================================================
// Session-storage: full search state persisted across navigation
// ============================================================================

interface SearchSession {
  isCloudMode:        boolean;
  hasSearched:        boolean;
  apiFilters:         ApolloCompanySearchFilters;
  apiPage:            number;
  apiPerPage:         number;
  apiResults:         { organizations: any[]; pagination: any } | null;
  lastSearchChips:    string[];
  lastSearchSummary:  string;
  dbFilters:          CompanyDBFilters;
  dbPage:             number;
  dbPerPage:          number;
  selectedListId:     string | null;
  scrollOffset:       number;
}

const SS_KEY = (orgId: string) => `companies_session_${orgId}`;

function loadSession(orgId: string | null): Partial<SearchSession> {
  if (!orgId) return {};
  try {
    const raw = sessionStorage.getItem(SS_KEY(orgId));
    return raw ? (JSON.parse(raw) as Partial<SearchSession>) : {};
  } catch { return {}; }
}


function persistSession(orgId: string | null, patch: Partial<SearchSession>) {
  if (!orgId) return;
  try {
    const current = loadSession(orgId);
    sessionStorage.setItem(SS_KEY(orgId), JSON.stringify({ ...current, ...patch }));
  } catch {} 
}

// ============================================================================
// Recent-search helpers
// ============================================================================

function loadRecentSearches(isCloud: boolean): CompanyRecentSearch[] {
  try { return JSON.parse(localStorage.getItem(isCloud ? LS_KEY_CLOUD : LS_KEY_CRM) || "[]"); }
  catch { return[]; }
}

function saveCloudSearch(
  apolloFilters: ApolloCompanySearchFilters,
  chips: string[],
  summary: string,
  resultCount: number,
): CompanyRecentSearch[] {
  const existing = loadRecentSearches(true);
  const entry: CompanyRecentSearch = {
    id: Date.now().toString(), summary, filters: apolloFilters,
    chips, resultCount, timestamp: Date.now(),
  };
  const updated =[entry, ...existing.filter(s => s.summary !== summary)].slice(0, 10);
  localStorage.setItem(LS_KEY_CLOUD, JSON.stringify(updated));
  return updated;
}

function saveCRMSearch(filters: CompanyDBFilters, resultCount: number): CompanyRecentSearch[] {
  const existing = loadRecentSearches(false);
  const summary  = buildDBFilterSummary(filters);
  const chips    = buildDBFilterChips(filters);
  const entry: CompanyRecentSearch = {
    id: Date.now().toString(), summary, filters, chips, resultCount, timestamp: Date.now(),
  };
  const updated =[entry, ...existing.filter(s => s.summary !== summary)].slice(0, 10);
  localStorage.setItem(LS_KEY_CRM, JSON.stringify(updated));
  return updated;
}

// ============================================================================
// Misc helpers
// ============================================================================

const _tzCache = new Map<string, string | null>();

function resolveTimezone(loc: string): string | null {
  if (_tzCache.has(loc)) return _tzCache.get(loc)!;
  let tz: string | undefined;
  const city = lookupViaCity(loc);
  if (city?.length) {
    tz = city[0].timezone;
  } else if (loc.includes(",")) {
    const parts = loc.split(",").map(p => p.trim());
    const m = findFromCityStateProvince(parts[0], parts[1]);
    if (m?.length) tz = m[0].timezone;
  }
  const result = tz ?? null;
  _tzCache.set(loc, result);
  return result;
}

const getLocalTime = (loc: string | null | undefined): string | null => {
  if (!loc) return null;
  const tz = resolveTimezone(loc);
  if (!tz) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true })
      .format(new Date());
  } catch { return null; }
};

const _phoneValidCache = new Map<string, boolean>();
const _phoneParsedCache = new Map<string, string | null>();

function getCachedCountry(number: string): string | null {
  if (_phoneParsedCache.has(number)) return _phoneParsedCache.get(number)!;
  try {
    const valid = isValidPhoneNumber(number);
    _phoneValidCache.set(number, valid);
    if (!valid) { _phoneParsedCache.set(number, null); return null; }
    const parsed = parsePhoneNumber(number);
    const country = parsed?.country ?? null;
    _phoneParsedCache.set(number, country);
    return country;
  } catch {
    _phoneParsedCache.set(number, null);
    return null;
  }
}

const extractDomain = (url?: string | null) => {
  if (!url) return null;
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", ""); } catch { return null; }
};

const getInitials = (n: string) => (n ? n.slice(0, 2).toUpperCase() : "??");

const fmtEmployees = (n?: number | null) => {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
};

const fmtRevenue = (v?: number | string | null) => {
  if (!v) return "—";
  if (typeof v === "string") return v;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}M`;
  return v.toLocaleString();
};

// ============================================================================
// Main Component
// ============================================================================

const CompanyIntelligenceSearchPage: React.FC = () => {
  const { fileId }        = useParams<{ fileId?: string }>();
  const navigate          = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast }         = useToast();
  const queryClient       = useQueryClient();
  const user              = useSelector((state: any) => state.auth.user);
  const organizationId    = useSelector((state: any) => state.auth.organization_id);
  const currentUserId     = user?.id || null;

  const parentRef = useRef<HTMLDivElement>(null);

  const { currentFilters: urlCRMFilters, currentPage: urlCRMPage, writeFilters, clearFilters } = useCompanyFilterParams();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const session = useMemo(() => loadSession(organizationId),[]);
  
  const saveToSession = useCallback(
    (patch: Partial<SearchSession>) => persistSession(organizationId, patch),
    [organizationId],
  );

  const getInitialMode = (): boolean => {
    if (fileId) return false;
    const urlMode = searchParams.get("mode");
    if (urlMode === "crm")   return false;
    if (urlMode === "cloud") return true;
    if (session.isCloudMode !== undefined) return session.isCloudMode;
    return true; 
  };

  const[isCloudMode,    setIsCloudMode]    = useState(getInitialMode);
  const[isSidebarOpen,  setIsSidebarOpen]  = useState(true);
  const [hasSearched,    setHasSearched]    = useState(() => {
    if (fileId) return true;
    return session.hasSearched ?? false;
  });
  const[recentSearches, setRecentSearches] = useState<CompanyRecentSearch[]>(() => loadRecentSearches(getInitialMode()));

  const [pendingChips,   setPendingChips]   = useState<string[]>([]);
  const [pendingCount,   setPendingCount]   = useState(0);

  const lastSearchChipsRef   = useRef<string[]>(session.lastSearchChips   ??[]);
  const lastSearchSummaryRef = useRef<string>(session.lastSearchSummary   ?? "");

  const[isSearching,    setIsSearching]    = useState(false);
  const[apiFilters,     setApiFilters]     = useState<ApolloCompanySearchFilters>(() => session.apiFilters ?? {});
  const[apiPage,        setApiPage]        = useState(() => session.apiPage    ?? 1);
  const[apiPerPage,     setApiPerPage]     = useState(() => session.apiPerPage ?? 100);
  const[apiResults,     setApiResults]     = useState<{ organizations: ApolloOrganization[]; pagination: any } | null>(() => session.apiResults ?? null);

  const [dbFilters,      setDbFilters]      = useState<CompanyDBFilters>(() => session.dbFilters ?? urlCRMFilters);
  const[dbPage,         setDbPage]         = useState(() => session.dbPage    ?? urlCRMPage);
  const[dbPerPage,      setDbPerPage]      = useState(() => session.dbPerPage ?? 100);

  const[selectedOrgs,   setSelectedOrgs]   = useState<Set<string>>(new Set());
  const[enrichingIds,   setEnrichingIds]   = useState<Set<string>>(new Set());
  const[viewingOrgDetails, setViewingOrgDetails] = useState<ApolloOrganization | null>(null);
  const[copiedPhone,    setCopiedPhone]    = useState<string | null>(null);

  const[selectedListId, setSelectedListId] = useState<string | null>(() => session.selectedListId ?? null);

  const [listModalOpen,          setListModalOpen]          = useState(false);
  const[selectedCompanyForList, setSelectedCompanyForList] = useState<any>(null);
  const[isBulkAddingList,       setIsBulkAddingList]       = useState(false);
  const[isBulkPromoting,        setIsBulkPromoting]        = useState(false);

    // ADD THESE:
  const [isSavingIds,            setIsSavingIds]            = useState<Set<string>>(new Set());
  const [isBulkSaving,           setIsBulkSaving]           = useState(false);

    // ADD THIS: Memoize the callback so it doesn't trigger infinite re-renders in the child
  const handleCloudFiltersChange = useCallback((chips: string[], count: number) => {
    setPendingChips(chips);
    setPendingCount(count);
  },[]);

  const mountRef = useRef(false);
  
  // FIX 1: Prioritize the 'fileId' from the route URL over the 'selectedListId' from session cache
  const activeFileId = fileId || selectedListId || null;
  

useEffect(() => {
    if (mountRef.current) return;
    mountRef.current = true;
    if (!getInitialMode() && !fileId) setHasSearched(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // FIX 2: When the URL fileId changes, ensure we reset to DB page 1 and clear conflicting session IDs
  useEffect(() => {
    if (fileId) { 
      setIsCloudMode(false); 
      setHasSearched(true); 
      setDbPage(1);
      setSelectedListId(null); // Clear session conflict so the URL fileId strictly applies
    }
  }, [fileId]);

  const {
    data: databaseResult,
    isLoading: isLoadingDB,
    isFetching: isFetchingDB,
    refetch: refetchDB,
  } = useQuery({
    queryKey:["companies-crm", organizationId, dbFilters, dbPage, dbPerPage, activeFileId],
    queryFn: async () => {
      let enrichedCompanyIds: number[] | null = null;
      if (dbFilters.isEnriched === true) {
        const { data: rawRows } = await supabase.from("enrichment_org_raw_responses").select("company_id").not("company_id", "is", null);
        enrichedCompanyIds =[...new Set((rawRows || []).map((r: any) => r.company_id).filter(Boolean))];
      }

      const selectStr = activeFileId
        ? "*, created_by_employee:hr_employees!companies_created_by_fkey(first_name,last_name), company_workspace_files!inner(file_id)"
        : "*, created_by_employee:hr_employees!companies_created_by_fkey(first_name,last_name)";

 let q = supabase.from("companies").select(selectStr, { count: "exact" })
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (activeFileId) {
        q = q.eq("company_workspace_files.file_id", activeFileId);
      } else {
        // ADD THIS: ONLY show companies explicitly saved (or added to lists which sets is_saved = true)
        q = q.eq("is_saved", true); 
      }
      if (dbFilters.search?.trim()) {
        const t = dbFilters.search.trim();
        q = q.or(`name.ilike.%${t}%,domain.ilike.%${t}%,website.ilike.%${t}%`);
      }
      if ((dbFilters.companyIds ||[]).length > 0) q = q.in("id", dbFilters.companyIds);
      if (dbFilters.isEnriched === true && enrichedCompanyIds !== null) {
        q = enrichedCompanyIds.length > 0 ? q.in("id", enrichedCompanyIds) : q.eq("id", -1);
      }
      if (dbFilters.hasPhone === true) q = q.not("phone", "is", null).neq("phone", "");
      if ((dbFilters.industries ||[]).length)     q = q.in("industry", dbFilters.industries);
      if ((dbFilters.stages     ||[]).length)     q = q.in("stage",    dbFilters.stages);
      if ((dbFilters.locations  ||[]).length) {
        const f = dbFilters.locations.map(l => `location.ilike.%${l}%`).join(",");
        q = q.or(f);
      }
      if (dbFilters.foundedYearMin !== null) q = q.gte("founded_year", dbFilters.foundedYearMin);
      if (dbFilters.foundedYearMax !== null) q = q.lte("founded_year", dbFilters.foundedYearMax);

      const from = (dbPage - 1) * dbPerPage;
      q = q.range(from, from + dbPerPage - 1);

      const { data, error, count } = await q;
      if (error) throw error;
      return {
        companies:   data ||[],
        totalCount:  count || 0,
        totalPages:  Math.ceil((count || 0) / dbPerPage),
      };
    },
    enabled: !!organizationId && !isCloudMode,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    if (scrollRestoredRef.current) return;
    const offset = session.scrollOffset;
    if (!offset || !parentRef.current) return;
    const t = requestAnimationFrame(() => {
      if (parentRef.current) {
        parentRef.current.scrollTop = offset;
        scrollRestoredRef.current = true;
      }
    });
    return () => cancelAnimationFrame(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[apiResults, databaseResult]);

  // Debounced scroll listener to drastically prevent lag/forced reflows
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    
    let timeoutId: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        saveToSession({ scrollOffset: el.scrollTop });
      }, 150); // Save to session storage only after scrolling stops for 150ms
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(timeoutId);
    };
  }, [saveToSession]);

  useEffect(() => {
    if (fileId) { setIsCloudMode(false); setHasSearched(true); }
  },[fileId]);

  useEffect(() => {
    setRecentSearches(loadRecentSearches(isCloudMode));
  }, [isCloudMode]);

  const switchToCloud = () => {
    setIsCloudMode(true);
    setHasSearched(!!apiResults);
    setSelectedOrgs(new Set());
    saveToSession({ isCloudMode: true, hasSearched: !!apiResults });
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("mode", "cloud"); return n; }, { replace: true });
  };

  const switchToCRM = () => {
    setIsCloudMode(false);
    setHasSearched(true);
    setSelectedOrgs(new Set());
    saveToSession({ isCloudMode: false, hasSearched: true });
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set("mode", "crm"); return n; }, { replace: true });
  };

  const { data: currentFile } = useQuery({
    queryKey:["workspace-file-companies", fileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_files").select("id,name,type,workspace_id,workspaces(id,name)")
        .eq("id", fileId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!fileId,
  });

  useEffect(() => {
    if (!isCloudMode && databaseResult && countActiveDBFilters(dbFilters) > 0) {
      const updated = saveCRMSearch(dbFilters, databaseResult.totalCount);
      setRecentSearches(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseResult?.totalCount]);

  const { data: workspaceLists =[] } = useQuery({
    queryKey:["workspace-lists-companies", organizationId],
    queryFn: async () => {
      const { data: ws } = await supabase.from("workspaces").select("id,name").eq("organization_id", organizationId).order("name");
      if (!ws?.length) return[];
      const ids = ws.map((w: any) => w.id);
      const { data: files } = await supabase.from("workspace_files").select("id,name,workspace_id").eq("type", "companies").in("workspace_id", ids).order("name");
      return ws.map((w: any) => ({
        workspace: w,
        files: (files ||[]).filter((f: any) => f.workspace_id === w.id),
      })).filter((g: any) => g.files.length > 0);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60_000,
  });

  const handleApiSearch = useCallback(async (
    filters: ApolloCompanySearchFilters,
    pageOverride = 1,
    summary = "",
    chips: string[] =[],
  ) => {
    setIsSearching(true);
    setHasSearched(true);
    setApiFilters(filters);
    setApiPage(pageOverride);

    setSearchParams(prev => {
      const n = new URLSearchParams(prev);
      n.set("mode", "cloud");
      n.delete("filters");
      n.delete("page");
      return n;
    }, { replace: true });

    saveToSession({
      isCloudMode: true,
      hasSearched: true,
      apiFilters: filters,
      apiPage: pageOverride,
      lastSearchChips:   chips.length ? chips : lastSearchChipsRef.current,
      lastSearchSummary: summary || lastSearchSummaryRef.current,
      scrollOffset: 0,
    });

    try {
      const result = await searchCompaniesInApolloV2(filters, pageOverride, apiPerPage, fileId);

      if (pageOverride === 1 && result.pagination?.total_entries > 0) {
        supabase.from("background_sync_jobs").insert({
          organization_id: organizationId, created_by: currentUserId,
          filters, total_entries: result.pagination.total_entries,
          status: "pending", job_type: "companies",
        }).then(({ error }) => { if (error) console.error("BG sync failed:", error); });
      }

      const total      = result.pagination?.total_entries || 0;
      const savedCount = result.saved?.companies || 0;

      const useSummary = summary || lastSearchSummaryRef.current || "Company search";
      const useChips   = chips.length ? chips : lastSearchChipsRef.current;
      const updated    = saveCloudSearch(filters, useChips, useSummary, total);
      setRecentSearches(updated);

      const organizations = result.companies?.length > 0 ? result.companies : result.organizations;
      const pagination    = result.pagination;

      if (organizations?.length > 0) {
        toast({ title: "Search Complete ✓", description: `Found ${total.toLocaleString()} companies. ${savedCount} saved.` });
        queryClient.invalidateQueries({ queryKey: ["companies-crm"] });
      } else {
        toast({ title: "No results", description: "Try adjusting your filters." });
      }

      const newResults = { organizations: organizations ||[], pagination };
      setApiResults(newResults);
      saveToSession({ apiResults: newResults, apiPage: pageOverride, apiFilters: filters });
    } catch (err: any) {
      toast({ title: "Search Failed", description: err.message, variant: "destructive" });
      setApiResults(null);
      saveToSession({ apiResults: null });
    } finally {
      setIsSearching(false);
    }
  },[apiPerPage, fileId, organizationId, currentUserId, toast, queryClient, setSearchParams, saveToSession]);

  const handleApiPageChange = useCallback(async (newPage: number) => {
    if (!hasSearched || !apiFilters) return;
    saveToSession({ scrollOffset: 0 });
    await handleApiSearch(apiFilters, newPage, lastSearchSummaryRef.current, lastSearchChipsRef.current);
  },[hasSearched, apiFilters, handleApiSearch, saveToSession]);

  const handleApplyRecentSearch = useCallback((saved: CompanyRecentSearch) => {
    if (isCloudMode) {
      lastSearchSummaryRef.current = saved.summary;
      lastSearchChipsRef.current   = saved.chips ||[];
      handleApiSearch(saved.filters as ApolloCompanySearchFilters, 1, saved.summary, saved.chips ||[]);
    } else {
      const f = saved.filters as CompanyDBFilters;
      setDbFilters(f);
      setDbPage(1);
      writeFilters(f, 1);
      saveToSession({ dbFilters: f, dbPage: 1, scrollOffset: 0 });
    }
    setHasSearched(true);
  },[isCloudMode, handleApiSearch, writeFilters, saveToSession]);

  const handleRemoveRecentSearch = useCallback((id: string) => {
    const updated = recentSearches.filter(s => s.id !== id);
    setRecentSearches(updated);
    localStorage.setItem(isCloudMode ? LS_KEY_CLOUD : LS_KEY_CRM, JSON.stringify(updated));
  },[recentSearches, isCloudMode]);

  // -- Clear Complete Cloud Filters (For both Sidebar and Header)
  const handleClearCloudFilters = useCallback(() => {
    setApiFilters({});
    setApiResults(null);
    setHasSearched(false);
    setApiPage(1);
    setPendingChips([]);
    setPendingCount(0);
    saveToSession({
      apiFilters: {}, apiResults: null, hasSearched: false, apiPage: 1, 
      scrollOffset: 0, lastSearchChips:[], lastSearchSummary: ""
    });
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete("filters"); return n; }, { replace: true });
  }, [saveToSession, setSearchParams]);

  // -- Clear Complete CRM Filters
  const clearCRMSessionFilters = useCallback(() => {
    setDbFilters(EMPTY_DB_FILTERS);
    clearFilters();
    setDbPage(1);
    saveToSession({ dbFilters: EMPTY_DB_FILTERS, dbPage: 1, scrollOffset: 0 });
  },[clearFilters, saveToSession]);

  const updateStageMutation = useMutation({
    mutationFn: async ({ companyId, stage }: { companyId: number; stage: string }) => {
      const { error } = await supabase.from("companies").update({ stage, updated_by: currentUserId, updated_at: new Date().toISOString() }).eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Stage Updated" }); queryClient.invalidateQueries({ queryKey: ["companies-crm"] }); },
    onError: (e: any) => toast({ title: "Update Failed", description: e.message, variant: "destructive" }),
  });

  const handleStageChange = async (company: any, newStage: string) => {
    let id = company.id;
    if (!id && company.apollo_org_id) {
      try {
        const { data, error } = await supabase.from("companies").insert({
          name: company.name, website: company.website || company.website_url,
          domain: company.domain || company.primary_domain, apollo_org_id: company.apollo_org_id, logo_url: company.logo_url,
          industry: company.industry, location:[company.city, company.state, company.country].filter(Boolean).join(", "),
          employee_count: company.estimated_num_employees || company.employee_count, revenue: company.annual_revenue || company.revenue,
          organization_id: organizationId, created_by: currentUserId, stage: newStage, status: "Active", is_saved: true,
        }).select("id").single();
        if (error) throw error;
        id = data?.id;
        toast({ title: "Company Added to CRM" });
      } catch (e: any) {
        toast({ title: "Failed", description: e.message, variant: "destructive" }); return;
      }
    } else if (id) {
      // ADDED: Mark as explicitly saved since user is engaging with it
      await supabase.from("companies").update({ is_saved: true }).eq("id", id);
    }
    if (id) updateStageMutation.mutate({ companyId: id, stage: newStage });
  };

  const enrichMutation = useMutation({
    mutationFn: async (company: any) => {
      const domain = company.domain || company.primary_domain || extractDomain(company.website || company.website_url);
      if (!domain) throw new Error("No domain available");
      return enrichOrganization(domain, company.apollo_org_id || company.id);
    },
    onMutate: (c) => setEnrichingIds(prev => new Set(prev).add(c.id?.toString() || c.apollo_org_id)),
    onSuccess: (_, c) => { toast({ title: "Enriched", description: `${c.name} enriched.` }); queryClient.invalidateQueries({ queryKey: ["companies-crm"] }); },
    onError: (e: any) => toast({ title: "Enrichment Failed", description: e.message, variant: "destructive" }),
    onSettled: (_, __, c) => setEnrichingIds(prev => { const n = new Set(prev); n.delete(c.id?.toString() || c.apollo_org_id); return n; }),
  });

  const getInfoMutation = useMutation({
    mutationFn: (apolloOrgId: string) => getCompleteOrganizationInfo(apolloOrgId),
    onSuccess: (data) => { setViewingOrgDetails(data); queryClient.invalidateQueries({ queryKey: ["companies-crm"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const promoteMutation = useMutation({
    mutationFn: (companyId: number) => promoteToActiveCRM(companyId),
    onSuccess: (data) => { toast({ title: "Promoted to Active CRM 🎉", description: `${data.name} is now active.` }); queryClient.invalidateQueries({ queryKey: ["companies-crm"] }); },
    onError: (e: any) => toast({ title: "Promotion Failed", description: e.message, variant: "destructive" }),
  });

  const handleBulkPromote = async () => {
    const ids = Array.from(selectedOrgs).map(id => parseInt(id)).filter(id => !isNaN(id));
    if (!ids.length) return;
    setIsBulkPromoting(true);
    const results = await Promise.allSettled(ids.map(id => promoteToActiveCRM(id)));
    const ok = results.filter(r => r.status === "fulfilled").length;
    toast({ title: `${ok} of ${ids.length} promoted` });
    setSelectedOrgs(new Set());
    queryClient.invalidateQueries({ queryKey: ["companies-crm"] });
    setIsBulkPromoting(false);
  };

 const handleListAdd = async (targetFileIds: string[]) => {
    if (!selectedCompanyForList || !targetFileIds.length) return;
    try {
      let companyId = selectedCompanyForList.id;

      if (!companyId && selectedCompanyForList.apollo_org_id) {
        const { data, error } = await supabase.from("companies").insert({
          name: selectedCompanyForList.name, website: selectedCompanyForList.website || selectedCompanyForList.website_url,
          domain: selectedCompanyForList.domain || selectedCompanyForList.primary_domain, apollo_org_id: selectedCompanyForList.apollo_org_id,
          logo_url: selectedCompanyForList.logo_url, industry: selectedCompanyForList.industry,
          location: [selectedCompanyForList.city, selectedCompanyForList.state, selectedCompanyForList.country].filter(Boolean).join(", "),
          employee_count: selectedCompanyForList.estimated_num_employees || selectedCompanyForList.employee_count,
          revenue: selectedCompanyForList.annual_revenue || selectedCompanyForList.revenue,
          organization_id: organizationId, created_by: currentUserId, status: "Active",
          is_saved: true,
        }).select("id").single();
        if (error) throw error;
        companyId = data.id;
      } else if (companyId) {
        await supabase.from("companies").update({ is_saved: true }).eq("id", companyId);
      }

      if (!companyId) throw new Error("No company ID");

      for (const fileId of targetFileIds) {
        const { error } = await supabase.from("company_workspace_files").upsert(
          { company_id: companyId, file_id: fileId, added_by: currentUserId },
          { onConflict: "company_id,file_id" }
        );
        if (error) throw error;
      }

      toast({ title: `Added to ${targetFileIds.length} list${targetFileIds.length !== 1 ? "s" : ""}`, description: `${selectedCompanyForList.name} added.` });

      if (isCloudMode && apiResults) {
        setApiResults(prev => {
          if (!prev) return prev;
          const newOrgs = prev.organizations.map(o =>
            (o.id === companyId || o.apollo_org_id === selectedCompanyForList.apollo_org_id)
              ? { ...o, is_saved: true, id: companyId } : o
          );
          return { ...prev, organizations: newOrgs };
        });
      }
      queryClient.invalidateQueries({ queryKey: ["companies-crm"] });
      queryClient.invalidateQueries({ queryKey: ["company-list-memberships"] });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setListModalOpen(false); setSelectedCompanyForList(null);
    }
  };

const handleBulkAddToList = async (targetFileIds: string[]) => {
    if (!targetFileIds.length) return;
    setIsBulkAddingList(true);
    const companies = displayCompanies.filter((c: any) => selectedOrgs.has(c._derived.companyId));
    let ok = 0, fail = 0;

    for (const company of companies) {
      try {
        let companyId = company.id;
        if (!companyId && company.apollo_org_id) {
          const { data, error } = await supabase.from("companies").insert({
            name: company.name, apollo_org_id: company.apollo_org_id, website: company.website || company.website_url,
            domain: company.domain || company.primary_domain, industry: company.industry,
            organization_id: organizationId, created_by: currentUserId, status: "Active",
            is_saved: true,
          }).select("id").single();
          if (error) throw error;
          companyId = data.id;
        } else if (companyId) {
          await supabase.from("companies").update({ is_saved: true }).eq("id", companyId);
        }
        if (!companyId) { fail++; continue; }

        for (const fileId of targetFileIds) {
          await supabase.from("company_workspace_files").upsert(
            { company_id: companyId, file_id: fileId, added_by: currentUserId },
            { onConflict: "company_id,file_id" }
          );
        }
        ok++;
      } catch { fail++; }
    }

    toast({
      title: `${ok} compan${ok !== 1 ? "ies" : "y"} added to ${targetFileIds.length} list${targetFileIds.length !== 1 ? "s" : ""}`,
      description: fail > 0 ? `${fail} failed` : undefined,
    });

    if (isCloudMode && apiResults) {
      setApiResults(prev => {
        if (!prev) return prev;
        const selectedSet = new Set(companies.map((c: any) => c.apollo_org_id || c.id?.toString()));
        const newOrgs = prev.organizations.map(o => {
          const matchKey = o.apollo_org_id || o.id?.toString();
          return selectedSet.has(matchKey) ? { ...o, is_saved: true } : o;
        });
        return { ...prev, organizations: newOrgs };
      });
    }

    setSelectedOrgs(new Set());
    queryClient.invalidateQueries({ queryKey: ["companies-crm"] });
    queryClient.invalidateQueries({ queryKey: ["company-list-memberships"] });
    setListModalOpen(false);
    setIsBulkAddingList(false);
  };

  // 2. ADD THIS: Single Company Save Handler
  const handleSaveCompany = async (company: any) => {
    let companyId = company.id;
    const cidStr = companyId?.toString() || company.apollo_org_id;
    setIsSavingIds(prev => new Set(prev).add(cidStr));
    try {
      if (!companyId && company.apollo_org_id) {
        const { data, error } = await supabase.from("companies").insert({
          name: company.name, website: company.website || company.website_url,
          domain: company.domain || company.primary_domain, apollo_org_id: company.apollo_org_id, logo_url: company.logo_url,
          industry: company.industry, location:[company.city, company.state, company.country].filter(Boolean).join(", "),
          employee_count: company.estimated_num_employees || company.employee_count, revenue: company.annual_revenue || company.revenue,
          organization_id: organizationId, created_by: currentUserId, status: "Intelligence",
          is_saved: true
        }).select("id").single();
        if (error) throw error;
        companyId = data.id;
      } else if (companyId) {
        const { error } = await supabase.from("companies").update({ is_saved: true }).eq("id", companyId);
        if (error) throw error;
      }
      toast({ title: "Company Saved" });
      
      if (isCloudMode && apiResults) {
         setApiResults(prev => {
            if (!prev) return prev;
            const newOrgs = prev.organizations.map(o => 
               (o.id === companyId || o.apollo_org_id === company.apollo_org_id) ? { ...o, is_saved: true, id: companyId } : o
            );
            return { ...prev, organizations: newOrgs };
         });
      }
      queryClient.invalidateQueries({ queryKey: ["companies-crm"] });
    } catch (e: any) {
      toast({ title: "Save Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSavingIds(prev => { const n = new Set(prev); n.delete(cidStr); return n; });
    }
  };

  // 3. ADD THIS: Bulk Save Handler
  const handleBulkSave = async () => {
    setIsBulkSaving(true);
    const companiesToSave = displayCompanies.filter((c: any) => selectedOrgs.has(c._derived.companyId));
    let ok = 0, fail = 0;
    
    for (const company of companiesToSave) {
      try {
        let companyId = company.id;
        if (!companyId && company.apollo_org_id) {
          const { data, error } = await supabase.from("companies").insert({
            name: company.name, website: company.website || company.website_url,
            domain: company.domain || company.primary_domain, apollo_org_id: company.apollo_org_id, logo_url: company.logo_url,
            industry: company.industry, location:[company.city, company.state, company.country].filter(Boolean).join(", "),
            employee_count: company.estimated_num_employees || company.employee_count, revenue: company.annual_revenue || company.revenue,
            organization_id: organizationId, created_by: currentUserId, status: "Intelligence",
            is_saved: true
          }).select("id").single();
          if (error) throw error;
          companyId = data.id;
        } else if (companyId) {
          const { error } = await supabase.from("companies").update({ is_saved: true }).eq("id", companyId);
          if (error) throw error;
        }
        ok++;
      } catch (e) { fail++; }
    }
    
    if (isCloudMode && apiResults) {
         setApiResults(prev => {
            if (!prev) return prev;
            const selectedSet = new Set(companiesToSave.map((c: any) => c.apollo_org_id || c.id?.toString()));
            const newOrgs = prev.organizations.map(o => {
               const matchKey = o.apollo_org_id || o.id?.toString();
               return selectedSet.has(matchKey) ? { ...o, is_saved: true } : o;
            });
            return { ...prev, organizations: newOrgs };
         });
    }

    toast({ title: `${ok} companies saved`, description: fail > 0 ? `${fail} failed` : undefined });
    setSelectedOrgs(new Set());
    queryClient.invalidateQueries({ queryKey: ["companies-crm"] });
    setIsBulkSaving(false);
  };

  const displayCompanies = useMemo(() => {
    const raw = isCloudMode ? (apiResults?.organizations || []) : (databaseResult?.companies ||[]);
    return raw.map((company: any) => {
      const companyId  = company.id?.toString() || company.apollo_org_id || "";
      const domain     = company.domain || company.primary_domain || extractDomain(company.website || company.website_url);
      const rawPhone   = company.phone || company.primary_phone?.number || company.sanitized_phone || null;
      const phoneNorm  = rawPhone?.trim() ? (rawPhone.trim().startsWith("+") ? rawPhone.trim() : `+${rawPhone.trim()}`) : null;
      const phoneCountry = phoneNorm ? getCachedCountry(phoneNorm) : null;

      const cityState   = [company.city, company.state].filter(Boolean).join(", ");
      const country     = company.country || null;
      const primaryLoc  = cityState || company.location?.split(",").slice(0, -1).join(", ") || "—";
      const secondaryLoc = country || company.location?.split(",").pop()?.trim() || "—";
      const timeLookup  =[primaryLoc, secondaryLoc].filter(s => s && s !== "—").join(", ");
      const localTime   = timeLookup ? getLocalTime(timeLookup) : null;

      return {
        ...company,
        _derived: {
          companyId, domain, displayPhone: rawPhone?.trim() || null, phoneNorm, phoneCountry,
          primaryLoc, secondaryLoc, localTime,
          isPromoted: company.status === "Active", hasApollo: !!company.apollo_org_id,
          revenue: company.revenue || company.annual_revenue || company.annual_revenue_printed || null,
          founded: company.founded_year || company.start_date || "—", industry: company.industry || "—",
        },
      };
    });
  },[isCloudMode, apiResults, databaseResult]);

  // Virtualizer config (strict size calculation, no dynamic measureElement)
  const rowVirtualizer = useVirtualizer({
    count: displayCompanies.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // Set strict height mapped to row
    overscan: 10,
  });

  const handleSelectAll = useCallback(() => {
    const all = displayCompanies.map((c: any) => c._derived.companyId).filter(Boolean);
    const allSelected = all.length > 0 && all.every((id: string) => selectedOrgs.has(id));
    setSelectedOrgs(allSelected ? new Set() : new Set(all));
  },[displayCompanies, selectedOrgs]);

  const handleSelectOrg = useCallback((id: string) => {
    setSelectedOrgs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  },[]);

  const handleCopyPhone = useCallback((phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
    toast({ title: "Copied!" });
  }, [toast]);

  const totalResults = isCloudMode ? (apiResults?.pagination?.total_entries || 0) : (databaseResult?.totalCount || 0);
  const totalPages   = isCloudMode ? (apiResults?.pagination?.total_pages || 0) : (databaseResult?.totalPages || 0);
  const currentPage  = isCloudMode ? apiPage : dbPage;
  const perPage      = isCloudMode ? apiPerPage : dbPerPage;
  const isLoading    = isCloudMode ? isSearching : isLoadingDB;
  const isFetching   = isCloudMode ? isSearching : isFetchingDB;

  const queryEnabled = isCloudMode ? hasSearched : true;
  const activeDBFilterCount = countActiveDBFilters(dbFilters);
  const pageTitle = fileId && currentFile ? (currentFile as any).name : "My Companies";

  // Virtualizer calculations
  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start || 0 : 0;
  const paddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end || 0)
    : 0;

  return (
<TooltipProvider delayDuration={300}>

    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50/80">
      {/* ════ HEADER ════════════════════════════════════════════════════════ */}
      <header className="bg-white border-b border-slate-200 px-5 flex items-center gap-3 shadow-sm z-30 flex-shrink-0 h-[52px]">
        <button
          onClick={() => setIsSidebarOpen(v => !v)}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
        >
          {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        {fileId && (
          <button onClick={() => navigate("/lists")} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          <h1 className="text-sm font-semibold text-slate-800">{pageTitle}</h1>
          {fileId && currentFile && (currentFile as any).workspaces && (
            <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 border-slate-200">
              <FolderOpen size={9} className="mr-1" />{(currentFile as any).workspaces.name}
            </Badge>
          )}
        </div>

        {!fileId && (
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={switchToCloud}
              className={cn("px-3 py-1 rounded-md text-[11px] font-medium transition-all", isCloudMode ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              <Cloud size={11} className="inline mr-1" />Search Cloud
            </button>
            <button
              onClick={switchToCRM}
              className={cn("px-3 py-1 rounded-md text-[11px] font-medium transition-all", !isCloudMode ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              <Database size={11} className="inline mr-1" />Saved Companies
            </button>
          </div>
        )}

        {!fileId && !isCloudMode && workspaceLists.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Select
              value={selectedListId || "__all__"}
              onValueChange={v => {
                const id = v === "__all__" ? null : v;
                setSelectedListId(id);
                setDbPage(1);
                saveToSession({ selectedListId: id, dbPage: 1, scrollOffset: 0 });
              }}
            >
              <SelectTrigger className="h-8 text-xs border-slate-200 bg-slate-50 hover:bg-white w-auto min-w-[130px] max-w-[200px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <List size={12} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate text-slate-600">
                    {selectedListId ? (workspaceLists as any[]).flatMap((g: any) => g.files).find((f: any) => f.id === selectedListId)?.name ?? "List" : "All Companies"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">
                  <div className="flex items-center gap-2"><Building2 size={13} className="text-slate-400" /><span>All Companies</span></div>
                </SelectItem>
                {(workspaceLists as any[]).map((group: any) => (
                  <SelectGroup key={group.workspace.id}>
                    <SelectLabel className="flex items-center gap-2 text-[11px] text-black-500 font-semibold"><Folder size={13} className="text-slate-400" />{group.workspace.name}</SelectLabel>
                    {group.files.map((f: any) => (
                      <SelectItem key={f.id} value={f.id} className="text-xs pl-14">
                        <div className="flex items-center gap-2"><List size={12} className="text-slate-400" /><span>{f.name}</span></div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {selectedListId && (
              <button onClick={() => { setSelectedListId(null); setDbPage(1); saveToSession({ selectedListId: null, dbPage: 1 }); }} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
            )}
          </div>
        )}

        <div className="flex-1" />

        {!isCloudMode && selectedListId && (
          <div className="flex items-center gap-1 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1">
            <List size={10} className="text-violet-500" />
            <span className="text-[10px] font-semibold text-violet-700">{(workspaceLists as any[]).flatMap((g: any) => g.files).find((f: any) => f.id === selectedListId)?.name ?? "List"}</span>
          </div>
        )}

        {/* Active Cloud Search badge / Reset */}
        {isCloudMode && hasSearched && (
          <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
            <span className="text-[10px] font-semibold text-indigo-600">
              Cloud Search Active
            </span>
            <button onClick={handleClearCloudFilters} className="text-indigo-400 hover:text-indigo-600 ml-1">
              <X size={11} />
            </button>
          </div>
        )}

        {/* Active CRM filter badge / Reset */}
        {!isCloudMode && activeDBFilterCount > 0 && (
          <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
            <span className="text-[10px] font-semibold text-indigo-600">
              {activeDBFilterCount} filter{activeDBFilterCount !== 1 ? "s" : ""} active
            </span>
            <button onClick={clearCRMSessionFilters} className="text-indigo-400 hover:text-indigo-600 ml-1">
              <X size={11} />
            </button>
          </div>
        )}

        {(hasSearched || !isCloudMode) && (
          <span className="text-[11px] text-slate-500 hidden md:flex items-center gap-1">
            {isFetching && !isLoading ? (
              <span className="flex items-center gap-1.5 text-indigo-500"><Loader2 size={12} className="animate-spin" /> Filtering…</span>
            ) : (
              <><span className="font-semibold text-slate-700">{totalResults.toLocaleString()}</span> companies</>
            )}
          </span>
        )}

        {/* Outer TooltipProvider wraps headers & table completely */}
  {!isCloudMode && (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => refetchDB()}
          disabled={isFetchingDB}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={cn(isFetchingDB && "animate-spin")} />
        </button>
      </TooltipTrigger>
      <TooltipContent>Refresh</TooltipContent>
    </Tooltip>
  )}
</header>

      {/* ════ BODY ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">
        {isSidebarOpen && (
          <div className="w-[240px] flex-shrink-0 border-r border-slate-200 bg-white z-20 flex flex-col overflow-y-hidden">
            {isCloudMode ? (
              <CompanySearchFilterSidebar
                onClear={handleClearCloudFilters}
                onSearch={(apolloFilters, summary) => {
                  lastSearchSummaryRef.current = summary;
                  lastSearchChipsRef.current   = pendingChips;
                  handleApiSearch(apolloFilters, 1, summary, pendingChips);
                }}
                isSearching={isSearching}
                totalResults={totalResults}
                onClose={() => setIsSidebarOpen(false)}
                initialFilters={apiFilters}
                
                
                onFiltersChange={handleCloudFiltersChange}
              />
            ) : (
              <DatabaseFilterSidebar
                filters={dbFilters}
                onClear={clearCRMSessionFilters}
                onFiltersChange={(f) => {
                  setDbFilters(f);
                  setDbPage(1);
                  writeFilters(f, 1);
                  saveToSession({ dbFilters: f, dbPage: 1, scrollOffset: 0 });
                }}
                isLoading={isFetchingDB}
                totalResults={totalResults}
                onClose={() => setIsSidebarOpen(false)}
              />
            )}
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {isLoading && queryEnabled ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-xs text-slate-500 font-medium">{isCloudMode ? "Searching companies…" : "Loading companies…"}</p>
            </div>
          ) : !queryEnabled || (!hasSearched && isCloudMode) ? (
            <CompanySearchEmptyState
              recentSearches={recentSearches}
              onApplySearch={handleApplyRecentSearch}
              onRemoveSearch={handleRemoveRecentSearch}
              isCloudMode={isCloudMode}
              pendingFilterChips={pendingChips}
              pendingFilterCount={pendingCount}
              onRunSearch={isCloudMode ? () => { document.querySelector<HTMLButtonElement>("[data-run-search]")?.click(); } : undefined}
            />
          ) : (
            <>
              {selectedOrgs.size > 0 && (
                <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100 z-10">
                  <span className="text-xs font-semibold text-indigo-700 mr-1">{selectedOrgs.size} selected</span>
                        {isCloudMode && (
        <button
          onClick={handleBulkSave} disabled={isBulkSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors disabled:opacity-60"
        >
          {isBulkSaving ? <Loader2 size={12} className="animate-spin" /> : <BookmarkPlus size={12} />} Save Companies
        </button>
      )}
                  {/* <button
                    onClick={handleBulkPromote} disabled={isBulkPromoting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                  >
                    {isBulkPromoting ? <Loader2 size={12} className="animate-spin" /> : <DatabaseZap size={12} />} Promote to CRM
                  </button> */}
                  <button
                    onClick={() => { setSelectedCompanyForList(null); setListModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors"
                  >
                    <ListPlus size={12} /> Add to List
                  </button>
                  <button onClick={() => setSelectedOrgs(new Set())} className="ml-auto text-indigo-400 hover:text-indigo-600 p-1 rounded"><X size={14} /></button>
                </div>
              )}

              <div className={cn("flex-1 flex flex-col overflow-hidden transition-opacity duration-200", isFetching && !isLoading && "opacity-60 pointer-events-none")}>
                {displayCompanies.length === 0 && !isFetching ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4"><Building2 className="h-5 w-5 text-slate-400" /></div>
                    <p className="text-sm font-medium text-slate-600 mb-1">No companies found</p>
                    <p className="text-xs text-slate-400 mb-4">{isCloudMode ? "Try adjusting your search filters." : "Try adjusting your filters or switch to Search Cloud."}</p>
                    {!isCloudMode && activeDBFilterCount > 0 && (
                      <button onClick={clearCRMSessionFilters} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Clear all filters</button>
                    )}
                    {!isCloudMode && (
                      <button onClick={switchToCloud} className="mt-2 text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1"><Cloud size={12} /> Search from Cloud</button>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden bg-white rounded-tl-xl border border-slate-200 border-b-0 shadow-sm">
                    <div ref={parentRef} className="h-full overflow-y-auto overflow-x-auto">
                      <table className="w-full min-w-max divide-y divide-slate-200 table-fixed">
                        <thead className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-violet-600 shadow-sm">
                          <tr className="h-10">
                            <th className="sticky left-0 z-20 px-3 py-2.5 text-left w-[40px] text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-r border-slate-200">
  <Checkbox
    checked={displayCompanies.length > 0 && displayCompanies.every((c: any) => selectedOrgs.has(c._derived.companyId))}
    onCheckedChange={handleSelectAll}
    className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 h-3.5 w-3.5"
  />
</th>

<th className="sticky left-[40px] z-20 px-3 py-2.5 text-left w-[240px] text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-r border-slate-200">
  Company
</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 w-[160px]"><div className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</div></th>
                            <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 w-[100px]">Links</th>
                            <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 w-[110px]">Revenue</th>
                            <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 w-[90px]">Founded</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 w-[150px]">CRM Stage</th>
                            <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 w-[110px]">Actions</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 w-[200px]"><div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</div></th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 w-[150px]">Industry</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 w-[110px]"><div className="flex items-center gap-1"><Users className="h-3 w-3" /> Employees</div></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white text-[11px]">
                          {paddingTop > 0 && (
                            <tr><td colSpan={10} style={{ height: `${paddingTop}px`, padding: 0, border: 0 }} /></tr>
                          )}
                          {virtualItems.map((virtualRow) => {
                            const company = displayCompanies[virtualRow.index];
                            const {
                              companyId, domain, displayPhone, phoneCountry,
                              primaryLoc, secondaryLoc, localTime,
                              isPromoted, hasApollo, revenue, founded, industry,
                            } = company._derived;
                            const isSelected = selectedOrgs.has(companyId);

                            const PhoneFlagEl = phoneCountry
                              ? (() => { const F = flags[phoneCountry as keyof typeof flags]; return F ? <F title={phoneCountry} className="h-3.5 w-5 shadow-sm rounded-sm object-cover" /> : <Globe className="h-3.5 w-3.5 text-slate-400" />; })()
                              : <Globe className="h-3.5 w-3.5 text-slate-400" />;

                            return (
                              <tr
                                key={company._derived.companyId}
                                data-index={virtualRow.index}
                                // Enforcing explicit exact height instead of ref recalculations
                                className={cn("h-[52px] group transition-colors duration-100", isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50/80")}
                              >
                                <td className="sticky left-0 z-5 bg-white group-hover:bg-slate-50 px-3 py-2 border-r border-slate-100 w-[40px]">
  <Checkbox
    checked={isSelected}
    onCheckedChange={() => handleSelectOrg(companyId)}
    className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 h-3.5 w-3.5"
  />
</td>
{/* COMPANY NAME CELL */}
<td className="sticky left-[40px] z-5 bg-white group-hover:bg-slate-50 px-3 py-2 shadow-[2px_0_6px_-3px_rgba(0,0,0,0.08)] border-r border-slate-100 w-[260px]">
  <div className="flex items-center gap-2">
    <Avatar className="h-8 w-8 border shadow-sm flex-shrink-0">
      <AvatarImage src={company.logo_url} />
      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[9px] font-bold">
        {getInitials(company.name)}
      </AvatarFallback>
    </Avatar>

    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1">
        
        {/* ==================== CLOUD MODE ==================== */}
        {isCloudMode ? (
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();

              const apolloId = company.apollo_org_id;
              console.log("🔍 [CLOUD CLICK] Company:", company.name, "| Apollo ID:", apolloId);

              if (!apolloId) {
                console.warn("⚠️ No apollo_org_id");
                if (company.id) navigate(`/companies/${company.id}`);
                return;
              }

              const cidStr = apolloId.toString();
              setIsSavingIds(prev => new Set(prev).add(cidStr));

              try {
                console.log("🚀 Updating is_saved=true for apollo_org_id:", apolloId);

                const { error } = await supabase
                  .from("companies")
                  .update({
                    is_saved: true,
                    updated_at: new Date().toISOString(),
                    updated_by: currentUserId,
                  })
                  .eq("apollo_org_id", apolloId)
                  .eq("organization_id", organizationId);

                if (error) {
                  console.error("❌ Supabase error:", error);
                  throw error;
                }

                console.log("✅ Successfully marked as saved");

                toast({ title: "Company Saved ✓" });

                // Update local UI
                if (apiResults) {
                  setApiResults((prev: any) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      organizations: prev.organizations.map((o: any) =>
                        o.apollo_org_id === apolloId ? { ...o, is_saved: true } : o
                      )
                    };
                  });
                }

                queryClient.invalidateQueries({ queryKey: ["companies-crm"] });

              } catch (err: any) {
                console.error("💥 Save failed:", err);
                toast({
                  title: "Save Failed",
                  description: err.message || "Try again",
                  variant: "destructive"
                });
              } finally {
                setIsSavingIds(prev => {
                  const n = new Set(prev);
                  n.delete(cidStr);
                  return n;
                });
              }

              // Navigate
              if (company.id) {
                navigate(`/companies/${company.id}`);
              }
            }}
            disabled={isSavingIds.has(companyId) || !!company.is_saved}
            className="font-semibold text-slate-900 hover:text-indigo-700 truncate text-[11px] block leading-tight text-left disabled:opacity-60 hover:underline w-full"
          >
            {isSavingIds.has(companyId) ? (
              <span className="flex items-center gap-1">
                <Loader2 size={9} className="animate-spin" /> Saving...
              </span>
            ) : company.is_saved ? (
              <span className="flex items-center gap-1">
                {company.name} <BookmarkCheck size={13} className="text-green-600" />
              </span>
            ) : (
              company.name
            )}
          </button>
        ) : 
        /* ==================== CRM MODE (existing links) ==================== */
        company.id ? (
          <RouterLink
            to={`/companies/${company.id}`}
            className="font-semibold text-slate-900 hover:text-indigo-700 truncate text-[11px] block leading-tight"
          >
            {company.name}
          </RouterLink>
        ) : (
          <span className="font-semibold text-slate-900 truncate text-[11px] block leading-tight">
            {company.name}
          </span>
        )}

      </div>

      <p className="text-[9px] text-slate-500 truncate">
        {company.domain || company.primary_domain || "No domain"}
      </p>
    </div>
  </div>
</td>
                                <td className="px-3 py-2 whitespace-nowrap w-[160px]">
                                  {displayPhone ? (
                                    <div className="flex items-center gap-2">
                                      {PhoneFlagEl}
                                      <span className="text-[10.5px] text-slate-700 truncate max-w-[90px]">{displayPhone}</span>
                                      <Tooltip><TooltipTrigger asChild>
                                          <button onClick={() => handleCopyPhone(displayPhone)} className="p-1 hover:bg-slate-100 rounded transition-colors">
                                            {copiedPhone === displayPhone ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                                          </button>
                                        </TooltipTrigger><TooltipContent>Copy</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  ) : (<span className="text-slate-400 text-[10px]">—</span>)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-center w-[100px]">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {(company.website || company.website_url) && (
                                      <Tooltip><TooltipTrigger asChild><a href={company.website || company.website_url} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Globe className="h-3.5 w-3.5" /></a></TooltipTrigger><TooltipContent>Website</TooltipContent></Tooltip>
                                    )}
                                    {(company.linkedin || company.linkedin_url) && (
                                      <Tooltip><TooltipTrigger asChild><a href={company.linkedin || company.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"><Linkedin className="h-3.5 w-3.5" /></a></TooltipTrigger><TooltipContent>LinkedIn</TooltipContent></Tooltip>
                                    )}
                                    {(company.twitter || company.twitter_url) && (
                                      <Tooltip><TooltipTrigger asChild><a href={company.twitter || company.twitter_url} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded transition-colors"><Twitter className="h-3.5 w-3.5" /></a></TooltipTrigger><TooltipContent>Twitter</TooltipContent></Tooltip>
                                    )}
                                    {(company.facebook || company.facebook_url) && (
                                      <Tooltip><TooltipTrigger asChild><a href={company.facebook || company.facebook_url} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Facebook className="h-3.5 w-3.5" /></a></TooltipTrigger><TooltipContent>Facebook</TooltipContent></Tooltip>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center whitespace-nowrap w-[110px]"><span className="text-[10.5px] font-medium text-slate-800">{fmtRevenue(revenue)}</span></td>
                                <td className="px-3 py-2 whitespace-nowrap text-center text-[10.5px] text-slate-700 font-medium w-[90px]">{founded}</td>
                                <td className="px-3 py-2 whitespace-nowrap w-[150px]">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" className={cn("h-6 min-w-[110px] text-[9px] font-semibold uppercase tracking-tight rounded-md border shadow-sm px-2 py-0.5", stageColors[company.stage || company.status || "default"])}>
                                        {company.stage || company.status || "Stage"} <ChevronDown className="ml-1 h-2.5 w-2.5 opacity-70" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="min-w-[140px] max-h-60 overflow-y-auto text-[10px]">
                                      {STAGES.map(s => <DropdownMenuItem key={s} onClick={() => handleStageChange(company, s)} className={cn("py-1 cursor-pointer", (company.stage || company.status) === s && "bg-indigo-50 font-medium")}>{s}</DropdownMenuItem>)}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-center w-[140px]">
  <div className="flex items-center justify-center gap-0.5  group-hover:opacity-100 transition-opacity duration-150">

    {/* View */}
    {!isCloudMode && company.id && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
            asChild
          >
            <RouterLink to={`/companies/${company.id}`}>
              <Eye size={13} />
            </RouterLink>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-xs">View</TooltipContent>
      </Tooltip>
    )}

    {/* Save (Cloud mode) */}
    {isCloudMode && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
            onClick={() => handleSaveCompany(company)}
            disabled={company.is_saved || isSavingIds.has(companyId)}
          >
            {company.is_saved ? (
              <BookmarkCheck size={13} className="text-green-600" />
            ) : (
              <BookmarkPlus size={13} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          {company.is_saved ? "Saved" : "Save"}
        </TooltipContent>
      </Tooltip>
    )}

    {/* Add to List */}
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
          onClick={() => {
            setSelectedCompanyForList(company);
            setListModalOpen(true);
          }}
        >
          <ListPlus size={13} />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-xs">Add to List</TooltipContent>
    </Tooltip>

    {/* Enrich */}
    {/* {domain && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
            onClick={() => enrichMutation.mutate(company)}
            disabled={enrichingIds.has(companyId)}
          >
            {enrichingIds.has(companyId)
              ? <Loader2 size={13} className="animate-spin" />
              : <Zap size={13} />
            }
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Enrich</TooltipContent>
      </Tooltip>
    )} */}

    {/* Get Full Info */}
    {!isCloudMode && company.apollo_org_id && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
            onClick={() => getInfoMutation.mutate(company.apollo_org_id)}
          >
            <Sparkles size={13} />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Get Full Info</TooltipContent>
      </Tooltip>
    )}

  </div>
</td>
                                <td className="px-3 py-2 w-[200px] leading-tight">
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5 text-[10.5px] text-slate-700 font-medium"><MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" /><span className="truncate max-w-[160px]">{primaryLoc}</span></div>
                                    <div className="pl-[19px] flex items-center gap-1.5 text-[9.5px] text-slate-500">
                                      <span className="truncate max-w-[100px]">{secondaryLoc !== "—" ? secondaryLoc : "—"}</span>
                                      {primaryLoc !== "—" && secondaryLoc !== "—" && localTime && (<><span className="text-slate-300">•</span><div className="flex items-center gap-1"><Clock size={10} className="text-blue-500 flex-shrink-0" /><span className="text-[10px] text-blue-600 font-medium">{localTime}</span></div></>)}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-[10.5px] text-slate-700 w-[150px]"><span className="truncate block max-w-[130px]">{industry}</span></td>
                                <td className="px-3 py-2 whitespace-nowrap w-[110px]"><span className="text-[10.5px] font-medium text-slate-800">{fmtEmployees(company.employee_count || company.estimated_num_employees)}</span></td>
                              </tr>
                            );
                          })}
                          {paddingBottom > 0 && (
                            <tr><td colSpan={10} style={{ height: `${paddingBottom}px`, padding: 0, border: 0 }} /></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {displayCompanies.length > 0 && totalPages > 0 && (
                <div className="flex-shrink-0 bg-white border border-slate-200 border-t-0 px-5 py-2.5 shadow-sm">
                  <div className="flex items-center justify-between gap-4 text-[10px]">
                    <p className="text-slate-500">{((currentPage - 1) * perPage + 1).toLocaleString()}–{Math.min(currentPage * perPage, totalResults).toLocaleString()} of {totalResults.toLocaleString()}</p>
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-500 font-medium">Rows:</span>
                      <Select
                        value={perPage.toString()}
                        onValueChange={v => {
                          const n = parseInt(v);
                          if (isCloudMode) { setApiPerPage(n); setApiPage(1); saveToSession({ apiPerPage: n, apiPage: 1, scrollOffset: 0 }); } 
                          else { setDbPerPage(n); setDbPage(1); saveToSession({ dbPerPage: n, dbPage: 1, scrollOffset: 0 }); }
                        }}
                      >
                        <SelectTrigger className="w-16 h-7 text-[10px] px-2"><SelectValue /></SelectTrigger>
                        <SelectContent>{[10, 25, 50, 100].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm"
                        onClick={() => {
                          if (isCloudMode) { handleApiPageChange(apiPage - 1); } 
                          else { const p = Math.max(1, dbPage - 1); setDbPage(p); saveToSession({ dbPage: p, scrollOffset: 0 }); }
                        }}
                        disabled={currentPage === 1 || isFetching} className="h-7 px-2.5 text-[10px]">
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />Prev
                      </Button>
                      <span className="font-medium px-3 text-slate-700">{currentPage} / {totalPages}</span>
                      <Button variant="outline" size="sm"
                        onClick={() => {
                          if (isCloudMode) { handleApiPageChange(apiPage + 1); } 
                          else { const p = Math.min(totalPages, dbPage + 1); setDbPage(p); saveToSession({ dbPage: p, scrollOffset: 0 }); }
                        }}
                        disabled={currentPage >= totalPages || isFetching} className="h-7 px-2.5 text-[10px]">
                        Next<ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
       
      </div>

      {selectedCompanyForList && listModalOpen && (
        <AddToCompanyListModal
          open={listModalOpen}
          onOpenChange={open => { setListModalOpen(open); if (!open) setSelectedCompanyForList(null); }}
          companyName={selectedCompanyForList.name}
          companyIds={
            // Only pass ID for saved CRM companies — cloud companies don't have one yet
            !isCloudMode && selectedCompanyForList.id ? [selectedCompanyForList.id.toString()] : []
          }
          onConfirm={handleListAdd}
          isFromSearch={isCloudMode}
        />
      )}

      {!selectedCompanyForList && listModalOpen && selectedOrgs.size > 0 && (
        <AddToCompanyListModal
          open={listModalOpen}
          onOpenChange={open => { setListModalOpen(open); }}
          companyName={`${selectedOrgs.size} companies`}
          companyIds={
            // For CRM bulk: pass all selected company IDs
            !isCloudMode
              ? displayCompanies
                  .filter((c: any) => selectedOrgs.has(c._derived.companyId) && c.id)
                  .map((c: any) => c.id.toString())
              : []
          }
          onConfirm={handleBulkAddToList}
          isFromSearch={isCloudMode}
        />
      )}

      <Dialog open={!!viewingOrgDetails} onOpenChange={() => setViewingOrgDetails(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4 text-xl">
              <Avatar className="h-10 w-10"><AvatarImage src={viewingOrgDetails?.logo_url} /><AvatarFallback className="text-lg">{getInitials(viewingOrgDetails?.name || "")}</AvatarFallback></Avatar>
              {viewingOrgDetails?.name}
            </DialogTitle>
            <DialogDescription>Complete organization information</DialogDescription>
          </DialogHeader>
          {viewingOrgDetails && (
            <div className="space-y-5 py-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div><p className="text-xs text-slate-500 uppercase font-semibold mb-1">Industry</p><p className="text-sm font-medium">{viewingOrgDetails.industry || "N/A"}</p></div>
                <div><p className="text-xs text-slate-500 uppercase font-semibold mb-1">Employees</p><p className="text-sm font-medium">{fmtEmployees(viewingOrgDetails.estimated_num_employees)}</p></div>
                <div><p className="text-xs text-slate-500 uppercase font-semibold mb-1">Revenue</p><p className="text-sm font-medium">{fmtRevenue((viewingOrgDetails as any).annual_revenue_printed || (viewingOrgDetails as any).organization_revenue_printed)}</p></div>
                <div><p className="text-xs text-slate-500 uppercase font-semibold mb-1">Founded</p><p className="text-sm font-medium">{viewingOrgDetails.founded_year || "N/A"}</p></div>
              </div>
              {viewingOrgDetails.short_description && (
                <div><p className="text-xs text-slate-500 uppercase font-semibold mb-1">Description</p><p className="text-sm text-slate-700 leading-relaxed">{viewingOrgDetails.short_description}</p></div>
              )}
              <div><p className="text-xs text-slate-500 uppercase font-semibold mb-1">Location</p>
                <p className="text-sm text-slate-700">{[viewingOrgDetails.city, viewingOrgDetails.state, viewingOrgDetails.country].filter(Boolean).join(", ") || "N/A"}</p>
              </div>
              {(viewingOrgDetails as any).technology_names?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Technologies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(viewingOrgDetails as any).technology_names.slice(0, 20).map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                    {(viewingOrgDetails as any).technology_names.length > 20 && <Badge variant="outline" className="text-xs">+{(viewingOrgDetails as any).technology_names.length - 20} more</Badge>}
                  </div>
                </div>
              )}
              {(viewingOrgDetails as any).keywords?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(viewingOrgDetails as any).keywords.slice(0, 15).map((k: string) => <Badge key={k} variant="outline" className="text-xs">{k}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewingOrgDetails(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
</TooltipProvider>

  );
};

export default CompanyIntelligenceSearchPage;