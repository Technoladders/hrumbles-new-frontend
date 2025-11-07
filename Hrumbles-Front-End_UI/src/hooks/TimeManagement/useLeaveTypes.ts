
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveType } from '@/types/leave-types';
import { toast } from '@/hooks/use-toast';
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

export const useLeaveTypes = () => {
  const queryClient = useQueryClient();
  const [isAddPolicyDialogOpen, setIsAddPolicyDialogOpen] = useState(false);
  const authData = getAuthDataFromLocalStorage();
      if (!authData) {
        throw new Error('Failed to retrieve authentication data');
      }
      const { organization_id, userId } = authData;

  // Fetch all leave types
  const { data: leaveTypes, isLoading } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return (data as any) as LeaveType[];
    }
  });

  // Helper function to initialize leave balances for all employees
  const initializeLeaveBalancesForAllEmployees = async (leaveTypeId: string, annualAllowance: number) => {
    try {
      // Get all employees
      const { data: employees, error: employeesError } = await supabase
        .from('hr_employees')
        .select('id');
      
      if (employeesError) throw employeesError;
      
      if (employees && employees.length > 0) {
        const currentYear = new Date().getFullYear();
        
        // Create balance records for each employee
        const balancesToInsert = employees.map(employee => ({
          employee_id: employee.id,
          leave_type_id: leaveTypeId,
          year: currentYear,
          remaining_days: annualAllowance,
          used_days: 0,
          carryforward_days: 0,
          organization_id
        }));
        
        const { error: insertError } = await supabase
          .from('employee_leave_balances')
          .insert(balancesToInsert);
        
        if (insertError) {
          console.error('Error initializing leave balances:', insertError);
        }
      }
    } catch (error) {
      console.error('Error in initializing balances for all employees:', error);
    }
  };

  // Add a new leave type
  const addLeaveTypeMutation = useMutation({
    mutationFn: async (newLeaveType: Omit<LeaveType, 'id' | 'created_at' | 'updated_at'>) => {

      const payload = {
      ...newLeaveType,
      organization_id, 
    };
      const { data, error } = await supabase
        .from('leave_types')
        .insert([payload])
        .select()
        .single();
      
      if (error) throw error;
      
      // After creating the leave type, initialize balances for all employees
      await initializeLeaveBalancesForAllEmployees(data.id, newLeaveType.annual_allowance);
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave type has been added successfully and balances initialized for all employees",
      });
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
      queryClient.invalidateQueries({ queryKey: ['employeeLeaveBalances'] });
      setIsAddPolicyDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add leave type: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update a leave type
  const updateLeaveTypeMutation = useMutation({
    mutationFn: async (leaveType: Partial<LeaveType> & { id: string }) => {
      const { id, ...updates } = leaveType;
      const { data, error } = await supabase
        .from('leave_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // If annual_allowance is being updated, update remaining days for all employees
      if (updates.annual_allowance !== undefined) {
        try {
          // Get all employee leave balances for this leave type
          const { data: balances, error: balancesError } = await supabase
            .from('employee_leave_balances')
            .select('id, used_days, remaining_days')
            .eq('leave_type_id', id)
            .eq('year', new Date().getFullYear());
          
          if (balancesError) throw balancesError;
          
          // Update each balance to adjust remaining_days based on the new allowance
          for (const balance of balances || []) {
            const newRemainingDays = updates.annual_allowance - balance.used_days;
            
            await supabase
              .from('employee_leave_balances')
              .update({ remaining_days: newRemainingDays })
              .eq('id', balance.id);
          }
        } catch (err) {
          console.error('Error updating leave balances:', err);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave type has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
      queryClient.invalidateQueries({ queryKey: ['employeeLeaveBalances'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update leave type: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete a leave type
  const deleteLeaveTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leave_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave type has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
      queryClient.invalidateQueries({ queryKey: ['employeeLeaveBalances'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete leave type: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  return {
    leaveTypes: leaveTypes || [],
    isLoading,
    addLeaveType: addLeaveTypeMutation.mutate,
    updateLeaveType: updateLeaveTypeMutation.mutate,
    deleteLeaveType: deleteLeaveTypeMutation.mutate,
    isAddPolicyDialogOpen,
    setIsAddPolicyDialogOpen
  };
};
