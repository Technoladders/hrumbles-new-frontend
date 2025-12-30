import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimeLog, DetailedTimesheetEntry } from "@/types/time-tracker-types";
import { toast } from "sonner";
import { TaskupTimeLogDetails } from "./dialog/TaskupTimeLogDetails";
import { TimesheetBasicInfo } from "./dialog/TimesheetBasicInfo";
import { TimesheetDialogContent } from './dialog/TimesheetDialogContent';
import { TimesheetEditForm } from "./dialog/TimesheetEditForm";
import { TimesheetProjectDetails } from "./TimesheetProjectDetails";
import { RecruitmentReportForm } from './dialog/RecruitmentReportForm';
import { ViewRecruitmentReport } from './dialog/ViewRecruitmentReport';
import { useTimesheetValidation } from './hooks/useTimesheetValidation';
import { useSelector } from 'react-redux';
import { fetchHrProjectEmployees, submitTimesheet } from '@/api/timeTracker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import { fetchEmployees } from '@/api/user';
import { MultiSelect } from '@/components/ui/multi-selector';
import { DateTime } from 'luxon';

interface TaskupViewTimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timesheet: TimeLog;
  onSubmitTimesheet: () => void;
  employeeHasProjects: boolean;
}

interface Submission {
  candidate_name: string;
  email: string;
  phone: string;
  experience: string;
  skills: string;
  match_score: string;
  overall_score: string;
  applied_date: string;
  submission_date: string;
  applied_from: string;
  current_salary: string;
  expected_salary: string;
  location: string;
  preferred_location: string;
  notice_period: string;
  resume_url: string;
  main_status: string;
  sub_status: string;
  interview_date: string;
  interview_time: string;
  interview_type: string;
  interview_round: string;
  interviewer_name: string;
  interview_result: string;
  reject_reason: string;
  ctc: string;
  joining_date: string;
  created_at: string;
  job_title: string;
  client_name: string;
}

interface EmployeeOption {
  value: string; // employee id
  label: string; // employee name
}

export const TaskupViewTimesheetDialog: React.FC<TaskupViewTimesheetDialogProps> = ({
  open,
  onOpenChange,
  timesheet,
  onSubmitTimesheet,
  employeeHasProjects,
}) => {
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const employeeId = user?.id || "";
  const [date, setDate] = useState<Date>(new Date(timesheet?.date || Date.now()));
  
  
  // Core State
  const [isEditing, setIsEditing] = useState(!timesheet?.is_submitted);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(true);

  // Project-based employee state
  const [title, setTitle] = useState(timesheet?.title || '');
  const [workReport, setWorkReport] = useState(timesheet?.notes || '');
  const [totalWorkingHours, setTotalWorkingHours] = useState(timesheet?.total_working_hours || 8);
  const [detailedEntries, setDetailedEntries] = useState<DetailedTimesheetEntry[]>(timesheet?.project_time_data?.projects || []);
  const [projectEntries, setProjectEntries] = useState<any[]>(timesheet?.project_time_data?.projects || []);
  const [hrProjectEmployees, setHrProjectEmployees] = useState<any[]>([]);

  // Non-project employee state
  const [formData, setFormData] = useState({ workReport: timesheet?.notes || '' });
  
  // Modified: Add temporary state declarations after the existing core state
const [temporaryClockOutTime, setTemporaryClockOutTime] = useState<string | null>(null);
const [temporaryDurationMinutes, setTemporaryDurationMinutes] = useState<number | null>(null);

  // EOD Report State
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [allEmployees, setAllEmployees] = useState<EmployeeOption[]>([]);
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([]);

  // NEW: Add formErrors state for recruiter validation
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  const { validateForm } = useTimesheetValidation();

  const [recruitmentReport, setRecruitmentReport] = useState<any>({
  workStatus: { profilesWorkedOn: '', profilesUploaded: 0 },
  atsReport: { resumesATS: 0, resumesTalentPool: 0 },
  candidateStatus: { paidSheet: 0, unpaidSheet: 0, linedUp: 0, onField: 0 },
  activitySummary: { contacted: 0, totalCalls: 0, connected: 0, notConnected: 0, callBack: 0, proofNote: '' },
  scheduling: [],
  walkIns: { expected: 0, proofAttached: false, reminderNeeded: false },
  qualityCheck: { reviewedCount: 0, candidateNames: '' },
  targets: { source: 0, calls: 0, lineups: 0, closures: 0 }
});

// NEW: Clear formErrors when recruitmentReport changes
useEffect(() => {
  setFormErrors({});
}, [recruitmentReport]);

const validateRecruiterReport = (report: any) => {
  if (!isRecruiter) return true;

  // 1. Work Status
  if (!report.workStatus?.profilesWorkedOn || !report.workStatus?.profilesUploaded) return false;
  // 2. ATS Report
  if (!report.atsReport?.resumesATS || !report.atsReport?.resumesTalentPool) return false;
  // 6. Walkins
  if (!report.walkins?.expected || !report.walkins?.proofAttached || !report.walkins?.reminderNeeded) return false;
  // 7. Quality
  if (!report.qualityCheck?.reviewedCount || !report.qualityCheck?.candidateNames) return false;
  // 8. Targets
  const targets = report.targets || {};
  if (!targets.pendingDeadlines || !targets['profiles to source'] || !targets['Calls to make'] || !targets['Lineups to achieve'] || !targets['Expected closures']) return false;

  return true;
};

// NEW: Add validateAndSubmit function
const validateAndSubmit = async () => {
  const errors: Record<string, boolean> = {};
 
  // Basic validation checks (integrate with existing validateForm for non-recruiter fields)
  const baseValidation = validateForm({
    title,
    workReport: formData.workReport,
    totalWorkingHours: totalWorkingHours,
    employeeHasProjects,
    projectEntries,
    detailedEntries: projectEntries
  });
  if (!baseValidation) {
    // For non-recruiter errors, you can set a generic error or handle via existing toast
    toast.error("Please fill all required fields.");
    return;
  }

  // Recruiter-specific validation checks
  if (isRecruiter) {
    if (!recruitmentReport.workStatus?.profilesWorkedOn) errors['workStatus.profilesWorkedOn'] = true;
    if (!recruitmentReport.workStatus?.profilesUploaded) errors['workStatus.profilesUploaded'] = true;
    if (!recruitmentReport.atsReport?.resumesATS) errors['atsReport.resumesATS'] = true;
    if (!recruitmentReport.atsReport?.resumesTalentPool) errors['atsReport.resumesTalentPool'] = true;
   
    // Validate targets (keys with spaces)
    ["profiles to source", "Calls to make", "Lineups to achieve", "Expected closures"].forEach(k => {
        if (!recruitmentReport.targets?.[k]) errors[`targets.${k}`] = true;
    });
    // Validate Status Arrays
    ['paid', 'unpaid', 'linedUp', 'onField'].forEach(status => {
        (recruitmentReport.candidateStatus?.[status] || []).forEach((c: any, i: number) => {
            if (!c.name) errors[`candidateStatus.${status}.${i}.name`] = true;
            if (!c.mobile) errors[`candidateStatus.${status}.${i}.mobile`] = true;
            if (!c.date) errors[`candidateStatus.${status}.${i}.date`] = true;
            if (status === 'onField' && !c.status) errors[`candidateStatus.${status}.${i}.status`] = true;
        });
    });

    // Walkins validation (added for completeness based on existing validateRecruiterReport)
    if (!recruitmentReport.walkIns?.expected) errors['walkIns.expected'] = true;
    if (!recruitmentReport.walkIns?.reminderNeeded) errors['walkIns.reminderNeeded'] = true;
    // Quality Check validation
    if (!recruitmentReport.qualityCheck?.reviewedCount) errors['qualityCheck.reviewedCount'] = true;
    if (!recruitmentReport.qualityCheck?.candidateNames) errors['qualityCheck.candidateNames'] = true;
  }
  
  setFormErrors(errors);
  if (Object.keys(errors).length > 0) {
    toast.error("Please fill all mandatory recruitment fields highlighted in red.");
    return;
  }
  // Proceed to original handleSubmit logic
  await handleSubmit();
};

  // Update useEffect to load existing report if viewing
useEffect(() => {
  if (timesheet?.recruiter_report_data && open) {
    setRecruitmentReport(timesheet.recruiter_report_data);
  }
}, [timesheet, open]);

  // Combined data fetching and setup effect
  useEffect(() => {
    if (open && organization_id && employeeId) {
      const setupDialog = async () => {
        setIsLoading(true);
        try {
          // Fetch data for project-based employees
          if (employeeHasProjects) {
            const data = await fetchHrProjectEmployees(employeeId);
            setHrProjectEmployees(data);
          }

          // Fetch all employees for recipient dropdown
          const employees = await fetchEmployees(organization_id);
          setAllEmployees(employees.map(e => ({ value: e.email, label: `${e.first_name} ${e.last_name}` })));
          
          // Determine if user is a recruiter to show candidate submissions
          const { data: employeeData } = await supabase.from("hr_employees").select("department_id").eq("id", employeeId).single();
          if (employeeData?.department_id) {
            const { data: deptData } = await supabase.from("hr_departments").select("name").eq("id", employeeData.department_id).single();
            const recruiterStatus = deptData?.name === "Human Resource";
            setIsRecruiter(recruiterStatus);
            if (recruiterStatus) await fetchSubmissions();
          }
        } catch (error) {
          console.error("Error setting up dialog:", error);
          toast.error("Failed to load necessary data.");
        } finally {
          setIsLoading(false);
        }
      };
      setupDialog();
    }
  }, [open, organization_id, employeeId, employeeHasProjects]);

 // Modified: Remove initial values from state declarations (e.g., useState('') -> useState('')) and add this new useEffect for initialization and temporary calculation
// Initialize form state when the dialog opens or timesheet changes
useEffect(() => {
  if (timesheet && open) {
    setTitle(timesheet.title || '');
    setWorkReport(timesheet.notes || '');
    setTotalWorkingHours(timesheet?.total_working_hours || 8);
    setDetailedEntries(timesheet?.project_time_data?.projects || []);
    setProjectEntries(timesheet?.project_time_data?.projects || []);
    setFormData({ workReport: timesheet.notes || '' });
    setDate(new Date(timesheet.date));
    setIsEditing(!timesheet.is_submitted);

    if (!timesheet.is_submitted) {
      const nowISO = new Date().toISOString();
      setTemporaryClockOutTime(nowISO);

      if (timesheet.clock_in_time) {
        const clockInTime = DateTime.fromISO(timesheet.clock_in_time);
        const tempClockOutTime = DateTime.fromISO(nowISO);
        
        const diffInMinutes = tempClockOutTime.diff(clockInTime, 'minutes').toObject().minutes || 0;
        
        const totalBreakMinutes = timesheet.break_logs?.reduce(
          (sum, b) => sum + (b.duration_minutes || 0), 0
        ) || 0;
          
        const netDuration = Math.floor(diffInMinutes) - totalBreakMinutes;

        setTemporaryDurationMinutes(netDuration > 0 ? netDuration : 0);
      } else {
        setTemporaryDurationMinutes(0);
      }
    } else {
      setTemporaryClockOutTime(null);
      setTemporaryDurationMinutes(null);
    }
  }
}, [timesheet, open]);

// Modified: Update the existing useEffect for calculating totalHours to incorporate temporary values and net duration (subtract breaks)
useEffect(() => {
  let totalHours = timesheet?.total_working_hours || 8;

  if (timesheet?.clock_in_time) {
    let clockOutTime = temporaryClockOutTime || timesheet?.clock_out_time;
    if (clockOutTime) {
      const clockIn = new Date(timesheet.clock_in_time);
      const clockOut = new Date(clockOutTime);
      const diffMs = clockOut.getTime() - clockIn.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      const totalBreakMinutes = timesheet.break_logs?.reduce((sum, b) => sum + (b.duration_minutes || 0), 0) || 0;
      const netMinutes = Math.floor(diffMinutes) - totalBreakMinutes;
      totalHours = Math.round((netMinutes / 60) * 100) / 100;
    }
  }

  setTotalWorkingHours(totalHours);
  setFormData((prev) => ({ ...prev, totalHours }));
  console.log('Calculated login hours:', { totalHours, clockIn: timesheet?.clock_in_time, clockOut: temporaryClockOutTime || timesheet?.clock_out_time });

   // Updated: Remove recruiter validation from here; only base form validation
  setIsFormValid(validateForm({
    title,
    workReport: formData.workReport,
    totalWorkingHours: totalHours,
    employeeHasProjects,
    projectEntries,
    detailedEntries: projectEntries
  }));
}, [timesheet, temporaryClockOutTime, temporaryDurationMinutes, employeeHasProjects, formData.workReport, title, projectEntries, detailedEntries]);

  const fetchSubmissions = async () => {
    if (!employeeId || !timesheet) return;
    setIsLoading(true);
    try {
      const targetDate = timesheet.date;
      const dateStart = startOfDay(new Date(targetDate));
      const dateEnd = endOfDay(new Date(targetDate));

      const { data: candidates, error } = await supabase
        .from("hr_job_candidates")
        .select(`
          name,
          email,
          phone,
          experience,
          skills,
          match_score,
          overall_score,
          applied_date,
          submission_date,
          applied_from,
          current_salary,
          expected_salary,
          location,
          preferred_location,
          notice_period,
          resume_url,
          main_status_id,
          sub_status_id,
          interview_date,
          interview_time,
          interview_type,
          round,
          interviewer_name,
          interview_result,
          reject_reason,
          ctc,
          joining_date,
          created_at,
          status:job_statuses!hr_job_candidates_main_status_id_fkey(name),
          sub_status:job_statuses!hr_job_candidates_sub_status_id_fkey(name),
          hr_jobs!hr_job_candidates_job_id_fkey(title, client_owner)
        `)
        .eq("created_by", employeeId)
        .gte("created_at", format(dateStart, "yyyy-MM-dd'T'HH:mm:ss"))
        .lte("created_at", format(dateEnd, "yyyy-MM-dd'T'HH:mm:ss"));

      if (error) throw error;

      const formattedSubmissions: Submission[] = candidates.map((candidate: any) => ({
        candidate_name: candidate.name || 'n/a',
        email: candidate.email || 'n/a',
        phone: candidate.phone || 'n/a',
        experience: candidate.experience || 'n/a',
        skills: candidate.skills?.length ? candidate.skills.join(', ') : 'n/a',
        match_score: candidate.match_score?.toString() || 'n/a',
        overall_score: candidate.overall_score?.toString() || 'n/a',
        applied_date: candidate.applied_date ? format(new Date(candidate.applied_date), 'dd:MM:yyyy') : 'n/a',
        submission_date: candidate.submission_date || 'n/a',
        applied_from: candidate.applied_from || 'n/a',
        current_salary: candidate.current_salary ? `₹${candidate.current_salary}` : 'n/a',
        expected_salary: candidate.expected_salary ? `₹${candidate.expected_salary}` : 'n/a',
        location: candidate.location || 'n/a',
        preferred_location: candidate.preferred_location || 'n/a',
        notice_period: candidate.notice_period || 'n/a',
        resume_url: candidate.resume_url || 'n/a',
        main_status: candidate.status?.name || 'n/a',
        sub_status: candidate.sub_status?.name || 'n/a',
        interview_date: candidate.interview_date || 'n/a',
        interview_time: candidate.interview_time || 'n/a',
        interview_type: candidate.interview_type || 'n/a',
        interview_round: candidate.round || 'n/a',
        interviewer_name: candidate.interviewer_name || 'n/a',
        interview_result: candidate.interview_result || 'n/a',
        reject_reason: candidate.reject_reason || 'n/a',
        ctc: candidate.ctc || 'n/a',
        joining_date: candidate.joining_date || 'n/a',
        created_at: candidate.created_at || 'n/a',
        job_title: candidate.hr_jobs?.title || 'n/a',
        client_name: candidate.hr_jobs?.client_owner || 'n/a'
      }));

      setSubmissions(formattedSubmissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCSV = (data: Submission[]) => {
    const headers = [
      'Candidate Name', 'Email', 'Phone', 'Experience', 'Skills', 'Match Score', 'Overall Score',
      'Applied Date', 'Submission Date', 'Applied From', 'Current Salary', 'Expected Salary',
      'Location', 'Preferred Location', 'Notice Period', 'Resume URL', 'Main Status', 'Sub Status',
      'Interview Date', 'Interview Time', 'Interview Type', 'Interview Round', 'Interviewer Name',
      'Interview Result', 'Reject Reason', 'CTC Offered', 'Joining Date', 'Created At'
    ];

    const csvData = data.map(sub => [
      sub.candidate_name || 'n/a',
      sub.email || 'n/a',
      sub.phone || 'n/a',
      sub.experience || 'n/a',
      sub.skills || 'n/a',
      sub.match_score || 'n/a',
      sub.overall_score || 'n/a',
      sub.applied_date || 'n/a',
      sub.submission_date || 'n/a',
      sub.applied_from || 'n/a',
      sub.current_salary || 'n/a',
      sub.expected_salary || 'n/a',
      sub.location || 'n/a',
      sub.preferred_location || 'n/a',
      sub.notice_period || 'n/a',
      sub.resume_url || 'n/a',
      sub.main_status || 'n/a',
      sub.sub_status || 'n/a',
      sub.interview_date || 'n/a',
      sub.interview_time || 'n/a',
      sub.interview_type || 'n/a',
      sub.interview_round || 'n/a',
      sub.interviewer_name || 'n/a',
      sub.interview_result || 'n/a',
      sub.reject_reason || 'n/a',
      sub.ctc || 'n/a',
      sub.joining_date || 'n/a',
      sub.created_at || 'n/a'
    ]);

    return Papa.unparse({
      fields: headers,
      data: csvData
    }, {
      delimiter: ', ',
      quotes: true
    });
  };

// Modified: Update sendEODReport to accept clockOutTime and durationMinutes parameters for temporary values
const sendEODReport = async (finalWorkReport: string, clockOutTime: string, durationMinutes: number) => {
  setEmailStatus('Sending EOD report...');
  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) throw new Error('Authentication session not found.');

    let defaultRecipientEmails: string[] = [];
    const { data: config } = await supabase.from('hr_email_configurations').select('recipients').eq('organization_id', organization_id).eq('report_type', 'eod_report').single();
    if (config?.recipients?.length > 0) {
      const { data: recipientEmployees } = await supabase.from('hr_employees').select('email').in('id', config.recipients);
      if (recipientEmployees) defaultRecipientEmails = recipientEmployees.map(e => e.email);
    }

    const allRecipientEmails = [user.email, ...additionalRecipients, ...defaultRecipientEmails];
    const uniqueRecipients = [...new Set(allRecipientEmails.filter(Boolean))];

    const payload = {
      userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      isRecruiter,
      submissions: isRecruiter ? submissions : [],
      workReport: finalWorkReport,
      recruiterReport: isRecruiter ? recruitmentReport : null,
      timesheetDetails: {
        date: timesheet.date,
        duration_minutes: durationMinutes,
        clock_in_time: timesheet.clock_in_time,
        clock_out_time: clockOutTime,
      },
      breakLogs: timesheet.break_logs || [],
      allRecipients: uniqueRecipients,
      csvContent: isRecruiter && submissions.length > 0 ? generateCSV(submissions) : null,
    };

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    
    setEmailStatus('EOD report sent successfully!');
  } catch (err: any) {
    setEmailStatus(`Failed to send EOD report: ${err.message}`);
    toast.error(`EOD Send Failed: ${err.message}`);
  }
};

// Modified: Update handleClose to reset temporary states
const handleClose = () => {
  setDate(new Date(timesheet?.date || Date.now()));
  setTitle(timesheet?.title || '');
  setTotalWorkingHours(timesheet?.total_working_hours || 8);
  setWorkReport(timesheet?.notes || '');
  setDetailedEntries(timesheet?.project_time_data?.projects || []);
  setProjectEntries(timesheet?.project_time_data?.projects || []);
  setFormData({
    workReport: timesheet?.notes || '',
    projectAllocations: timesheet?.project_time_data?.projects || [],
    totalHours: timesheet?.total_working_hours || 0,
  });
  setIsEditing(!timesheet?.is_submitted);
  setIsFormValid(true);
  setEmailStatus(null);
  setTemporaryClockOutTime(null);
  setTemporaryDurationMinutes(null);
  setFormErrors({}); // NEW: Reset errors
  onOpenChange(false);
};

// Modified: Update handleSubmit to calculate and use temporary clockOut and duration for submission and EOD
// Modified: Update handleSubmit to set notes in timesheetData for both project and non-project cases
const handleSubmit = async () => {
  if (!timesheet?.employee_id) {
    toast.error('User not authenticated.');
    return;
  }

  let isSubmissionSuccessful = false;
  let finalWorkReport = '';
  setIsLoading(true);

  try {
    // Calculate temporary or use existing clock out and duration
    const clockOutTimeISO = timesheet.clock_out_time || new Date().toISOString();
    const durationMinutes = timesheet.duration_minutes || (temporaryDurationMinutes || 0);
    const clockOut = DateTime.fromISO(clockOutTimeISO, { zone: 'utc' }).setZone('Asia/Kolkata').toFormat('HH:mm');

    if (employeeHasProjects) {
      // --- Project-based submission logic ---
      if (!validateForm({ title, workReport, totalWorkingHours, employeeHasProjects, projectEntries, detailedEntries })) {
        toast.error("Validation failed. Please fill all required project fields.");
        setIsLoading(false);
        return;
      }
      finalWorkReport = workReport;

      const timesheetData = {
        employeeId: timesheet.employee_id,
        title,
        notes: title || workReport,  // NEW: Set notes to title or workReport (as work summary)
        workReport,
        totalWorkingHours,
        projectEntries,
        detailedEntries,
        date: new Date(timesheet.date),
        clockIn: timesheet.clock_in_time ? DateTime.fromISO(timesheet.clock_in_time, { zone: 'utc' }).setZone('Asia/Kolkata').toFormat('HH:mm') : undefined,
        clockOut,
        recruiter_report_data: isRecruiter ? recruitmentReport : null,
      };

      console.log('Debug: Submitting timesheet for project-based employee', {
        timeLogId: timesheet.id,
        timesheetData,
        organization_id,
        date: timesheet.date,
        clockIn: timesheet.clock_in_time,
        clockOut: clockOutTimeISO,
      });

      isSubmissionSuccessful = await submitTimesheet(timesheet.id, timesheetData, organization_id, durationMinutes);
    } else {
      // --- Non-project-based submission logic ---
      if (!validateForm({ title: '', workReport: formData.workReport, totalWorkingHours: totalWorkingHours, employeeHasProjects, projectEntries: [], detailedEntries: [] })) {
        toast.error('Work Summary is required');
        setIsLoading(false);
        return;
      }
      finalWorkReport = formData.workReport;

      const timesheetData = {
        employeeId: timesheet.employee_id,
        title: '',
        notes: formData.workReport,  // NEW: Set notes to the workReport (as work summary)
        workReport: formData.workReport,
        totalWorkingHours,
        projectEntries: [],
        detailedEntries: [],
        date: new Date(timesheet.date),
        clockIn: timesheet.clock_in_time ? DateTime.fromISO(timesheet.clock_in_time, { zone: 'utc' }).setZone('Asia/Kolkata').toFormat('HH:mm') : undefined,
        clockOut,
        recruiter_report_data: isRecruiter ? recruitmentReport : null,
      };

      console.log('Debug: Submitting timesheet for non-project-based employee', {
        timeLogId: timesheet.id,
        timesheetData,
        organization_id,
        date: timesheet.date,
        clockIn: timesheet.clock_in_time,
        clockOut: clockOutTimeISO,
      });

      isSubmissionSuccessful = await submitTimesheet(timesheet.id, timesheetData, organization_id, durationMinutes);
    }

    if (isSubmissionSuccessful) {
      await sendEODReport(finalWorkReport, clockOutTimeISO, durationMinutes);
      
      if (emailStatus && emailStatus.startsWith('Failed')) {
        // Error is already displayed
      } else {
        toast.success("Timesheet and EOD report submitted successfully");
        onSubmitTimesheet();
        onOpenChange(false);
      }
    } else {
      toast.error('Failed to submit timesheet');
    }
  } catch (error: any) {
    console.error("Error during submission:", error);
    toast.error(`Submission Failed: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

  // UPDATED: Change canSubmit to always true for button visibility when editing and not submitted; disable only on loading
  const canSubmit = !timesheet?.is_submitted && isEditing;
  const canEdit = !timesheet?.is_submitted && !timesheet?.is_approved;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{timesheet?.is_submitted ? "View Timesheet" : "Submit Timesheet"}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {isLoading && isEditing ? <div>Loading...</div> : (
            <>
              <TimesheetBasicInfo timesheet={timesheet} temporaryClockOutTime={temporaryClockOutTime} temporaryDurationMinutes={temporaryDurationMinutes} />
              
              {isEditing ? (
                <>
                  {employeeHasProjects ? (
                    <TimesheetDialogContent
                      date={date}
                      setDate={setDate}
                      title={title}
                      setTitle={setTitle}
                      totalWorkingHours={totalWorkingHours}
                      setTotalWorkingHours={setTotalWorkingHours}
                      workReport={workReport}
                      setWorkReport={setWorkReport}
                      detailedEntries={detailedEntries}
                      setDetailedEntries={setDetailedEntries}
                      projectEntries={projectEntries}
                      setProjectEntries={setProjectEntries}
                      employeeHasProjects={employeeHasProjects}
                      isSubmitting={isLoading}
                      handleClose={() => onOpenChange(false)}
                      handleSubmit={handleSubmit}
                      employeeId={employeeId}
                      hrProjectEmployees={hrProjectEmployees}
                    />
                  ) : (
                    <>
                    
                    <TimesheetEditForm
                      formData={formData}
                      setFormData={setFormData}
                      timesheet={timesheet}
                      onValidationChange={setIsFormValid}
                    />
                    {isEditing && isRecruiter && (
  <RecruitmentReportForm 
    data={recruitmentReport} 
    onChange={setRecruitmentReport} 
    errors={formErrors} 
  />
)}
                    </>
                  )}
                  <div className="space-y-2 pt-4 border-t mt-4">
                    <Label htmlFor="recipients">Add More Recipients for EOD (Optional)</Label>
                    <MultiSelect
                      id="recipients"
                      options={allEmployees}
                      selected={additionalRecipients}
                      onChange={setAdditionalRecipients}
                      placeholder="Select employees to notify..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <TaskupTimeLogDetails timeLog={timesheet} employeeHasProjects={employeeHasProjects} />
                  <TimesheetProjectDetails timesheet={timesheet} employeeHasProjects={employeeHasProjects} />
                  {isRecruiter && timesheet?.recruiter_report_data && (
      <ViewRecruitmentReport data={timesheet.recruiter_report_data} />
    )}
                </>
              )}
              
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {emailStatus && <div className="text-sm text-gray-600 mr-4">{emailStatus}</div>}
          
          {!timesheet?.is_submitted && !isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
          )}
          
          {canSubmit && (
            <Button onClick={validateAndSubmit} disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit and Send EOD"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};