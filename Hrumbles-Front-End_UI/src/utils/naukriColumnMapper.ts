// src/utils/naukriColumnMapper.ts  ─── FINAL
// ─────────────────────────────────────────────────────────────────────────────
// Maps any Naukri Excel row to a typed NaukriRow using header-driven alignment.
//
// Works for all known formats:
//   70-col  (no Source Of Application,  Email ID at header index 3)
//   75-col  (with Source Of Application, Email ID at header index 4)
//   89-col  (master merge, Email ID header at 4 but data shifted to 1, 5, 6…)
//   Any future Naukri export as long as "Email ID" header exists.
//
// Column alignment is done in useMigrationEngine.ts using the shift algorithm.
// This file only handles header→NaukriRow key mapping and validation.
// ─────────────────────────────────────────────────────────────────────────────

export interface NaukriRow {
  candidate_name?: string;
  email?: string;
  phone?: string;
  current_location?: string;
  preferred_locations?: string;
  total_experience?: string;
  current_company?: string;
  current_designation?: string;
  current_salary?: string;
  notice_period?: string;
  resume_headline?: string;
  professional_summary?: string;
  key_skills?: string;
  ug_degree?: string;
  ug_specialization?: string;
  ug_university?: string;
  ug_year?: string;
  pg_degree?: string;
  pg_specialization?: string;
  pg_university?: string;
  pg_year?: string;
  doctorate_degree?: string;
  doctorate_specialization?: string;
  doctorate_university?: string;
  doctorate_year?: string;
  suggested_title?: string;
  department?: string;
  functional_role?: string;
  industry?: string;
  applied_at?: string;
  pipeline_stage?: string;
  source_platform?: string;
  gender?: string;
  marital_status?: string;
  home_town?: string;
  pin_code?: string;
  date_of_birth?: string;
  permanent_address?: string;
  work_permit_usa?: string;
  star_rating?: string;
  last_workflow_activity?: string;
  comments?: Record<string, string>;
}

// ─── Header → NaukriRow field mapping ─────────────────────────────────────────
// Every known Naukri column name is listed here.
// Add new mappings here when Naukri adds new columns in the future.
export const NAUKRI_HEADER_MAP: Record<string, keyof NaukriRow> = {
  // Core identity
  "Name":                                "candidate_name",
  "Email ID":                            "email",
  "Phone Number":                        "phone",
  // Location
  "Current Location":                    "current_location",
  "Preferred Locations":                 "preferred_locations",
  // Experience
  "Total Experience":                    "total_experience",
  "Curr. Company name":                  "current_company",
  "Curr. Company Designation":           "current_designation",
  "Annual Salary":                       "current_salary",
  "Notice Period":                       "notice_period",
  "Notice period/ Availability to join": "notice_period",
  // Text content
  "Resume Headline":                     "resume_headline",
  "Summary":                             "professional_summary",
  // Skills
  "Key Skills":                          "key_skills",
  // Education UG
  "Under Graduation degree":             "ug_degree",
  "UG Specialization":                   "ug_specialization",
  "UG University/institute Name":        "ug_university",
  "UG Graduation year":                  "ug_year",
  // Education PG
  "Post graduation degree":              "pg_degree",
  "PG specialization":                   "pg_specialization",
  "PG university/institute name":        "pg_university",
  "PG graduation year":                  "pg_year",
  // Education Doctorate
  "Doctorate degree":                    "doctorate_degree",
  "Doctorate specialization":            "doctorate_specialization",
  "Doctorate university/institute name": "doctorate_university",
  "Doctorate graduation year":           "doctorate_year",
  // Role classification
  "Job Title":                           "suggested_title",
  "Functional Area":                     "department",
  "Department":                          "department",
  "Role":                                "functional_role",
  "Industry":                            "industry",
  // Application metadata
  "Date of application":                 "applied_at",
  "Source Of Application":               "source_platform",
  "Latest Pipeline Stage":               "pipeline_stage",
  "Latest Star Rating":                  "star_rating",
  "Last Workflow activity":              "last_workflow_activity",
  // Personal
  "Gender":                              "gender",
  "Marital Status":                      "marital_status",
  "Home Town/City":                      "home_town",
  "Pin Code":                            "pin_code",
  "Work permit for USA":                 "work_permit_usa",
  "Date of Birth":                       "date_of_birth",
  "Permanent Address":                   "permanent_address",
};

// Headers to silently discard (audit/workflow metadata not useful in talent pool)
export const SKIP_HEADERS = new Set([
  "Last Workflow activity by",
  "Time of Last Workflow activity Update",
  "Pipeline Status Updated By",
  "Time when Stage updated",
  "Download", "Downloaded By", "Time Of Download",
  "Viewed", "Viewed By", "Time Of View",
  "Emailed", "Emailed By", "Time Of Email",
  "Calling Status", "Calling Status updated by",
  "Time of Calling activity update",
]);

// ─── Core helpers ─────────────────────────────────────────────────────────────
export function isNA(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  const s = String(val).trim().toLowerCase();
  return s === "" || s === "na" || s === "n/a" || s === "null" || s === "none" || s === "-";
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function parseMultipleEmails(raw: unknown): {
  primary: string | null;
  additional: string[];
  hasMultiple: boolean;
} {
  if (isNA(raw)) return { primary: null, additional: [], hasMultiple: false };
  const parts = String(raw).split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  const valid  = parts.filter((s) => isValidEmail(s)).map((e) => e.toLowerCase());
  return { primary: valid[0] ?? null, additional: valid.slice(1), hasMultiple: parts.length > 1 };
}

export function parseMultiplePhones(raw: unknown): {
  primary: string | null;
  additional: string[];
} {
  if (isNA(raw)) return { primary: null, additional: [] };
  const parts = String(raw).split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  const unique = [...new Set(parts)];
  return { primary: unique[0] ?? null, additional: unique.slice(1) };
}

/**
 * Maps a pre-aligned header→value object to a typed NaukriRow.
 * The alignment (handling column shifts) is done BEFORE calling this.
 */
export function mapRawRowToNaukriRow(raw: Record<string, unknown>): NaukriRow {
  const result: NaukriRow = {};

  for (const [header, value] of Object.entries(raw)) {
    if (SKIP_HEADERS.has(header)) continue;

    const key = NAUKRI_HEADER_MAP[header];
    if (key) {
      const cleaned = isNA(value) ? undefined : String(value).trim();
      if (cleaned) (result as Record<string, unknown>)[key] = cleaned;
      continue;
    }

    // Comment columns: "Comment 1", "Comment 1 BY", …
    const cmtMatch = header.match(/^Comment (\d+)( BY)?$/i);
    if (cmtMatch && !isNA(value)) {
      if (!result.comments) result.comments = {};
      const ck = cmtMatch[2] ? `comment_${cmtMatch[1]}_by` : `comment_${cmtMatch[1]}`;
      result.comments[ck] = String(value).trim();
    }
  }

  return result;
}

/** Returns the display email (primary from potentially comma-separated). */
export function getPrimaryEmail(row: NaukriRow): string | null {
  return parseMultipleEmails(row.email).primary;
}