// src/hooks/sales/useFilterStatistics.ts
// Accurate stats via DB aggregation RPC — no 50k row limit.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';

export interface FilterStatistics {
  total:        number;
  hasEmail:     number;
  hasPhone:     number;
  enriched:     number;
  stages:       Record<string, number>;
  sources:      Record<string, number>;
  seniorities:  Record<string, number>;   // still populated locally if enrichment data present
  industries:   Record<string, number>;
  departments:  Record<string, number>;
  employeeRanges: Record<string, number>;
  countries:    Record<string, number>;
  cities:       Record<string, number>;
}

interface UseFilterStatisticsOptions {
  fileId?: string | null;
}

export const useFilterStatistics = (options: UseFilterStatisticsOptions = {}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const { fileId } = options;

  return useQuery({
    queryKey: ['filter-statistics', organization_id, fileId],
    queryFn: async (): Promise<FilterStatistics> => {

      // ── Core stats via RPC (no row limit) ─────────────────────────────────
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_contact_filter_statistics',
        {
          p_org_id:  organization_id,
          p_file_id: fileId ?? null,
        }
      );
      if (rpcError) throw rpcError;

      const base: FilterStatistics = {
        total:          rpcData?.total    ?? 0,
        hasEmail:       rpcData?.hasEmail ?? 0,
        hasPhone:       rpcData?.hasPhone ?? 0,
        enriched:       rpcData?.enriched ?? 0,
        stages:         rpcData?.stages   ?? {},
        sources:        rpcData?.sources  ?? {},
        countries:      rpcData?.countries ?? {},
        cities:         rpcData?.cities   ?? {},
        // Enrichment-derived — filled below (best-effort, limited set)
        seniorities:    {},
        industries:     {},
        departments:    {},
        employeeRanges: {},
      };

      // ── Enrichment-derived stats (seniority, industry, departments) ────────
      // These join enrichment_people → enrichment_person_metadata/organizations.
      // We query up to 5 k enriched contacts — acceptable for sidebar stats.
      try {
        let enrichQuery;
        if (fileId) {
          enrichQuery = supabase
            .from('contact_workspace_files')
            .select(`
              contacts!inner (
                id,
                enrichment_people!contact_id (
                  apollo_person_id,
                  apollo_org_id,
                  enrichment_person_metadata ( seniority, departments ),
                  enrichment_organizations!apollo_org_id ( industry, estimated_num_employees )
                )
              )
            `)
            .eq('file_id', fileId)
            .limit(5000);
        } else {
          enrichQuery = supabase
            .from('enrichment_people')
            .select(`
              apollo_person_id,
              apollo_org_id,
              enrichment_person_metadata ( seniority, departments ),
              enrichment_organizations!apollo_org_id ( industry, estimated_num_employees )
            `)
            .limit(5000);
        }

        const { data: enrichData } = await enrichQuery;
        const records = fileId
          ? (enrichData || []).flatMap((row: any) =>
              (Array.isArray(row.contacts) ? row.contacts : [row.contacts])
                .filter(Boolean)
                .flatMap((c: any) => c.enrichment_people || [])
            )
          : (enrichData || []);

        records.forEach((ep: any) => {
          const meta = Array.isArray(ep.enrichment_person_metadata)
            ? ep.enrichment_person_metadata[0]
            : ep.enrichment_person_metadata;
          const org  = Array.isArray(ep.enrichment_organizations)
            ? ep.enrichment_organizations[0]
            : ep.enrichment_organizations;

          // Seniority
          if (meta?.seniority) {
            const k = meta.seniority.toLowerCase();
            base.seniorities[k] = (base.seniorities[k] || 0) + 1;
          }

          // Departments (array)
          if (Array.isArray(meta?.departments)) {
            meta.departments.forEach((d: string) => {
              base.departments[d] = (base.departments[d] || 0) + 1;
            });
          }

          // Industry
          if (org?.industry) {
            base.industries[org.industry] = (base.industries[org.industry] || 0) + 1;
          }

          // Employee count → range
          const emp = org?.estimated_num_employees;
          if (emp) {
            let range =
              emp <= 10    ? '1-10'      :
              emp <= 50    ? '11-50'     :
              emp <= 200   ? '51-200'    :
              emp <= 500   ? '201-500'   :
              emp <= 1000  ? '501-1000'  :
              emp <= 5000  ? '1001-5000' :
              emp <= 10000 ? '5001-10000': '10001+';
            base.employeeRanges[range] = (base.employeeRanges[range] || 0) + 1;
          }
        });
      } catch (enrichErr) {
        // Non-fatal — sidebar still shows core stats
        console.warn('Enrichment stats fetch partial:', enrichErr);
      }

      return base;
    },
    enabled: !!organization_id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
};