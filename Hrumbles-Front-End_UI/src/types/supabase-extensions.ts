
import type { Database } from '@/integrations/supabase/types';

// You can create type extensions or utility types based on the generated Supabase types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Add any custom type definitions you need here
export type JobStatus = Tables<'job_statuses'>;
export type MainStatus = JobStatus & { type: 'main', subStatuses?: SubStatus[] };
export type SubStatus = JobStatus & { type: 'sub', parent_id: string };

// Add any other custom types or interfaces you need
export type CandidateData = {
  id: string;
  name: string;
  status: string;
  experience: string;
  matchScore: number;
  appliedDate: string;
  skills: any[];
  email: string;
  phone: string;
  currentSalary: number;
  expectedSalary: number;
  location: string;
  appliedFrom: string;
  resumeUrl: string;
  metadata: any;
  progress?: any;
  main_status_id?: string;
  sub_status_id?: string;
  main_status?: MainStatus;
  sub_status?: SubStatus;
  organization_id?: string;
  created_by?: string;
  updated_by?: string;
};
