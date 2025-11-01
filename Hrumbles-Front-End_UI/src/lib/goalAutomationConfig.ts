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
      { label: "Proposal Sent", value: "Proposal Sent / In Discussion" },
      { label: "Won", value: "Closed - Won" },
    ],
  },
];