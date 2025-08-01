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