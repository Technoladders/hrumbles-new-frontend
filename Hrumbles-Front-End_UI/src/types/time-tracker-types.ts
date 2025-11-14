// Updated types for time tracking with recruiter timesheet support

// Interface for a candidate with time tracking
export interface CandidateWithTime {
  id: string;
  name: string;
  submissionDate: string;
  mainStatus?: string;
  subStatus?: string;
  hours: number;
  minutes: number;
}

// JobLog interface for recruiter timesheets
export interface JobLog {
  jobId: string;
  jobTitle: string;
  clientName: string;
  candidates: CandidateWithTime[]; // Per-candidate time tracking
  challenges: string;
  job_display_id?: string;
  job_type?: string;
  submission_type?: string;
  job_type_category?: string;
}

// Original TimeLog interface (keeping existing structure)
export interface TimeLog {
  id: string;
  employee_id: string;
  date: string;
  title?: string;
  notes?: string;
  clock_in_time?: string;
  clock_out_time?: string;
  duration_minutes?: number;
  is_submitted: boolean;
  break_logs?: Array<{
    break_start: string;
    break_end: string;
    break_duration_minutes: number;
  }>;
  total_working_hours?: number;
  project_time_data?: {
    projects: DetailedTimesheetEntry[];
  };
  recruiter_report_data?: JobLog[]; // NEW: Store recruiter job logs
  created_at?: string;
  updated_at?: string;
}

// Project-based timesheet entry
export interface DetailedTimesheetEntry {
  project_id: string;
  project_name: string;
  hours: number;
  tasks: string;
}

// For submission payload
export interface TimesheetSubmissionData {
  employeeId: string;
  date: Date;
  title?: string;
  notes?: string;
  workReport?: string;
  totalWorkingHours?: number;
  clockIn?: string;
  projectEntries?: DetailedTimesheetEntry[];
  detailedEntries?: DetailedTimesheetEntry[];
  recruiter_report_data?: JobLog[]; // NEW: Include recruiter data in submissions
}