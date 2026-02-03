// src/hooks/sales/useSimpleContacts.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector, useDispatch } from 'react-redux';
import { setSearchResults } from '@/Redux/intelligenceSearchSlice';

interface UseSimpleContactsOptions {
  fileId?: string | null;
  fetchUnfiled?: boolean;
}

export const useSimpleContacts = (options: UseSimpleContactsOptions = {}) => {
  const dispatch = useDispatch();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const { isDiscoveryMode, filters, currentPage, perPage } = useSelector((state: any) => state.intelligenceSearch);
  const { fileId, fetchUnfiled } = options;

  return useQuery({
    queryKey: ['contacts-unified', { isDiscoveryMode, filters, currentPage, fileId, organization_id, fetchUnfiled }],
    queryFn: async () => {
      
      // MODE 1: GLOBAL DISCOVERY (API)
      if (isDiscoveryMode) {
        const hasFilters = filters && Object.keys(filters).length > 0;
        
        if (!hasFilters) {
          dispatch(setSearchResults({ people: [], total_entries: 0 }));
          return [];
        }

        const { data, error } = await supabase.functions.invoke('apollo-people-search', {
          body: { filters, page: currentPage, per_page: perPage },
        });
        
        if (error) throw error;
        
        dispatch(setSearchResults(data)); 
        
        return (data.people || []).map((p: any) => ({
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
      }

      // MODE 2: LOCAL CRM - Fetch contacts for a specific file/list
      if (fileId) {
        // Use junction table to get contacts in this file
        const { data, error } = await supabase
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
          `)
          .eq('file_id', fileId)
          .order('added_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((item: any) => {
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
      }

      // MODE 3: LOCAL CRM - Fetch unfiled contacts (contacts not in any list)
      if (fetchUnfiled) {
        // Get contacts that don't have any entries in contact_workspace_files
        const { data, error } = await supabase
          .from('contacts')
          .select(`
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
            enrichment_contact_phones(phone_number, type, status, source_name),
            contact_workspace_files(id)
          `)
          .eq('organization_id', organization_id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Filter to only contacts with no workspace file associations
        const unfiledContacts = (data || []).filter((c: any) => 
          !c.contact_workspace_files || c.contact_workspace_files.length === 0
        );

        return unfiledContacts.map((c: any) => {
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
      }

      // MODE 4: LOCAL CRM - Fetch ALL contacts (default)
      const { data, error } = await supabase
        .from('contacts')
        .select(`
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
        `)
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((c: any) => {
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
    },
    enabled: !!organization_id
  });
};