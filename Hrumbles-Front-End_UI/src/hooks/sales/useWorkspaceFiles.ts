import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

export interface WorkspaceFile {
    id: string;
    name: string;
    created_at: string;
    type: 'people' | 'companies';
    workspace_id: string; // ✅ ADD THIS FIELD TO THE INTERFACE
    created_by_employee: {
        first_name: string;
        last_name: string;
    } | null;
}

// The hook now makes workspaceId optional.
export const useWorkspaceFiles = (workspaceId?: string | null) => {
    const organization_id = useSelector((state: any) => state.auth.organization_id);

    return useQuery<WorkspaceFile[], Error>({
        // The query key is now more specific to ensure correct caching.
        queryKey: ['workspaceFiles', organization_id, workspaceId || 'all-for-org'],
        queryFn: async (): Promise<WorkspaceFile[]> => {
            if (!organization_id) return [];
            
            let query = supabase
                .from('workspace_files')
                .select(`
                    id,
                    name,
                    created_at,
                    type,
                    workspace_id, 
                    created_by_employee:created_by (first_name, last_name)
                `)
                .eq('organization_id', organization_id);

            // If a specific workspaceId is provided, filter by it.
            // Otherwise, it will fetch all files for the organization.
            if (workspaceId) {
                query = query.eq('workspace_id', workspaceId);
            }
            
            const { data, error } = await query.order('name', { ascending: true });

            if (error) throw error;
            return data;
        },
        enabled: !!organization_id,
    });
};