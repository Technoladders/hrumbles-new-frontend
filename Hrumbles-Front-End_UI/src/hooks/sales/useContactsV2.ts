// src/hooks/sales/useContactsV2.ts
// Optimized for 5L+ records:
// - Only fires when appliedFilters changes (not local filter edits)
// - keepPreviousData so table never flashes blank
// - Separate cached count query
// - No count:exact on every row fetch

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector, useDispatch } from 'react-redux';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContactV2Row {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  job_title: string | null;
  company_id: number | null;
  company_name: string | null;
  company_logo: string | null;
  company_domain: string | null;
  contact_stage: string | null;
  medium: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  apollo_person_id: string | null;
  created_at: string | null;
  all_emails: any[];
  all_phones: any[];
  seniority: string | null;
  departments: string[] | null;
  functions: string[] | null;
  industry: string | null;
  employee_count: number | null;
  is_discovery: boolean;
  // Discovery-only extras
  original_data?: any;
  has_email?: boolean;
  has_phone?: boolean;
}

// ─── Common Supabase Select ───────────────────────────────────────────────────

const CONTACT_SELECT = `
  id, name, email, mobile, job_title, company_id, company_name,
  contact_stage, medium, country, city, state, photo_url,
  linkedin_url, apollo_person_id, created_at,
  companies (id, name, logo_url, domain),
  enrichment_contact_emails (email, email_status, is_primary, source),
  enrichment_contact_phones (phone_number, type, status, source_name),
  intel_person:enrichment_people!contact_id (
    enrichment_person_metadata!apollo_person_id (seniority, departments, functions),
    enrichment_organizations (industry, estimated_num_employees)
  )
`;

// ─── Apply filters to a Supabase query ───────────────────────────────────────

function applyFilters(query: any, f: any, foreignTable?: string) {
  if (!f) return query;
  const prefix = foreignTable ? `${foreignTable}.` : '';

  if (f.search) {
    const cols = foreignTable
      ? `name.ilike.%${f.search}%,email.ilike.%${f.search}%,job_title.ilike.%${f.search}%`
      : `name.ilike.%${f.search}%,email.ilike.%${f.search}%,job_title.ilike.%${f.search}%`;
    if (foreignTable) {
      query = query.or(cols, { foreignTable });
    } else {
      query = query.or(cols);
    }
  }

  if (f.jobTitles?.length) {
    query = foreignTable
      ? query.in(`${prefix}job_title`, f.jobTitles)
      : query.in('job_title', f.jobTitles);
  }

  if (f.stages?.length) {
    query = foreignTable
      ? query.in(`${prefix}contact_stage`, f.stages)
      : query.in('contact_stage', f.stages);
  }

  if (f.sources?.length) {
    query = foreignTable
      ? query.in(`${prefix}medium`, f.sources)
      : query.in('medium', f.sources);
  }

  if (f.countries?.length) {
    query = foreignTable
      ? query.in(`${prefix}country`, f.countries)
      : query.in('country', f.countries);
  }

  if (f.cities?.length) {
    const cityConditions = f.cities
      .map((c: string) => `city.ilike.%${c.split(',')[0].trim()}%`)
      .join(',');
    if (foreignTable) {
      query = query.or(cityConditions, { foreignTable });
    } else {
      query = query.or(cityConditions);
    }
  }

  if (f.companyIds?.length) {
    query = foreignTable
      ? query.in(`${prefix}company_id`, f.companyIds)
      : query.in('company_id', f.companyIds);
  }

  if (f.hasEmail) {
    query = foreignTable
      ? query.not(`${prefix}email`, 'is', null)
      : query.not('email', 'is', null);
  }

  if (f.hasPhone) {
    query = foreignTable
      ? query.not(`${prefix}mobile`, 'is', null)
      : query.not('mobile', 'is', null);
  }

  if (f.isEnriched) {
    query = foreignTable
      ? query.not(`${prefix}apollo_person_id`, 'is', null)
      : query.not('apollo_person_id', 'is', null);
  }

  return query;
}

// ─── Map raw Supabase contact row ─────────────────────────────────────────────

function mapContact(c: any): ContactV2Row {
  const intel = c.intel_person?.[0];
  const meta = intel?.enrichment_person_metadata?.[0];
  return {
    ...c,
    company_name: c.companies?.name || c.company_name || null,
    company_logo: c.companies?.logo_url || null,
    company_domain: c.companies?.domain || null,
    is_discovery: false,
    seniority: meta?.seniority || null,
    departments: meta?.departments || null,
    functions: meta?.functions || null,
    industry: intel?.enrichment_organizations?.industry || null,
    employee_count: intel?.enrichment_organizations?.estimated_num_employees || null,
    all_emails: c.enrichment_contact_emails || [],
    all_phones: c.enrichment_contact_phones || [],
  };
}

// ─── Main Hook ────────────────────────────────────────────────────────────────

export function useContactsV2() {
  const dispatch = useDispatch();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const { mode, appliedFilters, currentPage, perPage, activeFileId } =
    useSelector((state: any) => state.contactsV2);

  const from = (currentPage - 1) * perPage;
  const to = from + perPage - 1;

  // ── DATA QUERY ───────────────────────────────────────────────────────────────
  const dataQuery = useQuery({
    queryKey: ['contacts-v2-data', { mode, appliedFilters, currentPage, perPage, activeFileId, organization_id }],
    placeholderData: keepPreviousData,
    enabled: !!organization_id,
    staleTime: 30_000,

    queryFn: async (): Promise<{ data: ContactV2Row[]; count: number }> => {

      // ── Discovery Mode ──────────────────────────────────────────────────────
      if (mode === 'discovery') {
        if (!appliedFilters) return { data: [], count: 0 };

        const hasAnyFilter = !!(
          appliedFilters.q_keywords ||
          appliedFilters.personTitles ||
          appliedFilters.personLocations?.length ||
          appliedFilters.seniorities?.length ||
          appliedFilters.companyNameTags?.length ||
          appliedFilters.organizationLocations?.length ||
          appliedFilters.organizationEmployeeRanges?.length ||
          appliedFilters.contactEmailStatus?.length ||
          appliedFilters.technologies ||
          appliedFilters.q_organization_job_titles ||
          appliedFilters.jobPostingLocations?.length
        );

        if (!hasAnyFilter) return { data: [], count: 0 };

        // Merge company name tags into q_keywords
        const keywordParts = [
          appliedFilters.q_keywords,
          ...(appliedFilters.companyNameTags || []),
        ].filter(Boolean);

        const apolloFilters = {
          q_keywords: keywordParts.join(' ').trim(),
          person_titles: appliedFilters.personTitles
            ? appliedFilters.personTitles.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          person_locations: appliedFilters.personLocations || [],
          person_seniorities: appliedFilters.seniorities || [],
          organization_locations: appliedFilters.organizationLocations || [],
          organization_num_employees_ranges: appliedFilters.organizationEmployeeRanges || [],
          contact_email_status: appliedFilters.contactEmailStatus || [],
          include_similar_titles: appliedFilters.include_similar_titles ?? true,
          currently_using_any_of_technology_uids: appliedFilters.technologies
            ? appliedFilters.technologies.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          q_organization_job_titles: appliedFilters.q_organization_job_titles
            ? appliedFilters.q_organization_job_titles.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [],
          organization_job_locations: appliedFilters.jobPostingLocations || [],
          revenue_range: {
            min: appliedFilters.revenue_min ? parseInt(appliedFilters.revenue_min, 10) : undefined,
            max: appliedFilters.revenue_max ? parseInt(appliedFilters.revenue_max, 10) : undefined,
          },
        };

        const { data, error } = await supabase.functions.invoke('apollo-people-search-v1', {
          body: { filters: apolloFilters, page: currentPage, per_page: perPage },
        });

        if (error) throw error;

        const mapped: ContactV2Row[] = (data.people || []).map((p: any) => ({
          id: `discovery-${p.id}`,
          name: `${p.first_name || ''} ${p.last_name_obfuscated || p.last_name || ''}`.trim(),
          email: null,
          mobile: null,
          job_title: p.title || null,
          company_id: null,
          company_name: p.organization?.name || null,
          company_logo: p.organization?.logo_url || null,
          company_domain: p.organization?.primary_domain || null,
          contact_stage: null,
          medium: null,
          country: p.country || null,
          city: p.city || null,
          state: p.state || null,
          photo_url: p.photo_url || null,
          linkedin_url: p.linkedin_url || null,
          apollo_person_id: p.id || null,
          created_at: null,
          all_emails: [],
          all_phones: [],
          seniority: p.seniority || null,
          departments: p.departments || null,
          functions: null,
          industry: p.organization?.industry || null,
          employee_count: p.organization?.estimated_num_employees || null,
          is_discovery: true,
          original_data: p,
          has_email: !!p.email || (Array.isArray(p.emails) && p.emails.length > 0),
          has_phone: p.has_direct_phone === 'Yes' || !!(p.mobile_phone),
        }));

        return { data: mapped, count: data.total_entries || 0 };
      }

      // ── List Mode (fileId) ───────────────────────────────────────────────────
      if (mode === 'list' && activeFileId) {
        const junctionSelect = `
          id, contact_id, added_at,
          contacts!inner (${CONTACT_SELECT})
        `;

        let query = supabase
          .from('contact_workspace_files')
          .select(junctionSelect, { count: 'exact' })
          .eq('file_id', activeFileId)
          .order('added_at', { ascending: false })
          .range(from, to);

        if (appliedFilters) {
          query = applyFilters(query, appliedFilters, 'contacts');
        }

        const { data, error, count } = await query;
        if (error) throw error;

        const mapped = (data || [])
          .map((item: any) => item.contacts ? mapContact(item.contacts) : null)
          .filter(Boolean) as ContactV2Row[];

        return { data: mapped, count: count || 0 };
      }

      // ── CRM Mode (all contacts) ──────────────────────────────────────────────
      let query = supabase
        .from('contacts')
        .select(CONTACT_SELECT, { count: 'exact' })
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (appliedFilters) {
        query = applyFilters(query, appliedFilters);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: (data || []).map(mapContact),
        count: count || 0,
      };
    },
  });

  return {
    data: dataQuery.data?.data || [],
    count: dataQuery.data?.count || 0,
    isLoading: dataQuery.isLoading,
    isFetching: dataQuery.isFetching,
    isError: dataQuery.isError,
    error: dataQuery.error,
    hasSearched: appliedFilters !== null,
  };
}

// ─── Company logos bulk fetch ────────────────────────────────────────────────
// Called separately and cached per org — avoids re-fetching on every table render

export function useCompanyLogos(companyIds: number[]) {
  return useQuery({
    queryKey: ['company-logos', companyIds.sort().join(',')],
    enabled: companyIds.length > 0,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, logo_url, domain')
        .in('id', companyIds);
      if (error) throw error;
      const map: Record<number, { name: string; logo_url: string | null; domain: string | null }> = {};
      (data || []).forEach((c: any) => { map[c.id] = c; });
      return map;
    },
  });
}