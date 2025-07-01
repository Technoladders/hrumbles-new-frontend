
 
// src/types/contact.ts
 
// --- Contact Type (for data fetched from the 'contacts' table) ---
export interface Contact {
  id: string; // uuid from contacts table
  name: string;
  email: string; // This is NOT NULL in your contacts table
  mobile?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  contact_owner?: string | null;
  contact_stage?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  company_id?: number | null;   // Foreign key to companies table
  companies?: { name: string; [key: string]: any } | null; // From Supabase join
  company_name?: string | null; // Derived field for display
}
// --- UnifiedContactListItem Type (for the combined list in useContacts) ---
export interface UnifiedContactListItem {
  id: string; // uuid for 'contacts', composite ID for 'candidate_companies'
  name: string;
  email?: string | null;
  mobile?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  contact_owner?: string | null;
  contact_stage?: string | null;
  created_at?: string | null;
  company_id?: number | null;
  company_name?: string | null;
  source_table: 'contacts' | 'candidate_companies';
  // Fields specific to candidate_companies
  candidate_job_id?: string | null;
  candidate_years?: string | null;
  original_candidate_id?: string | null; // Original ID from candidate_companies
  // Fields specific to contacts
  updated_at?: string | null; // Present in contacts table
  created_by?: string | null; // Present in contacts table
  updated_by?: string | null; // Present in contacts table
}
// --- Contact Insert Type (for creating new contacts in 'contacts' table) ---
export interface ContactInsert {
  name: string;
  email: string;
  mobile?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  contact_owner?: string | null;
  contact_stage?: string | null;
  created_by?: string | null;
  company_id?: number | null; // To associate with a company
}
// --- Contact Update Type (for updating existing contacts in 'contacts' table) ---
export interface ContactUpdate {
  name?: string;
  email?: string;
  mobile?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  contact_owner?: string | null;
  contact_stage?: string | null;
  updated_by?: string | null; // If you set this from client
  company_id?: number | null; // To update company association
}

// You can add other related types for the Contacts module here if needed.
// export type ContactStage = 'Cold' | 'Approaching' | 'Replied' | 'Interested' | 'Not Interested' | 'Un Responsive' | 'Do Not Contact' | 'Bad Data' | 'Changed Job' | 'Prospect';
