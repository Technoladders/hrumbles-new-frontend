// src/hooks/sales/useListPermissions.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";

export interface ShareRecord {
  id: string;
  shared_with_user_id: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  granted_by: string | null;
  created_at: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url: string | null;
    position: string | null;
  } | null;
}

/**
 * Fetches all existing share records for a specific workspace or file.
 * Used by ShareDialog to show who currently has access.
 */
export const useListPermissions = (
  resourceType: 'workspace' | 'file' | null,
  resourceId: string | null,
) => {
  return useQuery<ShareRecord[], Error>({
    queryKey: ['listPermissions', resourceType, resourceId],
    queryFn: async (): Promise<ShareRecord[]> => {
      if (!resourceType || !resourceId) return [];

      const { data, error } = await supabase
        .from('list_share_permissions')
        .select(`
          id,
          shared_with_user_id,
          can_read,
          can_write,
          can_delete,
          granted_by,
          created_at,
          employee:shared_with_user_id (
            id, first_name, last_name, email,
            profile_picture_url, position
          )
        `)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!resourceType && !!resourceId,
  });
};