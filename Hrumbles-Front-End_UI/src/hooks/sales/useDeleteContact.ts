// src/hooks/sales/useDeleteContact.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";

export const useDeleteContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (contactId: string) => {
            const { error } = await supabase
                .from('contacts')
                .delete()
                .eq('id', contactId);
            
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            // Refetch the contacts list after a successful deletion
            queryClient.invalidateQueries({ queryKey: ['simpleContactsList'] });
        },
    });
};