import { supabase } from '@/integrations/supabase/client';

export interface ApolloSearchPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  linkedin_url: string;
  title: string;
  headline?: string;
  email?: string;
  email_status?: string;
  photo_url?: string;
  has_email: boolean;
  has_city: boolean;
  has_state: boolean;
  has_country: boolean;
  has_direct_phone: string | boolean;
  organization?: {
    id: string;
    name: string;
    website_url?: string;
    linkedin_url?: string;
    industry?: string;
    estimated_num_employees?: number;
    primary_domain?: string;
  };
  city?: string;
  state?: string;
  country?: string;
}

export interface ApolloSearchFilters {
  q_keywords?: string;
  person_titles?: string[];
  person_locations?: string[];
  organization_names?: string[];
  excluded_organization_names?: string[];
  person_seniorities?: string[];
  currently_using_any_of_technology_uids?: string[];
}

/**
 * Full-screen Discovery Search
 * Handles up to 100 records per page as per Apollo's display limit docs
 */
export async function searchPeopleInDiscovery(
  filters: ApolloSearchFilters,
  page: number = 1,
  perPage: number = 100
): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke('apollo-people-search', {
      body: { filters, page, per_page: perPage },
    });

    if (error) throw error;
    
    // Ensure the response explicitly passes total_entries for the pagination UI
    return {
      people: data.people || [],
      total_entries: data.total_entries || 0, 
      pagination: data.pagination
    };
  } catch (err) {
    console.error('Discovery Search Error:', err);
    throw err;
  }
}

/**
 * Migration Logic: Save a Discovered lead into the Internal CRM
 */
export async function saveSearchResultToContacts(
  person: any,
  organizationId: string,
  userId: string,
  targetFileId?: string // Now optional, list assignment happens via separate action
): Promise<string> {
  try {
    // 1. Check if contact exists in CRM globally
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('apollo_person_id', person.id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    let contactId = existing?.id;

    if (!contactId) {
      // 2. Create Global CRM Contact
      const { data: contact, error } = await supabase
        .from('contacts')
        .insert({
          name: `${person.first_name} ${person.last_name_obfuscated || ''}`.trim(),
          job_title: person.title,
          organization_id: organizationId,
          apollo_person_id: person.id,
          created_by: userId,
          contact_stage: 'Identified',
          company_name: person.organization?.name
        })
        .select().single();
      if (error) throw error;
      contactId = contact.id;

      // 3. Store Pre-Enrichment Flags
      await supabase.from('enrichment_availability').upsert({
        contact_id: contactId,
        has_email: person.has_email,
        has_phone: person.has_direct_phone === "Yes"
      });
    }

    // 4. If a target file was selected during search, add to junction table
    if (targetFileId) {
      await supabase.from('contact_workspace_files').upsert({
        contact_id: contactId,
        file_id: targetFileId,
        added_by: userId
      });
    }

    return contactId;
  } catch (err) { throw err; }
}

// --- HELPER LOGIC FOR DUPLICATE RECOGNITION ---

export function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

export function nameSimilarity(name1: string, name2: string): number {
  const maxLen = Math.max(name1.length, name2.length);
  if (maxLen === 0) return 1;
  return 1 - (levenshteinDistance(name1.toLowerCase(), name2.toLowerCase()) / maxLen);
}