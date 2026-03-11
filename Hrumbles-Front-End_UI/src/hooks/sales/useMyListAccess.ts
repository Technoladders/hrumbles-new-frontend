// src/hooks/sales/useMyListAccess.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

export interface EffectivePermissions {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  /** true = directly shared, false = inherited from parent workspace */
  isDirect: boolean;
}

export interface MyListAccess {
  /** workspace id → permissions */
  workspaceAccess: Map<string, EffectivePermissions>;
  /** file id → effective permissions (direct OR inherited from workspace) */
  fileAccess: Map<string, EffectivePermissions>;
}

/**
 * For the currently logged-in employee:
 * fetches all their share records and builds two lookup Maps.
 *
 * Inheritance rule (industry standard "most permissive wins"):
 *   - A file that is explicitly shared uses its own permissions.
 *   - A file that is NOT explicitly shared BUT its workspace is shared
 *     inherits the workspace permissions.
 *   - If BOTH exist, permissions are OR-merged (more permissive wins).
 *
 * Admins / superadmins should never call this — they have full access.
 */
export const useMyListAccess = () => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser     = useSelector((state: any) => state.auth.user);

  return useQuery<MyListAccess, Error>({
    queryKey: ['myListAccess', organization_id, currentUser?.id],
    queryFn: async (): Promise<MyListAccess> => {
      if (!organization_id || !currentUser?.id) {
        return { workspaceAccess: new Map(), fileAccess: new Map() };
      }

      const { data, error } = await supabase
        .from('list_share_permissions')
        .select('resource_type, resource_id, can_read, can_write, can_delete')
        .eq('organization_id', organization_id)
        .eq('shared_with_user_id', currentUser.id);

      if (error) throw error;
      if (!data?.length) return { workspaceAccess: new Map(), fileAccess: new Map() };

      const workspaceAccess = new Map<string, EffectivePermissions>();
      const fileAccess      = new Map<string, EffectivePermissions>();

      data.forEach(row => {
        const perms: EffectivePermissions = {
          can_read:   row.can_read,
          can_write:  row.can_write,
          can_delete: row.can_delete,
          isDirect:   true,
        };
        if (row.resource_type === 'workspace') {
          workspaceAccess.set(row.resource_id, perms);
        } else {
          fileAccess.set(row.resource_id, perms);
        }
      });

      return { workspaceAccess, fileAccess };
    },
    enabled: !!organization_id && !!currentUser?.id,
  });
};

/**
 * Merge a workspace-inherited permission with an optional direct file permission.
 * Most-permissive-wins: if either grants write, the merged result grants write.
 */
export const mergePermissions = (
  wsPerms: EffectivePermissions | undefined,
  filePerms: EffectivePermissions | undefined,
): EffectivePermissions | null => {
  if (!wsPerms && !filePerms) return null;
  if (!wsPerms) return { ...filePerms!, isDirect: true };
  if (!filePerms) return { ...wsPerms, isDirect: false }; // inherited

  return {
    can_read:   wsPerms.can_read   || filePerms.can_read,
    can_write:  wsPerms.can_write  || filePerms.can_write,
    can_delete: wsPerms.can_delete || filePerms.can_delete,
    isDirect:   filePerms.isDirect,
  };
};