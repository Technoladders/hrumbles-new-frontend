// src/hooks/sales/useSimpleContacts.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import type { SimpleContact } from '@/types/simple-contact.types';

export const useSimpleContacts = () => {
  return useQuery<SimpleContact[], Error>({
    queryKey: ['simpleContactsList'],
    queryFn: async (): Promise<SimpleContact[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          companies ( name ),
          created_by_employee:created_by ( first_name, last_name, profile_picture_url ),
          updated_by_employee:updated_by ( first_name, last_name, profile_picture_url )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(c => ({ ...c, company_name: c.companies?.name || null }));
    },
  });
};