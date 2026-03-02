import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

interface LeaveApplicationData {
  leave_type_id: string;
  start_date: Date;
  end_date: Date;
  reason: string;
  day_breakdown?: any[]; // For half-days logic later
}

export const useLeaveApplication = () => {
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);
  const authData = getAuthDataFromLocalStorage();

  // 1. Validation Function
  const validateRequest = async (data: LeaveApplicationData) => {
    setIsValidating(true);
    try {
      if (!authData?.employeeId) throw new Error("Employee ID not found");

      // Calculate total days (Simple calculation, can be enhanced for weekends/holidays later)
      // Note: In production, use a proper business-day calculator
      const diffTime = Math.abs(data.end_date.getTime() - data.start_date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const { data: result, error } = await supabase.rpc('validate_leave_request', {
        p_employee_id: authData.employeeId,
        p_leave_type_id: data.leave_type_id,
        p_start_date: data.start_date.toISOString().split('T')[0],
        p_end_date: data.end_date.toISOString().split('T')[0],
        p_total_days: diffDays // Pass calculated days
      });

      if (error) throw error;
      return result as { valid: boolean; message: string };
    } catch (error: any) {
      console.error("Validation Error:", error);
      return { valid: false, message: error.message };
    } finally {
      setIsValidating(false);
    }
  };

  // 2. Submission Mutation
  const submitRequest = useMutation({
    mutationFn: async (data: LeaveApplicationData) => {
      if (!authData?.employeeId || !authData?.organization_id) throw new Error("Auth error");

      // Validate first
      const validation = await validateRequest(data);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Calculate days again
      const diffTime = Math.abs(data.end_date.getTime() - data.start_date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Submit
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          organization_id: authData.organization_id,
          employee_id: authData.employeeId,
          leave_type_id: data.leave_type_id,
          start_date: data.start_date,
          end_date: data.end_date,
          total_days: diffDays,
          reason: data.reason,
          status: 'pending'
        });

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success("Leave request submitted successfully");
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  return {
    submitLeaveRequest: submitRequest.mutate,
    isSubmitting: submitRequest.isPending,
    validateRequest,
    isValidating
  };
};