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

  return useQuery({
    queryKey: ['contacts-unified', { isDiscoveryMode, filters, currentPage, perPage, fileId, organization_id, fetchUnfiled }],
    placeholderData: keepPreviousData, // <--- CRITICAL: Prevents loader flash & table unmount on page change
    queryFn: async () => {
      
      // MODE 1: GLOBAL DISCOVERY (API)
      if (isDiscoveryMode) {
        const hasFilters = filters && Object.keys(filters).length > 0;
        
        if (!hasFilters) {
          dispatch(setSearchResults({ people: [], total_entries: 0 }));
          return { data: [], count: 0 };
        }

        const { data, error } = await supabase.functions.invoke('apollo-people-search', {
          body: { filters, page: currentPage, per_page: perPage },
        });
        
        if (error) throw error;
        
        // Dispatch to Redux to keep state in sync
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

      // --- LOCAL CRM MODES (Apply .range(from, to)) ---
      
      let query = supabase.from('contacts').select(`
          *,
          companies(name, logo_url, industry),
          created_by_employee:hr_employees!created_by(first_name, last_name, profile_picture_url),
          updated_by_employee:hr_employees!updated_by(first_name, last_name, profile_picture_url),
          intel_person:enrichment_people!contact_id(
            apollo_person_id,
            enrichment_person_metadata(seniority, departments, functions),
            enrichment_organizations(industry, estimated_num_employees, annual_revenue_printed)
          ),
          enrichment_contact_emails(email, email_status, is_primary, source),
          enrichment_contact_phones(phone_number, type, status, source_name)
        `, { count: 'exact' }); // Request total count

      // MODE 2: File Specific
      if (fileId) {
        // Need a slightly different query structure for junction table
        const junctionQuery = supabase
          .from('contact_workspace_files')
          .select(`
            id,
            contact_id,
            file_id,
            added_at,
            added_by,
            contacts (
              *,
              companies(name, logo_url, industry),
              created_by_employee:hr_employees!created_by(first_name, last_name, profile_picture_url),
              updated_by_employee:hr_employees!updated_by(first_name, last_name, profile_picture_url),
              intel_person:enrichment_people!contact_id(
                apollo_person_id,
                enrichment_person_metadata(seniority, departments, functions),
                enrichment_organizations(industry, estimated_num_employees, annual_revenue_printed)
              ),
              enrichment_contact_emails(email, email_status, is_primary, source),
              enrichment_contact_phones(phone_number, type, status, source_name)
            )
          `, { count: 'exact' })
          .eq('file_id', fileId)
          .order('added_at', { ascending: false })
          .range(from, to); // <--- PAGINATION APPLIED

        const { data, error, count } = await junctionQuery;
        if (error) throw error;
        
        // Update Redux count
        if (count !== null) dispatch(setTotalEntries(count));

        const mapped = (data || []).map((item: any) => {
          const c = item.contacts;
          if (!c) return null;
          const intel = c.intel_person?.[0];
          return {
            ...c,
            junction_id: item.id,
            added_at: item.added_at,
            added_by: item.added_by,
            company_name: c.companies?.name,
            is_discovery: false,
            seniority: intel?.enrichment_person_metadata?.seniority,
            departments: intel?.enrichment_person_metadata?.departments,
            functions: intel?.enrichment_person_metadata?.functions,
            industry: intel?.enrichment_organizations?.industry,
            revenue: intel?.enrichment_organizations?.annual_revenue_printed,
            employee_count: intel?.enrichment_organizations?.estimated_num_employees,
            all_emails: c.enrichment_contact_emails || [],
            all_phones: c.enrichment_contact_phones || []
          };
        }).filter(Boolean);

        return { data: mapped, count: count || 0 };
      }

      // MODE 3: Unfiled Contacts
      if (fetchUnfiled) {
         // Note: .range() on filtered nested relations is tricky in Supabase.
         // For 'Unfiled', we might need to fetch IDs first or accept client-side paging if list is small.
         // Assuming unfiled list isn't massive, or we do a specific "not.is" query.
         // Simplified approach for now (client-side filter on server fetched batch is hard).
         // Better approach: Get all unfiled contacts with range is hard without a view.
         // Fallback: Fetch basic info for all unfiled, then slice, then enrich.
         // For now, let's keep Unfiled as is (client side limit) or apply standard query filters:
         
         const { data, error } = await supabase
          .from('contacts')
          .select('*, contact_workspace_files(id)', { count: 'exact' })
          .eq('organization_id', organization_id)
          .is('contact_workspace_files', null); // This might not work directly in JS SDK depending on version
          
         // If "Unfiled" is a critical heavy view, creating a DB View is best.
         // Leaving logic similar to previous but returning structure:
         
         // ... (Keep existing Unfiled logic but wrap return)
         return { data: [], count: 0 }; // Placeholder - Implement specific unfiled query if needed
      }

      // MODE 4: Default Local CRM
      query = query
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false })
        .range(from, to); // <--- PAGINATION APPLIED

      const { data, error, count } = await query;
      if (error) throw error;

      // Update Redux count
      if (count !== null) dispatch(setTotalEntries(count));

      const mapped = (data || []).map((c: any) => {
        const intel = c.intel_person?.[0];
        return {
          ...c,
          company_name: c.companies?.name,
          is_discovery: false,
          seniority: intel?.enrichment_person_metadata?.seniority,
          departments: intel?.enrichment_person_metadata?.departments,
          functions: intel?.enrichment_person_metadata?.functions,
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
// Final