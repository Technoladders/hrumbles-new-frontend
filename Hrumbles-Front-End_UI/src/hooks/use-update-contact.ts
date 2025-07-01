// src/hooks/use-update-contact.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client"; // Adjust path if your client is elsewhere
import { UnifiedContactListItem } from '@/types/contact'; // Adjust path if your types are elsewhere

// Define the structure for the fields you want to be able to update
// These fields should ideally exist in both 'contacts' and 'candidate_companies' tables
// if you want a single update function. Otherwise, you might need more specific update types.
export interface ContactUpdatableFields {
  contact_stage?: string;
  contact_owner?: string;
  // Add other fields you might want to update, e.g., job_title, etc.
  // Ensure these fields exist in the target table(s)
}

// Define the payload structure for the mutation
export interface UpdateContactPayload {
  item: UnifiedContactListItem; // The contact item from your list
  updates: ContactUpdatableFields; // The actual data to update
}

export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, UpdateContactPayload>({
    mutationFn: async ({ item, updates }: UpdateContactPayload) => {
      console.log(`Attempting to update item ID: ${item.id} from source: ${item.source_table} with data:`, updates);

      if (Object.keys(updates).length === 0) {
        console.warn("No updates provided for item:", item.id);
        return null; // Or throw an error if updates are always expected
      }

      if (item.source_table === 'contacts') {
        // Item is from the 'contacts' table
        // The 'id' field of UnifiedContactListItem for 'contacts' source is the actual UUID
        const contactUuid = item.id;
        console.log(`Updating 'contacts' table for UUID: ${contactUuid}`);

        const { data, error } = await supabase
          .from('contacts')
          .update(updates) // Pass the updates object directly
          .eq('id', contactUuid)
          .select() // Select the updated row to get the latest data
          .single(); // Expects a single row to be affected

        if (error) {
          console.error('Error updating contact in "contacts" table:', error);
          throw error;
        }
        console.log('Successfully updated contact in "contacts" table:', data);
        return data;

      } else if (item.source_table === 'candidate_companies') {
        // Item is from the 'candidate_companies' table
        // We need original_candidate_id, candidate_job_id, and company_id for the composite PK
        if (!item.original_candidate_id || !item.candidate_job_id || item.company_id === undefined || item.company_id === null) {
          const missingIdsError = 'Missing necessary IDs (original_candidate_id, candidate_job_id, or company_id) to update candidate_companies entry.';
          console.error(missingIdsError, item);
          throw new Error(missingIdsError);
        }
        
        console.log(`Updating 'candidate_companies' table for candidate_id: ${item.original_candidate_id}, job_id: ${item.candidate_job_id}, company_id: ${item.company_id}`);

        const { data, error } = await supabase
          .from('candidate_companies')
          .update(updates) // Pass the updates object directly
          .eq('candidate_id', item.original_candidate_id)
          .eq('job_id', item.candidate_job_id)
          .eq('company_id', item.company_id)
          .select() // Select the updated row(s)
          .single(); // Expects a single row to be affected due to composite PK

        if (error) {
          console.error('Error updating contact in "candidate_companies" table:', error);
          throw error;
        }
        console.log('Successfully updated contact in "candidate_companies" table:', data);
        return data;
      } else {
        const unknownSourceError = `Unknown source_table: ${item.source_table}`;
        console.error(unknownSourceError);
        throw new Error(unknownSourceError);
      }
    },
    onSuccess: (updatedData, variables) => {
      console.log('Update successful for item:', variables.item.id, 'New data:', updatedData);
      // Invalidate and refetch the combined contacts list to show the update
      queryClient.invalidateQueries({ queryKey: ['combinedContactsList'] });
      
      // Optionally, if you have a detail view that might be affected:
      if (variables.item.source_table === 'contacts') {
        // If the item was from the 'contacts' table, invalidate its specific detail query
        queryClient.invalidateQueries({ queryKey: ['contact', variables.item.id] });
      }
      // If you have a detail view for 'candidate_companies' items,
      // you would invalidate its query key here as well, e.g.:
      // else if (variables.item.source_table === 'candidate_companies') {
      //   queryClient.invalidateQueries({ 
      //     queryKey: ['candidateDetail', variables.item.original_candidate_id, variables.item.candidate_job_id, variables.item.company_id] 
      //   });
      // }

      // You could also optimistically update the cache here if desired
      // For example:
      // queryClient.setQueryData(['combinedContactsList'], (oldData: UnifiedContactListItem[] | undefined) => {
      //   return oldData?.map(item => 
      //     item.id === variables.item.id ? { ...item, ...variables.updates } : item
      //   ) || [];
      // });
    },
    onError: (error, variables) => {
      console.error(`Mutation error when updating item ${variables.item.id}:`, error);
      // Handle error (e.g., show a notification to the user)
    },
  });
};