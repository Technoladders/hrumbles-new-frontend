import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TimeLog, DetailedTimesheetEntry } from "@/types/time-tracker-types";
import { toast } from "sonner";
import { TimeLogDetails } from "./dialog/TimeLogDetails";
import { TimesheetBasicInfo } from "./dialog/TimesheetBasicInfo";
import { TimesheetDialogContent } from './dialog/TimesheetDialogContent';
import { TimesheetEditForm } from "./dialog/TimesheetEditForm";
import { TimesheetProjectDetails } from "./TimesheetProjectDetails";
import { useTimesheetValidation } from './hooks/useTimesheetValidation';
import { useTimesheetSubmission } from './hooks/useTimesheetSubmission';
import { useSelector } from 'react-redux';
import { fetchHrProjectEmployees, submitTimesheet } from '@/api/timeTracker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';

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
  const [isEditing, setIsEditing] = useState(!timesheet?.is_submitted);
  const [date, setDate] = useState<Date>(new Date(timesheet?.date || Date.now()));
  const [title, setTitle] = useState(timesheet?.notes || '');
  const [totalWorkingHours, setTotalWorkingHours] = useState(timesheet?.total_working_hours || 8);
  const [workReport, setWorkReport] = useState(timesheet?.notes || '');
  const [detailedEntries, setDetailedEntries] = useState<DetailedTimesheetEntry[]>(timesheet?.project_time_data?.projects || []);
  const [projectEntries, setProjectEntries] = useState<
    { projectId: string; hours: number; report: string; clientId?: string }[]
  >(timesheet?.project_time_data?.projects || []);
  const [hrProjectEmployees, setHrProjectEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    workReport: timesheet?.notes || '',
    projectAllocations: timesheet?.project_time_data?.projects || [],
    totalHours: timesheet?.total_working_hours || 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (employeeId && employeeHasProjects) {
        setIsLoading(true);
        const data = await fetchHrProjectEmployees(employeeId);
        setHrProjectEmployees(data);
        setIsLoading(false);
      }
    };
    fetchData();
  }, [employeeId, employeeHasProjects]);

  useEffect(() => {
    if (timesheet?.clock_in_time && timesheet?.clock_out_time) {
      const clockIn = new Date(timesheet.clock_in_time);
      const clockOut = new Date(timesheet.clock_out_time);
      const diffMs = clockOut.getTime() - clockIn.getTime();
      const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      setTotalWorkingHours(totalHours);
      setFormData((prev) => ({ ...prev, totalHours }));
      console.log('Calculated login hours:', { totalHours, clockIn, clockOut });
    }
    setIsFormValid(employeeHasProjects || formData.workReport.trim().length > 0);
  }, [timesheet, employeeHasProjects, formData.workReport]);

  useEffect(() => {
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
    fetchSubmissions();
  }, [employeeId, timesheet]);

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

  const sendEODReport = async () => {
    try {
      setEmailStatus('Sending EOD report...');
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        throw new Error('No authenticated user found');
      }
      const jwt = session.access_token;

      const { data: employee, error: employeeError } = await supabase
        .from('hr_employees')
        .select('first_name, last_name')
        .eq('id', employeeId)
        .single();
      if (employeeError || !employee) {
        throw new Error('Failed to fetch user name');
      }

      const dateStart = startOfDay(new Date(timesheet.date));
      const dateEnd = endOfDay(new Date(timesheet.date));
      const csvContent = generateCSV(submissions);
      const payload = {
        reportType: 'EOD',
        reportData: submissions,
        userEmail: user.email,
        userName: employee.first_name || 'User',
        dateRange: {
          start: format(dateStart, 'yyyy-MM-dd'),
          end: format(dateEnd, 'yyyy-MM-dd'),
        },
        csvContent,
        workReport: formData.workReport
      };

      const response = await fetch(
        'https://kbpeyfietrwlhwcwqhjw.supabase.co/functions/v1/report-manager',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGV5ZmlldHJ3bGh3Y3dxaGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4NDA5NjEsImV4cCI6MjA1NDQxNjk2MX0.A-K4DO6D2qQZ66qIXY4BlmoHxc-W5B0itV-HAAM84YA',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send EOD report');
      }

      setEmailStatus('EOD report sent successfully!');
      console.log('EOD report sent successfully!', data);
    } catch (err) {
      setEmailStatus(`Failed to send EOD report: ${err.message}`);
      console.error('Failed to send EOD report:', err.message);
    }
  };

  const handleClose = () => {
    setDate(new Date(timesheet?.date || Date.now()));
    setTitle(timesheet?.notes || '');
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
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!timesheet?.employee_id) {
      toast.error('User not authenticated. Please log in to submit a timesheet.');
      console.log('Submission blocked: No employeeId');
      return;
    }

    if (employeeHasProjects) {
      if (!validateForm({
        title,
        workReport,
        employeeHasProjects,
        projectEntries,
        detailedEntries,
        totalWorkingHours,
      })) {
        console.log('Validation failed:', { title, workReport, employeeHasProjects, projectEntries, detailedEntries, totalWorkingHours });
        return;
      }

      const success = await submitTimesheetHook({
        employeeId: timesheet.employee_id,
        title,
        workReport,
        totalWorkingHours,
        employeeHasProjects,
        projectEntries,
        detailedEntries,
        timeLogId: timesheet.id,
        
      }, organization_id);

      if (success) {
        await sendEODReport();
        toast.success('Timesheet and EOD report submitted successfully');
        onSubmitTimesheet();
        handleClose();
      } else {
        toast.error('Failed to submit timesheet');
        console.log('Submission failed:', { employeeId: timesheet.employee_id, title, workReport, totalWorkingHours });
      }
    } else {
      if (!formData.workReport.trim()) {
        toast.error('Work Summary is required');
        return;
      }

      setIsLoading(true);
      try {
        const success = await submitTimesheet(timesheet.id, {
          ...formData,
          approval_id: timesheet.id,
          employeeId: timesheet.employee_id,
        });

        const { data: employeeData, error: employeeError } = await supabase
          .from("hr_employees")
          .select("department_id")
          .eq("id", employeeId)
          .single();

        if (employeeError) throw employeeError;

        const { data: departmentData, error: departmentError } = await supabase
          .from("hr_departments")
          .select("name")
          .eq("id", employeeData.department_id)
          .single();

        if (departmentError) throw departmentError;

        const isRecruiter = departmentData.name === "Human Resource";

        if (success) {
          if (isRecruiter) {
            await sendEODReport();
          }
          toast.success("Timesheet and EOD report submitted successfully");
          onSubmitTimesheet();
          handleClose();
        } else {
          toast.error("Failed to submit timesheet");
        }
      } catch (error) {
        console.error("Error submitting timesheet:", error);
        toast.error("An error occurred while submitting the timesheet");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const { validateForm } = useTimesheetValidation();
  const { isSubmitting, submitTimesheet: submitTimesheetHook } = useTimesheetSubmission();

  const canSubmit = !timesheet?.is_submitted && !isSubmitting && isFormValid;
  const canEdit = !timesheet?.is_submitted && !timesheet?.is_approved;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {timesheet?.is_submitted && !employeeHasProjects ? "View Timesheet" : "Submit Timesheet"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <>
              <TimesheetBasicInfo timesheet={timesheet} />
              
              {isEditing && employeeHasProjects ? (
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
                  isSubmitting={isSubmitting}
                  handleClose={handleClose}
                  handleSubmit={handleSubmit}
                  employeeId={employeeId}
                  hrProjectEmployees={hrProjectEmployees}
                />
              ) : isEditing && !employeeHasProjects ? (
                <TimesheetEditForm
                  formData={formData}
                  setFormData={setFormData}
                  timesheet={timesheet}
                  onValidationChange={setIsFormValid}
                />
              ) : (
                   <>
                  <TimeLogDetails timeLog={timesheet} employeeHasProjects={employeeHasProjects} />
                  <TimesheetProjectDetails timesheet={timesheet} employeeHasProjects={employeeHasProjects} />
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {emailStatus && (
            <div className="text-sm text-gray-600 mr-4">{emailStatus}</div>
          )}
          {canEdit && !isEditing && !employeeHasProjects && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
          
          {(isEditing || employeeHasProjects) && !timesheet?.is_submitted && (
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              View Details
            </Button>
          )}
          
          {canSubmit && (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || isLoading || !isFormValid}
            >
              {isSubmitting ? "Submitting..." : "Submit Timesheet and EOD Report"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};