// src/hooks/sales/useShareableUsers.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

export interface ShareableUser {
  id: string;               // hr_employees.id
  first_name: string;
  last_name: string;
  email: string;
  position: string | null;
  profile_picture_url: string | null;
}

/**
 * Fetches all active employees in the "Sales & Marketing" department
 * with role = 'employee', excluding the current user.
 * Used to populate the user picker in ShareDialog.
 */
export const useShareableUsers = () => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser     = useSelector((state: any) => state.auth.user);

  return useQuery<ShareableUser[], Error>({
    queryKey: ['shareableUsers', organization_id],
    queryFn: async (): Promise<ShareableUser[]> => {
      if (!organization_id) return [];

      // Step 1 — Get Sales & Marketing department for this org
      const { data: dept, error: deptErr } = await supabase
        .from('hr_departments')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('name', 'Sales & Marketing')
        .single();

      if (deptErr || !dept) return [];

      // Step 2 — Get the 'employee' role id
      const { data: role, error: roleErr } = await supabase
        .from('hr_roles')
        .select('id')
        .eq('name', 'employee')
        .single();

      if (roleErr || !role) return [];

      // Step 3 — Fetch matching employees
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, email, position, profile_picture_url')
        .eq('organization_id', organization_id)
        .eq('department_id', dept.id)
        .eq('role_id', role.id)
        .eq('status', 'active')
        .neq('id', currentUser?.id)
        .order('first_name', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!organization_id && !!currentUser?.id,
    staleTime: 5 * 60 * 1000, // 5 min — dept employees don't change often
  });
};