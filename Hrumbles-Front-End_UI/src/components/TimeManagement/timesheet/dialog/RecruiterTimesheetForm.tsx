import React, { useState, useEffect } from 'react';
import { TimeLog } from '@/types/time-tracker-types';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Command, CommandInput, CommandEmpty, CommandList, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Eye } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { JobLogDialog, JobLog } from './JobLogDialog';
import QuillTableBetterDemo from '@/utils/QuillTableBetterDemo';

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
  
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    // Attempt to parse initial summary from timesheet notes
    try {
        if(timesheet.notes && typeof timesheet.notes === 'string') {
            const parsed = JSON.parse(timesheet.notes);
            if (parsed.type === 'workSummary') {
                setOverallWorkReport(parsed.data);
            }
        } else if (timesheet.notes) {
           setOverallWorkReport(timesheet.notes);
        }
    } catch (e) {
        if(typeof timesheet.notes === 'string') {
            setOverallWorkReport(timesheet.notes);
        }
    }
  }, [timesheet.notes]);

  // Fetch all necessary data
  useEffect(() => {
    if (!timesheet.employee_id) return; // Guard clause

    const fetchRecruiterData = async () => {
      setLoading(true);
      try {
        const dateStart = startOfDay(new Date(timesheet.date));
        const dateEnd = endOfDay(new Date(timesheet.date));

        // --- CHANGED: Use the new RPC to fetch assigned jobs ---
        const { data: jobs, error: jobsError } = await supabase
          .rpc('get_jobs_assigned_to_employee', { p_employee_id: timesheet.employee_id });
        // --- END CHANGE ---

        if (jobsError) throw jobsError;
        setAssignedJobs(jobs as AssignedJob[]);
        
        // Fetch candidates submitted today (this part is correct)
        const { data: candidates, error: candidateError } = await supabase
          .from("hr_job_candidates")
          .select(`id, name, job_id, hr_jobs!hr_job_candidates_job_id_fkey(title, client_owner)`)
          .eq("created_by", timesheet.employee_id)
          .gte("created_at", format(dateStart, "yyyy-MM-dd'T'HH:mm:ss"))
          .lte("created_at", format(dateEnd, "yyyy-MM-dd'T'HH:mm:ss"));
        if (candidateError) throw candidateError;

        // Group submissions by job
        const submissionsByJob = candidates.reduce((acc, candidate) => {
          const jobId = candidate.job_id;
          if (!jobId) return acc;
          if (!acc[jobId]) {
            acc[jobId] = {
              jobId: jobId,
              jobTitle: candidate.hr_jobs.title,
              clientName: candidate.hr_jobs.client_owner,
              submissions: [], hours: 0, minutes: 0, challenges: ''
            };
          }
          acc[jobId].submissions.push({ name: candidate.name, id: candidate.id });
          return acc;
        }, {} as Record<string, JobLog>);
        
        setJobLogs(Object.values(submissionsByJob));
      } catch (error) {
        console.error("Error fetching recruiter data:", error);
        toast.error("Failed to load recruiter's daily activity.");
      } finally {
        setLoading(false);
      }
    };
    fetchRecruiterData();
  }, [timesheet.date, timesheet.employee_id]);

  // Update parent whenever data changes
  useEffect(() => {
    onDataChange({ logs: jobLogs, report: overallWorkReport });
    const totalMinutes = jobLogs.reduce((sum, log) => sum + (log.hours * 60) + log.minutes, 0);
    onValidationChange(totalMinutes > 0 && overallWorkReport.replace(/<[^>]+>/g, "").trim().length > 0);
  }, [jobLogs, overallWorkReport, onDataChange, onValidationChange]);

  const handleAddJobLog = (jobId: string) => {
    if (!jobId || jobLogs.some(log => log.jobId === jobId)) return;
    
    const jobToAdd = assignedJobs.find(j => j.id === jobId);
    if (!jobToAdd) return;
    
    const newJobLog: JobLog = {
      jobId: jobToAdd.id,
      jobTitle: jobToAdd.title,
      clientName: jobToAdd.client_owner,
      submissions: [], hours: 0, minutes: 0, challenges: ''
    };
    setJobLogs(prev => [...prev, newJobLog]);
    setPopoverOpen(false);
  };

  const handleOpenLogDialog = (jobLog: JobLog) => {
    setSelectedJobLog(jobLog);
    setIsLogDialogOpen(true);
  };

  const handleSaveLog = (updatedLog: JobLog) => {
    setJobLogs(prev => prev.map(log => log.jobId === updatedLog.jobId ? updatedLog : log));
  };
  
  const unloggedAssignedJobs = assignedJobs.filter(job => !jobLogs.some(log => log.jobId === job.id));

  if (loading) return <div>Loading daily submissions...</div>;

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Recruiter Daily Report</h3>
        
        <div className="space-y-2">
            {jobLogs.map(log => (
                <div key={log.jobId} className="flex items-center justify-between p-3 border rounded-md bg-white">
                    <div>
                        <p className="font-medium">{log.jobTitle}</p>
                        <p className="text-sm text-muted-foreground">Time Logged: {log.hours}h {log.minutes}m</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleOpenLogDialog(log)}>
                        <Eye className="h-4 w-4 mr-2" /> View Log
                    </Button>
                </div>
            ))}
        </div>

        {unloggedAssignedJobs.length > 0 && (
          <div className="pt-4 border-t">
            <Label className="font-semibold">Log Time for Other Assigned Jobs</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={popoverOpen} className="w-full justify-between mt-2">
                  Select a job to add...
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search job title..." />
                  <CommandEmpty>No job found.</CommandEmpty>
                  <CommandList>
                    {unloggedAssignedJobs.map((job) => (
                      <CommandItem key={job.id} onSelect={() => handleAddJobLog(job.id)}>
                        <Check className={cn("mr-2 h-4 w-4", "opacity-0")} />
                        {job.title}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="pt-4 border-t">
          <Label className="font-semibold">Overall Work Summary <span className="text-red-500">*</span></Label>
         
          {/* Apply the 'hidden' class when the dialog is open */}
          <div className={cn("mt-2 border rounded-md", { 'hidden': isLogDialogOpen })}>
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
      />
    </>
  );
};