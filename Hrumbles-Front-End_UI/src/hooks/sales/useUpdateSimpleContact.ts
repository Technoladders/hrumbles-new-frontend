// src/hooks/useUpdateSimpleContact.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import type { SimpleContact, SimpleContactUpdate } from '@/types/simple-contact.types';
import { useSimpleContacts } from './useSimpleContacts'; // Import the query hook itself

export interface UpdateSimpleContactPayload {
  item: SimpleContact;
  updates: SimpleContactUpdate;
}

export const useUpdateSimpleContact = () => {
  const queryClient = useQueryClient();

  // We need to know the parameters of the active query to invalidate it correctly.
  // This is a placeholder; you should pass the actual parameters from your page.
  // For now, invalidating the fuzzy key is more robust.

  return useMutation<SimpleContact, Error, UpdateSimpleContactPayload>({
    mutationFn: async ({ item, updates }: UpdateSimpleContactPayload) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', item.id)
        .select(`*, company:companies(*), created_by_employee:hr_employees!created_by(*), updated_by_employee:hr_employees!updated_by(*)`)
        .single();

      if (error) throw error;
      return data as SimpleContact;
    },
    // [THE SECOND AND MAIN FIX] Use a simple onSuccess with a fuzzy invalidation.
    // This is the most reliable way to ensure the correct dynamic query is refetched.
    onSuccess: () => {
      // This will invalidate all queries whose key starts with 'simpleContactsList'.
      // This includes ['simpleContactsList', { fileId: '...' }] and others.
      // Because we set `autoResetPageIndex: false` in the table, this will now
      // refresh the data without jumping to the first page.
      queryClient.invalidateQueries({ queryKey: ['simpleContactsList'] });
    },
  });
};