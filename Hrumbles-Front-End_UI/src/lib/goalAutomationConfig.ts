// src/lib/goalAutomationConfig.ts

export interface AutomationSource {
  label: string;
  value: string;
  sourceTable: string;
  valueColumn: string;
  employeeColumn: string;
  dateColumn: string;
  filterColumn: string;
  isDynamic: boolean;
  statuses: { label: string; value: string }[];
}

// NOTE: Hiring goals are now handled dynamically in CreateGoalForm.tsx
export const AUTOMATION_SOURCES: AutomationSource[] = [
  {
    label: "Contacts",
    value: "contacts",
    sourceTable: "contact_stage_history",
    valueColumn: "id", // Assuming we count distinct records
    employeeColumn: "employee_id",
    dateColumn: "changed_at",
    filterColumn: "stage_name",
    isDynamic: false,
    statuses: [
      { label: "Identified", value: "Identified" },
      { label: "Contacted", value: "Contacted" },
      { label: "Engaged", value: "Engaged" },
      { label: "Qualified", value: "Qualified" },
    { label: "In Discussion", value: "In Discussion" },
    { label: "Referred to Company", value: "Referred to Company" },
    { label: "Follow-up Scheduled", value: "Follow-up Scheduled" },
    { label: "Dropped / Not a Fit", value: "Dropped / Not a Fit" },
      { label: "Converted", value: "Converted" },
    ],
  },
  {
    label: "Companies",
    value: "companies",
    sourceTable: "company_status_history",
    valueColumn: "id", // Assuming we count distinct records
    employeeColumn: "employee_id",
    dateColumn: "changed_at",
    filterColumn: "status_name",
    isDynamic: false,
    statuses: [
      { label: "Identified", value: "Identified" },
      { label: "Targeting", value: "Targeting" },
      { label: "In Outreach", value: "In Outreach" },
      { label: "Warm", value: "Warm" },
      { label: "Qualified Company", value: "Qualified Company" },
      { label: "Proposal Sent", value: "Proposal Sent / In Discussion" },
      { label: "Negotiation", value: "Negotiation" },
      { label: "Won", value: "Closed - Won" },
      { label: "Closed - Lost", value: "Closed - Lost" },
      { label: "Re-engage Later", value: "Re-engage Later" },
    ],
  },
];
