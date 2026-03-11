// src/hooks/sales/useWorkspaces.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

export interface Workspace {
  id: string;
  name: string;
  type: 'people' | 'companies';
  created_at: string;
  created_by_employee: {
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
  } | null;
}

/**
 * Fetch workspaces for a specific type ('people' | 'companies').
 * People column and Companies column call this separately — fully isolated.
 */
export const useWorkspaces = (type: 'people' | 'companies') => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery<Workspace[], Error>({
    queryKey: ['workspaces', organization_id, type],
    queryFn: async (): Promise<Workspace[]> => {
      if (!organization_id) return [];
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          id,
          name,
          type,
          created_at,
          created_by_employee:created_by (first_name, last_name, profile_picture_url)
        `)
        .eq('organization_id', organization_id)
        .eq('type', type)
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!organization_id,
  });
};