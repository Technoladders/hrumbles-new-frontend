// src/lib/goalAutomationConfig.ts

export interface AutomationSource {
  label: string; // User-friendly name, e.g., "Contacts"
  value: string; // Unique key, e.g., "contacts"
  sourceTable: string; // The actual database table
  valueColumn: string; // The column to COUNT()
  employeeColumn: string; // The column linking to the employee
  dateColumn: string; // The date column for filtering
  filterColumn: string; // The column that contains the status/stage
   isDynamic: boolean; 
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
    isDynamic: true,
    statuses: [{ label: "Processed (Client)", value: "Processed (Client)" }],
  },
  {
    label: "Hiring (Onboarding)",
    value: "hiring_onboarding",
    sourceTable: "hr_status_change_counts",
    valueColumn: "count",
    employeeColumn: "candidate_owner",
    dateColumn: "created_at",
    filterColumn: "sub_status_id",
     isDynamic: true, 
   statuses: [{ label: "Joined", value: "Joined" }],
  },
  {
    label: "Contacts",
    value: "contacts",
    sourceTable: "contact_stage_history",
    valueColumn: "id",
    employeeColumn: "employee_id",
    dateColumn: "changed_at",
    filterColumn: "stage_name",
    isDynamic: false,
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
    isDynamic: false,
    statuses: [
      { label: "Identified", value: "Identified" },
      { label: "Proposal Sent", value: "Proposal Sent / In Discussion" },
      { label: "Won", value: "Closed - Won" },
      // Add other company statuses here
    ],
  },
];