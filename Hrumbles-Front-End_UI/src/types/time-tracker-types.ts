// ============================================================
// Holiday & Weekend Config Types
// ============================================================

export type HolidayType = "National" | "Regional" | "Company";

export type WeekendPattern =
  | "all"          // Every occurrence is off
  | "none"         // Never off (fully working day)
  | "alternate"    // Alternating: 1st,3rd working; 2nd,4th off
  | "1st_3rd"      // 1st and 3rd off, rest working
  | "2nd_4th"      // 2nd and 4th off, rest working
  | "2nd_4th_5th"; // 2nd, 4th, 5th off; 1st, 3rd working

export type DayStatus =
  | "working"
  | "weekend"
  | "holiday"
  | "exception_working"
  | "exception_nonworking";

export interface Holiday {
  id: string;
  name: string;
  date: string;             // "yyyy-MM-dd"
  day_of_week: string;
  type: HolidayType;
  is_recurring: boolean;
  applicable_regions?: string;
  created_at?: string;
  updated_at?: string;
}

export type OfficialHolidayInsert = Omit<Holiday, "id" | "created_at" | "updated_at">;

export interface WeekendConfig {
  id?: string;
  organization_id: string;
  day_of_week: number;   // 0=Sun 1=Mon ... 6=Sat
  is_weekend: boolean;
  pattern: WeekendPattern;
  effective_from?: string;
}

export interface WorkingDayException {
  id: string;
  organization_id: string;
  exception_date: string;  // "yyyy-MM-dd"
  is_working_day: boolean;
  reason?: string;
  created_at?: string;
}

// Label helpers
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const PATTERN_LABELS: Record<WeekendPattern, string> = {
  all:         "All — every occurrence is off",
  none:        "None — fully working day",
  alternate:   "Alternate — 1st & 3rd work, 2nd & 4th off",
  "1st_3rd":   "1st & 3rd off, rest working",
  "2nd_4th":   "2nd & 4th off, rest working",
  "2nd_4th_5th": "2nd, 4th & 5th off, 1st & 3rd working",
};

// Default weekend config (Sat + Sun fully off)
export const DEFAULT_WEEKEND_CONFIG: Omit<WeekendConfig, "id" | "organization_id">[] = [
  { day_of_week: 0, is_weekend: true,  pattern: "all", effective_from: "2024-01-01" }, // Sun
  { day_of_week: 6, is_weekend: true,  pattern: "all", effective_from: "2024-01-01" }, // Sat
];

// ============================================================
// Existing types (preserved)
// ============================================================

export interface CandidateWithTime {
  id: string;
  name: string;
  submissionDate: string;
  mainStatus?: string;
  subStatus?: string;
  hours: number;
  minutes: number;
}

export interface JobLog {
  jobId: string;
  jobTitle: string;
  clientName: string;
  candidates: CandidateWithTime[];
  challenges: string;
  job_display_id?: string;
  job_type?: string;
  submission_type?: string;
  job_type_category?: string;
}

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
  project_time_data?: { projects: DetailedTimesheetEntry[] };
  recruiter_report_data?: RecruitmentReport | any;
  created_at?: string;
  updated_at?: string;
}

export interface DetailedTimesheetEntry {
  project_id: string;
  project_name: string;
  hours: number;
  tasks: string;
}

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
  recruiter_report_data?: JobLog[];
}

export interface RecruitmentReport {
  workStatus: { profilesWorkedOn: string; profilesUploaded: number };
  atsReport: { resumesATS: number; resumesTalentPool: number };
  candidateStatus: { paidSheet: number; unpaidSheet: number; linedUp: number; onField: number };
  activitySummary: { contacted: number; totalCalls: number; connected: number; notConnected: number; callBack: number; proofNote: string };
  scheduling: Array<{ name: string; mobile: string; position: string; proof: boolean; timeShared: boolean; jdShared: boolean }>;
  walkIns: { expected: number; proofAttached: boolean; reminderNeeded: boolean };
  qualityCheck: { reviewedCount: number; candidateNames: string };
  targets: { source: number; calls: number; lineups: number; closures: number };
}