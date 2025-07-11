// src/hooks/use-add-contact-row.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { ContactInsert } from '@/types/contact';

export const useAddContactRow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organization_id: string) => {
      const newContact: Partial<ContactInsert> = {
        name: 'New Contact', // Default name
        email: `new-contact-${Date.now()}@yourapp.com`, // Placeholder unique email
        contact_stage: 'Prospect',
        organization_id: organization_id,
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert(newContact as ContactInsert)
        .select()
        .single();
      
      if (error) {
         // This placeholder email is temporary. The user is expected to change it.
         // If the user tries to create another row before changing the first one, it might conflict.
         // A more robust solution might involve null emails and a different unique constraint.
        console.error("Error adding new contact row:", error);
        throw new Error("Could not create a new contact. Please try again.");
      }
      return data;
    },
    onSuccess: () => {
      // Use the correct query key to refetch the data
      queryClient.invalidateQueries({ queryKey: ['combinedContactsListV4'] });
    },
    onError: (error) => {
      console.error("Failed to add contact row:", error);
      // Here you would likely show a toast message
    }
  });
};