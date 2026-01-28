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
      console.log('DEBUG: Incoming updates payload:', updates); // ← DEBUG: Log raw incoming updates

      // Normalize empty strings to NULL for constrained fields (e.g., email) to avoid unique constraint violations
      const normalizedUpdates = { ...updates };
      if ('email' in normalizedUpdates && typeof normalizedUpdates.email === 'string') {  // FIXED: Check property existence first, then type (ignores falsy '' value)
        const emailValue = normalizedUpdates.email;
        console.log('DEBUG: Email value before normalization:', emailValue, '(type:', typeof emailValue, ', length:', emailValue?.length, ')'); // ← DEBUG: Inspect email specifically

        const trimmed = emailValue.trim();
        console.log('DEBUG: Email trimmed:', trimmed, '(length:', trimmed.length, ')'); // ← DEBUG: Check after trim

        if (trimmed === '') {
          normalizedUpdates.email = null;  // Set to NULL instead of ''
          console.log('DEBUG: Email normalized to NULL'); // ← DEBUG: Confirm change
        } else {
          normalizedUpdates.email = trimmed;  // Re-set trimmed non-empty string
          console.log('DEBUG: Email trimmed but kept as string');
        }
      } else {
        console.log('DEBUG: No email property or not a string in updates, skipping');
      }

      // Extend for other fields if they have similar constraints, e.g.:
      // if ('mobile' in normalizedUpdates && typeof normalizedUpdates.mobile === 'string') {
      //   const trimmedMobile = normalizedUpdates.mobile.trim();
      //   if (trimmedMobile === '') {
      //     normalizedUpdates.mobile = null;
      //   } else {
      //     normalizedUpdates.mobile = trimmedMobile;
      //   }
      // }

      console.log('DEBUG: Normalized updates payload:', normalizedUpdates); // ← DEBUG: Log after normalization

      const { data, error } = await supabase
        .from('contacts')
        .update(normalizedUpdates)  // Use normalized updates
        .eq('id', item.id)
        .select(`*, company:companies(*), created_by_employee:hr_employees!created_by(*), updated_by_employee:hr_employees!updated_by(*)`)
        .single();

      if (error) {
        console.error('DEBUG: Supabase update error:', error); // ← DEBUG: Log any Supabase errors
        throw error;
      }
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