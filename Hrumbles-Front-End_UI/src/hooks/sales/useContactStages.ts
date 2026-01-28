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

export const useFilterSuggestions = (column: string, table: 'contacts' | 'companies' = 'contacts') => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery({
    queryKey: ['filterSuggestions', table, column, organization_id],
    queryFn: async () => {
      if (!organization_id) return [];
      // Fetch unique values for the specific column
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .eq('organization_id', organization_id)
        .not(column, 'is', null);

      if (error) throw error;
      
      const uniqueValues = Array.from(new Set(data.map((item: any) => item[column])));
      return uniqueValues.map(val => ({ label: String(val), value: String(val) }));
    },
    enabled: !!organization_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};