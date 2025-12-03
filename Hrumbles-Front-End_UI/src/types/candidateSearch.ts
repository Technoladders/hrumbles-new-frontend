// src/types/candidateSearch.ts

export interface CandidateSearchResult {
  id: string;
  full_name: string;
  email: string;
  title: string;
  source: 'internal' | 'migrated';
  current_company: string;
  current_designation: string;
  education_summary: string;
  key_skills: string[];
}

export interface SearchFilters {
  keywords: string[];
  locations: string[];
  min_exp: number | null;
  max_exp: number | null;
  min_salary: number | null;
  max_salary: number | null;
  gender: string; // 'All', 'Male', 'Female'
  notice_period: string; // 'Any', '0-15 days', etc.
    companies: string[];
  educations: string[];
}

// src/types/candidateSearch.ts (add to existing file)

export interface SearchFilters {
  name?: SearchTag[];
  email?: SearchTag[];
  keywords?: SearchTag[];
  skills?: SearchTag[];
  educations?: SearchTag[];
  locations?: SearchTag[];
  industries?: SearchTag[];
  companies?: SearchTag[];
  current_company?: string;
  current_designation?: string;
  min_exp?: number | null;
  max_exp?: number | null;
  min_current_salary?: number | null;
  max_current_salary?: number | null;
  min_expected_salary?: number | null;
  max_expected_salary?: number | null;
  notice_periods?: string[];
  date_posted?: string;
  // ADD THESE NEW FIELDS:
  jd_text?: string;
  jd_job_title?: string;
  jd_selected_job_id?: string;
  jd_generated_keywords?: string[];
  jd_is_boolean_mode?: boolean;
}