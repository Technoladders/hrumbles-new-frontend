export interface KeyPerson {
  name: string;
  title: string;
}
export interface Company {
  about?: string;
  domain?: string;
  id?: number;
  license_usage?: number;
  logo_url?: string;
  name: string;
  status?: string;
  website?: string;
  start_date?: string;
  employee_count?: number;
  address?: string;
  linkedin?: string;
  created_at?: string;
  updated_at?: string;
  last_updated?: string;
  industry?: string;
  stage?: string;
  location?: string;
  account_owner?: string;
  employee_count_date?: string;
  revenue?: string;
  cashflow?: number;
  competitors?: string[];
  products?: string[];
  services?: string[];
  key_people?: { name: string; title: string }[] | string;
    created_by_employee: EmployeeName | null;
  updated_by_employee: EmployeeName | null;
  organization_id: string | null;
}
export interface EmployeeAssociation {
  id: number;
  candidate_id: string;
  company_id: number;
  job_id?: string | null;
  designation?: string | null;
  contact_owner?: string | null;
  contact_stage?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean | null;
  created_at: string;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
}
export interface CompanyDetail extends Company {
  start_date?: string;
  address?: string;
}
 
export interface CandidateCompany {
  candidate_id: string;
  job_id: string;
  company_id: number;
  designation?: string | null;
  contact_owner?: string | null;
  contact_stage?: string | null;
}
 
export interface CandidateDetail {
  id: string;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  linkedin?: string | null;
  avatar_url?: string | null;
  designation?: string | null;
  contact_owner?: string | null;
  contact_stage?: string | null;
  source_table: 'candidate_companies' | 'employee_associations';
  company_id: number;
  association_id?: number | null;
  job_id?: string | null;
  association_start_date?: string | null;
  association_end_date?: string | null;
  association_is_current?: boolean | null;
  association_created_by?: string | null;
}

export interface EmployeeName {
  first_name: string;
  last_name: string;
}