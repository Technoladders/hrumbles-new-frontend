import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { LeaveRequest } from '@/types/leave-types';

export type EmployeeLeaveDay = {
  date: Date;
  leaveType: {
    id: string;
    name: string;
    color: string;
  };
  requestId: string;
};

export const useEmployeeLeaves = (employeeId?: string, month?: Date) => {
  const [leaveDays, setLeaveDays] = useState<EmployeeLeaveDay[]>([]);

  // Memoize currentMonth, firstDayOfMonth, and lastDayOfMonth to prevent recreation
  const currentMonth = useMemo(() => month || new Date(), [month]);
  const firstDayOfMonth = useMemo(
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
    [currentMonth]
  );
  const lastDayOfMonth = useMemo(
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0),
    [currentMonth]
  );

  const formattedFirstDay = useMemo(() => format(firstDayOfMonth, 'yyyy-MM-dd'), [firstDayOfMonth]);
  const formattedLastDay = useMemo(() => format(lastDayOfMonth, 'yyyy-MM-dd'), [lastDayOfMonth]);

  // Fetch approved leave requests for the employee in this month
  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ['employeeLeaves', employeeId, formattedFirstDay, formattedLastDay],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, leave_type:leave_type_id(*)')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .or(`start_date.lte.${formattedLastDay},end_date.gte.${formattedFirstDay}`)
        .order('start_date');

      if (error) throw error;
      return (data as any) as (LeaveRequest & { leave_type: any })[];
    },
    enabled: !!employeeId,
  });

  // Process leave requests to get individual leave days
  useEffect(() => {
    if (!leaveRequests) return;

    const allDays: EmployeeLeaveDay[] = [];

    leaveRequests.forEach((request) => {
      const startDate = parseISO(request.start_date);
      const endDate = parseISO(request.end_date);

      // Process each day in the leave period
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        // Only include days in the current month
        if (isWithinInterval(currentDate, { start: firstDayOfMonth, end: lastDayOfMonth })) {
          allDays.push({
            date: new Date(currentDate),
            leaveType: {
              id: request.leave_type.id,
              name: request.leave_type.name,
              color: request.leave_type.color,
            },
            requestId: request.id,
          });
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    setLeaveDays(allDays);
  }, [leaveRequests, firstDayOfMonth, lastDayOfMonth]);

  // Function to check if a specific day is a leave day
  const isLeaveDay = (day: Date | null) => {
    if (!day) return false;

    return leaveDays.some(
      (leaveDay) =>
        leaveDay.date.getDate() === day.getDate() &&
        leaveDay.date.getMonth() === day.getMonth() &&
        leaveDay.date.getFullYear() === day.getFullYear()
    );
  };

  // Function to get leave info for a specific day
  const getLeaveInfoForDay = (day: Date | null) => {
    if (!day) return null;

    return leaveDays.find(
      (leaveDay) =>
        leaveDay.date.getDate() === day.getDate() &&
        leaveDay.date.getMonth() === day.getMonth() &&
        leaveDay.date.getFullYear() === day.getFullYear()
    );
  };

  return {
    leaveDays,
    isLoading,
    isLeaveDay,
    getLeaveInfoForDay,
  };
};