import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import type { SimpleContact } from '@/types/simple-contact.types';
import { useSelector } from 'react-redux';

// The hook now accepts an options object for more clarity and flexibility
interface UseSimpleContactsOptions {
    fileId?: string | null;
    fetchUnfiled?: boolean;
}

export const useSimpleContacts = (options: UseSimpleContactsOptions = {}) => {
  const { fileId, fetchUnfiled = false } = options;
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery<SimpleContact[], Error>({
    // The query key now reflects whether we're fetching for a file or the unfiled list
    queryKey: ['simpleContactsList', { fileId, fetchUnfiled }],
    queryFn: async (): Promise<SimpleContact[]> => {
      if (!organization_id) return [];

      let query = supabase
        .from('contacts')
        .select(`
          *,
          companies ( name ),
          created_by_employee:created_by ( first_name, last_name, profile_picture_url ),
          updated_by_employee:updated_by ( first_name, last_name, profile_picture_url )
        `)
        .eq('organization_id', organization_id);

      // Main logic change: either filter by file_id OR filter for where file_id is null
      if (fetchUnfiled) {
        query = query.is('file_id', null);
      } else if (fileId) {
        query = query.eq('file_id', fileId);
      } else {
        // If neither is specified, return empty to prevent loading all contacts by accident
        return [];
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(c => ({ ...c, company_name: c.companies?.name || null }));
    },
    // The query is enabled only if we have an org and a valid mode (fileId or fetchUnfiled)
    enabled: !!organization_id && (!!fileId || fetchUnfiled),
  });
};