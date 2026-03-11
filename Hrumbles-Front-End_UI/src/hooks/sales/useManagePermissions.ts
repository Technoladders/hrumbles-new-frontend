// src/hooks/sales/useManagePermissions.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@chakra-ui/react';
import { useSelector } from 'react-redux';

export interface UpsertSharePayload {
  resource_type: 'workspace' | 'file';
  resource_id: string;
  shared_with_user_id: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

export const useManagePermissions = () => {
  const queryClient   = useQueryClient();
  const toast         = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser     = useSelector((state: any) => state.auth.user);

  const invalidate = (resourceType: string, resourceId: string) => {
    queryClient.invalidateQueries({ queryKey: ['listPermissions', resourceType, resourceId] });
    queryClient.invalidateQueries({ queryKey: ['myListAccess'] });
  };

  /**
   * Insert or update a share record.
   * Uses upsert on (resource_type, resource_id, shared_with_user_id).
   */
  const upsertShare = useMutation({
    mutationFn: async (payload: UpsertSharePayload) => {
      const { data, error } = await supabase
        .from('list_share_permissions')
        .upsert(
          {
            ...payload,
            organization_id,
            granted_by: currentUser?.id,
          },
          { onConflict: 'resource_type,resource_id,shared_with_user_id' },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Permissions updated', status: 'success', duration: 2000, isClosable: true });
      invalidate(variables.resource_type, variables.resource_id);
    },
    onError: (e: any) => toast({
      title: 'Failed to update permissions',
      description: e.message,
      status: 'error', duration: 5000, isClosable: true,
    }),
  });

  /**
   * Remove a share record entirely (revoke all access).
   */
  const revokeShare = useMutation({
    mutationFn: async ({
      shareId,
      resourceType,
      resourceId,
    }: { shareId: string; resourceType: string; resourceId: string }) => {
      const { error } = await supabase
        .from('list_share_permissions')
        .delete()
        .eq('id', shareId);
      if (error) throw error;
      return { resourceType, resourceId };
    },
    onSuccess: (result) => {
      toast({ title: 'Access revoked', status: 'success', duration: 2000, isClosable: true });
      invalidate(result.resourceType, result.resourceId);
    },
    onError: (e: any) => toast({
      title: 'Failed to revoke access',
      description: e.message,
      status: 'error', duration: 5000, isClosable: true,
    }),
  });

  return { upsertShare, revokeShare };
};