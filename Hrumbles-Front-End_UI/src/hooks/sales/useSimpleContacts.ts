import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import type { SimpleContact } from '@/types/simple-contact.types';
import { useSelector } from 'react-redux';

// The hook now accepts an options object for more clarity and flexibility
interface UseSimpleContactsOptions {
    fileId?: string | null;
    fetchUnfiled?: boolean;
}

export const useSimpleContacts = (options: any = {}) => {
  const { fileId, fetchUnfiled = false } = options;
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery<SimpleContact[], Error>({
    queryKey: ['simpleContactsList', { fileId: fileId || 'all', fetchUnfiled }],
    queryFn: async (): Promise<SimpleContact[]> => {
      if (!organization_id) return [];

      // REMOVED COMMENTS and fixed join paths for PostgREST
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          companies ( name, logo_url, industry ),
          created_by_employee:hr_employees!created_by ( first_name, last_name, profile_picture_url ),
          updated_by_employee:hr_employees!updated_by ( first_name, last_name, profile_picture_url ),
          intel_person:enrichment_people!contact_id (
            apollo_person_id,
            enrichment_person_metadata ( seniority, departments, functions ),
            enrichment_organizations ( industry, estimated_num_employees, annual_revenue_printed )
          ),
          enrichment_contact_emails ( email, email_status ),
          enrichment_contact_phones ( phone_number, type )
        `)
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Flatten nested data for the table engine
      return (data || []).map(c => {
        const personIntel = c.intel_person?.[0];
        const meta = personIntel?.enrichment_person_metadata?.[0];
        const org = personIntel?.enrichment_organizations;

        return {
          ...c,
          company_name: c.companies?.name || null,
          // Map enrichment fields for the Sidebar Filters to work
          seniority: meta?.seniority || null,
          departments: meta?.departments || [],
          functions: meta?.functions || [],
          industry: org?.industry || c.companies?.industry || null,
          employee_count: org?.estimated_num_employees || null,
          revenue: org?.annual_revenue_printed || null,
          // Store raw arrays for the Multi-Value UI
          all_emails: c.enrichment_contact_emails || [],
          all_phones: c.enrichment_contact_phones || []
        };
      });
    },
    enabled: !!organization_id,
  });
};
// Query update