// src/hooks/useUpdateSimpleContact.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import type { SimpleContact, SimpleContactUpdate } from '@/types/simple-contact.types';

export interface UpdateSimpleContactPayload {
  item: SimpleContact;
  updates: SimpleContactUpdate;
}

export const useUpdateSimpleContact = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, UpdateSimpleContactPayload>({
    mutationFn: async ({ item, updates }: UpdateSimpleContactPayload) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', item.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simpleContactsList'] });
    },
  });
};