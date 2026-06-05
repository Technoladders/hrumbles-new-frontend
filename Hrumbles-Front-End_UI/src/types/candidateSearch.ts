// src/types/candidateSearch.ts

export interface SearchTag {
  value: string;
  mandatory: boolean;
}

// ── Search Filters ─────────────────────────────────────────────────────────────
export interface SearchFilters {
  // Free-text keyword search (MandatoryTagSelector)
  keywords?:          SearchTag[];

  // Structured filters
  skills?:            SearchTag[];   // mandatory=exact filter; optional=score
  locations?:         SearchTag[];   // mandatory=filter_by; optional=score
  companies?:         SearchTag[];   // mandatory=filter_by; optional=score
  educations?:        SearchTag[];   // for text search scoring

  // Identity search
  name?:              SearchTag[];
  email?:             SearchTag[];

  // Direct field filters
  current_company?:   string;
  current_designation?: string;

  // Experience range
  min_exp?:           number;
  max_exp?:           number;

  // Availability
  notice_periods?:    string[];

  // Compensation
  min_current_salary?:  number;
  max_current_salary?:  number;
  min_expected_salary?: number;
  max_expected_salary?: number;

  // Date
  date_posted?:       string;

  // JD-generated keywords (AI extracted)
  jd_generated_keywords?: string[];

  // ── Phase 2 additions ─────────────────────────────────────────────────────
  // Previous experience search
  previous_titles?:    SearchTag[];   // mandatory=filter_by previous_titles array
  previous_companies?: SearchTag[];   // mandatory=filter_by previous_companies array

  // Education
  degree?:             string;        // exact facet filter (single select)
  institutions?:       SearchTag[];   // institution text search

  // Skill exclusion
  excluded_skills?:    string[];      // skills:!= filter

  // Companies count range
  companies_count_min?: number;
  companies_count_max?: number;
}

// ── Candidate Result ───────────────────────────────────────────────────────────
export interface CandidateSearchResult {
  id:                     string;
  full_name:              string;
  email:                  string;
  title:                  string;
  source:                 'internal' | 'external';

  // Current role
  current_company:        string;
  current_designation:    string;

  // Previous role (legacy single fields)
  previous_company?:      string;
  previous_designation?:  string;

  // Education
  education_summary?:     string;

  // Skills
  key_skills:             string[];

  // Numerics
  total_experience_years: number | null;
  current_ctc:            number | null;
  expected_ctc:           number | null;

  // Location / availability
  current_location:       string;
  notice_period:          string | null;

  // Contact
  phone?:                 string;

  // Search scoring metadata
  _relevance_score?:      number;
  _matched_fields?:       string[];

  // ── Phase 2 additions ────────────────────────────────────────────────────
  previous_titles?:       string[];   // all past job titles
  previous_companies?:    string[];   // all past companies
  degree?:                string;     // highest degree
  institution?:           string;     // institution name
  companies_count?:       number;     // unique company count
}

// ── Recent Search (persisted to Supabase) ─────────────────────────────────────
export interface RecentSearch {
  id:         string;
  filters:    SearchFilters;
  created_at: string;
  summary?:   string;   // human-readable label
}