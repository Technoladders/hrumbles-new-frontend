import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

export interface Workspace {
    id: string;
    name: string;
    created_at: string;
    created_by_employee: {
        first_name: string;
        last_name: string;
    } | null;
}

export const useWorkspaces = () => {
    const organization_id = useSelector((state: any) => state.auth.organization_id);

    return useQuery<Workspace[], Error>({
        queryKey: ['workspaces', organization_id],
        queryFn: async (): Promise<Workspace[]> => {
            if (!organization_id) return [];
            
            const { data, error } = await supabase
                .from('workspaces')
                .select(`
                    id, 
                    name, 
                    created_at,
                    created_by_employee:created_by (first_name, last_name)
                `)
                .eq('organization_id', organization_id)
                .order('name', { ascending: true });

            if (error) throw error;
            return data;
        },
        enabled: !!organization_id,
    });
};