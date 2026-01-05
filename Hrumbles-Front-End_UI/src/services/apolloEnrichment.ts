// src/services/apolloEnrichment.ts
import { supabase } from '@/integrations/supabase/client';

export interface ApolloContact {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  linkedin_url: string;
  title: string;
  email: string;
  phone_numbers?: Array<{
    raw_number: string;
    sanitized_number: string;
    type: string;
  }>;
  organization?: {
    id: string;
    name: string;
    website_url: string;
    linkedin_url: string;
    industry: string;
  };
  employment_history?: Array<{
    _id: string;
    title: string;
    organization_name: string;
    start_date: string;
    end_date: string | null;
    current: boolean;
    description?: string;
  }>;
}

export async function enrichWithApollo(
  linkedInUrl: string,
  contactId: string,
  organizationId: string,
  email?: string
): Promise<ApolloContact | null> {
  try {
    console.log('🔍 Starting Apollo enrichment for contact:', contactId);

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('apollo-enrich', {
      body: {
        linkedin_url: linkedInUrl,
        email: email,
        contact_id: contactId,
      },
    });

    if (error) {
      console.error('❌ Supabase function error:', error);
      throw new Error(error.message || 'Failed to fetch Apollo data');
    }

    if (!data) {
      throw new Error('No data returned from Apollo');
    }

    console.log('✅ Enrichment successful, saving to database...');
    await saveApolloDataToDatabase(contactId, organizationId, data);

    return data;
  } catch (error: any) {
    console.error('❌ Apollo enrichment error:', error);
    throw error;
  }
}

async function saveApolloDataToDatabase(
  contactId: string,
  organizationId: string,
  apolloData: ApolloContact
) {
  try {
    const contactUpdates: any = {};
    
    if (apolloData.email) contactUpdates.email = apolloData.email;
    if (apolloData.phone_numbers?.[0]) contactUpdates.mobile = apolloData.phone_numbers[0].sanitized_number;
    if (apolloData.title) contactUpdates.job_title = apolloData.title;

    if (Object.keys(contactUpdates).length > 0) {
      await supabase.from('contacts').update(contactUpdates).eq('id', contactId);
    }

    await supabase.from('apollo_enrichments').upsert({
      contact_id: contactId,
      organization_id: organizationId,
      apollo_data: apolloData,
      last_enriched_at: new Date().toISOString(),
    });

    console.log('💾 Data saved to database');
  } catch (error) {
    console.error('❌ Error saving Apollo data:', error);
    throw error;
  }
}

export async function getCachedApolloData(contactId: string): Promise<ApolloContact | null> {
  try {
    const { data, error } = await supabase
      .from('apollo_enrichments')
      .select('apollo_data, last_enriched_at')
      .eq('contact_id', contactId)
      .single();

    if (error || !data) return null;

    const lastEnriched = new Date(data.last_enriched_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (lastEnriched < thirtyDaysAgo) return null;

    return data.apollo_data as ApolloContact;
  } catch (error) {
    console.error('Error fetching cached Apollo data:', error);
    return null;
  }
}




