// src/components/RocketReachSearch/types/index.ts

export interface RRProfile {
  id: number;
  name: string | null;
  status: "complete" | "progress" | "searching" | "not queued";
  profile_pic?: string;
  linkedin_url?: string | null;
  current_title?: string | null;
  current_employer?: string | null;
  current_employer_domain?: string | null;
  current_employer_website?: string | null;
  current_employer_linkedin_url?: string | null;
  location?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string;
  country_code?: string | null;
  connections?: number;
  skills?: string[] | null;
  birth_year?: number;
  update_time?: string;
  links?: Record<string, string>;
  suppressed?: string | boolean;
  current_employer_id?: number;
  teaser?: {
    emails?: string[];
    personal_emails?: string[];
    professional_emails?: string[];
    phones?: { number: string; is_premium: boolean }[];
    office_phones?: string[];
    is_premium_phone_available?: boolean;
  } | null;
  // Enriched after lookup (added client-side)
  _enriched?: boolean;
  _allEmails?: RREmailEntry[];
  _allPhones?: RRPhoneEntry[];
  _jobHistory?: RRJobHistoryEntry[];
  _education?: RREducationEntry[];
  _skills?: string[];
  _contactId?: string | null;
  _candidateProfileId?: string | null;
}

export interface RREmailEntry {
  email: string;
  type: string;
  grade: string | null;
  smtp_valid: string | null;
  source: string;
  is_primary: boolean;
}

export interface RRPhoneEntry {
  number: string;
  type: string;
  validity: string;
  recommended: boolean;
  premium: boolean;
  source: string;
}

export interface RRJobHistoryEntry {
  start_date?: string | null;
  end_date?: string | null;
  company?: string | null;
  company_name?: string;
  company_linkedin_url?: string;
  department?: string;
  sub_department?: string | null;
  title?: string;
  highest_level?: string;
  description?: string;
  is_current?: boolean;
  company_city?: string;
  company_region?: string;
  company_country_code?: string;
}

export interface RREducationEntry {
  major?: string | null;
  school?: string | null;
  degree?: string | null;
  start?: number | null;
  end?: number | null;
}

export interface RRLookupResult {
  success: boolean;
  servedFromCache: boolean;
  rrProfileId: string;
  contactId: string | null;
  candidateProfileId: string | null;
  pathTaken: string;
  name: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  linkedinUrl: string | null;
  profilePic: string | null;
  connections: number | null;
  email: string | null;
  emailStatus: string | null;
  allEmails: RREmailEntry[];
  phone: string | null;
  allPhones: RRPhoneEntry[];
  jobHistory: RRJobHistoryEntry[];
  education: RREducationEntry[];
  skills: string[];
}

export type RRLookupState = "idle" | "loading" | "success" | "error";

export interface RRLookupError {
  type: "auth" | "credits" | "rateLimit" | "notFound" | "unknown";
  message: string;
  statusCode?: number;
}

export type RRSearchState = "idle" | "loading" | "results" | "empty" | "error";

export interface RRSearchError {
  type: "auth" | "rateLimit" | "invalid" | "unknown";
  message: string;
  statusCode?: number;
}

// Skill filter chip
export type SkillMode = "must" | "nice" | "exclude";
export interface SkillChip { label: string; mode: SkillMode; }

// Filter state
export interface RRFilterState {
  name: string;
  titles: string[];
  locations: string[];
  currentEmployer: string[];
  keyword: string;
  skillChips: SkillChip[];
  managementLevels: string[];
  department: string;
  companyIndustry: string;
  companySize: string;
  orderBy: "popularity" | "relevance";
  pageSize: number;
}