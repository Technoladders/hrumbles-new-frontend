"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnFiltersState,
  VisibilityState,
  ColumnOrderState,
  ColumnSizingState,
} from '@tanstack/react-table';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { DataTable }           from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { ContactFiltersSidebar } from '@/components/sales/contacts-table/ContactFiltersSidebar';
import { DiscoverySidebar }    from '@/components/sales/discovery/DiscoverySidebar';
import { AddToListModal }      from '@/components/sales/contacts-table/AddToListModal';
import { ContactImportDialog } from '@/components/sales/contacts-table/ContactImportDialog';
import { SearchEmptyState }    from '@/components/sales/contacts-table/SearchEmptyState';
import { columns }             from '@/components/sales/contacts-table/columns';

import { setDiscoveryMode, setPage, setFilters, resetSearch, setPerPage } from '@/Redux/intelligenceSearchSlice';
import { saveDiscoveryToCRM } from '@/services/sales/discoveryService';
import { useSimpleContacts }  from '@/hooks/sales/useSimpleContacts';
import {
  useFilterParams,
  buildFilterSummary,
  countActiveFilters,
  hasActiveFilters,
  ContactFilters,
} from '@/hooks/sales/useContactFilterParams';
import { useToast } from '@/hooks/use-toast';

import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Badge }    from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@chakra-ui/react';
import {
  Search, SlidersHorizontal, RotateCcw, Check, ArrowLeft,
  FolderOpen, UploadCloud, List, X, PanelLeftClose, PanelLeftOpen,
  Users, DatabaseZap, ListPlus, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface RecentSearch {
  id:          string;
  summary:     string;
  filters:     ContactFilters;
  resultCount: number;
  timestamp:   number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
// Separate recent-search history for each mode
const LS_KEY_CRM       = 'contacts_recent_crm_searches_v2';
const LS_KEY_DISCOVERY = 'contacts_recent_discovery_searches_v1';

const DEFAULT_VISIBILITY: VisibilityState = {
  // Hidden by default
  seniority: false, departments: false, functions: false,
  industry: false, revenue: false, employee_count: false,
  updated_at: false, data_availability: false,
  // Visible by default
  contact: true, job_title: true, company_name: true, location: true,
  contact_stage: true, medium: true, created_by_employee: true, created_at: true,
};

const DEFAULT_ORDER: ColumnOrderState = [
  'select', 'name', 'contact', 'data_availability',
  'job_title', 'company_name', 'actions',
  'contact_stage', 'medium', 'created_by_employee',
  'created_at', 'location',
  'seniority', 'departments', 'functions',
  'industry', 'revenue', 'employee_count', 'updated_at',
];

// Human-readable labels for every column id (no internal/vendor names)
const COL_LABELS: Record<string, { label: string; desc: string; group: string }> = {
  select:              { label: 'Select',          desc: 'Row selection checkbox',           group: 'Core' },
  name:                { label: 'Name',             desc: 'Contact name and LinkedIn link',   group: 'Core' },
  contact:             { label: 'Contact',          desc: 'Email and phone quick access',     group: 'Core' },
  data_availability:   { label: 'Data Signals',     desc: 'Shows which contact data exists',  group: 'Core' },
  job_title:           { label: 'Job Title',        desc: 'Current role / position',          group: 'People' },
  company_name:        { label: 'Company',          desc: 'Employer or organisation',         group: 'People' },
  location:            { label: 'Location',         desc: 'City, state, country',             group: 'People' },
  seniority:           { label: 'Seniority',        desc: 'Enriched seniority level',         group: 'People' },
  departments:         { label: 'Departments',      desc: 'Enriched department tags',         group: 'People' },
  functions:           { label: 'Functions',        desc: 'Enriched function tags',           group: 'People' },
  industry:            { label: 'Industry',         desc: 'Company industry',                 group: 'People' },
  employee_count:      { label: 'Employees',        desc: 'Company headcount',                group: 'People' },
  revenue:             { label: 'Revenue',          desc: 'Company revenue range',            group: 'People' },
  contact_stage:       { label: 'Stage',            desc: 'Pipeline / CRM stage',             group: 'CRM' },
  medium:              { label: 'Source',           desc: 'How the contact was acquired',     group: 'CRM' },
  created_by_employee: { label: 'Owner',            desc: 'Who added this contact',           group: 'CRM' },
  created_at:          { label: 'Date Added',       desc: 'When the contact was created',     group: 'CRM' },
  updated_at:          { label: 'Last Updated',     desc: 'Most recent edit date',            group: 'CRM' },
  actions:             { label: 'Actions',          desc: 'Inline row actions',               group: 'Core' },
};

// ── Recent-search localStorage helpers ────────────────────────────────────────
function loadRecentSearches(isDiscovery: boolean): RecentSearch[] {
  try { return JSON.parse(localStorage.getItem(isDiscovery ? LS_KEY_DISCOVERY : LS_KEY_CRM) || '[]'); }
  catch { return []; }
}

function saveRecentSearch(filters: ContactFilters, resultCount: number, isDiscovery: boolean): RecentSearch[] {
  const key     = isDiscovery ? LS_KEY_DISCOVERY : LS_KEY_CRM;
  const summary = buildFilterSummary(filters);
  const existing = loadRecentSearches(isDiscovery);
  const entry: RecentSearch = {
    id: Date.now().toString(), summary, filters, resultCount, timestamp: Date.now(),
  };
  // Deduplicate by summary, keep 10 max
  const updated = [entry, ...existing.filter(s => s.summary !== summary)].slice(0, 10);
  localStorage.setItem(key, JSON.stringify(updated));
  return updated;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TanstackContactsPage() {
  const dispatch    = useDispatch();
  const { toast }   = useToast();
  const queryClient = useQueryClient();
  const navigate    = useNavigate();
  const [,          setSearchParams]   = useSearchParams();

  const { isDiscoveryMode, totalEntries, currentPage, perPage, filters: reduxFilters } =
    useSelector((state: any) => state.intelligenceSearch);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const user            = useSelector((state: any) => state.auth.user);
  const { fileId }      = useParams<{ fileId?: string }>();

  // URL-based filter params
  const { currentFilters: urlFilters, writeFilters, clearFilters } = useFilterParams();

  // ── Local state ──────────────────────────────────────────────────────────────
  const [isSidebarOpen,    setIsSidebarOpen]    = useState(true);
  // In CRM mode: hasSearched tracks whether CRM filters were applied
  // In Discovery mode: always show empty state until user runs search (managed by Redux)
  const [hasSearched,      setHasSearched]      = useState(() => hasActiveFilters(urlFilters));
  const [isBulkSaving,           setIsBulkSaving]           = useState(false);
  const [pendingDiscoveryChips,  setPendingDiscoveryChips]  = useState<string[]>([]);
  const [pendingDiscoveryCount,  setPendingDiscoveryCount]  = useState(0);
  const [recentSearches,         setRecentSearches]         = useState<RecentSearch[]>(() => loadRecentSearches(false));
  const [selectedListId,   setSelectedListId]   = useState<string | null>(null);
  const [listModalOpen,    setListModalOpen]     = useState(false);
  const [selectedContact,  setSelectedContact]  = useState<any>(null);
  const [isFromDiscovery,  setIsFromDiscovery]  = useState(false);
  const [viewSettingsOpen, setViewSettingsOpen] = useState(false);
  const [isImportOpen,     setIsImportOpen]     = useState(false);
  const [headerSearch,     setHeaderSearch]     = useState('');

  // ── Column preferences ───────────────────────────────────────────────────────
  const [columnVisibility,    setColumnVisibility]    = useState<VisibilityState>(DEFAULT_VISIBILITY);
  const [columnOrder,         setColumnOrder]         = useState<ColumnOrderState>(DEFAULT_ORDER);
  const [columnSizing,        setColumnSizing]        = useState<ColumnSizingState>({});
  const [preferencesLoaded,   setPreferencesLoaded]   = useState(false);

  const activeFileId = selectedListId || fileId || null;

  // ── On mount: re-hydrate Redux from URL params ────────────────────────────────
  useEffect(() => {
    if (hasActiveFilters(urlFilters) && !isDiscoveryMode) {
      const redux: any = {};
      if (urlFilters.search)                redux.search         = urlFilters.search;
      if (urlFilters.jobTitles.length)      redux.jobTitles       = urlFilters.jobTitles;
      if (urlFilters.seniorities.length)    redux.seniorities     = urlFilters.seniorities;
      if (urlFilters.stages.length)         redux.stages          = urlFilters.stages;
      if (urlFilters.sources.length)        redux.sources         = urlFilters.sources;
      if (urlFilters.countries.length)      redux.countries       = urlFilters.countries;
      if (urlFilters.states?.length)        redux.states          = urlFilters.states;
      if (urlFilters.cities.length)         redux.cities          = urlFilters.cities;
      if (urlFilters.industries.length)     redux.industries      = urlFilters.industries;
      if (urlFilters.employeeCounts.length) redux.employeeCounts  = urlFilters.employeeCounts;
      if (urlFilters.companyIds.length)     redux.companyIds      = urlFilters.companyIds;
      if (urlFilters.hasEmail)              redux.hasEmail        = true;
      if (urlFilters.hasPhone)              redux.hasPhone        = true;
      if (urlFilters.isEnriched)            redux.isEnriched      = true;
      dispatch(setFilters(redux));
      // Also restore page from URL params
      const urlPage = parseInt(new URLSearchParams(window.location.search).get('page') || '1', 10);
      if (urlPage > 1) dispatch(setPage(urlPage));
      setHasSearched(true);
    }
    // Determine initial tab: URL param > sessionStorage > default (discovery on fresh visit)
const sp = new URLSearchParams(window.location.search);
  const urlMode = sp.get('mode');

  if (urlMode === 'crm') {
    dispatch(setDiscoveryMode(false));
  } else if (urlMode === 'discovery') {
    dispatch(setDiscoveryMode(true));
  }
  }, []);

  // ── Reset when entering file route ───────────────────────────────────────────
  useEffect(() => {
    if (fileId) {
      dispatch(setDiscoveryMode(false));
      dispatch(resetSearch());
      dispatch(setPage(1));
      setHasSearched(true);
    }
  }, [fileId]);

  // ── Reload correct recent-search history when mode changes ───────────────────
// Keep URL and sessionStorage in sync whenever Redux mode changes
useEffect(() => {
  const mode = isDiscoveryMode ? 'discovery' : 'crm';

  // Update URL without adding to history stack (replace)
  setSearchParams(
    prev => {
      if (prev.get('mode') !== mode) {
        prev.set('mode', mode);
      }
      return prev;
    },
    { replace: true }
  );

  // Update sessionStorage
  sessionStorage.setItem('contacts_mode', mode);

  // Reload correct recent searches for current mode
  setRecentSearches(loadRecentSearches(isDiscoveryMode));
}, [isDiscoveryMode, setSearchParams]);

  // ── User preferences ─────────────────────────────────────────────────────────
  const { data: userPreferences } = useQuery({
    queryKey: ['table-preferences', user?.id, 'contacts-table'],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_table_preferences').select('*')
        .eq('user_id', user.id).eq('table_name', 'contacts-table').single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (prefs: any) => {
      if (!user?.id) return;
      const { error } = await supabase.from('user_table_preferences').upsert({
        user_id: user.id, table_name: 'contacts-table',
        column_visibility: prefs.columnVisibility,
        column_order:      prefs.columnOrder,
        column_sizing:     prefs.columnSizing,
        updated_at:        new Date().toISOString(),
      }, { onConflict: 'user_id,table_name' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'View saved' });
      queryClient.invalidateQueries({ queryKey: ['table-preferences', user?.id] });
    },
  });

  // ── Migrate legacy column prefs: email + mobile → contact ───────────────────
  const migrateLegacyPrefs = (prefs: { column_visibility?: any; column_order?: any; column_sizing?: any }) => {
    let vis   = prefs.column_visibility ? { ...prefs.column_visibility } : null;
    let order = prefs.column_order ? [...prefs.column_order] : null;
    let sizing = prefs.column_sizing ? { ...prefs.column_sizing } : null;

    if (order) {
      // Replace email/mobile with a single 'contact' entry (after 'name' if possible)
      const hasContact = order.includes('contact');
      if (!hasContact) {
        const nameIdx = order.indexOf('name');
        const insertAt = nameIdx >= 0 ? nameIdx + 1 : 2;
        const filtered = order.filter((id: string) => id !== 'email' && id !== 'mobile');
        filtered.splice(insertAt, 0, 'contact');
        order = filtered;
      } else {
        order = order.filter((id: string) => id !== 'email' && id !== 'mobile');
      }
    }
    if (vis) {
      delete vis.email; delete vis.mobile;
      if (vis.contact === undefined) vis.contact = true;
    }
    if (sizing) { delete sizing.email; delete sizing.mobile; }
    return { vis, order, sizing };
  };

  useEffect(() => {
    if (userPreferences && !preferencesLoaded) {
      const { vis, order, sizing } = migrateLegacyPrefs({
        column_visibility: userPreferences.column_visibility,
        column_order:      userPreferences.column_order,
        column_sizing:     userPreferences.column_sizing,
      });
      if (vis)    setColumnVisibility({ ...DEFAULT_VISIBILITY, ...vis });
      if (order)  setColumnOrder(order);
      if (sizing) setColumnSizing(sizing);
      setPreferencesLoaded(true);
    } else if (!userPreferences && !preferencesLoaded && user?.id) {
      setPreferencesLoaded(true);
    }
  }, [userPreferences, preferencesLoaded, user?.id]);

  // ── Column visibility by mode ────────────────────────────────────────────────
  useEffect(() => {
    if (isDiscoveryMode) {
      setColumnVisibility(prev => ({
        ...prev,
        contact: true, data_availability: true,
        contact_stage: false, medium: false,
        created_by_employee: false, created_at: false, location: false,
      }));
    } else {
      setColumnVisibility(prev => ({
        ...prev,
        contact: true, data_availability: false,
        contact_stage: true, medium: true,
        created_by_employee: true, created_at: true, location: true,
      }));
    }
  }, [isDiscoveryMode]);

  // ── Workspace lists for header filter ────────────────────────────────────────
  const { data: workspaceLists } = useQuery({
    queryKey: ['all-workspace-lists', organization_id],
    queryFn: async () => {
      const { data: wsData } = await supabase
        .from('workspaces').select('id,name').eq('organization_id', organization_id).order('name');
      if (!wsData?.length) return [];
      const wsIds = wsData.map((w: any) => w.id);
      const { data: fileData } = await supabase
        .from('workspace_files').select('id,name,workspace_id').in('workspace_id', wsIds).order('name');
      return (wsData || []).map((ws: any) => ({
        workspace: ws,
        files: (fileData || []).filter((f: any) => f.workspace_id === ws.id),
      })).filter((g: any) => g.files.length > 0);
    },
    enabled: !!organization_id,
    staleTime: 5 * 60_000,
  });

  const { data: currentFile } = useQuery({
    queryKey: ['workspace-file', fileId],
    queryFn: async () => {
      if (!fileId) return null;
      const { data, error } = await supabase
        .from('workspace_files')
        .select('id,name,type,workspace_id,workspaces(id,name)')
        .eq('id', fileId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!fileId,
  });

  // ── Data fetch ───────────────────────────────────────────────────────────────
  // Discovery mode only fetches when user has actually run a search (Redux filters non-empty)
  const discoveryHasActiveFilters = useMemo(() =>
    isDiscoveryMode && Object.keys(reduxFilters || {}).some(k => {
      const v = (reduxFilters as any)[k];
      return v !== undefined && v !== '' && v !== false && (Array.isArray(v) ? v.length > 0 : true);
    }),
  [isDiscoveryMode, reduxFilters]);

  const queryEnabled = (hasSearched && !isDiscoveryMode) || !!activeFileId || discoveryHasActiveFilters;

  const contactsQueryKey = useMemo(() => ['contacts-unified', {
    isDiscoveryMode, filters: reduxFilters, currentPage, perPage,
    fileId: activeFileId, organization_id,
  }], [isDiscoveryMode, reduxFilters, currentPage, perPage, activeFileId, organization_id]);

  const { data: queryResult, isLoading, isFetching } = useSimpleContacts({
    fileId: activeFileId,
    enabled: queryEnabled,
  });

  const tableData = queryResult?.data  || [];
  const totalRows = queryResult?.count || 0;

  // Update result count in the most recent saved search
  useEffect(() => {
    if (hasSearched && totalRows > 0 && recentSearches.length > 0) {
      const updated = recentSearches.map((s, i) => i === 0 ? { ...s, resultCount: totalRows } : s);
      setRecentSearches(updated);
      localStorage.setItem(isDiscoveryMode ? LS_KEY_DISCOVERY : LS_KEY_CRM, JSON.stringify(updated));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalRows]);

  // ── Action: sidebar search  (called when user hits "Search" button) ───────────
  const handleSidebarSearch = useCallback((reduxFilterPayload: any, summary: string) => {
    setHasSearched(true);
    // Save to CRM recent searches (not discovery)
    const updated = saveRecentSearch(urlFilters, totalRows, false);
    setRecentSearches(updated);
  }, [urlFilters, totalRows]);

  // ── Action: apply a saved recent search ──────────────────────────────────────
  const handleApplyRecentSearch = useCallback((saved: RecentSearch) => {
    if (isDiscoveryMode) {
      // Discovery: restore discovery filters stored in sidebar local state shape
      const f = saved.filters;
      const kw = [f.q_keywords, ...(f.company_name_tags || [])].filter(Boolean).join(' ').trim();
      dispatch(setFilters({
        q_keywords:                               kw,
        person_titles:                             f.person_titles            || [],
        person_locations:                          f.person_locations         || [],
        person_seniorities:                        f.person_seniorities       || [],
        organization_locations:                    f.organization_locations   || [],
        organization_num_employees_ranges:         f.organization_num_employees_ranges || [],
        contact_email_status:                      f.contact_email_status     || [],
        include_similar_titles:                    f.include_similar_titles   ?? true,
        currently_using_any_of_technology_uids:   f.technologies             || [],
        q_organization_job_titles:                f.q_organization_job_titles || [],
        organization_job_locations:               f.job_posting_locations    || [],
        revenue_range: f.revenue_min || f.revenue_max ? {
          min: f.revenue_min ? parseInt(f.revenue_min, 10) : undefined,
          max: f.revenue_max ? parseInt(f.revenue_max, 10) : undefined,
        } : undefined,
      }));
      dispatch(setPage(1));
    } else {
      // CRM: restore ContactFilters → URL params + Redux
      const savedFilters = saved.filters as ContactFilters;
      writeFilters(savedFilters, 1);
      const redux: any = {};
      if (savedFilters.search)                redux.search         = savedFilters.search;
      if (savedFilters.jobTitles?.length)     redux.jobTitles       = savedFilters.jobTitles;
      if (savedFilters.seniorities?.length)   redux.seniorities     = savedFilters.seniorities;
      if (savedFilters.stages?.length)        redux.stages          = savedFilters.stages;
      if (savedFilters.sources?.length)       redux.sources         = savedFilters.sources;
      if (savedFilters.countries?.length)     redux.countries       = savedFilters.countries;
      if (savedFilters.states?.length)        redux.states          = savedFilters.states;
      if (savedFilters.cities?.length)        redux.cities          = savedFilters.cities;
      if (savedFilters.industries?.length)    redux.industries      = savedFilters.industries;
      if (savedFilters.employeeCounts?.length) redux.employeeCounts = savedFilters.employeeCounts;
      if (savedFilters.companyIds?.length)    redux.companyIds      = savedFilters.companyIds;
      if (savedFilters.hasEmail)              redux.hasEmail        = true;
      if (savedFilters.hasPhone)              redux.hasPhone        = true;
      if (savedFilters.isEnriched)            redux.isEnriched      = true;
      dispatch(setFilters(redux));
      dispatch(setPage(1));
    }
    setHasSearched(true);
  }, [isDiscoveryMode, writeFilters, dispatch]);

  const handleRemoveRecentSearch = useCallback((id: string) => {
    const updated = recentSearches.filter(s => s.id !== id);
    setRecentSearches(updated);
    localStorage.setItem(isDiscoveryMode ? LS_KEY_DISCOVERY : LS_KEY_CRM, JSON.stringify(updated));
  }, [recentSearches, isDiscoveryMode]);

  // (Availability signals are derived from the search cache at query time — no separate upsert needed)

  // ── Handlers (logic preserved from original) ─────────────────────────────────

  const handleSaveDiscovery = async (person: any, targetFileId?: string) => {
    // Unwrap mapped discovery row → get original person data object
    // (mapped rows carry original_data; raw discovery persons don't)
    const apolloPerson = person?.original_data || person;
    try {
      const savedContact = await saveDiscoveryToCRM(apolloPerson, organization_id, user.id);
      const fid = targetFileId || activeFileId;
      if (fid && savedContact?.id) {
        await supabase.from('contact_workspace_files').upsert({
          contact_id: savedContact.id, file_id: fid, added_by: user.id,
        });
      }
      toast({ title: 'Lead Captured', description: `${person.name || person.first_name} added to CRM.` });
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
      queryClient.invalidateQueries({ queryKey: ['listRecordCounts'] });
      return savedContact;
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
      throw err;
    }
  };

  const handleEnrich = async (contactId: string, apolloId: string | null, type: 'email' | 'phone', personDetails?: any) => {
    try {
      toast({ title: 'Verifying…', description: `Checking ${type}` });
      const { data, error } = await supabase.functions.invoke('enrich-contact', {
        body: {
          contactId, apolloPersonId: apolloId, revealType: type,
          organizationId: organization_id, userId: user.id,
          email: personDetails?.email, name: personDetails?.name,
          linkedin_url: personDetails?.linkedin_url,
          organization_name: personDetails?.company_name,
          domain: personDetails?.company_domain,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error === 'insufficient_credits') {
        toast({ variant: 'destructive', title: 'Insufficient Credits', description: data.message }); return;
      }
      if (data?.error === 'no_match') {
        toast({ variant: 'destructive', title: 'No Match Found', description: data.message }); return;
      }
      const credit = data?.credits?.deducted ? ` (${data.credits.deducted} credit${data.credits.deducted > 1 ? 's' : ''})` : '';
      toast({ title: 'Success', description: (data?.message || 'Enrichment complete') + credit });
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  // ── Bulk: Save selected discovery rows to CRM ────────────────────────────────
  const handleBulkSaveToCRM = async () => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (!selectedRows.length) return;
    setIsBulkSaving(true);
    let saved = 0, failed = 0;
    for (const row of selectedRows) {
      try {
        const person = row.original?.original_data || row.original;
        if (!person) { failed++; continue; }
        const savedContact = await saveDiscoveryToCRM(person, organization_id, user.id);
        if (savedContact?.id) {
          saved++;
        }
      } catch { failed++; }
    }
    setIsBulkSaving(false);
    table.resetRowSelection();
    toast({
      title: `${saved} contact${saved !== 1 ? 's' : ''} saved to CRM`,
      description: failed > 0 ? `${failed} failed` : undefined,
    });
    queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
  };

  // ── Bulk: Add selected discovery rows to a list ──────────────────────────────
  const handleBulkAddToList = async (targetFileId: string) => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (!selectedRows.length) return;
    let saved = 0, failed = 0;
    for (const row of selectedRows) {
      try {
        const person = row.original?.original_data || row.original;
        const contact = person ? await saveDiscoveryToCRM(person, organization_id, user.id) : row.original;
        if (!contact?.id) { failed++; continue; }
        await supabase.from('contact_workspace_files').upsert({ contact_id: contact.id, file_id: targetFileId, added_by: user.id });
        saved++;
      } catch { failed++; }
    }
    toast({ title: `${saved} contact${saved !== 1 ? 's' : ''} added to list`, description: failed > 0 ? `${failed} failed` : undefined });
    table.resetRowSelection();
    queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
    queryClient.invalidateQueries({ queryKey: ['listRecordCounts'] });
    setListModalOpen(false);
  };
      const handleListAdd = async (targetFileId: string) => {
  if (!targetFileId) {
    toast({ variant: 'destructive', title: 'No list selected' });
    return;
  }

  try {
    if (isFromDiscovery && selectedContact?.original_data) {
      const savedContact = await saveDiscoveryToCRM(
        selectedContact.original_data,
        organization_id,
        user.id
      );

      if (!savedContact?.id) throw new Error('No ID returned');

      await saveContactAvailability(savedContact.id, selectedContact.original_data);

      const { error } = await supabase.from('contact_workspace_files').upsert({
        contact_id: savedContact.id,
        file_id: targetFileId,
        added_by: user.id,
      });

      if (error) throw error;

      toast({ title: 'Saved', description: 'Added to list.' });
    } 
    else if (selectedContact?.id) {
      const { error } = await supabase.from('contact_workspace_files').upsert({
        contact_id: selectedContact.id,
        file_id: targetFileId,
        added_by: user.id,
      });

      if (error) throw error;

      toast({ title: 'Added to List' });
    } 
    else {
      throw new Error('No valid contact');
    }

    queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
    queryClient.invalidateQueries({ queryKey: ['listRecordCounts'] });
  } 
  catch (err: any) {
    toast({ variant: 'destructive', title: 'Failed', description: err.message });
  } 
  finally {
    setListModalOpen(false);
    setIsFromDiscovery(false);
    setSelectedContact(null);
  }
};
  // OPTIMISTIC inline edit — no refetch, no spinner
  const handleUpdateData = async (rowIndex: number, columnId: string, value: any) => {
    if (isDiscoveryMode) return;
    const rowItem = tableData[rowIndex];
    if (!rowItem) return;

    queryClient.setQueryData(contactsQueryKey, (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.map((item: any, i: number) => {
          if (i !== rowIndex) return item;
          if (columnId === 'location' && typeof value === 'object') return { ...item, ...value };
          return { ...item, [columnId]: value };
        }),
      };
    });

    try {
      if (columnId === 'location' && typeof value === 'object') {
        await supabase.from('contacts').update(value).eq('id', rowItem.id);
      } else {
        await supabase.from('contacts').update({ [columnId]: value }).eq('id', rowItem.id);
      }
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: contactsQueryKey });
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
    }
  };

  const handleAssetAction = async (rowIndex: number, type: 'email' | 'mobile', action: string, value: string, payload?: any) => {
    if (isDiscoveryMode) return;
    const rowItem = tableData[rowIndex];
    if (!rowItem) return;

    const tableName = type === 'email' ? 'enrichment_contact_emails' : 'enrichment_contact_phones';
    const valCol    = type === 'email' ? 'email'        : 'phone_number';
    const statusCol = type === 'email' ? 'email_status' : 'status';
    const sourceCol = type === 'email' ? 'source'       : 'source_name';
    const mainCol   = type === 'email' ? 'email'        : 'mobile';

    try {
      if (action === 'add') {
        const ins: any = { contact_id: rowItem.id, [valCol]: value, [statusCol]: payload?.status || (type === 'email' ? 'unverified' : 'no_status'), [sourceCol]: 'Manual' };
        if (type === 'mobile') ins.type = payload?.type || 'mobile';
        if (type === 'email')  ins.is_primary = false;
        const { error } = await supabase.from(tableName).insert(ins);
        if (error) throw error;
        if (!rowItem[mainCol]) {
          await supabase.from('contacts').update({ [mainCol]: value }).eq('id', rowItem.id);
          if (type === 'email') await supabase.from(tableName).update({ is_primary: true }).eq('contact_id', rowItem.id).eq(valCol, value);
        }
      } else if (action === 'edit') {
        const upd: any = { [valCol]: payload.value, [statusCol]: payload.status };
        if (type === 'mobile') upd.type = payload.type;
        const { error } = await supabase.from(tableName).update(upd).eq('contact_id', rowItem.id).eq(valCol, value);
        if (error) throw error;
        if (rowItem[mainCol] === value) await supabase.from('contacts').update({ [mainCol]: payload.value }).eq('id', rowItem.id);
      } else if (action === 'set_primary') {
        await supabase.from('contacts').update({ [mainCol]: value }).eq('id', rowItem.id);
        if (type === 'email') {
          await supabase.from(tableName).update({ is_primary: false }).eq('contact_id', rowItem.id);
          await supabase.from(tableName).update({ is_primary: true }).eq('contact_id', rowItem.id).eq(valCol, value);
        }
      } else if (action === 'flag') {
        await supabase.from(tableName).update({ [statusCol]: payload }).eq('contact_id', rowItem.id).eq(valCol, value);
      } else if (action === 'delete') {
        await supabase.from(tableName).delete().eq('contact_id', rowItem.id).eq(valCol, value);
        if (rowItem[mainCol] === value) await supabase.from('contacts').update({ [mainCol]: null }).eq('id', rowItem.id);
      }
      toast({ title: action === 'delete' ? 'Deleted' : 'Updated' });
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  // ── Column filters ────────────────────────────────────────────────────────────
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // ── Table instance ────────────────────────────────────────────────────────────
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      columnFilters,
      columnVisibility,
      columnOrder,
      columnSizing,
      pagination: { pageIndex: currentPage - 1, pageSize: perPage },
    },
    manualPagination: true,
    rowCount: totalRows,
    pageCount: isDiscoveryMode ? Math.ceil(totalEntries / perPage) : undefined,
    onColumnFiltersChange:    setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange:      setColumnOrder,
    onColumnSizingChange:     setColumnSizing,
    columnResizeMode: 'onChange',
    onPaginationChange: updater => {
      const cur = { pageIndex: currentPage - 1, pageSize: perPage };
      const next = typeof updater === 'function' ? updater(cur) : updater;
      if (next.pageSize !== perPage) {
        dispatch(setPerPage(next.pageSize));
        dispatch(setPage(1));
        writeFilters(urlFilters, 1);
      } else if (next.pageIndex !== cur.pageIndex) {
        const newPage = next.pageIndex + 1;
        writeFilters(urlFilters, newPage);
        dispatch(setPage(newPage));
      }
    },
    getCoreRowModel:       getCoreRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
      saveDiscoveryLead: handleSaveDiscovery,  // single row save to CRM (discovery)
      saveToCRM:         handleSaveDiscovery,  // alias for action column button
      enrichContact:     handleEnrich,
      openListModal: (c: any, fromDiscovery = false) => {
        setSelectedContact(c); setIsFromDiscovery(fromDiscovery); setListModalOpen(true);
      },
      updateData:        handleUpdateData,
      handleAssetAction: handleAssetAction,
      isDiscoveryMode,
    },
  });

  // ── Derived ───────────────────────────────────────────────────────────────────
  const isPendingFilter = isFetching && !isLoading;
  const pageTitle = fileId && currentFile ? currentFile.name : isDiscoveryMode ? 'Search People' : 'Contacts';
  const activeFilterCount = countActiveFilters(urlFilters);

  const selectedListName = useMemo(() => {
    if (!selectedListId || !workspaceLists) return null;
    for (const group of workspaceLists as any[]) {
      const f = group.files.find((f: any) => f.id === selectedListId);
      if (f) return `${group.workspace.name} / ${f.name}`;
    }
    return null;
  }, [selectedListId, workspaceLists]);

  const getColLabel = (id: string) => COL_LABELS[id]?.label ?? id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-50/80">

        {/* ════ HEADER ════════════════════════════════════════════════════════ */}
        <header className="bg-white border-b border-slate-200 px-5 flex items-center gap-3 shadow-sm z-30 flex-shrink-0 h-[52px]">

          {/* Sidebar toggle */}
          <button
            onClick={() => setIsSidebarOpen(v => !v)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>

          {/* Back */}
          {fileId && (
            <button onClick={() => navigate('/lists')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors">
              <ArrowLeft size={14} /> Back
            </button>
          )}

          {/* Title */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <h1 className="text-sm font-semibold text-slate-800">{pageTitle}</h1>
            {fileId && currentFile?.workspaces && (
              <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 border-slate-200">
                <FolderOpen size={9} className="mr-1" />{(currentFile.workspaces as any).name}
              </Badge>
            )}
          </div>

          {/* CRM / Search People mode toggle */}
          {!fileId && (
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
              <button
  onClick={() => {
    dispatch(setDiscoveryMode(true));
    setHasSearched(false);
  }}
  className={cn(
    'px-3 py-1 rounded-md text-[11px] font-medium transition-all',
    isDiscoveryMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
  )}
>
  Search People
</button>
             <button
  onClick={() => {
    dispatch(setDiscoveryMode(false));
    dispatch(resetSearch());
    setHasSearched(true);
  }}
  className={cn(
    'px-3 py-1 rounded-md text-[11px] font-medium transition-all',
    !isDiscoveryMode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
  )}
>
  CRM
</button>
            </div>
          )}

          {/* List filter dropdown */}
          {!fileId && !isDiscoveryMode && (
            <div className="flex items-center gap-1.5">
              <Select
                value={selectedListId || '__all__'}
                onValueChange={v => {
                  const next = v === '__all__' ? null : v;
                  setSelectedListId(next);
                  if (next) setHasSearched(true);
                }}
              >
                <SelectTrigger className="h-8 text-xs border-slate-200 bg-slate-50 hover:bg-white w-auto min-w-[130px] max-w-[210px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <List size={12} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate text-slate-600">
                      {selectedListName || 'All Contacts'}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-w-[260px]">
                  <SelectItem value="__all__" className="text-xs">
                    <div className="flex items-center gap-2"><Users size={12} className="text-slate-400" /> All Contacts</div>
                  </SelectItem>
                  {(workspaceLists as any[] || []).map((group: any) => (
                    <SelectGroup key={group.workspace.id}>
                      <SelectLabel className="text-[10px] text-slate-400 uppercase tracking-wider">{group.workspace.name}</SelectLabel>
                      {group.files.map((f: any) => (
                        <SelectItem key={f.id} value={f.id} className="text-xs pl-4">{f.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {selectedListId && (
                <button onClick={() => setSelectedListId(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
              )}
            </div>
          )}

          <div className="flex-1" />

          {/* Active filter badge */}
          {activeFilterCount > 0 && !isDiscoveryMode && (
            <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1">
              <span className="text-[10px] font-semibold text-indigo-600">{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active</span>
              <button
                onClick={() => { clearFilters(); dispatch(setFilters({})); setHasSearched(false); }}
                className="text-indigo-400 hover:text-indigo-600 ml-1"
              >
                <X size={11} />
              </button>
            </div>
          )}

          {/* Record count */}
          {queryEnabled && (
            <span className="text-[11px] text-slate-500 hidden md:block">
              {isPendingFilter ? (
                <span className="flex items-center gap-1.5 text-indigo-500"><Spinner size="xs" /> Filtering…</span>
              ) : (
                <><span className="font-semibold text-slate-700">{totalRows.toLocaleString()}</span> records</>
              )}
            </span>
          )}

          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-slate-400 pointer-events-none" size={13} />
            <Input
              placeholder={isDiscoveryMode ? 'Search global database…' : 'Quick search…'}
              className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 w-48 focus:bg-white"
              value={headerSearch}
              onChange={e => {
                setHeaderSearch(e.target.value);
                if (!isDiscoveryMode) table.getColumn('name')?.setFilterValue(e.target.value);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && isDiscoveryMode) dispatch(setFilters({ q_keywords: headerSearch }));
              }}
            />
          </div>

          {/* Import button */}
          {fileId && !isDiscoveryMode && (
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}
              className="h-8 text-xs border-slate-200 text-slate-600">
              <UploadCloud size={13} className="mr-1.5" /> Import
            </Button>
          )}

          {/* View settings */}
          <Button variant="outline" size="sm" onClick={() => setViewSettingsOpen(true)}
            className="h-8 text-xs border-slate-200 text-slate-600 hidden lg:flex">
            <SlidersHorizontal size={13} className="mr-1.5" /> View
          </Button>
        </header>

        {/* ════ BODY ══════════════════════════════════════════════════════════ */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          {isSidebarOpen && (
            <div className="w-[240px] flex-shrink-0 border-r border-slate-200 bg-white z-20 flex flex-col overflow-y-hidden">
              {isDiscoveryMode ? (
                <DiscoverySidebar
                  onFiltersChange={(chips, count) => {
                    setPendingDiscoveryChips(chips);
                    setPendingDiscoveryCount(count);
                  }}
                />
              ) : (
                <ContactFiltersSidebar
                  table={table}
                  isOpen
                  onClose={() => setIsSidebarOpen(false)}
                  fileId={activeFileId}
                  onSearch={handleSidebarSearch}
                />
              )}
            </div>
          )}

          {/* Table area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* Loading */}
            {isLoading && queryEnabled ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <Spinner size="xl" color="purple.500" />
                <p className="text-xs text-slate-500 font-medium">Loading contacts…</p>
              </div>

            /* Pre-search empty state */
            ) : !queryEnabled ? (
              <SearchEmptyState
                recentSearches={recentSearches}
                onApplySearch={handleApplyRecentSearch}
                onRemoveSearch={handleRemoveRecentSearch}
                isDiscoveryMode={isDiscoveryMode}
                pendingFilterChips={pendingDiscoveryChips}
                pendingFilterCount={pendingDiscoveryCount}
                onRunSearch={isDiscoveryMode ? () => {
                  // Programmatically trigger Run Search in sidebar via Redux
                  // The sidebar's "Run Search" fn reads local state — we dispatch
                  // a signal by temporarily focusing; actual trigger via footer btn
                  document.querySelector<HTMLButtonElement>('[data-run-search]')?.click();
                } : undefined}
              />

            /* Results */
            ) : (
              <>
                {/* ── Discovery bulk action bar ──────────────────────────────── */}
                {isDiscoveryMode && table.getSelectedRowModel().rows.length > 0 && (
                  <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100 z-10">
                    <span className="text-xs font-semibold text-indigo-700 mr-1">
                      {table.getSelectedRowModel().rows.length} selected
                    </span>
                    <button
                      onClick={handleBulkSaveToCRM}
                      disabled={isBulkSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                    >
                      {isBulkSaving
                        ? <Loader2 size={12} className="animate-spin" />
                        : <DatabaseZap size={12} />
                      }
                      Save to CRM
                    </button>
                    <button
                      onClick={() => { setIsFromDiscovery(true); setListModalOpen(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors"
                    >
                      <ListPlus size={12} /> Add to List
                    </button>
                    <button
                      onClick={() => table.resetRowSelection()}
                      className="ml-auto text-indigo-400 hover:text-indigo-600 p-1 rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className={cn(
                  'flex-1 overflow-hidden transition-opacity duration-200',
                  isPendingFilter && 'opacity-60 pointer-events-none'
                )}>
                  {tableData.length === 0 && !isPendingFilter ? (
                    isDiscoveryMode ? (
                      <SearchEmptyState
                        recentSearches={recentSearches}
                        onApplySearch={handleApplyRecentSearch}
                        onRemoveSearch={handleRemoveRecentSearch}
                        isDiscoveryMode={true}
                        pendingFilterChips={pendingDiscoveryChips}
                        pendingFilterCount={pendingDiscoveryCount}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                          <Users className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600 mb-1">No contacts found</p>
                        <p className="text-xs text-slate-400 mb-4">Try adjusting your filters</p>
                        {activeFilterCount > 0 && (
                          <button
                            onClick={() => { clearFilters(); dispatch(setFilters({})); setHasSearched(false); }}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    <div
                      className="flex-1 overflow-hidden bg-white rounded-tl-xl border border-slate-200 border-b-0 shadow-sm"
                      style={{ height: 'calc(100% - 0px)' }}
                    >
                      <DataTable table={table} />
                    </div>
                  )}
                </div>

                {tableData.length > 0 && (
                  <div className="flex-shrink-0 bg-white border border-slate-200 rounded-bl-xl px-5 py-2.5 shadow-sm">
                    <DataTablePagination table={table} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ════ MODALS ════════════════════════════════════════════════════════ */}

        {selectedContact && (
          <AddToListModal
            open={listModalOpen}
            onOpenChange={open => { setListModalOpen(open); if (!open) { setIsFromDiscovery(false); setSelectedContact(null); } }}
            personName={
              table.getSelectedRowModel().rows.length > 1
                ? `${table.getSelectedRowModel().rows.length} people`
                : (selectedContact?.name || '')
            }
            onConfirm={isDiscoveryMode && table.getSelectedRowModel().rows.length > 1
              ? handleBulkAddToList
              : handleListAdd
            }
            isFromDiscovery={isFromDiscovery}
          />
        )}
        {/* Open list modal for bulk without a specific contact */}
        {!selectedContact && listModalOpen && isDiscoveryMode && (
          <AddToListModal
            open={listModalOpen}
            onOpenChange={open => { setListModalOpen(open); if (!open) setIsFromDiscovery(false); }}
            personName={`${table.getSelectedRowModel().rows.length} people`}
            onConfirm={handleBulkAddToList}
            isFromDiscovery={true}
          />
        )}

        <ContactImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} fileId={activeFileId} />

        {/* ════ VIEW SETTINGS DIALOG ════════════════════════════════════════ */}
        <Dialog open={viewSettingsOpen} onOpenChange={setViewSettingsOpen}>
          <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-slate-800 to-slate-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <SlidersHorizontal className="h-4.5 w-4.5 text-white" size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Table View Settings</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Choose which columns to show and in what order</p>
                </div>
                <button onClick={() => setViewSettingsOpen(false)} className="ml-auto text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden min-h-0">

              {/* Left: Column Toggles grouped */}
              <div className="flex-1 border-r border-slate-100 flex flex-col min-w-0">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Columns</span>
                  <button
                    onClick={() => {
                      // Toggle all hideable columns on
                      const vis: VisibilityState = { ...columnVisibility };
                      table.getAllColumns().filter(c => c.getCanHide()).forEach(c => { vis[c.id] = true; });
                      setColumnVisibility(vis);
                    }}
                    className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold"
                  >
                    Show all
                  </button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-4">
                    {(['Core', 'People', 'CRM'] as const).map(group => {
                      const groupCols = DEFAULT_ORDER
                        .map(id => table.getColumn(id))
                        .filter((col): col is NonNullable<typeof col> =>
                          !!col && col.getCanHide() && COL_LABELS[col.id]?.group === group
                        );
                      if (!groupCols.length) return null;
                      return (
                        <div key={group}>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 px-1">{group}</p>
                          <div className="space-y-0.5">
                            {groupCols.map(col => {
                              const meta = COL_LABELS[col.id];
                              const isOn = col.getIsVisible();
                              return (
                                <button
                                  key={col.id}
                                  onClick={() => col.toggleVisibility(!isOn)}
                                  className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                                    isOn
                                      ? 'bg-indigo-50 border border-indigo-100'
                                      : 'hover:bg-slate-50 border border-transparent',
                                  )}
                                >
                                  {/* Check indicator */}
                                  <span className={cn(
                                    'flex-shrink-0 h-4 w-4 rounded flex items-center justify-center transition-colors',
                                    isOn ? 'bg-indigo-600' : 'bg-slate-200',
                                  )}>
                                    {isOn && <Check size={10} className="text-white" strokeWidth={3} />}
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span className={cn('block text-xs font-semibold leading-tight', isOn ? 'text-indigo-900' : 'text-slate-700')}>
                                      {meta?.label ?? col.id}
                                    </span>
                                    {meta?.desc && (
                                      <span className="block text-[10px] text-slate-400 mt-0.5 truncate">{meta.desc}</span>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Column Order (visible only) */}
              <div className="w-[180px] flex-shrink-0 flex flex-col">
                <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Order</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {columnOrder
                      .filter(id => { const c = table.getColumn(id); return c?.getIsVisible() && c.getCanHide(); })
                      .map((colId, idx, arr) => {
                        const label = COL_LABELS[colId]?.label ?? colId;
                        const isFirst = idx === 0;
                        const isLast  = idx === arr.length - 1;
                        return (
                          <div key={colId} className="flex items-center gap-1.5 group px-2 py-2 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-400 w-4 text-right flex-shrink-0">{idx + 1}</span>
                            <span className="text-[11px] font-medium text-slate-700 flex-1 min-w-0 truncate">{label}</span>
                            <div className="flex flex-col gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                disabled={isFirst}
                                onClick={() => {
                                  const o = [...columnOrder];
                                  const ci = o.indexOf(colId);
                                  if (ci > 0) { [o[ci - 1], o[ci]] = [o[ci], o[ci - 1]]; setColumnOrder(o); }
                                }}
                                className="h-4 w-4 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[10px] font-bold"
                              >↑</button>
                              <button
                                disabled={isLast}
                                onClick={() => {
                                  const o = [...columnOrder];
                                  const ci = o.indexOf(colId);
                                  if (ci < o.length - 1) { [o[ci], o[ci + 1]] = [o[ci + 1], o[ci]]; setColumnOrder(o); }
                                }}
                                className="h-4 w-4 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[10px] font-bold"
                              >↓</button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
              <Button
                variant="ghost" size="sm"
                onClick={() => { setColumnVisibility(DEFAULT_VISIBILITY); setColumnOrder(DEFAULT_ORDER); setColumnSizing({}); }}
                className="text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs h-8 gap-1.5"
              >
                <RotateCcw className="h-3 w-3" /> Reset to default
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs h-8 border-slate-200 rounded-lg" onClick={() => setViewSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm gap-1.5"
                  onClick={() => {
                    savePreferencesMutation.mutate({ columnVisibility, columnOrder, columnSizing });
                    setViewSettingsOpen(false);
                  }}
                >
                  <Check className="h-3 w-3" /> Save View
                </Button>
              </div>
            </div>

          </DialogContent>
        </Dialog>

      </div>
    </DndProvider>
  );
}