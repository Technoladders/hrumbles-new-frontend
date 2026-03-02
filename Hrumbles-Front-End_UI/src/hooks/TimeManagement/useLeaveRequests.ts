import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeaveRequest, LeaveRequestFormData, LeaveType } from '@/types/leave-types';
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

export const useLeaveRequests = (employeeId: string) => {
  const queryClient = useQueryClient();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  
  const authData = getAuthDataFromLocalStorage();
  const organization_id = authData?.organization_id;

  // --- 1. Fetch Requests ---
  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ['leave_requests', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_type:leave_type_id(*),
          hr_employees:employee_id(id, first_name, last_name, hr_departments(name))
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leave requests:', error);
        toast.error('Failed to load leave requests');
        throw error;
      }

      // Map Supabase response to Frontend Types
      return data.map(item => ({
        ...item,
        leave_type: item.leave_type,
        employee: item.hr_employees ? {
          id: item.hr_employees.id,
          name: `${item.hr_employees.first_name} ${item.hr_employees.last_name}`.trim(),
          department: item.hr_employees.hr_departments?.name
        } : null
      })) as LeaveRequest[];
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, 
  });

  // --- 2. Create Request (With DB Validation) ---
  const createLeaveRequest = useMutation({
    mutationFn: async (formData: LeaveRequestFormData) => {
      if (!employeeId || !organization_id) throw new Error('Auth details missing');

      // A. Calculate Deduction Amount from Breakdown
      // The breakdown only contains working days (handled by DatePicker), so we sum the weights.
      const requestedDays = formData.dayBreakdown.reduce((acc, day) => {
        if (day.type === 'full') return acc + 1;
        return acc + 0.5; // 'half_am' or 'half_pm'
      }, 0);

      // B. Call Database Validation RPC
      // This checks: Overlaps, Balance, Probation, Gender, Max Consecutive Days
      const { data: validationResult, error: valError } = await supabase.rpc('validate_leave_request', {
        p_employee_id: employeeId,
        p_leave_type_id: formData.leaveTypeId,
        p_start_date: formData.startDate,
        p_end_date: formData.endDate,
        p_total_days: requestedDays
      });

      if (valError) {
        console.error("RPC Error:", valError);
        throw new Error("Validation failed due to system error.");
      }

      // C. Handle Logic Failure (e.g. Not enough balance)
      // The RPC returns { "valid": boolean, "message": string }
      if (validationResult && !validationResult.valid) {
        throw new Error(validationResult.message); 
      }

      // D. Insert if Valid
      // We calculate holiday_days just for record keeping, though logic relies on requestedDays
      const { data: daysCalc } = await supabase.rpc(
        'calculate_working_and_holiday_days', 
        { p_start_date: formData.startDate, p_end_date: formData.endDate }
      );
      const holidayDays = daysCalc?.[0]?.holiday_days || 0;

      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          organization_id,
          employee_id: employeeId,
          leave_type_id: formData.leaveTypeId,
          start_date: formData.startDate,
          end_date: formData.endDate,
          total_days: requestedDays, // This is what deducts from balance
          working_days: requestedDays, 
          holiday_days: holidayDays,
          status: 'pending',
          notes: formData.notes,
          day_breakdown: formData.dayBreakdown, // Store the JSON
          additional_recipients: formData.additionalRecipients || [],
          cc_recipients: formData.ccRecipients || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee_leave_balances', employeeId] }); // Balance changes on pending!
      setIsRequestDialogOpen(false);
      toast.success('Leave request submitted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit request');
    }
  });

  // --- 3. Cancel Request ---
  const cancelLeaveRequest = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          cancelled_by: employeeId
        })
        .eq('id', id)
        .eq('employee_id', employeeId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employee_leave_balances', employeeId] }); // Refund pending balance
      toast.success('Leave request cancelled');
    },
    onError: (error: any) => {
      toast.error(`Failed to cancel: ${error.message}`);
    }
  });

  const refetchLeaveRequests = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['leave_requests', employeeId] });
  }, [queryClient, employeeId]);

  return {
    leaveRequests,
    loading: isLoading,
    isLoading,
    isSubmitting: createLeaveRequest.isPending || cancelLeaveRequest.isPending,
    createLeaveRequest: createLeaveRequest.mutateAsync,
    cancelLeaveRequest: cancelLeaveRequest.mutateAsync,
    refetchLeaveRequests,
    isRequestDialogOpen,
    setIsRequestDialogOpen
  };
};