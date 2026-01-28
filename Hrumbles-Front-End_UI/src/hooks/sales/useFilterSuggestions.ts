import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

export const useFilterSuggestions = (column: string, searchTerm: string, table: 'contacts' | 'companies' | 'workspaces' = 'contacts') => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery({
    queryKey: ['suggestions', table, column, searchTerm, organization_id],
    queryFn: async () => {
      if (!organization_id || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from(table)
        .select(column)
        .eq('organization_id', organization_id)
        .ilike(column, `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      // Extract unique values
      const values = Array.from(new Set(data.map((item: any) => item[column])));
      return values.map(v => ({ label: String(v), value: String(v) }));
    },
    enabled: searchTerm.length >= 2,
  });
};