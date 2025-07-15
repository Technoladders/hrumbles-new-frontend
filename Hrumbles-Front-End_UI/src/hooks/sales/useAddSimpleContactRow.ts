// src/hooks/sales/useAddSimpleContactRow.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import type { SimpleContactInsert } from '@/types/simple-contact.types';

// The mutation now expects the complete data object from the form
export const useAddSimpleContactRow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newContactData: SimpleContactInsert) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert(newContactData)
        .select(`
          *,
          companies ( name ),
          created_by_employee:created_by ( first_name, last_name, profile_picture_url ),
          updated_by_employee:updated_by ( first_name, last_name, profile_picture_url )
        `)
        .single();
      
      if (error) {
        // Provide a more specific error for unique email constraint violations
        if (error.code === '23505') {
            throw new Error(`A contact with the email "${newContactData.email}" already exists.`);
        }
        throw new Error(error.message);
      }

      return { ...data, company_name: data.companies?.name || null };
    },
    onSuccess: () => {
      // Invalidate the main list query to trigger a refetch and show the new data
      queryClient.invalidateQueries({ queryKey: ['simpleContactsList'] });
    },
  });
};