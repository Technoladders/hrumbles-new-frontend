import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceFile } from './useWorkspaceFiles';

// This hook takes an array of files and returns a map of fileId -> record count.
export const useListRecordCounts = (files: WorkspaceFile[] | undefined) => {
    return useQuery<Record<string, number>, Error>({
        queryKey: ['listRecordCounts', files?.map(f => f.id) || []],
        queryFn: async () => {
            if (!files || files.length === 0) return {};

            const countPromises = files.map(async (file) => {
                const tableName = file.type === 'people' ? 'contacts' : 'companies';
                const { count, error } = await supabase
                    .from(tableName)
                    .select('id', { count: 'exact', head: true })
                    .eq('file_id', file.id);
                
                if (error) {
                    console.error(`Error fetching count for ${file.name}:`, error);
                    return { fileId: file.id, count: 0 };
                }
                return { fileId: file.id, count: count ?? 0 };
            });

            const results = await Promise.all(countPromises);
            const countsMap: Record<string, number> = {};
            results.forEach(result => {
                countsMap[result.fileId] = result.count;
            });
            return countsMap;
        },
        enabled: !!files && files.length > 0,
    });
};