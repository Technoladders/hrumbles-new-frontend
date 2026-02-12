// src/services/apolloCompanySearch.ts
import { supabase } from '@/integrations/supabase/client';

export interface ApolloOrganization {
  id: string;
  name: string;
  website_url: string;
  linkedin_url: string;
  logo_url?: string;
  phone?: string;
  industry: string;
  keywords: string[];
  estimated_num_employees: number;
  retail_location_count?: number;
  city: string;
  state: string;
  country: string;
  founded_year?: number;
  short_description?: string;
  publicly_traded_symbol?: string;
  publicly_traded_exchange?: string;
  total_funding?: number;
  latest_funding_stage?: string;
  latest_funding_round_date?: string;
  organization_revenue?: number;
  suborganizations?: any[];
  technology_names?: string[];
}

export interface ApolloCompanySearchFilters {
  q_organization_name?: string;
  organization_industries?: string[];
  organization_locations?: string[];           // "Is any of"
  excluded_organization_locations?: string[];  // "Is not any of"
  organization_num_employees_ranges?: string[];
}

export interface ApolloCompanySearchResponse {
  organizations: ApolloOrganization[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export async function searchCompaniesInApollo(
  filters: ApolloCompanySearchFilters,
  page: number = 1,
  perPage: number = 10
): Promise<ApolloCompanySearchResponse> {
  try {
    console.log('🔍 Searching companies (API Search - No Credits):', filters);

    // Call NEW edge function that uses mixed_companies/search endpoint
    const { data, error } = await supabase.functions.invoke('apollo-company-search', {
      body: {
        filters,
        page,
        per_page: perPage,
      },
    });

    if (error) {
      console.error('❌ Supabase function error:', error);
      throw new Error(error.message || 'Failed to search Cloud');
    }

    // Handle empty or invalid response
    if (!data || !data.organizations) {
      console.log('⚠️ No data returned from Cloud');
      return {
        organizations: [],
        pagination: {
          page: 1,
          per_page: perPage,
          total_entries: 0,
          total_pages: 0,
        },
      };
    }

    // Filter out organizations without names
    const validOrganizations = data.organizations.filter(
      (org: ApolloOrganization) => org.name && org.name.trim() !== ''
    );

    console.log(
      `✅ Found ${data.organizations.length} companies, ${validOrganizations.length} with valid names (No credits consumed!)`
    );

    // Log first organization for debugging
    if (validOrganizations.length > 0) {
      console.log('🏢 First valid company:', {
        name: validOrganizations[0].name,
        industry: validOrganizations[0].industry,
        website: validOrganizations[0].website_url,
      });
    }

    return {
      organizations: validOrganizations,
      pagination: data.pagination || {
        page: 1,
        per_page: perPage,
        total_entries: validOrganizations.length,
        total_pages: Math.ceil(validOrganizations.length / perPage),
      },
    };
  } catch (error: any) {
    console.error('❌ Company search error:', error);
    throw error;
  }
}

export async function saveCompanySearchResultToDatabase(
  organization: ApolloOrganization,
  organizationId: string,
  fileId?: string
): Promise<number> {
  try {
    console.log('💾 Saving company to database:', organization.name);

    // Check if company already exists
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('name', organization.name)
      .eq('organization_id', organizationId)
      .single();

    if (existing) {
      console.log('ℹ️ Company already exists:', existing.id);
      return existing.id;
    }

    // Create new company
// Create new company
const { data: newCompany, error } = await supabase
  .from('companies')
  .insert({
    name: organization.name,
    website: organization.website_url,
    linkedin: organization.linkedin_url,
    industry: organization.industry,
    employee_count: organization.estimated_num_employees,
    location: [organization.city, organization.state, organization.country]
      .filter(Boolean)
      .join(', '),
    about: organization.short_description,
    organization_id: organizationId,
    file_id: fileId || null,
    stage: 'Identified',
  })
  .select()
  .single();

    if (error) throw error;

    // Save Apollo enrichment data
    await supabase.from('apollo_company_enrichments').insert({
      company_id: newCompany.id,
      organization_id: organizationId,
      apollo_data: organization,
      last_enriched_at: new Date().toISOString(),
    });

    console.log('✅ Company saved:', newCompany.id);
    return newCompany.id;
  } catch (error: any) {
    console.error('❌ Error saving company:', error);
    throw error;
  }
}

export async function enrichCompanyFromApollo(
  companyDomain: string,
  companyId: number,
  organizationId: string
): Promise<ApolloOrganization | null> {
  try {
    console.log('🔍 Enriching company from cloud:', companyDomain);

    const { data, error } = await supabase.functions.invoke('apollo-company-enrich', {
      body: {
        domain: companyDomain,
        company_id: companyId,
      },
    });

    if (error) {
      console.error('❌ Supabase function error:', error);
      throw new Error(error.message || 'Failed to enrich company');
    }

    if (!data) {
      throw new Error('No data returned from cloud');
    }

    console.log('✅ Enrichment successful, saving to database...');
    
    // Save enrichment data
    await supabase.from('apollo_company_enrichments').upsert({
      company_id: companyId,
      organization_id: organizationId,
      apollo_data: data,
      last_enriched_at: new Date().toISOString(),
    });

    // Update company with enriched data
    const updateData: any = {};
    if (data.estimated_num_employees) updateData.employee_count = data.estimated_num_employees;
    if (data.industry) updateData.industry = data.industry;
    if (data.logo_url) updateData.logo_url = data.logo_url;
    if (data.short_description) updateData.about = data.short_description;
    if (data.founded_year) updateData.founded_year = data.founded_year;

    if (Object.keys(updateData).length > 0) {
      await supabase.from('companies').update(updateData).eq('id', companyId);
    }

    console.log('💾 Data saved to database');
    return data;
  } catch (error: any) {
    console.error('❌ Apollo company enrichment error:', error);
    throw error;
  }
}

export async function getCachedCompanyApolloData(
  companyId: number
): Promise<ApolloOrganization | null> {
  try {
    const { data, error } = await supabase
      .from('apollo_company_enrichments')
      .select('apollo_data, last_enriched_at')
      .eq('company_id', companyId)
      .single();

    if (error || !data) return null;

    const lastEnriched = new Date(data.last_enriched_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (lastEnriched < thirtyDaysAgo) return null;

    return data.apollo_data as ApolloOrganization;
  } catch (error) {
    console.error('Error fetching cached company cloud data:', error);
    return null;
  }
}