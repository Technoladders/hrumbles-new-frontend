// ── Leave request form values — standardised field names ─────

export interface LeaveRequestFormValues {
  leave_type_id:         string;
  date_range:            LeaveRequestDateRange;
  day_breakdown:         LeaveDayBreakdown[];
  reason:                string;
  additional_recipients: string[];   // ← was additional_recipient (without s)
  cc_recipients:         string[];
}

// ── Everything else unchanged from previous version ──────────

export interface LeaveRequest {
  id:                  string;
  employee_id:         string;
  leave_type_id:       string;
  start_date:          string;
  end_date:            string;
  total_days:          number;
  working_days:        number;
  holiday_days:        number;
  status:              "pending" | "approved" | "rejected" | "cancelled";
  notes:               string | null;
  cancellation_reason: string | null;
  rejection_reason:    string | null;
  approved_at:         string | null;
  approved_by:         string | null;
  cancelled_at:        string | null;
  cancelled_by:        string | null;
  created_at:          string | null;
  updated_at:          string | null;
  leave_type?:         LeaveType | null;
  employee?: {
    id:         string;
    name:       string;
    department: string;
  } | null;
}

export interface LeaveDayBreakdown {
  date: string;
  type: "full" | "half_am" | "half_pm";
}

export interface LeaveRequestDateRange {
  startDate: Date | null;
  endDate:   Date | null;
}

export interface LeaveRequestFormData {
  leaveTypeId:           string;
  startDate:             string;
  endDate:               string;
  notes:                 string;
  dayBreakdown:          LeaveDayBreakdown[];
  additionalRecipients:  string[];
  ccRecipients:          string[];
}

export type EmploymentType =
  | "permanent" | "contract" | "probation" | "intern" | "part_time";

export interface PolicyApplicability {
  employment_types:  EmploymentType[];
  department_ids:    string[];
  designation_ids:   string[];
  min_tenure_months: number;
}

export interface LeavePolicySettings {
  proration:                  boolean;
  probation_period_days:      number;
  can_apply_during_probation: boolean;
  max_consecutive_days:       number;
  requires_approval:          boolean;
  carry_forward_limit:        number;
  encashment_allowed:         boolean;
  accrual_frequency:          "annual_upfront" | "monthly";
}

export interface LeaveType {
  id:                string;
  name:              string;
  icon:              string;
  color:             string;
  description?:      string;
  annual_allowance:  number;
  gender_eligibility: string[];
  is_active:         boolean;
  monthly_allowance: number;
  allow_carryforward: boolean;
  policy_settings:   LeavePolicySettings;
  applicability?:    PolicyApplicability;
  created_at:        string | null;
  updated_at:        string | null;
  organization_id?:  string;
}

export interface EmployeeLeaveBalance {
  id:               string;
  employee_id:      string;
  leave_type_id:    string;
  year:             number;
  remaining_days:   number;
  used_days:        number;
  carryforward_days: number;
  created_at:       string | null;
  updated_at:       string | null;
  leave_type?:      LeaveType | null;
}

export interface LeavePolicyPeriod {
  id:              string;
  organization_id?: string;
  is_calendar_year: boolean;
  start_month:     number;
  created_at:      string | null;
  updated_at:      string | null;
}

export interface LeaveTypeSummary {
  leave_type_id:    string;
  leave_type_name:  string;
  leave_type_color: string;
  total_employees:  number;
  total_allocated:  number;
  total_used:       number;
  total_remaining:  number;
  avg_remaining:    number;
}

export type LedgerEventType =
  | "accrual" | "usage" | "adjustment"
  | "carry_forward" | "encashment" | "lapse";

export interface LedgerEntry {
  id:               string;
  employee_id:      string;
  leave_type_id:    string;
  event_type:       LedgerEventType;
  credit:           number;
  debit:            number;
  running_balance?: number;
  transaction_date: string;
  reason:           string;
  created_by?:      string;
  leave_type:       { name: string; color: string };
}

export interface ManualAdjustmentPayload {
  employee_id:    string;
  leave_type_id:  string;
  year:           number;
  type:           "credit" | "debit";
  days:           number;
  reason:         string;
}