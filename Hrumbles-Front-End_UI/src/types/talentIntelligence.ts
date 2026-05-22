// src/types/talentIntelligence.ts  — v3
// Added: SkillChip/SkillMode, extended filters (titles, employers, edu, yrs exp)

export type SkillMode = 'must' | 'nice' | 'exclude';
export interface SkillChip { label: string; mode: SkillMode; }

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
  name: string; authority: string; license: string;
  start_date_year: number | null; start_date_month: number | null;
  end_date_year: number | null; end_date_month: number | null;
}

export interface TIRevealedEmail { email: string; type: string; is_primary: boolean; }
export interface TIRevealedPhone { number: string; type: string; validity: string; recommended: boolean; premium?: boolean; }

export interface TIProfile {
  id: string; linkedin_url: string; li_vanity: string | null;
  full_name: string | null; title: string | null; headline: string | null;
  summary: string | null; profile_picture_url: string | null;
  location: string | null; country: string | null;
  job_function: string | null; seniority: string | null; work_status: string | null;
  company: any; company_name: string | null; company_domain: string | null;
  company_industry: string | null; company_size: number | null;
  experience: TIExperience[] | null; education: TIEducation[] | null;
  skills: string[] | null; certifications: TICertification[] | null;
  publications: any[] | null; projects: any[] | null;
  languages: { name: string; proficiency: string }[] | null;
  contact_availability: TIContactAvailability | null; followers: number | null;
  revealed_emails: TIRevealedEmail[] | null; revealed_phones: TIRevealedPhone[] | null;
  revealed_at: string | null; first_seen_at: string | null; updated_at: string | null;
  first_discovered_at: string | null; last_seen_at: string | null;
  discovery_count: number | null; total_count?: number;
}

export type TIRevealedStatus = 'all' | 'email_revealed' | 'phone_revealed' | 'not_revealed';

export interface TIFilters {
  // Core
  query:           string;
  skillChips:      SkillChip[];
  titles:          string[];
  location:        string;
  yearsExperience: string;     // '' | '0_2' | '3_5' | '6_10' | '10'
  openToWork:      boolean;
  // Employer & Role
  currentEmployer:  string[];
  previousEmployer: string[];
  previousTitle:    string[];
  // Company
  industry:  string[];
  // Education
  school: string[];
  degree: string[];
  major:  string[];
  // Contact
  hasEmail:       boolean;
  hasPhone:       boolean;
  revealedStatus: TIRevealedStatus;
}

export const DEFAULT_TI_FILTERS: TIFilters = {
  query: '', skillChips: [], titles: [], location: '', yearsExperience: '',
  openToWork: false, currentEmployer: [], previousEmployer: [], previousTitle: [],
  industry: [], school: [], degree: [], major: [],
  hasEmail: false, hasPhone: false, revealedStatus: 'all',
};

export interface OrgProfileStats {
  total_profiles: number; email_available: number; phone_available: number;
  email_revealed: number; phone_revealed: number; not_revealed: number; open_to_work: number;
}

// ── Sidebar option lists ─────────────────────────────────────

export const YEARS_EXP_OPTIONS = [
  { label: "Any experience", value: "" },
  { label: "0–2 years",      value: "0_2" },
  { label: "3–5 years",      value: "3_5" },
  { label: "6–10 years",     value: "6_10" },
  { label: "10+ years",      value: "10" },
];

export const SENIORITY_OPTIONS = [
  { value: "Owner / Founder", label: "Owner / Founder" },
  { value: "CXO",    label: "C-Suite / CXO" },
  { value: "Partner", label: "Partner" },
  { value: "VP",      label: "VP" },
  { value: "Head",    label: "Head" },
  { value: "Director", label: "Director" },
  { value: "Manager",  label: "Manager" },
  { value: "Senior",   label: "Senior" },
  { value: "Entry",    label: "Entry Level" },
  { value: "Intern",   label: "Intern" },
];

export const JOB_FUNCTION_OPTIONS = [
  "Engineering","Sales","Marketing","Product Management","Operations","Finance",
  "Human Resources","Design","Information Technology","Business Development",
  "Customer Success and Support","Legal","Consulting","Research","Education",
  "Healthcare Services","Administrative","Accounting","Media and Communication",
  "Program and Project Management",
];

export const INDUSTRY_OPTIONS: string[] = [
  "Computer Software","Information Technology & Services","Internet","Financial Services",
  "Banking","Healthcare","Retail","Manufacturing","Telecommunications",
  "Education Management","Marketing & Advertising","Management Consulting",
  "Human Resources","Oil & Energy","Pharmaceuticals","Real Estate","Insurance",
  "Automotive","Construction","Logistics & Supply Chain","Media & Entertainment",
  "Legal Services","E-Learning","Staffing & Recruiting","Computer Hardware",
  "Biotechnology","Aerospace & Defense","Consumer Electronics","Food & Beverages",
  "Renewables & Environment","Capital Markets","Venture Capital & Private Equity",
  "Computer & Network Security","Hospital & Health Care","Research","Design",
];

export const DEGREE_OPTIONS = [
  "Bachelor's","Master's","MBA","PhD","Associate's","JD","MD","B.Tech","M.Tech","B.E.",
];

export const TI_PAGE_SIZE = 25;

// ── Utility ──────────────────────────────────────────────────

export function calcYearsExperience(experience: TIExperience[] | null): number | null {
  if (!experience?.length) return null;
  const years = experience
    .map(e => Number(e.start_date_year))
    .filter(y => y > 1970 && y <= new Date().getFullYear());
  if (!years.length) return null;
  return new Date().getFullYear() - Math.min(...years);
}