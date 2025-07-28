// src/types/simple-contact.types.ts

// Represents a row from the 'contacts' table for our new grid
export interface SimpleContact {
  id: string; // uuid
  name: string;
  email: string | null;
  mobile?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  contact_owner?: string | null;
  contact_stage?: string | null;
   medium?: string | null;
  created_at: string;
  updated_at: string;
  company_id?: number | null;
  organization_id?: string | null;
  file_id?: string | null;
  custom_data?: Record<string, any> | null;
  
  // This is a derived/joined field, not a direct column
  company_name?: string | null; 
}

// For creating new contacts in the grid
export interface SimpleContactInsert {
  name: string;
  email?: string | null;
  mobile?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  contact_owner?: string | null;
  contact_stage?: string | null;
  organization_id?: string | null;
}

// For updating existing contacts from the grid
export interface SimpleContactUpdate {
  name?: string;
  email?: string | null;
  mobile?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  contact_owner?: string | null;
  contact_stage?: string | null;
  medium?: string | null;
  company_id?: number | null;
  custom_data?: Record<string, any> | null;
}