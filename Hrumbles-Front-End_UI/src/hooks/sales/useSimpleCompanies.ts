// src/hooks/sales/useSimpleCompanies.ts
// Mirrors useSimpleContacts.ts — calls get_companies_paginated RPC.
// placeholderData keeps previous rows visible during filter refetch (no blank flash).

import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { CompanyFilters } from './useCompanyFilterParams';

// null-safe array helper — same as useSimpleContacts
const arr = (v?: string[] | null) => (v?.length ? v : null);

interface UseSimpleCompaniesOptions {
  fileId?:   string | null;
  filters?:  CompanyFilters;
  page?:     number;
  perPage?:  number;
  enabled?:  boolean;
}

export function useSimpleCompanies({
  fileId  = null,
  filters,
  page    = 1,
  perPage = 25,
  enabled = true,
}: UseSimpleCompaniesOptions = {}) {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery({
    queryKey: ['companies-paginated', {
      organization_id, fileId, filters, page, perPage,
    }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_companies_paginated', {
        p_org_id:          organization_id,
        p_file_id:         fileId ?? null,
        p_search:          filters?.search?.trim() || null,
        p_industries:      arr(filters?.industries),
        p_stages:          arr(filters?.stages),
        p_countries:       arr(filters?.countries),
        p_states:          arr(filters?.states),
        p_cities:          arr(filters?.cities),
        p_employee_ranges: arr(filters?.employeeRanges),
        p_has_apollo:      filters?.hasApollo ?? false,
        p_is_active:       filters?.isActive  ?? false,
        p_founded_min:     filters?.foundedMin || null,
        p_founded_max:     filters?.foundedMax || null,
        p_page:            page,
        p_per_page:        perPage,
      });
      if (error) throw error;
      const result = data as { data: any[]; total: number };
      return {
        data:  result.data  ?? [],
        count: result.total ?? 0,
      };
    },
    enabled: !!organization_id && enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    // ← Keeps previous rows visible while new filter query loads — no blank flash
    // (same as placeholderData: (prev) => prev in useSimpleContacts)
    placeholderData: (prev: any) => prev,
  });
}