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
    console.log('🔍 Searching Apollo.io (API Search - No Credits) with filters:', filters);

    // Call NEW edge function that uses mixed_people/api_search endpoint
    const { data, error } = await supabase.functions.invoke('apollo-people-search', {
      body: {
        filters,
        page,
        per_page: perPage,
      },
    });

    if (error) {
      console.error('❌ Supabase function error:', error);
      throw new Error(error.message || 'Failed to search Apollo.io');
    }

    // Handle empty or invalid response
    if (!data || !data.people) {
      console.log('⚠️ No data returned from Apollo.io');
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
    console.error('❌ Apollo search error:', error);
    throw error;
  }
}

export async function saveSearchResultToContacts(
  person: ApolloSearchPerson,
  organizationId: string
): Promise<string> {
  try {
    console.log('💾 Saving contact to database:', person.name);

    // Step 1: Enrich the person to get email/phone (this consumes 1 credit)
    if (person.linkedin_url) {
      console.log('🔍 Enriching person data from Apollo.io...');
      
      const { data: enrichedData, error: enrichError } = await supabase.functions.invoke(
        'apollo-enrich',
        {
          body: {
            linkedin_url: person.linkedin_url,
            first_name: person.first_name,
            last_name: person.last_name,
            organization_name: person.organization?.name,
          },
        }
      );

      if (enrichError) {
        console.error('❌ Enrichment error:', enrichError);
        // Continue without enrichment if it fails
      } else if (enrichedData) {
        // Merge enriched data
        person.email = enrichedData.email || person.email;
        person.phone_numbers = enrichedData.phone_numbers || person.phone_numbers;
        console.log('✅ Person enriched successfully');
      }
    }

    // Step 2: Check if contact already exists
    const existingQuery = supabase
      .from('contacts')
      .select('id')
      .eq('organization_id', organizationId);

    // Add email or linkedin_url filter
    if (person.email) {
      existingQuery.eq('email', person.email);
    } else if (person.linkedin_url) {
      existingQuery.eq('linkedin_url', person.linkedin_url);
    }

    const { data: existing } = await existingQuery.single();

    if (existing) {
      console.log('ℹ️ Contact already exists:', existing.id);
      return existing.id;
    }

    // Step 3: Create contact
    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert({
        name: person.name,
        email: person.email || null,
        mobile: person.phone_numbers?.[0]?.sanitized_number || null,
        job_title: person.title,
        linkedin_url: person.linkedin_url,
        organization_id: organizationId,
        city: person.city,
        state: person.state,
        country: person.country,
        contact_stage: 'Prospect',
      })
      .select()
      .single();

    if (error) throw error;

    // Step 4: Save Apollo enrichment data
    await supabase.from('apollo_enrichments').insert({
      contact_id: newContact.id,
      organization_id: organizationId,
      apollo_data: person,
      last_enriched_at: new Date().toISOString(),
    });

    console.log('✅ Contact saved:', newContact.id);
    return newContact.id;
  } catch (error: any) {
    console.error('❌ Error saving contact:', error);
    throw error;
  }
}


