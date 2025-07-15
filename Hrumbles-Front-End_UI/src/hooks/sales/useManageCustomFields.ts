// src/hooks/sales/useManageCustomFields.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";

interface AddCustomFieldPayload {
    organization_id: string;
    column_key: string;
    column_name: string;
    data_type: 'text' | 'date' | 'number';
}

export const useManageCustomFields = () => {
    const queryClient = useQueryClient();

    const addField = useMutation({
        mutationFn: async (payload: AddCustomFieldPayload) => {
            const { error } = await supabase.from('custom_contact_fields').insert(payload);
            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    throw new Error(`A column with the key "${payload.column_key}" already exists.`);
                }
                throw error;
            }
        },
        onSuccess: () => {
            // Invalidate the query that fetches these fields to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['customContactFields'] });
        },
    });

    return { addField };
};