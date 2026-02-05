// src/hooks/sales/useSimpleContacts.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector, useDispatch } from 'react-redux';
import { setSearchResults, setTotalEntries } from '@/Redux/intelligenceSearchSlice';

interface UseSimpleContactsOptions {
  fileId?: string | null;
  fetchUnfiled?: boolean;
}

export const useSimpleContacts = (options: UseSimpleContactsOptions = {}) => {
  const dispatch = useDispatch();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const { isDiscoveryMode, filters, currentPage, perPage } = useSelector((state: any) => state.intelligenceSearch);
  const { fileId, fetchUnfiled } = options;

  // Calculate Pagination Range for Supabase
  const from = (currentPage - 1) * perPage;
  const to = from + perPage - 1;

  // Helper to apply simple filters to any query builder
  const applyCommonFilters = (query: any, f: any) => {
    if (!f) return query;

    // Text Search (Simple OR logic)
    if (f.search) {
      query = query.or(`name.ilike.%${f.search}%,email.ilike.%${f.search}%,job_title.ilike.%${f.search}%`);
    }

    // Job Title Filter
    if (f.jobTitles?.length) {
      query = query.in('job_title', f.jobTitles);
    }

    // Direct Column Filters
    if (f.stages?.length) query = query.in('contact_stage', f.stages);
    if (f.sources?.length) query = query.in('medium', f.sources);
    
    // Location Filters - Updated to handle arrays
    if (f.countries?.length) {
      query = query.in('country', f.countries);
    }
    if (f.cities?.length) {
      // For cities, we need to match the full location string format
      // Assuming city filter stores values like "City, State Country"
      // We'll use a contains approach for flexibility
      const cityConditions = f.cities.map((city: string) => {
        // Extract just the city name (before first comma)
        const cityName = city.split(',')[0].trim();
        return `city.ilike.%${cityName}%`;
      }).join(',');
      query = query.or(cityConditions);
    }
    
    // Company Filter
    if (f.companyIds?.length) {
      query = query.in('company_id', f.companyIds);
    }
    
    // Existence Checks
    if (f.hasEmail) query = query.not('email', 'is', null);
    if (f.hasPhone) query = query.not('mobile', 'is', null);
    if (f.isEnriched) query = query.not('apollo_person_id', 'is', null);

    return query;
  };

  return useQuery({
    queryKey: ['contacts-unified', { isDiscoveryMode, filters, currentPage, perPage, fileId, organization_id, fetchUnfiled }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      
      // =======================================================
      // MODE 1: GLOBAL DISCOVERY (API)
      // =======================================================
      if (isDiscoveryMode) {
        const hasFilters = filters && Object.keys(filters).length > 0;
        
        if (!hasFilters) {
          dispatch(setSearchResults({ people: [], total_entries: 0 }));
          return { data: [], count: 0 };
        }

        const { data, error } = await supabase.functions.invoke('apollo-people-search-v1', {
          body: { filters, page: currentPage, per_page: perPage },
        });
        
        if (error) throw error;
        
        dispatch(setSearchResults(data)); 
        
        const mappedData = (data.people || []).map((p: any) => ({
          id: `temp-${p.id}`,
          name: `${p.first_name} ${p.last_name_obfuscated || ''}`,
          job_title: p.title,
          company_name: p.organization?.name,
          email: null,
          mobile: null,
          photo_url: p.photo_url,
          contact_stage: 'Discovery',
          is_discovery: true,
          apollo_id: p.id,
          original_data: p,
          has_email: p.has_email,
          has_phone: p.has_direct_phone === 'Yes',
          city: p.city,
          state: p.state,
          country: p.country,
        }));

        return { data: mappedData, count: data.total_entries || 0 };
      }

      // =======================================================
      // MODE 2 & 4: LOCAL CRM (Supabase)
      // =======================================================
      
      // Determine if we need to filter by enriched data (requires Inner Join)
      const hasDeepFilters = 
        filters?.seniorities?.length > 0 || 
        filters?.industries?.length > 0 || 
        filters?.departments?.length > 0 ||
        filters?.functions?.length > 0 ||
        filters?.employeeCounts?.length > 0;

      // Construct the SELECT string dynamically based on filters
      const intelRelation = hasDeepFilters 
        ? 'intel_person:enrichment_people!contact_id!inner' 
        : 'intel_person:enrichment_people!contact_id';

      const commonSelect = `
        *,
        companies(id, name, logo_url, industry, domain),
        created_by_employee:hr_employees!created_by(first_name, last_name, profile_picture_url),
        updated_by_employee:hr_employees!updated_by(first_name, last_name, profile_picture_url),
        ${intelRelation}(
          apollo_person_id,
          enrichment_person_metadata!apollo_person_id(seniority, departments, functions),
          enrichment_organizations(industry, estimated_num_employees, annual_revenue_printed)
        ),
        enrichment_contact_emails(email, email_status, is_primary, source),
        enrichment_contact_phones(phone_number, type, status, source_name)
      `;

      // --- MODE 2: File Specific (Junction Table) ---
      if (fileId) {
        const hasAnyContactFilter = Object.keys(filters || {}).length > 0;
        const contactRelation = hasAnyContactFilter ? 'contacts!inner' : 'contacts';

        const junctionSelect = `
          id, contact_id, file_id, added_at, added_by,
          ${contactRelation} (
            ${commonSelect}
          )
        `;

        let query = supabase
          .from('contact_workspace_files')
          .select(junctionSelect, { count: 'exact' })
          .eq('file_id', fileId)
          .order('added_at', { ascending: false });

        // Apply filters to the nested 'contacts' relation
        if (filters) {
          if (filters.search) {
             query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`, { foreignTable: 'contacts' });
          }
          if (filters.jobTitles?.length) {
            query = query.in('contacts.job_title', filters.jobTitles);
          }
          if (filters.stages?.length) query = query.in('contacts.contact_stage', filters.stages);
          if (filters.sources?.length) query = query.in('contacts.medium', filters.sources);
          
          // Location filters for junction table
          if (filters.countries?.length) {
            query = query.in('contacts.country', filters.countries);
          }
          if (filters.cities?.length) {
            const cityConditions = filters.cities.map((city: string) => {
              const cityName = city.split(',')[0].trim();
              return `city.ilike.%${cityName}%`;
            }).join(',');
            query = query.or(cityConditions, { foreignTable: 'contacts' });
          }
          
          // Company Filter for junction table queries
          if (filters.companyIds?.length) {
            query = query.in('contacts.company_id', filters.companyIds);
          }
          
          // Enrichment filters
          if (filters.seniorities?.length) {
            query = query.in('contacts.intel_person.enrichment_person_metadata.seniority', filters.seniorities);
          }
          
          if (filters.departments?.length) {
            query = query.overlaps('contacts.intel_person.enrichment_person_metadata.departments', filters.departments);
          }
          
          if (filters.functions?.length) {
            query = query.overlaps('contacts.intel_person.enrichment_person_metadata.functions', filters.functions);
          }
          
          if (filters.industries?.length) {
             query = query.in('contacts.intel_person.enrichment_organizations.industry', filters.industries);
          }
        }

        // Paginate
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;
        
        if (count !== null) dispatch(setTotalEntries(count));

        const mapped = (data || []).map((item: any) => {
          const c = item.contacts;
          if (!c) return null;
          const intel = c.intel_person?.[0];
          const metadata = intel?.enrichment_person_metadata?.[0];
          return {
            ...c,
            junction_id: item.id,
            added_at: item.added_at,
            added_by: item.added_by,
            company_name: c.companies?.name,
            company_logo: c.companies?.logo_url,
            company_domain: c.companies?.domain,
            is_discovery: false,
            seniority: metadata?.seniority,
            departments: metadata?.departments,
            functions: metadata?.functions,
            industry: intel?.enrichment_organizations?.industry,
            revenue: intel?.enrichment_organizations?.annual_revenue_printed,
            employee_count: intel?.enrichment_organizations?.estimated_num_employees,
            all_emails: c.enrichment_contact_emails || [],
            all_phones: c.enrichment_contact_phones || []
          };
        }).filter(Boolean);

        return { data: mapped, count: count || 0 };
      }

      // --- MODE 4: Default Local CRM (All Contacts) ---
      let query = supabase
        .from('contacts')
        .select(commonSelect, { count: 'exact' })
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false });

      // Apply Basic Filters
      query = applyCommonFilters(query, filters);

      // Apply Deep JSONB Filters (Seniority, Dept, etc.)
      if (hasDeepFilters) {
         if (filters.seniorities?.length) {
            // Seniority is a text field in enrichment_person_metadata table
            query = query.in('intel_person.enrichment_person_metadata.seniority', filters.seniorities);
         }
         if (filters.departments?.length) {
            // departments is a text array, use overlap operator
            query = query.overlaps('intel_person.enrichment_person_metadata.departments', filters.departments);
         }
         if (filters.functions?.length) {
            // functions is a text array, use overlap operator
            query = query.overlaps('intel_person.enrichment_person_metadata.functions', filters.functions);
         }
         if (filters.industries?.length) {
             query = query.in('intel_person.enrichment_organizations.industry', filters.industries);
         }
      }

      // Paginate
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      if (count !== null) dispatch(setTotalEntries(count));

      const mapped = (data || []).map((c: any) => {
        const intel = c.intel_person?.[0];
        const metadata = intel?.enrichment_person_metadata?.[0];
        return {
          ...c,
          company_name: c.companies?.name,
          company_logo: c.companies?.logo_url,
          company_domain: c.companies?.domain,
          is_discovery: false,
          seniority: metadata?.seniority,
          departments: metadata?.departments,
          functions: metadata?.functions,
          industry: intel?.enrichment_organizations?.industry,
          revenue: intel?.enrichment_organizations?.annual_revenue_printed,
          employee_count: intel?.enrichment_organizations?.estimated_num_employees,
          all_emails: c.enrichment_contact_emails || [],
          all_phones: c.enrichment_contact_phones || []
        };
      });

      return { data: mapped, count: count || 0 };
    },
    enabled: !!organization_id
  });
};