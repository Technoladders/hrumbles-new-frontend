import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimeLog, DetailedTimesheetEntry, JobLog } from "@/types/time-tracker-types";
import { toast } from "sonner";
import { TimeLogDetails } from "./dialog/TimeLogDetails";
import { TimesheetBasicInfo } from "./dialog/TimesheetBasicInfo";
import { TimesheetDialogContent } from './dialog/TimesheetDialogContent';
import { TimesheetEditForm } from "./dialog/TimesheetEditForm";
import { TimesheetProjectDetails } from "./TimesheetProjectDetails";
import { useTimesheetValidation } from './hooks/useTimesheetValidation';
import { useSelector } from 'react-redux';
import { fetchHrProjectEmployees, submitTimesheet } from '@/api/timeTracker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import { fetchEmployees } from '@/api/user';
import { MultiSelect } from '@/components/ui/multi-selector';
import { DateTime } from 'luxon';
import { RecruiterTimesheetForm } from "./dialog/RecruiterTimesheetForm";

interface ViewTimesheetDialogProps {
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
  value: string; // employee email
  label: string; // employee name
}

export const ViewTimesheetDialog: React.FC<ViewTimesheetDialogProps> = ({
  open,
  onOpenChange,
  timesheet,
  onSubmitTimesheet,
  employeeHasProjects,
}) => {
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const employeeId = user?.id || "";
 
  // Core State
  const [isEditing, setIsEditing] = useState(!timesheet?.is_submitted);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  // --- State for different user roles ---
  // 1. Recruiter State
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [recruiterJobLogs, setRecruiterJobLogs] = useState<JobLog[] | null>(null);
  const [overallWorkReport, setOverallWorkReport] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // 2. Project-based Employee State
  const [title, setTitle] = useState('');
  const [workReport, setWorkReport] = useState('');
  const [totalWorkingHours, setTotalWorkingHours] = useState(8);
  const [detailedEntries, setDetailedEntries] = useState<DetailedTimesheetEntry[]>([]);
  const [projectEntries, setProjectEntries] = useState<any[]>([]);
  const [hrProjectEmployees, setHrProjectEmployees] = useState<any[]>([]);
 
  // 3. Standard Employee State
  const [formData, setFormData] = useState({ workReport: '' });

  // EOD Report State
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [allEmployees, setAllEmployees] = useState<EmployeeOption[]>([]);
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([]);
 
  const { validateForm } = useTimesheetValidation();

  // Initialize form state when the dialog opens or timesheet changes
  useEffect(() => {
      if (timesheet) {
        setTitle(timesheet.title || '');
        setWorkReport(timesheet.notes || '');
        setTotalWorkingHours(timesheet?.total_working_hours || 8);
        setDetailedEntries(timesheet?.project_time_data?.projects || []);
        setProjectEntries(timesheet?.project_time_data?.projects || []);
        setFormData({ workReport: timesheet.notes || '' });
        setOverallWorkReport(timesheet.notes || '');
        setIsEditing(!timesheet.is_submitted);
        setIsFormValid(false); // Default to false until validated
      }
  }, [timesheet, open]);

  // Validation for project-based employees
  useEffect(() => {
    if (employeeHasProjects) {
      setIsFormValid(validateForm({ title, workReport, totalWorkingHours, employeeHasProjects, projectEntries, detailedEntries }));
    }
  }, [title, workReport, totalWorkingHours, projectEntries, detailedEntries, employeeHasProjects]);

  // Combined data fetching and role detection effect
  useEffect(() => {
    if (open && organization_id && employeeId) {
      const setupDialog = async () => {
        setIsLoading(true);
        try {
          const employees = await fetchEmployees(organization_id);
          setAllEmployees(employees.map(e => ({ value: e.email, label: `${e.first_name} ${e.last_name}` })));
         
          const { data: employeeData } = await supabase.from("hr_employees").select("department_id").eq("id", employeeId).single();
          if (employeeData?.department_id) {
            const { data: deptData } = await supabase.from("hr_departments").select("name").eq("id", employeeData.department_id).single();
            const isRecruiterRole = deptData?.name === "Human Resource";
            setIsRecruiter(isRecruiterRole);
            if (isRecruiterRole) {
              await fetchSubmissions();
            }
            // Fetch project assignments only if the user is NOT a recruiter but has projects
            if (!isRecruiterRole && employeeHasProjects) {
              const data = await fetchHrProjectEmployees(employeeId);
              setHrProjectEmployees(data);
            }
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
  }, [open, organization_id, employeeId, employeeHasProjects, timesheet?.date]);

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

  const handleRecruiterDataChange = (data: { logs: JobLog[] | null; report: string }) => {
    setRecruiterJobLogs(data.logs);
    setOverallWorkReport(data.report);
  };

  const sendEODReport = async (finalWorkReport: string) => {
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
        timesheetDetails: {
          date: timesheet.date,
          duration_minutes: timesheet.duration_minutes,
          clock_in_time: timesheet.clock_in_time,
          clock_out_time: timesheet.clock_out_time,
        },
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
    } catch (err) {
      setEmailStatus(`Failed to send EOD report: ${err.message}`);
      toast.error(`EOD Send Failed: ${err.message}`);
    }
  };

  const sendRecruiterEODReport = async () => {
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
      const csvContent = submissions.length > 0 ? generateCSV(submissions) : null;
      // --- NEW PAYLOAD FOR THE DEDICATED FUNCTION ---
      const payload = {
        userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        timesheetDetails: {
          date: timesheet.date,
          duration_minutes: timesheet.duration_minutes,
          clock_in_time: timesheet.clock_in_time,
          clock_out_time: timesheet.clock_out_time,
        },
        jobLogs: recruiterJobLogs,
        overallSummary: overallWorkReport,
        breakLogs: timesheet.break_logs || [], // Pass the break logs
        allRecipients: uniqueRecipients,
        csvContent,
      };
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recruiter-eod-report`, { // <-- CALL THE NEW FUNCTION
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

  const handleClose = () => {
    setTitle('');
    setWorkReport('');
    setTotalWorkingHours(8);
    setDetailedEntries([]);
    setProjectEntries([]);
    setFormData({ workReport: '' });
    setRecruiterJobLogs(null);
    setOverallWorkReport('');
    setSubmissions([]);
    setIsEditing(false);
    setIsFormValid(false);
    setEmailStatus(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!timesheet?.employee_id) {
      toast.error('User not authenticated.');
      return;
    }
    if (!isFormValid) {
        toast.error("Please fill all required fields before submitting.");
        return;
    }
    setIsLoading(true);
    try {
        const clockIn = timesheet.clock_in_time ? DateTime.fromISO(timesheet.clock_in_time, { zone: 'utc' }).setZone('Asia/Kolkata').toFormat('HH:mm') : undefined;
        const clockOut = timesheet.clock_out_time ? DateTime.fromISO(timesheet.clock_out_time, { zone: 'utc' }).setZone('Asia/Kolkata').toFormat('HH:mm') : undefined;
        let timesheetData: any = {
            employeeId: timesheet.employee_id,
            date: new Date(timesheet.date),
            clockIn,
            clockOut,
        };
       
        let finalWorkReport = '';
        let isSubmissionSuccessful = false;
       
        if (isRecruiter) {
            timesheetData.notes = overallWorkReport;
            timesheetData.recruiter_report_data = recruiterJobLogs;
            const totalHours = recruiterJobLogs?.reduce((sum, log) => sum + log.hours + (log.minutes / 60), 0) || 8;
            timesheetData.totalWorkingHours = totalHours;
            isSubmissionSuccessful = await submitTimesheet(timesheet.id, timesheetData, organization_id);
            if (isSubmissionSuccessful) {
                await sendRecruiterEODReport(); // <-- CALL THE NEW EOD FUNCTION
            }
        } else {
            if (employeeHasProjects) {
                timesheetData.title = title;
                timesheetData.notes = title || workReport;
                timesheetData.workReport = workReport;
                timesheetData.totalWorkingHours = totalWorkingHours;
                timesheetData.projectEntries = projectEntries;
                timesheetData.detailedEntries = detailedEntries;
                finalWorkReport = workReport;
            } else {
                timesheetData.notes = formData.workReport;
                timesheetData.workReport = formData.workReport;
                timesheetData.totalWorkingHours = timesheet.duration_minutes ? timesheet.duration_minutes / 60 : 8;
                finalWorkReport = formData.workReport;
            }
            isSubmissionSuccessful = await submitTimesheet(timesheet.id, timesheetData, organization_id);
            if (isSubmissionSuccessful) {
                await sendEODReport(finalWorkReport);
            }
        }
        if (isSubmissionSuccessful) {
            if (emailStatus && emailStatus.startsWith('Failed')) {
                // Error already shown
            } else {
                toast.success("Timesheet submitted successfully");
                onSubmitTimesheet();
                handleClose();
            }
        } else {
            toast.error('Failed to submit timesheet');
        }
    } catch (error: any) {
        console.error("Error during submission:", error);
        toast.error(`Submission Failed: ${error.message || 'An unknown error occurred'}`);
    } finally {
        setIsLoading(false);
    }
  };
 
  const canSubmit = !timesheet?.is_submitted && !isLoading && isFormValid;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{timesheet?.is_submitted ? "View Timesheet" : "Submit Timesheet"}</DialogTitle>
        </DialogHeader>
       
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {isLoading && isEditing ? <div>Loading...</div> : (
            <>
              <TimesheetBasicInfo timesheet={timesheet} />
             
              {isEditing ? (
                <>
                  {/* --- CONDITIONAL FORM RENDERING --- */}
                  {isRecruiter ? (
                    <RecruiterTimesheetForm
                      timesheet={timesheet}
                      onDataChange={handleRecruiterDataChange}
                      onValidationChange={setIsFormValid}
                    />
                  ) : employeeHasProjects ? (
                    <TimesheetDialogContent
                      date={new Date(timesheet.date)}
                      setDate={() => {}} // Date is fixed in this view
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
                      handleClose={handleClose}
                      handleSubmit={handleSubmit}
                      employeeId={employeeId}
                      hrProjectEmployees={hrProjectEmployees}
                    />
                  ) : (
                    <TimesheetEditForm
                      formData={formData}
                      setFormData={setFormData}
                      timesheet={timesheet}
                      onValidationChange={setIsFormValid}
                    />
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
                  <TimeLogDetails timeLog={timesheet} employeeHasProjects={employeeHasProjects} />
                  {/* For project employees, you might want a specific view component */}
                  {employeeHasProjects && <TimesheetProjectDetails timesheet={timesheet} />}
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
         
          {canSubmit && isEditing && (
            <Button onClick={handleSubmit} disabled={isLoading || !isFormValid}>
              {isLoading ? "Submitting..." : "Submit Timesheet"}
            </Button>
          )}
         
          {timesheet?.is_submitted && (
             <Button variant="outline" onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};