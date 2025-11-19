// Updated useEmployeeEmail.ts - No major changes, but ensured active filter and ordering for better UX in multi-select.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

// A simplified employee type for the selector
export interface EmployeeOption {
  value: string; // employee id
  label: string; // employee full name
}

export const useEmployeeEmail = () => {
  const authData = getAuthDataFromLocalStorage();
  const organizationId = authData?.organization_id;

  const { data: allEmployees = [], isLoading } = useQuery({
    queryKey: ['all_employees', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, email')
        .eq('organization_id', organizationId)
        .eq('status', 'active') // Fetch only active employees
        .order('first_name', { ascending: true })
        .order('last_name', { ascending: true });

      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }

      // Map to the format needed for the MultiSelect component, exclude self if needed but not specified
      return data.map(emp => ({
        value: emp.id,
        label: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      })).filter(emp => emp.label); // Filter out empty names
    },
    enabled: !!organizationId,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });

  return { allEmployees, isLoading: isLoading };
};