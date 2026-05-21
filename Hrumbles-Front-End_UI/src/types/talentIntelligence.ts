// src/types/talentIntelligence.ts  — v2
// Added: revealedStatus filter, OrgProfileStats

export interface TIContactAvailability {
  phone: boolean;
  work_email: boolean;
  personal_email: boolean;
}

export interface TIExperience {
  title: string;
  company_name: string;
  domain: string | null;
  start_date: string;
  end_date: string;
  start_date_year: number;
  start_date_month: number;
  end_date_year: number;
  end_date_month: number;
  is_current: boolean;
  locality: string;
  logo_url: string | null;
  linkedin_url: string;
  summary: string;
}

export interface TIEducation {
  school_name: string;
  degree: string;
  field_of_study: string;
  start_date_year: string | number;
  end_date_year: string | number;
  location: string | null;
  url: string | null;
  description: string | null;
}

export interface TICertification {
  name: string;
  authority: string;
  license: string;
  start_date_year: number | null;
  start_date_month: number | null;
  end_date_year: number | null;
  end_date_month: number | null;
}

export interface TICompany {
  name: string;
  domain: string;
  industry: string;
  size: number;
  logo_url: string | null;
  url: string;
  type: string;
  country: string;
  revenue: number | null;
}

export interface TIRevealedEmail {
  email: string;
  type: string;
  is_primary: boolean;
}

export interface TIRevealedPhone {
  number: string;
  type: string;
  validity: string;
  recommended: boolean;
  premium?: boolean;
}

export interface TIProfile {
  id: string;
  linkedin_url: string;
  li_vanity: string | null;
  full_name: string | null;
  title: string | null;
  headline: string | null;
  summary: string | null;
  profile_picture_url: string | null;
  location: string | null;
  country: string | null;
  job_function: string | null;
  seniority: string | null;
  work_status: string | null;
  company: TICompany | null;
  company_name: string | null;
  company_domain: string | null;
  company_industry: string | null;
  company_size: number | null;
  experience: TIExperience[] | null;
  education: TIEducation[] | null;
  skills: string[] | null;
  certifications: TICertification[] | null;
  publications: any[] | null;
  projects: any[] | null;
  languages: { name: string; proficiency: string }[] | null;
  contact_availability: TIContactAvailability | null;
  followers: number | null;
  revealed_emails: TIRevealedEmail[] | null;
  revealed_phones: TIRevealedPhone[] | null;
  revealed_at: string | null;
  first_seen_at: string | null;
  updated_at: string | null;
  first_discovered_at: string | null;
  last_seen_at: string | null;
  discovery_count: number | null;
  total_count?: number;
}

// ── Filters ───────────────────────────────────────────────────

export type TIRevealedStatus = 'all' | 'email_revealed' | 'phone_revealed' | 'not_revealed';

export interface TIFilters {
  query:          string;
  location:       string;
  seniority:      string[];
  jobFunction:    string[];
  company:        string;
  industry:       string[];
  skills:         string[];
  openToWork:     boolean;
  hasEmail:       boolean;
  hasPhone:       boolean;
  revealedStatus: TIRevealedStatus;
}

export const DEFAULT_TI_FILTERS: TIFilters = {
  query:          "",
  location:       "",
  seniority:      [],
  jobFunction:    [],
  company:        "",
  industry:       [],
  skills:         [],
  openToWork:     false,
  hasEmail:       false,
  hasPhone:       false,
  revealedStatus: "all",
};

// ── Stats ─────────────────────────────────────────────────────

export interface OrgProfileStats {
  total_profiles:  number;
  email_available: number;
  phone_available: number;
  email_revealed:  number;
  phone_revealed:  number;
  not_revealed:    number;
  open_to_work:    number;
}

// ── Sidebar constants ─────────────────────────────────────────

export const SENIORITY_OPTIONS = [
  { value: "Owner / Founder", label: "Owner / Founder" },
  { value: "CXO",             label: "C-Suite / CXO" },
  { value: "Partner",         label: "Partner" },
  { value: "VP",              label: "VP" },
  { value: "Head",            label: "Head" },
  { value: "Director",        label: "Director" },
  { value: "Manager",         label: "Manager" },
  { value: "Senior",          label: "Senior" },
  { value: "Entry",           label: "Entry Level" },
  { value: "Intern",          label: "Intern" },
];

export const JOB_FUNCTION_OPTIONS = [
  { value: "Engineering",                   label: "Engineering" },
  { value: "Sales",                         label: "Sales" },
  { value: "Marketing",                     label: "Marketing" },
  { value: "Product Management",            label: "Product Management" },
  { value: "Operations",                    label: "Operations" },
  { value: "Finance",                       label: "Finance" },
  { value: "Human Resources",               label: "Human Resources" },
  { value: "Design",                        label: "Design" },
  { value: "Information Technology",        label: "Information Technology" },
  { value: "Business Development",          label: "Business Development" },
  { value: "Customer Success and Support",  label: "Customer Success" },
  { value: "Legal",                         label: "Legal" },
  { value: "Consulting",                    label: "Consulting" },
  { value: "Research",                      label: "Research" },
  { value: "Education",                     label: "Education" },
  { value: "Healthcare Services",           label: "Healthcare" },
  { value: "Administrative",               label: "Administrative" },
  { value: "Accounting",                    label: "Accounting" },
  { value: "Media and Communication",       label: "Media" },
  { value: "Program and Project Management", label: "Project Management" },
];

export const INDUSTRY_OPTIONS: string[] = [
  "Computer Software","Information Technology & Services","Internet",
  "Financial Services","Banking","Healthcare","Retail","Manufacturing",
  "Telecommunications","Education Management","Marketing & Advertising",
  "Management Consulting","Human Resources","Oil & Energy","Pharmaceuticals",
  "Real Estate","Insurance","Automotive","Construction","Logistics & Supply Chain",
  "Media & Entertainment","Legal Services","E-Learning","Staffing & Recruiting",
  "Computer Hardware","Biotechnology","Aerospace & Defense","Consumer Electronics",
  "Food & Beverages","Renewables & Environment","Capital Markets",
  "Venture Capital & Private Equity","Computer & Network Security",
  "Hospital & Health Care","Research","Design","Graphic Design","Animation",
  "Publishing","Events Services","Professional Training & Coaching",
];

export const TI_PAGE_SIZE = 25;