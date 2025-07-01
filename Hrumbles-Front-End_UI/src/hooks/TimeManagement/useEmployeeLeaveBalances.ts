import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeLeaveBalance, LeaveType } from '@/types/leave-types';
import { toast } from 'sonner';
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

export const useEmployeeLeaveBalances = (employeeId: string) => {
  const queryClient = useQueryClient();
const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;

  const { data: leaveBalances = [], isLoading } = useQuery({
    queryKey: ['employee_leave_balances', employeeId],
    queryFn: async () => {
      console.log('Fetching leave balances:', { employeeId });
      if (!employeeId) {
        console.warn('No employeeId provided, returning empty array');
        return [];
      }

      const currentYear = new Date().getFullYear();

      const { data, error } = await supabase
        .from('employee_leave_balances')
        .select('*, leave_type:leave_type_id(*)')
        .eq('employee_id', employeeId)
        .eq('year', currentYear);

      if (error) {
        console.error('Error fetching leave balances:', error);
        toast.error('Failed to load leave balances');
        throw error;
      }

      console.log('Leave balances fetched:', { count: data?.length, data });
      return data as EmployeeLeaveBalance[];
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave_types'],
    queryFn: async () => {
      console.log('Fetching leave types');
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching leave types:', error);
        toast.error('Failed to load leave types');
        throw error;
      }

      console.log('Leave types fetched:', { count: data?.length, data });
      return data as LeaveType[];
    },
    staleTime: 5 * 60 * 1000
  });

  const initializeLeaveBalances = useMutation({
    mutationFn: async ({ employeeId, leaveTypeIds }: { employeeId: string; leaveTypeIds: string[] }) => {
      console.log('Initializing leave balances:', { employeeId, leaveTypeIds });
      const currentYear = new Date().getFullYear();

      const leaveTypesMap = new Map<string, LeaveType>();
      if (leaveTypes) {
        leaveTypes.forEach(type => leaveTypesMap.set(type.id, type));
      }

      const balancesToInsert = leaveTypeIds.map(leaveTypeId => {
        const leaveType = leaveTypesMap.get(leaveTypeId);
        const annualAllowance = leaveType?.annual_allowance || 0;

        return {
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          year: currentYear,
          remaining_days: annualAllowance,
          used_days: 0,
          carryforward_days: 0,
          organization_id
        };
      });

      const { data, error } = await supabase
        .from('employee_leave_balances')
        .insert(balancesToInsert)
        .select();

      if (error) {
        console.error('Error initializing leave balances:', error);
        throw error;
      }

      console.log('Leave balances initialized:', data);
      return data as EmployeeLeaveBalance[];
    },
    onSuccess: (newBalances) => {
      queryClient.setQueryData(['employee_leave_balances', employeeId], (old: EmployeeLeaveBalance[] | undefined) => {
        return old ? [...old, ...newBalances] : newBalances;
      });
      toast.success('Leave balances initialized successfully');
    },
    onError: (error: any) => {
      console.error('Initialize leave balances failed:', error);
      toast.error(`Failed to initialize leave balances: ${error.message || 'Unknown error'}`);
    }
  });

  const refetchLeaveBalances = () => {
    console.log('refetchLeaveBalances called', { employeeId });
    queryClient.invalidateQueries({ queryKey: ['employee_leave_balances', employeeId] });
  };

  return {
    leaveBalances,
    isLoading,
    initializeLeaveBalances: initializeLeaveBalances.mutateAsync,
    refetchLeaveBalances
  };
};