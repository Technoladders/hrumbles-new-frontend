import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import type { SimpleContactInsert } from '@/types/simple-contact.types';

// The mutation will accept an array of contacts to insert
export const useBulkInsertContacts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactsToInsert: SimpleContactInsert[]) => {
      if (!contactsToInsert || contactsToInsert.length === 0) {
        return { count: 0, error: null };
      }

      // Use upsert to insert new contacts and ignore duplicates based on email.
      // The `contacts_email_unique` constraint you have is crucial for this to work.
      const { count, error } = await supabase
        .from('contacts')
        .upsert(contactsToInsert, {
          onConflict: 'email', // The database constraint to check for conflicts
          ignoreDuplicates: true // If a conflict occurs, do nothing (don't update)
        });

      if (error) {
        // Handle potential errors, e.g., if a non-nullable column is missing
        throw new Error(error.message);
      }
      
      return { count, error };
    },
    onSuccess: (data, variables) => {
      if (data.count && data.count > 0) {
        // Invalidate the main contacts list to trigger a refetch and show the new data
        // We get the file_id from the first item in the inserted array.
        const fileId = variables[0]?.file_id;
        if (fileId) {
            queryClient.invalidateQueries({ queryKey: ['simpleContactsList', fileId] });
        } else {
            queryClient.invalidateQueries({ queryKey: ['simpleContactsList'] });
        }
      }
    },
  });
};