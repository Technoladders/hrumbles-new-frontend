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
  skills: string[];
  titles: string[];
  locations: string[];
  seniorities: string[];
}

export type SearchState = "idle" | "loading" | "results" | "empty" | "error";

export type ErrorType = "cors" | "auth" | "rateLimit" | "invalid" | "unknown";

export interface SearchError {
  type: ErrorType;
  message: string;
  statusCode?: number;
}

export interface SearchResult {
  totalEntries: number;
  people: ApolloCandidate[];
  page: number;
}

export interface SearchParams extends FilterState {
  page: number;
  perPage: number;
  apiKey: string;
}