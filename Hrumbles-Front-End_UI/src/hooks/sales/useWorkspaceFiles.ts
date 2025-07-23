import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";

export interface WorkspaceFile {
    id: string;
    name: string;
}

export const useWorkspaceFiles = (workspaceId: string | null) => {
    return useQuery<WorkspaceFile[], Error>({
        queryKey: ['workspaceFiles', workspaceId],
        queryFn: async (): Promise<WorkspaceFile[]> => {
            if (!workspaceId) return [];
            
            const { data, error } = await supabase
                .from('workspace_files')
                .select('id, name')
                .eq('workspace_id', workspaceId)
                .order('name', { ascending: true });

            if (error) throw error;
            return data;
        },
        enabled: !!workspaceId,
    });
};