
export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  working_days: number;
  holiday_days: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  notes: string | null;
  cancellation_reason: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  leave_type?: LeaveType | null;
  employee?: {
    id: string;
    name: string;
    department: string;
  } | null;
}

export interface LeaveDayBreakdown {
  date: string; // "yyyy-MM-dd" format
  type: 'full' | 'half_am' | 'half_pm';
}

export interface LeaveRequestDateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface LeaveRequestFormData {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  notes: string;
  dayBreakdown: LeaveDayBreakdown[]; // Pass the breakdown to the hook
  additionalRecipients: string[];
  ccRecipients: string[];
}


export interface LeaveRequestFormValues {
  leave_type_id: string;
  date_range: LeaveRequestDateRange;
  day_breakdown: LeaveDayBreakdown[]; // This will now hold the day-by-day selections
  reason: string;
  additional_recipients: string[];
  cc_recipients: string[]; 
}

export interface LeaveType {
  id: string;
  name: string;
  icon: string;
  color: string;
  annual_allowance: number;
  monthly_allowance: number;
  allow_carryforward: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface EmployeeLeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  remaining_days: number;
  used_days: number;
  carryforward_days: number;
  created_at: string | null;
  updated_at: string | null;
  leave_type?: LeaveType | null;
}

export interface LeavePolicyPeriod {
  id: string;
  is_calendar_year: boolean;
  start_month: number;
  created_at: string | null;
  updated_at: string | null;
}
