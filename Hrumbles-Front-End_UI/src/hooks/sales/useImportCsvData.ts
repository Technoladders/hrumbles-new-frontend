// src/hooks/sales/useImportCsvData.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

interface ImportResult {
    imported: number;
    skipped_summary: {
        count: number;
        records: any[];
    }
}

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
    mutationFn: async ({ fileId, processedData }: ImportPayload) => {
      if (!organization_id || !currentUser?.id) {
        throw new Error("Authentication required.");
      }

      // Filter rows without a name (absolute minimum requirement)
      const validData = processedData.filter(row => row.name && String(row.name).trim() !== '');

      if (validData.length === 0) {
        throw new Error("No valid records to import. Ensure 'Contact Name' is mapped.");
      }

      const { data, error } = await supabase.rpc('import_contacts_from_csv', {
        p_organization_id: organization_id,
        p_user_id: currentUser.id,
        p_file_id: fileId,
        p_csv_data: validData // Sending pre-structured JSON
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
      if (variables.fileId) {
        queryClient.invalidateQueries({ queryKey: ['file-contacts', variables.fileId] });
      }
    }
  });
};