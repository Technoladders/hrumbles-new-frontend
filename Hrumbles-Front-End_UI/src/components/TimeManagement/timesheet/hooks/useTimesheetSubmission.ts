import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DetailedTimesheetEntry } from '@/types/time-tracker-types';
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';
import { DateTime } from 'luxon';

interface ProjectEntry {
  projectId: string;
  clockIn?: string;
  clockOut?: string;
  hours: number;
  report: string;
  clientId?: string;
}

interface SubmissionParams {
  employeeId: string;
  title: string;
  workReport: string;
  totalWorkingHours: number;
  employeeHasProjects: boolean;
  projectEntries: ProjectEntry[];
  detailedEntries: DetailedTimesheetEntry[];
  timeLogId?: string;
  date: Date;
  clockIn?: string;
  clockOut?: string;
  organization_id: string;
}

export const useTimesheetSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitTimesheetHook = async ({
    employeeId,
    title,
    workReport,
    totalWorkingHours,
    employeeHasProjects,
    projectEntries,
    detailedEntries,
    timeLogId,
    date,
    clockIn,
    clockOut,
    organization_id,
  }: SubmissionParams): Promise<boolean> => {
    setIsSubmitting(true);

    const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { userId } = authData;

    try {
      // Log top-level clockIn and clockOut
      if (clockIn == null || clockIn === '') {
        console.warn('Debug: Top-level clockIn is null, undefined, or empty', { employeeId, date: date.toISOString() });
      } else {
        console.log('Debug: Top-level clockIn', { clockIn, employeeId, date: date.toISOString() });
      }
      if (clockOut == null || clockOut === '') {
        console.warn('Debug: Top-level clockOut is null, undefined, or empty', { employeeId, date: date.toISOString() });
      } else {
        console.log('Debug: Top-level clockOut', { clockOut, employeeId, date: date.toISOString() });
      }

      // Calculate earliest clock-in and latest clock-out from projectEntries
      let earliestClockIn: string | null = null;
      let latestClockOut: string | null = null;

      if (employeeHasProjects && projectEntries.length > 0) {
        const validEntries = projectEntries.filter(
          (entry) => entry.clockIn && entry.clockOut && entry.hours > 0
        );
        if (validEntries.length > 0) {
          earliestClockIn = validEntries.reduce((earliest, entry) =>
            !earliest || (entry.clockIn && entry.clockIn < earliest) ? entry.clockIn : earliest,
            validEntries[0].clockIn || ''
          );
          latestClockOut = validEntries.reduce((latest, entry) =>
            !latest || (entry.clockOut && entry.clockOut > latest) ? entry.clockOut : latest,
            validEntries[0].clockOut || ''
          );
        }
      }

      // Log earliestClockIn and latestClockOut
      if (earliestClockIn == null) {
        console.warn('Debug: earliestClockIn is null (no valid project entries)', { employeeHasProjects, projectEntries, employeeId, date: date.toISOString() });
      } else {
        console.log('Debug: earliestClockIn from projectEntries', { earliestClockIn, employeeId, date: date.toISOString() });
      }
      if (latestClockOut == null) {
        console.warn('Debug: latestClockOut is null (no valid project entries)', { employeeHasProjects, projectEntries, employeeId, date: date.toISOString() });
      } else {
        console.log('Debug: latestClockOut from projectEntries', { latestClockOut, employeeId, date: date.toISOString() });
      }

      // Convert date and times to ISO format, assuming clockIn and clockOut are in IST
      const dateString = date.toISOString().split('T')[0];

      const clockInTime = clockIn && clockIn !== ''
        ? DateTime.fromFormat(`${dateString} ${clockIn}`, 'yyyy-MM-dd HH:mm', { zone: 'Asia/Kolkata' })
            .toUTC()
            .toISO()
        : earliestClockIn
          ? DateTime.fromFormat(`${dateString} ${earliestClockIn}`, 'yyyy-MM-dd HH:mm', { zone: 'Asia/Kolkata' })
              .toUTC()
              .toISO()
          : null;

      const clockOutTime = clockOut && clockOut !== ''
        ? DateTime.fromFormat(`${dateString} ${clockOut}`, 'yyyy-MM-dd HH:mm', { zone: 'Asia/Kolkata' })
            .toUTC()
            .toISO()
        : latestClockOut
          ? DateTime.fromFormat(`${dateString} ${latestClockOut}`, 'yyyy-MM-dd HH:mm', { zone: 'Asia/Kolkata' })
              .toUTC()
              .toISO()
          : null;

      // Log final clockInTime and clockOutTime
      console.log('Debug: Final clockInTime', {
        clockInTime,
        source: clockIn && clockIn !== '' ? 'top-level' : earliestClockIn ? 'projectEntries' : 'null',
        employeeId,
        date: date.toISOString(),
      });
      console.log('Debug: Final clockOutTime', {
        clockOutTime,
        source: clockOut && clockOut !== '' ? 'top-level' : latestClockOut ? 'projectEntries' : 'null',
        employeeId,
        date: date.toISOString(),
      });

      function parsePackedHours(hoursStrOrNum: string | number): number {
        const str = String(hoursStrOrNum);
        const [hourPart, minutePart] = str.split('.').map(Number);
        const hours = hourPart || 0;
        const minutes = minutePart || 0;
        return hours * 60 + minutes;
      }

      // Calculate duration_minutes
      const durationMinutes = parsePackedHours(totalWorkingHours);

      const notesObject = { title, workReport };
      const projectTimeData = employeeHasProjects
        ? {
            projects: projectEntries
              .filter((entry) => entry.projectId && entry.hours > 0)
              .map(({ projectId, hours, report, clockIn, clockOut, clientId }) => ({
                projectId,
                hours,
                report,
                clockIn,
                clockOut,
                clientId,
              })),
          }
        : { entries: detailedEntries };

      let targetTimeLogId = timeLogId;

      if (!targetTimeLogId) {
        // Log insertion payload
        const insertPayload = {
          employee_id: employeeId,
          date: dateString,
          clock_in_time: clockInTime,
          clock_out_time: clockOutTime,
          notes: JSON.stringify(notesObject),
          total_working_hours: totalWorkingHours,
          duration_minutes: durationMinutes,
          project_time_data: projectTimeData,
          status: 'normal',
          is_submitted: true, // Set to true since we're submitting
          organization_id,
        };
        console.log('Debug: Supabase insert payload', insertPayload);

        const { data, error: insertError } = await supabase
          .from('time_logs')
          .insert(insertPayload)
          .select('id')
          .single();

        if (insertError) {
          console.error('Debug: Supabase insert error', insertError);
          throw insertError;
        }
        targetTimeLogId = data.id;

        // Insert into timesheet_approvals
        const approvalPayload = {
          time_log_id: targetTimeLogId,
          employee_id: employeeId,
          status: 'pending',
          submitted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          organization_id,
        };
        console.log('Debug: Supabase timesheet_approvals insert payload', approvalPayload);

        const { error: approvalError } = await supabase
          .from('timesheet_approvals')
          .insert(approvalPayload);

        if (approvalError) {
          console.error('Debug: Supabase timesheet_approvals insert error', approvalError);
          throw approvalError;
        }
      } else {
        // Update existing time_log
        const updatePayload = {
          clock_in_time: clockInTime,
          clock_out_time: clockOutTime,
          notes: JSON.stringify(notesObject),
          total_working_hours: totalWorkingHours,
          duration_minutes: durationMinutes,
          project_time_data: projectTimeData,
          is_submitted: true, // Set to true since we're submitting
          updated_at: new Date().toISOString(),
        };
        console.log('Debug: Supabase update payload', updatePayload);

        const { error: updateError } = await supabase
          .from('time_logs')
          .update(updatePayload)
          .eq('id', targetTimeLogId)
          .eq('employee_id', employeeId)
          .eq('is_submitted', false);

        if (updateError) {
          console.error('Debug: Supabase update error', updateError);
          throw updateError;
        }

        // Check if timesheet_approvals record exists
        const { data: existingApproval, error: fetchApprovalError } = await supabase
          .from('timesheet_approvals')
          .select('id')
          .eq('time_log_id', targetTimeLogId)
          .single();

        if (fetchApprovalError && fetchApprovalError.code !== 'PGRST116') {
          console.error('Debug: Supabase timesheet_approvals fetch error', fetchApprovalError);
          throw fetchApprovalError;
        }

        if (!existingApproval) {
          // Insert into timesheet_approvals
          const approvalPayload = {
            time_log_id: targetTimeLogId,
            employee_id: employeeId,
            status: 'pending',
            submitted_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            organization_id,
          };
          console.log('Debug: Supabase timesheet_approvals insert payload', approvalPayload);

          const { error: approvalError } = await supabase
            .from('timesheet_approvals')
            .insert(approvalPayload);

          if (approvalError) {
            console.error('Debug: Supabase timesheet_approvals insert error', approvalError);
            throw approvalError;
          }
        } else {
          // Update existing timesheet_approvals record
          const approvalUpdatePayload = {
            status: 'pending',
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          console.log('Debug: Supabase timesheet_approvals update payload', approvalUpdatePayload);

          const { error: approvalUpdateError } = await supabase
            .from('timesheet_approvals')
            .update(approvalUpdatePayload)
            .eq('time_log_id', targetTimeLogId);

          if (approvalUpdateError) {
            console.error('Debug: Supabase timesheet_approvals update error', approvalUpdateError);
            throw approvalUpdateError;
          }
        }
      }

      toast.success('Timesheet submitted successfully');
      return true;
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      toast.error('Failed to submit timesheet');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, submitTimesheet: submitTimesheetHook };
};