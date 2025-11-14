import React, { useState, useEffect } from 'react';
import { TimeLog } from '@/types/time-tracker-types';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, Briefcase, PlusCircle, FileText, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { JobLogDialog, JobLog } from './JobLogDialog';
import QuillTableBetterDemo from '@/utils/QuillTableBetterDemo';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RecruiterTimesheetFormProps {
  timesheet: TimeLog;
  onDataChange: (data: { logs: JobLog[] | null; report: string }) => void;
  onValidationChange: (isValid: boolean) => void;
}

interface AssignedJob {
  id: string;
  title: string;
  client_owner: string;
}

export const RecruiterTimesheetForm: React.FC<RecruiterTimesheetFormProps> = ({
  timesheet,
  onDataChange,
  onValidationChange,
}) => {
  const [jobLogs, setJobLogs] = useState<JobLog[]>([]);
  const [overallWorkReport, setOverallWorkReport] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [assignedJobs, setAssignedJobs] = useState<AssignedJob[]>([]);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [selectedJobLog, setSelectedJobLog] = useState<JobLog | null>(null);
  
  const [selectKeyValue, setSelectKeyValue] = useState(Date.now());

  const handleJobSelection = (jobId: string) => {
    if (!jobId) return;
    handleAddJobLog(jobId);
    setSelectKeyValue(Date.now()); 
  };

  // Load existing timesheet data if available
  useEffect(() => {
    if (timesheet) {
      // Load overall work report
      try {
        if (timesheet.notes && typeof timesheet.notes === 'string') {
          const parsed = JSON.parse(timesheet.notes);
          if (parsed.type === 'workSummary') {
            setOverallWorkReport(parsed.data);
          } else {
            setOverallWorkReport(timesheet.notes);
          }
        } else if (timesheet.notes) {
          setOverallWorkReport(timesheet.notes);
        }
      } catch (e) {
        if (typeof timesheet.notes === 'string') {
          setOverallWorkReport(timesheet.notes);
        }
      }

      // Load existing job logs from recruiter_report_data
      if (timesheet.recruiter_report_data && Array.isArray(timesheet.recruiter_report_data)) {
        console.log('Loading existing recruiter report data:', timesheet.recruiter_report_data);
        setJobLogs(timesheet.recruiter_report_data as JobLog[]);
      }
    }
  }, [timesheet]);

  // Fetch assigned jobs
  useEffect(() => {
    if (!timesheet.employee_id) return;

    const fetchRecruiterData = async () => {
      setLoading(true);
      try {
        // Fetch all jobs assigned to the recruiter
        const { data: jobs, error: jobsError } = await supabase
          .rpc('get_jobs_assigned_to_employee', { p_employee_id: timesheet.employee_id });

        if (jobsError) throw jobsError;
        setAssignedJobs(jobs as AssignedJob[]);

      } catch (error) {
        console.error("Error fetching recruiter data:", error);
        toast.error("Failed to load recruiter's assigned jobs.");
      } finally {
        setLoading(false);
      }
    };
    fetchRecruiterData();
  }, [timesheet.employee_id]);

  // Notify parent of data changes and validate
  useEffect(() => {
    onDataChange({ logs: jobLogs, report: overallWorkReport });
    
    // Validation logic
    const hasLoggedJobs = jobLogs.length > 0;
    
    // Calculate total time from all candidates across all jobs
    const totalMinutes = jobLogs.reduce((sum, log) => {
      const logTotal = log.candidates.reduce((candidateSum, candidate) => 
        candidateSum + (candidate.hours * 60) + candidate.minutes, 0
      );
      return sum + logTotal;
    }, 0);
    
    const hasPositiveTime = totalMinutes > 0;
    const hasWorkReport = overallWorkReport.replace(/<[^>]+>/g, "").trim().length > 0;
    
    onValidationChange(hasLoggedJobs && hasPositiveTime && hasWorkReport);
  }, [jobLogs, overallWorkReport, onDataChange, onValidationChange]);

  const handleAddJobLog = async (jobId: string) => {
    if (!jobId || jobLogs.some(log => log.jobId === jobId)) {
      if (jobLogs.some(log => log.jobId === jobId)) {
        toast.error("This job has already been added.");
      }
      return;
    }

    const jobToAdd = assignedJobs.find(j => j.id === jobId);
    if (!jobToAdd) return;

    setLoading(true);
    try {
      // Fetch job metadata
      const { data: jobData, error: jobError } = await supabase
        .from('hr_jobs')
        .select('job_id, job_type, submission_type, job_type_category')
        .eq('id', jobId)
        .single();
      
      if (jobError) throw jobError;
      
      const newJobLog: JobLog = {
        jobId: jobToAdd.id,
        jobTitle: jobToAdd.title,
        clientName: jobToAdd.client_owner,
        candidates: [], // Start with empty candidates array
        challenges: '',
        job_display_id: jobData?.job_id,
        job_type: jobData?.job_type,
        submission_type: jobData?.submission_type,
        job_type_category: jobData?.job_type_category,
      };

      setJobLogs(prev => [...prev, newJobLog]);
      toast.success(`${jobToAdd.title} added. Click "View Log" to add candidates and time.`);

    } catch (error) {
      console.error("Error adding job log:", error);
      toast.error("Could not add job log. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJobLog = (jobId: string) => {
    const job = jobLogs.find(log => log.jobId === jobId);
    setJobLogs(prev => prev.filter(log => log.jobId !== jobId));
    toast.info(`${job?.jobTitle} has been removed.`);
  };

  const handleOpenLogDialog = (jobLog: JobLog) => {
    setSelectedJobLog(jobLog);
    setIsLogDialogOpen(true);
  };

  const handleSaveLog = (updatedLog: JobLog) => {
    setJobLogs(prev => prev.map(log => log.jobId === updatedLog.jobId ? updatedLog : log));
  };
  
  const unloggedAssignedJobs = assignedJobs.filter(job => !jobLogs.some(log => log.jobId === job.id));

  // Calculate total time for a job
  const calculateJobTotalTime = (job: JobLog) => {
    const totalMinutes = job.candidates.reduce((sum, c) => sum + (c.hours * 60) + c.minutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes, totalMinutes };
  };

  if (loading) return <div>Loading assigned jobs...</div>;

  return (
    <>
      <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center mb-4">
          <Briefcase className="h-6 w-6 mr-3 text-indigo-600" />
          <h3 className="text-xl font-bold text-gray-800">Recruiter Daily Report</h3>
        </div>

        {unloggedAssignedJobs.length > 0 && (
          <div className="mb-5">
            <Select 
              key={selectKeyValue}
              onValueChange={handleJobSelection}
            >
              <SelectTrigger className="w-full justify-start p-3 h-auto bg-indigo-600 text-white rounded-lg transition-colors duration-200 ease-in-out hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-400">
                <div className="flex items-center">
                  <PlusCircle className="h-5 w-5 mr-3" />
                  <SelectValue placeholder="Add Job Entry..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                {unloggedAssignedJobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title} - {job.client_owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-3">
          {jobLogs.map(log => {
            const { hours, minutes, totalMinutes } = calculateJobTotalTime(log);
            const hasCandidates = log.candidates.length > 0;
            const hasTime = totalMinutes > 0;

            return (
              <div 
                key={log.jobId} 
                className={cn(
                  "flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm transition-all hover:shadow-md",
                  hasTime ? "hover:border-indigo-300" : "hover:border-amber-300 border-amber-200"
                )}
              >
                <div className="flex items-center flex-grow">
                  <div className={cn(
                    "p-2.5 rounded-full mr-4",
                    hasTime ? "bg-indigo-100" : "bg-amber-100"
                  )}>
                    <Briefcase className={cn(
                      "h-5 w-5",
                      hasTime ? "text-indigo-700" : "text-amber-700"
                    )} />
                  </div>
                  <div className="flex-grow">
                    <p className="font-semibold text-gray-900">{log.jobTitle} ({log.clientName})</p>
                    
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {log.job_display_id && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold text-purple-800 bg-purple-100 rounded-full">
                          {log.job_display_id}
                        </span>
                      )}
                      {log.job_type && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-full">
                          {log.job_type}
                        </span>
                      )}
                      {log.job_type_category && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 rounded-full">
                          {log.job_type_category === 'Internal' ? 'In-House' : log.job_type_category}
                        </span>
                      )}
                      {hasCandidates && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 border border-blue-300 rounded-full">
                          {log.candidates.length} candidate{log.candidates.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-4">
                      <p className="text-sm text-gray-500">
                        Time Logged: <span className={cn(
                          "font-medium",
                          hasTime ? "text-indigo-700" : "text-amber-600"
                        )}>
                          {hours}h {minutes}m
                        </span>
                      </p>
                      
                      {!hasTime && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-md">
                          ⚠️ No time logged yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleOpenLogDialog(log)}
                    className={cn(
                      "hover:bg-indigo-50",
                      !hasTime && "border border-amber-300 hover:border-amber-400"
                    )}
                  >
                    <Eye className="h-4 w-4 mr-2 text-gray-500" /> 
                    {hasCandidates ? 'Edit Log' : 'Add Details'}
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteJobLog(log.jobId)}
                    className="h-8 w-8 text-gray-500 hover:bg-red-100 hover:text-red-600"
                    aria-label="Remove job log"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {jobLogs.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">No jobs added yet</p>
              <p className="text-sm text-gray-500 mt-1">Select a job above to start logging your work</p>
            </div>
          )}
        </div>

        <div className="mt-8 p-5 bg-white rounded-lg border border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <FileText className="h-5 w-5 mr-3 text-indigo-600" />
              <Label className="text-lg font-bold text-gray-800">
                Overall Work Summary
              </Label>
            </div>
            <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-md">Required</span>
          </div>
          <p className="mt-1 mb-4 text-sm text-gray-500">
            Provide a brief summary of your tasks and achievements for the day.
          </p>
          <div className={cn(
            "mt-2 border rounded-md overflow-hidden transition-all focus-within:ring-2 focus-within:ring-indigo-400", 
            { 'hidden': isLogDialogOpen }
          )}>
            <QuillTableBetterDemo
              value={overallWorkReport}
              onChange={setOverallWorkReport}
            />
          </div>
        </div>
      </div>

      <JobLogDialog
        open={isLogDialogOpen}
        onOpenChange={setIsLogDialogOpen}
        jobLog={selectedJobLog}
        onSave={handleSaveLog}
        timesheetDate={timesheet.date} 
      />
    </>
  );
};