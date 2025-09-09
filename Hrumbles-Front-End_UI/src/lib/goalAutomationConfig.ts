// src/lib/goalAutomationConfig.ts

export interface AutomationSource {
  label: string; // User-friendly name, e.g., "Contacts"
  value: string; // Unique key, e.g., "contacts"
  sourceTable: string; // The actual database table
  valueColumn: string; // The column to COUNT()
  employeeColumn: string; // The column linking to the employee
  dateColumn: string; // The date column for filtering
  filterColumn: string; // The column that contains the status/stage
  statuses: { label: string; value: string }[]; // The list of statuses for the dropdown
}

export const AUTOMATION_SOURCES: AutomationSource[] = [
  {
    label: "Hiring (Submissions)",
    value: "hiring_submissions",
    sourceTable: "hr_status_change_counts",
    valueColumn: "count",
    employeeColumn: "candidate_owner",
    dateColumn: "created_at",
    filterColumn: "sub_status_id",
    statuses: [
      { label: "Submission", value: "71706ff4-1bab-4065-9692-2a1237629dda" },
    ],
  },
  {
    label: "Hiring (Onboarding)",
    value: "hiring_onboarding",
    sourceTable: "hr_status_change_counts",
    valueColumn: "count",
    employeeColumn: "candidate_owner",
    dateColumn: "created_at",
    filterColumn: "sub_status_id",
    statuses: [
      { label: "Onboarding", value: "c9716374-3477-4606-877a-dfa5704e7680" },
    ],
  },
  {
    label: "Contacts",
    value: "contacts",
    sourceTable: "contact_stage_history",
    valueColumn: "id",
    employeeColumn: "employee_id",
    dateColumn: "changed_at",
    filterColumn: "stage_name",
    statuses: [
      { label: "Identified", value: "Identified" },
      { label: "Contacted", value: "Contacted" },
      { label: "Engaged", value: "Engaged" },
      { label: "Converted", value: "Converted" },
      // Add other contact stages here
    ],
  },
  {
    label: "Companies",
    value: "companies",
    sourceTable: "company_status_history",
    valueColumn: "id",
    employeeColumn: "employee_id",
    dateColumn: "changed_at",
    filterColumn: "status_name",
    statuses: [
      { label: "Identified", value: "Identified" },
      { label: "Proposal Sent", value: "Proposal Sent / In Discussion" },
      { label: "Won", value: "Closed - Won" },
      // Add other company statuses here
    ],
  },
];