
// Job-related types for database and application models

// Type for job from database
export interface HrJob {
  id: string;
  job_id: string;
  title: string;
  department: string;
  location: string[];
  job_type: string;
  status: string;
  posted_date: string;
  applications: number;
  due_date: string;
  client_owner: string;
  hiring_mode: string;
  submission_type: string;
  job_type_category: string;
  experience: {
    min?: { years: number; months: number };
    max?: { years: number; months: number };
  } | null;
  skills: string[];
  description: string | null;
  description_bullets: string[];
  client_details: Record<string, any> | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

// Define a simple interface for DB job without recursive types
export interface DbJob {
  job_id: string;
  title: string;
  department: string;
  location: string[];
  job_type: string;
  status: string;
  posted_date: string;
  applications: number;
  due_date: string;
  client_owner: string;
  hiring_mode: string;
  submission_type: string;
  job_type_category: string;
  skills: string[];
  description: string | null;
  // Use Record<string, any> for nested objects to avoid potential circular references
  experience: Record<string, any> | null;
  client_details: Record<string, any> | null;
  description_bullets: string[];
  organization_id: string | null;
}
