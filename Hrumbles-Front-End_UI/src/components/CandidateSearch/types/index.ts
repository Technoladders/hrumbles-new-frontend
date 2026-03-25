export interface ApolloOrganization {
  name: string;
  has_industry: boolean;
  has_phone: boolean;
  has_city: boolean;
  has_state: boolean;
  has_country: boolean;
  has_zip_code: boolean;
  has_revenue: boolean;
  has_employee_count: boolean;
}

export interface ApolloCandidate {
  id: string;
  first_name: string;
  last_name_obfuscated: string;
  title: string | null;
  last_refreshed_at: string;
  has_email: boolean;
  has_city: boolean;
  has_state: boolean;
  has_country: boolean;
  has_direct_phone: string;
  organization: ApolloOrganization;
}

export interface FilterState {
  keywords: string;           // free-text keyword
  titles: string[];
  locations: string[];
  seniorities: string[];
  companyNames: string[];     // company name filter
  availabilityIntent: string[]; // "open_to_work" | "serving_notice" | "immediate"
  // skills kept for backward compat with recent searches (unused in new UI)
  skills: string[];
  emailStatuses: string[];
}

export type SearchState = "idle" | "loading" | "results" | "empty" | "error";

export type ErrorType = "cors" | "auth" | "rateLimit" | "invalid" | "unknown";

export interface SearchError {
  type: ErrorType;
  message: string;
  statusCode?: number;
}

export interface RecentSearch {
  id: string;
  summary: string;
  chips: string[];
  filters: FilterState;
  timestamp: number;
}