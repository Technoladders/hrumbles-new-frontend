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
  Calendar, Hash, Tag, Building, Briefcase
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
  searchCompaniesInApollo,
  saveAllSearchResultsToDatabase,
  enrichOrganization,
  getCompleteOrganizationInfo,
  promoteToActiveCRM,
  type ApolloOrganization,
  type ApolloCompanySearchFilters,
} from "@/services/sales/apolloCompanySearch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const STAGES = [
  'Identified',
  'Targeting',
  'In Outreach',
  'Warm',
  'Qualified Company',
  'Proposal Sent / In Discussion',
  'Negotiation',
  'Closed - Won',
  'Closed - Lost',
  'Re-engage Later',
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
  'default': 'bg-gray-100 text-gray-800',
};

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

  // ============================================================================
  // View Mode State
  // ============================================================================
  const [viewMode, setViewMode] = useState<ViewMode>("database");

  // ============================================================================
  // UI State
  // ============================================================================
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [viewingOrgDetails, setViewingOrgDetails] = useState<ApolloOrganization | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ============================================================================
  // API Search State
  // ============================================================================
  const [apiFilters, setApiFilters] = useState<ApolloCompanySearchFilters>({});
  const [apiPage, setApiPage] = useState(1);
  const [apiPerPage, setApiPerPage] = useState(100); // Default 100 rows
  const [hasSearched, setHasSearched] = useState(false);
  const [apiSearchResults, setApiSearchResults] = useState<{
    organizations: ApolloOrganization[];
    pagination: { page: number; per_page: number; total_entries: number; total_pages: number };
  } | null>(null);

  // ============================================================================
  // Database Filter State
  // ============================================================================
  const [dbFilters, setDbFilters] = useState<DatabaseFilters>({
    search: "",
    industries: [],
    locations: [],
    stages: [],
    employeeRanges: [],
    revenueRanges: [],
    hasApolloId: null,
    isPromoted: null,
    technologies: [],
    fundingStages: [],
    foundedYearMin: null,
    foundedYearMax: null,
  });
  const [dbPage, setDbPage] = useState(1);
  const [dbPerPage, setDbPerPage] = useState(100); // Default 100 rows

  // Track if initial load is done
  const initialLoadDone = useRef(false);

  // ============================================================================
  // Workspace Files Query (for Add to List)
  // ============================================================================
  const { data: workspaceFiles = [] } = useQuery({
    queryKey: ["workspace-files-for-lists", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_files")
        .select("id, name, workspaces(name)")
        .eq("organization_id", organizationId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

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
      let query = supabase
        .from("companies")
        .select(
          `
          *,
          created_by_employee:hr_employees!companies_created_by_fkey(first_name, last_name)
        `,
          { count: "exact" }
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      // Text Search
      if (dbFilters.search && dbFilters.search.trim()) {
        const searchTerm = dbFilters.search.trim();
        query = query.or(
          `name.ilike.%${searchTerm}%,domain.ilike.%${searchTerm}%,website.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        );
      }

      // Industry Filter
      if (dbFilters.industries.length > 0) {
        query = query.in("industry", dbFilters.industries);
      }

      // Location Filter (OR across locations)
      if (dbFilters.locations.length > 0) {
        const locationFilters = dbFilters.locations
          .map((loc) => `location.ilike.%${loc}%`)
          .join(",");
        query = query.or(locationFilters);
      }

      // Stage Filter
      if (dbFilters.stages.length > 0) {
        query = query.in("stage", dbFilters.stages);
      }

      // Apollo ID Filter
      if (dbFilters.hasApolloId === true) {
        query = query.not("apollo_org_id", "is", null);
      } else if (dbFilters.hasApolloId === false) {
        query = query.is("apollo_org_id", null);
      }

      // Promoted/Active Filter
      if (dbFilters.isPromoted === true) {
        query = query.eq("status", "Active");
      } else if (dbFilters.isPromoted === false) {
        query = query.neq("status", "Active");
      }

      // Employee Count Filter
      if (dbFilters.employeeRanges.length > 0) {
        const empConditions: string[] = [];
        dbFilters.employeeRanges.forEach((range) => {
          const [min, max] = range.split(",").map((v) => (v ? parseInt(v) : null));
          if (min !== null && max !== null) {
            empConditions.push(`and(employee_count.gte.${min},employee_count.lte.${max})`);
          } else if (min !== null) {
            empConditions.push(`employee_count.gte.${min}`);
          }
        });
        if (empConditions.length > 0) {
          query = query.or(empConditions.join(","));
        }
      }

      // Revenue Filter
      if (dbFilters.revenueRanges.length > 0) {
        const revConditions: string[] = [];
        dbFilters.revenueRanges.forEach((range) => {
          const [min, max] = range.split(",").map((v) => (v ? parseInt(v) : null));
          if (min !== null && max !== null) {
            revConditions.push(`and(revenue.gte.${min},revenue.lte.${max})`);
          } else if (min !== null) {
            revConditions.push(`revenue.gte.${min}`);
          }
        });
        if (revConditions.length > 0) {
          query = query.or(revConditions.join(","));
        }
      }

      // Founded Year Filter
      if (dbFilters.foundedYearMin !== null) {
        query = query.gte("founded_year", dbFilters.foundedYearMin);
      }
      if (dbFilters.foundedYearMax !== null) {
        query = query.lte("founded_year", dbFilters.foundedYearMax);
      }

      // File Filter
      if (fileId) {
        query = query.eq("file_id", fileId);
      }

      // Pagination
      const from = (dbPage - 1) * dbPerPage;
      const to = from + dbPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        companies: data || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / dbPerPage),
      };
    },
    enabled: !!organizationId && viewMode === "database",
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // ============================================================================
  // API Search Handler
  // ============================================================================
  const handleApiSearch = useCallback(
    async (filters: ApolloCompanySearchFilters) => {
      setIsSearching(true);
      setHasSearched(true);
      setApiFilters(filters);
      setApiPage(1);

      try {
        const result = await searchCompaniesInApollo(filters, 1, apiPerPage);

        if (result.organizations && result.organizations.length > 0) {
          setIsSaving(true);
          toast({
            title: "Saving to Database...",
            description: `Storing ${result.organizations.length} companies`,
          });

          try {
            const saveResult = await saveAllSearchResultsToDatabase(
              result.organizations,
              organizationId,
              currentUserId,
              fileId
            );

            toast({
              title: "Search Complete! ✓",
              description: `Found ${result.pagination.total_entries.toLocaleString()} companies. ${saveResult.savedToCompanies} saved to database.`,
            });

            // Refresh database view
            queryClient.invalidateQueries({ queryKey: ["database-companies"] });
          } catch (saveError: any) {
            console.error("Save error:", saveError);
            toast({
              title: "Partial Success",
              description: `Search completed but some records failed to save: ${saveError.message}`,
              variant: "destructive",
            });
          } finally {
            setIsSaving(false);
          }
        } else {
          toast({
            title: "Search Complete",
            description: "No companies found matching your criteria.",
          });
        }

        setApiSearchResults(result);
      } catch (error: any) {
        console.error("Search error:", error);
        toast({
          title: "Search Failed",
          description: error.message || "An error occurred while searching",
          variant: "destructive",
        });
        setApiSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    },
    [apiPerPage, organizationId, currentUserId, fileId, toast, queryClient]
  );
   const updateStageMutation = useMutation({
  mutationFn: async ({ companyId, stage }: { companyId: number; stage: string }) => {
    const { error } = await supabase
      .from('companies')
      .update({ 
        stage, 
        updated_by: currentUserId,
        updated_at: new Date().toISOString() 
      })
      .eq('id', companyId);
    if (error) throw error;
  },
  onSuccess: () => {
    toast({ title: "Stage Updated", description: "Company stage changed successfully." });
    queryClient.invalidateQueries({ queryKey: ["database-companies"] });
    // Optional: also invalidate apollo search results if needed
  },
  onError: (err: any) => {
    toast({ title: "Update Failed", description: err.message, variant: "destructive" });
  },
});
   // Promote intelligence record if needed, then set stage
const handleStageChange = async (company: any, newStage: string) => {
  let targetCompanyId = company.id;

  // If it's intelligence-only (no id in companies table)
  if (!targetCompanyId && company.apollo_org_id) {
    try {
      toast({
        title: "Promoting to CRM...",
        description: "Creating CRM record before updating stage",
      });

      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert({
          name: company.name,
          website: company.website || company.website_url,
          domain: company.domain || extractDomain(company.website || company.website_url),
          apollo_org_id: company.apollo_org_id,
          logo_url: company.logo_url,
          industry: company.industry,
          location: company.location || [company.city, company.state, company.country].filter(Boolean).join(', '),
          employee_count: company.estimated_num_employees || company.employee_count,
          revenue: company.annual_revenue || company.revenue,
          organization_id: organizationId,
          created_by: currentUserId,
          stage: newStage,           // set initial stage during promotion
          status: 'Active',          // or whatever default you want
        })
        .select('id')
        .single();

      if (error) throw error;
      if (!newCompany?.id) throw new Error("Failed to create company");

      targetCompanyId = newCompany.id;

      toast({
        title: "Promotion Successful",
        description: "Company added to CRM and stage set",
      });
    } catch (err: any) {
      toast({
        title: "Promotion Failed",
        description: err.message || "Could not promote to CRM",
        variant: "destructive",
      });
      return; // stop here
    }
  }

  // Now update stage (either original CRM or newly promoted)
  if (targetCompanyId) {
    updateStageMutation.mutate({
      companyId: targetCompanyId,
      stage: newStage,
    });
  }
};

  // ============================================================================
  // API Page Change Handler
  // ============================================================================
  const handleApiPageChange = useCallback(
    async (newPage: number) => {
      if (!hasSearched || !apiFilters) return;

      setIsSearching(true);
      setApiPage(newPage);

      try {
        const result = await searchCompaniesInApollo(apiFilters, newPage, apiPerPage);

        if (result.organizations && result.organizations.length > 0) {
          setIsSaving(true);
          try {
            await saveAllSearchResultsToDatabase(
              result.organizations,
              organizationId,
              currentUserId,
              fileId
            );
            queryClient.invalidateQueries({ queryKey: ["database-companies"] });
          } finally {
            setIsSaving(false);
          }
        }

        setApiSearchResults(result);
      } catch (error: any) {
        toast({
          title: "Failed to load page",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsSearching(false);
      }
    },
    [hasSearched, apiFilters, apiPerPage, organizationId, currentUserId, fileId, toast, queryClient]
  );

  // ============================================================================
  // Enrichment Mutation
  // ============================================================================
  const enrichMutation = useMutation({
    mutationFn: async (company: any) => {
      const domain =
        company.domain ||
        company.primary_domain ||
        extractDomain(company.website || company.website_url);
      if (!domain) throw new Error("No domain available for enrichment");
      return await enrichOrganization(domain, company.apollo_org_id || company.id);
    },
    onMutate: (company) => {
      setEnrichingIds((prev) => new Set(prev).add(company.id?.toString() || company.apollo_org_id));
    },
    onSuccess: (data, company) => {
      toast({
        title: "Enrichment Complete",
        description: `${company.name} has been enriched with additional data.`,
      });
      queryClient.invalidateQueries({ queryKey: ["database-companies"] });
    },
    onError: (error: any, company) => {
      toast({ title: "Enrichment Failed", description: error.message, variant: "destructive" });
    },
    onSettled: (_, __, company) => {
      setEnrichingIds((prev) => {
        const next = new Set(prev);
        next.delete(company.id?.toString() || company.apollo_org_id);
        return next;
      });
    },
  });

  // ============================================================================
  // Get Complete Info Mutation
  // ============================================================================
  const getInfoMutation = useMutation({
    mutationFn: async (apolloOrgId: string) => {
      return await getCompleteOrganizationInfo(apolloOrgId);
    },
    onSuccess: (data) => {
      setViewingOrgDetails(data);
      queryClient.invalidateQueries({ queryKey: ["database-companies"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to Get Info", description: error.message, variant: "destructive" });
    },
  });

  // ============================================================================
  // Promote to Active CRM Mutation
  // ============================================================================
  const promoteMutation = useMutation({
    mutationFn: async (companyId: number) => {
      return await promoteToActiveCRM(companyId);
    },
    onSuccess: (data) => {
      toast({
        title: "Promoted to Active CRM! 🎉",
        description: `${data.name} is now an active CRM record.`,
      });
      queryClient.invalidateQueries({ queryKey: ["database-companies"] });
    },
    onError: (error: any) => {
      toast({ title: "Promotion Failed", description: error.message, variant: "destructive" });
    },
  });

  // ============================================================================
  // Bulk Promote Mutation
  // ============================================================================
  const bulkPromoteMutation = useMutation({
    mutationFn: async (companyIds: number[]) => {
      const results = await Promise.allSettled(companyIds.map((id) => promoteToActiveCRM(id)));
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      return { successful, failed, total: companyIds.length };
    },
    onSuccess: ({ successful, failed, total }) => {
      toast({
        title: "Bulk Promotion Complete",
        description: `${successful} of ${total} companies promoted.${failed > 0 ? ` ${failed} failed.` : ""}`,
      });
      setSelectedOrgs(new Set());
      queryClient.invalidateQueries({ queryKey: ["database-companies"] });
    },
    onError: (error: any) => {
      toast({ title: "Bulk Promotion Failed", description: error.message, variant: "destructive" });
    },
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================
  const extractDomain = (url?: string | null): string | null => {
    if (!url) return null;
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.hostname.replace("www.", "");
    } catch {
      return null;
    }
  };

  const getInitials = (name: string) => (name ? name.slice(0, 2).toUpperCase() : "??");

  const formatEmployeeCount = (count?: number | null) => {
    if (!count) return "N/A";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toLocaleString();
  };

  const formatRevenue = (revenue?: number | string | null) => {
    if (!revenue) return "N/A";
    if (typeof revenue === "string") {
      if (revenue.startsWith("$")) return revenue;
      return `$${revenue}`;
    }
    if (revenue >= 1000000000) return `$${(revenue / 1000000000).toFixed(1)}B`;
    if (revenue >= 1000000) return `$${(revenue / 1000000).toFixed(0)}M`;
    return `$${revenue.toLocaleString()}`;
  };

  // ============================================================================
  // Selection Handlers
  // ============================================================================
  const handleSelectAll = useCallback(() => {
    const companies =
      viewMode === "database"
        ? databaseCompanies?.companies || []
        : apiSearchResults?.organizations || [];

    const allIds = companies
      .map((c: any) => c.id?.toString() || c.apollo_org_id || "")
      .filter(Boolean);
    const allSelected = allIds.length > 0 && allIds.every((id: string) => selectedOrgs.has(id));

    if (allSelected) {
      setSelectedOrgs(new Set());
    } else {
      setSelectedOrgs(new Set(allIds));
    }
  }, [viewMode, databaseCompanies, apiSearchResults, selectedOrgs]);

  const handleSelectOrg = useCallback((id: string) => {
    setSelectedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Reset selection when changing view
  useEffect(() => {
    setSelectedOrgs(new Set());
  }, [viewMode]);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const displayCompanies = useMemo(() => {
    if (viewMode === "database") {
      return databaseCompanies?.companies || [];
    }
    return apiSearchResults?.organizations || [];
  }, [viewMode, databaseCompanies, apiSearchResults]);

  const totalResults =
    viewMode === "database"
      ? databaseCompanies?.totalCount || 0
      : apiSearchResults?.pagination?.total_entries || 0;

  const totalPages =
    viewMode === "database"
      ? databaseCompanies?.totalPages || 0
      : apiSearchResults?.pagination?.total_pages || 0;

  const currentPage = viewMode === "database" ? dbPage : apiPage;
  const perPage = viewMode === "database" ? dbPerPage : apiPerPage;

  const isLoading = viewMode === "database" ? isLoadingDatabase && !initialLoadDone.current : isSearching;
  const isFetching = viewMode === "database" ? isFetchingDatabase : isSearching || isSaving;

  // Mark initial load as done
  useEffect(() => {
    if (viewMode === "database" && !isLoadingDatabase) {
      initialLoadDone.current = true;
    }
  }, [viewMode, isLoadingDatabase]);

  // ============================================================================
  // Stage Colors
  // ============================================================================
  const stageColors: Record<string, string> = {
    Identified: "bg-blue-100 text-blue-800",
    Targeting: "bg-indigo-100 text-indigo-800",
    "In Outreach": "bg-teal-100 text-teal-800",
    Warm: "bg-yellow-100 text-yellow-800",
    "Qualified Company": "bg-green-100 text-green-800",
    "Proposal Sent / In Discussion": "bg-purple-100 text-purple-800",
    Negotiation: "bg-orange-100 text-orange-800",
    "Closed - Won": "bg-emerald-100 text-emerald-800",
    "Closed - Lost": "bg-red-100 text-red-800",
    "Re-engage Later": "bg-gray-100 text-gray-800",
    Intelligence: "bg-slate-100 text-slate-600",
    Active: "bg-green-100 text-green-700",
    default: "bg-gray-100 text-gray-800",
  };

  // ============================================================================
  // Render
  // ============================================================================
return (
  <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50/70">

    {/* ============================================= */}
    {/* FIXED FULL-WIDTH HEADER BAR – TOP MOST */}
    {/* ============================================= */}
    <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 shadow-md z-30">
      <div className="flex items-center justify-between gap-6 flex-wrap max-w-screen-2xl mx-auto">

        {/* Left: Title + View Switch + Stats */}
        <div className="flex items-center gap-5 min-w-0">
          {/* Sidebar toggle – always visible */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="h-10 w-10 shrink-0"
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <SlidersHorizontal className="h-5 w-5" />
            )}
          </Button>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Companies
          </h1>

          {/* View mode tabs */}
         <Tabs
  value={viewMode}
  onValueChange={(v) => {
    setViewMode(v as ViewMode);
    setSelectedOrgs(new Set());
  }}
  className="w-auto"
>
  <TabsList className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
   <TabsTrigger
  value="database"
  className={cn(
    "flex items-center whitespace-nowrap",
    "px-6 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
    "data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md",
    "text-slate-500 hover:text-slate-700"
  )}
>
  <Database className="mr-2 h-3.5 w-3.5" />
  CRM Records
</TabsTrigger>


   <TabsTrigger
  value="search"
  className={cn(
    "flex items-center whitespace-nowrap",
    "px-6 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
    "data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md",
    "text-slate-500 hover:text-slate-700"
  )}
>
  <Cloud className="mr-2 h-3.5 w-3.5" />
Search from Cloud
</TabsTrigger>

  </TabsList>
</Tabs>


          {/* Result count */}
          {/* {totalResults > 0 && !isLoading && (
            <Badge
              variant="secondary"
              className="bg-purple-100 text-purple-800 px-4 py-1.5 text-base font-medium hidden sm:flex"
            >
              {totalResults.toLocaleString()} {viewMode === "database" ? "companies" : "results"}
            </Badge>
          )} */}

          {/* Loading indicator */}
          {isFetching && (
            <div className="flex items-center gap-2.5 text-purple-700 text-base hidden md:flex">
              <Loader2 className="h-5 w-5 animate-spin" />
              {isSaving ? "Saving..." : "Loading..."}
            </div>
          )}
        </div>

        {/* Right: Selection + Bulk Actions + Refresh */}
        <div className="flex items-center gap-4 flex-wrap">

          {selectedOrgs.size > 0 && (
            <div className="flex items-center gap-4 bg-purple-50 px-5 py-2 rounded-xl border border-purple-100">
              <span className="font-semibold text-purple-900 text-base">
                {selectedOrgs.size} selected
              </span>

              {viewMode === "database" && (
                <Button
                  size="default"
                  onClick={() => {
                    const ids = Array.from(selectedOrgs)
                      .map(id => parseInt(id))
                      .filter(id => !isNaN(id));
                    bulkPromoteMutation.mutate(ids);
                  }}
                  disabled={bulkPromoteMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 px-5 h-10 text-sm font-medium"
                >
                  {bulkPromoteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Star className="h-4 w-4 mr-2" />
                  )}
                  Promote to CRM
                </Button>
              )}

              <Button
                variant="outline"
                size="default"
                onClick={() => setSelectedOrgs(new Set())}
                className="h-10 text-sm"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          )}

          {/* Refresh (database only) */}
          {viewMode === "database" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => refetchDatabase()}
                    disabled={isFetchingDatabase}
                    className="h-10 w-10"
                  >
                    <RefreshCw
                      className={cn("h-5 w-5", isFetchingDatabase && "animate-spin")}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh database</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>

    {/* ============================================= */}
    {/* CONTENT AREA: Sidebar + Table side by side */}
    {/* ============================================= */}
    <div className="flex flex-1 overflow-hidden">

      {/* LEFT: Collapsible Filter Sidebar */}
      <div
        className={cn(
          "flex-shrink-0 border-r border-slate-200 bg-white transition-all duration-300 ease-in-out shadow-md z-20",
          isSidebarOpen ? "w-80" : "w-0"
        )}
      >
        {isSidebarOpen && (
          viewMode === "database" ? (
            <DatabaseFilterSidebar
              filters={dbFilters}
              onFiltersChange={(newFilters) => {
                setDbFilters(newFilters);
                setDbPage(1);
              }}
              isLoading={isFetchingDatabase}
              totalResults={totalResults}
              onClose={() => setIsSidebarOpen(false)}
            />
          ) : (
            <CompanySearchFilterSidebar
              onSearch={handleApiSearch}
              isSearching={isSearching}
              totalResults={totalResults}
              onClose={() => setIsSidebarOpen(false)}
            />
          )
        )}
      </div>

      {/* RIGHT: Main Table / Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50/40">

        {/* Database loading skeleton */}
        {viewMode === "database" && isLoading && (
          <div className="p-6 space-y-5">
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <div className="h-12 bg-slate-100 animate-pulse rounded-xl mb-5" />
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex items-center gap-8 py-5 border-b last:border-0">
                  <div className="flex items-center gap-5 flex-1">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="space-y-3 flex-1">
                      <Skeleton className="h-6 w-72" />
                      <Skeleton className="h-4 w-56" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-32 rounded-full" />
                  <Skeleton className="h-8 w-32 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API search – not searched yet */}
        {viewMode === "search" && !hasSearched && !isSearching && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-8 shadow-lg">
              <Search className="h-12 w-12 text-purple-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Search 
            </h2>
            <p className="text-lg text-slate-600 max-w-lg mb-10">
              Use the filters on the left to discover companies. All matching results are automatically saved to your database.
            </p>
            <div className="flex gap-10 text-base text-slate-500">
              <div className="flex items-center gap-3">
                <Zap className="h-6 w-6 text-amber-500" />
                credits used
              </div>
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-blue-500" />
                Auto-saved
              </div>
            </div>
          </div>
        )}

        {/* Searching / Saving overlay */}
        {(isSearching || isSaving) && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-sm">
            <div className="text-center">
              <Loader2 className="h-16 w-16 animate-spin text-purple-600 mx-auto mb-6" />
              <p className="text-2xl font-semibold text-slate-800 mb-2">
                {isSaving ? "Saving to Database..." : "Searching..."}
              </p>
              <p className="text-base text-slate-600">
                This may take a few seconds
              </p>
            </div>
          </div>
        )}

        {/* Main table – shown when we have data */}
        {!isLoading && displayCompanies.length > 0 && !isSearching && (
<div className="flex flex-col h-full overflow-hidden">

   <div className="flex-1 overflow-hidden bg-white border border-slate-200 shadow-sm">
  <div className="h-full overflow-y-auto">
    <table className="w-full min-w-max divide-y divide-slate-200 table-fixed">
          <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-700 shadow-sm">
            <tr>
              <th className="sticky top-0 left-0 z-30 bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider border-r border-slate-600/40 shadow-[2px_0_6px_-3px_rgba(0,0,0,0.25)] w-[200px]">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      displayCompanies.length > 0 &&
                      displayCompanies.every((c: any) => selectedOrgs.has(c.id?.toString() || c.apollo_org_id || ""))
                    }
                    onCheckedChange={handleSelectAll}
                    className="border-white/70 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500 h-3.5 w-3.5"
                  />
                  Company
                </div>
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[160px]">Industry</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[200px]">Location</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[120px]">Employees</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[120px]">Revenue</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-[150px]">CRM Stage</th>
              <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-white uppercase tracking-wider w-[100px]">Links</th>
              <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-white uppercase tracking-wider w-[130px]">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white text-[8px]">
            {displayCompanies.map((company: any) => {
              const companyId = company.id?.toString() || company.apollo_org_id || "";
              const isSelected = selectedOrgs.has(companyId);
              const domain = company.domain || company.primary_domain || extractDomain(company.website || company.website_url);
              const location = company.location || [company.city, company.state, company.country].filter(Boolean).join(", ");
              const isPromoted = company.status === "Active";
              const hasApolloData = !!company.apollo_org_id;

              return (
                <tr
                  key={companyId}
                  className={cn(
                    "group transition-colors duration-100",
                    isSelected ? "bg-purple-50/60" : "hover:bg-slate-50/80"
                  )}
                >
                  {/* FIXED FIRST COLUMN */}
                  <td className="sticky left-0 z-5 bg-white group-hover:bg-slate-50 px-4 py-2.5 shadow-[2px_0_6px_-3px_rgba(0,0,0,0.08)] border-r border-slate-100 w-[200px]">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectOrg(companyId)}
                        className="border-slate-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 h-3.5 w-3.5"
                      />
                      <Avatar className="h-8 w-8 border shadow-sm flex-shrink-0">
                        <AvatarImage src={company.logo_url} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-[8px] font-bold">
                          {getInitials(company.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {viewMode === "database" && company.id ? (
                            <RouterLink
                              to={`/companies/${company.id}`}
                              className="font-semibold text-slate-900 hover:text-purple-700 truncate text-[10px] block leading-tight"
                            >
                              {company.name}
                            </RouterLink>
                          ) : (
                            <span className="font-semibold text-slate-900 truncate text-[10px] block leading-tight">
                              {company.name}
                            </span>
                          )}
                          {hasApolloData && <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                          {isPromoted && <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />}
                        </div>
                        <p className="text-[8px] text-slate-500 truncate mt-0.5">
                          {domain || "No domain"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Industry */}
                  <td className="px-4 py-2.5 whitespace-nowrap text-[8px] text-slate-700">
                    {company.industry || <span className="text-slate-400">—</span>}
                  </td>

                  {/* Location */}
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-[8px] text-slate-700">
                      <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate max-w-[180px]">{location || "—"}</span>
                    </div>
                  </td>

                  {/* Employees */}
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-[8px] font-medium text-slate-800">
                      <Users className="h-3 w-3 text-blue-500" />
                      {formatEmployeeCount(company.employee_count || company.estimated_num_employees)}
                    </div>
                  </td>

                  {/* Revenue */}
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-[8px] font-medium text-green-700">
                      <DollarSign className="h-3 w-3" />
                      {formatRevenue(company.revenue || company.annual_revenue || company.annual_revenue_printed)}
                    </div>
                  </td>

                  {/* CRM Stage */}
                  <td className="px-4 py-2.5 whitespace-nowrap text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-7 min-w-[130px] text-[8px] font-semibold uppercase tracking-tight rounded-lg border shadow-sm px-2.5 py-1",
                            stageColors[company.stage || company.status || "default"]
                          )}
                        >
                          {company.stage || company.status || "Stage"}
                          <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[150px] max-h-60 overflow-y-auto text-[8px]">
                        {STAGES.map((stageOption) => (
                          <DropdownMenuItem
                            key={stageOption}
                            onClick={() => handleStageChange(company, stageOption)}
                            className={cn(
                              "py-1.5 cursor-pointer",
                              (company.stage || company.status) === stageOption && "bg-purple-50 font-medium"
                            )}
                          >
                            {stageOption}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>

                  {/* Links */}
                  <td className="px-4 py-2.5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2.5">
                      {(company.website || company.website_url) && (
                        <a
                          href={company.website || company.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Globe className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {(company.linkedin || company.linkedin_url) && (
                        <a
                          href={company.linkedin || company.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Linkedin className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2.5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      {viewMode === "database" && company.id && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-purple-50">
                                <RouterLink to={`/companies/${company.id}`}>
                                  <Eye className="h-3.5 w-3.5" />
                                </RouterLink>
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg"
                                onClick={() => promoteMutation.mutate(company.id)}
                                disabled={promoteMutation.isPending}
                              >
                                {promoteMutation.isPending && promoteMutation.variables === company.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Star className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Promote</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                                      <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    {company.apollo_org_id && (
                                      <DropdownMenuItem
                                        onClick={() => getInfoMutation.mutate(company.apollo_org_id)}
                                        disabled={getInfoMutation.isPending}
                                      >
                                        <Info className="h-4 w-4 mr-2" />
                                        Get Full Info
                                      </DropdownMenuItem>
                                    )}

                                    {domain && (
                                      <DropdownMenuItem
                                        onClick={() => enrichMutation.mutate(company)}
                                        disabled={enrichingIds.has(companyId)}
                                      >
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        {enrichingIds.has(companyId) ? "Enriching..." : "Enrich Data"}
                                      </DropdownMenuItem>
                                    )}

                                    <DropdownMenuSeparator />

                                    {workspaceFiles.length > 0 && (
                                      <>
                                        <DropdownMenuLabel className="text-xs text-slate-500 px-3 py-2">
                                          Add to List
                                        </DropdownMenuLabel>
                                        {workspaceFiles.slice(0, 6).map((file: any) => (
                                          <DropdownMenuItem
                                            key={file.id}
                                            onClick={async () => {
                                              if (!company.id) {
                                                toast({
                                                  title: "Error",
                                                  description: "Company must be saved first",
                                                  variant: "destructive",
                                                });
                                                return;
                                              }
                                              try {
                                                await supabase
                                                  .from("company_workspace_files")
                                                  .upsert(
                                                    {
                                                      company_id: company.id,
                                                      file_id: file.id,
                                                      added_by: currentUserId,
                                                    },
                                                    { onConflict: "company_id,file_id" }
                                                  );
                                                toast({
                                                  title: "Added",
                                                  description: `Added to ${file.name}`,
                                                });
                                              } catch (e: any) {
                                                toast({
                                                  title: "Failed",
                                                  description: e.message,
                                                  variant: "destructive",
                                                });
                                              }
                                            }}
                                          >
                                            <ListPlus className="h-4 w-4 mr-2" />
                                            <span className="truncate">{file.name}</span>
                                          </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                      </>
                                    )}

                                    {(company.website || company.website_url) && (
                                      <DropdownMenuItem asChild>
                                        <a
                                          href={company.website || company.website_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <ExternalLink className="h-4 w-4 mr-2" />
                                          Visit Website
                                        </a>
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {/* Compact Pagination */}
{totalPages > 1 && (
  <div className="sticky bottom-2 z-20 bg-white border-t border-slate-200 shadow-[0_-2px_6px_-3px_rgba(0,0,0,0.15)]">
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2 gap-4 text-[8px]">

      <p className="text-slate-600">
        {((currentPage - 1) * perPage + 1).toLocaleString()} –{" "}
        {Math.min(currentPage * perPage, totalResults).toLocaleString()} of{" "}
        {totalResults.toLocaleString()}
      </p>

      <div className="flex items-center gap-2.5">
        <span className="text-slate-600 font-medium">Rows:</span>
        <Select
          value={perPage.toString()}
          onValueChange={(v) => {
            const n = parseInt(v);
            if (viewMode === "database") {
              setDbPerPage(n);
              setDbPage(1);
            } else {
              setApiPerPage(n);
              setApiPage(1);
            }
          }}
        >
          <SelectTrigger className="w-16 h-7 text-[8px] px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            viewMode === "database"
              ? setDbPage((p) => Math.max(1, p - 1))
              : handleApiPageChange(apiPage - 1)
          }
          disabled={currentPage === 1 || isFetching}
          className="h-7 px-2.5 text-[8px]"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          Prev
        </Button>

        <span className="font-medium px-3">
          {currentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            viewMode === "database"
              ? setDbPage((p) => Math.min(totalPages, p + 1))
              : handleApiPageChange(apiPage + 1)
          }
          disabled={currentPage === totalPages || isFetching}
          className="h-7 px-2.5 text-[8px]"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  </div>
)}

  
</div>
        )}

        {/* No results state */}
        {!isLoading && displayCompanies.length === 0 && (viewMode === "database" || hasSearched) && !isSearching && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-8 shadow-md">
              <AlertCircle className="h-12 w-12 text-slate-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">No companies found</h2>
            <p className="text-lg text-slate-600 max-w-lg mb-10">
              {viewMode === "database"
                ? "Try adjusting your filters or switch to Search from Cloud to find new companies."
                : "Try adjusting your search criteria."}
            </p>
            {viewMode === "database" && (
              <Button onClick={() => setViewMode("search")} size="lg" className="gap-3 text-base">
                <Cloud className="h-5 w-5" /> Search from Cloud
              </Button>
            )}
          </div>
        )}
      </div>
    </div>

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
          <DialogDescription className="text-base">
            Complete organization information from Search from Cloud
          </DialogDescription>
        </DialogHeader>

        {viewingOrgDetails && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-slate-500 uppercase font-semibold tracking-wide">Industry</p>
                <p className="text-base font-medium mt-1 capitalize">{viewingOrgDetails.industry || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 uppercase font-semibold tracking-wide">Employees</p>
                <p className="text-base font-medium mt-1">
                  {formatEmployeeCount(viewingOrgDetails.estimated_num_employees)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 uppercase font-semibold tracking-wide">Revenue</p>
                <p className="text-base font-medium mt-1">
                  {formatRevenue(viewingOrgDetails.annual_revenue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 uppercase font-semibold tracking-wide">Founded</p>
                <p className="text-base font-medium mt-1">{viewingOrgDetails.founded_year || "N/A"}</p>
              </div>
            </div>

            {viewingOrgDetails.short_description && (
              <div>
                <p className="text-sm text-slate-500 uppercase font-semibold tracking-wide mb-2">Description</p>
                <p className="text-base text-slate-700 leading-relaxed">{viewingOrgDetails.short_description}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-slate-500 uppercase font-semibold tracking-wide mb-2">Location</p>
              <p className="text-base text-slate-700">
                {[viewingOrgDetails.city, viewingOrgDetails.state, viewingOrgDetails.country]
                  .filter(Boolean)
                  .join(", ") || "N/A"}
              </p>
            </div>

            {viewingOrgDetails.technology_names?.length > 0 && (
              <div>
                <p className="text-sm text-slate-500 uppercase font-semibold tracking-wide mb-3">Technologies</p>
                <div className="flex flex-wrap gap-2">
                  {viewingOrgDetails.technology_names.slice(0, 20).map((tech: string) => (
                    <Badge key={tech} variant="secondary" className="text-sm px-3 py-1">
                      {tech}
                    </Badge>
                  ))}
                  {viewingOrgDetails.technology_names.length > 20 && (
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      +{viewingOrgDetails.technology_names.length - 20} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {viewingOrgDetails.keywords?.length > 0 && (
              <div>
                <p className="text-sm text-slate-500 uppercase font-semibold tracking-wide mb-3">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {viewingOrgDetails.keywords.slice(0, 15).map((keyword: string) => (
                    <Badge key={keyword} variant="outline" className="text-sm px-3 py-1">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => setViewingOrgDetails(null)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
};

export default CompanyIntelligenceSearchPage;
// improve UI tale UI