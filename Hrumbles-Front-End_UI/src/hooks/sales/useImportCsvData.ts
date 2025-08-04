// src/hooks/sales/useImportCsvData.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

// This defines the structure of the JSON object returned by our RPC function
interface ImportResult {
    imported: number;
    skipped_summary: {
        count: number;
        records: any[];
    }
}

// This defines the payload for our mutation hook
interface ImportPayload {
  fileId: string;
  csvData: any[];
  mapping: Record<string, string>;
}

export const useImportCsvData = () => {
  const queryClient = useQueryClient();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser = useSelector((state: any) => state.auth.user);

  return useMutation<ImportResult, Error, ImportPayload>({
    mutationFn: async ({ fileId, csvData, mapping }: ImportPayload) => {
      if (!organization_id || !currentUser?.id) {
        throw new Error("You must be logged in to import data.");
      }
      
      // UPDATED: Relax the client-side filter.
      // We only ensure that a name exists and is not just empty whitespace.
      // The backend will handle logic for empty emails or other missing fields.
      const validCsvData = csvData.filter(row => row[mapping['name']] && String(row[mapping['name']]).trim() !== '');

      if (validCsvData.length === 0) {
          // If no rows have a valid name, we can return early.
          // The skipped summary should include all original rows.
          return { imported: 0, skipped_summary: { count: csvData.length, records: csvData } };
      }

      // Call the robust Supabase RPC function. The backend now handles all the complex logic.
      const { data, error } = await supabase.rpc('import_contacts_from_csv', {
        p_organization_id: organization_id,
        p_user_id: currentUser.id,
        p_file_id: fileId,
        p_csv_data: validCsvData, // Send the correctly filtered data
        p_column_mapping: mapping,
      });

      if (error) {
        console.error("Supabase import error:", error);
        throw new Error(`The database returned an error: ${error.message}`);
      }

      return data as ImportResult;
    },
    onSuccess: (data) => {
      // If any contacts were successfully imported, invalidate the contacts list query.
      // React Query will automatically refetch the data, updating the table with the new contacts.
      if (data && data.imported > 0) {
        queryClient.invalidateQueries({ queryKey: ['simpleContactsList'] });
      }
    },
    onError: (error) => {
        // Log the error for debugging purposes.
        console.error("Import mutation failed:", error);
    }
  });
};