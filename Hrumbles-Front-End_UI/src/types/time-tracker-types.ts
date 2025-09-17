export interface TimeLog {
  id: string;
  employee_id: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  duration_minutes: number | null;
  project_id: string | null;
  notes: string | null;
  status: 'normal' | 'grace_period' | 'auto_terminated' | 'absent' | null;
  is_submitted: boolean | null;
  is_approved: boolean | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  project_time_data: any;
  created_at: string | null;
  updated_at: string | null;
  project?: { name: string } | null;
  
  // Additional fields used in components
  clarification_status?: string | null;
  clarification_response?: string | null;
  clarification_submitted_at?: string | null;
  total_working_hours?: number | null;
  detailed_entries?: DetailedTimesheetEntry[] | null;
  workflow_state?: string;
  approval_id?: string | null;
  approval_status?: string | null;
  break_logs: BreakLog[];
  hr_employees?: {
    id: string;
    name: string;
    department: string;
  } | null;
}

interface BreakLog {
  id: string;
  time_log_id: string;
  break_start_time: string;   // TIMESTAMPTZ -> string
  break_end_time: string | null;
  duration_minutes: number | null;
  break_type: "lunch" | "coffee" | string; // expand later if needed
  created_at: string;
}


export interface Employee {
  id: string;
  name: string;
  department: string;
  created_at: string | null;
  updated_at: string | null;
  has_projects?: boolean;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  start_date: string;
  end_date: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface OfficialHolidayInsert {
  holiday_name: string;
  holiday_date: string;
  day_of_week: string | null;
  holiday_type: string;
  is_recurring: boolean;
}

export interface OfficialHoliday {
  id: string;
  holiday_name: string;
  holiday_date: string;
  day_of_week: string | null;
  holiday_type: string;
  applicable_regions: string | null;
  is_recurring: boolean;
  recurring_day: number | null;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  day_of_week: string;
  type: string;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegularizationRequest {
  id: string;
  employee_id: string;
  time_log_id?: string | null;
  date: string;
  original_clock_in?: string | null;
  original_clock_out?: string | null;
  requested_clock_in: string;
  requested_clock_out: string;
  reason: string;
  status: string;
  approver_id?: string | null;
  approver_notes?: string | null;
  created_at: string;
  updated_at: string;
  hr_employees?: {
    id: string;
    name: string;
    department: string;
  } | null;
  time_logs?: TimeLog | null;
}

export interface DetailedTimesheetEntry {
  title: string;
  description?: string;
  hours: number;
}

export interface TimesheetFormData {
  date: Date;
  clockIn: string;
  clockOut: string;
  projectAllocations: Array<{
    projectId: string;
    hours: number;
    report: string;
  }>;
  title: string;
  workReport: string;
}

export interface TimeTrackerSettings {
  workingHoursPerDay: number;
  gracePeriodHours: number;
}
