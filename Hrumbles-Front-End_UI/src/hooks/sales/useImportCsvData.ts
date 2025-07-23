import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

interface ImportPayload {
  fileId: string;
  csvData: any[];
  mapping: Record<string, string>;
}

export const useImportCsvData = () => {
  const queryClient = useQueryClient();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser = useSelector((state: any) => state.auth.user);

  return useMutation({
    mutationFn: async ({ fileId, csvData, mapping }: ImportPayload) => {
      if (!organization_id || !currentUser?.id) {
        throw new Error("User or organization not found.");
      }

      // Call the database function we created in Step 1
      const { data, error } = await supabase.rpc('import_contacts_from_csv', {
        p_organization_id: organization_id,
        p_user_id: currentUser.id,
        p_file_id: fileId,
        p_csv_data: csvData,
        p_column_mapping: mapping,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // After a successful import, refetch everything to ensure the UI is up-to-date
      // This is better than trying to manually update the cache.
      queryClient.invalidateQueries({ queryKey: ['simpleContactsList'] });
      queryClient.invalidateQueries({ queryKey: ['contactStages'] });
      // You may also want to invalidate companies if you have a view for them
      // queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
};