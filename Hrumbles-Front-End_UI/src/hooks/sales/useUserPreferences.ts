// src/hooks/sales/useUserPreferences.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

// This hook now manages preferences for the individual logged-in user
export const useUserPreferences = <T>(key: string) => {
    const queryClient = useQueryClient();
    const currentUser = useSelector((state: any) => state.auth.user);
    const userId = currentUser?.id;

    // The query key is now specific to the user
    const { data, isLoading } = useQuery<T | undefined>({
        queryKey: ['userPreferences', userId, key],
        queryFn: async (): Promise<T | undefined> => {
            if (!userId) return undefined;
            
            const { data, error } = await supabase
                .from('hr_employees')
                .select('ui_preferences')
                .eq('id', userId)
                .single();

            if (error) throw error;
            
            const preferences = data?.ui_preferences as { [key: string]: T } | null;
            return preferences?.[key];
        },
        enabled: !!userId,
    });

    const mutation = useMutation({
        mutationFn: async (value: T) => {
            if (!userId) throw new Error("User not found");

            // Fetch current preferences to merge, not overwrite
            const { data: currentData, error: fetchError } = await supabase
                .from('hr_employees')
                .select('ui_preferences')
                .eq('id', userId)
                .single();

            if (fetchError) throw fetchError;

            const newPreferences = {
                ...(currentData?.ui_preferences || {}),
                [key]: value,
            };

            const { error: updateError } = await supabase
                .from('hr_employees')
                .update({ ui_preferences: newPreferences })
                .eq('id', userId);

            if (updateError) throw updateError;
            return newPreferences;
        },
        onSuccess: (newData) => {
            // After a successful mutation, update the query cache immediately
            queryClient.setQueryData(['userPreferences', userId, key], newData?.[key]);
        }
    });

    return { data, isLoading, set: mutation.mutate };
};

// 