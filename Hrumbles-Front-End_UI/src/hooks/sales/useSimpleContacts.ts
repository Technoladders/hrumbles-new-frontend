// src/hooks/sales/useSimpleContacts.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector, useDispatch } from 'react-redux';
import { setSearchResults, setTotalEntries } from '@/Redux/intelligenceSearchSlice';

interface UseSimpleContactsOptions {
  fileId?: string | null;
  fetchUnfiled?: boolean;
  enabled?: boolean;
}

export const useSimpleContacts = (options: UseSimpleContactsOptions = {}) => {
  const dispatch        = useDispatch();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const { isDiscoveryMode, filters, currentPage, perPage } = useSelector(
    (state: any) => state.intelligenceSearch
  );
  const { fileId, enabled = true } = options;

  return useQuery({
    queryKey: ['contacts-unified', {
      isDiscoveryMode, filters, currentPage, perPage, fileId, organization_id,
    }],
    placeholderData: keepPreviousData,
    enabled: !!organization_id && enabled,

    queryFn: async () => {

      // ═══════════════════════════════════════════════════
      // MODE 1 — DISCOVERY (Apollo edge function)
      // ═══════════════════════════════════════════════════
      if (isDiscoveryMode) {
        const hasFilters = filters && (
          filters.q_keywords ||
          filters.person_titles?.length > 0 ||
          filters.person_locations?.length > 0 ||
          filters.person_seniorities?.length > 0 ||
          filters.organization_locations?.length > 0 ||
          filters.organization_num_employees_ranges?.length > 0 ||
          filters.contact_email_status?.length > 0 ||
          filters.currently_using_any_of_technology_uids?.length > 0 ||
          filters.q_organization_job_titles?.length > 0 ||
          filters.organization_job_locations?.length > 0
        );

        if (!hasFilters) {
          dispatch(setSearchResults({ people: [], total_entries: 0 }));
          dispatch(setTotalEntries(0));
          return { data: [], count: 0 };
        }

        const { data, error } = await supabase.functions.invoke(
          'apollo-people-search-v1',
          { body: { filters, page: currentPage, per_page: perPage } }
        );
        if (error) throw error;

        dispatch(setSearchResults(data));
        dispatch(setTotalEntries(data.total_entries || 0));

        if (currentPage === 1 && data.total_entries > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            supabase.from('background_sync_jobs').insert({
              organization_id, created_by: user.id,
              filters, total_entries: data.total_entries, status: 'pending',
            }).then(({ error: e }) => { if (e) console.error('Background sync failed:', e); });
          }
        }

        const mappedData = (data.people || []).map((p: any) => ({
          id:            `temp-${p.id}`,
          apollo_person_id: p.id,
          name:          [p.first_name, p.last_name_obfuscated].filter(Boolean).join(' ') || p.name || 'Unknown',
          job_title:     p.title,
          company_name:  p.organization?.name,
          company_logo:  p.organization?.logo_url,
          email:         null,
          mobile:        null,
          photo_url:     p.photo_url,
          contact_stage: 'Discovery',
          is_discovery:  true,
          apollo_id:     p.id,
          original_data: p,
          has_email:     p.has_email,
          has_phone:     p.has_direct_phone === 'Yes' || p.has_direct_phone === true,
          // availability for DataAvailabilityCell
          email_avail:   p.has_email ? 'yes' : 'no',
          phone_avail:   (p.has_direct_phone === 'Yes' || p.has_direct_phone === true) ? 'yes'
                         : (typeof p.has_direct_phone === 'string' && p.has_direct_phone.toLowerCase().includes('maybe')) ? 'maybe'
                         : 'no',
          city:          p.city,
          state:         p.state,
          country:       p.country,
          all_emails:    [],
          all_phones:    [],
        }));

        return { data: mappedData, count: data.total_entries || 0 };
      }

      // ═══════════════════════════════════════════════════
      // MODE 2 — CRM via RPC
      // Maps ALL redux filter fields to RPC params.
      // ═══════════════════════════════════════════════════

      // Helper: return array or null (RPC expects null when no filter)
      const arr = (a?: any[]) => (a && a.length > 0 ? a : null);

      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'get_contacts_paginated',
        {
          p_org_id:       organization_id,
          p_file_id:      fileId ?? null,
          // Text search
          p_search:       filters?.search || null,
          // Basic array filters
          p_stages:               arr(filters?.stages),
          p_sources:              arr(filters?.sources),
          p_countries:            arr(filters?.countries),
          p_states:               arr(filters?.states),
          p_cities:               arr(filters?.cities),
          p_company_ids:          arr(filters?.companyIds),
          p_exclude_company_ids:  arr(filters?.excludeCompanyIds),
          // Enrichment-aware filters
          p_job_titles:           arr(filters?.jobTitles),
          p_exclude_job_titles:   arr(filters?.excludeJobTitles),
          p_seniorities:          arr(filters?.seniorities ?? filters?.managementLevels),
          p_departments:          arr(filters?.departments),
          p_industries:           arr(filters?.industries),
          // Quick-filter booleans
          p_has_email:    filters?.hasEmail   ?? false,
          p_has_phone:    filters?.hasPhone   ?? false,
          p_is_enriched:  filters?.isEnriched ?? false,
          // Pagination
          p_page:         currentPage,
          p_per_page:     perPage,
        }
      );

      if (rpcError) throw rpcError;

      const rawRows: any[] = rpcResult?.data  ?? [];
      const total:   number = rpcResult?.total ?? 0;

      dispatch(setTotalEntries(total));

      const mapped = rawRows.map((row: any) => {
        // Derive 3-state availability from search cache (raw_data fields)
        // masked_has_phone values: true/'Yes' = yes, 'Maybe: ...' = maybe, false/'No' = no
        const hasEmailCertain = !!(row.email || (Array.isArray(row.all_emails) && row.all_emails.length > 0));
        const hasPhoneCertain = !!(row.mobile || (Array.isArray(row.all_phones) && row.all_phones.length > 0));
        const cacheEmail = row.masked_has_email === true || row.masked_has_email === 'true';
        const cachePhoneStr = typeof row.masked_has_phone === 'string' ? row.masked_has_phone.toLowerCase() : '';
        const cachePhoneYes = row.masked_has_phone === true || cachePhoneStr.includes('yes');
        const cachePhoneMaybe = cachePhoneStr.includes('maybe');

        return {
          ...row,
          is_discovery: false,
          all_emails: Array.isArray(row.all_emails) ? row.all_emails : [],
          all_phones: Array.isArray(row.all_phones) ? row.all_phones : [],
          created_by_employee: row.created_by_employee ?? null,
          // 3-state availability: 'yes' | 'maybe' | 'no'
          email_avail: hasEmailCertain ? 'yes' : (cacheEmail ? 'yes' : 'no'),
          phone_avail: hasPhoneCertain ? 'yes' : (cachePhoneYes ? 'yes' : cachePhoneMaybe ? 'maybe' : 'no'),
        };
      });

      return { data: mapped, count: total };
    },
  });
};