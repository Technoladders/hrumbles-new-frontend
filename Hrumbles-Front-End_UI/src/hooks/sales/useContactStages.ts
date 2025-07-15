// src/hooks/sales/useContactStages.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

export interface ContactStage {
    id: number;
    name: string;
    color: string;
    display_order: number;
}

export const useContactStages = () => {
    const organization_id = useSelector((state: any) => state.auth.organization_id);

    return useQuery<ContactStage[], Error>({
        queryKey: ['contactStages', organization_id],
        queryFn: async (): Promise<ContactStage[]> => {
            if (!organization_id) return [];
            
            const { data, error } = await supabase
                .from('contact_stages')
                .select('*')
                .eq('organization_id', organization_id)
                .order('display_order', { ascending: true });

            if (error) throw error;
            return data;
        },
        enabled: !!organization_id, // Only run the query if organization_id exists
    });
};