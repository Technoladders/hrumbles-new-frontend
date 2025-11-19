// Updated useLeaveRequests.ts - Enhanced createLeaveRequest mutation to include overlap check in DB (more robust than client-side), using a subquery before insert. Also fixed formData keys to match (additionalRecipients -> additional_recipient, etc., but actually aligned to table: additional_recipients).
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeaveRequest, LeaveRequestFormData, LeaveType } from '@/types/leave-types';
import {getAuthDataFromLocalStorage} from '@/utils/localstorage';

export const useLeaveRequests = (employeeId: string) => {
  const queryClient = useQueryClient();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;

  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ['leave_requests', employeeId],
    queryFn: async () => {
      console.log('Fetching leave requests:', { employeeId });
      if (!employeeId) {
        console.warn('No employeeId provided, returning empty array');
        return [];
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_type:leave_type_id(id, name, icon, color, annual_allowance, monthly_allowance, allow_carryforward, is_active),
          hr_employees:employee_id(id, first_name, last_name, hr_departments(name))
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leave requests:', error);
        toast.error('Failed to load leave requests');
        throw error;
      }

      console.log('Leave requests fetched:', { count: data?.length, data });

      const typedData: LeaveRequest[] = (data || []).map(item => {
        let employeeData = null;
        if (item.hr_employees && typeof item.hr_employees === 'object') {
          const employeeObj = item.hr_employees as { id?: string; first_name?: string; last_name?: string; hr_departments?: { name?: string } };
          if (employeeObj?.id) {
            employeeData = {
              id: employeeObj.id,
              name: `${employeeObj.first_name || ''} ${employeeObj.last_name || ''}`.trim(),
              department: employeeObj.hr_departments?.name || ''
            };
          }
        }

        let leaveTypeData: LeaveType | null = null;
        if (item.leave_type && typeof item.leave_type === 'object' && !('error' in item.leave_type)) {
          leaveTypeData = item.leave_type as LeaveType;
        }

        return {
          ...item,
          leave_type: leaveTypeData,
          employee: employeeData
        } as LeaveRequest;
      });

      return typedData;
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const createLeaveRequest = useMutation({
    mutationFn: async (formData: LeaveRequestFormData) => {
      if (!employeeId) throw new Error('Employee ID is required');
      // Calculate the total working days from the breakdown
      const workingDays = formData.dayBreakdown.reduce((acc, day) => {
        if (day.type === 'full') return acc + 1;
        if (day.type === 'half_am' || day.type === 'half_pm') return acc + 0.5;
        return acc;
      }, 0);
      // We still call the RPC to get the number of holidays in the period
      const { data: daysCalculation, error: calculationError } = await supabase.rpc(
        'calculate_working_and_holiday_days',
        { p_start_date: formData.startDate, p_end_date: formData.endDate }
      );
      if (calculationError) throw calculationError;
     
      const holidayDays = daysCalculation?.[0]?.holiday_days || 0;
      const totalDays = workingDays + holidayDays;

      // Check for overlaps with non-rejected requests
      const { data: overlaps, error: overlapError } = await supabase
        .from('leave_requests')
        .select('id')
        .eq('employee_id', employeeId)
        .gte('start_date', formData.startDate)
        .lte('end_date', formData.endDate)
        .or(`start_date.lte.${formData.endDate},end_date.gte.${formData.startDate}`)
        .neq('status', 'rejected'); // Only block if not rejected

      if (overlapError) {
        console.error('Error checking overlaps:', overlapError);
        throw overlapError;
      }
      if (overlaps && overlaps.length > 0) {
        throw new Error('Cannot request leave for dates that overlap with existing pending or approved requests. Rejected requests are allowed.');
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          employee_id: employeeId,
          leave_type_id: formData.leaveTypeId,
          start_date: formData.startDate,
          end_date: formData.endDate,
          total_days: totalDays,
          working_days: workingDays, // The new calculated value
          holiday_days: holidayDays,
          status: 'pending',
          notes: formData.notes,
          organization_id,
          day_breakdown: formData.dayBreakdown, // Save the JSONB data
          additional_recipients: formData.additionalRecipients || null,
          cc_recipients: formData.ccRecipients || null,
        })
        .select().single();
      if (error) throw error;
      return data as LeaveRequest;
    },
    onSuccess: (newRequest) => {
      queryClient.setQueryData(['leave_requests', employeeId], (old: LeaveRequest[] | undefined) => {
        return old ? [newRequest, ...old] : [newRequest];
      });
      setIsRequestDialogOpen(false);
      toast.success('Leave request submitted successfully');
    },
    onError: (error: any) => {
      console.error('Create leave request failed:', error);
      toast.error(`Failed to create leave request: ${error.message || 'Unknown error'}`);
    }
  });

  const cancelLeaveRequest = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      console.log('Cancelling leave request:', { id, reason, employeeId });
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

      if (error) {
        console.error('Error cancelling leave request:', error);
        throw error;
      }

      console.log('Leave request cancelled:', { id });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests', employeeId] });
      toast.success('Leave request cancelled successfully');
    },
    onError: (error: any) => {
      console.error('Cancel leave request failed:', error);
      toast.error(`Failed to cancel leave request: ${error.message || 'Unknown error'}`);
    }
  });

  const refetchLeaveRequests = useCallback(() => {
    console.log('refetchLeaveRequests called', { employeeId });
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