// src/services/apolloSearch.ts
import { supabase } from '@/integrations/supabase/client';

export interface ApolloSearchPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string; // Will be built from first_name + last_name
  linkedin_url: string;
  title: string;
  headline?: string; // Alternative field for title
  email?: string;
  email_status?: string;
  photo_url?: string;
  organization?: {
    id: string;
    name: string;
    website_url?: string;
    linkedin_url?: string;
    industry?: string;
    estimated_num_employees?: number;
  };
  city?: string;
  state?: string;
  country?: string;
  phone_numbers?: Array<{
    raw_number: string;
    sanitized_number: string;
  }>;
}

export interface ApolloSearchFilters {
  q_keywords?: string;
  person_titles?: string[];
  // Location Filters
  person_locations?: string[];           // "Is any of" (e.g., ["Coimbatore"])
  excluded_person_locations?: string[];  // "Is not any of"
  // Organization Filters
  organization_names?: string[];          // "Is any of"
  excluded_organization_names?: string[]; // "Is not any of"
  organization_num_employees_ranges?: string[];
  person_names?: string[];
}

export interface ApolloSearchResponse {
  people: ApolloSearchPerson[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
  breadcrumbs?: any[];
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
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

// Helper function to normalize API response
function normalizePerson(person: any): ApolloSearchPerson {
  // Build full name from first_name + last_name
  const fullName = `${person.first_name || ''} ${person.last_name || ''}`.trim();
  
  return {
    ...person,
    name: person.name || fullName || 'Unknown',
    title: person.title || person.headline || '',
    email: person.email || '',
  };
}

export async function searchPeopleInApollo(
  filters: ApolloSearchFilters,
  page: number = 1,
  perPage: number = 10
): Promise<ApolloSearchResponse> {
  try {
    console.log('🔍 Searching  (API Search) with filters:', filters);

    // Call NEW edge function that uses mixed_people/api_search endpoint
    const { data, error } = await supabase.functions.invoke('apollo-people-search-v1', {
      body: {
        filters,
        page,
        per_page: perPage,
      },
    });

    if (error) {
      console.error('❌ Supabase function error:', error);
      throw new Error(error.message || 'Failed to search cloud');
    }

    // Handle empty or invalid response
    if (!data || !data.people) {
      console.log('⚠️ No data returned from cloud');
      return {
        people: [],
        pagination: {
          page: 1,
          per_page: perPage,
          total_entries: 0,
          total_pages: 0,
        },
      };
    }

    // Normalize people data - build name from first_name + last_name
    const normalizedPeople = data.people.map(normalizePerson);

    // Filter out people without names
    const validPeople = normalizedPeople.filter((person: ApolloSearchPerson) => 
      person.name && person.name !== 'Unknown'
    );

    console.log(`✅ Found ${data.people.length} people, ${validPeople.length} with valid names (No credits consumed!)`);
    
    // Log first person for debugging
    if (validPeople.length > 0) {
      console.log('👤 First valid person:', {
        name: validPeople[0].name,
        title: validPeople[0].title,
        email: validPeople[0].email,
        linkedin: validPeople[0].linkedin_url,
      });
    }

    return {
      people: validPeople,
      pagination: data.pagination || {
        page: 1,
        per_page: perPage,
        total_entries: validPeople.length,
        total_pages: Math.ceil(validPeople.length / perPage),
      },
    };
  } catch (error: any) {
    console.error('❌ cloud search error:', error);
    throw error;
  }
}

export async function searchPeopleInDiscovery(
  filters: any,
  page: number = 1,
  perPage: number = 100
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('apollo-people-search', {
    body: { filters, page, per_page: perPage },
  });
  if (error) throw error;
  return data;
}

export async function saveSearchResultToContacts(
  person: any, // The raw object from search
  organizationId: string,
  workspaceId: string,
  fileId: string,
  userId: string
): Promise<string> {
  try {
    
    console.log('💾 Saving contact with:', { workspaceId, fileId, userId });
    // 1. Check for duplicates using Apollo ID
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('apollo_person_id', person.id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existing) return existing.id;

    // 2. Insert the main contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        name: `${person.first_name} ${person.last_name || ''}`.trim(),
        job_title: person.title,
        organization_id: organizationId,
       
        file_id: fileId,
        apollo_person_id: person.id,
        created_by: userId,
        contact_stage: 'Identified',
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Save Availability Flags for UI indicators
    await supabase.from('enrichment_availability').upsert({
      contact_id: contact.id,
      has_email: person.has_email,
      has_phone: person.has_direct_phone === "Yes" || person.has_direct_phone?.includes("Maybe"),
      has_location: person.has_city || person.has_state || person.has_country,
      has_org_details: !!person.organization
    });

        // Step 4: Save enrichment (unchanged)
    await supabase.from('apollo_enrichments').insert({
      contact_id: contact.id,
      organization_id: organizationId,
      apollo_data: person,
      last_enriched_at: new Date().toISOString(),
    });

    console.log('✅ New contact saved:', contact.id);

    return contact.id;
  } catch (error) {
    console.error('Save error:', error);
    throw error;
  }
}


