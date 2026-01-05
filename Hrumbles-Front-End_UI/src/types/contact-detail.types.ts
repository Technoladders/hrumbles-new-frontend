// types/contact-detail.types.ts

export interface ContactActivity {
  id: string;
  contact_id: string;
  organization_id: string;
  activity_type: 'email' | 'call' | 'meeting' | 'note' | 'task' | 'linkedin_message' | 'other';
  description: string | null;
  metadata?: {
    duration?: number; // for calls/meetings in minutes
    subject?: string; // for emails/meetings
    outcome?: string; // for calls/meetings
    [key: string]: any;
  };
  created_at: string;
  created_by: string | null;
  updated_at: string;
  created_by_employee?: {
    first_name: string;
    last_name: string;
  };
}

export interface ContactNote {
  id: string;
  contact_id: string;
  organization_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  created_by_employee?: {
    first_name: string;
    last_name: string;
  };
  updated_by_employee?: {
    first_name: string;
    last_name: string;
  };
}

export interface Deal {
  id: string;
  organization_id: string;
  contact_id: string | null;
  company_id: string | null;
  title: string;
  description: string | null;
  value: number | null;
  currency: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  expected_close_date: string | null;
  actual_close_date: string | null;
  owner_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  owner?: {
    first_name: string;
    last_name: string;
  };
  company?: {
    name: string;
  };
}

export interface CompanyData {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  employee_count: number | null;
  description: string | null;
  linkedin_url: string | null;
  founded_year: number | null;
  revenue: number | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityType = ContactActivity['activity_type'];
export type DealStage = Deal['stage'];