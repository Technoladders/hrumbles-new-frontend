// src/pages/sales/CompanyIntelligenceSearchPage.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link as RouterLink, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from "react-redux";
import {
  Building2, Search, Plus, Globe, Linkedin, Users, MapPin,
  TrendingUp, DollarSign, Eye, ChevronLeft, ChevronRight,
  Filter, X, Loader2, RefreshCw, Download, MoreHorizontal,
  Sparkles, CheckCircle2, AlertCircle, ExternalLink, Save,
  ListPlus, Info, Zap, Database, Settings2, Table2, Cloud,
  SlidersHorizontal, ChevronDown, ArrowUpDown, Star, Bookmark,
  Calendar, Hash, Tag, Building, Briefcase, Phone, Copy, Check,
  Facebook, Twitter, Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CompanySearchFilterSidebar } from "@/components/sales/company-search/CompanySearchFilterSidebar";
import { DatabaseFilterSidebar } from "@/components/sales/company-search/DatabaseFilterSidebar";
import {
  searchCompaniesInApolloV2,
  saveAllSearchResultsToDatabase,
  enrichOrganization,
  getCompleteOrganizationInfo,
  promoteToActiveCRM,
  type ApolloOrganization,
  type ApolloCompanySearchFilters,
  type ApolloSearchResponseV2,
} from "@/services/sales/apolloCompanySearch";
import { AddToCompanyListModal } from '@/components/sales/company-search/AddToCompanyListModal';
import { Skeleton } from "@/components/ui/skeleton";
import PhoneInput, { parsePhoneNumber, isValidPhoneNumber } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import 'react-phone-number-input/style.css';
import { lookupViaCity, findFromCityStateProvince, findFromIsoCode } from 'city-timezones';
import "react-country-state-city/dist/react-country-state-city.css"; // (optional, if you're using dropdowns elsewhere)

// ============================================================================
// Constants & Helpers
// ============================================================================

const STAGES = [
  'Identified', 'Targeting', 'In Outreach', 'Warm', 'Qualified Company',
  'Proposal Sent / In Discussion', 'Negotiation', 'Closed - Won',
  'Closed - Lost', 'Re-engage Later',
];

const stageColors: Record<string, string> = {
  'Identified': 'bg-blue-100 text-blue-800',
  'Targeting': 'bg-indigo-100 text-indigo-800',
  'In Outreach': 'bg-teal-100 text-teal-800',
  'Warm': 'bg-yellow-100 text-yellow-800',
  'Qualified Company': 'bg-green-100 text-green-800',
  'Proposal Sent / In Discussion': 'bg-purple-100 text-purple-800',
  'Negotiation': 'bg-orange-100 text-orange-800',
  'Closed - Won': 'bg-emerald-100 text-emerald-800',
  'Closed - Lost': 'bg-red-100 text-red-800',
  'Re-engage Later': 'bg-gray-100 text-gray-800',
  'Intelligence': 'bg-slate-100 text-slate-600',
  'Active': 'bg-green-100 text-green-700',
  'default': 'bg-gray-100 text-gray-800',
};

// Country code to flag emoji
const countryFlags: Record<string, string> = {
  'US': '🇺🇸', 'GB': '🇬🇧', 'UK': '🇬🇧', 'IN': '🇮🇳', 'BR': '🇧🇷', 'DE': '🇩🇪',
  'FR': '🇫🇷', 'ES': '🇪🇸', 'IT': '🇮🇹', 'JP': '🇯🇵', 'CN': '🇨🇳',
  'AU': '🇦🇺', 'SG': '🇸🇬', 'AE': '🇦🇪', 'ZA': '🇿🇦', 'MY': '🇲🇾',
  'MX': '🇲🇽', 'CH': '🇨🇭', 'EG': '🇪🇬', 'TR': '🇹🇷', 'CZ': '🇨🇿',
  'CA': '🇨🇦', 'NL': '🇳🇱', 'BE': '🇧🇪', 'AT': '🇦🇹', 'SE': '🇸🇪',
  'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'PL': '🇵🇱', 'RU': '🇷🇺',
  'KR': '🇰🇷', 'TH': '🇹🇭', 'ID': '🇮🇩', 'PH': '🇵🇭', 'VN': '🇻🇳',
  'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪', 'NG': '🇳🇬',
  'KE': '🇰🇪', 'IL': '🇮🇱', 'SA': '🇸🇦', 'PK': '🇵🇰', 'BD': '🇧🇩',
  'HK': '🇭🇰', 'TW': '🇹🇼', 'NZ': '🇳🇿', 'IE': '🇮🇪', 'PT': '🇵🇹',
  'United States': '🇺🇸', 'United Kingdom': '🇬🇧', 'India': '🇮🇳',
  'Brazil': '🇧🇷', 'Germany': '🇩🇪', 'France': '🇫🇷', 'Spain': '🇪🇸',
  'Italy': '🇮🇹', 'Japan': '🇯🇵', 'China': '🇨🇳', 'Australia': '🇦🇺',
  'Singapore': '🇸🇬', 'Canada': '🇨🇦', 'Mexico': '🇲🇽', 'Switzerland': '🇨🇭',
};

// Get flag from phone or country
function getCountryFlag(sanitizedPhone?: string | null, country?: string | null): string {
  // Try to get from phone prefix
  if (sanitizedPhone) {
    const prefixMap: Record<string, string> = {
      '+1': '🇺🇸', '+44': '🇬🇧', '+91': '🇮🇳', '+55': '🇧🇷', '+49': '🇩🇪',
      '+33': '🇫🇷', '+34': '🇪🇸', '+39': '🇮🇹', '+81': '🇯🇵', '+86': '🇨🇳',
      '+61': '🇦🇺', '+65': '🇸🇬', '+971': '🇦🇪', '+27': '🇿🇦', '+60': '🇲🇾',
      '+52': '🇲🇽', '+41': '🇨🇭', '+20': '🇪🇬', '+90': '🇹🇷', '+420': '🇨🇿',
    };
    for (const [prefix, flag] of Object.entries(prefixMap)) {
      if (sanitizedPhone.startsWith(prefix)) return flag;
    }
  }
  // Try from country name
  if (country && countryFlags[country]) return countryFlags[country];
  return '🌍';
}

const PhoneFlag = ({ number }: { number?: string | null }) => {
  if (!number || !isValidPhoneNumber(number)) {
    return <Globe className="h-3.5 w-3.5 text-slate-400" />;
  }

  try {
    const parsed = parsePhoneNumber(number);
    if (parsed?.country) {
      const FlagComponent = flags[parsed.country as keyof typeof flags];
      if (FlagComponent) {
        return <FlagComponent title={parsed.country} className="h-3.5 w-5 shadow-sm rounded-sm object-cover" />;
      }
    }
  } catch {}

  return <Globe className="h-3.5 w-3.5 text-slate-400" />;
};

const getLocalTimeForLocation = (locationStr: string | null | undefined): string | null => {
  if (!locationStr || locationStr === "—" || locationStr.trim() === "") {
    return null;
  }

  // Try different strategies to find timezone
  let timezone: string | undefined;

  // 1. Try city name directly
  const cityMatches = lookupViaCity(locationStr);
  if (cityMatches?.length > 0) {
    timezone = cityMatches[0].timezone;
  }
  // 2. If we have city + country/state format, try split
  else if (locationStr.includes(",")) {
    const parts = locationStr.split(",").map(p => p.trim());
    if (parts.length >= 2) {
      const city = parts[0];
      const regionOrCountry = parts[1];
      const matches = findFromCityStateProvince(city, regionOrCountry);
      if (matches?.length > 0) {
        timezone = matches[0].timezone;
      }
    }
  }

  if (!timezone) {
    return null;
  }

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(now);
  } catch (err) {
    console.warn("Timezone formatting failed:", err);
    return null;
  }
};

// ============================================================================
// Types
// ============================================================================

interface DatabaseFilters {
  search: string;
  industries: string[];
  locations: string[];
  stages: string[];
  employeeRanges: string[];
  revenueRanges: string[];
  hasApolloId: boolean | null;
  isPromoted: boolean | null;
  technologies: string[];
  fundingStages: string[];
  foundedYearMin: number | null;
  foundedYearMax: number | null;
}

type ViewMode = "database" | "search";

// ============================================================================
// Main Component
// ============================================================================

const CompanyIntelligenceSearchPage: React.FC = () => {
  const { fileId } = useParams<{ fileId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const currentUserId = user?.id || null;

  // View Mode State
  const [viewMode, setViewMode] = useState<ViewMode>("database");

//   Add List State
    const [listModalOpen, setListModalOpen] = useState(false);
  const [selectedCompanyForList, setSelectedCompanyForList] = useState<any>(null);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [viewingOrgDetails, setViewingOrgDetails] = useState<ApolloOrganization | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // API Search State
  const [apiFilters, setApiFilters] = useState<ApolloCompanySearchFilters>({});
  const [apiPage, setApiPage] = useState(1);
  const [apiPerPage, setApiPerPage] = useState(100);
  const [hasSearched, setHasSearched] = useState(false);
  const [apiSearchResults, setApiSearchResults] = useState<{
    organizations: ApolloOrganization[];
    pagination: { page: number; per_page: number; total_entries: number; total_pages: number };
  } | null>(null);

  // Database Filter State
  const [dbFilters, setDbFilters] = useState<DatabaseFilters>({
    search: "", industries: [], locations: [], stages: [],
    employeeRanges: [], revenueRanges: [], hasApolloId: null,
    isPromoted: null, technologies: [], fundingStages: [],
    foundedYearMin: null, foundedYearMax: null,
  });
  const [dbPage, setDbPage] = useState(1);
  const [dbPerPage, setDbPerPage] = useState(100);
  const initialLoadDone = useRef(false);

  // ============================================================================
  // Copy Phone Handler
  // ============================================================================
  const handleCopyPhone = useCallback((phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
    toast({ title: "Copied!", description: "Phone number copied to clipboard" });
  }, [toast]);

  // ============================================================================
  // Workspace Files Query
  // ============================================================================
  const { data: currentFile } = useQuery({
    queryKey: ['workspace-file-companies', fileId],
    queryFn: async () => {
      if (!fileId) return null;
      const { data, error } = await supabase
        .from('workspace_files')
        .select(`id, name, type, workspace_id, workspaces(id, name)`)
        .eq('id', fileId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!fileId
  });

  const pageTitle = fileId && currentFile ? currentFile.name : "My Companies";

    // Force database view when in file mode
  useEffect(() => {
    if (fileId) {
        setViewMode("database");
    }
  }, [fileId]);

  // ============================================================================
  // Database Companies Query
  // ============================================================================
 const {
    data: databaseCompanies,
    isLoading: isLoadingDatabase,
    isFetching: isFetchingDatabase,
    refetch: refetchDatabase,
  } = useQuery({
    queryKey: ["database-companies", organizationId, dbFilters, dbPage, dbPerPage, fileId],
    queryFn: async () => {
      let query;
      
      // Select string construction based on fileId presence (M:M relationship)
      const selectString = fileId 
        ? `*, created_by_employee:hr_employees!companies_created_by_fkey(first_name, last_name), company_workspace_files!inner(file_id)`
        : `*, created_by_employee:hr_employees!companies_created_by_fkey(first_name, last_name)`;

      query = supabase
        .from("companies")
        .select(selectString, { count: "exact" })
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (fileId) {
          query = query.eq('company_workspace_files.file_id', fileId);
      }

      if (dbFilters.search?.trim()) {
        const searchTerm = dbFilters.search.trim();
        query = query.or(`name.ilike.%${searchTerm}%,domain.ilike.%${searchTerm}%,website.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      if (dbFilters.industries.length > 0) query = query.in("industry", dbFilters.industries);
      if (dbFilters.locations.length > 0) {
        const locFilters = dbFilters.locations.map((loc) => `location.ilike.%${loc}%`).join(",");
        query = query.or(locFilters);
      }
      if (dbFilters.stages.length > 0) query = query.in("stage", dbFilters.stages);
      if (dbFilters.hasApolloId === true) query = query.not("apollo_org_id", "is", null);
      else if (dbFilters.hasApolloId === false) query = query.is("apollo_org_id", null);
      if (dbFilters.isPromoted === true) query = query.eq("status", "Active");
      else if (dbFilters.isPromoted === false) query = query.neq("status", "Active");
      if (dbFilters.foundedYearMin !== null) query = query.gte("founded_year", dbFilters.foundedYearMin);
      if (dbFilters.foundedYearMax !== null) query = query.lte("founded_year", dbFilters.foundedYearMax);

      const from = (dbPage - 1) * dbPerPage;
      query = query.range(from, from + dbPerPage - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { companies: data || [], totalCount: count || 0, totalPages: Math.ceil((count || 0) / dbPerPage) };
    },
    enabled: !!organizationId && viewMode === "database",
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // ============================================================================
  // API Search Handler (V2 - Server-side storage)
  // ============================================================================
  const handleApiSearch = useCallback(async (filters: ApolloCompanySearchFilters) => {
    setIsSearching(true);
    setHasSearched(true);
    setApiFilters(filters);
    setApiPage(1);

    try {
      // V2 handles storage server-side and returns saved companies
      const result = await searchCompaniesInApolloV2(filters, 1, apiPerPage, fileId);
      
      const savedCount = result.saved?.companies || 0;
      const totalEntries = result.pagination?.total_entries || 0;
      
      if (result.companies?.length > 0 || result.organizations?.length > 0) {
        toast({ 
          title: "Search Complete! ✓", 
          description: `Found ${totalEntries.toLocaleString()} companies. ${savedCount} saved to database.` 
        });
        // Refresh database view since new companies were added
        queryClient.invalidateQueries({ queryKey: ["database-companies"] });
      } else {
        toast({ title: "Search Complete", description: "No companies found matching your criteria." });
      }
      
      // Store the results - prefer saved companies from DB, fallback to raw organizations
      setApiSearchResults({
        organizations: result.companies?.length > 0 ? result.companies : result.organizations,
        pagination: result.pagination,
      });
    } catch (error: any) {
      toast({ title: "Search Failed", description: error.message, variant: "destructive" });
      setApiSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [apiPerPage, fileId, toast, queryClient]);

    const { data: workspaceFiles = [] } = useQuery({
    queryKey: ["workspace-files-for-lists", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_files")
        .select("id, name, workspaces(name)")
        .eq("organization_id", organizationId)
        .eq("type", "companies") // Ensure we only get company lists
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // ============================================================================
  // Stage Change Mutation
  // ============================================================================
  const updateStageMutation = useMutation({
    mutationFn: async ({ companyId, stage }: { companyId: number; stage: string }) => {
      const { error } = await supabase
        .from('companies')
        .update({ stage, updated_by: currentUserId, updated_at: new Date().toISOString() })
        .eq('id', companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Stage Updated" });
      queryClient.invalidateQueries({ queryKey: ["database-companies"] });
    },
    onError: (err: any) => toast({ title: "Update Failed", description: err.message, variant: "destructive" }),
  });

  const handleStageChange = async (company: any, newStage: string) => {
    let targetCompanyId = company.id;
    if (!targetCompanyId && company.apollo_org_id) {
      try {
        const { data: newCompany, error } = await supabase
          .from('companies')
          .insert({
            name: company.name,
            website: company.website || company.website_url,
            domain: company.domain || company.primary_domain,
            apollo_org_id: company.apollo_org_id,
            logo_url: company.logo_url,
            industry: company.industry,
            location: company.location || [company.city, company.state, company.country].filter(Boolean).join(', '),
            employee_count: company.estimated_num_employees || company.employee_count,
            revenue: company.annual_revenue || company.revenue,
            organization_id: organizationId,
            created_by: currentUserId,
            stage: newStage,
            status: 'Active',
          })
          .select('id')
          .single();
        if (error) throw error;
        targetCompanyId = newCompany?.id;
        toast({ title: "Company Added to CRM" });
      } catch (err: any) {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
        return;
      }
    }
    if (targetCompanyId) updateStageMutation.mutate({ companyId: targetCompanyId, stage: newStage });
  };

  // ============================================================================
  // API Page Change (V2 - Server-side storage)
  // ============================================================================
  const handleApiPageChange = useCallback(async (newPage: number) => {
    if (!hasSearched || !apiFilters) return;
    setIsSearching(true);
    setApiPage(newPage);
    try {
      const result = await searchCompaniesInApolloV2(apiFilters, newPage, apiPerPage, fileId);
      // Refresh database view since new companies were added
      if (result.saved?.companies > 0) {
        queryClient.invalidateQueries({ queryKey: ["database-companies"] });
      }
      setApiSearchResults({
        organizations: result.companies?.length > 0 ? result.companies : result.organizations,
        pagination: result.pagination,
      });
    } catch (error: any) {
      toast({ title: "Failed to load page", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }, [hasSearched, apiFilters, apiPerPage, fileId, toast, queryClient]);

  // ============================================================================
  // Mutations
  // ============================================================================
  const enrichMutation = useMutation({
    mutationFn: async (company: any) => {
      const domain = company.domain || company.primary_domain || extractDomain(company.website || company.website_url);
      if (!domain) throw new Error("No domain available");
      return await enrichOrganization(domain, company.apollo_org_id || company.id);
    },
    onMutate: (company) => setEnrichingIds((prev) => new Set(prev).add(company.id?.toString() || company.apollo_org_id)),
    onSuccess: (data, company) => {
      toast({ title: "Enrichment Complete", description: `${company.name} enriched.` });
      queryClient.invalidateQueries({ queryKey: ["database-companies"] });
    },
    onError: (error: any) => toast({ title: "Enrichment Failed", description: error.message, variant: "destructive" }),
    onSettled: (_, __, company) => setEnrichingIds((prev) => { const next = new Set(prev); next.delete(company.id?.toString() || company.apollo_org_id); return next; }),
  });

  const getInfoMutation = useMutation({
    mutationFn: async (apolloOrgId: string) => await getCompleteOrganizationInfo(apolloOrgId),
    onSuccess: (data) => { setViewingOrgDetails(data); queryClient.invalidateQueries({ queryKey: ["database-companies"] }); },
    onError: (error: any) => toast({ title: "Failed to Get Info", description: error.message, variant: "destructive" }),
  });

  const promoteMutation = useMutation({
    mutationFn: async (companyId: number) => await promoteToActiveCRM(companyId),
    onSuccess: (data) => {
      toast({ title: "Promoted to Active CRM! 🎉", description: `${data.name} is now active.` });
      queryClient.invalidateQueries({ queryKey: ["database-companies"] });
    },
    onError: (error: any) => toast({ title: "Promotion Failed", description: error.message, variant: "destructive" }),
  });

  const bulkPromoteMutation = useMutation({
    mutationFn: async (companyIds: number[]) => {
      const results = await Promise.allSettled(companyIds.map((id) => promoteToActiveCRM(id)));
      const successful = results.filter((r) => r.status === "fulfilled").length;
      return { successful, failed: results.length - successful, total: companyIds.length };
    },
    onSuccess: ({ successful, failed, total }) => {
      toast({ title: "Bulk Promotion Complete", description: `${successful} of ${total} promoted.${failed > 0 ? ` ${failed} failed.` : ""}` });
      setSelectedOrgs(new Set());
      queryClient.invalidateQueries({ queryKey: ["database-companies"] });
    },
    onError: (error: any) => toast({ title: "Bulk Promotion Failed", description: error.message, variant: "destructive" }),
  });

  // ============================================================================
  // Helpers
  // ============================================================================
  const extractDomain = (url?: string | null): string | null => {
    if (!url) return null;
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.hostname.replace("www.", "");
    } catch { return null; }
  };

  const getInitials = (name: string) => (name ? name.slice(0, 2).toUpperCase() : "??");

  const formatEmployeeCount = (count?: number | null) => {
    if (!count) return "—";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toLocaleString();
  };

  const formatRevenue = (revenue?: number | string | null) => {
    if (!revenue) return "—";
    if (typeof revenue === "string") return revenue;
    if (revenue >= 1000000000) return `${(revenue / 1000000000).toFixed(1)}B`;
    if (revenue >= 1000000) return `${(revenue / 1000000).toFixed(0)}M`;
    return revenue.toLocaleString();
  };

  // ============================================================================
  // Selection Handlers
  // ============================================================================
  const handleSelectAll = useCallback(() => {
    const companies = viewMode === "database" ? databaseCompanies?.companies || [] : apiSearchResults?.organizations || [];
    const allIds = companies.map((c: any) => c.id?.toString() || c.apollo_org_id || "").filter(Boolean);
    const allSelected = allIds.length > 0 && allIds.every((id: string) => selectedOrgs.has(id));
    setSelectedOrgs(allSelected ? new Set() : new Set(allIds));
  }, [viewMode, databaseCompanies, apiSearchResults, selectedOrgs]);

  const handleSelectOrg = useCallback((id: string) => {
    setSelectedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => { setSelectedOrgs(new Set()); }, [viewMode]);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const displayCompanies = useMemo(() => {
    return viewMode === "database" ? databaseCompanies?.companies || [] : apiSearchResults?.organizations || [];
  }, [viewMode, databaseCompanies, apiSearchResults]);

  console.log("displayCompanies", displayCompanies);

  const totalResults = viewMode === "database" ? databaseCompanies?.totalCount || 0 : apiSearchResults?.pagination?.total_entries || 0;
  const totalPages = viewMode === "database" ? databaseCompanies?.totalPages || 0 : apiSearchResults?.pagination?.total_pages || 0;
  const currentPage = viewMode === "database" ? dbPage : apiPage;
  const perPage = viewMode === "database" ? dbPerPage : apiPerPage;
  const isLoading = viewMode === "database" ? isLoadingDatabase && !initialLoadDone.current : isSearching;
  const isFetching = viewMode === "database" ? isFetchingDatabase : isSearching;

  useEffect(() => {
    if (viewMode === "database" && !isLoadingDatabase) initialLoadDone.current = true;
  }, [viewMode, isLoadingDatabase]);



  const handleListAdd = async (fileId: string) => {
    if (!selectedCompanyForList || !fileId) return;

    try {
      let companyId = selectedCompanyForList.id;

      // Scenario A: Company is from Search (doesn't have a numeric ID in our DB yet)
      if (viewMode === 'search' && !companyId) {
        // We need to save the company first
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert({
            name: selectedCompanyForList.name,
            website: selectedCompanyForList.website || selectedCompanyForList.website_url,
            domain: selectedCompanyForList.domain || selectedCompanyForList.primary_domain,
            apollo_org_id: selectedCompanyForList.apollo_org_id || selectedCompanyForList.id, // Handle Apollo ID mapping
            logo_url: selectedCompanyForList.logo_url,
            industry: selectedCompanyForList.industry,
            location: selectedCompanyForList.location || [selectedCompanyForList.city, selectedCompanyForList.state, selectedCompanyForList.country].filter(Boolean).join(', '),
            employee_count: selectedCompanyForList.estimated_num_employees || selectedCompanyForList.employee_count,
            revenue: selectedCompanyForList.annual_revenue || selectedCompanyForList.revenue,
            organization_id: organizationId,
            created_by: currentUserId,
            stage: 'Identified', // Default stage
            status: 'Active',
          })
          .select('id')
          .single();

        if (createError) throw createError;
        companyId = newCompany.id;
      }

      // Scenario B: Company exists (or was just created) - Link to File
      if (companyId) {
        const { error: linkError } = await supabase
          .from('company_workspace_files')
          .upsert({ 
            company_id: companyId, 
            file_id: fileId, 
            added_by: currentUserId 
          }, { 
            onConflict: 'company_id,file_id' 
          });

        if (linkError) throw linkError;

        toast({ 
          title: "Added to List", 
          description: `${selectedCompanyForList.name} has been added successfully.` 
        });
        
        // Refresh to show status changes if needed
        queryClient.invalidateQueries({ queryKey: ["database-companies"] });
      }

    } catch (error: any) {
      toast({ 
        title: "Failed to add to list", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
        // Reset selection
        setListModalOpen(false);
        setSelectedCompanyForList(null);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50/70">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 shadow-md z-30">
        <div className="flex items-center justify-between gap-6 flex-wrap max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-5 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="h-10 w-10 shrink-0">
              {isSidebarOpen ? <X className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
            </Button>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Companies</h1>
            <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); setSelectedOrgs(new Set()); }} className="w-auto">
              <TabsList className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
                <TabsTrigger value="database" className={cn("flex items-center whitespace-nowrap px-6 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md text-slate-500 hover:text-slate-700")}>
                  <Database className="mr-2 h-3.5 w-3.5" />CRM Records
                </TabsTrigger>
                <TabsTrigger value="search" className={cn("flex items-center whitespace-nowrap px-6 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md text-slate-500 hover:text-slate-700")}>
                  <Cloud className="mr-2 h-3.5 w-3.5" />Search from Cloud
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {isFetching && (
              <div className="flex items-center gap-2.5 text-purple-700 text-base hidden md:flex">
                <Loader2 className="h-5 w-5 animate-spin" />Loading...
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {selectedOrgs.size > 0 && (
              <div className="flex items-center gap-4 bg-purple-50 px-5 py-2 rounded-xl border border-purple-100">
                <span className="font-semibold text-purple-900 text-base">{selectedOrgs.size} selected</span>
                {viewMode === "database" && (
                  <Button size="default" onClick={() => { const ids = Array.from(selectedOrgs).map(id => parseInt(id)).filter(id => !isNaN(id)); bulkPromoteMutation.mutate(ids); }} disabled={bulkPromoteMutation.isPending} className="bg-green-600 hover:bg-green-700 px-5 h-10 text-sm font-medium">
                    {bulkPromoteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Star className="h-4 w-4 mr-2" />}Promote to CRM
                  </Button>
                )}
                <Button variant="outline" size="default" onClick={() => setSelectedOrgs(new Set())} className="h-10 text-sm"><X className="h-4 w-4 mr-2" />Clear</Button>
              </div>
            )}
            {viewMode === "database" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => refetchDatabase()} disabled={isFetchingDatabase} className="h-10 w-10">
                      <RefreshCw className={cn("h-5 w-5", isFetchingDatabase && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh database</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={cn("flex-shrink-0 border-r border-slate-200 bg-white transition-all duration-300 ease-in-out shadow-md z-20", isSidebarOpen ? "w-80" : "w-0")}>
          {isSidebarOpen && (
            viewMode === "database" ? (
              <DatabaseFilterSidebar filters={dbFilters} onFiltersChange={(newFilters) => { setDbFilters(newFilters); setDbPage(1); }} isLoading={isFetchingDatabase} totalResults={totalResults} onClose={() => setIsSidebarOpen(false)} />
            ) : (
              <CompanySearchFilterSidebar onSearch={handleApiSearch} isSearching={isSearching} totalResults={totalResults} onClose={() => setIsSidebarOpen(false)} />
            )
          )}
        </div>

        {/* Main Table Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50/40">
          {/* Loading skeleton */}
          {viewMode === "database" && isLoading && (
            <div className="p-6 space-y-5">
              <div className="bg-white rounded-2xl border shadow-sm p-5">
                <div className="h-12 bg-slate-100 animate-pulse rounded-xl mb-5" />
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center gap-8 py-5 border-b last:border-0">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty search state */}
          {viewMode === "search" && !hasSearched && !isSearching && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-8 shadow-lg">
                <Search className="h-12 w-12 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Search</h2>
              <p className="text-lg text-slate-600 max-w-lg mb-10">Use the filters on the left to discover companies. All matching results are automatically saved to your database.</p>
              <div className="flex gap-10 text-base text-slate-500">
                <div className="flex items-center gap-3"><Zap className="h-6 w-6 text-amber-500" />Find Companies</div>
                <div className="flex items-center gap-3"><Database className="h-6 w-6 text-blue-500" />Auto-saved</div>
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {isSearching && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-sm">
              <div className="text-center">
                <Loader2 className="h-16 w-16 animate-spin text-purple-600 mx-auto mb-6" />
                <p className="text-2xl font-semibold text-slate-800 mb-2">Searching & Saving...</p>
                <p className="text-base text-slate-600">This may take a few seconds</p>
              </div>
            </div>
          )}

          {/* Main Table */}
          {!isLoading && displayCompanies.length > 0 && !isSearching && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-hidden bg-white border border-slate-200 shadow-sm">
                <div className="h-full overflow-y-auto">
                  <table className="w-full min-w-max divide-y divide-slate-200 table-fixed">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-violet-600 shadow-sm">
  <tr>
    {/* 1. Company + checkbox */}
    <th className="sticky left-0 z-30 bg-gradient-to-r from-purple-600 to-violet-600 px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider border-r border-slate-600/40 shadow-[2px_0_6px_-3px_rgba(0,0,0,0.25)] w-[260px]">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={displayCompanies.length > 0 && displayCompanies.every((c: any) => selectedOrgs.has(c.id?.toString() || c.apollo_org_id || ""))}
          onCheckedChange={handleSelectAll}
          className="border-white/70 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500 h-3.5 w-3.5"
        />
        Company
      </div>
    </th>



    {/* 3. Phone with better flag */}
    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[160px]">
      <div className="flex items-center gap-1">
        <Phone className="h-3 w-3" /> Phone
      </div>
    </th>

    
    {/* 9. Links */}
    <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-white uppercase tracking-wider w-[100px]">
      Links
    </th>

    {/* 10. Actions */}

     <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-white uppercase tracking-wider w-[110px]">
      Revenue
    </th>
    

        {/* 2. Founded Year */}
    <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-white uppercase tracking-wider w-[90px]">
      Founded
    </th>

     <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[150px]">
      CRM Stage
    </th>

    <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-white uppercase tracking-wider w-[110px]">
      Actions
    </th>


    {/* 4. Location */}
    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[200px]">
      <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</div>
    </th>

    {/* 5. Industry – made wider */}
    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[150px]">
      Industry
    </th>

    {/* 6. Employees */}
    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[110px]">
      <div className="flex items-center gap-1"><Users className="h-3 w-3" /> Employees</div>
    </th>

    {/* 7. Revenue */}
   

    {/* 8. CRM Stage */}
   
  </tr>
</thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-[11px]">
     {displayCompanies.map((company: any) => {
  const companyId = company.id?.toString() || company.apollo_org_id || "";
  const isSelected = selectedOrgs.has(companyId);
  const domain = company.domain || company.primary_domain || extractDomain(company.website || company.website_url);
  
  // ────────────────────────────────────────────────
  // Phone logic
  const rawPhone = company.phone || company.primary_phone?.number || company.sanitized_phone || null;
  const displayPhone = rawPhone ? rawPhone.trim() : null;
  const isPromoted = company.status === "Active";
                        const hasApolloData = !!company.apollo_org_id;
  
  // Location fallback chain
  const locationParts = [
    company.city,
    company.state,
    company.country,
    company.location
  ].filter(Boolean);
  const displayLocation = locationParts.length > 0 ? locationParts.join(", ") : "—";

  // Location logic - split into primary (city/state) and secondary (country)
const cityStateParts = [
  company.city,
  company.state || company.region || company.province, // some datasets use region/province
].filter(Boolean);

const countryPart = company.country || null;

const primaryLocation = cityStateParts.length > 0 
  ? cityStateParts.join(", ") 
  : (company.location?.split(",").slice(0, -1).join(", ") || "—"); // try to exclude country if it's in location

const secondaryLocation = countryPart || 
  (company.location?.split(",").pop()?.trim() || null); // last part if no explicit country

const displayPrimary = primaryLocation !== "—" ? primaryLocation : "—";
const displaySecondary = secondaryLocation || "—";

// Use this for timezone lookup (prefer more complete string)
const timezoneLookupStr = [displayPrimary, displaySecondary]
  .filter(Boolean)
  .join(", ");

  // Industry fallback
  const displayIndustry = company.industry || "—";

  // Founded
  const founded = company.founded_year || company.start_date || "—";

  // Revenue
  const revenue = company.revenue || company.annual_revenue || company.annual_revenue_printed || company.organization_revenue_printed || null;

  return (
    <tr key={companyId} className={cn("group transition-colors duration-100", isSelected ? "bg-purple-50/60" : "hover:bg-slate-50/80")}>
      {/* Company */}
      <td className="sticky left-0 z-5 bg-white group-hover:bg-slate-50 px-3 py-2 shadow-[2px_0_6px_-3px_rgba(0,0,0,0.08)] border-r border-slate-100 w-[260px]">
       <div className="flex items-center gap-2">
                                <Checkbox checked={isSelected} onCheckedChange={() => handleSelectOrg(companyId)} className="border-slate-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 h-3.5 w-3.5" />
                                <Avatar className="h-8 w-8 border shadow-sm flex-shrink-0">
                                  <AvatarImage src={company.logo_url} />
                                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-[9px] font-bold">{getInitials(company.name)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1">
                                    {viewMode === "database" && company.id ? (
                                      <RouterLink to={`/companies/${company.id}`} className="font-semibold text-slate-900 hover:text-purple-700 truncate text-[11px] block leading-tight">{company.name}</RouterLink>
                                    ) : (
                                      <span className="font-semibold text-slate-900 truncate text-[11px] block leading-tight">{company.name}</span>
                                    )}
                                    {hasApolloData && <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                                    {isPromoted && <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />}
                                  </div>
                                  <p className="text-[9px] text-slate-500 truncate">{domain || "No domain"}</p>
                                </div>
                              </div>

      </td>

            {/* Phone with real flag */}
      <td className="px-3 py-2 whitespace-nowrap w-[160px]">
        {displayPhone ? (
          <div className="flex items-center gap-2.5">
            <PhoneFlag number={displayPhone.startsWith('+') ? displayPhone : `+${displayPhone}`} />
            <span className="text-[10.5px] text-slate-700 truncate max-w-[100px]">{displayPhone}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleCopyPhone(displayPhone)}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    {copiedPhone === displayPhone ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Copy phone</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <span className="text-slate-400 text-[10px]">—</span>
        )}
      </td>

            {/* Links – keep as is */}
      <td className="px-3 py-2 whitespace-nowrap text-center w-[100px]">
       <div className="flex items-center justify-center gap-1.5">
                                {(company.website || company.website_url) && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a href={company.website || company.website_url} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                          <Globe className="h-3.5 w-3.5" />
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent>Website</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {(company.linkedin || company.linkedin_url) && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a href={company.linkedin || company.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors">
                                          <Linkedin className="h-3.5 w-3.5" />
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent>LinkedIn</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {(company.twitter || company.twitter_url) && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a href={company.twitter || company.twitter_url} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-sky-500 hover:bg-sky-50 rounded transition-colors">
                                          <Twitter className="h-3.5 w-3.5" />
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent>Twitter</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {(company.facebook || company.facebook_url) && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a href={company.facebook || company.facebook_url} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                          <Facebook className="h-3.5 w-3.5" />
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent>Facebook</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>

      </td>

            {/* Revenue */}
      <td className="px-3 py-2 text-center whitespace-nowrap w-[110px]">
        <span className="text-[10.5px] font-medium text-slate-800">
          {formatRevenue(revenue)}
        </span>
      </td>

      {/* Founded Year */}
      <td className="px-3 py-2 whitespace-nowrap text-center text-[10.5px] text-slate-700 font-medium w-[90px]">
        {founded}
      </td>

  {/* CRM Stage – keep as is */}
      <td className="px-3 py-2 whitespace-nowrap w-[150px]">
        <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className={cn("h-6 min-w-[110px] text-[9px] font-semibold uppercase tracking-tight rounded-md border shadow-sm px-2 py-0.5", stageColors[company.stage || company.status || "default"])}>
                                    {company.stage || company.status || "Stage"}
                                    <ChevronDown className="ml-1 h-2.5 w-2.5 opacity-70" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[140px] max-h-60 overflow-y-auto text-[10px]">
                                  {STAGES.map((stageOption) => (
                                    <DropdownMenuItem key={stageOption} onClick={() => handleStageChange(company, stageOption)} className={cn("py-1 cursor-pointer", (company.stage || company.status) === stageOption && "bg-purple-50 font-medium")}>
                                      {stageOption}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

      </td>



      {/* Actions – keep as is */}
      <td className="px-3 py-2 whitespace-nowrap text-center w-[110px]">
        <div className="flex items-center justify-center gap-0.5">
                                {viewMode === "database" && company.id && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-purple-50">
                                          <RouterLink to={`/companies/${company.id}`}><Eye className="h-3.5 w-3.5" /></RouterLink>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>View</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {viewMode === "database" && !isPromoted && company.id && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md" onClick={() => promoteMutation.mutate(company.id)} disabled={promoteMutation.isPending}>
                                          {promoteMutation.isPending && promoteMutation.variables === company.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Promote</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md"><MoreHorizontal className="h-4 w-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52">
                                    {company.apollo_org_id && (
                                      <DropdownMenuItem onClick={() => getInfoMutation.mutate(company.apollo_org_id)} disabled={getInfoMutation.isPending}>
                                        <Info className="h-4 w-4 mr-2" />Get Full Info
                                      </DropdownMenuItem>
                                    )}
                                    {domain && (
                                      <DropdownMenuItem onClick={() => enrichMutation.mutate(company)} disabled={enrichingIds.has(companyId)}>
                                        <Sparkles className="h-4 w-4 mr-2" />{enrichingIds.has(companyId) ? "Enriching..." : "Enrich Data"}
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    {workspaceFiles.length > 0 && (
                                      <>
                                        <DropdownMenuLabel className="text-xs text-slate-500 px-3 py-2">Add to List</DropdownMenuLabel>
                                       
                                          <DropdownMenuItem 
                onClick={() => {
                setSelectedCompanyForList(company);
                setListModalOpen(true);
                }}
            >
                <ListPlus className="h-4 w-4 mr-2" /> 
                Add to List...
            </DropdownMenuItem>
                                    
                                        <DropdownMenuSeparator />
                                      </>
                                    )}
                                    {(company.website || company.website_url) && (
                                      <DropdownMenuItem asChild>
                                        <a href={company.website || company.website_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" />Visit Website</a>
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

      </td>


{/* Location + Local Time */}
<td className="px-3 py-2 w-[200px] leading-tight">
  <div className="flex flex-col gap-0.5">
    {/* Line 1: Primary location (City, State) */}
    <div className="flex items-center gap-1.5 text-[10.5px] text-slate-700 font-medium">
      <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
      <span className="truncate max-w-[160px]">{displayPrimary}</span>
    </div>

    {/* Line 2: Country + Local time (same line) */}
    <div className="pl-[15px] flex items-center gap-1.5 text-[9.5px] text-slate-500">
      <span className="truncate max-w-[110px] opacity-90">
        {displaySecondary !== "—" ? displaySecondary : "—"}
      </span>

      {displayPrimary !== "—" && displaySecondary !== "—" && getLocalTimeForLocation(timezoneLookupStr) && (
        <>
          <span className="text-slate-400">•</span>
          <div className="flex items-center gap-1">
            <Clock size={10} className="text-blue-500 flex-shrink-0" />
            <span className="text-[10px] text-blue-600 font-medium">
              {getLocalTimeForLocation(timezoneLookupStr)}
            </span>
          </div>
        </>
      )}
    </div>
  </div>
</td>

      {/* Industry */}
      <td className="px-3 py-2 whitespace-nowrap text-[10.5px] text-slate-700 w-[150px]">
        <span className="truncate block max-w-[130px]">{displayIndustry}</span>
      </td>

      {/* Employees */}
      <td className="px-3 py-2 whitespace-nowrap w-[110px]">
        <span className="text-[10.5px] font-medium text-slate-800">
          {formatEmployeeCount(company.employee_count || company.estimated_num_employees)}
        </span>
      </td>



    
    </tr>
  );
})}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="sticky bottom-2 z-20 bg-white border-t border-slate-200 shadow-[0_-2px_6px_-3px_rgba(0,0,0,0.15)]">
                  <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2 gap-4 text-[10px]">
                    <p className="text-slate-600">{((currentPage - 1) * perPage + 1).toLocaleString()} – {Math.min(currentPage * perPage, totalResults).toLocaleString()} of {totalResults.toLocaleString()}</p>
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-600 font-medium">Rows:</span>
                      <Select value={perPage.toString()} onValueChange={(v) => { const n = parseInt(v); if (viewMode === "database") { setDbPerPage(n); setDbPage(1); } else { setApiPerPage(n); setApiPage(1); } }}>
                        <SelectTrigger className="w-16 h-7 text-[10px] px-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => viewMode === "database" ? setDbPage((p) => Math.max(1, p - 1)) : handleApiPageChange(apiPage - 1)} disabled={currentPage === 1 || isFetching} className="h-7 px-2.5 text-[10px]">
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />Prev
                      </Button>
                      <span className="font-medium px-3">{currentPage} / {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => viewMode === "database" ? setDbPage((p) => Math.min(totalPages, p + 1)) : handleApiPageChange(apiPage + 1)} disabled={currentPage === totalPages || isFetching} className="h-7 px-2.5 text-[10px]">
                        Next<ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {!isLoading && displayCompanies.length === 0 && (viewMode === "database" || hasSearched) && !isSearching && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-8 shadow-md">
                <AlertCircle className="h-12 w-12 text-slate-400" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">No companies found</h2>
              <p className="text-lg text-slate-600 max-w-lg mb-10">{viewMode === "database" ? "Try adjusting your filters or switch to Search from Cloud." : "Try adjusting your search criteria."}</p>
              {viewMode === "database" && <Button onClick={() => setViewMode("search")} size="lg" className="gap-3 text-base"><Cloud className="h-5 w-5" />Search from Cloud</Button>}
            </div>
          )}
        </div>
      </div>

     {/* ADD MODAL AT THE BOTTOM OF THE COMPONENT (Outside the loop) */}
       {selectedCompanyForList && (
        <AddToCompanyListModal
            open={listModalOpen}
            onOpenChange={(val) => {
                setListModalOpen(val);
                if (!val) setSelectedCompanyForList(null);
            }}
            onConfirm={handleListAdd}
            companyName={selectedCompanyForList.name}
            isFromSearch={viewMode === 'search'}
        />
      )}

      {/* Organization Details Dialog */}
      <Dialog open={!!viewingOrgDetails} onOpenChange={() => setViewingOrgDetails(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4 text-2xl">
              <Avatar className="h-12 w-12">
                <AvatarImage src={viewingOrgDetails?.logo_url} />
                <AvatarFallback className="text-xl">{getInitials(viewingOrgDetails?.name || "")}</AvatarFallback>
              </Avatar>
              {viewingOrgDetails?.name}
            </DialogTitle>
            <DialogDescription className="text-base">Complete organization information</DialogDescription>
          </DialogHeader>
          {viewingOrgDetails && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div><p className="text-sm text-slate-500 uppercase font-semibold">Industry</p><p className="text-base font-medium mt-1">{viewingOrgDetails.industry || "N/A"}</p></div>
                <div><p className="text-sm text-slate-500 uppercase font-semibold">Employees</p><p className="text-base font-medium mt-1">{formatEmployeeCount(viewingOrgDetails.estimated_num_employees)}</p></div>
                <div><p className="text-sm text-slate-500 uppercase font-semibold">Revenue</p><p className="text-base font-medium mt-1">{formatRevenue(viewingOrgDetails.annual_revenue_printed || viewingOrgDetails.organization_revenue_printed)}</p></div>
                <div><p className="text-sm text-slate-500 uppercase font-semibold">Founded</p><p className="text-base font-medium mt-1">{viewingOrgDetails.founded_year || "N/A"}</p></div>
              </div>
              {viewingOrgDetails.short_description && (
                <div><p className="text-sm text-slate-500 uppercase font-semibold mb-2">Description</p><p className="text-base text-slate-700 leading-relaxed">{viewingOrgDetails.short_description}</p></div>
              )}
              <div><p className="text-sm text-slate-500 uppercase font-semibold mb-2">Location</p><p className="text-base text-slate-700">{[viewingOrgDetails.city, viewingOrgDetails.state, viewingOrgDetails.country].filter(Boolean).join(", ") || "N/A"}</p></div>
              {viewingOrgDetails.technology_names && viewingOrgDetails.technology_names.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 uppercase font-semibold mb-3">Technologies</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingOrgDetails.technology_names.slice(0, 20).map((tech: string) => (<Badge key={tech} variant="secondary" className="text-sm px-3 py-1">{tech}</Badge>))}
                    {viewingOrgDetails.technology_names.length > 20 && <Badge variant="outline" className="text-sm px-3 py-1">+{viewingOrgDetails.technology_names.length - 20} more</Badge>}
                  </div>
                </div>
              )}
              {viewingOrgDetails.keywords && viewingOrgDetails.keywords.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 uppercase font-semibold mb-3">Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingOrgDetails.keywords.slice(0, 15).map((keyword: string) => (<Badge key={keyword} variant="outline" className="text-sm px-3 py-1">{keyword}</Badge>))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" size="lg" onClick={() => setViewingOrgDetails(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyIntelligenceSearchPage;

// List view table