// src/types/candidateSearch.ts
// UPDATED: Added TypesenseSearchParams + TypesenseSearchResult

export interface SearchTag {
  value: string;
  mandatory: boolean;
}

export interface SearchHistory {
  jd_text: string;
  job_title?: string;
  selected_job_id?: string;
  generated_keywords: string[];
  is_boolean_mode: boolean;
  search_filters?: Partial<SearchFilters>;
}

// ── Result shape (same fields as before — Typesense returns the same data) ──
export interface CandidateSearchResult {
  id: string;
  full_name: string;
  email: string;
  title: string;
  source: 'internal' | 'migrated';
  current_company: string;
  current_designation: string;
  previous_company?: string;
  previous_designation?: string;
  education_summary: string;
  key_skills: string[];
  total_experience_years: number | null;
  current_ctc: number | null;
  expected_ctc?: number | null;
  current_location: string;
  notice_period: string | null;
  phone?: string;
  // Typesense-specific: relevance score (0-100)
  _relevance_score?: number;
  // Which fields triggered the match (for UI highlighting)
  _matched_fields?: string[];
}

// ── Filters (unchanged — same shape) ────────────────────────────────────────
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
  jd_text?: string;
  jd_job_title?: string;
  jd_selected_job_id?: string;
  jd_generated_keywords?: string[];
  jd_is_boolean_mode?: boolean;
}

// ── Typesense query params (internal, built by the hook) ─────────────────────
export interface TypesenseSearchParams {
  q: string;
  query_by: string;
  query_by_weights: string;
  filter_by: string;
  sort_by: string;
  per_page: number;
  page: number;
  highlight_fields?: string;
  highlight_affix_num_tokens?: number;
}