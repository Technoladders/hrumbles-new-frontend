// src/hooks/sales/useKanbanContacts.ts
// Self-contained — reads same Redux filters as useSimpleContacts.
// Does NOT modify any existing hook or query key.

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { useContactStages } from '@/hooks/sales/useContactStages';
import { useToast } from '@/hooks/use-toast';

// ── Public types ─────────────────────────────────────────────────────────────

export type KanbanBoardType = 'stage' | 'list';

export interface KanbanContact {
  id: string;
  name: string;
  job_title?: string | null;
  email?: string | null;
  mobile?: string | null;
  photo_url?: string | null;
  linkedin_url?: string | null;
  apollo_person_id?: string | null;
  medium?: string | null;
  created_at?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  email_status?: string | null;
  contact_stage?: string | null;
  company_name?: string | null;
  company_logo?: string | null;
  created_by_employee?: {
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  } | null;
  all_emails?: any[];
  all_phones?: any[];
  email_avail?: 'yes' | 'maybe' | 'no';
  phone_avail?: 'yes' | 'maybe' | 'no';
  is_discovery?: boolean;
}

export interface KanbanColumnData {
  key: string;      // stage name OR workspace_file id
  label: string;    // display name
  color?: string;
  total: number;
  contacts: KanbanContact[];
  hasMore: boolean;
}

interface UseKanbanContactsOptions {
  fileId?: string | null;
  boardType?: KanbanBoardType;
  enabled?: boolean;
}

const PER_COLUMN = 20;

// Helper — return array or null (RPC expects null when no filter)
const arr = (a?: any[]) => (a && a.length > 0 ? a : null);

// ════════════════════════════════════════════════════════════════════════════
// STAGE BOARD
// ════════════════════════════════════════════════════════════════════════════

function useStageKanban(
  orgId: string,
  fileId: string | null | undefined,
  filters: any,
  enabled: boolean,
) {
  const { data: stages = [] } = useContactStages();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Extra contacts fetched by "Load more"
  const [extraContacts, setExtraContacts] = useState<Record<string, KanbanContact[]>>({});
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});

  // Stable query key — same shape as contacts-unified so invalidations propagate
  const qKey = ['kanban-stage', { orgId, fileId, filters }] as const;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: qKey,
    enabled: !!orgId && enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: rpcData, error } = await supabase.rpc('get_contacts_kanban', {
        p_org_id:               orgId,
        p_file_id:              fileId ?? null,
        p_search:               filters?.search        || null,
        p_sources:              arr(filters?.sources),
        p_countries:            arr(filters?.countries),
        p_states:               arr(filters?.states),
        p_cities:               arr(filters?.cities),
        p_job_titles:           arr(filters?.jobTitles),
        p_exclude_job_titles:   arr(filters?.excludeJobTitles),
        p_seniorities:          arr(filters?.seniorities ?? filters?.managementLevels),
        p_departments:          arr(filters?.departments),
        p_industries:           arr(filters?.industries),
        p_company_ids:          arr(filters?.companyIds),
        p_exclude_company_ids:  arr(filters?.excludeCompanyIds),
        p_has_email:            filters?.hasEmail   ?? false,
        p_has_phone:            filters?.hasPhone   ?? false,
        p_is_enriched:          filters?.isEnriched ?? false,
        p_per_column:           PER_COLUMN,
      });
      if (error) throw error;
      return rpcData as {
        columns: { stage: string; total: number; contacts: KanbanContact[] }[];
      };
    },
  });

  // Map RPC data onto ordered stage list
  const rpcMap = new Map((data?.columns ?? []).map(c => [c.stage, c]));

  const orderedColumns: KanbanColumnData[] = [
    // Defined stages in CRM order
    ...stages.map(s => {
      const rpc = rpcMap.get(s.name);
      const extra = extraContacts[s.name] ?? [];
      return {
        key:     s.name,
        label:   s.name,
        color:   s.color,
        total:   rpc?.total ?? 0,
        contacts: [...(rpc?.contacts ?? []), ...extra],
        hasMore:  (rpc?.total ?? 0) > PER_COLUMN + extra.length,
      };
    }),
    // Unassigned (contacts with null / empty stage)
    (() => {
      const rpc = rpcMap.get('Unassigned');
      const extra = extraContacts['Unassigned'] ?? [];
      return {
        key:     'Unassigned',
        label:   'Unassigned',
        color:   '#94a3b8',
        total:   rpc?.total ?? 0,
        contacts: [...(rpc?.contacts ?? []), ...extra],
        hasMore:  (rpc?.total ?? 0) > PER_COLUMN + extra.length,
      };
    })(),
  ].filter(col =>
    // Always show defined stages; only show Unassigned when it has contacts
    col.key === 'Unassigned' ? col.total > 0 : true,
  );

  // ── Load more within a column ────────────────────────────────────────────
  const loadMore = useCallback(async (stageKey: string) => {
    setLoadingMore(prev => ({ ...prev, [stageKey]: true }));
    try {
      const loaded =
        (rpcMap.get(stageKey)?.contacts.length ?? 0) +
        (extraContacts[stageKey]?.length ?? 0);
      const page = Math.floor(loaded / PER_COLUMN) + 1;
      const stageFilter = stageKey === 'Unassigned' ? null : stageKey;

      const { data: rpcPage, error } = await supabase.rpc('get_contacts_paginated', {
        p_org_id:     orgId,
        p_file_id:    fileId ?? null,
        p_stages:     stageFilter ? [stageFilter] : null,
        p_search:     filters?.search || null,
        p_sources:    arr(filters?.sources),
        p_countries:  arr(filters?.countries),
        p_states:     arr(filters?.states),
        p_cities:     arr(filters?.cities),
        p_job_titles: arr(filters?.jobTitles),
        p_seniorities: arr(filters?.seniorities),
        p_departments: arr(filters?.departments),
        p_industries:  arr(filters?.industries),
        p_company_ids: arr(filters?.companyIds),
        p_has_email:   filters?.hasEmail   ?? false,
        p_has_phone:   filters?.hasPhone   ?? false,
        p_is_enriched: filters?.isEnriched ?? false,
        p_page:        page + 1,
        p_per_page:    PER_COLUMN,
      });
      if (error) throw error;

      const fresh: KanbanContact[] = (rpcPage?.data ?? []).map((r: any) => ({
        ...r,
        is_discovery: false,
        email_avail: r.email ? 'yes' : 'no',
        phone_avail: r.mobile ? 'yes' : 'no',
        all_emails: Array.isArray(r.all_emails) ? r.all_emails : [],
        all_phones: Array.isArray(r.all_phones) ? r.all_phones : [],
      }));

      setExtraContacts(prev => ({
        ...prev,
        [stageKey]: [...(prev[stageKey] ?? []), ...fresh],
      }));
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Load more failed', description: err.message });
    } finally {
      setLoadingMore(prev => ({ ...prev, [stageKey]: false }));
    }
  }, [orgId, fileId, filters, rpcMap, extraContacts, toast]);

  // ── Optimistic stage move ────────────────────────────────────────────────
  const moveCard = useCallback(async (
    contactId: string,
    fromStage: string,
    toStage: string,
    contact: KanbanContact,
  ) => {
    if (fromStage === toStage) return;

    // Optimistic update — rewrite cache immediately.
    // KEY FIX: target stage may not exist in old.columns if it had 0 contacts
    // (RPC omits empty stages). We must add it if missing.
    queryClient.setQueryData(qKey, (old: any) => {
      if (!old?.columns) return old;

      let foundTarget = false;
      const updatedColumns = old.columns.map((col: any) => {
        if (col.stage === fromStage) {
          return {
            ...col,
            total: Math.max(0, col.total - 1),
            contacts: col.contacts.filter((c: any) => c.id !== contactId),
          };
        }
        if (col.stage === toStage) {
          foundTarget = true;
          return {
            ...col,
            total: col.total + 1,
            contacts: [{ ...contact, contact_stage: toStage }, ...col.contacts],
          };
        }
        return col;
      });

      // Target stage was empty (not in RPC result) — append it
      if (!foundTarget) {
        updatedColumns.push({
          stage:    toStage,
          total:    1,
          contacts: [{ ...contact, contact_stage: toStage }],
        });
      }

      return { columns: updatedColumns };
    });

    // Persist to DB
    const newStage = toStage === 'Unassigned' ? null : toStage;
    const { error } = await supabase
      .from('contacts')
      .update({ contact_stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', contactId);

    if (error) {
      // Revert
      queryClient.invalidateQueries({ queryKey: ['kanban-stage'] });
      toast({ variant: 'destructive', title: 'Move failed', description: error.message });
    } else {
      // Sync the table view cache
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
    }
  }, [qKey, queryClient, toast]);

  return {
    columns: orderedColumns,
    isLoading,
    isFetching,
    refetch,
    loadMore,
    loadingMore,
    moveCard,
    moveToList: async () => {},   // no-op in stage mode
  };
}

// ════════════════════════════════════════════════════════════════════════════
// LIST BOARD
// ════════════════════════════════════════════════════════════════════════════

function useListKanban(orgId: string, filters: any, enabled: boolean) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [extraContacts, setExtraContacts] = useState<Record<string, KanbanContact[]>>({});
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});

  // Fetch workspace files (lists)
  const { data: workspaceFiles = [], isLoading: loadingFiles } = useQuery({
    queryKey: ['kanban-workspace-files', orgId],
    enabled: !!orgId && enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_files')
        .select('id, name, workspaces(name)')
        .eq('organization_id', orgId)
        .order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; workspaces: any }[];
    },
  });

  const listQKey = [
    'kanban-list-contacts',
    { orgId, fileIds: workspaceFiles.map(f => f.id) },
  ] as const;

  // Fetch first N contacts per list (in parallel, up to 10 lists)
  const { data: listMap = {}, isLoading: loadingContacts, isFetching } = useQuery({
    queryKey: listQKey,
    enabled: !!orgId && enabled && workspaceFiles.length > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const results: Record<string, { total: number; contacts: KanbanContact[] }> = {};

      await Promise.all(
        workspaceFiles.slice(0, 10).map(async file => {
          // Uses the !inner join pattern (same as CompanyIntelligenceSearchPage)
          const { data, count, error } = await supabase
            .from('contacts')
            .select(
              `id, name, job_title, email, mobile, photo_url,
               linkedin_url, apollo_person_id, medium, created_at,
               city, state, country, contact_stage,
               companies(name, logo_url),
               contact_workspace_files!inner(file_id)`,
              { count: 'exact' },
            )
            .eq('organization_id', orgId)
            .eq('contact_workspace_files.file_id', file.id)
            .order('created_at', { ascending: false })
            .range(0, PER_COLUMN - 1);

          if (!error && data) {
            results[file.id] = {
              total: count ?? data.length,
              contacts: data.map((c: any) => ({
                id:             c.id,
                name:           c.name || 'Unknown',
                job_title:      c.job_title,
                email:          c.email,
                mobile:         c.mobile,
                photo_url:      c.photo_url,
                linkedin_url:   c.linkedin_url,
                apollo_person_id: c.apollo_person_id,
                medium:         c.medium,
                created_at:     c.created_at,
                city:           c.city,
                state:          c.state,
                country:        c.country,
                email_status:   c.email_status,
                contact_stage:  c.contact_stage,
                company_name:   c.companies?.name   ?? null,
                company_logo:   c.companies?.logo_url ?? null,
                all_emails:     [],
                all_phones:     [],
                email_avail:    c.email  ? 'yes' : 'no',
                phone_avail:    c.mobile ? 'yes' : 'no',
                is_discovery:   false,
              })),
            };
          }
        }),
      );

      return results;
    },
  });

  const columns: KanbanColumnData[] = workspaceFiles.slice(0, 10).map(file => {
    const entry = listMap[file.id] ?? { total: 0, contacts: [] };
    const extra = extraContacts[file.id] ?? [];
    return {
      key:      file.id,
      label:    file.name,
      total:    entry.total,
      contacts: [...entry.contacts, ...extra],
      hasMore:  entry.total > PER_COLUMN + extra.length,
    };
  });

  // ── Load more ────────────────────────────────────────────────────────────
  const loadMore = useCallback(async (fileId: string) => {
    setLoadingMore(prev => ({ ...prev, [fileId]: true }));
    try {
      const loaded =
        (listMap[fileId]?.contacts.length ?? 0) +
        (extraContacts[fileId]?.length ?? 0);

      const { data, error } = await supabase
        .from('contacts')
        .select(
          `id, name, job_title, email, mobile, photo_url,
           contact_stage, companies(name, logo_url),
           contact_workspace_files!inner(file_id)`,
        )
        .eq('organization_id', orgId)
        .eq('contact_workspace_files.file_id', fileId)
        .order('created_at', { ascending: false })
        .range(loaded, loaded + PER_COLUMN - 1);

      if (error) throw error;

      const fresh: KanbanContact[] = (data ?? []).map((c: any) => ({
        id: c.id, name: c.name || 'Unknown', job_title: c.job_title,
        email: c.email, mobile: c.mobile, photo_url: c.photo_url,
        contact_stage: c.contact_stage,
        company_name: c.companies?.name, company_logo: c.companies?.logo_url,
        all_emails: [], all_phones: [],
        email_avail: c.email  ? 'yes' : 'no',
        phone_avail: c.mobile ? 'yes' : 'no',
        is_discovery: false,
      }));

      setExtraContacts(prev => ({
        ...prev,
        [fileId]: [...(prev[fileId] ?? []), ...fresh],
      }));
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Load more failed', description: err.message });
    } finally {
      setLoadingMore(prev => ({ ...prev, [fileId]: false }));
    }
  }, [orgId, listMap, extraContacts, toast]);

  // ── Move contact from one list to another (optimistic) ───────────────────
  const moveToList = useCallback(async (
    contactId: string,
    fromFileId: string,
    toFileId: string,
    contact: KanbanContact,
  ) => {
    if (fromFileId === toFileId) return;

    // Optimistic update
    queryClient.setQueryData(listQKey, (old: any) => {
      if (!old) return old;
      const updated = { ...old };
      if (updated[fromFileId]) {
        updated[fromFileId] = {
          ...updated[fromFileId],
          total: updated[fromFileId].total - 1,
          contacts: updated[fromFileId].contacts.filter((c: any) => c.id !== contactId),
        };
      }
      if (updated[toFileId]) {
        updated[toFileId] = {
          ...updated[toFileId],
          total: updated[toFileId].total + 1,
          contacts: [contact, ...updated[toFileId].contacts],
        };
      }
      return updated;
    });

    try {
      // Remove from source list
      const { error: rmErr } = await supabase
        .from('contact_workspace_files')
        .delete()
        .eq('contact_id', contactId)
        .eq('file_id', fromFileId);
      if (rmErr) throw rmErr;

      // Add to destination list (upsert handles duplicates gracefully)
      const { data: { user } } = await supabase.auth.getUser();
      const { error: addErr } = await supabase
        .from('contact_workspace_files')
        .upsert(
          { contact_id: contactId, file_id: toFileId, added_by: user?.id },
          { onConflict: 'contact_id,file_id' },
        );
      if (addErr) throw addErr;

      // Sync table view
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
      queryClient.invalidateQueries({ queryKey: ['listRecordCounts'] });
    } catch (err: any) {
      // Revert cache on error
      queryClient.invalidateQueries({ queryKey: ['kanban-list-contacts'] });
      toast({ variant: 'destructive', title: 'Move failed', description: err.message });
    }
  }, [listQKey, queryClient, toast]);

  return {
    columns,
    isLoading: loadingFiles || loadingContacts,
    isFetching,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['kanban-list-contacts'] }),
    loadMore,
    loadingMore,
    moveCard:   async () => {},  // no-op in list mode
    moveToList,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC HOOK — combined entry point
// ════════════════════════════════════════════════════════════════════════════

export function useKanbanContacts({
  fileId,
  boardType = 'stage',
  enabled = true,
}: UseKanbanContactsOptions) {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const filters = useSelector((state: any) => state.intelligenceSearch.filters);

  const stage = useStageKanban(
    organization_id,
    fileId,
    filters,
    enabled && boardType === 'stage',
  );

  const list = useListKanban(
    organization_id,
    filters,
    enabled && boardType === 'list',
  );

  return boardType === 'list' ? list : stage;
}